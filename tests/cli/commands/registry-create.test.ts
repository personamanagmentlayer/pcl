/**
 * Comprehensive Test Suite: PCL Registry Create Command
 * Tests artifact creation, metadata extraction, and publishing
 *
 * NOTE: the parser is deliberately NOT mocked. An earlier version of this
 * suite fed `createCommand` a hand-written AST shape (`type: 'Program'`,
 * `body`, `properties`, `prop.key`) that the real parser never produces, so it
 * kept passing while metadata extraction was broken in production. Running the
 * real parser over real PCL source is what makes these tests meaningful.
 */

import { existsSync, readFileSync } from 'fs';
import { createCommand } from '../../../src/cli/commands/registry/create';

// Mock modules
vi.mock('fs');
vi.mock('../../../src/cli/config/registry', () => ({
  createRegistry: vi.fn(),
}));

/** A persona covering every metadata field the command extracts */
const DEVELOPER_PCL = `persona Developer {
  version: "2.0.0"
  description: "A developer persona"
  author: "Jane Doe"
  authorEmail: "jane@example.com"
  organization: "Acme"
  license: "MIT"
  slug: "developer"
  tags { "coding", "development" }
  skills { "typescript", "testing" }
}`;

const MINIMAL_PCL = `persona TEST {
  description: "Minimal persona"
}`;

describe('PCL Registry Create Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockRegistry: any;

  /** Point the command at a source file with the given contents */
  const givenFile = (source: string) => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(source as never);
  };

  /** Registry that accepts everything, echoing back what it was given */
  const givenEmptyRegistry = () => {
    mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
    mockRegistry.create.mockImplementation(async (input: any) => ({
      ok: true,
      value: {
        id: 'test-id',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));
  };

  /** The metadata object handed to registry.create */
  const createdMetadata = () => mockRegistry.create.mock.calls[0][0].metadata;

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
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(readFileSync).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reading PCL file')
      );
    });

    it('should resolve absolute path correctly', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('relative/path/test.pcl');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reading PCL file')
      );
    });
  });

  describe('PCL Parsing', () => {
    it('should exit on parse errors', async () => {
      givenFile('persona { this is not valid PCL');

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse PCL file')
      );
    });

    it('should parse valid PCL successfully', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parsing PCL source')
      );
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract persona metadata', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

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

    it('should extract tags', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

      await createCommand('developer.pcl');

      expect(createdMetadata().tags).toEqual(['coding', 'development']);
    });

    it('should extract author information', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

      await createCommand('developer.pcl');

      const metadata = createdMetadata();
      expect(metadata.author).toBe('Jane Doe');
      expect(metadata.authorEmail).toBe('jane@example.com');
      expect(metadata.organization).toBe('Acme');
      expect(metadata.license).toBe('MIT');
    });

    it('should extract skills from persona', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

      await createCommand('developer.pcl');

      expect(createdMetadata().skills).toEqual(['typescript', 'testing']);
    });

    it('should default the version when none is declared', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(createdMetadata().version).toBe('1.0.0');
    });

    it('should detect team artifacts', async () => {
      givenFile(`persona Worker { description: "w" }
team Reviewers {
  members: [Worker]
}`);
      givenEmptyRegistry();

      await createCommand('team.pcl');

      // The first declaration in the file determines the artifact
      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'persona' })
      );
    });

    it('should detect a team when it is the only declaration', async () => {
      givenFile(`team Reviewers {
  members: [Worker]
}`);
      givenEmptyRegistry();

      await createCommand('team.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'team',
          metadata: expect.objectContaining({ name: 'Reviewers' }),
        })
      );
    });

    it('should detect workflow artifacts', async () => {
      givenFile(`workflow Pipeline {
  steps: Worker
}`);
      givenEmptyRegistry();

      await createCommand('flow.pcl');

      expect(mockRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'workflow',
          metadata: expect.objectContaining({ name: 'Pipeline' }),
        })
      );
    });

    it('should infer name from filename when no declaration is present', async () => {
      givenFile('// only a comment, no declaration\n');
      givenEmptyRegistry();

      await createCommand('my-cool-persona.pcl');

      expect(createdMetadata().name).toBe('My Cool Persona');
    });
  });

  describe('Duplicate Detection', () => {
    const existingArtifact = {
      id: 'existing-id',
      metadata: { name: 'Developer', slug: 'developer', version: '1.0.0' },
    };

    it('should prevent duplicate artifacts without force flag', async () => {
      givenFile(DEVELOPER_PCL);
      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [existingArtifact],
      });

      await expect(createCommand('developer.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Artifact already exists')
      );
    });

    it('should allow duplicate with force flag', async () => {
      givenFile(DEVELOPER_PCL);
      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [existingArtifact],
      });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: { id: 'new-id', metadata: { name: 'Developer' } },
      });

      await createCommand('developer.pcl', { force: true });

      expect(mockRegistry.create).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing artifact')
      );
    });

    it('should handle find errors gracefully', async () => {
      givenFile(DEVELOPER_PCL);
      mockRegistry.find.mockResolvedValue({
        ok: false,
        error: new Error('Search failed'),
      });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: { id: 'test-id', metadata: { name: 'Developer' } },
      });

      // A failed duplicate lookup must not block creation
      await createCommand('developer.pcl');

      expect(mockRegistry.create).toHaveBeenCalled();
    });
  });

  describe('Artifact Creation', () => {
    it('should create artifact successfully', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(mockRegistry.create).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created artifact')
      );
    });

    it('should handle creation errors', async () => {
      givenFile(MINIMAL_PCL);
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
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(mockRegistry.create.mock.calls[0][0].source).toBe(MINIMAL_PCL);
    });

    it('should create unpublished and undeleted by default', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      const input = mockRegistry.create.mock.calls[0][0];
      expect(input.published).toBe(false);
      expect(input.deleted).toBe(false);
    });
  });

  describe('Publishing', () => {
    it('should publish artifact when --publish flag is set', async () => {
      givenFile(DEVELOPER_PCL);
      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          metadata: { name: 'Developer', version: '2.0.0' },
        },
      });
      mockRegistry.publish.mockResolvedValue({ ok: true, value: undefined });

      await createCommand('developer.pcl', { publish: true });

      expect(mockRegistry.publish).toHaveBeenCalledWith('test-id', '2.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('published successfully')
      );
    });

    it('should handle publish errors', async () => {
      givenFile(DEVELOPER_PCL);
      mockRegistry.find.mockResolvedValue({ ok: true, value: [] });
      mockRegistry.create.mockResolvedValue({
        ok: true,
        value: {
          id: 'test-id',
          metadata: { name: 'Developer', version: '2.0.0' },
        },
      });
      mockRegistry.publish.mockResolvedValue({
        ok: false,
        error: new Error('Publish failed'),
      });

      await expect(
        createCommand('developer.pcl', { publish: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish artifact')
      );
    });

    it('should not publish by default', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      await createCommand('test.pcl');

      expect(mockRegistry.publish).not.toHaveBeenCalled();
    });
  });

  describe('Dry Run Mode', () => {
    it('should not create artifact in dry run mode', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

      await createCommand('developer.pcl', { dryRun: true });

      expect(mockRegistry.create).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dry run mode')
      );
    });

    it('should display extracted metadata in dry run', async () => {
      givenFile(DEVELOPER_PCL);
      givenEmptyRegistry();

      await createCommand('developer.pcl', { dryRun: true });

      const printed = consoleLogSpy.mock.calls
        .map((c: any[]) => c[0])
        .join('\n');
      expect(printed).toContain('Developer');
      expect(printed).toContain('2.0.0');
      expect(printed).toContain('coding');
    });
  });

  describe('Backend Selection', () => {
    it('should use specified backend', async () => {
      givenFile(MINIMAL_PCL);
      givenEmptyRegistry();

      const { createRegistry } =
        await import('../../../src/cli/config/registry');

      await createCommand('test.pcl', { backend: 'sqlite' });

      expect(createRegistry).toHaveBeenCalledWith('sqlite');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      givenFile(MINIMAL_PCL);
      mockRegistry.find.mockRejectedValue(new Error('Connection lost'));

      await expect(createCommand('test.pcl')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error')
      );
    });
  });
});
