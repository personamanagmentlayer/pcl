/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Console Logger Event Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Logs events to stdout/stderr with configurable log levels.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/handlers
 * @version 1.0.0
 */

import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * Log level for filtering events
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Console logger configuration
 */
export interface ConsoleLoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Include timestamps in output */
  timestamps?: boolean;
  /** Colorize output (ANSI colors) */
  colors?: boolean;
  /** Pretty-print JSON data */
  pretty?: boolean;
}

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log level priorities
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Console logger event handler
 *
 * Logs events to console with configurable formatting and filtering.
 *
 * @example
 * ```typescript
 * const logger = createConsoleLogger({
 *   level: 'info',
 *   timestamps: true,
 *   colors: true
 * });
 *
 * runtime.on(logger);
 * ```
 */
export class ConsoleLogger {
  private readonly config: Required<ConsoleLoggerConfig>;

  constructor(config: ConsoleLoggerConfig = {}) {
    this.config = {
      level: config.level ?? 'info',
      timestamps: config.timestamps ?? true,
      colors: config.colors ?? true,
      pretty: config.pretty ?? false,
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
    const eventLevel = this.getEventLevel(event);
    const configLevel = LOG_LEVELS[this.config.level];

    // Filter by log level
    if (LOG_LEVELS[eventLevel] < configLevel) {
      return;
    }

    const message = this.formatEvent(event, eventLevel);

    // Output to appropriate stream
    if (eventLevel === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Determine log level for an event
   */
  private getEventLevel(event: RuntimeEvent): LogLevel {
    if (event.type.endsWith(':error') || event.type === 'error') {
      return 'error';
    }

    switch (event.type) {
      case 'persona:before':
      case 'workflow:step':
      case 'llm:call':
        return 'debug';

      case 'persona:after':
      case 'workflow:start':
      case 'workflow:complete':
      case 'llm:response':
      case 'team:formed':
      case 'team:merge':
        return 'info';

      default:
        return 'info';
    }
  }

  /**
   * Format an event for console output
   */
  private formatEvent(event: RuntimeEvent, level: LogLevel): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      const timestamp = 'timestamp' in event ? event.timestamp : new Date();
      parts.push(this.colorize(timestamp.toISOString(), COLORS.dim));
    }

    // Log level
    const levelColor = this.getLevelColor(level);
    parts.push(this.colorize(`[${level.toUpperCase()}]`, levelColor));

    // Event type
    parts.push(this.colorize(`[${event.type}]`, COLORS.cyan));

    // Event-specific details
    const details = this.getEventDetails(event);
    if (details) {
      parts.push(details);
    }

    return parts.join(' ');
  }

  /**
   * Get color for log level
   */
  private getLevelColor(level: LogLevel): string {
    if (!this.config.colors) return '';

    switch (level) {
      case 'debug':
        return COLORS.dim;
      case 'info':
        return COLORS.green;
      case 'warn':
        return COLORS.yellow;
      case 'error':
        return COLORS.red;
    }
  }

  /**
   * Get event-specific details
   */
  private getEventDetails(event: RuntimeEvent): string | null {
    switch (event.type) {
      case 'persona:before':
        return `Persona "${event.persona.name}" processing message`;

      case 'persona:after':
        return `Persona "${event.persona.name}" responded (${event.duration}ms)`;

      case 'persona:error':
        return `Persona "${event.persona.name}" error: ${event.error.message}`;

      case 'persona:activated':
        return `Persona "${event.persona.name}" activated`;

      case 'persona:deactivated':
        return `Persona "${event.persona.name}" deactivated`;

      case 'workflow:start':
        return `Workflow "${event.workflow.id}" started`;

      case 'workflow:step':
        return `Workflow "${event.workflow.id}" step ${event.stepIndex + 1}/${event.totalSteps}: ${event.stepName}`;

      case 'workflow:complete':
        return `Workflow "${event.workflow.id}" completed (${event.duration}ms)`;

      case 'workflow:error':
        return `Workflow "${event.workflow.id}" error: ${event.error.message}`;

      case 'llm:call':
        return `LLM call: ${event.provider}/${event.model}`;

      case 'llm:response':
        return `LLM response: ${event.provider}/${event.model} (${event.duration}ms, ${event.tokensUsed || 0} tokens${event.cost ? `, $${event.cost.toFixed(4)}` : ''})`;

      case 'llm:error':
        return `LLM error: ${event.provider}/${event.model}: ${event.error.message}`;

      case 'team:formed':
        return `Team "${event.team.name}" formed with ${event.team.members.length} members`;

      case 'team:disbanded':
        return `Team "${event.team.name}" disbanded`;

      case 'team:merge':
        return `Team "${event.team.name}" merged ${event.responses.length} responses`;

      case 'error':
        return `Runtime error: ${event.error.message}${this.formatContext(event.context)}`;

      default:
        return null;
    }
  }

  /**
   * Format error context
   */
  private formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }

    if (this.config.pretty) {
      return '\n' + JSON.stringify(context, null, 2);
    }

    return ` ${JSON.stringify(context)}`;
  }

  /**
   * Colorize text (only if colors enabled)
   */
  private colorize(text: string, color: string): string {
    if (!this.config.colors) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }
}

/**
 * Create a console logger event handler
 *
 * @param config - Logger configuration
 * @returns Event handler function
 *
 * @example
 * ```typescript
 * const logger = createConsoleLogger({
 *   level: 'info',
 *   timestamps: true,
 *   colors: true
 * });
 *
 * runtime.on(logger);
 * ```
 */
export function createConsoleLogger(
  config: ConsoleLoggerConfig = {}
): RuntimeEventHandler {
  const logger = new ConsoleLogger(config);
  return logger.getHandler();
}
