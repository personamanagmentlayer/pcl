# PCL Semantic Rules Implementation Plan

**Version:** 1.0
**Date:** 2026-01-16
**Status:** 🔧 **In Progress**

---

## Executive Summary

The PCL semantic analyzer has a **solid foundation (65% complete)** with comprehensive type system infrastructure. This document outlines the implementation plan for completing the remaining 35% to achieve production-ready semantic analysis.

**Current State:**
- ✅ Type system: 80% complete
- ✅ Symbol table & scoping: 75% complete
- ⚠️ TypeScript build: **BROKEN** (25+ errors)
- ❌ Constraint validation: Not implemented
- ❌ Module visibility: Not enforced
- ❌ Advanced type inference: Missing

**Target:** Production-ready semantic analysis supporting roadmap v2.2+ features

---

## Phase 1: Critical Fixes (Week 1) 🔴

**Goal:** Make the semantic analyzer usable in TypeScript projects

### 1.1 Fix TypeScript Build Errors

**Priority:** CRITICAL
**Effort:** 2-4 hours
**Blocks:** Package usage, IDE support

**Errors to fix:**

#### Error 1: SymbolTable Constructor (6 occurrences)
```typescript
// Current (incorrect):
globalScope = new SymbolTable(undefined, 'global');

// Should be:
globalScope = new SymbolTable();
globalScope.kind = 'global';

// Lines affected: 998, 1519, 1750, 1829, 1882, 1929
```

**Fix:**
1. Update SymbolTable constructor to accept parent and kind
2. OR remove all constructor arguments and set properties after
3. Update all 6 call sites

#### Error 2: Readonly Array Assignments (10 occurrences)
```typescript
// Current (fails):
function hasModifier(modifiers: Modifier[], mod: string): boolean

// Should be:
function hasModifier(modifiers: readonly Modifier[], mod: string): boolean

// Lines affected: 1141, 1188, 1226, 1249, 1305, 1340, 1385, 1450
```

**Fix:**
1. Change `hasModifier()` function signature to accept `readonly Modifier[]`
2. Verify no mutations occur inside the function

#### Error 3: Union Type Property Access (3 occurrences)
```typescript
// Current (fails):
const name = methodProp.key.name; // key is Identifier | StringLiteral

// Should be:
const name = methodProp.key.kind === 'Identifier'
  ? methodProp.key.name
  : methodProp.key.value;

// Lines affected: 1270, 2272, 2439
```

**Fix:**
1. Add type guards before accessing `.name`
2. Handle both Identifier and Literal cases

#### Error 4: ObjectType.properties vs .members
```typescript
// Current (fails):
object: (properties: ObjectType['properties']) =>

// Should be:
object: (members: ObjectType['members']) =>

// Line affected: 692
```

**Fix:**
1. Use correct property name (`members` not `properties`)
2. Update type annotation

#### Error 5: Parameter Type Issues
```typescript
// Current (fails):
const name = p.name;  // p.name can be null

// Should be:
const name = p.name?.name || String(p.pattern);

// Lines affected: 2423-2426
```

**Fix:**
1. Add null checks
2. Handle Pattern type parameters

**Deliverables:**
- [ ] All 25 TypeScript errors resolved
- [ ] `npm run build` succeeds with `.d.ts` generation
- [ ] Package usable in TypeScript projects

---

## Phase 2: Scope & Visibility (Week 2) 🟡

**Goal:** Implement proper module boundaries and access control

### 2.1 Module Visibility Enforcement

**Priority:** HIGH
**Effort:** 4-6 hours
**Enables:** v2.5 security features

**Requirements:**
1. **Enforce pub/private modifiers**
   ```pcl
   pub persona SEC { }   // Accessible outside module
   persona INTERNAL { }  // Only accessible in same module
   ```

2. **Module boundary tracking**
   - Track current module context
   - Validate cross-module references
   - Prevent access to non-exported symbols

3. **Export validation**
   - Verify exported symbols exist
   - Check circular exports
   - Warn about unused exports

**Implementation:**

```typescript
// Add to SymbolTable
interface SymbolTable {
  module?: ModuleInfo;

  canAccess(symbol: Symbol, fromModule: ModuleInfo): boolean;
}

interface ModuleInfo {
  path: string;
  exports: Set<string>;
}

// Add visibility check
private checkSymbolAccess(symbol: Symbol, span: Span): boolean {
  if (symbol.flags & SymbolFlags.Exported) return true;
  if (symbol.scope.module === this.currentModule) return true;

  this.error(`Cannot access private symbol '${symbol.name}'`, span);
  return false;
}
```

**Test cases:**
```pcl
// module a.pcl
pub persona A { }
persona B { }

// module b.pcl
import { A, B } from "./a.pcl";  // Error: B is not exported

team MyTeam {
  members: [A]  // ✓ OK
  members: [B]  // ✗ Error: Cannot access private symbol 'B'
}
```

**Deliverables:**
- [ ] Module context tracking
- [ ] Access control enforcement
- [ ] Export validation
- [ ] 10+ test cases

---

### 2.2 Scope Resolution Rules

**Priority:** MEDIUM
**Effort:** 3-4 hours

**Missing features:**
1. **Shadowing detection**
   ```pcl
   let x = 1;
   {
     let x = 2;  // Warning: Shadows outer 'x'
   }
   ```

2. **Hoisting rules**
   - Functions hoisted to top of scope
   - Variables not hoisted (TDZ - Temporal Dead Zone)

3. **Closure capture**
   - Track which variables are captured by closures
   - Detect capture of loop variables

**Implementation:**

```typescript
// Add to Symbol
interface Symbol {
  shadowed?: Symbol;      // Symbol this shadows
  capturedBy?: Set<Symbol>; // Functions that capture this
}

// Check shadowing
private declareShadowCheck(name: string, span: Span): void {
  const outer = this.currentScope.parent?.lookup(name);
  if (outer && outer.scope !== this.currentScope) {
    this.warning(`Variable '${name}' shadows outer declaration`, span);
  }
}
```

**Deliverables:**
- [ ] Shadowing warnings
- [ ] Hoisting implementation
- [ ] Closure capture tracking

---

## Phase 3: Type Inference (Week 3) 🟡

**Goal:** Implement bidirectional type inference and type narrowing

### 3.1 Type Narrowing

**Priority:** HIGH
**Effort:** 6-8 hours
**Enables:** Better type safety

**Features:**

1. **Control flow analysis**
   ```pcl
   let x: string | number = getValue();

   if (typeof x === "string") {
     // x is narrowed to string here
     x.toUpperCase();  // ✓ OK
   } else {
     // x is narrowed to number here
     x.toFixed(2);  // ✓ OK
   }
   ```

2. **Type guards**
   - `typeof` operator
   - `instanceof` checks
   - Truthiness checks
   - Discriminated unions

3. **Branch tracking**
   - Track type in if/else branches
   - Handle early returns
   - Support switch/match statements

**Implementation:**

```typescript
// Add type refinement map
interface TypeChecker {
  refinements: Map<string, Type>;  // variable → refined type

  enterTruenessBranch(condition: AST.Expression): void;
  exitBranch(): void;
}

// Example: typeof narrowing
if (condition.kind === 'BinaryExpression' &&
    condition.operator === '===') {

  if (condition.left.kind === 'UnaryExpression' &&
      condition.left.operator === 'typeof') {

    const varName = (condition.left.argument as AST.Identifier).name;
    const typeStr = (condition.right as AST.Literal).value;

    // Narrow type in true branch
    this.refinements.set(varName, getPrimitiveType(typeStr));
  }
}
```

**Deliverables:**
- [ ] typeof narrowing
- [ ] instanceof narrowing
- [ ] Truthiness narrowing
- [ ] Branch type tracking
- [ ] 20+ test cases

---

### 3.2 Bidirectional Type Inference

**Priority:** MEDIUM
**Effort:** 4-6 hours

**Features:**

1. **Expected type propagation**
   ```pcl
   fn process(callback: (x: Int) -> String) { }

   process((x) => {
     // x is inferred as Int from callback signature
     return x.toString();  // Return type must be String
   });
   ```

2. **Generic parameter inference**
   ```pcl
   fn identity<T>(x: T) -> T { return x; }

   let result = identity(42);  // T inferred as Int
   ```

3. **Contextual typing**
   - Array literals infer from expected type
   - Object literals infer from expected type
   - Function expressions infer parameter types

**Implementation:**

```typescript
interface TypeChecker {
  expectedType: Type | null;  // Type expected by context

  inferWithExpected(expr: AST.Expression, expected: Type): Type;
}

private inferCallExpression(expr: AST.CallExpression): Type {
  const calleeType = this.inferExpression(expr.callee);

  if (calleeType instanceof FunctionType) {
    // Infer generic parameters
    const typeArgs = this.inferTypeArguments(
      calleeType.typeParameters,
      expr.arguments,
      calleeType.parameters
    );

    // Instantiate generic function
    return this.instantiateGeneric(calleeType, typeArgs);
  }
}
```

**Deliverables:**
- [ ] Expected type context
- [ ] Generic parameter inference
- [ ] Contextual array/object typing
- [ ] 15+ test cases

---

## Phase 4: Constraint Validation (Week 4) 🟢

**Goal:** Validate persona/team/workflow constraints

### 4.1 Constraint Expression Evaluator

**Priority:** HIGH
**Effort:** 6-8 hours
**Enables:** v2.2 adaptive intelligence

**Features:**

1. **Comparison constraints**
   ```pcl
   persona SEC {
     constraints {
       maxTokens <= 4096
       timeout >= 30s
       accuracy > 0.95
     }
   }
   ```

2. **Logical constraints**
   ```pcl
   team ReviewTeam {
     constraints {
       (quorum == 2/3) && (timeout <= 60s)
       members.length >= 2
     }
   }
   ```

3. **Constraint solving**
   - Check satisfiability
   - Detect contradictions
   - Validate against actual behavior

**Implementation:**

```typescript
class ConstraintValidator {
  validate(constraints: AST.ConstraintBlock): ConstraintResult {
    for (const item of constraints.items) {
      if (typeof item === 'string') {
        // String constraint - treat as assertion
        this.validateStringConstraint(item);
      } else {
        // Expression constraint - evaluate
        this.validateExpressionConstraint(item);
      }
    }
  }

  private validateExpressionConstraint(expr: AST.Expression): void {
    // Evaluate constant expressions
    const result = this.evaluate(expr);

    if (result === false) {
      this.error('Constraint is always false', expr.span);
    }
  }

  private evaluate(expr: AST.Expression): boolean | 'unknown' {
    // Constant folding for constraint expressions
    // ...
  }
}
```

**Test cases:**
```pcl
persona A {
  constraints {
    maxTokens <= 4096
    maxTokens >= 1000    // ✓ Compatible
    maxTokens == 0       // ✗ Contradiction
  }
}
```

**Deliverables:**
- [ ] Constraint expression evaluator
- [ ] Satisfiability checking
- [ ] Contradiction detection
- [ ] 15+ test cases

---

### 4.2 Resource Constraint Validation

**Priority:** MEDIUM
**Effort:** 4-6 hours

**Features:**

1. **Timing constraints**
   - timeout validation
   - retry budget
   - deadline feasibility

2. **Resource limits**
   - maxTokens
   - maxRequests
   - concurrencyLimit

3. **Quorum validation**
   ```pcl
   team T {
     members: [A, B, C]
     quorum: 4/3  // ✗ Error: Impossible (need 4 out of 3)
   }
   ```

**Implementation:**

```typescript
private validateTeamQuorum(team: AST.TeamDeclaration): void {
  const quorum = this.extractQuorum(team);
  if (!quorum) return;

  const memberCount = team.body.members.filter(
    m => m.kind === 'TeamMembersDeclaration'
  )[0]?.members.length || 0;

  if (quorum.required > quorum.total) {
    this.error(`Quorum ${quorum.required}/${quorum.total} is impossible`, span);
  }

  if (quorum.total !== memberCount) {
    this.warning(`Quorum total (${quorum.total}) != members (${memberCount})`, span);
  }
}
```

**Deliverables:**
- [ ] Quorum validation
- [ ] Timeout validation
- [ ] Resource limit checking

---

## Phase 5: Advanced Features (Week 5-6) 🔵

**Goal:** Implement advanced type system features

### 5.1 Conditional Types

**Priority:** LOW
**Effort:** 8-10 hours

```pcl
type ExtractPersona<T> = T extends Persona ? T : never;

type OnlyPersonas = ExtractPersona<SEC | "string" | 42>;
// Result: SEC
```

### 5.2 Mapped Types

**Priority:** LOW
**Effort:** 6-8 hours

```pcl
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

### 5.3 Template Literal Types

**Priority:** LOW
**Effort:** 4-6 hours

```pcl
type EventName = `on${Capitalize<string>}`;
// Matches: "onClick", "onHover", etc.
```

---

## Testing Strategy

### Unit Tests

**Target:** 80%+ code coverage

**Test categories:**
1. Type checking (50+ tests)
2. Scope management (30+ tests)
3. Constraint validation (25+ tests)
4. Type inference (40+ tests)
5. Error recovery (20+ tests)

**Example test:**
```typescript
describe('Type Narrowing', () => {
  it('should narrow type in typeof guard', () => {
    const code = `
      let x: string | number = getValue();
      if (typeof x === "string") {
        x.toUpperCase();
      }
    `;

    const result = analyze(code);
    expect(result.ok).toBe(true);
    // No error on toUpperCase() call
  });
});
```

### Integration Tests

**Scenarios:**
1. Cross-module imports
2. Generic type instantiation
3. Constraint validation in workflows
4. Complex inheritance hierarchies
5. Error recovery scenarios

---

## Success Metrics

### Phase 1 (Week 1)
- [ ] ✅ All TypeScript errors fixed
- [ ] ✅ Package builds with .d.ts files
- [ ] ✅ Can be used in TypeScript projects

### Phase 2 (Week 2)
- [ ] ✅ Module visibility enforced
- [ ] ✅ Access control working
- [ ] ✅ 10+ visibility tests passing

### Phase 3 (Week 3)
- [ ] ✅ Type narrowing implemented
- [ ] ✅ Generic inference working
- [ ] ✅ 35+ inference tests passing

### Phase 4 (Week 4)
- [ ] ✅ Constraint validation working
- [ ] ✅ Contradiction detection
- [ ] ✅ 15+ constraint tests passing

### Overall Success
- [ ] ✅ 150+ semantic analysis tests passing
- [ ] ✅ 80%+ code coverage
- [ ] ✅ TypeScript build succeeds
- [ ] ✅ Supports roadmap v2.2 features

---

## Risk Mitigation

### Risk 1: TypeScript Errors Complex
**Mitigation:** Start with simple fixes, test incrementally

### Risk 2: Constraint Validation Scope Creep
**Mitigation:** Focus on simple constraints first, defer complex solving

### Risk 3: Type Inference Too Ambitious
**Mitigation:** Implement narrowing first, defer conditional types

---

## Resources Needed

- **Time:** 4-6 weeks (1 developer)
- **Expertise:** TypeScript, compiler design, type theory
- **Tools:** TypeScript, vitest, benchmark suite
- **Documentation:** Type system spec, constraint grammar

---

## Next Steps

1. **Immediate (This Week)**
   - Fix TypeScript build errors
   - Create semantic test suite
   - Document current constraints

2. **Short Term (Next 2 Weeks)**
   - Implement module visibility
   - Add type narrowing
   - Start constraint validation

3. **Medium Term (Weeks 4-6)**
   - Complete constraint validation
   - Implement generic inference
   - Add advanced type features

---

**Last Updated:** 2026-01-16
**Status:** Ready for implementation
**Owner:** PCL Core Team
