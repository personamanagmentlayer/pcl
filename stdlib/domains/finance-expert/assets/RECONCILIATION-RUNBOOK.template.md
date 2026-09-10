# Reconciliation runbook — `<Acme Wallet>`

> Copy to `runbooks/RECONCILIATION.md`. This is an **operational** document: someone follows it at
> 08:00 without reading the design docs first. Keep it executable — every step names a command, a
> screen or a query, and every stop condition names who to call.
>
> The preparer runs it. A **reviewer who is not the preparer signs it** (M11). Both signatures are
> part of the run record, not an email.

## 1. Scope and sources

_One row per external record you reconcile against. If a source is not in this table, nothing is
checking it, and "the numbers don't match" will one day start there. Your database is not the
authority for money that moved (M9)._

| Source                                        | Feed                     | Cadence                  | Cutoff                            | Grain                           | Identifier                  | Reconciles                                                                                   | Owner           |
| --------------------------------------------- | ------------------------ | ------------------------ | --------------------------------- | ------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- | --------------- |
| `<Bank — EUR>`                                | `<camt.053, SFTP 05:30>` | `<Daily, business days>` | `<Prev. day 23:59 Europe/Dublin>` | `<Entry>`                       | `<EndToEndId, AcctSvcrRef>` | `<1000 Cash at bank — EUR>`                                                                  | `<Finance Ops>` |
| `<Bank — safeguarding, one row per currency>` | `<camt.053, SFTP 05:30>` | `<Daily>`                | `<As above>`                      | `<Balance + entries>`           | `<EndToEndId>`              | `<1050 vs Σ(2000+2010) in EUR; 1051 vs GBP; 1052 vs USD — per currency, never a total (M6)>` | `<Compliance>`  |
| `<Adyen>`                                     | `<Balance report API>`   | `<Daily 06:30>`          | `<Prev. day 00:00 UTC>`           | `<Balance transaction>`         | `<pspReference, payoutId>`  | `<1200 PSP receivable>`                                                                      | `<Finance Ops>` |
| `<Adyen disputes>`                            | `<Dispute report API>`   | `<Daily>`                | `<Prev. day 00:00 UTC>`           | `<Dispute event>`               | `<disputeId, pspReference>` | `<2350, 5100, 5110>`                                                                         | `<Risk>`        |
| `<Payout returns>`                            | `<pain.002 / camt.054>`  | `<On arrival>`           | `<n/a>`                           | `<Return item>`                 | `<Original EndToEndId>`     | `<1510 Payouts in transit>`                                                                  | `<Finance Ops>` |
| `<Sub-ledger → GL>`                           | `<Journal export>`       | `<Monthly, D+2>`         | `<Period end>`                    | `<Account × period × currency>` | `<Control account>`         | `<All control accounts>`                                                                     | `<Controller>`  |

**Two things this table must survive:** the source's own cutoff window is _theirs_, not yours (a
"daily" file covers 00:00–00:00 in their timezone and overlaps two of your days), and a weekend file
that is absent is normal while a business-day file that is absent is an incident.

## 2. Daily procedure

_Start 08:00. Expected total ~90 minutes with a normal break inventory. Durations are for judging
whether something is wrong, not for hurrying. Each **STOP** condition means: do not continue the run,
escalate per §6, and record why in the run record._

| #   | Step                 | How                                                                                                                                                                                                                | Time      | STOP and escalate if                                                                                                                                                                                     |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Confirm arrival      | `<recon files status --date=T-1>` against the expected-file calendar                                                                                                                                               | 5 min     | A business-day file is missing, or a file arrived with a name already ingested                                                                                                                           |
| 2   | Verify integrity     | Check content hash, statement sequence numbers, opening balance = prior closing                                                                                                                                    | 5 min     | A **sequence gap** or a broken balance chain — you are reconciling an incomplete world                                                                                                                   |
| 3   | Ingest               | `<recon ingest --date=T-1>` — immutable, versioned, never overwriting a prior version                                                                                                                              | 10 min    | Ingest reports a restated file under an existing version                                                                                                                                                 |
| 4   | Classify rows        | Every external row gets a type (charge, refund, fee, dispute, payout, adjustment)                                                                                                                                  | automated | **Any row is unclassified.** Never sum a file you have not classified — that is how fee rows become revenue                                                                                              |
| 5   | Match                | `<recon match --date=T-1>` — passes run in the order in §3, strongest evidence first                                                                                                                               | 15 min    | A heuristic pass consumed items a deterministic pass should have matched (pass-order regression)                                                                                                         |
| 6   | Check the match rate | Compare auto-match by **value** and by count to the 30-day baseline                                                                                                                                                | 5 min     | Auto-match by value drops more than `<5pp>` — something changed upstream, and matching quietly on the new shape is worse than stopping                                                                   |
| 7   | Triage new breaks    | Classify per §4, assign a named owner, set materiality                                                                                                                                                             | 30 min    | A single break exceeds `<EUR 5,000>`, or any break is classified **Duplicate** (a customer may have been charged twice)                                                                                  |
| 8   | Prepare corrections  | Draft the correcting entries; submit for approval per §4                                                                                                                                                           | varies    | An entry would post to a closed period, or would plug a principal account                                                                                                                                |
| 9   | Control totals       | For **each** currency separately: Σ(2000 + 2010) in that currency = the safeguarding account for that currency (`1050` EUR / `1051` GBP / `1052` USD), on confirmed balances; sub-ledger totals = control balances | 5 min     | **Any** difference on any currency's safeguarding check — this is a licence-condition control, not a report. A combined total that ties while a single currency does not is a pass you did not earn (M6) |
| 10  | Publish              | Run record, break inventory, aging report to `<#finance-ops>` and the evidence store                                                                                                                               | 5 min     | —                                                                                                                                                                                                        |
| 11  | Sign off             | Preparer signs; reviewer (not the preparer) reviews and signs (M11)                                                                                                                                                | 10 min    | No reviewer available — the run is not complete until it is signed                                                                                                                                       |

## 3. Matching configuration

_Keys, tolerances and pass order are **declared configuration owned by finance**, versioned in git —
not constants in the matching code. A rule that auto-matches on weak evidence books wrong money
quietly, which is worse than a break._

| #   | Pass                 | Key                                           | Cardinality | Tolerance          | Auto-match                       | Notes                                                       |
| --- | -------------------- | --------------------------------------------- | ----------- | ------------------ | -------------------------------- | ----------------------------------------------------------- |
| 1   | External id          | `<pspReference = charge.psp_ref>`             | 1:1         | `<none>`           | `<yes>`                          | Strongest evidence; always first                            |
| 2   | Propagated reference | `<EndToEndId = payout.reference>`             | 1:1         | `<none>`           | `<yes>`                          | Depends on the reference surviving the rail intact          |
| 3   | Payout expansion     | `<payoutId → composing balance transactions>` | 1:N         | `<exact>`          | `<yes>`                          | Use the **provider's own grouping**; never free-form search |
| 4   | Composite exact      | `<(amount, currency, counterparty, date ±0)>` | 1:1         | `<none>`           | `<yes>`                          |                                                             |
| 5   | Amount + window      | `<(amount, currency) within ±2 days>`         | 1:1         | `<none>`           | `<only if unique on both sides>` |                                                             |
| 6   | Sum-to-one           | `<Σ our items = one of their lines>`          | N:1         | `<±1 minor unit>`  | `<yes, capped at EUR 50/day>`    | Residue books to 6900                                       |
| 7   | FX-adjusted          | `<(amount ± rate precision, currency pair)>`  | 1:1         | `<±2 minor units>` | `<review>`                       | Difference books to 4200 realised FX                        |
| 8   | Fuzzy counterparty   | `<normalised name/IBAN similarity ≥ 0.9>`     | 1:1         | `<±1 minor unit>`  | `<no — suggest only>`            | Never auto                                                  |

**Tolerances.** Record consumption in money, per rule, per day (§9), and **widen one only with the same
approval as a write-off** (§7). See `references/reconciliation-close.md` §4.4 for which tolerances are
legitimate and how to tell a tolerance from a bug in disguise.

## 4. Break classification

_Classify every break at triage. An unclassified break is an unowned break, and unowned breaks age
into write-offs. The correcting entry is always a new entry or a reversal — never an edit (M3) — and
it never plugs the principal account to make cash agree. **See `references/reconciliation-close.md` §5
for why each break type arises**; this table is what you fill in and act on at 08:00. `1000` below is
the cash account for the statement's own currency — `1000` EUR, `1001` GBP, `1002` USD._

| Type                                  | Investigate by                                                                                                                           | Correcting entry                                                                                                                                                                                                                                                                                                                                                                                                                                         | Approver                                                                     | Site SLA                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| **Timing / in-transit**               | Check the item exists on both sides in different periods; check the in-transit balance clears within the rail SLA                        | None at item level — `1500`/`1510` carry it                                                                                                                                                                                                                                                                                                                                                                                                              | None (expected)                                                              | `<Clears within the rail SLA>`    |
| **Missing in ours**                   | Fetch the object from the provider by id; check the ingest log for a gap; read the statement line to see **which way the money went**    | Book from the external evidence in the open period, citing the event date (M10). **Receipt** (interest, inbound credit, refund returned): `Dr 1000 / Cr <the income or liability it belongs to>` — e.g. `Dr 1000 / Cr 4300 Interest income`. **Payment** (bank fee, outbound debit): `Dr <the expense or asset it belongs to> / Cr 1000` — e.g. `Dr 6000 Bank charges / Cr 1000`. Getting the direction from the cause, not from habit, is the whole job | `<Finance Ops>`; Controller above `<EUR 5,000>`                              | `<Same day>`                      |
| **Missing in theirs**                 | Search the provider by _your_ reference; check the outbox and the `unknown` queue                                                        | If genuinely not sent: **reverse** the original (M3) and re-instruct under a **new** idempotency key. If in flight: reclassify as timing                                                                                                                                                                                                                                                                                                                 | `<Finance Ops>`                                                              | `<Same day>`                      |
| **Amount mismatch**                   | Recompute from the fee schedule and the rate; the delta should be reproducible                                                           | Book the delta to its true account — fee, FX, receivable — **never** plug the principal (M16)                                                                                                                                                                                                                                                                                                                                                            | `<Finance Ops>`                                                              | `<2 business days>`               |
| **Duplicate**                         | Compare idempotency keys and provider event ids on both entries                                                                          | Reverse the duplicate in full, citing the original (M3)                                                                                                                                                                                                                                                                                                                                                                                                  | `<Controller>` — **always escalate**: a customer may have been charged twice | `<Immediate>`                     |
| **FX difference**                     | Recompute at both timestamps; isolate spread from rate movement                                                                          | `Dr/Cr 4200 FX gain/(loss) — realised`; provider spread to `5200` (M6, M16)                                                                                                                                                                                                                                                                                                                                                                              | `<Finance Ops>`                                                              | `<2 business days>`               |
| **Fee not booked**                    | Diff the file's fee types against the classifier's known set                                                                             | `Dr 5000/5010/5020 / Cr 1200 or 1500`                                                                                                                                                                                                                                                                                                                                                                                                                    | `<Finance Ops>`                                                              | `<Same day>`                      |
| **Rounding residue**                  | Confirm bounded and not volume-scaling                                                                                                   | `Dr/Cr 6900 Rounding difference`                                                                                                                                                                                                                                                                                                                                                                                                                         | Auto under `<EUR 25>` standing policy                                        | `<Batch, weekly>`                 |
| **Wrong account**                     | Trace the mapping config version in force at event time                                                                                  | Reclassification entry, both legs explicit                                                                                                                                                                                                                                                                                                                                                                                                               | `<Controller>`                                                               | `<Same day>`                      |
| **Chargeback / return not reflected** | Pull the dispute or return record by id                                                                                                  | Per CB-01 / CB-01b / CB-01c / PO-03 in `POSTING-RULES.md`; the provision is consumed by CB-03 only where CB-01c recognised a loss                                                                                                                                                                                                                                                                                                                        | `<Risk>`                                                                     | `<Same day>`                      |
| **Unidentified receipt**              | Work the identification queue; contact the payer                                                                                         | `Dr 1000 / Cr 2400 Unapplied receipts` — **never revenue**                                                                                                                                                                                                                                                                                                                                                                                               | `<Finance Ops>`                                                              | `<Identify within 5 days>`        |
| **Provider adjustment**               | Read the adjustment description; ask the provider                                                                                        | Book to the account the description names; else park it via `SU-01` in `1900 Suspense`, with an owner, an age and a break id                                                                                                                                                                                                                                                                                                                             | `<Controller>`                                                               | `<5 business days>`               |
| **Safeguarding shortfall**            | Compare the confirmed `105x` balance for **one** currency against `Σ(2000 + 2010)` in that currency; check SG-01/SG-02 ran and confirmed | Run the missing sweep (`SG-01` to top up, `SG-02` to release only genuine excess). A shortfall is **never** corrected by a ledger adjustment                                                                                                                                                                                                                                                                                                             | `<Compliance + CFO>`                                                         | `<Immediate — licence condition>` |

## 5. Aging and SLA

_Report **gross** exposure (`Σ|amount|`), never net. The buckets are the reference's — see
`references/reconciliation-close.md` §6 for what each one means and why netting hides a missing
customer. What is site-specific, and what you fill in here, is the deliverable, the named owner and
who it escalates to._

| Age        | SLA — what must exist by the end of the bucket               | Owner                     | Escalates to                                    |
| ---------- | ------------------------------------------------------------ | ------------------------- | ----------------------------------------------- |
| 0–2 days   | Classified and owned within 1 business day                   | `<Recon analyst on rota>` | —                                               |
| 3–7 days   | A written explanation recorded on the break record           | `<Recon analyst on rota>` | `<Team lead>`; on the daily standup list        |
| 8–30 days  | Written root cause and a target close date                   | `<Finance manager>`       | `<Controller>`; goes on the close blockers list |
| 31–90 days | Remediation ticket raised, scheduled and linked to the break | `<Controller>`            | `<Named engineering owner>`                     |
| 90+ days   | Write-off proposal (§7) or a documented reason to stay open  | `<Controller>`            | `<CFO>`; disclosed at close                     |

## 6. Escalation ladder

| Trigger                                  | Notify                                          | Within          | Then                                                                                           |
| ---------------------------------------- | ----------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `<Missing business-day file>`            | `<Finance Ops lead + data engineering on-call>` | `<30 min>`      | `<Re-request from the provider; if unavailable by 12:00, run partial and flag the run record>` |
| `<Single break > EUR 5,000>`             | `<Controller>`                                  | `<Same day>`    | `<Same-day investigation; close blocker if unresolved at D+1>`                                 |
| `<Any Duplicate classification>`         | `<Controller + engineering on-call>`            | `<Immediately>` | `<Customer-impact assessment; refund path; incident if >1 customer>`                           |
| `<Safeguarding control total differs>`   | `<Compliance + CFO>`                            | `<Immediately>` | `<Treat as a correctness incident with a regulator attached, not a bug ticket>`                |
| `<Suspense (1900) grows N days running>` | `<Controller>`                                  | `<Same day>`    | `<Incident: you are systematically moving money you cannot explain>`                           |
| `<Auto-match rate drop > 5pp>`           | `<Finance Ops lead + engineering>`              | `<Same day>`    | `<Halt auto-match; investigate the upstream change before booking on the new shape>`           |

## 7. Write-off policy

_A write-off books a real loss or gain. The investigator **proposes**; a named approver at the right
threshold **approves**. Automation may propose, never approve (M11). Thresholds are declared in
configuration and enforced by the system, not by convention (M12)._

| Amount (gross, per break) | Approver                                                               | Evidence required                       |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `<< EUR 25>`              | `<Standing policy — batch-resolved to 6900, capped at EUR 500/period>` | `<Batch record>`                        |
| `<< EUR 100>`             | `<Team lead>`                                                          | `<Classification + investigation note>` |
| `<< EUR 5,000>`           | `<Finance manager>`                                                    | `<Root cause + prevention action>`      |
| `<< EUR 50,000>`          | `<Controller>`                                                         | `<As above + remediation ticket>`       |
| `<≥ EUR 50,000>`          | `<CFO>`                                                                | `<As above + disclosure assessment>`    |

The entry posts to `6200 Reconciliation write-offs` (or `6100 Bad debt` where it is a customer
receivable), carries the break id in its narrative, and is **never** buried in revenue or cost of
payments (M16). Write-off volume is a reported metric: growth means the reconciliation is failing and
the write-off is concealing it.

## 8. Worked example: one break, end to end

_The shape a resolved break should have in the record. Anything less than this is a note, not a
resolution._

**Detection.** Run of `2026-09-09` (T-1 = 2026-09-08). Payout `po_88214`: our `1500 Settlement in
transit` carried **EUR 12,480.00**; the bank credited **EUR 12,477.55**. Delta **EUR 2.45**, one break,
type initially `Amount mismatch`.

**Investigation.**

1. Expanded the payout via pass 3 (`payoutId → balance transactions`): 412 charges, 7 refunds, 419 fee
   rows. `Σ charges − Σ refunds − Σ fees = 12,477.55` — the provider's arithmetic is correct.
2. Diffed the file's `fee_type` values against the classifier's known set: one unknown value,
   `scheme_crossborder`, 19 rows, `Σ = EUR 2.45`, first seen `2026-08-01`.
3. Our `1500` balance was built from charges and refunds only; the new fee type was skipped by the
   ingest classifier rather than refused.
4. **Reclassified** the break to `Fee not booked` (M16), not `Amount mismatch`.

**Correcting entry** — a new entry, not an edit (M3):

| Account                               | Debit | Credit |
| ------------------------------------- | ----- | ------ |
| `5020 Cost of payments — scheme fees` | 245   |        |
| `1500 Settlement in transit`          |       | 245    |

Narrative: `Break #4471 — scheme cross-border fees, payout po_88214, period 2026-09`. Prepared by
`<recon analyst>`, approved by `<Controller>` as a manual JE. `1500` then clears to zero for this
payout and the bank credit matches at pass 2.

**Root cause.** The settlement ingest **skipped** unknown fee types instead of failing closed —
step 4 of §2 existed as a report, not as a stop condition.

**Prevention.** (a) Ingest now refuses a file containing an unclassified row (`STOP` at §2 step 4);
(b) `scheme_crossborder` mapped to `5020`; (c) alert on any unclassified settlement row, threshold 1;
(d) this runbook amended — see §11, v2.2. **The break is not closed until (a)–(d) are shipped**, not
merely when the 2.45 is booked.

## 9. Metrics and alert thresholds

| Metric                   | Definition                                                   | Target                           | Alert at                                                |
| ------------------------ | ------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------- |
| Unmatched value          | Gross `Σ\|amount\|` unmatched at run end, per reconciliation | `<Trending to zero>`             | `<> EUR 10,000 or > 0.1% of daily volume>`              |
| Break count              | Open breaks, per reconciliation                              | `<Stable>`                       | `<Creation rate > resolution rate for 3 days>`          |
| Break age p95            | 95th percentile age of open breaks                           | `<Below the slowest rail's SLA>` | `<> 7 days>`                                            |
| Auto-match rate          | Auto-matched ÷ total, **by value and by count**              | `<> 98% by value>`               | `<Drop > 5pp vs 30-day baseline>`                       |
| Suspense balance and age | `1900` balance; oldest open item                             | `<Oscillating near zero>`        | `<Growth on 3 consecutive days, or any item > 30 days>` |
| Tolerance consumption    | `Σ` tolerance applied, per rule per day                      | `<Bounded and stable>`           | `<> EUR 50/day on any single rule>`                     |
| Write-off value          | Per period, per approver tier                                | `<Small and explainable>`        | `<> 2× trailing 3-month mean>`                          |
| Days to close            | Business days D0 → period lock                               | `<D+5>`                          | `<D+6>`                                                 |
| Run success rate         | Runs completing on schedule without manual intervention      | `<> 95%>`                        | `<2 consecutive failures>`                              |

## 10. Month-end variant

_Same procedure, plus the steps below. The daily run is what makes this short — a five-day close is a
consequence of clean daily reconciliation, not of working faster in the last week._

| Day     | Additional steps                                                                                                                                                                                                                                                                                                                                                                    | Exit criterion                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **D0**  | Freeze operational cutoff; final ingest for every source; snapshot control-account balances                                                                                                                                                                                                                                                                                         | Every source for the period ingested; sequence and balance chains intact          |
| **D+1** | Final-day reconciliations for all sources; refresh and triage the full break inventory; escalate everything over materiality                                                                                                                                                                                                                                                        | Unmatched gross value below threshold per reconciliation, or explained in writing |
| **D+2** | Sub-ledger → GL agreement per control account; FX revaluation of `2900` and the other **monetary** balances to `4210` unrealised / `4200` on settlement — never a contract liability or any other non-monetary balance, which stays at its historical rate (`references/reconciliation-close.md` §12); **soft close**, provisional numbers published **labelled provisional** (M20) | Every control account agrees or has a documented reconciling item                 |
| **D+3** | Break write-off proposals prepared with approvals; provision movements (`2350`); accruals recalculated, not copied                                                                                                                                                                                                                                                                  | All proposed write-offs approved or deferred with a reason                        |
| **D+4** | Reviewer sign-off per reconciliation — reviewer ≠ preparer (M11); manual JE approvals; flux analysis above threshold                                                                                                                                                                                                                                                                | Every reconciliation signed                                                       |
| **D+5** | **Hard close**: period locked; reporting pack generated **from the ledger** (M19); close metrics recorded                                                                                                                                                                                                                                                                           | Period status `CLOSED`; trial balance reproduced from postings and archived       |

Carry a **close blockers list**, refreshed daily: what is blocking, which step, who owns it, target
time. Without it, the close finishes when someone feels finished.

## 11. Runbook change log

_The runbook is a controlled artifact. A break resolved without a runbook change is a break that will
recur._

| Version | Date           | Change                                                              | Reason                                                   | Author               | Approved by    |
| ------- | -------------- | ------------------------------------------------------------------- | -------------------------------------------------------- | -------------------- | -------------- |
| `<2.2>` | `<2026-09-09>` | `<§2 step 4 became a STOP condition; added unclassified-row alert>` | `<Break #4471 — unclassified fee type skipped silently>` | `<Recon analyst>`    | `<Controller>` |
| `<2.1>` | `<2026-07-15>` | `<Added pass 7 (FX-adjusted) with ±2 minor unit tolerance>`         | `<USD settlement introduced>`                            | `<Finance Ops lead>` | `<Controller>` |
| `<2.0>` | `<2026-05-02>` | `<Split safeguarding control total into its own step 9>`            | `<Licence condition — daily internal reconciliation>`    | `<Compliance>`       | `<CFO>`        |
