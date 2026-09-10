# Risk, fraud and financial crime

Risk systems are the part of a money platform where the engineering decision and the legal
obligation are the same decision. A threshold is a control, a log line is evidence, a timeout is a
compliance failure, and a model is a regulated artifact. This reference covers what an engineer
builds, what an engineer must never decide alone, and where the two are confused in practice.

Read `ledger.md` first if you have not: every number here — a fraud loss, a chargeback provision, an
expected credit loss — becomes a posting, and a control that is not reflected in the books is not a
control (M1, M19).

## 1. The risk taxonomy for a money business

Risks are not a list of scary words; they are separate loss distributions with separate owners,
separate capital treatments and separate mitigations. Conflating them is how a company ends up with a
"risk team" that does fraud rules and no one watching liquidity.

| Risk                             | What it actually is                                                                                             | What it costs                                                                                                                                     | Owner                                         | Do engineering decisions move it?                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fraud**                        | Third party (or the customer) obtains value they are not entitled to                                            | Direct loss + scheme fees + review headcount + revenue lost to false declines                                                                     | Head of Risk / Fraud                          | **Heavily.** Latency budget, feature freshness, limit enforcement, idempotency (M7) all change the loss                                                          |
| **Credit**                       | A counterparty owes you and does not pay                                                                        | Expected loss (priced in) and unexpected loss (capital); provisions hit P&L before cash does                                                      | Chief Credit Officer / CRO                    | **Moderately.** Data quality, exposure aggregation, limit enforcement (M12), collections tooling                                                                 |
| **Market**                       | Value changes because a price, rate or FX moves                                                                 | Mark-to-market P&L volatility; margin calls                                                                                                       | Treasury / CRO                                | **Moderately.** Where FX is booked (M16), what is hedged, whether exposure is even visible in real time                                                          |
| **Liquidity**                    | You are solvent but cannot pay today                                                                            | Failed settlement, breached cutoff, a rail suspended, reputational blow-up                                                                        | Treasury                                      | **Yes.** Prefunding logic, cutoff handling, float modelling, settlement retries                                                                                  |
| **Operational**                  | Process, people, systems fail: duplicate payouts, bad deploy, wrong rate table                                  | Direct loss + remediation + regulatory attention                                                                                                  | COO / each service owner                      | **This is mostly yours.** Basel classifies "execution, delivery and process management" failures as operational risk; a double-charge bug is a formal loss event |
| **Model**                        | A model is wrong, mis-used, or right on data that no longer exists                                              | Mispriced credit, missed fraud, discriminatory decisions, supervisory findings                                                                    | Model Risk / Validation                       | **Yes.** Reproducibility, versioning, feature parity, monitoring (§14)                                                                                           |
| **Compliance / financial crime** | You facilitate money laundering, sanctions evasion, or terrorist financing; or you fail to detect and report it | Penalties, deferred-prosecution agreements, licence conditions, personal liability for named officers, remediation programmes that dwarf the fine | MLRO / BSA Officer / Chief Compliance Officer | **You build it; you do not own it.** Thresholds, typologies and filing decisions belong to the compliance owner                                                  |

Two observations that change design:

- **Fraud loss is measured; false-decline loss is not.** Declined good customers do not appear in any
  loss account. They appear as unexplained conversion softness eighteen months later. §5 gives the
  framing that puts both on the same axis.
- **Financial-crime risk is not a loss distribution you can optimise.** Fraud has an expected value;
  a sanctions breach has a regulator. Do not let a data scientist "tune" a sanctions threshold on an
  ROC curve. §11 and §12 are governance surfaces with engineering underneath, not the reverse.

## 2. Fraud detection architecture

### 2.1 The decision path

```
event (auth / signup / payout request / login)
  → context assembly (entity resolution: user, card token, device, session, IP)
  → feature fetch (online store; precomputed + a few streaming counters)
  → rules engine (deterministic, versioned, explainable)
  → model ensemble (score + reason codes)
  → policy layer (combines rule verdicts, score, limits (M12), sanctions verdict)
  → outcome: APPROVE | STEP_UP | REVIEW | DECLINE
  → decision record written append-only (M14) with inputs, versions, and outcome
```

The **decision record is the deliverable**, not the score: every feature value used, the feature-store
version, the rule set version, the model version, the thresholds in force, the outcome and the reason
codes. Without it you cannot debug a decision, retrain honestly, answer a complaint or satisfy an
adverse-action request (§8.6). Write it on the same path as the decision — an outbox is fine (see
`architecture-ops.md`), a fire-and-forget log is not.

### 2.2 Latency budget

In the authorization path you own a slice of a card-scheme timeout measured in single-digit seconds
end to end, most of which belongs to other parties. Budget **100–300 ms p99** for the whole risk
decision and design to fit p99.9, not the mean.

| Stage                                  | Typical p99 budget | Notes                                                                 |
| -------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| Context assembly / entity resolution   | 5–15 ms            | Token → user → account lookups; keep them one hop away                |
| Online feature fetch                   | 10–40 ms           | One batched read, not N reads. Multi-get or nothing                   |
| Rules evaluation                       | 1–5 ms             | In-process, compiled ruleset; never a network call per rule           |
| Model inference                        | 5–25 ms            | In-process (ONNX/booster) beats a model-server hop for tabular models |
| Graph / link lookup                    | 10–40 ms, optional | Precomputed neighbourhood features, hard timeout, degrade cleanly     |
| Policy, limits check-and-reserve (M13) | 5–20 ms            | A database round trip you cannot skip                                 |
| Decision record write                  | async via outbox   | Never block the response on analytics sinks                           |

What that budget **excludes**, and what teams keep trying to put in it: synchronous human review;
cross-region round trips; unbounded third-party calls (device intelligence, consortium data, KYC
vendors) without a hard timeout and a declared default; on-the-fly multi-hop graph traversal;
document/liveness checks; LLM calls. Anything that cannot meet the budget belongs upstream
(precomputed) or downstream (post-authorization review, before capture or before payout).

**Fail policy per check, declared, not emergent:**

| Check                                  | On timeout / error                              | Rationale                                                                                   |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Sanctions screening                    | **Fail closed** — hold or refuse                | Strict liability (§11.5). There is no acceptable "we let it through because Redis was slow" |
| Hard limits (M12)                      | **Fail closed** — refuse                        | A limit that is skipped under load is not a limit                                           |
| Fraud model                            | Degrade to rules, flag the decision as degraded | Business decision, made in advance, with a monitored blast radius                           |
| Third-party device / consortium signal | Treat as _missing_, an explicit feature value   | Never impute silently: "missing" is itself predictive and must be a modelled category       |

### 2.3 Feature store and the online/offline skew problem

The single largest source of quietly broken fraud models is **training on features that could not
have been known at decision time, or that are computed by different code online and offline.**

Rules that eliminate it:

1. **One implementation.** The same function serves the online path and the training backfill. If the
   code cannot be shared, a parity test must replay a sample of production decisions through the
   offline path and assert value equality (M18).
2. **Point-in-time correctness.** A training row for a decision at `t` contains only data with
   `event_time <= t` _and_ `available_time <= t`. A chargeback arriving at `t+45d` is a label, never
   a feature. Availability lag is real: a nightly-batch feature is not available at 09:00 the same day.
3. **Compute from the event log, not from a mutable aggregate.** A counter row that services
   increment drifts, cannot be recomputed for a historical timestamp, and is corrupted by a replay.
   Derive velocity from the immutable stream; treat any online counter as a cache with a declared
   staleness bound, continuously verified against recomputation (M1, M17).
4. **Version features like code.** A feature whose definition changed is a different feature.

```python
"""Rolling velocity features computed from the immutable event log (M1, M17)."""
from __future__ import annotations

from bisect import bisect_left
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class AuthEvent:
    event_id: str
    occurred_at: datetime      # tz-aware event time (M10)
    available_at: datetime     # when the platform could have known it
    entity_key: str            # "card:tok_9f2", "device:d81", "ip:203.0.113.7", "bin:411111"
    minor_units: int           # exact quantity (M4)
    currency: str
    approved: bool


class VelocityIndex:
    """Count/sum over a rolling window for one entity key, in one currency.

    Point-in-time correct by construction: `as_of` filters on both event time and
    availability time, so the identical call site serves the online decision and the
    training backfill. No mutable counter is involved, so a replay is idempotent.
    """

    def __init__(self, events: list[AuthEvent], currency: str) -> None:
        if any(e.currency != currency for e in events):
            # cross-currency velocity is an arithmetic lie; convert explicitly or
            # keep one index per currency (M6)
            raise ValueError("VelocityIndex is single-currency")
        self.currency = currency
        self._events = sorted(events, key=lambda e: e.occurred_at)
        self._times = [e.occurred_at for e in self._events]

    def window(self, as_of: datetime, span: timedelta) -> list[AuthEvent]:
        lo = bisect_left(self._times, as_of - span)
        hi = bisect_left(self._times, as_of)
        return [e for e in self._events[lo:hi] if e.available_at <= as_of]

    def features(self, as_of: datetime, span: timedelta, label: str) -> dict[str, object]:
        w = self.window(as_of, span)
        declined = sum(1 for e in w if not e.approved)
        return {
            f"cnt_{label}": len(w),
            f"amt_{label}_minor": sum(e.minor_units for e in w),
            # missing, not zero — the model must be able to tell the two apart
            f"decline_ratio_{label}": (Decimal(declined) / Decimal(len(w))) if w else None,
        }
```

The production version keeps a streaming counter for the short windows and reconciles it against
this recomputation on a schedule; the recomputation is the authority when they disagree (M1, M17).

### 2.4 Rules plus models, not rules versus models

| Layer                       | Good at                                                                                              | Bad at                                                  | Change control                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Rules                       | Known typologies, hard policy, instant response to an attack, explainability, regulatory constraints | Generalising; combinatorial explosion; silent staleness | Versioned, reviewed, deployable in minutes, with an expiry date per rule |
| Gradient-boosted model      | Ranking marginal risk across many weak signals                                                       | Novel attacks, causal claims, anything unlabelled       | Validated, versioned, shadow-then-champion (§5.4)                        |
| Graph / entity features     | Rings, shared-artefact clusters, mules                                                               | Latency; precision without corroboration                | Precomputed, refreshed on a stated cadence                               |
| Consortium / vendor signals | Cross-merchant reputation                                                                            | Cost, latency, opacity, vendor lock-in                  | Timeout + declared default; never a hard dependency                      |

Every rule needs an owner, a creation reason, a measured hit rate and precision, and a review date.
Rules created during an incident and never revisited are the main reason mature fraud stacks decline
good customers for reasons nobody can articulate.

### 2.5 Outcomes, and why DECLINE is not the safe default

| Outcome     | Use when                                                                          | Cost                                                                                                                | Reversibility                                                                                 |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **APPROVE** | Expected value of approving beats every alternative                               | Fraud loss when wrong                                                                                               | Post-auth controls still available (hold capture, delay payout)                               |
| **STEP_UP** | Risk is concentrated in "is this really the account holder?"                      | Friction, abandonment; 3DS shifts fraud liability to the issuer when authenticated                                  | Customer can complete it                                                                      |
| **REVIEW**  | Signal is ambiguous and the exposure justifies human time                         | Analyst minutes, latency to the customer, queue SLA risk                                                            | Fully reversible; but a queue that overflows becomes an auto-decline                          |
| **DECLINE** | Expected loss dominates even after step-up, or policy/limit/sanctions requires it | Lost revenue, lost customer lifetime value, support contact, and possibly a fair-lending or discrimination question | **Effectively irreversible** — the customer goes elsewhere and you never learn they were good |

"Decline everything suspicious" is not maximum safety; it is moving loss from a measured account to
an unmeasured one. A team that reports fraud loss without reporting false-positive rate and approval
rate on the same slide is optimising half the objective, and the missing half is usually the larger
number. Label both when reporting (M20).

## 3. Signals and features

| Family                     | Representative features                                                                                                                        | Notes and traps                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Velocity**               | count/amount over 1m, 1h, 24h, 7d, 30d, per card, user, device, IP, IP /24, BIN, email domain, shipping address, merchant                      | The keys matter more than the windows. Per-BIN and per-IP-block velocity is what catches enumeration; per-card velocity does not                                                                                |
| **Ratios**                 | decline ratio, CVV/AVS failure ratio, distinct-cards-per-device, distinct-devices-per-user, new-payee ratio                                    | Ratios over small denominators are noise: emit `null` below a minimum count, never a spuriously precise 1.0                                                                                                     |
| **Device**                 | fingerprint hash, OS/browser coherence, emulator/VM markers, timezone vs IP, canvas/WebGL entropy, app integrity attestation                   | Fingerprints decay and are spoofable; treat as a weak identifier with a confidence, never as an identity. Consent and disclosure obligations attach (see `compliance-regulatory.md`)                            |
| **Behavioural biometrics** | typing cadence, mouse/touch dynamics, form-fill order, paste-vs-type of card number, session hesitancy                                         | Strongest for account takeover; weakest for a first-time user. In several jurisdictions this is biometric-adjacent personal data with its own legal basis question — do not deploy without a privacy assessment |
| **Graph / link**           | shared card across accounts, shared device, shared address normalised, shared bank account, shared phone, k-hop count of confirmed-fraud nodes | Precomputed neighbourhood aggregates only in the auth path. Contamination is the trap: one dirty node poisons a legitimate hub such as a shared office IP or a family device                                    |
| **BIN / issuer**           | country, brand, product type (debit/credit/prepaid/commercial), issuer, funding source                                                         | Prepaid + cross-border + high ticket is a classic combination; also a classic false-positive generator against legitimate travellers                                                                            |
| **Geo / IP**               | IP country vs BIN country vs shipping vs billing, proxy/VPN/Tor/hosting-ASN flags, impossible travel                                           | VPN use is not fraud; correlating it with other signals is the point. Datacentre-ASN traffic on a consumer product is a stronger signal                                                                         |
| **Identity tenure**        | email age and reputation, phone line type (mobile/VoIP), phone tenure and porting recency, SIM-swap indicators, account age                    | Recent porting plus a password reset plus a new payee is a near-canonical ATO pattern                                                                                                                           |
| **Address verification**   | AVS response codes, address normalisation/geocoding, freight-forwarder and reshipper lists, PO-box and CMRA detection                          | AVS is US/UK-centric and partially meaningless elsewhere; do not treat "AVS unavailable" as "AVS failed"                                                                                                        |
| **Payment instrument**     | token age, card-on-file vs new entry, 3DS authentication result, network token vs PAN, prior successful auths                                  | 3DS result is a decision input _and_ a liability determinant — record both                                                                                                                                      |

Two rules that survive every stack: **missing is a value** (encode it explicitly, never impute to a
neutral default), and **the entity key is the design decision**, not the aggregation. Most detection
lift comes from picking the right thing to count over, not from a better model.

## 4. Fraud typologies

| Typology                           | What it looks like                                                                                       | Primary signals                                                                                                                                  | Detection                                                                                                                                               | Control                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Card testing / enumeration**     | Thousands of low-value auths across many BINs, high decline ratio, few captures                          | Per-IP/ASN/device velocity, decline ratio, CVV/AVS failure ratio, sequential PANs within a BIN                                                   | Rate anomaly on decline volume, not on approved volume; BIN-range sweep detection                                                                       | Aggressive per-IP and per-device rate limits, CAPTCHA/attestation on card-add, $0/low-value auth restrictions, block hosting ASNs on consumer flows. Scheme monitoring of enumeration exists and carries fees                                                                                                                                    |
| **Account takeover (ATO)**         | Login from new device, credential-stuffing pattern, then contact-detail change, then payout or new payee | Device novelty, impossible travel, SIM-swap/port recency, behavioural biometrics drift, change-then-transact sequence                            | Sequence rules beat point-in-time scores: the _pattern_ of change → cooldown → withdrawal is the detection                                              | Step-up on sensitive changes, cooling-off before payout to a new destination, out-of-band notification to the _old_ contact details, session invalidation on credential change                                                                                                                                                                   |
| **First-party / "friendly" fraud** | Genuine cardholder disputes a genuine purchase                                                           | Prior dispute history, delivery confirmation, device/IP match to prior good orders, digital-goods consumption logs                               | Only visible at dispute time; needs evidence retention from the order forward                                                                           | Compelling-evidence submissions (Visa CE3.0 for reason code 10.4 and equivalents), delivery/consumption evidence, order-confirmation trails, blocklisting repeat disputers where scheme rules allow                                                                                                                                              |
| **Triangulation**                  | Fraudster runs a fake storefront, buys from you with stolen cards to fulfil real customer orders         | Mismatch of billing to shipping to email, repeat shipping addresses across unrelated accounts, unusually clean conversion                        | Graph on shipping address and recipient name; abnormally low refund/complaint rate with high chargeback lag                                             | Address-graph limits, delayed fulfilment for new accounts on high-resale-value SKUs                                                                                                                                                                                                                                                              |
| **Refund / return abuse**          | Refunds requested at scale, wardrobing, empty-box, "item not received" on delivered goods                | Refund rate per user, refund-to-purchase ratio, carrier proof-of-delivery, serial-claimant graph                                                 | Per-user lifetime refund economics, not per-transaction rules                                                                                           | Refund policy tiers by account history, manual review above a value threshold, refunds only to the original instrument (also an AML control)                                                                                                                                                                                                     |
| **Promo / bonus abuse**            | Many accounts farming signup credit, referral loops                                                      | Device and payment-instrument reuse, address normalisation collisions, referral graph cycles                                                     | Graph clustering on shared artefacts; cohort economics by acquisition source                                                                            | One-per-entity enforcement at the _entity_ level (device + instrument + address), not the email level; promo cost caps as hard limits (M12)                                                                                                                                                                                                      |
| **Mule accounts**                  | Account receives many inbound credits and immediately forwards them out                                  | Rapid in-out with near-zero balance retention, counterparty fan-in/fan-out, young account with high throughput, unrelated-payer pattern          | Transaction monitoring scenarios (§12), not the auth-path model                                                                                         | Onboarding EDD, payout holds and cooling-off, throughput limits scaled to declared income/activity, escalation to compliance (never a silent block — see tipping-off, §12.4)                                                                                                                                                                     |
| **Synthetic identity**             | A fabricated identity built from real fragments, cultivated over months, then busted out                 | Thin file with recent credit-building activity, SSN/DOB inconsistency, shared SSN across identities, address clustering, sudden utilisation ramp | Bureau/consortium checks plus tenure and graph features; the bust-out ramp is the last chance to catch it                                               | Identity verification at onboarding (§10), exposure growth limits, no automatic limit increases without re-verification                                                                                                                                                                                                                          |
| **BEC / APP scams**                | The genuine customer is deceived into authorising a payment to the fraudster                             | New payee, urgency and coaching indicators, payment to a recently created beneficiary, mismatch of account name to payee name                    | Payee-level intelligence, name-matching on the beneficiary (e.g. Confirmation of Payee-style checks), behavioural anomaly vs the customer's own history | Warnings and friction at the point of payment, delayed first payment to a new payee, out-of-band confirmation for high value. **Reimbursement obligations differ by jurisdiction** — in the UK, mandatory APP reimbursement rules apply to designated payment systems; treat the liability model as a legal input, not an engineering assumption |

## 5. Decisioning economics

### 5.1 Expected value, not accuracy

Every outcome has a payoff. Compute it explicitly, in money (M4), and pick the maximum.

Let `p` = probability the event is fraudulent, `m` = contribution margin from a good transaction,
`L` = total loss when a fraudulent transaction is approved (goods/funds + chargeback fee +
operational handling), `c_r` = fully loaded review cost, `d` = reviewer detection rate, `a` =
step-up abandonment rate for good customers, `r` = fraud reduction from the step-up (including
liability shift when 3DS authentication succeeds).

```python
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from enum import StrEnum

CENT = Decimal("0.01")


class Outcome(StrEnum):
    APPROVE = "APPROVE"
    STEP_UP = "STEP_UP"
    REVIEW = "REVIEW"
    DECLINE = "DECLINE"


@dataclass(frozen=True, slots=True)
class CostModel:
    """All values in the transaction currency; no cross-currency mixing (M6)."""
    margin: Decimal                   # m — see the lifetime-value caveat below
    loss_given_fraud: Decimal         # L: exposure + scheme fee + handling
    review_cost: Decimal              # c_r, fully loaded
    reviewer_detection: Decimal       # d in [0,1]
    stepup_abandonment: Decimal       # a in [0,1]
    stepup_fraud_reduction: Decimal   # r in [0,1], incl. 3DS liability shift
    stepup_cost: Decimal = Decimal("0")


def expected_values(p: Decimal, c: CostModel) -> dict[Outcome, Decimal]:
    good = Decimal(1) - p
    ev = {
        Outcome.APPROVE: good * c.margin - p * c.loss_given_fraud,
        Outcome.DECLINE: Decimal(0),                       # baseline: no revenue, no loss
        Outcome.STEP_UP: (good * (Decimal(1) - c.stepup_abandonment) * c.margin
                          - p * (Decimal(1) - c.stepup_fraud_reduction) * c.loss_given_fraud
                          - c.stepup_cost),
        Outcome.REVIEW: (good * c.margin
                         - p * (Decimal(1) - c.reviewer_detection) * c.loss_given_fraud
                         - c.review_cost),
    }
    return {k: v.quantize(CENT, rounding=ROUND_HALF_UP) for k, v in ev.items()}


def decide(p: Decimal, c: CostModel, *, hard_blocks: list[str]) -> tuple[Outcome, dict]:
    # Policy wins over economics: a sanctions hit or a breached limit is not a
    # trade-off (M12, §11). Economics only ranks what policy has already allowed.
    if hard_blocks:
        return Outcome.DECLINE, {"reason": "policy", "codes": hard_blocks}
    ev = expected_values(p, c)
    return max(ev, key=lambda k: ev[k]), {"ev": {k.value: str(v) for k, v in ev.items()}}
```

The pure two-outcome threshold falls out as `p* = m / (m + L)`. With a €4 transaction margin and a
€120 loss, `p* = 3.2 %` — decline anything above 3.2 % fraud probability. That number is almost
always wrong in practice, for one reason: **`m` must be the expected lifetime margin of the
relationship, not the margin on this transaction.** Substitute €150 of lifetime margin and the
threshold moves to 55 %. Which of those two numbers you use is a strategy decision made by the
business, documented, and reviewed — not a constant a fraud engineer picks.

### 5.2 Why AUC alone is the wrong target

| Metric                                                     | What it hides                                                                                                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUC / ROC                                                  | Ranks all pairs equally, including regions of the score distribution you will never operate in. Two models with identical AUC can differ by a factor of three in loss at your actual operating point |
| Accuracy                                                   | With 0.1 % fraud prevalence, "approve everything" scores 99.9 %                                                                                                                                      |
| Precision/recall at a fixed threshold                      | Useful, but only at the threshold you actually run, and only per segment                                                                                                                             |
| Value-weighted recall (fraud € caught / fraud € attempted) | The one that maps to the P&L; a model that catches many small frauds and misses the large ones looks excellent on count-based recall                                                                 |

Evaluate at the operating point, in money, per segment (channel, geography, product, ticket band),
and always alongside the approval rate. Report both (M20).

### 5.3 The label-lag problem

Fraud labels arrive late and asymmetrically:

| Label source                    | Typical lag                                                                      | Character                                                               |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Issuer fraud report (TC40/SAFE) | days to weeks                                                                    | Early, noisy, not a chargeback                                          |
| Card chargeback                 | 30–120 days, occasionally longer by scheme rules and reason code                 | The commercial label                                                    |
| ACH/direct-debit return         | 2–60 days depending on return reason (unauthorised returns have the long window) | Rail-specific                                                           |
| Confirmed ATO / customer report | hours to months                                                                  | Sparse                                                                  |
| Manual review outcome           | minutes                                                                          | Available immediately, but it is an _analyst's_ label, not ground truth |

Consequences you must design around:

1. **Recent data looks clean.** "Everything not yet charged back is good" biases the model toward
   approving exactly the pattern being exploited right now. Enforce a **label maturity window**:
   exclude events whose observation window has not elapsed, or treat the label as censored rather
   than binary.
2. **Declines have no labels.** You never learn whether a decline was fraud, so retraining on
   approved-only data reinforces the incumbent policy — the model becomes confident about a region
   it created. Mitigate with a small, dollar-capped random approval holdout and honest reject
   inference. The holdout is a deliberate purchase of information at a known loss rate, so it is a
   budget line risk leadership signs off, not a quiet experiment.
3. **Vintage, not calendar, reporting.** The last 30 days is not comparable to a mature month.
   Report by cohort with a maturity indicator and label the figure as incomplete (M20).
4. **Feedback contamination.** A rule that stops an attack removes the attack from the training data;
   the next model sees no reason for the rule and the next threshold change reopens the hole. Keep
   each rule's suppressed volume measured and visible.

### 5.4 Shadow mode and champion/challenger

| Stage            | Traffic                  | Decision authority | Exit criterion                                                                                  |
| ---------------- | ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| Offline backtest | 0 %                      | none               | Value-weighted lift at the operating point on out-of-time data                                  |
| Shadow           | 100 % scored, 0 % acting | none               | Score distribution stable, feature parity verified against online values, latency within budget |
| Challenger       | 1–10 %                   | acts on its slice  | Loss and approval rate both non-inferior over a full label-maturity window                      |
| Champion         | remainder                | acts               | Continuous monitoring (§14.3)                                                                   |

Never promote before a full label-maturity window has elapsed on the challenger slice. A challenger
evaluated over three weeks with a 60-day chargeback window has been evaluated on nothing.

Drift monitoring: population stability index on inputs and on the score, feature-level null-rate and
range alerts, and calibration checks (predicted vs realised fraud rate by score bucket) on matured
cohorts only.

## 6. Chargeback and dispute risk

### 6.1 Scheme monitoring programmes

Card networks operate monitoring programmes that measure a merchant's (and acquirer's) fraud and
dispute ratios and impose escalating fees, remediation plans and ultimately termination. The
specifics change — Visa consolidated its fraud and dispute monitoring into an acquirer-level
programme (VAMP) with a combined fraud-plus-dispute ratio, and Mastercard operates excessive
chargeback programmes at merchant level with count-and-ratio entry criteria; both have been revised
repeatedly and differ by region and merchant category.

**Do not hardcode a threshold from a blog post.** Take the numbers from the current rulebook via your
acquirer, record the source and effective date next to the constant, and alert well below the entry
criterion. The engineering-relevant facts are stable even when the numbers are not:

- The denominator differs between schemes (same-month sales count vs prior-month), so your internal
  ratio must replicate the scheme's definition or your dashboard will disagree with the notice.
- Entry is by **both** a count floor and a ratio: a low-volume merchant can sit above the ratio
  without entering a programme — until volume grows.
- Issuer-reported fraud ratio and dispute ratio are separate measures under separate programmes; a
  3DS liability shift can suppress the chargeback ratio while the fraud ratio keeps rising.
- Consequences escalate monthly: per-dispute fees, mandated remediation, and — the one that ends
  businesses — acquirer termination and placement on the terminated-merchant file.

### 6.2 Prevention tools

| Tool                                                               | Effect                                                                               | Caveat                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 3DS / SCA authentication                                           | Shifts fraud-dispute liability to the issuer when authentication succeeds            | Friction and abandonment; exemptions (low value, TRA) change the calculus. Does not help with first-party fraud |
| Order-insight / dispute-deflection networks (issuer-facing detail) | Resolves "I don't recognise this" before it becomes a dispute                        | Requires clean, human-readable descriptors and merchant data                                                    |
| Clear billing descriptor                                           | Removes a large share of "unrecognised transaction" disputes                         | The single cheapest control in this table                                                                       |
| Pre-dispute refund alerts                                          | Refund before the chargeback lands, avoiding the ratio hit                           | Costs the sale plus the alert fee; abuse risk                                                                   |
| Compelling evidence submissions                                    | Wins representments on first-party misuse when the prior-transaction evidence exists | Requires you to have retained device, IP, delivery and consumption evidence from the original order (M14)       |
| Delivery and consumption evidence retention                        | Wins "not received" and digital-goods disputes                                       | Retention policy must outlive the dispute window                                                                |

### 6.3 Accounting for chargebacks

Chargebacks are a known cost of doing business with an estimable rate, so they are provisioned, not
recognised only when they land. The typical treatment is a loss provision measured from historical
chargeback rates by cohort (an estimate under the applicable provisions/contingencies standard —
IAS 37 or ASC 450 — while genuine refunds of revenue are a refund liability under the revenue
standard). **Which classification applies is the finance owner's determination**; the engineering
obligation is that the estimate is reproducible from the ledger and that the postings are explicit
and balanced (M2, M16, M19).

| Event                                                     | Posting                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Period-end estimate of future chargebacks on booked sales | Dr Chargeback loss (expense) / Cr Chargeback provision (liability)                                                                       |
| Chargeback received, funds debited by the acquirer        | Dr Chargeback provision / Cr PSP receivable (principal) — plus Dr Dispute fee expense / Cr PSP receivable (fee, a separate posting, M16) |
| Representment won, funds returned                         | Reversing entries citing the originals (M3), never an update                                                                             |
| Provision re-estimate                                     | Dr/Cr Chargeback loss for the delta, in the open period only (M10)                                                                       |

Dispute notifications arrive from the PSP as webhooks — at-least-once and forgeable — so verify the
signature and deduplicate on the provider's event id _before_ posting (M8). Break management, cutoff
and the settlement-file matching that surfaces these events live in `reconciliation-close.md`.

## 7. Limits as a control

A limit is the only fraud control that works when the model is wrong, the vendor is down, the feature
store is stale and the attacker is novel. It is also the control most often implemented in the
front end and nowhere else.

| Limit type            | Example                                                      | Enforcement point                                           |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| Per transaction       | max €10,000 per outbound transfer                            | Server-side, in the money-movement service                  |
| Per rolling window    | max 5 payouts / 24 h; max €25,000 / 7 d                      | Same service, computed from postings, not from a UI counter |
| Per counterparty      | max €2,000/day to a payee created < 30 days ago              | Payment initiation                                          |
| Per account / product | daily ATM, daily card spend, per-product ceilings            | Authorization path                                          |
| Aggregate exposure    | total credit exposure to a group of connected counterparties | Credit decisioning + a nightly aggregation with an alert    |
| Velocity of change    | max one payout-destination change per 24 h                   | Profile-change service                                      |
| Operational           | max total value a batch job may disburse in one run          | The job itself, plus a kill switch                          |

Non-negotiables:

- **Never only in the UI.** The UI limit is a usability affordance. The enforced limit lives on the
  server, in the service that performs the effect, behind the same transaction as the effect (M12).
- **Check-and-reserve atomically** (M13). Read-then-write loses to concurrency every time, and
  concurrency is exactly what an attacker supplies.
- **Refuse, never clamp.** Silently reducing a €10,000 request to the €5,000 limit produces a
  partial transfer nobody asked for and an angry reconciliation. Return a specific, typed error that
  names the limit and the remaining headroom (M12).
- **A retry must not create headroom.** The idempotency key (M7) covers the limit consumption too:
  replaying a refused request returns the same refusal.

```sql
-- Atomic check-and-reserve: one statement, one transaction (M13).
-- Zero rows returned == refused. The caller surfaces a typed limit error (M12).
WITH locked AS (
    SELECT account_id
      FROM accounts
     WHERE account_id = :account AND currency = :ccy
     FOR UPDATE                                  -- serialises concurrent spends
),
avail AS (
    SELECT
      (SELECT COALESCE(SUM(signed_minor_units), 0)
         FROM postings
        WHERE account_id = :account)
    - (SELECT COALESCE(SUM(minor_units), 0)
         FROM holds
        WHERE account_id = :account
          AND state = 'ACTIVE'
          AND expires_at > now())                AS available_minor_units,
      (SELECT COALESCE(SUM(minor_units), 0)
         FROM money_movements
        WHERE account_id = :account
          AND created_at > now() - interval '24 hours') AS window_used_minor_units
      FROM locked
)
INSERT INTO holds (hold_id, account_id, currency, minor_units, state,
                   expires_at, idempotency_key, created_at)
SELECT :hold_id, :account, :ccy, :amount, 'ACTIVE',
       now() + :ttl, :idempotency_key, now()
  FROM avail
 WHERE available_minor_units >= :amount
   AND :amount <= :per_txn_limit
   AND window_used_minor_units + :amount <= :rolling_24h_limit
-- A no-op update, not DO NOTHING: a replayed key must RETURN the original hold,
-- otherwise the caller cannot tell a replay from a refusal (M7).
ON CONFLICT (idempotency_key)
  DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
RETURNING hold_id;
```

The `SUM(postings)` above is illustrative; production reads a verified balance cache with a declared
staleness bound (M17). See `ledger.md` for the hold lifecycle and expiry.

**Temporary lifts** are the interesting case, because they are where controls are laundered into
exceptions. A lift is a first-class object: requester, approver (a different identity — M11),
reason, scope (which account, which limit, which amount), an expiry that is enforced by the system
rather than by a calendar reminder, and an entry in the append-only audit trail (M14). Automation
may propose a lift; automation never approves one. Report lifts granted, by approver, monthly —
a rising count is a signal that the limit is set wrong or that someone is routing around it.

## 8. Credit risk

### 8.1 Scorecards and their governance

An application or behavioural scorecard is a model, and in most jurisdictions a consequential one.
Whatever the technique — logistic regression on weight-of-evidence bins, or a gradient-boosted model
with SHAP-based reason codes — the obligations are the same: documented development, independent
validation, monitored performance, versioned artifacts, reproducible scores, and the ability to
explain any individual decision after the fact (§8.6, §14). Bank supervisors in the US set the
expectation through model-risk-management supervisory guidance (the "SR 11-7" framework: development
and implementation, validation with effective challenge, and governance); non-bank lenders are held
to substantively similar expectations by their regulators and their funding partners.

### 8.2 Expected loss

`EL = PD × LGD × EAD`, all three defined over a stated horizon and a stated definition of default
(commonly 90 days past due, which IFRS 9 treats as a rebuttable presumption).

| Term    | Definition                                                                                                            | Where it comes from                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **PD**  | Probability of default over the horizon                                                                               | Scorecard calibrated to observed default rates by vintage                                         |
| **LGD** | Loss given default = 1 − recovery rate, net of collection costs, discounted                                           | Recovery curves from collections history; secured vs unsecured differ enormously                  |
| **EAD** | Exposure at default: drawn balance plus expected further drawdown of undrawn commitments (a credit conversion factor) | Revolving products are where this bites: a customer draws the remaining limit _before_ defaulting |

Worked: a revolving line with €8,000 drawn and €4,000 undrawn, CCF 60 %, 12-month PD 3.2 %, LGD 45 %.
`EAD = 8,000 + 0.60 × 4,000 = 10,400`. `EL = 0.032 × 0.45 × 10,400 = €149.76`. Note that ignoring the
undrawn commitment understates EL by 23 % — this is the single most common credit modelling error in
fintech lending books.

### 8.3 IFRS 9 three-stage ECL

IFRS 9 replaced incurred loss with expected credit loss. The general model has three stages
(US GAAP's CECL, ASC 326, differs: lifetime expected losses from initial recognition, no staging —
if you report under both, you maintain both).

| Stage | Criterion                                                               | Allowance        | Interest revenue basis                                                   |
| ----- | ----------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| **1** | No significant increase in credit risk (SICR) since initial recognition | 12-month ECL     | Effective interest on **gross** carrying amount                          |
| **2** | SICR since initial recognition, not credit-impaired                     | **Lifetime** ECL | Effective interest on **gross** carrying amount                          |
| **3** | Credit-impaired (objective evidence of impairment)                      | **Lifetime** ECL | Effective interest on the **net** carrying amount (gross less allowance) |

SICR is a **relative** test — a change in lifetime PD since origination — not an absolute risk level.
A loan originated at high risk that stays at that risk is Stage 1. IFRS 9 provides a rebuttable
presumption that SICR has occurred when payments are more than 30 days past due, and permits a
low-credit-risk exemption. Trade receivables and contract assets commonly use the simplified
approach: lifetime ECL from the start, often via a provision matrix. Staging criteria, the SICR
definition, scenario weights and the definition of default are **accounting policy choices owned by
the finance function and signed off by the auditor** (see `compliance-regulatory.md`); engineering
implements them and makes them reproducible.

```python
"""IFRS 9 ECL for one exposure, probability-weighted across forward-looking scenarios."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


@dataclass(frozen=True, slots=True)
class Scenario:
    name: str
    weight: Decimal          # weights must sum to exactly 1
    pd_multiplier: Decimal   # macro overlay applied to the base PD
    lgd_multiplier: Decimal


@dataclass(frozen=True, slots=True)
class Exposure:
    ead_minor_units: int     # exact quantity (M4)
    currency: str
    pd_12m: Decimal
    pd_lifetime: Decimal
    lgd: Decimal
    stage: int               # 1, 2 or 3, from the policy-owned staging rules
    eir: Decimal             # effective interest rate, for discounting
    years_to_maturity: Decimal


def ecl(e: Exposure, scenarios: list[Scenario]) -> tuple[int, dict[str, str]]:
    if sum(s.weight for s in scenarios) != Decimal(1):
        raise ValueError("scenario weights must sum to 1")
    # Stage 1 uses 12-month PD; stages 2 and 3 lifetime; in stage 3 default has occurred
    pd_base = {1: e.pd_12m, 2: e.pd_lifetime, 3: Decimal(1)}[e.stage]
    horizon = Decimal(1) if e.stage == 1 else e.years_to_maturity
    discount = (Decimal(1) + e.eir) ** (horizon / Decimal(2))   # mid-horizon approximation

    total, breakdown = Decimal(0), {}
    for s in scenarios:
        pd = min(pd_base * s.pd_multiplier, Decimal(1))
        lgd = min(e.lgd * s.lgd_multiplier, Decimal(1))
        contribution = s.weight * (pd * lgd * Decimal(e.ead_minor_units) / discount)
        breakdown[s.name] = str(contribution.quantize(CENT, rounding=ROUND_HALF_UP))
        total += contribution
    # rounding happens once, at the declared point (M5)
    return int(total.quantize(Decimal(1), rounding=ROUND_HALF_UP)), breakdown
```

Worked example, one €10,400 exposure, LGD 45 %, EIR 12 %, 3 years to maturity, scenarios base 60 % /
downside 30 % / upside 10 % with PD multipliers 1.0 / 1.9 / 0.7:

| Stage        | PD used | Weighted PD | Undiscounted ECL | Discounted allowance     |
| ------------ | ------- | ----------- | ---------------- | ------------------------ |
| 1 (12-month) | 3.2 %   | 3.97 %      | €185.70          | €175 (0.5-year discount) |
| 2 (lifetime) | 17.5 %  | 21.70 %     | €1,015.56        | €857 (1.5-year discount) |

The Stage 1 → Stage 2 migration of this single loan costs €682 of P&L on the day the staging rule
trips. That cliff is why SICR definitions attract auditor and supervisor attention, and why the
staging rule must be reproducible from stored inputs (M17, M19). Discounting, effective interest and
day-count conventions are in `money-arithmetic.md`; do not improvise them here.

### 8.4 The postings

| Event                            | Posting                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Origination                      | Dr Loans receivable (gross) / Cr Cash — plus fee and cost postings separately (M16)                                  |
| Initial ECL recognition          | Dr Impairment loss (P&L) / Cr Loss allowance (contra-asset)                                                          |
| Stage migration or remeasurement | Dr/Cr Impairment loss for the delta only, in the open period (M10)                                                   |
| Interest accrual, Stage 1–2      | Dr Interest receivable / Cr Interest income, on the gross carrying amount                                            |
| Interest accrual, Stage 3        | Same accounts, computed on the **net** carrying amount                                                               |
| Write-off                        | Dr Loss allowance / Cr Loans receivable (gross) — a derecognition, not a loss event; the loss was recognised earlier |
| Post-write-off recovery          | Dr Cash / Cr Impairment loss (recovery)                                                                              |

Every entry above is balanced (M2) and reversible only by a reversing entry (M3), and the ECL run
must be reproducible: same inputs, same model version, same scenario set, same number. Store the
model version and the scenario weights on the run, not just the output.

### 8.5 Delinquency, collections, recoveries

| Concept                   | Definition                                   | Engineering note                                                                                                                                        |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delinquency bucket        | Days past due band (1–29, 30–59, 60–89, 90+) | Compute from the schedule and the postings, at a declared cutoff time (M10). Timezone bugs here move loans between buckets and therefore between stages |
| Roll rate                 | Probability of moving from bucket n to n+1   | The workhorse of short-horizon loss forecasting                                                                                                         |
| Cure                      | Return to current                            | Cure rules (consecutive payments required) are policy, and affect stage reversal                                                                        |
| Restructure / forbearance | Modified terms due to financial difficulty   | Has its own disclosure and staging consequences; must be flagged as such at the data level, never modelled as a normal amendment                        |
| Charge-off                | Accounting write-off of the gross asset      | Distinct from ceasing collection efforts; the receivable may still be pursued                                                                           |
| Recovery                  | Cash received after write-off                | Booked as a recovery, never by reversing the write-off                                                                                                  |

Collections activity is regulated conduct (contact frequency, hours, disclosures, third-party
collectors). Rate limits and contact logs in the collections system are compliance evidence (M14).

### 8.6 Adverse action and explainability (US)

Under ECOA and Regulation B, a creditor that takes adverse action on an application must give the
applicant a notice with the **specific principal reasons** for the decision (or a right-to-request
disclosure), generally within 30 days of receiving a completed application. Under FCRA, when the
adverse action is based in whole or in part on information in a consumer report, a separate notice
must identify the consumer reporting agency and inform the consumer of the right to a free copy and
to dispute the information; risk-based pricing notices have their own rule.

Consequences for design, which supervisors have stated explicitly for complex models:

- Reasons must be **accurate and specific to that applicant**. Picking the nearest entry from a
  generic reason-code checklist because the model is opaque does not satisfy the obligation.
- So the decision record must retain, per decision, the model version, the feature values and the
  attribution that produced the reason codes (M14). Recomputing an explanation months later from a
  since-retrained model is not an explanation of that decision.
- Adverse action can be triggered by a limit reduction or an account closure, not only a decline,
  and fraud declines on a credit product are not automatically outside these regimes. Which actions
  trigger which notice is a legal determination — get the mapping in writing and encode it as data,
  not as scattered conditionals.

This describes obligations; it is not legal advice. Applicability, notice content and timing are
decided by compliance and counsel.

## 9. Market and liquidity risk, briefly

For a payments or lending business these are usually smaller than fraud and credit — until the day
they are the only risk that matters.

| Exposure             | Where it comes from                                                                                                                                | Control                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FX mark-to-market    | Holding balances or receivables in a currency other than the functional currency; guaranteeing a customer rate before you buy the currency         | Position reporting per currency (never netted across, M6), a hedging policy with a stated tolerance, spread booked as its own posting (M16) |
| Rate risk            | Funding floating and lending fixed (or vice versa)                                                                                                 | Duration/repricing gap analysis; treasury's problem, but your data feeds it                                                                 |
| Settlement liquidity | Money owed to merchants today vs money arriving from the acquirer tomorrow; prefunding requirements on instant rails; cutoff times you cannot miss | Intraday cash-position view sourced from the ledger (M19), automated cutoff alerts, prefunding buffers with monitored floors                |
| Float                | Customer funds held between receipt and disbursement                                                                                               | Safeguarding rules may prohibit commingling and constrain investment entirely — a licence question (see `compliance-regulatory.md`)         |
| Concentration        | One PSP, one acquirer, one sponsor bank, one correspondent                                                                                         | A named single-point-of-failure register, contractual notice periods, a tested secondary route, and exposure caps as real limits (M12)      |

**VaR and expected shortfall** measure the loss distribution of a trading book: VaR is a quantile
("we lose no more than X with 99 % confidence over one day"); expected shortfall is the mean loss
beyond that quantile and is the Basel-preferred measure precisely because VaR says nothing about the
tail. Both are estimates from a chosen window and distributional assumption, both are not subadditive
(VaR) or cheap to backtest (ES), and both assume the historical correlation structure holds — which
is exactly what fails in a crisis. Use them as a monitoring signal with stated assumptions, never as
a limit that a business can optimise against. Depth on instruments, marks, position keeping and P&L
attribution is in `markets-trading.md`.

## 10. KYC and KYB

### 10.1 What identity verification actually does

| Method                                                                                                        | Proves                                                                        | Fails against                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Document capture + liveness                                                                                   | The document is genuine, unaltered, and presented by the live person depicted | High-quality forgeries, injection attacks against the camera pipeline, deepfake liveness bypass |
| Database / bureau check                                                                                       | The identity exists and is consistent with authoritative records              | Synthetic identities cultivated to be consistent; thin files                                    |
| Bank account verification (micro-deposit, or account-name check via open banking — `banking-open-finance.md`) | Control of a bank account in a matching name                                  | Mule accounts, which are genuine accounts controlled by the wrong person                        |
| Knowledge-based authentication                                                                                | Little, in the era of breach corpora                                          | Effectively everything; avoid as a sole factor                                                  |
| Electronic ID / national scheme (eIDAS-notified eID, BankID, Aadhaar-style)                                   | Strong identity assurance where available                                     | Geographic coverage                                                                             |

Combine: document plus liveness plus a database corroboration plus device and behavioural signals.
The verification result carries an **assurance level**, and downstream products should be gated on
that level rather than on a boolean `kyc_passed`.

### 10.2 KYB and ultimate beneficial ownership

Business onboarding is a graph problem: the entity, its registry record, its directors and officers,
its owners, and the owners of its owners, until you reach natural persons.

- **UBO thresholds are set by regulation.** EU AML rules use ownership of more than 25 % (direct or
  indirect) as the indicator, with a control test as an alternative; the US CDD Rule for covered
  financial institutions uses a 25 % equity prong plus a single control-person prong. The separate
  Corporate Transparency Act beneficial-ownership reporting regime has been materially narrowed by
  rulemaking and litigation since 2024 — **verify its current scope with counsel rather than
  encoding last year's understanding**.
- Model ownership as a weighted graph and compute effective ownership through chains, including
  circular structures. A 30 % holder of a 60 % holder is an 18 % indirect owner — below threshold
  alone, above it when combined with a direct 10 % stake.
- Store the evidence per link (registry extract, share register, attestation) with its retrieval
  date. "We checked" is not evidence; the document and its timestamp are (M14).
- Nominees, trusts, bearer instruments and opaque jurisdictions are exactly the structures that need
  a human. Build for a compliance analyst to intervene, not for full automation.

### 10.3 Risk-based CDD and EDD

Customer due diligence is risk-based by design: standard CDD for most, simplified where permitted,
enhanced where risk is higher. Typical EDD triggers (the actual list is set by the firm's
risk assessment, approved by the MLRO):

| Trigger                                                            | Typical EDD response                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Politically exposed person, family member or close associate       | Senior management approval to onboard, source-of-wealth evidence, enhanced ongoing monitoring |
| High-risk third country / jurisdiction on the applicable list      | Additional identity and source-of-funds evidence                                              |
| Complex or opaque ownership structure                              | Full UBO chain evidence, rationale for the structure                                          |
| Cash-intensive or high-risk sector                                 | Expected-activity profile and tighter monitoring thresholds                                   |
| Correspondent banking / payment-service intermediary relationships | Respondent due diligence, AML programme review, no payable-through account without controls   |
| Unexplained activity inconsistent with the profile                 | Source-of-funds request, escalation, possible exit                                            |

**Review cadence:** periodic review by risk tier (commonly annual for high risk, longer for lower
tiers) _plus_ event-driven review triggered by a material change — new UBO, adverse media, a
monitoring alert, a sanctions list change, a big shift in activity. Perpetual KYC (continuous,
trigger-based) is increasingly the target model; either way, the cadence is defined by compliance.

### 10.4 What you store versus what you must prove

The tension: AML law requires you to obtain and retain identification evidence for a defined period
(five years after the end of the relationship is the common baseline under both EU AML rules and the
US BSA), while data-protection law requires minimisation and storage limitation. They coexist as
follows:

- The lawful basis for retaining KYC data is the **legal obligation**, scoped to what the obligation
  requires. Data collected beyond it (marketing enrichment, extra scans "just in case") does not
  inherit that basis.
- Retain the **evidence and the decision**, not necessarily the raw artefact forever: a hashed
  document reference, the extracted fields, the vendor result and its identifiers, the analyst's
  rationale, the timestamp. Whether the raw image must be kept is a compliance determination.
- When the period expires, deletion is an obligation, not an option — so append-only stores need a
  documented approach to mandated erasure. Design for it up front; retrofitting deletion into an
  immutable store is expensive. See `compliance-regulatory.md`.
- Biometric templates from liveness checks are frequently special-category data with their own legal
  basis and retention constraints. Do not treat them as ordinary logs.

## 11. Sanctions screening

### 11.1 Lists and cadence

| List                                                                | Publisher                                              | Update cadence                                                              | Notes                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SDN and consolidated non-SDN lists                                  | US Treasury OFAC                                       | Ad hoc, no schedule; sometimes multiple times a day                         | The **50 Percent Rule**: entities owned 50 % or more, directly or indirectly, individually or in aggregate, by blocked persons are themselves blocked _without being listed_. The list is not the population |
| EU consolidated financial sanctions list                            | European Commission / EEAS, implementing CFSP measures | On publication in the Official Journal; measures generally bite immediately | Member-state national lists also exist                                                                                                                                                                       |
| UN Security Council Consolidated List                               | UN Sanctions Committees                                | On committee decision                                                       | Implementation into national law can lag; you screen against the applicable national list too                                                                                                                |
| UK Sanctions List / OFSI consolidated list                          | FCDO / HM Treasury                                     | On designation                                                              | Post-Brexit divergence from the EU list is real                                                                                                                                                              |
| Others (Canada, Australia, Switzerland, Japan, national programmes) | Various                                                | Various                                                                     | Which lists apply is determined by your licences, currencies, correspondent relationships and customer base — a compliance determination                                                                     |

Consequences: **your list ingestion must handle same-day updates and trigger a rescreen of the
existing customer base and of in-flight payments on every delta.** A nightly batch that ingests a
morning designation twelve hours late is a twelve-hour window of potential violations. Record the
list version used for every screening decision (M14) — "which list did we screen against on the 14th"
is the first question in any look-back.

### 11.2 Name matching

Names are not strings. The matching problem includes: Unicode normalisation and diacritics;
transliteration between scripts with several competing standards (Arabic, Cyrillic, Han); name order
and cultural conventions (given/family, patronymics, compound surnames, particles like "van der");
honorifics and titles; nicknames and diminutives; initials and truncation; and deliberate obfuscation.

**Edit distance alone is inadequate** and the failure is bidirectional: it misses true matches
("Mohammed Ali" vs "Muhammad Aly" — small phonetic distance, large edit distance) and it fires on
false ones (short names where a single character is a large proportion of the string; common
surnames). A workable stack is: normalise → tokenise → transliterate to a common representation →
score with a combination of token-level string similarity (Jaro-Winkler-family), phonetic encoding
(Double Metaphone, NYSIIS — all English-biased, so language-aware variants matter), and token-set
matching that tolerates reordering and missing middle names → then **disambiguate with secondary
identifiers**: date of birth, place of birth, nationality, passport/national ID number, address.

```python
"""Screening sketch. This is a teaching skeleton, NOT a production screening engine."""
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

_PARTICLES = {"van", "der", "de", "la", "al", "bin", "ibn", "el", "du", "von", "ter"}


def normalise(name: str) -> list[str]:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    cleaned = "".join(c.lower() if c.isalnum() else " " for c in stripped)
    return [t for t in cleaned.split() if t and t not in _PARTICLES]


def token_set_score(a: list[str], b: list[str]) -> float:
    """Order-insensitive best-pair matching; SequenceMatcher stands in for a proper
    Jaro-Winkler + phonetic ensemble. Do not ship this ratio as-is."""
    if not a or not b:
        return 0.0
    scores = []
    for ta in a:
        scores.append(max(SequenceMatcher(None, ta, tb).ratio() for tb in b))
    return sum(scores) / len(scores)


@dataclass(frozen=True, slots=True)
class Candidate:
    list_id: str          # e.g. "OFAC-SDN"
    list_version: str     # recorded on every decision (M14)
    entry_id: str
    primary_name: str
    aliases: tuple[str, ...]
    dob: str | None
    is_weak_alias: bool


def screen(subject_name: str, subject_dob: str | None,
           candidates: list[Candidate], threshold: float = 0.85) -> list[dict]:
    subject_tokens = normalise(subject_name)
    hits = []
    for c in candidates:
        best = max(token_set_score(subject_tokens, normalise(n))
                   for n in (c.primary_name, *c.aliases))
        if best < threshold:
            continue
        # Secondary identifiers do not lower the score; they inform the disposition a
        # human reaches. Automated discounting on a DOB mismatch is a policy decision
        # belonging to compliance, not to this function.
        hits.append({
            "list": c.list_id, "list_version": c.list_version, "entry": c.entry_id,
            "score": round(best, 4), "weak_alias": c.is_weak_alias,
            "dob_agrees": subject_dob is not None and subject_dob == c.dob,
            "disposition": "REVIEW",   # never auto-clear; see limitations below
        })
    return sorted(hits, key=lambda h: -h["score"])
```

**Explicit limitations of the sketch above**, all of which a real engine must address: no
transliteration of non-Latin scripts; no phonetic encoding; English-biased tokenisation; no handling
of the 50 Percent Rule (ownership graphs are not name matching); no vessel, aircraft, crypto-address
or entity-identifier screening; no fuzzy date-of-birth logic (partial dates, year-only entries); no
weak-alias policy; no country/nationality risk logic; no support for list-specific structure
(programmes, remarks fields, digital-currency addresses). A regulator will ask how your matching was
tuned and tested; `difflib` is not an answer.

### 11.3 Screening points

| Point                              | What is screened                                                                                       | Frequency                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Onboarding                         | Applicant, UBOs, directors, authorised signatories                                                     | Once, plus on any change                        |
| Every payment                      | Payer, payee, intermediary banks, remittance information free text, and any named party in the message | Every message, before execution                 |
| Portfolio rescreening              | The whole customer and counterparty base                                                               | On every list update, and on a defined schedule |
| Counterparty and vendor onboarding | Suppliers, partners, correspondents                                                                    | Onboarding plus periodic                        |

Screening free-text fields (ISO 20022 remittance information, payment references) matters: sanctioned
parties appear there when they are not the account holder. It is also the largest false-positive
source. See `payments.md` for message structure.

### 11.4 False positives and whitelisting

False positives dominate: hit rates of 95–99 % false are normal, and the operational cost is real.
Manage it with:

- **Tuned thresholds per list and per entity type**, documented, with above- and below-the-line
  testing evidence (§12.2) showing what a threshold change would have missed.
- **Whitelisting** (a "good guy" list): a specific customer, matched against a specific list entry,
  cleared by a named analyst, with a rationale, an expiry, and automatic invalidation when either the
  customer record or the list entry changes. A whitelist entry without those properties is an
  unauditable permanent hole. Every automatic suppression must be reproducible and reviewable (M14).
- **Never auto-clear on a model score.** Discounting a hit is a compliance disposition.

### 11.5 Blocking versus rejecting, and strict liability

US sanctions violations can attract civil penalties on a **strict-liability** basis: a firm can be
liable without knowing it dealt with a sanctioned party, with programme quality, remediation and
voluntary self-disclosure operating as mitigating factors under OFAC's enforcement guidelines. That
is why the fail-closed rule in §2.2 is not negotiable, and why "the screening service timed out" is
a reportable event rather than an ops annoyance.

**Blocking** means freezing the property — you take it in and hold it (typically in a blocked,
interest-bearing account) and may not return it. **Rejecting** means refusing to process and
returning the funds to the sender. Which applies depends on the programme, the parties, the property
and the nexus, and both carry tight reporting deadlines (for OFAC, blocked-property and
rejected-transaction reports within ten business days, plus an annual blocked-property report).
Engineering builds **both capabilities**, the evidence package and the reporting export. **The
compliance officer decides which applies to a given hit.** An engineer who "just returns the money"
on a blockable hit has caused a second violation.

## 12. Transaction monitoring and reporting

### 12.1 Typologies and scenarios

| Typology                                         | Scenario shape                                                                                                                    | Common false positives                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Structuring / smurfing**                       | Multiple transactions just below a reporting or internal threshold, aggregated by customer, related parties, or short time window | Businesses with genuine repeated near-threshold deposits; payroll cycles |
| **Layering**                                     | Rapid chains of transfers across accounts, products, or institutions with no economic purpose                                     | Treasury sweeps, legitimate multi-account structures                     |
| **Rapid movement of funds / pass-through**       | Credit in, near-total debit out within a short window, low retained balance                                                       | Payment facilitators, escrow, marketplaces — profile them or drown       |
| **Unusual counterparties**                       | Transactions with high-risk jurisdictions, sanctioned-adjacent parties, or unexplained new relationships                          | Diaspora remittance corridors — a well-known source of unfair de-risking |
| **Dormant then active**                          | Long-inactive account suddenly transacting at volume                                                                              | Seasonal businesses; returning customers                                 |
| **Round-amount and threshold-adjacent patterns** | Repeated round sums, amounts clustered under limits                                                                               | Wholesale trade, rent                                                    |
| **Activity inconsistent with profile**           | Volume or counterparties far outside the declared expected activity                                                               | A stale expected-activity profile that nobody refreshed                  |

### 12.2 Scenario design and tuning

Scenarios are parameterised (threshold, window, lookback, peer group). Tuning is an evidenced
exercise, not an ops preference:

- **Above-the-line testing**: sample alerts just above the threshold; measure how many are
  productive (escalated to case, then to a filing).
- **Below-the-line testing**: sample activity just _below_ the threshold that produced no alert, and
  have analysts review it. If productive cases are found below the line, the threshold is too high.
  This is the test supervisors ask for, and the one teams skip.
- Segment thresholds by customer risk and business type; a single global threshold is either noisy
  or blind.
- Version every scenario and every parameter change, with the effective date, the rationale, the
  approver, and the testing evidence (M14). "Why did this threshold change in March" must be
  answerable in minutes.

**Thresholds, scenario coverage and the decision to tune are set by the compliance owner** (MLRO,
BSA Officer, or equivalent) on the basis of the firm's documented risk assessment. Engineering
implements, instruments, tests and evidences; it does not choose the number, and it does not quietly
raise a threshold because the queue is full. A queue that cannot be worked is an escalation to
compliance and a resourcing decision, not a parameter change.

### 12.3 Alerts, cases and triage

```
scenario run → alert (one scenario, one subject, one period)
  → deduplication and correlation into a case (one subject, many alerts)
  → triage: L1 disposition with rationale
  → escalation to L2 / investigation: transaction reconstruction, KYC review, source-of-funds
  → outcome: closed (no suspicion, with rationale) | filed (SAR/STR) | exit the relationship
```

Every stage is timestamped, attributed and immutable (M14). Case management SLAs matter because
detection-to-filing deadlines run from detection (§12.4). Alert-to-case-to-filing conversion rates
are the health metric (§15); a scenario with a near-zero conversion rate over a meaningful period is
either mis-tuned or mis-designed, and either way it is consuming the analyst capacity that the
productive scenarios need.

```sql
-- Alert funnel by scenario version, for tuning review. Label the period and basis (M20).
SELECT s.scenario_id,
       s.scenario_version,
       date_trunc('month', a.created_at)                            AS period,
       count(*)                                                     AS alerts,
       count(*) FILTER (WHERE c.case_id IS NOT NULL)                AS cases,
       count(*) FILTER (WHERE c.outcome = 'FILED')                  AS filings,
       round(100.0 * count(*) FILTER (WHERE c.outcome = 'FILED')
             / nullif(count(*), 0), 2)                              AS pct_alert_to_filing,
       percentile_cont(0.9) WITHIN GROUP (
           ORDER BY extract(epoch FROM c.first_touched_at - a.created_at) / 3600
       )                                                            AS p90_hours_to_first_touch
  FROM tm_alerts a
  LEFT JOIN tm_cases c ON c.case_id = a.case_id
  JOIN tm_scenarios s ON s.scenario_id = a.scenario_id
                     AND s.scenario_version = a.scenario_version
 WHERE a.created_at >= :period_start AND a.created_at < :period_end
 GROUP BY 1, 2, 3
 ORDER BY alerts DESC;
```

### 12.4 Filing, tipping-off, record-keeping

- **SAR / STR filing.** In the US a SAR is filed with FinCEN generally within 30 calendar days of
  initial detection of facts constituting a basis for filing (60 where no suspect is identified),
  with monetary thresholds that vary by institution type. In the UK a SAR goes to the NCA, and a
  defence-against-money-laundering request carries notice and moratorium periods that pause the
  transaction. Other regimes differ. **The decision to file is the MLRO's / BSA Officer's**; the
  system supports it with a complete, reconstructable narrative and a visible deadline.
- **Tipping-off is prohibited.** Disclosing to the customer or a third party that a SAR has been
  filed, or that an investigation is underway, is a criminal offence in many jurisdictions. Direct
  engineering consequence: suspicion flags must not leak into customer-facing surfaces, support
  tooling, decline reasons, emails, notifications, exports or analytics accessible outside the
  compliance function. Case-data access is need-to-know and the access log is itself evidence
  (M14, M15). Write the "account restricted" customer message with compliance, not after it ships.
- **Record-keeping.** Five years is the common baseline (from the end of the relationship or from the
  transaction, depending on regime and record type) for CDD records, transaction records and SAR
  supporting documentation. The exact period and trigger are regime-specific and set by compliance.
  Records must be retrievable in usable form under time pressure — an archive that takes a week to
  restore is a finding.

## 13. Crypto specifics

Brief by design; `regtech-expert` and `fintech-expert` go deeper.

| Topic                    | What it means for the build                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Travel rule**          | FATF Recommendation 16 extends originator/beneficiary information requirements to virtual asset transfers between VASPs. Thresholds and scope differ: FATF suggests a USD/EUR 1,000 threshold for VASP transfers; the EU's recast Transfer of Funds Regulation applies to crypto-asset service providers with no de-minimis threshold; the US BSA travel rule threshold for funds transfers has long been USD 3,000, with a proposal to lower the cross-border threshold outstanding for years. You need a protocol implementation (IVMS 101 data model over one of the messaging networks), counterparty VASP due diligence, and a policy for transfers to unhosted wallets |
| **On-chain analytics**   | Address risk scoring from clustering, exposure to mixers, sanctioned addresses (OFAC lists digital-currency addresses directly), darknet markets, and hop-distance heuristics. Treat vendor scores as one input with a stated methodology, not as ground truth; scoring differs materially between vendors for the same address                                                                                                                                                                                                                                                                                                                                              |
| **Custody and key risk** | Key material is the asset. Multi-party computation or multisig, quorum approval that maps to separation of duties (M11), hardware-backed key storage, tested recovery, and a withdrawal allowlist with a delay. An irreversible on-chain transfer has no chargeback and no correspondent to call                                                                                                                                                                                                                                                                                                                                                                             |
| **Ledgering**            | On-chain confirmation depth is a finality policy, not a boolean. Declare it per asset, book the pending state as a hold (M13), and reconcile against the chain on a schedule (M9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 14. Model governance and fairness

### 14.1 Documentation and validation

| Artifact                      | Contents                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model inventory entry         | Owner, purpose, in-scope decisions, materiality tier, version in production, dependencies                                                                                          |
| Model documentation           | Data lineage, feature definitions, target definition and label maturity, sampling, training method, performance by segment, known limitations, monitoring plan, fallback behaviour |
| Independent validation report | Conceptual soundness, outcomes analysis, benchmarking against a challenger, **effective challenge** by a party independent of development, findings with due dates                 |
| Change log                    | Every version, its approval, its effective date, and the decisions made under it                                                                                                   |

The supervisory framework used in US banking (development/implementation/use, validation,
governance — the "SR 11-7" model risk management guidance) is the reference point most examiners and
partner banks will hold you to, including for non-model "tools" such as monitoring scenarios.

### 14.2 Reproducibility

A decision must be reconstructable: same model artifact hash, same feature values as of the decision,
same thresholds, same output. This means pinning the model binary, storing the feature vector on the
decision record (M14), and versioning the transformation code. "We retrained since then" is not an
acceptable answer to a regulator, a customer complaint or a litigation hold.

### 14.3 Monitoring

| Monitor                                                   | Signal                                                            | Cadence                         |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| Population stability index (inputs and score)             | Distribution shift                                                | Daily                           |
| Feature health (null rate, range, cardinality, freshness) | Upstream pipeline breakage                                        | Continuous                      |
| Calibration by score band on matured cohorts              | Model drift vs environment change                                 | Monthly, on matured labels only |
| Performance by segment                                    | Degradation concentrated in a subgroup                            | Monthly                         |
| Online/offline parity replay                              | Skew (§2.3)                                                       | Weekly sample                   |
| Override rate (human vs model)                            | Model losing the operators' trust, or operators routing around it | Monthly                         |

### 14.4 Fairness

- **Disparate treatment** is using a protected characteristic directly. **Disparate impact** is a
  facially neutral policy with a disproportionate adverse effect on a protected class, potentially
  unlawful unless justified by business necessity with no less discriminatory alternative. Both
  matter for credit, and the analysis is a legal one.
- **The proxy problem.** In US non-mortgage credit, Regulation B generally prohibits collecting
  applicants' race and similar characteristics — precisely the data a disparate-impact test needs.
  Proxy methods (surname-and-geography Bayesian imputation, for instance) exist and are used by
  regulators, but building a proxy is itself sensitive: **whether to test, with which method, under
  what privilege, and what to do with the result is a decision for legal and compliance, not for the
  data-science team.** Never wire a proxy attribute into a production feature set.
- Beware features that are proxies _for_ protected characteristics without being intended as such:
  ZIP code, device type, educational institution, name-derived features, time of day. A model can be
  discriminatory with no protected attribute anywhere in its training data.
- **Direction of travel.** The EU AI Act classifies AI systems evaluating the creditworthiness of
  natural persons as high-risk (with a carve-out for systems used to detect financial fraud),
  bringing documentation, data-governance, human-oversight and logging obligations. GDPR Article 22
  constrains solely automated decisions with legal or similarly significant effects and requires
  safeguards including a right to human intervention; the CJEU's SCHUFA judgment pulled third-party
  scoring into that scope where the score strongly determines the outcome.
- **Human-in-the-loop is a control only if the human can change the outcome**: they need the reason
  codes, the underlying evidence, the time and the authority (M11). Measure override rates and queue
  SLAs — a reviewer approving 300 cases an hour is not oversight, it is a rubber stamp with a
  headcount cost.

## 15. Metrics and reporting

| Metric                                                              | Definition                                                                                         | Watch out for                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fraud loss rate (bps)                                               | Net fraud loss ÷ processed volume, ×10,000, per currency (M6)                                      | Gross vs net of recoveries; which loss types are included; the denominator (attempted vs approved volume) |
| Chargeback rate                                                     | Disputes ÷ transactions, replicating the scheme's denominator definition (§6.1)                    | Your definition silently diverging from the scheme's                                                      |
| Fraud (TC40-style) rate                                             | Issuer-reported fraud ÷ transactions                                                               | Moves independently of chargeback rate under 3DS liability shift                                          |
| False positive rate                                                 | Declined-or-stepped-up transactions that were legitimate ÷ all such interventions                  | Unmeasurable without a random approval holdout — see §5.3                                                 |
| Approval rate                                                       | Approved ÷ attempted, by segment                                                                   | The number that pays for the fraud team; report it next to loss, always                                   |
| Review queue SLA                                                    | p50/p90 time to first touch and to disposition; queue depth; abandonment while queued              | An SLA breach that auto-declines is a hidden policy change                                                |
| Alert → case → filing conversion                                    | Per scenario and version                                                                           | Near-zero conversion means a scenario is burning capacity                                                 |
| Sanctions hit rate and clear rate                                   | Hits per million screened; % cleared as false positive; p90 time to disposition                    | A falling hit rate may mean better tuning or a broken list feed — alert on ingestion freshness separately |
| List freshness                                                      | Age of the newest ingested list version per list, and time from publication to rescreen completion | The metric that catches a silently dead ingestion job                                                     |
| Model PSI / drift                                                   | Input and score stability vs the training reference                                                | PSI on a feature whose upstream job died looks like drift, not an outage — pair with feature health       |
| Loss vintage curves                                                 | Loss by origination cohort at each month of maturity                                               | The only honest way to compare recent to historical performance                                           |
| Credit: DPD buckets, roll rates, coverage ratio (allowance ÷ gross) | Standard credit MI                                                                                 | Coverage moves for staging reasons, not only risk reasons (§8.3)                                          |

**Reporting to a board or a regulator (M20).** Every figure carries: the period and its basis
(booked, settled, or incurred date), the currency and whether it is converted and at which rate, the
denominator definition, whether the cohort is mature or still accruing labels, actual vs forecast,
and the source system with the extraction timestamp. "Fraud was 8 bps last month" is not a number: 8
bps of what volume, on which loss definition, with how many months of chargebacks still to arrive?
Present the maturity caveat in the same visual as the number, not in a footnote — the footnote is
what gets dropped when the slide is forwarded. Board-pack conventions and the labelling discipline
for management figures generally are in `corporate-finance.md`.

Financial-crime metrics deserve one extra caution: **volume metrics are not effectiveness metrics.**
"We filed 40 % more SARs" is not evidence of a better programme, and a filing-count target creates a
defensive-filing incentive that supervisors criticise. Report the quality of the process — coverage
of the risk assessment, tuning evidence, timeliness, backlog age — alongside the counts.

## Review questions

1. Where is your velocity computed from — the immutable event log, or a counter that services
   increment? If you replayed last Tuesday's traffic, would you get the same feature values (M1, M17)?
2. For each check in the authorization path, is the fail-open/fail-closed behaviour declared in the
   code and tested, or is it whatever the HTTP client's default timeout produces? Which check
   currently fails open that shouldn't?
3. Can you produce, for a single declined transaction from six months ago, the exact feature vector,
   rule set version, model version and thresholds that produced the decline (M14)? If a regulator
   asked for the reason, would your answer be accurate for that applicant or generic?
4. What is your false-positive rate, and how do you know? If the answer relies on a random approval
   holdout, who approved its size and its loss budget — and if there is no holdout, what exactly is
   the number you report?
5. Which limits are enforced only in the UI or only in one caller? Show the atomic check-and-reserve
   for the highest-value limit you have (M12, M13). What happens on a retry of a refused request?
6. Who approved the last five temporary limit lifts, were they different identities from the
   requesters, and did every lift expire automatically (M11)?
7. On the day a designation is published at 14:00, how long until it is ingested, in-flight payments
   are rescreened, and the existing customer base is rescreened? What is the recorded list version on
   yesterday's screening decisions (§11.1)?
8. If a hit is confirmed, does your system have both a block path and a reject path, with the
   evidence package and the reporting export — and is it documented that the compliance officer, not
   the on-call engineer, chooses between them (§11.5)?
9. When did you last run below-the-line testing on your monitoring thresholds, who approved the
   current values, and can you show the tuning rationale with its effective date (§12.2)?
10. Does any suspicion flag, case status or SAR-related field reach a customer-facing surface,
    support tool, analytics warehouse or data export outside the compliance perimeter (§12.4, M15)?
