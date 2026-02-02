/**
 * Comprehensive Test Suite: PCL Skill Lint Command
 * Tests skill linting for best practices and quality
 * Target: ~25-30 tests
 */

import { readFile } from 'fs/promises';
import {
  skillLintCommand,
  type LintOptions,
} from '../../../../src/cli/commands/skills/lint';
import { parseSkillMd } from '../../../../src/skills/skill-loader';
import { SkillCompiler } from '../../../../src/skills/skill-compiler';

// Mock filesystem and dependencies
vi.mock('fs/promises');
vi.mock('../../../../src/skills/skill-loader');
vi.mock('../../../../src/skills/skill-compiler');

describe('PCL Skill Lint Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  const mockSkillContent = `---
name: test-skill
description: A comprehensive test skill
---

# Test Skill

This is a test skill with proper content.

## Core Concepts

1. Concept 1
2. Concept 2

## Instructions

- Do this
- Do that

\`\`\`javascript
console.log('example');
\`\`\`
`;

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
    vi.mocked(parseSkillMd).mockReturnValue({
      name: 'test-skill',
      description: 'A comprehensive test skill',
      instructions: mockSkillContent,
      tools: ['Read', 'Write'],
      examples: [{ description: 'Example 1', code: "console.log('example');" }],
      category: 'general',
    });

    const mockCompiler = {
      compile: vi.fn().mockReturnValue({
        success: true,
        errors: [],
        skill: {
          metadata: {
            instructionsLength: 500,
            tokenCount: 150,
            exampleCount: 1,
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

  describe('Basic Linting', () => {
    it('should lint skill successfully', async () => {
      await skillLintCommand('/path/to/skill.md', {});

      expect(readFile).toHaveBeenCalledWith('/path/to/skill.md', 'utf-8');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ All checks passed!')
      );
    });

    it('should compile skill before linting', async () => {
      await skillLintCommand('/path/to/skill.md', {});

      expect(SkillCompiler).toHaveBeenCalled();
    });

    it('should exit on compilation errors', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: false,
          errors: ['Compilation error'],
          skill: null,
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await expect(skillLintCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('compilation errors')
      );
    });
  });

  describe('Naming Checks', () => {
    it('should warn on very short skill name', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'ab',
        description: 'Test',
        instructions: 'Instructions',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skill name is very short')
      );
    });

    it('should warn on very long skill name', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'a'.repeat(60),
        description: 'Test',
        instructions: 'Instructions',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skill name is very long')
      );
    });

    it('should pass with appropriate name length', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'python-expert',
        description: 'Test description here',
        instructions: 'Test instructions',
        category: 'test',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ All checks passed!')
      );
    });
  });

  describe('Description Checks', () => {
    it('should warn on brief description', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Short',
        instructions: 'Instructions',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Description is too brief')
      );
    });

    it('should info on very long description', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'A'.repeat(250),
        instructions: 'Instructions',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Description is very long')
      );
    });
  });

  describe('Instructions Checks', () => {
    it('should warn on very short instructions', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Short',
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 50,
              tokenCount: 20,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instructions are very short')
      );
    });

    it('should warn on very long instructions', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 12000,
              tokenCount: 3000,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instructions are very long')
      );
    });
  });

  describe('Token Count Checks', () => {
    it('should warn on high token count', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 5000,
              tokenCount: 2500,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('High token count')
      );
    });

    it('should error on excessive token count', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 10000,
              tokenCount: 5000,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await expect(skillLintCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token count exceeds recommended maximum')
      );
    });
  });

  describe('Example Checks', () => {
    it('should warn when no examples provided', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        examples: [],
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 500,
              tokenCount: 150,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No examples provided')
      );
    });

    it('should info on single example', async () => {
      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 500,
              tokenCount: 150,
              exampleCount: 1,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Only one example')
      );
    });

    it('should warn on too many examples', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        examples: Array(12).fill({ description: 'Ex', code: 'code' }),
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 500,
              tokenCount: 150,
              exampleCount: 12,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Too many examples')
      );
    });

    it('should warn on poor example descriptions', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        examples: [{ description: 'Ex', code: 'code' }],
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('poor description')
      );
    });

    it('should warn on minimal example code', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        examples: [{ description: 'Example 1', code: 'x' }],
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('minimal code')
      );
    });
  });

  describe('Security Checks', () => {
    it('should warn when no tools specified', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        tools: undefined,
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No tools specified')
      );
    });

    it('should warn on too many tools', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        tools: Array(15).fill('Tool'),
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Too many tools')
      );
    });
  });

  describe('Content Structure Checks', () => {
    it('should warn when no headers found', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Just plain text without any headers or structure.',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No headers found')
      );
    });

    it('should info when no lists found', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: '## Header\n\nContent without any lists.',
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No lists found')
      );
    });

    it('should warn when no code blocks or examples', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: '## Header\n\nContent without code.',
        examples: [],
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 500,
              tokenCount: 150,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No code blocks or examples')
      );
    });
  });

  describe('Completeness Checks', () => {
    it('should error on TODO items', async () => {
      vi.mocked(readFile).mockResolvedValue(
        '---\nname: test\ndescription: Test\n---\n\n[TODO: Add content]'
      );
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: '[TODO: Add content]',
      });

      await expect(skillLintCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('TODO items')
      );
    });

    it('should warn on placeholder content', async () => {
      vi.mocked(readFile).mockResolvedValue(
        '---\nname: test\ndescription: Test\n---\n\nexample.com\nexample.com\nexample.com'
      );

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('placeholder')
      );
    });
  });

  describe('Metadata Checks', () => {
    it('should info on missing version', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        version: undefined,
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No version specified')
      );
    });

    it('should warn on missing category', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'test-skill',
        description: 'Test description',
        instructions: 'Instructions',
        category: undefined,
      });

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No category specified')
      );
    });
  });

  describe('Quality Score', () => {
    it('should calculate quality score', async () => {
      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Score:\s+\d+\/100/)
      );
    });

    it('should show excellent rating for high score', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'excellent-skill',
        description: 'A comprehensive and well-documented skill',
        instructions:
          '## Header\n\n- List item\n\n```code```\n\n' + 'Content '.repeat(100),
        tools: ['Read', 'Write'],
        examples: [
          { description: 'Example 1', code: 'code here' },
          { description: 'Example 2', code: 'more code' },
        ],
        category: 'development',
        version: '1.0.0',
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 1000,
              tokenCount: 300,
              exampleCount: 3,
              toolCount: 2,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Excellent')
      );
    });

    it('should show poor rating for low score', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'ab',
        description: 'Bad',
        instructions: 'X',
        tools: [],
        examples: [],
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 10,
              tokenCount: 5,
              exampleCount: 0,
              toolCount: 0,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', {});

      // Check for quality rating output (could be Poor or Needs Improvement)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/⭐/));
    });
  });

  describe('Strict Mode', () => {
    it('should fail in strict mode with warnings', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'ab',
        description: 'Test description',
        instructions: 'Instructions',
      });

      await expect(
        skillLintCommand('/path/to/skill.md', { strict: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('strict mode')
      );
    });

    it('should pass in strict mode without warnings', async () => {
      vi.mocked(parseSkillMd).mockReturnValue({
        name: 'perfect-skill',
        description:
          'A well-documented skill with proper formatting and content',
        instructions:
          '## Header\n\n- List item 1\n- List item 2\n\n```javascript\nfunction test() { return true; }\n```\n\n' +
          'Content paragraph with meaningful information. '.repeat(20),
        tools: ['Read', 'Write'],
        examples: [
          {
            description: 'Example usage demonstration',
            code: 'function example() {\n  return "meaningful code";\n}',
          },
          { description: 'Another example', code: 'const x = computeValue();' },
        ],
        category: 'development',
        version: '1.0.0',
      });

      const mockCompiler = {
        compile: vi.fn().mockReturnValue({
          success: true,
          errors: [],
          skill: {
            metadata: {
              instructionsLength: 800,
              tokenCount: 250,
              exampleCount: 2,
              toolCount: 2,
            },
          },
        }),
      };
      vi.mocked(SkillCompiler).mockImplementation(() => mockCompiler as any);

      await skillLintCommand('/path/to/skill.md', { strict: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ All checks passed!')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(skillLintCommand('/path/to/skill.md', {})).rejects.toThrow(
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

      await expect(skillLintCommand('/path/to/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parse error')
      );
    });
  });
});
