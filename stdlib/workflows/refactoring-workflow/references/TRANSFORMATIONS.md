# Refactoring Workflow — Transformation Catalogue

Reference material for the `refactoring-workflow` skill. See [SKILL.md](../SKILL.md).

Each entry gives the mechanics as an ordered procedure. Run the test suite
between numbered steps, not only at the end — that is what makes the
transformation reversible.

## Extract Function

**When:** a fragment of code can be given a name that explains it better than the
code does.

**Mechanics**

1. Create a new empty function; name it after the _intent_, not the mechanism.
2. Copy the fragment into it.
3. Compile. Every undefined symbol is a parameter or a return value.
4. Pass locals the fragment reads as parameters; return locals it writes.
5. Replace the original fragment with a call.
6. Run the suite.

```python
# Before
def render_invoice(order):
    lines = []
    for item in order.items:
        net = item.price * item.qty
        tax = net * TAX_RATE
        lines.append(f"{item.name}: {net + tax:.2f}")
    return "\n".join(lines)

# After
def render_invoice(order):
    return "\n".join(_format_line(item) for item in order.items)


def _format_line(item):
    net = item.price * item.qty
    return f"{item.name}: {net + net * TAX_RATE:.2f}"
```

If more than three parameters appear, the fragment was not a cohesive unit —
undo and cut elsewhere.

## Inline Function

**When:** the body is as clear as the name, or an ill-chosen extraction is
getting in the way of a better one.

**Mechanics**

1. Check the function is not polymorphic — a subclass override makes inlining unsafe.
2. Find all callers (compiler or `grep`, not memory).
3. Replace each call with the body, adapting parameter names.
4. Delete the function.
5. Run the suite.

Inlining before extracting is often the fastest way out of a bad decomposition:
collapse it, then cut along the right seam.

## Extract Class

**When:** a class holds two sets of fields that change for different reasons.

**Mechanics**

1. Create the new class.
2. Move one field at a time, leaving a delegating accessor on the original.
3. Move the methods that use only those fields.
4. Run the suite after each move.
5. Once callers use the new class directly, remove the delegations.

```typescript
// Before: Order knows about postage rules
class Order {
  street: string;
  city: string;
  postcode: string;
  country: string;

  shippingCost(): number {
    /* uses the four fields */
  }
}

// After
class Address {
  constructor(
    readonly street: string,
    readonly city: string,
    readonly postcode: string,
    readonly country: string
  ) {}
}

class ShippingRates {
  costFor(address: Address): number {
    /* ... */
  }
}

class Order {
  constructor(readonly address: Address) {}
}
```

The intermediate delegating state is deliberate: it keeps every step green and
lets you stop halfway without leaving a broken tree.

## Replace Primitive with Object

**When:** a primitive carries meaning the type system cannot check — money as
`float`, an id as `string`, a currency code as `str`.

**Mechanics**

1. Introduce the value type with the primitive inside it.
2. Add construction validation and the operations the concept needs.
3. Change one producer to return the type; let the compiler list the callers.
4. Work outward until the primitive no longer crosses a boundary.

```python
from decimal import Decimal, ROUND_HALF_UP

class Money:
    __slots__ = ("_minor", "currency")

    def __init__(self, amount: Decimal, currency: str):
        if not isinstance(amount, Decimal):
            raise TypeError("amount must be Decimal")
        self._minor = int((amount * 100).quantize(Decimal("1"), ROUND_HALF_UP))
        self.currency = currency

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("cannot add %s to %s" % (other.currency, self.currency))
        return Money.from_minor(self._minor + other._minor, self.currency)
```

The payoff is not tidiness: cross-currency addition becomes impossible to write
by accident, and rounding lives in exactly one place.

## Replace Conditional with Polymorphism

**When:** the same switch on a type or state appears in several places.

**Mechanics**

1. Create a class per branch, with a common interface.
2. Move **one** conditional's branches into the classes.
3. Replace that conditional with a dispatch.
4. Run the suite.
5. Repeat for each remaining conditional on the same discriminator.
6. Remove the discriminator field once nothing reads it.

Do this only when the same discriminator drives three or more decisions. A single
`if` replaced by a class hierarchy is a net loss in readability.

## Introduce Parameter Object

**When:** the same group of parameters travels together through several
signatures.

**Mechanics**

1. Create the object with the fields.
2. Add it as a _new optional_ parameter alongside the existing ones.
3. Migrate callers one at a time.
4. Remove the old parameters once no caller passes them.

Step 2 is what keeps the tree green throughout; adding and removing in one edit
forces a big-bang change across all callers.

## Split Loop

**When:** one loop does two unrelated things, so neither can be extracted.

```javascript
// Before
let youngest = Infinity,
  total = 0;
for (const p of people) {
  if (p.age < youngest) youngest = p.age;
  total += p.salary;
}

// After - two loops, each extractable and nameable
const youngest = Math.min(...people.map((p) => p.age));
const total = people.reduce((sum, p) => sum + p.salary, 0);
```

The objection is performance. Measure before accepting it: for collection sizes
that fit in cache, the second traversal is usually invisible, and the clarity
enables extractions that matter more.

## Separate Query from Modifier

**When:** a function both returns a value and changes state, so callers cannot
ask without also causing an effect.

**Mechanics**

1. Copy the function; name the copy as a pure query.
2. Delete the side effects from the query.
3. Delete the return value from the original, keeping the effects.
4. Change callers to call the query, then the modifier when they need the effect.

This is the transformation that most often makes a unit testable, because the
query becomes assertable without a fixture.

## Remove Dead Code

**When:** nothing reaches it.

**Mechanics**

1. Prove it, do not assume it. Static search plus at least one runtime signal:
   coverage from the test suite, or production telemetry over a full business
   cycle. Reflection, dynamic dispatch and string-built names defeat grep.
2. Delete it in its own commit.
3. Keep the commit small so a revert is trivial if the proof was wrong.

Deleting is the highest-value refactor per line changed, and the only one whose
sole risk is the quality of your evidence.

## Rename

**When:** the name misleads. Always worth it; almost always safe.

Use the IDE's rename, not search-and-replace: it understands scope, and it will
not rewrite a string literal or a comment that happens to match. Where no tool
exists — dynamic languages, config keys, database columns — rename in a
parallel-change sequence: add the new name, migrate readers, remove the old.
