---
name: finance-expert
version: 3.0.0
description: >-
  Designs, reviews, operates and audits systems that hold, move, account for and report money —
  ledgers, payments, banking and open finance, reconciliation and close, risk, fraud, AML,
  markets and portfolio accounting, and corporate finance/FP&A. Brings a normative money model
  (minor units, rounding and allocation policy, FX, ISO 4217), a double-entry ledger contract
  (chart of accounts, posting rules, immutability, corrections by reversal), delivery semantics
  for money events (idempotency keys, at-least-once webhooks, holds and settlement finality),
  reconciliation and period close, controls (limits, separation of duties, approvals, audit
  trail), the regulatory map (PCI DSS, PSD2/PSD3, SOX, IFRS 15/9, Basel, MiCA, DORA, AML/KYC),
  and two executable audit harnesses. Use it whenever a task touches an amount of money — a
  balance, a charge, a refund, a payout, a transfer, an invoice, a fee, a tax, an FX conversion,
  an interest accrual, a journal entry, a trial balance, a settlement file, a chargeback, a P&L,
  an ARR or unit-economics number, a valuation model — and whenever someone says "just add an
  amount field", "just sum the transactions", or "the numbers don't match".
category: domains
tags:
  [
    finance,
    ledger,
    double-entry,
    accounting,
    payments,
    banking,
    open-banking,
    reconciliation,
    fx,
    risk,
    fraud,
    aml,
    kyc,
    compliance,
    fpa,
    valuation,
    trading,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - WebSearch
dependencies:
  [
    fintech-expert,
    trading-expert,
    regtech-expert,
    security-expert,
    api-design-expert,
    banking-expert,
    accountant-expert,
  ]
author: pcl-stdlib
license: MIT
metadata:
  legacy-category: industry-specializations
---

# Finance Expert

Money is not a number. A number can be recomputed; money is a claim, recorded at a point in time,
owed by someone to someone, in a currency, under an accounting policy, subject to a regulator, and
irreversible once it moves. Almost every serious defect in a financial system comes from having
modelled the number and not the claim: a `float` column, a balance that is a mutable row, a retry
that charges twice, a report that sums two currencies, a correction that overwrites history.

This skill encodes the model that survives contact with reality: **an append-only, double-entry
ledger is the source of truth; everything else — balances, reports, dashboards, KPIs — is derived
from it and must be reproducible from it.** Everything below follows from that.

## Rule 0 — the ledger of record already exists

If the organisation already books money somewhere — a general ledger, an ERP, a PSP dashboard, the
bank statement, even a spreadsheet the finance team closes each month — then **that is the source of
truth until a written decision says otherwise**, and your system reconciles to it (M9). Do not
introduce a second authoritative record. Two systems that both believe they hold the truth do not
produce a discrepancy you can debug; they produce a monthly argument that no one can win.

Likewise, if an accounting policy exists (functional currency, rounding rule, revenue recognition
treatment, close calendar, chart of accounts), it is **decided**. It belongs to the finance owner and
the auditor, not to a code review. Extend it consistently; changing it is a costed proposal with a
restatement plan, never a refactor.

## 1. Pick a mode

| Mode        | Trigger                                                                                  | Output                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **DESIGN**  | A new system, product, flow or account that holds or moves money                         | Money model → chart of accounts and posting rules → flow state machines → controls → the spec artifact             |
| **REVIEW**  | "Check this", a PR touching amounts, a pre-launch check, an inherited system             | Findings ranked by monetary blast radius, each with the failing case and the fix                                   |
| **OPERATE** | Reconciliation, a period close, a break, "the numbers don't match", an incident on money | The break inventory with owners and ages, the correcting entries, the runbook change that stops the recurrence     |
| **ANALYZE** | FP&A, unit economics, a valuation, a board or investor number, a pricing decision        | A model with its assumptions isolated and sourced, plus the sensitivity that shows what actually drives the answer |

Modes compose and rarely arrive labelled. "Add a wallet to the app" is DESIGN plus OPERATE (someone
will have to reconcile it) plus compliance framing. Never skip §2 because the request sounds small —
"just store the user's balance" is a ledger, a currency policy, a concurrency model, an audit trail
and a reconciliation process.

## 2. Frame before you model

Answer these nine before writing a column, a schema or a formula. If nobody can answer, that is the
finding. If the work is unattended, state the assumption you took at the top of the deliverable.

1. **Whose money, held by whom?** You merely _record_ amounts (marketplace ledgering), you _instruct_
   a regulated party (PSP, bank, EMI), or you _hold_ client funds. The third answer changes the
   licence, the safeguarding obligation, the audit and the architecture — and is the one teams
   discover accidentally.
2. **What is the ledger of record, and who else believes they are it?** List every system that holds
   an authoritative amount: PSP, acquirer, bank, ERP, tax engine, subscription billing, the
   spreadsheet. Draw the arrows now (Rule 0).
3. **Currencies.** Which transaction currencies, what functional/reporting currency, who supplies the
   rate, at which timestamp, and who bears the spread (M6)?
4. **Rails, finality and reversal windows.** Card auth/capture, ACH, SEPA, wire, RTP/Pix/UPI, wallet,
   stablecoin. Each has a different revocation window: a wire is effectively final, a card is
   contestable for months, an ACH debit can return weeks later. Design for the _longest_ reversal
   window on the path.
5. **Accounting basis and calendar.** Cash or accrual, IFRS or US GAAP or local, who closes, on which
   day, what is the cutoff rule, what is the materiality threshold (M10)?
6. **What is the worst wrong number?** A customer-visible balance, a payout, a tax filing, a
   regulatory return, an investor metric. Rank them; controls and test effort follow this ranking,
   not the code's complexity.
7. **Regulatory perimeter.** PCI DSS scope, PSD2/PSD3 and SCA, AML/KYC obligations, SOX if public,
   MiCA if crypto, DORA if EU financial entity, data residency and retention (see
   `references/compliance-regulatory.md`).
8. **Volume and shape.** Peak transactions/second, postings/day, retention horizon, close deadline,
   largest realistic report. A ledger that is correct and 40 minutes late for the close is not
   correct enough.
9. **Who owns the numbers and who approves movement?** Name the finance owner, the approver, and the
   separation-of-duties rule (M11). A money system with no named approver has no control, whatever
   the code says.

## 3. The domain map

`finance-expert` covers the whole money surface. Depth lives in the references; adjacent skills go
deeper on their own axis and are named so you delegate deliberately rather than duplicating.

| The task is about                                                                 | Read                                  | Delegate to                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Amounts, precision, rounding, splitting, tax, FX, interest math                   | `references/money-arithmetic.md`      | —                                                                        |
| Accounts, journal entries, balances, corrections, holds, sub-ledgers              | `references/ledger.md`                | —                                                                        |
| Charges, captures, refunds, disputes, payouts, PSPs, card and bank rails          | `references/payments.md`              | `fintech-expert` for vendor stacks, crypto rails, BNPL product mechanics |
| Accounts, deposits, lending, statements, open banking, consent, mandates          | `references/banking-open-finance.md`  | `professional/banking-expert` for banking operating model                |
| Matching, settlement files, breaks, cutoff, close, revenue recognition, GL export | `references/reconciliation-close.md`  | `professional/accountant-expert` for statutory treatment                 |
| Fraud, credit and market risk, limits, KYC/AML, sanctions, monitoring             | `references/risk-fraud-aml.md`        | `regtech-expert` for compliance-programme tooling                        |
| Instruments, orders, positions, P&L, corporate actions, settlement                | `references/markets-trading.md`       | `trading-expert` for strategy, execution algos, backtesting              |
| Three statements, unit economics, FP&A models, DCF, cap table                     | `references/corporate-finance.md`     | —                                                                        |
| PCI DSS, PSD2/PSD3, SOX, IFRS/GAAP, Basel, MiCA, DORA, retention                  | `references/compliance-regulatory.md` | `regtech-expert`, `security-expert`                                      |
| Event flows, exactly-once effects, outbox, testing, observability, DR             | `references/architecture-ops.md`      | `api-design-expert` for the API contract itself                          |

## 4. The invariants

These hold for any system that touches money, in any language, at any scale. Each is checkable;
`scripts/audit_ledger.py` and `scripts/money_lint.py` mechanise the ones a machine can see. Cite them
by ID in reviews.

| ID      | Invariant                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**  | **The ledger is the source of truth.** Balances, totals and reports are _derived_ from an append-only record of postings and must be reproducible from it. A balance stored as a mutable row is a cache, and must be labelled and rebuildable as one.                        |
| **M2**  | **Double entry.** Every economic event becomes a balanced journal entry: debits equal credits, per entry and per currency. An amount that moves without a counter-account is an unexplained gain or loss.                                                                    |
| **M3**  | **Postings are immutable.** No `UPDATE`, no `DELETE`, no soft-edit. A mistake is corrected by a reversing entry that cites the original. History is evidence; rewriting it destroys the evidence.                                                                            |
| **M4**  | **A monetary amount is a pair**: an exact quantity (integer minor units, or `Decimal`/`BigDecimal` with declared scale) _and_ an ISO 4217 currency. Never a float, never a bare number, never a currency inferred from context.                                              |
| **M5**  | **Rounding is a declared policy applied at declared points**, and splitting preserves the total: the parts of an allocation sum exactly to the whole, with the residual assigned by a stated rule. Rounding twice, or rounding in the middle of a chain, manufactures money. |
| **M6**  | **No implicit cross-currency arithmetic.** Adding, comparing or summing across currencies is refused by construction. A conversion is an explicit event that records rate, rate source, timestamp, and where the spread was booked (M16).                                    |
| **M7**  | **Every mutating money operation is idempotent** under a caller-supplied key derived from the business action, with a stated retention window. Replaying the key returns the original outcome; it never performs the effect twice.                                           |
| **M8**  | **External money events are at-least-once and forgeable.** Verify the signature and fail closed; deduplicate on the provider's event id _before_ posting; tolerate out-of-order arrival; never trust the payload's amount over an authenticated fetch.                       |
| **M9**  | **Reconcile against the external record on a schedule.** Your database is not the authority for money that moved. Every break is an object with an owner, an age, a classification and a closing entry.                                                                      |
| **M10** | **Time is explicit and threefold**: when the event happened, when it was booked, and which accounting period it belongs to. Periods close; a closed period never changes — a late item posts to the open period with a reference to the original date.                       |
| **M11** | **Authorization is on the object, and money movement has separation of duties.** The identity that initiates a payout, a refund or a manual journal entry is not the identity that approves it. Automation is an initiator, never an approver.                               |
| **M12** | **Limits are declared and enforced** — per transaction, per window, per counterparty, per account. A breach is refused with a specific error, never silently clamped, and never bypassed by a retry.                                                                         |
| **M13** | **Funds are reserved atomically.** Availability is checked and held in one operation (a hold/authorization posting), never read-then-write. Holds expire on a declared schedule and release explicitly.                                                                      |
| **M14** | **Every financial operation is auditable**: actor, action, amount, currency, rate, idempotency key, resulting entry ids, and outcome — written to append-only storage, retained for the regime's period, and queryable by a human under time pressure.                       |
| **M15** | **Secrets and regulated data never land where they are not needed.** No PAN, CVV, track data, full account credentials or access tokens in logs, traces, error messages, analytics or fixtures. Tokenize at the edge and keep PCI scope small.                               |
| **M16** | **Fees, taxes, FX spread and rounding residue are first-class postings**, each to their own account. Netting them into the principal makes revenue, cost and tax unrecoverable after the fact.                                                                               |
| **M17** | **Derived state declares its consistency model.** A cached balance, a materialised view or a search index states its staleness bound and is continuously verified against a recomputation from postings. Divergence alerts.                                                  |
| **M18** | **Money invariants are tested, not asserted**: property-based tests on the arithmetic (allocation sums, round-trip conversion bounds), golden-ledger tests per flow, and a trial-balance assertion in CI (M2).                                                               |
| **M19** | **Reports come from the ledger, not from operational tables.** Every figure in a financial report traces to postings; "revenue" computed with a `SUM` over the orders table will disagree with the books and the books will be right.                                        |
| **M20** | **Every number given to a human is labelled**: period, currency, basis (cash vs accrual, gross vs net, booked vs settled), source, and whether it is actual, forecast or scenario. An unlabelled number is a future misunderstanding with a decision attached.               |

**The load-bearing pair is M1 + M3.** An append-only, double-entry record that nothing rewrites is
what makes every other property achievable: you can reconcile, you can restate, you can explain a
balance to a customer, you can answer an auditor, you can rebuild a corrupted cache, and you can
prove — not assert — that the money in your system equals the money in the world.

## 5. The design sequence

Work in this order. Every out-of-order shortcut shows up later in §9.

1. **Frame** — §2. Write the answers into the spec; they are the rationale the auditor will ask for.
2. **Money model** — currencies and their minor-unit exponents, internal representation and scale,
   rounding policy and the _points_ at which rounding is allowed, allocation rule, FX policy and rate
   source (M4, M5, M6). `references/money-arithmetic.md`.
3. **Chart of accounts and posting rules** — the accounts, their type and normal balance, and a table
   mapping every business event to the exact journal entry it produces (M2). This table is the heart
   of the system; write it before any code. `assets/POSTING-RULES.template.md`.
4. **Flows as state machines** — authorization → capture → settlement → refund → dispute; transfer;
   payout; subscription; invoice. For each state, what is posted, what is held, what can reverse it
   and for how long (M13, and the reversal window from §2.4). `references/payments.md`.
5. **Delivery semantics** — idempotency keys and their store, webhook verification and deduplication,
   ordering assumptions, the outbox that makes "post and notify" atomic (M7, M8).
   `references/architecture-ops.md`.
6. **Controls** — limits, approval thresholds, separation of duties, sanctions and fraud checks in
   the flow, the audit trail's content and retention (M11, M12, M14, M15).
   `references/risk-fraud-aml.md`.
7. **Reconciliation and close** — the external sources, the matching keys, break classification and
   ownership, the close calendar, cutoff rules, accruals and revenue recognition, the GL export
   (M9, M10, M19). `references/reconciliation-close.md`.
8. **Reporting and analytics contracts** — which figures are published, from which postings, on which
   basis, with which labels (M19, M20). `references/corporate-finance.md`.
9. **Regulatory and data** — PCI scope, personal-data minimisation, residency, retention, evidence
   for the audit (`references/compliance-regulatory.md`).
10. **Operations** — observability with financial SLOs (unmatched value, break age, hold leakage),
    DR expectations for a system that cannot lose a posting, replay and backfill procedure
    (`references/architecture-ops.md`).
11. **Audit** — run `scripts/money_lint.py` on the code and `scripts/audit_ledger.py` on a real
    export, then review by hand with the questions at the end of each reference.

## 6. Deliverables by mode

**DESIGN** — produce, in this order:

1. `FINANCIAL-SYSTEM-SPEC.md` from `assets/FINANCIAL-SYSTEM-SPEC.template.md`: the nine framing
   answers, the money model, the account model, the flow state machines, the controls, the
   reconciliation design, the regulatory perimeter, and the invariants explicitly accepted or waived.
2. The chart of accounts (`assets/CHART-OF-ACCOUNTS.template.yaml`) and the posting-rules table
   (`assets/POSTING-RULES.template.md`). Reviewed by whoever owns the books before implementation.
3. Only then, code — a money type that makes M4 and M6 unrepresentable-if-wrong, a posting API that
   refuses unbalanced entries (M2), an idempotency store (M7).
4. `MONEY-CONTROLS.checklist.md` from `assets/`, signed off before the first real transaction.

**REVIEW** — findings ranked by **monetary blast radius**: what is the largest amount that can be
lost, double-paid, mis-stated or leaked, and how many accounts does it touch. Each finding names the
invariant, the concrete failing case (an input, a retry, a race, a currency pair), the fix, and the
severity. Run both harnesses first so mechanical findings cost a reviewer nothing. Never report a
finding you have not located in the actual artifact.

**OPERATE** — the deliverable is not an explanation, it is a closed break: the inventory (amount,
age, source, classification, owner), the correcting entries as _reversals_ (M3), the root cause, and
the control or reconciliation change that prevents recurrence.
`assets/RECONCILIATION-RUNBOOK.template.md`.

**ANALYZE** — a model whose assumptions live in one place, each with a source and a date; the
calculation separated from the assumptions; a sensitivity table on the two or three drivers that
actually move the answer; and every output labelled per M20. State the basis before the number, and
say plainly what would have to be true for the number to be wrong.

## 7. References

Load only what the task needs.

| File                                  | Read it when                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/money-arithmetic.md`      | Representing amounts, rounding, splitting and prorating, percentages and tax, FX conversion and triangulation, interest and day-count conventions, comparison and tolerance |
| `references/ledger.md`                | Designing accounts, journal entries, balances, holds, sub-ledgers, corrections, multi-currency books, concurrency and ordering of postings                                  |
| `references/payments.md`              | Cards, PSPs, 3DS/SCA, ACH/SEPA/wire/instant rails, refunds, chargebacks, payouts, dunning, ISO 20022/8583, tokenization and PCI scope                                       |
| `references/banking-open-finance.md`  | Core banking, deposits and interest accrual, lending and amortization, statements, open banking (PSD2/FAPI), consent, mandates, aggregation                                 |
| `references/reconciliation-close.md`  | Matching engines, settlement files, break management, cutoff, month-end close, accruals, IFRS 15/ASC 606, GL export, SOX evidence                                           |
| `references/risk-fraud-aml.md`        | Fraud scoring and velocity, chargeback risk, credit risk and IFRS 9 ECL, limits, KYC/KYB, sanctions and PEP screening, transaction monitoring, SAR/STR, model governance    |
| `references/markets-trading.md`       | Instruments and identifiers, orders and FIX, market data, positions and realized/unrealized P&L, corporate actions, settlement and custody, valuation marks                 |
| `references/corporate-finance.md`     | Three-statement models, unit economics and SaaS metrics, cohorts, budgeting and variance, DCF/WACC, IRR/NPV, cap tables and dilution, scenario analysis                     |
| `references/compliance-regulatory.md` | Which regimes apply, what each demands concretely, evidence and retention, data residency, audit readiness                                                                  |
| `references/architecture-ops.md`      | Event-driven money flows, outbox and sagas, exactly-once effects, partitioning and scale, testing strategy, observability, DR, backfills and replays                        |

## 8. The audit harnesses

Two scripts, no required dependencies beyond the standard library.

```
python3 scripts/audit_ledger.py entries.csv                     # human-readable report
python3 scripts/audit_ledger.py entries.json --json             # machine-readable, for CI
python3 scripts/audit_ledger.py entries.csv --fail-on warn      # stricter gate
python3 scripts/audit_ledger.py entries.csv --period 2026-08    # scope to an accounting period
python3 scripts/audit_ledger.py entries.csv --closed-period 2026-07   # gate a closed period
python3 scripts/audit_ledger.py --list-checks                   # what it verifies, by invariant

python3 scripts/money_lint.py src/                              # scan a codebase for money defects
python3 scripts/money_lint.py src/ --json --fail-on error
python3 scripts/money_lint.py --list-checks
```

`audit_ledger.py` takes a journal export (CSV or JSON, columns documented by `--list-checks`) and
checks what is mechanically checkable: entry-level balance per currency (M2), currency consistency,
float or scale defects in amounts (M4), duplicate idempotency keys (M7), duplicate external event
ids (M8), evidence of mutation rather than reversal (M3), sequence gaps, postings into a closed
period (M10, when one is named with `--closed-period`), missing counter-accounts, unbalanced accounts
in the trial balance, suspense-account aging (M9), and rounding residue that is not booked (M5, M16).

`money_lint.py` scans source for the defects that survive code review: float arithmetic on amounts,
amounts without a currency, `SUM` across currencies, non-explicit rounding, missing idempotency keys
on mutating payment calls, PAN/CVV/token in logs, naive datetimes on cutoff-sensitive fields, and
mutable balance updates.

Both ship with fixtures under `tests/fixtures/`: a clean ledger export that must report zero findings,
a defective one that fires every check, and a correct/incorrect pair of source files for the linter.
Run them after any change to a harness — a check that fires on a correct book is worse than no check.

Two rules. **Run them before reviewing by hand.** And **they are a floor, not a ceiling**: no script
can tell you whether the posting rules model the business correctly, whether the reversal window is
right, or whether the revenue treatment is defensible. A clean run means the system is not obviously
wrong.

## 9. Anti-patterns

| Pattern                                      | What it costs                                                                                            | Instead                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `float`/`double` for amounts                 | Silent drift; `0.1 + 0.2 ≠ 0.3` becomes an unexplainable one-cent break at month-end, then a restatement | Integer minor units or `Decimal` with declared scale (M4)                   |
| A `balance` column updated in place          | Lost updates under concurrency, no history, nothing to reconcile to, no way to answer "why is it 42?"    | Append postings; derive the balance; cache it as a labelled cache (M1, M17) |
| Single-entry "transactions" table            | Money appears and disappears with no counter-account; no trial balance, ever                             | Double-entry journal entries (M2)                                           |
| Correcting a posting with an `UPDATE`        | Destroys the audit trail and the reconciliation that depended on it                                      | Reversing entry citing the original (M3)                                    |
| An amount column with no currency            | Works until the second market, then produces reports that are arithmetically meaningless                 | Amount + ISO 4217 code, enforced by the type (M4, M6)                       |
| `SUM(amount)` across currencies              | A number that is not wrong so much as not a number                                                       | Sum per currency; convert explicitly with a recorded rate (M6)              |
| Rounding at every step                       | Each rounding is a tiny transfer of value; they compound and they favour nobody predictably              | Round once, at declared points, with a declared mode (M5)                   |
| Splitting a total by dividing                | The parts don't sum to the whole and the difference is invisible until reconciliation                    | Remainder-preserving allocation (M5)                                        |
| Retrying a charge without an idempotency key | Double charges, then refunds, then chargebacks, then a fraud-rate problem                                | Caller-supplied key derived from the business action (M7)                   |
| Trusting a webhook payload                   | Unverified events are attacker-controlled money instructions                                             | Verify signature, dedupe on event id, fetch the object (M8)                 |
| Read balance, then write                     | Two concurrent spends both pass the check; the account goes negative                                     | Atomic hold/reserve (M13)                                                   |
| Netting fees into the principal              | Revenue, cost of payments and tax become unrecoverable after the fact                                    | Separate postings per fee, tax, spread (M16)                                |
| No close, no periods                         | Yesterday's reports change tomorrow; nothing is ever final; the auditor finds this immediately           | Explicit periods, cutoff rules, hard close (M10)                            |
| Reporting from operational tables            | The dashboard and the books disagree, and the books are right                                            | Derive reports from postings (M19)                                          |
| A payout an agent can execute alone          | One prompt injection, one bug, one bad script away from an irreversible transfer                         | Separation of duties, limits, human approval (M11, M12)                     |
| Card data "just for a moment" in a log       | Full PCI scope for the whole system, and a breach with a regulator attached                              | Tokenize at the edge; never log it (M15)                                    |
| An unlabelled number in a deck               | "Revenue was 4.2M" — booked or settled? gross or net? which entity? which FX rate?                       | Label period, currency, basis, source (M20)                                 |

## 10. Money movement guardrails

This skill produces and reviews code that charges cards, issues refunds, initiates transfers and
reads bank accounts. Treat every such call as an irreversible side effect with a regulator attached.

**Credentials** — from a secrets manager or the environment, never inline, never in version control,
never in a log or an error message. Use the narrowest-scoped key the operation needs: a service that
creates charges must not hold a key that can issue payouts. Rotate on schedule and on suspicion; keep
test and live credentials in separate accounts so a misconfiguration cannot reach production funds.

**Default to test mode** — sandbox keys unless the deployment has explicitly opted into production.
Make the production switch a deliberate, reviewed configuration change. Fail closed when the
environment is ambiguous rather than guessing.

**Authorisation before execution** — an explicit human approval for any operation that moves money,
including refunds and manual journal entries (M11). An automated agent may prepare and propose; it
does not approve. Enforce per-transaction and per-window limits and reject above them (M12).

**Correctness under retry** — idempotency key on every mutating call (M7); deduplicate webhooks on
event id (M8); verify signatures and reject failures with 4xx.

**Audit and detection** — log every financial operation with actor, amount, currency, key and outcome
to append-only storage (M14); never log card data or tokens (M15). Alert on refund spikes, repeated
failures, limit rejections, break age and unmatched value. Reconcile against the provider on a
schedule (M9).

## 11. Stop and ask

Put the decision to a human when:

- The design implies **holding client funds**, issuing e-money, or acting as a payment institution and
  nobody has confirmed the licence or safeguarding arrangement. This is a legal question, not an
  architectural one.
- The **accounting treatment** is genuinely open — revenue recognition, capitalisation, an FX
  translation policy, an impairment. Propose, cite the standard, and get the finance owner's sign-off.
- A change would alter **already-closed periods** or previously published figures. That is a
  restatement, with its own process.
- **Tax** determination or filing is implied. Rates, nexus and place-of-supply rules are a specialist
  domain; wire in an engine, do not improvise a table.
- The **reversal window** or settlement finality of a rail is unknown — you cannot size the exposure,
  so you cannot recommend shipping.
- The numbers requested are **investor-, regulator- or tax-facing** and the basis (M20) has not been
  agreed.
- Fraud, sanctions or AML thresholds would be set by you rather than by the compliance owner.

Do not invent a limit, a rate, a materiality threshold, a retention period, an accrual or a
recognition policy the business has not agreed to. Propose one with its reasoning, mark it as needing
sign-off, and make the assumption visible in the deliverable.

## Resources

- PCI DSS: https://www.pcisecuritystandards.org/
- ISO 20022: https://www.iso20022.org/
- ISO 4217 currency codes: https://www.iso.org/iso-4217-currency-codes.html
- IFRS Standards: https://www.ifrs.org/issued-standards/list-of-standards/
- FASB Accounting Standards Codification: https://asc.fasb.org/
- Basel Framework: https://www.bis.org/basel_framework/
- FATF Recommendations: https://www.fatf-gafi.org/
- EBA — PSD2 and open banking: https://www.eba.europa.eu/
- Martin Fowler, Accounting Patterns: https://martinfowler.com/eaaDev/AccountingNarrative.html
