/**
 * Comprehensive Test Suite: PCL Registry Init Command
 * Tests registry initialization, backend configuration, and database migration
 */

import { homedir } from 'os';
import { join } from 'path';
import { initCommand } from '../../../src/cli/commands/registry/init';

// Mock modules
vi.mock('../../../src/cli/config/registry', () => ({
  saveConfig: vi.fn(),
  initConfigDir: vi.fn(),
  hasConfig: vi.fn(),
  createBackend: vi.fn(),
}));

describe('PCL Registry Init Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockBackend: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit(${code})`);
    }) as any);

    // Setup mock backend
    mockBackend = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const config = await import('../../../src/cli/config/registry');
    vi.mocked(config.hasConfig).mockReturnValue(false);
    vi.mocked(config.initConfigDir).mockReturnValue('/config/dir');
    vi.mocked(config.saveConfig).mockImplementation(() => {});
    vi.mocked(config.createBackend).mockResolvedValue(mockBackend);

    mockBackend.connect.mockResolvedValue({ ok: true });
    mockBackend.disconnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Configuration Guard', () => {
    it('should exit if config exists without force flag', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.hasConfig).mockReturnValue(true);

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('configuration already exists')
      );
    });

    it('should proceed with force flag when config exists', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.hasConfig).mockReturnValue(true);

      await initCommand({ backend: 'memory', force: true });

      expect(config.saveConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('initialized successfully')
      );
    });

    it('should proceed when config does not exist', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.hasConfig).mockReturnValue(false);

      await initCommand({ backend: 'memory' });

      expect(config.saveConfig).toHaveBeenCalled();
    });
  });

  describe('Scope Handling', () => {
    it('should default to global scope', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'memory' });

      expect(config.hasConfig).toHaveBeenCalledWith('global');
      expect(config.initConfigDir).toHaveBeenCalledWith('global');
      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.any(Object),
        'global'
      );
    });

    it('should support local scope', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'memory', scope: 'local' });

      expect(config.hasConfig).toHaveBeenCalledWith('local');
      expect(config.initConfigDir).toHaveBeenCalledWith('local');
      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.any(Object),
        'local'
      );
    });
  });

  describe('Memory Backend', () => {
    it('should initialize memory backend', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'memory' });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: { type: 'memory' },
            }),
          }),
        }),
        'global'
      );
    });

    it('should test backend connection', async () => {
      await initCommand({ backend: 'memory' });

      expect(mockBackend.connect).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Backend connection successful')
      );
    });

    it('should handle connection errors', async () => {
      mockBackend.connect.mockResolvedValue({
        ok: false,
        error: new Error('Connection failed'),
      });

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to backend')
      );
    });
  });

  describe('JSON File Backend', () => {
    it('should initialize JSON file backend with default path', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'json-file' });

      const expectedPath = join(homedir(), '.pcl', 'registry.json');
      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                type: 'json-file',
                filePath: expectedPath,
                pretty: true,
                autoSave: true,
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should use custom database path', async () => {
      const config = await import('../../../src/cli/config/registry');
      const customPath = '/custom/path/registry.json';

      await initCommand({ backend: 'json-file', db: customPath });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                filePath: customPath,
              }),
            }),
          }),
        }),
        'global'
      );
    });
  });

  describe('SQLite Backend', () => {
    it('should initialize SQLite backend with default path', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'sqlite' });

      const expectedPath = join(homedir(), '.pcl', 'registry.db');
      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                type: 'sqlite',
                path: expectedPath,
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should use custom database path', async () => {
      const config = await import('../../../src/cli/config/registry');
      const customPath = '/custom/path/registry.db';

      await initCommand({ backend: 'sqlite', db: customPath });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                path: customPath,
              }),
            }),
          }),
        }),
        'global'
      );
    });
  });

  describe('PostgreSQL Backend', () => {
    it('should initialize PostgreSQL backend with required options', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({
        backend: 'postgres',
        host: 'localhost',
        database: 'pcl_registry',
        user: 'pcl_user',
        password: 'secret',
      });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                type: 'postgres',
                host: 'localhost',
                database: 'pcl_registry',
                user: 'pcl_user',
                password: 'secret',
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should use default port if not specified', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({
        backend: 'postgres',
        host: 'localhost',
        database: 'pcl_registry',
      });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                port: 5432,
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should use custom port when specified', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({
        backend: 'postgres',
        host: 'localhost',
        port: 5433,
        database: 'pcl_registry',
      });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                port: 5433,
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should exit when missing required host', async () => {
      await expect(
        initCommand({
          backend: 'postgres',
          database: 'pcl_registry',
        })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('requires --host and --database')
      );
    });

    it('should exit when missing required database', async () => {
      await expect(
        initCommand({
          backend: 'postgres',
          host: 'localhost',
        })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('requires --host and --database')
      );
    });

    it('should use default max connections', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({
        backend: 'postgres',
        host: 'localhost',
        database: 'pcl_registry',
      });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                max: 20,
              }),
            }),
          }),
        }),
        'global'
      );
    });

    it('should use custom max connections', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({
        backend: 'postgres',
        host: 'localhost',
        database: 'pcl_registry',
        max: 50,
      });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              local: expect.objectContaining({
                max: 50,
              }),
            }),
          }),
        }),
        'global'
      );
    });
  });

  describe('Configuration Structure', () => {
    it('should create complete configuration', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'memory' });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            default: 'local',
            backends: expect.objectContaining({
              local: expect.any(Object),
              memory: { type: 'memory' },
            }),
          }),
          providers: expect.objectContaining({
            default: 'mock',
          }),
        }),
        'global'
      );
    });

    it('should include memory backend in all configurations', async () => {
      const config = await import('../../../src/cli/config/registry');

      await initCommand({ backend: 'sqlite' });

      expect(config.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          registry: expect.objectContaining({
            backends: expect.objectContaining({
              memory: { type: 'memory' },
            }),
          }),
        }),
        'global'
      );
    });
  });

  describe('Migration Process', () => {
    it('should run database migrations', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running database migrations')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database migrations complete')
      );
    });

    it('should test database connection during migration', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Testing database connection')
      );
    });
  });

  describe('Backend Disconnection', () => {
    it('should close backend connection after initialization', async () => {
      await initCommand({ backend: 'memory' });

      expect(mockBackend.disconnect).toHaveBeenCalled();
    });

    it('should disconnect even on error', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.saveConfig).mockImplementation(() => {
        throw new Error('Save failed');
      });

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow();

      // Disconnect happens before saveConfig, so it should be called
      expect(mockBackend.disconnect).toHaveBeenCalled();
    });
  });

  describe('Success Output', () => {
    it('should display configuration directory', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.initConfigDir).mockReturnValue('/config/path');

      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration directory: /config/path')
      );
    });

    it('should display configuration saved message', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration saved (global)')
      );
    });

    it('should display configuration JSON', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration:')
      );
    });

    it('should display success message', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registry initialized successfully')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.initConfigDir).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error')
      );
    });

    it('should handle backend creation errors', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.createBackend).mockRejectedValue(
        new Error('Backend creation failed')
      );

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );
    });

    it('should handle config save errors', async () => {
      const config = await import('../../../src/cli/config/registry');
      vi.mocked(config.saveConfig).mockImplementation(() => {
        throw new Error('Cannot write config');
      });

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );
    });
  });

  describe('Backend Type Validation', () => {
    it('should handle unknown backend type', async () => {
      await expect(initCommand({ backend: 'unknown' as any })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown backend type')
      );
    });
  });

  describe('Connection Testing', () => {
    it('should log connection testing message', async () => {
      await initCommand({ backend: 'memory' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Testing memory backend connection')
      );
    });

    it('should handle connection test failures', async () => {
      mockBackend.connect.mockResolvedValue({
        ok: false,
        error: new Error('Connection refused'),
      });

      await expect(initCommand({ backend: 'memory' })).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection refused')
      );
    });
  });
});
