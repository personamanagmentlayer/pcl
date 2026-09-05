# Code Review Workflow — Review Checklists

Reference material for the `code-review-workflow` skill. See [SKILL.md](../SKILL.md).

Use the checklist matching the change type. A generic checklist applied to every
diff produces generic reviews.

## Any Change

- [ ] The description explains the problem, not only the solution
- [ ] The diff size matches the description; nothing unrelated smuggled in
- [ ] CI is green, and the tests actually run in CI
- [ ] Errors are handled or deliberately propagated, never swallowed
- [ ] Nothing is logged that should not be: secrets, tokens, card data, personal data
- [ ] Behaviour change is covered by a test that fails without the change

## API Change

- [ ] **Backwards compatible**, or the break is deliberate and versioned
- [ ] Added fields are optional; removed fields went through deprecation
- [ ] Field types unchanged — widening an integer to a string breaks clients
- [ ] Error responses documented, with stable codes clients can branch on
- [ ] Pagination present on any collection that can grow
- [ ] Rate limiting considered for a new public endpoint
- [ ] Authorisation checked **per object**, not only per route
- [ ] OpenAPI or schema updated in the same change
- [ ] Idempotency defined for anything that mutates and can be retried

Breaking without meaning to, in order of frequency: making an optional field
required, tightening validation on an existing field, changing a default,
reordering positional results, renaming an enum value.

## Database Migration

- [ ] **Reversible**, or the irreversibility is stated and accepted
- [ ] Old and new application versions both work against the new schema
- [ ] No blocking lock on a large table — check the operation against the engine's
      behaviour, not intuition
- [ ] Index creation is concurrent (`CREATE INDEX CONCURRENTLY`)
- [ ] Backfill is batched, throttled, resumable and idempotent
- [ ] Adding a column with a volatile default does not rewrite the table
- [ ] `NOT NULL` added only after the backfill completes
- [ ] Dropping a column happens in a **later release** than the code that stopped
      writing it

```sql
-- Blocks writes on a large table in several engines
ALTER TABLE orders ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Sequenced instead:
ALTER TABLE orders ADD COLUMN status text;                    -- instant
-- backfill in batches, then:
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;          -- after backfill
```

## Concurrency

- [ ] Shared mutable state is synchronised, or there is none
- [ ] Check-then-act sequences are atomic (conditional update, or a lock)
- [ ] Locks are acquired in a consistent order across the codebase
- [ ] Every lock and connection is released on the error path
- [ ] Timeouts on every blocking call — no unbounded wait
- [ ] Retries use exponential backoff **with jitter**, and are bounded
- [ ] Retried operations are idempotent
- [ ] Thread pool and connection pool sizes are bounded and configured

The pattern to look for hardest:

```python
# Two callers both read 'pending' and both proceed
if order.status == "pending":
    ship(order)
    order.status = "shipped"

# Atomic: the database decides who wins
rows = db.execute(
    "UPDATE orders SET status='shipped' WHERE id=%s AND status='pending'",
    (order.id,),
).rowcount
if rows == 1:
    ship(order)
```

## Dependency Change

- [ ] The dependency is actually needed — not three functions worth vendoring
- [ ] Actively maintained: recent releases, open issue response, more than one maintainer
- [ ] Licence compatible with the project
- [ ] Transitive additions reviewed, not just the direct one
- [ ] Version pinned; lockfile updated in the same commit
- [ ] No known advisories (`npm audit`, `pip-audit`, `cargo audit`, `osv-scanner`)
- [ ] Install scripts and postinstall hooks inspected for a new package
- [ ] Bundle or image size impact acceptable

A major version bump needs the changelog read, not just the tests passing —
behaviour changes that your tests do not cover are exactly the risk.

## Performance-Sensitive Change

- [ ] There is a measurement, not an assertion, that it is faster
- [ ] The benchmark reflects production data shape and volume
- [ ] No query inside a loop (N+1); check the ORM's generated SQL
- [ ] Queries have supporting indexes — read the plan, do not assume
- [ ] Result sets are bounded; no unpaginated full-table read
- [ ] Memory growth is bounded for the largest realistic input
- [ ] Caching has an invalidation story and a stated staleness budget

## Infrastructure and Configuration

- [ ] Change is expressed as code and reviewed like code
- [ ] Secrets come from a secret manager, never from the manifest
- [ ] Resource requests and limits set; no unbounded container
- [ ] Health checks distinguish liveness from readiness
- [ ] Rollback path stated and tested
- [ ] Blast radius limited: one environment, one region, one tenant first
- [ ] Least privilege on any new role, policy or service account
- [ ] Alerting exists for the new failure mode this introduces

## Security-Sensitive Change

Authentication, authorisation, cryptography, payments, personal data, file
upload, deserialisation, template rendering, subprocess execution.

- [ ] Authorisation verified per object and per function, not just at the route
- [ ] Input validated server-side with an allowlist
- [ ] Output encoded for its sink: HTML, SQL, shell, URL, LDAP
- [ ] Crypto uses a vetted library and an authenticated mode; no hand-rolled primitives
- [ ] Randomness from a CSPRNG for anything security-bearing
- [ ] Comparison of secrets is constant-time
- [ ] Failure closes: an exception must not grant access
- [ ] The security-relevant event is audited with actor, action, resource, outcome
- [ ] Error messages reveal nothing about internal state

Deserialising untrusted input into arbitrary types, and building a shell command
by concatenation, both warrant a blocking comment on sight.

## Frontend Change

- [ ] Keyboard reachable and operable; focus order is sensible
- [ ] Interactive elements have accessible names; images have alt text
- [ ] Contrast meets WCAG 2.2 AA
- [ ] Loading, empty and error states exist, not only the happy path
- [ ] User input is escaped; no `dangerouslySetInnerHTML` on untrusted content
- [ ] Bundle impact checked for a new dependency
- [ ] Works at the supported breakpoints and does not scroll horizontally
