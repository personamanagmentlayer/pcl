# Claude Configuration & Best Practices for PCL Development

> **Optimized for Claude Code (Sonnet 4.5)** - Complete guide for high-performance AI-assisted development

---

## 🎯 Overview

This document provides Claude-specific configurations, workflows, and best practices for PCL development. Claude offers unique capabilities that, when properly configured, enable exceptional productivity.

### **Project Context: PCL (Persona Control Language)**

PCL is a domain-specific language for AI persona management with:

- **Type System**: 19 distinct types including branded types (PersonaId, TeamId, etc.)
- **Architecture**: Lexer → Parser → Semantic Analyzer → Code Generators (5 formats)
- **Runtime**: Provider-based execution (Claude, GPT, custom providers)
- **Current Phase**: Phase 1.1 - Runtime Engine with LLM integration (75% complete)
- **Language Stack**: TypeScript 5.3+, Node.js 20+, Vitest for testing

---

## 🧠 Core Skills for PCL Development

Claude should operate with these specialized skills activated:

### **1. Language Design & Implementation**

- **Lexer/Parser Development**: Token recognition, AST construction, error recovery
- **Type System Design**: Type inference, constraint validation, flow analysis
- **Semantic Analysis**: Symbol tables, scope management, type checking
- **Code Generation**: Multi-target compilation (JSON, YAML, TypeScript, Markdown, Prompts)

### **2. Compiler Architecture**

- **Pipeline Design**: Source → Tokens → AST → Validated AST → Output
- **Error Handling**: Result<T, E> patterns, error recovery, diagnostic reporting
- **Performance**: O(n) algorithms, immutable data structures, caching strategies
- **Testing**: Unit tests (Vitest), integration tests, parser capability tests

### **3. AI Provider Integration**

- **Provider Abstraction**: Generic interfaces for multiple LLM providers
- **Prompt Engineering**: Provider-specific formatting (Claude XML, GPT Markdown, Gemini Contextual)
- **Streaming**: AsyncIterable responses, token counting, usage tracking
- **Tool Integration**: Function calling, message passing, workflow orchestration

### **4. Domain Expertise: Personas & Teams**

- **Persona Composition**: Skills, constraints, hooks, cognitive parameters
- **Team Orchestration**: Merge modes (primary, consensus, majority, debate, chain)
- **Workflow Execution**: Sequential (→), parallel (||), choice (|), transforms (=>)
- **Constraint Systems**: Text, comparison, expression, limit, pattern validation

### **5. Documentation & API Design**

- **API Documentation**: TSDoc comments, comprehensive guides, examples
- **Tutorial Writing**: Step-by-step guides for common use cases
- **Code Examples**: Working examples that showcase features
- **Architecture Documentation**: Mermaid diagrams, data flow, design decisions

### **6. Quality Assurance**

- **Test Coverage**: Unit, integration, end-to-end tests (target: 100%)
- **Type Safety**: No `any` types, comprehensive type definitions
- **Immutability**: No AST mutations, pure functions, functional patterns
- **Error Handling**: Comprehensive error messages with source locations

### **7. Project Management**

- **Todo Tracking**: Active todo lists (TodoWrite tool), progress tracking
- **Roadmap Alignment**: Strategic roadmap vs tactical todo list management
- **Status Reporting**: Phase completion, deliverables, blockers
- **Git Workflow**: Semantic commits, branch management, PR descriptions

---

## ⚙️ Claude Settings Configuration

### **File: `.claude/settings.local.json`**

Current configuration with secure permissions:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git checkout:*)",
      "Bash(npm install)",
      "Bash(npm test)",
      "Bash(npm run build:*)",
      "Bash(npm run test:*)",
      "Bash(npx vitest:*)",
      "Bash(npx tsc:*)",
      "Bash(npx tsx:*)",
      "Bash(node:*)",
      "Bash(ls:*)",
      "Bash(grep:*)",
      "Bash(wc:*)"
    ]
  }
}
```

### **Recommended Additional Permissions**

Add these for enhanced functionality:

```json
{
  "permissions": {
    "allow": [
      // ... existing permissions ...

      // Code quality
      "Bash(npm run lint:*)",
      "Bash(npm run format:*)",
      "Bash(npm run clean:*)",

      // Coverage
      "Bash(npm run test:coverage:*)",

      // Development
      "Bash(npm run dev:*)",
      "Bash(npm run watch:*)",

      // File operations
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(find:*)",

      // Git operations
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)"
    ]
  }
}
```

---

## 🚀 High-Performance Claude Workflows

### 1. **Context Window Optimization**

Claude has a **200K token context window**. Leverage it effectively:

**✅ DO: Front-load Context**

```markdown
Context for this session:

- Project: PCL compiler (TypeScript)
- Phase: 1.1 - Runtime engine implementation
- Files: Read src/parser/index.ts, src/semantic/index.ts, src/runtime/index.ts
- Standards: Follow .github/copilot-instructions.md patterns
- Goal: Implement workflow execution with error handling

Now implement WorkflowExecutor class.
```

**✅ DO: Reference Documentation**

```markdown
Before implementing, review:

1. grammar/pcl.ebnf (syntax specification)
2. docs/api/PARSER.md (parser patterns)
3. tests/integration.test.ts (test style)

Then proceed with implementation.
```

**❌ DON'T: Waste Context**

```markdown
"Can you help me with the parser?" // Too vague
"Do something with the code" // No context
```

### 2. **Parallel Operations**

Claude can read multiple files simultaneously:

```markdown
Read these files in parallel:

- src/ast/index.ts
- src/types/index.ts
- src/parser/index.ts
- src/semantic/index.ts
- src/codegen/index.ts

Analyze the architecture and identify the data flow.
```

### 3. **Iterative Refinement**

Claude excels at multi-turn conversations:

**Turn 1: Design**

```markdown
Design the LSP server architecture for PCL.
Reference: Language Server Protocol spec + current PCL architecture.
Output: Component diagram + interface definitions.
```

**Turn 2: Review**

```markdown
Review your design for:

- Separation of concerns
- TypeScript best practices (from copilot-instructions.md)
- Performance implications
- Testing strategy

Revise as needed.
```

**Turn 3: Implementation**

```markdown
Implement the TextDocumentManager component.
Use the revised design + existing patterns in src/.
Include comprehensive tests.
```

### 4. **Persona-Driven Development**

Activate PCL personas for specialized tasks:

**Architecture Work:**

```markdown
/persona ARCHI

Context: PCL compiler project (see .github/copilot-instructions.md)
Task: Design the type inference system for PCL

Requirements:

- Strong typing with TypeScript
- Support for generic types with constraints
- Type narrowing and flow analysis
- Branded types (PersonaId, TeamId, etc.)

Output:

1. Type system architecture diagram
2. Core type definitions (TypeScript interfaces)
3. Inference algorithm pseudocode
4. Implementation plan with phases

Reference: src/types/index.ts (current types)
```

**Security Review:**

```markdown
/persona SEC

Audit src/runtime/index.ts for security vulnerabilities:

- Code injection risks (eval, Function constructor)
- Untrusted input handling
- Sandbox escape vectors
- Resource exhaustion (infinite loops, memory leaks)
- Privilege escalation

Output:

1. Vulnerability assessment (severity ratings)
2. Proof-of-concept exploits (if applicable)
3. Remediation recommendations
4. Updated code with fixes
```

**Code Quality:**

```markdown
/persona CRITIC

Review the new parser changes against project standards:

Standards: .github/copilot-instructions.md
Files: src/parser/index.ts (changes in last commit)
Focus:

- Immutability (no AST mutations)
- Error handling (Result<T, E> pattern)
- Position tracking (all AST nodes)
- Type safety (no `any` types)
- Test coverage (≥80%)

Output: Actionable improvement list with priority levels
```

**Team Review:**

```markdown
/team dream-team

Comprehensive review of the new type system:

Context: Added generic types with constraints (see src/types/index.ts)
Review Areas:

- ARCHI: Architectural soundness, design patterns
- DEV: Code quality, maintainability, testing
- SEC: Security implications, validation
- CRITIC: Overall assessment, improvement opportunities

Output: Consensus report with:

- Strengths
- Weaknesses
- Action items (prioritized)
- Approval recommendation
```

---

## 🎯 Task Management with Claude

### **Multi-Step Projects**

Claude can track complex work using `manage_todo_list`:

**Step 1: Plan**

```markdown
Create a todo list for implementing LSP support:

1. Design server architecture
   - Protocol handlers
   - Document synchronization
   - Capability management

2. Implement core server
   - Connection handling
   - Message routing
   - Error handling

3. Add language features
   - Completion provider
   - Diagnostics
   - Hover information
   - Go to definition

4. Testing
   - Unit tests for each feature
   - Integration tests
   - Manual testing with VS Code

5. Documentation
   - API documentation
   - User guide
   - Configuration examples

Mark task 1 as in-progress.
```

**Step 2: Execute**

```markdown
I've completed task 1 (design).

Update todo:

- Mark task 1 as completed
- Mark task 2 as in-progress

Now implement the core server (task 2).
```

**Step 3: Track**

```markdown
Show current todo list status:

- ✅ Completed tasks
- 🟡 In progress
- ⏳ Not started
- Estimated completion: X% complete
```

---

## 💡 Code Generation Best Practices

### **1. Specify Patterns**

```markdown
Generate a parser for skill declarations:

Pattern: Follow src/parser/index.ts parsePersona() method
Grammar: See grammar/pcl.ebnf lines 85-120
Requirements:

- Immutable AST transformations
- Result<T, Error[]> return type
- Position tracking for all nodes
- Error recovery at statement boundaries
- Comprehensive error messages

Tests: Follow tests/integration.test.ts style
```

### **2. Incremental Implementation**

```markdown
Implement WorkflowExecutor in phases:

Phase 1: Basic structure

- Class definition with constructor
- Essential properties
- Type definitions
- No implementation yet

Show me Phase 1, I'll review before proceeding.
```

After review:

```markdown
Phase 1 approved. Continue with Phase 2:

Phase 2: Core execution logic

- execute() method
- Step traversal
- State management

Implement Phase 2.
```

### **3. Test-First Development**

```markdown
TDD approach for team composition:

Step 1: Write failing tests

- Test: compose two personas
- Test: handle invalid composition
- Test: resolve skill conflicts
- Test: validate constraints

Show me the tests first.
```

After tests:

```markdown
Tests look good. Now implement the code to make them pass.
Follow: src/types/index.ts patterns
Use: Immutable transformations
```

---

## 🔍 Debugging with Claude

### **Error Analysis**

```markdown
Debug this test failure:

Error:
```

TypeError: Cannot read property 'skills' of undefined
at PersonaBuilder.build (src/types/index.ts:45)
at test (tests/integration.test.ts:120)

```

Context:
- File: src/types/index.ts (PersonaBuilder class)
- Test: tests/integration.test.ts (line 120)
- Recent changes: Added validation to build() method

Steps:
1. Show me the relevant code sections
2. Analyze the root cause
3. Propose fix with explanation
4. Update tests if needed
```

### **Performance Profiling**

```markdown
Analyze performance of the parser:

Observation: Parsing large files (>10KB) is slow

Profile:

1. Identify bottlenecks (O(n²) operations?)
2. Check for repeated work (caching opportunities?)
3. Look for memory allocations (can we reuse?)

Files: src/parser/index.ts, src/lexer/index.ts

Propose optimizations with benchmarks.
```

---

## 📊 Quality Assurance

### **Pre-Commit Checklist**

````markdown
Run pre-commit quality checks:

1. Build check:
   ```bash
   npm run build
   ```
````

Must: Complete with 0 errors

2. Type check:

   ```bash
   npx tsc --noEmit
   ```

   Must: 0 TypeScript errors

3. Linting:

   ```bash
   npm run lint
   ```

   Must: 0 linting errors

4. Tests:

   ```bash
   npm run test
   ```

   Must: All tests pass

5. Coverage:
   ```bash
   npm run test:coverage
   ```
   Must: ≥80% coverage

Report: Pass/Fail for each + summary

````

### **Code Review Automation**

```markdown
Automated code review for PR #42:

Review against:
- .github/copilot-instructions.md (standards)
- PCL coding patterns (see src/)
- Test coverage requirements (80%)

Check:
✅ Immutability (no mutations)
✅ Error handling (Result types)
✅ Type safety (no `any`)
✅ Position tracking (AST nodes)
✅ Documentation (TSDoc comments)
✅ Tests (comprehensive coverage)

Output: Review report with:
- Compliance score
- Issues found (with severity)
- Suggested fixes
- Approval recommendation
````

---

## 🎨 Advanced Techniques

### **1. Multi-File Refactoring**

```markdown
Refactor: Extract common parsing logic to utilities

Context:

- Duplicate code in: src/parser/index.ts, src/semantic/index.ts
- Pattern: Error collection, position tracking

Steps:

1. Identify common patterns (show me analysis)
2. Design utility functions (interfaces + types)
3. Create src/utils/parser-helpers.ts
4. Update all files using multi_replace
5. Run tests to verify
6. Update imports

Execute step-by-step with confirmation after each.
```

### **2. Documentation Generation**

```markdown
Generate comprehensive API documentation:

Source: src/parser/index.ts

Output format: docs/api/PARSER.md

Include:

- Overview and architecture
- Class/interface documentation
- Method signatures with examples
- Error handling patterns
- Usage examples (code snippets)
- Integration points
- Performance considerations
- Testing guidelines

Style: Follow existing docs/api/ structure
```

### **3. Architectural Analysis**

```markdown
Analyze the compiler architecture:

Files (read in parallel):

- src/lexer/index.ts
- src/parser/index.ts
- src/semantic/index.ts
- src/codegen/index.ts
- src/runtime/index.ts

Analysis:

1. Data flow (source → output)
2. Dependency graph
3. Separation of concerns
4. Extensibility points
5. Performance bottlenecks
6. Technical debt

Output:

- Architecture diagram (Mermaid)
- Strengths/weaknesses
- Refactoring recommendations
- Migration plan (if needed)
```

---

## 🔥 Power User Tips

### **1. Batch Operations**

```markdown
Execute batch operations:

Tasks (in parallel):

1. Update QUICK-STATUS.md (metrics from test run)
2. Mark completed tasks in pcl_todo.md (Phase 1.1 items)
3. Add session summary to .roadmap/status/SESSION-SUMMARY.md
4. Update ROADMAP.md progress (Phase 1.1 → 100%)

Confirm all updates, then show git diff summary.
```

### **2. Intelligent Search**

```markdown
Find all occurrences of a pattern:

Pattern: Functions that mutate AST nodes
Search strategy:

- Grep for: push, splice, pop on objects
- Context: src/\*_/_.ts
- Exclude: tests/

Output:

- List of violations with file:line
- Code snippets
- Suggested immutable alternatives
```

### **3. Cross-Reference Analysis**

```markdown
Analyze dependencies:

Question: What code depends on PersonaDeclaration type?

Search:

- Import statements
- Type references
- Function parameters
- Return types

Files: src/\*_/_.ts

Output: Dependency tree with usage count
```

### **4. Automated Testing**

```markdown
Generate comprehensive tests:

Target: src/semantic/type-checker.ts (new file)

Test coverage:

- Happy path (valid types)
- Error cases (type mismatches)
- Edge cases (null, undefined, empty)
- Performance (large type hierarchies)

Style: tests/integration.test.ts patterns
Framework: Vitest
Coverage goal: 100%
```

---

## 📈 Performance Metrics

Track these for optimal Claude usage:

| Metric                  | Target            | How to Measure                   |
| ----------------------- | ----------------- | -------------------------------- |
| **Context Efficiency**  | <100K tokens/task | Monitor conversation length      |
| **Parallel Reads**      | 5-10 files        | Batch file operations            |
| **Multi-Replace Edits** | 3-5+ changes      | Use multi_replace_string_in_file |
| **Quality Gate Pass**   | 100%              | Run full check before commit     |
| **Test Coverage**       | ≥80%              | npm run test:coverage            |

---

## 🎯 Example Sessions

### **Session 1: Feature Implementation**

```markdown
Session Goal: Implement team declaration parsing

1. Planning:
   /persona ARCHI

   Design team parser architecture:
   - Grammar reference: grammar/pcl.ebnf
   - Existing patterns: src/parser/index.ts
   - Output: Design document

2. Implementation:
   /persona DEV

   Implement team parser:
   - Follow design from step 1
   - Use immutable patterns
   - Include error handling
   - Add position tracking

3. Testing:
   Generate comprehensive tests:
   - Happy path
   - Error cases
   - Edge cases
     Coverage: 100%

4. Review:
   /persona CRITIC

   Review against copilot-instructions.md standards

5. Quality Gate:
   Run: lint, typecheck, test, build
   Must: All pass

6. Documentation:
   Update docs/api/PARSER.md with new functionality
```

### **Session 2: Bug Fix**

```markdown
Session Goal: Fix parser memory leak

1. Analysis:
   Debug performance issue:
   - Symptom: Memory grows unbounded
   - File: src/parser/index.ts
   - Profiling: Show memory allocation patterns

2. Root Cause:
   Identify the leak:
   - Circular references?
   - Event listeners not removed?
   - Caching without limits?

3. Fix:
   Implement solution:
   - Code changes (use multi_replace)
   - Verification (memory profiling)
   - Tests (memory leak detection)

4. Regression Prevention:
   - Add memory leak test
   - Document fix in CHANGELOG.md
   - Update architecture docs
```

### **Session 3: Documentation Sprint**

```markdown
Session Goal: Complete API documentation

/persona TECH_WRITER

1. Audit existing docs:
   Files: docs/api/\*.md
   Compare: Actual implementation in src/
   Output: Gap analysis

2. Generate missing docs:
   Priority order:
   - Parser API (most used)
   - Semantic analyzer
   - Code generators
   - Runtime engine

3. Update guides:
   Files: docs/guides/\*.md
   Add: New features from Phase 1.1
   Style: Consistent with existing

4. Create examples:
   For each major feature:
   - Basic usage
   - Advanced patterns
   - Common pitfalls
   - Best practices

5. Review:
   Check all docs for:
   - Accuracy
   - Completeness
   - Clarity
   - Code examples work
```

---

## ⚠️ Common Pitfalls

### **1. Context Overflow**

**Problem**: Conversations get too long, Claude loses track

**Solution**:

```markdown
// Start new conversation
Session handoff:

Previous session summary:

- Completed: [list]
- In progress: [current task]
- Context files: [list]

Continue with [next task].
```

### **2. Vague Requests**

**Problem**: "Fix the parser" → Poor results

**Solution**:

```markdown
Fix parser issue:

Bug: Parser fails on nested team declarations
File: src/parser/index.ts (lines 200-250)
Test: tests/integration.test.ts (line 180 - failing)
Error: "Unexpected token '}'"

Expected: Parse nested teams correctly
Actual: Throws error on first nested '}'

Provide fix with explanation.
```

### **3. Missing Quality Checks**

**Problem**: Code generated but not tested

**Solution**:

```markdown
After implementation, always run:

Quality gate:

1. npm run build ✓
2. npx tsc --noEmit ✓
3. npm run lint ✓
4. npm run test ✓
5. npm run test:coverage ✓

Report: [Pass/Fail for each]
```

---

## 📚 Claude-Specific Commands

### **File Operations**

```bash
# Read file with context
cat src/parser/index.ts | head -50

# Search with grep
grep -r "PersonaDeclaration" src/

# Find files
find src/ -name "*.test.ts"

# Word count
wc -l src/**/*.ts
```

### **Git Operations**

```bash
# Status
git status

# Diff
git diff src/parser/index.ts

# Log
git log --oneline -10

# Branch info
git branch -vv
```

### **npm Scripts**

```bash
# Development
npm run dev
npm run build:watch

# Testing
npm test
npm run test:watch
npm run test:coverage

# Quality
npm run lint
npm run lint:fix
npm run format

# Build
npm run build
npm run clean
```

---

## 🎓 Learning Resources

### **Claude-Specific**

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Context Window Best Practices](https://www.anthropic.com/research)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)

### **PCL-Specific**

- [Copilot Instructions](.github/copilot-instructions.md) - Coding standards
- [Quick Reference](docs/COPILOT-QUICK-REFERENCE.md) - Command cheat sheet
- [VS Code Setup](docs/guides/VSCODE-SETUP.md) - IDE configuration
- [Roadmap](.roadmap/ROADMAP.md) - Project phases
- [Quick Status](.roadmap/QUICK-STATUS.md) - Current capabilities

---

## 🚀 Quick Start

### **New to Claude?**

1. **Read this document** (15 minutes)
2. **Try a simple task**:
   ```markdown
   Read src/parser/index.ts and explain the parser architecture.
   Include: main classes, methods, data flow.
   ```
3. **Use a persona**:
   ```markdown
   /persona DEV
   Implement a new utility function in src/utils/
   ```
4. **Run quality checks**:
   ```markdown
   Run: npm run build && npm test
   Report: results
   ```

### **Experienced Developer?**

1. **Start with context**:
   ```markdown
   Context: Phase 1.1, implementing [feature]
   Files: [relevant files]
   Goal: [specific objective]
   ```
2. **Use advanced workflows** (persona-driven, multi-step)
3. **Leverage parallel operations** (batch reads/writes)
4. **Maintain quality gates** (always test after changes)

---

## 📊 Success Metrics

| Metric                 | Good         | Excellent    |
| ---------------------- | ------------ | ------------ |
| Context efficiency     | <150K tokens | <100K tokens |
| Quality gate pass rate | 90%          | 100%         |
| Test coverage          | 80%          | 95%          |
| Code review score      | B+           | A            |
| Implementation time    | -30%         | -50%         |

---

**Remember**: Claude is most effective when given **clear context**, **specific goals**, and **quality constraints**. Front-load information, use personas strategically, and always verify with quality gates.

---

## 🤝 Collaboration Best Practices for PCL

### **1. How to Work Better with Claude**

#### **Be Specific About Scope**

```markdown
Good: "Add constraint validation to the semantic analyzer - check for circular
      dependencies in persona inheritance and validate limit constraints have
      proper units (ms, s, tokens, chars)"

Avoid: "Fix the semantic analyzer"
```

#### **Share Context Proactively**

```markdown
Context for this session:
- Working on: Phase 1.1D - Tutorial creation
- Recent changes: Added expression evaluator to workflows
- Goal: Create Tutorial 3 showcasing new workflow features
- Reference: examples/workflow-enhancements-example.mjs
```

#### **Tell Me What's Off-Limits**

```markdown
Constraints:
- Don't modify the parser - it's feature-complete
- Keep existing provider interface unchanged (breaking change)
- Follow immutability patterns from src/types/index.ts
- Maintain 100% test coverage
```

### **2. Strategic vs Tactical Planning**

**Understand the Difference:**

- **ROADMAP.md** - Strategic vision (years, phases, goals)
- **pcl_todo.md** - Tactical tracker (weeks, active work)
- **TodoWrite tool** - Session tasks (hours, current focus)

**When to Update:**

```markdown
Update ROADMAP.md: Phase completions, major milestones
Update pcl_todo.md: Weekly progress, deliverable status
Use TodoWrite: Active session work, multi-step tasks
```

### **3. Quality Gates**

**Before Asking for Review:**

```bash
npm run build    # Must pass
npm test         # Must pass (47/47)
npx tsc --noEmit # Zero TypeScript errors
```

**Tell Me Your Standards:**

```markdown
For this PR:
- Test coverage must stay at 100%
- No `any` types allowed
- All AST nodes must be immutable
- Follow existing error handling patterns (Result<T, E>)
```

### **4. Effective Task Requests**

#### **For Implementation**

```markdown
Feature: Add while loop support to workflows

Requirements:
- Syntax: while (condition) { steps }
- Use existing expression evaluator
- Add timeout protection (max 1000 iterations)
- Test with real workflow examples

Context:
- Expression evaluator: src/runtime/index.ts (ExpressionEvaluator class)
- Workflow executor: src/runtime/index.ts (executeWhile method exists)
- Example pattern: examples/workflow-enhancements-example.mjs

Deliverables:
1. Implementation in WorkflowExecutor
2. Unit tests (5+ cases)
3. Integration test with full workflow
4. Update docs/api/CODEGEN.md
```

#### **For Research/Exploration**

```markdown
Research: How are generic constraints currently handled?

Investigation areas:
1. Type definitions - src/types/index.ts (TypeVariable)
2. Parser - how are constraint expressions parsed?
3. Semantic analyzer - constraint validation logic
4. Test coverage - what constraint scenarios are tested?

Output needed:
- Summary of current implementation
- Limitations or gaps
- Recommendations for enhancement
```

#### **For Documentation**

```markdown
Create Tutorial 1: Your First Persona

Target audience: New PCL users
Format: Step-by-step guide with working code
Sections:
1. What is a persona? (2-3 paragraphs)
2. Basic persona syntax (code example)
3. Adding skills (code example)
4. Running with a provider (code example)
5. Next steps (link to Tutorial 2)

Reference examples:
- examples/provider-integration-example.mjs
- docs/guides/GETTING-STARTED.md

Output: docs/tutorials/01-YOUR-FIRST-PERSONA.md
```

### **5. Leverage My Strengths**

**I Excel At:**

- **Pattern Recognition**: "Find all places where we use Result<T, E> inconsistently"
- **Architecture Analysis**: "Review the provider abstraction for extensibility issues"
- **Code Generation**: "Generate 20 test cases for the expression evaluator"
- **Refactoring**: "Extract common parser utilities from duplicate code"
- **Documentation**: "Generate API docs from TSDoc comments in src/runtime/"

**Ask Me To:**

```markdown
Analyze the type system for:
- Inconsistencies in type checking logic
- Missing coverage in assignability rules
- Performance bottlenecks in type inference
- Opportunities for simplification

Output: Detailed report with code examples and recommendations
```

### **6. Communication Preferences**

**What Helps:**

- Point to specific files/lines: "Check [src/parser/index.ts:450](src/parser/index.ts#L450)"
- Share error messages: Full stack traces, compiler errors
- Explain the "why": "We need this for multi-provider support"
- Set priorities: "Focus on correctness over performance for now"

**What Doesn't Help:**

- Vague questions: "Is the code good?"
- No context: "Fix this" (without saying what's broken)
- Assumptions: "You know what I mean"

### **7. Iterative Collaboration**

**Phase 1: Explore**

```markdown
Explore the constraint validation system:
- Where are constraints defined? (AST types)
- How are they validated? (semantic analyzer)
- What validation currently exists?
- What's missing?
```

**Phase 2: Design**

```markdown
Based on exploration, design enhancements for:
- Pattern constraint validation (regex)
- Limit constraint unit checking
- Cross-field constraint validation

Show me the design before implementation.
```

**Phase 3: Implement**

```markdown
Design approved. Implement Phase 1:
- Pattern constraint validation
- Add regex compilation with error handling
- Test with 10+ patterns (valid and invalid)
```

**Phase 4: Review & Refine**

```markdown
Review the implementation:
- Does it follow immutability patterns?
- Is error handling comprehensive?
- Are edge cases covered?
- Performance acceptable?

Refine based on review.
```

### **8. Session Management**

**Start of Session:**

```markdown
Session context:
- Last session: Completed Phase 1.1C (workflow enhancements)
- Current focus: Tutorial creation (Phase 1.1D)
- Status: 3 of 6 tutorials remaining
- Today's goal: Complete Tutorial 3 (Workflows)

Begin with Tutorial 3 outline.
```

**End of Session:**

```markdown
Session summary:
- Completed: Tutorial 3 (Workflows)
- Updated: pcl_todo.md (marked Tutorial 3 complete)
- Next: Tutorial 4 (Building a Real Application)
- Blockers: None

Save this context for next session.
```

### **9. Git Workflow Preferences**

**Tell Me:**

- When to commit: "Commit after each tutorial is complete"
- Commit message style: "Use conventional commits (feat:, docs:, etc.)"
- Branch strategy: "Work on feature/tutorials branch"
- PR requirements: "Need approval before merging to main"

### **10. Testing Philosophy**

**Clarify Expectations:**

```markdown
Test requirements for new features:
- Unit tests: Test individual functions in isolation
- Integration tests: Test full compile pipeline
- Example tests: Verify working examples compile and run
- Coverage: Maintain 100% coverage for new code
- Style: Follow tests/integration.test.ts patterns
```

---

## 🎯 Quick Reference: Common Requests

### **Architecture & Design**

```markdown
"Design the [component] architecture following existing PCL patterns"
"Analyze [system] for extensibility issues"
"Propose refactoring for [code area] to improve [quality metric]"
```

### **Implementation**

```markdown
"Implement [feature] following [pattern reference]"
"Add [functionality] to [component] with [constraints]"
"Refactor [code] to use [pattern] instead of [anti-pattern]"
```

### **Testing**

```markdown
"Generate comprehensive tests for [component] covering [scenarios]"
"Add integration tests for [workflow] with [edge cases]"
"Verify test coverage for [feature] and add missing tests"
```

### **Documentation**

```markdown
"Document [API] with examples and best practices"
"Create tutorial for [topic] targeting [audience]"
"Update [guide] to include [new feature]"
```

### **Debugging**

```markdown
"Debug [issue] in [component] - [symptoms]"
"Analyze performance bottleneck in [code area]"
"Find all occurrences of [anti-pattern] and fix"
```

### **Code Review**

```markdown
"Review [PR/commit] against project standards"
"Audit [component] for [quality concern]"
"Check [code] for [specific issue type]"
```

---

## 📋 PCL-Specific Checklists

### **Adding a New Generator**

- [ ] Create generator class in src/codegen/index.ts
- [ ] Implement generate() method with GeneratorOptions
- [ ] Add provider-specific formatting if needed
- [ ] Handle all AST node types (persona, team, workflow)
- [ ] Include metadata and comment preservation
- [ ] Add comprehensive tests (10+ scenarios)
- [ ] Update docs/api/CODEGEN.md
- [ ] Add example to examples/

### **Adding a New Provider**

- [ ] Create provider class implementing Provider interface
- [ ] Add to ProviderRegistry in src/runtime/providers/index.ts
- [ ] Implement chat(), streamChat(), countTokens()
- [ ] Add provider-specific prompt formatting
- [ ] Handle rate limiting and errors gracefully
- [ ] Add tests with mock responses
- [ ] Document API key setup
- [ ] Add usage example

### **Adding a New Tutorial**

- [ ] Create docs/tutorials/NN-TOPIC.md
- [ ] Follow established tutorial format
- [ ] Include working code examples
- [ ] Test all code examples compile and run
- [ ] Add to tutorial index/README
- [ ] Link to next tutorial
- [ ] Update pcl_todo.md

### **Before Marking Phase Complete**

- [ ] All deliverables implemented and tested
- [ ] Documentation updated
- [ ] Examples working and tested
- [ ] Test coverage at target (100%)
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Update ROADMAP.md with completion date
- [ ] Update pcl_todo.md with status
- [ ] Create status document in .roadmap/status/

---

**Last Updated**: 2026-01-17
**Version**: 1.1
**Compatible with**: Claude Sonnet 4.5, Claude Code
