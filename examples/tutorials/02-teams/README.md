# Tutorial 2: Personas Working Together (Teams)

**Duration:** 15-20 minutes
**Difficulty:** Beginner-Intermediate
**Prerequisites:** Tutorial 1 (Your First Persona)

---

## What You'll Learn

- How to create teams of personas
- Understanding team merge modes
- Coordinating multiple personas
- Handling team responses
- Different collaboration patterns

---

## Concepts

### What is a Team?

A **team** in PCL is a group of personas working together on a task. Each persona contributes their expertise, and their responses are merged according to a merge mode.

### Team Merge Modes

PCL supports 7 merge modes:

1. **primary** - Use first persona's response (others provide context)
2. **consensus** - Combine all responses into unified answer
3. **majority** - Use most common response
4. **append** - Concatenate all responses
5. **debate** - Personas discuss and refine
6. **weighted** - Weight responses by confidence
7. **random** - Randomly select one response

---

## Step 1: Create Team Members

Create `review-team.pcl`:

```pcl
// Security expert
persona SecurityExpert {
  intent: "Identify security vulnerabilities and risks"
  tone: vigilant
  depth: detailed
  verbosity: concise

  skills {
    "Security analysis"
    "Vulnerability detection"
    "OWASP Top 10"
    "Threat modeling"
  }

  constraints {
    "Always assume breach"
    "Prioritize security over convenience"
  }
}

// Performance optimizer
persona PerformanceExpert {
  intent: "Optimize code for speed and efficiency"
  tone: technical
  depth: detailed
  verbosity: concise

  skills {
    "Performance optimization"
    "Algorithm analysis"
    "Profiling"
    "Scalability"
  }

  constraints {
    "Focus on measurable improvements"
    "Consider Big-O complexity"
  }
}

// Code quality reviewer
persona QualityExpert {
  intent: "Ensure code quality and maintainability"
  tone: professional
  depth: detailed
  verbosity: concise

  skills {
    "Code review"
    "Best practices"
    "Refactoring"
    "Clean code"
  }

  constraints {
    "Follow SOLID principles"
    "Emphasize readability"
  }
}

// Team combining all experts
team CodeReviewTeam {
  members: [SecurityExpert, PerformanceExpert, QualityExpert]
  mergeMode: consensus

  constraints {
    "Provide comprehensive review"
    "Identify critical issues first"
  }
}
```

---

## Step 2: Test Team with Consensus Mode

Create `test-consensus.mjs`:

```javascript
#!/usr/bin/env node
import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 2: Team Collaboration');
console.log('Testing Consensus Mode');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Load PCL
const source = readFileSync(join(__dirname, 'review-team.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse error:', parseResult.error);
  process.exit(1);
}

const program = parseResult.value.program;

// Setup runtime
const runtime = new Runtime();
runtime.setDefaultProvider(new MockProvider());
runtime.load(program);

// Get team
const team = runtime.getTeam('CodeReviewTeam');

console.log('✓ Team loaded:', team.getState().name);
console.log('✓ Members:', team.getState().members.map(m => m.getState().name).join(', '));
console.log('✓ Merge mode:', team.getState().config.mergeMode);
console.log('\nSending code to team for review...\n');

// Process with team
const response = await team.process({
  id: 'msg-1',
  from: 'user',
  content: `
Review this authentication function:

function authenticate(username, password) {
  const user = db.query("SELECT * FROM users WHERE name='" + username + "'");
  if (user && user.password === password) {
    return { token: username + "_" + Date.now() };
  }
  return null;
}
  `,
  timestamp: new Date(),
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('TEAM CONSENSUS REVIEW');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(response.content);
console.log('\n' + '═══════════════════════════════════════════════════════════════════════════════');
console.log('METADATA');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Contributors:', response.metadata.contributors);
console.log('Merge mode:', response.metadata.mergeMode);

console.log('\n✓ Tutorial 2 Complete!\n');
```

Run it:

```bash
node test-consensus.mjs
```

---

## Step 3: Try Different Merge Modes

### Primary Mode - Lead with Context

The first persona leads, others provide supporting context:

```pcl
team LeadReview {
  members: [SecurityExpert, PerformanceExpert, QualityExpert]
  mergeMode: primary  // SecurityExpert leads
}
```

**Use when:** One persona should drive the response with expert input

### Append Mode - Separate Perspectives

Each persona's response is included separately:

```pcl
team MultiPerspective {
  members: [SecurityExpert, PerformanceExpert, QualityExpert]
  mergeMode: append  // Each expert gives separate opinion
}
```

**Use when:** You want distinct viewpoints clearly separated

### Debate Mode - Iterative Refinement

Personas discuss and refine the answer:

```pcl
team DebateTeam {
  members: [SecurityExpert, PerformanceExpert, QualityExpert]
  mergeMode: debate  // Personas discuss and converge
  maxRounds: 3
}
```

**Use when:** Complex problems need iterative discussion

---

## Step 4: Weighted Team Responses

Weight responses by persona confidence:

```pcl
team WeightedReview {
  members: [SecurityExpert, PerformanceExpert, QualityExpert]
  mergeMode: weighted

  // Optionally configure weights
  weights: {
    SecurityExpert: 2.0  // Double weight for security
    PerformanceExpert: 1.0
    QualityExpert: 1.0
  }
}
```

---

## Step 5: Dynamic Team Composition

Create teams programmatically:

```javascript
import { createTeam, createPersona, MockProvider } from '@pcl/sdk';

// Create personas
const security = createPersona('sec', 'SecurityExpert', {
  intent: 'Find security issues',
  skills: ['Security analysis', 'Penetration testing'],
}, new MockProvider());

const performance = createPersona('perf', 'PerformanceExpert', {
  intent: 'Optimize performance',
  skills: ['Profiling', 'Optimization'],
}, new MockProvider());

// Create team
const team = createTeam('review', 'ReviewTeam', [security, performance], {
  mergeMode: 'consensus',
});

// Use team
const response = await team.process({
  id: 'msg-1',
  from: 'user',
  content: 'Review this code...',
  timestamp: new Date(),
});

console.log(response.content);
```

---

## Common Patterns

### Pattern 1: Specialized Review Team

```pcl
team FullStackReview {
  members: [FrontendExpert, BackendExpert, DatabaseExpert, SecurityExpert]
  mergeMode: consensus
}
```

### Pattern 2: Escalation Chain

```pcl
team L1Support {
  members: [GeneralSupport]
  mergeMode: primary
}

team L2Support {
  members: [GeneralSupport, TechnicalExpert]
  mergeMode: primary
}

team L3Support {
  members: [GeneralSupport, TechnicalExpert, EngineeringLead]
  mergeMode: consensus
}
```

### Pattern 3: Domain Experts

```pcl
team LegalReview {
  members: [PrivacyExpert, ComplianceExpert, ContractExpert]
  mergeMode: consensus

  constraints {
    "All opinions must align on legal matters"
    "Flag any compliance risks"
  }
}
```

---

## Exercises

### Exercise 1: Create a Documentation Team

Create a team with:
- Technical writer (clear explanations)
- Code reviewer (accuracy)
- Tutorial creator (examples)

Merge mode: consensus

<details>
<summary>Solution</summary>

```pcl
persona TechnicalWriter {
  intent: "Write clear, accessible documentation"
  tone: casual
  verbosity: detailed

  skills {
    "Technical writing"
    "Simplification"
    "User-focused content"
  }
}

persona CodeReviewer {
  intent: "Ensure technical accuracy"
  tone: professional
  verbosity: concise

  skills {
    "Code review"
    "Technical accuracy"
    "Best practices"
  }
}

persona TutorialCreator {
  intent: "Create helpful examples and tutorials"
  tone: friendly
  verbosity: detailed

  skills {
    "Example creation"
    "Step-by-step guides"
    "Teaching"
  }
}

team DocumentationTeam {
  members: [TechnicalWriter, CodeReviewer, TutorialCreator]
  mergeMode: consensus
}
```
</details>

### Exercise 2: Architecture Decision Team

Create a team that:
- Evaluates architecture proposals
- Considers scalability, maintainability, and cost
- Uses debate mode for thorough discussion

<details>
<summary>Solution</summary>

```pcl
persona ArchitecturalExpert {
  intent: "Evaluate system architecture and design patterns"
  tone: technical
  depth: thorough

  skills {
    "System design"
    "Design patterns"
    "Microservices"
    "Event-driven architecture"
  }
}

persona ScalabilityExpert {
  intent: "Assess scalability and performance at scale"
  tone: technical
  depth: detailed

  skills {
    "Scalability analysis"
    "Load balancing"
    "Caching strategies"
    "Database sharding"
  }
}

persona CostOptimizer {
  intent: "Evaluate cost implications of architectural decisions"
  tone: pragmatic
  depth: standard

  skills {
    "Cost analysis"
    "Resource optimization"
    "Cloud economics"
  }
}

team ArchitectureDecisionTeam {
  members: [ArchitecturalExpert, ScalabilityExpert, CostOptimizer]
  mergeMode: debate
  maxRounds: 3

  constraints {
    "Consider long-term implications"
    "Balance innovation with pragmatism"
  }
}
```
</details>

---

## Key Takeaways

1. **Teams combine expertise** from multiple personas
2. **Merge modes control** how responses are combined
3. **Consensus** creates unified, comprehensive answers
4. **Append** preserves distinct perspectives
5. **Debate** enables iterative refinement
6. **Weighted** emphasizes certain personas
7. **Teams can be dynamic** - created at runtime

---

## Next Steps

- [Tutorial 3: Workflows](../03-workflows/README.md) - Orchestrate complex multi-step processes
- [Tutorial 4: Real Application](../04-real-app/README.md) - Build a complete code review system
- [API Reference](../../../docs/api/README.md) - Detailed team API

---

## Troubleshooting

### Team not found

Make sure team declaration is in the PCL file:

```pcl
team MyTeam {
  members: [Persona1, Persona2]
  mergeMode: consensus
}
```

### Members not found

Personas must be declared before the team:

```pcl
persona Expert1 { ... }
persona Expert2 { ... }

team MyTeam {
  members: [Expert1, Expert2]  // References personas above
  mergeMode: consensus
}
```

---

**Time to complete:** ~20 minutes
**Files created:** 2-3 PCL files, 2-3 test scripts
