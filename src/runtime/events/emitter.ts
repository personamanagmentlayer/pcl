/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Event Emitter
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Type-safe event emitter for runtime observability.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events
 * @version 1.0.0
 */

import type {
  RuntimeEvent,
  RuntimeEventHandler,
  EventFilter,
  TypedEventHandler,
} from './types.js';

/**
 * Event emitter with type-safe handlers and filtering
 */
export class EventEmitter {
  private readonly handlers: Set<RuntimeEventHandler> = new Set();
  private readonly filteredHandlers: Map<RuntimeEventHandler, EventFilter> =
    new Map();
  private readonly typedHandlers: Map<string, Set<RuntimeEventHandler>> =
    new Map();
  private emitCount = 0;
  private errorCount = 0;

  /**
   * Subscribe to all events
   *
   * @param handler - Function to call for each event
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = emitter.on((event) => {
   *   console.log('Event:', event.type);
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  on(handler: RuntimeEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.off(handler);
  }

  /**
   * Subscribe to events matching a filter
   *
   * @param filter - Function to filter events
   * @param handler - Function to call for matching events
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * // Only persona events
   * emitter.onFiltered(
   *   (event) => event.type.startsWith('persona:'),
   *   (event) => console.log('Persona event:', event)
   * );
   * ```
   */
  onFiltered(filter: EventFilter, handler: RuntimeEventHandler): () => void {
    this.handlers.add(handler);
    this.filteredHandlers.set(handler, filter);
    return () => this.off(handler);
  }

  /**
   * Subscribe to a specific event type (type-safe)
   *
   * @param type - Event type to listen for
   * @param handler - Type-safe handler for this event type
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * emitter.onType('persona:before', (event) => {
   *   // event is narrowed to PersonaBeforeEvent
   *   console.log('Processing message:', event.message.content);
   * });
   * ```
   */
  onType<T extends RuntimeEvent['type']>(
    type: T,
    handler: TypedEventHandler<T>
  ): () => void {
    if (!this.typedHandlers.has(type)) {
      this.typedHandlers.set(type, new Set());
    }

    const wrappedHandler: RuntimeEventHandler = (event: RuntimeEvent) => {
      if (event.type === type) {
        // @ts-expect-error - TypeScript can't narrow the union type here
        handler(event);
      }
    };

    this.typedHandlers.get(type)!.add(wrappedHandler);
    this.handlers.add(wrappedHandler);

    return () => {
      this.typedHandlers.get(type)?.delete(wrappedHandler);
      this.handlers.delete(wrappedHandler);
    };
  }

  /**
   * Unsubscribe a handler
   *
   * @param handler - Handler to remove
   */
  off(handler: RuntimeEventHandler): void {
    this.handlers.delete(handler);
    this.filteredHandlers.delete(handler);

    // Remove from typed handlers
    for (const handlers of this.typedHandlers.values()) {
      handlers.delete(handler);
    }
  }

  /**
   * Remove all event handlers
   */
  clear(): void {
    this.handlers.clear();
    this.filteredHandlers.clear();
    this.typedHandlers.clear();
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event to emit
   *
   * @example
   * ```typescript
   * emitter.emit({
   *   type: 'persona:before',
   *   persona: personaState,
   *   message: message,
   *   timestamp: new Date()
   * });
   * ```
   */
  emit(event: RuntimeEvent): void {
    this.emitCount++;

    for (const handler of this.handlers) {
      // Check filter if one exists
      const filter = this.filteredHandlers.get(handler);
      if (filter && !filter(event)) {
        continue;
      }

      try {
        const result = handler(event);

        // Handle async handlers
        if (result instanceof Promise) {
          result.catch((error: Error) => {
            this.errorCount++;
            console.error('[PCL EventEmitter] Async handler error:', error);
            // Emit error event (avoid infinite loop by checking type)
            if (event.type !== 'error') {
              this.emit({
                type: 'error',
                error,
                context: { event: event.type, handler: handler.name },
                timestamp: new Date(),
              });
            }
          });
        }
      } catch (error) {
        this.errorCount++;
        console.error('[PCL EventEmitter] Handler error:', error);

        // Emit error event (avoid infinite loop)
        if (event.type !== 'error') {
          this.emit({
            type: 'error',
            error: error as Error,
            context: { event: event.type, handler: handler.name },
            timestamp: new Date(),
          });
        }
      }
    }
  }

  /**
   * Emit an event asynchronously (all handlers awaited)
   *
   * @param event - Event to emit
   *
   * @example
   * ```typescript
   * await emitter.emitAsync({
   *   type: 'persona:after',
   *   persona: personaState,
   *   message: message,
   *   response: response,
   *   duration: 150,
   *   timestamp: new Date()
   * });
   * ```
   */
  async emitAsync(event: RuntimeEvent): Promise<void> {
    this.emitCount++;

    const promises: Promise<void>[] = [];

    for (const handler of this.handlers) {
      // Check filter if one exists
      const filter = this.filteredHandlers.get(handler);
      if (filter && !filter(event)) {
        continue;
      }

      try {
        const result = handler(event);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        this.errorCount++;
        console.error('[PCL EventEmitter] Handler error:', error);

        // Emit error event
        if (event.type !== 'error') {
          this.emit({
            type: 'error',
            error: error as Error,
            context: { event: event.type, handler: handler.name },
            timestamp: new Date(),
          });
        }
      }
    }

    // Wait for all async handlers
    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (error) {
        this.errorCount++;
        console.error('[PCL EventEmitter] Async handlers error:', error);

        if (event.type !== 'error') {
          this.emit({
            type: 'error',
            error: error as Error,
            context: { event: event.type },
            timestamp: new Date(),
          });
        }
      }
    }
  }

  /**
   * Get statistics about event emission
   */
  getStats(): {
    handlerCount: number;
    emitCount: number;
    errorCount: number;
    typedHandlerCounts: Record<string, number>;
  } {
    const typedHandlerCounts: Record<string, number> = {};
    for (const [type, handlers] of this.typedHandlers) {
      typedHandlerCounts[type] = handlers.size;
    }

    return {
      handlerCount: this.handlers.size,
      emitCount: this.emitCount,
      errorCount: this.errorCount,
      typedHandlerCounts,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.emitCount = 0;
    this.errorCount = 0;
  }
}

/**
 * Create a new event emitter
 *
 * @returns New EventEmitter instance
 *
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 *
 * emitter.on((event) => {
 *   console.log('Event:', event.type);
 * });
 *
 * emitter.emit({
 *   type: 'persona:activated',
 *   persona: personaState,
 *   timestamp: new Date()
 * });
 * ```
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}
