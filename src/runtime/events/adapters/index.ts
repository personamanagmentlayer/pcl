/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Event Integration Adapters
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Integration adapters for external services.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events/adapters
 * @version 1.0.0
 */

export {
  AnalyticsAdapter,
  createAnalyticsAdapter,
  type AnalyticsProvider,
  type AnalyticsAdapterConfig,
} from './analytics-adapter.js';

export {
  ErrorTrackingAdapter,
  createErrorTrackingAdapter,
  type ErrorTrackingProvider,
  type ErrorTrackingAdapterConfig,
} from './error-tracking-adapter.js';

export {
  DatabaseAdapter,
  createDatabaseAdapter,
  type DatabaseProvider,
  type DatabaseAdapterConfig,
} from './database-adapter.js';
