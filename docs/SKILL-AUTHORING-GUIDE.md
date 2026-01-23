# PCL Skill Authoring Guide

**Version**: 1.0
**Last Updated**: 2026-01-22
**Audience**: Skill Developers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Skill Anatomy](#skill-anatomy)
3. [Writing Effective Instructions](#writing-effective-instructions)
4. [Best Practices](#best-practices)
5. [Token Optimization](#token-optimization)
6. [Examples & Testing](#examples--testing)
7. [Common Pitfalls](#common-pitfalls)
8. [Quality Checklist](#quality-checklist)

---

## Introduction

Skills are reusable instruction blocks that teach Claude specific capabilities. Well-written skills can dramatically improve AI performance on specialized tasks.

### What Makes a Great Skill?

- **Clear Purpose**: Solves a specific problem well
- **Concise Instructions**: Gets to the point quickly
- **Good Examples**: Shows concrete usage patterns
- **Proper Scoping**: Neither too broad nor too narrow
- **Well-Tested**: Examples work and demonstrate key concepts

---

## Skill Anatomy

### Skill Structure

```markdown
---
name: skill-name
description: Brief description of what this skill does
category: language|framework|devops|domain|data|security|qa|api|cloud|ai|professional|scientific|tools|design
complexity: beginner|intermediate|advanced|expert
allowed-tools:
  - Read
  - Write
  - Bash
version: 1.0.0
user-invocable: true
dependencies:
  - other-skill-name
---

# Skill Name

## Overview

Brief introduction to the skill and its purpose.

## Core Concepts

Key concepts the AI needs to understand.

## Instructions

Detailed step-by-step instructions.

## Examples

### Example 1: Basic Usage

**Description**: What this example demonstrates

\`\`\`python
# Example code here
\`\`\`

### Example 2: Advanced Usage

**Description**: More complex scenario

\`\`\`python
# Advanced example
\`\`\`

## Common Patterns

Frequently used patterns for this skill.

## Anti-Patterns

What to avoid when using this skill.

## Resources

Additional references and documentation.
```

---

## Writing Effective Instructions

### 1. Start with Context

❌ **Bad**:
```markdown
Use type hints for function parameters and return types.
```

✅ **Good**:
```markdown
## Python Type Hints

Type hints improve code readability and enable static type checking. Always use type hints for function signatures to make code intent explicit and catch type errors early.

### When to Use Type Hints:
- All public function signatures
- Class attributes
- Function return types
- Complex data structures
```

### 2. Use Progressive Disclosure

Structure information from general to specific:

```markdown
## Core Concept (High-level)
Brief overview of the concept

### Detailed Explanation (Mid-level)
More specific details with context

#### Implementation Details (Low-level)
Specific code patterns and edge cases
```

### 3. Be Specific, Not Verbose

❌ **Bad** (Verbose):
```markdown
When you are writing code in Python, it is very important that you remember to always include docstrings for all of your functions and classes because they help other developers understand what your code does and how to use it, which is especially important in large codebases where multiple people are working together.
```

✅ **Good** (Concise):
```markdown
## Documentation Standards

Write docstrings for all functions and classes using Google style:

\`\`\`python
def calculate_total(items: list[float], tax_rate: float = 0.1) -> float:
    """Calculate total with tax.

    Args:
        items: List of item prices
        tax_rate: Tax rate as decimal (default: 0.1)

    Returns:
        Total price including tax
    """
\`\`\`
```

### 4. Use Actionable Imperatives

Start instructions with action verbs:

✅ **Good**:
- "Write type hints for all function parameters"
- "Validate user input before processing"
- "Handle errors with try-except blocks"
- "Test edge cases thoroughly"

❌ **Bad**:
- "It would be good to have type hints"
- "You should probably validate input"
- "Errors might need handling"
- "Testing is important"

### 5. Include Context Cues

Help the AI understand when to apply instructions:

```markdown
## When to Use This Pattern

✅ **Use when**:
- Building REST APIs
- Handling multiple data sources
- Performance is critical

❌ **Avoid when**:
- Simple CRUD operations
- Prototyping
- Learning basics
```

---

## Best Practices

### 1. Name Skills Descriptively

✅ **Good Names**:
- `python-testing-pytest`
- `react-hooks-patterns`
- `api-error-handling`
- `sql-query-optimization`

❌ **Bad Names**:
- `skill1`
- `helper`
- `utils`
- `misc`

### 2. Keep Skills Focused

**One skill, one responsibility:**

✅ **Good** (Focused):
- `python-testing-pytest` - Testing with pytest
- `python-testing-unittest` - Testing with unittest
- `python-testing-mocking` - Mocking in tests

❌ **Bad** (Too Broad):
- `python-everything` - All Python concepts
- `testing` - All testing approaches

### 3. Use Consistent Formatting

```markdown
## Section Headers Use ##

### Subsections Use ###

**Bold** for emphasis

`code` for inline code

\`\`\`language
// Code blocks with language
\`\`\`

- Bullet points for lists
- Second point

1. Numbered steps when order matters
2. Second step
```

### 4. Categorize Properly

Choose the most specific category:

- **language**: Programming language expertise (Python, JavaScript, etc.)
- **framework**: Framework-specific skills (React, Django, etc.)
- **devops**: Infrastructure, deployment, CI/CD
- **domain**: Domain-specific knowledge (finance, healthcare, etc.)
- **data**: Data analysis, processing, visualization
- **security**: Security, authentication, encryption
- **qa**: Testing, quality assurance
- **api**: API design, integration
- **cloud**: Cloud platforms (AWS, Azure, GCP)
- **ai**: Machine learning, AI models
- **professional**: Soft skills, communication
- **scientific**: Scientific computing
- **tools**: Development tools
- **design**: UI/UX, design patterns

### 5. Set Appropriate Complexity

- **beginner**: Basic concepts, simple patterns
- **intermediate**: Standard practices, common scenarios
- **advanced**: Complex patterns, optimization
- **expert**: Deep expertise, edge cases, performance tuning

---

## Token Optimization

### Why Token Count Matters

- Skills are included in every AI conversation
- Lower token count = faster responses, lower cost
- Target: **< 2000 tokens** (warning at 2000, error at 4000)

### Optimization Techniques

#### 1. Remove Redundancy

❌ **Before** (Redundant):
```markdown
## Overview
This skill teaches Python testing with pytest.

## Introduction
In this skill, we will learn about pytest for Python testing.

## What is pytest?
pytest is a Python testing framework that makes it easy to write tests.
```

✅ **After** (Concise):
```markdown
## pytest Testing

pytest is a powerful Python testing framework focused on simplicity and scalability.
```

#### 2. Use Bullet Points Over Paragraphs

❌ **Before** (Verbose):
```markdown
When writing tests, you should always use descriptive names that clearly explain what the test is checking. You should also make sure to test edge cases and not just the happy path. Additionally, it's important to keep tests independent and isolated from each other.
```

✅ **After** (Concise):
```markdown
**Test Best Practices**:
- Use descriptive test names
- Cover edge cases, not just happy paths
- Keep tests independent and isolated
```

#### 3. Combine Similar Sections

Instead of separate "Common Patterns" and "Best Practices" sections, combine into one "Patterns & Practices" section.

#### 4. Focus Instructions

Remove obvious or general advice:

❌ **Remove**:
- "Write clean code"
- "Use good variable names"
- "Comment your code"

✅ **Keep**:
- Specific patterns for this skill
- Non-obvious best practices
- Domain-specific rules

#### 5. Limit Examples

- **2-3 examples**: Good coverage
- **5-7 examples**: Maximum recommended
- **10+ examples**: Too many, split skill

### Use the Optimizer

```bash
# Check token count
pcl skill compile my-skill.md

# Optimize automatically
pcl skill optimize my-skill.md

# Aggressive optimization
pcl skill optimize my-skill.md --aggressive
```

---

## Examples & Testing

### Writing Good Examples

#### 1. Show Concrete Usage

❌ **Bad** (Too Abstract):
```python
# Example
def function():
    pass
```

✅ **Good** (Concrete):
```python
# Calculate order total with tax
def calculate_total(items: list[float], tax_rate: float = 0.1) -> float:
    """Calculate total price including tax."""
    subtotal = sum(items)
    tax = subtotal * tax_rate
    return subtotal + tax

# Usage
items = [10.99, 25.50, 5.99]
total = calculate_total(items, tax_rate=0.08)
print(f"Total: ${total:.2f}")  # Total: $45.93
```

#### 2. Include Expected Output

```python
# Example: String manipulation
text = "hello world"
result = text.title()
print(result)  # Output: "Hello World"
```

#### 3. Cover Common Use Cases

**Good Example Coverage**:
1. **Basic usage**: Simplest case
2. **Common scenario**: Typical real-world usage
3. **Edge case**: Handling special situations

#### 4. Keep Examples Focused

Each example should demonstrate **one concept**:

✅ **Good**:
```python
# Example 1: Basic type hints
def greet(name: str) -> str:
    return f"Hello, {name}!"

# Example 2: Complex type hints
def process_data(
    items: list[dict[str, Any]],
    filters: Optional[list[str]] = None
) -> tuple[list[dict], int]:
    """Process items with optional filters."""
    # Implementation...
```

❌ **Bad** (Too much):
```python
# Example 1: Everything at once
def complex_function(a, b, c, d, e):
    # 50 lines of unrelated concepts
```

### Testing Examples

```bash
# Test all examples
pcl skill test my-skill.md

# Test specific example
pcl skill test my-skill.md --example 2

# Verbose output
pcl skill test my-skill.md --verbose
```

---

## Common Pitfalls

### 1. ❌ Too Generic

**Problem**: Skill tries to cover everything
```markdown
---
name: python-everything
---
# Everything Python
```

**Solution**: Focus on specific area
```markdown
---
name: python-async-patterns
---
# Python Async Patterns
```

### 2. ❌ Incomplete Instructions

**Problem**: Missing critical steps
```markdown
## API Integration
Call the API endpoint.
```

**Solution**: Provide complete guidance
```markdown
## API Integration

1. **Install dependencies**:
   \`\`\`bash
   pip install requests
   \`\`\`

2. **Set up authentication**:
   \`\`\`python
   headers = {"Authorization": f"Bearer {api_key}"}
   \`\`\`

3. **Make the request**:
   \`\`\`python
   response = requests.get(url, headers=headers)
   response.raise_for_status()
   data = response.json()
   \`\`\`

4. **Handle errors**:
   \`\`\`python
   try:
       response = requests.get(url, headers=headers, timeout=10)
   except requests.exceptions.Timeout:
       logger.error("Request timed out")
   except requests.exceptions.RequestException as e:
       logger.error(f"Request failed: {e}")
   \`\`\`
```

### 3. ❌ No Examples

**Problem**: Instructions without concrete examples
**Solution**: Always include 2-3 working examples

### 4. ❌ TODO Placeholders

**Problem**: Unfinished content
```markdown
## Advanced Patterns
TODO: Add patterns here
```

**Solution**: Complete or remove

### 5. ❌ Wrong Tools Listed

**Problem**: Tools list doesn't match skill usage
```markdown
allowed-tools:
  - Read
  - Write
  - Bash

## Instructions
Use the WebFetch tool to retrieve data...
```

**Solution**: List all tools actually used
```markdown
allowed-tools:
  - WebFetch
  - Read
  - Write
```

---

## Quality Checklist

Before publishing, ensure your skill passes these checks:

### Content Quality

- [ ] Clear, focused purpose
- [ ] Concise, actionable instructions
- [ ] 2-7 concrete examples
- [ ] Examples include expected output
- [ ] No TODO items
- [ ] No placeholder content

### Structure

- [ ] Valid YAML frontmatter
- [ ] Proper Markdown formatting
- [ ] Logical section organization
- [ ] Consistent heading levels
- [ ] Code blocks have language tags

### Metadata

- [ ] Descriptive name (pattern: `^[a-z][a-z0-9-]*$`)
- [ ] Clear description (20-200 chars)
- [ ] Appropriate category
- [ ] Correct complexity level
- [ ] Complete tools list
- [ ] Version specified
- [ ] Dependencies listed (if any)

### Performance

- [ ] Token count < 2000 (optimal)
- [ ] Token count < 4000 (maximum)
- [ ] Instructions 500-5000 characters
- [ ] No excessive repetition

### Testing

- [ ] All examples validated
- [ ] Compilation successful
- [ ] Lint score > 75 (Good)
- [ ] No critical warnings

### Commands to Validate

```bash
# 1. Lint for quality
pcl skill lint my-skill.md

# 2. Test examples
pcl skill test my-skill.md

# 3. Check token count
pcl skill compile my-skill.md

# 4. Optimize if needed
pcl skill optimize my-skill.md
```

---

## Resources

- **CLI Reference**: [SKILLS-TOOLING-SUMMARY.md](../.roadmap/SKILLS-TOOLING-SUMMARY.md)
- **Composition Patterns**: [SKILL-COMPOSITION-PATTERNS.md](./SKILL-COMPOSITION-PATTERNS.md)
- **Example Library**: [stdlib/](../stdlib/)
- **LSP Integration**: [PHASE-2.2C-DAY13-14-COMPLETE.md](../.roadmap/PHASE-2.2C-DAY13-14-COMPLETE.md)

---

## Quick Start

### Create Your First Skill

```bash
# 1. Use the wizard
pcl skill wizard

# 2. Edit the generated file
vim .claude/skills/my-skill.md

# 3. Validate
pcl skill validate .claude/skills/my-skill.md

# 4. Test
pcl skill test .claude/skills/my-skill.md

# 5. Publish
pcl skill publish .claude/skills/my-skill.md
```

---

**Happy Skill Authoring!** 🚀

For questions or contributions, see [CONTRIBUTING.md](../CONTRIBUTING.md).
