/**
 * Auto-escalation module
 * Part of Q2 2025 Adaptive Intelligence - Phase 6
 */

export { EscalationManager } from './escalation-manager.js';
export { DEFAULT_ESCALATION_RULES, createEscalationRule } from './triggers.js';

export type {
  EscalationConfig,
  EscalationResponse,
  EscalationContext,
  EscalationDecision,
  EscalationRule,
} from './types.js';

export { DEFAULT_ESCALATION_CONFIG } from './types.js';
