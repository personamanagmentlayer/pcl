---
name: code-review-workflow
version: 1.0.0
description: >-
  Review a change in a fixed order — context, correctness, security, then style — and write
  feedback that is actionable and ranked by severity. Use when the user asks for a code
  review, wants a pull request or diff reviewed before merge, asks whether a change is safe
  to ship, or when the task involves reviewing a patch, giving review feedback, triaging
  review comments, or setting review standards for a team.
category: workflows
tags:
  [
    code-review,
    pull-request,
    feedback,
    quality-gate,
    correctness,
    security-review,
    workflow,
  ]
allowed-tools:
  - Read
  - Bash(git:*, gh:*, npm:*, npx:*, pytest:*, go:*, cargo:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: intermediate
---

# Code Review Workflow

The procedure for reviewing a change. For the body of knowledge behind the
judgements — what good code looks like per dimension — use the
`code-review-expert` skill; this skill is the order of operations and the shape
of the output.

## When to Use This Skill

- The user asks to review a pull request, a diff or a patch
- A change needs assessment before merge or deploy
- The user asks "is this safe to ship?"
- Review feedback needs triaging or prioritising
- A team wants a review standard defined

## Core Concepts

### Order Matters

Reviewing in a fixed order prevents the common failure: spending the whole
review on naming and never reaching the concurrency bug. Correctness and
security are examined while attention is fresh; style comes last because it is
the cheapest to fix and the easiest to automate away.

### Severity, Not Volume

Twelve comments of equal weight leave the author guessing. Every comment carries
a severity, and a review with no blocking comments says so explicitly.

| Severity      | Meaning                                   | Merge                  |
| ------------- | ----------------------------------------- | ---------------------- |
| **Blocking**  | Incorrect, unsafe, or loses data          | No                     |
| **Important** | Should change, but not a correctness risk | Author's call, argued  |
| **Minor**     | Improvement, preference with a reason     | Optional               |
| **Question**  | Reviewer does not understand yet          | Answer, may reclassify |

### A Finding Needs a Failure

An assertion that something is wrong must come with the input, state or sequence
that makes it wrong. "This could race" is an opinion; "two requests for the same
order both pass the check at line 41 and both insert" is a finding.

### Review the Change, Not the Codebase

Pre-existing problems the diff merely touches are not this author's to fix.
Note them separately, as a follow-up, not as a merge condition.

## The Workflow

### 1. Establish context before reading code

```bash
gh pr view 482                                  # title, description, linked issue
gh pr diff 482 --name-only                      # what is touched
git log --oneline main..HEAD                    # how it was built
gh pr checks 482                                # does CI pass?
```

Answer three questions before the first line of the diff: what problem does this
solve, does the approach fit the codebase, and is the change the right size? If
the approach is wrong, say so now — detailed line comments on code that should
not exist waste everyone's time.

### 2. Map the blast radius

```bash
gh pr diff 482 --stat
git diff main...HEAD -- '*.sql' '*.d.ts' 'openapi.*'   # contracts and schema
grep -rn "functionYouChanged" --include='*.ts' src/    # who calls it
```

Flag anything that changes a public contract, a database schema, a queue message
shape or a permission — those need an explicit compatibility answer.

### 3. Correctness

Read the diff for behaviour, holding these questions:

- What happens at the boundaries: empty, one, maximum, negative, null?
- What happens when this runs twice concurrently, or is retried?
- Which errors can this raise, and is each handled or deliberately propagated?
- Does the state stay consistent if it fails halfway?
- Do the tests exercise the behaviour, or only the happy path?

### 4. Security

Independent of correctness, and never skipped:

- **Authorisation checked per object**, not only per route
- **Input validated** server-side, with a positive rule rather than a denylist
- **Queries parameterised**; no string-built SQL, shell or paths
- **Secrets** from configuration, absent from code, logs and errors
- **Errors fail closed** and leak nothing about internals
- **New dependency** justified, maintained, and pinned

### 5. Design and maintainability

Only once the above is clear: naming, duplication that now hurts, functions that
do several jobs, abstractions that do not pay for themselves.

### 6. Tests

Ask whether the tests would fail if the behaviour regressed. Coverage that
asserts nothing is worse than none, because it buys false confidence. Check that
a bug fix carries a test that fails without the fix.

### 7. Verify claims you can check

Do not take the description on trust when verification is cheap:

```bash
gh pr checkout 482
npm test
npm run typecheck && npm run lint
git diff main --stat            # does the size match the description?
```

### 8. Write the review

Lead with the verdict, then ranked findings, then the good parts. Comment on
lines for specifics; keep the summary for the decision.

## Writing a Comment

A useful comment has three parts: what, why, and a way forward.

> **Blocking — `orders.py:88`.** Two concurrent requests for the same order both
> pass the `status == 'pending'` check before either writes, so the order is
> shipped twice. The check and the update need to be atomic — a conditional
> update (`UPDATE ... WHERE status = 'pending'`) and a check on the affected row
> count would do it without a lock.

Compare with "this is racy", which asserts without evidence and leaves the author
to guess the fix.

Phrase questions as questions when you are genuinely unsure. "What happens if
`items` is empty?" is honest and costs nothing if the answer is fine. Asserting
a bug that turns out not to exist costs credibility for the next review.

## Best Practices

- **Review small changes.** Above roughly 400 lines defect detection collapses.
  Ask for a split rather than skimming.
- **Respond within a working day.** Review latency is the largest hidden cost in
  most teams' throughput.
- **Automate style entirely.** Formatter and linter in CI; a human commenting on
  formatting is waste.
- **Approve with minor comments** rather than blocking on preferences. Reserve
  blocking for correctness, security and data.
- **Say what is good**, specifically. It calibrates the author on what to repeat.
- **Prefer suggestions over instructions** where the choice is genuinely open.
- **Escalate after two rounds.** A disagreement that survives two exchanges needs
  a conversation, not a third thread.
- **Re-review only the delta** on subsequent rounds.

## Anti-Patterns

### The style review

Twenty comments on naming and spacing, none on the transaction that is not
rolled back. If style comments outnumber substance, the linter is missing.

### Rubber stamping

"LGTM" on 900 lines in two minutes. Better to state the limit honestly: "I
reviewed the API layer; someone should look at the migration."

### Design debate at line level

Fundamental disagreements do not fit in a comment thread. Move to a call or a
document and record the outcome.

### The blocking preference

Holding a merge over a stylistic choice with no stated cost. If it is not
correctness, security or data, it is not blocking.

### Reviewing the author

"You always forget this." Address the change, not the person.

### Silent scope demands

Requiring a refactor of surrounding code as a merge condition. Note it as a
follow-up with an owner.

## Reference Documentation

- [Review Checklists](references/CHECKLISTS.md) — per-change-type checklists for
  API changes, schema migrations, dependency bumps, concurrency and
  infrastructure

## Resources

- `code-review-expert` — the knowledge behind the judgements in step 3 to 6
- Google, [Engineering Practices: Code Review](https://google.github.io/eng-practices/review/)
- SmartBear, [Best Practices for Peer Code Review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- Conventional Comments, [conventionalcomments.org](https://conventionalcomments.org/)
