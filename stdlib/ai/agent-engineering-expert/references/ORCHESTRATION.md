# Agent Engineering — Orchestration Patterns

Reference material for the `agent-engineering-expert` skill. See [SKILL.md](../SKILL.md).

Patterns are ordered by autonomy. Start at the top and move down only when the
simpler pattern demonstrably fails — each step down costs reliability,
debuggability and money.

## 1. Single Call

No loop. One model call with a constrained output.

```python
def classify(ticket: str) -> Category:
    return Category.model_validate_json(
        model.call(CLASSIFY_PROMPT, ticket, response_schema=Category.schema())
    )
```

Deterministic control flow, one point of failure, trivially testable. A
surprising share of "agent" requirements are this.

## 2. Chain

Fixed stages, each with a narrow contract, validated between steps.

```python
def process_contract(text: str) -> Report:
    clauses = extract_clauses(text)                    # extraction
    classified = [classify(c) for c in clauses]        # classification
    risks = [assess(c) for c in classified if c.risky] # assessment
    return Report(clauses=classified, risks=risks)
```

Each stage is separately evaluable and can use a different model size. Validate
between stages so a bad intermediate result fails fast rather than propagating.

## 3. Routing

One classification decides which specialised path runs.

```python
ROUTES = {
    "billing": billing_chain,
    "technical": technical_chain,
    "account": account_chain,
}

def handle(ticket: str) -> Response:
    route = classify_route(ticket)
    if route.confidence < 0.7:
        return escalate_to_human(ticket, reason="low routing confidence")
    return ROUTES[route.category](ticket)
```

The confidence floor matters more than the routing prompt: a wrong route sends
the request into a chain with the wrong tools, and the failure is confusing
rather than obvious.

## 4. Parallel with Merge

Independent subtasks run concurrently, then a defined rule combines them.

```python
async def review(diff: str) -> ReviewResult:
    results = await asyncio.gather(
        analyse(diff, dimension="correctness"),
        analyse(diff, dimension="security"),
        analyse(diff, dimension="performance"),
    )
    findings = [f for r in results for f in r.findings]
    return ReviewResult(findings=dedupe_by_location(rank_by_severity(findings)))
```

Define the merge rule explicitly, including conflicts. "Whatever the last one
said" is a rule, and a bad one. Bound concurrency — twenty parallel calls will
find your rate limit.

## 5. Evaluator–Optimiser

Generate, critique against explicit criteria, revise. Bounded.

```python
def draft(brief: str, max_rounds: int = 3) -> str:
    text = generate(brief)
    for _ in range(max_rounds):
        critique = evaluate(text, CRITERIA)
        if critique.acceptable:
            return text
        text = revise(text, critique.issues)
    return text                    # return the best effort, flagged
```

Works when the criteria are checkable. Fails when "better" is undefined — the
loop then oscillates and burns the budget. Always cap the rounds and return
something.

## 6. Supervisor

A coordinator delegates to specialists it selects at runtime.

```python
class Supervisor:
    def run(self, goal: str, budget: Budget) -> Result:
        state = State(goal=goal)
        while not state.complete and not budget.exhausted():
            step = self.plan(state)                    # which specialist, what task
            if step.done:
                return Result.finished(state.summary())
            outcome = self.specialists[step.agent].run(step.task, budget.child())
            state = state.with_outcome(step, outcome)  # explicit, inspectable state
        return Result.stopped("budget exhausted", state)
```

The supervisor is a bottleneck and a single point of failure, and its context
grows with every outcome. Keep the state object structured and summarised rather
than accumulating raw transcripts.

## 7. Autonomous Loop

The full loop from the main skill: the model plans, acts and re-plans without a
fixed structure. Maximum flexibility, minimum predictability. Justify it.

## State Machines for Long-Running Work

Anything spanning minutes, approvals or restarts needs explicit, persisted state.

```python
class RunState(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"

TRANSITIONS = {
    RunState.PENDING: {RunState.RUNNING, RunState.FAILED},
    RunState.RUNNING: {RunState.AWAITING_APPROVAL, RunState.COMPLETED, RunState.FAILED},
    RunState.AWAITING_APPROVAL: {RunState.RUNNING, RunState.FAILED},
}

def transition(run: Run, to: RunState) -> None:
    if to not in TRANSITIONS.get(run.state, set()):
        raise InvalidTransition(f"{run.state} -> {to}")
    run.state = to
    run.save()                      # persisted, so a restart resumes
```

Persist after every step. An agent that loses its work when the process restarts
is unusable in production, and re-running from the start repeats side effects.

## Retries and Idempotency

Agents retry: the model retries tools, the infrastructure retries the agent.

```python
def execute(call: ToolCall, run_id: str, attempt: int) -> ToolResult:
    key = f"{run_id}:{call.name}:{stable_hash(call.arguments)}"
    if cached := results.get(key):
        return cached                                  # replay, do not re-execute

    try:
        result = TOOLS[call.name](**call.arguments, idempotency_key=key)
    except TransientError:
        if attempt >= 3:
            return ToolResult.error("temporarily unavailable; try a different approach")
        sleep(backoff_with_jitter(attempt))
        return execute(call, run_id, attempt + 1)
    except ValidationError as exc:
        return ToolResult.error(str(exc))               # actionable: model can correct

    results.set(key, result)
    return result
```

Distinguish the three error classes and handle each differently: transient
(retry), validation (return to the model to fix), permanent (stop the run).
Returning a raw stack trace to the model wastes context and teaches it nothing.

## Human-in-the-Loop

```python
def run_with_approval(goal: str, budget: Budget) -> Result:
    result = agent.run(goal, budget)
    while result.awaiting_approval:
        approval = wait_for_approval(result.pending_call, timeout=timedelta(hours=4))
        if not approval.granted:
            return Result.rejected(approval.reason)
        result = agent.resume(result.checkpoint, approval)
    return result
```

Requirements that make this work: the run is persisted so it survives a restart,
the approval request expires, and resumption re-validates the world rather than
trusting the state captured before the pause. Balances change while a human is
deciding.

## Observability

Trace the run, not just the calls. Without a per-run view, debugging is guesswork.

```python
with tracer.start_as_current_span("agent.run") as run_span:
    run_span.set_attribute("agent.goal_hash", stable_hash(goal))
    for step in loop:
        with tracer.start_as_current_span("agent.step") as span:
            span.set_attribute("agent.step_index", step.index)
            span.set_attribute("agent.tool", step.tool_name)
            span.set_attribute("agent.tokens", step.usage.total)
            span.set_attribute("agent.cost_usd", step.cost)
```

Track per run: steps taken, tools used and in what order, total cost, wall time,
outcome, and whether a budget was hit. The distributions matter — a rising median
step count is the earliest sign that a prompt or tool change has degraded
selection.

## Evaluating Agents

Final-answer accuracy is insufficient. Score the trajectory:

- **Task success** — was the goal achieved?
- **Path validity** — were the tool calls sensible, or lucky?
- **Efficiency** — steps and cost against a reference solution
- **Safety** — did any call require approval that was not requested? Did an
  injected instruction change behaviour?

Keep a fixed scenario set with recorded tool responses so runs are comparable.
Include adversarial scenarios: a document containing an injected instruction, a
tool returning an error, a tool returning a plausible lie.
