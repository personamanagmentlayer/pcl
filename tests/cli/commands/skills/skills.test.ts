/**
 * Comprehensive Test Suite: PCL Skills Management Commands
 * Tests import, export, validate, list, and info commands
 * Target: ~35-40 tests
 */

import { existsSync } from 'fs';
import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import {
  importCommand,
  exportCommand,
  validateCommand,
  listCommand,
  infoCommand,
} from '../../../../src/cli/commands/skills';
import {
  loadSkillFromFile,
  parseSkillMd,
  toSkillMd,
  type PCLSkill,
} from '../../../../src/skills/skill-loader';

// Mock filesystem and skill loader
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('../../../../src/skills/skill-loader');

describe('PCL Skills Management Commands', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  const mockSkill: PCLSkill = {
    name: 'test-skill',
    description: 'A test skill',
    instructions: 'Test instructions',
    tools: ['Read', 'Write'],
    examples: [{ description: 'Example 1', code: 'test code' }],
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
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Import Command', () => {
    it('should import single skill file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await importCommand('/source/SKILL.md', {});

      expect(loadSkillFromFile).toHaveBeenCalledWith(
        resolve('/source/SKILL.md')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Imported skill: test-skill')
      );
    });

    it('should exit if source file not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(importCommand('/nonexistent/SKILL.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source not found')
      );
    });

    it('should import from directory recursively', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true,
      } as any);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'skill1', isDirectory: () => true, isFile: () => false },
        { name: 'skill2', isDirectory: () => true, isFile: () => false },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock nested readdir for finding SKILL.md files
      let callCount = 0;
      vi.mocked(readdir).mockImplementation(
        async (path: any, options?: any) => {
          callCount++;
          if (callCount === 1) {
            return [
              { name: 'skill1', isDirectory: () => true, isFile: () => false },
            ] as any;
          }
          return [
            { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
          ] as any;
        }
      );

      await importCommand('/source/', { recursive: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scanning')
      );
    });

    it('should handle import errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockRejectedValue(new Error('Parse error'));

      await expect(importCommand('/source/SKILL.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parse error')
      );
    });

    it('should create output directory if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await importCommand('/source/SKILL.md', { output: './custom-skills' });

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('custom-skills'),
        { recursive: true }
      );
    });

    it('should show verbose output when requested', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await importCommand('/source/SKILL.md', { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Description:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tools:')
      );
    });
  });

  describe('Export Command', () => {
    it('should export skill to file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(toSkillMd).mockReturnValue('# Skill content');
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await exportCommand('/source/skill.md', {});

      expect(loadSkillFromFile).toHaveBeenCalledWith(
        resolve('/source/skill.md')
      );
      expect(toSkillMd).toHaveBeenCalledWith(mockSkill);
      expect(writeFile).toHaveBeenCalled();
    });

    it('should exit if source not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(exportCommand('/nonexistent/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Source not found')
      );
    });

    it('should export to specified output path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(toSkillMd).mockReturnValue('# Skill content');
      vi.mocked(stat).mockResolvedValue({ isDirectory: () => false } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await exportCommand('/source/skill.md', { output: '/custom/output.md' });

      expect(writeFile).toHaveBeenCalledWith(
        '/custom/output.md',
        expect.any(String),
        'utf-8'
      );
    });

    it('should export to directory with skill name', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(toSkillMd).mockReturnValue('# Skill content');
      vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await exportCommand('/source/skill.md', { output: '/custom/dir' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-skill'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should use specified format', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);
      vi.mocked(toSkillMd).mockReturnValue('# Skill content');
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await exportCommand('/source/skill.md', { format: 'agentskills' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Format: agentskills')
      );
    });

    it('should handle export errors', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockRejectedValue(new Error('Load failed'));

      await expect(exportCommand('/source/skill.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Load failed')
      );
    });
  });

  describe('Validate Command', () => {
    it('should validate single skill file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);

      await validateCommand('/source/SKILL.md', { spec: 'agentskills' });

      expect(loadSkillFromFile).toHaveBeenCalledWith(
        resolve('/source/SKILL.md')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Valid')
      );
    });

    it('should fail on missing required fields', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        name: '',
        description: 'Test',
        instructions: 'Test',
      });

      await expect(validateCommand('/source/SKILL.md', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Validation failed')
      );
    });

    it('should validate against agentskills spec', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        name: 'Invalid Name!',
      });

      await expect(
        validateCommand('/source/SKILL.md', { spec: 'agentskills' })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid skill name')
      );
    });

    it('should validate against claude-code spec', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        config: { context: 'invalid' },
      });

      await expect(
        validateCommand('/source/SKILL.md', { spec: 'claude-code' })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid context')
      );
    });

    it('should show warnings for best practices', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        instructions: 'Short',
      });

      await validateCommand('/source/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warnings:')
      );
    });

    it('should validate directory of skills', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true,
      } as any);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'skill1', isDirectory: () => true, isFile: () => false },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);

      // Mock nested readdir
      let callCount = 0;
      vi.mocked(readdir).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'skill1', isDirectory: () => true, isFile: () => false },
          ] as any;
        }
        return [
          { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
        ] as any;
      });

      await validateCommand('/source/', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scanning')
      );
    });

    it('should exit with error on validation failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      } as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        name: '',
        description: '',
        instructions: '',
      });

      await expect(validateCommand('/source/SKILL.md', {})).rejects.toThrow(
        'process.exit(1)'
      );
    });
  });

  describe('List Command', () => {
    it('should list discovered skills', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);

      await listCommand({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-skill')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('A test skill')
      );
    });

    it('should show no skills found message', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await listCommand({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No skills found')
      );
    });

    it('should show verbose information', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        config: { model: 'claude-3-5-sonnet' },
      });

      await listCommand({ verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tools:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Model:')
      );
    });

    it('should list searched locations when no skills found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await listCommand({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.claude/skills/')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('./.claude/skills/')
      );
    });
  });

  describe('Info Command', () => {
    it('should show skill info by path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        version: '1.0.0',
        category: 'development',
        metadata: {
          author: 'Test Author',
          license: 'MIT',
        },
      });

      await infoCommand('/path/to/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-skill')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Version.*1\.0\.0/)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Category.*development/)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Author.*Test Author/)
      );
    });

    it('should find skill by name', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);

      await infoCommand('test-skill', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-skill')
      );
    });

    it('should show error when skill not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readdir).mockResolvedValue([]);

      await expect(infoCommand('nonexistent-skill', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skill not found')
      );
    });

    it('should show available skills when not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readdir).mockResolvedValue([
        { name: 'SKILL.md', isDirectory: () => false, isFile: () => true },
      ] as any);
      vi.mocked(loadSkillFromFile).mockResolvedValue(mockSkill);

      await expect(infoCommand('nonexistent', {})).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available skills:')
      );
    });

    it('should show configuration details', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        config: {
          model: 'claude-3-5-sonnet',
          context: 'fork',
          agent: 'developer',
        },
      });

      await infoCommand('/path/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Model.*claude-3-5-sonnet/)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Context.*fork/)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Agent.*developer/)
      );
    });

    it('should show tools list', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        tools: ['Read', 'Write', 'Bash'],
      });

      await infoCommand('/path/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Allowed Tools:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- Read')
      );
    });

    it('should show dependencies', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        dependencies: ['base-skill', 'helper-skill'],
      });

      await infoCommand('/path/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dependencies:')
      );
    });

    it('should show examples count', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        examples: [
          { description: 'Ex 1', code: 'code1' },
          { description: 'Ex 2', code: 'code2' },
          { description: 'Ex 3', code: 'code3' },
        ],
      });

      await infoCommand('/path/SKILL.md', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Examples (3):')
      );
    });

    it('should show instructions preview in verbose mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(loadSkillFromFile).mockResolvedValue({
        ...mockSkill,
        instructions: 'A'.repeat(1000),
      });

      await infoCommand('/path/SKILL.md', { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instructions:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('... (truncated)')
      );
    });
  });
});
