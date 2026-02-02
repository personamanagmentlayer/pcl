/**
 * Comprehensive Test Suite: PCL Skill Create Command
 * Tests skill creation from templates with all options
 * Target: ~25-30 tests
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import {
  skillCreateCommand,
  type SkillCreateOptions,
} from '../../../../src/cli/commands/skills/create';

// Mock filesystem
vi.mock('fs/promises');

describe('PCL Skill Create Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Skill Name Validation', () => {
    it('should create skill with valid name', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python-expert', {});

      expect(writeFile).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should reject name starting with uppercase', async () => {
      await expect(skillCreateCommand('Python-Expert', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid skill name')
      );
    });

    it('should reject name starting with number', async () => {
      await expect(skillCreateCommand('123-skill', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid skill name')
      );
    });

    it('should reject name with spaces', async () => {
      await expect(skillCreateCommand('python expert', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid skill name')
      );
    });

    it('should reject name with underscores', async () => {
      await expect(skillCreateCommand('python_expert', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid skill name')
      );
    });

    it('should accept single letter name', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('a', {});

      expect(writeFile).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should accept name with multiple hyphens', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python-web-dev-expert', {});

      expect(writeFile).toHaveBeenCalled();
    });

    it('should accept name with numbers after first letter', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python3-expert', {});

      expect(writeFile).toHaveBeenCalled();
    });
  });

  describe('Template Selection', () => {
    it('should use basic template by default', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test-skill', {});

      const callArgs = vi.mocked(writeFile).mock.calls[0];
      const content = callArgs[1] as string;

      expect(content).toContain('## Core Concepts');
      expect(content).toContain('## Instructions');
      expect(content).toContain('## Best Practices');
    });

    it('should use language template when specified', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python', { template: 'language' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('## Language Features');
      expect(content).toContain('## Coding Standards');
      expect(content).toContain('## Performance Optimization');
    });

    it('should use framework template when specified', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('react', { template: 'framework' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('## Framework Overview');
      expect(content).toContain('## Component Development');
      expect(content).toContain('## State Management');
    });

    it('should use tool template when specified', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('docker', { template: 'tool' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('## Tool Overview');
      expect(content).toContain('## Installation');
      expect(content).toContain('## Basic Usage');
    });

    it('should use domain template when specified', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('healthcare', { template: 'domain' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('## Domain Overview');
      expect(content).toContain('## Domain Knowledge');
      expect(content).toContain('## Common Scenarios');
    });

    it('should reject unknown template', async () => {
      await expect(
        skillCreateCommand('test', { template: 'unknown' as any })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown template')
      );
    });
  });

  describe('Skill Options', () => {
    it('should include custom description', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {
        description: 'Custom description here',
      });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('description: Custom description here');
    });

    it('should include custom category', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { category: 'security' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('category: security');
    });

    it('should include custom tools list', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { tools: 'Read,Write,Bash' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('- Read');
      expect(content).toContain('- Write');
      expect(content).toContain('- Bash');
    });

    it('should handle tools with extra whitespace', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { tools: ' Read , Write , Bash ' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('- Read');
      expect(content).toContain('- Write');
      expect(content).toContain('- Bash');
    });

    it('should set complexity level', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { complexity: 'advanced' });

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('complexity: advanced');
    });

    it('should default to intermediate complexity', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('complexity: intermediate');
    });
  });

  describe('Output Path Handling', () => {
    it('should write to default location', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test-skill', {});

      expect(writeFile).toHaveBeenCalledWith(
        join('/test/project', '.claude', 'skills', 'test-skill.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should write to custom output path', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { output: '/custom/path/skill.md' });

      expect(writeFile).toHaveBeenCalledWith(
        '/custom/path/skill.md',
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle relative output paths', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { output: 'skills/test.md' });

      expect(writeFile).toHaveBeenCalledWith(
        'skills/test.md',
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('Content Generation', () => {
    it('should generate title from hyphenated name', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python-web-dev', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('# Python Web Dev');
    });

    it('should include default tools when not specified', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('- Read');
      expect(content).toContain('- Write');
    });

    it('should set user-invocable to true', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toContain('user-invocable: true');
    });

    it('should include frontmatter and content', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;

      expect(content).toMatch(/^---\n/);
      expect(content).toContain('name: test');
      expect(content).toMatch(/---\n\n#/);
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors', async () => {
      vi.mocked(writeFile).mockRejectedValue(new Error('Permission denied'));

      await expect(skillCreateCommand('test', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create skill')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    });

    it('should handle disk full errors', async () => {
      vi.mocked(writeFile).mockRejectedValue(
        new Error('ENOSPC: no space left on device')
      );

      await expect(skillCreateCommand('test', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('no space left on device')
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(writeFile).mockRejectedValue('Unknown error');

      await expect(skillCreateCommand('test', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error')
      );
    });
  });

  describe('Success Output', () => {
    it('should display success message', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test-skill', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Skill created successfully!')
      );
    });

    it('should display skill name', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('python-expert', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Name: python-expert')
      );
    });

    it('should display template used', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', { template: 'language' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template: language')
      );
    });

    it('should display file path', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/File:.*test\.md/)
      );
    });

    it('should display next steps', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Next steps:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1. Edit the skill')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2. Validate')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('3. Compile')
      );
    });
  });

  describe('Template Content Validation', () => {
    it('should generate valid YAML frontmatter', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await skillCreateCommand('test', {});

      const content = vi.mocked(writeFile).mock.calls[0][1] as string;
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);

      expect(frontmatterMatch).toBeTruthy();
      expect(frontmatterMatch![1]).toContain('name:');
      expect(frontmatterMatch![1]).toContain('description:');
    });

    it('should include all complexity levels in examples', async () => {
      const complexityLevels: Array<
        'beginner' | 'intermediate' | 'advanced' | 'expert'
      > = ['beginner', 'intermediate', 'advanced', 'expert'];

      for (const complexity of complexityLevels) {
        vi.clearAllMocks();
        vi.mocked(writeFile).mockResolvedValue(undefined);

        await skillCreateCommand('test', { complexity });

        const content = vi.mocked(writeFile).mock.calls[0][1] as string;
        expect(content).toContain(`complexity: ${complexity}`);
      }
    });

    it('should include all template types content', async () => {
      const templates: Array<
        'basic' | 'language' | 'framework' | 'tool' | 'domain'
      > = ['basic', 'language', 'framework', 'tool', 'domain'];

      for (const template of templates) {
        vi.clearAllMocks();
        vi.mocked(writeFile).mockResolvedValue(undefined);

        await skillCreateCommand('test', { template });

        const content = vi.mocked(writeFile).mock.calls[0][1] as string;
        expect(content.length).toBeGreaterThan(200);
        expect(content).toContain('name: test');
      }
    });
  });
});
