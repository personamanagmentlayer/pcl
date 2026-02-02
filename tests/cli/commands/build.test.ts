/**
 * Comprehensive Test Suite: PCL Build Command
 * Tests project building, compilation, and code generation
 */

import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { glob } from 'glob';
import { buildCommand } from '../../../src/cli/commands/build';
import { parse } from '../../../src/parser';
import type { PCLPackage } from '../../../src/build/package-format';

// Mock modules
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('glob');
vi.mock('../../../src/parser');
vi.mock('../../../src/codegen', () => ({
  generatePrompt: vi.fn(
    (persona) => `PROMPT for ${persona.id?.name || 'persona'}`
  ),
  generateJSON: vi.fn(() => '{"type": "program"}'),
  generateMarkdown: vi.fn(() => '# Documentation'),
  generateTypeScript: vi.fn(() => 'export const persona = {};'),
}));

describe('PCL Build Command', () => {
  const mockCwd = '/test/project';
  const mockConfigPath = join(mockCwd, 'pcl.json');

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
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Configuration Validation', () => {
    it('should exit when pcl.json not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(buildCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('pcl.json not found')
      );
    });

    it('should load valid pcl.json', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue([]);

      await buildCommand();

      expect(readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Building test-project@1.0.0')
      );
    });

    it('should exit on invalid package configuration', async () => {
      const invalidPkg = {
        name: 'Invalid Name!',
        version: 'bad-version',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidPkg));

      await expect(buildCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid pcl.json')
      );
    });

    it('should use custom config path when provided', async () => {
      const customPath = '/custom/path/pcl.json';
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue([]);

      await buildCommand({ config: customPath });

      expect(readFileSync).toHaveBeenCalledWith(customPath, 'utf-8');
    });
  });

  describe('File Discovery', () => {
    it('should find PCL files using default include pattern', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['example.pcl', 'other.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: { statements: [] },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand();

      expect(glob).toHaveBeenCalledWith(
        '**/*.pcl',
        expect.objectContaining({
          cwd: join(mockCwd, 'src'),
        })
      );
    });

    it('should use custom include patterns from config', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
        build: {
          include: ['personas/**/*.pcl'],
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue([]);

      await buildCommand();

      expect(glob).toHaveBeenCalledWith(
        'personas/**/*.pcl',
        expect.any(Object)
      );
    });

    it('should respect exclude patterns', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
        build: {
          exclude: ['**/*.draft.pcl', 'temp/**'],
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue([]);

      await buildCommand();

      expect(glob).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ignore: ['**/*.draft.pcl', 'temp/**'],
        })
      );
    });

    it('should handle no files found gracefully', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue([]);

      await buildCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No PCL files found')
      );
    });
  });

  describe('Build Targets', () => {
    const setupValidBuild = () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
    };

    it('should generate prompt target', async () => {
      setupValidBuild();

      await buildCommand({ target: 'prompt' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('TEST.prompt.txt'),
        expect.stringContaining('PROMPT for TEST'),
        'utf-8'
      );
    });

    it('should generate JSON target', async () => {
      setupValidBuild();

      await buildCommand({ target: 'json' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.stringContaining('"type"'),
        'utf-8'
      );
    });

    it('should generate TypeScript target', async () => {
      setupValidBuild();

      await buildCommand({ target: 'typescript' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.ts'),
        expect.stringContaining('export'),
        'utf-8'
      );
    });

    it('should generate Markdown target', async () => {
      setupValidBuild();

      await buildCommand({ target: 'markdown' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.md'),
        expect.stringContaining('#'),
        'utf-8'
      );
    });

    it('should build multiple targets from config', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
        build: {
          targets: ['prompt', 'json', 'typescript'],
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand();

      expect(writeFile).toHaveBeenCalledTimes(3);
    });

    it('should handle prompt target with no personas', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('// Empty file');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: { statements: [] },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ target: 'prompt', verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No personas found')
      );
    });
  });

  describe('Output Directory Management', () => {
    it('should use default output directory', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ target: 'json' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining(join(mockCwd, 'dist')),
        expect.any(String),
        'utf-8'
      );
    });

    it('should use custom output directory', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
        build: {
          outDir: 'build',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ target: 'json' });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining(join(mockCwd, 'build')),
        expect.any(String),
        'utf-8'
      );
    });

    it('should create nested output directories', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['nested/dir/test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ target: 'json' });

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('nested'), {
        recursive: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should report parse errors', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['invalid.pcl']);
      vi.mocked(readFile).mockResolvedValue('invalid syntax');
      vi.mocked(parse).mockReturnValue({
        ok: false,
        error: [{ message: 'Unexpected token', line: 1, column: 1 }],
      } as any);

      await expect(buildCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parse error')
      );
    });

    it('should continue building after single file error', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['good.pcl', 'bad.pcl']);
      vi.mocked(readFile).mockImplementation(async (path) => {
        if (path.toString().includes('bad')) {
          return 'invalid';
        }
        return 'persona TEST {}';
      });

      let callCount = 0;
      vi.mocked(parse).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return {
            ok: false,
            error: [{ message: 'Parse error' }],
          } as any;
        }
        return {
          ok: true,
          value: {
            program: {
              statements: [
                {
                  kind: 'PersonaDeclaration',
                  id: { name: 'TEST' },
                },
              ],
            },
            errors: [],
          },
        } as any;
      });
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await expect(buildCommand({ target: 'json' })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 succeeded, 1 failed')
      );
    });

    it('should handle file system errors', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'));

      await expect(buildCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    });

    it('should exit with code 1 on any build failure', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: false,
        error: [{ message: 'Error' }],
      } as any);

      await expect(buildCommand()).rejects.toThrow('process.exit(1)');
    });
  });

  describe('Verbose Mode', () => {
    it('should log file count in verbose mode', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Building test.pcl')
      );
    });

    it('should log output paths in verbose mode', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand({ verbose: true, target: 'json' });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('→'));
    });
  });

  describe('Build Summary', () => {
    it('should display success summary', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Build complete: 1 succeeded, 0 failed')
      );
    });

    it('should display file checkmarks for successful builds', async () => {
      const validPkg: PCLPackage = {
        name: 'test-project',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPkg));
      vi.mocked(glob).mockResolvedValue(['test.pcl']);
      vi.mocked(readFile).mockResolvedValue('persona TEST {}');
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          program: {
            statements: [
              {
                kind: 'PersonaDeclaration',
                id: { name: 'TEST' },
              },
            ],
          },
          errors: [],
        },
      } as any);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await buildCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ test.pcl')
      );
    });
  });
});
