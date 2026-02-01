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

---

## 🚀 High-Performance Copilot Usage

### Maximize AI Assistant Efficiency

To get the best performance from GitHub Copilot and other AI assistants, follow these optimization strategies:

### 1. **Token Efficiency Strategies**

**✅ DO: Batch Operations**

```markdown
Read src/parser/index.ts, src/semantic/index.ts, and src/codegen/index.ts
in parallel to understand the compiler pipeline.
```

**❌ DON'T: Sequential Requests**

```markdown
Read src/parser/index.ts
[wait for response]
Now read src/semantic/index.ts
[wait for response]
Now read src/codegen/index.ts
```

**✅ DO: Precise Context Loading**

```markdown
Load context for parser enhancement:

- grammar/pcl.ebnf (team syntax)
- src/parser/index.ts (current implementation)
- tests/integration.test.ts (test patterns)
  Then implement team declaration parsing.
```

**❌ DON'T: Vague Requests**

```markdown
Fix the parser
```

### 2. **Parallel Tool Invocation**

**CRITICAL**: Always execute independent operations in parallel to maximize efficiency and minimize latency.

When you have **independent operations**, request them together:

```markdown
✅ "Read these files in parallel:

- src/ast/index.ts
- src/types/index.ts
- src/stdlib/index.ts
  Then explain the type hierarchy."

✅ "Update in parallel:

- QUICK-STATUS.md (mark Phase 1.1 complete)
- pcl_todo.md (check off runtime tasks)
- ROADMAP.md (update progress)"

✅ "Execute simultaneously:

- Read file contents
- Search for patterns
- List directory contents
  Then synthesize findings."

✅ "Run these checks simultaneously:

- npm run lint
- npm run test
- tsc --noEmit"

✅ "Perform multi-file edits in parallel using multi_replace_string_in_file:

- Fix import statements across 5 files
- Update type definitions in 3 files
- Add missing exports in 2 files"
```

### 3. **Context Window Optimization**

**Provide Upfront Context:**

```markdown
Context: Working on Phase 1.1 runtime engine (see ROADMAP.md).
Current status: Parser works for persona declarations only.
Goal: Add team declaration support.
Reference: grammar/pcl.ebnf lines 45-60 for syntax.

Implement team parsing following the persona parser pattern.
```

**Use Reference Paths:**

```markdown
✅ "Follow the pattern in src/parser/index.ts parsePersona() method"
❌ "Do it like we did before"
```

### 4. **Persona-Driven Development**

Leverage the PCL Bootstrap system for specialized assistance:

**For Architecture Work:**

```markdown
/persona ARCHI

Design the LSP server architecture. Reference:

- src/parser/index.ts (current architecture)
- src/semantic/index.ts (analysis patterns)
  Output: Architecture diagram + implementation plan
```

**For Security Reviews:**

```markdown
/persona SEC

Review src/runtime/index.ts for:

- Code injection vulnerabilities
- Untrusted input handling
- Sandbox escape vectors
  Output: Security audit report + fixes
```

**For Code Quality:**

```markdown
/persona CRITIC

Review PR changes against:

- copilot-instructions.md standards
- 80% test coverage requirement
- Immutability patterns
  Output: Actionable improvement list
```

**For Documentation:**

```markdown
/persona TECH_WRITER

Document the new workflow execution feature:

- User guide in docs/guides/
- API reference in docs/api/
- Code examples in examples/
  Style: Follow existing docs/ structure
```

**For Team Reviews:**

```markdown
/team dream-team

Review the new type system implementation:

- ARCHI: Architectural soundness
- SEC: Security implications
- DEV: Code quality
- CRITIC: Overall assessment
  Output: Consensus report with action items
```

### 5. **Incremental Task Management**

Use the `manage_todo_list` tool for complex work:

```markdown
✅ "Create a todo list for implementing LSP support:

1.  Design server architecture
2.  Implement text synchronization
3.  Add completion provider
4.  Add diagnostics
5.  Add hover support
6.  Write integration tests

Start with task 1."

Then as you work:
✅ "Mark task 1 complete, start task 2"
✅ "Update todo - add subtask to task 3: handle edge cases"
```

### 6. **Efficient Error Resolution**

**Compile-Time Errors:**

```markdown
✅ "Run npm run build, analyze errors, and fix them"
❌ "There are some errors"

✅ "Run tsc --noEmit, show me the first 5 errors with file paths"
✅ "Fix TypeScript errors in src/parser/ using multi_replace"
```

**Runtime Errors:**

```markdown
✅ "Run npm test, identify failures, fix them in order of priority"
✅ "Debug test failure in lexer.test.ts line 45 - show context"
```

**Linting Issues:**

```markdown
✅ "Run npm run lint:fix, then report remaining issues"
✅ "Fix all linting errors in src/ using batch edits"
```

### 7. **Code Generation Optimization**

**For Large Implementations:**

```markdown
✅ "Phase 1: Design the WorkflowExecutor interface
Phase 2: Implement core execution logic
Phase 3: Add error handling
Phase 4: Write comprehensive tests

Execute each phase sequentially, confirming after each."

✅ "Generate parser for skill declarations:

- Follow grammar/pcl.ebnf syntax
- Match src/parser/index.ts patterns
- Include error recovery
- Add position tracking
- Generate tests
  Use multi_replace for efficiency."
```

### 8. **Smart File Operations**

**Reading Files:**

```markdown
✅ "Read lines 1-50, 200-250, 500-550 from src/parser/index.ts"
(Target specific sections)

❌ "Read the whole file" (when you only need specific parts)
```

**Editing Files:**

```markdown
✅ Use multi_replace_string_in_file for multiple changes
✅ Provide 3-5 lines of context before/after changes
✅ Make changes atomic and testable
```

**Searching:**

```markdown
✅ "Search for 'PersonaDeclaration' using grep (exact match)"
✅ "Semantic search: concepts related to type checking"
✅ "Find all \*.test.ts files"
```

### 9. **Status and Progress Tracking**

**Regular Status Checks:**

```markdown
✅ "Quick status: What's complete, what's in progress, what's next?"
✅ "Compare current state vs ROADMAP.md Phase 1.1 goals"
✅ "Test coverage report: npm run test:coverage summary"
```

**Progress Documentation:**

```markdown
✅ "Update QUICK-STATUS.md metrics after completing feature"
✅ "Add session summary to .roadmap/status/SESSION-SUMMARY.md"
✅ "Mark completed tasks in pcl_todo.md"
```

### 10. **Quality Gates**

Always include quality checks:

```markdown
✅ "After implementation:

1.  Run npm run build (must pass)
2.  Run npm run test (must pass)
3.  Run npm run lint (must pass)
4.  Check test coverage ≥80%
5.  Verify 0 TypeScript errors
    Report: Pass/Fail for each gate"
```

---

## ⚙️ VS Code High-Performance Configuration

### Recommended Settings

Add these to [.vscode/settings.json](.vscode/settings.json):

```jsonc
{
  // ========================================
  // COPILOT OPTIMIZATION
  // ========================================
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": false,
    "markdown": true,
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "claude-sonnet-4.5",
    "debug.testOverrideProxyUrl": "",
    "debug.overrideProxyUrl": "",
  },

  // ========================================
  // TYPESCRIPT PERFORMANCE
  // ========================================
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.inlayHints.parameterNames.enabled": "all",
  "typescript.inlayHints.variableTypes.enabled": true,
  "typescript.preferences.importModuleSpecifier": "relative",

  // ========================================
  // EDITOR PRODUCTIVITY
  // ========================================
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true,
  },
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.inlineSuggest.enabled": true,
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": true,
  },

  // ========================================
  // FILE WATCHER OPTIMIZATION
  // ========================================
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/coverage/**": true,
    "**/.vscode-test/**": true,
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.vscode-test": true,
  },

  // ========================================
  // TESTING INTEGRATION
  // ========================================
  "vitest.enable": true,
  "vitest.commandLine": "npm run test",

  // ========================================
  // PCL LANGUAGE SUPPORT
  // ========================================
  "files.associations": {
    "*.pcl": "pcl",
    "*.ebnf": "plaintext",
  },

  // ========================================
  // TASK AUTOMATION
  // ========================================
  "task.autoDetect": "on",
  "task.saveBeforeRun": "always",
}
```

### Essential Extensions

Add these to [.vscode/extensions.json](.vscode/extensions.json):

```json
{
  "recommendations": [
    // ===== CORE DEVELOPMENT =====
    "github.copilot",
    "github.copilot-chat",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",

    // ===== TYPESCRIPT ENHANCEMENT =====
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",

    // ===== TESTING =====
    "vitest.explorer",
    "hbenl.vscode-test-explorer",

    // ===== GIT WORKFLOW =====
    "eamodio.gitlens",
    "github.vscode-pull-request-github",

    // ===== DOCUMENTATION =====
    "yzhang.markdown-all-in-one",
    "bierner.markdown-mermaid",
    "shd101wyy.markdown-preview-enhanced",

    // ===== PRODUCTIVITY =====
    "gruntfuggly.todo-tree",
    "wayou.vscode-todo-highlight",
    "aaron-bond.better-comments",

    // ===== CODE QUALITY =====
    "mkaufman.count-lines-of-code",
    "ryanluker.vscode-coverage-gutters",
    "pflannery.vscode-versionlens"
  ]
}
```

### Task Automation Setup

Enhance [.vscode/tasks.json](.vscode/tasks.json) with shortcuts:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🚀 Quick Start",
      "type": "shell",
      "command": "npm install && npm run build",
      "group": "none",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "✅ Quality Gate",
      "dependsOn": ["npm: lint", "tsc: check", "npm: test"],
      "dependsOrder": "sequence",
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "🔍 Pre-Commit Check",
      "type": "shell",
      "command": "npm run lint:fix && npm run format && npm run test",
      "group": "none",
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "📊 Coverage Report",
      "type": "shell",
      "command": "npm run test:coverage && start coverage/index.html",
      "group": "test",
      "windows": {
        "command": "npm run test:coverage ; start coverage/index.html"
      }
    }
  ]
}
```

### Debugging Configuration

Enhance [.vscode/launch.json](.vscode/launch.json):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "🐛 Debug Current Test",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "🧪 Debug All Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "🎯 Debug Parser",
      "program": "${workspaceFolder}/src/parser/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Keyboard Shortcuts

Add to [.vscode/keybindings.json](.vscode/keybindings.json):

```json
[
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask",
    "args": "npm: test"
  },
  {
    "key": "ctrl+shift+b",
    "command": "workbench.action.tasks.build"
  },
  {
    "key": "ctrl+shift+q",
    "command": "workbench.action.tasks.runTask",
    "args": "✅ Quality Gate"
  },
  {
    "key": "ctrl+k ctrl+d",
    "command": "github.copilot.generate"
  },
  {
    "key": "ctrl+k ctrl+i",
    "command": "github.copilot.interactiveEditor.explain"
  }
]
```

---

## 📊 Performance Metrics

Track these metrics for optimal workflow:

| Metric        | Target | Command                 |
| ------------- | ------ | ----------------------- |
| Build Time    | < 10s  | `npm run build`         |
| Test Time     | < 30s  | `npm run test`          |
| Type Check    | < 5s   | `tsc --noEmit`          |
| Lint Check    | < 3s   | `npm run lint`          |
| Test Coverage | ≥ 80%  | `npm run test:coverage` |
| Bundle Size   | < 1MB  | `du -sh dist/`          |

---

## 🎯 Quick Command Reference

### High-Performance Workflows

```bash
# Full quality check (run before commits)
npm run lint:fix && npm run format && npm run test && npm run build

# Watch mode for development
npm run dev          # Build + watch
npm run test:watch   # Test + watch

# Coverage with HTML report
npm run test:coverage && open coverage/index.html

# Type check only (fast feedback)
npx tsc --noEmit

# Clean rebuild
npm run clean && npm run build
```

### Copilot Power Commands

```markdown
# Architecture planning

/persona ARCHI - Design [feature] architecture following src/ patterns

# Implementation

/persona DEV - Implement [feature] with tests following copilot-instructions.md

# Code review

/persona CRITIC - Review changes against quality standards

# Security audit

/persona SEC - Security review of [component]

# Documentation

/persona TECH_WRITER - Document [feature] in docs/

# Team review

/team dream-team - Comprehensive review of [PR/feature]

# Standards work

/team standardization - Review PCL language spec compliance
```

---

## 🔥 Pro Tips Summary

1. **Batch operations** - Request multiple reads/writes in parallel
2. **Precise context** - Provide file paths, line ranges, specific goals
3. **Use personas** - Activate specialized AI personas for focused tasks
4. **Track progress** - Use manage_todo_list for complex work
5. **Quality gates** - Always run lint + test + build after changes
6. **Reference patterns** - Point to existing code as templates
7. **Multi-replace** - Use multi_replace_string_in_file for efficiency
8. **Targeted reads** - Read specific line ranges, not entire files
9. **Status sync** - Keep ROADMAP.md, pcl_todo.md, QUICK-STATUS.md updated
10. **Test coverage** - Maintain ≥80% coverage, check with npm run test:coverage

---

**Performance Mantra**: _"Batch operations, precise context, quality gates, track progress."_
