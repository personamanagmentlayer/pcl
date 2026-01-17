# Multi-Language Integration Guide

**Use PCL with Python, Go, Rust, Shell, and more!**

---

## Overview

PCL is a **language-agnostic** persona definition system. While it's written in TypeScript, you can use PCL-defined personas in any programming language through:

1. **Universal formats** - JSON, YAML outputs work everywhere
2. **Provider-specific prompts** - Optimized for each LLM
3. **Runtime libraries** - Native TypeScript, adapters for others

**Supported Languages:**
- ✅ **TypeScript** - Native, first-class support
- ✅ **Python** - Via YAML/JSON + runtime
- ✅ **Go** - Via JSON + runtime
- ✅ **Rust** - Via JSON + runtime
- ✅ **Shell** - Via YAML/JSON + CLI tools
- ✅ **Any language** - Via universal formats

---

## Table of Contents

1. [TypeScript (Native)](#typescript-native)
2. [Python Integration](#python-integration)
3. [Go Integration](#go-integration)
4. [Rust Integration](#rust-integration)
5. [Shell Integration](#shell-integration)
6. [Universal JSON/YAML](#universal-jsonyaml)
7. [Best Practices](#best-practices)

---

## TypeScript (Native)

TypeScript has **full native support** with executable classes.

### Installation

```bash
npm install @pcl/sdk @pcl/runtime
```

### Define Persona

Create `personas.pcl`:

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
  }
}
```

### Generate TypeScript

```bash
npx pcl compile personas.pcl --format typescript --output personas.ts
```

### Use in TypeScript

```typescript
import { createAssistant } from './personas';

const assistant = createAssistant();
assistant.activate();

// Process messages
const response = await assistant.process("Help me organize my tasks");
console.log(response);

// Context management
assistant.setContext('userName', 'Alice');

// Memory
assistant.remember('preferences', { theme: 'dark' });
const prefs = assistant.recall<any>('preferences');

// Events
const unsubscribe = assistant.on((event) => {
  console.log('Event:', event);
});
```

### TypeScript Benefits

- ✅ Full type safety
- ✅ IntelliSense support
- ✅ Runtime integration
- ✅ Event handling
- ✅ Memory management
- ✅ Zero config

---

## Python Integration

Python integration uses **YAML/JSON configs** + Python runtime adapter.

### Step 1: Generate YAML

```bash
npx pcl compile personas.pcl --format yaml --output personas.yaml
```

Output `personas.yaml`:
```yaml
version: "1.0.0"

personas:
  Assistant:
    id: Assistant
    intent: "Help users with their daily tasks"
    skills:
      - "Task management"
      - "Information retrieval"
    constraints:
      - "Be concise and helpful"
```

### Step 2: Install Python Runtime

```bash
pip install pcl-runtime anthropic
```

### Step 3: Create Python Adapter

Create `pcl_adapter.py`:

```python
import yaml
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class PersonaConfig:
    id: str
    intent: str
    skills: List[str]
    constraints: List[str]

class PersonaLoader:
    """Load PCL personas from YAML config"""

    def __init__(self, config_path: str):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

    def load_persona(self, name: str) -> PersonaConfig:
        """Load a persona by name"""
        persona_data = self.config['personas'][name]
        return PersonaConfig(
            id=persona_data['id'],
            intent=persona_data['intent'],
            skills=persona_data.get('skills', []),
            constraints=persona_data.get('constraints', [])
        )

    def get_system_prompt(self, name: str) -> str:
        """Generate system prompt from persona"""
        persona = self.load_persona(name)

        prompt_parts = [
            f"# {persona.id}",
            "",
            f"**Purpose:** {persona.intent}",
            ""
        ]

        if persona.skills:
            prompt_parts.extend([
                "**Skills:**",
                *[f"- {skill}" for skill in persona.skills],
                ""
            ])

        if persona.constraints:
            prompt_parts.extend([
                "**Guidelines:**",
                *[f"- {constraint}" for constraint in persona.constraints],
                ""
            ])

        return "\n".join(prompt_parts)
```

### Step 4: Use with Anthropic API

Create `app.py`:

```python
import anthropic
from pcl_adapter import PersonaLoader

# Load personas
loader = PersonaLoader('personas.yaml')
system_prompt = loader.get_system_prompt('Assistant')

# Create Claude client
client = anthropic.Anthropic()

# Use persona
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    system=system_prompt,
    messages=[
        {"role": "user", "content": "Help me organize my tasks"}
    ]
)

print(response.content[0].text)
```

### Alternative: Use Provider-Specific Prompts

```bash
# Generate Claude-optimized prompt
npx pcl compile personas.pcl --format prompt --provider claude --output claude_prompt.txt
```

Then in Python:

```python
import anthropic

# Load pre-generated prompt
with open('claude_prompt.txt', 'r') as f:
    system_prompt = f.read()

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    system=system_prompt,
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Python Example: OpenAI

```python
import openai
from pcl_adapter import PersonaLoader

# Load persona
loader = PersonaLoader('personas.yaml')
system_prompt = loader.get_system_prompt('Assistant')

# Or use pre-generated OpenAI-optimized prompt
# with open('openai_prompt.txt', 'r') as f:
#     system_prompt = f.read()

# Use with OpenAI
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Help me with my tasks"}
    ]
)

print(response.choices[0].message.content)
```

---

## Go Integration

Go integration uses **JSON configs** + Go runtime adapter.

### Step 1: Generate JSON

```bash
npx pcl compile personas.pcl --format json --output personas.json
```

### Step 2: Create Go Adapter

Create `pcl/loader.go`:

```go
package pcl

import (
    "encoding/json"
    "fmt"
    "os"
    "strings"
)

type PersonaConfig struct {
    ID          string   `json:"id"`
    Intent      string   `json:"intent"`
    Skills      []string `json:"skills"`
    Constraints []string `json:"constraints"`
}

type Config struct {
    Version  string                    `json:"version"`
    Personas map[string]PersonaConfig `json:"personas"`
}

type PersonaLoader struct {
    config Config
}

// NewPersonaLoader loads PCL personas from JSON config
func NewPersonaLoader(configPath string) (*PersonaLoader, error) {
    data, err := os.ReadFile(configPath)
    if err != nil {
        return nil, err
    }

    var config Config
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, err
    }

    return &PersonaLoader{config: config}, nil
}

// LoadPersona loads a persona by name
func (l *PersonaLoader) LoadPersona(name string) (*PersonaConfig, error) {
    persona, ok := l.config.Personas[name]
    if !ok {
        return nil, fmt.Errorf("persona not found: %s", name)
    }
    return &persona, nil
}

// GetSystemPrompt generates a system prompt from persona
func (l *PersonaLoader) GetSystemPrompt(name string) (string, error) {
    persona, err := l.LoadPersona(name)
    if err != nil {
        return "", err
    }

    var parts []string
    parts = append(parts, fmt.Sprintf("# %s", persona.ID))
    parts = append(parts, "")
    parts = append(parts, fmt.Sprintf("**Purpose:** %s", persona.Intent))
    parts = append(parts, "")

    if len(persona.Skills) > 0 {
        parts = append(parts, "**Skills:**")
        for _, skill := range persona.Skills {
            parts = append(parts, fmt.Sprintf("- %s", skill))
        }
        parts = append(parts, "")
    }

    if len(persona.Constraints) > 0 {
        parts = append(parts, "**Guidelines:**")
        for _, constraint := range persona.Constraints {
            parts = append(parts, fmt.Sprintf("- %s", constraint))
        }
        parts = append(parts, "")
    }

    return strings.Join(parts, "\n"), nil
}
```

### Step 3: Use with Anthropic SDK

Create `main.go`:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "myapp/pcl"

    "github.com/anthropics/anthropic-sdk-go"
)

func main() {
    // Load personas
    loader, err := pcl.NewPersonaLoader("personas.json")
    if err != nil {
        log.Fatal(err)
    }

    systemPrompt, err := loader.GetSystemPrompt("Assistant")
    if err != nil {
        log.Fatal(err)
    }

    // Create Anthropic client
    client := anthropic.NewClient()

    // Use persona
    resp, err := client.Messages.Create(context.Background(), anthropic.MessageCreateParams{
        Model:  anthropic.ModelClaude3_5Sonnet20241022,
        System: systemPrompt,
        Messages: []anthropic.MessageParam{
            anthropic.NewUserMessage(anthropic.NewTextBlock("Help me organize my tasks")),
        },
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(resp.Content[0].Text)
}
```

### Alternative: Use Pre-Generated Prompts

```bash
npx pcl compile personas.pcl --format prompt --provider claude --output claude_prompt.txt
```

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/anthropics/anthropic-sdk-go"
)

func main() {
    // Load pre-generated prompt
    systemPrompt, err := os.ReadFile("claude_prompt.txt")
    if err != nil {
        log.Fatal(err)
    }

    client := anthropic.NewClient()
    resp, err := client.Messages.Create(context.Background(), anthropic.MessageCreateParams{
        Model:  anthropic.ModelClaude3_5Sonnet20241022,
        System: string(systemPrompt),
        Messages: []anthropic.MessageParam{
            anthropic.NewUserMessage(anthropic.NewTextBlock("Hello")),
        },
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(resp.Content[0].Text)
}
```

---

## Rust Integration

Rust integration uses **JSON configs** + Rust runtime adapter.

### Step 1: Generate JSON

```bash
npx pcl compile personas.pcl --format json --output personas.json
```

### Step 2: Add Dependencies

Add to `Cargo.toml`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### Step 3: Create Rust Adapter

Create `src/pcl/mod.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonaConfig {
    pub id: String,
    pub intent: String,
    #[serde(default)]
    pub skills: Vec<String>,
    #[serde(default)]
    pub constraints: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub version: String,
    pub personas: HashMap<String, PersonaConfig>,
}

pub struct PersonaLoader {
    config: Config,
}

impl PersonaLoader {
    /// Load PCL personas from JSON config
    pub fn new(config_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let data = fs::read_to_string(config_path)?;
        let config: Config = serde_json::from_str(&data)?;
        Ok(Self { config })
    }

    /// Load a persona by name
    pub fn load_persona(&self, name: &str) -> Option<&PersonaConfig> {
        self.config.personas.get(name)
    }

    /// Generate system prompt from persona
    pub fn get_system_prompt(&self, name: &str) -> Option<String> {
        let persona = self.load_persona(name)?;

        let mut parts = vec![
            format!("# {}", persona.id),
            String::new(),
            format!("**Purpose:** {}", persona.intent),
            String::new(),
        ];

        if !persona.skills.is_empty() {
            parts.push("**Skills:**".to_string());
            for skill in &persona.skills {
                parts.push(format!("- {}", skill));
            }
            parts.push(String::new());
        }

        if !persona.constraints.is_empty() {
            parts.push("**Guidelines:**".to_string());
            for constraint in &persona.constraints {
                parts.push(format!("- {}", constraint));
            }
            parts.push(String::new());
        }

        Some(parts.join("\n"))
    }
}
```

### Step 4: Use with LLM SDK

Create `src/main.rs`:

```rust
mod pcl;

use pcl::PersonaLoader;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load personas
    let loader = PersonaLoader::new("personas.json")?;
    let system_prompt = loader
        .get_system_prompt("Assistant")
        .expect("Persona not found");

    println!("System Prompt:\n{}", system_prompt);

    // Use with your LLM SDK of choice
    // Example: anthropic-sdk-rust (if available)

    Ok(())
}
```

### Alternative: Use Pre-Generated Prompts

```bash
npx pcl compile personas.pcl --format prompt --provider claude --output claude_prompt.txt
```

```rust
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load pre-generated prompt
    let system_prompt = fs::read_to_string("claude_prompt.txt")?;

    // Use with LLM SDK
    println!("{}", system_prompt);

    Ok(())
}
```

---

## Shell Integration

Shell integration uses **YAML/JSON** + command-line tools.

### Step 1: Generate YAML

```bash
pcl compile personas.pcl --format yaml --output personas.yaml
```

### Step 2: Extract Persona with yq

```bash
# Install yq (YAML query tool)
brew install yq  # macOS
# or
sudo apt install yq  # Linux

# Extract persona intent
yq '.personas.Assistant.intent' personas.yaml

# Extract all skills
yq '.personas.Assistant.skills[]' personas.yaml

# Get full persona as JSON
yq '.personas.Assistant' personas.yaml -o json
```

### Step 3: Use in Shell Scripts

Create `deploy.sh`:

```bash
#!/bin/bash

# Load persona from YAML
PERSONA_NAME="Assistant"
INTENT=$(yq ".personas.$PERSONA_NAME.intent" personas.yaml)
SKILLS=$(yq ".personas.$PERSONA_NAME.skills[]" personas.yaml)

# Build system prompt
SYSTEM_PROMPT="# $PERSONA_NAME

**Purpose:** $INTENT

**Skills:**
$(echo "$SKILLS" | sed 's/^/- /')"

# Use with Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"claude-3-5-sonnet-20241022\",
    \"system\": $(echo "$SYSTEM_PROMPT" | jq -Rs .),
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"Help me organize my tasks\"
    }]
  }"
```

### Alternative: Use Pre-Generated Prompts

```bash
# Generate prompt
pcl compile personas.pcl --format prompt --provider claude --output prompt.txt

# Use directly
SYSTEM_PROMPT=$(cat prompt.txt)

curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{
    \"model\": \"claude-3-5-sonnet-20241022\",
    \"system\": $(cat prompt.txt | jq -Rs .),
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]
  }"
```

---

## Universal JSON/YAML

For languages without adapters, use raw JSON/YAML parsing.

### JSON Schema

```json
{
  "version": "1.0.0",
  "$schema": "https://pcl-lang.org/schema/v1.json",
  "personas": {
    "<PersonaName>": {
      "id": "string",
      "intent": "string",
      "skills": ["string"],
      "constraints": ["string"]
    }
  }
}
```

### YAML Schema

```yaml
version: "1.0.0"
$schema: "https://pcl-lang.org/schema/v1.yaml"

personas:
  <PersonaName>:
    id: string
    intent: string
    skills:
      - string
    constraints:
      - string
```

### Generic Usage Pattern

1. **Parse config** (JSON/YAML)
2. **Extract persona** by name
3. **Build system prompt** from fields
4. **Use with LLM SDK**

---

## Best Practices

### 1. Choose the Right Format

| Language | Recommended Format | Why |
|----------|-------------------|-----|
| TypeScript | TypeScript | Native support, type safety |
| Python | YAML + Adapter | Human-readable, easy parsing |
| Go | JSON + Adapter | Native JSON support |
| Rust | JSON + Adapter | serde integration |
| Shell | YAML + yq | Easy querying |

### 2. Use Provider-Specific Prompts

Generate optimized prompts for each LLM:

```bash
# For Claude deployments
pcl compile personas.pcl --format prompt --provider claude -o claude.txt

# For OpenAI deployments
pcl compile personas.pcl --format prompt --provider openai -o openai.txt

# For Gemini deployments
pcl compile personas.pcl --format prompt --provider gemini -o gemini.txt
```

### 3. Version Control Configs

```bash
# Commit generated configs to git
git add personas.yaml
git add personas.json
git commit -m "Update persona configurations"
```

### 4. Automate Generation

Add to `package.json`:

```json
{
  "scripts": {
    "build": "pcl compile personas.pcl --format typescript --output personas.ts",
    "build:python": "pcl compile personas.pcl --format yaml --output personas.yaml",
    "build:go": "pcl compile personas.pcl --format json --output personas.json",
    "build:all": "npm run build && npm run build:python && npm run build:go"
  }
}
```

Or use Makefile:

```makefile
.PHONY: build-all

build-all: personas.ts personas.yaml personas.json

personas.ts: personas.pcl
	pcl compile personas.pcl --format typescript --output personas.ts

personas.yaml: personas.pcl
	pcl compile personas.pcl --format yaml --output personas.yaml

personas.json: personas.pcl
	pcl compile personas.pcl --format json --output personas.json
```

### 5. Share Personas Across Projects

Create a shared persona repository:

```bash
personas/
├── customer-support.pcl
├── code-reviewer.pcl
├── data-analyst.pcl
└── security-expert.pcl
```

Generate for all languages:

```bash
#!/bin/bash
for file in personas/*.pcl; do
  base=$(basename "$file" .pcl)
  pcl compile "$file" --format typescript --output "dist/ts/$base.ts"
  pcl compile "$file" --format yaml --output "dist/yaml/$base.yaml"
  pcl compile "$file" --format json --output "dist/json/$base.json"
done
```

---

## Example: Multi-Language Project

### Project Structure

```
my-ai-project/
├── personas/
│   └── assistant.pcl          # Source of truth
├── typescript/
│   └── personas.ts             # Generated TypeScript
├── python/
│   ├── personas.yaml           # Generated YAML
│   └── pcl_adapter.py          # Python adapter
├── go/
│   ├── personas.json           # Generated JSON
│   └── pcl/loader.go           # Go adapter
├── rust/
│   ├── personas.json           # Generated JSON
│   └── src/pcl/mod.rs          # Rust adapter
└── scripts/
    └── build.sh                # Generate all formats
```

### Build Script

```bash
#!/bin/bash
# scripts/build.sh

echo "Generating PCL outputs..."

# TypeScript
pcl compile personas/assistant.pcl --format typescript --output typescript/personas.ts

# Python
pcl compile personas/assistant.pcl --format yaml --output python/personas.yaml

# Go
pcl compile personas/assistant.pcl --format json --output go/personas.json

# Rust
pcl compile personas/assistant.pcl --format json --output rust/personas.json

echo "✅ All formats generated successfully"
```

---

## Summary

| Language | Format | Adapter Needed | Complexity | Type Safety |
|----------|--------|----------------|------------|-------------|
| TypeScript | TypeScript | ❌ No | Low | ✅ Full |
| Python | YAML | ✅ Yes | Medium | ⚠️ Runtime |
| Go | JSON | ✅ Yes | Medium | ✅ structs |
| Rust | JSON | ✅ Yes | Medium | ✅ Full |
| Shell | YAML/JSON | ✅ Yes (yq/jq) | High | ❌ None |

**Recommendation:**
- Use **TypeScript** for new projects (best experience)
- Use **YAML** for Python (human-readable)
- Use **JSON** for Go/Rust (native support)
- Use **provider-specific prompts** for direct LLM integration

---

## See Also

- [Getting Started Guide](./GETTING-STARTED.md)
- [Code Generator API](../api/CODEGEN.md)
- [Example Projects](../../examples/)

---

**Last Updated:** 2026-01-16
**Version:** 1.0.0
