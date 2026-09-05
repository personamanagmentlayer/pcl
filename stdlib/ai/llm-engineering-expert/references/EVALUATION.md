# LLM Engineering — Evaluation Harness

Reference material for the `llm-engineering-expert` skill. See [SKILL.md](../SKILL.md).

Without evaluation, every prompt change is a guess and every model upgrade is a
gamble. The harness does not need to be sophisticated; it needs to exist and to
run automatically.

## Building the Test Set

Start with thirty cases. Draw them from real traffic where possible, and
deliberately include:

- **Typical cases** — the bulk of production input
- **Edge cases** — empty, maximum length, unusual encoding, multiple languages
- **Negative cases** — input the feature should refuse or classify as out of scope
- **Known failures** — every bug ever reported becomes a permanent case
- **Adversarial cases** — injection attempts, contradictory instructions

```yaml
# evals/extraction.yaml
- id: standard-eu-invoice
  input_file: fixtures/invoice_de_001.txt
  expect:
    is_invoice: true
    currency: EUR
    total: '1234.50'

- id: not-an-invoice
  input_file: fixtures/delivery_note.txt
  expect:
    is_invoice: false

- id: missing-total-must-be-null
  input_file: fixtures/invoice_no_total.txt
  expect:
    total: null # regression: model previously invented 0.00

- id: injection-in-document
  input_file: fixtures/invoice_with_injection.txt
  expect:
    is_invoice: true
    followed_injected_instruction: false
```

Every production defect becomes a case before the fix. That is what stops the
same failure recurring after the next prompt change.

## Running and Scoring

```python
import json, statistics, pathlib, yaml

def run_suite(suite_path: str, extractor) -> dict:
    cases = yaml.safe_load(pathlib.Path(suite_path).read_text())
    results = []
    for case in cases:
        text = pathlib.Path(case["input_file"]).read_text()
        try:
            got = extractor(text)
            failures = {
                field: (expected, getattr(got, field, None))
                for field, expected in case["expect"].items()
                if getattr(got, field, None) != expected
            }
        except Exception as exc:                 # a crash is a failure, not an error
            failures = {"exception": (None, repr(exc))}
        results.append({"id": case["id"], "passed": not failures, "failures": failures})

    passed = sum(r["passed"] for r in results)
    return {
        "score": passed / len(results),
        "passed": passed,
        "total": len(results),
        "failures": [r for r in results if not r["passed"]],
    }
```

Report the aggregate **and** the per-case list. An aggregate that stays flat can
hide two cases fixed and two broken.

## Gating in CI

```yaml
# .github/workflows/evals.yml
name: LLM evaluations
on:
  pull_request:
    paths: ['prompts/**', 'src/extraction/**', 'evals/**']

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - name: Run evaluation suite
        env:
          MODEL_API_KEY: ${{ secrets.MODEL_API_KEY }}
        run: python -m evals.run --suite evals/extraction.yaml --min-score 0.90
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: eval-report
          path: eval-report.json
```

Set the threshold slightly below the current score so noise does not block
merges, and raise it as the feature improves. Publish the report as an artefact
so a reviewer can see _which_ cases moved, not just the number.

Because calls cost money and time, run the full suite on prompt and model changes
only, and a fast subset on every commit.

## Handling Non-Determinism

A single run of a stochastic component is a weak measurement.

```python
def stability(case, extractor, runs: int = 5) -> float:
    outputs = [json.dumps(extractor(case_text).model_dump(), sort_keys=True)
               for _ in range(runs)]
    return outputs.count(max(set(outputs), key=outputs.count)) / runs
```

Track stability alongside accuracy. A case that is right 60 % of the time is a
different problem from one that is consistently wrong, and it needs a different
fix — usually constraining the output rather than rewording the prompt.

For gating, run flaky-prone cases three times and require a majority, rather than
letting a single unlucky run block a merge.

## Model-as-Judge, Calibrated

Useful when there is no reference answer. It must be calibrated before it is
trusted.

1. Have humans label 50 outputs against the rubric.
2. Have the judge label the same 50.
3. Measure agreement (Cohen's kappa). Below roughly 0.6, fix the rubric — the
   problem is almost always an underspecified criterion, not the model.
4. Re-calibrate whenever the rubric or the judge model changes.

Known biases to design around: judges prefer longer answers, prefer their own
family's style, and are sensitive to presentation order. Swap positions and
average; strip formatting differences before judging.

Never judge with the same model and prompt that generated the output.

## Online Monitoring

Offline evaluation cannot see distribution shift. Instrument production:

```python
logger.info("llm.call", extra={
    "feature": "invoice_extraction",
    "model": MODEL_ID,               # pinned version, not an alias
    "prompt_version": PROMPT_SHA,
    "input_tokens": usage.input_tokens,
    "output_tokens": usage.output_tokens,
    "latency_ms": elapsed_ms,
    "validation": "ok",              # ok | repaired | rejected
    "refused": False,
    "confidence": result.confidence,
})
```

Alert on the ratios, not the totals: rejection rate, repair rate, refusal rate,
p95 latency, and cost per successful outcome. A rising repair rate is the
earliest signal that inputs have shifted or the provider has changed something.

Sample real outputs for human review continuously — a small, steady sample beats
a large audit after an incident.

## Regression Discipline

- **A defect becomes a case before it is fixed.** No exceptions; this is the
  entire mechanism by which quality accumulates.
- **Keep prompts versioned and hashed**, and record the hash with every output so
  a bad batch can be traced to a version.
- **Re-run the suite on provider updates**, including ones you did not initiate.
  Pinning the model version is what makes that possible.
- **Track cost per successful outcome** in the same report as accuracy. A prompt
  that gains two points of accuracy for triple the cost is a trade-off, and it
  should be made visible rather than discovered on the invoice.
