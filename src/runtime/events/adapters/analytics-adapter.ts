/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Analytics Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generic analytics tracking adapter for runtime events.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/adapters
 * @version 1.0.0
 */

import type { RuntimeEvent, RuntimeEventHandler } from '../types.js';

/**
 * Analytics tracking interface
 */
export interface AnalyticsProvider {
  /**
   * Track an event
   */
  track(
    event: string,
    properties: Record<string, unknown>
  ): void | Promise<void>;

  /**
   * Identify a user/session
   */
  identify?(
    userId: string,
    traits: Record<string, unknown>
  ): void | Promise<void>;
}

/**
 * Analytics adapter configuration
 */
export interface AnalyticsAdapterConfig {
  /** Analytics provider implementation */
  provider: AnalyticsProvider;
  /** User/session ID for tracking */
  userId?: string;
  /** Additional properties to include with all events */
  globalProperties?: Record<string, unknown>;
  /** Filter function to select which events to track */
  filter?: (event: RuntimeEvent) => boolean;
}

/**
 * Analytics adapter for tracking runtime events
 *
 * Translates PCL runtime events into analytics events for
 * services like Segment, Mixpanel, Google Analytics, etc.
 *
 * @example
 * ```typescript
 * // With Segment
 * import Analytics from 'analytics-node';
 * const segment = new Analytics('YOUR_WRITE_KEY');
 *
 * const analyticsAdapter = createAnalyticsAdapter({
 *   provider: {
 *     track: (event, properties) => {
 *       segment.track({
 *         userId: 'user-123',
 *         event,
 *         properties
 *       });
 *     }
 *   },
 *   userId: 'user-123',
 *   globalProperties: {
 *     app: 'my-pcl-app',
 *     version: '1.0.0'
 *   }
 * });
 *
 * runtime.on(analyticsAdapter);
 * ```
 */
export class AnalyticsAdapter {
  private readonly config: Required<Omit<AnalyticsAdapterConfig, 'filter'>> & {
    filter?: (event: RuntimeEvent) => boolean;
  };

  constructor(config: AnalyticsAdapterConfig) {
    this.config = {
      provider: config.provider,
      userId: config.userId ?? 'anonymous',
      globalProperties: config.globalProperties ?? {},
      filter: config.filter,
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
  private async handleEvent(event: RuntimeEvent): Promise<void> {
    // Apply filter if configured
    if (this.config.filter && !this.config.filter(event)) {
      return;
    }

    const { eventName, properties } = this.mapEvent(event);

    // Track the event
    try {
      await this.config.provider.track(eventName, {
        ...this.config.globalProperties,
        ...properties,
        userId: this.config.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AnalyticsAdapter] Failed to track event:', error);
    }
  }

  /**
   * Map PCL event to analytics event
   */
  private mapEvent(event: RuntimeEvent): {
    eventName: string;
    properties: Record<string, unknown>;
  } {
    switch (event.type) {
      case 'persona:before':
        return {
          eventName: 'Persona Processing Started',
          properties: {
            personaId: event.persona.id,
            personaName: event.persona.name,
            messageId: event.message.id,
          },
        };

      case 'persona:after':
        return {
          eventName: 'Persona Processing Completed',
          properties: {
            personaId: event.persona.id,
            personaName: event.persona.name,
            duration: event.duration,
            messageId: event.message.id,
            responseId: event.response.id,
            confidence: event.response.confidence,
          },
        };

      case 'persona:error':
        return {
          eventName: 'Persona Processing Error',
          properties: {
            personaId: event.persona.id,
            personaName: event.persona.name,
            error: event.error.message,
            errorName: event.error.name,
          },
        };

      case 'workflow:start':
        return {
          eventName: 'Workflow Started',
          properties: {
            workflowId: event.workflow.id,
          },
        };

      case 'workflow:complete':
        return {
          eventName: 'Workflow Completed',
          properties: {
            workflowId: event.workflow.id,
            duration: event.duration,
          },
        };

      case 'workflow:error':
        return {
          eventName: 'Workflow Error',
          properties: {
            workflowId: event.workflow.id,
            error: event.error.message,
            stepName: event.stepName,
          },
        };

      case 'llm:call':
        return {
          eventName: 'LLM API Call',
          properties: {
            provider: event.provider,
            model: event.model,
            personaId: event.persona.id,
          },
        };

      case 'llm:response':
        return {
          eventName: 'LLM API Response',
          properties: {
            provider: event.provider,
            model: event.model,
            duration: event.duration,
            tokensUsed: event.tokensUsed,
            cost: event.cost,
          },
        };

      case 'llm:error':
        return {
          eventName: 'LLM API Error',
          properties: {
            provider: event.provider,
            model: event.model,
            error: event.error.message,
          },
        };

      case 'team:formed':
        return {
          eventName: 'Team Formed',
          properties: {
            teamId: event.team.id,
            teamName: event.team.name,
            memberCount: event.team.members.length,
          },
        };

      case 'team:merge':
        return {
          eventName: 'Team Responses Merged',
          properties: {
            teamId: event.team.id,
            teamName: event.team.name,
            responseCount: event.responses.length,
          },
        };

      default:
        return {
          eventName: event.type,
          properties: {},
        };
    }
  }
}

/**
 * Create an analytics adapter
 *
 * @param config - Adapter configuration
 * @returns Event handler function
 *
 * @example
 * ```typescript
 * const analyticsAdapter = createAnalyticsAdapter({
 *   provider: myAnalyticsProvider,
 *   userId: 'user-123',
 *   globalProperties: {
 *     environment: 'production'
 *   },
 *   filter: (event) => {
 *     // Only track completion events
 *     return event.type.includes('after') || event.type.includes('complete');
 *   }
 * });
 *
 * runtime.on(analyticsAdapter);
 * ```
 */
export function createAnalyticsAdapter(
  config: AnalyticsAdapterConfig
): RuntimeEventHandler {
  const adapter = new AnalyticsAdapter(config);
  return adapter.getHandler();
}
