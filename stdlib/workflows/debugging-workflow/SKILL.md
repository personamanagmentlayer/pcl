---
name: debugging-workflow
version: 1.0.0
description: >-
  Find the cause of a defect by hypothesis and bisection rather than by guessing, then fix it
  behind a regression test. Use when the user reports a bug, a crash, a test that fails
  intermittently, a performance regression or a production incident, asks why code behaves
  unexpectedly, or when the task involves reproducing a failure, isolating a root cause,
  git bisect, flaky tests, or reading a stack trace.
category: workflows
tags:
  [
    debugging,
    root-cause-analysis,
    bisection,
    flaky-tests,
    stack-trace,
    observability,
    regression,
    workflow,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, npx:*, pnpm:*, yarn:*, pytest:*, python:*, python3:*, go:*, cargo:*, git:*, docker:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# Debugging Workflow

Debugging is a search over hypotheses, not an inspection of code. The fastest
route to a cause is a sequence of experiments that each halve the space of
possible explanations.

## When to Use This Skill

- A defect has been reported and the cause is unknown
- A test fails intermittently
- Behaviour differs between environments
- A performance or memory regression appeared
- Something worked before and does not now
- The user asks "why does this happen?" about running code

If the cause is already known, skip this and fix it. This procedure is for the
case where you do not yet know.

## Core Concepts

### Reproduce Before Reading

Until you can make the failure happen on demand, you cannot tell a fix from a
coincidence. A reliable reproduction is the single highest-value artefact in
debugging, and it is worth spending real time on. Everything after it is faster.

### Hypothesis, Prediction, Experiment

Each step states a hypothesis, predicts an observable consequence, and runs the
cheapest experiment that would refute it. Refutation is the goal: a test that
can only confirm teaches nothing.

> Hypothesis: the cache returns a stale tenant after a failover.
> Prediction: the returned object's `tenant_id` differs from the request's.
> Experiment: log both at the cache boundary for one request.

### Bisection

Halve the search space rather than walking it. Bisect over commits (`git
bisect`), over input (shrink the failing payload), over the stack (which layer
still sees correct data), or over configuration (which flag flips it).

### Cause, Not Symptom

The first explanation that makes the symptom disappear is usually not the cause.
Keep asking what produced the state you found, until the answer is a decision
someone made rather than a value that was wrong.

## The Workflow

### 1. Capture the report precisely

What was expected, what happened, and the exact context: version, environment,
input, timestamp, user. Vague reports cost more than they save. Get the trace
or correlation id if there is one.

### 2. Reproduce

Start from the reported conditions and simplify until it is deterministic and
fast.

```bash
# Pin the version the report came from
git checkout v4.11.2

# Reproduce, capturing everything
LOG_LEVEL=debug pytest -q tests/test_invoices.py::test_eu_vat -x --tb=long 2>&1 | tee /tmp/repro.log
```

If it will not reproduce, the difference between your environment and the
reported one _is_ the bug's habitat: data, timezone, locale, concurrency, clock,
cache state, feature flag. Enumerate those differences and vary them one at a
time.

### 3. Turn the reproduction into a failing test

Before diagnosing, encode the failure as a test. It becomes the regression test
later, and it removes any ambiguity about whether the fix worked.

```python
def test_eu_vat_applied_to_reverse_charge_invoice():
    invoice = build_invoice(country="DE", vat_id="DE811907980", net=Decimal("100"))
    assert invoice.vat == Decimal("0")     # currently 19.00
```

### 4. Read the evidence you already have

Before adding instrumentation, use what exists. Read the stack trace properly:
the top frame is where it surfaced, not necessarily where it originated. Scan
outward for the first frame in your own code.

```bash
grep -n "correlation_id=7f3a" /var/log/app/*.log | head -50
git log --oneline -20 -- src/billing/vat.py
git log -S "reverse_charge" --oneline          # when did this string appear?
```

### 5. Bisect

**Over history**, when it used to work:

```bash
git bisect start
git bisect bad HEAD
git bisect good v4.9.0
git bisect run pytest -q tests/test_invoices.py::test_eu_vat
git bisect reset
```

`git bisect run` with a scripted check is worth the setup: it is exact and it
does not get bored.

**Over input**, when a large payload fails: delete half, re-run, keep the half
that still fails. Repeat until removing anything makes it pass. The residue is
the trigger.

**Over the stack**, when the data is wrong: assert the invariant at the boundary
between layers. The first boundary where it does not hold contains the defect.

### 6. Instrument at the boundary you suspect

Add temporary, high-signal output — not a scatter of prints.

```python
logger.debug(
    "vat.decision country=%s vat_id=%r reverse_charge=%s rate=%s",
    country, vat_id, is_reverse_charge, rate,
)
```

Log the _inputs to the decision_ and the decision, not the internals in between.
Remove this instrumentation before committing, or promote it to a permanent
structured log if it earned its place.

### 7. Confirm the cause by control

You have the cause when you can turn the failure on and off at will. Change the
suspected input, see the symptom appear and disappear. Without this step you have
a correlation.

### 8. Fix, then verify the test flips

Run the test from step 3: it must fail before the fix and pass after. If it
passed before the fix, it was not testing the defect.

### 9. Widen once

Ask where else this cause applies. A rounding error in one calculator usually has
siblings. Grep for the pattern, not the symptom.

### 10. Record what escaped

Note briefly why existing tests, types or review did not catch it. That is the
finding worth keeping — the fix is the cheap part.

## Flaky Tests

A flaky test is a defect in the test, the code, or the assumption that they are
independent. Never re-run until green and move on.

1. **Quantify** it — run it many times to get a real failure rate.

```bash
pytest tests/test_sync.py::test_ordering --count=200 -x -q   # pytest-repeat
go test -run TestOrdering -count=200 -race ./...
```

2. **Classify** the cause. The usual four:
   - **Order dependence** — passes alone, fails in suite. Run with a fixed seed
     and shuffle: `pytest -p no:randomly` versus `--randomly-seed=12345`.
   - **Time** — timeouts near the boundary, midnight, DST, leap day. Inject the
     clock instead of sleeping.
   - **Concurrency** — unsynchronised shared state. Run under `-race` or a thread
     sanitiser; these find real bugs the test merely exposed.
   - **External state** — shared database rows, ports, temp files, network.
     Isolate per test.

3. **Fix the cause.** Adding a `sleep` or a retry converts a visible defect into
   a slow, invisible one.

4. **Quarantine only with an owner and a deadline.** An unowned quarantine is
   deletion with extra steps.

## Best Practices

- **Change one thing at a time.** Two simultaneous changes make the result
  uninterpretable.
- **Write down each hypothesis and its outcome.** Twenty minutes in, memory is
  not reliable, and the list stops you retesting a refuted idea.
- **Timebox and switch strategy.** If 30 minutes of reading has not narrowed it,
  bisect instead.
- **Trust measurement over intuition**, especially for performance. Profile;
  the bottleneck is routinely somewhere nobody predicted.
- **Keep the reproduction.** It becomes the regression test.
- **Prefer the debugger to print statements** for control flow, and structured
  logs for production. Conditional breakpoints beat re-running to iteration 4000.
- **Read the error message completely**, including the parts that look like
  boilerplate. The cause is often named there.

## Anti-Patterns

### Changing code before reproducing

Every edit becomes an uncontrolled variable, and a fix that appears to work may
have only changed the timing.

### Fixing the symptom

Clamping a negative value hides the arithmetic that produced it, and the same
cause resurfaces elsewhere in a form you will not recognise.

### Shotgun debugging

Changing several things hoping one helps. If it works you do not know why, so you
cannot tell whether it is fixed.

### Blaming the platform first

The compiler, the database and the standard library are almost never wrong. Treat
that hypothesis as the last one, not the first.

### Trusting a green re-run

An intermittent failure that passes on retry is unresolved, and it will return
during a release.

### Deleting the reproduction after fixing

Throwing away the one artefact that proves the bug existed leaves nothing to
prevent its return.

## Reference Documentation

- [Diagnostic Toolkit](references/TOOLKIT.md) — debuggers, profilers, tracing,
  memory and concurrency tools, with the command lines that matter
- [Production Debugging](references/PRODUCTION.md) — debugging what you cannot
  reproduce locally: correlation ids, sampling, core dumps, safe live inspection

## Resources

- David Agans, _Debugging: The 9 Indispensable Rules_
- Brendan Gregg, _Systems Performance_ — method before tools
- Brendan Gregg, [USE Method](https://www.brendangregg.com/usemethod.html)
- [git-bisect documentation](https://git-scm.com/docs/git-bisect)
- Google SRE Workbook, [Effective Troubleshooting](https://sre.google/workbook/)
