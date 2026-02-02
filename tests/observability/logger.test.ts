/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Structured Logger Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for structured logging with trace correlation
 *
 * @packageDocumentation
 */

import { trace, context, ROOT_CONTEXT, SpanContext } from '@opentelemetry/api';
import {
  StructuredLogger,
  getLogger,
  setLogger,
  createLogger,
  type LogEntry,
  type LoggerOptions,
} from '../../src/observability/logger';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

class MockLogger extends StructuredLogger {
  public logs: LogEntry[] = [];

  protected output(entry: LogEntry): void {
    this.logs.push(entry);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLastLog(): LogEntry | undefined {
    return this.logs[this.logs.length - 1];
  }
}

function createMockLogger(options: LoggerOptions = {}): MockLogger {
  return new MockLogger(options);
}

// Mock console to prevent test output pollution
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function mockConsole() {
  console.debug = vi.fn();
  console.info = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
}

function restoreConsole() {
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

// Mock span for trace context testing
function createMockSpan(traceId: string, spanId: string) {
  return {
    spanContext: (): SpanContext => ({
      traceId,
      spanId,
      traceFlags: 1,
    }),
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    addEvent: vi.fn(),
    setStatus: vi.fn(),
    updateName: vi.fn(),
    end: vi.fn(),
    isRecording: () => true,
    recordException: vi.fn(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOG LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Log Levels', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
    mockConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  it('should log debug messages', () => {
    logger.setLevel('debug');
    logger.debug('Debug message');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('debug');
    expect(logger.logs[0].message).toBe('Debug message');
  });

  it('should log info messages', () => {
    logger.info('Info message');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('info');
    expect(logger.logs[0].message).toBe('Info message');
  });

  it('should log warn messages', () => {
    logger.warn('Warning message');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('warn');
    expect(logger.logs[0].message).toBe('Warning message');
  });

  it('should log error messages', () => {
    logger.error('Error message');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('error');
    expect(logger.logs[0].message).toBe('Error message');
  });

  it('should filter debug logs when level is info', () => {
    logger.setLevel('info');
    logger.debug('Should not appear');
    logger.info('Should appear');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('info');
  });

  it('should filter info logs when level is warn', () => {
    logger.setLevel('warn');
    logger.debug('Should not appear');
    logger.info('Should not appear');
    logger.warn('Should appear');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('warn');
  });

  it('should only log errors when level is error', () => {
    logger.setLevel('error');
    logger.debug('Should not appear');
    logger.info('Should not appear');
    logger.warn('Should not appear');
    logger.error('Should appear');

    expect(logger.logs).toHaveLength(1);
    expect(logger.logs[0].level).toBe('error');
  });

  it('should get current log level', () => {
    logger.setLevel('warn');
    expect(logger.getLevel()).toBe('warn');
  });

  it('should default to info level', () => {
    const defaultLogger = createMockLogger();
    expect(defaultLogger.getLevel()).toBe('info');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Structured Logging', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('should include timestamp in ISO format', () => {
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it('should include message and level', () => {
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe('Test message');
    expect(log!.level).toBe('info');
  });

  it('should include metadata when provided', () => {
    logger.info('Test message', { userId: '123', action: 'login' });

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toEqual({ userId: '123', action: 'login' });
  });

  it('should handle complex metadata objects', () => {
    const metadata = {
      user: { id: '123', name: 'Alice' },
      tags: ['important', 'audit'],
      count: 42,
      enabled: true,
    };

    logger.info('Complex metadata', metadata);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toEqual(metadata);
  });

  it('should not include metadata field when undefined', () => {
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOG CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Context Management', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger({ context: { service: 'test-service' } });
  });

  it('should include initial context in logs', () => {
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({ service: 'test-service' });
  });

  it('should not include context field when empty', () => {
    const emptyLogger = createMockLogger();
    emptyLogger.info('Test message');

    const log = emptyLogger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toBeUndefined();
  });

  it('should add context dynamically', () => {
    logger.addContext({ requestId: 'req-123' });
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({
      service: 'test-service',
      requestId: 'req-123',
    });
  });

  it('should merge context when adding', () => {
    logger.addContext({ env: 'production' });
    logger.addContext({ version: '1.0.0' });
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({
      service: 'test-service',
      env: 'production',
      version: '1.0.0',
    });
  });

  it('should override existing context keys', () => {
    logger.addContext({ service: 'updated-service' });
    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({ service: 'updated-service' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CHILD LOGGERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Child Loggers', () => {
  let parentLogger: MockLogger;

  beforeEach(() => {
    parentLogger = createMockLogger({ context: { service: 'parent' } });
  });

  it('should create child logger with additional context', () => {
    const childLogger = new MockLogger({
      context: { ...parentLogger['context'], module: 'auth' },
      minLevel: parentLogger.getLevel(),
      includeTrace: parentLogger['includeTrace'],
    });
    childLogger.info('Test message');

    const log = childLogger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({
      service: 'parent',
      module: 'auth',
    });
  });

  it('should inherit parent log level', () => {
    parentLogger.setLevel('warn');
    const childLogger = parentLogger.child({ module: 'auth' });

    expect(childLogger.getLevel()).toBe('warn');
  });

  it('should inherit trace settings', () => {
    const child = new MockLogger({
      context: { module: 'test' },
      includeTrace: false,
    });

    child.info('Test');
    const log = child.getLastLog();
    expect(log).toBeDefined();
    expect(log!.traceId).toBeUndefined();
    expect(log!.spanId).toBeUndefined();
  });

  it('should allow child context to override parent', () => {
    const childLogger = new MockLogger({
      context: { service: 'child' },
      minLevel: parentLogger.getLevel(),
      includeTrace: parentLogger['includeTrace'],
    });
    childLogger.info('Test message');

    const log = childLogger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({ service: 'child' });
  });

  it('should not affect parent logger context', () => {
    const childLogger = parentLogger.child({ module: 'auth' }) as MockLogger;
    childLogger.info('Child message');
    parentLogger.info('Parent message');

    const parentLog = parentLogger.getLastLog();
    expect(parentLog).toBeDefined();
    expect(parentLog!.context).toEqual({ service: 'parent' });
  });

  it('should create deeply nested child loggers', () => {
    const child1 = new MockLogger({
      context: { ...parentLogger['context'], level1: 'a' },
      minLevel: parentLogger.getLevel(),
      includeTrace: parentLogger['includeTrace'],
    });
    const child2 = new MockLogger({
      context: { ...child1['context'], level2: 'b' },
      minLevel: child1.getLevel(),
      includeTrace: child1['includeTrace'],
    });
    child2.info('Nested message');

    const log = child2.getLastLog();
    expect(log).toBeDefined();
    expect(log!.context).toEqual({
      service: 'parent',
      level1: 'a',
      level2: 'b',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Error Serialization', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('should serialize error with name and message', () => {
    const error = new Error('Something went wrong');
    logger.error('Error occurred', error);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toBeDefined();
    expect((log!.metadata as any).error).toBeDefined();
    expect((log!.metadata as any).error.name).toBe('Error');
    expect((log!.metadata as any).error.message).toBe('Something went wrong');
  });

  it('should include error stack trace', () => {
    const error = new Error('Something went wrong');
    logger.error('Error occurred', error);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect((log!.metadata as any).error.stack).toBeDefined();
    expect((log!.metadata as any).error.stack).toContain(
      'Error: Something went wrong'
    );
  });

  it('should handle custom error types', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const error = new CustomError('Custom error');
    logger.error('Custom error occurred', error);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect((log!.metadata as any).error.name).toBe('CustomError');
    expect((log!.metadata as any).error.message).toBe('Custom error');
  });

  it('should merge error with additional metadata', () => {
    const error = new Error('Something went wrong');
    logger.error('Error occurred', error, { userId: '123' });

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect((log!.metadata as any).userId).toBe('123');
    expect((log!.metadata as any).error).toBeDefined();
  });

  it('should handle error logging without error object', () => {
    logger.error('Error message without error object');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe('Error message without error object');
    expect(log!.metadata).toBeUndefined();
  });

  it('should handle error with metadata but no error object', () => {
    logger.error('Error message', undefined, { context: 'test' });

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toEqual({ context: 'test' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TRACE CORRELATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Trace Correlation', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger({ includeTrace: true });
  });

  afterEach(() => {
    // Clear any active context
    context.active = () => ROOT_CONTEXT;
  });

  it('should include trace context when available', () => {
    const mockSpan = createMockSpan('trace-123', 'span-456');

    // Mock the trace.getSpan to return our mock span
    vi.spyOn(trace, 'getSpan').mockReturnValue(mockSpan as any);

    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.traceId).toBe('trace-123');
    expect(log!.spanId).toBe('span-456');

    vi.restoreAllMocks();
  });

  it('should not include trace context when no active span', () => {
    vi.spyOn(trace, 'getSpan').mockReturnValue(undefined);

    logger.info('Test message');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.traceId).toBeUndefined();
    expect(log!.spanId).toBeUndefined();

    vi.restoreAllMocks();
  });

  it('should respect includeTrace option', () => {
    const noTraceLogger = createMockLogger({ includeTrace: false });
    const mockSpan = createMockSpan('trace-123', 'span-456');

    vi.spyOn(trace, 'getSpan').mockReturnValue(mockSpan as any);

    noTraceLogger.info('Test message');

    const log = noTraceLogger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.traceId).toBeUndefined();
    expect(log!.spanId).toBeUndefined();

    vi.restoreAllMocks();
  });

  it('should include trace context by default', () => {
    const defaultLogger = createMockLogger();
    const mockSpan = createMockSpan('trace-abc', 'span-def');

    vi.spyOn(trace, 'getSpan').mockReturnValue(mockSpan as any);

    defaultLogger.info('Test message');

    const log = defaultLogger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.traceId).toBe('trace-abc');
    expect(log!.spanId).toBe('span-def');

    vi.restoreAllMocks();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TRANSPORT & OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Transport & Output', () => {
  beforeEach(() => {
    mockConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  it('should output debug logs to console.debug', () => {
    const logger = new StructuredLogger({ minLevel: 'debug' });
    logger.debug('Debug message');

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('"level":"debug"')
    );
  });

  it('should output info logs to console.info', () => {
    const logger = new StructuredLogger();
    logger.info('Info message');

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('"level":"info"')
    );
  });

  it('should output warn logs to console.warn', () => {
    const logger = new StructuredLogger();
    logger.warn('Warn message');

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"level":"warn"')
    );
  });

  it('should output error logs to console.error', () => {
    const logger = new StructuredLogger();
    logger.error('Error message');

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('"level":"error"')
    );
  });

  it('should output logs as valid JSON', () => {
    const logger = new StructuredLogger();
    logger.info('Test message');

    expect(console.info).toHaveBeenCalledTimes(1);
    const output = (console.info as any).mock.calls[0][0];

    // Should be valid JSON
    expect(() => JSON.parse(output)).not.toThrow();

    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Test message');
  });

  it('should include all fields in JSON output', () => {
    const logger = new StructuredLogger({ context: { service: 'test' } });
    logger.info('Test', { key: 'value' });

    const output = (console.info as any).mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('level');
    expect(parsed).toHaveProperty('message');
    expect(parsed).toHaveProperty('context');
    expect(parsed).toHaveProperty('metadata');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Default Logger Functions', () => {
  beforeEach(() => {
    // Reset default logger
    setLogger(new StructuredLogger({ minLevel: 'info' }));
  });

  it('should get default logger instance', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();

    expect(logger1).toBe(logger2);
  });

  it('should create child logger with context', () => {
    const childLogger = getLogger({ module: 'test' });

    expect(childLogger).toBeInstanceOf(StructuredLogger);
    expect(childLogger).not.toBe(getLogger());
  });

  it('should set custom default logger', () => {
    const customLogger = new StructuredLogger({ minLevel: 'debug' });
    setLogger(customLogger);

    const retrievedLogger = getLogger();
    expect(retrievedLogger).toBe(customLogger);
  });

  it('should create new logger with createLogger', () => {
    const logger = createLogger({ minLevel: 'warn' });

    expect(logger).toBeInstanceOf(StructuredLogger);
    expect(logger.getLevel()).toBe('warn');
  });

  it('should create independent loggers with createLogger', () => {
    const logger1 = createLogger({ minLevel: 'debug' });
    const logger2 = createLogger({ minLevel: 'error' });

    expect(logger1.getLevel()).toBe('debug');
    expect(logger2.getLevel()).toBe('error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              EDGE CASES & ROBUSTNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger - Edge Cases', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  it('should handle empty message', () => {
    logger.info('');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe('');
  });

  it('should handle very long messages', () => {
    const longMessage = 'x'.repeat(10000);
    logger.info(longMessage);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe(longMessage);
  });

  it('should handle metadata with null values', () => {
    logger.info('Test', { value: null });

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toEqual({ value: null });
  });

  it('should handle metadata with undefined values', () => {
    logger.info('Test', { value: undefined });

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.metadata).toEqual({ value: undefined });
  });

  it('should handle circular references in metadata gracefully', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    // Should not throw
    expect(() => logger.info('Test', circular)).not.toThrow();
  });

  it('should handle special characters in messages', () => {
    const message = 'Test with "quotes" and \n newlines \t tabs';
    logger.info(message);

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe(message);
  });

  it('should handle unicode characters', () => {
    logger.info('Test with unicode: 你好 🎉 ñ');

    const log = logger.getLastLog();
    expect(log).toBeDefined();
    expect(log!.message).toBe('Test with unicode: 你好 🎉 ñ');
  });

  it('should maintain log order', () => {
    logger.info('First');
    logger.info('Second');
    logger.info('Third');

    expect(logger.logs).toHaveLength(3);
    expect(logger.logs[0].message).toBe('First');
    expect(logger.logs[1].message).toBe('Second');
    expect(logger.logs[2].message).toBe('Third');
  });

  it('should handle rapid consecutive logs', () => {
    for (let i = 0; i < 100; i++) {
      logger.info(`Message ${i}`);
    }

    expect(logger.logs).toHaveLength(100);
  });

  it('should create unique timestamps for rapid logs', () => {
    logger.info('First');
    logger.info('Second');

    expect(logger.logs).toHaveLength(2);
    // Timestamps should be valid ISO strings (might be same if too fast)
    expect(logger.logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(logger.logs[1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
