/**
 * Comprehensive Test Suite: PCL Install Command
 * Tests package installation, dependency resolution, and lock file management
 */

import { existsSync, readFileSync } from 'fs';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { installCommand } from '../../../src/cli/commands/install';
import type {
  PCLPackage,
  PCLLockFile,
} from '../../../src/build/package-format';

// Mock filesystem and external modules
vi.mock('fs');
vi.mock('fs/promises');

describe('PCL Install Command', () => {
  const mockCwd = '/test/project';
  const mockConfigPath = join(mockCwd, 'pcl.json');
  const mockLockPath = join(mockCwd, 'pcl-lock.json');

  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    consoleWarnSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Package File Validation', () => {
    it('should exit with error when pcl.json not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(installCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('pcl.json not found')
      );
    });

    it('should load and validate pcl.json successfully', async () => {
      const validPackage: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'example-lib': '^1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(validPackage));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      // Mock import for fs.promises.rename
      vi.doMock('fs', () => ({
        promises: {
          rename: vi.fn().mockResolvedValue(undefined),
        },
      }));

      await installCommand();

      expect(readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should exit on invalid package name', async () => {
      const invalidPackage = {
        name: 'Invalid Package Name!',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidPackage));

      await expect(installCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid pcl.json')
      );
    });

    it('should exit on invalid version format', async () => {
      const invalidPackage = {
        name: 'test-package',
        version: 'invalid.version',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidPackage));

      await expect(installCommand()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version')
      );
    });
  });

  describe('Install All Dependencies', () => {
    it('should install all dependencies from pcl.json', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
          'lib-b': '2.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(mkdir).toHaveBeenCalledWith(join(mockCwd, 'pcl_modules'), {
        recursive: true,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib-a@1.0.0')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib-b@2.0.0')
      );
    });

    it('should skip devDependencies when --production flag is set', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-prod': '1.0.0',
        },
        devDependencies: {
          'lib-dev': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand([], { production: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib-prod@1.0.0')
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('lib-dev')
      );
    });

    it('should install devDependencies by default', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        devDependencies: {
          'lib-dev': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib-dev@1.0.0 (dev)')
      );
    });

    it('should handle empty dependencies gracefully', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No dependencies to install')
      );
    });
  });

  describe('Install Specific Packages', () => {
    it('should install specific packages and save to dependencies', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['new-lib@1.0.0'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ new-lib@1.0.0')
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('pcl.json'),
        expect.stringContaining('"new-lib"'),
        'utf-8'
      );
    });

    it('should install specific packages and save to devDependencies', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['dev-lib@1.0.0'], { saveDev: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ dev-lib@1.0.0')
      );
    });

    it('should install multiple specific packages', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['lib-a@1.0.0', 'lib-b@2.0.0'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing 2 package(s)')
      );
    });
  });

  describe('Package Specification Parsing', () => {
    it('should parse package without version', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['some-lib'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ some-lib@1.0.0')
      );
    });

    it('should parse scoped package without version', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['@scope/package'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('@scope/package')
      );
    });

    it('should parse scoped package with version', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['@scope/package@2.0.0'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('@scope/package@2.0.0')
      );
    });

    it('should handle version ranges', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['lib@^1.0.0'], { save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib@')
      );
    });
  });

  describe('Lock File Management', () => {
    it('should create new lock file if not exists', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        return path === mockConfigPath;
      });
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('pcl-lock.json'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should use existing lock file versions', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '^1.0.0',
        },
      };

      const lockFile: PCLLockFile = {
        version: '1.0.0',
        packageVersion: '1.0.0',
        lockfileVersion: 1,
        dependencies: {
          'lib-a': {
            version: '1.2.3',
            resolved: 'https://registry.pcl.dev/lib-a/-/lib-a-1.2.3.tgz',
            integrity: 'sha512-abc123',
            dependencies: {},
          },
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === mockConfigPath) return JSON.stringify(pkg);
        if (path === mockLockPath) return JSON.stringify(lockFile);
        return '';
      });
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ lib-a@1.2.3')
      );
    });

    it('should update lock file after installation', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Updated pcl-lock.json')
      );
    });

    it('should handle corrupted lock file gracefully', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation((path) => {
        if (path === mockConfigPath) return JSON.stringify(pkg);
        if (path === mockLockPath) return 'invalid json{';
        return '';
      });
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not parse pcl-lock.json')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle package download errors', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(
        installCommand(['lib@1.0.0'], { save: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    });

    it('should continue installation after single package failure', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));

      let callCount = 0;
      vi.mocked(mkdir).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Network error');
        }
        return undefined;
      });
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await expect(
        installCommand(['lib-a@1.0.0', 'lib-b@1.0.0'], { save: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 succeeded, 1 failed')
      );
    });

    it('should exit with code 1 on any installation failure', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockRejectedValue(new Error('Failed'));

      await expect(installCommand(['lib@1.0.0'])).rejects.toThrow(
        'process.exit(1)'
      );
    });
  });

  describe('Verbose Mode', () => {
    it('should log detailed information in verbose mode', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand([], { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing lib-a@1.0.0...')
      );
    });

    it('should show installation directory in verbose mode', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['lib@1.0.0'], { verbose: true, save: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing to')
      );
    });
  });

  describe('Atomic File Operations', () => {
    it('should use atomic writes for pcl.json updates', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand(['lib@1.0.0'], { save: true });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should use atomic writes for lock file updates', async () => {
      const pkg: PCLPackage = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          'lib-a': '1.0.0',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(pkg));
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      await installCommand();

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('pcl-lock.json.tmp'),
        expect.any(String),
        'utf-8'
      );
    });
  });
});
