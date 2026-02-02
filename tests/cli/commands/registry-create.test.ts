/**
 * Comprehensive Test Suite: PCL Registry Create Command
 * Tests artifact creation, metadata extraction, and publishing
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createCommand } from '../../../src/cli/commands/registry/create';
import { parse } from '../../../src/parser';
import type { Artifact } from '../../../src/registry/interfaces';

// Mock modules
vi.mock('fs');
vi.mock('../../../src/parser');
vi.mock('../../../src/cli/config/registry', () => ({
  createRegistry: vi.fn(),
}));

describe('PCL Registry Create Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockRegistry: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`process.exit(${code})`);
    }) as any);

    // Setup mock registry
    mockRegistry = {
      create: vi.fn(),
      find: vi.fn(),
      read: vi.fn(),
      publish: vi.fn(),
      close: vi.fn(),
    };

    const { createRegistry } = await import('../../../src/cli/config/registry');
    vi.mocked(createRegistry).mockResolvedValue(mockRegistry);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('File Validation', () => {
    it('should exit when PCL file not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(createCommand('nonexistent.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });

    it('should read PCL file when it exists', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(readFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reading PCL file')
      );
    });

    it('should resolve absolute path correctly', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('relative/path/test.pcl');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reading PCL file')
      );
    });
  });

  describe('PCL Parsing', () => {
    it('should exit on parse errors', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid syntax');
      vi.mocked(parse).mockReturnValue({
        ok: false,
        error: [{ message: 'Unexpected token', line: 1, column: 1 }],
      } as any);

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse PCL file')
      );
    });

    it('should parse valid PCL successfully', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parsing PCL source')
      );
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract persona metadata', async () => {
      const mockSource = 'persona Developer {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'Developer',
              properties: [
                { key: 'version', value: '2.0.0' },
                { key: 'description', value: 'A developer persona' },
                { key: 'tags', value: ['coding', 'development'] },
              ],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'dev-id',
          type: 'persona',
          metadata: {
            name: 'Developer',
            version: '2.0.0',
            description: 'A developer persona',
          },
        },
      });

      await createCommand('developer.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'persona',
          metadata: expect.objectContaining({
            name: 'Developer',
            version: '2.0.0',
            description: 'A developer persona',
          }),
        })
      );
    });

    it('should extract author information', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [
                { key: 'author', value: 'John Doe' },
                { key: 'authorEmail', value: 'john@example.com' },
                { key: 'organization', value: 'ACME Corp' },
              ],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            author: 'John Doe',
            authorEmail: 'john@example.com',
            organization: 'ACME Corp',
          }),
        })
      );
    });

    it('should extract skills from persona', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              skills: [{ name: 'coding' }, { name: 'debugging' }],
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            skills: ['coding', 'debugging'],
          }),
        })
      );
    });

    it('should detect team artifacts', async () => {
      const mockSource = 'team DevTeam {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'TeamDeclaration',
              name: 'DevTeam',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'team-id',
          type: 'team',
          metadata: { name: 'DevTeam', version: '1.0.0' },
        },
      });

      await createCommand('team.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'team',
        })
      );
    });

    it('should infer name from filename when not specified', async () => {
      const mockSource = 'persona {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'Code Reviewer', version: '1.0.0' },
        },
      });

      await createCommand('code-reviewer.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: expect.stringContaining('Code'),
          }),
        })
      );
    });
  });

  describe('Duplicate Detection', () => {
    it('should prevent duplicate artifacts without force flag', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [{ key: 'slug', value: 'test-persona' }],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [
          {
            id: 'existing-id',
            metadata: { slug: 'test-persona', name: 'TEST' },
          },
        ],
      });

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Artifact already exists')
      );
    });

    it('should allow duplicate with force flag', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [{ key: 'slug', value: 'test-persona' }],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [
          {
            id: 'existing-id',
            metadata: { slug: 'test-persona', name: 'TEST' },
          },
        ],
      });

      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'new-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl', { force: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing artifact')
      );
    });

    it('should handle find errors gracefully', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({
        ok: false,
        error: new Error('Database error'),
      });

      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      // Should continue despite find error
      expect(mockRegistry.create).toHaveBeenCalled();
    });
  });

  describe('Artifact Creation', () => {
    it('should create artifact successfully', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created artifact: test-id')
      );
    });

    it('should handle creation errors', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: false,
        error: new Error('Database write failed'),
      });

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create artifact')
      );
    });

    it('should include source in artifact', async () => {
      const mockSource = 'persona TEST { intent: "Test" }';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: mockSource,
        })
      );
    });
  });

  describe('Publishing', () => {
    it('should publish artifact when --publish flag is set', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });
      mockRegistry.publish.mockResolvedValue({ ok: true, value: true });

      await createCommand('test.pcl', { publish: true });

      expect(mockRegistry.publish).toHaveBeenCalledWith('test-id', '1.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Artifact published successfully')
      );
    });

    it('should handle publish errors', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });
      mockRegistry.publish.mockResolvedValue({
        ok: false,
        error: new Error('Publish failed'),
      });

      await expect(
        createCommand('test.pcl', { publish: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish artifact')
      );
    });

    it('should not publish by default', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      await createCommand('test.pcl');

      expect(mockRegistry.publish).not.toHaveBeenCalled();
    });
  });

  describe('Dry Run Mode', () => {
    it('should not create artifact in dry run mode', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [
                { key: 'version', value: '2.0.0' },
                { key: 'description', value: 'Test persona' },
              ],
            },
          ],
        },
      } as any);

      await createCommand('test.pcl', { dryRun: true });

      expect(mockRegistry.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dry run mode')
      );
    });

    it('should display extracted metadata in dry run', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      await createCommand('test.pcl', { dryRun: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Extracted Metadata')
      );
    });
  });

  describe('Backend Selection', () => {
    it('should use specified backend', async () => {
      const mockSource = 'persona TEST {}';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(mockSource);
      vi.mocked(parse).mockReturnValue({
        ok: true,
        value: {
          type: 'Program',
          body: [
            {
              type: 'PersonaDeclaration',
              name: 'TEST',
              properties: [],
            },
          ],
        },
      } as any);

      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          type: 'persona',
          metadata: { name: 'TEST', version: '1.0.0' },
        },
      });

      const { createRegistry } =
        await import('../../../src/cli/config/registry');

      await createCommand('test.pcl', { backend: 'memory' });

      expect(createRegistry).toHaveBeenCalledWith('memory');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error')
      );
    });
  });
});
