# Claude Quick Reference Card for PCL

> **Print this guide** for rapid-fire Claude commands and workflows!

---

## 🎯 Core Claude Workflow

```
1. Load Context → 2. Activate Persona → 3. Execute Task → 4. Quality Check
```

---

## 🤖 Persona Commands (PCL Bootstrap)

### Architecture & Design

```
/persona ARCHI
→ System architecture, design patterns, refactoring strategies
```

### Implementation

```
/persona DEV
→ Feature implementation, bug fixes, test writing
```

### Code Review

```
/persona CRITIC
→ Code quality review, improvement suggestions, standards compliance
```

### Security Audit

```
/persona SEC
→ Vulnerability analysis, security best practices, threat modeling
```

### Documentation

```
/persona TECH_WRITER
→ User guides, API docs, tutorials, examples
```

### Standards & Compliance

```
/persona STANDARD_ARCHITECT
→ Language specification, standardization, compliance
```

### Testing & QA

```
/persona QA
→ Test strategies, edge cases, quality assurance
```

### DevOps

```
/persona DEVOPS
→ CI/CD, build systems, deployment automation
```

---

## 👥 Team Commands

### Comprehensive Review

```
/team dream-team
→ ARCHI + DEV + SEC + CRITIC (full analysis)
```

### Security Focus

```
/team security-review
→ SEC + ARCHI + CRITIC (security-first)
```

### Standards Work

```
/team standardization
→ STANDARD_ARCHITECT + SPEC_EDITOR + COMPLIANCE_ENGINEER
```

---

## 📋 Claude Power Templates

### Implementation Request

```markdown
/persona DEV

Context:

- Project: PCL compiler (see .github/copilot-instructions.md)
- Phase: [phase from .roadmap/ROADMAP.md]
- Files: [relevant source files]
- Standards: TypeScript strict mode, immutability, Result<T,E> pattern

Task: Implement [feature]
Requirements:

- [requirement 1]
- [requirement 2]
  Tests: Include comprehensive tests (≥80% coverage)
  Quality: Run build + test after implementation
```

### Architecture Design

```markdown
/persona ARCHI

Context:

- Current: [describe current state]
- Goal: [objectives]
- Constraints: [limitations]
- References: [existing patterns in codebase]

Task: Design [component] architecture
Output:

1. Architecture diagram (Mermaid)
2. Component interfaces
3. Data flow description
4. Implementation plan (phased)
```

### Code Review Request

```markdown
/persona CRITIC

Review: [file paths or git diff]
Standards: .github/copilot-instructions.md
Focus:

- Immutability (no mutations)
- Error handling (Result pattern)
- Type safety (no `any`)
- Test coverage (≥80%)
- Documentation (TSDoc)

Output: Prioritized improvement list
```

### Security Audit

```markdown
/persona SEC

Audit: [component/file]
Threats:

- Code injection (eval, Function)
- Input validation
- Resource exhaustion
- Privilege escalation
- Data sanitization

Output:

1. Vulnerability report (severity ratings)
2. Proof-of-concept (if applicable)
3. Remediation steps
4. Fixed code
```

---

## ⚡ Claude Efficiency Patterns

### Front-Load Context

```markdown
Session context:

Files: Read in parallel:

- src/parser/index.ts
- src/semantic/index.ts
- src/codegen/index.ts

Standards: .github/copilot-instructions.md
Grammar: grammar/pcl.ebnf
Goal: [specific goal]

Now [action].
```

### Iterative Refinement

```markdown
Step 1: Design [component]

- Output: Interface definitions + diagram
- Wait for review

Step 2: Implement core logic

- Based on approved design
- Wait for review

Step 3: Add error handling

- Wait for review

Step 4: Write tests

- ≥80% coverage
```

### Parallel Analysis

```markdown
Analyze in parallel:

1. Architecture (src/)
2. Test coverage (tests/)
3. Documentation (docs/)
4. Configuration (.vscode/, tsconfig.json)

Provide unified assessment.
```

---

## 📁 Context Loading Shortcuts

### Feature Implementation

```markdown
Load context for [feature]:

Grammar: src/grammar/pcl.ebnf ([lines])
Pattern: src/[module]/index.ts ([method])
Tests: tests/[file].test.ts
Docs: docs/api/[FILE].md

Implement [feature] following these patterns.
```

### Bug Fix

```markdown
Debug context:

Error: [error message]
File: [file]:[lines]
Recent: git log --oneline -5 [file]
Tests: [related test file]

Analyze root cause → propose fix → update tests.
```

### Documentation

```markdown
Document [feature]:

Code: src/[module]/ (implementation)
Tests: tests/ (examples)
Structure: docs/ (follow existing)
Audience: [target users]

Write guide with code examples.
```

---

## 🔍 Quality Commands

### Full Quality Gate

```bash
# Run all checks
npm run lint && \
npm run test && \
npx tsc --noEmit && \
npm run build

# Report: Pass/Fail for each
```

### Coverage Check

```bash
npm run test:coverage
# Must be ≥80%
```

### Type Safety

```bash
npx tsc --noEmit
# Must show 0 errors
```

---

## 🎯 Task Tracking

### Create Todo List

```markdown
Create todo for [feature]:

Use manage_todo_list tool:

1. [Task 1] - not-started
2. [Task 2] - not-started
   ...

Mark task 1 as in-progress.
```

### Update Progress

```markdown
Update todo:

- Mark task [N] completed
- Mark task [N+1] in-progress
- Add subtask to task [N+2]: [description]
```

### Status Check

```markdown
Todo status:

- Completed: [count]
- In progress: [current task]
- Remaining: [count]
- Completion: [X%]
```

---

## 💾 File Operations

### Targeted Reads

```markdown
Read src/parser/index.ts:

- Lines 1-50 (imports + types)
- Lines 200-250 (parsePersona method)
- Lines 500-550 (helper functions)
```

### Smart Search

```markdown
# Exact match

grep 'PersonaDeclaration' in src/

# Semantic

Find concepts related to: [concept]

# Pattern

Find all: \*.test.ts with "workflow"
```

### Batch Edits

```markdown
Update [pattern] across:

- src/parser/index.ts
- src/semantic/index.ts
- tests/integration.test.ts

Use multi_replace_string_in_file for efficiency.
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
npm run build   # Compile
npm run test    # Test
npm run lint    # Style
```

### Pre-Commit

```bash
npm run lint:fix && \
npm run format && \
npm run test && \
npm run build
```

---

## 📊 Status Commands

### Quick Status

```markdown
Check .roadmap/QUICK-STATUS.md:

- What's complete
- What's in progress
- What's next
```

### Progress vs Roadmap

```markdown
Compare current vs .roadmap/ROADMAP.md Phase [X]:

- Completed items
- Remaining tasks
- Blockers
- Estimated completion
```

### Test Summary

```markdown
Run npm run test:coverage

Report:

- Tests: [passing]/[total]
- Coverage: [X%]
- Failed: [list]
```

---

## 📝 Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Example**:

```
feat(parser): add workflow declaration support

- Implement recursive parsing for workflow blocks
- Add validation for workflow syntax
- Update grammar documentation
- Add comprehensive tests

Closes #42
```

---

## 🎨 Code Patterns

### Result Type

```typescript
function parse(input: string): Result<AST, ParseError[]> {
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
  return { ...persona, skills: [...persona.skills, skill] };
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

| Document                        | Purpose               |
| ------------------------------- | --------------------- |
| .claude/CLAUDE-INSTRUCTIONS.md  | Complete Claude guide |
| .github/copilot-instructions.md | Coding standards      |
| .roadmap/ROADMAP.md             | Project phases        |
| .roadmap/QUICK-STATUS.md        | Current capabilities  |
| .roadmap/pcl_todo.md            | Active tasks          |
| src/grammar/pcl.ebnf            | Language syntax       |

---

## 🔥 Claude Power Tips

1. **Front-load context** → 200K token window, use it!
2. **Activate personas** → Specialized expertise on demand
3. **Iterate design** → Design → Review → Implement
4. **Parallel ops** → Read multiple files simultaneously
5. **Quality gates** → Always check after changes
6. **Track todos** → Use manage_todo_list for complex work
7. **Reference patterns** → Point to existing code
8. **Multi-replace** → Batch edits efficiently
9. **Test first** → TDD for critical features
10. **Document inline** → TSDoc as you code

---

## ⚠️ Anti-Patterns

❌ **Vague requests** → Provide precise context
❌ **Sequential reads** → Request parallel when possible
❌ **Skip tests** → Always include test coverage
❌ **Mutate AST** → Use immutable transformations
❌ **Use `any`** → Prefer `unknown` or proper types
❌ **Throw errors** → Use Result<T, E> in compiler code
❌ **Forget positions** → Track line/column in AST
❌ **Skip quality checks** → Run lint + test + build

---

## 🎓 Remember

> **"Context first, persona second, quality always."**

---

**Keep this card handy!** Reference before every Claude session.

**Last Updated**: 2026-01-17
**Version**: 1.0
**Optimized for**: Claude Code (Sonnet 4.5)
