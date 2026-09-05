---
name: llm-engineering-expert
version: 1.0.0
description: >-
  Build reliable applications on large language models: prompt design, structured output,
  evaluation, guardrails, and cost and latency control. Use when the user mentions LLMs,
  prompts, prompt engineering, few-shot examples, structured or JSON output, function
  calling, hallucination, model evaluation, token costs, streaming, or when the task
  involves choosing a model, writing a system prompt, or making model output dependable
  enough for production.
category: ai
tags:
  [
    llm,
    prompt-engineering,
    structured-output,
    evaluation,
    guardrails,
    hallucination,
    tokens,
    cost-optimisation,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, python3:*, pip:*, pytest:*, npm:*, npx:*)
  - Grep
  - Glob
  - WebSearch
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# LLM Engineering Expert

Building on a language model is engineering against a component that is
non-deterministic, occasionally confident and wrong, and priced per token. The
discipline is in the surrounding structure, not in the wording of prompts.

## Core Concepts

### The Model Is a Component, Not the System

A production LLM feature is a pipeline: input validation, context assembly, the
model call, output parsing and validation, then a decision about what to do when
any of that fails. Treating the model call as the whole feature is the root of
most reliability problems.

### Determinism Is Not Available

Even at temperature zero, output can vary across model versions, infrastructure
and batching. Design for a distribution of outputs, not a fixed one: validate
what comes back, and make the failure path as considered as the success path.

### Context Is a Budget

Everything competes for the same window: system instructions, examples,
retrieved documents, conversation history, the user's input, and room for the
answer. Attention is not uniform across a long context — material at the
beginning and end is used more reliably than material buried in the middle.
Spend the budget deliberately.

### Evaluation Precedes Iteration

Without a scored test set, prompt changes are superstition. Ten to fifty
representative cases with expected properties are enough to start and will catch
most regressions.

## Prompt Design

### Structure that holds up

Order matters: instructions first, reference material next, the specific request
last. Ending with the request keeps it close to generation.

```python
SYSTEM = """You extract structured invoice data.

Rules:
- Return only fields present in the document. Never infer a missing value.
- Amounts are decimal strings with two places, e.g. "1234.50".
- If the document is not an invoice, set "is_invoice" to false and stop.
- Dates are ISO 8601 (YYYY-MM-DD).
"""

USER = """<document>
{document_text}
</document>

Extract the invoice fields defined by the schema."""
```

What earns its place: an explicit role, hard constraints stated as rules, a
defined behaviour for the out-of-scope case, and delimiters that separate
untrusted content from instructions.

What does not: politeness, threats, "you are the world's best", and repeated
emphasis. They consume budget and do not measurably improve output.

### Few-shot examples

Two to five examples usually beat both zero and twenty. Choose them to cover the
decision boundaries you care about — especially the case you keep getting wrong,
and at least one negative or refusal case. Keep formatting identical across
examples; inconsistency is learned as signal.

### Give the model somewhere to think

For multi-step reasoning, let it work before it answers, then separate the
reasoning from the result so parsing stays simple.

```xml
<thinking>Work through the calculation here.</thinking>
<answer>{"total": "1234.50"}</answer>
```

Reasoning-tuned models do this internally; adding your own scaffold on top of
them can hurt. Test rather than assume.

## Structured Output

Never parse prose you did not constrain. Use the provider's schema-constrained
output where available, and validate regardless.

```python
from pydantic import BaseModel, Field, ValidationError
from decimal import Decimal

class Invoice(BaseModel):
    is_invoice: bool
    invoice_number: str | None = None
    issued_on: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    total: Decimal | None = None
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")

def extract(document_text: str) -> Invoice:
    raw = call_model(SYSTEM, USER.format(document_text=document_text),
                     response_schema=Invoice.model_json_schema())
    try:
        return Invoice.model_validate_json(raw)
    except ValidationError as exc:
        # One repair attempt with the error, then fail closed.
        repaired = call_model(SYSTEM, REPAIR_PROMPT.format(raw=raw, errors=exc))
        return Invoice.model_validate_json(repaired)
```

Validation must be structural **and** semantic. A well-formed JSON object whose
`total` does not equal the sum of its line items is still wrong; check the
invariants your domain requires.

## Evaluation

### Build the set before tuning

```python
CASES = [
    {"input": "...", "expect": {"is_invoice": True, "currency": "EUR"}},
    {"input": "...", "expect": {"is_invoice": False}},          # negative case
    {"input": "...", "expect": {"total": Decimal("0.00")}},     # edge case
]

def score(case) -> bool:
    got = extract(case["input"])
    return all(getattr(got, k) == v for k, v in case["expect"].items())
```

Run the set on every prompt or model change and record the score. A change that
improves your favourite example and drops the aggregate is a regression.

### Choosing a metric

| Output kind                 | Metric                                                  |
| --------------------------- | ------------------------------------------------------- |
| Extraction, classification  | Exact match, precision and recall per field             |
| Generation with a reference | Semantic similarity; keep a human spot check            |
| Free-form quality           | Model-as-judge with a rubric, calibrated against humans |
| Factuality against sources  | Claim-level grounding, checked per claim                |

Model-as-judge is useful and biased: it favours verbosity and its own style.
Calibrate it against human labels on a sample before trusting it, and never
judge with the same model that generated the output when you can avoid it.

## Guardrails

- **Validate the input.** Length limits, content type, and a policy check before
  spending a call.
- **Treat retrieved and user content as untrusted data.** Delimit it, and never
  let it be read as instructions. Prompt injection is the central security
  problem of this component — see the `agent-engineering-expert` skill.
- **Constrain the blast radius.** A model that can only return a value is safe;
  one that can trigger an action needs the same authorisation checks as any
  other caller.
- **Fail closed.** When validation fails twice, return an error to the caller.
  Do not pass through unvalidated output.
- **Log the decision inputs** — model, version, prompt hash, token counts,
  latency, outcome — without logging customer content by default.

## Cost and Latency

The levers, in order of typical effect:

1. **Right-size the model.** Route simple cases to a small model and escalate
   only on low confidence. Most workloads are dominated by easy cases.
2. **Cache the stable prefix.** Long system prompts and shared context are
   cacheable by most providers, cutting both cost and time to first token.
3. **Cut the context.** Retrieved chunks are the usual bloat; more context is
   not more accuracy past the point of relevance.
4. **Cap the output.** Output tokens usually cost several times input tokens.
5. **Batch offline work.** Asynchronous batch tiers are markedly cheaper when
   latency does not matter.
6. **Stream** when a human is waiting: it does not reduce cost, but it changes
   perceived latency more than any optimisation.

Measure cost per successful outcome, not per call. A cheap model that needs
three attempts and a repair is not cheap.

## Best Practices

- **Version prompts like code.** Store them in the repository, review changes,
  and record which version produced which output.
- **Pin the model version.** Provider defaults move; pin explicitly and upgrade
  deliberately with the eval set as the gate.
- **Set a timeout and a retry budget** with backoff and jitter on every call.
- **Separate the system prompt from user content** structurally, not by
  concatenation.
- **Keep a human in the loop** for anything irreversible.
- **Write the failure path first.** What the feature does when the model is
  unavailable, slow, or wrong is a product decision, not an afterthought.

## Anti-Patterns

### Prompt-tweaking without evaluation

Changing wording, checking one example, and shipping. Regressions land silently
because nothing measured them.

### Parsing unconstrained prose

Regexing a number out of a sentence works until the model phrases it differently.
Constrain the output shape and validate it.

### Stuffing the context

Sending everything available in the hope something helps. It raises cost and
latency, and buries the relevant material.

### Trusting a confident answer

Fluency is uncorrelated with accuracy. Anything factual needs grounding in a
source or verification against one.

### Retrying identically on a bad output

The same input with the same prompt tends to fail the same way. Change
something — add the validation error, lower the temperature, escalate the model.

### Treating model output as trusted input

Passing generated SQL, shell, paths or URLs to an executor without validation is
remote code execution with extra steps.

## Reference Documentation

- [Prompt Patterns](references/PROMPT_PATTERNS.md) — reusable structures for
  extraction, classification, generation and refusal, with worked prompts
- [Evaluation Harness](references/EVALUATION.md) — building a scored test set,
  regression gates in CI, model-as-judge calibration, and online monitoring

## Resources

- Anthropic, [Prompt engineering guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- OpenAI, [Structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- NIST, [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172) — position effects in long context
