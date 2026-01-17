# PCL Language Reference

**Complete reference for the PCL (Persona Control Language) syntax and semantics.**

**Version:** 1.0.0
**Last Updated:** 2026-01-16

---

## Table of Contents

1. [Lexical Grammar](#lexical-grammar)
2. [Syntactic Grammar](#syntactic-grammar)
3. [Type System](#type-system)
4. [Declarations](#declarations)
5. [Expressions](#expressions)
6. [Lifecycle Hooks](#lifecycle-hooks)
7. [Keywords](#keywords)
8. [Operators](#operators)
9. [Comments](#comments)

---

## Lexical Grammar

### Keywords

Reserved words in PCL:

```
persona     team        workflow    skill
extends     if          else        while
for         in          return      import
export      from        as          true
false       null        let         const
function    type        interface   enum
```

### Identifiers

```ebnf
Identifier ::= [a-zA-Z_][a-zA-Z0-9_]*
```

**Examples:**

```pcl
Assistant
SecurityExpert
my_persona
persona123
_internal
```

**Restrictions:**

- Cannot start with a digit
- Cannot be a keyword
- Case-sensitive

### Literals

#### String Literals

```ebnf
StringLiteral ::= '"' StringChar* '"'
```

**Examples:**

```pcl
"Hello, world!"
"Multi-line strings\nare supported"
"Escape sequences: \" \\ \n \t"
```

**Escape sequences:**

- `\"` - Double quote
- `\\` - Backslash
- `\n` - Newline
- `\t` - Tab
- `\r` - Carriage return

#### Numeric Literals

```ebnf
IntLiteral   ::= [0-9]+
FloatLiteral ::= [0-9]+ '.' [0-9]+
```

**Examples:**

```pcl
42          // Integer
3.14        // Float
0           // Integer
100.0       // Float
```

#### Boolean Literals

```pcl
true
false
```

#### Null Literal

```pcl
null
```

### Operators

```
+ - * / %           // Arithmetic
== != < > <= >=     // Comparison
&& ||               // Logical
!                   // Unary not
=                   // Assignment
matches             // String matching
in                  // Membership
```

### Delimiters

```
{ }     // Blocks
( )     // Grouping, parameters
[ ]     // Arrays (future)
,       // Separator
;       // Statement terminator (optional)
:       // Type annotation
->      // Workflow arrow
```

### Comments

```pcl
// Single-line comment

/*
 * Multi-line comment
 */
```

---

## Syntactic Grammar

### Program Structure

```ebnf
Program ::= Statement*

Statement ::=
  | PersonaDeclaration
  | TeamDeclaration
  | WorkflowDeclaration
  | TypeDeclaration
  | FunctionDeclaration
  | VariableDeclaration
```

### Persona Declaration

#### Syntax

```ebnf
PersonaDeclaration ::=
  'persona' Identifier Extends? '{' PersonaMember* '}'

Extends ::= 'extends' TypeReference (',' TypeReference)*

PersonaMember ::=
  | Assignment
  | SkillBlock
  | ConstraintBlock
  | MethodDeclaration
```

#### Examples

**Basic persona:**

```pcl
persona Assistant {
  intent = "Help users with their tasks"
}
```

**With inheritance:**

```pcl
persona SecurityExpert extends Expert {
  intent = "Provide security analysis"
}
```

**Full example:**

```pcl
persona SecurityExpert extends Expert {
  // Assignments
  intent = "Security analysis and threat modeling"
  maxTokens = 4096
  temperature = 0.7

  // Skills block
  skills {
    "Threat modeling"
    "Vulnerability assessment"
    "Code review"
  }

  // Constraints block
  constraints {
    "Always assume breach"
    "Apply defense in depth"
    maxResponseTime <= 5
    temperature >= 0.0
  }
}
```

### Skill Block

```ebnf
SkillBlock ::= 'skills' '{' StringLiteral* '}'
```

**Example:**

```pcl
skills {
  "Threat modeling"
  "Vulnerability assessment"
  "Code review"
  "Security best practices"
}
```

### Constraint Block

```ebnf
ConstraintBlock ::= 'constraints' '{' Constraint* '}'

Constraint ::=
  | StringConstraint
  | ExprConstraint

StringConstraint ::= StringLiteral

ExprConstraint ::= Identifier ComparisonOp Expression
```

**Examples:**

```pcl
constraints {
  // String constraints
  "Always assume breach"
  "Apply least privilege"

  // Expression constraints
  maxTokens <= 8000
  maxTokens >= 1000
  temperature >= 0.0
  temperature <= 1.0
}
```

### Team Declaration

⚠️ **Note:** Parser support limited, full support coming.

```ebnf
TeamDeclaration ::=
  'team' Identifier '{' TeamMember* '}'

TeamMember ::=
  | 'members' '{' Identifier* '}'
  | 'primary' Identifier
  | 'quorum' IntLiteral
  | 'merge' Identifier
```

**Example:**

```pcl
team SecurityReview {
  members {
    SecurityExpert
    Auditor
    Architect
  }
  primary SecurityExpert
  quorum 2
  merge Consensus
}
```

### Workflow Declaration

⚠️ **Note:** Parser support limited, full support coming.

```ebnf
WorkflowDeclaration ::=
  'workflow' Identifier '{' WorkflowExpression* '}'

WorkflowExpression ::=
  | SequenceExpr
  | ParallelExpr
  | ChoiceExpr
  | ConditionalExpr
  | LoopExpr
  | MergeExpr
```

**Examples:**

```pcl
workflow CodeReview {
  // Sequential
  Developer -> Reviewer -> Approver

  // Parallel
  (SecurityReview || CodeReview || PerformanceReview)

  // With merge
  (Reviewer1 || Reviewer2) -> merge(Consensus)
}
```

### Type Declaration

```ebnf
TypeDeclaration ::=
  'type' Identifier TypeParameters? '=' Type
```

**Examples:**

```pcl
type UserId = String
type Result = Success | Error
type Container<T> = { value: T }
```

### Variable Declaration

```ebnf
VariableDeclaration ::=
  ('let' | 'const') Identifier (':' Type)? '=' Expression
```

**Examples:**

```pcl
let count = 10
const maxRetries = 3
let message: String = "Hello"
```

---

## Type System

### Primitive Types

```pcl
String      // Text
Int         // Integer numbers
Float       // Floating-point numbers
Bool        // true or false
Void        // No value
Never       // Unreachable
```

### Complex Types

#### Array Type

```ebnf
ArrayType ::= 'Array' '<' Type '>'
```

**Examples:**

```pcl
Array<String>
Array<Int>
Array<PersonaType>
```

#### Map Type

```ebnf
MapType ::= 'Map' '<' Type ',' Type '>'
```

**Examples:**

```pcl
Map<String, Int>
Map<String, PersonaType>
```

#### Union Type

```ebnf
UnionType ::= Type ('|' Type)+
```

**Examples:**

```pcl
String | Int
Success | Error | Pending
```

#### Function Type

```ebnf
FunctionType ::= '(' ParameterList? ')' '=>' Type

ParameterList ::= Parameter (',' Parameter)*
Parameter ::= Identifier ':' Type
```

**Examples:**

```pcl
(input: String) => String
(x: Int, y: Int) => Float
() => Void
```

### Type Annotations

Variables can have explicit type annotations:

```pcl
let name: String = "Alice"
let count: Int = 42
let score: Float = 98.5
let isEnabled: Bool = true
```

---

## Declarations

### Persona Declaration (Complete Reference)

```pcl
persona PersonaName [extends ParentName] {
  // Property assignments
  property1 = value1
  property2: Type = value2

  // Skills block
  skills {
    "Skill 1"
    "Skill 2"
  }

  // Constraints block
  constraints {
    "String constraint"
    field <= value
    field >= value
  }

  // Methods (limited parser support)
  method methodName(param: Type): ReturnType {
    // Method body
  }
}
```

**Required elements:**

- Persona name

**Optional elements:**

- Extends clause (inheritance)
- Property assignments
- Skills block
- Constraints block
- Methods

### Field Assignments

```pcl
// Simple assignment
intent = "Description"

// With type annotation
maxTokens: Int = 4096

// Expression
temperature = 0.5 + 0.2
```

---

## Expressions

### Primary Expressions

```pcl
// Identifiers
userName
maxRetries

// Literals
"Hello"
42
3.14
true
false
null

// Parenthesized
(expression)
```

### Binary Expressions

#### Arithmetic

```pcl
a + b       // Addition
a - b       // Subtraction
a * b       // Multiplication
a / b       // Division
a % b       // Modulo
```

#### Comparison

```pcl
a == b      // Equal
a != b      // Not equal
a < b       // Less than
a > b       // Greater than
a <= b      // Less than or equal
a >= b      // Greater than or equal
```

#### Logical

```pcl
a && b      // Logical AND
a || b      // Logical OR
```

#### Special

```pcl
str matches pattern     // String pattern matching
item in array          // Membership test
```

### Unary Expressions

```pcl
!condition     // Logical NOT
-value         // Negation
```

### Operator Precedence

From highest to lowest:

1. Primary expressions (identifiers, literals, parentheses)
2. Unary operators (`!`, `-`)
3. Multiplicative (`*`, `/`, `%`)
4. Additive (`+`, `-`)
5. Comparison (`<`, `>`, `<=`, `>=`)
6. Equality (`==`, `!=`)
7. Logical AND (`&&`)
8. Logical OR (`||`)
9. Assignment (`=`)

**Example:**

```pcl
a + b * c       // Evaluated as: a + (b * c)
a && b || c     // Evaluated as: (a && b) || c
!a && b         // Evaluated as: (!a) && b
```

---

## Keywords

### Reserved Keywords

The following identifiers are reserved and cannot be used as variable or type names:

```
// Declaration keywords
persona
team
workflow
skill
type
interface
enum

// Control flow
if
else
while
for
in
return
break
continue

// Modifiers
extends
implements
pub
private

// Values
true
false
null

// Variable declarations
let
const
var

// Import/Export
import
export
from
as

// Functions
function
fn

// Future reserved
async
await
match
case
when
```

---

## Operators

### Comparison Operators

| Operator  | Description      | Example              |
| --------- | ---------------- | -------------------- |
| `==`      | Equal            | `a == b`             |
| `!=`      | Not equal        | `a != b`             |
| `<`       | Less than        | `a < b`              |
| `>`       | Greater than     | `a > b`              |
| `<=`      | Less or equal    | `a <= b`             |
| `>=`      | Greater or equal | `a >= b`             |
| `matches` | Pattern match    | `str matches "\\d+"` |
| `in`      | Membership       | `item in array`      |

### Arithmetic Operators

| Operator | Description    | Example |
| -------- | -------------- | ------- |
| `+`      | Addition       | `a + b` |
| `-`      | Subtraction    | `a - b` |
| `*`      | Multiplication | `a * b` |
| `/`      | Division       | `a / b` |
| `%`      | Modulo         | `a % b` |

### Logical Operators

| Operator | Description | Example    |
| -------- | ----------- | ---------- |
| `&&`     | Logical AND | `a && b`   |
| `\|\|`   | Logical OR  | `a \|\| b` |
| `!`      | Logical NOT | `!a`       |

### Assignment Operator

| Operator | Description | Example  |
| -------- | ----------- | -------- |
| `=`      | Assignment  | `x = 10` |

---

## Comments

### Single-Line Comments

```pcl
// This is a single-line comment
persona Test { } // Comment after code
```

### Multi-Line Comments

```pcl
/*
 * This is a multi-line comment
 * spanning multiple lines
 */

persona Test {
  /*
   * Skills for this persona
   */
  skills {
    "Skill 1"
  }
}
```

---

## Examples

### Complete Persona Example

```pcl
// Security expert persona with full configuration
persona SecurityExpert extends Expert {
  // Basic properties
  intent = "Provide comprehensive security analysis"
  id = "SEC-001"
  version = "1.0.0"

  // Numeric configuration
  maxTokens: Int = 4096
  temperature: Float = 0.7
  topP: Float = 0.9

  // Skills
  skills {
    "Threat modeling (STRIDE, DREAD)"
    "Vulnerability assessment (OWASP Top 10)"
    "Security code review"
    "Penetration testing"
    "Compliance (SOC2, ISO 27001)"
  }

  // Constraints
  constraints {
    // Behavioral guidelines
    "Always assume breach"
    "Apply defense in depth"
    "Use principle of least privilege"
    "Provide actionable recommendations"

    // Numeric constraints
    maxTokens <= 8000
    maxTokens >= 1000
    temperature >= 0.0
    temperature <= 1.0
    topP >= 0.0
    topP <= 1.0
  }
}
```

### Multiple Personas with Inheritance

```pcl
// Base expert persona
persona Expert {
  skills {
    "Research"
    "Analysis"
    "Documentation"
  }

  constraints {
    "Provide evidence-based recommendations"
    "Cite sources"
  }
}

// Specialized security expert
persona SecurityExpert extends Expert {
  intent = "Security analysis"

  skills {
    "Threat modeling"
    "Vulnerability assessment"
  }

  constraints {
    "Always assume breach"
  }
}

// Specialized data expert
persona DataExpert extends Expert {
  intent = "Data analysis and insights"

  skills {
    "Statistical analysis"
    "Data visualization"
  }

  constraints {
    "Always cite data sources"
  }
}
```

### Expression Constraints

```pcl
persona RateLimitedAssistant {
  // Configuration
  maxRequests: Int = 100
  requestWindow: Int = 60  // seconds
  maxConcurrent: Int = 5

  constraints {
    // Rate limiting
    maxRequests >= 10
    maxRequests <= 1000
    requestWindow >= 1
    requestWindow <= 3600

    // Concurrency
    maxConcurrent >= 1
    maxConcurrent <= 10
  }
}
```

---

## Formal Grammar (EBNF)

### Complete EBNF

```ebnf
(* Program structure *)
Program            ::= Statement*

Statement          ::= PersonaDeclaration
                     | TeamDeclaration
                     | WorkflowDeclaration
                     | TypeDeclaration
                     | FunctionDeclaration
                     | VariableDeclaration

(* Persona *)
PersonaDeclaration ::= 'persona' Identifier Extends? '{' PersonaMember* '}'
Extends            ::= 'extends' TypeReference (',' TypeReference)*
PersonaMember      ::= Assignment
                     | SkillBlock
                     | ConstraintBlock
                     | MethodDeclaration

(* Skills *)
SkillBlock         ::= 'skills' '{' StringLiteral* '}'

(* Constraints *)
ConstraintBlock    ::= 'constraints' '{' Constraint* '}'
Constraint         ::= StringConstraint | ExprConstraint
StringConstraint   ::= StringLiteral
ExprConstraint     ::= Identifier ComparisonOp Expression

(* Expressions *)
Expression         ::= LogicalOrExpr
LogicalOrExpr      ::= LogicalAndExpr ('||' LogicalAndExpr)*
LogicalAndExpr     ::= EqualityExpr ('&&' EqualityExpr)*
EqualityExpr       ::= ComparisonExpr (('==' | '!=') ComparisonExpr)*
ComparisonExpr     ::= AdditiveExpr (('<' | '>' | '<=' | '>=') AdditiveExpr)*
AdditiveExpr       ::= MultiplicativeExpr (('+' | '-') MultiplicativeExpr)*
MultiplicativeExpr ::= UnaryExpr (('*' | '/' | '%') UnaryExpr)*
UnaryExpr          ::= ('!' | '-') UnaryExpr | PrimaryExpr
PrimaryExpr        ::= Identifier | Literal | '(' Expression ')'

(* Literals *)
Literal            ::= StringLiteral | IntLiteral | FloatLiteral
                     | BooleanLiteral | NullLiteral

StringLiteral      ::= '"' StringChar* '"'
IntLiteral         ::= [0-9]+
FloatLiteral       ::= [0-9]+ '.' [0-9]+
BooleanLiteral     ::= 'true' | 'false'
NullLiteral        ::= 'null'

(* Identifiers *)
Identifier         ::= [a-zA-Z_][a-zA-Z0-9_]*

(* Types *)
Type               ::= PrimitiveType | ArrayType | UnionType | Identifier
PrimitiveType      ::= 'String' | 'Int' | 'Float' | 'Bool' | 'Void'
ArrayType          ::= 'Array' '<' Type '>'
UnionType          ::= Type ('|' Type)+

(* Operators *)
ComparisonOp       ::= '==' | '!=' | '<' | '>' | '<=' | '>=' | 'matches' | 'in'
```

---

## Lifecycle Hooks

Lifecycle hooks let you execute code at specific points in a persona's, team's, or workflow's lifecycle. Hooks are defined using the `@hookName` decorator syntax.

### Hook Types

PCL provides 12 built-in lifecycle hooks:

| Hook            | Trigger                          | Use Case                             |
| --------------- | -------------------------------- | ------------------------------------ |
| `@onActivate`   | Persona/team becomes active      | Initialize resources, log activation |
| `@onDeactivate` | Persona/team becomes inactive    | Cleanup, save state                  |
| `@onError`      | Error occurs during execution    | Error handling, logging, alerts      |
| `@onMessage`    | New message received             | Message preprocessing, validation    |
| `@onStep`       | Workflow advances to next step   | Progress tracking, logging           |
| `@onComplete`   | Execution completes successfully | Finalization, notifications          |
| `@beforeMerge`  | Before merging multiple personas | Prepare state for merging            |
| `@afterMerge`   | After merging multiple personas  | Validate merged result               |
| `@onSpawn`      | New persona instance spawned     | Initialize child persona             |
| `@onDespawn`    | Persona instance terminated      | Cleanup child resources              |
| `@onTimeout`    | Operation times out              | Handle timeout gracefully            |
| `@onRetry`      | Retry attempt begins             | Log retry, adjust parameters         |

### Syntax

```ebnf
HookDeclaration ::= '@' HookName [ '(' Parameters ')' ] Block

HookName ::=
  | 'onActivate' | 'onDeactivate'
  | 'onError' | 'onMessage'
  | 'onStep' | 'onComplete'
  | 'beforeMerge' | 'afterMerge'
  | 'onSpawn' | 'onDespawn'
  | 'onTimeout' | 'onRetry'

Parameters ::= Parameter (',' Parameter)*
Parameter  ::= Identifier [ ':' Type ]
```

### Basic Examples

**Persona hooks:**

```pcl
persona SEC {
  intent: "Security analysis"

  @onActivate {
    log.info("Security analyst activated")
    metrics.increment("security.activations")
  }

  @onError(error) {
    log.error(`Security analysis failed: ${error.message}`)
    notify("security-team", error)
  }

  @onComplete(result) {
    log.info(`Analysis complete. Risk score: ${result.riskScore}`)
  }
}
```

**Team hooks:**

```pcl
team SecurityReview {
  members: [SEC, AUDIT, ARCHI]

  @onActivate {
    // Initialize shared resources
    createSharedWorkspace()
  }

  @beforeMerge(responses) {
    // Validate all responses before merging
    validateResponses(responses)
  }

  @onComplete(result) {
    if result.riskScore > 7 {
      alert("high-risk", result)
    }
  }
}
```

**Workflow hooks:**

```pcl
workflow CodeReview {
  steps: DEV -> (ARCHI || SEC) -> CRITIC

  @onStep(step) {
    log.debug(`Processing step: ${step.name}`)
    metrics.recordStep(step.name, step.duration)
  }

  @onTimeout {
    log.warn("Code review timed out")
    notifyReviewers("timeout")
  }

  @onError(error) {
    log.error(`Workflow failed: ${error}`)
    rollbackChanges()
  }

  @onComplete(result) {
    publishReviewResults(result)
    notifyAuthor(result)
  }
}
```

### Hook Parameters

Hooks can access context through parameters:

**Error context:**

```pcl
@onError(error) {
  log.error(error.message)
  log.error(error.stack)
  log.error(error.code)
}
```

**Message context:**

```pcl
@onMessage(message) {
  if message.priority == "urgent" {
    escalate(message)
  }
}
```

**Step context:**

```pcl
@onStep(step) {
  console.log(step.name)      // Step identifier
  console.log(step.status)    // "running", "complete", "failed"
  console.log(step.duration)  // Execution time
  console.log(step.result)    // Step output
}
```

**Result context:**

```pcl
@onComplete(result) {
  console.log(result.status)   // "success", "failed"
  console.log(result.output)   // Final output
  console.log(result.metadata) // Additional data
}
```

### Execution Order

Hooks execute in a predictable order:

**Persona lifecycle:**

```
1. @onActivate        ← Persona starts
2. @onMessage         ← Each message received
3. @onError           ← If error occurs (optional)
4. @onComplete        ← Execution finishes
5. @onDeactivate      ← Persona stops
```

**Team lifecycle:**

```
1. @onActivate        ← Team starts
2. @beforeMerge       ← Before combining responses
3. @afterMerge        ← After combining responses
4. @onComplete        ← Team finishes
5. @onDeactivate      ← Team stops
```

**Workflow lifecycle:**

```
1. @onActivate        ← Workflow starts
2. @onStep            ← Each step execution
3. @onTimeout         ← If timeout occurs (optional)
4. @onRetry           ← If retry needed (optional)
5. @onError           ← If error occurs (optional)
6. @onComplete        ← Workflow finishes
7. @onDeactivate      ← Workflow stops
```

**Nested execution:**

```
Team @onActivate
  ├─> Persona A @onActivate
  ├─> Persona B @onActivate
  ├─> Persona A @onMessage
  ├─> Persona B @onMessage
  ├─> Team @beforeMerge
  ├─> Team @afterMerge
  ├─> Persona A @onDeactivate
  ├─> Persona B @onDeactivate
  └─> Team @onDeactivate
```

### Best Practices

**1. Keep hooks focused and fast**

```pcl
// ✅ GOOD: Quick operation
@onActivate {
  log.info("Activated")
  metrics.increment("activations")
}

// ❌ BAD: Slow operation blocks activation
@onActivate {
  loadLargeDatabase()  // Too slow!
  trainModel()         // Too slow!
}
```

**2. Handle errors in hooks**

```pcl
// ✅ GOOD: Graceful error handling
@onComplete(result) {
  try {
    saveToDatabase(result)
  } catch (error) {
    log.error("Failed to save:", error)
    // Don't fail the entire operation
  }
}

// ❌ BAD: Unhandled errors
@onComplete(result) {
  saveToDatabase(result)  // Throws on failure!
}
```

**3. Use appropriate hooks**

```pcl
// ✅ GOOD: Right hook for the job
@onActivate {
  initializeResources()
}

@onDeactivate {
  cleanupResources()
}

// ❌ BAD: Wrong hook
@onComplete {
  initializeResources()  // Too late!
}
```

**4. Don't modify state unexpectedly**

```pcl
// ✅ GOOD: Read-only observation
@onStep(step) {
  log.info(step.name)
  metrics.record(step)
}

// ❌ BAD: Modifying workflow state
@onStep(step) {
  step.status = "skipped"  // Don't do this!
}
```

**5. Use hooks for cross-cutting concerns**

```pcl
persona DataAnalyst {
  // Logging
  @onActivate { log.info("Started") }
  @onComplete { log.info("Finished") }

  // Metrics
  @onStep(step) { metrics.record(step) }

  // Error tracking
  @onError(error) { errorTracker.report(error) }

  // Business logic stays in methods
  pub fn analyze(data: Data) -> Report {
    // Core logic here
  }
}
```

### Advanced Examples

**Rate limiting:**

```pcl
persona APIConsumer {
  @onMessage(message) {
    if rateLimiter.isExceeded() {
      throw RateLimitError("Too many requests")
    }
    rateLimiter.increment()
  }

  @onComplete {
    rateLimiter.reset()
  }
}
```

**Distributed tracing:**

```pcl
workflow DataPipeline {
  @onActivate {
    span = tracer.startSpan("data-pipeline")
  }

  @onStep(step) {
    span.addEvent(step.name)
  }

  @onError(error) {
    span.recordError(error)
  }

  @onComplete(result) {
    span.setStatus("success")
    span.end()
  }
}
```

**Resource pooling:**

```pcl
team DatabaseTeam {
  @onActivate {
    pool = createConnectionPool({
      min: 2,
      max: 10,
      timeout: 30s
    })
  }

  @beforeMerge {
    // Ensure all connections are returned
    pool.waitForConnections()
  }

  @onDeactivate {
    pool.drain()
    pool.close()
  }
}
```

**Circuit breaker:**

```pcl
persona ExternalService {
  @onError(error) {
    circuitBreaker.recordFailure()

    if circuitBreaker.isOpen() {
      throw CircuitOpenError("Service unavailable")
    }
  }

  @onComplete {
    circuitBreaker.recordSuccess()
  }

  @onTimeout {
    circuitBreaker.recordTimeout()
  }
}
```

**Audit logging:**

```pcl
persona SecureOperator {
  @onActivate {
    audit.log({
      event: "activation",
      user: currentUser,
      timestamp: now()
    })
  }

  @onMessage(message) {
    audit.log({
      event: "message",
      content: sanitize(message),
      timestamp: now()
    })
  }

  @onComplete(result) {
    audit.log({
      event: "completion",
      result: sanitize(result),
      timestamp: now()
    })
  }
}
```

### Testing Hooks

Hooks can be tested by triggering lifecycle events:

```typescript
import { test, expect } from 'vitest';
import { createPersona } from '@pcl/runtime';

test('onActivate hook executes', async () => {
  let activated = false;

  const persona = createPersona({
    name: 'TEST',
    hooks: {
      onActivate: () => {
        activated = true;
      },
    },
  });

  await persona.activate();
  expect(activated).toBe(true);
});

test('onError hook handles failures', async () => {
  let errorCaught = null;

  const persona = createPersona({
    name: 'TEST',
    hooks: {
      onError: (error) => {
        errorCaught = error;
      },
    },
  });

  await persona.execute(() => {
    throw new Error('Test error');
  });

  expect(errorCaught).toBeTruthy();
  expect(errorCaught.message).toBe('Test error');
});
```

---

## See Also

- [Parser API](../api/PARSER.md)
- [Semantic Analyzer API](../api/SEMANTIC.md)
- [Type System Reference](./TYPE-SYSTEM.md)
- [Getting Started Guide](../guides/GETTING-STARTED.md)

---

**Last Updated:** 2026-01-17
**Version:** 1.0.0
**Status:** Production-ready with documented limitations
