# Payments

**Rail, scheme and standards facts verified on 2026-09-10.** These move; confirm against the scheme or regulator before building to a date or a threshold.

Payments is the domain where an incorrect line of code becomes an irreversible transfer with a regulator attached.
Three properties make it different from ordinary integration work: **the money you can see is not yet yours**, **every
message is at-least-once and forgeable** (M8), and **the window in which a settled transaction can be taken back is
measured in months, not milliseconds**. Design for those three and most of the rest follows.

This file assumes the money model of `money-arithmetic.md` (integer minor units, ISO 4217, declared rounding) and the
posting contract of `ledger.md` (double entry, immutable postings, corrections by reversal). It does not repeat them;
it states what payments-specific events post, when, and against which external record they must reconcile
(`reconciliation-close.md`).

## 1. The card money flow, end to end

Six parties, four distinct money events, and a long gap between "approved" and "yours".

| Party                  | Role                                                                    | Holds the money when                                         |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Cardholder             | Funds the transaction from a credit line or deposit account             | Until the issuer posts the clearing record                   |
| Issuer                 | Issues the card, authorizes, bills the cardholder, adjudicates disputes | From clearing until network settlement                       |
| Network (scheme)       | Routes messages, sets rules, computes interchange, nets positions       | Momentarily, as settlement agent between issuer and acquirer |
| Acquirer               | Holds the merchant agreement and the MID; bears merchant credit risk    | From network settlement until funding                        |
| PSP / gateway / PayFac | Tokenizes, orchestrates, often aggregates under its own MID             | From funding until payout (this is where reserves live)      |
| Merchant               | Sells the goods                                                         | After payout clears — and provisionally even then            |

**The four events, and why conflating them is the classic bug:**

| Event                      | What actually happens                                                                                      | Money moved                                                        | Typical timing                                                     | Reversible by                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| **Authorization**          | Issuer checks funds/credit and risk, places a hold on the cardholder's available balance                   | None                                                               | 300–2000 ms, synchronous                                           | Auth reversal / void, instantly            |
| **Clearing (presentment)** | Acquirer submits the captured transaction; network calculates interchange and produces the clearing record | None between banks yet; the cardholder's statement is now affected | Batch, T+0 to T+1 after capture                                    | Credit (refund) presentment                |
| **Settlement**             | Network nets issuer and acquirer positions and moves central-bank/commercial-bank money                    | Issuer → network → acquirer                                        | T+1 to T+2 from clearing                                           | Chargeback (a settlement reversal)         |
| **Funding (payout)**       | Acquirer/PSP pays the merchant, minus fees and reserve                                                     | Acquirer/PSP → merchant bank                                       | T+1 to T+7, contract-dependent; longer for new/high-risk merchants | Payout reversal, negative balance recovery |

Consequences you must model, not merely know:

- **An approved authorization is not revenue and not cash** — it is a hold on someone else's account. Book it as a
  memo/off-balance-sheet hold, never as a receivable or revenue (M13, `ledger.md`).
- **Money in the PSP balance is a receivable from the PSP**, not cash: exposed to PSP insolvency, reserve policy and
  negative-balance netting. Its own GL account, reconciled to the PSP balance report (M9).
- **It is never fully yours.** The dispute right survives funding — commonly 120 days from the transaction or expected
  delivery date, up to 540 in defined cases. Chargeback exposure is a liability with an estimate, not a surprise
  (§13).
- **Auth and capture diverge in amount and in time**: partial capture, multiple capture, capture after expiry, capture
  never happening. The state machine in §2 is not optional decoration.

Variant flows: **card-present** adds EMV cryptograms, floor limits and deferred authorization (transit, in-flight);
**estimated authorization** (hotels, fuel, car rental) trues up at capture via incremental auth; **delayed capture**
(ship-then-bill) risks auth expiry — typically ~7 days, longer for travel MCCs, scheme- and BIN-dependent.

## 2. The card lifecycle as a state machine

Model the payment as an explicit state machine with guarded transitions. Every transition emits a journal entry
(`ledger.md`) and is idempotent under the caller's key (M7).

| From                      | Trigger                          | To                                | Postings (see `ledger.md`)                                                                               | Window / constraint                                                                            |
| ------------------------- | -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `created`                 | `authorize` approved             | `authorized`                      | Memo hold only: Dr Card holds / Cr Hold liability (M13). No revenue, no receivable                       | Synchronous; auth valid ~7d (≤30d some travel MCCs)                                            |
| `created`                 | `authorize` declined             | `declined`                        | None (log the decline code)                                                                              | —                                                                                              |
| `created`                 | `authorize` timeout              | `unknown`                         | None; open a resolution task (§6)                                                                        | Resolve within one reconciliation cycle                                                        |
| `authorized`              | `increment`                      | `authorized` (higher amount)      | Adjust hold                                                                                              | MCC-restricted; each increment is its own idempotent call                                      |
| `authorized`              | `reauthorize`                    | `authorized` (new auth id)        | Release old hold, create new                                                                             | Before expiry; new auth may decline                                                            |
| `authorized`              | `void` / auth reversal           | `voided`                          | Release hold                                                                                             | Only before clearing; do it immediately on cancel — an unreleased hold is a customer complaint |
| `authorized`              | `capture` (full)                 | `captured`                        | Release hold; Dr PSP receivable / Cr Revenue (or contract liability) + tax + fee postings (M16)          | Before auth expiry                                                                             |
| `authorized`              | `capture` (partial)              | `partially_captured`              | Capture amount posted; residual hold released or retained per scheme rules                               | Residual auth normally void it explicitly                                                      |
| `partially_captured`      | `capture` (again)                | `captured`                        | Incremental postings                                                                                     | Multi-capture requires acquirer support; total ≤ authorized (+ scheme tolerance)               |
| `captured`                | settlement file confirms         | `settled`                         | Dr Cash-in-transit / Cr PSP receivable; fees split out (M16)                                             | T+1..T+2; reconcile from the settlement report (M9)                                            |
| `captured` \| `settled`   | `refund` (full/partial)          | `refunded` / `partially_refunded` | Dr Revenue-contra (or refund liability) / Cr PSP receivable; fee treatment per §11                       | Usually ≤180d at the PSP; scheme credit rules apply                                            |
| `settled`                 | `chargeback` received            | `disputed`                        | Dr Dispute receivable-contra / Cr PSP receivable for the amount **and** the dispute fee separately (M16) | Cardholder window ~120d, up to 540d in defined cases                                           |
| `disputed`                | `represent` (evidence submitted) | `representment_submitted`         | No cash posting; accrue expected outcome if material                                                     | Merchant response ~20–45d, scheme- and reason-dependent                                        |
| `representment_submitted` | issuer accepts                   | `dispute_won`                     | Reverse the chargeback posting; fee usually **not** returned                                             | —                                                                                              |
| `representment_submitted` | issuer re-disputes               | `pre_arbitration`                 | Provision the loss                                                                                       | Issuer window ~30d                                                                             |
| `pre_arbitration`         | accept liability                 | `dispute_lost`                    | Recognise the loss; keep the fee posting                                                                 | —                                                                                              |
| `pre_arbitration`         | escalate                         | `arbitration`                     | Provision loss + arbitration fee (hundreds of USD, loser pays)                                           | Scheme-filed; economics rarely justify below ~$500                                             |
| any                       | `retrieval_request`              | unchanged                         | None                                                                                                     | Information request, not a debit; Visa largely retired it, Mastercard retains limited use      |

Two rules that cost real money when broken. **`void` is not `refund`**: a void reverses an authorization before
clearing — no interchange, no refund fee, no line on the cardholder's statement, hold released in seconds — whereas a
refund is a new presentment in the opposite direction that costs a fee, does not usually return the original acquiring
fee (§11), and takes days to reach the cardholder. Every cancellation flow attempts `void` first and falls back to
`refund` only after clearing. And **the state machine is guarded, not advisory** — enforce it in the write path.

```python
payment.status = event["type"].split(".")[-1]   # WRONG: state is whatever the last webhook said
```

An out-of-order `refund.succeeded` (§6) then sets `refunded`, a late `charge.succeeded` overwrites it back to
`captured`, and the refund vanishes from every report derived from `status`.

```python
from enum import StrEnum

class S(StrEnum):
    CREATED="created"; AUTHORIZED="authorized"; VOIDED="voided"; UNKNOWN="unknown"; DECLINED="declined"
    CAPTURED="captured"; PART_CAPTURED="partially_captured"; SETTLED="settled"
    PART_REFUNDED="partially_refunded"; REFUNDED="refunded"
    DISPUTED="disputed"; DISPUTE_WON="dispute_won"; DISPUTE_LOST="dispute_lost"

# Self-transitions are legal only where listed (multi-capture, successive partial refunds).
ALLOWED: dict[S, frozenset[S]] = {
    S.CREATED:       frozenset({S.AUTHORIZED, S.DECLINED, S.UNKNOWN}),
    S.UNKNOWN:       frozenset({S.AUTHORIZED, S.DECLINED, S.VOIDED}),
    S.AUTHORIZED:    frozenset({S.VOIDED, S.CAPTURED, S.PART_CAPTURED}),
    S.PART_CAPTURED: frozenset({S.CAPTURED, S.PART_CAPTURED, S.SETTLED, S.PART_REFUNDED}),
    S.CAPTURED:      frozenset({S.SETTLED, S.PART_REFUNDED, S.REFUNDED, S.DISPUTED}),
    S.SETTLED:       frozenset({S.PART_REFUNDED, S.REFUNDED, S.DISPUTED}),
    S.PART_REFUNDED: frozenset({S.PART_REFUNDED, S.REFUNDED, S.DISPUTED}),
    S.REFUNDED:      frozenset({S.DISPUTED}),
    S.DISPUTED:      frozenset({S.DISPUTE_WON, S.DISPUTE_LOST})}

def transition(current: S, target: S, *, event_id: str) -> S:
    if target not in ALLOWED.get(current, frozenset()):
        # Never drop silently: an out-of-order event (re-fetch and re-derive) or a real defect.
        raise IllegalTransition(f"{current} -> {target} (event {event_id})")
    return target
```

State is derived from the authenticated provider object plus the ledger, never from event ordering (M1). When
`transition` raises, re-fetch from the PSP and recompute; if it still disagrees, it is a break for reconciliation
(M9).

## 3. PSP integration patterns

**Never let a PAN reach your server (M15).** Everything below is arranged around that.

| Pattern                                    | How it works                                                   | PCI SAQ (§15) | Use when                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| Redirect / hosted page                     | Browser leaves your site to the PSP                            | A             | Lowest effort, lowest control, worst conversion                                              |
| Hosted fields / iframe / drop-in           | PSP-owned iframes inside your form; PAN never touches your DOM | A             | Default for web checkout                                                                     |
| Direct post / JS-embedded (fields you own) | Your page collects and posts to PSP                            | **A-EP**      | Almost never worth it                                                                        |
| Server-side card API                       | PAN transits your servers                                      | **D**         | Only with a real reason (P2PE terminal fleet, issuer-side) and a funded compliance programme |
| Mobile SDK                                 | SDK tokenizes on device                                        | A-equivalent  | Native apps                                                                                  |

**The two-step confirm ("payment intent") shape.** Modern PSPs converged on: create a server-side intent for an
amount+currency, hand the client a short-lived client secret, let the client confirm (attaching the instrument,
running 3DS), then observe the outcome server-side. It exists because SCA needs a client-side interaction in the
middle of authorization. Four rules: **the amount is decided server-side** (a client-supplied amount is a
price-tampering bug); **create the intent idempotently** keyed on the order (M7), so a double-tap reuses it instead of
authorizing twice; **the client's "success" callback is a UX hint, never the source of truth** — fulfilment follows
the authenticated webhook plus a re-fetch (§6), or a server-side poll; and **bind the intent to the order** with your
own reference in metadata and in the descriptor suffix, since that is the later reconciliation key.

**Off-session / merchant-initiated transactions (MIT).** Any charge without the cardholder present — subscriptions,
top-ups, delayed charges, incremental billing — must be a _stored-credential_ transaction: a **mandate** captured at
the initial, cardholder-present transaction (what will be charged, how often, by whom, how to cancel — store the text
and timestamp; it is the primary dispute evidence, §13); that initial transaction flagged as _credential-on-file
initial storage_ and SCA-authenticated where required (§4); and the **network transaction id** from the initial
authorization stored and replayed on every subsequent MIT with the correct reason (recurring / installment /
unscheduled / incremental / resubmission / no-show / delayed charge). Omitting the network transaction id degrades
auth rates immediately and removes the exemption basis in Europe.

```python
psp.charge(customer=cust.id, amount=1990, currency="EUR")   # WRONG: no link to the original authentication

# RIGHT — stored-credential linkage carried explicitly
psp.charge(customer=cust.id, payment_method=pm.id, amount=1990, currency="EUR",
           off_session=True, mit_reason="recurring",
           network_transaction_id=mandate.initial_network_txn_id,  # from the first, authenticated auth
           idempotency_key=f"sub:{sub.id}:period:{period_start:%Y-%m-%d}")
```

**Network tokens and account updater.** A network token (scheme-issued, merchant- or device-scoped) replaces the PAN
in the authorization and is refreshed by the scheme when the card is reissued; it typically lifts authorization rates
by low single-digit percentage points. Account updater is the batch equivalent for stored PANs. For a recurring
business both are conversion infrastructure, not nice-to-haves: natural card expiry alone produces multi-percent
monthly involuntary churn (§5). Neither changes M15 — you hold a token, never a PAN. Treat tokenisation as the
default rather than an optimisation: Mastercard has committed to 100% tokenised e-commerce in Europe by 2030 and
is retiring manual PAN entry over that period, and both schemes price and rate-differentiate in the token's favour
already.

## 4. SCA and 3-D Secure 2

**Flow.** The merchant's 3DS Server sends an authentication request (~100 data elements: device, browser, transaction,
cardholder history) to the Directory Server; the issuer's Access Control Server risk-assesses it and returns either
**frictionless** (authenticated, no cardholder interaction) or a **challenge** (OTP, app biometric, redirect). The
result — an authentication value (CAVV/AAV) plus an ECI indicator — is submitted with the authorization. Data quality
in the request drives the frictionless rate; a sparse 3DS request is a self-inflicted challenge rate.

**Versions.** The protocol is EMV 3DS (EMVCo), not the legacy 3DS 1.0.2, which the schemes withdrew in 2022.
EMVCo approval for **2.1.0 sunset in 2024**, so **2.2.0 is the production floor** — and it is 2.2.0 that carries
decoupled authentication, 3RI (merchant-initiated authentication for MIT and split shipment) and trusted-beneficiary
whitelisting, which is why the exemption table below is only claimable on 2.2.0 or later. **2.3.1 / 2.3.1.1** are
the current published specifications, adding Secure Payment Confirmation and device binding among other things,
with rollout gated by issuer ACS support rather than by your integration. A **2.4.0.0 draft** went out for comment
in mid-2026. EMVCo Specification
Bulletin 255 is the authority on which versions are live; check it, and your PSP's supported-version matrix,
before you assume a field exists on the issuer side.

| Outcome                            | Visa ECI | MC ECI | Fraud-chargeback liability |
| ---------------------------------- | -------- | ------ | -------------------------- |
| Fully authenticated                | 05       | 02     | Issuer                     |
| Attempted (issuer/ACS unavailable) | 06       | 01     | Issuer (in most regions)   |
| Not authenticated / not attempted  | 07       | 00     | Merchant                   |

Liability shift covers **fraud** reason codes only — not "goods not received", "not as described" or processing
errors (§13) — and authentication does not guarantee authorization: the issuer can authenticate, then decline for
funds.

**PSD2 exemptions** (EEA/UK; the shape recurs elsewhere). Two things people get wrong: who may claim one, and what
happens when the issuer disagrees.

| Basis                             | Condition                                                                      | Claimed by                                   | Liability           | Fallback if refused           |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- | ------------------- | ----------------------------- |
| Low value                         | ≤ €30, and cumulative counter ≤ €100 or 5 consecutive since last SCA           | Acquirer or issuer                           | Merchant (no shift) | Step up to 3DS challenge      |
| TRA (transaction risk analysis)   | Acquirer fraud rate below band: ≤€100 / ≤€250 / ≤€500 at 0.13% / 0.06% / 0.01% | Acquirer (needs its own fraud-rate evidence) | Merchant            | Step up                       |
| Recurring, fixed amount and payee | First transaction SCA'd; subsequent identical amounts exempt                   | Acquirer                                     | Merchant            | Re-authenticate the mandate   |
| MIT / stored credential           | Not payer-initiated → **out of scope**, not an exemption                       | n/a (flagging matters)                       | Merchant            | Bring the customer on-session |
| Trusted beneficiary               | Cardholder whitelisted the merchant with their issuer                          | **Issuer** only                              | Issuer              | Step up                       |
| Secure corporate payment          | Lodged/virtual cards on a dedicated corporate process                          | Acquirer                                     | Merchant            | Step up                       |
| MOTO                              | Out of scope                                                                   | n/a                                          | Merchant            | —                             |
| One-leg-out                       | Issuer or acquirer outside EEA/UK                                              | n/a (best effort)                            | Merchant            | —                             |

Exemption requests are **requests**; the issuer decides. Which is why **soft declines must be handled automatically**:
Visa `1A` and Mastercard `65` mean "SCA required, come back authenticated" — step up to a challenge and re-attempt the
_same_ logical payment, never surfacing it as a decline and never blind-retrying.

The table above is the PSD2 SCA-RTS (Delegated Regulation (EU) 2018/389) as it stands. **PSD3 and the PSR reached
political agreement in November 2025**; adoption and Official Journal publication are expected in 2026, with the PSR
applying after a transition of roughly 21 months (so 2027–28) and PSD3 transposed about 18 months after that. The
PSR keeps SCA but reworks the outsourcing of authentication, extends fraud liability (including to platforms and
to impersonation scams) and adds an IBAN/name-check duty on transfers. None of it is in force today — build to the
RTS, and keep the exemption basis and the liability party as data you can re-map rather than as branches.

```python
SOFT_DECLINE = {"1A", "65"}

def authorize_with_step_up(order, pm) -> Result:
    key = f"order:{order.id}:auth"
    r = psp.authorize(order.amount, order.currency, pm, sca="exemption_requested", idempotency_key=key)
    if r.declined and r.network_code in SOFT_DECLINE:
        auth = threeds.challenge(order, pm)     # CAVV/ECI after the cardholder acts
        # Same logical payment, deliberate new attempt: the key must change, but stay deterministic.
        r = psp.authorize(order.amount, order.currency, pm, sca=auth,
                          idempotency_key=f"{key}:sca:{auth.acs_transaction_id}")
    return r
```

Idempotency protects against _duplicate execution of one attempt_ (M7); a random key at the step-up re-opens the
double-charge hole. For an off-session MIT that soft-declines there is no cardholder to challenge: flag the
subscription for re-authentication and move it into an on-session recovery flow (§5).

## 5. Declines, retries and dunning

The most expensive naive behaviour in payments is retrying a decline that will never succeed: it burns scheme retry
allowance, raises your decline ratio, looks exactly like card testing (`risk-fraud-aml.md`), and attracts acquirer
monitoring fines. Classify before retrying — provider codes vary, so normalise them into a small internal taxonomy.

| Category                                                               | Typical issuer meaning                   | Retry?            | Policy                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `insufficient_funds`                                                   | No funds now                             | Yes — soft        | Retry on a payday-aware schedule (3–5 attempts over ~2–3 weeks)           |
| `issuer_unavailable` / `try_again`                                     | Transient network/issuer                 | Yes — soft        | Immediate retry once after 30–60 s, then back off                         |
| `do_not_honor`                                                         | Deliberately opaque issuer decline       | Yes — limited     | Max 2–4 attempts, spaced; escalate to customer contact early              |
| `expired_card`                                                         | Card past expiry                         | Only after update | Account updater / network token refresh, or ask the customer              |
| `incorrect_number` / `incorrect_cvc` / `invalid_expiry`                | Data wrong                               | No blind retry    | Re-collect from the customer; repeated attempts are card-testing signal   |
| `sca_required` (1A/65)                                                 | Authentication needed                    | Yes — with 3DS    | Step up (§4); never retry unauthenticated                                 |
| `lost_card` / `stolen_card` / `pickup_card` / `fraudulent` / `blocked` | Compromised, or an issuer/PSP fraud rule | **Never**         | Hard stop; do not reveal the reason to the payer; feed to the fraud model |
| `revoked_authorization` / `stop_payment`                               | Mandate withdrawn                        | **Never**         | Cancel the mandate; contact the customer                                  |
| `currency_not_supported` / `card_not_supported`                        | Instrument mismatch                      | No                | Offer another method                                                      |

**Network limits, and the two schemes do it differently.** Visa buckets decline codes into four categories and caps
re-attempts on a **declined transaction at 15 within a rolling 30 days** for the retryable categories, with
category 1 ("do not retry" — e.g. `2044`, `2047`, `2009`, `2015`, `2018`) allowed **no** re-attempt at all, and a
per-excess-attempt fee (roughly $0.10 domestic / $0.15 international) escalating into acquirer monitoring.
Mastercard does **not** publish a single 30-day cap: the authority is the **Merchant Advice Code** returned in the
authorization response — `MAC 01` (new account information available: refresh the credential, do not re-attempt the
old one), `MAC 02` (cannot approve now, retry later), `MAC 03` (**do not try again**), `MAC 21` (recurring payment
cancellation — stop the mandate), and the `MAC 24`–`MAC 30` family (retry only after a stated interval, from one
hour to ten days) — and a per-item fee applies to re-attempts beyond **10 in 24 hours** against `MAC 03` and
`MAC 21`. So: **route Visa retries off the decline
category and Mastercard retries off the MAC**, never off a single shared counter, and hold both as configuration with
a review date rather than constants in the dunning worker. Cap _globally_ too (per card per hour, per IP, per BIN),
because card testing arrives as a burst of small authorizations across many PANs (`risk-fraud-aml.md`) and is
indistinguishable from an aggressive retry loop.

**Dunning schedule** for subscriptions. A workable default: attempt on day 0, then +3, +5, +7, +14 (soft declines
only), customer email at attempts 1 and 3, hard downgrade at the end. Layer on:

- **Retry-time selection** ("smart retries"): retry when the issuer is most likely to approve — early morning local
  time, just after common payroll dates. Provider ML beats fixed schedules by a meaningful margin; measure it against
  a holdout rather than taking it on faith.
- **Amount adjustment is a different transaction**: retrying a €99 annual charge as €9 monthly is a new agreement.
  **Stop rules**: any hard-decline category, mandate revocation or fraud signal ends the sequence.
- **Instrument refresh before the last attempt**: network token / account updater recovers `expired_card` losses no
  retry schedule can.

Every attempt is an auditable record (attempt number, code, category, decision, next scheduled time, M14); recovery
rate by decline category says whether the schedule works (§16).

## 6. Idempotency and webhooks in practice

### 6.1 Key derivation (M7)

The key is **derived from the business action**, deterministically, so any retry — same process, another worker, a
redeployed pod, a manual replay — reproduces it. A UUID generated at call time is a nonce, not an idempotency key, and
it guarantees double charges under retry.

| Operation                  | Key                                       | Why                                                               |
| -------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Charge for an order        | `charge:{order_id}:v1`                    | One order → one charge                                            |
| Subscription period charge | `sub:{sub_id}:period:{period_start}`      | One period → one charge, whatever the retry path                  |
| Dunning attempt _n_        | `sub:{sub_id}:period:{p}:attempt:{n}`     | Deliberate re-attempts are distinct actions                       |
| Refund                     | `refund:{payment_id}:{refund_request_id}` | Request id, not amount — two identical €10 refunds are legitimate |
| Payout                     | `payout:{account_id}:{period}:{sequence}` | Never key on amount; amount can change on recompute               |
| Capture of an auth         | `capture:{auth_id}:{sequence}`            | Supports multi-capture                                            |

Nor is a hash of the request body a key: recompute a fee by a fraction of a cent and the key changes, so the "same"
action executes twice. Key on identity; store the request fingerprint separately to _detect_ a conflicting reuse.

### 6.2 The store: in-flight lock and response replay

```python
resp = psp.charge(..., idempotency_key=key)   # WRONG: key sent to the PSP, nothing stored locally
ledger.post(resp)                             # a retry after a crash here re-posts, or double-posts
```

The PSP's idempotency window is short (commonly ~24 h) and covers _its_ side only. Your postings, emails and
fulfilment need their own guard, retained for at least your retry horizon plus one reconciliation cycle.

```python
import hashlib, json
from datetime import datetime, timedelta, UTC

def fingerprint(p: dict) -> str:
    return hashlib.sha256(json.dumps(p, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

def execute_once(db, key: str, payload: dict, fn):
    fp = fingerprint(payload)
    claimed = db.execute(                             # atomic claim: never SELECT-then-INSERT
        """INSERT INTO idempotency (key, fingerprint, state, expires_at)
           VALUES (:k, :f, 'in_flight', :e) ON CONFLICT (key) DO NOTHING RETURNING key""",
        {"k": key, "f": fp, "e": datetime.now(UTC) + timedelta(days=30)}).fetchone()
    if claimed is None:                               # someone holds this key already
        prior = db.execute("SELECT * FROM idempotency WHERE key = :k", {"k": key}).one()
        if prior.fingerprint != fp:
            raise Conflict(f"key {key} reused with a different request")   # never execute
        if prior.state == "in_flight":
            raise InFlight(key)                       # caller retries later; do NOT run fn
        return json.loads(prior.response)             # replay the original outcome
    try:
        result = fn()                                 # the single external effect
    except Exception:
        db.execute("UPDATE idempotency SET state='failed' WHERE key=:k", {"k": key})
        raise                                         # 'failed' retryable; 'in_flight' is not
    db.execute("UPDATE idempotency SET state='done', response=:r WHERE key=:k",
               {"k": key, "r": json.dumps(result)})
    return result
```

The ledger posting must commit in the same transaction as the `done` update, or behind an outbox
(`architecture-ops.md`); and `in_flight` rows need a reaper that resolves via §6.5, never by blindly re-executing.

### 6.3 Webhook verification (M8)

```python
# WRONG — an unauthenticated webhook is an attacker-supplied money instruction
def hook(body: dict):
    fulfil(body["data"]["object"]["metadata"]["order_id"], amount=body["data"]["object"]["amount"])
```

```python
import hmac, hashlib, time
from fastapi import Request, HTTPException

TOLERANCE_S = 300

def verify(raw: bytes, header: str, secret: str) -> None:
    parts = dict(p.split("=", 1) for p in header.split(","))
    ts, sig = parts.get("t", ""), parts.get("v1", "")
    if not ts.isdigit() or abs(time.time() - int(ts)) > TOLERANCE_S:
        raise HTTPException(400, "stale or malformed timestamp")   # blocks replay
    expected = hmac.new(secret.encode(), f"{ts}.".encode() + raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):                     # constant time
        raise HTTPException(400, "bad signature")                  # fail closed

@app.post("/webhooks/psp")
async def hook(request: Request):
    raw = await request.body()                    # the RAW bytes; never the re-serialised dict
    verify(raw, request.headers.get("PSP-Signature", ""), SECRET)
    event = json.loads(raw)
    if not claim_event(event["id"]):              # dedupe BEFORE any effect (M8)
        return {"ok": True, "duplicate": True}
    enqueue(event["id"], event["type"])           # ack fast; process asynchronously
    return {"ok": True}
```

- Verify against **raw bytes**: a framework that parses and re-serialises breaks the HMAC, and invites someone to
  "fix" it by skipping verification. **Dedupe on the provider event id**, in a table with a unique constraint, before
  any effect (M8) — at-least-once delivery means duplicates are normal traffic, not an incident.
- **Ack quickly (2xx) and process asynchronously** — providers retry on timeout and disable failing endpoints — but
  never before the event is durably claimed. Return **4xx on signature failure** so it stays visible in the provider
  dashboard; 5xx only for your own transient failures, which you _want_ retried.

### 6.4 Out-of-order events, and why you re-fetch

Events are not ordered: `refund.succeeded` before `charge.succeeded`, `dispute.created` before `payment.settled`, a
retried old event after a newer one.

```python
payment.status = "refunded"; payment.refunded = event["data"]["object"]["amount"]   # WRONG: trusts payload
```

```python
# RIGHT — the event is a signal to re-derive from an authenticated read
def handle(event_id: str, object_id: str) -> None:
    obj = psp.retrieve(object_id)              # authenticated fetch = source of truth for PSP state
    if obj.updated_at <= local.psp_updated_at: # monotonic guard against stale replays
        return
    desired = derive_state(obj)                # pure function of the fetched object
    local.state = transition(local.state, desired, event_id=event_id)   # §2
    post_missing_entries(local, obj)           # idempotent per (payment, entry_kind, provider_ref)
```

Re-fetching also removes a class of vulnerability: even correctly signed, the payload is a snapshot from a moment you
did not choose. The event carries the _id_ and the _hint_; amounts, currencies and statuses that drive money movement
come from the fetch (M8). And postings must be idempotent independently of the event pipeline — a unique key on
`(payment_id, entry_kind, provider_reference)` means a replayed event cannot double-post even if every other guard
fails (M3, M7).

### 6.5 The unknown outcome

A charge request times out. The transaction may have been authorized, declined, or never received. Never guess, and
never let the customer's browser decide.

| Step | Action                                                                                                                                                          | Cost                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1    | Retry with **the same idempotency key**                                                                                                                         | If it landed, the PSP replays the original outcome |
| 2    | If the PSP's idempotency window has expired, **search** by your reference/metadata within a bounded time range                                                  | One API call                                       |
| 3    | If still unresolved, hold the payment in `unknown`; do **not** fulfil and do **not** re-charge                                                                  | Customer-visible delay                             |
| 4    | Resolve from the settlement report on the next reconciliation cycle (M9), then post the outcome with the original event time and the current booking time (M10) | Hours                                              |

`unknown` is a real state with an owner, an age and an alert threshold — the same object as a reconciliation break
(`reconciliation-close.md`). A system without one has it anyway; it just calls it "the customer complained". For the
outbox and saga patterns that keep charge-post-notify atomic here, see `architecture-ops.md`.

## 7. Bank rails

| Rail                        | Settlement speed                                                               | Finality                  | Reversal / return window                                                                                                                                  | Identifier                           | Cutoff / availability                                                                                                      | Typical cost           | Typical use                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **ACH (US)**                | Same-day (3 windows: 13:00, 17:00, 18:00 ET) or 1–2 banking days               | Not final on receipt      | Admin returns ~2 banking days; consumer unauthorized (R10/R11) **60 calendar days**                                                                       | Routing + account                    | Bank cutoffs, banking days only; Same Day cap **$1 m/payment** (→ $10 m on 17 Sep 2027)                                    | ¢ per item             | Payroll, bill pay, debits                                                                                                    |
| **SEPA CT**                 | D+1                                                                            | Final once credited       | No unilateral reversal; recall is a request                                                                                                               | IBAN (+BIC legacy)                   | TARGET business days                                                                                                       | ¢                      | EU credit transfers                                                                                                          |
| **SEPA Inst (SCT Inst)**    | ≤10 s end to end (rulebook "5-7-9": 5 s to send, 7 s time-out, 9 s to confirm) | Final, irrevocable        | None (recall request only)                                                                                                                                | IBAN                                 | 24/7/365; **no scheme maximum amount** since the 2025 rulebook — any cap is your PSP's, not SEPA's                         | ¢                      | Instant EU payouts, A2A checkout                                                                                             |
| **SEPA DD Core**            | D+1 collection                                                                 | Not final                 | **8 weeks** no-questions refund; 13 months if unauthorized                                                                                                | IBAN + mandate (UMR)                 | D-1 submission                                                                                                             | ¢                      | Consumer subscriptions in EU                                                                                                 |
| **SEPA DD B2B**             | D+1                                                                            | Stronger                  | No refund right; return ~2 business days                                                                                                                  | IBAN + mandate, debtor bank confirms | D-1                                                                                                                        | ¢                      | B2B collections                                                                                                              |
| **Fedwire / CHIPS**         | Same day                                                                       | **Final and irrevocable** | None (recall by goodwill only)                                                                                                                            | ABA + account                        | Fed operating hours                                                                                                        | $10–$50                | High value, real estate, treasury                                                                                            |
| **T2 (RTGS)**               | Same day RTGS                                                                  | Final                     | None                                                                                                                                                      | IBAN/BIC                             | ECB operating hours                                                                                                        | € units                | EUR high value, interbank. TARGET2 was consolidated into T2 in March 2023 — the old name still appears in bank documentation |
| **UK Faster Payments**      | Seconds                                                                        | Final                     | None; but PSR **mandatory APP-fraud reimbursement** since 7 Oct 2024 — up to £85,000, split 50/50 between sending and receiving PSP, optional £100 excess | Sort code + account                  | 24/7                                                                                                                       | Pennies                | UK P2P, payouts                                                                                                              |
| **Bacs (UK DD/credit)**     | 3-day cycle                                                                    | Not final                 | **Direct Debit Guarantee** — indemnity claims effectively unlimited in time                                                                               | Sort code + account + DDI            | Daily cycle                                                                                                                | Pennies                | UK subscriptions, payroll                                                                                                    |
| **RTP (TCH) / FedNow**      | Seconds                                                                        | Final, credit-push only   | None; returns are new payments                                                                                                                            | ABA + account (or alias)             | 24/7; network cap **$10 m** on both (RTP Feb 2025, FedNow 12 Nov 2025) — participating banks set lower limits of their own | Cents–low $            | US instant payouts, request-to-pay                                                                                           |
| **Pix (BR)**                | Seconds                                                                        | Final                     | None, but the **MED** fraud-refund mechanism: victim has **80 days** from the transfer to file, the receiving PSP ~7 days to assess                       | Pix key (CPF/phone/email/random)     | 24/7                                                                                                                       | Near zero              | Brazil, everything                                                                                                           |
| **UPI (IN)**                | Seconds                                                                        | Final                     | None; chargeback via NPCI dispute process                                                                                                                 | VPA / phone                          | 24/7                                                                                                                       | Near zero (MDR-capped) | India, everything                                                                                                            |
| **Interac e-Transfer (CA)** | Near-real-time                                                                 | Final on deposit          | None once claimed                                                                                                                                         | Email / phone                        | 24/7                                                                                                                       | ~$1                    | Canada P2P and payouts                                                                                                       |

**The EU Instant Payments Regulation ((EU) 2024/886) is now largely live and it changes euro payouts.** For
euro-area PSPs: **9 January 2025** — must be able to _receive_ SCT Inst, and **charge parity** applies (an instant
transfer may not cost the payer more than the equivalent standard SCT); sanctions screening moves from
per-transaction to **screening the customer base against EU lists at least daily**, because a per-payment check
cannot fit in ten seconds. **9 October 2025** — must be able to _send_ SCT Inst, and **Verification of Payee**
applies: before the payer confirms, the payer's PSP checks the payee name against the IBAN and returns match /
close match (with the name held) / no match / not possible, and the payer must be able to proceed anyway after an
explicit warning. VoP is required on **all** euro credit transfers, not only instant ones, and runs on the EPC's
own VOP scheme. Non-euro-area PSPs: 9 January 2027 to receive, **9 July 2027** to send and for VoP; EMIs and
payment institutions in scope from 9 April 2027. Two engineering consequences: a **close match** is a UI journey
and an audit record, not an error code; and a payer who overrides a no-match forfeits the misdirected-payment
remedy, so log the warning and the override.

Figures and limits move — instant-payment caps especially — so hold them as configuration with a review date, not as
constants in code. **The design consequence:** exposure is set by the **longest reversal window on the path**, not the fastest leg. Fund a wallet by SEPA Direct Debit and let the customer withdraw by SEPA Instant, and you have handed
out irrevocable money against a claim that is clawable for eight weeks. The mitigation is not faster reconciliation
but a **funds-availability policy**: hold, tier by customer history and amount, and reserve against expected returns —
the reserve being a real posting, not a spreadsheet (M16). Same logic for card-funded payouts (120+ day dispute
window) and any "instant payout" built on slow funding.

## 8. Direct debit and returns

**Mandate lifecycle**: created (debtor name, IBAN, creditor identifier, unique mandate reference, signature date and
channel) → active → amended (IBAN change, creditor migration — carries the old reference) → cancelled/expired (SEPA
mandates lapse after 36 months without a collection). The mandate is the authorization artifact: store its full text,
version and capture evidence (M14), because a collection without a provable mandate loses on dispute.
**Pre-notification** of amount and date is required — **14 calendar days before the due date by default**, and
shortenable only by an agreement with the debtor that the mandate records; a shorter period you merely adopted is
not a shorter period. Missing it is a compliance failure and a refund magnet: send it, log it, keep it queryable by
mandate.

Pin the rulebook version you built to. The **2025 SEPA rulebooks, version 1.1, entered into force on 5 October
2025** (SCT, SCT Inst, SDD Core, SDD B2B, OCT Inst) and are what governs today; the near-term change to schedule is
**15 November 2026**, after which the unstructured address format is no longer permitted and creditor/debtor
addresses must be structured or hybrid (§9).

**R-transactions** — know which one you received, because they mean different things:

| Type         | Raised by         | When                                             | Meaning                               | Accounting                                                    |
| ------------ | ----------------- | ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------- |
| **Reject**   | Debtor bank / CSM | Before settlement                                | Never collected                       | Reverse the pending collection; no cash was received          |
| **Refusal**  | Debtor            | Before settlement                                | Payer said no in advance              | As reject                                                     |
| **Return**   | Debtor bank       | After settlement, ≤5 business days               | Technical/funds failure               | Reverse the cash posting; re-open the receivable; fee posting |
| **Refund**   | Debtor            | ≤8 weeks (authorized), ≤13 months (unauthorized) | Payer exercises the SEPA refund right | Reverse cash; receivable reinstated; chase or write off       |
| **Reversal** | Creditor          | After settlement                                 | You collected in error                | Your own correcting instruction; still a reversing entry (M3) |

**A return that arrives eight weeks later** breaks naive designs, because the original period is closed (M10). Post
the reversal **in the current open period**, with `event_time` = the return date, `effective_date` = the original
collection date as a reference, `accounting_period` = the open one; never reopen a closed period. The entry reverses
cash, reinstates the receivable and books the return fee separately (M16). Whether revenue recognised on collection
also reverses is an accounting-policy question for the finance owner (`reconciliation-close.md`). If returns are
material and predictable, accrue an allowance rather than letting each one shock the P&L.

**ACH specifics.** Common codes: `R01` insufficient funds, `R02` account closed, `R03` no account, `R04` invalid
account number, `R07` authorization revoked, `R08` stop payment, `R10`/`R11` not authorized / not in accordance with
terms, `R29` corporate not authorized. NACHA return-rate thresholds — **unauthorized 0.5%** (R05, R07, R10, R11,
R29, R51), **administrative 3%** (R02, R03, R04), **overall 15%** — are measured against the originator over a
rolling 60 days. Only the 0.5% is self-executing; 3% and 15% open an ODFI inquiry, which can still end your ACH
access. So the return rate is not a finance metric but an availability one: alert on it (§16).

**The 2026 Nacha rules are an obligation on the sender, not just the bank.** Fraud monitoring — a documented,
risk-based process to detect ACH originations that are themselves fraudulent — became mandatory for ODFIs and large
originators, third-party senders and third-party service providers on **20 March 2026**, and for **everyone else on
22 June 2026**; RDFI-side monitoring of inbound credits phases on the same two dates. Also 20 March 2026: two new
standard company entry descriptions, `PAYROLL` and `PURCHASE`. From **18 September 2026** the funds-availability
rule for non-Same-Day credits changes — funds must be available at **09:00 RDFI local time on settlement date**,
with the old 17:00-receipt condition gone. If you originate at any scale, the fraud-monitoring rule is a build:
a rule set, a case queue, and evidence that both exist.

## 9. Messaging standards

**ISO 20022** is now the lingua franca (SEPA, T2, CBPR+, FedNow, RTP, CHAPS, and Fedwire since July 2025). For
cross-border correspondent banking the migration is **past its deadline, not approaching one**: the Swift CBPR+
MT/MX coexistence period **ended on 22 November 2025**. MT payment instructions are no longer natively supported —
an MT sent after that date goes through contingency validation and conversion, and both conversion and in-flow
translation became **chargeable from 1 January 2026**, with data loss on any field the MT cannot carry. Two dates
still ahead: **November 2026**, when unstructured-only postal addresses start being rejected (structured or hybrid
required — the EPC aligned the SEPA rulebooks to **15 November 2026** for the same change), and the retirement of
multi-instruction MT101. Treat "we still send MT" as an open incident with a cost line, not a deferred project.

The message families you will actually touch:

| Message    | Direction   | Purpose                                                | Note                                                       |
| ---------- | ----------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `pain.001` | You → bank  | Customer credit transfer initiation (payouts, payroll) | Your instruction file                                      |
| `pain.002` | Bank → you  | Payment status report (ACCP / RJCT / ACSC …)           | Acceptance ≠ settlement                                    |
| `pain.008` | You → bank  | Direct debit initiation                                | Carries mandate data                                       |
| `pacs.004` | Bank ↔ bank | Payment return                                         | The R-transaction on the wire                              |
| `camt.052` | Bank → you  | Intraday account report                                | Provisional; for liquidity, not books                      |
| `camt.053` | Bank → you  | **End-of-day statement**                               | **Reconcile from this** — it is the bank's record of truth |
| `camt.054` | Bank → you  | Debit/credit notification                              | Item-level detail, useful for matching keys                |
| `camt.056` | You → bank  | Cancellation/recall request                            | A request, never a guarantee                               |

Reconcile the books against `camt.053` closing balances and entries (M9, M19). `camt.052` is a liquidity view that
will disagree with the statement; treating it as authoritative produces breaks that resolve themselves overnight and
destroy trust in the reconciliation. Parsing advice, learned expensively:

- **Validate against the official XSD** and pin the version. Banks ship variant flavours: a field optional in the
  standard is mandatory at your bank, and vice versa. Regex over XML is a defect awaiting a namespace change.
- **Amounts carry a `Ccy` attribute.** Parse into your money type immediately (M4) — never a float, never a
  cross-currency sum over a file (M6).
- **The matching key is not obvious.** `EndToEndId` is yours and should carry your reference; `TxId` is the
  instructing party's; `AcctSvcrRef` is the bank's. Preserve all three, match on yours first.
- **`BkTxCd`** (domain/family/sub-family) classifies the entry — route fees, returns and interest by it, not by
  string-matching the free-text remittance line. **Balance types** (`OPBD`, `CLBD`, `ITBD`, `PRCD`) matter: assert
  opening + movements = closing. Expect structured and unstructured remittance in one file, and non-ASCII names.

**ISO 8583** survives in acquiring, issuing and ATM switching: MTI, DE2 PAN, DE3 processing code, DE4 amount, DE7
transmission date/time, DE11 STAN, DE22 POS entry mode, DE37 RRN (a key reconciliation identifier), DE38 authorization
code, DE39 response code, DE41 terminal id, DE42 merchant id, DE43 card acceptor name/location (**the descriptor the
cardholder sees**, §13), DE48 additional data, DE49 currency, DE55 EMV data. Do not implement 8583 from the spec if a
certified stack exists: bitmap and field-length conventions are institution-specific and the same DE carries different
content per network. And DE2 is a PAN — never in a log (M15).

## 10. Marketplaces and payouts

**Choose the funds-flow model deliberately: it determines your licence, tax position and liability**, and it is the
decision teams most often make by accident.

| Model                                   | Who is the seller of record | Who bears dispute liability        | Regulatory weight                                         | Accounting consequence                                       |
| --------------------------------------- | --------------------------- | ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| **Merchant of record (MoR)**            | You                         | You                                | You need the merchant agreements; you owe the tax         | Gross revenue with cost of sales; you owe sellers a payable  |
| **Payment facilitator (PayFac)**        | The sub-merchant            | You (as PayFac, to the acquirer)   | Scheme registration, underwriting, monitoring obligations | Sub-merchant funds are a **liability**, never your revenue   |
| **Marketplace with connected accounts** | Each seller                 | The seller (usually), PSP mediates | KYC delegated to the PSP; you still own the flow          | You recognise only your commission; the rest is pass-through |
| **Pure referral / gateway**             | The seller                  | The seller                         | Minimal                                                   | Fee revenue only                                             |

The invariant across all four: **money held on behalf of someone else is a liability account, not cash you can spend**
(`ledger.md`). If the answer to "whose money is this?" is "the seller's", a payout settles a payable and every fee out
of it is a separate posting (M16). Genuinely holding client funds raises safeguarding and licensing — a stop-and-ask. **Split payments** come in two shapes: split at authorization (the PSP settles
directly to each connected account), or settle to a platform balance and pay out later, which buys control and float
and a regulatory perimeter. Either way the split is a remainder-preserving allocation — parts summing exactly to the
captured amount, residual cent assigned by a declared rule (M5, `money-arithmetic.md`).

**Payout scheduling and holds.** Payouts batch per payee per schedule, or fire manually. Withhold for new-payee risk
period, rolling reserve, open disputes, incomplete KYC, sanctions match (`risk-fraud-aml.md`), unconfirmed delivery.
Every hold is a state on the payable with an owner and a release condition, visible to support.

**Negative balances** arise when refunds or chargebacks land after a payout. Recovery ladder: net against the next
payout → debit the payee's account under the onboarding mandate → suspend payouts and demand repayment → write off.
Model it as a receivable from the payee (M2); netting it against your own revenue hides the exposure until it is
large.

**Payout failures and reversals.** A payout can be rejected days later (bad IBAN, closed account, name mismatch). That
is not "succeeded then failed" but `pending → in_transit → paid | returned`. On return, reverse the cash posting,
restore the payable, notify the payee, and do **not** auto-retry to the same instrument. Payee onboarding and KYC/KYB:
`risk-fraud-aml.md`, `compliance-regulatory.md`.

## 11. Fees and their accounting

Fees are revenue, cost and tax data; netting them into the principal destroys all three irrecoverably (M16).

| Fee                                               | Levied by            | Typical shape                                                                                                                                | Posting                                                |
| ------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Interchange                                       | Issuer (via network) | % + fixed, by card type/region/MCC; EU/UK consumer caps 0.2% debit / 0.3% credit (IFR — unchanged, and **commercial cards remain uncapped**) | Dr Cost of payments — interchange                      |
| Scheme fees                                       | Network              | Many small per-transaction and ad-valorem components, some monthly                                                                           | Dr Cost of payments — scheme                           |
| Acquirer / PSP markup                             | Acquirer / PSP       | % + fixed, or blended                                                                                                                        | Dr Cost of payments — processing                       |
| FX markup / spread                                | PSP or acquirer      | Bps over a reference rate                                                                                                                    | Dr FX cost, separately from the conversion itself (M6) |
| Chargeback fee; refund fee                        | Acquirer             | Fixed per dispute (not refunded on a win); fixed per refund                                                                                  | Dr Dispute costs; Dr Cost of payments — refunds        |
| Payout / transfer, and monthly gateway / PCI fees | PSP or bank          | Fixed per payout; fixed per month                                                                                                            | Dr Bank charges; Dr Cost of payments — fixed           |

**Two US interchange facts that are in motion, so read them as of a date.** The Reg II debit cap (21¢ + 5 bps +
1¢ fraud adjustment) is **still what you pay**, but the standard was **vacated by the District of North Dakota in
August 2025**; the court stayed its own vacatur and the appeal was still before the Eighth Circuit in 2026, with a
separate Fed proposal to cut the base to 14.4¢ pending independently. And the interchange class settlement —
roughly a 10 bp cut to credit interchange for five years, a 1.25% ceiling on standard consumer credit for eight,
new surcharging and steering rights, and a partial escape from _honor all cards_ for premium and commercial
credit — received **preliminary approval on 9 June 2026** and is not yet final. Neither is a number to hard-code:
model interchange as a rate table with effective dates, and make sure surcharging and card-type acceptance are
policy switches rather than assumptions baked into checkout.

**Interchange++ vs blended.** Interchange++ passes interchange and scheme fees through at cost with a declared markup:
variable per transaction, auditable, cheaper on average — but you must parse and reconcile per-transaction fee detail.
Blended is one rate for everything: predictable, trivially reconcilable, and it hides the mix, so you cannot see
debit-heavy traffic subsidising premium cards and you cannot detect a scheme fee increase. Take interchange++ if you
can reconcile it; take blended if you cannot, knowing what you bought.

**Gross vs net settlement.** Gross pays the full transaction value and debits fees separately: per-transaction
matching, fees as their own postings, everything visible. Net pays one amount per batch, already net of fees, refunds
and chargebacks — simpler operationally and **much harder to reconcile**, because a single credit of €48,213.77 must
be decomposed into thousands of transactions and dozens of fee categories before it can be booked. Under net
settlement, ingest the itemised report and reconstruct the gross figures; booking the net as revenue is a
misstatement (M19).

```python
# WRONG — the net credit becomes revenue; interchange, scheme fees and tax disappear forever
ledger.post(debit="cash", credit="revenue", amount=payout.net_amount, currency="EUR")
```

```python
# RIGHT — one balanced entry per settlement batch, every component its own line (M2, M16)
entry = JournalEntry(period=period, event_time=payout.arrival_date, reference=payout.id)
entry.debit("1010 Cash", payout.net_amount)
entry.debit("6110 Cost of payments — processing", fees.processing)
entry.debit("6111 Cost of payments — interchange", fees.interchange)
entry.debit("6112 Cost of payments — scheme", fees.scheme)
entry.debit("6130 Dispute costs", fees.dispute)
entry.debit("4900 Revenue — refunds contra", refunds.total)
entry.credit("1210 PSP receivable", gross_settled)
entry.assert_balanced()          # per currency (M2); refuse to post otherwise
```

Reconciliation asserts `gross − fees − refunds − chargebacks = net credited`, per batch, per currency, to the cent
(`reconciliation-close.md`). Any residual is a break with an owner, not a rounding shrug (M5).

## 12. Refunds and partial refunds

**Policy first.** Decide and write down: the refund window, who approves which amounts (M11), whether refunds may
exceed the captured amount (never), whether shipping and taxes are refundable, how partial refunds affect the tax
posting. Then implement it — do not let the policy emerge from the support tool. **Instrument constraints:** refunds
go to the original instrument, simultaneously a scheme rule, an AML control and a fraud control, since refunding to a
different card is a classic laundering pattern (`risk-fraud-aml.md`). Three exceptions: the card expired or was
reissued (the issuer usually maps the old PAN through — have a fallback); the PSP refund window has passed (commonly
~180 days, so you owe the money by another route with its own approval and sanctions check); the account is closed
(the issuer generally still credits the cardholder, and a returned refund becomes a payable you must chase).

**Over-refund protection** belongs in the write path, computed from the ledger, not from a cached field.

```python
if refund_amount <= payment.amount:      # WRONG: two agents each refund €30 against a €50 charge
    psp.refund(payment.id, refund_amount)
```

```python
# RIGHT — atomic, ledger-derived, idempotent (M1, M7, M13)
def refund(db, payment_id: str, amount: Money, request_id: str, actor: str) -> Refund:
    with db.transaction():
        p = db.select_for_update("payments", payment_id)
        already = db.sum_postings(payment_id, kind="refund")    # from the ledger, not a column
        if amount.currency != p.currency:
            raise CurrencyMismatch(amount.currency, p.currency)                  # M6
        if already + amount > p.captured:
            raise OverRefund(requested=amount, available=p.captured - already)   # refuse (M12)
        require_approval(actor, amount)                                          # M11
        key = f"refund:{payment_id}:{request_id}"
        return execute_once(db, key, {"amount": amount.minor, "currency": amount.currency},
                            lambda: psp.refund(payment_id, amount, idempotency_key=key))
```

**Refunding an FX transaction.** The customer paid USD; you booked EUR at that day's rate. Refunding the same USD at
today's rate produces a EUR difference — a **realised FX gain or loss** with its own posting, never absorbed into
revenue and never rounded away (M5, M6, `money-arithmetic.md`). Document one policy: refund the original
transaction-currency amount (customer whole, you carry the FX risk), or the original functional-currency amount at
today's rate (you are flat, the customer may receive less — disclose it).

**Refund vs chargeback economics.** A refund costs the original transaction fee (usually not returned) plus a
possible refund fee. A chargeback costs the transaction value, a dispute fee of tens of dollars, staff time and —
decisively — a tick in the ratio that drives scheme monitoring programmes (§13). A pre-emptive refund beats a defended
chargeback almost always and a lost one every time: let support refund below a threshold without escalation, and wire
in dispute-alert networks (§13) to refund inside the alert window.

## 13. Disputes operations

**Evidence assembly is automatic and pre-staged, or it is late.** By the time a dispute arrives you have 20–45 days,
and everything you need was created months earlier: order and timestamps, AVS/CVV result, 3DS result and ECI, IP and
device fingerprint, proof of delivery, terms accepted (version and timestamp), the subscription mandate text, the
cancellation policy as displayed, refund history, prior successful transactions from the same customer. Build the
packet at transaction time and store its references on the payment (M14); assembling it by hand under deadline is how
winnable disputes are lost.

| Reason category                | Examples                                                  | Typical merchant win rate              | What wins it                                                      |
| ------------------------------ | --------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| Fraud — card-absent            | "I didn't authorise this"                                 | Low (~20–30%) unless 3DS-authenticated | ECI/CAVV showing liability shift; AVS match; prior order history  |
| Authorization                  | No auth, expired auth, declined then processed            | Very low                               | Nothing — fix the process                                         |
| Processing errors              | Duplicate, wrong amount, wrong currency, late presentment | Low–moderate                           | Proof of a single presentment; the correct amount                 |
| Consumer — not received        | Goods/services not delivered                              | Moderate–high (~40–50%)                | Signed proof of delivery to the AVS-matched address               |
| Consumer — not as described    | Quality, wrong item                                       | Moderate                               | Product page as displayed, communications, return policy          |
| Consumer — cancelled recurring | "I cancelled"                                             | Moderate                               | Mandate, cancellation policy, cancellation logs, notice of charge |
| Credit not processed           | Refund promised, not received                             | Very low if true                       | The refund acquirer reference number                              |

Rates vary enormously by vertical and by evidence discipline: measure your own by reason code and act on the
distribution, not the aggregate.

**Monitoring programmes.** Both schemes count disputes and fraud against volume, escalating through mandatory
remediation, per-dispute fines, monthly programme fees and ultimately loss of processing. The two schemes now count
_different things_, on _different denominators_, so one internal "chargeback rate" cannot serve both.

|                    | **Visa — VAMP**                                                                                                                  | **Mastercard — ECM**                                                                                 | **Mastercard — EFM**                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replaced           | VDMP + VFMP, merged into one programme from 1 Jun 2025 (advisory to 30 Sep 2025)                                                 | —                                                                                                    | —                                                                                                                                                         |
| Numerator          | **TC40 fraud + TC15 disputes, counted together**                                                                                 | Chargeback **count** only                                                                            | Fraud-coded chargebacks (Mastercard reason codes 4837 and 4863), **count and value**                                                                      |
| Denominator        | Settled **card-not-present** transactions, same month                                                                            | Sales count of the **prior** month                                                                   | Sales count of the **prior** month                                                                                                                        |
| Merchant threshold | **150 bps** in AP, Europe, LAC and NA from **1 Apr 2026** (was 220 bps); 220 bps CEMEA                                           | ECM: **≥100 chargebacks and ≥1.50%**; HECM: **≥300 and ≥3.00%** — both count _and_ ratio must be met | **All four** must be met: ≥1,000 sales, ≥$50,000 fraud chargebacks, ≥0.50% fraud ratio, and 3DS/DSRP under 50% (regulated markets) or 10% (non-regulated) |
| Acquirer threshold | **50 bps** "above standard" (from 1 Jan 2026) / **70 bps** "excessive" — a flagged acquirer pulls its whole portfolio into scope | Portfolio-level ACMP applies to the acquirer                                                         | —                                                                                                                                                         |
| Floor              | ≥1,500 fraud+dispute items a month (≥150 items and $75,000 in CEMEA)                                                             | The 100-count floor                                                                                  | The 1,000-sale floor                                                                                                                                      |
| Also counted       | Separate **enumeration** ratio for card testing: ≥2,000 bps, floor 300,000 enumerated authorizations                             | —                                                                                                    | —                                                                                                                                                         |

Three things fall out of that table. **VAMP counts issuer fraud reports you never see as chargebacks** — a TC40
raised on a small transaction the issuer simply credited still lands in your numerator, so a dispute-only dashboard
understates the VAMP ratio, sometimes badly. **VAMP's denominator is CNP settled volume**, not all volume, so
card-present traffic does not dilute it. And **EFM is escapable by authenticating**: a merchant over the fraud
thresholds but above the 3DS rate is not placed in the programme, which makes 3DS coverage a compliance control and
not only a liability-shift choice (§4).

So measure each ratio **the way that scheme measures it**, per MID per scheme, with the scheme's own denominator
month; alert at around 60% of the threshold, because the ratio lags and remediation takes months; and treat it as
release-gating, since one campaign, descriptor change or price increase can breach it. Thresholds and effective
dates here move most years — re-read the current programme documents before you set an alert level.

**Prevention beats representment**, in this order of leverage:

1. **Descriptor clarity** — the highest-ROI change in disputes. Recognisable brand, an order-identifying suffix, a
   support phone number. "Friendly fraud" is frequently a statement line nobody recognised.
2. **Dispute-alert and deflection networks** (Verifi/Ethoca-style, plus RDR-style rules that auto-refund qualifying
   disputes before they become chargebacks), and issuer-app order-detail enrichment shown at the moment the cardholder
   queries a charge. Priced per alert and per refund; cheap against the ratio.
3. **3DS on risky segments** for liability shift, priced against the conversion cost of a challenge, and **proactive
   refunds** on delivery failure, before the customer thinks of their bank.
4. **Subscription hygiene**: pre-charge notice, one-click cancellation, honest trial-to-paid transitions. Most
   subscription disputes are a UX decision, not a payments problem.

## 14. Alternative rails, briefly

| Rail                                  | What it actually is                                                                       | What changes for you                                                                                                                                                                                                      | Depth                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Apple Pay / Google Pay                | **Not a rail** — network tokenization (DPAN) plus a device cryptogram over the card rails | Better auth rates, SCA satisfied by device biometrics, no PAN ever, per-device token lifecycle                                                                                                                            | §3, §4                                       |
| Click-to-pay / secure remote commerce | Scheme-hosted checkout with network tokens                                                | Same rails, different UX and token source                                                                                                                                                                                 | §3                                           |
| BNPL                                  | A third-party lender pays you, takes the credit risk and often dispute risk               | You are paid on shipment or on order; refunds route through the provider's flow; your consumer-credit exposure is contractual, not zero                                                                                   | `fintech-expert`                             |
| Pay-by-bank / open banking PIS        | An account-to-account credit transfer initiated on the customer's behalf                  | No chargeback right (a feature and a risk: no dispute mechanism for the customer either), lower fees, weaker conversion, settlement per the underlying rail (§7)                                                          | `banking-open-finance.md`                    |
| Direct debit / A2A pull               | §8                                                                                        | Long reversal windows dominate the design                                                                                                                                                                                 | §8                                           |
| Stablecoin / crypto settlement        | Value transfer on a distributed ledger                                                    | Finality is **probabilistic** (confirmation depth policy, reorg risk), no chargebacks, irreversible errors, custody and key management become your problem, on/off-ramp is where the regulation lives (Travel Rule, MiCA) | `fintech-expert`, `compliance-regulatory.md` |

For crypto, three things come before anything else: a declared per-chain confirmation-depth policy that defines
"settled" (M10), address validation and allow-listing on withdrawals (irreversible, so M11 and M12 are the whole
defence), and a written-down custody model. Depth belongs to `fintech-expert`.

## 15. PCI DSS scope in practice

Scope is everything that stores, processes or transmits cardholder data — **plus everything connected to it**. The
cheapest strategy is not "comply efficiently" but "be out of scope".

| Integration                              | Typical SAQ | Rough control count | In scope                                          |
| ---------------------------------------- | ----------- | ------------------- | ------------------------------------------------- |
| Redirect to PSP-hosted page              | A           | ~30                 | Your site's redirect integrity                    |
| PSP iframes / hosted fields              | A           | ~30                 | Your payment page and its scripts (6.4.3, 11.6.1) |
| Direct post / your own JS collecting PAN | A-EP        | ~150                | Your whole web tier                               |
| PAN touches your servers or storage      | D           | 250+                | Everything connected to the CDE                   |
| P2PE-validated terminals                 | P2PE        | ~30                 | Terminal fleet management                         |

**What puts you in scope, silently:** a full PAN in a support ticket; a CSV from a legacy import; a debug log
capturing a request body; an APM tool sampling form fields; session replay on checkout; a crash reporter with a form
snapshot; a "temporary" server-side proxy for the payment form. Storing **sensitive authentication data** (CVV, full
track, PIN block) after authorization is prohibited outright. **Scope reduction:** PSP-hosted fields or redirect;
network tokens and PSP-vaulted instruments so you hold only tokens; P2PE terminals for card-present; segmentation so
the CDE is small and provably isolated; truncation everywhere (first 6 or 8 and last 4); a data-flow diagram that is
regenerated, not drawn once.

**The current standard is PCI DSS v4.0.1** (v3.2.1 retired 31 March 2024), and the **51 future-dated requirements
became mandatory on 31 March 2025** — there is no remaining grace period to plan around. The client-side pair are
the ones most teams still have not implemented:

- **6.4.3 — manage payment-page scripts.** An inventory of every script loaded on the payment page, each with a
  written justification and an integrity assurance (SRI, CSP allow-list or equivalent). A tag manager that lets
  marketing inject third-party JS into checkout is a direct violation and a Magecart vector.
- **11.6.1 — change and tamper detection** on payment pages: detect unauthorised modification of HTTP headers and page
  content, evaluated at least weekly (or as the risk analysis justifies), with alerting.

Other v4 items that bite: MFA for all CDE access (8.4.2), 12-character passwords (8.3.6), documented targeted risk
analyses (12.3.1), log review automation (10.4.2). **Logging (M15):** No PAN, CVV, track data, PIN or full
magnetic-stripe data in any log, trace, metric label, error message, exception payload, analytics event or crash
report. Log the PSP token, the last 4, the BIN if you genuinely need it, the network transaction id and your own
reference; enforce with a redaction filter at the logging boundary _and_ a CI scanner (`money_lint.py`). **Test
data:** never real card numbers in test environments, including "just to reproduce"; use scheme test PANs; never copy
production data into staging.

## 16. Testing and observability

**Sandbox reality.** PSP sandboxes are approximations: they generally do not reproduce real issuer decline
distributions, ACS behaviour and challenge abandonment, settlement timing and file formats, interchange qualification,
dispute timing, or rate limits under load. Plan a production pilot with real cards and small amounts, and a refund.

| Technique                                                                                                                         | What it catches                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Scheme test PANs + amount-triggered outcomes (e.g. specific cents forcing a decline code)                                         | Decline-path handling, code classification (§5)                                |
| PSP dispute/chargeback simulation endpoints                                                                                       | Dispute state machine and evidence assembly                                    |
| Contract tests against recorded PSP responses (VCR-style), refreshed on a schedule                                                | Provider schema drift; the tests fail when the PSP changes, which is the point |
| Webhook replay from stored raw payloads                                                                                           | Dedupe (M8), out-of-order handling, signature verification, poison messages    |
| Chaos on the PSP boundary: timeouts, 500s, duplicate webhooks, delayed webhooks                                                   | The `unknown` path (§6.5) and idempotency under real failure                   |
| Golden-ledger tests (one flow in, exact postings out) and property tests (refunds never exceed captures; splits sum to the total) | Posting rules, fee splitting, FX residue, allocation (M18, M5, M12)            |

**Metrics that matter**, with the shape of a useful alert. Segment every one by scheme, BIN country, card type,
currency and integration path: an aggregate authorization rate hides everything.

| Metric                     | Definition                                                 | Alert on                                                                            |
| -------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Authorization rate         | approved / attempted, excluding retries                    | Drop > 2 pp week-over-week in any major segment                                     |
| Decline mix                | share by normalised category (§5)                          | Shift in `do_not_honor` or `fraudulent` share — usually a fraud rule or a BIN issue |
| SCA mix                    | 1A+65 share; frictionless rate; challenge abandonment      | Abandonment > 10–15%; a frictionless drop means 3DS data-quality regression         |
| Auth latency               | p50/p95/p99 to the PSP                                     | p99 > 3 s; timeouts > 0.1%                                                          |
| `unknown` payments         | count and age                                              | Any older than one reconciliation cycle                                             |
| Capture-to-settlement lag  | days from capture to settlement record                     | Beyond contractual + 1 day                                                          |
| Unmatched settlement value | value of settled items with no local match                 | **Any non-zero after the cycle**; this is the money-truth metric (M9)               |
| Refund rate                | refunded value / captured value                            | Spike > 2× baseline in an hour — often a bug or an insider incident                 |
| Dispute rate               | scheme's own formula, per MID per scheme                   | 60% of the programme threshold (§13)                                                |
| ACH/DD return rate         | by code class                                              | 60% of the NACHA threshold (§8)                                                     |
| Dunning recovery rate      | recovered / failed, by decline category                    | Falling recovery means the schedule needs work (§5)                                 |
| Hold leakage               | authorizations neither captured nor voided past expiry     | Any — each one is an angry cardholder                                               |
| Webhook lag and failure    | time from provider event to processed; endpoint error rate | Lag p99 > 60 s; any sustained 5xx                                                   |

Two operational rules. **Every money metric has a ledger counterpart**, verified against it (M17): if the dashboard
says €1.2M captured today and the ledger says €1.19M, the ledger is right and the dashboard is a bug (M19). And **no metric reaches a human
unlabelled** — period, currency, basis (captured vs settled, gross vs net), source (M20).

## Where to check the current text

Everything dated in this file was verified on 2026-09-10 and will drift. These are the primary sources.

| Topic                                         | Source                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| SEPA rulebooks, VOP scheme, R-transactions    | European Payments Council — https://www.europeanpaymentscouncil.eu/document-library/rulebooks       |
| Instant Payments Regulation text and dates    | Regulation (EU) 2024/886 on EUR-Lex                                                                 |
| SCA, exemptions, TRA bands                    | Delegated Regulation (EU) 2018/389; EBA Q&A at https://www.eba.europa.eu                            |
| ACH rules, return thresholds, Same Day limits | Nacha — https://www.nacha.org/rules and https://www.nacha.org/content/summary-upcoming-rule-changes |
| FedNow limits and operating circular          | https://www.frbservices.org/financial-services/fednow                                               |
| RTP limits and rules                          | https://www.theclearinghouse.org/payment-systems/rtp                                                |
| ISO 20022 / CBPR+ deadlines                   | https://www.swift.com/standards/iso-20022                                                           |
| EMV 3DS versions and bulletins                | https://www.emvco.com/emv-technologies/3-d-secure/                                                  |
| Visa VAMP                                     | https://corporate.visa.com — Visa Acquirer Monitoring Program fact sheet                            |
| Mastercard ECM/EFM                            | Mastercard Chargeback Guide and Security Rules & Procedures (via your acquirer)                     |
| PCI DSS                                       | https://www.pcisecuritystandards.org/document_library/                                              |
| UK APP reimbursement                          | https://www.psr.org.uk — PS25/5 consolidated policy statement                                       |

## Review questions

1. Where in this system does an approved authorization get treated as revenue or as cash, and what is the posting that
   should be there instead (M1, M13)?
2. Show the idempotency key for the charge, refund and payout paths. Is each derived from the business action, and
   what happens on a retry after the local commit but before the response was stored (M7)?
3. If `refund.succeeded` arrives before `charge.succeeded`, what state does the payment end in, and does any ledger
   entry get written twice (M8, M3)?
4. A charge request times out. Trace the code path: what does the customer see, what does the ledger contain, and
   which process closes the `unknown` state (M9)?
5. What is the longest reversal window on any funds path here, and what funds-availability policy is enforced
   against it — as a posting, not a spreadsheet?
6. A SEPA Direct Debit collected in March is refunded in May, after March closed. Which period does the reversal post
   to, and what are the three timestamps on the entry (M10)?
7. For a net-settled batch, demonstrate `gross − fees − refunds − chargebacks = net credited` per currency, and name
   the account each fee component lands in (M2, M16).
8. Who can issue a refund, up to what amount, and who approves above it? Can automation approve one (M11, M12)?
9. Which scripts execute on the payment page, who authorised each, and what detects a change to them (PCI 6.4.3 /
   11.6.1, M15)?
10. What is the dispute ratio computed the way the scheme computes it, per MID per scheme, and at what level does it
    alert — before or after the threshold (§13)?
