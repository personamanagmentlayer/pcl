/**
 * Tests for Skill Compiler
 */

import { describe, it, expect } from 'vitest';
import { SkillCompiler } from '../../src/skills/skill-compiler';
import type { PCLSkill } from '../../src/skills/skill-loader';

describe('SkillCompiler', () => {
  const compiler = new SkillCompiler();

  describe('compile', () => {
    it('should compile a valid skill', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'This is a test skill with sufficient instructions to pass validation.',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill!.skill.name).toBe('test-skill');
      expect(result.skill!.hash).toBeDefined();
      expect(result.skill!.hash).toHaveLength(16);
      expect(result.skill!.metadata.compiledAt).toBeInstanceOf(Date);
    });

    it('should reject skill without name', () => {
      const skill: PCLSkill = {
        name: '',
        description: 'A test skill',
        instructions: 'Test instructions',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Skill must have a name');
    });

    it('should reject skill without description', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: '',
        instructions: 'Test instructions',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Skill must have a description');
    });

    it('should reject skill without instructions', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: '',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Skill must have instructions');
    });

    it('should reject skill with invalid name pattern', () => {
      const skill: PCLSkill = {
        name: '123-invalid',
        description: 'A test skill',
        instructions: 'Test instructions with sufficient length',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid skill name');
    });

    it('should warn about short instructions', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Short',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Instructions are very short (<50 chars). Consider adding more detail.');
    });

    it('should warn about missing examples', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions with sufficient length for validation',
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No examples provided. Examples help users understand usage.');
    });

    it('should compile skill with examples', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions with sufficient length',
        examples: [
          { description: 'Example 1', code: 'console.log("test")' },
        ],
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(true);
      expect(result.skill!.metadata.exampleCount).toBe(1);
    });

    it('should compile skill with tools', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions with sufficient length',
        tools: ['Read', 'Write', 'Bash'],
      };

      const result = compiler.compile(skill);

      expect(result.success).toBe(true);
      expect(result.skill!.metadata.toolCount).toBe(3);
    });

    it('should generate consistent hashes for same content', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions',
      };

      const result1 = compiler.compile(skill);
      const result2 = compiler.compile(skill);

      expect(result1.skill!.hash).toBe(result2.skill!.hash);
    });

    it('should generate different hashes for different content', () => {
      const skill1: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions 1',
      };

      const skill2: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions 2',
      };

      const result1 = compiler.compile(skill1);
      const result2 = compiler.compile(skill2);

      expect(result1.skill!.hash).not.toBe(result2.skill!.hash);
    });

    it('should estimate token count', () => {
      const skill: PCLSkill = {
        name: 'test-skill',
        description: 'A test skill',
        instructions: 'Test instructions with sufficient length for token estimation',
      };

      const result = compiler.compile(skill);

      expect(result.skill!.metadata.tokenCount).toBeGreaterThan(0);
      // Rough estimate: 1 token ~= 4 characters
      const expectedTokens = Math.ceil(skill.instructions.length / 4);
      expect(result.skill!.metadata.tokenCount).toBeCloseTo(expectedTokens, 10);
    });
  });

  describe('compileMany', () => {
    it('should compile multiple skills', () => {
      const skills: PCLSkill[] = [
        {
          name: 'skill-1',
          description: 'First skill',
          instructions: 'Instructions for first skill',
        },
        {
          name: 'skill-2',
          description: 'Second skill',
          instructions: 'Instructions for second skill',
        },
      ];

      const results = compiler.compileMany(skills);

      expect(results.size).toBe(2);
      expect(results.get('skill-1')!.success).toBe(true);
      expect(results.get('skill-2')!.success).toBe(true);
    });
  });
});
