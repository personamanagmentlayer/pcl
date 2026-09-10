# Money controls checklist — `<Acme Wallet>`

> Completed and signed **before the first real transaction**, and re-run before any change that widens
> the money surface: a new rail, a new currency, a new entity, a new payout path.
>
> **How to answer an item.** Every line is phrased so it can only be answered by pointing at something
> a second person can open: a key's scope page, a test name, a constraint, a config file, a screenshot
> of a refused request, a signed document. "Yes", "we're careful about that" and "it's in the design
> doc" are not answers. Write the evidence next to the box:
>
> `- [x] The payout service's API key cannot create charges — **evidence:** `terraform/psp_keys.tf:41`, scope `payouts:write`only; verified by`test_payout_key_cannot_charge`.`
>
> An **unchecked item is a launch blocker**. It may be waived only with a named owner, a written
> rationale and a review date, recorded in the waiver table at the end — never by consensus in a
> meeting and never by whoever is closest to the deadline.

## 1. Credentials and key scope

- [ ] Every provider credential is loaded from a secrets manager or the environment — **show** the
      code path that reads it, and a grep proving no key literal exists in the repository or its history.
- [ ] The payout service's key **cannot create charges**, and the charge service's key **cannot issue
      payouts** — show each key's scope in the provider console or the IaC that provisions it.
- [ ] No key in use has full-account scope. Show the list of live keys, their scopes and their owners.
- [ ] Keys are rotated on a schedule and on suspicion — show the last rotation date and the runbook step.
- [ ] Webhook signing secrets are distinct per endpoint and per environment — show the secret names.
- [ ] A leaked-key procedure exists and has been rehearsed — show the rehearsal record and the time to revoke.

## 2. Environment separation and the production switch

- [ ] Test and live provider credentials live in **separate provider accounts**, not separate keys in
      one account — show the two account ids.
- [ ] No non-production environment can reach a live money endpoint — show the egress policy or the
      allowlist that blocks it.
- [ ] The system **fails closed when the environment is ambiguous** — show the startup assertion and the
      test that proves it refuses to boot rather than defaulting to live.
- [ ] Switching to production is a reviewed configuration change, not a default or an env var someone
      can set — show the change and its approval.
- [ ] Production fixtures, seeds and demo data cannot create postings in live — show the guard.
- [ ] Database restores from production into a test environment are scrubbed of tokens and PII — show the scrub job.

## 3. Authorisation, approval thresholds and separation of duties (M11)

- [ ] Authorisation is checked **on the object**, not the route: show the test proving user A cannot
      refund user B's payment, act on B's payout, or read B's wallet.
- [ ] The approval matrix in `FINANCIAL-SYSTEM-SPEC.md` §5.2 is implemented — show the config and one
      test per threshold row.
- [ ] The initiator of a payout, refund or manual journal **cannot be its approver** — show the check
      and the test that a self-approval attempt is refused.
- [ ] **Automation cannot approve anything.** Show the approval API rejecting a principal of type
      `service`, and confirm no service account holds an approver role.
- [ ] Role assignments have been reviewed by a human other than their holder in the last quarter — show
      the review record.
- [ ] Break-glass access to post directly to the ledger is time-boxed, logged and alerts a second
      person — show a break-glass event in the audit log.

## 4. Limits (M12)

- [ ] Every limit in §5.1 of the spec is enforced in code, not documentation — show the config file
      that declares them and the enforcement point.
- [ ] A breach is **refused with a specific error, never clamped to the limit** — show the test
      asserting no partial amount is processed on breach.
- [ ] A retry after a breach does not reset the window — show the rolling-window test.
- [ ] Velocity limits are evaluated atomically with the operation, not before it — show that a
      concurrent pair of requests cannot both pass.
- [ ] Limit rejections are counted and alertable — show the metric and its dashboard.
- [ ] Changing a limit requires the same approval as a write-off — show the change-control path.

## 5. Idempotency and delivery semantics (M7, M8)

- [ ] Every mutating money call carries a **caller-supplied key derived from the business action** —
      show the derivation table and confirm no key is a call-time UUID.
- [ ] The idempotency store enforces uniqueness at the database level — show the unique index.
- [ ] Replaying a key returns the **original outcome** and performs no second effect — show the test.
- [ ] Key retention covers the longest reversal window on the path — show the retention setting against
      §1.4 of the spec.
- [ ] Webhook signatures are verified and **failures are rejected with 4xx**, never processed and never
      swallowed as a malformed payload — show `test_webhook_forged_signature_rejected`.
- [ ] Events are deduplicated on the provider's event id **before** any posting — show the dedupe table
      and the test for redelivery.
- [ ] Out-of-order arrival is tolerated — show the test where `captured` arrives before `authorised`.
- [ ] Amounts are taken from an authenticated fetch, not from the webhook payload — show the fetch.

## 6. Money arithmetic and currency (M4, M5, M6)

- [ ] No float or double reaches an amount, in code, in the database, in JSON or in the analytics
      pipeline — show `python3 scripts/money_lint.py src/` clean, plus the column types.
- [ ] Every amount carries an ISO 4217 currency, enforced by the type — show the constructor test.
- [ ] Cross-currency arithmetic is **impossible by construction** — show the test that `a + b` raises
      on mismatched currencies, and that no query sums across currencies.
- [ ] Minor-unit scale comes from a currency table, not a hardcoded `100` — show the JPY test.
- [ ] Rounding uses the declared mode at the declared points only — show the two rounding call sites.
- [ ] Allocation preserves the total — show the property test over random amounts and ratios, including
      negative and zero.
- [ ] FX conversions record rate, source, timestamp and spread as an event — show one stored record.
- [ ] A stale FX rate **fails the conversion closed** — show the staleness test.

## 7. Ledger integrity and immutability (M1, M2, M3)

- [ ] Debits equal credits per entry per currency, enforced by a database constraint or trigger, not
      only in application code — show the constraint.
- [ ] The application role has **no UPDATE or DELETE grant** on postings — show the grants.
- [ ] Corrections go through a reversal API that cites the original entry — show the test proving the
      edit path does not exist.
- [ ] Balances are derived from postings, and the cache can be dropped and rebuilt — show a rebuild run
      matching the cache to the minor unit (M17).
- [ ] `python3 scripts/audit_ledger.py <export> --fail-on warn` is clean on a real export — attach the run.
- [ ] Every control account's dimension total equals the control balance — show the assertion and its alert.

## 8. Reconciliation readiness (M9)

- [ ] Every external source in §6 of the spec is ingested, with a runnable job, before launch — not
      "planned for month two". Show the last successful run per source.
- [ ] An expected-file calendar exists per source; a missing file on a business day raises an incident —
      show the alert.
- [ ] Files are hashed and versioned; a redelivered or restated file never overwrites — show the store.
- [ ] The break record has a **NOT NULL owner** and cannot be closed without a resolution entry, a
      closer and a root cause — show the table constraint.
- [ ] Tolerances are declared in config with a named cause, and tolerance consumption is measured in
      money per rule per day — show the config and the metric.
- [ ] The runbook (`RECONCILIATION-RUNBOOK.md`) has been walked end to end once against real data —
      show who walked it and when.

## 9. Audit trail and log hygiene (M14, M15)

- [ ] Every money operation writes actor, action, amount, currency, rate, idempotency key, resulting
      entry ids and outcome — show one record end to end.
- [ ] The audit store is append-only and its retention matches the regime — show the storage policy.
- [ ] A human under time pressure can answer "what happened to this payment?" in one query — run it and
      show the time.
- [ ] **No PAN, CVV, track data, credential or provider token appears in logs, traces, error messages,
      analytics or fixtures** — show the redaction test and `money_lint.py`'s PAN check clean.
- [ ] Exception reporting (Sentry or equivalent) scrubs request bodies on money endpoints — show the config.
- [ ] Support tooling shows the last four digits only — show the screen and the query behind it.

## 10. Period and cutoff (M10)

- [ ] Event time, booking time and accounting period are three distinct stored fields — show the schema.
- [ ] The period is derived from event time by an explicit timezone conversion, never a naive date cast
      — show the function and the 23:55 boundary test.
- [ ] **A posting into a closed period is refused by the ledger**, not by the application — show the
      trigger or constraint and `test_post_to_closed_period_rejected`.
- [ ] Reopening a period requires named approval and is logged as an event — show the procedure.
- [ ] Late items post to the open period carrying the original event date — show one example.

## 11. Testing evidence (M18)

- [ ] Property tests cover allocation, rounding and FX round-trip bounds — show the test file.
- [ ] Every posting rule has a golden entry asserting its exact legs — show the count against the rule
      count in `POSTING-RULES.md`; they must be equal.
- [ ] A trial-balance assertion runs in CI on every build — show the CI step and a passing run.
- [ ] Concurrency is tested: two simultaneous spends of the same balance, one succeeds — show the test.
- [ ] The reversal path is tested for every rule: rule then reversal returns all accounts to opening.
- [ ] `money_lint.py` and `audit_ledger.py` run in CI and fail the build — show the pipeline definition.

## 12. Observability, alerting and kill switches

- [ ] Financial SLOs are defined and alerting: unmatched value, break count and age p95, suspense
      balance and age, hold leakage, failed payout rate — show the dashboard.
- [ ] Alerts exist for refund spikes, repeated authorisation failures and limit rejections — show the
      thresholds and who is paged.
- [ ] A **kill switch disables outbound money movement** without a deploy, and has been tested in
      production-like conditions — show the switch and the test record.
- [ ] The suspense account has an absolute-balance alert and a growth-over-N-days alert — show both.
- [ ] Alert routing reaches a person who can act at 02:00 — show the rota.

## 13. Incident and rollback readiness

- [ ] A rollback of the deploy does **not** roll back postings, and the team knows this — show the
      documented procedure for correcting by reversal instead.
- [ ] A replay/backfill procedure exists, is idempotent, and has been rehearsed — show the rehearsal.
- [ ] The double-charge playbook exists: detect, stop, refund, notify, reconcile — show the runbook.
- [ ] Provider outage behaviour is defined: what queues, what refuses, what the customer sees.
- [ ] An ambiguous outcome (`unknown` payment state) is a real state with an owner, an age and an alert
      — show the queue and its SLA.

## 14. Regulatory and retention

- [ ] PCI scope is written down and minimised; the SAQ type is confirmed — show the scope statement.
- [ ] Client-money safeguarding, if applicable, has a daily reconciliation with a named owner — show
      yesterday's run.
- [ ] Data residency constraints are enforced by infrastructure, not policy — show the region config.
- [ ] Retention periods per data class are implemented as deletion jobs, not intentions — show the jobs.
- [ ] KYC/AML thresholds are owned by Compliance and configured, not coded — show the config and owner.
- [ ] The evidence for each control above is retained and retrievable for the audit — show where.

## Waivers

_Every unchecked box appears here or launch does not proceed._

| #   | Item                     | Rationale                                                      | Compensating control                                | Owner           | Review date    |
| --- | ------------------------ | -------------------------------------------------------------- | --------------------------------------------------- | --------------- | -------------- |
| 1   | `<8.5 tolerance metric>` | `<Metric not yet instrumented; tolerances currently all zero>` | `<Manual review of tolerance config at each close>` | `<Finance Ops>` | `<2026-11-01>` |

## Sign-off

_Three signatures, three different people. An item checked by the person who built it and signed by
nobody else is not a control._

| Role                    | Name             | Date | Signature / reference |
| ----------------------- | ---------------- | ---- | --------------------- |
| Engineering owner       | `<R. Okonkwo>`   | `<>` | `<>`                  |
| Finance owner           | `<M. Duarte>`    | `<>` | `<>`                  |
| Compliance / risk owner | `<A. Bergström>` | `<>` | `<>`                  |

**An unchecked item is a launch blocker unless it is explicitly waived above, with a named owner and a
review date.** No exceptions granted verbally, and none granted by the person whose deadline it is.
