# Parser Enhancement Quick Reference

## Developer Guide for Phase 1.0 Implementation

**Quick Start**: This guide provides practical examples and code patterns for implementing parser enhancements.

---

## 🎯 Quick Implementation Checklist

### Phase A: Team Enhancements

```typescript
// ✅ Current (Working)
team MyTeam {
  members: [PERSONA1, PERSONA2]
  primary: PERSONA1
  merge: Primary
  quorum: 2/3
  conflict: PERSONA1 > PERSONA2
}

// 🎯 Target (New Features)
team ExtendedTeam extends BaseTeam {
  members: [
    NestedTeam,      // ← Nested team reference
    5x WORKER,       // ← Spawn expression
    @org.CustomTeam  // ← Qualified reference
  ]
  merge: {           // ← Weighted configuration
    mode: weighted,
    weights: { PERSONA1: 0.6, PERSONA2: 0.4 },
    timeout: 30s
  }

  @onActivate      // ← Lifecycle hook
  fn setup() { }
}
```

**Implementation Pattern**:

1. Update AST types in `src/ast/index.ts`
2. Enhance parser methods in `src/parser/index.ts`
3. Add validation in `src/semantic/index.ts`
4. Write tests in `tests/parser.test.ts`

---

## 📝 Code Patterns

### Pattern 1: Adding a New Declaration Member

**Example**: Adding `groups` to skill declarations

**Step 1: Update AST** (`src/ast/index.ts`)

```typescript
// Add to SkillMember union
export type SkillMember =
  | SkillItemsDeclaration
  | SkillCategoryDeclaration
  | SkillGroupsDeclaration // ← NEW
  | PropertyDeclaration;

// Define new AST node
export interface SkillGroupsDeclaration extends ASTNode {
  readonly kind: 'SkillGroupsDeclaration';
  readonly groups: readonly SkillGroup[];
}

export interface SkillGroup extends ASTNode {
  readonly kind: 'SkillGroup';
  readonly name: Identifier;
  readonly skills: readonly StringLiteral[];
}
```

**Step 2: Update Parser** (`src/parser/index.ts`)

```typescript
private parseSkillMember(): AST.SkillMember | null {
  // ... existing code ...

  // NEW: Add groups keyword check
  if (this.checkKeyword('groups')) {
    return this.parseSkillGroupsDeclaration();
  }

  // ... rest of method ...
}

// NEW: Implement parsing method
private parseSkillGroupsDeclaration(): AST.SkillGroupsDeclaration {
  const start = this.peek().span.start;
  this.expectKeyword('groups');
  this.expect(TokenType.COLON, 'Expected ":"');
  this.expect(TokenType.LBRACE, 'Expected "{"');

  const groups: AST.SkillGroup[] = [];

  while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
    const name = this.parseIdentifier();
    this.expect(TokenType.COLON, 'Expected ":"');
    this.expect(TokenType.LBRACKET, 'Expected "["');

    const skills: AST.StringLiteral[] = [];
    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      skills.push(this.parseStringLiteral());
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RBRACKET, 'Expected "]"');

    groups.push({
      kind: 'SkillGroup',
      name,
      skills,
      span: this.makeSpan(name.span.start, this.previous().span.end),
    });

    this.match(TokenType.COMMA);
  }

  this.expect(TokenType.RBRACE, 'Expected "}"');
  this.consumeOptionalSemicolon();

  return {
    kind: 'SkillGroupsDeclaration',
    groups,
    span: this.makeSpan(start, this.previous().span.end),
  };
}
```

**Step 3: Add Tests** (`tests/parser.test.ts`)

```typescript
describe('SkillDeclaration - Groups', () => {
  it('should parse skill groups', () => {
    const source = `
      skill DevSkills {
        groups: {
          foundation: ["Problem Solving", "Critical Thinking"],
          technical: ["TypeScript", "Node.js"]
        }
      }
    `;

    const result = parse(source);
    expect(result.ok).toBe(true);

    const skill = result.value.statements[0] as AST.SkillDeclaration;
    const groupsMember = skill.body.members.find(
      (m) => m.kind === 'SkillGroupsDeclaration'
    ) as AST.SkillGroupsDeclaration;

    expect(groupsMember.groups).toHaveLength(2);
    expect(groupsMember.groups[0].name.name).toBe('foundation');
    expect(groupsMember.groups[0].skills).toHaveLength(2);
  });

  it('should error on malformed groups', () => {
    const source = `
      skill BadSkill {
        groups: { foundation: "string" }  // ← Should be array
      }
    `;

    const result = parse(source);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe(ErrorCode.EXPECTED_TOKEN);
  });
});
```

---

### Pattern 2: Adding a New Operator

**Example**: Adding async pipe operator (`~>`)

**Step 1: Add Token Type** (`src/lexer/index.ts`)

```typescript
export enum TokenType {
  // ... existing tokens ...

  TILDE_ARROW = 'TILDE_ARROW',  // ~>
}

// In tokenizeOperator method:
case '~':
  if (this.peek() === '>') {
    this.advance();
    return this.makeToken(TokenType.TILDE_ARROW, '~>');
  }
  return this.makeToken(TokenType.TILDE, '~');
```

**Step 2: Update Grammar** (`src/grammar/pcl.ebnf`)

```ebnf
workflow_op = "->"      (* Sequential *)
            | "||"      (* Parallel *)
            | "|"       (* Choice/Branch *)
            | "=>"      (* Transform/Pipe *)
            | "~>"      (* Async pipe - NEW *)
            ;
```

**Step 3: Add AST Node** (`src/ast/index.ts`)

```typescript
export type WorkflowExpression =
  // ... existing types ...
  WorkflowAsyncPipeExpr; // ← NEW

export interface WorkflowAsyncPipeExpr extends ASTNode {
  readonly kind: 'WorkflowAsyncPipeExpr';
  readonly input: WorkflowExpression;
  readonly output: WorkflowExpression;
  readonly blocking: boolean; // false for async
}
```

**Step 4: Update Parser** (`src/parser/index.ts`)

```typescript
// Add new precedence level
private parseWorkflowExpression(): AST.WorkflowExpression {
  return this.parseWorkflowAsync();  // ← NEW layer
}

private parseWorkflowAsync(): AST.WorkflowExpression {
  let left = this.parseWorkflowSequence();

  while (this.match(TokenType.TILDE_ARROW)) {
    const right = this.parseWorkflowSequence();
    left = {
      kind: 'WorkflowAsyncPipeExpr',
      input: left,
      output: right,
      blocking: false,
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

private parseWorkflowSequence(): AST.WorkflowExpression {
  // ... existing implementation ...
}
```

**Step 5: Test** (`tests/parser.test.ts`)

```typescript
describe('WorkflowExpression - Async Pipe', () => {
  it('should parse async pipe operator', () => {
    const source = `
      workflow Pipeline {
        steps: EXTRACT ~> TRANSFORM ~> LOAD
      }
    `;

    const result = parse(source);
    expect(result.ok).toBe(true);

    const workflow = result.value.statements[0] as AST.WorkflowDeclaration;
    const steps = workflow.body.members.find(
      (m) => m.kind === 'WorkflowStepsDeclaration'
    ) as AST.WorkflowStepsDeclaration;

    expect(steps.steps.kind).toBe('WorkflowAsyncPipeExpr');
  });
});
```

---

### Pattern 3: Adding Validation Rules

**Example**: Detecting circular team references

**Step 1: Create Validator** (`src/semantic/validators/team-validator.ts`)

```typescript
import type * as AST from '../../ast';
import { ErrorCode, PCLError } from '../../types';

export class TeamValidator {
  private symbolTable: SymbolTable;
  private errors: PCLError[] = [];

  constructor(symbolTable: SymbolTable) {
    this.symbolTable = symbolTable;
  }

  validate(team: AST.TeamDeclaration): PCLError[] {
    this.errors = [];

    // Run validation checks
    this.checkCircularReferences(team);
    this.checkDuplicateMembers(team);
    this.checkPrimaryInMembers(team);
    this.checkQuorumConsistency(team);

    return this.errors;
  }

  private checkCircularReferences(team: AST.TeamDeclaration): void {
    const visited = new Set<string>();
    const stack: string[] = [];

    const detectCycle = (teamName: string): boolean => {
      if (stack.includes(teamName)) {
        // Found cycle
        const cycle = [...stack, teamName];
        this.errors.push({
          code: ErrorCode.CIRCULAR_TEAM_REFERENCE,
          message: `Circular team reference: ${cycle.join(' → ')}`,
          span: team.span,
          severity: 'error',
        });
        return true;
      }

      if (visited.has(teamName)) return false;

      visited.add(teamName);
      stack.push(teamName);

      // Get team members
      const teamSymbol = this.symbolTable.resolve(teamName);
      if (teamSymbol && teamSymbol.kind === 'team') {
        const members = this.getTeamMembers(teamSymbol.node);
        for (const member of members) {
          if (member.type === 'team') {
            if (detectCycle(member.name)) return true;
          }
        }
      }

      stack.pop();
      return false;
    };

    detectCycle(team.id.name);
  }

  private checkDuplicateMembers(team: AST.TeamDeclaration): void {
    const memberNames = new Set<string>();
    const members = this.getTeamMembers(team);

    for (const member of members) {
      if (memberNames.has(member.name)) {
        this.errors.push({
          code: ErrorCode.DUPLICATE_TEAM_MEMBER,
          message: `Duplicate member '${member.name}' in team '${team.id.name}'`,
          span: member.span,
          severity: 'error',
        });
      }
      memberNames.add(member.name);
    }
  }

  private getTeamMembers(team: AST.TeamDeclaration): Array<{
    name: string;
    type: 'persona' | 'team';
    span: Span;
  }> {
    const membersDecl = team.body.members.find(
      (m) => m.kind === 'TeamMembersDeclaration'
    ) as AST.TeamMembersDeclaration | undefined;

    if (!membersDecl) return [];

    return membersDecl.members.map((ref) => {
      const name = this.resolveReferenceName(ref);
      const symbol = this.symbolTable.resolve(name);
      const type = symbol?.kind === 'team' ? 'team' : 'persona';

      return { name, type, span: ref.span };
    });
  }
}
```

**Step 2: Integrate with Semantic Analyzer** (`src/semantic/index.ts`)

```typescript
import { TeamValidator } from './validators/team-validator';

export class SemanticAnalyzer {
  private teamValidator: TeamValidator;

  constructor(private symbolTable: SymbolTable) {
    this.teamValidator = new TeamValidator(symbolTable);
  }

  analyze(ast: AST.Program): Result<void, PCLError[]> {
    const errors: PCLError[] = [];

    for (const statement of ast.statements) {
      if (statement.kind === 'TeamDeclaration') {
        const teamErrors = this.teamValidator.validate(statement);
        errors.push(...teamErrors);
      }
    }

    if (errors.length > 0) {
      return Err(errors);
    }

    return Ok(undefined);
  }
}
```

**Step 3: Test Validation** (`tests/semantic/team-validation.test.ts`)

```typescript
describe('TeamValidator - Circular References', () => {
  it('should detect direct circular reference', () => {
    const source = `
      team A {
        members: [B]
      }

      team B {
        members: [A]  // ← Circular!
      }
    `;

    const ast = parse(source);
    const analyzer = new SemanticAnalyzer(new SymbolTable());
    const result = analyzer.analyze(ast.value);

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe(ErrorCode.CIRCULAR_TEAM_REFERENCE);
  });

  it('should detect indirect circular reference', () => {
    const source = `
      team A { members: [B] }
      team B { members: [C] }
      team C { members: [A] }  // ← Circular: A → B → C → A
    `;

    const ast = parse(source);
    const analyzer = new SemanticAnalyzer(new SymbolTable());
    const result = analyzer.analyze(ast.value);

    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain('A → B → C → A');
  });
});
```

---

## 🛠️ Common Tasks

### Task: Add New Keyword

1. **Lexer** (`src/lexer/index.ts`):

   ```typescript
   private readonly keywords = new Map([
     // ... existing ...
     ['mynewkeyword', TokenType.KEYWORD_MYNEWKEYWORD],
   ]);
   ```

2. **Token Type** (`src/lexer/index.ts`):

   ```typescript
   export enum TokenType {
     // ...
     KEYWORD_MYNEWKEYWORD = 'KEYWORD_MYNEWKEYWORD',
   }
   ```

3. **Parser Helper** (`src/parser/index.ts`):
   ```typescript
   private checkKeyword(keyword: string): boolean {
     return this.check(TokenType.KEYWORD) &&
            this.peek().value === keyword;
   }
   ```

### Task: Improve Error Message

**Before**:

```typescript
this.error('Expected "{"');
```

**After**:

```typescript
this.error(
  `Expected "{" to start ${context} body, found ${this.peek().value}`,
  this.peek().span,
  {
    code: ErrorCode.EXPECTED_TOKEN,
    expected: TokenType.LBRACE,
    found: this.peek().type,
    suggestion: 'Add "{" before the declaration body',
  }
);
```

### Task: Add Code Example to Docs

**Location**: `docs/guides/` or `examples/`

```pcl
// examples/teams/nested-teams.pcl

/// Example: Nested team composition for code review
///
/// This demonstrates using a specialized security team
/// as part of a larger review team.

team SecurityTeam {
  members: [SEC, CRYPTO, AUDIT]
  merge: Consensus
  quorum: 2/3
}

team CodeReviewTeam {
  members: [
    ARCHITECT,
    SecurityTeam,  // ← Nested team
    DEVOPS
  ]
  primary: ARCHITECT
  merge: Primary
}
```

---

## 🐛 Debugging Tips

### Enable Parser Debug Logging

```typescript
// src/parser/index.ts
export class Parser {
  private debug = true; // ← Enable temporarily

  private trace(message: string): void {
    if (this.debug) {
      console.log(`[Parser] ${message}`, {
        current: this.peek().value,
        position: this.peek().span,
      });
    }
  }
}
```

### Visualize AST

```typescript
// tests/utils/ast-visualizer.ts
export function visualizeAST(node: AST.Node, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let output = `${spaces}${node.kind}\n`;

  for (const [key, value] of Object.entries(node)) {
    if (key === 'kind' || key === 'span') continue;

    if (Array.isArray(value)) {
      output += `${spaces}  ${key}:\n`;
      for (const item of value) {
        output += visualizeAST(item, indent + 2);
      }
    } else if (typeof value === 'object' && value !== null) {
      output += visualizeAST(value, indent + 1);
    } else {
      output += `${spaces}  ${key}: ${value}\n`;
    }
  }

  return output;
}

// Usage in tests:
const ast = parse(source);
console.log(visualizeAST(ast.value));
```

---

## 📋 Testing Checklist

Before submitting a PR, ensure:

- [ ] Unit tests added for new parser methods
- [ ] Integration tests for complete declarations
- [ ] Error cases tested (malformed syntax)
- [ ] Edge cases covered (empty lists, single items, etc.)
- [ ] Performance test for large files (>10KB)
- [ ] Documentation updated (`docs/api/PARSER.md`)
- [ ] Examples added (`examples/`)
- [ ] Changelog updated (`CHANGELOG.md`)

---

## 🚀 Quick Test Command

```bash
# Run all parser tests
npm run test -- parser

# Run specific test file
npm run test -- tests/parser.test.ts

# Watch mode
npm run test:watch -- parser

# Coverage
npm run test:coverage -- parser
```

---

## 📞 Getting Help

- **Architecture questions**: See [PARSER-ENHANCEMENTS.md](./PARSER-ENHANCEMENTS.md)
- **Grammar reference**: See [src/grammar/pcl.ebnf](../../src/grammar/pcl.ebnf)
- **Examples**: See [examples/](../../examples/)
- **Issues**: GitHub Issues with `parser` label

---

**Happy Parsing!** 🎉
