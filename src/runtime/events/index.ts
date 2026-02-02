/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Runtime Event System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete event system for runtime observability, logging, and integration.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { createRuntime } from '@pcl/sdk';
 * import {
 *   createConsoleLogger,
 *   createFileLogger,
 *   createStructuredLogger,
 *   createAnalyticsAdapter,
 *   createErrorTrackingAdapter
 * } from '@pcl/sdk/events';
 *
 * const runtime = createRuntime();
 *
 * // Add console logger
 * runtime.on(createConsoleLogger({ level: 'info', colors: true }));
 *
 * // Add file logger
 * const fileLogger = createFileLogger({ directory: './logs' });
 * runtime.on(fileLogger.handler);
 *
 * // Add structured logger for external systems
 * runtime.on(createStructuredLogger({
 *   metadata: { service: 'my-app', version: '1.0.0' }
 * }));
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  RuntimeEvent,
  RuntimeEventHandler,
  EventFilter,
  TypedEventHandler,
  PersonaBeforeEvent,
  PersonaAfterEvent,
  PersonaErrorEvent,
  PersonaActivatedEvent,
  PersonaDeactivatedEvent,
  WorkflowStartEvent,
  WorkflowStepEvent,
  WorkflowCompleteEvent,
  WorkflowErrorEvent,
  LLMCallEvent,
  LLMResponseEvent,
  LLMErrorEvent,
  TeamFormedEvent,
  TeamDisbandedEvent,
  TeamMergeEvent,
  ErrorEvent,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              EVENT EMITTER
// ═══════════════════════════════════════════════════════════════════════════════

export { EventEmitter, createEventEmitter } from './emitter.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ConsoleLogger,
  createConsoleLogger,
  type ConsoleLoggerConfig,
  type LogLevel,
  FileLogger,
  createFileLogger,
  type FileLoggerConfig,
  StructuredLogger,
  createStructuredLogger,
  type StructuredLoggerConfig,
  type StructuredLogEntry,
} from './handlers/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              INTEGRATION ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  AnalyticsAdapter,
  createAnalyticsAdapter,
  type AnalyticsProvider,
  type AnalyticsAdapterConfig,
  ErrorTrackingAdapter,
  createErrorTrackingAdapter,
  type ErrorTrackingProvider,
  type ErrorTrackingAdapterConfig,
  DatabaseAdapter,
  createDatabaseAdapter,
  type DatabaseProvider,
  type DatabaseAdapterConfig,
} from './adapters/index.js';
