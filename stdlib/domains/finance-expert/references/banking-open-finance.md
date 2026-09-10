# Banking and open finance

**Rail, scheme and standards facts verified on 2026-09-10.** These move; confirm against the scheme or regulator before building to a date or a threshold.

Banking is where the money you record is money someone can walk into a branch and demand. A ledger that drifts
by a cent is an accounting problem in a marketplace and a regulated liability in a bank. This reference assumes
the ledger contract of `ledger.md` and the arithmetic of `money-arithmetic.md`, and adds what banking imposes.

## 1. The core banking domain model, and where the ledger of record sits

### 1.1 What "core banking" contains

| Component                            | Responsibility                                                                                     | Owns                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Party / customer**                 | Legal and natural persons, relationships, roles (holder, signatory, UBO), KYC state                | Identity, tax residency, risk rating             |
| **Product catalogue**                | Current account, savings, term deposit, loan, card: rates, fees, limits, eligibility, T&Cs version | Effective-dated parameters                       |
| **Account**                          | An instance of a product held by parties; currency, status, open/close dates, parameter snapshot   | Identifiers, status machine                      |
| **Posting engine**                   | The double-entry core (M2): value-dated postings, real-time and batch, cut-off, end-of-day         | The book of record for balances (M1)             |
| **Limits and holds**                 | Overdraft lines, card authorisations, cheque holds, regulatory blocks, court orders                | Reservations (M13), limit checks (M12)           |
| **Interest and fees**                | Accrual, capitalisation, tiering, fee schedules, waivers                                           | Derived postings (M16)                           |
| **Statements and notices**           | Periodic statements, advices, regulatory disclosures                                               | Immutable documents (M10)                        |
| **Mandates / standing instructions** | Standing orders, direct-debit mandates, sweeps                                                     | Authorisation objects                            |
| **Channel and rail adapters**        | Scheme in/out, card processing, files                                                              | Nothing authoritative — they _instruct_ the core |
| **GL interface**                     | Roll-up of the sub-ledger per entity, branch and currency                                          | GL journal export (`reconciliation-close.md`)    |

The posting engine is the only part that is genuinely hard to replace and must be right on day one; the rest is
configuration, presentation or an adapter.

### 1.2 What a neobank on a BaaS partner actually has

A neobank on a sponsor bank owns onboarding, KYC orchestration, the app, card UX, a customer-facing ledger and
analytics. It does not own the deposit liability, the FDIC/FSCS relationship, scheme membership, or the posting
engine whose balance is legally the money.

```
customer → neobank app → neobank ledger (a sub-ledger)   ↓ reconciles to
        → BaaS / middleware ledger                       ↓ reconciles to
        → sponsor bank core (FBO / omnibus account)      → scheme / clearing / settlement
```

**Rule 0 applies with full force.** The sponsor bank's core is the ledger of record for the funds; yours is a
sub-ledger of one omnibus account, legitimate only insofar as it reconciles to the bank's record daily (M9). The
most common architectural mistake here is treating your own ledger as authoritative and the bank's statement as
"a report we look at monthly". Two systems that both believe they hold the truth do not produce a debuggable
discrepancy; they produce customers whose balance is not backed by an identified claim on a real account. The
2024 Synapse failure is the demonstration: fintech, middleware and bank records disagreed, per-customer
entitlement to the FBO pool could not be reconstructed, and customers lost access to their deposits for months.

| Requirement                                                                                            | Why                                                                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Each sub-ledger account maps to exactly one omnibus/FBO account at one named bank                      | Pass-through deposit insurance needs provable per-beneficiary ownership records |
| Σ(customer sub-ledger balances) == bank balance of that FBO account, daily, alerting on any difference | The only proof the sub-ledger is real (M9, M17)                                 |
| An explicit, aged, owned cash-in-transit/suspense account absorbs timing differences                   | Otherwise timing noise hides genuine breaks                                     |
| The sub-ledger exports to a third party in a documented format, as of a date                           | A regulator, administrator or successor bank will demand exactly this, fast     |
| Reserve and float are separated from customer funds by _account_, not by a flag                        | A flag can be wrong; an account boundary is auditable                           |

Ask in writing, first: whose balance sheet is the deposit on, which entity is the insured depository, and which
record governs when the two disagree? No answer is the finding.

## 2. Account identifiers and validation

| Scheme                     | Shape                                                               | Check                                                       | Notes                                                                                          |
| -------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **IBAN**                   | `CC` + 2 check digits + BBAN, ≤34 alnum, country-specific length    | ISO 7064 mod-97 == 1                                        | Lengths from the SWIFT IBAN Registry; validity ≠ existence                                     |
| **BIC / SWIFT**            | 8 or 11: 4 institution + 2 country + 2 location + optional 3 branch | Structure + directory lookup                                | `XXX` = head office; location char 2 `0` = test, `1` = passive                                 |
| **US ABA routing number**  | 9 digits                                                            | Weighted mod-10 (below); catches transpositions only        | ACH and wire RTNs differ at the same bank — resolve both from the Fed directory and store both |
| **UK sort code + account** | 6 + 8 digits                                                        | VocaLink modulus check (mod-10 / mod-11 / double-alternate) | The weight table is data that changes; never hardcode                                          |

```python
from __future__ import annotations
import re

# Excerpt of the SWIFT IBAN Registry; load the full table from data, not from code.
IBAN_LENGTH: dict[str, int] = {
    "AD": 24, "AE": 23, "AT": 20, "BE": 16, "BG": 22, "BR": 29, "CH": 21, "CY": 28, "CZ": 24, "DE": 22,
    "DK": 18, "EE": 20, "ES": 24, "FI": 18, "FR": 27, "GB": 22, "GR": 27, "HR": 21, "HU": 28, "IE": 22,
    "IT": 27, "LT": 20, "LU": 20, "LV": 21, "MT": 31, "NL": 18, "NO": 15, "PL": 28, "PT": 25, "RO": 24,
    "SA": 24, "SE": 24, "SI": 19, "SK": 24, "TR": 26, "UA": 29}
_IBAN_RE = re.compile(r"\A[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\Z")

def normalize_iban(raw: str) -> str:
    return re.sub(r"[\s\-]", "", raw).upper()

def iban_is_valid(raw: str) -> bool:
    iban = normalize_iban(raw)
    if not _IBAN_RE.match(iban) or len(iban) != IBAN_LENGTH.get(iban[:2], -1):
        return False                       # unknown country => reject, never pass through
    digits = "".join(str(ord(c) - 55) if c.isalpha() else c for c in iban[4:] + iban[:4])   # A=10 … Z=35
    remainder = 0
    for i in range(0, len(digits), 7):     # chunked: ports to fixed-width integer languages
        remainder = int(str(remainder) + digits[i:i + 7]) % 97
    return remainder == 1

def aba_routing_is_valid(rtn: str) -> bool:
    """3·(d1+d4+d7) + 7·(d2+d5+d8) + 1·(d3+d6+d9) ≡ 0 (mod 10)."""
    return (len(rtn) == 9 and rtn.isdigit()
            and sum(int(d) * w for d, w in zip(rtn, (3, 7, 1) * 3)) % 10 == 0)

assert iban_is_valid("GB82 WEST 1234 5698 7654 32")
assert not iban_is_valid("GB82 WEST 1234 5698 7654 33") and not iban_is_valid("XX8212345698765432")
assert aba_routing_is_valid("011000015") and not aba_routing_is_valid("011000016")
```

A syntactically valid IBAN is not a reachable account — only a scheme lookup or a Verification/Confirmation of
Payee response tells you that. **Verification of Payee is no longer forthcoming: it has applied to euro-area PSPs
since 9 October 2025** under the Instant Payments Regulation ((EU) 2024/886), on **all** euro credit transfers and
not only instant ones, running on the EPC's VOP scheme (non-euro-area Member States follow on 9 July 2027). The
check returns one of four outcomes — match, **close match** (with the name the bank holds), no match, or
verification not possible — and the payer must be warned and then allowed to proceed anyway, forfeiting the
misdirected-payment remedy if they do. So the journey to build is not "reject on mismatch" but _four_ branches,
each with a stored outcome and a stored override; a close match is a UI decision, not an error code. The UK's
Confirmation of Payee is the older, similar-but-not-identical scheme: same four-ish outcomes, different coverage
rules, so do not share one adapter without mapping both. Under SEPA's IBAN-only rule derive routing from a
directory, not from a customer-supplied BIC; CA transit, AU BSB, BR agência+DV and IN IFSC have weak or no
checksums, so directory lookup is the only validation there.

### 2.1 Masking, logging, and "is it a secret?"

An account number is an **identifier, not a secret**: anyone holding a cheque or payment advice has it. What
protects the account is the _authorisation_ plus the _return right_ (§7); treating "knows the account number" as
authentication builds the fraud vector returns exist to remedy. It is still personal data under GDPR and GLBA.

| Context                       | Rule                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| UI                            | Last 4 by default; full reveal is an explicit, permissioned, audit-logged action (M11, M14)           |
| IBAN display                  | Country + check digits + `…` + last 4 (`GB82…5432`) — never the middle, which carries the sort code   |
| Logs, traces, metrics, errors | Never the identifier: a keyed HMAC token instead (M15)                                                |
| Warehouse / analytics         | Pseudonymised key only; the mapping table stays in the operational store under its own access control |
| Fixtures                      | Synthetic valid-checksum values from reserved ranges, never production-derived                        |

```python
import hashlib, hmac, os

_KEY = os.environb[b"ACCOUNT_ID_HMAC_KEY"]          # secrets manager, versioned, rotated

def account_log_token(identifier: str) -> str:
    """Stable non-reversible correlation token for logs and traces (M15)."""
    canon = re.sub(r"[\s\-]", "", identifier).upper().encode()
    return "v1:" + hmac.new(_KEY, canon, hashlib.sha256).hexdigest()[:16]
```

## 3. Deposit products and interest accrual

### 3.1 Two clocks

| Clock              | Meaning                                      | Frequency                                 | Posting                                           |
| ------------------ | -------------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| **Accrual**        | Interest _earned_ on the value-dated balance | Daily, end of day                         | Dr Interest expense / Cr Accrued interest payable |
| **Capitalisation** | Interest _paid_ into spendable balance       | Monthly, quarterly, annually, at maturity | Dr Accrued interest payable / Cr Customer deposit |

Accrued interest is a real liability from day one, belongs to the period in which it accrued, must appear in
that period's trial balance, and must not be erased by capitalisation logic that knows only pay dates (M10).

### 3.2 Day-count, tiering, precision

Day-count conventions are in `money-arithmetic.md`; here the convention is a **product parameter**,
effective-dated, snapshotted onto the account at opening and reproduced in the statement disclosure. The US
disclosure convention (APY/APYE under Reg DD) is _not_ the accrual basis — accrue at the contractual rate.

| Tiering model             | Meaning                                          | 25,000 at 1% ≤10k / 2% >10k |
| ------------------------- | ------------------------------------------------ | --------------------------- |
| **Banded (marginal)**     | Each slice earns its own rate                    | 10,000 @ 1% + 15,000 @ 2%   |
| **Whole-balance (cliff)** | The entire balance earns the reached tier's rate | 25,000 @ 2%                 |

The product owner picks one in writing; choosing wrongly is a mis-selling issue, not a bug. Accrue at higher
scale than the currency's (8 dp), as a `Decimal` carrying the account's ISO 4217 code (M4); keep the sub-cent
remainder **as a balance in the accrual account**; round only at capitalisation (M5). Discarding the fraction
daily transfers value from customer to bank, portfolio-wide.

```python
from dataclasses import dataclass
from decimal import Decimal, ROUND_DOWN, ROUND_HALF_EVEN

ACCRUAL_SCALE = Decimal("0.00000001")      # 8 dp internal accrual scale

@dataclass(frozen=True)
class Tier:
    upper: Decimal | None                  # inclusive bound; None = open-ended
    annual_rate: Decimal                   # may be negative

@dataclass(frozen=True)
class DepositTerms:
    tiers: tuple[Tier, ...]
    banded: bool                           # True = marginal, False = whole-balance cliff
    denominator: Decimal                   # 365 (ACT/365F) or 360 (ACT/360)

def daily_accrual(balance: Decimal, terms: DepositTerms) -> Decimal:
    """One day of interest at ACCRUAL_SCALE. Sign follows the rate; negative rates supported."""
    if not terms.banded:
        rate = next(t.annual_rate for t in terms.tiers if t.upper is None or balance <= t.upper)
        return (balance * rate / terms.denominator).quantize(ACCRUAL_SCALE, rounding=ROUND_HALF_EVEN)
    total, lower = Decimal(0), Decimal(0)
    for tier in terms.tiers:
        upper = balance if tier.upper is None else min(tier.upper, balance)
        total += max(upper - lower, Decimal(0)) * tier.annual_rate / terms.denominator
        lower = upper
        if lower >= balance:
            break
    return total.quantize(ACCRUAL_SCALE, rounding=ROUND_HALF_EVEN)

def capitalise(accrued: Decimal, exponent: int) -> tuple[Decimal, Decimal]:
    """Split accrued into the payable amount and the residue that stays accrued (M5)."""
    payable = accrued.quantize(Decimal(1).scaleb(-exponent), rounding=ROUND_DOWN)
    return payable, accrued - payable
```

### 3.3 Posting patterns

| Event                             | Debit                           | Credit                                 | Note                                                              |
| --------------------------------- | ------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| Daily accrual                     | Interest expense                | Accrued interest payable (per account) | Value-dated to the accrual day (M10)                              |
| Capitalisation                    | Accrued interest payable        | Customer deposit                       | Residue stays in the accrual account                              |
| Withholding tax at capitalisation | Accrued interest payable        | Tax payable                            | Separate posting, never netted (M16)                              |
| Negative rate on a deposit        | Customer deposit                | Interest income                        | Direction flips; confirm T&Cs and consumer rules permit it        |
| Early-withdrawal penalty          | Customer deposit                | Fee income                             | First-class fee posting (M16)                                     |
| Promotional top-up                | Marketing (or interest) expense | Customer deposit                       | Its own account, so the promo's cost stays recoverable            |
| Backdated correction              | —                               | —                                      | Reverse affected accruals, re-accrue on the corrected series (M3) |

A payment credited with a value date three days in the past changes the balance history and therefore every
accrual since: reverse and re-accrue **in the open period**, referencing the original dates, never recomputing a
closed one (M10). Promotional rates need an end date, a successor rate and a notice obligation, and belong in an
effective-dated overlay — a mutable field cannot answer "what rate applied in March?".

## 4. Lending

### 4.1 Origination data model

| Object                       | Key fields                                                                      | Immutability                                              |
| ---------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Application**              | Applicant, requested amount/term, decision, decision reasons, scorecard version | Append-only decision log; adverse-action reasons retained |
| **Offer**                    | Rate, term, fees, APR/APRC disclosure, expiry, T&Cs version                     | Immutable once presented; a change is a new offer         |
| **Agreement**                | Signed offer + signature evidence + disbursement instruction                    | Immutable                                                 |
| **Loan account**             | Principal, rate (fixed, or index + margin), day-count, fee plan                 | Effective-dated parameters                                |
| **Schedule**                 | Instalment rows: due date, principal, interest, fees, closing balance           | Versions retained, never overwritten                      |
| **Disbursement / repayment** | Postings under an allocation waterfall                                          | Postings immutable (M3)                                   |

The **repayment allocation waterfall** is a legal ordering, not an implementation detail: typically fees →
penalty interest → accrued interest → principal, but consumer-credit rules override it in several jurisdictions.
Declare it as data, test it (M18), record which version applied to each payment. Annuity maths and APR/APRC
solving are in `money-arithmetic.md`; the final instalment absorbs the rounding residue (M5), and the disclosed
schedule version is what the customer was told, so store it (M20).

### 4.2 Effective interest rate and fee amortisation (IFRS 9)

Under amortised cost, origination fees integral to the yield and directly attributable transaction costs are
**not** day-one income: they enter the initial carrying amount and amortise over expected life through the EIR,
the rate discounting estimated cash flows to the gross carrying amount.

| Item                                                                   | Treatment                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Arrangement/origination fee integral to yield                          | Deferred into carrying amount, amortised via EIR                |
| Directly attributable incremental costs (e.g. broker commission)       | Deferred, amortised via EIR                                     |
| Fee for a separately identifiable service (e.g. a valuation performed) | IFRS 15 revenue when delivered                                  |
| Penalty and late fees                                                  | Recognised when charged — not part of the original EIR estimate |
| Undrawn-commitment fee                                                 | Deferred if drawdown expected; else over the commitment period  |

Period interest income is therefore `opening amortised cost × EIR`, not `principal × contractual rate`. The
difference is the fee/cost amortisation posting, in its own account (M16) — the line the auditor tests, and the
one taking a catch-up adjustment when cash-flow estimates are revised.

### 4.3 Delinquency, non-accrual, restructure, charge-off

Days past due is computed from the **oldest unpaid contractual due date**, not the last payment date.

| Bucket        | Significance                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Current       | Stage 1 (12-month ECL) absent other indicators                                                              |
| 1–29 DPD      | Collections contact; typically still Stage 1                                                                |
| 30–59 DPD     | 30 DPD is IFRS 9's rebuttable presumption of significant increase in credit risk → Stage 2 (lifetime ECL)   |
| 60–89 DPD     | Stage 2, higher provision, pre-default treatment                                                            |
| 90+ DPD       | Rebuttable presumption of default → Stage 3, non-performing (EBA NPE), accrual to income normally suspended |
| 120 / 180 DPD | Retail charge-off conventions (US FFIEC: ~120 DPD closed-end, ~180 DPD open-end/card)                       |

**Non-accrual.** Accruing interest to income on a non-performing loan overstates earnings. Pick one treatment
per product and disclose it: cash-basis recognition, or accrual to a memo/contra account fully offset by
provision. Either way, current-period accrued interest already taken to income is reversed.

**Forbearance.** A concession granted because of financial difficulty carries its own flag, its own reporting
(EBA forborne exposures), a probation period, and an accounting test: substantial enough to derecognise (new
asset, gain/loss), or a modification adjustment discounting the new cash flows at the **original** EIR?

| Event                        | Debit                       | Credit                                                       |
| ---------------------------- | --------------------------- | ------------------------------------------------------------ |
| Accrue interest (performing) | Accrued interest receivable | Interest income                                              |
| Fee/cost amortisation        | Loan carrying amount        | Interest income                                              |
| Move to non-accrual          | Interest income             | Accrued interest receivable                                  |
| ECL provision increase       | Impairment expense          | Allowance for credit losses (contra-asset)                   |
| Charge-off                   | Allowance for credit losses | Loan principal (gross carrying amount)                       |
| Post-charge-off recovery     | Cash / customer account     | Allowance for credit losses (or recovery income, per policy) |
| Provision release            | Allowance for credit losses | Impairment expense                                           |

A charge-off removes the asset; it does not extinguish the legal claim. Keep the receivable alive in a
memo/recovery sub-ledger with its own balance, or you lose track of what collections is chasing. PD/LGD/EAD, ECL
staging and model governance are in `risk-fraud-aml.md`.

## 5. Balance semantics

More customer-visible bugs come from balance semantics than arithmetic. Define these once; never name a field
`balance`.

| Term                      | Definition                                                                    | Derived from                                  |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| **Ledger / booked**       | Sum of posted entries with value date ≤ today                                 | Postings only (M1)                            |
| **Cleared**               | Booked entries that are final and irrevocable                                 | Postings minus uncleared items                |
| **Current**               | Usually booked; some cores mean "including today's not-yet-value-dated items" | Ambiguous — define it explicitly              |
| **Available**             | What the customer may spend now                                               | `booked − holds − uncleared + overdraft line` |
| **Forward / value-dated** | Booked plus known future-dated items                                          | Postings with future value dates              |
| **Statement closing**     | Booked balance at the statement cut-off                                       | Frozen at cut-off (§6)                        |

```sql
-- Available balance: derived, never stored as the source of truth (M1, M13, M17)
SELECT a.account_id, a.currency,
       COALESCE(p.booked_minor, 0) AS booked_minor, COALESCE(h.holds_minor, 0) AS holds_minor,
       COALESCE(p.booked_minor, 0) - COALESCE(h.holds_minor, 0)
         + COALESCE(a.overdraft_limit_minor, 0) AS available_minor
FROM accounts a
LEFT JOIN (SELECT account_id, SUM(signed_amount_minor) AS booked_minor FROM postings
            WHERE value_date <= CURRENT_DATE AND reversed_by IS NULL GROUP BY account_id) p
       ON p.account_id = a.account_id
LEFT JOIN (SELECT account_id, SUM(amount_minor) AS holds_minor FROM holds
            WHERE status = 'ACTIVE' AND expires_at > now() GROUP BY account_id) h
       ON h.account_id = a.account_id
WHERE a.account_id = $1;
```

**Holds** (card authorisations — scheme lifecycles in `payments.md` — cheque holds, pending outgoing transfers,
court orders) reduce available without touching booked. Each needs an expiry, an explicit release, and a
settlement path converting hold → posting atomically (M13). Two chronic failures: _hold leakage_, where
authorisations never expire and starve available balance, and _double-decrement_, where the hold outlives its
posting. Age active holds against scheme expiry rules to find both.

**Overdraft is a loan**, not a negative deposit. For reporting, gross up: overdrawn balances are assets,
positive balances liabilities, and netting across accounts misstates the balance sheet. Debit interest accrues
under its own rate and day-count, and overdraft interest and fees go to distinct accounts (M16).

**Semantic mismatch with an aggregator** is the top source of "your app shows the wrong balance": the provider
returns _available_ where your UI says _current_, or `interimAvailable` where you assumed `closingBooked` — the
Berlin Group vocabulary alone has eight balance types. Map each provider's type explicitly in an adapter, store
the raw type with the value, label what you display (M20), never derive "safe to spend" from an unmapped type.

## 6. Statements and customer-facing reporting

A statement is a legal document. Treat it as one.

| Property               | Rule                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Period and cut-off** | Product-defined, in a declared timezone, on a declared basis (value vs booking date); the cut-off is a period boundary under M10                                |
| **Immutability**       | Once issued, frozen: same bytes, same figures, forever. A correction is a new statement or a correction advice referencing the original, never a re-render (M3) |
| **Derivation**         | Every line comes from postings; closing = opening + lines (M19). A statement generator that queries an operational transactions table is wrong                  |
| **Regeneration**       | Only as byte-identical reproduction from the frozen input set — store the posting id range and parameter versions so reproduction is provable                   |
| **Retention**          | Per regime (commonly 5–7 years, longer for mortgages); retain the rendered document, not just the ability to re-render                                          |
| **Delivery evidence**  | When and how it was made available; e-delivery consent state (US E-SIGN)                                                                                        |

| Regime             | Requires                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| EU PSD2 Art. 57/58 | Transaction reference, amount in transaction currency, charges broken down, exchange rate applied, value date, payer/payee identification |
| EU PAD             | Annual Statement of Fees, standardised terminology, Fee Information Document at onboarding                                                |
| US Reg E           | Periodic statements for consumer accounts with EFTs; error-resolution notice                                                              |
| US Reg DD          | Interest earned, APY earned, fees imposed, days in period                                                                                 |
| US Reg Z (cards)   | Prescribed periodic-statement content, payment due date, minimum-payment warning, 21-day rule                                             |
| UK CCA / FCA       | Annual statements, arrears notices (NOSIA), default notices with prescribed wording and timing                                            |

Two derived rules: statement fees reconcile to fee **postings**, not to a render-time calculator (else a
rate-table change rewrites history); and FX'd lines show amount, converted amount, rate and markup separately
(M16, M20).

## 7. Mandates and recurring collection

A mandate is a stored authorisation to debit someone else's account: the most abusable object in retail banking,
which is why every scheme wraps it in notice requirements and return rights.

### 7.1 SEPA Direct Debit

| Aspect                                  | Core (B2C)                                                                                       | B2B                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Mandate                                 | Signed by the debtor, held by the creditor; UMR + creditor identifier                            | Same, plus the debtor bank must verify the mandate before debiting |
| Pre-notification                        | Default 14 calendar days before due date; shortenable only by evidenced agreement                | Same                                                               |
| Dormancy                                | Expires after **36 months** without a collection                                                 | Same                                                               |
| Refund, authorised collection           | **8 weeks**, no reason required                                                                  | **No refund right**                                                |
| Refund, unauthorised (no valid mandate) | **13 months**                                                                                    | 13 months                                                          |
| Amendment                               | Sequence type, IBAN, creditor name/CI carried in amendment fields — never silently a new mandate | Same                                                               |

Lifecycle: `DRAFT → ACTIVE → (AMENDED) → {CANCELLED_BY_DEBTOR, REVOKED_BY_CREDITOR, EXPIRED}` — an append-only
sequence of mandate versions with effective dates. A collection cites the version in force at its due date, and
its sequence type (`FRST`/`RCUR`/`OOFF`/`FNAL`) must match that state or you get an R-transaction.

| R-transaction    | When                                                                      | Accounting                                                             |
| ---------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reject / Refusal | Before settlement, by debtor bank, CSM or debtor                          | Reverse the receivable; the collection never settled                   |
| Return           | After settlement, by the debtor bank (closed account, insufficient funds) | Reversing entry (M3) + return-fee posting (M16) + dunning state change |
| Refund           | Debtor-initiated after settlement (8 weeks / 13 months)                   | Reversing entry; the exposure window must be provisioned               |
| Reversal         | Creditor-initiated correction                                             | Reversing entry citing the original                                    |

Design for the **13-month** window, not the 8-week one. A model that books a settled SEPA DD as final revenue at
T+3 understates a real liability.

### 7.2 UK Bacs and the Direct Debit Guarantee

Bacs runs a three-day cycle (submit, process, credit); the DDI is lodged with the paying bank, usually via
AUDDIS, and a Service User Number plus scheme sponsorship are prerequisites — a bureau removes the plumbing, not
the obligations. Advance notice is normally **10 working days**, and any change to amount or date restarts it.
The **Direct Debit Guarantee** gives the payer an immediate refund from their bank for an error, the bank
recovering from the service user by indemnity claim with no practical time limit, so the exposure window is
open-ended. ADDACS messages must be applied to the mandate; ignoring them produces the classic Bacs failure —
collecting against a cancelled DDI.

### 7.3 ACH

Nacha requires an authorisation appropriate to the SEC code (`PPD`, `CCD`, `WEB` internet-initiated consumer
debit, `TEL`), retained and reproducible, stating the amount or how it is determined, the schedule and how to
revoke. WEB debits carry an account-validation obligation on first use.

| Return class                                         | Window                               | Note                                            |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| Administrative and NSF returns (R01, R02, R03…)      | 2 banking days                       | Fast, cheap, expected                           |
| Unauthorised **consumer** debit (R05, R07, R10, R11) | **60 calendar days** from settlement | Needs a Written Statement of Unauthorized Debit |
| Revoked authorisation / notice not given             | 60 calendar days                     | Same exposure class                             |
| Corporate CCD/CTX unauthorised (R29)                 | 2 banking days                       | Corporates lose the long window                 |

Nacha's administrative (3%), overall (15%) and unauthorised (0.5%) return-rate thresholds are compliance limits
with real consequences: monitor them per originator as first-class metrics (M12). Since **20 March 2026** (large
originators, TPSPs and TPSs) and **22 June 2026** (everyone else) Nacha also requires a documented, risk-based
**fraud-monitoring** process on originations, with RDFI-side monitoring of inbound credits phasing in on the same
dates — an obligation on you, not only on your bank. Same-Day ACH shortens settlement but not the return windows —
faster money out, identical clawback — and its per-payment cap is **$1 m** until it rises to $10 m on 17 September 2027.

## 8. Open banking: the regimes

| Standard / regime                          | Scope                                                                              | Auth model                                                         | Data scope                                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EU PSD2** (RTS on SCA & CSC)             | AIS, PIS, CBPII; payment accounts only                                             | SCA; redirect, decoupled or embedded; eIDAS QWAC + QSealC          | Payment accounts accessible online                                                 | The law mandates an interface, not its shape — hence no single API                                                                                                                                                                                                                                                                                                                                 |
| **UK Open Banking (OBL)**                  | AIS, PIS, sweeping VRP; CMA9 mandated                                              | FAPI 1.0 Advanced; OBWAC/OBSEAL via the Open Banking Directory     | Read/Write API — **v4.0.1 current (Mar 2026)**; v3.1.x still widely deployed       | The most prescriptive standard; conformance-tested. Governance is mid-transition: JROC is wound down, the FCA is lead regulator under the National Payments Vision, and OBL is being succeeded by an industry-owned, not-for-profit **Future Entity** (company limited by guarantee, no enforcement powers)                                                                                        |
| **Berlin Group NextGenPSD2 / openFinance** | AIS, PIS, CoF, plus extensions                                                     | Redirect, decoupled, embedded profiles; QWAC/QSealC                | Accounts, balances, transactions, standing orders                                  | A _framework_ with optional elements — every bank speaks a dialect                                                                                                                                                                                                                                                                                                                                 |
| **STET (FR/BE)**                           | AIS, PIS                                                                           | Redirect/decoupled; QWAC/QSealC                                    | Comparable to Berlin Group                                                         | Distinct payload shapes; do not assume BG                                                                                                                                                                                                                                                                                                                                                          |
| **US FDX**                                 | Accounts, transactions, investments, tax data                                      | OAuth 2.0 + FDX profiles; bilateral, contractual trust             | Broad, beyond payments                                                             | Industry standard adopted by agreement, not statute. **Recognised by the CFPB as a §1033 standard-setting body in January 2025** — that recognition survives the rule's own troubles, so FDX is the de facto US wire format                                                                                                                                                                        |
| **US CFPB §1033**                          | Consumer-authorised personal financial data rights                                 | Rule-defined developer interfaces; phases out screen scraping      | Transactions, balances, terms, initiation info                                     | **Enjoined, and being rewritten.** The Oct 2024 final rule is under a preliminary injunction (E.D. Ky., Oct 2025, _Forcht Bank / BPI_); the CFPB reopened the rule by ANPR in Aug 2025, notably on whether data providers may **charge** for access. The tiered compliance dates (1 Apr 2026 onward) are on the books but not enforceable. Design to FDX and to contracts, not to the rule's dates |
| **Australia CDR**                          | Banking and energy live; **non-bank lending from July 2026**; accreditation regime | Data Standards Body standards, FAPI-derived; CDR Register          | Prescribed data clusters, tiered — narrowed in the v8 rules to cut compliance cost | The strictest consent rules of any regime. **Action initiation was legislated in August 2024 but has not been switched on** for any sector; the 2024 "CDR reset" reprioritised toward cost reduction and the non-bank lending rollout. Do not plan a product on CDR write access                                                                                                                   |
| **Brazil Open Finance**                    | Accounts, credit, investments, insurance, FX; initiation incl. Pix                 | FAPI-based; directory-issued certificates; participation mandatory | Phased, very broad                                                                 | Pix integration makes PIS genuinely mainstream, and **Pix Automático** (recurring Pix, live since June 2025) gives Brazil an A2A subscription rail with no card in it. Watch the central bank's _agenda evolutiva_ rather than the standard alone — Pix por aproximação landed Feb 2025, MED 2.0 in 2026, Pix parcelado and Pix em garantia are still moving                                       |

The **90-day re-authentication rule** is the most operationally significant detail in PSD2, and the two sides of the
Channel resolved it differently — both are settled law, neither is the original rule.

|                                | EU                                                                                                            | UK                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Instrument                     | Delegated Regulation **(EU) 2022/2360**, applying from **25 July 2023**                                       | FCA **PS21/19**, SCA-RTS Article 10A                                                                                       |
| What changed                   | New exemption: the ASPSP need not apply SCA for AIS access for **180 days**                                   | Bank-side 90-day SCA for AIS **removed entirely**                                                                          |
| What replaces it               | The AISP renews the customer's consent; the ASPSP may still apply SCA on first access and on changes of scope | The AISP must **re-confirm explicit consent at least every 90 days**, and stop access immediately if the customer does not |
| Who now carries the obligation | The AISP                                                                                                      | The AISP                                                                                                                   |

The engineering does not disappear — it moves from "the bank re-authenticates" to "you must prove you
re-confirmed", which is why `reconfirmed_at` and an evidence snapshot are columns in §10 and not a log line. Note
the asymmetry: a single connection portfolio spanning both regimes needs **two** clocks, 180-day and 90-day, and
the UK one has a hard stop attached.

**Direction of travel, with what is actually agreed.** **PSD3 + PSR reached political agreement in November 2025**;
formal adoption and OJ publication are expected during 2026, the PSR then applying after roughly a 21-month
transition (2027–28) and PSD3 transposed about 18 months after entry into force. They merge the payment-institution
and e-money regimes, mandate permission dashboards, tighten ASPSP interface performance and availability, extend
fraud liability (including impersonation fraud and, as added in negotiation, platform liability) and impose an
IBAN/name-check duty on transfers. **FiDA is real but slower and narrower than the original proposal**: it was
briefly listed for withdrawal in the Commission's 2025 work programme, kept as a pending file after pushback, and
went to trilogue with **creditworthiness-assessment data, sickness and health insurance data and insurance-based
investment products outside scope**, and a **phased application of roughly 24 / 36 / 48 months** after entry into
force depending on the data category. FiDA also introduces compensated data-sharing, so open finance outside payment accounts
will not be free. Nothing here binds you yet. Build the abstraction — consent object, permission dashboard, scope
model, per-scheme pricing hook — that survives whichever version lands.

## 9. Open banking security

| Control               | FAPI 1.0 Advanced                                                  | FAPI 2.0 Security Profile                      |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| Request integrity     | Signed request object (JAR); `response_type=code id_token` or JARM | **PAR mandatory**; request object optional     |
| Code interception     | `nonce` + `s_hash`/`c_hash` binding, or PKCE                       | **PKCE (S256) mandatory**                      |
| Client authentication | `private_key_jwt` **or** mTLS (`tls_client_auth`)                  | Same two options                               |
| Token binding         | mTLS certificate-bound tokens (RFC 8705)                           | **Sender-constrained mandatory**: mTLS or DPoP |
| Response integrity    | ID token as detached signature, or JARM                            | JARM optional; simplified                      |
| Algorithms            | PS256 / ES256 only; never `none` or RSA-PKCS1-v1_5                 | Same posture                                   |

FAPI 2.0 is materially easier to implement correctly — PAR removes URL-length and request-tampering problems,
and mandatory sender-constrained tokens make a stolen bearer token useless. It stopped being a draft: the **FAPI
2.0 Security Profile and Attacker Model were approved as OpenID Final Specifications on 19 February 2025**, with
final conformance tests and certifications available since mid-2025, so "we are waiting for it to stabilise" is no
longer a reason to stay on Implementer's Draft 2. Expect to support both profiles for years — UK Open Banking is
still FAPI 1.0 Advanced.

Under eIDAS a PSD2 TPP uses a **QWAC** for mTLS transport identity and a **QSealC** for sealing payloads; both
carry PSD2 role attributes (`PSP_AS`, `PSP_PI`, `PSP_AI`, `PSP_IC`) and the competent authority's identifier per
the ETSI profile, so the ASPSP can check role and authorisation status at connection time. The UK replaced eIDAS
with OBWAC/OBSEAL certificates from the Open Banking Directory; **the US has no equivalent statutory PKI**, so
FDX trust is bilateral and contractual, which is why US trust questions become commercial ones. A TPP must hold
a regulator authorisation, a directory registration per ecosystem, signing and transport keys in HSM/KMS
custody, client registrations at each ASPSP, a redirect stack with app-to-app support, a consent store (§10),
and an ops function that treats certificate expiry as a P1.

**A second EU identity clock is now close enough to plan against.** Under eIDAS 2.0 (Regulation (EU) 2024/1183,
in force since May 2024, first implementing acts adopted 28 November 2024) every Member State must offer at least
one **EU Digital Identity Wallet by 24 December 2026**, and private relying parties in regulated sectors —
banking explicitly among them — must **accept** the wallet for authentication by **24 December 2027** where they
are already required to use strong user authentication. For a bank that means the wallet becomes an accepted
onboarding and login credential alongside your own, carrying attested attributes (identity, and later
qualified electronic attestations such as proof of address or age) that you did not collect yourself. Plan the
identity model for _attested claims from an external issuer with their own revocation state_, not for another
IdP.

| Production failure        | Symptom                                                                | Mitigation                                                                             |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Certificate rotation      | Every connection to one ASPSP fails at a timestamp                     | Alert at 30/14/7 days; automate; stagger; keep both certs valid during overlap         |
| Clock skew                | Intermittent `iat`/`exp`/`nbf` rejections, per-ASPSP                   | NTP discipline, small leeway, never issue `iat` in the future                          |
| Redirect fragility        | Users lost between bank and app; sessions expire mid-journey           | Server-side state keyed on `state`; resumable sessions; idempotent duplicate callbacks |
| App-to-app                | Bank app absent, deep link opens the wrong browser, iOS/Android differ | Capability detection, browser fallback, never assume the same browser context returns  |
| Non-conformant responses  | Missing fields, invented enums, HTTP 200 with an error body            | Per-ASPSP adapter; tolerant parse with strict deviation logging; daily conformance run |
| Rate limits / TPP quotas  | 429s at peak                                                           | Per-ASPSP token bucket, jittered backoff, user-present traffic before batch            |
| PIS idempotency semantics | Duplicate payment risk on retry                                        | ASPSP idempotency header **plus** your own dedupe (M7, §12)                            |

## 10. Consent lifecycle

Consent is not a boolean on a user row: it is an auditable object with a lifecycle, and the artefact a regulator
asks for (M14).

```sql
CREATE TABLE consent (
  consent_id          uuid PRIMARY KEY,
  subject_id          uuid        NOT NULL,   -- your user
  provider_id         text        NOT NULL,   -- ASPSP or aggregator institution
  external_consent_id text,                   -- the ASPSP's id, when it issues one
  purpose             text        NOT NULL,   -- specific; not "to improve services"
  permissions         text[]      NOT NULL,   -- ReadAccountsDetail, ReadTransactionsCredits, …
  data_from timestamptz, data_to timestamptz, -- requested history window
  status              text        NOT NULL,   -- REQUESTED|AWAITING_AUTH|ACTIVE|EXPIRED|REVOKED|REJECTED
  granted_at timestamptz, expires_at timestamptz NOT NULL,
  reconfirmed_at      timestamptz,            -- TPP-side re-confirmation (UK 90-day)
  revoked_at timestamptz, revoked_by text,    -- USER|TPP|ASPSP|EXPIRY
  evidence_ref        text        NOT NULL);  -- immutable snapshot of the consent screen shown

CREATE TABLE consent_event (                  -- append-only (M3, M14)
  id bigserial PRIMARY KEY, consent_id uuid NOT NULL REFERENCES consent(consent_id),
  at timestamptz NOT NULL DEFAULT now(), actor text NOT NULL, event text NOT NULL, detail jsonb NOT NULL);
```

- **Scope is enforced, not recorded.** A consent covering `ReadTransactionsCredits` means the data layer refuses
  to persist debits: every query carries a consent id and is checked against it (M11).
- **Expiry is real** — past `expires_at` you return no data, not stale data, and access after expiry is a
  reportable incident. **Re-confirmation is evidence**: `reconfirmed_at` plus the snapshot.
- **Revocation is immediate and propagated**, at the ASPSP _and_ locally — both can fail independently, so make
  it a retried idempotent workflow that alerts on divergence.

| Data                                                                          | On revocation                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Access and refresh tokens                                                     | Destroyed immediately; revoked at the authorization server                   |
| Raw account/transaction data held solely under that consent                   | Deleted or irreversibly anonymised per your published retention statement    |
| Derived features and scores                                                   | Usually deleted or expired; document the basis if retained                   |
| Records required for AML/CTF (identity, monitoring evidence, SAR/STR support) | **Retained** for the statutory period — a legal obligation overrides erasure |
| The consent record and its event log                                          | **Retained** — it is the evidence that access was lawful                     |
| Access audit logs                                                             | **Retained** per the audit-trail policy (M14)                                |

Retention/erasure interaction, lawful bases and DSAR handling are in `compliance-regulatory.md`. Refresh tokens
are bearer credentials to a bank account: envelope-encrypt with a KMS-held key, never log them or their prefixes
(M15), rotate on every use where supported, and treat reuse of a rotated token as a compromise signal.

## 11. Data aggregation in practice

The integration shape is the same across Plaid, Tink, TrueLayer, Yodlee, MX, Finicity, Belvo and Basiq:

```
link/consent UI → connection ("item") id → accounts → transactions (cursor or date window)
                  ↑ re-auth required                  ↑ webhook: new data available
```

| Concept    | Variants                                             | Design rule                                                                                                                      |
| ---------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Connection | item, connection, consent, login                     | One per (user, institution, credential); the unit of re-auth and of failure                                                      |
| Sync       | cursor delta, date window, full refresh              | Prefer cursor deltas with explicit added/modified/removed sets                                                                   |
| Webhooks   | new data, re-auth required, error, backfill complete | At-least-once and forgeable: verify signature, dedupe on event id, fail closed (M8); delivery mechanics in `architecture-ops.md` |
| Backfill   | 24 months typical, sometimes 90 days                 | Record the _actual_ coverage window per account; never assume completeness                                                       |
| Balances   | current/available/limit, or Berlin Group types       | Store the provider's raw type string next to your mapped type (§5)                                                               |
| Enrichment | vendor taxonomy, merchant normalisation              | A versioned vendor _opinion_, never truth                                                                                        |

**In the US, free bank data has ended, and the change is commercial rather than technical.** During 2025 JPMorgan
Chase moved its aggregator connections onto paid agreements — Plaid in September 2025, then Yodlee, Morningstar
and Akoya — covering the large majority of third-party requests against its accounts. Whether §1033 permits data
providers to charge at all is one of the questions the CFPB expressly reopened in its August 2025 ANPR, so treat
the pricing model as unsettled and the _principle_ as established. Two design consequences. **Per-call cost is now a real variable**: polling schedules,
refresh-on-app-open and speculative backfills that were free are now line items, so cursor deltas and
webhook-driven refresh stop being merely good practice. And **the aggregator's institution coverage is a
commercial fact with an expiry**, not a capability — track it per institution, keep a second provider integrable,
and treat "this bank went dark for our aggregator" as a foreseeable event with a customer-facing message, not an
incident.

### 11.1 The pending → posted identity problem

A pending transaction is later replaced by a posted one whose **id has changed**, whose **amount may have
changed** (tip, fuel pre-auth, finalised FX), whose **date may have changed** and whose **description almost
certainly changed**. Naive systems show it twice, lose it, or double-count. Assume no link field.

```python
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
import re

@dataclass(frozen=True)
class ExternalTxn:
    provider: str; external_id: str; account_id: str
    amount: Decimal; currency: str        # amount is signed, in the account currency
    txn_date: date                        # normalised to the account timezone at the adapter
    description: str; pending: bool
    pending_link_id: str | None = None    # provider-supplied link, when it exists

_NOISE = re.compile(r"(?i)\b(pos|purchase|debit card|visa|mc|auth|pending)\b|[a-z]*\d{2,}[a-z]*|[^a-z0-9 ]")

def descriptor_key(text: str) -> str:
    return " ".join(_NOISE.sub(" ", text.lower()).split())[:24]

def match_posted_to_pending(posted: ExternalTxn, candidates: list[ExternalTxn]) -> ExternalTxn | None:
    """The pending txn this posted txn supersedes, else None: 'treat as new', never 'drop it'."""
    if posted.pending_link_id:
        for c in candidates:
            if c.external_id == posted.pending_link_id:
                return c
    pool = [c for c in candidates
            if c.pending and c.account_id == posted.account_id and c.currency == posted.currency
            and abs((c.txn_date - posted.txn_date).days) <= 5
            and (c.amount >= 0) == (posted.amount >= 0)]
    exact = [c for c in pool if c.amount == posted.amount]
    if len(exact) == 1:
        return exact[0]
    key, scored = descriptor_key(posted.description), []
    for c in pool:
        drift = abs(c.amount - posted.amount)
        if drift > max(abs(posted.amount) * Decimal("0.30"), Decimal("5.00")):   # tips, fuel, FX
            continue
        scored.append(((0 if descriptor_key(c.description) == key else 1,
                        int(drift * 100), abs((c.txn_date - posted.txn_date).days)), c))
    scored.sort(key=lambda s: s[0])
    if not scored or (len(scored) > 1 and scored[1][0] == scored[0][0]):
        return None                        # tie: surface both, keep both, queue for review
    return scored[0][1]
```

The surrounding discipline matters more than the scoring function:

- Keep a **transaction identity table**: a stable internal `txn_id` mapped to many `(provider, external_id)`
  observations with `first_seen`, `last_seen`, `state`. Retiring a pending row records the supersession.
- **Never post aggregated data to the ledger as fact** — it is an observation of someone else's ledger. Where it
  must drive postings, post from the **posted** state only, keyed on the internal `txn_id` (M7).
- Ambiguity must be representable: an `AMBIGUOUS` state holding both observations, a queue with an owner, a UI
  that never double-counts. Age unmatched pendings out (7–14 days) to `EXPIRED_PENDING` and alert when that rate
  moves — it usually means the institution changed descriptors or posting behaviour.

### 11.2 Enrichment, downtime, re-auth storms

A vendor category is a model output with an unpublished error rate that changes when the vendor retrains. Store
`category_vendor`, `category_vendor_version` and your own `category_effective` (user override > your model >
vendor); nothing user-visible or financially consequential may depend on an untracked vendor version (M17, M20).

Institution downtime and credential expiry produce **re-auth storms**: a bank changes its login flow, or a
consent cohort granted in the same week expires on the same day, and tens of thousands of connections fail at
once. Jitter requested consent expiry at grant time so cohorts disperse; run a per-institution circuit breaker;
surface a per-institution health signal ("data is from 09:14 today"); queue re-auth prompts instead of blocking.
Prefer webhook-driven refresh over polling, and treat every webhook as at-least-once and possibly forged (M8).

## 12. Payment initiation and VRP

The flow: create a payment consent/intent at the ASPSP → redirect the payer for SCA → consent authorised →
submit/confirm → poll or receive status. Vocabularies differ per standard but map onto `PENDING → ACCEPTED
(ACSP/ACSC) → SETTLED` or `REJECTED`.

| Model                             | Definition                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single immediate payment**      | One consent, one payment                                                                 | The common case, on credit-transfer rails (FPS, SEPA SCT/Inst, Pix)                                                                                                                                                                                                                                                                                                                                                                       |
| **Future-dated / standing order** | Schedule held at the ASPSP                                                               | Cancellation is bank-side, not yours                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Sweeping VRP**                  | Me-to-me transfers between the customer's own accounts under a long-lived capped consent | Mandated for the UK CMA9; no per-payment SCA                                                                                                                                                                                                                                                                                                                                                                                              |
| **Commercial VRP**                | Third-party payments under a long-lived capped consent                                   | Live in the UK, narrowly. **Wave 1 — utilities, financial services and government — began settling in Q1 2026** under the industry-owned **UK Payments Initiative** scheme, on a multilateral contract with a defined commercial model. E-commerce is **Wave 2**, not yet scoped commercially; the FCA reviews progress at end-2026, with HM Treasury legislation and an FCA long-term framework consultation expected in the same window |

**Do not design a general card alternative on cVRP yet.** The Wave 1 boundary is a sector list, not a technical
capability, so "we accept pay-by-bank with a stored mandate" is available to a utility and not to a retailer this
year. Sweeping VRP (me-to-me) is separate, mandated on the CMA9, free at the point of use, and remains the only
VRP most firms can actually rely on today.

A VRP consent is a **limit object** (M12): max per payment, max per period, validity dates, permitted payees and
purpose — enforced on your side too, since relying on the ASPSP to refuse creates the reconciliation mess you
are avoiding. Credit transfers are irrevocable, so a submission timeout is genuinely ambiguous.

```python
def submit_payment(client, consent_id: str, instruction: PaymentInstruction) -> PaymentOutcome:
    """Idempotent submit with ambiguity resolution (M7, M9). Never blind-retries a credit transfer."""
    key = instruction.idempotency_key       # derived from the business action, stable across retries
    existing = store.get_by_key(key)
    if existing and existing.terminal:
        return existing.outcome             # replay returns the original outcome, no new effect
    store.record_attempt(key, consent_id, instruction)      # BEFORE the network call, always
    try:
        resp = client.submit(consent_id, instruction, idempotency_key=key)
    except (Timeout, ConnectionError, ServerError):
        resp = client.find_payment(idempotency_key=key, end_to_end_id=instruction.end_to_end_id)
        if resp is None:
            store.mark(key, "UNRESOLVED")   # must be settled by reconciliation (§13)
            raise PaymentAmbiguous(key)
    store.mark_terminal_if(key, resp)
    return PaymentOutcome.from_provider(resp)
```

Three non-negotiables: a stable `end_to_end_id` you generate and can search on; the idempotency key recorded
**before** the network call, so a crash mid-call is resolvable; and a sweep matching every initiated payment
against the account's actual transactions in a bounded window (M9). "It went twice" is entirely preventable.

## 13. Reconciling aggregated data against the bank of record

An aggregator is never the source of truth: it is a _view_ of someone else's ledger, delivered late, possibly
incomplete, vendor-transformed. Rule 0 and M9 agree — the bank's own record governs.

| Check                      | Frequency                                | Assertion                                                                                                | On failure                                                                               |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Internal tie-out           | Daily, per account                       | `opening + Σ(posted in window) == closing`, on the provider's own numbers                                | The feed is self-inconsistent: mark `SUSPECT`, suppress derived figures, force a refresh |
| Provider vs bank of record | Daily, per material account and FBO pool | Aggregator closing balance == statement/core closing at the same cut-off                                 | Investigate before any downstream use; never average the two                             |
| Sub-ledger vs bank (§1.2)  | Daily                                    | Σ(customer balances) == bank FBO balance                                                                 | Freeze new activity on the pool if unexplained beyond the declared threshold             |
| Coverage                   | Per sync                                 | No gap between `covered_through` and the new window start                                                | Backfill explicitly; never let a gap close silently                                      |
| Duplicates                 | Per sync                                 | No two internal txns share (account, amount, date, descriptor key) without a distinct-transaction marker | Quarantine and review                                                                    |

```sql
-- Daily internal-consistency assertion on an aggregated account (M17)
SELECT s.account_id, s.opening_balance_minor, s.closing_balance_minor,
       COALESCE(SUM(t.amount_minor), 0) AS sum_posted_minor,
       s.opening_balance_minor + COALESCE(SUM(t.amount_minor), 0) - s.closing_balance_minor AS discrepancy
FROM aggregated_balance_snapshot s
LEFT JOIN aggregated_txn t ON t.account_id = s.account_id AND t.state = 'POSTED'
      AND t.booked_at >= s.window_start AND t.booked_at < s.window_end
WHERE s.as_of_date = CURRENT_DATE - 1
GROUP BY s.account_id, s.opening_balance_minor, s.closing_balance_minor
HAVING s.opening_balance_minor + COALESCE(SUM(t.amount_minor), 0) <> s.closing_balance_minor;
```

When they diverge the order is fixed: freeze derived outputs, label anything already shown as stale (M20),
refetch from the bank of record, classify the break with the taxonomy in `reconciliation-close.md`, correct by
reversal anything your ledger posted on the aggregated view (M3), and record the break with an owner and an age.
Anything you cannot classify within the declared threshold is an incident.

## 14. Failure-mode catalogue

| #   | Failure mode                              | Cause                                                                        | Detection                                                                             | Mitigation                                                                                                             |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Stale balance shown as current**        | Cached aggregate, failed sync, provider outage                               | `as_of` age vs SLA; staleness histogram per institution                               | Always display `as_of` (M20); suppress derived "safe to spend" when stale; hard staleness ceiling                      |
| 2   | **Duplicated transaction after re-auth**  | New connection id ⇒ history re-delivered with new external ids               | Duplicate scan on (account, amount, date, descriptor key); spike after re-auth events | Identity table keyed on business content, not provider id; idempotent ingestion (M7)                                   |
| 3   | **Missing or never-resolving pending**    | Institution does not expose pendings; capture never happened; matcher failed | Posted-without-prior-pending ratio per institution; pending age distribution          | Per-institution capability profile; explicit `EXPIRED_PENDING` state; re-run the matcher after backfills               |
| 4   | **Timezone-shifted booking date**         | Provider dates in UTC, bank books local; day boundary                        | Clustering at 23:00/00:00 local; month totals off by one day's activity               | Store raw value and timezone; normalise once at the adapter; assign periods from booking date in the declared tz (M10) |
| 5   | **Partial backfill treated as complete**  | Institution caps history; sync interrupted                                   | Covered window vs requested; inter-sync gap detector                                  | Persist `covered_from/through`; label reports with the window (M20); block totals spanning uncovered ranges            |
| 6   | **Consent revoked mid-sync**              | User revokes at the bank; expiry lands during a batch                        | 403/consent errors mid-batch; consent status poll                                     | Transactional sync units; on revocation stop, mark partial, trigger the deletion workflow (§10)                        |
| 7   | **Re-auth storm**                         | Cohort consents expire together; bank changes login                          | Correlated failure spike per institution; expiry histogram                            | Jitter expiry at grant; per-institution circuit breaker; queued re-auth prompts                                        |
| 8   | **Institution schema/behaviour change**   | New API version, changed descriptors                                         | Per-ASPSP contract tests in CI; deviation logging; field-null-rate anomalies          | Per-provider adapter; tolerant parse with strict alerting; daily conformance run against sandbox                       |
| 9   | **Currency of account vs of transaction** | Card spend abroad; multi-currency account; one amount returned               | Rows where `amount_currency != account_currency`; missing rate field                  | Model both legs and the rate; refuse cross-currency sums (M6); book FX spread separately (M16)                         |
| 10  | **Balance-type mismatch / hold leakage**  | `available` mapped to `current`; authorisations never released               | Available ≤ current sanity check vs statement; holds older than the scheme maximum    | Explicit per-provider type mapping; scheduled hold-expiry job; atomic hold→posting conversion (M13)                    |
| 11  | **Double-collected direct debit**         | Retry without an idempotency key, or a re-submitted file                     | Duplicate (mandate, due date, amount) gate before submission                          | Idempotency key per collection (M7); pre-submission duplicate check; return-rate monitoring                            |
| 12  | **Ambiguous PIS outcome**                 | Timeout submitting an irrevocable credit transfer                            | `UNRESOLVED` attempts; initiated-vs-observed reconciliation                           | Never blind-retry; search by `end_to_end_id`; bounded sweep against the account (§12, M9)                              |

## Where to check the current text

Everything dated in this file was verified on 2026-09-10 and will drift. These are the primary sources.

| Topic                                  | Source                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| IBAN lengths and BBAN structures       | SWIFT IBAN Registry — https://www.swift.com/standards/data-standards/iban-international-bank-account-number |
| SEPA rulebooks, VOP scheme rulebook    | https://www.europeanpaymentscouncil.eu/document-library/rulebooks                                           |
| SCA-RTS and the AIS access exemption   | Delegated Regulation (EU) 2018/389 as amended by (EU) 2022/2360, on EUR-Lex                                 |
| UK SCA-RTS, 90-day reconfirmation      | FCA PS21/19 — https://www.fca.org.uk/publication/policy/ps21-19.pdf                                         |
| UK Open Banking standard and directory | https://standards.openbanking.org.uk/api-specifications/latest/                                             |
| UK open banking governance, cVRP       | FCA FS25/4 and the FCA/PSR cVRP updates at https://www.fca.org.uk                                           |
| Berlin Group openFinance / NextGenPSD2 | https://www.berlin-group.org                                                                                |
| CFPB §1033 status and rulemaking       | https://www.consumerfinance.gov/rules-policy/ (docket CFPB-2025-0023)                                       |
| FDX standard                           | https://financialdataexchange.org                                                                           |
| Australia CDR rules and rollout        | https://www.cdr.gov.au/rollout                                                                              |
| Nacha rules and effective dates        | https://www.nacha.org/rules                                                                                 |
| FAPI profiles                          | https://openid.net/wg/fapi/                                                                                 |
| eIDAS 2.0 / EUDI Wallet                | Regulation (EU) 2024/1183 on EUR-Lex; https://ec.europa.eu/digital-building-blocks                          |

## Review questions

1. For every customer-visible balance, which postings derive it, what is its staleness bound, and what job
   proves it still equals a recomputation from postings (M1, M17)?
2. If this is a neobank on a sponsor bank: which record governs when your ledger and the bank's disagree, who
   wrote that down, and what was yesterday's sub-ledger-versus-FBO difference (Rule 0, M9)?
3. What would a grep for an IBAN or account-number pattern across the log store, the trace store and the
   warehouse return today (M15)?
4. Show one account's accrual for a month at daily granularity: what happened to the sub-cent residue, and what
   did a backdated value date do to it (M5, M10)?
5. What is the accrued-but-unpaid interest liability at the last period end, and does it sit in that period's
   trial balance rather than the one in which it was capitalised (M10)?
6. For each institution, which balance type does the provider return, what is your mapped type, and where is the
   raw provider type stored (M20)?
7. Take a settled direct debit from four months ago: what liability do you still carry for it, and where in the
   books is that exposure represented (§7)?
8. When a customer revokes consent, name every store the data sits in, what is deleted, what is retained under
   an AML obligation, and how you would evidence both to a regulator (M14).
9. If a PIS submission times out, exactly what happens next — who or what confirms whether the money moved,
   within what window, and what is posted in the meantime (M7, M9)?
10. When a posted transaction cannot be matched to its pending predecessor, what does the customer see, what
    does the ledger record, and who owns the ambiguity queue (§11)?
