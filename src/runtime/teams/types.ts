/**
 * Team weight adjustment types
 * Part of Q2 2025 Adaptive Intelligence - Phase 3
 */

/**
 * Merge outcome from team processing
 */
export interface MergeOutcome {
  /** Timestamp of merge */
  timestamp: number;

  /** Team ID */
  teamId: string;

  /** Responses from team members */
  memberResponses: Array<{
    personaId: string;
    response: any;
    confidence: number;
    weight: number;
  }>;

  /** Final merged response */
  finalResponse: any;

  /** Merge mode used */
  mergeMode: string;

  /** Optional user feedback */
  feedback?: {
    /** Quality score (0-1) */
    quality?: number;

    /** Which member's response was selected/preferred */
    selected?: string;

    /** User comments */
    comments?: string;
  };
}

/**
 * Performance metrics for a team member
 */
export interface MemberPerformance {
  /** Total number of responses */
  totalResponses: number;

  /** Average confidence of responses */
  avgConfidence: number;

  /** Selection rate (how often this member was chosen) */
  selectionRate: number;

  /** Average quality from user feedback */
  avgQuality: number;

  /** Performance trend */
  trend?: 'improving' | 'stable' | 'degrading';
}

/**
 * Configuration for adaptive weight adjustment
 */
export interface AdaptiveWeightConfig {
  /** Enable adaptive weight adjustment */
  enabled: boolean;

  /** Learning rate for weight updates (0.05-0.2) */
  learningRate: number;

  /** Minimum weight allowed */
  minWeight: number;

  /** Maximum weight allowed */
  maxWeight: number;

  /** Adjust weights every N merges */
  adaptationInterval: number;

  /** Signal weights for computing target weight */
  signals: {
    /** Weight for confidence signal (0-1) */
    confidence: number;

    /** Weight for selection rate signal (0-1) */
    selection: number;

    /** Weight for quality signal (0-1) */
    quality: number;
  };
}

/**
 * Default adaptive weight configuration
 */
export const DEFAULT_ADAPTIVE_WEIGHT_CONFIG: AdaptiveWeightConfig = {
  enabled: true,
  learningRate: 0.1,
  minWeight: 0.1,
  maxWeight: 2.0,
  adaptationInterval: 10,
  signals: {
    confidence: 0.3,
    selection: 0.4,
    quality: 0.3,
  },
};

/**
 * Weight adjustment event
 */
export interface WeightAdjustmentEvent {
  /** Team ID */
  teamId: string;

  /** Timestamp */
  timestamp: number;

  /** Old weights */
  oldWeights: Map<string, number>;

  /** New weights */
  newWeights: Map<string, number>;

  /** Reason for adjustment */
  reason: string;
}
