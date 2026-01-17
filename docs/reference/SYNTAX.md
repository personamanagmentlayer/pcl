# PCL Syntax Reference

**Version**: 1.0.0 | **Last Updated**: 2026-01-17

This document provides a human-readable reference for PCL (Persona Control Language) syntax. For the formal EBNF grammar specification, see [src/grammar/pcl.ebnf](../../src/grammar/pcl.ebnf).

---

## Table of Contents

- [Program Structure](#program-structure)
- [Persona Declarations](#persona-declarations)
- [Team Declarations](#team-declarations)
- [Workflow Declarations](#workflow-declarations)
- [Configuration Blocks](#configuration-blocks)
- [Prompt Blocks](#prompt-blocks)
- [Expressions](#expressions)
- [Comments](#comments)

---

## Program Structure

A PCL program consists of one or more declarations:

```pcl
// Import statements (optional)
import { SomePersona } from "@pcl/stdlib"

// Persona declarations
persona MY_PERSONA {
  // persona body
}

// Team declarations
team MY_TEAM {
  // team body
}

// Workflow declarations
workflow MY_WORKFLOW {
  // workflow body
}
```

---

## Persona Declarations

### Basic Syntax

```pcl
persona IDENTIFIER {
  name: "Display Name"
  version: "1.0.0"

  metadata: {
    category: "category_name"
    description: "Brief description"
    author: "Author Name"
  }

  config: {
    model: "model-name"
    temperature: 0.7
    max_tokens: 2000
  }

  prompts: {
    system: """System prompt content"""
    user: """User prompt template"""
  }
}
```

### Example

```pcl
persona CODE_REVIEWER {
  name: "Code Reviewer"
  version: "2.0.0"

  metadata: {
    category: "development"
    description: "Expert code reviewer focusing on quality and security"
    author: "PCL Team"
    tags: ["code-review", "security", "quality"]
  }

  config: {
    model: "claude-sonnet-4"
    temperature: 0.3
    max_tokens: 4000
    thinking_budget: 10000
  }

  prompts: {
    system: """
    You are an expert code reviewer with deep knowledge of:
    - Software design patterns and best practices
    - Security vulnerabilities (OWASP Top 10)
    - Performance optimization
    - Code maintainability and readability

    Review code thoroughly and provide actionable feedback.
    """
  }
}
```

### Property Reference

| Property   | Type   | Required | Description                      |
| ---------- | ------ | -------- | -------------------------------- |
| `name`     | String | ✅       | Display name for the persona     |
| `version`  | String | ✅       | Semantic version (e.g., "1.0.0") |
| `metadata` | Object | ✅       | Metadata information             |
| `config`   | Object | ❌       | Model configuration              |
| `prompts`  | Object | ✅       | System and user prompts          |

---

## Team Declarations

Teams group multiple personas together with coordination logic.

### Basic Syntax

```pcl
team IDENTIFIER {
  name: "Team Name"
  description: "Team description"

  members: [
    PERSONA_ID,
    ANOTHER_PERSONA_ID
  ]

  coordinator: COORDINATOR_PERSONA_ID

  config: {
    merge_mode: "consensus"
    voting_threshold: 0.66
  }
}
```

### Example

```pcl
team SECURITY_REVIEW {
  name: "Security Review Team"
  description: "Comprehensive security analysis team"

  members: [
    SECURITY_ANALYST,
    CODE_REVIEWER,
    PENETRATION_TESTER
  ]

  coordinator: SECURITY_LEAD

  config: {
    merge_mode: "consensus"
    voting_threshold: 0.75
    parallel_execution: true
  }
}
```

### Merge Modes

| Mode         | Description                     |
| ------------ | ------------------------------- |
| `primary`    | Use first persona's response    |
| `consensus`  | Require agreement from majority |
| `weighted`   | Weight responses by confidence  |
| `sequential` | Execute in order, pass results  |
| `parallel`   | Run all simultaneously          |

---

## Workflow Declarations

Workflows define multi-step processes with conditional logic and error handling.

### Basic Syntax

```pcl
workflow IDENTIFIER {
  name: "Workflow Name"
  description: "Workflow description"

  config: {
    timeout: 300000
    retry_attempts: 3
    error_handling: "stop"
  }

  steps: [
    {
      id: "step1"
      persona: PERSONA_ID
      input: { /* input data */ }
      conditions: { /* conditional logic */ }
    }
  ]
}
```

### Example

```pcl
workflow CODE_REVIEW_PROCESS {
  name: "Automated Code Review"
  description: "Multi-stage code review with security checks"

  config: {
    timeout: 600000  // 10 minutes
    retry_attempts: 2
    error_handling: "continue"
  }

  steps: [
    {
      id: "static_analysis"
      persona: CODE_ANALYZER
      input: {
        code: "{{ input.code }}",
        language: "{{ input.language }}"
      }
    },
    {
      id: "security_scan"
      persona: SECURITY_ANALYST
      input: {
        code: "{{ input.code }}",
        findings: "{{ steps.static_analysis.output }}"
      },
      conditions: {
        run_if: "steps.static_analysis.success"
      }
    },
    {
      id: "final_review"
      persona: CODE_REVIEWER
      input: {
        code: "{{ input.code }}",
        static_results: "{{ steps.static_analysis.output }}",
        security_results: "{{ steps.security_scan.output }}"
      }
    }
  ]
}
```

---

## Configuration Blocks

Configuration blocks specify model parameters and runtime settings.

### Structure

```pcl
config: {
  // Model selection
  model: "model-name"

  // Generation parameters
  temperature: 0.7       // 0.0-1.0 (creativity)
  max_tokens: 2000       // Max response length
  top_p: 0.9            // Nucleus sampling
  frequency_penalty: 0.0 // Reduce repetition
  presence_penalty: 0.0  // Encourage diversity

  // Extended thinking (Claude)
  thinking_budget: 10000 // Extended thinking tokens

  // Timeouts and retries
  timeout: 30000        // Milliseconds
  retry_attempts: 3     // Number of retries
  retry_delay: 1000     // Delay between retries

  // Streaming
  stream: false         // Enable response streaming
}
```

---

## Prompt Blocks

Prompts define the instructions sent to the AI model.

### System Prompts

System prompts set the persona's behavior and expertise:

```pcl
prompts: {
  system: """
  You are an expert [role] with deep knowledge of:
  - Skill 1
  - Skill 2
  - Skill 3

  Your approach:
  1. Analyze thoroughly
  2. Provide clear explanations
  3. Suggest best practices
  """
}
```

### User Prompt Templates

User prompts can include template variables:

````pcl
prompts: {
  user: """
  Review the following {{ language }} code:

  ```{{ language }}
  {{ code }}
````

Focus on: {{ focus_areas }}
"""
}

````

### Multi-line Strings

PCL supports three string formats:

1. **Triple-quoted strings** (preserves formatting):
   ```pcl
   """
   Multi-line
   content
   """
````

2. **Raw strings** (no escape sequences):

   ```pcl
   r"C:\path\to\file.txt"
   ```

3. **Template strings** (with interpolation):
   ```pcl
   `Hello ${name}, welcome!`
   ```

---

## Expressions

### Literals

```pcl
// Strings
"double quotes"
'single quotes'
"""triple quotes for multi-line"""
`template ${variable} string`

// Numbers
42          // Integer
3.14        // Float
0xFF        // Hexadecimal
0b1010      // Binary

// Booleans
true
false

// Null
null
```

### Operators

| Category   | Operators                        | Example              |
| ---------- | -------------------------------- | -------------------- |
| Arithmetic | `+`, `-`, `*`, `/`, `%`, `**`    | `2 + 2`, `x * y`     |
| Comparison | `==`, `!=`, `<`, `>`, `<=`, `>=` | `age >= 18`          |
| Logical    | `&&`, `\|\|`, `!`                | `a && b`, `!valid`   |
| String     | `+` (concat)                     | `"Hello " + "World"` |

### Built-in Functions

```pcl
// String operations
len("text")           // Length
upper("text")         // Uppercase
lower("text")         // Lowercase
trim("  text  ")      // Remove whitespace

// Array operations
len([1, 2, 3])        // Array length
concat([1], [2, 3])   // Concatenate arrays

// Type checking
typeof(value)         // Get type name
```

---

## Comments

PCL supports three comment styles:

### Line Comments

```pcl
// This is a line comment
persona MY_PERSONA {  // Inline comment
  name: "Example"
}
```

### Block Comments

```pcl
/*
 * This is a
 * block comment
 */
persona MY_PERSONA {
  /* Inline block */
  name: "Example"
}
```

### Documentation Comments

```pcl
/// This persona handles code reviews
/// @category development
/// @version 2.0.0
persona CODE_REVIEWER {
  // ...
}
```

---

## Identifiers

### Naming Conventions

| Type      | Format             | Example          |
| --------- | ------------------ | ---------------- |
| Personas  | `UPPER_SNAKE_CASE` | `CODE_REVIEWER`  |
| Teams     | `UPPER_SNAKE_CASE` | `SECURITY_TEAM`  |
| Workflows | `UPPER_SNAKE_CASE` | `REVIEW_PROCESS` |
| Variables | `snake_case`       | `user_input`     |
| Types     | `PascalCase`       | `PersonaType`    |

### Reserved Keywords

The following keywords are reserved and cannot be used as identifiers:

**Declarations**: `persona`, `team`, `workflow`, `skill`, `type`, `interface`, `enum`, `fn`

**Control Flow**: `if`, `else`, `match`, `for`, `while`, `break`, `continue`, `return`

**Modifiers**: `pub`, `priv`, `async`, `static`

**Literals**: `true`, `false`, `null`

**Operators**: `and`, `or`, `not`, `in`, `is`

---

## Type System

### Basic Types

| Type     | Description     | Example            |
| -------- | --------------- | ------------------ |
| `String` | Text values     | `"Hello"`          |
| `Int`    | Integers        | `42`               |
| `Float`  | Decimal numbers | `3.14`             |
| `Bool`   | Boolean values  | `true`, `false`    |
| `Array`  | Lists           | `[1, 2, 3]`        |
| `Object` | Key-value maps  | `{ key: "value" }` |

### Optional Types

```pcl
let maybe_value: String? = null;  // Optional string
```

### Generic Types

```pcl
Array<String>   // Array of strings
Map<String, Int>  // Map with string keys and integer values
```

---

## Error Handling

### Try-Catch Blocks

```pcl
workflow SAFE_PROCESS {
  steps: [
    {
      id: "risky_operation"
      persona: PROCESSOR
      error_handling: {
        strategy: "retry"
        max_attempts: 3
        fallback: {
          persona: SAFE_FALLBACK
        }
      }
    }
  ]
}
```

### Workflow Error Strategies

| Strategy   | Behavior                       |
| ---------- | ------------------------------ |
| `stop`     | Stop execution on error        |
| `continue` | Skip failed step, continue     |
| `retry`    | Retry with exponential backoff |
| `fallback` | Use alternate persona          |

---

## Best Practices

### 1. Use Descriptive Names

✅ **Good**:

```pcl
persona CODE_SECURITY_ANALYST {
  name: "Code Security Analyst"
}
```

❌ **Bad**:

```pcl
persona CSA {
  name: "CSA"
}
```

### 2. Version Your Personas

```pcl
persona MY_PERSONA {
  version: "2.1.0"  // Major.Minor.Patch
}
```

### 3. Document Complex Logic

```pcl
workflow COMPLEX_PROCESS {
  // First, analyze the input for potential issues
  // This step is critical for security validation
  steps: [
    {
      id: "security_check"
      // ...
    }
  ]
}
```

### 4. Use Configuration Defaults

```pcl
config: {
  temperature: 0.7     // Default for balanced creativity
  max_tokens: 2000     // Sufficient for most tasks
  timeout: 30000       // 30 seconds
}
```

---

## Complete Example

Here's a full PCL program demonstrating multiple features:

```pcl
// Security code review system
persona SECURITY_ANALYST {
  name: "Security Analyst"
  version: "1.0.0"

  metadata: {
    category: "security"
    description: "Identifies security vulnerabilities in code"
    tags: ["security", "owasp", "vulnerabilities"]
  }

  config: {
    model: "claude-sonnet-4"
    temperature: 0.3
    max_tokens: 3000
  }

  prompts: {
    system: """
    You are a security expert specializing in:
    - OWASP Top 10 vulnerabilities
    - Secure coding practices
    - Common attack vectors

    Analyze code for security issues and provide remediation guidance.
    """
  }
}

persona CODE_REVIEWER {
  name: "Code Reviewer"
  version: "1.0.0"

  config: {
    model: "claude-sonnet-4"
    temperature: 0.5
  }

  prompts: {
    system: """Expert code reviewer focusing on quality and maintainability."""
  }
}

team REVIEW_TEAM {
  name: "Complete Review Team"

  members: [
    SECURITY_ANALYST,
    CODE_REVIEWER
  ]

  config: {
    merge_mode: "sequential"
  }
}

workflow CODE_REVIEW {
  name: "Automated Code Review"

  config: {
    timeout: 300000
    retry_attempts: 2
  }

  steps: [
    {
      id: "security"
      persona: SECURITY_ANALYST
      input: { code: "{{ input.code }}" }
    },
    {
      id: "quality"
      persona: CODE_REVIEWER
      input: {
        code: "{{ input.code }}",
        security_findings: "{{ steps.security.output }}"
      }
    }
  ]
}
```

---

## See Also

- [Formal Grammar Specification](../../src/grammar/pcl.ebnf) - EBNF grammar
- [Getting Started Guide](../guides/GETTING-STARTED.md) - Beginner tutorial
- [Language Reference](LANGUAGE.md) - Detailed language semantics
- [Error Codes](ERROR-CODES.md) - Error reference
- [Examples](../examples/) - Code examples

---

**Questions?** See the [PCL Documentation](../README.md) for more information.
