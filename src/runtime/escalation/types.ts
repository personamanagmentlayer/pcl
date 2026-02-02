/**
 * Auto-escalation types
 * Part of Q2 2025 Adaptive Intelligence - Phase 6
 */

/**
 * Response for escalation checking
 */
export interface EscalationResponse {
  content: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Execution context for escalation
 */
export interface EscalationContext {
  requestId: string;
  personaId: string;
  providerId: string;
  modelId: string;
  message: {
    content: string;
    metadata?: Record<string, unknown>;
  };
  complexity?: number;
  attempt: number;
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  /** Rule name */
  name: string;

  /** Condition function */
  condition: (
    response: EscalationResponse,
    context: EscalationContext
  ) => boolean;

  /** Action to take */
  action: 'retry' | 'fallback' | 'upgrade' | 'team';

  /** Target for escalation (provider, model, or team ID) */
  target?: string;

  /** Maximum number of retries */
  maxRetries?: number;

  /** Priority (higher = checked first) */
  priority?: number;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  /** Enable auto-escalation */
  enabled: boolean;

  /** Escalation rules */
  rules: EscalationRule[];

  /** Default action if no rules match */
  defaultAction: 'fail' | 'retry' | 'fallback';

  /** Global maximum retries across all rules */
  globalMaxRetries: number;
}

/**
 * Escalation decision
 */
export interface EscalationDecision {
  /** Should escalate */
  escalate: boolean;

  /** Action to take */
  action?: 'retry' | 'fallback' | 'upgrade' | 'team';

  /** Target for escalation */
  target?: string;

  /** Reason for escalation */
  reason?: string;

  /** Rule that triggered */
  rule?: string;
}

/**
 * Default escalation configuration
 */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  enabled: true,
  rules: [],
  defaultAction: 'fail',
  globalMaxRetries: 3,
};
