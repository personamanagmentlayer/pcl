/**
 * Tests for Skill Merger
 */

import { SkillMerger, ConflictStrategy, ProviderFormat } from '../../src/skills/skill-merger';
import { SkillCompiler } from '../../src/skills/skill-compiler';
import type { PCLSkill } from '../../src/skills/skill-loader';

describe('SkillMerger', () => {
  const merger = new SkillMerger();
  const compiler = new SkillCompiler();

  const createTestSkill = (name: string, instructions: string): PCLSkill => ({
    name,
    description: `Test skill: ${name}`,
    instructions,
  });

  describe('merge', () => {
    it('should merge multiple skills', () => {
      const skill1 = compiler.compile(
        createTestSkill('skill-1', 'Instructions for skill 1')
      ).skill!;
      const skill2 = compiler.compile(
        createTestSkill('skill-2', 'Instructions for skill 2')
      ).skill!;

      const result = merger.merge([skill1, skill2], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.includedSkills).toHaveLength(2);
      expect(result.includedSkills).toContain('skill-1');
      expect(result.includedSkills).toContain('skill-2');
      expect(result.instructions).toContain('skill-1');
      expect(result.instructions).toContain('skill-2');
    });

    it('should format skills for Claude XML', () => {
      const skill = compiler.compile(
        createTestSkill('test-skill', 'Test instructions')
      ).skill!;

      const result = merger.merge([skill], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.CLAUDE_XML,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.instructions).toContain('<skill name="test-skill">');
      expect(result.instructions).toContain('<description>');
      expect(result.instructions).toContain('<instructions>');
      expect(result.instructions).toContain('</skill>');
    });

    it('should format skills for GPT Markdown', () => {
      const skill = compiler.compile(
        createTestSkill('test-skill', 'Test instructions')
      ).skill!;

      const result = merger.merge([skill], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.GPT_MARKDOWN,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.instructions).toContain('## Skill: test-skill');
      expect(result.instructions).toContain('**Description:**');
      expect(result.instructions).toContain('### Instructions');
    });

    it('should include examples when requested', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'Test skill',
        instructions: 'Test instructions',
        examples: [
          { description: 'Example 1', code: 'console.log("test")' },
        ],
      };

      const compiled = compiler.compile(skill).skill!;

      const result = merger.merge([compiled], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.examples).toHaveLength(1);
      expect(result.examples[0].description).toContain('[test-skill]');
    });

    it('should exclude examples when not requested', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'Test skill',
        instructions: 'Test instructions',
        examples: [
          { description: 'Example 1', code: 'console.log("test")' },
        ],
      };

      const compiled = compiler.compile(skill).skill!;

      const result = merger.merge([compiled], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: false,
        includeTools: true,
      });

      expect(result.examples).toHaveLength(0);
    });

    it('should merge tools from multiple skills', () => {
      const skill1: PCLSkill = {
        name: 'skill-1',
        description: 'First skill',
        instructions: 'Instructions',
        tools: ['Read', 'Write'],
      };

      const skill2: PCLSkill = {
        name: 'skill-2',
        description: 'Second skill',
        instructions: 'Instructions',
        tools: ['Write', 'Bash'],
      };

      const compiled1 = compiler.compile(skill1).skill!;
      const compiled2 = compiler.compile(skill2).skill!;

      const result = merger.merge([compiled1, compiled2], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.tools).toHaveLength(3);
      expect(result.tools).toContain('Read');
      expect(result.tools).toContain('Write');
      expect(result.tools).toContain('Bash');
    });

    it('should respect priority order', () => {
      const skill1 = compiler.compile(
        createTestSkill('skill-1', 'Instructions 1')
      ).skill!;
      const skill2 = compiler.compile(
        createTestSkill('skill-2', 'Instructions 2')
      ).skill!;

      const result = merger.merge([skill1, skill2], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
        priority: ['skill-2', 'skill-1'],
      });

      // Higher priority skills should appear later
      const skill1Index = result.instructions.indexOf('skill-1');
      const skill2Index = result.instructions.indexOf('skill-2');
      expect(skill2Index).toBeGreaterThan(skill1Index);
    });

    it('should enforce token budget with progressive disclosure', () => {
      const skill1 = compiler.compile(
        createTestSkill('skill-1', 'A'.repeat(100))
      ).skill!;
      const skill2 = compiler.compile(
        createTestSkill('skill-2', 'B'.repeat(100))
      ).skill!;

      const result = merger.merge([skill1, skill2], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
        maxTokens: 30, // Very low budget
        progressiveDisclosure: true,
      });

      // Should only include skills that fit within budget
      expect(result.includedSkills.length).toBeLessThan(2);
      expect(result.skippedSkills.length).toBeGreaterThan(0);
    });

    it('should estimate total tokens', () => {
      const skill = compiler.compile(
        createTestSkill('test-skill', 'Test instructions')
      ).skill!;

      const result = merger.merge([skill], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('conflict resolution', () => {
    it('should skip conflicting skills with SKIP strategy', () => {
      const skill1 = compiler.compile(
        createTestSkill('test-skill', 'Instructions 1')
      ).skill!;
      const skill2 = compiler.compile(
        createTestSkill('test-skill', 'Instructions 2')
      ).skill!;

      const result = merger.merge([skill1, skill2], {
        conflictStrategy: ConflictStrategy.SKIP,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      expect(result.skippedSkills).toContain('test-skill');
    });

    it('should override with OVERRIDE strategy', () => {
      const skill1 = compiler.compile(
        createTestSkill('test-skill', 'Instructions 1')
      ).skill!;
      const skill2 = compiler.compile(
        createTestSkill('test-skill', 'Instructions 2')
      ).skill!;

      const result = merger.merge([skill1, skill2], {
        conflictStrategy: ConflictStrategy.OVERRIDE,
        format: ProviderFormat.PLAIN_TEXT,
        includeExamples: true,
        includeTools: true,
      });

      // Should include both skills (later overrides earlier)
      expect(result.includedSkills).toContain('test-skill');
      expect(result.instructions).toContain('Instructions 2');
    });
  });
});
