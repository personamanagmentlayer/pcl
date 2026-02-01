/**
 * Tests for File Logger Event Handler
 */

import {
  FileLogger,
  createFileLogger,
} from '../../../../src/runtime/events/handlers/file-logger.js';
import type {
  PersonaAfterEvent,
  PersonaErrorEvent,
  WorkflowCompleteEvent,
} from '../../../../src/runtime/events/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  createWriteStream: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
}));

// Mock path to return predictable results
vi.mock('node:path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function createMockWriteStream() {
  const mockStream = {
    write: vi.fn(),
    end: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
  };
  return mockStream;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Event Factories
// ═══════════════════════════════════════════════════════════════════════════════

const mockPersonaState = {
  name: 'TestPersona',
  description: 'Test persona',
  systemPrompt: 'You are a test persona',
  temperature: 0.7,
  enabled: true,
};

const mockMessage = {
  role: 'user' as const,
  content: 'Test message',
};

const mockResponse = {
  role: 'assistant' as const,
  content: 'Test response',
};

const mockWorkflowState = {
  id: 'workflow-123',
  name: 'TestWorkflow',
  steps: [],
};

function createPersonaAfterEvent(): PersonaAfterEvent {
  return {
    type: 'persona:after',
    persona: mockPersonaState,
    message: mockMessage,
    response: mockResponse,
    duration: 150,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createPersonaErrorEvent(): PersonaErrorEvent {
  return {
    type: 'persona:error',
    persona: mockPersonaState,
    message: mockMessage,
    error: new Error('Test error'),
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createWorkflowCompleteEvent(): WorkflowCompleteEvent {
  return {
    type: 'workflow:complete',
    workflow: mockWorkflowState,
    result: { success: true },
    duration: 500,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('FileLogger', () => {
  let mockStream: ReturnType<typeof createMockWriteStream>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStream = createMockWriteStream();

    // Default mocks
    (fs.existsSync as any).mockReturnValue(false);
    (fs.createWriteStream as any).mockReturnValue(mockStream);
    (fs.statSync as any).mockReturnValue({ size: 0 });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const logger = new FileLogger();
      expect(logger).toBeDefined();
      expect(fs.mkdirSync).toHaveBeenCalledWith('./logs', { recursive: true });
    });

    it('should initialize with custom directory', () => {
      const logger = new FileLogger({ directory: './custom-logs' });
      expect(logger).toBeDefined();
      expect(fs.mkdirSync).toHaveBeenCalledWith('./custom-logs', {
        recursive: true,
      });
    });

    it('should initialize with custom filename', () => {
      const logger = new FileLogger({ filename: 'custom-log' });
      expect(logger).toBeDefined();
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        './logs/custom-log.log',
        expect.any(Object)
      );
    });

    it('should initialize with custom max size', () => {
      const logger = new FileLogger({ maxSize: 5 * 1024 * 1024 }); // 5MB
      expect(logger).toBeDefined();
    });

    it('should initialize with custom max files', () => {
      const logger = new FileLogger({ maxFiles: 10 });
      expect(logger).toBeDefined();
    });

    it('should not create directory if it exists', () => {
      (fs.existsSync as any).mockReturnValue(true);
      const logger = new FileLogger();
      expect(logger).toBeDefined();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should initialize stream in append mode', () => {
      const logger = new FileLogger();
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        './logs/pcl-runtime.log',
        { flags: 'a', encoding: 'utf8' }
      );
    });

    it('should get current file size if file exists', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.statSync as any).mockReturnValue({ size: 1024 });
      const logger = new FileLogger();
      expect(fs.statSync).toHaveBeenCalledWith('./logs/pcl-runtime.log');
    });
  });

  describe('event handling', () => {
    it('should format event as JSON', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();
      const event = createPersonaAfterEvent();

      handler(event);
      await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for debounce

      expect(mockStream.write).toHaveBeenCalled();
      const written = mockStream.write.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.type).toBe('persona:after');
      expect(parsed.persona.name).toBe('TestPersona');
    });

    it('should format event as pretty JSON', async () => {
      const logger = new FileLogger({ pretty: true });
      const handler = logger.getHandler();
      const event = createPersonaAfterEvent();

      handler(event);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.write).toHaveBeenCalled();
      const written = mockStream.write.mock.calls[0][0] as string;
      expect(written).toContain('  '); // Pretty-printed indentation
    });

    it('should batch multiple events', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      handler(createPersonaErrorEvent());
      handler(createWorkflowCompleteEvent());

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.write).toHaveBeenCalledTimes(1); // Batched into single write
      const written = mockStream.write.mock.calls[0][0] as string;
      const lines = written.trim().split('\n');
      expect(lines.length).toBe(3);
    });

    it('should debounce writes', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      await new Promise((resolve) => setTimeout(resolve, 50)); // Before debounce
      handler(createPersonaErrorEvent());
      await new Promise((resolve) => setTimeout(resolve, 150)); // After debounce

      expect(mockStream.write).toHaveBeenCalledTimes(1); // Debounced
    });
  });

  describe('file rotation', () => {
    it('should rotate when max size exceeded', async () => {
      const logger = new FileLogger({ maxSize: 100 }); // Very small max size
      const handler = logger.getHandler();

      // Create large event
      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: {
          ...mockMessage,
          content: 'x'.repeat(200), // Exceeds max size
        },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.end).toHaveBeenCalled();
      expect(fs.createWriteStream).toHaveBeenCalledTimes(2); // Initial + rotated
    });

    it('should rename files during rotation', async () => {
      const logger = new FileLogger({ maxSize: 100, maxFiles: 3 });
      const handler = logger.getHandler();

      // Mock existing backup files
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('.log.1') || filePath.includes('.log.2');
      });

      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: { ...mockMessage, content: 'x'.repeat(200) },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fs.renameSync).toHaveBeenCalled();
    });

    it('should delete oldest file during rotation', async () => {
      const logger = new FileLogger({ maxSize: 100, maxFiles: 2 });
      const handler = logger.getHandler();

      // Mock existing backup files at max
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('.log.1');
      });

      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: { ...mockMessage, content: 'x'.repeat(200) },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should reset size after rotation', async () => {
      const logger = new FileLogger({ maxSize: 100 });
      const handler = logger.getHandler();

      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: { ...mockMessage, content: 'x'.repeat(200) },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // After rotation, should write to new file
      expect(mockStream.write).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should flush remaining writes on close', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      await logger.close();

      expect(mockStream.write).toHaveBeenCalled();
    });

    it('should close write stream', async () => {
      const logger = new FileLogger();
      await logger.close();

      expect(mockStream.end).toHaveBeenCalled();
    });

    it('should clear pending timer on close', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      await logger.close();

      // Should not throw or hang
      expect(mockStream.end).toHaveBeenCalled();
    });

    it('should handle close with no pending writes', async () => {
      const logger = new FileLogger();
      await logger.close();

      expect(mockStream.end).toHaveBeenCalled();
    });
  });

  describe('createFileLogger factory', () => {
    it('should create handler and close function', () => {
      const result = createFileLogger();
      expect(result.handler).toBeInstanceOf(Function);
      expect(result.close).toBeInstanceOf(Function);
    });

    it('should create with custom config', () => {
      const result = createFileLogger({ directory: './test-logs' });
      expect(result.handler).toBeInstanceOf(Function);
      expect(fs.mkdirSync).toHaveBeenCalledWith('./test-logs', {
        recursive: true,
      });
    });

    it('should close properly through factory', async () => {
      const result = createFileLogger();
      await result.close();
      expect(mockStream.end).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty config', () => {
      const logger = new FileLogger({});
      expect(logger).toBeDefined();
    });

    it('should handle events with minimal data', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      const minimalEvent = {
        type: 'error' as const,
        error: new Error('Test'),
        timestamp: new Date(),
      };

      handler(minimalEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.write).toHaveBeenCalled();
    });

    it('should handle rapid successive writes', async () => {
      const logger = new FileLogger();
      const handler = logger.getHandler();

      for (let i = 0; i < 10; i++) {
        handler(createPersonaAfterEvent());
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.write).toHaveBeenCalled();
      const written = mockStream.write.mock.calls[0][0] as string;
      const lines = written.trim().split('\n');
      expect(lines.length).toBe(10);
    });

    it('should handle very large events', async () => {
      const logger = new FileLogger({ maxSize: 1024 * 1024 }); // 1MB
      const handler = logger.getHandler();

      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: {
          ...mockMessage,
          content: 'x'.repeat(100000),
        },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockStream.write).toHaveBeenCalled();
    });

    it('should handle rotation with no existing backups', async () => {
      const logger = new FileLogger({ maxSize: 100 });
      const handler = logger.getHandler();

      (fs.existsSync as any).mockReturnValue(false); // No backups exist

      const largeEvent = {
        ...createPersonaAfterEvent(),
        message: { ...mockMessage, content: 'x'.repeat(200) },
      };

      handler(largeEvent);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fs.createWriteStream).toHaveBeenCalledTimes(2); // Rotated
    });

    it('should create nested directories', () => {
      const logger = new FileLogger({ directory: './logs/nested/deep' });
      expect(fs.mkdirSync).toHaveBeenCalledWith('./logs/nested/deep', {
        recursive: true,
      });
    });
  });
});
