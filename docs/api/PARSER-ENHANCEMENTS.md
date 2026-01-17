# PCL Parser Enhancement Architecture

## Team, Workflow, and Skill Declaration Enhancements

**Version**: 1.0.0
**Date**: 2026-01-17
**Status**: Design Phase
**Author**: ARCHI (Architecture Persona)

---

## 📋 Executive Summary

This document provides a comprehensive architectural blueprint for enhancing the PCL parser to support advanced features in team, workflow, and skill declarations. The current parser (Phase 0) provides basic functionality for all three declaration types. This enhancement plan (Phase 1.0) adds production-ready features while maintaining backward compatibility.

### Current State (Phase 0 ✅)

- ✅ **Persona declarations**: 100% complete with full feature support
- ✅ **Team declarations**: 80% complete (core features working)
- ✅ **Workflow declarations**: 75% complete (basic operators implemented)
- ✅ **Skill declarations**: 60% complete (basic structure only)

### Target State (Phase 1.0)

- 🎯 **Team declarations**: 100% complete with advanced composition
- 🎯 **Workflow declarations**: 100% complete with all operators
- 🎯 **Skill declarations**: 100% complete with hierarchy and dependencies
- 🎯 **Parser infrastructure**: Enhanced error recovery and performance

---

## 🏗️ Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                        PCL Compiler                          │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │  Lexer   │──▶│  Parser  │──▶│ Semantic │──▶│ Codegen │ │
│  │  (Done)  │   │(Enhance) │   │ Analyzer │   │  (Done) │ │
│  └──────────┘   └──────────┘   └──────────┘   └─────────┘ │
│                       ▲                                      │
│                       │                                      │
│              ┌────────┴────────┐                            │
│              │  Enhancement    │                            │
│              │  Scope (1.0)    │                            │
│              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Parser Architecture (Current)

```typescript
class Parser {
  // ✅ Foundation (Complete)
  - Recursive descent architecture
  - Pratt expression parsing
  - Error collection (not recovery yet)
  - Position tracking
  - Decorator support

  // 🎯 Enhancement Areas (Phase 1.0)
  - Advanced team composition
  - Complex workflow expressions
  - Hierarchical skill declarations
  - Robust error recovery
  - Performance optimizations
}
```

---

## 🔧 Phase A: Team Declaration Enhancements

### A.1 Current Implementation Analysis

**Existing Code** ([src/parser/index.ts](../src/parser/index.ts#L620-L780)):

```typescript
private parseTeamDeclaration(
  decorators: AST.Decorator[],
  modifiers: AST.Modifier[]
): AST.TeamDeclaration {
  // ✅ Basic parsing works
  // ❌ No nested teams
  // ❌ No spawn validation
  // ❌ Limited error recovery
}

private parseTeamMember(): AST.TeamMember | null {
  // ✅ All core members supported:
  //   - members: [...]
  //   - primary: LEADER
  //   - merge: Mode
  //   - quorum: 2/3
  //   - conflict: A > B
  // ❌ No advanced features
}
```

**Grammar Reference** ([src/grammar/pcl.ebnf](../src/grammar/pcl.ebnf#L113-L133)):

```ebnf
team_decl = { decorator } , { modifier } , "team" , identifier ,
            [ type_parameters ] , team_body ;

team_body = "{" , { team_member } , "}" ;

team_member = team_members_decl
            | team_primary_decl
            | team_merge_decl
            | team_quorum_decl
            | team_conflict_decl
            | property_decl
            | hook_decl ;
```

### A.2 Enhancement Design

#### A.2.1 Nested Team Composition

**Use Case**:

```pcl
team SecurityReview {
  members: [
    SecurityTeam,    // ← Nested team reference
    ARCHITECT,
    DEVOPS
  ]
  merge: Consensus
}

team SecurityTeam {
  members: [SEC, CRYPTO, AUDIT]
  merge: Majority
}
```

**AST Enhancement**:

```typescript
// NEW: Enhanced PersonaReference to support team refs
export interface PersonaReference extends ASTNode {
  readonly kind: 'PersonaReference';
  readonly ref:
    | { readonly type: 'id'; readonly id: Identifier }
    | { readonly type: 'qualified'; readonly path: QualifiedIdentifier }
    | { readonly type: 'team'; readonly team: Identifier } // ← NEW
    | {
        readonly type: 'spawn';
        readonly count: NumberLiteral;
        readonly persona: Identifier;
      };
}
```

**Parser Implementation**:

```typescript
private parsePersonaReference(): AST.PersonaReference {
  const start = this.peek().span.start;

  // Check for spawn expression (5x WORKER)
  if (this.check(TokenType.NUMBER)) {
    const count = this.parseNumberLiteral();
    this.expect(TokenType.IDENTIFIER, 'Expected "x" in spawn expression');
    if (this.previous().value !== 'x') {
      this.error('Expected "x" in spawn expression');
    }
    const persona = this.parseIdentifier();

    return {
      kind: 'PersonaReference',
      ref: { type: 'spawn', count, persona },
      span: this.makeSpan(start, persona.span.end),
    };
  }

  // Check for qualified identifier (ns::Team)
  if (this.peek().value.includes('::')) {
    const path = this.parseQualifiedIdentifier();
    return {
      kind: 'PersonaReference',
      ref: { type: 'qualified', path },
      span: path.span,
    };
  }

  // Simple identifier - could be persona or team
  const id = this.parseIdentifier();

  // NEW: Distinguish between persona and team references
  // This will be resolved in semantic analysis
  return {
    kind: 'PersonaReference',
    ref: { type: 'id', id },
    span: id.span,
  };
}
```

**Validation Rules** (Semantic Analyzer):

```typescript
// Validation: Detect circular team references
class TeamValidator {
  validateTeamDeclaration(team: AST.TeamDeclaration): ValidationResult {
    const errors: PCLError[] = [];

    // 1. Check for circular references
    const visited = new Set<string>();
    const detectCycle = (teamName: string): boolean => {
      if (visited.has(teamName)) return true;
      visited.add(teamName);

      const teamMembers = this.resolveTeamMembers(teamName);
      for (const member of teamMembers) {
        if (member.type === 'team' && detectCycle(member.name)) {
          errors.push({
            code: ErrorCode.CIRCULAR_TEAM_REFERENCE,
            message: `Circular team reference detected: ${teamName}`,
            span: member.span,
          });
          return true;
        }
      }

      visited.delete(teamName);
      return false;
    };

    detectCycle(team.id.name);

    return { ok: errors.length === 0, errors };
  }
}
```

#### A.2.2 Weighted Merge Configurations

**Use Case**:

```pcl
team DesignReview {
  members: [DESIGNER, ENGINEER, PRODUCT]
  merge: {
    mode: weighted,
    weights: {
      DESIGNER: 0.5,
      ENGINEER: 0.3,
      PRODUCT: 0.2
    },
    timeout: 30s
  }
}
```

**AST Enhancement**:

```typescript
// EXISTING: MergeModeNode (already supports this!)
export interface MergeConfigNode extends ASTNode {
  readonly kind: 'MergeConfigNode';
  readonly mode: MergeMode;
  readonly weights: readonly WeightEntry[] | null; // ✅ Already exists
  readonly topic: StringLiteral | null;
  readonly timeout: DurationLiteral | null;
}
```

**Parser Enhancement** (Already exists, but needs better validation):

```typescript
private parseMergeConfig(): AST.MergeConfigNode {
  const start = this.peek().span.start;
  this.expect(TokenType.LBRACE, 'Expected "{"');

  let mode: AST.MergeMode = 'Primary';
  let weights: AST.WeightEntry[] | null = null;
  let topic: AST.StringLiteral | null = null;
  let timeout: AST.DurationLiteral | null = null;

  while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
    const key = this.parseIdentifier();
    this.expect(TokenType.COLON, 'Expected ":"');

    switch (key.name) {
      case 'mode':
        mode = this.parseMergeModeSimple();
        break;
      case 'weights':
        weights = this.parseWeightsMap();  // ← ENHANCE THIS
        break;
      case 'topic':
        topic = this.parseStringLiteral();
        break;
      case 'timeout':
        timeout = this.parseDurationLiteral();
        break;
    }

    this.match(TokenType.COMMA);
  }

  this.expect(TokenType.RBRACE, 'Expected "}"');

  return {
    kind: 'MergeConfigNode',
    mode,
    weights,
    topic,
    timeout,
    span: this.makeSpan(start, this.previous().span.end),
  };
}

// NEW: Enhanced weights parsing
private parseWeightsMap(): AST.WeightEntry[] {
  this.expect(TokenType.LBRACE, 'Expected "{"');
  const weights: AST.WeightEntry[] = [];

  while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
    const persona = this.parsePersonaReference();
    this.expect(TokenType.COLON, 'Expected ":" after persona');
    const weight = this.parseNumberLiteral();

    // Validation: Weight must be between 0 and 1
    const weightValue = parseFloat(weight.value);
    if (weightValue < 0 || weightValue > 1) {
      this.warning('Weight should be between 0 and 1', weight.span);
    }

    weights.push({
      kind: 'WeightEntry',
      persona,
      weight,
      span: this.makeSpan(persona.span.start, weight.span.end),
    });

    this.match(TokenType.COMMA);
  }

  this.expect(TokenType.RBRACE, 'Expected "}"');

  // Validation: Sum of weights should be approximately 1.0
  const sum = weights.reduce((acc, w) => acc + parseFloat(w.weight.value), 0);
  if (Math.abs(sum - 1.0) > 0.01) {
    this.warning(`Weights sum to ${sum}, expected 1.0`, weights[0].span);
  }

  return weights;
}
```

#### A.2.3 Team-Level Lifecycle Hooks

**Use Case**:

```pcl
team CITeam {
  members: [BUILD, TEST, DEPLOY]

  @onActivate
  fn setup() {
    // Initialize shared resources
  }

  @onComplete
  fn cleanup() {
    // Cleanup after team execution
  }
}
```

**Implementation**: Already supported! No parser changes needed, just documentation.

#### A.2.4 Team Inheritance

**Use Case**:

```pcl
team BaseTeam {
  members: [ARCHITECT, DEV]
  merge: Primary
}

team ExtendedTeam extends BaseTeam {
  members: [DEVOPS, QA]  // Merged with BaseTeam members
  merge: Consensus       // Override
}
```

**AST Enhancement**:

```typescript
export interface TeamDeclaration extends ASTNode {
  readonly kind: 'TeamDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly extends: readonly TypeReference[]; // ← NEW
  readonly body: TeamBody;
}
```

**Parser Enhancement**:

```typescript
private parseTeamDeclaration(
  decorators: AST.Decorator[],
  modifiers: AST.Modifier[]
): AST.TeamDeclaration {
  const start = this.peek().span.start;
  this.expectKeyword('team');

  const id = this.parseIdentifier();
  const typeParameters = this.parseOptionalTypeParameters();

  // NEW: Parse extends clause
  const extendsClause: AST.TypeReference[] = [];
  if (this.matchKeyword('extends')) {
    do {
      extendsClause.push(this.parseTypeReference());
    } while (this.match(TokenType.COMMA));
  }

  const body = this.parseTeamBody();

  return {
    kind: 'TeamDeclaration',
    decorators,
    modifiers,
    id,
    typeParameters,
    extends: extendsClause,  // ← NEW
    body,
    span: this.makeSpan(start, this.previous().span.end),
  };
}
```

### A.3 Validation Enhancements

```typescript
class TeamSemanticAnalyzer {
  validateTeamDeclaration(team: AST.TeamDeclaration): void {
    // 1. Duplicate member detection
    const memberNames = new Set<string>();
    for (const member of this.getTeamMembers(team)) {
      if (memberNames.has(member.name)) {
        this.error(`Duplicate member '${member.name}' in team`, member.span);
      }
      memberNames.add(member.name);
    }

    // 2. Primary persona in members list
    const primary = this.getPrimaryPersona(team);
    if (primary && !memberNames.has(primary.name)) {
      this.error(
        `Primary persona '${primary.name}' not found in members list`,
        primary.span
      );
    }

    // 3. Quorum consistency
    const quorum = this.getQuorum(team);
    if (quorum) {
      const required = parseInt(quorum.required.value);
      const total = parseInt(quorum.total.value);
      if (required > total) {
        this.error(
          `Quorum required (${required}) exceeds total (${total})`,
          quorum.span
        );
      }
      if (total !== memberNames.size) {
        this.warning(
          `Quorum total (${total}) doesn't match member count (${memberNames.size})`,
          quorum.span
        );
      }
    }

    // 4. Conflict order completeness
    const conflict = this.getConflictOrder(team);
    if (conflict) {
      const conflictNames = new Set(
        conflict.order.map((ref) => this.resolveRefName(ref))
      );
      for (const memberName of memberNames) {
        if (!conflictNames.has(memberName)) {
          this.warning(
            `Member '${memberName}' not included in conflict resolution order`,
            conflict.span
          );
        }
      }
    }
  }
}
```

---

## 🔀 Phase B: Workflow Expression Enhancements

### B.1 Current Implementation Analysis

**Existing Code** ([src/parser/index.ts](../src/parser/index.ts#L1000-L1200)):

```typescript
// ✅ Implemented:
- parseWorkflowSequence()    // -> operator
- parseWorkflowParallel()    // || operator
- parseWorkflowChoice()       // | operator
- parseWorkflowConditional()  // if...then...else
- parseWorkflowLoop()         // loop constructs

// ❌ Not Implemented:
- Async pipe (~>)
- Bidirectional (<->)
- Accumulate (>>>)
- Workflow composition (::)
- Advanced loop variants
```

### B.2 Enhancement Design

#### B.2.1 Advanced Workflow Operators

**Use Case**:

```pcl
workflow DataPipeline {
  steps:
    EXTRACT -> TRANSFORM ~> LOAD ||    // ~> = async pipe
    VALIDATE <-> CORRECT ->             // <-> = bidirectional feedback
    AGGREGATE >>> REPORT                // >>> = accumulate results
}
```

**Grammar Addition** ([src/grammar/pcl.ebnf](../src/grammar/pcl.ebnf#L205-L215)):

```ebnf
workflow_op = "->"      (* Sequential *)
            | "||"      (* Parallel *)
            | "|"       (* Choice/Branch *)
            | "=>"      (* Transform/Pipe *)
            | "~>"      (* Async pipe - NEW *)
            | "<->"     (* Bidirectional - NEW *)
            | ">>>"     (* Accumulate - NEW *)
            | "::"      (* Composition - NEW *) ;
```

**Lexer Enhancement** (Add new token types):

```typescript
// src/lexer/index.ts
export enum TokenType {
  // ... existing tokens ...

  TILDE_ARROW = '~>', // ~>
  LEFT_RIGHT_ARROW = '<->', // <->
  TRIPLE_GT = '>>>', // >>>
  DOUBLE_COLON = '::', // ::
}
```

**Parser Implementation**:

```typescript
// src/parser/index.ts

private parseWorkflowExpression(): AST.WorkflowExpression {
  return this.parseWorkflowComposition();  // NEW: Highest precedence
}

// NEW: Composition operator (::)
private parseWorkflowComposition(): AST.WorkflowExpression {
  let left = this.parseWorkflowSequence();

  while (this.match(TokenType.DOUBLE_COLON)) {
    const right = this.parseWorkflowSequence();
    left = {
      kind: 'WorkflowCompositionExpr',  // NEW AST node
      left,
      right,
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

private parseWorkflowSequence(): AST.WorkflowExpression {
  let left = this.parseWorkflowAccumulate();  // NEW layer

  while (this.match(TokenType.ARROW)) {
    const right = this.parseWorkflowAccumulate();
    left = {
      kind: 'WorkflowSequenceExpr',
      steps: this.flattenSequence(left, right),
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

// NEW: Accumulate operator (>>>)
private parseWorkflowAccumulate(): AST.WorkflowExpression {
  let left = this.parseWorkflowBidirectional();

  while (this.match(TokenType.TRIPLE_GT)) {
    const right = this.parseWorkflowBidirectional();
    left = {
      kind: 'WorkflowAccumulateExpr',  // NEW AST node
      steps: [left, right],
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

// NEW: Bidirectional operator (<->)
private parseWorkflowBidirectional(): AST.WorkflowExpression {
  let left = this.parseWorkflowAsync();

  while (this.match(TokenType.LEFT_RIGHT_ARROW)) {
    const right = this.parseWorkflowAsync();
    left = {
      kind: 'WorkflowBidirectionalExpr',  // NEW AST node
      forward: left,
      backward: right,
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

// NEW: Async pipe operator (~>)
private parseWorkflowAsync(): AST.WorkflowExpression {
  let left = this.parseWorkflowParallel();

  while (this.match(TokenType.TILDE_ARROW)) {
    const right = this.parseWorkflowParallel();
    left = {
      kind: 'WorkflowAsyncPipeExpr',  // NEW AST node
      input: left,
      output: right,
      blocking: false,
      span: this.makeSpan(left.span.start, right.span.end),
    };
  }

  return left;
}

// Existing...
private parseWorkflowParallel(): AST.WorkflowExpression { ... }
```

**AST Additions** ([src/ast/index.ts](../src/ast/index.ts#L380-L450)):

```typescript
export type WorkflowExpression =
  | WorkflowPersonaRef
  | WorkflowSequenceExpr
  | WorkflowParallelExpr
  | WorkflowChoiceExpr
  | WorkflowTransformExpr
  | WorkflowAsyncPipeExpr // ← NEW
  | WorkflowBidirectionalExpr // ← NEW
  | WorkflowAccumulateExpr // ← NEW
  | WorkflowCompositionExpr // ← NEW
  | WorkflowGroupExpr
  | WorkflowConditionalExpr
  | WorkflowLoopExpr
  | WorkflowCallExpr
  | WorkflowMergeExpr;

export interface WorkflowAsyncPipeExpr extends ASTNode {
  readonly kind: 'WorkflowAsyncPipeExpr';
  readonly input: WorkflowExpression;
  readonly output: WorkflowExpression;
  readonly blocking: boolean; // false for async
}

export interface WorkflowBidirectionalExpr extends ASTNode {
  readonly kind: 'WorkflowBidirectionalExpr';
  readonly forward: WorkflowExpression;
  readonly backward: WorkflowExpression;
  readonly maxIterations?: NumberLiteral; // Optional iteration limit
}

export interface WorkflowAccumulateExpr extends ASTNode {
  readonly kind: 'WorkflowAccumulateExpr';
  readonly steps: readonly WorkflowExpression[];
  readonly accumulator?: Identifier; // Optional accumulator function
}

export interface WorkflowCompositionExpr extends ASTNode {
  readonly kind: 'WorkflowCompositionExpr';
  readonly left: WorkflowExpression;
  readonly right: WorkflowExpression;
}
```

#### B.2.2 Enhanced Loop Constructs

**Use Case**:

```pcl
workflow Analyzer {
  steps:
    loop VALIDATE times 3 ->              // Repeat 3 times
    loop PROCESS while hasMore() ->       // While condition
    loop REFINE until quality > 0.9 ->    // Until condition
    loop TRANSFORM for item in dataset    // For-each loop
}
```

**Parser Enhancement** (Already 80% implemented, needs completion):

```typescript
private parseWorkflowLoop(): AST.WorkflowLoopExpr {
  const start = this.peek().span.start;
  this.expectKeyword('loop');

  const body = this.parseWorkflowPrimary();

  let loopType: 'times' | 'while' | 'until' | 'for';
  let count: AST.NumberLiteral | null = null;
  let condition: AST.Expression | null = null;
  let variable: AST.Identifier | null = null;
  let iterable: AST.Expression | null = null;

  if (this.matchKeyword('times')) {
    loopType = 'times';
    count = this.parseNumberLiteral();
  } else if (this.matchKeyword('while')) {
    loopType = 'while';
    condition = this.parseExpression();
  } else if (this.matchKeyword('until')) {
    loopType = 'until';
    condition = this.parseExpression();
  } else if (this.matchKeyword('for')) {
    loopType = 'for';
    variable = this.parseIdentifier();
    this.expectKeyword('in');
    iterable = this.parseExpression();
  } else {
    this.error('Expected loop condition: times, while, until, or for');
    loopType = 'times';
  }

  return {
    kind: 'WorkflowLoopExpr',
    body,
    loopType,
    count,
    condition,
    variable,
    iterable,
    span: this.makeSpan(start, this.previous().span.end),
  };
}
```

#### B.2.3 Workflow Configuration Validation

```typescript
class WorkflowSemanticAnalyzer {
  validateWorkflowDeclaration(workflow: AST.WorkflowDeclaration): void {
    // 1. Unreachable workflow detection
    this.detectUnreachableSteps(workflow);

    // 2. Infinite loop detection
    this.detectInfiniteLoops(workflow);

    // 3. Type checking for inputs/outputs
    this.validateInputOutputTypes(workflow);

    // 4. Parallel branch count limits
    const parallelBranches = this.countParallelBranches(workflow);
    if (parallelBranches > 100) {
      this.warning(
        `High parallel branch count (${parallelBranches}) may impact performance`,
        workflow.span
      );
    }
  }

  private detectInfiniteLoops(workflow: AST.WorkflowDeclaration): void {
    const steps = this.getWorkflowSteps(workflow);

    for (const step of steps) {
      if (step.kind === 'WorkflowLoopExpr') {
        // Check for potentially infinite loops
        if (step.loopType === 'while' || step.loopType === 'until') {
          // Static analysis: if condition doesn't reference loop variables, warn
          if (!this.conditionReferencesLoopState(step.condition)) {
            this.warning(
              'Potential infinite loop: condition does not reference loop state',
              step.span
            );
          }
        }
      }
    }
  }
}
```

---

## 📚 Phase C: Skill Declaration Enhancements

### C.1 Current Implementation Analysis

**Existing Code** ([src/parser/index.ts](../src/parser/index.ts#L3272-L3330)):

```typescript
// ✅ Basic implementation:
- items: ["skill1", "skill2"]
- category: "Technical"

// ❌ Missing features:
- Hierarchical organization
- Proficiency levels
- Skill dependencies
- Skill metadata
```

### C.2 Enhancement Design

#### C.2.1 Hierarchical Skill Organization

**Use Case**:

```pcl
skill FullStackDev {
  items: [
    "JavaScript",
    "TypeScript",
    "Node.js"
  ]

  groups: {
    foundation: ["Problem Solving", "Critical Thinking"],
    technical: ["TypeScript", "Node.js", "React"],
    tools: ["Git", "Docker", "VS Code"]
  }

  category: "Engineering"
}
```

**AST Enhancement**:

```typescript
export interface SkillDeclaration extends ASTNode {
  readonly kind: 'SkillDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly body: SkillBody;
}

export interface SkillBody extends ASTNode {
  readonly kind: 'SkillBody';
  readonly members: readonly SkillMember[];
}

export type SkillMember =
  | SkillItemsDeclaration
  | SkillCategoryDeclaration
  | SkillGroupsDeclaration // ← NEW
  | SkillProficiencyDeclaration // ← NEW
  | SkillDependenciesDeclaration // ← NEW
  | SkillMetadataDeclaration // ← NEW
  | PropertyDeclaration;

// NEW: Skill groups
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

**Parser Implementation**:

```typescript
private parseSkillDeclaration(
  decorators: AST.Decorator[],
  modifiers: AST.Modifier[]
): AST.SkillDeclaration {
  const start = this.peek().span.start;
  this.expectKeyword('skill');
  const id = this.parseIdentifier();
  const typeParameters = this.parseOptionalTypeParameters();

  this.expect(TokenType.LBRACE, 'Expected "{"');
  const members: AST.SkillMember[] = [];

  while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
    if (this.checkKeyword('items')) {
      members.push(this.parseSkillItemsDeclaration());
    } else if (this.checkKeyword('category')) {
      members.push(this.parseSkillCategoryDeclaration());
    } else if (this.checkKeyword('groups')) {
      members.push(this.parseSkillGroupsDeclaration());  // ← NEW
    } else if (this.checkKeyword('proficiency')) {
      members.push(this.parseSkillProficiencyDeclaration());  // ← NEW
    } else if (this.checkKeyword('requires')) {
      members.push(this.parseSkillDependenciesDeclaration());  // ← NEW
    } else {
      members.push(this.parsePropertyDeclaration([], []));
    }
  }

  this.expect(TokenType.RBRACE, 'Expected "}"');

  return {
    kind: 'SkillDeclaration',
    decorators,
    modifiers,
    id,
    typeParameters,
    body: {
      kind: 'SkillBody',
      members,
      span: this.makeSpan(start, this.previous().span.end),
    },
    span: this.makeSpan(start, this.previous().span.end),
  };
}

// NEW: Parse skill groups
private parseSkillGroupsDeclaration(): AST.SkillGroupsDeclaration {
  const start = this.peek().span.start;
  this.expectKeyword('groups');
  this.expect(TokenType.COLON, 'Expected ":"');
  this.expect(TokenType.LBRACE, 'Expected "{"');

  const groups: AST.SkillGroup[] = [];

  while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
    const groupName = this.parseIdentifier();
    this.expect(TokenType.COLON, 'Expected ":" after group name');
    this.expect(TokenType.LBRACKET, 'Expected "["');

    const skills: AST.StringLiteral[] = [];
    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      skills.push(this.parseStringLiteral());
      this.match(TokenType.COMMA);
    }

    this.expect(TokenType.RBRACKET, 'Expected "]"');

    groups.push({
      kind: 'SkillGroup',
      name: groupName,
      skills,
      span: this.makeSpan(groupName.span.start, this.previous().span.end),
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

#### C.2.2 Skill Proficiency Levels

**Use Case**:

```pcl
skill DevSkills {
  proficiency: {
    "TypeScript": expert,
    "Python": intermediate,
    "Rust": beginner
  }
}
```

**Implementation** (Similar pattern to groups above).

---

## ⚡ Phase D: Cross-Cutting Improvements

### D.1 Enhanced Error Recovery

**Goal**: Continue parsing after errors to report multiple issues at once.

**Implementation Strategy**:

```typescript
class Parser {
  // Error recovery modes
  private recoveryMode: 'panic' | 'insertion' | 'deletion' = 'panic';

  // Synchronization points
  private readonly syncTokens = new Set([
    TokenType.SEMICOLON,
    TokenType.RBRACE,
    TokenType.KEYWORD_PERSONA,
    TokenType.KEYWORD_TEAM,
    TokenType.KEYWORD_WORKFLOW,
  ]);

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      if (this.syncTokens.has(this.peek().type)) {
        return;
      }

      this.advance();
    }
  }

  private recover<T>(fn: () => T, fallback: T): T {
    if (!this.errorRecovery) {
      return fn();
    }

    try {
      return fn();
    } catch (error) {
      this.error(error.message);
      this.synchronize();
      return fallback;
    }
  }
}
```

### D.2 Performance Optimizations

**Token Buffering**:

```typescript
class Parser {
  private tokenBuffer: Token[] = [];
  private bufferSize = 10;

  private peek(offset = 0): Token {
    // Fill buffer if needed
    while (this.tokenBuffer.length <= offset) {
      this.tokenBuffer.push(this.tokens[this.current++]);
    }
    return this.tokenBuffer[offset];
  }
}
```

**AST Node Pooling**:

```typescript
class ASTNodePool {
  private pools: Map<string, ASTNode[]> = new Map();

  allocate<T extends ASTNode>(kind: string): T {
    const pool = this.pools.get(kind);
    if (pool && pool.length > 0) {
      return pool.pop() as T;
    }
    return this.createNode(kind) as T;
  }

  release(node: ASTNode): void {
    const pool = this.pools.get(node.kind) || [];
    pool.push(node);
    this.pools.set(node.kind, pool);
  }
}
```

---

## 📊 Implementation Plan

### Week 1: Team Enhancements (Days 1-5)

| Day | Task                        | Hours | Priority |
| --- | --------------------------- | ----- | -------- |
| 1   | Nested team parsing         | 6h    | High     |
| 2   | Spawn expression validation | 4h    | High     |
| 3   | Weighted merge configs      | 6h    | Medium   |
| 4   | Team inheritance            | 8h    | Medium   |
| 5   | Validation suite            | 6h    | High     |

### Week 2: Workflow Enhancements (Days 6-10)

| Day | Task                         | Hours | Priority |
| --- | ---------------------------- | ----- | -------- |
| 6   | Async pipe (~>) operator     | 4h    | High     |
| 7   | Bidirectional (<->) operator | 4h    | Medium   |
| 8   | Accumulate (>>>) operator    | 4h    | Medium   |
| 9   | Enhanced loop constructs     | 6h    | High     |
| 10  | Workflow validation          | 6h    | High     |

### Week 3: Skill Enhancements (Days 11-14)

| Day | Task                      | Hours | Priority |
| --- | ------------------------- | ----- | -------- |
| 11  | Hierarchical skill groups | 6h    | Medium   |
| 12  | Proficiency levels        | 4h    | Low      |
| 13  | Skill dependencies        | 6h    | Medium   |
| 14  | Integration testing       | 8h    | High     |

---

## ✅ Success Criteria

### Phase A: Team Declarations

- [ ] Can parse nested team references
- [ ] Validates spawn expressions (5x WORKER)
- [ ] Supports weighted merge configurations
- [ ] Detects circular team references
- [ ] 100% test coverage for team parsing

### Phase B: Workflow Expressions

- [ ] All 8 workflow operators implemented
- [ ] Enhanced loop constructs work
- [ ] Detects infinite loops (static analysis)
- [ ] Validates workflow type consistency
- [ ] 100% test coverage for workflow parsing

### Phase C: Skill Declarations

- [ ] Hierarchical skill organization
- [ ] Proficiency levels (expert/intermediate/beginner)
- [ ] Skill dependency tracking
- [ ] Validates circular dependencies
- [ ] 100% test coverage for skill parsing

### Phase D: Infrastructure

- [ ] Error recovery at 3+ synchronization points
- [ ] <50ms parse time for 10KB files
- [ ] Memory usage <100MB for large files
- [ ] Rich error messages with code snippets

---

## 📚 References

### Internal Documentation

- [Grammar Specification](../grammar/pcl.ebnf)
- [AST Definitions](../src/ast/index.ts)
- [Parser Implementation](../src/parser/index.ts)
- [Semantic Analyzer](../src/semantic/index.ts)

### External References

- [Crafting Interpreters - Error Recovery](https://craftinginterpreters.com/parsing-expressions.html#syntax-errors)
- [TypeScript Handbook - AST Design](https://www.typescriptlang.org/docs/handbook/compiler-api.html)
- [Pratt Parsing](https://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/)

---

**Next Steps**: Review this architecture with the team, then begin implementation of Phase A (Team Enhancements).
