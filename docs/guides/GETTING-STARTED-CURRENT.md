# Getting Started with PCL (Current Features)

**Welcome to PCL!** This guide shows you what PCL can do **right now** (January 2026).

---

## What PCL Can Do Today

PCL is currently in **Phase 1 completion** with these working features:

✅ **Parse PCL Files** - Convert PCL source to Abstract Syntax Tree (AST)
✅ **Type Checking** - Semantic analysis and validation
✅ **Registry System** - Store and manage personas with 4 backend options
✅ **Full-Text Search** - Find personas by keywords, tags, and filters
✅ **Performance Benchmarks** - Test backend performance

🚧 **Coming Soon**: Code generation, runtime execution, LLM integration

---

## Prerequisites

- **Node.js 20.0.0 or higher** ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)

Check versions:

```bash
node --version  # Should be v20.0.0+
npm --version   # Should be 10.0.0+
```

---

## Installation

### Option 1: Clone from GitHub

```bash
git clone https://github.com/personamanagmentlayer/pcl.git
cd pcl
npm install
npm run build
```

### Option 2: Download ZIP

1. Download from GitHub
2. Extract to a folder
3. Open terminal in that folder
4. Run: `npm install && npm run build`

---

## Your First PCL Program

### Step 1: Write a Persona

Create a file `my-assistant.pcl`:

```pcl
persona Assistant {
  intent: "Help users with their daily tasks"
  tone: friendly
  depth: detailed

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

### Step 2: Parse the File

Parse your PCL file to see the AST:

```bash
node dist/cli/index.js parse my-assistant.pcl
```

**Output**: JSON representation of the Abstract Syntax Tree

### Step 3: Type Check the File

Run semantic analysis to validate your code:

```bash
node dist/cli/index.js check my-assistant.pcl
```

**Output**:

- ✅ "No semantic errors" if valid
- ❌ Error messages with line numbers if issues found

---

## Working with the Registry

The registry system lets you store, search, and manage your personas.

### Initialize Registry (Database-Free!)

```bash
node dist/cli/index.js registry init --backend json-file
```

This creates `~/.pcl/registry.json` - no database needed!

### Add Persona to Registry

```bash
node dist/cli/index.js registry create my-assistant.pcl
```

**Output**:

```
Reading PCL file: my-assistant.pcl
Parsing PCL source...
Connecting to registry (backend: local)...
Creating persona artifact: Assistant...
✓ Created artifact: abc123-def456-...

Artifact Details:
  Name:    Assistant
  Type:    persona
  Version: 1.0.0
```

### List All Personas

```bash
node dist/cli/index.js registry list
```

**Output**: Beautiful ASCII table with your personas

### View Persona Details

```bash
# By name/slug
node dist/cli/index.js registry info assistant

# By ID
node dist/cli/index.js registry info abc123-def456-...
```

### Search Personas

```bash
# Basic search
node dist/cli/index.js registry search "task"

# Search with filters
node dist/cli/index.js registry search "helper" --type persona --tags productivity

# Limit results
node dist/cli/index.js registry search "assistant" --limit 5
```

### Publish a Persona

```bash
node dist/cli/index.js registry publish assistant
```

### Delete a Persona

```bash
# Soft delete (recoverable)
node dist/cli/index.js registry delete assistant

# Permanent delete
node dist/cli/index.js registry delete assistant --purge
```

---

## All Available CLI Commands

```bash
# Parsing & Analysis
node dist/cli/index.js parse <file>      # Parse PCL file → AST
node dist/cli/index.js lex <file>        # Tokenize PCL file
node dist/cli/index.js check <file>      # Type check PCL file
node dist/cli/index.js fmt <file>        # Format PCL file
node dist/cli/index.js repl              # Interactive REPL

# Registry Management
node dist/cli/index.js registry init                 # Initialize registry
node dist/cli/index.js registry create <file>        # Add persona to registry
node dist/cli/index.js registry list                 # List all personas
node dist/cli/index.js registry info <id|slug>       # View persona details
node dist/cli/index.js registry search <query>       # Search personas
node dist/cli/index.js registry publish <id|slug>    # Publish persona
node dist/cli/index.js registry delete <id|slug>     # Delete persona
```

---

## Registry Backend Options

PCL supports 4 storage backends:

### 1. JSON File (Default - No Database!)

**Best for**: Local development, small teams, version control

```bash
node dist/cli/index.js registry init --backend json-file

# Custom location
node dist/cli/index.js registry init --backend json-file --db ./my-registry.json
```

**Pros**:

- ✅ Zero dependencies
- ✅ Human-readable
- ✅ Git-friendly
- ✅ Works out of the box

**Limits**: ~1,000 personas

### 2. Memory (Temporary)

**Best for**: Testing, CI/CD

```bash
node dist/cli/index.js registry init --backend memory
```

**Pros**:

- ✅ Super fast
- ✅ No files created

**Cons**:

- ❌ Data lost on exit

### 3. SQLite (Optional)

**Best for**: Teams, production, 1K-100K personas

```bash
# Requires: npm install better-sqlite3
node dist/cli/index.js registry init --backend sqlite
```

**Pros**:

- ✅ Fast queries
- ✅ Full-text search
- ✅ Handles 100K+ personas

### 4. PostgreSQL (Optional)

**Best for**: Enterprise, unlimited scale

```bash
# Requires PostgreSQL server + npm install pg
node dist/cli/index.js registry init --backend postgres \
  --host localhost \
  --database pcl \
  --user myuser
```

**Pros**:

- ✅ Enterprise-grade
- ✅ Multi-user
- ✅ ACID transactions

---

## PCL Language Features

### Supported Syntax

```pcl
// Persona definition
persona Name {
  // String fields
  intent: "Description"
  tone: casual
  depth: detailed

  // Numeric fields
  temperature: 0.7
  maxTokens: 4096

  // Skills block
  skills {
    "Skill 1"
    "Skill 2"
  }

  // Constraints block
  constraints {
    "String constraint"
    temperature >= 0.0
    maxTokens <= 8000
  }
}

// Inheritance
persona SpecializedName extends Name {
  // Additional fields
}

// Export
export Name
```

### Type System

Supported types:

- `String` - Text values
- `Int` - Integer numbers
- `Float` - Decimal numbers
- `Bool` - true/false
- Arrays (in skills/constraints blocks)

### Operators

```pcl
// Comparison (in constraints)
field >= value
field <= value
field == value
field != value

// Arithmetic
+ - * / %

// Logical
&& ||
```

---

## Working Examples

### Example 1: Code Reviewer Persona

```pcl
persona CodeReviewer {
  intent: "Review code for quality and security"
  tone: professional
  depth: detailed

  temperature: 0.3
  maxTokens: 4096

  skills {
    "Code analysis"
    "Security review"
    "Best practices"
    "Performance optimization"
  }

  constraints {
    "Focus on security vulnerabilities"
    "Provide specific examples"
    "Suggest concrete improvements"
    temperature >= 0.0
    temperature <= 1.0
    maxTokens <= 8000
  }
}

export CodeReviewer
```

### Example 2: Customer Support Bot

```pcl
persona Support {
  intent: "Assist customers with product questions"
  tone: empathetic
  depth: balanced

  skills {
    "Product knowledge"
    "Troubleshooting"
    "Communication"
    "Ticket creation"
  }

  constraints {
    "Be patient and empathetic"
    "Provide step-by-step solutions"
    "Escalate complex issues"
  }
}

export Support
```

### Example 3: Data Analyst

```pcl
persona DataAnalyst {
  intent: "Analyze data and provide insights"
  tone: analytical
  depth: detailed

  skills {
    "Statistical analysis"
    "Data visualization"
    "Pattern recognition"
    "Report generation"
  }

  constraints {
    "Always cite data sources"
    "Explain statistical methods"
    "Provide visualizations when helpful"
  }
}

export DataAnalyst
```

---

## Interactive REPL

Launch the interactive REPL to experiment:

```bash
node dist/cli/index.js repl
```

Try these commands:

```
pcl> let name = "Alice"
pcl> let age = 30
pcl> name
"Alice"
pcl> age + 10
40
pcl> .exit
```

---

## Practical Workflows

### Workflow 1: Local Development

```bash
# 1. Write persona
vim code-reviewer.pcl

# 2. Validate syntax
node dist/cli/index.js check code-reviewer.pcl

# 3. Add to registry
node dist/cli/index.js registry create code-reviewer.pcl

# 4. View in registry
node dist/cli/index.js registry list
```

### Workflow 2: Team Collaboration

```bash
# 1. Initialize project registry
cd my-project
node dist/cli/index.js registry init --backend json-file --db ./.pcl/registry.json

# 2. Add to version control
echo ".pcl/" >> .gitignore
git add .pcl/registry.json
git commit -m "Add team personas"
git push

# 3. Team members pull
git pull
node dist/cli/index.js registry list
```

### Workflow 3: Testing Personas

```bash
# Create test personas
node dist/cli/index.js registry init --backend memory
node dist/cli/index.js registry create test1.pcl --backend memory
node dist/cli/index.js registry create test2.pcl --backend memory
node dist/cli/index.js registry list --backend memory
# Data lost on exit - perfect for testing!
```

---

## File Locations

```
~/.pcl/
├── config.json          # Registry configuration
└── registry.json        # All personas (JSON backend)
```

View your registry file:

```bash
cat ~/.pcl/registry.json
```

```json
{
  "artifacts": {
    "abc123-def456-...": {
      "id": "abc123-def456-...",
      "type": "persona",
      "metadata": {
        "name": "Assistant",
        "version": "1.0.0",
        "tags": [],
        "slug": "assistant"
      },
      "source": "persona Assistant {...}",
      "published": false,
      "deleted": false,
      "createdAt": "2026-01-18T...",
      "updatedAt": "2026-01-18T..."
    }
  }
}
```

---

## Troubleshooting

### "Command not found"

Make sure you've built the project:

```bash
npm run build
node dist/cli/index.js --version
```

### Parse errors

Check your syntax:

- Use `:` for field assignment (not `=`)
- Close all `{}` blocks
- Quote string values

### Registry errors

Initialize registry first:

```bash
node dist/cli/index.js registry init --backend json-file
```

### Type errors

Run type checker:

```bash
node dist/cli/index.js check my-file.pcl
```

Look for error messages with line numbers.

---

## What's Coming Next

### Phase 1.5: Code Generation (In Progress)

- Generate TypeScript classes from personas
- Generate YAML/JSON configurations
- Generate LLM prompts (Claude, OpenAI, Gemini)

### Phase 2: Runtime Execution

- Execute personas with real LLM providers
- Streaming responses
- Context management
- Memory system

### Phase 3: Advanced Features

- Team collaboration
- Workflow orchestration
- Plugin system
- VS Code extension

---

## Performance Benchmarks

Run benchmarks to test backend performance:

```bash
ENABLE_BENCHMARKS=true npm test -- tests/registry/benchmarks.test.ts
```

**Expected results**:

- **MemoryBackend**: 1000+ ops/sec, <1ms latency
- **JSONFileBackend**: 10-100 ops/sec, 1-10ms latency
- **SQLiteBackend**: 100-1000 ops/sec, 1-5ms latency
- **PostgreSQLBackend**: 1000+ ops/sec, 5-20ms latency

---

## Documentation

### Working Features

- ✅ [Registry System](../registry/DATABASE-FREE-REGISTRY.md) - Complete guide
- ✅ [Registry Cheatsheet](../registry/REGISTRY-CHEATSHEET.md) - Quick reference
- ✅ [Quick Start Local](QUICK-START-LOCAL.md) - Get started fast
- ✅ [Parser API](../api/PARSER.md) - Parser documentation
- ✅ [Semantic Analysis](../api/SEMANTIC.md) - Type checking

### Roadmap

- 📋 [Roadmap](.roadmap/ROADMAP.md) - Full development plan
- 📋 [Phase 1.2 Complete](.roadmap/status/PHASE-1.2-COMPLETE.md)
- 📋 [Phase 1.3 Complete](.roadmap/status/PHASE-1.3-COMPLETE.md)

---

## Community & Support

- **GitHub**: https://github.com/personamanagmentlayer/pcl
- **Issues**: https://github.com/personamanagmentlayer/pcl/issues
- **Discussions**: https://github.com/personamanagmentlayer/pcl/discussions

---

## Next Steps

1. **Parse your first persona** - Use `parse` command
2. **Set up the registry** - Use `registry init`
3. **Create personas** - Add to registry with `registry create`
4. **Search and organize** - Use `registry search` and tags
5. **Share with team** - Version control your registry file

---

**Last Updated**: 2026-01-18
**PCL Version**: 1.0.0-alpha
**Status**: Phase 1 Complete ✅

---

🎉 **You're ready to start using PCL!** Focus on parsing, type checking, and registry management - the features that work today!
