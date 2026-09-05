# Refactoring Workflow — Large-Scale Refactoring

Reference material for the `refactoring-workflow` skill. See [SKILL.md](../SKILL.md).

A refactor too large for one sitting must still be shippable at every point. The
patterns below all share one property: `main` stays green and deployable
throughout, and the migration can be paused or abandoned without leaving rubble.

The long-lived refactoring branch is the failure mode all of them exist to
avoid. It diverges, conflicts compound, review becomes impossible, and it is
eventually abandoned with the work lost.

## Parallel Change (expand, migrate, contract)

The general shape for changing anything with callers you do not control in one
edit — a function signature, a field, a database column, an API response.

### Expand

Add the new form beside the old. Nothing breaks; nothing has moved.

```python
class Account:
    def __init__(self, balance_cents: int, balance: Money | None = None):
        self._cents = balance_cents            # old
        self._balance = balance or Money.from_minor(balance_cents, "EUR")  # new

    @property
    def balance_cents(self) -> int:            # old accessor, still works
        return self._balance.minor

    @property
    def balance(self) -> Money:                # new accessor
        return self._balance
```

### Migrate

Move callers over, a few per commit. Instrument the old path so you can prove
when it goes quiet:

```python
    @property
    def balance_cents(self) -> int:
        logger.warning("deprecated balance_cents accessed", stack_info=True)
        metrics.increment("deprecated.balance_cents")
        return self._balance.minor
```

For an external API, deprecation needs a published window and a header, not a
log line:

```http
Deprecation: Sun, 01 Mar 2026 00:00:00 GMT
Sunset: Wed, 01 Jul 2026 00:00:00 GMT
Link: <https://api.example.com/docs/migrations/money>; rel="deprecation"
```

### Contract

Remove the old form only when telemetry shows zero use for longer than your
longest client release cycle. "No callers in our repo" is not evidence when
other teams, mobile apps or partners exist.

## Branch by Abstraction

For replacing a component that many call sites depend on, without a long-lived
branch.

1. **Introduce an abstraction** over the existing implementation. Callers now go
   through the seam; behaviour is identical.

```typescript
export interface SearchBackend {
  query(term: string, opts: QueryOptions): Promise<SearchResult>;
}

export class ElasticsearchBackend implements SearchBackend {
  /* existing */
}
```

2. **Route all callers through it.** Ship this. It is a pure refactor.

3. **Build the replacement behind the same interface**, merged to `main` but not
   yet reachable.

```typescript
export class OpenSearchBackend implements SearchBackend {
  /* new */
}
```

4. **Switch with a flag**, per environment then per tenant, so a rollback is a
   configuration change and not a deploy.

```typescript
export function makeSearchBackend(flags: Flags): SearchBackend {
  return flags.enabled('search.opensearch')
    ? new OpenSearchBackend()
    : new ElasticsearchBackend();
}
```

5. **Remove the old implementation and the flag** once the new one has held at
   100 % for long enough to cover your slowest failure mode.

Every step is on `main`, every step is revertable, and the abstraction can be
removed at the end if it earns nothing further.

## Strangler Fig

For replacing a whole system or a large subsystem incrementally.

Put a façade in front — a proxy, gateway route, or dispatching module. Route one
capability at a time to the new implementation. The old system shrinks until it
can be switched off.

```nginx
location /api/v1/invoices  { proxy_pass http://new-billing; }   # migrated
location /api/v1/payments  { proxy_pass http://new-billing; }   # migrated
location /api/             { proxy_pass http://legacy-monolith; }
```

What decides success:

- **Route by capability, not by file.** A half-migrated capability living in two
  systems needs distributed transactions you do not want.
- **Decide where the data lives** before moving the first route. Two systems
  writing one table is the failure mode that ends most strangler migrations.
- **Keep the façade dumb.** Business logic in the router becomes a third system
  nobody planned.
- **Set an end date.** A strangler that stalls at 60 % leaves you operating two
  systems permanently, which is worse than either alone.

## Migrating Data Shapes

Schema changes are refactors that cannot be reverted by `git revert`. Sequence
them so every intermediate state is valid for both the old and the new code:

1. **Add** the new column, nullable, no default that rewrites the table.
2. **Backfill** in batches, throttled, resumable, and idempotent.
3. **Dual-write** both columns from the application.
4. **Dual-read**, preferring the new column and falling back.
5. **Verify** — reconcile old against new over a full cycle; fix drift.
6. **Stop writing** the old column.
7. **Drop** it, in a later release than step 6, so a rollback of that release
   still finds its data.

Steps 6 and 7 must not ship together. That is the rule that makes the migration
recoverable.

## Keeping a Long Migration Honest

- **Track the count, publish it.** "142 call sites remain" beats "nearly done".
- **Make new code impossible.** A lint rule banning the old API stops the
  denominator growing while you work.

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "./legacy/search",
            "message": "Use SearchBackend from ./search. Migration: RFC-114."
          }
        ]
      }
    ]
  }
}
```

- **Timebox and reassess.** If the count has not moved in two iterations, the
  migration has lost its owner. Either fund it or abandon it deliberately and
  remove the half-built abstraction — an unfinished migration is worse than
  either end state.
- **Record the decision.** An ADR naming the target, the sequence and the
  rollback lets whoever inherits it continue rather than restart.
