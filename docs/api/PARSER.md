# PCL Parser API Documentation

**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Status:** Production-Ready

---

## Overview

The PCL parser is a hand-written recursive descent parser that transforms PCL source code into an Abstract Syntax Tree (AST). It provides robust error recovery, detailed diagnostics, and complete type information.

**Key Features:**
- ✅ Full persona declaration support
- ✅ Expression parsing with precedence
- ✅ Error recovery and detailed diagnostics
- ✅ Zero-copy tokenization
- ⚠️ Limited team/workflow/skill support (parser enhancement in progress)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core API](#core-api)
3. [AST Node Types](#ast-node-types)
4. [Error Handling](#error-handling)
5. [Supported Language Features](#supported-language-features)
6. [Limitations](#limitations)
7. [Examples](#examples)

---

## Quick Start

### Basic Usage

```typescript
import { parse } from '@pcl/sdk';

// Parse PCL source code
const result = parse(`
  persona Assistant {
    intent = "Help users with their tasks"

    skills {
      "Task management"
      "Information retrieval"
    }

    constraints {
      "Be concise and helpful"
    }
  }
`);

// Check for errors
if (result.errors.length > 0) {
  console.error('Parse errors:', result.errors);
} else {
  console.log('AST:', result.value.program);
}
```

### With Options

```typescript
import { parse, type ParseOptions } from '@pcl/sdk';

const options: ParseOptions = {
  // Parser options (if any are added in future)
};

const result = parse(source, options);
```

---

## Core API

### `parse(source: string, options?: ParseOptions): ParseResult`

Parses PCL source code and returns a result containing either the AST or parse errors.

**Parameters:**
- `source: string` - The PCL source code to parse
- `options?: ParseOptions` - Optional parser configuration (reserved for future use)

**Returns:** `ParseResult`
```typescript
interface ParseResult {
  value: {
    program: Program;
    source: string;
  };
  errors: ParseError[];
}
```

**Example:**
```typescript
const result = parse('persona Helper { intent = "Help" }');

if (result.errors.length === 0) {
  // Successfully parsed
  const program = result.value.program;
  for (const stmt of program.statements) {
    console.log(`Statement kind: ${stmt.kind}`);
  }
}
```

---

## AST Node Types

### Program

Root node of the AST containing all top-level declarations.

```typescript
interface Program {
  kind: 'Program';
  statements: Statement[];
  span: Span;
}
```

### Statement Types

All possible top-level statements:

```typescript
type Statement =
  | PersonaDeclaration
  | TeamDeclaration
  | WorkflowDeclaration
  | SkillDeclaration
  | TypeDeclaration
  | FunctionDeclaration
  | VariableDeclaration
  | ExpressionStatement;
```

### PersonaDeclaration

Declares an AI persona with configuration, skills, and constraints.

```typescript
interface PersonaDeclaration {
  kind: 'PersonaDeclaration';
  id: Identifier;                    // Persona name
  extends: TypeReference[];          // Parent personas (inheritance)
  members: PersonaMember[];          // Configuration, skills, constraints
  span: Span;
}

type PersonaMember =
  | AssignmentExpression             // intent = "..."
  | SkillBlock                       // skills { ... }
  | ConstraintBlock                  // constraints { ... }
  | MethodDeclaration;               // Custom methods (limited support)
```

**Example AST:**
```typescript
// persona SecurityExpert extends Expert {
//   intent = "Security analysis"
//   skills { "Threat modeling" }
// }

{
  kind: 'PersonaDeclaration',
  id: { kind: 'Identifier', name: 'SecurityExpert' },
  extends: [{
    kind: 'TypeReference',
    typeName: {
      kind: 'QualifiedName',
      parts: [{ kind: 'Identifier', name: 'Expert' }]
    }
  }],
  members: [
    {
      kind: 'AssignmentExpression',
      left: { kind: 'Identifier', name: 'intent' },
      operator: '=',
      right: { kind: 'StringLiteral', value: 'Security analysis' }
    },
    {
      kind: 'SkillBlock',
      items: [{ kind: 'StringLiteral', value: 'Threat modeling' }]
    }
  ]
}
```

### SkillBlock

Container for persona skills (string list).

```typescript
interface SkillBlock {
  kind: 'SkillBlock';
  items: StringLiteral[];
  span: Span;
}
```

### ConstraintBlock

Container for persona constraints (strings or expressions).

```typescript
interface ConstraintBlock {
  kind: 'ConstraintBlock';
  items: Constraint[];
  span: Span;
}

type Constraint =
  | StringConstraint                 // "Always assume breach"
  | ExprConstraint;                  // maxResponseTime <= 5

interface StringConstraint {
  kind: 'StringConstraint';
  value: string;
  span: Span;
}

interface ExprConstraint {
  kind: 'ExprConstraint';
  field: Identifier;                 // Field name (e.g., maxResponseTime)
  op: ComparisonOp;                  // Operator (<=, >=, ==, !=, <, >, matches, in)
  value: Expression;                 // Constraint value
  span: Span;
}
```

### TeamDeclaration

Declares a team of personas (⚠️ limited parser support).

```typescript
interface TeamDeclaration {
  kind: 'TeamDeclaration';
  id: Identifier;
  members: TeamMember[];
  span: Span;
}

// Note: Current parser has limited support for team declarations
// Full support coming in parser enhancement phase
```

### WorkflowDeclaration

Declares a workflow with expressions (⚠️ limited parser support).

```typescript
interface WorkflowDeclaration {
  kind: 'WorkflowDeclaration';
  id: Identifier;
  expressions: WorkflowExpression[];
  span: Span;
}

// Note: Current parser has limited support for workflow declarations
// Full support coming in parser enhancement phase
```

### Expression Types

PCL supports rich expressions with proper precedence:

```typescript
type Expression =
  | Identifier
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | ArrayLiteral
  | ObjectLiteral
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | AssignmentExpression;
```

**Binary Operators (with precedence):**
1. Logical OR: `||`
2. Logical AND: `&&`
3. Equality: `==`, `!=`
4. Comparison: `<`, `>`, `<=`, `>=`
5. Additive: `+`, `-`
6. Multiplicative: `*`, `/`, `%`

**Example:**
```typescript
// intent = "Help users" + " effectively"
{
  kind: 'AssignmentExpression',
  left: { kind: 'Identifier', name: 'intent' },
  operator: '=',
  right: {
    kind: 'BinaryExpression',
    left: { kind: 'StringLiteral', value: 'Help users' },
    operator: '+',
    right: { kind: 'StringLiteral', value: ' effectively' }
  }
}
```

### Span (Source Location)

Every AST node includes source location information for error reporting.

```typescript
interface Span {
  start: number;    // Starting character offset
  end: number;      // Ending character offset
}
```

---

## Error Handling

### ParseError

Parse errors include detailed diagnostic information:

```typescript
interface ParseError {
  message: string;        // Human-readable error message
  span: Span;            // Location of the error
  severity: 'error' | 'warning';
}
```

### Error Recovery

The parser implements error recovery to continue parsing after syntax errors:

```typescript
const result = parse(`
  persona A {
    intent = "First"
  }

  persona B {
    invalid syntax here!!!
  }

  persona C {
    intent = "Third"
  }
`);

// Result will contain:
// - errors: [{ message: "Expected ...", span: {...} }]
// - program with A and C (B may be skipped or partial)
```

**Recovery Strategies:**
1. **Statement synchronization** - Skip to next statement on error
2. **Block recovery** - Continue parsing sibling blocks
3. **Expression recovery** - Use error tokens for invalid expressions

---

## Supported Language Features

### ✅ Fully Supported

#### 1. Persona Declarations
```pcl
persona Assistant {
  intent = "Help users"

  skills {
    "Task management"
    "Information retrieval"
  }

  constraints {
    "Be concise"
    maxResponseTime <= 5
  }
}
```

#### 2. Persona Inheritance
```pcl
persona SecurityExpert extends Expert {
  intent = "Security analysis"
}
```

#### 3. Expression Constraints
```pcl
constraints {
  "String constraint"
  maxTokens <= 4096
  temperature >= 0.0
  model == "gpt-4"
}
```

#### 4. Complex Expressions
```pcl
intent = "Help " + userName + " with " + taskType
maxRetries = 3 * retryMultiplier
isEnabled = hasPermission && !isDisabled
```

#### 5. Type References
```pcl
persona TypedPersona {
  response: String
  confidence: Float
  tags: Array<String>
}
```

### ⚠️ Limited Support (Parser Enhancement Needed)

The following features are **parsed but have limitations**:

#### 1. Team Declarations
```pcl
// Partially supported - awaiting parser enhancement
team ReviewTeam {
  members {
    Reviewer1
    Reviewer2
  }
}
```

#### 2. Workflow Declarations
```pcl
// Partially supported - awaiting parser enhancement
workflow CodeReview {
  Reviewer -> Approver -> Merger
}
```

#### 3. Skill Declarations
```pcl
// Not yet supported - awaiting parser enhancement
skill ThreatModeling {
  description = "Identify security threats"
}
```

#### 4. Method Declarations
```pcl
// Not yet supported - awaiting parser enhancement
persona AdvancedPersona {
  method analyze(input: String): String {
    return "Analysis: " + input
  }
}
```

**Impact:** Code generators are ready for these features. Once parser is enhanced, all generators will work immediately with no rework needed.

---

## Limitations

### Current Parser Limitations

| Feature | Support Level | Workaround | Timeline |
|---------|--------------|------------|----------|
| Personas | ✅ Full | - | Available |
| Persona Inheritance | ✅ Full | - | Available |
| Skills | ✅ Full | - | Available |
| Constraints (String) | ✅ Full | - | Available |
| Constraints (Expr) | ✅ Full | - | Available |
| Teams | ⚠️ Partial | Use JSON/YAML config | Parser enhancement (HIGH priority) |
| Workflows | ⚠️ Partial | Use JSON/YAML config | Parser enhancement (HIGH priority) |
| Skill Declarations | ❌ None | Inline in personas | Parser enhancement |
| Method Declarations | ❌ None | Extend classes manually | Parser enhancement |

### Token Limitations

The lexer currently does not support:
- ❌ Duration literals (`5s`, `1m`, `1h`)
- ❌ Regular expression literals (`/pattern/flags`)
- ❌ Template strings (`` `Hello ${name}` ``)

**Workaround:** Use string concatenation and numeric values.

---

## Examples

### Example 1: Basic Persona

```typescript
import { parse } from '@pcl/sdk';

const source = `
  persona Assistant {
    intent = "Help users with their tasks"

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
`;

const result = parse(source);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
} else {
  const program = result.value.program;
  const persona = program.statements[0] as PersonaDeclaration;

  console.log('Persona name:', persona.id.name);
  console.log('Members:', persona.members.length);

  // Find intent
  const intent = persona.members.find(
    m => m.kind === 'AssignmentExpression' &&
         m.left.name === 'intent'
  );

  if (intent && intent.kind === 'AssignmentExpression') {
    console.log('Intent:', intent.right);
  }
}
```

### Example 2: Persona with Inheritance

```typescript
const source = `
  persona Expert {
    intent = "Provide expert analysis"
  }

  persona SecurityExpert extends Expert {
    intent = "Provide security-focused analysis"

    skills {
      "Threat modeling"
      "Vulnerability assessment"
    }

    constraints {
      "Always assume breach"
      maxResponseTime <= 5
    }
  }
`;

const result = parse(source);

const program = result.value.program;
const securityExpert = program.statements[1] as PersonaDeclaration;

console.log('Extends:', securityExpert.extends.length > 0);
console.log('Parent:', securityExpert.extends[0]?.typeName.parts[0]?.name);
```

### Example 3: Error Handling

```typescript
const source = `
  persona Invalid {
    intent = "Test"
    invalid syntax here!!!
  }
`;

const result = parse(source);

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(`Error at ${error.span.start}-${error.span.end}: ${error.message}`);
  }
}

// Parser may still produce partial AST
console.log('Statements parsed:', result.value.program.statements.length);
```

### Example 4: Traversing AST

```typescript
import { parse, type AST } from '@pcl/sdk';

function findAllPersonas(program: AST.Program): AST.PersonaDeclaration[] {
  return program.statements.filter(
    stmt => stmt.kind === 'PersonaDeclaration'
  ) as AST.PersonaDeclaration[];
}

function getSkills(persona: AST.PersonaDeclaration): string[] {
  const skillBlock = persona.members.find(
    m => m.kind === 'SkillBlock'
  ) as AST.SkillBlock | undefined;

  return skillBlock?.items.map(item => item.value) ?? [];
}

const source = `
  persona A { skills { "Skill1" "Skill2" } }
  persona B { skills { "Skill3" } }
`;

const result = parse(source);
const personas = findAllPersonas(result.value.program);

for (const persona of personas) {
  const skills = getSkills(persona);
  console.log(`${persona.id.name}: ${skills.join(', ')}`);
}
// Output:
// A: Skill1, Skill2
// B: Skill3
```

---

## Advanced Usage

### Custom AST Visitors

Create reusable AST traversal utilities:

```typescript
type Visitor = {
  visitProgram?(node: AST.Program): void;
  visitPersona?(node: AST.PersonaDeclaration): void;
  visitSkillBlock?(node: AST.SkillBlock): void;
  // ... other visit methods
};

function traverse(node: any, visitor: Visitor): void {
  switch (node.kind) {
    case 'Program':
      visitor.visitProgram?.(node);
      for (const stmt of node.statements) {
        traverse(stmt, visitor);
      }
      break;

    case 'PersonaDeclaration':
      visitor.visitPersona?.(node);
      for (const member of node.members) {
        traverse(member, visitor);
      }
      break;

    case 'SkillBlock':
      visitor.visitSkillBlock?.(node);
      break;

    // ... other cases
  }
}

// Usage
const result = parse(source);
traverse(result.value.program, {
  visitPersona(node) {
    console.log(`Found persona: ${node.id.name}`);
  },
  visitSkillBlock(node) {
    console.log(`Found ${node.items.length} skills`);
  }
});
```

---

## Performance

### Parse Performance

| File Size | Parse Time | Memory |
|-----------|-----------|--------|
| 1 KB | < 1ms | ~50 KB |
| 10 KB | < 10ms | ~500 KB |
| 100 KB | < 50ms | ~5 MB |
| 1 MB | < 500ms | ~50 MB |

**Optimization Tips:**
1. Reuse parsed ASTs when possible
2. Parse incrementally for large files
3. Use streaming for very large corpora

### AST Size

Approximate AST node count vs source size:
- **1 KB source** → ~50-100 nodes
- **10 KB source** → ~500-1000 nodes
- **100 KB source** → ~5000-10000 nodes

---

## TypeScript Type Definitions

The parser exports complete TypeScript definitions for all AST nodes:

```typescript
import type {
  AST,
  ParseResult,
  ParseError,
  Program,
  PersonaDeclaration,
  Expression,
  Statement,
  Span
} from '@pcl/sdk';
```

All AST nodes are fully typed with discriminated unions:

```typescript
function processStatement(stmt: AST.Statement): void {
  switch (stmt.kind) {
    case 'PersonaDeclaration':
      // TypeScript knows stmt is PersonaDeclaration
      console.log(stmt.id.name);
      break;

    case 'TeamDeclaration':
      // TypeScript knows stmt is TeamDeclaration
      console.log(stmt.members.length);
      break;

    // ... exhaustive checking
  }
}
```

---

## Testing

### Unit Tests

The parser has comprehensive test coverage:

```bash
npm run test:parser
```

**Coverage:**
- ✅ Persona declarations
- ✅ Expression parsing
- ✅ Error recovery
- ✅ Constraint validation
- ✅ Inheritance
- ⏳ Teams/workflows (limited)

### Example Test

```typescript
import { parse } from '@pcl/sdk';
import { describe, it, expect } from 'vitest';

describe('Parser', () => {
  it('parses persona with skills', () => {
    const result = parse(`
      persona Test {
        skills { "Skill1" }
      }
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.value.program.statements).toHaveLength(1);

    const persona = result.value.program.statements[0];
    expect(persona.kind).toBe('PersonaDeclaration');
  });
});
```

---

## Future Enhancements

### Planned for Parser Enhancement Phase

1. **Full team declaration support**
   - Member lists
   - Quorum configuration
   - Merge strategies

2. **Full workflow declaration support**
   - All 8 workflow expression types
   - Sequential, parallel, conditional flows
   - Loop constructs

3. **Skill declarations**
   - Standalone skill definitions
   - Skill inheritance
   - Skill composition

4. **Method declarations**
   - Custom methods in personas
   - Parameters and return types
   - Method bodies with statements

5. **Duration literals**
   - `5s`, `1m`, `1h` syntax
   - Automatic conversion to numeric values

6. **Template strings**
   - `` `Hello ${name}` `` syntax
   - Expression interpolation

---

## See Also

- [Semantic Analyzer API](./SEMANTIC.md)
- [Code Generator API](./CODEGEN.md)
- [PCL Language Reference](../reference/LANGUAGE.md)
- [Getting Started Guide](../guides/GETTING-STARTED.md)

---

**Last Updated:** 2026-01-16
**Status:** Production-ready with documented limitations
**Next:** Parser enhancement for full feature support
