# Getting Started with PCL

**Welcome to PCL!** This guide will help you get up and running with the Persona Control Language in minutes.

---

## Table of Contents

1. [What is PCL?](#what-is-pcl)
2. [Installation](#installation)
3. [Your First Persona](#your-first-persona)
4. [Understanding Personas](#understanding-personas)
5. [Code Generation](#code-generation)
6. [Using Generated Code](#using-generated-code)
7. [Next Steps](#next-steps)

---

## What is PCL?

**PCL (Persona Control Language)** is a domain-specific language for defining AI personas, teams, and workflows. It provides:

- 📝 **Declarative syntax** for AI behavior specification
- 🔒 **Type safety** with semantic analysis
- 🚀 **Multi-format output** (TypeScript, YAML, JSON, Prompts)
- 🌍 **Multi-language support** (TypeScript native, Python/Go/Rust via configs)
- 🎯 **LLM optimization** (Claude, OpenAI, Gemini formats)

**Use Cases:**
- Define AI personas for chatbots and assistants
- Manage teams of AI agents
- Create reproducible AI workflows
- Deploy personas across multiple LLM providers

---

## Installation

### Prerequisites

- **Node.js**: 20.0.0 or higher
- **npm**: 9.0.0 or higher

### Install PCL

```bash
npm install @pcl/sdk
```

### Verify Installation

```bash
npx pcl --version
```

You should see:
```
PCL v1.0.0
```

---

## Your First Persona

Let's create a simple AI assistant persona.

### Step 1: Create a PCL File

Create a file named `assistant.pcl`:

```pcl
persona Assistant {
  intent = "Help users with their daily tasks"

  skills {
    "Task management"
    "Information retrieval"
    "Communication"
  }

  constraints {
    "Be concise and helpful"
    "Respect user privacy"
    "Provide accurate information"
  }
}
```

### Step 2: Compile to TypeScript

```bash
npx pcl compile assistant.pcl --format typescript --output assistant.ts
```

This generates a TypeScript file with a fully functional `AssistantPersona` class!

### Step 3: Use the Generated Code

Create `app.ts`:

```typescript
import { createAssistant } from './assistant';

// Create and activate persona
const assistant = createAssistant();
assistant.activate();

// Process a message
const response = await assistant.process("Help me organize my tasks");
console.log(response);
```

### Step 4: Run Your App

```bash
npx tsx app.ts
```

🎉 **Congratulations!** You've just created and deployed your first PCL persona!

---

## Understanding Personas

### Anatomy of a Persona

A persona has three main parts:

```pcl
persona PersonaName {
  // 1. INTENT - What does this persona do?
  intent = "Description of the persona's purpose"

  // 2. SKILLS - What can this persona do?
  skills {
    "Skill 1"
    "Skill 2"
    "Skill 3"
  }

  // 3. CONSTRAINTS - How should this persona behave?
  constraints {
    "Guideline 1"
    "Guideline 2"
  }
}
```

### Intent

The **intent** is a concise description of what the persona does:

```pcl
intent = "Provide expert security analysis and threat modeling"
```

**Best practices:**
- Keep it clear and specific
- Start with a verb ("Provide", "Help", "Analyze")
- One sentence

### Skills

**Skills** are capabilities the persona has:

```pcl
skills {
  "Threat modeling"
  "Vulnerability assessment"
  "Code review"
  "Security best practices"
}
```

**Best practices:**
- Be specific
- List concrete capabilities
- 3-10 skills per persona

### Constraints

**Constraints** are behavioral guidelines:

```pcl
constraints {
  "Always assume breach"
  "Apply least privilege principle"
  "Provide actionable recommendations"
}
```

You can also use **expression constraints**:

```pcl
constraints {
  "Be concise"
  maxResponseTime <= 5        // Numeric constraint
  temperature >= 0.0          // Range constraint
}
```

**Best practices:**
- Define clear expectations
- Use positive language ("Do X" not "Don't do Y")
- Be specific and actionable

---

## Code Generation

PCL can generate code in multiple formats:

### JSON (Data Exchange)

```bash
pcl compile assistant.pcl --format json --output assistant.json
```

Output:
```json
{
  "version": "1.0.0",
  "personas": {
    "Assistant": {
      "id": "Assistant",
      "intent": "Help users with their daily tasks",
      "skills": ["Task management", "Information retrieval"],
      "constraints": ["Be concise and helpful"]
    }
  }
}
```

### YAML (Configuration)

```bash
pcl compile assistant.pcl --format yaml --output config.yaml
```

Output:
```yaml
version: "1.0.0"

personas:
  Assistant:
    id: Assistant
    intent: "Help users with their daily tasks"
    skills:
      - "Task management"
      - "Information retrieval"
```

### Markdown (Documentation)

```bash
pcl compile assistant.pcl --format markdown --output README.md
```

Generates professional documentation with:
- Table of contents
- Syntax-highlighted code
- Configuration examples

### TypeScript (Production Code)

```bash
pcl compile assistant.pcl --format typescript --output assistant.ts
```

Generates executable classes with:
- Type-safe APIs
- Runtime integration
- Memory management
- Event handling

### Prompts (LLM Deployment)

```bash
# Generic format
pcl compile assistant.pcl --format prompt --output prompt.txt

# Claude-optimized (XML-style)
pcl compile assistant.pcl --format prompt --provider claude --output claude.txt

# OpenAI-optimized (Imperative Markdown)
pcl compile assistant.pcl --format prompt --provider openai --output openai.txt

# Gemini-optimized (Contextual)
pcl compile assistant.pcl --format prompt --provider gemini --output gemini.txt
```

---

## Using Generated Code

### TypeScript Usage

The generated TypeScript code provides a rich API:

```typescript
import { createAssistant } from './assistant';

const assistant = createAssistant();

// 1. Lifecycle
assistant.activate();
assistant.deactivate();

// 2. State management
const state = assistant.getState();

// 3. Message processing
const response = await assistant.process("Help me with my tasks");

// 4. Configuration
assistant.configure({
  maxTokens: 2048,
  temperature: 0.7
});

// 5. Context management
assistant.setContext('userName', 'Alice');
const userName = assistant.getContext<string>('userName');

// 6. Memory (long-term facts)
assistant.remember('preferences', { theme: 'dark', language: 'en' });
const prefs = assistant.recall<any>('preferences');

// 7. Event handling
const unsubscribe = assistant.on((event) => {
  console.log('Event:', event);
});

// Later: unsubscribe()
```

### YAML/JSON Usage (Python Example)

```python
import yaml

# Load YAML config
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# Access persona data
assistant = config['personas']['Assistant']
print(f"Intent: {assistant['intent']}")
print(f"Skills: {', '.join(assistant['skills'])}")

# Use with LLM library
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    system=assistant['intent'],  # Use PCL intent as system prompt
    messages=[{"role": "user", "content": "Help me"}]
)
```

### Prompt Usage

```typescript
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

// Load Claude-optimized prompt
const prompt = fs.readFileSync('claude.txt', 'utf-8');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  system: prompt,  // Use PCL-generated prompt
  messages: [{ role: 'user', content: 'Help me organize my tasks' }]
});

console.log(response.content);
```

---

## Advanced Features

### Persona Inheritance

Create specialized personas by extending base personas:

```pcl
// Base persona
persona Expert {
  intent = "Provide expert analysis"

  skills {
    "Research"
    "Analysis"
  }
}

// Specialized persona
persona SecurityExpert extends Expert {
  intent = "Provide security-focused expert analysis"

  skills {
    "Threat modeling"
    "Vulnerability assessment"
  }

  constraints {
    "Always assume breach"
    "Apply defense in depth"
  }
}
```

The child persona inherits skills from the parent and adds its own.

### Expression Constraints

Use numeric constraints for fine-grained control:

```pcl
persona PreciseAssistant {
  intent = "Provide precise, controlled responses"

  maxTokens = 4096
  temperature = 0.7
  topP = 0.9

  constraints {
    "Be precise"
    maxTokens <= 8000         // Max tokens constraint
    maxTokens >= 1000         // Min tokens constraint
    temperature >= 0.0        // Temperature range
    temperature <= 1.0
    topP >= 0.0
    topP <= 1.0
  }
}
```

The semantic analyzer validates these constraints at compile time!

---

## Real-World Examples

### Example 1: Customer Support Bot

```pcl
persona CustomerSupport {
  intent = "Assist customers with product questions and issues"

  skills {
    "Product knowledge"
    "Troubleshooting"
    "Empathetic communication"
    "Ticket creation"
  }

  constraints {
    "Be patient and empathetic"
    "Provide step-by-step solutions"
    "Escalate complex issues to human agents"
    "Always ask for clarification when unsure"
    maxResponseTime <= 10
  }
}
```

### Example 2: Code Reviewer

```pcl
persona CodeReviewer {
  intent = "Review code for quality, security, and best practices"

  skills {
    "Code analysis"
    "Security vulnerability detection"
    "Performance optimization"
    "Best practices enforcement"
  }

  constraints {
    "Focus on security vulnerabilities first"
    "Provide specific examples in feedback"
    "Suggest concrete improvements"
    "Be constructive, not critical"
  }
}
```

### Example 3: Data Analyst

```pcl
persona DataAnalyst {
  intent = "Analyze data and provide insights"

  skills {
    "Statistical analysis"
    "Data visualization"
    "Pattern recognition"
    "Report generation"
  }

  constraints {
    "Always cite data sources"
    "Explain statistical methods used"
    "Provide visualizations when helpful"
    "Highlight confidence levels"
  }
}
```

---

## Common Workflows

### Workflow 1: TypeScript Development

```bash
# 1. Write PCL
vim personas.pcl

# 2. Generate TypeScript
pcl compile personas.pcl --format typescript --output personas.ts

# 3. Use in your app
import { createAssistant } from './personas';
```

### Workflow 2: Multi-Provider Deployment

```bash
# Generate prompts for all providers
pcl compile persona.pcl --format prompt --provider claude -o claude.txt
pcl compile persona.pcl --format prompt --provider openai -o openai.txt
pcl compile persona.pcl --format prompt --provider gemini -o gemini.txt

# Deploy to each provider
# - Claude: Use claude.txt as system prompt
# - OpenAI: Use openai.txt as system message
# - Gemini: Use gemini.txt as context
```

### Workflow 3: Configuration Management

```bash
# Generate YAML config
pcl compile personas.pcl --format yaml --output config.yaml

# Deploy to Kubernetes
kubectl create configmap personas --from-file=config.yaml

# Use in Python/Go/Rust apps
# - Load YAML
# - Extract persona configurations
# - Use with LLM SDKs
```

---

## CLI Reference

### Basic Commands

```bash
# Compile PCL to various formats
pcl compile <file> [options]

# Check syntax (parse only)
pcl check <file>

# Show version
pcl --version

# Show help
pcl --help
```

### Compile Options

```bash
--format <format>         # Output format (json, yaml, markdown, typescript, prompt)
--provider <provider>     # Prompt provider (claude, openai, gemini, generic)
--output <file>          # Output file path
--pretty                 # Pretty print (JSON/TypeScript)
--indent <spaces>        # Indentation (2 or 4)
```

### Examples

```bash
# Generate JSON
pcl compile personas.pcl --format json --output personas.json

# Generate TypeScript with 4-space indent
pcl compile personas.pcl --format typescript --indent 4 --output personas.ts

# Generate Claude prompt
pcl compile personas.pcl --format prompt --provider claude --output claude.txt

# Check syntax only
pcl check personas.pcl
```

---

## Troubleshooting

### Common Errors

#### Error: "Expected '}'"

**Cause:** Missing closing brace

**Fix:**
```pcl
persona Test {
  intent = "Test"
  skills {
    "Skill1"
  }  // ← Make sure closing braces match
}
```

#### Error: "Undefined symbol"

**Cause:** Referencing undefined variable/persona

**Fix:**
```pcl
persona A {
  intent = "First"
}

persona B extends A {  // ← Make sure A is defined first
  intent = "Second"
}
```

#### Error: "Type mismatch"

**Cause:** Assigning wrong type to field

**Fix:**
```pcl
persona Test {
  maxTokens = 4096      // ✅ Correct: number
  // maxTokens = "4096" // ❌ Wrong: string
}
```

#### Error: "Unknown field in constraint"

**Cause:** Constraint references non-existent field

**Fix:**
```pcl
persona Test {
  maxTokens = 4096

  constraints {
    maxTokens <= 8000   // ✅ Correct: field exists
    // unknown <= 100   // ❌ Wrong: field doesn't exist
  }
}
```

### Getting Help

- 📚 **Documentation:** See [docs/](../)
- 🐛 **Report Issues:** https://github.com/pcl-lang/pcl/issues
- 💬 **Discord:** https://discord.gg/pcl-lang
- 📧 **Email:** support@pcl-lang.org

---

## Next Steps

Now that you've learned the basics, explore these topics:

### Learn More

1. **[Parser API](../api/PARSER.md)** - Understand PCL syntax and parsing
2. **[Semantic Analysis](../api/SEMANTIC.md)** - Learn about type checking
3. **[Code Generation](../api/CODEGEN.md)** - Master all output formats
4. **[Multi-Language Integration](./MULTI-LANGUAGE.md)** - Use PCL with Python, Go, Rust

### Build Something

- Create a customer support bot
- Build a code review assistant
- Design a multi-agent team
- Implement a workflow system

### Advanced Topics

- **Teams:** Coordinate multiple personas
- **Workflows:** Define sequential/parallel processing
- **Custom Generators:** Create your own output formats
- **LSP Integration:** Add IDE support

---

## Example Projects

### Starter Templates

```bash
# Clone starter templates
git clone https://github.com/pcl-lang/pcl-starters

cd pcl-starters
cd typescript-chatbot    # TypeScript chatbot example
cd python-assistant      # Python assistant example
cd multi-provider        # Multi-provider deployment example
```

### Community Examples

Browse community examples at:
https://github.com/pcl-lang/examples

---

## Best Practices

### 1. Keep Personas Focused

❌ **Too broad:**
```pcl
persona Everything {
  skills {
    "Coding" "Design" "Marketing" "Sales" "Support"
  }
}
```

✅ **Focused:**
```pcl
persona CodeAssistant {
  skills {
    "Code generation"
    "Code review"
    "Debugging"
  }
}
```

### 2. Use Inheritance Wisely

✅ **Good hierarchy:**
```pcl
persona Expert {
  skills { "Research" "Analysis" }
}

persona SecurityExpert extends Expert {
  skills { "Threat modeling" }
}
```

### 3. Be Specific in Constraints

❌ **Vague:**
```pcl
constraints { "Be good" }
```

✅ **Specific:**
```pcl
constraints {
  "Provide code examples for every suggestion"
  "Explain security implications of recommendations"
  "Always cite sources for security claims"
}
```

### 4. Use Expression Constraints for Validation

✅ **Add validation:**
```pcl
persona RateLimited {
  maxRequests = 100

  constraints {
    maxRequests <= 1000
    maxRequests >= 10
  }
}
```

---

## Quick Reference Card

```pcl
// PERSONA STRUCTURE
persona Name [extends Parent] {
  // Intent (required)
  intent = "What this persona does"

  // Fields (optional)
  fieldName = value
  typedField: Type = value

  // Skills (optional)
  skills {
    "Skill 1"
    "Skill 2"
  }

  // Constraints (optional)
  constraints {
    "String guideline"
    field <= value        // Expression constraint
  }
}

// SUPPORTED TYPES
String, Int, Float, Bool
Array<T>, Map<K,V>
UnionType: T | U

// OPERATORS
+ - * / %                 // Arithmetic
== != < > <= >=          // Comparison
&& ||                    // Logical
matches in               // String/Array

// COMPILATION
pcl compile file.pcl --format <json|yaml|markdown|typescript|prompt>
```

---

**Ready to build amazing AI personas? Let's get started!** 🚀

For more help, visit our [documentation](../) or join our [Discord community](https://discord.gg/pcl-lang).

---

**Last Updated:** 2026-01-16
**Version:** 1.0.0
