/**
 * Comprehensive Test Suite: PCL Registry Delete Command
 * Tests artifact deletion, soft delete, hard delete (purge), and confirmation prompts
 */

import * as readline from 'readline';
import { deleteCommand } from '../../../src/cli/commands/registry/delete';
import type { Artifact } from '../../../src/registry/interfaces';

// Mock modules
vi.mock('readline');
vi.mock('../../../src/cli/config/registry', () => ({
  createRegistry: vi.fn(),
}));

describe('PCL Registry Delete Command', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockRegistry: any;
  let mockReadline: any;

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
      read: vi.fn(),
      find: vi.fn(),
      delete: vi.fn(),
      close: vi.fn(),
    };

    const { createRegistry } = await import('../../../src/cli/config/registry');
    vi.mocked(createRegistry).mockResolvedValue(mockRegistry);

    // Setup mock readline
    mockReadline = {
      question: vi.fn(),
      close: vi.fn(),
    };

    vi.mocked(readline.createInterface).mockReturnValue(mockReadline as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Artifact Lookup', () => {
    it('should find artifact by ID', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      // Mock confirmation as 'yes'
      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(mockRegistry.read).toHaveBeenCalledWith('artifact-123');
    });

    it('should find artifact by slug', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          slug: 'test-persona',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: false,
        error: new Error('Not found'),
      });

      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [mockArtifact],
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('test-persona');

      expect(mockRegistry.find).toHaveBeenCalled();
    });

    it('should find artifact by name', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: false,
        error: new Error('Not found'),
      });

      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [mockArtifact],
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('Test Persona');

      expect(mockRegistry.find).toHaveBeenCalled();
    });

    it('should exit when artifact not found', async () => {
      mockRegistry.read.mockResolvedValue({
        ok: false,
        error: new Error('Not found'),
      });

      mockRegistry.find.mockResolvedValue({
        ok: true,
        value: [],
      });

      await expect(deleteCommand('nonexistent')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Artifact not found')
      );
    });
  });

  describe('Already Deleted Artifacts', () => {
    it('should warn when artifact already deleted without purge', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: true,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      await deleteCommand('artifact-123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already deleted')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use --purge to permanently delete')
      );
      expect(mockRegistry.delete).not.toHaveBeenCalled();
    });

    it('should allow purging already deleted artifact', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: true,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123', { purge: true });

      expect(mockRegistry.delete).toHaveBeenCalled();
    });
  });

  describe('Confirmation Prompts', () => {
    it('should prompt for confirmation before deletion', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(mockReadline.question).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure'),
        expect.any(Function)
      );
    });

    it('should display artifact details before confirmation', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Persona')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('persona')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.0.0')
      );
    });

    it('should cancel deletion when user answers no', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('n');
      });

      await deleteCommand('artifact-123');

      expect(consoleLogSpy).toHaveBeenCalledWith('Cancelled');
      expect(mockRegistry.delete).not.toHaveBeenCalled();
    });

    it('should accept "yes" as confirmation', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('yes');
      });

      await deleteCommand('artifact-123');

      expect(mockRegistry.delete).toHaveBeenCalled();
    });

    it('should skip confirmation with force flag', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      await deleteCommand('artifact-123', { force: true });

      expect(mockReadline.question).not.toHaveBeenCalled();
      expect(mockRegistry.delete).toHaveBeenCalled();
    });
  });

  describe('Soft Delete', () => {
    it('should perform soft delete by default', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleting artifact (soft delete)')
      );
      expect(mockRegistry.delete).toHaveBeenCalledWith('artifact-123');
    });

    it('should display soft delete success message', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deleted Test Persona')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('This is a soft delete')
      );
    });

    it('should handle soft delete errors', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({
        ok: false,
        error: new Error('Delete failed'),
      });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await expect(deleteCommand('artifact-123')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete artifact')
      );
    });
  });

  describe('Hard Delete (Purge)', () => {
    it('should perform hard delete with purge flag', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123', { purge: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleting artifact')
      );
      expect(mockRegistry.delete).toHaveBeenCalledWith('artifact-123');
    });

    it('should display warning for permanent deletion', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123', { purge: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CANNOT be undone')
      );
      expect(mockReadline.question).toHaveBeenCalledWith(
        expect.stringContaining('PERMANENTLY DELETE'),
        expect.any(Function)
      );
    });

    it('should display purge success message', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123', { purge: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleted Test Persona')
      );
    });

    it('should handle purge errors', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({
        ok: false,
        error: new Error('Purge failed'),
      });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await expect(
        deleteCommand('artifact-123', { purge: true })
      ).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to purge artifact')
      );
    });
  });

  describe('Backend Selection', () => {
    it('should use specified backend', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      const { createRegistry } =
        await import('../../../src/cli/config/registry');

      await deleteCommand('artifact-123', { backend: 'memory' });

      expect(createRegistry).toHaveBeenCalledWith('memory');
    });

    it('should use default backend when not specified', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      const { createRegistry } =
        await import('../../../src/cli/config/registry');

      await deleteCommand('artifact-123');

      expect(createRegistry).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      mockRegistry.read.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(deleteCommand('artifact-123')).rejects.toThrow(
        'process.exit(1)'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error')
      );
    });

    it('should handle registry connection errors', async () => {
      const { createRegistry } =
        await import('../../../src/cli/config/registry');
      vi.mocked(createRegistry).mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(deleteCommand('artifact-123')).rejects.toThrow(
        'process.exit(1)'
      );
    });
  });

  describe('Readline Interface', () => {
    it('should close readline interface after confirmation', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(mockReadline.close).toHaveBeenCalled();
    });

    it('should close readline interface on cancellation', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('n');
      });

      await deleteCommand('artifact-123');

      expect(mockReadline.close).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle artifact with missing metadata', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: '',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('y');
      });

      await deleteCommand('artifact-123');

      expect(mockRegistry.delete).toHaveBeenCalled();
    });

    it('should handle case-insensitive confirmation', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      mockReadline.question.mockImplementation((q: string, cb: Function) => {
        cb('YES');
      });

      await deleteCommand('artifact-123');

      expect(mockRegistry.delete).toHaveBeenCalled();
    });

    it('should handle combined force and purge flags', async () => {
      const mockArtifact: Partial<Artifact> = {
        id: 'artifact-123',
        type: 'persona',
        metadata: {
          name: 'Test Persona',
          version: '1.0.0',
          tags: [],
        },
        deleted: false,
      };

      mockRegistry.read.mockResolvedValue({
        ok: true,
        value: mockArtifact,
      });

      mockRegistry.delete.mockResolvedValue({ ok: true });

      await deleteCommand('artifact-123', { force: true, purge: true });

      expect(mockReadline.question).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleting')
      );
    });
  });
});
