# PCL Copilot Quick Reference Card

> **Print this guide** or keep it open while developing PCL for maximum productivity!

---

## 🎯 Core Workflow Pattern

```
1. Activate Persona → 2. Load Context → 3. Execute → 4. Update Status
```

---

## 🤖 Persona Commands

### Architecture & Design

```
/persona ARCHI
→ System design, architectural decisions, refactoring plans
```

### Implementation

```
/persona DEV
→ Write code, implement features, fix bugs, write tests
```

### Code Review

```
/persona CRITIC
→ Review code quality, identify issues, suggest improvements
```

### Security Audit

```
/persona SEC
→ Security review, vulnerability analysis, threat modeling
```

### Documentation

```
/persona TECH_WRITER
→ Write guides, API docs, tutorials, examples
```

### Standards & Compliance

```
/persona STANDARD_ARCHITECT
→ Language specification, standardization work
```

### Testing & QA

```
/persona QA
→ Test strategies, edge cases, quality assurance
```

### DevOps & Tooling

```
/persona DEVOPS
→ CI/CD, build systems, deployment, automation
```

---

## 👥 Team Commands

### Complete Review

```
/team dream-team
→ ARCHI + DEV + SEC + CRITIC (comprehensive analysis)
```

### Security Focus

```
/team security-review
→ SEC + ARCHI + CRITIC (security-first review)
```

### Standards Work

```
/team standardization
→ STANDARD_ARCHITECT + SPEC_EDITOR + COMPLIANCE_ENGINEER
```

---

## 📋 Request Templates

### Start Implementation

```markdown
/persona DEV

Implement [feature] from pcl_todo.md:

- Reference: [file paths]
- Follow: copilot-instructions.md standards
- Tests: Include comprehensive test coverage
- Quality: Run lint + test after implementation
```

### Architecture Planning

```markdown
/persona ARCHI

Design [component] architecture:

- Current state: [description]
- Goal: [objectives]
- Constraints: [limitations]
- Reference: [existing patterns in codebase]

Output: Architecture diagram + implementation plan
```

### Code Review

```markdown
/persona CRITIC

Review changes for:

- Code quality vs copilot-instructions.md
- Test coverage (≥80% requirement)
- Type safety and immutability
- Documentation completeness

Output: Actionable improvement list
```

### Security Audit

```markdown
/persona SEC

Security review of [component]:

- Input validation
- Error handling
- Privilege escalation risks
- Data sanitization

Output: Vulnerability report + fixes
```

---

## ⚡ Efficiency Commands

### Parallel File Reading

```
Read these files in parallel:
- src/parser/index.ts
- src/semantic/index.ts
- src/codegen/index.ts

Then [action]
```

### Batch Status Update

```
Update in parallel:
- QUICK-STATUS.md (metrics)
- pcl_todo.md (mark complete)
- ROADMAP.md (progress)
```

### Multi-File Edits

```
Fix [issue] in:
- src/parser/index.ts (lines X-Y)
- src/types/index.ts (lines A-B)
- tests/integration.test.ts (add test)

Use multi_replace for efficiency
```

---

## 📁 Context Loading Patterns

### Feature Implementation

```
Context for [feature]:
1. Grammar: grammar/pcl.ebnf (syntax)
2. Current: src/[module]/index.ts (patterns)
3. Tests: tests/[module].test.ts (test style)
4. Docs: docs/api/[MODULE].md (spec)

Then implement [feature]
```

### Bug Fix

```
Debug [issue]:
1. Error: [error message]
2. File: [file path] (lines X-Y)
3. Recent changes: git log [file]
4. Related tests: tests/[test file]

Analyze root cause and fix
```

### Documentation

```
Document [feature]:
1. Code: src/[module]/ (implementation)
2. Tests: tests/ (usage examples)
3. Existing: docs/ (structure)

Write guide following docs/ patterns
```

---

## 🔍 Quality Gates

### Pre-Commit Check

```bash
npm run lint:fix && npm run format && npm run test && npm run build
```

### Coverage Check

```bash
npm run test:coverage
# Must be ≥ 80%
```

### Type Safety

```bash
npx tsc --noEmit
# Must show 0 errors
```

---

## 📊 Status Commands

### Quick Status

```
Check QUICK-STATUS.md and tell me:
1. What's complete
2. What's in progress
3. What's next priority
```

### Progress Report

```
Compare current state vs ROADMAP.md Phase [X]:
- Completed items
- Remaining tasks
- Blockers
```

### Test Summary

```
Run npm run test:coverage

Report:
- Tests passing/total
- Coverage percentage
- Failed tests (if any)
```

---

## 🎯 Task Management

### Create Todo List

```
Create todo list for [feature]:
1. [Task 1]
2. [Task 2]
...

Use manage_todo_list tool
```

### Update Progress

```
Mark task [N] complete
Update status to in-progress for task [N+1]
```

### Review Todos

```
Show current todo list status:
- In progress (current work)
- Not started (backlog)
- Recently completed
```

---

## 💾 File Operations

### Targeted Reading

```
Read src/[file].ts:
- Lines 1-50 (imports)
- Lines 200-250 (main logic)
- Lines 500-550 (exports)
```

### Smart Searching

```
# Exact match
grep search: 'PersonaDeclaration'

# Semantic search
Find concepts related to: type checking

# File pattern
Find all: *.test.ts
```

### Batch Editing

```
Update [pattern] across:
- src/parser/index.ts
- src/semantic/index.ts
- src/codegen/index.ts

Use multi_replace_string_in_file
```

---

## 🚀 Development Shortcuts

### Start Session

```bash
npm run dev          # Build + watch
npm run test:watch   # Test + watch
```

### Quick Validation

```bash
npm run build   # Compile check
npm run test    # Test check
npm run lint    # Style check
```

### Full Quality Check

```bash
npm run lint:fix && \
npm run format && \
npm run test && \
npm run build
```

---

## 📝 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Example**:

```
feat(parser): add team declaration support

- Implement recursive parsing for team blocks
- Add validation for team membership
- Update grammar documentation
- Add comprehensive tests

Closes #42
```

---

## 🎨 Code Patterns

### Result Type

```typescript
function parse(input: string): Result<AST, ParseError[]> {
  // ...
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: ast };
}
```

### Immutable Transform

```typescript
// ✅ GOOD
function addSkill(persona: Persona, skill: Skill): Persona {
  return {
    ...persona,
    skills: [...persona.skills, skill],
  };
}

// ❌ BAD
function addSkill(persona: Persona, skill: Skill): void {
  persona.skills.push(skill); // Mutation!
}
```

### Visitor Pattern

```typescript
interface ASTVisitor<T> {
  visitPersona(node: PersonaNode): T;
  visitTeam(node: TeamNode): T;
}
```

---

## 📚 Quick Links

| Document                                                      | Purpose                     |
| ------------------------------------------------------------- | --------------------------- |
| [copilot-instructions.md](../.github/copilot-instructions.md) | Coding standards & patterns |
| [ROADMAP.md](../.roadmap/ROADMAP.md)                          | Project phases & timeline   |
| [QUICK-STATUS.md](../.roadmap/QUICK-STATUS.md)                | Current capabilities        |
| [pcl_todo.md](../.roadmap/pcl_todo.md)                        | Active task list            |
| [grammar/pcl.ebnf](../grammar/pcl.ebnf)                       | Language syntax             |

---

## 🔥 Power User Tips

1. **Batch operations** → Parallel tool invocations save time
2. **Precise context** → File paths + line ranges = better results
3. **Personas first** → Activate specialized persona before task
4. **Track progress** → Use manage_todo_list for multi-step work
5. **Quality gates** → Always run tests after changes
6. **Reference code** → Point to existing patterns as templates
7. **Multi-replace** → Batch edits in one operation
8. **Targeted reads** → Read specific sections, not whole files
9. **Status sync** → Keep roadmap/todo files updated
10. **Test coverage** → Maintain ≥80%, check regularly

---

## ⚠️ Anti-Patterns to Avoid

❌ **Sequential requests** when parallel possible
❌ **Vague context** like "fix the parser"
❌ **Forgetting quality checks** after changes
❌ **Mutating AST nodes** instead of copying
❌ **Using `any` type** without justification
❌ **Skipping tests** for "quick fixes"
❌ **Missing position tracking** in AST nodes
❌ **Throwing exceptions** in compiler code

---

## 🎓 Remember

> **"Batch operations, precise context, quality gates, track progress."**

---

**Keep this card handy!** Reference it before starting any coding session for optimal productivity.

**Last Updated**: 2026-01-17
**Version**: 1.0
