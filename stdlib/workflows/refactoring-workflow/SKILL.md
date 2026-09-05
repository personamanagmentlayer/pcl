---
name: refactoring-workflow
version: 1.0.0
description: >-
  Improve the structure of existing code without changing its behaviour, in small verified
  steps under a green test suite. Use when the user asks to refactor, clean up, restructure
  or simplify code, wants to reduce duplication or coupling, is preparing a codebase for a
  feature it cannot currently accommodate, or when the task involves extracting functions,
  splitting modules, breaking dependencies, or paying down technical debt.
category: workflows
tags:
  [
    refactoring,
    technical-debt,
    code-quality,
    architecture,
    coupling,
    duplication,
    workflow,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, npx:*, pnpm:*, yarn:*, pytest:*, python:*, python3:*, go:*, cargo:*, mvn:*, gradle:*, git:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# Refactoring Workflow

Refactoring is changing the structure of code **without changing its
behaviour**. If behaviour changes, it is not a refactor — it is a rewrite, and
it needs a different plan and a different review.

## When to Use This Skill

- The user asks to refactor, clean up, restructure or simplify
- A feature is hard to add because the current structure resists it
- Duplication has reached the point where a change must be made in several places
- A module has grown beyond what one reader can hold in mind
- Coupling makes a unit impossible to test in isolation

Do **not** refactor when the tests are red, when you do not understand the
current behaviour, or as a side quest inside a feature branch. Refactoring
merged together with behaviour change is unreviewable.

## Core Concepts

### The Two Hats

You are either adding behaviour or restructuring — never both in the same edit.
Kent Beck's metaphor: swap hats deliberately, and know which one you are wearing.
When a refactor reveals a bug, note it and finish the refactor; fix the bug in a
separate change with its own test.

### The Precondition

A refactor is safe only to the extent that behaviour is observable. That means a
green test suite covering the paths you will touch. Without it you are not
refactoring, you are editing and hoping.

If coverage is missing, stop and add characterisation tests first — see the
`tdd-workflow` skill, which covers seams and characterisation in depth.

### Small Steps

Each step should be small enough that you can name what it did and revert it
alone. Run the suite after every step. Two hours of unverified restructuring
followed by a red suite gives you no information about which edit broke it.

### Make the Change Easy, Then Make the Easy Change

When a feature is hard to add, do not force it into the existing shape. First
refactor until the feature becomes a small addition, then add it. These are two
commits, in that order.

## The Workflow

### 1. Confirm green and clean

```bash
git status --short      # working tree must be clean
npm test                # suite must be green
```

A dirty tree makes it impossible to distinguish your refactor from unrelated
edits. Commit or stash first.

### 2. Name the smell and the target

Write down, in one sentence, what is wrong and what shape you want.

> "`OrderService.submit` mixes validation, pricing and persistence in 180 lines;
> extract three collaborators so each can be tested alone."

If you cannot name the target shape, you are not ready. Explore first.

### 3. Characterise if coverage is thin

Check what the affected paths actually execute:

```bash
pytest --cov=orders --cov-report=term-missing tests/orders
```

Add characterisation tests for uncovered branches you intend to touch. Commit
that safety net **separately**, so a reviewer can see it changed no behaviour.

### 4. Apply one transformation

Prefer transformations your tooling can verify. Ordered by safety:

| Transformation                        | Verified by        | Risk     |
| ------------------------------------- | ------------------ | -------- |
| Rename symbol                         | IDE / compiler     | Very low |
| Extract variable                      | Compiler           | Very low |
| Extract function                      | Compiler           | Low      |
| Inline function                       | Compiler           | Low      |
| Move function between modules         | Compiler + imports | Medium   |
| Introduce parameter object            | Compiler           | Medium   |
| Replace conditional with polymorphism | Tests only         | High     |
| Change data structure                 | Tests only         | High     |

Use the IDE's automated refactor where one exists. A hand-edited rename across
40 files is a source of bugs; the tool's version is not.

### 5. Run the suite

After every transformation, not every session. If it goes red, revert the last
step rather than debugging forward — you know exactly what caused it.

```bash
npm test && git commit -m "refactor: extract PriceCalculator from OrderService"
```

### 6. Repeat, then stop

Return to step 4. Stop when the target shape from step 2 is reached — not when
the file looks pretty. Scope creep in a refactor is how a one-day change becomes
a three-week branch nobody can review.

### 7. Verify behaviour is unchanged

Beyond the suite: check the public surface did not move.

```bash
git diff main --stat                       # size and spread of the change
git diff main -- '*.d.ts' 'openapi.yaml'   # did the contract change?
```

If a public signature changed, it is no longer a pure refactor. Say so in the
commit message and treat it as a breaking change.

## Recognising What to Change

Refactor in response to a concrete difficulty, never to taste. Each smell below
is worth acting on only when it is currently costing you something.

- **Shotgun surgery** — one conceptual change requires edits in many files.
  Usually means a concept has no home. Introduce one.
- **Divergent change** — one file changes for many unrelated reasons. It holds
  several responsibilities; split along the reasons it changes.
- **Feature envy** — a function uses another object's data more than its own.
  Move it to where the data lives.
- **Primitive obsession** — money as `float`, identifiers as bare strings,
  states as magic constants. Introduce the type; the compiler starts helping.
- **Long parameter list** — often a missing object, or a function doing several
  jobs.
- **Repeated conditional on type** — the same `if kind == ...` in several places
  is a missing polymorphic boundary.

Duplication deserves its own rule: **duplicate twice before abstracting**. A
premature abstraction over two superficially similar cases is harder to undo
than the duplication it removed.

## Best Practices

- **One refactor per commit**, with a message naming the transformation.
- **Never mix a refactor with a behaviour change.** If you must, split the branch.
- **Keep the suite fast enough to run every step.** If it is not, run the
  affected subset per step and the full suite per commit.
- **Prefer deletion.** Removing dead code is the cheapest refactor and the only
  one with no regression risk beyond "was it really dead?" — check with coverage
  and logs, not intuition.
- **Refactor toward the next feature**, not toward an abstract ideal. Structure
  earns its keep by making a concrete upcoming change easy.
- **Leave the campsite tidy, not rebuilt.** Opportunistic cleanup in a feature
  branch is fine when it is small and adjacent; a rewrite is not.

## Anti-Patterns

### Refactoring without tests

The most common way a refactor introduces a bug. Untested code is not
refactorable; it is only editable. Add the net first.

### The big-bang rewrite disguised as a refactor

A branch that touches 200 files over three weeks cannot be reviewed and cannot be
merged cleanly. Break it into shippable steps, each green and each merged.

### Refactoring on the way to a fix

The bug fix becomes unreviewable and the refactor becomes unrevertable. Fix
first with a regression test, refactor after.

### Abstracting on the second occurrence

Two similar things are often coincidence. The abstraction you invent at two
usually fits neither at four, and removing it costs more than the duplication.

### Changing public contracts silently

Renaming an exported symbol, altering a response shape, or reordering parameters
is a breaking change even when the tests pass, because your tests are not the
only caller.

### Refactoring what is about to be deleted

Check the roadmap before improving a module scheduled for removal.

## Reference Documentation

- [Transformation Catalogue](references/TRANSFORMATIONS.md) — step-by-step
  mechanics for the common refactorings, with before and after
- [Large-Scale Refactoring](references/LARGE_SCALE.md) — branch by abstraction,
  strangler fig, parallel change, and how to keep a long migration shippable

## Resources

- Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.)
- Michael Feathers, _Working Effectively with Legacy Code_
- Martin Fowler, [Refactoring catalogue](https://refactoring.com/catalog/)
- Martin Fowler, [Branch By Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html)
- Martin Fowler, [Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)
