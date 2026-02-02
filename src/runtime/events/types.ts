/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Runtime Event Types
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Type-safe event definitions for runtime observability and integration.
 *
 * @packageDocumentation
 * @module @pcl/runtime/events
 * @version 1.0.0
 */

import type {
  Message,
  Response,
  PersonaState,
  TeamState,
  WorkflowState,
} from '../index.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emitted before a persona processes a message
 */
export interface PersonaBeforeEvent {
  readonly type: 'persona:before';
  readonly persona: PersonaState;
  readonly message: Message;
  readonly timestamp: Date;
}

/**
 * Emitted after a persona successfully processes a message
 */
export interface PersonaAfterEvent {
  readonly type: 'persona:after';
  readonly persona: PersonaState;
  readonly message: Message;
  readonly response: Response;
  readonly duration: number; // milliseconds
  readonly timestamp: Date;
}

/**
 * Emitted when a persona encounters an error
 */
export interface PersonaErrorEvent {
  readonly type: 'persona:error';
  readonly persona: PersonaState;
  readonly message: Message;
  readonly error: Error;
  readonly timestamp: Date;
}

/**
 * Emitted when a persona is activated
 */
export interface PersonaActivatedEvent {
  readonly type: 'persona:activated';
  readonly persona: PersonaState;
  readonly timestamp: Date;
}

/**
 * Emitted when a persona is deactivated
 */
export interface PersonaDeactivatedEvent {
  readonly type: 'persona:deactivated';
  readonly persona: PersonaState;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              WORKFLOW EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emitted when a workflow starts execution
 */
export interface WorkflowStartEvent {
  readonly type: 'workflow:start';
  readonly workflow: WorkflowState;
  readonly input?: unknown;
  readonly timestamp: Date;
}

/**
 * Emitted for each workflow step execution
 */
export interface WorkflowStepEvent {
  readonly type: 'workflow:step';
  readonly workflow: WorkflowState;
  readonly stepName: string;
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly result?: unknown;
  readonly timestamp: Date;
}

/**
 * Emitted when a workflow completes successfully
 */
export interface WorkflowCompleteEvent {
  readonly type: 'workflow:complete';
  readonly workflow: WorkflowState;
  readonly result: unknown;
  readonly duration: number; // milliseconds
  readonly timestamp: Date;
}

/**
 * Emitted when a workflow encounters an error
 */
export interface WorkflowErrorEvent {
  readonly type: 'workflow:error';
  readonly workflow: WorkflowState;
  readonly error: Error;
  readonly stepName?: string;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              LLM PROVIDER EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emitted before an LLM API call
 */
export interface LLMCallEvent {
  readonly type: 'llm:call';
  readonly provider: string;
  readonly model: string;
  readonly persona: PersonaState;
  readonly message: Message;
  readonly systemPrompt?: string;
  readonly timestamp: Date;
}

/**
 * Emitted after receiving an LLM response
 */
export interface LLMResponseEvent {
  readonly type: 'llm:response';
  readonly provider: string;
  readonly model: string;
  readonly persona: PersonaState;
  readonly response: Response;
  readonly tokensUsed?: number;
  readonly duration: number; // milliseconds
  readonly cost?: number; // USD
  readonly timestamp: Date;
}

/**
 * Emitted when an LLM call fails
 */
export interface LLMErrorEvent {
  readonly type: 'llm:error';
  readonly provider: string;
  readonly model: string;
  readonly persona: PersonaState;
  readonly error: Error;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emitted when a team is formed
 */
export interface TeamFormedEvent {
  readonly type: 'team:formed';
  readonly team: TeamState;
  readonly timestamp: Date;
}

/**
 * Emitted when a team is disbanded
 */
export interface TeamDisbandedEvent {
  readonly type: 'team:disbanded';
  readonly team: TeamState;
  readonly timestamp: Date;
}

/**
 * Emitted when team member responses are merged
 */
export interface TeamMergeEvent {
  readonly type: 'team:merge';
  readonly team: TeamState;
  readonly responses: Response[];
  readonly mergedResponse: Response;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              GENERIC EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emitted for general runtime errors
 */
export interface ErrorEvent {
  readonly type: 'error';
  readonly error: Error;
  readonly context?: Record<string, unknown>;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UNION TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All possible runtime events
 */
export type RuntimeEvent =
  // Persona events (5)
  | PersonaBeforeEvent
  | PersonaAfterEvent
  | PersonaErrorEvent
  | PersonaActivatedEvent
  | PersonaDeactivatedEvent
  // Workflow events (4)
  | WorkflowStartEvent
  | WorkflowStepEvent
  | WorkflowCompleteEvent
  | WorkflowErrorEvent
  // LLM events (3)
  | LLMCallEvent
  | LLMResponseEvent
  | LLMErrorEvent
  // Team events (3)
  | TeamFormedEvent
  | TeamDisbandedEvent
  | TeamMergeEvent
  // Generic (1)
  | ErrorEvent;

/**
 * Event handler function type
 */
export type RuntimeEventHandler = (event: RuntimeEvent) => void | Promise<void>;

/**
 * Event filter for selective subscription
 */
export type EventFilter = (event: RuntimeEvent) => boolean;

/**
 * Typed event handler with specific event type
 */
export type TypedEventHandler<T extends RuntimeEvent['type']> = (
  event: Extract<RuntimeEvent, { type: T }>
) => void | Promise<void>;
