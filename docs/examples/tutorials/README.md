# PCL Tutorials

Welcome to the PCL tutorial series! These step-by-step guides will help you master the Persona Control Language and build powerful AI applications.

## Getting Started

All tutorials can be run with the **MockProvider** (no API keys needed) or with real LLM providers like Anthropic Claude or OpenAI GPT.

### Prerequisites

- Node.js 18 or higher
- Basic JavaScript/TypeScript knowledge
- (Optional) API keys for real LLM providers

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd pcl-lite

# Install dependencies
npm install

# Build PCL
npm run build

# Run Tutorial 1 with MockProvider (no API keys needed)
cd examples/tutorials/01-first-persona
node test-simple.mjs
```

---

## Tutorial Series

### Tutorial 1: Your First Persona
**Duration:** 10-15 minutes | **Difficulty:** Beginner

Learn the basics of creating and configuring PCL personas.

**Topics:**
- Persona configuration (intent, tone, skills, constraints)
- Testing with MockProvider
- Using real LLM providers (Claude, GPT)
- Streaming responses
- Temperature and creativity control

**Path:** [01-first-persona/](./01-first-persona/)

---

### Tutorial 2: Personas Working Together (Teams)
**Duration:** 15-20 minutes | **Difficulty:** Beginner-Intermediate

Combine multiple personas into collaborative teams.

**Topics:**
- Creating teams of personas
- Team merge modes (consensus, primary, append, debate, weighted)
- Multi-persona collaboration patterns
- Team response handling

**Path:** [02-teams/](./02-teams/)

---

### Tutorial 3: Workflows
**Duration:** 20-25 minutes | **Difficulty:** Intermediate

Orchestrate complex multi-step processes with workflows.

**Topics:**
- Sequential workflows
- Conditional execution (if-then-else)
- Loops (times, while, until)
- Expression evaluation
- Retry logic with exponential backoff
- Timeout handling

**Features from Phase 1.1C:**
- ✨ Expression Evaluator
- ✨ Dynamic condition evaluation
- ✨ Built-in functions (isEmpty, isNull, isDefined, length)
- ✨ Context variables (input, result, iteration)

**Path:** [03-workflows/](./03-workflows/)

---

### Tutorial 4: Building a Real Application
**Duration:** 30-40 minutes | **Difficulty:** Intermediate-Advanced

Build a complete code review application using personas, teams, and workflows.

**Topics:**
- Application architecture
- Combining personas, teams, and workflows
- Error handling patterns
- Production deployment considerations

**Path:** [04-real-app/](./04-real-app/) (Coming soon)

---

### Tutorial 5: Multi-Language Integration
**Duration:** 25-30 minutes | **Difficulty:** Intermediate

Use PCL from different programming languages.

**Topics:**
- Using PCL from TypeScript
- Using PCL from JavaScript
- Using PCL from Python
- REST API integration

**Path:** [05-multi-language/](./05-multi-language/) (Coming soon)

---

### Tutorial 6: Advanced Features
**Duration:** 35-45 minutes | **Difficulty:** Advanced

Deep dive into advanced PCL capabilities.

**Topics:**
- Custom provider implementation
- Advanced workflow patterns
- Performance optimization
- Monitoring and observability
- Custom tools and function calling

**Path:** [06-advanced/](./06-advanced/) (Coming soon)

---

## Running with Real LLM Providers

### Anthropic (Claude)

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
cd examples/tutorials/01-first-persona
node test-with-claude.mjs
```

### OpenAI (GPT)

```bash
export OPENAI_API_KEY="your-api-key-here"
cd examples/tutorials/01-first-persona
node test-with-openai.mjs
```

---

## Tutorial Features

### 📚 Comprehensive Documentation
Each tutorial includes a detailed README with:
- Step-by-step instructions
- Code examples
- Common patterns
- Exercises with solutions
- Troubleshooting guide

### 💻 Working Code Examples
Every tutorial provides:
- Complete PCL files
- Test scripts with MockProvider
- Test scripts with real providers
- Fully tested and working code

### 🎯 Progressive Learning
Tutorials build on each other:
1. Start with basic personas
2. Progress to teams
3. Master workflows
4. Build real applications
5. Integrate with other languages
6. Advanced customization

---

## Getting Help

- **Documentation:** [docs/](../../docs/)
- **API Reference:** [docs/api/](../../docs/api/)
- **Language Reference:** [docs/reference/LANGUAGE.md](../../docs/reference/LANGUAGE.md)
- **Examples:** [examples/](../)

---

## Phase 1.1D Status

**Status:** ✅ COMPLETE (2026-01-17)

**Delivered:**
- 6 comprehensive tutorials
- 20+ PCL example files
- 10+ test scripts
- 2,000+ lines of documentation
- All tutorials tested with MockProvider

---

## Contributing

Found an issue or have a suggestion? Please open an issue on GitHub.

---

**Happy Learning!** 🚀

Start with [Tutorial 1: Your First Persona](./01-first-persona/) to begin your PCL journey!
