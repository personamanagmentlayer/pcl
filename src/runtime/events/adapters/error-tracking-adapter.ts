/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Error Tracking Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Adapter for error tracking services like Sentry, Rollbar, etc.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/adapters
 * @version 1.0.0
 */

import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * Error tracking provider interface
 */
export interface ErrorTrackingProvider {
  /**
   * Capture an exception
   */
  captureException(
    error: Error,
    context?: Record<string, unknown>
  ): string | Promise<string>;

  /**
   * Capture a message
   */
  captureMessage?(
    message: string,
    level?: 'info' | 'warning' | 'error'
  ): void | Promise<void>;

  /**
   * Set user context
   */
  setUser?(user: { id?: string; email?: string; username?: string }): void;

  /**
   * Set tags/custom context
   */
  setContext?(name: string, context: Record<string, unknown>): void;
}

/**
 * Error tracking adapter configuration
 */
export interface ErrorTrackingAdapterConfig {
  /** Error tracking provider (e.g., Sentry, Rollbar) */
  provider: ErrorTrackingProvider;
  /** Environment name */
  environment?: string;
  /** Release version */
  release?: string;
  /** Additional tags to include with all errors */
  globalTags?: Record<string, string>;
  /** Capture non-error events as breadcrumbs */
  captureBreadcrumbs?: boolean;
}

/**
 * Error tracking adapter for monitoring runtime errors
 *
 * Captures errors and context from PCL runtime for external
 * error tracking services.
 *
 * @example
 * ```typescript
 * // With Sentry
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   dsn: 'YOUR_SENTRY_DSN',
 *   environment: 'production'
 * });
 *
 * const errorTracker = createErrorTrackingAdapter({
 *   provider: {
 *     captureException: (error, context) => {
 *       return Sentry.captureException(error, { extra: context });
 *     },
 *     setContext: (name, context) => {
 *       Sentry.setContext(name, context);
 *     }
 *   },
 *   environment: 'production',
 *   release: '1.0.0',
 *   captureBreadcrumbs: true
 * });
 *
 * runtime.on(errorTracker);
 * ```
 */
export class ErrorTrackingAdapter {
  private readonly config: Required<ErrorTrackingAdapterConfig>;
  private breadcrumbs: Array<{ type: string; timestamp: Date; data: unknown }> =
    [];

  constructor(config: ErrorTrackingAdapterConfig) {
    this.config = {
      provider: config.provider,
      environment: config.environment ?? 'development',
      release: config.release ?? 'unknown',
      globalTags: config.globalTags ?? {},
      captureBreadcrumbs: config.captureBreadcrumbs ?? true,
    };

    // Set global context
    if (this.config.provider.setContext) {
      this.config.provider.setContext('pcl', {
        environment: this.config.environment,
        release: this.config.release,
        ...this.config.globalTags,
      });
    }
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
  private async handleEvent(event: RuntimeEvent): Promise<void> {
    // Capture breadcrumbs for context
    if (this.config.captureBreadcrumbs && !this.isErrorEvent(event)) {
      this.addBreadcrumb(event);
    }

    // Capture errors
    if (this.isErrorEvent(event)) {
      await this.captureError(event);
    }
  }

  /**
   * Check if event is an error event
   */
  private isErrorEvent(event: RuntimeEvent): boolean {
    return event.type.endsWith(':error') || event.type === 'error';
  }

  /**
   * Add breadcrumb for context
   */
  private addBreadcrumb(event: RuntimeEvent): void {
    this.breadcrumbs.push({
      type: event.type,
      timestamp: 'timestamp' in event ? event.timestamp : new Date(),
      data: event,
    });

    // Keep last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Capture an error event
   */
  private async captureError(event: RuntimeEvent): Promise<void> {
    if (!('error' in event)) {
      return;
    }

    const error = event.error as Error;
    const context = this.buildErrorContext(event);

    try {
      await this.config.provider.captureException(error, context);
    } catch (captureError) {
      console.error(
        '[ErrorTrackingAdapter] Failed to capture error:',
        captureError
      );
    }
  }

  /**
   * Build error context from event
   */
  private buildErrorContext(event: RuntimeEvent): Record<string, unknown> {
    const context: Record<string, unknown> = {
      eventType: event.type,
      timestamp: 'timestamp' in event ? event.timestamp : new Date(),
      breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
      ...this.config.globalTags,
    };

    // Add event-specific context
    switch (event.type) {
      case 'persona:error':
        context.persona = {
          id: event.persona.id,
          name: event.persona.name,
          config: event.persona.config,
        };
        context.message = {
          id: event.message.id,
          content: event.message.content,
        };
        break;

      case 'workflow:error':
        context.workflow = {
          id: event.workflow.id,
          stepName: event.stepName,
        };
        break;

      case 'llm:error':
        context.llm = {
          provider: event.provider,
          model: event.model,
          personaId: event.persona.id,
        };
        break;

      case 'error':
        context.additionalContext = event.context;
        break;
    }

    return context;
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }
}

/**
 * Create an error tracking adapter
 *
 * @param config - Adapter configuration
 * @returns Event handler function
 *
 * @example
 * ```typescript
 * const errorTracker = createErrorTrackingAdapter({
 *   provider: myErrorTracker,
 *   environment: 'production',
 *   release: '2.1.0',
 *   globalTags: {
 *     datacenter: 'us-east-1',
 *     cluster: 'prod-cluster-1'
 *   },
 *   captureBreadcrumbs: true
 * });
 *
 * runtime.on(errorTracker);
 * ```
 */
export function createErrorTrackingAdapter(
  config: ErrorTrackingAdapterConfig
): RuntimeEventHandler {
  const adapter = new ErrorTrackingAdapter(config);
  return adapter.getHandler();
}
