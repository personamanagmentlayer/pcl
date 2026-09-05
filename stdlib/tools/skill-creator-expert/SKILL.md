---
name: skill-creator-expert
version: 1.1.0
description: >-
  Expert system for designing, creating, and validating PCL skills with comprehensive
  domain knowledge extraction. Use when the user mentions skill creation, meta programming,
  domain modeling, knowledge engineering, or PCL development, or when the task involves
  Skill Design Principles, Skill Architecture Patterns, Quality & Validation, or Domain
  Analysis Template.
category: tools
tags:
  [
    skill-creation,
    meta-programming,
    domain-modeling,
    knowledge-engineering,
    pcl-development,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Execute
---

# Skill Creator Expert

Master skill architect for designing, implementing, and validating high-quality PCL skills. Specializes in domain knowledge extraction, skill composition patterns, and PCL best practices.

## Core Competencies

### Skill Design Principles

- Domain analysis and knowledge extraction
- Skill scope definition and boundaries
- Dependency mapping and composition
- Tool allowlist configuration
- Version management and evolution

### Skill Architecture Patterns

- Single-responsibility skills
- Composite skills (orchestration)
- Hierarchical skill structures
- Cross-domain skill integration
- Reusable skill components

### Quality & Validation

- Skill testing frameworks
- Documentation completeness
- Example scenario coverage
- Performance benchmarking
- Security review

## Skill Templates

### Minimal Skill Template

````markdown
---
name: [skill-name]
version: 1.0.0
description: [Brief description]
category: [category]
tags: [tag1, tag2, tag3]
allowed-tools:
  - Read
  - Write
---

# [Skill Name] Expert

[Comprehensive description of the skill's purpose and capabilities]

## Core Concepts

### [Concept 1]

[Explanation with examples]

### [Concept 2]

[Explanation with examples]

## Code Examples

### Example 1: [Title]

```[language]
// Code example with detailed comments
```

[Explanation of the example]

## Best Practices

1. **[Practice 1]**: [Rationale]
2. **[Practice 2]**: [Rationale]

## Advanced Patterns

### [Pattern Name]

[Description and implementation]

## Troubleshooting

### Issue: [Common Problem]

**Solution**: [Resolution steps]

## References

- [Official Documentation](url)
- [Community Resources](url)
````

### Full-Featured Skill Template

See examples in `stdlib/ai/ai-architect-expert/SKILL.md` for comprehensive structure.

## Best Practices for Skill Creation

### 1. Domain Expertise Depth

- **Deep, not broad**: Focus on specific domain mastery
- **Practical over theoretical**: Emphasize actionable knowledge
- **Current best practices**: Keep content up-to-date
- **Real-world scenarios**: Include production-ready examples

### 2. Code Quality

- **Executable examples**: All code should be runnable
- **Comprehensive comments**: Explain non-obvious logic
- **Error handling**: Show proper error management
- **Security awareness**: No hardcoded secrets, safe patterns

### 3. Documentation Excellence

- **Clear structure**: Logical flow from basics to advanced
- **Consistent formatting**: Use standard markdown conventions
- **Complete examples**: Show full context, not just snippets
- **Cross-references**: Link to related skills and concepts

### 4. Maintainability

- **Semantic versioning**: Follow semver for versions
- **Changelog tracking**: Document changes between versions
- **Deprecation notices**: Warn about outdated patterns
- **Migration guides**: Help users upgrade

### 5. Integration Patterns

- **Dependency declaration**: Clearly state requirements
- **Composition examples**: Show skill combinations
- **Tool restrictions**: Minimal, justified allowed-tools
- **Namespace awareness**: Avoid conflicts with other skills

## Skill Quality Checklist

- [ ] Valid front matter (name, version, description, category, tags)
- [ ] Appropriate allowed-tools list
- [ ] Core concepts section with clear explanations
- [ ] At least 3 comprehensive code examples
- [ ] Best practices with rationale
- [ ] Advanced patterns section
- [ ] Troubleshooting guide
- [ ] References and links
- [ ] No hardcoded secrets or credentials
- [ ] All code examples tested and working
- [ ] Clear integration guidelines
- [ ] Proper error handling in examples
- [ ] Security considerations addressed
- [ ] Version compatibility notes
- [ ] Performance considerations

## Advanced Features

### Skill Composition Patterns

```typescript
// Example: Composite skill that combines multiple experts
const fullStackSkill = {
  name: 'fullstack-web-developer',
  composition: [
    'react-expert', // Frontend
    'nodejs-expert', // Backend
    'postgresql-expert', // Database
    'docker-expert', // Deployment
    'aws-expert', // Cloud
  ],
  coordinationStrategy: 'collaborative',
};
```

### Dynamic Skill Loading

```typescript
class SkillLoader {
  /**
   * Load skill with dependency resolution
   */
  async loadSkill(name: string): Promise<Skill> {
    const skill = await this.fetchSkill(name);
    const dependencies = skill.metadata.dependencies || [];

    // Recursively load dependencies
    const loadedDeps = await Promise.all(
      dependencies.map((dep) => this.loadSkill(dep))
    );

    return {
      ...skill,
      dependencies: loadedDeps,
    };
  }
}
```

### Skill Versioning Strategy

```typescript
interface SkillVersion {
  version: string;
  releaseDate: string;
  changes: {
    breaking: string[];
    features: string[];
    fixes: string[];
    deprecated: string[];
  };
  migrationGuide?: string;
}

// Example changelog
const changelog: SkillVersion[] = [
  {
    version: '2.0.0',
    releaseDate: '2026-01-31',
    changes: {
      breaking: ['Removed deprecated X method'],
      features: ['Added Y capability'],
      fixes: ['Fixed Z issue'],
      deprecated: ['Method A is now deprecated'],
    },
    migrationGuide: 'See MIGRATION.md for upgrade path',
  },
];
```

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Skill Creation Framework](references/SKILL_CREATION_FRAMEWORK.md) — Domain Analysis Template, Skill Structure Generator, Skill Validation Engine, Interactive Skill Builder

## References

- [PCL Language Reference](../../../docs/reference/LANGUAGE.md)
- [Skill Authoring Guide](../../../docs/SKILL-AUTHORING-GUIDE.md)
- [Skill Composition Patterns](../../../docs/SKILL-COMPOSITION-PATTERNS.md)
- [PCL Standards Compliance](../../../docs/STANDARDS-COMPLIANCE.md)

## Related Skills

- `standards-expert` - For compliance and best practices
- `ai-architect-expert` - For AI/ML skill design patterns
- `testing-expert` - For skill validation strategies
- `documentation-expert` - For comprehensive documentation
