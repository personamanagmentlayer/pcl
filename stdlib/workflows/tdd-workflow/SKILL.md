---
name: tdd-workflow
version: 1.0.0
description: >-
  Drive implementation through a test-first loop: write a failing test, make it pass with the
  simplest change, then refactor under a green suite. Use when the user asks for TDD or
  test-driven development, wants tests written before the code, is adding behaviour to code
  that has tests, is fixing a bug and wants a regression test first, or when the task
  involves red-green-refactor, characterisation tests, or working safely on untested legacy
  code.
category: workflows
tags:
  [
    tdd,
    testing,
    test-first,
    red-green-refactor,
    unit-tests,
    regression,
    legacy-code,
    workflow,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, npx:*, pnpm:*, yarn:*, pytest:*, python:*, python3:*, go:*, cargo:*, mvn:*, gradle:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# TDD Workflow

A procedure, not a body of knowledge. Follow the loop step by step; the value of
TDD comes from the discipline of the sequence, not from knowing what it is.

## When to Use This Skill

- The user asks for TDD, test-driven development, or "tests first"
- New behaviour is being added to code that already has a test suite
- A bug has been reported and the fix should not regress
- Existing code must be changed but has no tests to protect it
- The user wants confidence that a refactor preserved behaviour

Do **not** use this loop for exploratory spikes meant to be thrown away, or for
code whose correct behaviour is not yet known. Explore first, then restart the
loop against what you learned.

## Core Concepts

### The Loop

One cycle, three states, in this order and no other:

1. **Red** — write one failing test that states the next increment of desired
   behaviour. Run it. Confirm it fails, and fails _for the reason you expect_.
2. **Green** — write the simplest change that makes it pass. Not the best
   change; the simplest. Run the whole suite.
3. **Refactor** — improve the code and the test with the suite green. Run after
   every structural change. Never change behaviour here.

The cycle is short by design: minutes, not hours. A long cycle means the
increment was too large — shrink it.

### Why Red Must Be Observed

A test that has never failed proves nothing. It may assert a tautology, target
the wrong unit, or be silently skipped. Watching it fail, and reading the
failure message, is the only evidence that the test is connected to the
behaviour you intend to build.

### The Increment

Each cycle should encode exactly one decision: one branch, one validation, one
edge case. If you cannot state the next test in a sentence, the increment is
too big.

### Characterisation Tests

For untested legacy code, invert the loop. You do not know the intended
behaviour, so first _pin down the actual behaviour_ with tests that assert what
the code does today — bugs included. Only then change it. These tests are
scaffolding: some are deleted once the real behaviour is specified.

## The Workflow

### 1. Establish the baseline

Run the suite before touching anything. A suite that is already red gives you no
signal. Fix or quarantine failures first, and say so.

```bash
npm test          # or: pytest -q, go test ./..., cargo test, mvn -q test
```

### 2. Name the increment

State the next behaviour in one sentence, in the domain's language. That
sentence becomes the test name.

> "A refund larger than the original charge is rejected."

### 3. Write the failing test

One test. Arrange, act, assert. Assert on observable behaviour — a return value,
a raised error, a recorded side effect — never on private internals.

```python
def test_refund_larger_than_charge_is_rejected():
    payment = Payment(amount=Decimal("50.00"))

    with pytest.raises(RefundExceedsCharge):
        refund(payment, amount=Decimal("75.00"))
```

### 4. Run it and read the failure

```bash
pytest -q tests/test_refunds.py::test_refund_larger_than_charge_is_rejected
```

Confirm it fails because `RefundExceedsCharge` was not raised — not because of
an import error, a typo, or a missing fixture. A test failing for the wrong
reason is not red; it is broken.

### 5. Make it pass, simply

```python
def refund(payment, amount):
    if amount > payment.amount:
        raise RefundExceedsCharge(payment.id, amount)
    ...
```

Resist generalising. A hard-coded value that passes is legitimate here; the next
failing test will force the generalisation. Run the **whole** suite, not just
the new test — the simplest change is also the one most likely to break a
neighbour.

### 6. Refactor

With the suite green, improve naming, remove duplication, extract functions.
Refactor the test too: a test that is hard to read is a test that will be
deleted rather than fixed. Run the suite after each structural change so a
break is attributable to one edit.

### 7. Repeat or stop

Return to step 2 for the next increment. Stop when the behaviour is fully
specified — not when the code looks finished.

## Working on Untested Legacy Code

Do not start by writing the test you wish existed. Start by making the code
testable at its current seam:

1. Find the smallest boundary you can call — a function, an HTTP handler, a CLI
   entry point. Do not refactor to find it; call what exists.
2. Write a characterisation test asserting current output for a realistic input.
   If the output is a large structure, snapshot it.
3. Run it. If it fails, your understanding is wrong, not the code — fix the test.
4. Repeat until the paths you intend to change are covered.
5. Only now begin the red-green-refactor loop on the change you actually wanted.

See [Legacy Code Strategies](references/LEGACY_CODE.md) for seam techniques,
dependency breaking, and snapshot hygiene.

## Best Practices

- **One assertion of intent per test.** Multiple `assert` lines are fine when
  they describe one behaviour; two behaviours belong in two tests.
- **Name tests after behaviour, not implementation.** `rejects_refund_above_charge`
  survives a rewrite; `test_refund_method_branch_2` does not.
- **Keep the loop fast.** If the suite takes minutes, run a focused subset during
  the loop and the full suite before each commit.
- **Let the test drive the interface.** Difficulty writing the test is design
  feedback: it usually means too many dependencies or hidden state.
- **Commit at green.** Each cycle that ends green is a safe point to commit.
- **Delete tests that no longer earn their place.** Coverage of deleted
  behaviour is noise.

## Anti-Patterns

### Writing the test after the code

The test then encodes what the code does, not what it should do. It passes
immediately, was never observed failing, and provides no design pressure. If the
code is already written, use a characterisation test and say so — do not pretend
it was test-first.

### Testing implementation details

Asserting on private methods, call counts, or internal state couples the test to
the current implementation. Every refactor breaks the suite, so the suite gets
weakened or deleted.

### Over-mocking

Mocking everything the unit touches produces a test that verifies the mocks. Mock
at genuine boundaries — network, clock, filesystem, payment provider — and use
real objects inside the unit.

### Skipping refactor

Green then straight to the next test accumulates duplication until the design
collapses. The refactor step is where TDD pays for itself.

### Chasing a coverage number

Coverage measures lines executed, not behaviour specified. A suite at 95 % that
asserts nothing meaningful is worse than 60 % of sharp tests, because it buys
false confidence.

### One giant cycle

Writing ten failing tests then making them all pass is not TDD; it is
test-first-then-a-long-debug. Keep the loop at one test.

## Reference Documentation

- [Legacy Code Strategies](references/LEGACY_CODE.md) — seams, dependency
  breaking, characterisation and snapshot tests
- [Worked Examples](references/EXAMPLES.md) — full cycles in TypeScript, Python
  and Go, including a bug-fix cycle

## Resources

- Kent Beck, _Test-Driven Development: By Example_ — the original loop
- Michael Feathers, _Working Effectively with Legacy Code_ — seams and
  characterisation tests
- Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided by Tests_
- Martin Fowler, [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- Martin Fowler, [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
