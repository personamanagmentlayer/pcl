# GitHub Copilot Instructions for PCL (Persona Control Language)

## Project Overview

**PCL (Persona Control Language)** is a domain-specific programming language and compiler for AI persona management. This is a TypeScript-based compiler project that includes:

- **Lexer**: Tokenization and scanning
- **Parser**: AST generation from tokens
- **Semantic Analysis**: Type checking, validation, and symbol resolution
- **Runtime**: Execution engine for PCL programs
- **Standard Library**: Built-in personas, types, and utilities
- **CLI**: Command-line interface for PCL tools

**Tech Stack**: TypeScript 5.3+, Node.js, ESM modules, Vitest for testing

### PCL Bootstrap System

**Important**: This project includes a **PCL-Lite Bootstrap** system that enables AI assistants to interpret `/persona` commands for multi-persona collaboration.

- **Bootstrap File**: `../.roadmap/bootstrap/BOOTSTRAP_EN.md`
- **Purpose**: Embedded runtime v1.0 for AI chat interfaces (ChatGPT, Claude, Gemini, etc.)
- **Personas**: 25+ built-in personas (ARCHI, SEC, DEV, DEVOPS, CRITIC, etc.) with specialized skills
- **Commands**: 120+ `/persona` commands for activation, composition, teams, workflows, and more
- **Domain Focus**: Standardization personas (STANDARD_ARCHITECT, SPEC_EDITOR, COMPLIANCE_ENGINEER, etc.)

When working on PCL code generation, reference the bootstrap specification to understand the target runtime behavior and persona system that PCL compiles to.

**Key Bootstrap Concepts**:

- **Persona Activation**: `/persona [id]` - Activate a persona with specialized capabilities
- **Team Composition**: `/team [id]` - Load pre-configured teams (e.g., security-review, dream-team, standardization)
- **Shared Skills**: Personas inherit foundation, technical, security, architecture, standards, and tools skills
- **Merge Modes**: `primary`, `consensus`, `weighted`, `sequential`, `parallel` for multi-persona responses
- **Workflow Orchestration**: Define and execute multi-step workflows with persona handoffs

---

## Core Architecture Principles

### 1. **Compiler Pipeline**

```
Source Code → Lexer → Parser → Semantic Analyzer → Codegen → Runtime
```

- Each phase is **pure and testable**
- Errors are **collected, not thrown** (use `Result<T, Error[]>` pattern)
- Transformations are **immutable** (return new AST nodes, don't mutate)
- **Position tracking** is mandatory for all AST nodes (for error messages)

### 2. **Type System**

- **Strongly typed** with TypeScript
- Use **discriminated unions** for AST nodes (e.g., `type: 'PersonaDeclaration'`)
- Leverage **branded types** for identifiers (e.g., `PersonaId`, `SkillId`)
- **Nominal typing** over structural where semantics matter

### 3. **Error Handling**

```typescript
// ✅ GOOD: Return Result type
function parse(input: string): Result<AST, ParseError[]> {
  const errors: ParseError[] = [];
  // ... collect errors
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: ast };
}

// ❌ BAD: Throw exceptions in compiler code
function parse(input: string): AST {
  throw new Error('Parse failed'); // Don't do this
}
```

---

## Coding Standards

### TypeScript Guidelines

1. **Strict Mode Always**

   ```typescript
   // tsconfig.json has strict: true
   // No implicit any, no unused variables, etc.
   ```

2. **Prefer `const` over `let`**

   ```typescript
   const tokens = lexer.scan(source); // ✅
   let tokens = lexer.scan(source); // ❌
   ```

3. **Use Readonly for Immutability**

   ```typescript
   interface ASTNode {
     readonly type: string;
     readonly position: Position;
     readonly children: readonly ASTNode[]; // ✅
   }
   ```

4. **Discriminated Unions for AST**

   ```typescript
   type Expression =
     | { type: 'Identifier'; name: string }
     | { type: 'Literal'; value: string | number }
     | { type: 'BinaryOp'; left: Expression; op: string; right: Expression };

   function evaluate(expr: Expression): Value {
     switch (
       expr.type // Type narrowing works!
     ) {
       case 'Identifier':
         return lookupVariable(expr.name);
       case 'Literal':
         return expr.value;
       case 'BinaryOp':
         return evalBinaryOp(expr);
     }
   }
   ```

5. **Brand Types for Domain Concepts**

   ```typescript
   type PersonaId = string & { readonly __brand: 'PersonaId' };
   type SkillId = string & { readonly __brand: 'SkillId' };

   function createPersonaId(id: string): PersonaId {
     return id as PersonaId;
   }
   ```

6. **Avoid `any`, Use `unknown` Instead**

   ```typescript
   function processInput(input: unknown) {
     // ✅
     if (typeof input === 'string') {
       // TypeScript knows input is string here
     }
   }

   function processInput(input: any) {
     // ❌
     // Loses all type safety
   }
   ```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `persona-parser.ts`)
- **Classes**: `PascalCase` (e.g., `PersonaDeclaration`)
- **Interfaces**: `PascalCase` (e.g., `Lexer`, `Parser`)
- **Functions**: `camelCase` (e.g., `parsePersona`, `validateSkills`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_PERSONAS`, `TOKEN_TYPES`)
- **Types/Interfaces**: `PascalCase` (e.g., `ASTNode`, `Token`)
- **Enums**: `PascalCase` for enum, `PascalCase` for members
  ```typescript
  enum TokenType {
    Identifier = 'IDENTIFIER',
    Keyword = 'KEYWORD',
  }
  ```

### File Structure

```
src/
  ├── lexer/
  │   ├── index.ts          # Public API exports
  │   ├── lexer.ts          # Lexer class
  │   ├── token.ts          # Token types
  │   └── scanner.ts        # Character scanning utilities
  ├── parser/
  │   ├── index.ts          # Public API
  │   ├── parser.ts         # Parser class
  │   ├── ast.ts            # AST node definitions
  │   └── grammar.ts        # Grammar rules
  ├── semantic/
  │   ├── index.ts
  │   ├── type-checker.ts   # Type checking
  │   ├── symbol-table.ts   # Symbol resolution
  │   └── validator.ts      # Semantic validation
  ├── runtime/
  │   ├── index.ts
  │   ├── interpreter.ts    # Execute AST
  │   └── environment.ts    # Runtime environment
  ├── stdlib/
  │   ├── index.ts
  │   └── personas.ts       # Built-in personas
  ├── types/
  │   ├── index.ts
  │   ├── persona.ts        # Persona type definitions
  │   └── skill.ts          # Skill type definitions
  └── cli/
      ├── index.ts
      └── commands.ts       # CLI command handlers
```

---

## Common Patterns

### 1. **Visitor Pattern for AST Traversal**

```typescript
interface ASTVisitor<T> {
  visitPersonaDeclaration(node: PersonaDeclaration): T;
  visitSkillDeclaration(node: SkillDeclaration): T;
  visitTeamDeclaration(node: TeamDeclaration): T;
}

class TypeChecker implements ASTVisitor<Type> {
  visitPersonaDeclaration(node: PersonaDeclaration): Type {
    // Type check persona
  }
}
```

### 2. **Builder Pattern for Complex Objects**

```typescript
class PersonaBuilder {
  private persona: Partial<Persona> = {};

  withId(id: PersonaId): this {
    this.persona.id = id;
    return this;
  }

  withSkills(skills: Skill[]): this {
    this.persona.skills = skills;
    return this;
  }

  build(): Persona {
    if (!this.persona.id || !this.persona.skills) {
      throw new Error('Invalid persona');
    }
    return this.persona as Persona;
  }
}
```

### 3. **Error Collection Pattern**

```typescript
class ErrorCollector {
  private errors: CompileError[] = [];

  addError(error: CompileError): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): readonly CompileError[] {
    return this.errors;
  }
}
```

### 4. **Position Tracking for All Nodes**

```typescript
interface Position {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

interface SourceRange {
  readonly start: Position;
  readonly end: Position;
}

interface ASTNode {
  readonly type: string;
  readonly range: SourceRange; // Always include for error messages
}
```

---

## Testing Guidelines

### 1. **Test File Naming**

- Test files: `*.test.ts` (e.g., `lexer.test.ts`)
- Place tests next to source files or in `tests/` directory

### 2. **Test Structure**

```typescript
import { describe, it, expect } from 'vitest';
import { Lexer } from './lexer';

describe('Lexer', () => {
  describe('tokenization', () => {
    it('should tokenize persona declaration', () => {
      const source = 'persona ARCHI { }';
      const lexer = new Lexer(source);
      const tokens = lexer.scan();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe('KEYWORD');
      expect(tokens[0].value).toBe('persona');
    });

    it('should handle invalid syntax', () => {
      const source = 'persona @invalid';
      const lexer = new Lexer(source);
      const result = lexer.scan();

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
```

### 3. **Test Coverage Requirements**

- **Minimum 80% coverage** for all compiler code
- **100% coverage** for critical paths (parser, type checker)
- Use `npm run test:coverage` to check

### 4. **Test Data Organization**

```typescript
// fixtures/personas.pcl - Example PCL files for testing
// tests/fixtures/ - Test input files
// tests/snapshots/ - Expected outputs (use snapshot testing)
```

---

## Documentation Standards

### 1. **TSDoc Comments**

````typescript
/**
 * Parses a persona declaration from tokens.
 *
 * @param tokens - The token stream to parse
 * @returns The parsed persona AST node
 * @throws {ParseError} When syntax is invalid
 *
 * @example
 * ```typescript
 * const tokens = lexer.scan('persona ARCHI { }');
 * const ast = parsePersona(tokens);
 * ```
 */
export function parsePersona(tokens: Token[]): PersonaDeclaration {
  // ...
}
````

### 2. **README for Each Module**

```
src/lexer/README.md  → Explain lexer architecture
src/parser/README.md → Explain parser rules
```

### 3. **Inline Comments**

- Explain **WHY**, not **WHAT**
- Document **edge cases** and **invariants**

```typescript
// We need to track both shared and specialized skills separately
// to maintain the skill hierarchy for inheritance
const sharedSkills = resolveSharedSkills(persona);
```

---

## Anti-Patterns to Avoid

### ❌ **Don't Mutate AST Nodes**

```typescript
// BAD
function transform(node: PersonaDeclaration) {
  node.skills.push(newSkill); // Mutating!
}

// GOOD
function transform(node: PersonaDeclaration): PersonaDeclaration {
  return {
    ...node,
    skills: [...node.skills, newSkill], // Immutable
  };
}
```

### ❌ **Don't Use Global State**

```typescript
// BAD
let currentPersona: Persona | null = null;

// GOOD
class Parser {
  private currentPersona: Persona | null = null;
}
```

### ❌ **Don't Skip Error Handling**

```typescript
// BAD
const ast = parse(source); // Might throw

// GOOD
const result = parse(source);
if (!result.ok) {
  console.error(result.errors);
  return;
}
const ast = result.value;
```

### ❌ **Don't Mix Concerns**

```typescript
// BAD - Lexer doing semantic analysis
class Lexer {
  scan() {
    if (token.value === 'persona') {
      validatePersonaName(); // Wrong layer!
    }
  }
}

// GOOD - Separation of concerns
class Lexer {
  scan() {
    // Only tokenization
  }
}

class SemanticAnalyzer {
  analyze() {
    validatePersonaName(); // Right layer
  }
}
```

---

## Compiler-Specific Guidelines

### 1. **Lexer**

- **Single responsibility**: Convert source to tokens
- **No look-ahead**: Process character by character
- **Error recovery**: Continue scanning after errors
- **Position tracking**: Maintain line/column for all tokens

### 2. **Parser**

- **Recursive descent** parsing style
- **Top-down** approach (parse program → declarations → expressions)
- **Error recovery**: Synchronize at statement boundaries
- **Predictive parsing**: Use lookahead(1) when possible

### 3. **Semantic Analysis**

- **Two-pass**: First pass for declarations, second for validation
- **Symbol table**: Track all declared personas, skills, teams
- **Type checking**: Validate skill references, persona composition
- **Constraint checking**: Ensure all invariants hold

### 4. **Code Generation**

- **Target**: JavaScript/TypeScript runtime code
- **Optimizations**: Inline constants, dead code elimination
- **Source maps**: Maintain mapping to original PCL source

### 5. **Runtime**

- **Lazy evaluation**: Don't execute until needed
- **Memory safety**: No memory leaks, cleanup after execution
- **Sandboxing**: Isolate persona execution contexts

---

## Performance Guidelines

1. **Avoid repeated parsing**: Cache parsed ASTs
2. **Use string interning**: Deduplicate identical strings
3. **Lazy initialization**: Don't load stdlib until needed
4. **Stream processing**: Process large files in chunks
5. **Memoization**: Cache expensive computations (e.g., type checking)

```typescript
// Memoization example
const typeCache = new Map<ASTNode, Type>();

function inferType(node: ASTNode): Type {
  if (typeCache.has(node)) {
    return typeCache.get(node)!;
  }
  const type = computeType(node);
  typeCache.set(node, type);
  return type;
}
```

---

## Git Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples**:

```
feat(parser): add support for nested persona composition

- Implement recursive parsing for complex persona expressions
- Add validation for circular dependencies
- Update grammar documentation

Closes #42
```

```
fix(lexer): handle unicode identifiers correctly

Previously, non-ASCII characters in identifiers would cause
the lexer to crash. Now properly handles UTF-8 input.

Fixes #128
```

---

## Copilot-Specific Tips

### What to Suggest

✅ **DO suggest**:

- Type-safe AST transformations
- Comprehensive error handling with `Result<T, E>` types
- Immutable data structures
- Visitor pattern implementations
- Position tracking in AST nodes
- TSDoc documentation
- Unit tests with edge cases
- Performance optimizations (memoization, caching)

### What NOT to Suggest

❌ **DON'T suggest**:

- Mutable AST node modifications
- Throwing exceptions in compiler code
- Global state or singletons
- `any` types without justification
- Missing position information in AST
- Tests without assertions
- Undocumented public APIs

---

## Example Code Generation

When generating compiler code, follow this pattern:

```typescript
// src/parser/expression-parser.ts

import type { Token } from '../lexer/token';
import type { Expression, BinaryExpression } from './ast';
import { TokenType } from '../lexer/token-type';
import type { ParseError } from './error';

/**
 * Parses a binary expression with operator precedence.
 *
 * Grammar:
 *   expression := term (('+' | '-') term)*
 *   term := factor (('*' | '/') factor)*
 *   factor := NUMBER | '(' expression ')'
 */
export class ExpressionParser {
  private current = 0;
  private errors: ParseError[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): Result<Expression, ParseError[]> {
    try {
      const expr = this.expression();

      if (this.errors.length > 0) {
        return { ok: false, errors: this.errors };
      }

      return { ok: true, value: expr };
    } catch (error) {
      // Unexpected error - should be handled by error collector
      this.errors.push(this.createError('Unexpected parse error'));
      return { ok: false, errors: this.errors };
    }
  }

  private expression(): Expression {
    return this.binary();
  }

  private binary(): Expression {
    let left = this.term();

    while (this.match(TokenType.Plus, TokenType.Minus)) {
      const operator = this.previous();
      const right = this.term();
      left = this.createBinaryExpression(left, operator, right);
    }

    return left;
  }

  private term(): Expression {
    // ... implementation
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private createBinaryExpression(
    left: Expression,
    operator: Token,
    right: Expression
  ): BinaryExpression {
    return {
      type: 'BinaryExpression',
      left,
      operator: operator.value,
      right,
      range: {
        start: left.range.start,
        end: right.range.end,
      },
    };
  }

  private createError(message: string): ParseError {
    const token = this.peek();
    return {
      message,
      position: token.range.start,
      severity: 'error',
    };
  }
}

// Type definitions
type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };
```

---

## Quick Reference

| Task               | Pattern           | Example                                   |
| ------------------ | ----------------- | ----------------------------------------- |
| **Parse AST**      | Visitor Pattern   | `class TypeChecker implements ASTVisitor` |
| **Error Handling** | Result Type       | `Result<AST, Error[]>`                    |
| **Immutability**   | Spread Operator   | `{ ...node, skills: [...node.skills] }`   |
| **Type Safety**    | Branded Types     | `type PersonaId = string & { __brand }`   |
| **Testing**        | Vitest + Snapshot | `expect(ast).toMatchSnapshot()`           |
| **Documentation**  | TSDoc             | `/** @param tokens - Input tokens */`     |

---

## Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Compiler Design Patterns**: [Crafting Interpreters](https://craftinginterpreters.com/)
- **AST Explorer**: https://astexplorer.net/
- **Testing Guide**: [Vitest Docs](https://vitest.dev/)

---

**Remember**: When in doubt, prioritize **type safety**, **immutability**, and **clear error messages**. PCL is a compiler project—correctness and maintainability are paramount!
