/**
 * Integration tests for complete skill pipeline
 */

import { describe, it, expect } from 'vitest';
import { parseSkillMd } from '../../src/skills/skill-loader';
import { SkillCompiler } from '../../src/skills/skill-compiler';
import { SkillMerger, ConflictStrategy, ProviderFormat } from '../../src/skills/skill-merger';
import { PromptIntegration, PromptProvider, PromptSection } from '../../src/skills/prompt-integration';

describe('Skill Integration', () => {
  const compiler = new SkillCompiler();
  const merger = new SkillMerger();
  const promptIntegration = new PromptIntegration();

  it('should load, compile, merge, and integrate skills into prompt', () => {
    // 1. Parse skill from SKILL.md format
    const skillMd = `---
name: test-skill
description: A test skill for integration testing
allowed-tools:
  - Read
  - Write
---

You are an expert at testing skills.

## Instructions

Follow these steps:
1. Test thoroughly
2. Validate results
3. Report findings

## Examples

### Simple test

\`\`\`
console.log("test");
\`\`\`
`;

    const skill = parseSkillMd(skillMd);

    expect(skill.name).toBe('test-skill');
    expect(skill.tools).toHaveLength(2);
    expect(skill.examples).toHaveLength(1);

    // 2. Compile skill
    const compileResult = compiler.compile(skill);

    expect(compileResult.success).toBe(true);
    expect(compileResult.skill).toBeDefined();
    expect(compileResult.skill!.hash).toBeDefined();
    expect(compileResult.skill!.metadata.tokenCount).toBeGreaterThan(0);

    // 3. Merge skills (just one in this case)
    const mergeResult = merger.merge([compileResult.skill!], {
      conflictStrategy: ConflictStrategy.OVERRIDE,
      format: ProviderFormat.CLAUDE_XML,
      includeExamples: true,
      includeTools: true,
    });

    expect(mergeResult.includedSkills).toContain('test-skill');
    expect(mergeResult.instructions).toContain('<skill name="test-skill">');
    expect(mergeResult.tools).toHaveLength(2);

    // 4. Integrate into system prompt
    const basePrompt = 'You are a helpful assistant.';

    const integrationResult = promptIntegration.integrate(
      basePrompt,
      [compileResult.skill!],
      {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        includeExamples: true,
        includeTools: true,
      }
    );

    expect(integrationResult.systemPrompt).toContain(basePrompt);
    expect(integrationResult.systemPrompt).toContain('<skills>');
    expect(integrationResult.systemPrompt).toContain('test-skill');
    expect(integrationResult.includedSkills).toContain('test-skill');
    expect(integrationResult.totalTokens).toBeGreaterThan(0);
  });

  it('should handle multiple skills with different providers', () => {
    const skill1Md = `---
name: skill-1
description: First skill
---

Instructions for skill 1.
`;

    const skill2Md = `---
name: skill-2
description: Second skill
---

Instructions for skill 2.
`;

    const skill1 = parseSkillMd(skill1Md);
    const skill2 = parseSkillMd(skill2Md);

    const compiled1 = compiler.compile(skill1).skill!;
    const compiled2 = compiler.compile(skill2).skill!;

    // Test with different providers
    const providers = [
      PromptProvider.ANTHROPIC,
      PromptProvider.OPENAI,
      PromptProvider.GEMINI,
    ];

    for (const provider of providers) {
      const result = promptIntegration.integrate(
        'Base prompt',
        [compiled1, compiled2],
        {
          provider,
          section: PromptSection.INSTRUCTIONS,
          includeExamples: true,
          includeTools: true,
        }
      );

      expect(result.includedSkills).toHaveLength(2);
      expect(result.systemPrompt).toContain('Base prompt');
      expect(result.systemPrompt).toContain('skill-1');
      expect(result.systemPrompt).toContain('skill-2');
    }
  });

  it('should respect token budgets', () => {
    const longInstructions = 'A'.repeat(1000);

    const skill = parseSkillMd(`---
name: long-skill
description: A skill with long instructions
---

${longInstructions}
`);

    const compiled = compiler.compile(skill).skill!;

    const result = promptIntegration.integrate(
      'Base prompt',
      [compiled],
      {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        maxTokens: 50, // Very low budget
        includeExamples: true,
        includeTools: true,
        progressiveDisclosure: true,
      }
    );

    // Should warn about exceeding budget
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should insert skills in different sections', () => {
    const skill = compiler.compile({
      name: 'test-skill',
      description: 'Test skill',
      instructions: 'Test instructions',
    }).skill!;

    const sections = [
      PromptSection.PREAMBLE,
      PromptSection.INSTRUCTIONS,
      PromptSection.POSTAMBLE,
    ];

    for (const section of sections) {
      const result = promptIntegration.integrate(
        'Base prompt',
        [skill],
        {
          provider: PromptProvider.ANTHROPIC,
          section,
          includeExamples: true,
          includeTools: true,
        }
      );

      expect(result.systemPrompt).toContain('Base prompt');
      expect(result.systemPrompt).toContain('test-skill');
    }
  });
});
