# Skill Runtime System

Complete guide to PCL's skill runtime system - loading, compiling, merging, and executing skills with personas.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Skill Lifecycle](#skill-lifecycle)
4. [Core Components](#core-components)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [API Reference](#api-reference)

---

## Overview

The PCL skill runtime system enables dynamic loading, compilation, and execution of skills with personas. Skills are reusable instruction sets that enhance persona capabilities.

### Key Features

- **Skill Compilation**: Validates, hashes, and generates metadata
- **Skill Merging**: Combines multiple skills into unified prompts
- **Skill Resolution**: Resolves @org/package/skill references
- **Prompt Integration**: Provider-specific formatting (Claude XML, GPT Markdown)
- **Context Management**: Lazy loading, caching, and lifecycle tracking
- **Runtime Integration**: Seamless persona execution

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Skill Runtime System                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │   Loader     │───▶│   Compiler    │───▶│   Context   │ │
│  │ (SKILL.md)   │    │ (Validate)    │    │  (Cache)    │ │
│  └──────────────┘    └───────────────┘    └─────────────┘ │
│         │                    │                     │        │
│         ▼                    ▼                     ▼        │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │   Resolver   │───▶│    Merger     │───▶│ Prompt      │ │
│  │ (@org/skill) │    │ (Combine)     │    │ Integration │ │
│  └──────────────┘    └───────────────┘    └─────────────┘ │
│                                                             │
│                            │                                │
│                            ▼                                │
│                    ┌───────────────┐                        │
│                    │    Runtime    │                        │
│                    │   (Execute)   │                        │
│                    └───────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Skill Lifecycle

### 1. Loading

Skills are loaded from various sources:

- **Local files**: `.claude/skills/skill-name.md`
- **Registry**: `@org/package/skill@version`
- **Standard library**: `stdlib/skills/skill-name.md`
- **Remote URLs**: `https://example.com/skill.md`

```typescript
import { SkillResolver } from '@pcl/sdk/skills';

const resolver = new SkillResolver({
  baseDir: process.cwd(),
  claudeSkillsDir: '.claude/skills',
  allowRemote: false,
});

const result = await resolver.resolve('code-review');
```

### 2. Compilation

Skills are validated and compiled with metadata:

```typescript
import { SkillCompiler } from '@pcl/sdk/skills';

const compiler = new SkillCompiler();
const result = compiler.compile(skill);

if (result.success) {
  console.log('Hash:', result.skill.hash);
  console.log('Tokens:', result.skill.metadata.tokenCount);
}
```

### 3. Merging

Multiple skills are combined into a unified prompt:

```typescript
import { SkillMerger, ConflictStrategy, ProviderFormat } from '@pcl/sdk/skills';

const merger = new SkillMerger();
const result = merger.merge(compiledSkills, {
  conflictStrategy: ConflictStrategy.OVERRIDE,
  format: ProviderFormat.CLAUDE_XML,
  includeExamples: true,
  includeTools: true,
  maxTokens: 2000,
});
```

### 4. Integration

Merged skills are integrated into system prompts:

```typescript
import { PromptIntegration, PromptProvider, PromptSection } from '@pcl/sdk/skills';

const promptIntegration = new PromptIntegration();
const result = promptIntegration.integrate(basePrompt, compiledSkills, {
  provider: PromptProvider.ANTHROPIC,
  section: PromptSection.INSTRUCTIONS,
  maxTokens: 2000,
});
```

### 5. Execution

Skills are executed with personas:

```typescript
import { createSkillRuntime } from '@pcl/sdk/skills';

const skillRuntime = createSkillRuntime();
const state = await skillRuntime.loadPersonaSkills({
  ...personaConfig,
  skillRefs: ['code-review', '@acme/dev/testing'],
});

const systemPrompt = skillRuntime.buildSystemPromptWithSkills(
  basePrompt,
  state.loadedSkills,
  'anthropic'
);
```

---

## Core Components

### SkillLoader

Parses Claude Code SKILL.md format:

```typescript
import { parseSkillMd, toSkillMd } from '@pcl/sdk/skills';

// Parse SKILL.md
const skill = parseSkillMd(mdContent);

// Convert back to SKILL.md
const mdOutput = toSkillMd(skill);
```

**SKILL.md Format:**

```markdown
---
name: skill-name
description: Skill description
allowed-tools:
  - Read
  - Write
user-invocable: true
---

# Skill Instructions

Your detailed instructions here.

## Examples

### Example 1

\`\`\`typescript
// Example code
\`\`\`
```

### SkillCompiler

Validates and compiles skills:

```typescript
import { SkillCompiler } from '@pcl/sdk/skills';

const compiler = new SkillCompiler();

// Compile single skill
const result = compiler.compile(skill);

// Compile multiple skills
const results = compiler.compileMany(skills);
```

**Validation Rules:**

- Name: required, must match `^[a-zA-Z][a-zA-Z0-9-_]*$`
- Description: required
- Instructions: required, minimum 50 characters (warning)

**Compilation Output:**

```typescript
interface CompiledSkill {
  skill: PCLSkill;
  hash: string; // SHA-256 hash (16 chars)
  metadata: {
    compiledAt: Date;
    tokenCount: number;
    instructionsLength: number;
    exampleCount: number;
    toolCount: number;
    dependencyCount: number;
  };
  resolvedDependencies: string[];
}
```

### SkillMerger

Combines multiple skills:

```typescript
import { SkillMerger, ConflictStrategy, ProviderFormat } from '@pcl/sdk/skills';

const merger = new SkillMerger();

const result = merger.merge(compiledSkills, {
  conflictStrategy: ConflictStrategy.OVERRIDE,
  format: ProviderFormat.CLAUDE_XML,
  includeExamples: true,
  includeTools: true,
  maxTokens: 2000,
  progressiveDisclosure: true,
  priority: ['skill-1', 'skill-2'],
});
```

**Conflict Strategies:**

- `OVERRIDE`: Later skills override earlier ones
- `MERGE`: Combine instructions from all skills
- `SKIP`: Skip conflicting skills
- `ERROR`: Throw error on conflict

**Provider Formats:**

- `CLAUDE_XML`: Claude-style XML tags
- `GPT_MARKDOWN`: GPT-style Markdown
- `PLAIN_TEXT`: Plain text format
- `JSON`: JSON format

### SkillResolver

Resolves skill references:

```typescript
import { SkillResolver, SkillRefType } from '@pcl/sdk/skills';

const resolver = new SkillResolver({
  baseDir: process.cwd(),
  claudeSkillsDir: '.claude/skills',
  stdlibDir: 'stdlib/skills',
  cache: true,
  allowRemote: false,
});

// Resolve single skill
const result = await resolver.resolve('@acme/dev/code-review');

// Resolve multiple skills
const results = await resolver.resolveMany([
  'skill-1',
  '@org/package/skill-2',
  'https://example.com/skill-3.md',
]);
```

**Reference Types:**

- **Local**: `./skills/my-skill.md`
- **Registry**: `@org/package/skill@1.0.0`
- **Stdlib**: `code-review`
- **Remote**: `https://example.com/skill.md`

### SkillContext

Manages skill lifecycle with caching:

```typescript
import { createSkillContext, LoadingStrategy } from '@pcl/sdk/skills';

const context = createSkillContext({
  loadingStrategy: LoadingStrategy.LAZY,
  maxCacheSize: 100,
  enableLRU: true,
});

// Load skill
const result = await context.load('code-review');

// Get from cache
const cached = context.get('code-review');

// Activate/deactivate
context.activate('code-review');
context.deactivate('code-review');

// Get statistics
const stats = context.getStats();
```

**Loading Strategies:**

- `EAGER`: Load all skills immediately
- `LAZY`: Load skills when first accessed
- `ON_DEMAND`: Load skills based on usage patterns

### PromptIntegration

Integrates skills into system prompts:

```typescript
import { PromptIntegration, PromptProvider, PromptSection } from '@pcl/sdk/skills';

const integration = new PromptIntegration();

const result = integration.integrate(basePrompt, compiledSkills, {
  provider: PromptProvider.ANTHROPIC,
  section: PromptSection.INSTRUCTIONS,
  maxTokens: 2000,
  includeExamples: true,
  includeTools: true,
  progressiveDisclosure: true,
});
```

**Prompt Sections:**

- `PREAMBLE`: Before main instructions
- `INSTRUCTIONS`: Main instruction section
- `POSTAMBLE`: After main instructions
- `EXAMPLES`: Examples section
- `TOOLS`: Tool/capability section

### SkillRuntimeIntegration

Connects skills to personas:

```typescript
import { createSkillRuntime } from '@pcl/sdk/skills';

const skillRuntime = createSkillRuntime({
  loadingStrategy: LoadingStrategy.LAZY,
  enableCache: true,
  maxSkillTokens: 2000,
  progressiveDisclosure: true,
});

// Load persona skills
const state = await skillRuntime.loadPersonaSkills({
  ...personaConfig,
  skillRefs: ['code-review', 'testing'],
});

// Build enhanced prompt
const systemPrompt = skillRuntime.buildSystemPromptWithSkills(
  basePrompt,
  state.loadedSkills,
  'anthropic'
);

// Get skill tools
const tools = skillRuntime.getSkillTools(state.loadedSkills);
```

---

## Usage Examples

### Example 1: Load and Compile a Skill

```typescript
import { loadSkillFromFile, SkillCompiler } from '@pcl/sdk/skills';

// Load skill
const skill = await loadSkillFromFile('.claude/skills/code-review.md');

// Compile skill
const compiler = new SkillCompiler();
const result = compiler.compile(skill);

if (result.success) {
  console.log('✓ Skill compiled successfully');
  console.log('  Hash:', result.skill!.hash);
  console.log('  Tokens:', result.skill!.metadata.tokenCount);
  console.log('  Tools:', result.skill!.skill.tools?.join(', ') || 'none');
} else {
  console.error('✗ Compilation failed:', result.errors);
}
```

### Example 2: Merge Multiple Skills

```typescript
import { SkillCompiler, SkillMerger, ConflictStrategy, ProviderFormat } from '@pcl/sdk/skills';

const compiler = new SkillCompiler();
const merger = new SkillMerger();

// Compile skills
const skill1 = compiler.compile(await loadSkillFromFile('skill1.md')).skill!;
const skill2 = compiler.compile(await loadSkillFromFile('skill2.md')).skill!;
const skill3 = compiler.compile(await loadSkillFromFile('skill3.md')).skill!;

// Merge with priority
const result = merger.merge([skill1, skill2, skill3], {
  conflictStrategy: ConflictStrategy.OVERRIDE,
  format: ProviderFormat.CLAUDE_XML,
  includeExamples: true,
  includeTools: true,
  maxTokens: 3000,
  priority: ['skill3', 'skill1', 'skill2'], // skill3 has highest priority
});

console.log('Merged instructions:');
console.log(result.instructions);
console.log('\nIncluded skills:', result.includedSkills);
console.log('Skipped skills:', result.skippedSkills);
console.log('Total tokens:', result.estimatedTokens);
```

### Example 3: Resolve Registry Skills

```typescript
import { SkillResolver } from '@pcl/sdk/skills';

const resolver = new SkillResolver({
  registry: registryManager,
  cache: true,
});

// Resolve from registry
const result = await resolver.resolve('@acme/dev/code-review@1.0.0');

if (result.ok) {
  console.log('✓ Resolved skill:', result.value.skill.name);
  console.log('  Source:', result.value.source);
  console.log('  Cached:', result.value.cached);
} else {
  console.error('✗ Resolution failed:', result.error.message);
}
```

### Example 4: Persona with Skills

```typescript
import { createSkillRuntime } from '@pcl/sdk/skills';
import { PersonaInstance } from '@pcl/sdk/runtime';

const skillRuntime = createSkillRuntime();

// Create persona with skills
const persona = new PersonaInstance('developer', 'Developer Persona', {
  intent: 'Assist with software development',
  skills: ['code-review', 'testing', '@acme/dev/debugging'],
});

// Load persona skills
const skillState = await skillRuntime.loadPersonaSkills({
  ...persona.getState().config,
  skillRefs: persona.getState().config.skills as string[],
});

// Build enhanced system prompt
const basePrompt = buildBasePrompt(persona.getState().config);
const enhancedPromptResult = skillRuntime.buildSystemPromptWithSkills(
  basePrompt,
  skillState.loadedSkills,
  'anthropic'
);

if (enhancedPromptResult.ok) {
  console.log('✓ Enhanced prompt ready');
  console.log('  Loaded skills:', skillState.includedSkills);
  console.log('  Total skill tokens:', skillState.totalSkillTokens);
}
```

### Example 5: Progressive Disclosure

```typescript
import { SkillMerger, ProviderFormat, ConflictStrategy } from '@pcl/sdk/skills';

const merger = new SkillMerger();

// Merge with token budget
const result = merger.merge(compiledSkills, {
  conflictStrategy: ConflictStrategy.OVERRIDE,
  format: ProviderFormat.CLAUDE_XML,
  includeExamples: false, // Exclude examples to save tokens
  includeTools: true,
  maxTokens: 1000, // Strict budget
  progressiveDisclosure: true, // Only load essential skills
});

console.log('Included skills:', result.includedSkills);
console.log('Skipped skills:', result.skippedSkills);
console.log('Tokens used:', result.estimatedTokens);

if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

---

## Best Practices

### 1. Skill Organization

**Structure skills by domain:**

```
.claude/
├── skills/
│   ├── coding/
│   │   ├── code-review.md
│   │   ├── testing.md
│   │   └── debugging.md
│   ├── analysis/
│   │   ├── data-analysis.md
│   │   └── research.md
│   └── writing/
│       ├── documentation.md
│       └── content-creation.md
```

### 2. Skill Naming

**Follow naming conventions:**

- Use lowercase with hyphens: `code-review`, `data-analysis`
- Be descriptive: `python-testing` not `test`
- Namespace complex skills: `@company/team/skill-name`

### 3. Token Management

**Monitor token usage:**

```typescript
const result = merger.merge(skills, {
  maxTokens: 2000,
  progressiveDisclosure: true,
});

if (result.estimatedTokens > 2000) {
  console.warn('Exceeded token budget!');
}
```

### 4. Caching Strategy

**Use appropriate loading strategies:**

```typescript
// For frequently used skills
const context = createSkillContext({
  loadingStrategy: LoadingStrategy.EAGER,
  maxCacheSize: 50,
});

// For large skill libraries
const context = createSkillContext({
  loadingStrategy: LoadingStrategy.LAZY,
  enableLRU: true,
});
```

### 5. Error Handling

**Always check results:**

```typescript
const result = await resolver.resolve('skill-name');

if (!result.ok) {
  console.error('Failed to resolve skill:', result.error.message);
  // Fallback to default skill or skip
  return;
}

const skill = result.value.skill;
```

### 6. Version Management

**Use explicit versions for stability:**

```typescript
// Good: Explicit version
await resolver.resolve('@acme/dev/code-review@1.2.0');

// Risky: Latest version (may break)
await resolver.resolve('@acme/dev/code-review');
```

---

## API Reference

### Types

```typescript
// Skill definition
interface PCLSkill {
  name: string;
  version?: string;
  description: string;
  category?: string;
  instructions: string;
  examples?: Array<{ description: string; code: string }>;
  tools?: string[];
  dependencies?: string[];
  metadata?: Record<string, any>;
  config?: Record<string, any>;
}

// Compiled skill
interface CompiledSkill {
  skill: PCLSkill;
  hash: string;
  metadata: SkillCompilationMetadata;
  resolvedDependencies: string[];
}

// Merge result
interface MergedSkillResult {
  instructions: string;
  examples: Array<{ description: string; code: string }>;
  tools: string[];
  estimatedTokens: number;
  includedSkills: string[];
  skippedSkills: string[];
  warnings: string[];
}

// Resolution result
interface SkillResolutionResult {
  skill: PCLSkill;
  source: string;
  type: SkillRefType;
  cached: boolean;
}

// Integration result
interface IntegratedPromptResult {
  systemPrompt: string;
  includedSkills: string[];
  skippedSkills: string[];
  totalTokens: number;
  warnings: string[];
}
```

### Enums

```typescript
// Conflict resolution
enum ConflictStrategy {
  OVERRIDE = 'override',
  MERGE = 'merge',
  ERROR = 'error',
  SKIP = 'skip',
}

// Provider formats
enum ProviderFormat {
  CLAUDE_XML = 'claude-xml',
  GPT_MARKDOWN = 'gpt-markdown',
  PLAIN_TEXT = 'plain-text',
  JSON = 'json',
}

// Loading strategies
enum LoadingStrategy {
  EAGER = 'eager',
  LAZY = 'lazy',
  ON_DEMAND = 'on-demand',
}

// Prompt providers
enum PromptProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  OLLAMA = 'ollama',
  AZURE = 'azure',
  BEDROCK = 'bedrock',
  MOCK = 'mock',
}

// Prompt sections
enum PromptSection {
  PREAMBLE = 'preamble',
  INSTRUCTIONS = 'instructions',
  POSTAMBLE = 'postamble',
  EXAMPLES = 'examples',
  TOOLS = 'tools',
}
```

---

## Related Documentation

- [Skills Integration Guide](SKILLS_INTEGRATION_GUIDE.md)
- [Persona Building Guide](PERSONA_BUILDING_GUIDE.md)
- [Runtime API Reference](api/runtime.md)
- [Registry System](REGISTRY.md)

---

**Last Updated**: January 2026
**Version**: 1.0.0
