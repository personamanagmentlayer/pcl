/**
 * Learned routing module
 * Part of Q2 2025 Adaptive Intelligence - Phase 4
 */

export { LearnedRouter } from './router.js';
export { TaskClassifier } from './task-classifier.js';

export type {
  RoutingConfig,
  RoutingMessage,
  RoutingDecision,
  ProviderScore,
  TaskFeatures,
} from './types.js';

export type { RoutableProvider } from './router.js';
export { DEFAULT_ROUTING_CONFIG } from './types.js';
