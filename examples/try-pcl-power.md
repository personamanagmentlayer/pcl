# Experience the Power of PCL

This guide demonstrates PCL's most powerful features with hands-on examples.

## 🚀 Quick Demo: What Makes PCL Powerful?

### 1. **Interactive REPL** - Instant Experimentation

```bash
npm run repl
```

In the REPL, try:

```
.help                    # See all commands
.examples               # Show example personas
.load examples/personas/simple-assistant.pcl
```

### 2. **Memory & Context** (Phase 2.3 - Just Released!)

```bash
node examples/compiled/examples/memory-demo.js
```

**What you'll see:**

- ✅ Long-term memory with importance decay
- ✅ Context compression at 80% capacity
- ✅ Knowledge sharing between personas
- ✅ Conversation threading
- ✅ Semantic deduplication
- ✅ Multi-factor importance scoring

**Real Impact:**

- 30-50% cost reduction through intelligent context management
- Persistent learning across sessions
- Better answers from cross-persona knowledge

---

## 💪 Power Features Demo

### Feature 1: Multi-Provider Abstraction

PCL works with **any AI provider** - switch seamlessly:

```typescript
// Same persona, different providers
persona Assistant {
  provider: "claude"      // Anthropic Claude
  // provider: "openai"   // OpenAI GPT
  // provider: "google"   // Google Gemini
  // provider: "deepseek" // DeepSeek
}
```

**Automatic Features:**

- Circuit breaker pattern (auto-disable failing providers)
- Rate limiting (stay within API limits)
- Cost tracking (monitor spending per provider)
- Health monitoring (real-time provider status)

### Feature 2: Team Collaboration

Create teams of personas with 7 merge strategies:

```bash
# Create a code review team
cat > code-review-team.pcl << 'EOF'
persona SecurityExpert {
  name: "Security Guru"
  instructions: "Find security vulnerabilities"
  provider: "claude"
  model: "claude-sonnet-4.5"
}

persona PerformanceExpert {
  name: "Performance Optimizer"
  instructions: "Identify performance bottlenecks"
  provider: "claude"
  model: "claude-sonnet-4.5"
}

team CodeReviewers {
  members: [SecurityExpert, PerformanceExpert]
  merge: debate
  rounds: 2
}
EOF

# Parse and validate
npm run check code-review-team.pcl
```

**7 Merge Strategies:**

1. **Primary** - Use first response
2. **Consensus** - Combine similar answers
3. **Majority** - Democratic voting
4. **Append** - Concatenate all responses
5. **Debate** - Iterative refinement (powerful!)
6. **Chain** - Sequential processing pipeline
7. **Weighted** - Importance-based combination

### Feature 3: Skill Modules

Reusable instruction blocks:

```pcl
skill CodeReview {
  input: CodeFile
  output: ReviewReport

  instructions: """
    Review the code for:
    1. Security vulnerabilities (SQL injection, XSS, etc.)
    2. Performance issues (N+1 queries, memory leaks)
    3. Code quality (readability, maintainability)
    4. Best practices violations

    Provide specific line numbers and fix suggestions.
  """
}

persona Developer {
  skills: [CodeReview, Testing, Documentation]
}
```

### Feature 4: Dynamic Routing

Smart persona selection based on task:

```pcl
router SmartRouter {
  rules: [
    { tags: ["code", "debug"], route: Developer },
    { tags: ["analysis", "data"], route: DataScientist },
    { tags: ["creative", "writing"], route: Writer },
    { skills: ["math"], route: Mathematician }
  ]
  fallback: GeneralAssistant
}
```

### Feature 5: Event Streaming

Real-time observability:

```typescript
import { PersonaInstance } from '@pcl/sdk';

const persona = new PersonaInstance({...});

// Subscribe to events
persona.on('start', (ctx) => console.log('Starting...'));
persona.on('stream', (chunk) => console.log('Chunk:', chunk));
persona.on('complete', (result) => console.log('Done:', result));
persona.on('error', (err) => console.error('Error:', err));

// Process with streaming
for await (const chunk of persona.processStream(message)) {
  console.log(chunk);
}
```

---

## 🎯 Real-World Power Examples

### Example 1: Research Pipeline

```pcl
persona Researcher {
  name: "Research Specialist"
  instructions: "Gather comprehensive information on topics"
}

persona Analyzer {
  name: "Data Analyst"
  instructions: "Analyze research findings and extract insights"
}

persona Writer {
  name: "Technical Writer"
  instructions: "Write clear, well-structured reports"
}

team ResearchPipeline {
  members: [Researcher, Analyzer, Writer]
  merge: chain  // Sequential: Research → Analysis → Writing
}
```

**Result:** Fully automated research reports!

### Example 2: Code Quality Enforcement

```pcl
persona SecurityReviewer {
  instructions: """
    Review for OWASP Top 10 vulnerabilities.
    Use CVSS scoring for severity.
    Block merges if critical issues found.
  """
}

persona PerformanceReviewer {
  instructions: """
    Analyze computational complexity.
    Check for memory leaks and resource exhaustion.
    Suggest optimizations with benchmarks.
  """
}

persona StyleReviewer {
  instructions: """
    Enforce team coding standards.
    Check for code smells and anti-patterns.
    Suggest refactoring opportunities.
  """
}

team CodeQualityGate {
  members: [SecurityReviewer, PerformanceReviewer, StyleReviewer]
  merge: debate
  rounds: 2
  consensus_threshold: 0.8
}
```

**Result:** Automated, multi-perspective code reviews!

### Example 3: Customer Support Triage

```pcl
persona TriageAgent {
  instructions: """
    Classify support tickets:
    - Priority (P0/P1/P2/P3)
    - Category (billing, technical, account)
    - Sentiment (angry, neutral, happy)
    - Suggested routing
  """
}

persona TechnicalSupport {
  instructions: "Resolve technical issues with step-by-step guidance"
}

persona BillingSupport {
  instructions: "Handle billing inquiries and payment issues"
}

router SupportRouter {
  rules: [
    { tags: ["billing", "payment"], route: BillingSupport },
    { tags: ["technical", "bug"], route: TechnicalSupport },
  ]
  fallback: TriageAgent
}
```

**Result:** Automated ticket triage and routing!

---

## 📊 Performance & Cost Benefits

### Memory System Impact (Phase 2.3)

**Without PCL Memory:**

- ❌ Resend full context every message → 100K tokens
- ❌ Cost: $0.30 per interaction (Claude Sonnet)
- ❌ No learning across sessions

**With PCL Memory:**

- ✅ Compressed context → 20K tokens (80% reduction)
- ✅ Cost: $0.06 per interaction (80% savings)
- ✅ Persistent learning improves quality over time

**Annual Savings Example:**

- 10,000 interactions/month
- Without PCL: $3,000/month = $36,000/year
- With PCL: $600/month = $7,200/year
- **Savings: $28,800/year (80%)**

### Team Collaboration Impact

**Without PCL Teams:**

- ❌ Manual orchestration of multiple models
- ❌ Complex merge logic in application code
- ❌ No automatic retry or fallback

**With PCL Teams:**

- ✅ Declarative team configuration
- ✅ 7 built-in merge strategies
- ✅ Automatic retry, fallback, and error handling

---

## 🔥 Try These Power Demos

### Demo 1: Test All Merge Strategies

```bash
# Create test file
cat > test-merges.ts << 'EOF'
import { TeamInstance } from '@pcl/sdk';

const strategies = ['primary', 'consensus', 'majority', 'append', 'debate', 'chain', 'weighted'];

for (const strategy of strategies) {
  const team = new TeamInstance({
    name: `${strategy}Team`,
    members: [expert1, expert2, expert3],
    mergeStrategy: strategy,
  });

  const result = await team.process({
    role: 'user',
    content: 'What are the pros and cons of TypeScript?',
  });

  console.log(`\n=== ${strategy.toUpperCase()} ===`);
  console.log(result.content);
}
EOF

# Run it
npx tsx test-merges.ts
```

### Demo 2: Provider Health Monitoring

```typescript
import { ProviderRegistry } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Check all provider health
for (const provider of ['claude', 'openai', 'google']) {
  const health = registry.getHealthMonitor(provider);
  console.log(`${provider}: ${health.getState()}`);
  console.log(health.getStats());
}

// Circuit breaker in action
const claude = registry.get('claude');
try {
  await claude.complete({...}); // If it fails 5 times
  // Circuit opens → requests fail fast for 60s
  // Then half-open → try one request
  // Success → back to closed
} catch (error) {
  console.log('Circuit breaker prevented cascade failure!');
}
```

### Demo 3: Cost Tracking Dashboard

```typescript
import { CostTrackerRegistry } from '@pcl/sdk';

const costTracker = new CostTrackerRegistry();

// Track costs across all providers
const stats = {
  claude: costTracker.get('claude').getStats(),
  openai: costTracker.get('openai').getStats(),
  google: costTracker.get('google').getStats(),
};

console.table({
  Provider: ['Claude', 'OpenAI', 'Google'],
  'Total Cost': [
    stats.claude.totalCost,
    stats.openai.totalCost,
    stats.google.totalCost,
  ],
  Requests: [
    stats.claude.requestCount,
    stats.openai.requestCount,
    stats.google.requestCount,
  ],
  'Avg Latency': [
    stats.claude.avgLatency,
    stats.openai.avgLatency,
    stats.google.avgLatency,
  ],
});
```

---

## 🎓 Advanced Power Features

### 1. Context Prioritization

Automatically prioritize important messages:

```typescript
const prioritizer = new ContextPrioritizer({
  recencyWeight: 0.3, // Recent messages more important
  roleWeight: 0.2, // System > User > Assistant
  lengthWeight: 0.2, // Optimal 100-500 tokens
  keywordWeight: 0.3, // Match important keywords
  keywords: ['error', 'critical', 'bug', 'security'],
});

const message = prioritizer.computeImportance({
  role: 'user',
  content: 'CRITICAL: Security vulnerability found!',
  tokenCount: 50,
  timestamp: Date.now(),
});

console.log(message.importance); // 0.95 (high priority!)
```

### 2. Semantic Deduplication

Remove redundant messages automatically:

```typescript
const deduplicator = new SemanticDeduplicator(0.9); // 90% similarity threshold

const messages = [
  { content: 'How do I install Node.js?' },
  { content: 'How do I install nodejs?' }, // 95% similar → deduplicated
  { content: 'What is React?' }, // Different → kept
];

const result = deduplicator.deduplicate(messages);
console.log(
  `Saved ${result.tokensSaved} tokens by removing ${result.removedCount} duplicates`
);
```

### 3. Knowledge Sharing

Cross-persona learning:

```typescript
const knowledgeBase = new KnowledgeSharing({
  autoShare: true,
  shareThreshold: 0.8, // Only share high-confidence knowledge
});

// Backend expert shares knowledge
knowledgeBase.share({
  sourcePersonaId: 'backend-expert',
  type: 'best-practice',
  content: 'Always use connection pooling for databases',
  confidence: 0.95,
  tags: ['database', 'performance'],
});

// Frontend expert can retrieve it
const dbKnowledge = knowledgeBase.retrieve({
  tags: ['database'],
  minConfidence: 0.8,
});

// Now frontend persona knows backend best practices!
```

---

## 🚀 Next Steps

1. **Start Simple**: `npm run repl`
2. **Try Memory Demo**: `node examples/compiled/examples/memory-demo.js`
3. **Build a Team**: Create your first multi-persona team
4. **Add Skills**: Build modular, reusable instruction blocks
5. **Deploy Production**: Use HTTP server for real applications

**The power of PCL is in your hands!** 🎯

---

## 📚 Resources

- **Getting Started**: `examples/GETTING_STARTED.md`
- **Documentation**: `docs/`
- **Examples**: `examples/`
- **Standard Library**: `stdlib/`
- **Memory Guide**: `docs/MEMORY_CONTEXT.md`

**Have questions?** Check the docs or file an issue on GitHub!
