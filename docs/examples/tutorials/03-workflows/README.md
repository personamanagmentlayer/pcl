# Tutorial 3: Workflows

**Duration:** 20-25 minutes
**Difficulty:** Intermediate
**Prerequisites:** Tutorial 1 (Your First Persona)

---

## What You'll Learn

- Creating multi-step workflows
- Using conditions and branching (if-then-else)
- Implementing loops (times, while, until)
- Expression evaluation in workflows
- Retry logic with exponential backoff
- Timeout handling
- Error handling in workflows

---

## Concepts

### What is a Workflow?

A **workflow** in PCL is a multi-step process that orchestrates persona interactions, data transformations, and control flow. Think of it as a pipeline that processes input through multiple stages.

### Workflow Features (Phase 1.1C - NEW!)

PCL workflows now support powerful features:

1. **Expression Evaluator** - Evaluate conditions dynamically
2. **Conditional Execution** - if-then-else branching
3. **Loops** - times, while, until
4. **Retry Logic** - Automatic retries with exponential backoff
5. **Timeout Handling** - Prevent long-running operations
6. **Context Variables** - Access input, result, iteration

---

## Step 1: Simple Sequential Workflow

Create `simple-workflow.pcl`:

```pcl
persona Analyzer {
  intent: "Analyze code and identify issues"
  tone: technical

  skills {
    "Code analysis"
    "Issue detection"
  }
}

persona Fixer {
  intent: "Suggest fixes for identified issues"
  tone: helpful

  skills {
    "Problem solving"
    "Code refactoring"
  }
}

workflow CodeReview {
  // Step 1: Analyze
  input -> Analyzer -> issues

  // Step 2: Fix
  issues -> Fixer -> result
}
```

**What this does:**
1. Sends input to Analyzer persona
2. Analyzer output becomes "issues"
3. Issues are sent to Fixer persona
4. Fixer output becomes final "result"

---

## Step 2: Conditional Workflows (NEW!)

Create `conditional-workflow.pcl`:

```pcl
persona SecurityChecker {
  intent: "Check for security vulnerabilities"
  tone: vigilant

  skills {
    "Security analysis"
    "Vulnerability detection"
  }
}

persona SecurityFixer {
  intent: "Fix security vulnerabilities"
  tone: technical

  skills {
    "Security fixes"
    "Secure coding"
  }
}

persona BasicReviewer {
  intent: "Review code for general quality"
  tone: professional

  skills {
    "Code review"
    "Best practices"
  }
}

workflow SmartReview {
  // Check security
  input -> SecurityChecker -> securityReport

  // Conditional branching based on security issues
  if (securityReport.issueCount > 0) then {
    securityReport -> SecurityFixer -> result
  } else {
    input -> BasicReviewer -> result
  }
}
```

**Expression Evaluation:**
- `securityReport.issueCount > 0` - Accesses object properties
- Supports: `>`, `<`, `>=`, `<=`, `==`, `!=`
- Supports: `&&` (and), `||` (or), `!` (not)

---

## Step 3: Loop Workflows (NEW!)

### Loop 3 Times

```pcl
workflow IterativeRefine {
  input -> result

  loop 3 times {
    result -> RefinerPersona -> result
  }
}
```

### While Loop (Continue while condition is true)

```pcl
workflow RefineUntilGood {
  input -> Analyzer -> result

  loop while (result.quality < 0.8) {
    result -> Refiner -> result
  }
}
```

### Until Loop (Continue until condition is true)

```pcl
workflow RefineUntilPerfect {
  input -> result

  loop until (result.score >= 9.0) {
    result -> Improver -> result
  }
}
```

**Loop Context Variables:**
- `input` - Original workflow input
- `result` - Current iteration result
- `iteration` - Current iteration number (0-based)

---

## Step 4: Complex Expressions (NEW!)

Create `advanced-workflow.pcl`:

```pcl
workflow AdvancedProcessing {
  input -> Analyzer -> analysis

  // Complex boolean expressions
  if (analysis.score > 7 && analysis.coverage >= 80) then {
    analysis -> ApprovalPersona -> result
  } else if (analysis.score > 5 || analysis.critical == 0) then {
    analysis -> ReviewPersona -> result
  } else {
    analysis -> RejectionPersona -> result
  }

  // Arithmetic in conditions
  if (result.tokensUsed + result.timeMs > 5000) then {
    result -> OptimizationPersona -> result
  }
}
```

**Supported Operators:**

**Comparison:** `<`, `<=`, `>`, `>=`, `==`, `!=`
**Logical:** `&&`, `||`, `!`
**Arithmetic:** `+`, `-`, `*`, `/`, `%`
**Unary:** `!`, `-`, `+`

---

## Step 5: Built-in Functions (NEW!)

```pcl
workflow ValidationWorkflow {
  input -> Processor -> data

  // Check if empty
  if (isEmpty(data.results)) then {
    input -> FallbackPersona -> result
  }

  // Check if null
  if (isNull(data.user)) then {
    data -> UserEnricher -> data
  }

  // Check if defined
  if (isDefined(data.premium)) then {
    data -> PremiumProcessor -> result
  } else {
    data -> StandardProcessor -> result
  }

  // Check length
  if (length(data.items) > 100) then {
    data -> BatchProcessor -> result
  }
}
```

**Built-in Functions:**
- `isEmpty(value)` - Check if empty/null/undefined
- `isNull(value)` - Check if null
- `isDefined(value)` - Check if defined (not undefined)
- `length(array)` - Get array/string length

---

## Step 6: Testing Workflows

Create `test-workflow.mjs`:

```javascript
#!/usr/bin/env node
import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 3: Workflows');
console.log('Testing Conditional Workflow');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Load PCL
const source = readFileSync(join(__dirname, 'conditional-workflow.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse errors:', parseResult.value.errors);
  process.exit(1);
}

const program = parseResult.value.program;

// Setup runtime
const runtime = new Runtime();
runtime.setDefaultProvider(new MockProvider());
runtime.load(program);

// Get workflow
const workflow = runtime.getWorkflow('SmartReview');

console.log('✓ Workflow loaded:', workflow.name);
console.log('\nExecuting workflow with test input...\n');

// Execute workflow
const result = await workflow.execute({
  code: `
    function login(user, pass) {
      return db.query("SELECT * FROM users WHERE name='" + user + "'");
    }
  `,
  issueCount: 5  // Will trigger security fixer
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('WORKFLOW RESULT');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(result);

console.log('\n✓ Tutorial 3 Complete!\n');
```

---

## Step 7: Retry Logic (NEW!)

Workflows automatically retry failed steps with exponential backoff:

```javascript
import { Runtime, AnthropicProvider } from '@pcl/sdk';

const runtime = new Runtime();

// Configure retry behavior
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,      // 1 second
    maxDelay: 30000,         // 30 seconds
    backoffMultiplier: 2     // Double each time
  }
});

runtime.setDefaultProvider(provider);

// Workflow will automatically retry on failures:
// Attempt 1: Immediate
// Attempt 2: Wait 1s
// Attempt 3: Wait 2s
// Attempt 4: Wait 4s (capped at maxDelay)
```

---

## Step 8: Timeout Handling (NEW!)

Prevent workflows from running too long:

```javascript
import { WorkflowExecutor } from '@pcl/sdk';

const executor = new WorkflowExecutor(workflow, personas, teams);

// Set timeout (in milliseconds)
const result = await executor.executeWithTimeout(
  () => executor.execute(input),
  5000  // 5 second timeout
);
```

---

## Common Patterns

### Pattern 1: Validation Pipeline

```pcl
workflow ValidationPipeline {
  input -> Validator -> validation

  if (validation.isValid) then {
    input -> Processor -> result
  } else {
    validation -> ErrorHandler -> result
  }
}
```

### Pattern 2: Iterative Improvement

```pcl
workflow IterativeImprove {
  input -> result

  loop while (result.quality < 0.9 && iteration < 5) {
    result -> Improver -> result
  }
}
```

### Pattern 3: Multi-Stage Processing

```pcl
workflow MultiStage {
  // Stage 1: Parse
  input -> Parser -> parsed

  // Stage 2: Validate
  parsed -> Validator -> validated

  // Stage 3: Transform (conditional)
  if (validated.format == "old") then {
    validated -> Migrator -> transformed
  } else {
    validated -> transformed
  }

  // Stage 4: Finalize
  transformed -> Finalizer -> result
}
```

### Pattern 4: Error Recovery

```pcl
workflow ResilientProcessing {
  input -> RiskyProcessor -> output

  if (isNull(output) || isEmpty(output)) then {
    input -> FallbackProcessor -> result
  } else {
    output -> result
  }
}
```

---

## Exercises

### Exercise 1: Quality Gate Workflow

Create a workflow that:
- Analyzes code quality
- If quality score < 5, rejects
- If quality score 5-7, requests improvements
- If quality score > 7, approves

<details>
<summary>Solution</summary>

```pcl
persona QualityAnalyzer {
  intent: "Analyze code quality and assign score"
  tone: technical

  skills {
    "Code analysis"
    "Quality metrics"
  }
}

persona ImprovementSuggester {
  intent: "Suggest code improvements"
  tone: helpful

  skills {
    "Refactoring"
    "Best practices"
  }
}

persona Approver {
  intent: "Approve high-quality code"
  tone: professional

  skills {
    "Code review"
  }
}

persona Rejecter {
  intent: "Reject low-quality code with reasons"
  tone: firm

  skills {
    "Standards enforcement"
  }
}

workflow QualityGate {
  input -> QualityAnalyzer -> analysis

  if (analysis.score < 5) then {
    analysis -> Rejecter -> result
  } else if (analysis.score <= 7) then {
    analysis -> ImprovementSuggester -> result
  } else {
    analysis -> Approver -> result
  }
}
```
</details>

### Exercise 2: Batch Processing Workflow

Create a workflow that:
- Checks if input has > 10 items
- If yes, processes in batches
- If no, processes directly
- Loops until all items processed

<details>
<summary>Solution</summary>

```pcl
persona BatchProcessor {
  intent: "Process items in batches"
  tone: efficient

  skills {
    "Batch processing"
    "Optimization"
  }
}

persona DirectProcessor {
  intent: "Process items directly"
  tone: quick

  skills {
    "Direct processing"
  }
}

workflow BatchProcessing {
  input -> Validator -> validated

  if (length(validated.items) > 10) then {
    validated -> BatchProcessor -> result
  } else {
    validated -> DirectProcessor -> result
  }
}
```
</details>

---

## Key Takeaways

1. **Workflows orchestrate** multi-step processes
2. **Conditions enable** dynamic branching (if-then-else)
3. **Loops support** iterative processing (times, while, until)
4. **Expressions evaluate** at runtime with full type support
5. **Built-in functions** simplify common checks
6. **Retry logic** handles transient failures automatically
7. **Timeouts** prevent runaway executions
8. **Context variables** (input, result, iteration) are available

---

## New in Phase 1.1C

✨ **Expression Evaluator** - Full runtime expression evaluation
✨ **Conditional Execution** - if-then-else with complex expressions
✨ **Loop Conditions** - while/until with dynamic evaluation
✨ **Retry Logic** - Exponential backoff for resilience
✨ **Timeout Handling** - Prevent long-running operations
✨ **Built-in Functions** - isEmpty, isNull, isDefined, length
✨ **Context Variables** - Access to input, result, iteration

---

## Next Steps

- [Tutorial 4: Real Application](../04-real-app/README.md) - Build complete code review system
- [Tutorial 5: Multi-Language](../05-multi-language/README.md) - Use PCL from other languages
- [Workflow Reference](../../../docs/reference/WORKFLOWS.md) - Complete workflow syntax

---

## Troubleshooting

### Expression evaluation errors

Make sure to use correct operators:
```pcl
if (score > 5)        // ✓ Correct
if (score greater 5)  // ✗ Wrong
```

### Loop doesn't terminate

Add max iteration safeguard:
```pcl
loop while (condition && iteration < 100) {
  // Your loop body
}
```

### Variables not found

Use context variables in expressions:
- `input` - Original workflow input
- `result` - Current result
- `iteration` - Loop iteration number

---

**Time to complete:** ~25 minutes
**Files created:** 3-4 PCL files, 2-3 test scripts
**Phase:** 1.1C (Workflow Enhancements)
