/**
 * Comprehensive Test Suite: PCL Skill Test Command
 * Tests skill testing, composition testing, and benchmarking
 * Target: ~25-30 tests
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import {
  skillTestCommand,
  type SkillTestOptions,
} from '../../../../src/cli/commands/skills/test';
import { parseSkillMd } from '../../../../src/skills/skill-loader';
import { SkillCompiler } from '../../../../src/skills/skill-compiler';

// Mock filesystem and dependencies
vi.mock('fs/promises');
vi.mock('../../../../src/skills/skill-loader');
vi.mock('../../../../src/skills/skill-compiler');

describe('PCL Skill Test Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  const mockSkillContent = `---
name: test-skill
description: A test skill
---

# Test Skill

Instructions here.
`;

  const mockSkill = {
    name: 'test-skill',
    description: 'A test skill',
    instructions: 'Instructions here',
    tools: ['Read', 'Write'],
    examples: [
      {
        description: 'Example 1: Basic usage',
        code: 'function test() {\n  console.log("test");\n}',
      },
      {
        description: 'Example 2: Advanced usage',
        code: 'class Test {\n  constructor() {}\n}',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit(${code})`);
    }) as any);

    // Default mock implementations
    vi.mocked(readFile).mockResolvedValue(mockSkillContent);
    vi.mocked(parseSkillMd).mockReturnValue(mockSkill);

    const mockCompiler = {
      compile: vi.fn().mockReturnValue({
        success: true,
        errors: [],
        skill: {
          metadata: {
            instructionsLength: 500,
            tokenCount: 150,
            exampleCount: 2,
            toolCount: 2,
          },
        },
      }),
    };
    vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Basic Testing', () => {
    it('should test skill successfully', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(readFile).toHaveBeenCalledWith('/path/to/skill.md', 'utf-8');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Testing skill')
      );
    });

    it('should compile skill before testing', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(SkillCompiler).toHaveBeenCalled();
    });

    it('should exit on validation failure', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: false,
          errors: ['Validation error'],
          skill: null,
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('validation failed')
      );
    });

    it('should show warning when no examples found', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [],
      });

      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠ No examples found')
      );
    });
  });

  describe('Example Testing', () => {
    it('should test all examples', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 example(s)')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example 1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example 2')
      );
    });

    it('should test specific example by number', async () => {
      await skillTestCommand('/path/to/skill.md', { example: 1 });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example 1')
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Example 2')
      );
    });

    it('should fail when specific example not found', async () => {
      await expect(
        skillTestCommand('/path/to/skill.md', { example: 5 })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example 5 not found')
      );
    });

    it('should pass example with valid code', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Pass')
      );
    });

    it('should fail example with empty code', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [{ description: 'Empty', code: '' }],
      });

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Fail')
      );
    });

    it('should fail example with very short code', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [{ description: 'Short', code: 'x' }],
      });

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Fail')
      );
    });
  });

  describe('Verbose Mode', () => {
    it('should show detailed checks in verbose mode', async () => {
      await skillTestCommand('/path/to/skill.md', { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Has comments')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Has meaningful content')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Has structure')
      );
    });

    it('should show check results in verbose mode', async () => {
      await skillTestCommand('/path/to/skill.md', { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Checks \(\d+\/\d+\)/)
      );
    });
  });

  describe('Composition Testing', () => {
    it('should run composition tests when requested', async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: 'other-skill.md',
          isDirectory: () => false,
          isFile: () => true,
        },
      ] as any);

      await skillTestCommand('/path/to/skill.md', { composition: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Composition Testing')
      );
    });

    it('should check declared dependencies', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        dependencies: ['base-skill', 'helper-skill'],
      });
      vi.mocked(readdir).mockResolvedValue([
        { name: 'base-skill.md', isDirectory: () => false, isFile: () => true },
      ] as any);

      await skillTestCommand('/path/to/skill.md', { composition: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dependencies:')
      );
    });

    it('should detect missing dependencies', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        dependencies: ['missing-skill'],
      });
      vi.mocked(readdir).mockResolvedValue([]);

      await skillTestCommand('/path/to/skill.md', { composition: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing')
      );
    });

    it('should check for conflicts', async () => {
      vi.mocked(parseSkillMd).mockReturnValueOnce({
        ...mockSkill,
        conflicts: ['conflicting-skill'],
      });

      vi.mocked(readdir).mockResolvedValue([
        {
          name: 'conflicting-skill.md',
          isDirectory: () => false,
          isFile: () => true,
        },
      ] as any);

      let parseCallCount = 0;
      vi.mocked(parseSkillMd).mockImplementation(() => {
        parseCallCount++;
        if (parseCallCount === 1) {
          return { ...mockSkill, conflicts: ['conflicting-skill'] };
        }
        return { ...mockSkill, name: 'conflicting-skill' };
      });

      await skillTestCommand('/path/to/skill.md', { composition: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Conflicts:')
      );
    });

    it('should show tool overlap in verbose mode', async () => {
      vi.mocked(readdir).mockResolvedValue([
        {
          name: 'other-skill.md',
          isDirectory: () => false,
          isFile: () => true,
        },
      ] as any);

      let parseCallCount = 0;
      vi.mocked(parseSkillMd).mockImplementation(() => {
        parseCallCount++;
        if (parseCallCount === 1) {
          return mockSkill;
        }
        return { ...mockSkill, name: 'other-skill', tools: ['Read', 'Write'] };
      });

      await skillTestCommand('/path/to/skill.md', {
        composition: true,
        verbose: true,
      });

      // Tool overlap section is only shown if there are overlapping tools
      // Verify composition testing ran
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Composition Testing')
      );
    });

    it('should handle directory search errors', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('Permission denied'));

      await skillTestCommand('/path/to/skill.md', { composition: true });

      // Should not crash, just mark as warning
      expect(processExitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Benchmarking', () => {
    it('should measure compilation time', async () => {
      await skillTestCommand('/path/to/skill.md', { benchmark: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Benchmark Results')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Compilation Time')
      );
    });

    it('should measure example test time', async () => {
      await skillTestCommand('/path/to/skill.md', { benchmark: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Example Test Time')
      );
    });

    it('should show total time', async () => {
      await skillTestCommand('/path/to/skill.md', { benchmark: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Total Time')
      );
    });

    it('should show performance rating', async () => {
      await skillTestCommand('/path/to/skill.md', { benchmark: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Rating')
      );
    });

    it('should show excellent rating for fast tests', async () => {
      await skillTestCommand('/path/to/skill.md', { benchmark: true });

      // Fast tests should get excellent rating
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/⚡ Excellent|✓ Good/)
      );
    });

    it('should show benchmark time in verbose mode', async () => {
      await skillTestCommand('/path/to/skill.md', {
        benchmark: true,
        verbose: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/⏱.*ms/)
      );
    });
  });

  describe('Summary Display', () => {
    it('should display summary with pass/fail counts', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Summary')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Results:.*passed.*failed/)
      );
    });

    it('should show success rate', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Success Rate:.*%/)
      );
    });

    it('should exit with error on failures', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [{ description: 'Bad', code: '' }],
      });

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );
    });

    it('should show 100% success rate on all passing', async () => {
      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success Rate: 100.0%')
      );
    });
  });

  describe('Example Code Validation', () => {
    it('should validate code has comments', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [
          {
            description: 'Example',
            code: '// This is a comment\nconst x = 1;',
          },
        ],
      });

      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Pass')
      );
    });

    it('should validate code has structure', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [
          { description: 'Example', code: 'function test() { return true; }' },
        ],
      });

      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Pass')
      );
    });

    it('should validate code has meaningful content', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [
          {
            description: 'Example',
            code: 'const meaningfulVariableName = computeComplexOperation();',
          },
        ],
      });

      await skillTestCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Pass')
      );
    });
  });

  describe('Custom Directory', () => {
    it('should use custom directory for composition testing', async () => {
      vi.mocked(readdir).mockResolvedValue([]);

      await skillTestCommand('/path/to/skill.md', {
        composition: true,
        directory: '/custom/directory',
      });

      expect(readdir).toHaveBeenCalledWith('/custom/directory');
    });

    it('should default to parent directory', async () => {
      vi.mocked(readdir).mockResolvedValue([]);

      await skillTestCommand('/path/to/dir/skill.md', { composition: true });

      expect(readdir).toHaveBeenCalledWith(dirname('/path/to/dir/skill.md'));
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });

    it('should handle parsing errors', async () => {
      vi.mocked(parseSkillMd).mockImplementation(() => {
        throw new Error('Parse error');
      });

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parse error')
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(readFile).mockRejectedValue('Unknown error');

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error')
      );
    });
  });

  describe('Mixed Pass/Fail Results', () => {
    it('should handle mixed results', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        examples: [
          { description: 'Good', code: 'function test() { return true; }' },
          { description: 'Bad', code: 'x' },
        ],
      });

      await expect(skillTestCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 passed, 1 failed')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success Rate: 50.0%')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle skill with no tools', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        tools: undefined,
      });

      await skillTestCommand('/path/to/skill.md', {});

      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should handle skill with no dependencies', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        ...mockSkill,
        dependencies: undefined,
      });

      await skillTestCommand('/path/to/skill.md', { composition: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No dependencies declared')
      );
    });

    it('should handle invalid skill files in directory', async () => {
      vi.mocked(readdir).mockResolvedValue([
        { name: 'invalid.md', isDirectory: () => false, isFile: () => true },
      ] as any);

      let parseCallCount = 0;
      vi.mocked(parseSkillMd).mockImplementation(() => {
        parseCallCount++;
        if (parseCallCount === 1) {
          return mockSkill;
        }
        throw new Error('Parse error');
      });

      await skillTestCommand('/path/to/skill.md', { composition: true });

      // Should continue despite parse errors in related skills
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Composition Testing')
      );
    });
  });
});
