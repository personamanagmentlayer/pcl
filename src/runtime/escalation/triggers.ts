/**
 * Default escalation triggers
 * Part of Q2 2025 Adaptive Intelligence - Phase 6
 */

import type { EscalationRule } from './types.js';

/**
 * Pre-defined escalation rules
 */
export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    name: 'low-confidence',
    condition: (response) => response.confidence < 0.5,
    action: 'retry',
    maxRetries: 2,
    priority: 3,
  },
  {
    name: 'very-low-confidence',
    condition: (response) => response.confidence < 0.3,
    action: 'upgrade',
    target: 'claude-opus-4', // Upgrade to more powerful model
    priority: 5,
  },
  {
    name: 'error-response',
    condition: (response) => {
      const content = response.content.toLowerCase();
      return (
        content.includes('error') ||
        content.includes('cannot') ||
        content.includes('unable')
      );
    },
    action: 'fallback',
    priority: 4,
  },
  {
    name: 'short-response',
    condition: (response, context) => {
      return (
        response.content.length < 50 && context.message.content.length > 200
      );
    },
    action: 'retry',
    maxRetries: 1,
    priority: 2,
  },
  {
    name: 'high-complexity-low-confidence',
    condition: (response, context) => {
      return (context.complexity || 0) > 0.7 && response.confidence < 0.6;
    },
    action: 'team',
    target: 'expert-team',
    priority: 4,
  },
  {
    name: 'empty-response',
    condition: (response) => {
      return response.content.trim().length === 0;
    },
    action: 'retry',
    maxRetries: 1,
    priority: 5,
  },
  {
    name: 'refused-response',
    condition: (response) => {
      const content = response.content.toLowerCase();
      return (
        content.includes("i can't") ||
        content.includes('i cannot') ||
        content.includes('i am unable') ||
        content.includes('not possible')
      );
    },
    action: 'fallback',
    priority: 4,
  },
];

/**
 * Create custom escalation rule
 */
export function createEscalationRule(
  name: string,
  condition: (response: any, context: any) => boolean,
  action: 'retry' | 'fallback' | 'upgrade' | 'team',
  options?: {
    target?: string;
    maxRetries?: number;
    priority?: number;
  }
): EscalationRule {
  return {
    name,
    condition,
    action,
    target: options?.target,
    maxRetries: options?.maxRetries,
    priority: options?.priority || 1,
  };
}
