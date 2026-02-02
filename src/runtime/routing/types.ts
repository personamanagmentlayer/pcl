/**
 * Learned routing types
 * Part of Q2 2025 Adaptive Intelligence - Phase 4
 */

/**
 * Task features extracted from message
 */
export interface TaskFeatures {
  /** Message length in characters */
  messageLength: number;

  /** Complexity score (0-1) */
  complexity: number;

  /** Domain classification */
  domain: 'code' | 'analysis' | 'creative' | 'general';

  /** Required capabilities */
  requiredCapabilities: string[];

  /** Expected output length (estimated) */
  expectedOutputLength: number;

  /** Latency sensitivity (0-1, higher = need fast response) */
  latencySensitivity: number;

  /** Cost sensitivity (0-1, higher = need cheap) */
  costSensitivity: number;
}

/**
 * Provider scoring factors
 */
export interface ProviderScore {
  /** Provider ID */
  providerId: string;

  /** Model ID */
  modelId: string;

  /** Overall score */
  score: number;

  /** Individual factor scores */
  factors: {
    /** Capability match (0-1) */
    capability: number;

    /** Historical performance (0-1) */
    performance: number;

    /** Cost efficiency (0-1) */
    cost: number;

    /** Latency score (0-1) */
    latency: number;

    /** Availability (0-1) */
    availability: number;
  };
}

/**
 * Routing decision
 */
export interface RoutingDecision {
  /** Primary provider to use */
  primary: ProviderScore;

  /** Fallback providers (ordered by score) */
  fallbacks: ProviderScore[];

  /** Reasoning for decision */
  reasoning: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Message for routing
 */
export interface RoutingMessage {
  /** Message content */
  content: string;

  /** Optional metadata */
  metadata?: {
    /** Latency sensitivity (0-1) */
    latencySensitivity?: number;

    /** Cost sensitivity (0-1) */
    costSensitivity?: number;

    /** Attachments (e.g., images) */
    attachments?: Array<{
      type: string;
      data: any;
    }>;

    /** Other metadata */
    [key: string]: any;
  };
}

/**
 * Routing configuration
 */
export interface RoutingConfig {
  /** Enable learned routing */
  enabled: boolean;

  /** Enable fallback chain */
  fallbackChain: boolean;

  /** Number of fallbacks to include */
  fallbackCount: number;

  /** Scoring weights */
  weights: {
    capability: number;
    performance: number;
    cost: number;
    latency: number;
    availability: number;
  };
}

/**
 * Default routing configuration
 */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  enabled: true,
  fallbackChain: true,
  fallbackCount: 3,
  weights: {
    capability: 0.3,
    performance: 0.25,
    cost: 0.2,
    latency: 0.15,
    availability: 0.1,
  },
};
