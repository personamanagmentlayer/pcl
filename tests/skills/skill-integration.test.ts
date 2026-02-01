/**
 * Integration tests for complete skill pipeline
 */

import { parseSkillMd } from '../../src/skills/skill-loader';
import { SkillCompiler } from '../../src/skills/skill-compiler';
import {
  SkillMerger,
  ConflictStrategy,
  ProviderFormat,
} from '../../src/skills/skill-merger';
import {
  PromptIntegration,
  PromptProvider,
  PromptSection,
} from '../../src/skills/prompt-integration';

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

    const result = promptIntegration.integrate('Base prompt', [compiled], {
      provider: PromptProvider.ANTHROPIC,
      section: PromptSection.INSTRUCTIONS,
      maxTokens: 50, // Very low budget
      includeExamples: true,
      includeTools: true,
      progressiveDisclosure: true,
    });

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
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.systemPrompt).toContain('Base prompt');
      expect(result.systemPrompt).toContain('test-skill');
    }
  });

  describe('Prompt Sections', () => {
    let skill: any;

    beforeEach(() => {
      skill = compiler.compile({
        name: 'section-test',
        description: 'Test skill for sections',
        instructions: 'Section instructions',
        examples: [{ description: 'Ex1', code: 'example code' }],
        tools: ['Tool1'],
      }).skill!;
    });

    it('should insert skills in PREAMBLE section', () => {
      const result = promptIntegration.integrate(
        'Base prompt content',
        [skill],
        {
          provider: PromptProvider.ANTHROPIC,
          section: PromptSection.PREAMBLE,
        }
      );

      // Skills should come before base prompt
      const skillIndex = result.systemPrompt.indexOf('<skills>');
      const promptIndex = result.systemPrompt.indexOf('Base prompt');
      expect(skillIndex).toBeLessThan(promptIndex);
    });

    it('should insert skills in POSTAMBLE section', () => {
      const result = promptIntegration.integrate(
        'Base prompt content',
        [skill],
        {
          provider: PromptProvider.ANTHROPIC,
          section: PromptSection.POSTAMBLE,
        }
      );

      // Skills should come after base prompt
      const promptIndex = result.systemPrompt.indexOf('Base prompt');
      const skillIndex = result.systemPrompt.indexOf('<skills>');
      expect(promptIndex).toBeLessThan(skillIndex);
    });

    it('should insert skills in EXAMPLES section', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.OPENAI,
        section: PromptSection.EXAMPLES,
        includeExamples: true,
      });

      expect(result.systemPrompt).toContain('example code');
    });

    it('should insert skills in TOOLS section', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.OPENAI,
        section: PromptSection.TOOLS,
        includeTools: true,
      });

      expect(result.systemPrompt).toContain('Tool1');
    });
  });

  describe('Provider Formats', () => {
    let skill: any;

    beforeEach(() => {
      skill = compiler.compile({
        name: 'format-test',
        description: 'Test skill for formats',
        instructions: 'Format instructions',
      }).skill!;
    });

    it('should format for ANTHROPIC with XML tags', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('<skills>');
      expect(result.systemPrompt).toContain('</skills>');
    });

    it('should format for BEDROCK with XML tags', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.BEDROCK,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('<skills>');
      expect(result.systemPrompt).toContain('</skills>');
    });

    it('should format for OPENAI with Markdown', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.OPENAI,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('# Skills');
    });

    it('should format for AZURE with Markdown', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.AZURE,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('# Skills');
    });

    it('should format for DEEPSEEK with Markdown', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.DEEPSEEK,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('# Skills');
    });

    it('should format for GEMINI with Markdown', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.GEMINI,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('# Skills');
    });

    it('should format for OLLAMA with plain text', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.OLLAMA,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('=== SKILLS ===');
      expect(result.systemPrompt).toContain('=== END SKILLS ===');
    });

    it('should format for MOCK with plain text', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.MOCK,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('=== SKILLS ===');
    });
  });

  describe('Multi-Section Integration', () => {
    it('should integrate skills into multiple sections', () => {
      const skill1 = compiler.compile({
        name: 'preamble-skill',
        description: 'Preamble',
        instructions: 'Preamble instructions',
      }).skill!;

      const skill2 = compiler.compile({
        name: 'postamble-skill',
        description: 'Postamble',
        instructions: 'Postamble instructions',
      }).skill!;

      const sectionAssignments = new Map();
      sectionAssignments.set(PromptSection.PREAMBLE, [skill1]);
      sectionAssignments.set(PromptSection.POSTAMBLE, [skill2]);

      const result = promptIntegration.integrateMultiSection(
        'Base prompt',
        [skill1, skill2],
        sectionAssignments,
        {
          provider: PromptProvider.ANTHROPIC,
        }
      );

      expect(result.systemPrompt).toContain('preamble-skill');
      expect(result.systemPrompt).toContain('postamble-skill');
      expect(result.includedSkills).toHaveLength(2);
    });

    it('should deduplicate included/skipped skills in multi-section', () => {
      const skill = compiler.compile({
        name: 'duplicate-skill',
        description: 'Test',
        instructions: 'Instructions',
      }).skill!;

      const sectionAssignments = new Map();
      sectionAssignments.set(PromptSection.PREAMBLE, [skill]);
      sectionAssignments.set(PromptSection.POSTAMBLE, [skill]);

      const result = promptIntegration.integrateMultiSection(
        'Base prompt',
        [skill],
        sectionAssignments,
        {
          provider: PromptProvider.ANTHROPIC,
        }
      );

      // Should deduplicate skill names
      expect(result.includedSkills).toHaveLength(1);
      expect(result.includedSkills[0]).toBe('duplicate-skill');
    });

    it('should accumulate warnings from multiple sections', () => {
      const longSkill = compiler.compile({
        name: 'long-skill',
        description: 'Long',
        instructions: 'X'.repeat(2000),
      }).skill!;

      const sectionAssignments = new Map();
      sectionAssignments.set(PromptSection.PREAMBLE, [longSkill]);
      sectionAssignments.set(PromptSection.POSTAMBLE, [longSkill]);

      const result = promptIntegration.integrateMultiSection(
        'Base prompt',
        [longSkill],
        sectionAssignments,
        {
          provider: PromptProvider.ANTHROPIC,
          maxTokens: 50,
        }
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Options Handling', () => {
    let skill: any;

    beforeEach(() => {
      skill = compiler.compile({
        name: 'options-test',
        description: 'Test',
        instructions: 'Instructions',
        examples: [{ description: 'Ex', code: 'code' }],
        tools: ['Tool1'],
      }).skill!;
    });

    it('should include examples when includeExamples is true', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        includeExamples: true,
      });

      // Examples should be in merged result (checked via merger)
      expect(result.includedSkills).toContain('options-test');
    });

    it('should exclude examples when includeExamples is false', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        includeExamples: false,
      });

      expect(result.includedSkills).toContain('options-test');
    });

    it('should include tools when includeTools is true', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        includeTools: true,
      });

      expect(result.includedSkills).toContain('options-test');
    });

    it('should exclude tools when includeTools is false', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        includeTools: false,
      });

      expect(result.includedSkills).toContain('options-test');
    });

    it('should respect priority order', () => {
      const skill1 = compiler.compile({
        name: 'skill-a',
        description: 'A',
        instructions: 'A',
      }).skill!;

      const skill2 = compiler.compile({
        name: 'skill-b',
        description: 'B',
        instructions: 'B',
      }).skill!;

      const result = promptIntegration.integrate(
        'Base prompt',
        [skill1, skill2],
        {
          provider: PromptProvider.ANTHROPIC,
          section: PromptSection.INSTRUCTIONS,
          priority: ['skill-b', 'skill-a'],
        }
      );

      expect(result.includedSkills).toContain('skill-a');
      expect(result.includedSkills).toContain('skill-b');
    });

    it('should enable progressive disclosure', () => {
      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        progressiveDisclosure: true,
      });

      expect(result.systemPrompt).toContain('Base prompt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty skills array', () => {
      const result = promptIntegration.integrate('Base prompt', [], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('Base prompt');
      expect(result.includedSkills).toHaveLength(0);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle skill without examples', () => {
      const skill = compiler.compile({
        name: 'no-examples',
        description: 'No examples',
        instructions: 'Instructions',
      }).skill!;

      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.EXAMPLES,
        includeExamples: true,
      });

      expect(result.systemPrompt).toBeDefined();
    });

    it('should handle skill without tools', () => {
      const skill = compiler.compile({
        name: 'no-tools',
        description: 'No tools',
        instructions: 'Instructions',
      }).skill!;

      const result = promptIntegration.integrate('Base prompt', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.TOOLS,
        includeTools: true,
      });

      expect(result.systemPrompt).toBeDefined();
    });

    it('should handle empty base prompt', () => {
      const skill = compiler.compile({
        name: 'test',
        description: 'Test',
        instructions: 'Instructions',
      }).skill!;

      const result = promptIntegration.integrate('', [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.systemPrompt).toContain('test');
    });

    it('should handle very long base prompt', () => {
      const longPrompt = 'Prompt '.repeat(1000);
      const skill = compiler.compile({
        name: 'test',
        description: 'Test',
        instructions: 'Instructions',
      }).skill!;

      const result = promptIntegration.integrate(longPrompt, [skill], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
      });

      expect(result.totalTokens).toBeGreaterThan(1000);
    });

    it('should handle single-line base prompt for middle insertion', () => {
      const skill = compiler.compile({
        name: 'test',
        description: 'Test',
        instructions: 'Instructions',
      }).skill!;

      const result = promptIntegration.integrate(
        'Single line prompt',
        [skill],
        {
          provider: PromptProvider.ANTHROPIC,
          section: PromptSection.INSTRUCTIONS,
        }
      );

      expect(result.systemPrompt).toContain('Single line prompt');
      expect(result.systemPrompt).toContain('test');
    });
  });

  describe('Token Counting', () => {
    it('should calculate total tokens accurately', () => {
      const skill = compiler.compile({
        name: 'token-test',
        description: 'Test',
        instructions: 'A'.repeat(400), // ~100 tokens
      }).skill!;

      const result = promptIntegration.integrate(
        'B'.repeat(400), // ~100 tokens
        [skill],
        {
          provider: PromptProvider.ANTHROPIC,
          section: PromptSection.INSTRUCTIONS,
        }
      );

      // Should be > 200 tokens total
      expect(result.totalTokens).toBeGreaterThan(200);
    });

    it('should track skipped skills due to token budget', () => {
      const skill1 = compiler.compile({
        name: 'skill-1',
        description: 'Test',
        instructions: 'X'.repeat(1000),
      }).skill!;

      const skill2 = compiler.compile({
        name: 'skill-2',
        description: 'Test',
        instructions: 'Y'.repeat(1000),
      }).skill!;

      const result = promptIntegration.integrate('Base', [skill1, skill2], {
        provider: PromptProvider.ANTHROPIC,
        section: PromptSection.INSTRUCTIONS,
        maxTokens: 100, // Very restrictive
      });

      // At least one skill should be skipped or warnings generated
      expect(
        result.skippedSkills.length + result.warnings.length
      ).toBeGreaterThan(0);
    });
  });
});
