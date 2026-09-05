# TDD Workflow — Legacy Code Strategies

Reference material for the `tdd-workflow` skill. See [SKILL.md](../SKILL.md).

Legacy code here means code without tests, regardless of its age. The problem is
circular: you cannot safely change it without tests, and you often cannot test it
without changing it. The way out is to find or create a _seam_.

## Seams

A seam is a place where behaviour can be altered without editing the code at that
place. Every seam has an _enabling point_ — the mechanism that lets you swap the
behaviour.

### Object seam

The most common seam: a dependency passed in rather than constructed inside.

```python
# Before - no seam. The clock and the gateway are welded in.
class SubscriptionService:
    def renew(self, subscription_id):
        now = datetime.now()
        gateway = StripeGateway(api_key=os.environ["STRIPE_API_KEY"])
        ...

# After - constructor injection creates two seams.
class SubscriptionService:
    def __init__(self, gateway, clock=datetime.now):
        self._gateway = gateway
        self._clock = clock

    def renew(self, subscription_id):
        now = self._clock()
        ...
```

The change is behaviour-preserving and mechanical, which makes it safe to do
before any test exists. Keep a default argument so existing callers still work.

### Parameter seam

When you cannot change construction, pass the collaborator as an optional
argument on the method itself.

```python
def generate_invoice(order, renderer=None):
    renderer = renderer or PdfRenderer()
    ...
```

### Extract-and-override seam

In languages with subclassing, wrap the untestable call in a method and override
it in a test subclass.

```python
class ReportJob:
    def run(self):
        rows = self._fetch_rows()      # extracted
        return summarise(rows)

    def _fetch_rows(self):
        return self._db.query("SELECT ...")


class ReportJobForTest(ReportJob):
    def _fetch_rows(self):
        return [{"id": 1, "total": 10}]
```

Use this when injection would ripple through too many callers. It is a stepping
stone, not a destination — replace it with injection once tests exist.

### Link seam

Swap the implementation at build or import time: a module alias, a test double
package, an `LD_PRELOAD`. Powerful but invisible in the source, so it confuses
readers. Prefer object seams unless the boundary is a third-party binary.

## Characterisation Tests

A characterisation test asserts what the code _does_, not what it should do. Its
purpose is to detect unintended change during refactoring.

### The procedure

1. Call the code with a realistic input.
2. Assert something you know is wrong, for example equality with `None`.
3. Run it. The failure message reveals the actual value.
4. Replace the assertion with that actual value.
5. Repeat until the paths you intend to change are pinned.

```python
def test_characterise_pricing():
    # Step 2: deliberately wrong, to learn the real output
    assert calculate_price(qty=3, tier="gold", region="EU") is None
    # Failure says: assert Decimal('27.45') is None
    # Step 4:
    # assert calculate_price(qty=3, tier="gold", region="EU") == Decimal("27.45")
```

Record the value the code produces even when it looks wrong. If `27.45` should
be `27.50`, that is a bug to fix _after_ the safety net is in place — write it
down, do not silently correct it while characterising.

### Snapshot characterisation

For large outputs, snapshot rather than hand-write assertions.

```javascript
test('characterises the rendered dashboard payload', () => {
  const payload = buildDashboard(fixtureAccount);
  expect(payload).toMatchSnapshot();
});
```

Snapshot hygiene, in order of importance:

- **Review the snapshot on creation.** An unreviewed snapshot pins a bug forever.
- **Keep snapshots small.** Snapshot the field you care about, not the whole
  object graph, or every unrelated change produces a diff.
- **Never update snapshots wholesale** (`-u`) during a refactor. That erases the
  signal you created them for. Update one at a time, reading each diff.
- **Delete them** once real behavioural tests replace them.

## Breaking Dependencies Safely

The changes that let you test must themselves be safe, because they happen
before any test exists. Restrict yourself to transformations your tooling can
verify:

| Transformation              | Safety | Notes                                   |
| --------------------------- | ------ | --------------------------------------- |
| Rename symbol               | High   | IDE-verified, compiler-checked          |
| Extract method              | High   | No behaviour change if no state moves   |
| Add optional parameter      | High   | Existing callers unaffected             |
| Introduce interface         | Medium | Compiler catches missed implementations |
| Move method between classes | Low    | Do it after tests exist                 |
| Change control flow         | None   | Never before tests                      |

Make one transformation, compile or type-check, commit. Do not batch them.

## Sprout and Wrap

When a function is too tangled to test, do not fix it first. Add the new
behaviour beside it, fully tested, and call it from the tangle.

### Sprout method

```python
def process_order(order):            # untested, 300 lines
    ...
    # new requirement, written test-first as its own function
    apply_loyalty_discount(order)    # <- fully tested in isolation
    ...
```

### Wrap method

Rename the original and wrap it, so new behaviour is testable around it.

```python
def process_order(order):            # new wrapper, tested
    record_audit_entry(order)
    return _process_order_original(order)
```

The tangle stays untested, but it stops growing. Over time the sprouted
functions become the majority of the behaviour.

## Ordering a Legacy Change

1. Run the suite. Establish what green means today.
2. Identify the smallest callable boundary containing the change.
3. Characterise that boundary. Stop as soon as the affected paths are pinned —
   full coverage of legacy code is rarely worth it.
4. Break only the dependencies that block the characterisation.
5. Commit the safety net on its own, separately from any behaviour change.
6. Now run the normal red-green-refactor loop for the actual change.
7. Delete characterisation tests that the new behavioural tests supersede.

Keeping step 5 as its own commit matters: a reviewer can see that the net was
added without altering behaviour, and a bisect can distinguish "test added" from
"behaviour changed".
