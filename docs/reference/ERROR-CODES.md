# PCL Error Code Reference

This document provides a comprehensive reference for all error and warning codes in the PCL (Persona Control Language) compiler.

## Table of Contents

- [Parse Errors (E_PARSE_*)](#parse-errors)
- [Type Errors (E_TYPE_*)](#type-errors)
- [Semantic Errors (E_SEMANTIC_*)](#semantic-errors)
- [Runtime Errors (E_RUNTIME_*)](#runtime-errors)
- [Workflow Errors (E_WORKFLOW_*)](#workflow-errors)
- [Validation Errors (E_VALIDATION_*)](#validation-errors)

---

## Parse Errors

Parse errors occur during the lexical analysis and syntax parsing phase.

### E_PARSE_001: Unexpected Token

**Severity**: Error

**Description**: The parser encountered a token that was not expected at this position.

**Example**:
```pcl
persona Alice {
  intent: "Developer"
  @ // Unexpected token
}
```

**Quick Fix**: Check the syntax and ensure all tokens are valid PCL keywords or identifiers.

---

### E_PARSE_002: Unexpected End of File

**Severity**: Error

**Description**: The parser reached the end of the file while expecting more input.

**Example**:
```pcl
persona Alice {
  intent: "Developer"
// Missing closing brace
```

**Quick Fix**: Ensure all opening braces `{`, brackets `[`, and parentheses `(` have matching closing symbols.

---

### E_PARSE_003: Invalid Syntax

**Severity**: Error

**Description**: The syntax does not conform to PCL grammar rules.

**Example**:
```pcl
team MyTeam
  members: [Alice, Bob] // Missing opening brace
}
```

**Quick Fix**: Review the PCL grammar for the correct syntax of the declaration.

---

## Type Errors

Type errors occur when type checking fails during semantic analysis.

### E_TYPE_001: Type Mismatch

**Severity**: Error

**Description**: An expression's type does not match the expected type.

**Example**:
```pcl
const x: number = "hello"; // Type mismatch: string assigned to number
```

**Quick Fix**: Ensure the assigned value matches the declared type, or update the type annotation.

---

### E_TYPE_002: Unknown Type

**Severity**: Error

**Description**: A referenced type or symbol is not defined in the current scope.

**Example**:
```pcl
team MyTeam {
  members: [Alice] // Alice is not defined
}
```

**Quick Fix**: Define the persona or team before referencing it, or check for typos.

---

## Semantic Errors

Semantic errors are validation errors detected during semantic analysis (Phase 1.0).

### E_SEMANTIC_001: Duplicate Team Member

**Severity**: Error

**Description**: A team member appears multiple times in the members list.

**Example**:
```pcl
persona Alice { intent: "Developer" }
persona Bob { intent: "Reviewer" }

team MyTeam {
  members: [Alice, Bob, Alice] // Alice appears twice
}
```

**Rich Error Message**:
```
Duplicate team member 'Alice'

  team.pcl:5:25

   |
5 |   members: [Alice, Bob, Alice]
  |                         ^

Suggestion: Remove the duplicate occurrence of 'Alice' from the members list
```

**Quick Fix**: Remove the duplicate member from the list.

---

### E_SEMANTIC_002: Invalid Primary Persona

**Severity**: Error

**Description**: The primary persona is not a member of the team.

**Example**:
```pcl
persona Alice { intent: "Developer" }
persona Bob { intent: "Reviewer" }
persona Charlie { intent: "Manager" }

team MyTeam {
  members: [Alice, Bob]
  primary: Charlie // Charlie is not in members
}
```

**Rich Error Message**:
```
Primary persona Charlie is not a team member

  team.pcl:7:12

   |
7 |   primary: Charlie
  |            ^

Suggestion: Add 'Charlie' to the members list, or choose from available members: Alice, Bob
```

**Quick Fix**: Either add the persona to the members list or choose a different primary from existing members.

---

### E_SEMANTIC_003: Invalid Quorum

**Severity**: Error

**Description**: The quorum configuration is invalid (exceeds member count or required > total).

**Example**:
```pcl
persona A { intent: "Test" }
persona B { intent: "Test" }

team T {
  members: [A, B]
  quorum: 3/3 // Quorum 3 exceeds member count 2
}
```

**Rich Error Message**:
```
Quorum 3/3 exceeds member count 2

  team.pcl:5:1

  |
5 | team T {
  | ^

Suggestion: Change quorum to at most 2/3, or add more team members
```

**Quick Fix**: Adjust the quorum to not exceed the actual member count, or add more members to the team.

---

### E_SEMANTIC_004: Circular Team Reference

**Severity**: Error

**Description**: A circular dependency was detected in team composition (team-in-team cycles).

**Example**:
```pcl
team TeamA {
  members: [TeamB]
}

team TeamB {
  members: [TeamA] // Circular reference: A → B → A
}
```

**Quick Fix**: Restructure team composition to avoid circular dependencies.

---

### E_SEMANTIC_005: Unreachable Code

**Severity**: Warning

**Description**: Code that will never execute due to constant conditions.

**Example**:
```pcl
persona A { intent: "Test" }
persona B { intent: "Test" }

workflow TestWorkflow {
  steps: if (true) then A else B // B is unreachable
}
```

**Rich Error Message**:
```
Unreachable code: else branch will never execute because condition is always true

  workflow.pcl:5:32

  |
5 |   steps: if (true) then A else B
  |                                ^

Suggestion: Remove the else branch or change the condition to a dynamic expression
```

**Quick Fix**: Remove the unreachable code or use a dynamic condition that can evaluate to different values.

---

### E_SEMANTIC_006: Infinite Loop

**Severity**: Warning

**Description**: A loop with a constant condition that will never terminate.

**Example**:
```pcl
persona A { intent: "Test" }

workflow TestWorkflow {
  steps: loop while (true) { A } // Infinite loop
}
```

**Rich Error Message**:
```
Potential infinite loop: while condition is always true

  workflow.pcl:4:10

  |
4 |   steps: loop while (true) { A }
  |          ^

Suggestion: Use a dynamic condition that can become false, or use 'loop N times' for bounded iteration
```

**Quick Fix**: Use a dynamic condition that can change, or replace with a bounded loop.

---

### E_SEMANTIC_007: Type Mismatch (Semantic)

**Severity**: Error

**Description**: Type mismatch detected during semantic analysis (e.g., non-persona in team members).

**Example**:
```pcl
type MyType = { value: string }

team T {
  members: [MyType] // MyType is a type, not a persona
}
```

**Quick Fix**: Only use personas and teams as team members.

---

### E_SEMANTIC_008: Too Many Parallel Branches

**Severity**: Warning

**Description**: A workflow has more than 10 parallel branches, which may impact maintainability.

**Example**:
```pcl
persona P1 { intent: "Test" }
// ... P2 through P11 ...

workflow TestWorkflow {
  steps: P1 || P2 || P3 || P4 || P5 || P6 || P7 || P8 || P9 || P10 || P11
}
```

**Rich Error Message**:
```
Too many parallel branches (11). Consider refactoring for maintainability.

  workflow.pcl:5:10

   |
5 |   steps: P1 || P2 || P3 || P4 || P5 || P6 || P7 || P8 || P9 || P10 || P11
   |          ^

Suggestion: Split into smaller sub-workflows or use sequential processing with -> operator
```

**Quick Fix**: Refactor into smaller sub-workflows or use sequential execution where appropriate.

---

### E_SEMANTIC_009: Invalid Conflict Order

**Severity**: Error/Warning

**Description**: The conflict resolution order is incomplete or includes non-members.

**Example (Incomplete)**:
```pcl
persona A { intent: "Test" }
persona B { intent: "Test" }
persona C { intent: "Test" }

team T {
  members: [A, B, C]
  conflict: A > B // C is missing
}
```

**Rich Error Message**:
```
Members not in conflict resolution order: C

  team.pcl:7:3

  |
7 |   conflict: A > B
  |   ^

Suggestion: Add all members to conflict order, e.g.: conflict: A > B > C
```

**Example (Non-member)**:
```pcl
persona A { intent: "Test" }
persona B { intent: "Test" }
persona C { intent: "Test" }

team T {
  members: [A, B]
  conflict: A > B > C // C is not a member
}
```

**Rich Error Message**:
```
Conflict resolution order includes non-members: C

  team.pcl:7:3

  |
7 |   conflict: A > B > C
  |   ^

Suggestion: Remove C from conflict order, or add them to the members list
```

**Quick Fix**: Ensure all members are in the conflict order, and all personas in the conflict order are members.

---

## Runtime Errors

Runtime errors occur during program execution.

### E_RUNTIME_001: Persona Not Found

**Severity**: Error

**Description**: Attempted to activate a persona that doesn't exist in the runtime.

**Quick Fix**: Ensure the persona is defined and loaded before attempting to activate it.

---

### E_RUNTIME_002: Team Not Found

**Severity**: Error

**Description**: Attempted to activate a team that doesn't exist in the runtime.

**Quick Fix**: Ensure the team is defined and loaded before attempting to activate it.

---

## Workflow Errors

Workflow errors occur during workflow execution.

### E_WORKFLOW_001: Workflow Timeout

**Severity**: Error

**Description**: A workflow execution exceeded its timeout limit.

**Quick Fix**: Increase the timeout value or optimize the workflow steps.

---

### E_WORKFLOW_002: Workflow Cancelled

**Severity**: Error

**Description**: A workflow execution was cancelled by the user or system.

**Quick Fix**: This is informational; no action required unless unexpected.

---

## Validation Errors

General validation errors.

### E_VALIDATION_001: Required Field Missing

**Severity**: Error

**Description**: A required field is missing from a declaration.

**Example**:
```pcl
persona Alice {
  // Missing required 'intent' field
}
```

**Quick Fix**: Add the required field to the declaration.

---

## Best Practices

1. **Read the Full Error Message**: PCL provides rich error messages with code snippets and suggestions. Always read the complete error message for context.

2. **Follow Suggestions**: Quick-fix suggestions are designed to help you resolve common errors quickly.

3. **Check Line and Column Numbers**: Error messages include precise locations to help you find the issue.

4. **Validate Incrementally**: Run `pcl check` frequently during development to catch errors early.

5. **Use Strict Mode**: Enable strict mode for more rigorous type checking and validation.

---

## Error Reporting

If you encounter an error that:
- Has an unclear message
- Lacks a helpful suggestion
- Points to the wrong location
- Is incorrectly classified

Please report it at: https://github.com/pcl-lang/pcl/issues

Include:
- The error code
- The PCL source code that triggered the error
- The full error message
- Your expected behavior

---

## Version Information

This error code reference is for PCL version **1.0.0-alpha**.

Error codes are stable and will not change their meaning in patch or minor version updates. New error codes may be added in minor versions.
