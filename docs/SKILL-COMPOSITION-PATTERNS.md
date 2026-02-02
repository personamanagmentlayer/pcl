# Skill Composition Patterns

**Version**: 1.0
**Last Updated**: 2026-01-22

---

## Table of Contents

1. [Introduction](#introduction)
2. [Layering Pattern](#layering-pattern)
3. [Specialization Pattern](#specialization-pattern)
4. [Conflict Resolution](#conflict-resolution)
5. [Dynamic Loading](#dynamic-loading)
6. [Performance Optimization](#performance-optimization)
7. [Real-World Examples](#real-world-examples)

---

## Introduction

Skill composition allows combining multiple skills to create powerful, specialized AI capabilities. This guide covers proven patterns for effective skill composition.

### Core Principles

1. **Modularity**: Each skill has a single, well-defined purpose
2. **Composability**: Skills work together without conflicts
3. **Layering**: Build from foundation to specialization
4. **Performance**: Minimize token overhead
5. **Maintainability**: Easy to understand and update

---

## Layering Pattern

### Concept

Build skills in layers from general to specific:

```
Foundation Layer (Language basics)
    ↓
Technical Layer (Framework/tool specifics)
    ↓
Domain Layer (Business/domain knowledge)
```

### Example: Python Web Development

```markdown
## Layer 1: Foundation

**Skills**: python-basics, python-typing

## Layer 2: Technical

**Skills**: flask-framework, sqlalchemy-orm, pytest-testing

## Layer 3: Domain

**Skills**: rest-api-design, authentication-patterns, data-validation
```

### Implementation

**persona.pcl**:

```pcl
persona PythonWebDeveloper {
  intent: "Expert Python web developer"

  skills: [
    // Layer 1: Foundation
    python-basics,
    python-typing,
    python-async,

    // Layer 2: Technical
    flask-framework,
    sqlalchemy-orm,
    pytest-testing,

    // Layer 3: Domain
    rest-api-design,
    authentication-patterns,
    data-validation
  ]
}
```

### Benefits

- **Progressive Complexity**: Start simple, add depth
- **Reusability**: Foundation skills used across multiple personas
- **Clear Structure**: Easy to understand hierarchy
- **Maintainability**: Update layers independently

### Anti-Pattern: Flat Structure

❌ **Bad**:

```pcl
skills: [
  // 20 unrelated skills mixed together
  python-basics,
  flask-advanced-patterns,
  python-beginner,
  rest-api,
  // ... hard to understand relationships
]
```

---

## Specialization Pattern

### Concept

Create specialized skills that extend base skills:

```
Base Skill (General concept)
    ↓
Specialized Skill (Specific application)
```

### Example: Testing Specialization

**Base Skill**: `python-testing-basics.md`

```markdown
---
name: python-testing-basics
category: qa
complexity: beginner
---

# Python Testing Basics

## Core Concepts

- Test structure (Arrange, Act, Assert)
- Test isolation
- Test naming conventions
```

**Specialized Skills**:

1. **python-testing-pytest.md**

   ```markdown
   ---
   name: python-testing-pytest
   category: qa
   complexity: intermediate
   dependencies:
     - python-testing-basics
   ---

   # pytest Framework

   ## pytest-Specific Patterns

   - Fixtures for setup/teardown
   - Parametrized tests
   - Marks and custom markers
   ```

2. **python-testing-mocking.md**

   ```markdown
   ---
   name: python-testing-mocking
   category: qa
   complexity: advanced
   dependencies:
     - python-testing-basics
     - python-testing-pytest
   ---

   # Test Mocking with pytest-mock

   ## Mocking Patterns

   - Mock external dependencies
   - Patch strategies
   - Mock return values and side effects
   ```

### Benefits

- **Incremental Learning**: Build on existing knowledge
- **Focused Skills**: Each skill covers specific aspect
- **Clear Dependencies**: Explicit skill relationships
- **Token Efficiency**: Share base knowledge

---

## Conflict Resolution

### Understanding Conflicts

Skills conflict when they give contradictory instructions.

### Common Conflict Scenarios

#### 1. Style Conflicts

**Conflict**: Different code style preferences

**python-style-google.md**:

```markdown
Use Google-style docstrings:
\`\`\`python
def func():
"""Summary line.

    Args:
        param: Description
    """

\`\`\`
```

**python-style-numpy.md**:

```markdown
Use NumPy-style docstrings:
\`\`\`python
def func():
"""Summary line.

    Parameters
    ----------
    param : type
        Description
    """

\`\`\`
```

**Resolution**: Declare conflict explicitly

```markdown
---
name: python-style-google
conflicts:
  - python-style-numpy
  - python-style-sphinx
---
```

#### 2. Approach Conflicts

**Conflict**: Different architectural approaches

**Example**: `sync-patterns` vs `async-patterns`

**Resolution**: Use one or the other, not both

```markdown
---
name: async-patterns
conflicts:
  - sync-blocking-patterns
---
```

#### 3. Version Conflicts

**Conflict**: Different framework versions

**Resolution**: Specify version constraints

```markdown
---
name: react-hooks-v18
conflicts:
  - react-class-components-v16
version: 18.0.0
---
```

### Conflict Resolution Strategies

#### Strategy 1: Explicit Declaration

```markdown
---
name: my-skill
conflicts:
  - conflicting-skill-1
  - conflicting-skill-2
---

## Why This Conflicts

This skill uses approach X, which is incompatible with approach Y
used in conflicting-skill-1.
```

#### Strategy 2: Priority-Based Selection

```pcl
persona Developer {
  skills: [
    core-skill,        // Priority 1
    specialized-skill, // Priority 2 (overrides core if conflict)
    domain-skill       // Priority 3 (overrides both)
  ]
}
```

#### Strategy 3: Conditional Loading

```markdown
## When to Use This Skill

✅ Use when:

- Building new projects
- Python 3.10+
- Performance is critical

❌ Don't use when:

- Maintaining legacy code
- Python < 3.8
- Simplicity > performance
```

---

## Dynamic Loading

### Context-Aware Skill Selection

Load skills based on context, file type, or user request.

### Pattern 1: File-Type Based

```pcl
router CodeAssistant {
  rules: [
    {
      when: file.extension == ".py",
      load: [python-expert, python-testing, python-typing]
    },
    {
      when: file.extension == ".ts",
      load: [typescript-expert, react-patterns, testing-jest]
    },
    {
      when: file.extension == ".rs",
      load: [rust-expert, rust-ownership, cargo-management]
    }
  ]
}
```

### Pattern 2: Task-Based

```pcl
router TaskRouter {
  rules: [
    {
      when: task.type == "debugging",
      load: [debugging-strategies, error-analysis, logging-best-practices]
    },
    {
      when: task.type == "refactoring",
      load: [refactoring-patterns, code-smells, design-patterns]
    },
    {
      when: task.type == "testing",
      load: [test-strategies, test-patterns, mocking-techniques]
    }
  ]
}
```

### Pattern 3: Complexity-Based

```pcl
router AdaptiveAssistant {
  rules: [
    {
      when: user.level == "beginner",
      load: [basics, simple-patterns, guided-learning]
    },
    {
      when: user.level == "intermediate",
      load: [intermediate-patterns, best-practices, common-pitfalls]
    },
    {
      when: user.level == "expert",
      load: [advanced-patterns, optimization, edge-cases]
    }
  ]
}
```

### Benefits

- **Token Efficiency**: Load only needed skills
- **Contextual Relevance**: Right skills for the task
- **Scalability**: Handle many specialized scenarios
- **Performance**: Reduce overhead

---

## Performance Optimization

### Token Budget Management

**Problem**: Too many skills = too many tokens

**Solution**: Strategic skill selection

#### Optimization 1: Skill Merging

Instead of:

```pcl
skills: [
  python-basics,           // 500 tokens
  python-syntax,           // 400 tokens
  python-data-types,       // 450 tokens
  python-control-flow      // 400 tokens
]
// Total: 1750 tokens
```

Merge into:

```pcl
skills: [
  python-fundamentals      // 1200 tokens (optimized)
]
// Total: 1200 tokens (saved 550 tokens!)
```

#### Optimization 2: Skill Splitting

If skill > 2000 tokens, split by concern:

```markdown
# Before: python-web-everything (3500 tokens)

# After:

python-web-routing (800 tokens)
python-web-templates (700 tokens)
python-web-forms (600 tokens)
python-web-database (900 tokens)
```

Load only what's needed:

```pcl
persona WebDeveloper {
  skills: [
    python-web-routing,   // Always needed
    python-web-database,  // Always needed
    // Load these conditionally:
    // python-web-templates (if working on views)
    // python-web-forms (if working on forms)
  ]
}
```

#### Optimization 3: Aggressive Compression

```bash
# Before optimization
Token Count: 2500

# Run optimizer
pcl skill optimize my-skill.md --aggressive

# After optimization
Token Count: 1800 (saved 700 tokens!)
```

### Dependency Optimization

#### Problem: Transitive Dependencies

```
skill-a (depends on skill-b)
  ↓
skill-b (depends on skill-c)
  ↓
skill-c
```

**Total tokens**: All three skills loaded

#### Solution: Flatten When Possible

If skill-b is only used by skill-a, merge them:

```
skill-a-extended (includes skill-b concepts)
  ↓
skill-c
```

**Total tokens**: Reduced by removing intermediary

---

## Real-World Examples

### Example 1: Full-Stack Developer Persona

```pcl
persona FullStackDeveloper {
  intent: "Expert full-stack web developer"

  skills: [
    // Foundation (always loaded)
    programming-fundamentals,
    version-control-git,
    debugging-strategies,

    // Frontend (context-aware)
    react-modern-patterns,
    typescript-advanced,
    css-flexbox-grid,
    responsive-design,

    // Backend (context-aware)
    nodejs-express,
    database-postgresql,
    api-design-rest,
    authentication-jwt,

    // DevOps (conditional)
    docker-containers,
    ci-cd-github-actions,
    cloud-deployment-aws
  ]

  router: {
    // Load frontend skills for .tsx/.jsx files
    // Load backend skills for .ts/.js server files
    // Load devops skills when Dockerfile/docker-compose present
  }
}
```

### Example 2: Data Scientist Persona

```pcl
persona DataScientist {
  intent: "Expert data scientist"

  skills: [
    // Foundation
    python-data-analysis,
    statistics-fundamentals,

    // Core Data Science
    pandas-dataframes,
    numpy-arrays,
    data-visualization-matplotlib,

    // Machine Learning
    scikit-learn-models,
    model-evaluation,
    feature-engineering,

    // Specialized (conditional)
    deep-learning-pytorch,    // Load if neural networks needed
    nlp-transformers,          // Load if NLP task
    time-series-forecasting    // Load if time series data
  ]
}
```

### Example 3: Security Auditor Persona

```pcl
persona SecurityAuditor {
  intent: "Security expert for code auditing"

  skills: [
    // Foundation
    security-principles,
    owasp-top-10,
    threat-modeling,

    // Language-Specific (dynamic)
    // Load based on file type:
    python-security-patterns,
    javascript-security-issues,
    sql-injection-prevention,
    xss-prevention,

    // Infrastructure
    secure-configuration,
    secret-management,
    authentication-best-practices,

    // Tools
    static-analysis-tools,
    security-testing,
    vulnerability-scanning
  ]
}
```

---

## Best Practices Summary

### ✅ Do This

1. **Layer skills** from foundation to specialization
2. **Declare conflicts** explicitly
3. **Use dependencies** to show relationships
4. **Optimize tokens** by merging or splitting
5. **Load dynamically** based on context
6. **Test compositions** for conflicts
7. **Document patterns** for team consistency

### ❌ Avoid This

1. **Don't** mix unrelated skills randomly
2. **Don't** ignore conflicts
3. **Don't** create circular dependencies
4. **Don't** exceed token budgets
5. **Don't** over-specialize (too many tiny skills)
6. **Don't** under-specify (too few broad skills)

---

## Testing Compositions

### Validation Commands

```bash
# 1. Test for conflicts
pcl skill test my-skill.md --composition

# 2. Check dependencies
pcl skill info my-skill.md

# 3. Verify token budget
pcl skill compile my-skill.md

# 4. Lint for quality
pcl skill lint my-skill.md
```

### Composition Checklist

- [ ] All dependencies exist
- [ ] No circular dependencies
- [ ] No undeclared conflicts
- [ ] Total token count acceptable
- [ ] Skills work together (test examples)
- [ ] Clear documentation of relationships
- [ ] Performance meets requirements

---

## Resources

- [Skill Authoring Guide](./SKILL-AUTHORING-GUIDE.md)
- [Standard Library Examples](../stdlib/)
- [CLI Tooling Reference](../.roadmap/SKILLS-TOOLING-SUMMARY.md)

---

**Master skill composition for powerful AI capabilities!** 🚀
