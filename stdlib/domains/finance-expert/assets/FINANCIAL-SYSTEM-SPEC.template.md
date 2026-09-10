# Financial system specification — `<Acme Wallet>`

> Copy to `FINANCIAL-SYSTEM-SPEC.md` in the system's repository. One page per money surface, not one
> per service. Replace every `<angle bracket>` with a real answer; a bracket left in place at review
> time is an open question, and belongs in §10 with an owner.
>
> Ordering matters: §1 is the rationale an auditor asks for, §2–§4 are what engineering builds from,
> §9 is what the reviewer signs. Do not write §2 before §1 is answered by name.

| Field                          | Value                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| System                         | `<Acme Wallet — customer balances, top-ups, marketplace purchases and merchant payouts>` |
| Legal entity                   | `<Acme Payments Ltd (IE), company no. 123456>`                                           |
| Engineering owner              | `<R. Okonkwo, Payments Platform>`                                                        |
| Finance owner (owns the books) | `<M. Duarte, Financial Controller>`                                                      |
| Approver (signs this spec)     | `<S. Whitfield, CFO>`                                                                    |
| Version                        | `<1.3>`                                                                                  |
| Status                         | `<draft \| in review \| approved \| superseded by …>`                                    |
| Date                           | `<2026-09-10>`                                                                           |
| Supersedes                     | `<v1.2, 2026-05-04 — added GBP and the FX spread policy>`                                |

## 1. Framing

_The nine questions from the skill's §2. Answer all nine before a column or a schema exists. "We'll
decide later" is an entry in §10 with a name and a date against it, never a blank._

### 1.1 Whose money, and held by whom?

_Which of the three you are: you only **record** amounts, you **instruct** a regulated party, or you
**hold** client funds. The third changes the licence, the safeguarding duty and the audit. A bad
answer is "we just track balances" describing a product where a customer can top up and withdraw —
that is holding client funds however the code is written._

**Answer:** `<We hold client funds. Customer top-ups sit in a segregated safeguarding account at
<Bank>, not in the operating account. Acme is an EMI under <regulator ref>; safeguarding
reconciliation is a daily control (§6). Merchant balances are payables, not client funds.>`

### 1.2 What is the ledger of record, and who else believes they are it?

_List every system holding an authoritative amount and draw the arrows. Rule 0: if the organisation
already books money somewhere, that is the truth until a written decision says otherwise. A bad
answer names one system and omits the PSP dashboard finance actually looks at._

| System                        | Holds                                      | Authoritative for                | Reconciled to              | Direction      |
| ----------------------------- | ------------------------------------------ | -------------------------------- | -------------------------- | -------------- |
| `<Acme ledger (this system)>` | `<Postings, wallet and merchant balances>` | `<Customer-facing balances>`     | `<PSP + bank>`             | `<source>`     |
| `<Adyen>`                     | `<Card charges, fees, disputes, payouts>`  | `<What the scheme actually did>` | `<daily, §6>`              | `<external>`   |
| `<Bank — camt.053>`           | `<Cash>`                                   | `<Cash, absolutely>`             | `<daily, §6>`              | `<external>`   |
| `<NetSuite GL>`               | `<Statutory books>`                        | `<Statutory reporting>`          | `<monthly journal export>` | `<downstream>` |

**Decision:** `<The Acme ledger is the sub-ledger of record for wallet and merchant balances; NetSuite
is the GL of record. No third system computes a balance. (M1)>`

### 1.3 Currencies and FX policy

_Transaction currencies, functional currency, reporting currency, rate source, rate timestamp, and who
bears the spread. A bad answer is "we support multi-currency" with no rate source named._

**Answer:** `<Transaction currencies EUR, GBP, USD. Functional and reporting currency EUR. Rates from
<provider> daily 16:00 CET fixing, cached with a 26-hour staleness limit; a stale rate fails the
conversion closed rather than falling back. Customer-facing conversions carry a 75 bps spread booked
to 4100 FX spread income; the PSP's own spread is booked to 5200 (M6, M16).>`

### 1.4 Rails, finality and reversal windows

_One row per rail on the money path. Design for the longest reversal window on the path, not the
typical one. A bad answer omits the window because "it settles instantly"._

| Rail                          | Used for             | Finality                            | Reversal window                                  | Consequence for design                                                               |
| ----------------------------- | -------------------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `<Card auth/capture (Adyen)>` | `<Top-ups>`          | `<On funding>`                      | `<Chargeback ~120d, up to 540d>`                 | `<Chargeback provision; no irreversible payout of card-funded balance for <N> days>` |
| `<SEPA Credit Transfer>`      | `<Merchant payouts>` | `<Effectively final on settlement>` | `<Recall only, best-effort>`                     | `<Approval before release (M11); no automated re-send>`                              |
| `<SEPA Direct Debit>`         | `<—>`                | `<Not final>`                       | `<8 weeks no-questions, 13 months unauthorised>` | `<Funds-availability hold before crediting the wallet>`                              |

### 1.5 Accounting basis and calendar

_Basis, standard, close owner, close day, cutoff rule, materiality. A bad answer says "accrual" and
cannot state which timezone decides the period._

**Answer:** `<Accrual, IFRS. Close owned by the Financial Controller. Soft close D+2, hard close D+5.
Cutoff: an entry belongs to period P if its event time converted to Europe/Dublin falls in P and P is
open at booking time; otherwise it posts to the earliest open period with the original event date
recorded (M10). Materiality for close adjustments <EUR 5,000>; for break investigation, §6.>`

### 1.6 What is the worst wrong number?

_Rank the outputs by damage. Control effort and test effort follow this ranking, not code complexity.
A bad answer lists everything as critical._

| Rank | Number                          | Who sees it           | Damage if wrong                                           | Control that protects it                                                     |
| ---- | ------------------------------- | --------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `<Customer wallet balance>`     | `<Customer, support>` | `<Spend of money that isn't there; regulatory complaint>` | `<M1/M13/M17: derived from postings, atomic reserve, daily recompute check>` |
| 2    | `<Merchant payout amount>`      | `<Merchant, bank>`    | `<Irreversible overpayment>`                              | `<M11/M12: approval + limits>`                                               |
| 3    | `<VAT return>`                  | `<Tax authority>`     | `<Filing error, penalty>`                                 | `<M16/M19: tax as its own posting, report from ledger>`                      |
| 4    | `<Safeguarding reconciliation>` | `<Regulator>`         | `<Licence risk>`                                          | `<M9: daily, §6>`                                                            |

### 1.7 Regulatory perimeter

_Which regimes apply, and the concrete obligation each creates here. A bad answer lists acronyms with
no obligation attached. Detail in `references/compliance-regulatory.md`._

| Regime              | Applies because                 | Concrete obligation on this system                                                       |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `<PCI DSS (SAQ-A)>` | `<Card top-ups>`                | `<PAN never touches our systems; hosted fields; no card data in logs (M15)>`             |
| `<PSD2 — SCA>`      | `<EEA card and account access>` | `<3DS on top-up; exemption decisions recorded>`                                          |
| `<Safeguarding>`    | `<We hold client funds (§1.1)>` | `<Segregated account; daily reconciliation of Σ wallet liabilities to safeguarded cash>` |
| `<AML/KYC>`         | `<Wallet + payout>`             | `<KYC before first payout; monitoring thresholds owned by Compliance>`                   |

### 1.8 Volume and shape

_Peak rate, postings per day, retention horizon, close deadline, largest realistic report. A ledger
that is correct and forty minutes late for the close is not correct enough._

**Answer:** `<Peak 120 charges/s (Black Friday); ~4M postings/day; retention 10 years (M14); close
deadline D+5; largest report = full-year trial balance, ~1.2B postings, must run in <30 min.>`

### 1.9 Who owns the numbers, and who approves movement?

_Name people or rotas, never "the team". A money system with no named approver has no control,
whatever the code says (M11)._

| Action                           | Initiator                        | Approver                  | Rule                                   |
| -------------------------------- | -------------------------------- | ------------------------- | -------------------------------------- |
| `<Merchant payout > EUR 10,000>` | `<Payouts service (automation)>` | `<Finance Ops, named>`    | `<Automation never approves (M11)>`    |
| `<Manual journal entry>`         | `<Accountant>`                   | `<Financial Controller>`  | `<Preparer ≠ approver>`                |
| `<Break write-off>`              | `<Recon analyst>`                | `<Threshold tiers, §5.2>` | `<Declared in config, enforced (M12)>` |

## 2. Money model

_The representation decisions. Every one of these has produced a restatement somewhere when left
implicit. Detail in `references/money-arithmetic.md`._

| Decision                  | Value                                                                                                                       | Invariant |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------- |
| Internal representation   | `<Integer minor units, int64, with ISO 4217 code alongside — never float, never a bare number>`                             | M4        |
| Scale per currency        | `<ISO 4217 exponent: EUR/GBP/USD 2, JPY 0. Read from a table, never hardcoded as 100>`                                      | M4        |
| Wire format               | `<{"amount": "10.50", "currency": "EUR"} — string, never JSON number>`                                                      | M4        |
| Rounding mode             | `<ROUND_HALF_UP>`                                                                                                           | M5        |
| Rounding points           | `<Exactly two: (a) converting a computed rate/percentage result to minor units, (b) FX conversion output. Never mid-chain>` | M5        |
| Allocation rule           | `<Largest-remainder; tie broken by lowest line index; parts sum exactly to the total>`                                      | M5        |
| Rounding residue          | `<Booked to 6900 Rounding difference, never absorbed into principal>`                                                       | M5, M16   |
| Cross-currency arithmetic | `<Refused by the Money type at construction; no operator accepts two currencies>`                                           | M6        |
| FX rate source            | `<{provider}, daily 16:00 CET fixing>`                                                                                      | M6        |
| FX staleness limit        | `<26 hours; beyond it the conversion fails closed and pages the on-call>`                                                   | M6        |
| FX spread                 | `<75 bps to 4100 on customer conversions; provider spread to 5200>`                                                         | M16       |
| Idempotency key retention | `<24 months, matching the longest chargeback window on the path (§1.4)>`                                                    | M7        |

## 3. Account model

_Do not restate the chart of accounts here — link it, so there is one copy. State only the decisions
that shape it. A bad answer inlines a partial account list that then drifts from the real one._

| Item                          | Where                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Chart of accounts             | `<accounts/chart-of-accounts.yaml>` — from `assets/CHART-OF-ACCOUNTS.template.yaml` |
| Posting rules (event → entry) | `<docs/POSTING-RULES.md>` — from `assets/POSTING-RULES.template.md`                 |

| Decision             | Value                                                                            | Rationale                                                                     |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Per-subject balances | `<Control account + `account_id` dimension>`                                     | `<~2M wallets; the chart stays finance-readable (ledger.md §2.1)>`            |
| Currency modelling   | `<One account per currency for cash; currency on the line for control accounts>` | `<Bank accounts are physically per-currency; wallets are not>`                |
| Dimensions           | `<account_id, merchant_id, entity>`                                              | `<Every added dimension is an index and a report axis — three is the budget>` |
| Postable accounts    | `<Leaves only; parents exist for rollup>`                                        | `<ledger.md §2>`                                                              |
| Holds                | `<Separate reserved liability account, moved atomically>`                        | M13                                                                           |

## 4. Flows

_One state table per flow. For each state: what is posted, what is held, what can reverse it and for
how long. A flow without a reversal column is a flow whose exposure nobody has sized._

### 4.1 `<Wallet top-up by card>`

| From           | Event                | To             | Posting (rule id in POSTING-RULES)               | Hold                          | Reversible by     | Window                          |
| -------------- | -------------------- | -------------- | ------------------------------------------------ | ----------------------------- | ----------------- | ------------------------------- |
| `<—>`          | `<authorize>`        | `<authorized>` | `<TU-01 — memo only, no balance sheet movement>` | `<Issuer hold on cardholder>` | `<void>`          | `<Until capture or ~7d expiry>` |
| `<authorized>` | `<capture>`          | `<captured>`   | `<TU-02>`                                        | `<—>`                         | `<refund>`        | `<180d at PSP>`                 |
| `<authorized>` | `<decline / expiry>` | `<failed>`     | `<TU-03 — memo release only>`                    | `<—>`                         | `<—>`             | `<—>`                           |
| `<captured>`   | `<settlement file>`  | `<settled>`    | `<PO-02 pattern: in-transit → cash>`             | `<—>`                         | `<—>`             | `<—>`                           |
| `<settled>`    | `<chargeback>`       | `<disputed>`   | `<CB-01>`                                        | `<—>`                         | `<CB-02 / CB-03>` | `<~120d, up to 540d>`           |

### 4.2 `<Flow name>`

_Copy the table above. One per flow: purchase, refund, payout, FX conversion, subscription, invoice._

## 5. Controls

### 5.1 Limits (M12)

_Every limit declared here is enforced in code and refused on breach — never clamped, never bypassed
by a retry. A bad answer is a limit that exists only in a runbook._

| Limit                      | Scope            | Value             | Enforced at              | On breach                                    |
| -------------------------- | ---------------- | ----------------- | ------------------------ | -------------------------------------------- |
| `<Top-up per transaction>` | `<Per customer>` | `<EUR 2,000>`     | `<Top-up API, pre-auth>` | `<Refuse, error LIMIT_EXCEEDED, no partial>` |
| `<Top-up per 24h>`         | `<Per customer>` | `<EUR 5,000>`     | `<Rolling window store>` | `<Refuse; retry does not reset the window>`  |
| `<Payout per transaction>` | `<Per merchant>` | `<EUR 50,000>`    | `<Payout service>`       | `<Refuse; route to manual approval>`         |
| `<Daily payout batch>`     | `<Entity>`       | `<EUR 2,000,000>` | `<Batch builder>`        | `<Halt batch, page Finance Ops>`             |

### 5.2 Approval matrix (M11)

| Action              | Threshold        | Initiator         | Approver                 | Second approver |
| ------------------- | ---------------- | ----------------- | ------------------------ | --------------- |
| `<Refund>`          | `<≤ EUR 500>`    | `<Support agent>` | `<Auto (rule-approved)>` | `<—>`           |
| `<Refund>`          | `<> EUR 500>`    | `<Support agent>` | `<Support lead>`         | `<—>`           |
| `<Payout release>`  | `<> EUR 10,000>` | `<Automation>`    | `<Finance Ops>`          | `<—>`           |
| `<Manual journal>`  | `<Any>`          | `<Accountant>`    | `<Controller>`           | `<—>`           |
| `<Break write-off>` | `<> EUR 50,000>` | `<Recon analyst>` | `<Controller>`           | `<CFO>`         |

### 5.3 Separation of duties

_State the pairs that must never be the same identity, including for service accounts. A bad answer
covers humans and leaves an automation identity holding both roles._

**Answer:** `<Initiator ≠ approver for every row in §5.2. Preparer ≠ reviewer for each reconciliation.
The payout service's credential cannot approve; the approval API rejects any principal of type
`service`. No human holds both the Finance Ops and Payout Engineering roles; access reviewed
quarterly.>`

## 6. Reconciliation design (M9)

_Design it now, not after launch — a system reconciled for the first time in month three has three
months of breaks. Operational detail goes in the runbook from `assets/RECONCILIATION-RUNBOOK.template.md`._

| Source              | Feed                   | Cadence         | Cutoff                              | Grain                   | Match key                    | Reconciles                  | Owner           |
| ------------------- | ---------------------- | --------------- | ----------------------------------- | ----------------------- | ---------------------------- | --------------------------- | --------------- |
| `<Bank EUR>`        | `<camt.053>`           | `<Daily 06:00>` | `<Prev. business day 23:59 Dublin>` | `<Entry>`               | `<EndToEndId → payout_id>`   | `<1000 Cash at bank — EUR>` | `<Finance Ops>` |
| `<Adyen>`           | `<Balance report API>` | `<Daily 07:00>` | `<Prev. day 00:00 UTC>`             | `<Balance transaction>` | `<pspReference → charge_id>` | `<1200 PSP receivable>`     | `<Finance Ops>` |
| `<Safeguarding>`    | `<camt.053>`           | `<Daily 06:00>` | `<As bank>`                         | `<Balance>`             | `<Σ 2000+2010 vs 1050>`      | `<Safeguarding control>`    | `<Compliance>`  |
| `<Sub-ledger → GL>` | `<Journal export>`     | `<Monthly D+2>` | `<Period end>`                      | `<Account/period>`      | `<Control account totals>`   | `<All control accounts>`    | `<Controller>`  |

**Break owners and thresholds:** `<Every break gets a named owner at creation; unowned is not a state.
Investigation depth by materiality: <EUR 25 batch-resolved to 6900 under standing policy; ≥ EUR 25
investigated individually; ≥ EUR 5,000 same-day escalation. Ages and SLAs in the runbook.>`

## 7. Reporting contracts (M19, M20)

_One row per published figure. Every figure traces to postings, never to operational tables. A bad
answer is "revenue" with no basis — booked or settled, gross or net, which entity, which rate._

| Figure                    | Source postings              | Basis                                  | Currency                 | Audience      | Cadence          | Labelled as             |
| ------------------------- | ---------------------------- | -------------------------------------- | ------------------------ | ------------- | ---------------- | ----------------------- |
| `<Net revenue>`           | `<4000 + 4100, less contra>` | `<Accrual, net of refunds, excl. VAT>` | `<EUR, functional>`      | `<Board>`     | `<Monthly, D+5>` | `<Actual, hard-closed>` |
| `<Cost of payments>`      | `<5000–5030>`                | `<Accrual, gross>`                     | `<EUR>`                  | `<Finance>`   | `<Monthly>`      | `<Actual>`              |
| `<Customer funds held>`   | `<Σ 2000 + 2010>`            | `<Point-in-time, booked>`              | `<Per currency, no sum>` | `<Regulator>` | `<Daily>`        | `<Actual, T-1>`         |
| `<Wallet balance in app>` | `<Σ 2000 by account_id>`     | `<Available, excl. reserved>`          | `<Wallet currency>`      | `<Customer>`  | `<Real time>`    | `<Available now>`       |

## 8. Regulatory perimeter and data retention

| Data class          | Examples                                | Where it may live                        | Where it must never appear                  | Retention                       |
| ------------------- | --------------------------------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------- |
| `<Cardholder data>` | `<PAN, CVV>`                            | `<Nowhere — hosted fields at PSP>`       | `<Logs, traces, analytics, fixtures (M15)>` | `<n/a>`                         |
| `<Payment tokens>`  | `<PSP token>`                           | `<Encrypted column, scoped to customer>` | `<Logs, analytics>`                         | `<Life of mandate + 13 months>` |
| `<Postings>`        | `<Journal lines>`                       | `<Append-only ledger store>`             | `<—>`                                       | `<10 years (M14)>`              |
| `<Audit trail>`     | `<Actor, action, amount, key, outcome>` | `<Append-only, queryable>`               | `<—>`                                       | `<10 years>`                    |
| `<KYC evidence>`    | `<ID documents>`                        | `<Restricted store>`                     | `<Support tooling>`                         | `<5 years post-relationship>`   |

**Residency:** `<All money data in EU regions; no replica outside the EEA.>`

## 9. Invariant acceptance (M1–M20)

_The reviewer's table. Status is `met`, `waived` or `N/A` — nothing else. `met` requires evidence you
can open: a test name, a script run, a constraint, a config file, a signed document. "Yes" is not
evidence, and a waiver needs a rationale and an owner, not a shrug._

| Invariant                                                                              | Status               | Evidence, or waiver rationale                                                                                 | Owner            |
| -------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- |
| M1 Ledger is source of truth; balances derived and reproducible                        | `<met>`              | `<test_rebuild_balances.py replays 30d and matches cache to the cent; nightly job compares>`                  | `<R. Okonkwo>`   |
| M2 Double entry; debits = credits per entry per currency                               | `<met>`              | `<DB constraint `entry_balanced`; audit_ledger.py clean on 2026-08 export>`                                   | `<R. Okonkwo>`   |
| M3 Postings immutable; corrections by reversal                                         | `<met>`              | `<No UPDATE/DELETE grant on `journal_line`; reversal-only API; audit_ledger.py mutation check>`               | `<R. Okonkwo>`   |
| M4 Amount = exact quantity + ISO 4217; never float                                     | `<met>`              | `<Money type; money_lint.py clean on src/; test_no_float_construction>`                                       | `<R. Okonkwo>`   |
| M5 Declared rounding policy at declared points; allocation preserves the total         | `<met>`              | `<§2 of this spec; property test test_allocate_sums_to_total>`                                                | `<M. Duarte>`    |
| M6 No implicit cross-currency arithmetic; conversion is a recorded event               | `<met>`              | `<Money.__add__ raises on currency mismatch; fx_conversion table with rate + source + ts>`                    | `<R. Okonkwo>`   |
| M7 Idempotency key on every mutating money operation, with a retention window          | `<met>`              | `<Key derivation table in POSTING-RULES; unique index; 24-month retention (§2)>`                              | `<R. Okonkwo>`   |
| M8 External money events at-least-once and forgeable: verify, dedupe, fail closed      | `<met>`              | `<Signature check rejects with 4xx — test_webhook_forged; dedupe on pspReference>`                            | `<R. Okonkwo>`   |
| M9 Reconcile against the external record on a schedule; breaks owned, aged, classified | `<met>`              | `<§6; runbook; recon_break table with NOT NULL owner>`                                                        | `<Finance Ops>`  |
| M10 Event/booking/period time; closed periods never change                             | `<met>`              | `<Period status table + posting trigger; test_post_to_closed_period_rejected>`                                | `<M. Duarte>`    |
| M11 Object-level authorization + separation of duties; automation never approves       | `<met>`              | `<§5.2 matrix; approval API rejects principal type `service`; quarterly access review>`                       | `<S. Whitfield>` |
| M12 Limits declared and enforced; breaches refused, never clamped                      | `<met>`              | `<§5.1; limits.yaml; test_limit_breach_refuses_no_partial>`                                                   | `<Finance Ops>`  |
| M13 Funds reserved atomically                                                          | `<met>`              | `<Reserve posting moves 2000 → 2010 in one transaction; test_concurrent_spend>`                               | `<R. Okonkwo>`   |
| M14 Auditable append-only trail, retained and queryable                                | `<met>`              | `<audit_log, WORM storage, 10-year retention, sample query runs in <5s>`                                      | `<R. Okonkwo>`   |
| M15 No PAN/CVV/credentials/tokens in logs, traces, analytics, fixtures                 | `<met>`              | `<money_lint.py PAN check clean; log redaction test; SAQ-A scope statement>`                                  | `<Security>`     |
| M16 Fees, taxes, FX spread, rounding residue are first-class postings                  | `<met>`              | `<POSTING-RULES rules FE-01, TX-01, FX-01, RD-01; no netting into principal>`                                 | `<M. Duarte>`    |
| M17 Derived state declares its consistency model and is verified against recomputation | `<met>`              | `<Balance cache: staleness ≤5s, nightly recompute diff alerts on any mismatch>`                               | `<R. Okonkwo>`   |
| M18 Money invariants are tested                                                        | `<met>`              | `<Property tests on allocation and FX; golden entries per rule; trial-balance assert in CI>`                  | `<R. Okonkwo>`   |
| M19 Reports come from the ledger, not operational tables                               | `<met>`              | `<§7; BI reads the postings view only; orders table has no revenue grant>`                                    | `<M. Duarte>`    |
| M20 Every number given to a human is labelled                                          | `<waived — partial>` | `<In-app balance is unlabelled by design (single currency, live). All reports labelled. Review <2026-12-01>>` | `<M. Duarte>`    |

## 10. Open questions and assumptions taken

_Anything unresolved, and anything you decided without authority. An assumption recorded here is a
decision the finance owner can overturn cheaply; an assumption left in the code is one they find
during the audit._

| #   | Question or assumption                                                                 | Type           | Impact if wrong                                      | Owner            | Due            |
| --- | -------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------- | ---------------- | -------------- |
| 1   | `<Chargeback provision rate assumed at 0.4% of card volume, from 6 months of history>` | `<Assumption>` | `<Under-provision; P&L surprise at close>`           | `<M. Duarte>`    | `<2026-10-15>` |
| 2   | `<Is the safeguarding reconciliation required intraday or is daily sufficient?>`       | `<Question>`   | `<Licence condition breach>`                         | `<Compliance>`   | `<2026-09-30>` |
| 3   | `<Assumed GBP wallets are out of scope for v1>`                                        | `<Assumption>` | `<Rework of the currency-per-account decision (§3)>` | `<S. Whitfield>` | `<2026-11-01>` |

## Sign-off

| Role              | Name             | Date           | Signature/ref |
| ----------------- | ---------------- | -------------- | ------------- |
| Engineering owner | `<R. Okonkwo>`   | `<2026-09-10>` | `<PR #482>`   |
| Finance owner     | `<M. Duarte>`    | `<>`           | `<>`          |
| Approver          | `<S. Whitfield>` | `<>`           | `<>`          |
