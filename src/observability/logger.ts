/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Structured Logger
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Context-aware structured logging with trace correlation
 *
 * @packageDocumentation
 * @module @pcl/observability/logger
 * @version 1.0.0
 */

import { trace, context, SpanContext } from '@opentelemetry/api';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly metadata?: LogMetadata;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
}

export interface LoggerOptions {
  readonly context?: Record<string, unknown>;
  readonly minLevel?: LogLevel;
  readonly includeTrace?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured logger with trace context correlation
 */
export class StructuredLogger {
  private context: Record<string, unknown>;
  private minLevel: LogLevel;
  private includeTrace: boolean;

  constructor(options: LoggerOptions = {}) {
    this.context = options.context || {};
    this.minLevel = options.minLevel || 'info';
    this.includeTrace = options.includeTrace ?? true;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({
      context: { ...this.context, ...context },
      minLevel: this.minLevel,
      includeTrace: this.includeTrace,
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    const errorMeta = error
      ? {
          ...metadata,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : metadata;

    this.log('error', message, errorMeta);
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Add permanent context to logger
   */
  addContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // Check if log level is enabled
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.minLevel]) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      metadata,
    };

    // Add trace context if enabled
    if (this.includeTrace) {
      const traceContext = this.getTraceContext();
      if (traceContext) {
        (entry as { traceId?: string }).traceId = traceContext.traceId;
        (entry as { spanId?: string }).spanId = traceContext.spanId;
      }
    }

    // Output log entry
    this.output(entry);
  }

  /**
   * Get current trace context from active span
   */
  private getTraceContext(): { traceId: string; spanId: string } | null {
    const span = trace.getSpan(context.active());
    if (!span) {
      return null;
    }

    const spanContext: SpanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  /**
   * Output log entry (can be overridden for custom output)
   */
  protected output(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

let defaultLogger: StructuredLogger | null = null;

/**
 * Get the default logger instance
 */
export function getLogger(context?: Record<string, unknown>): StructuredLogger {
  if (!defaultLogger) {
    defaultLogger = new StructuredLogger({ minLevel: 'info' });
  }

  return context ? defaultLogger.child(context) : defaultLogger;
}

/**
 * Set the default logger instance
 */
export function setLogger(logger: StructuredLogger): void {
  defaultLogger = logger;
}

/**
 * Create a new logger with context
 */
export function createLogger(options: LoggerOptions): StructuredLogger {
  return new StructuredLogger(options);
}
