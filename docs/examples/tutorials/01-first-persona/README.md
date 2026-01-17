# Tutorial 1: Your First Persona

**Duration:** 10-15 minutes
**Difficulty:** Beginner
**Prerequisites:** Node.js 18+, basic JavaScript knowledge

---

## What You'll Learn

- How to create a basic persona
- Understanding persona configuration options
- Setting intent, tone, and skills
- Testing personas with the MockProvider
- Running personas with real LLM providers

---

## Concepts

### What is a Persona?

A **persona** in PCL is an AI agent with a specific role, expertise, and communication style. Think of it as a specialized team member with:

- **Intent**: Their purpose and goals
- **Tone**: How they communicate (professional, casual, technical, etc.)
- **Skills**: Their areas of expertise
- **Constraints**: Rules they must follow

### Persona Configuration

Every persona has these configuration options:

```typescript
{
  intent: string;           // What the persona does
  tone: Tone;              // Communication style
  depth: Depth;            // Analysis depth
  verbosity: Verbosity;    // How much detail
  skills: string[];        // Areas of expertise
  constraints: string[];   // Rules to follow
  temperature: number;     // Creativity (0.0-1.0)
  maxTokens: number;       // Response length limit
  outputFormat: OutputFormat; // Response format
}
```

---

## Step 1: Create a Simple Persona

Create `simple-reviewer.pcl`:

```pcl
persona CodeReviewer {
  intent: "Review code for bugs, security issues, and best practices"
  tone: professional
  depth: detailed
  verbosity: concise

  skills: [
    "Code review",
    "Security analysis",
    "Best practices",
    "Performance optimization"
  ]

  constraints: [
    "Focus on actionable feedback",
    "Explain the 'why' behind suggestions",
    "Prioritize critical issues first"
  ]
}
```

### What This Does

- **Intent**: Defines the persona's role
- **Tone**: Professional communication
- **Depth**: Detailed analysis (not superficial)
- **Verbosity**: Concise (brief but complete)
- **Skills**: 4 areas of expertise
- **Constraints**: 3 rules for behavior

---

## Step 2: Test with MockProvider

Create `test-simple.mjs`:

```javascript
#!/usr/bin/env node
import { parse } from '@pcl/sdk';
import { Runtime, MockProvider } from '@pcl/sdk/runtime';
import { readFileSync } from 'fs';

// Load and parse the PCL file
const source = readFileSync('./simple-reviewer.pcl', 'utf-8');
const program = parse(source);

// Create runtime with MockProvider (no API keys needed!)
const runtime = new Runtime();
const mockProvider = new MockProvider();
runtime.setDefaultProvider(mockProvider);

// Load personas
runtime.load(program);

// Get the persona
const reviewer = runtime.getPersona('CodeReviewer');

// Test it
const response = await reviewer.process({
  id: 'msg-1',
  from: 'user',
  content: `
    Review this function:

    function calculateTotal(items) {
      var total = 0;
      for (var i = 0; i < items.length; i++) {
        total = total + items[i].price * items[i].quantity;
      }
      return total;
    }
  `,
  timestamp: new Date(),
});

console.log('Response:', response.content);
console.log('\nMetadata:', response.metadata);
```

Run it:

```bash
node test-simple.mjs
```

**Output** (MockProvider simulated):
```
Response: [CodeReviewer] Mock response: Review this function:...
Metadata: { tokensUsed: 100, duration: 50 }
```

---

## Step 3: Use a Real LLM Provider

### With Anthropic (Claude)

Create `test-with-claude.mjs`:

```javascript
#!/usr/bin/env node
import { parse } from '@pcl/sdk';
import { Runtime, AnthropicProvider } from '@pcl/sdk/runtime';
import { readFileSync } from 'fs';

// Load PCL
const source = readFileSync('./simple-reviewer.pcl', 'utf-8');
const program = parse(source);

// Create Anthropic provider
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultModel: 'claude-3-5-sonnet-20241022',
});

// Create runtime
const runtime = new Runtime();
runtime.setDefaultProvider(provider);
runtime.load(program);

// Get persona
const reviewer = runtime.getPersona('CodeReviewer');

// Process message
const response = await reviewer.process({
  id: 'msg-1',
  from: 'user',
  content: `
    Review this function:

    function calculateTotal(items) {
      var total = 0;
      for (var i = 0; i < items.length; i++) {
        total = total + items[i].price * items[i].quantity;
      }
      return total;
    }
  `,
  timestamp: new Date(),
});

console.log('='.repeat(80));
console.log('CODE REVIEW');
console.log('='.repeat(80));
console.log(response.content);
console.log('\n' + '='.repeat(80));
console.log('Metadata:', {
  tokensUsed: response.metadata.tokensUsed,
  duration: response.metadata.duration + 'ms',
  model: response.metadata.model,
});
```

Set your API key and run:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
node test-with-claude.mjs
```

**Expected Output**:
```
================================================================================
CODE REVIEW
================================================================================
I'll review this calculateTotal function:

**Issues Found:**

1. **Use of var instead of const/let** (Medium priority)
   - Modern JavaScript uses const/let for block scoping
   - var has function scope which can cause bugs

2. **Missing input validation** (High priority)
   - No check if items is null/undefined
   - No validation that items is an array
   - Could throw runtime errors

3. **Missing error handling** (Medium priority)
   - No validation that price/quantity exist
   - No check for negative values

**Suggested Improvements:**

```javascript
function calculateTotal(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  return items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);
}
```

**Why These Changes:**
- Input validation prevents runtime errors
- reduce() is more functional and readable
- Number() coercion handles edge cases safely

================================================================================
Metadata: { tokensUsed: 245, duration: '1843ms', model: 'claude-3-5-sonnet-20241022' }
```

---

## Step 4: Customize Persona Behavior

Create `custom-persona.pcl` with different settings:

```pcl
persona CasualMentor {
  intent: "Teach programming concepts in a friendly, approachable way"
  tone: casual
  depth: standard
  verbosity: verbose

  skills: [
    "Teaching",
    "Simplification",
    "Encouragement"
  ]

  constraints: [
    "Use analogies and examples",
    "Encourage learning by doing",
    "Never make the student feel dumb"
  ]

  temperature: 0.8  // More creative responses
}
```

### Temperature Effects

- **0.0-0.3**: Deterministic, focused, consistent
- **0.4-0.7**: Balanced creativity and consistency (default: 0.7)
- **0.8-1.0**: Creative, varied, exploratory

---

## Step 5: Streaming Responses

For long responses, use streaming:

```javascript
#!/usr/bin/env node
import { parse } from '@pcl/sdk';
import { Runtime, AnthropicProvider } from '@pcl/sdk/runtime';
import { readFileSync } from 'fs';

const source = readFileSync('./custom-persona.pcl', 'utf-8');
const program = parse(source);

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const runtime = new Runtime();
runtime.setDefaultProvider(provider);
runtime.load(program);

const mentor = runtime.getPersona('CasualMentor');

// Stream response
console.log('Mentor: ');
for await (const chunk of mentor.processStream({
  id: 'msg-1',
  from: 'user',
  content: 'Explain async/await in JavaScript',
  timestamp: new Date(),
})) {
  if (!chunk.done) {
    process.stdout.write(chunk.chunk);
  } else {
    console.log('\n\nDone!');
    console.log('Tokens:', chunk.response?.metadata.tokensUsed);
  }
}
```

---

## Common Patterns

### 1. Different Tones

```pcl
persona Formal {
  tone: professional
}

persona Friendly {
  tone: casual
}

persona Expert {
  tone: technical
}
```

### 2. Different Depths

```pcl
persona QuickScan {
  depth: shallow  // High-level overview
}

persona DeepDive {
  depth: exhaustive  // Comprehensive analysis
}
```

### 3. Different Output Formats

```pcl
persona MarkdownWriter {
  outputFormat: markdown
}

persona JSONResponder {
  outputFormat: json
}

persona DiagramGenerator {
  outputFormat: mermaid
}
```

---

## Exercises

### Exercise 1: Create a Debugging Assistant

Create a persona that helps debug code. It should:
- Be encouraging and patient (casual tone)
- Ask clarifying questions
- Explain errors simply
- Suggest debugging techniques

<details>
<summary>Solution</summary>

```pcl
persona DebugBuddy {
  intent: "Help developers debug code issues with patience and clarity"
  tone: casual
  depth: detailed
  verbosity: normal

  skills: [
    "Debugging",
    "Error analysis",
    "Teaching",
    "Problem solving"
  ]

  constraints: [
    "Always be encouraging",
    "Ask clarifying questions first",
    "Explain errors in simple terms",
    "Teach debugging techniques, don't just fix"
  ]

  temperature: 0.7
}
```
</details>

### Exercise 2: Create a Documentation Writer

Create a persona that writes clear technical documentation:
- Professional tone
- Thorough depth
- Markdown output
- Focus on clarity and examples

<details>
<summary>Solution</summary>

```pcl
persona DocWriter {
  intent: "Write clear, comprehensive technical documentation"
  tone: professional
  depth: thorough
  verbosity: detailed
  outputFormat: markdown

  skills: [
    "Technical writing",
    "Documentation",
    "Examples creation",
    "API documentation"
  ]

  constraints: [
    "Always include examples",
    "Use clear headings and structure",
    "Define technical terms",
    "Include common pitfalls section"
  ]

  temperature: 0.5
}
```
</details>

---

## Key Takeaways

1. **Personas are specialized AI agents** with specific roles and expertise
2. **Configuration matters**: Intent, tone, skills, and constraints shape behavior
3. **MockProvider** lets you test without API keys
4. **Real providers** (Anthropic, OpenAI) give production-quality responses
5. **Streaming** provides real-time feedback for long responses
6. **Temperature** controls creativity vs consistency

---

## Next Steps

- [Tutorial 2: Personas Working Together](../02-teams/README.md) - Learn how to combine personas into teams
- [Tutorial 3: Workflows](../03-workflows/README.md) - Orchestrate complex multi-step processes
- [API Reference](../../../docs/api/README.md) - Detailed API documentation

---

## Troubleshooting

### "No provider configured"

Make sure you call `setDefaultProvider()` before loading personas:

```javascript
runtime.setDefaultProvider(provider);
runtime.load(program);  // Now personas have provider
```

### "API key not found"

Set your environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

### Responses too long/short

Adjust `maxTokens`:

```pcl
persona Concise {
  maxTokens: 500  // Shorter responses
}

persona Detailed {
  maxTokens: 4000  // Longer responses
}
```

---

**Time to complete:** ~15 minutes
**Files created:** 3-4 PCL files, 3-4 JavaScript test files
