# Phase 2: Module Visibility Implementation Plan

**Date:** 2026-01-16
**Status:** 🔄 **Planning**
**Estimated Effort:** 4-6 hours

---

## Goals

Implement module boundary tracking and pub/private access control to enable proper encapsulation and security features for PCL v2.5.

---

## Current State Analysis

### ✅ What Exists

1. **AST Support**
   - `Modifier` type with `'pub'` and `'priv'` options
   - `ImportDeclaration` and `ExportDeclaration` nodes
   - Modifiers on declarations (personas, teams, functions, etc.)

2. **Symbol Support**
   - `Symbol.exported` boolean flag
   - `Symbol.scope` reference to containing scope

3. **Partial Implementation**
   - `collectExportDeclaration()` marks symbols as exported
   - Modifiers are parsed but not enforced

### ❌ What's Missing

1. **Module Context**
   - No tracking of current module path
   - No module-to-module relationship tracking
   - No import resolution validation

2. **Access Control**
   - pub/private modifiers not enforced
   - All symbols accessible regardless of visibility
   - No cross-module access checks

3. **Export Validation**
   - No verification that exported symbols exist
   - No circular export detection
   - No unused export warnings

---

## Implementation Strategy

### Step 1: Add Module Context (1-2 hours)

**Add to SemanticAnalyzer:**

```typescript
interface ModuleInfo {
  path: string;                    // Module file path
  exports: Map<string, Symbol>;    // Exported symbols
  imports: Map<string, Symbol>;    // Imported symbols
  dependencies: Set<string>;       // Imported module paths
}

export class SemanticAnalyzer {
  private currentModule: ModuleInfo | null = null;
  private modules: Map<string, ModuleInfo> = new Map();

  // Update analyze() to accept module path
  analyze(
    program: AST.Program,
    options?: { modulePath?: string }
  ): Result<AnalysisResult, PCLError[]>
}
```

**Changes needed:**
1. Add `ModuleInfo` interface
2. Add `currentModule` and `modules` properties
3. Update `analyze()` signature to accept `modulePath`
4. Initialize module context in `analyze()`

### Step 2: Track Visibility (1 hour)

**Add visibility to Symbol:**

```typescript
export interface Symbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: Type;
  readonly declaration: AST.Declaration | null;
  readonly span?: Span;
  readonly scope?: Scope;
  readonly flags?: number;
  readonly exported?: boolean;
  readonly mutable?: boolean;
  readonly visibility?: 'pub' | 'priv';  // NEW
  readonly module?: string;               // NEW - module path
}
```

**Update symbol creation:**
- Extract visibility from modifiers
- Store module path with each symbol
- Default to 'priv' if no modifier

### Step 3: Implement Access Checks (2-3 hours)

**Add access validation:**

```typescript
private checkSymbolAccess(
  symbol: Symbol,
  accessSpan: Span
): boolean {
  // If symbol is public, allow access
  if (symbol.visibility === 'pub' || symbol.exported) {
    return true;
  }

  // If symbol is in same module, allow access
  if (symbol.module === this.currentModule?.path) {
    return true;
  }

  // Private symbol accessed from different module
  this.error(
    `Cannot access private symbol '${symbol.name}' from module '${symbol.module}'`,
    accessSpan
  );
  return false;
}
```

**Add checks to:**
1. `checkIdentifier()` - variable/function references
2. `checkMemberExpression()` - property access
3. `collectImportDeclaration()` - import validation

### Step 4: Export Validation (1 hour)

**Validate exports:**

```typescript
private validateExports(): void {
  if (!this.currentModule) return;

  for (const [name, symbol] of this.currentModule.exports) {
    // Verify symbol exists in scope
    const found = this.globalScope.lookup(name);
    if (!found) {
      this.error(
        `Exported symbol '${name}' is not defined`,
        symbol.span
      );
    }

    // Verify symbol is actually public
    if (found && found.visibility === 'priv') {
      this.warning(
        `Exporting private symbol '${name}'`,
        symbol.span
      );
    }
  }
}
```

**Call from:**
- End of `analyze()` method

---

## Test Cases

### Test 1: Public Symbol Access

```pcl
// module a.pcl
pub persona PublicPersona { }

// module b.pcl
import { PublicPersona } from "./a.pcl";

team MyTeam {
  members: [PublicPersona]  // ✓ OK - public symbol
}
```

**Expected:** No errors

### Test 2: Private Symbol Access

```pcl
// module a.pcl
persona PrivatePersona { }  // No 'pub' modifier

// module b.pcl
import { PrivatePersona } from "./a.pcl";  // ✗ Error

team MyTeam {
  members: [PrivatePersona]  // ✗ Error
}
```

**Expected:** Error on import and usage

### Test 3: Same Module Access

```pcl
// module a.pcl
persona PrivatePersona { }

team MyTeam {
  members: [PrivatePersona]  // ✓ OK - same module
}
```

**Expected:** No errors

### Test 4: Export Validation

```pcl
// module a.pcl
export { NonExistent };  // ✗ Error - symbol doesn't exist
```

**Expected:** Error about undefined symbol

### Test 5: Exported Private Symbol

```pcl
// module a.pcl
persona PrivatePersona { }
export { PrivatePersona };  // ⚠ Warning - exporting private
```

**Expected:** Warning (should be marked pub)

---

## Implementation Checklist

### Phase 2A: Module Context

- [ ] Add `ModuleInfo` interface
- [ ] Add `currentModule` property to `SemanticAnalyzer`
- [ ] Add `modules` Map to track all modules
- [ ] Update `analyze()` signature for `modulePath`
- [ ] Initialize module context
- [ ] Test module tracking

### Phase 2B: Visibility Tracking

- [ ] Add `visibility` field to `Symbol`
- [ ] Add `module` field to `Symbol`
- [ ] Extract visibility from modifiers
- [ ] Default to 'priv' when no modifier
- [ ] Update all symbol creation sites
- [ ] Test visibility assignment

### Phase 2C: Access Control

- [ ] Implement `checkSymbolAccess()` method
- [ ] Add access check to `checkIdentifier()`
- [ ] Add access check to `checkMemberExpression()`
- [ ] Add access check to import validation
- [ ] Test cross-module access
- [ ] Test same-module access

### Phase 2D: Export Validation

- [ ] Implement `validateExports()` method
- [ ] Verify exported symbols exist
- [ ] Check for private exports
- [ ] Add circular dependency detection (optional)
- [ ] Call from `analyze()`
- [ ] Test export validation

### Phase 2E: Testing & Documentation

- [ ] Create test file for module visibility
- [ ] Test all scenarios
- [ ] Update SEMANTIC-STATUS.md
- [ ] Update PHASE-2-PROGRESS.md
- [ ] Update CURRENT-STATUS.md

---

## Success Criteria

- [ ] Module context tracked for each file
- [ ] pub/private modifiers enforced
- [ ] Cross-module access validated
- [ ] Export declarations validated
- [ ] All test cases passing
- [ ] No regressions in existing tests
- [ ] Documentation updated

---

## Risks & Mitigation

### Risk 1: Breaking Existing Code

**Mitigation:**
- Default to 'pub' for now, add warnings
- Make strict mode optional via analyzer options
- Gradual rollout

### Risk 2: Import Path Resolution

**Mitigation:**
- Phase 2 focuses on access control, not path resolution
- Assume paths are resolved externally
- Future enhancement: path resolution

### Risk 3: Circular Dependencies

**Mitigation:**
- Detect during import collection
- Add clear error messages
- Optional for Phase 2 (can defer)

---

## Next Steps After Phase 2

1. **Phase 3: Type Narrowing**
   - Control flow analysis
   - typeof guards
   - Discriminated unions

2. **Phase 4: Constraint Validation**
   - Expression evaluation
   - Satisfiability checking
   - Resource limits

---

**Status:** 🔄 **Ready to Begin**
**Priority:** HIGH (v2.5 requirement)
**Estimated Time:** 4-6 hours
**Complexity:** Medium
