# PCL Core Concepts

**Understanding the fundamental building blocks of PCL**

---

## Personas

**Personas are first-class citizens in PCL**, representing distinct AI behaviors with explicit capabilities and constraints.

### Basic Persona

```pcl
pub persona ARCHI {
  id: "ARCHI"
  name: "Software Architect"
  intent: "Design robust, scalable systems"
  tone: analytical

  skills {
    "System design"
    "Design patterns"
    "Trade-off analysis"
  }

  constraints {
    "Consider maintainability"
    "Document decisions"
  }
}
```

### Persona Properties

- **id**: Unique identifier
- **name**: Human-readable name
- **intent**: Purpose and goal
- **tone**: Communication style
- **skills**: List of capabilities
- **constraints**: Behavioral rules
- **model**: AI provider and model (optional)
- **temperature**: Creativity level (0.0-1.0)

### Persona with Functions

```pcl
pub persona DEV {
  name: "Developer"

  pub fn analyze(code: String) -> CodeReport {
    // Analysis implementation
  }

  pub fn refactor(file: String, pattern: String) -> String {
    // Refactoring logic
  }
}
```

---

## Teams

**Teams are groups of personas working together** with defined collaboration patterns.

### Basic Team

```pcl
pub team ArchitectureReview {
  members: [ARCHI, SEC, DEV, CRITIC]
  primary: ARCHI
  merge: Consensus
  quorum: 3/4
}
```

### Team Properties

- **members**: List of personas
- **primary**: Lead persona (optional)
- **merge**: Strategy for combining outputs
- **quorum**: Minimum agreement threshold
- **timeout**: Maximum execution time
- **fallback**: Backup persona if team fails

### Advanced Team

```pcl
pub team SecurityReview {
  members: [SEC, AUDIT, ARCHI, CRITIC]
  primary: SEC
  merge: Debate

  config {
    rounds: 3
    consensus: 0.7
    timeout: 60s
  }

  fallback: SIMPLIFY
}
```

---

## Workflows

**Workflows define orchestration patterns** for persona execution.

### Sequential Workflow

```pcl
pub workflow SimpleReview {
  steps: DEV -> ARCHI -> SEC
}
```

### Parallel Workflow

```pcl
pub workflow ParallelReview {
  steps: (ARCHI || SEC || AUDIT)
}
```

### Complex Workflow

```pcl
pub workflow CodeReview {
  steps: [
    DEV,
    (ARCHI || SEC),
    merge(Consensus),
    CRITIC
  ]
  timeout: 60s
  fallback: SIMPLIFY
}
```

### Workflow Expressions

**Sequential:** `A -> B -> C`

```
Execute in order: A, then B, then C
```

**Parallel:** `(A || B || C)`

```
Execute simultaneously, combine results
```

**With Merge:** `(A || B) -> merge(Debate) -> C`

```
A and B run in parallel, results debated, passed to C
```

**Conditional:** `if critical then SEC -> AUDIT else DEV`

```
Choose path based on condition
```

---

## Merge Modes

**Merge modes control how multiple persona outputs are combined.**

### Primary

**Lead persona decides, others advise**

```pcl
team Research {
  members: [ANALYST, EXPERT, CRITIC]
  primary: ANALYST
  merge: Primary
}
```

Use when: One persona has final authority

### Consensus

**Synthesize all perspectives**

```pcl
team DesignReview {
  members: [ARCHI, UX, SEC]
  merge: Consensus
}
```

Use when: All voices should be heard equally

### Majority

**Weighted voting**

```pcl
team DecisionMakers {
  members: [PM, TECH, BUSINESS]
  merge: Majority
  weights: [0.4, 0.3, 0.3]
}
```

Use when: Democratic decision-making needed

### Debate

**Visible deliberation**

```pcl
team Strategists {
  members: [OPTIMIST, PESSIMIST, REALIST]
  merge: Debate
  config {
    rounds: 3
    consensus: 0.7
  }
}
```

Use when: Multiple rounds of discussion needed

### Compare

**Side-by-side comparison**

```pcl
team Evaluators {
  members: [CRITIC_A, CRITIC_B, CRITIC_C]
  merge: Compare
}
```

Use when: User should see all perspectives

### Chain

**Sequential transformation**

```pcl
team Pipeline {
  members: [RESEARCHER, ANALYST, WRITER]
  merge: Chain
}
```

Use when: Output of each feeds to next

---

## Skills

**Skills are reusable instruction blocks** that enhance persona capabilities.

### Defining Skills

```pcl
skill CodeReview {
  input: CodeFile
  output: ReviewReport

  instructions: """
    1. Check code quality
    2. Identify bugs
    3. Suggest improvements
    4. Rate overall quality
  """
}
```

### Using Skills

```pcl
persona Developer {
  skills: [CodeReview, Testing, Documentation]
}
```

### External Skills

```pcl
// Import from agentskills.io
persona PythonDev {
  skills: [
    "@agentskills/python-expert",
    "@claude-code/code-review",
    "@pcl/skills/testing"
  ]
}
```

---

## Contexts

**Contexts provide state and memory** for persona execution.

### Context Definition

```pcl
context SessionContext {
  user_id: String
  conversation_history: Array<Message>
  preferences: Map<String, Any>

  fn add_message(msg: Message) {
    conversation_history.push(msg)
  }
}
```

### Using Context

```pcl
persona Assistant {
  context: SessionContext

  fn respond(input: String) -> String {
    context.add_message({role: "user", content: input})
    // Use context.conversation_history for response
  }
}
```

---

## Constraints

**Constraints define boundaries** for persona behavior.

### Simple Constraints

```pcl
persona SafeAssistant {
  constraints {
    "Never share personal information"
    "Always cite sources"
    "Refuse harmful requests"
  }
}
```

### Parametric Constraints

```pcl
persona FastResponder {
  constraints {
    maxResponseTime <= 5s
    maxTokens <= 500
    temperature >= 0.3
  }
}
```

### Complex Constraints

```pcl
persona SecureAgent {
  constraints {
    if data.contains_pii then
      require_encryption: true

    allowed_domains: ["company.com", "trusted.org"]

    rate_limit: 100 requests/hour
  }
}
```

---

## Composition

**Personas can extend and compose** for code reuse.

### Inheritance

```pcl
persona BaseAgent {
  skills: ["Basic reasoning", "Communication"]
  constraints {
    "Be helpful and harmless"
  }
}

persona SpecializedAgent extends BaseAgent {
  skills: ["Domain expertise"]
  // Inherits skills and constraints from BaseAgent
}
```

### Composition

```pcl
persona FullStack {
  includes: [Frontend, Backend, Database]
  // Combines capabilities from all three
}
```

---

## Routing

**Dynamic persona selection** based on request characteristics.

### Simple Router

```pcl
router QueryRouter {
  rules: [
    { tags: ["code", "debug"], route: DEV },
    { tags: ["analysis", "data"], route: ANALYST },
    { skills: ["math"], route: MATHEMATICIAN }
  ]
  fallback: GENERAL
}
```

### Advanced Router

```pcl
router SmartRouter {
  rules: [
    {
      condition: complexity > 0.8,
      route: EXPERT_TEAM,
      priority: 10
    },
    {
      condition: contains(tags, "urgent"),
      route: FAST_RESPONDER,
      priority: 9
    }
  ]

  confidence_threshold: 0.7
  fallback_chain: [GENERAL, BACKUP, SIMPLIFY]
}
```

---

## State Management

**Track and manage execution state** across persona interactions.

### State Machine

```pcl
state_machine ReviewProcess {
  initial: Draft

  states {
    Draft -> InReview
    InReview -> [Approved, Rejected, NeedsWork]
    NeedsWork -> InReview
    Approved -> Published
  }

  on_transition {
    Draft -> InReview: notify_reviewers()
    InReview -> Approved: send_approval()
  }
}
```

### Snapshot and Restore

```pcl
workflow LongRunning {
  steps: [Step1, Step2, Step3, Step4]

  snapshot: after_each_step
  restore_on_failure: true

  timeout: 3600s
}
```

---

## Error Handling

**Graceful failure and recovery** mechanisms.

### Try-Catch

```pcl
persona ResilientAgent {
  fn process(data: Any) -> Result<String, Error> {
    try {
      return analyze(data)
    } catch (error) {
      log_error(error)
      return fallback_response()
    }
  }
}
```

### Fallback Chains

```pcl
workflow ReliableExecution {
  steps: PRIMARY
  fallback: [BACKUP, SIMPLE, SAFE]

  retry {
    max_attempts: 3
    backoff: exponential
  }
}
```

---

## Learn More

- **[Type System](TYPE_SYSTEM.md)** - Types in PCL
- **[Commands Reference](COMMANDS.md)** - CLI commands
- **[Getting Started](guides/GETTING-STARTED-CURRENT.md)** - Practical tutorial
- **[Skills Guide](SKILLS_INTEGRATION_GUIDE.md)** - Working with skills
- **[Workflow Patterns](guides/WORKFLOW-PATTERNS.md)** - Common patterns

---

**Last Updated:** 2026-02-02
