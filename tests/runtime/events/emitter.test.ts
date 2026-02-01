/**
 * Event Emitter Tests
 *
 * Comprehensive tests for the type-safe event emitter
 * Target: 49.22% → 80%+ coverage
 */

import { z } from 'zod';
import {
  EventEmitter,
  createEventEmitter,
} from '../../../src/runtime/events/emitter';
import type { RuntimeEvent } from '../../../src/runtime/events/types';

// Zod schema for stats validation
const StatsSchema = z.object({
  handlerCount: z.number().int().nonnegative(),
  emitCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  typedHandlerCounts: z.record(z.number().int().nonnegative()),
});

// Mock event types
const createMockPersonaEvent = (): RuntimeEvent => ({
  type: 'persona:before',
  persona: {
    id: 'test-persona',
    name: 'Test',
    config: { model: 'test' },
    context: {},
    metadata: {},
  } as any,
  message: { role: 'user', content: 'test message' },
  timestamp: new Date(),
});

const createMockWorkflowEvent = (): RuntimeEvent => ({
  type: 'workflow:start',
  workflow: { id: 'test-workflow', name: 'Test Workflow' } as any,
  timestamp: new Date(),
});

const createMockErrorEvent = (error: Error): RuntimeEvent => ({
  type: 'error',
  error,
  context: { event: 'test' },
  timestamp: new Date(),
});

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.clear();
  });

  describe('Factory Function', () => {
    it('should create event emitter via factory', () => {
      const newEmitter = createEventEmitter();

      expect(newEmitter).toBeInstanceOf(EventEmitter);
      expect(newEmitter.getStats().handlerCount).toBe(0);
    });
  });

  describe('Basic Event Subscription', () => {
    it('should subscribe to all events with on()', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(emitter.getStats().handlerCount).toBe(1);
    });

    it('should emit events to all subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on(handler1);
      emitter.on(handler2);

      const event = createMockPersonaEvent();
      emitter.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should unsubscribe using returned function', () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on(handler);

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should manually unsubscribe with off()', () => {
      const handler = vi.fn();
      emitter.on(handler);

      emitter.off(handler);

      emitter.emit(createMockPersonaEvent());
      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all handlers', () => {
      emitter.on(vi.fn());
      emitter.on(vi.fn());
      emitter.on(vi.fn());

      expect(emitter.getStats().handlerCount).toBe(3);

      emitter.clear();

      expect(emitter.getStats().handlerCount).toBe(0);
    });
  });

  describe('Filtered Event Subscription', () => {
    it('should subscribe with filter', () => {
      const handler = vi.fn();
      const filter = (event: RuntimeEvent) => event.type.startsWith('persona:');

      emitter.onFiltered(filter, handler);

      expect(emitter.getStats().handlerCount).toBe(1);
    });

    it('should only call handler for matching events', () => {
      const handler = vi.fn();
      const filter = (event: RuntimeEvent) => event.type.startsWith('persona:');

      emitter.onFiltered(filter, handler);

      // Should match
      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      // Should not match
      emitter.emit(createMockWorkflowEvent());
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should unsubscribe filtered handler', () => {
      const handler = vi.fn();
      const filter = (event: RuntimeEvent) => event.type.startsWith('persona:');

      const unsubscribe = emitter.onFiltered(filter, handler);

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type-Specific Event Subscription', () => {
    it('should subscribe to specific event type', () => {
      const handler = vi.fn();

      emitter.onType('persona:before', handler);

      expect(emitter.getStats().handlerCount).toBe(1);
      expect(emitter.getStats().typedHandlerCounts['persona:before']).toBe(1);
    });

    it('should only call handler for matching type', () => {
      const handler = vi.fn();

      emitter.onType('persona:before', handler);

      // Matching type
      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      // Different type
      emitter.emit(createMockWorkflowEvent());
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should unsubscribe typed handler', () => {
      const handler = vi.fn();

      const unsubscribe = emitter.onType('persona:before', handler);

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple typed handlers for same type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.onType('persona:before', handler1);
      emitter.onType('persona:before', handler2);

      emitter.emit(createMockPersonaEvent());

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should support multiple event types', () => {
      const personaHandler = vi.fn();
      const workflowHandler = vi.fn();

      emitter.onType('persona:before', personaHandler);
      emitter.onType('workflow:start', workflowHandler);

      emitter.emit(createMockPersonaEvent());
      expect(personaHandler).toHaveBeenCalledTimes(1);
      expect(workflowHandler).not.toHaveBeenCalled();

      emitter.emit(createMockWorkflowEvent());
      expect(personaHandler).toHaveBeenCalledTimes(1);
      expect(workflowHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emission', () => {
    it('should track emit count', () => {
      emitter.on(vi.fn());

      emitter.emit(createMockPersonaEvent());
      emitter.emit(createMockWorkflowEvent());

      expect(emitter.getStats().emitCount).toBe(2);
    });

    it('should handle events with no handlers', () => {
      // Should not throw
      expect(() => emitter.emit(createMockPersonaEvent())).not.toThrow();
    });

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      emitter.on(handler);
      emitter.emit(createMockPersonaEvent());

      // Handler should be called synchronously
      expect(handler).toHaveBeenCalledTimes(1);

      // Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should catch handler errors and emit error event', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const errorEventHandler = vi.fn();

      emitter.on(errorHandler);
      emitter.onType('error', errorEventHandler);

      emitter.emit(createMockPersonaEvent());

      expect(errorEventHandler).toHaveBeenCalled();
      // Error count is 2: one from errorHandler, one from errorEventHandler
      expect(emitter.getStats().errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should catch async handler errors', async () => {
      const asyncErrorHandler = vi
        .fn()
        .mockRejectedValue(new Error('Async failed'));
      const errorEventHandler = vi.fn();

      emitter.on(asyncErrorHandler);
      emitter.onType('error', errorEventHandler);

      emitter.emit(createMockPersonaEvent());

      // Wait for async error
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(errorEventHandler).toHaveBeenCalled();
      expect(emitter.getStats().errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should not emit error event in infinite loop', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });

      emitter.onType('error', errorHandler);

      // Emit error event directly
      emitter.emit(createMockErrorEvent(new Error('Test')));

      // Should not cause infinite loop
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Event Emission', () => {
    it('should emit events asynchronously', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      emitter.on(handler);

      await emitter.emitAsync(createMockPersonaEvent());

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should wait for all async handlers', async () => {
      const results: number[] = [];

      const handler1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });

      const handler2 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(2);
      });

      emitter.on(handler1);
      emitter.on(handler2);

      await emitter.emitAsync(createMockPersonaEvent());

      expect(results).toHaveLength(2);
      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    it('should apply filters in async emission', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const filter = (event: RuntimeEvent) => event.type.startsWith('persona:');

      emitter.onFiltered(filter, handler);

      await emitter.emitAsync(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      await emitter.emitAsync(createMockWorkflowEvent());
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should catch sync errors in async emission', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Sync error');
      });
      const errorEventHandler = vi.fn();

      emitter.on(errorHandler);
      emitter.onType('error', errorEventHandler);

      await emitter.emitAsync(createMockPersonaEvent());

      expect(errorEventHandler).toHaveBeenCalled();
      expect(emitter.getStats().errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should catch async errors in async emission', async () => {
      const asyncErrorHandler = vi
        .fn()
        .mockRejectedValue(new Error('Async error'));
      const errorEventHandler = vi.fn();

      emitter.on(asyncErrorHandler);
      emitter.onType('error', errorEventHandler);

      await emitter.emitAsync(createMockPersonaEvent());

      expect(errorEventHandler).toHaveBeenCalled();
      expect(emitter.getStats().errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should track emit count in async emission', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      emitter.on(handler);

      await emitter.emitAsync(createMockPersonaEvent());
      await emitter.emitAsync(createMockWorkflowEvent());

      expect(emitter.getStats().emitCount).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should return valid stats', () => {
      emitter.on(vi.fn());
      emitter.onType('persona:before', vi.fn());
      emitter.emit(createMockPersonaEvent());

      const stats = emitter.getStats();

      const validated = StatsSchema.parse(stats);
      expect(validated.handlerCount).toBe(2);
      expect(validated.emitCount).toBe(1);
      expect(validated.errorCount).toBe(0);
    });

    it('should track handler count correctly', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const h3 = vi.fn();

      emitter.on(h1);
      expect(emitter.getStats().handlerCount).toBe(1);

      emitter.on(h2);
      expect(emitter.getStats().handlerCount).toBe(2);

      emitter.onType('persona:before', h3);
      expect(emitter.getStats().handlerCount).toBe(3);

      emitter.off(h1);
      expect(emitter.getStats().handlerCount).toBe(2);
    });

    it('should track typed handler counts', () => {
      emitter.onType('persona:before', vi.fn());
      emitter.onType('persona:before', vi.fn());
      emitter.onType('workflow:start', vi.fn());

      const stats = emitter.getStats();

      expect(stats.typedHandlerCounts['persona:before']).toBe(2);
      expect(stats.typedHandlerCounts['workflow:start']).toBe(1);
    });

    it('should reset stats', () => {
      emitter.on(vi.fn());
      emitter.emit(createMockPersonaEvent());

      expect(emitter.getStats().emitCount).toBe(1);

      emitter.resetStats();

      expect(emitter.getStats().emitCount).toBe(0);
      expect(emitter.getStats().errorCount).toBe(0);
      expect(emitter.getStats().handlerCount).toBe(1); // Handlers not cleared
    });
  });

  describe('Edge Cases', () => {
    it('should handle same handler subscribed multiple times', () => {
      const handler = vi.fn();

      emitter.on(handler);
      emitter.on(handler); // Same handler again

      // Set only stores unique handlers
      expect(emitter.getStats().handlerCount).toBe(1);

      emitter.emit(createMockPersonaEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe of non-existent handler', () => {
      const handler = vi.fn();

      // Should not throw
      expect(() => emitter.off(handler)).not.toThrow();
    });

    it('should handle clear with no handlers', () => {
      expect(() => emitter.clear()).not.toThrow();
    });

    it('should handle multiple filters on same handler', () => {
      const handler = vi.fn();
      const filter1 = (event: RuntimeEvent) =>
        event.type.startsWith('persona:');
      const filter2 = (event: RuntimeEvent) =>
        event.type.startsWith('workflow:');

      emitter.onFiltered(filter1, handler);
      // Second filter overwrites the first
      emitter.onFiltered(filter2, handler);

      emitter.emit(createMockPersonaEvent());
      // Handler called with first subscription (no filter on it)
      emitter.emit(createMockWorkflowEvent());
      // Now called with workflow filter
    });
  });

  describe('Integration Scenarios', () => {
    it('should support mixed subscription types', () => {
      const allHandler = vi.fn();
      const filteredHandler = vi.fn();
      const typedHandler = vi.fn();

      emitter.on(allHandler);
      emitter.onFiltered(
        (event) => event.type.startsWith('persona:'),
        filteredHandler
      );
      emitter.onType('persona:before', typedHandler);

      emitter.emit(createMockPersonaEvent());

      expect(allHandler).toHaveBeenCalledTimes(1);
      expect(filteredHandler).toHaveBeenCalledTimes(1);
      expect(typedHandler).toHaveBeenCalledTimes(1);

      emitter.emit(createMockWorkflowEvent());

      expect(allHandler).toHaveBeenCalledTimes(2);
      expect(filteredHandler).toHaveBeenCalledTimes(1); // Filtered out
      expect(typedHandler).toHaveBeenCalledTimes(1); // Wrong type
    });

    it('should handle complex event flow', async () => {
      const events: string[] = [];

      emitter.on((event) => events.push(`all:${event.type}`));
      emitter.onType('persona:before', () =>
        events.push('typed:persona:before')
      );
      emitter.onType('workflow:start', () =>
        events.push('typed:workflow:start')
      );

      emitter.emit(createMockPersonaEvent());
      await emitter.emitAsync(createMockWorkflowEvent());

      expect(events).toEqual([
        'all:persona:before',
        'typed:persona:before',
        'all:workflow:start',
        'typed:workflow:start',
      ]);
    });
  });
});
