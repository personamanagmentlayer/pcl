# TDD Workflow — Worked Examples

Reference material for the `tdd-workflow` skill. See [SKILL.md](../SKILL.md).

Each example shows complete cycles, including the failure output, because
observing red is the step most often skipped.

## Example 1 — New behaviour in TypeScript

Requirement: a shopping cart applies a 10 % discount once the subtotal reaches
100, and never discounts shipping.

### Cycle 1 — the threshold

```typescript
// cart.test.ts
import { describe, expect, it } from 'vitest';
import { total } from './cart';

describe('cart total', () => {
  it('applies no discount below the threshold', () => {
    expect(total([{ price: 40 }, { price: 50 }])).toBe(90);
  });
});
```

```
FAIL  cart.test.ts > cart total > applies no discount below the threshold
Error: Failed to resolve import "./cart"
```

That is not red — it is a broken test. Create the module with the simplest
implementation that can fail meaningfully:

```typescript
// cart.ts
export function total(items: { price: number }[]): number {
  return 0;
}
```

```
AssertionError: expected 0 to be 90
```

Now it is red for the right reason. Green:

```typescript
export function total(items: { price: number }[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Cycle 2 — the discount

```typescript
it('applies 10% once the subtotal reaches 100', () => {
  expect(total([{ price: 60 }, { price: 40 }])).toBe(90);
});
```

```
AssertionError: expected 100 to be 90
```

Red for the right reason. Simplest green:

```typescript
export function total(items: { price: number }[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal >= 100 ? subtotal * 0.9 : subtotal;
}
```

### Cycle 3 — shipping is excluded

```typescript
it('never discounts shipping', () => {
  expect(total([{ price: 100 }], { shipping: 12 })).toBe(102);
});
```

The test does not compile — the signature has no second parameter. That is
design feedback arriving exactly when it should. Extend the signature, watch it
fail on the value, then implement:

```typescript
interface Options {
  shipping?: number;
}

export function total(
  items: { price: number }[],
  options: Options = {}
): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discounted = subtotal >= 100 ? subtotal * 0.9 : subtotal;
  return discounted + (options.shipping ?? 0);
}
```

### Refactor

The suite is green, so the shape can improve without risk:

```typescript
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.1;

const subtotalOf = (items: { price: number }[]) =>
  items.reduce((sum, item) => sum + item.price, 0);

export function total(
  items: { price: number }[],
  options: Options = {}
): number {
  const subtotal = subtotalOf(items);
  const discount =
    subtotal >= DISCOUNT_THRESHOLD ? subtotal * DISCOUNT_RATE : 0;
  return subtotal - discount + (options.shipping ?? 0);
}
```

Run the suite again. Three tests, still green, behaviour unchanged.

Note what the loop produced: the discount is expressed as a subtraction rather
than a multiplication, which is what the third test forced. Writing all three
tests up front would have hidden that pressure.

## Example 2 — A bug fix in Python

Reported: a user with no orders causes the dashboard to crash.

The first move is always the same — reproduce the bug as a failing test. Do not
open the implementation yet.

```python
# test_dashboard.py
def test_dashboard_handles_user_with_no_orders():
    user = User(id=7, orders=[])

    summary = build_summary(user)

    assert summary.average_order_value == Decimal("0")
```

```
E       ZeroDivisionError: division by zero
```

The test reproduces the crash. It is now a regression test: it will fail forever
if the bug returns. Only now read the code.

```python
def build_summary(user):
    total = sum(o.total for o in user.orders)
    return Summary(
        order_count=len(user.orders),
        average_order_value=total / len(user.orders),   # <- crash
    )
```

Green, minimally:

```python
def build_summary(user):
    total = sum(o.total for o in user.orders)
    count = len(user.orders)
    return Summary(
        order_count=count,
        average_order_value=total / count if count else Decimal("0"),
    )
```

Refactor and confirm the neighbouring behaviour still holds — a fix that returns
zero for an empty list must not also return zero for a single free order:

```python
def test_average_of_a_single_zero_value_order():
    user = User(id=8, orders=[Order(total=Decimal("0"))])
    assert build_summary(user).average_order_value == Decimal("0")
    assert build_summary(user).order_count == 1
```

Both pass. The second test exists because the fix introduced a branch, and every
new branch deserves a test.

## Example 3 — Table-driven cycles in Go

Go's table tests suit TDD well: each new row is one increment.

```go
func TestParseDuration(t *testing.T) {
    cases := []struct {
        name    string
        in      string
        want    time.Duration
        wantErr bool
    }{
        {name: "seconds", in: "30s", want: 30 * time.Second},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got, err := ParseDuration(tc.in)
            if tc.wantErr {
                if err == nil {
                    t.Fatalf("expected an error for %q", tc.in)
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tc.want {
                t.Errorf("ParseDuration(%q) = %v, want %v", tc.in, got, tc.want)
            }
        })
    }
}
```

Add one row, watch it fail, implement, refactor:

```go
{name: "minutes", in: "5m", want: 5 * time.Minute},
{name: "compound", in: "1h30m", want: 90 * time.Minute},
{name: "rejects empty", in: "", wantErr: true},
{name: "rejects unknown unit", in: "10x", wantErr: true},
```

The discipline still applies: add **one** row at a time. Adding all four then
implementing is a long debug, not a TDD cycle.

## Example 4 — Driving a boundary with a fake

When the unit talks to a real service, drive the design with a fake rather than
a mock framework. A fake is a working implementation with a shortcut.

```python
class InMemoryRateLimiter:
    """Fake: same contract, no Redis."""

    def __init__(self, limit):
        self._limit = limit
        self._counts = defaultdict(int)

    def allow(self, key):
        self._counts[key] += 1
        return self._counts[key] <= self._limit


def test_rejects_the_call_past_the_limit():
    limiter = InMemoryRateLimiter(limit=2)
    api = Api(limiter=limiter)

    assert api.call("user-1").ok
    assert api.call("user-1").ok
    assert api.call("user-1").status == 429
```

The test reads as behaviour, not as wiring. Compare with a mock-heavy version,
which asserts that `allow` was called twice — a fact about the implementation
that no user cares about, and that breaks the moment you add caching.

Keep one contract test that runs the _real_ implementation against the same
assertions, so the fake cannot drift from the thing it stands in for.
