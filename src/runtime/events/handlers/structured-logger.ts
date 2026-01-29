/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Structured Logger Event Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Logs events as structured JSON with additional metadata and context.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/handlers
 * @version 1.0.0
 */

import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * Structured log entry
 */
export interface StructuredLogEntry {
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Event type */
  event: string;
  /** Event message */
  message: string;
  /** Structured event data */
  data: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Error details if applicable */
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

/**
 * Structured logger configuration
 */
export interface StructuredLoggerConfig {
  /** Custom metadata to include in all log entries */
  metadata?: Record<string, unknown>;
  /** Include stack traces for errors */
  includeStack?: boolean;
  /** Output function (default: console.log) */
  output?: (entry: StructuredLogEntry) => void;
}

/**
 * Structured logger event handler
 *
 * Outputs structured JSON log entries suitable for log aggregation
 * systems like ELK, Splunk, Datadog, etc.
 *
 * @example
 * ```typescript
 * const logger = createStructuredLogger({
 *   metadata: {
 *     service: 'pcl-runtime',
 *     environment: 'production',
 *     version: '1.0.0'
 *   },
 *   includeStack: true
 * });
 *
 * runtime.on(logger);
 * ```
 */
export class StructuredLogger {
  private readonly config: Required<StructuredLoggerConfig>;

  constructor(config: StructuredLoggerConfig = {}) {
    this.config = {
      metadata: config.metadata ?? {},
      includeStack: config.includeStack ?? true,
      output: config.output ?? ((entry) => console.log(JSON.stringify(entry))),
    };
  }

  /**
   * Get the event handler function
   */
  getHandler(): RuntimeEventHandler {
    return (event: RuntimeEvent) => this.handleEvent(event);
  }

  /**
   * Handle an event
   */
  private handleEvent(event: RuntimeEvent): void {
    const entry = this.createLogEntry(event);
    this.config.output(entry);
  }

  /**
   * Create structured log entry from event
   */
  private createLogEntry(event: RuntimeEvent): StructuredLogEntry {
    const timestamp = 'timestamp' in event ? event.timestamp : new Date();

    const entry: StructuredLogEntry = {
      timestamp: timestamp.toISOString(),
      level: this.getEventLevel(event),
      event: event.type,
      message: this.getEventMessage(event),
      data: this.getEventData(event),
    };

    // Add custom metadata
    if (Object.keys(this.config.metadata).length > 0) {
      entry.metadata = this.config.metadata;
    }

    // Add error details
    if ('error' in event && event.error) {
      entry.error = {
        name: event.error.name,
        message: event.error.message,
        ...(this.config.includeStack && event.error.stack
          ? { stack: event.error.stack }
          : {}),
      };
    }

    return entry;
  }

  /**
   * Determine log level from event
   */
  private getEventLevel(event: RuntimeEvent): StructuredLogEntry['level'] {
    if (event.type.endsWith(':error') || event.type === 'error') {
      return 'error';
    }

    if (
      event.type.startsWith('persona:before') ||
      event.type.startsWith('workflow:step')
    ) {
      return 'debug';
    }

    return 'info';
  }

  /**
   * Get human-readable message for event
   */
  private getEventMessage(event: RuntimeEvent): string {
    switch (event.type) {
      case 'persona:before':
        return `Persona "${event.persona.name}" is processing a message`;

      case 'persona:after':
        return `Persona "${event.persona.name}" completed processing in ${event.duration}ms`;

      case 'persona:error':
        return `Persona "${event.persona.name}" encountered an error: ${event.error.message}`;

      case 'persona:activated':
        return `Persona "${event.persona.name}" was activated`;

      case 'persona:deactivated':
        return `Persona "${event.persona.name}" was deactivated`;

      case 'workflow:start':
        return `Workflow "${event.workflow.id}" started execution`;

      case 'workflow:step':
        return `Workflow "${event.workflow.id}" executing step ${event.stepIndex + 1}/${event.totalSteps}: ${event.stepName}`;

      case 'workflow:complete':
        return `Workflow "${event.workflow.id}" completed in ${event.duration}ms`;

      case 'workflow:error':
        return `Workflow "${event.workflow.id}" encountered an error: ${event.error.message}`;

      case 'llm:call':
        return `LLM API call to ${event.provider}/${event.model}`;

      case 'llm:response':
        return `LLM response received from ${event.provider}/${event.model} in ${event.duration}ms`;

      case 'llm:error':
        return `LLM API error from ${event.provider}/${event.model}: ${event.error.message}`;

      case 'team:formed':
        return `Team "${event.team.name}" formed with ${event.team.members.length} members`;

      case 'team:disbanded':
        return `Team "${event.team.name}" was disbanded`;

      case 'team:merge':
        return `Team "${event.team.name}" merged ${event.responses.length} member responses`;

      case 'error':
        return `Runtime error: ${event.error.message}`;

      default:
        return `Event: ${(event as RuntimeEvent).type}`;
    }
  }

  /**
   * Extract structured data from event
   */
  private getEventData(event: RuntimeEvent): Record<string, unknown> {
    const data: Record<string, unknown> = { ...event };

    // Remove redundant fields
    delete data.timestamp;
    if ('error' in data) {
      delete data.error; // Moved to error field
    }

    return data;
  }
}

/**
 * Create a structured logger event handler
 *
 * @param config - Logger configuration
 * @returns Event handler function
 *
 * @example
 * ```typescript
 * // Basic usage
 * const logger = createStructuredLogger();
 * runtime.on(logger);
 *
 * // With custom metadata
 * const logger = createStructuredLogger({
 *   metadata: {
 *     service: 'my-pcl-app',
 *     environment: 'production',
 *     version: '2.1.0',
 *     datacenter: 'us-east-1'
 *   }
 * });
 *
 * // Custom output (e.g., to external logging service)
 * const logger = createStructuredLogger({
 *   output: (entry) => {
 *     // Send to logging service
 *     loggingService.log(entry);
 *   }
 * });
 * ```
 */
export function createStructuredLogger(
  config: StructuredLoggerConfig = {}
): RuntimeEventHandler {
  const logger = new StructuredLogger(config);
  return logger.getHandler();
}
