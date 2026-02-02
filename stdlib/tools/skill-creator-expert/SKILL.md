---
name: skill-creator-expert
version: 1.0.0
description: Expert system for designing, creating, and validating PCL skills with comprehensive domain knowledge extraction
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

## Skill Creation Framework

### 1. Domain Analysis Template

```typescript
interface DomainAnalysis {
  // Core domain identification
  domain: {
    name: string;
    category:
      | 'language'
      | 'framework'
      | 'cloud'
      | 'data'
      | 'devops'
      | 'ai'
      | 'security'
      | 'professional'
      | 'scientific'
      | 'tools'
      | 'domains';
    subcategories: string[];
    relatedDomains: string[];
  };

  // Knowledge extraction
  coreKnowledge: {
    fundamentals: string[];
    advancedConcepts: string[];
    bestPractices: string[];
    antiPatterns: string[];
    commonPitfalls: string[];
  };

  // Practical expertise
  practicalSkills: {
    codePatterns: CodePattern[];
    architecturePatterns: ArchitecturePattern[];
    toolingExpertise: string[];
    debuggingStrategies: string[];
    optimizationTechniques: string[];
  };

  // Real-world scenarios
  useCases: {
    beginner: Scenario[];
    intermediate: Scenario[];
    advanced: Scenario[];
    expert: Scenario[];
  };

  // Integration points
  dependencies: {
    required: string[];
    optional: string[];
    complementary: string[];
  };
}

interface CodePattern {
  name: string;
  context: string;
  problem: string;
  solution: string;
  example: string;
  alternatives: string[];
}

interface ArchitecturePattern {
  name: string;
  applicability: string;
  structure: string;
  implementation: string;
  consequences: {
    benefits: string[];
    tradeoffs: string[];
  };
}

interface Scenario {
  title: string;
  context: string;
  challenge: string;
  approach: string;
  codeExample: string;
  explanation: string;
}
```

### 2. Skill Structure Generator

```typescript
class SkillStructureGenerator {
  /**
   * Generate complete skill structure from domain analysis
   */
  generateSkill(analysis: DomainAnalysis): SkillDefinition {
    return {
      metadata: this.generateMetadata(analysis),
      frontMatter: this.generateFrontMatter(analysis),
      coreConcepts: this.extractCoreConcepts(analysis),
      codeExamples: this.generateCodeExamples(analysis),
      bestPractices: this.compileBestPractices(analysis),
      advancedPatterns: this.extractAdvancedPatterns(analysis),
      integrationGuide: this.generateIntegrationGuide(analysis),
      troubleshooting: this.generateTroubleshooting(analysis),
      references: this.gatherReferences(analysis),
    };
  }

  /**
   * Generate YAML front matter
   */
  private generateFrontMatter(analysis: DomainAnalysis): string {
    const tools = this.determineRequiredTools(analysis);
    const tags = this.extractRelevantTags(analysis);

    return `---
name: ${analysis.domain.name}
version: 1.0.0
description: ${this.generateDescription(analysis)}
category: ${analysis.domain.category}
tags: [${tags.join(', ')}]
allowed-tools:
${tools.map((t) => `  - ${t}`).join('\n')}
---`;
  }

  /**
   * Extract and organize core concepts
   */
  private extractCoreConcepts(analysis: DomainAnalysis): Section {
    return {
      title: 'Core Concepts',
      subsections: [
        {
          title: 'Fundamentals',
          content: this.formatFundamentals(analysis.coreKnowledge.fundamentals),
        },
        {
          title: 'Advanced Concepts',
          content: this.formatAdvancedConcepts(
            analysis.coreKnowledge.advancedConcepts
          ),
        },
        {
          title: 'Best Practices',
          content: this.formatBestPractices(
            analysis.coreKnowledge.bestPractices
          ),
        },
      ],
    };
  }

  /**
   * Generate comprehensive code examples
   */
  private generateCodeExamples(analysis: DomainAnalysis): Section {
    const examples: CodeExample[] = [];

    // Extract patterns by complexity
    for (const level of [
      'beginner',
      'intermediate',
      'advanced',
      'expert',
    ] as const) {
      const scenarios = analysis.useCases[level];
      scenarios.forEach((scenario) => {
        examples.push({
          title: scenario.title,
          level,
          code: scenario.codeExample,
          explanation: scenario.explanation,
          context: scenario.context,
        });
      });
    }

    return this.formatCodeExamplesSection(examples);
  }

  /**
   * Compile best practices with rationale
   */
  private compileBestPractices(analysis: DomainAnalysis): Section {
    const practices = analysis.coreKnowledge.bestPractices.map((practice) => ({
      practice,
      rationale: this.extractRationale(practice, analysis),
      examples: this.findExamples(practice, analysis),
      antiPatterns: this.findRelatedAntiPatterns(practice, analysis),
    }));

    return {
      title: 'Best Practices',
      content: this.formatBestPracticesWithContext(practices),
    };
  }

  /**
   * Extract advanced patterns and architectures
   */
  private extractAdvancedPatterns(analysis: DomainAnalysis): Section {
    return {
      title: 'Advanced Patterns',
      subsections: analysis.practicalSkills.architecturePatterns.map(
        (pattern) => ({
          title: pattern.name,
          content: this.formatArchitecturePattern(pattern),
        })
      ),
    };
  }

  /**
   * Generate integration guide
   */
  private generateIntegrationGuide(analysis: DomainAnalysis): Section {
    const integrations = this.analyzeIntegrations(analysis);

    return {
      title: 'Integration Guide',
      subsections: [
        {
          title: 'Required Dependencies',
          content: this.formatDependencies(analysis.dependencies.required),
        },
        {
          title: 'Optional Integrations',
          content: this.formatOptionalIntegrations(
            analysis.dependencies.optional
          ),
        },
        {
          title: 'Complementary Skills',
          content: this.formatComplementarySkills(
            analysis.dependencies.complementary
          ),
        },
        {
          title: 'Integration Patterns',
          content: this.formatIntegrationPatterns(integrations),
        },
      ],
    };
  }

  /**
   * Generate troubleshooting guide
   */
  private generateTroubleshooting(analysis: DomainAnalysis): Section {
    const issues = this.extractCommonIssues(analysis);

    return {
      title: 'Troubleshooting',
      content: issues.map((issue) => this.formatTroubleshootingItem(issue)),
    };
  }

  /**
   * Gather comprehensive references
   */
  private gatherReferences(analysis: DomainAnalysis): Section {
    return {
      title: 'References',
      subsections: [
        {
          title: 'Official Documentation',
          content: this.findOfficialDocs(analysis.domain.name),
        },
        {
          title: 'Community Resources',
          content: this.findCommunityResources(analysis.domain.name),
        },
        {
          title: 'Related Skills',
          content: analysis.domain.relatedDomains
            .map((d) => `- ${d}`)
            .join('\n'),
        },
      ],
    };
  }
}
```

### 3. Skill Validation Engine

```typescript
class SkillValidator {
  /**
   * Comprehensive skill validation
   */
  validate(skill: SkillDefinition): ValidationReport {
    const checks: ValidationCheck[] = [
      this.validateMetadata(skill),
      this.validateStructure(skill),
      this.validateContent(skill),
      this.validateExamples(skill),
      this.validateDocumentation(skill),
      this.validateSecurity(skill),
    ];

    const errors = checks.flatMap((c) => c.errors);
    const warnings = checks.flatMap((c) => c.warnings);
    const suggestions = this.generateSuggestions(skill, checks);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score: this.calculateQualityScore(checks),
    };
  }

  /**
   * Validate metadata completeness
   */
  private validateMetadata(skill: SkillDefinition): ValidationCheck {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!skill.metadata.name || skill.metadata.name.length === 0) {
      errors.push('Skill name is required');
    }

    if (
      !skill.metadata.version ||
      !this.isValidSemver(skill.metadata.version)
    ) {
      errors.push('Valid semantic version is required');
    }

    if (!skill.metadata.description || skill.metadata.description.length < 20) {
      warnings.push('Description should be at least 20 characters');
    }

    if (!skill.metadata.category) {
      errors.push('Category is required');
    }

    if (!skill.metadata.tags || skill.metadata.tags.length === 0) {
      warnings.push('At least one tag should be specified');
    }

    return { errors, warnings };
  }

  /**
   * Validate skill structure
   */
  private validateStructure(skill: SkillDefinition): ValidationCheck {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredSections = [
      'Core Concepts',
      'Code Examples',
      'Best Practices',
    ];

    for (const section of requiredSections) {
      if (!this.hasSection(skill, section)) {
        errors.push(`Missing required section: ${section}`);
      }
    }

    if (!skill.codeExamples || skill.codeExamples.length < 3) {
      warnings.push('At least 3 code examples recommended');
    }

    return { errors, warnings };
  }

  /**
   * Validate content quality
   */
  private validateContent(skill: SkillDefinition): ValidationCheck {
    const warnings: string[] = [];

    // Check for placeholder content
    const placeholders = ['TODO', 'FIXME', '[...]', 'TBD'];
    const content = this.extractAllContent(skill);

    for (const placeholder of placeholders) {
      if (content.includes(placeholder)) {
        warnings.push(`Found placeholder: ${placeholder}`);
      }
    }

    // Check content length
    if (content.length < 1000) {
      warnings.push('Skill content seems too brief (< 1000 characters)');
    }

    return { errors: [], warnings };
  }

  /**
   * Validate code examples
   */
  private validateExamples(skill: SkillDefinition): ValidationCheck {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const example of skill.codeExamples || []) {
      // Check for syntax errors (basic validation)
      if (!this.isValidCode(example.code, skill.metadata.category)) {
        errors.push(`Invalid code syntax in example: ${example.title}`);
      }

      // Check for explanations
      if (!example.explanation || example.explanation.length < 50) {
        warnings.push(`Example "${example.title}" needs better explanation`);
      }

      // Check for security issues
      const securityIssues = this.checkCodeSecurity(example.code);
      if (securityIssues.length > 0) {
        warnings.push(
          `Security concerns in "${example.title}": ${securityIssues.join(', ')}`
        );
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate documentation completeness
   */
  private validateDocumentation(skill: SkillDefinition): ValidationCheck {
    const warnings: string[] = [];

    if (!skill.integrationGuide) {
      warnings.push('Consider adding integration guide');
    }

    if (!skill.troubleshooting) {
      warnings.push('Consider adding troubleshooting section');
    }

    if (!skill.references) {
      warnings.push('Consider adding references section');
    }

    return { errors: [], warnings };
  }

  /**
   * Security validation
   */
  private validateSecurity(skill: SkillDefinition): ValidationCheck {
    const warnings: string[] = [];

    // Check for dangerous tools
    const dangerousTools = ['Execute', 'Shell', 'System'];
    const tools = skill.metadata.allowedTools || [];

    for (const tool of tools) {
      if (dangerousTools.includes(tool)) {
        warnings.push(`Tool "${tool}" requires security justification`);
      }
    }

    // Check for hardcoded secrets in examples
    const allCode = (skill.codeExamples || []).map((e) => e.code).join('\n');

    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(allCode)) {
        warnings.push('Code examples contain hardcoded credentials');
        break;
      }
    }

    return { errors: [], warnings };
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(checks: ValidationCheck[]): number {
    const totalErrors = checks.reduce((sum, c) => sum + c.errors.length, 0);
    const totalWarnings = checks.reduce((sum, c) => sum + c.warnings.length, 0);

    const errorPenalty = totalErrors * 10;
    const warningPenalty = totalWarnings * 2;

    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }
}
```

### 4. Interactive Skill Builder

```typescript
class InteractiveSkillBuilder {
  /**
   * Guide user through skill creation process
   */
  async buildSkill(): Promise<SkillDefinition> {
    console.log('🎯 PCL Skill Creator - Interactive Mode\n');

    // Step 1: Domain identification
    const domain = await this.identifyDomain();
    console.log(`✓ Domain identified: ${domain.name}\n`);

    // Step 2: Knowledge extraction
    const knowledge = await this.extractKnowledge(domain);
    console.log(
      `✓ Knowledge extracted: ${knowledge.concepts.length} concepts\n`
    );

    // Step 3: Code patterns
    const patterns = await this.collectCodePatterns(domain, knowledge);
    console.log(`✓ Code patterns collected: ${patterns.length}\n`);

    // Step 4: Use cases
    const useCases = await this.defineUseCases(domain, patterns);
    console.log(`✓ Use cases defined: ${useCases.length}\n`);

    // Step 5: Dependencies
    const dependencies = await this.mapDependencies(domain);
    console.log(`✓ Dependencies mapped\n`);

    // Step 6: Generate skill
    const analysis: DomainAnalysis = {
      domain,
      coreKnowledge: knowledge,
      practicalSkills: { codePatterns: patterns /* ... */ },
      useCases: this.organizeUseCases(useCases),
      dependencies,
    };

    const generator = new SkillStructureGenerator();
    const skill = generator.generateSkill(analysis);

    // Step 7: Validate
    const validator = new SkillValidator();
    const report = validator.validate(skill);

    console.log(`\n📊 Validation Report:`);
    console.log(`   Score: ${report.score}/100`);
    console.log(`   Errors: ${report.errors.length}`);
    console.log(`   Warnings: ${report.warnings.length}`);

    if (report.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.errors.forEach((e) => console.log(`   - ${e}`));
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      report.warnings.forEach((w) => console.log(`   - ${w}`));
    }

    if (report.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      report.suggestions.forEach((s) => console.log(`   - ${s}`));
    }

    return skill;
  }

  /**
   * Identify and analyze domain
   */
  private async identifyDomain(): Promise<Domain> {
    // Interactive prompts or automated analysis
    return {
      name: 'example-expert',
      category: 'tools',
      subcategories: [],
      relatedDomains: [],
    };
  }

  /**
   * Extract domain knowledge through various methods
   */
  private async extractKnowledge(domain: Domain): Promise<CoreKnowledge> {
    // Scrape documentation, analyze repositories, etc.
    return {
      fundamentals: [],
      advancedConcepts: [],
      bestPractices: [],
      antiPatterns: [],
      commonPitfalls: [],
    };
  }
}
```

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
````

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
    'react-expert',      // Frontend
    'nodejs-expert',     // Backend
    'postgresql-expert', // Database
    'docker-expert',     // Deployment
    'aws-expert',        // Cloud
  ],
  coordinationStrategy: 'collaborative',
};
````

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

## References

- [PCL Language Specification](../../docs/reference/PCL_SPEC.md)
- [Skill Authoring Guide](../../docs/SKILL-AUTHORING-GUIDE.md)
- [Skill Composition Patterns](../../docs/SKILL-COMPOSITION-PATTERNS.md)
- [PCL Best Practices](../../docs/reference/BEST_PRACTICES.md)

## Related Skills

- `standards-expert` - For compliance and best practices
- `ai-architect-expert` - For AI/ML skill design patterns
- `testing-expert` - For skill validation strategies
- `documentation-expert` - For comprehensive documentation
