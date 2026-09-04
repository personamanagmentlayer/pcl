# Code Review Expert — Review Guidelines

Reference material for the `code-review-expert` skill. See [SKILL.md](../SKILL.md).

## Review Guidelines

### Provide Constructive Feedback

**Good feedback structure:**

```
**Issue**: [Clear description of the problem]
**Location**: [File and line number]
**Severity**: [Critical/High/Medium/Low]
**Suggestion**: [Specific, actionable recommendation]
**Example**: [Code example showing the improvement]
```

**Example:**

````
**Issue**: SQL injection vulnerability
**Location**: `api/users.js:42`
**Severity**: Critical
**Suggestion**: Use parameterized queries instead of string concatenation

**Current code:**
```javascript
const query = `SELECT * FROM users WHERE id = '${userId}'`;
````

**Recommended:**

```javascript
const query = 'SELECT * FROM users WHERE id = ?';
const results = await db.query(query, [userId]);
```

````

### Use the Right Tone

**❌ Don't:**
- "This code is terrible"
- "You don't understand how X works"
- "This is obviously wrong"

**✅ Do:**
- "Consider using X instead of Y because..."
- "Have you thought about the case where...?"
- "This works, but could be improved by..."

### Prioritize Issues

**Critical (Must fix before merge):**
- Security vulnerabilities
- Data corruption risks
- Breaking changes
- Test failures

**High (Should fix before merge):**
- Performance issues
- Incorrect business logic
- Poor error handling
- Missing tests for core functionality

**Medium (Nice to have):**
- Code duplication
- Minor optimization opportunities
- Inconsistent naming
- Missing documentation

**Low (Optional):**
- Code style preferences
- Minor refactoring suggestions
- Additional test cases

## Common Patterns to Review

### Pattern 1: Error Handling

**❌ Antipattern - Silent failures:**
```javascript
try {
  await processPayment(order);
} catch (error) {
  // Silently ignoring errors
}
````

**✅ Good pattern:**

```javascript
try {
  await processPayment(order);
} catch (error) {
  logger.error('Payment processing failed', {
    orderId: order.id,
    error: error.message,
    stack: error.stack,
  });
  throw new PaymentError('Failed to process payment', { cause: error });
}
```

### Pattern 2: Input Validation

**❌ Antipattern - Trusting user input:**

```python
def get_user(user_id):
    # No validation - SQL injection risk
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)
```

**✅ Good pattern:**

```python
def get_user(user_id: int) -> User:
    # Type validation and parameterized query
    if not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("Invalid user ID")

    query = "SELECT * FROM users WHERE id = ?"
    result = db.execute(query, (user_id,))

    if not result:
        raise UserNotFoundError(f"User {user_id} not found")

    return User.from_row(result[0])
```

### Pattern 3: Resource Management

**❌ Antipattern - Resource leaks:**

```python
def process_file(filename):
    file = open(filename, 'r')
    data = file.read()
    process(data)
    # File not closed - resource leak
```

**✅ Good pattern:**

```python
def process_file(filename: str) -> None:
    with open(filename, 'r') as file:
        data = file.read()
        process(data)
    # File automatically closed
```

### Pattern 4: Null/Undefined Handling

**❌ Antipattern - No null checks:**

```javascript
function getUserEmail(user) {
  return user.profile.email.toLowerCase();
  // Crashes if user, profile, or email is null/undefined
}
```

**✅ Good pattern:**

```javascript
function getUserEmail(user) {
  if (!user?.profile?.email) {
    throw new Error('User email not found');
  }
  return user.profile.email.toLowerCase();
}

// Or with TypeScript
function getUserEmail(user: User): string {
  const email = user.profile?.email;
  if (!email) {
    throw new Error('User email not found');
  }
  return email.toLowerCase();
}
```
