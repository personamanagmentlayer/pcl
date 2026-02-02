/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — Runtime Types
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shared type definitions for runtime modules to avoid circular dependencies
 *
 * @packageDocumentation
 * @module @pcl/runtime/runtime-types
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Message structure for persona communication
 */
export interface Message {
  readonly id: string;
  readonly from: string | null;
  readonly to: string | null;
  readonly content: string;
  readonly metadata: MessageMetadata;
  readonly timestamp: Date;
}

export interface MessageMetadata {
  readonly topic?: string;
  readonly priority?: 'low' | 'normal' | 'high' | 'urgent';
  readonly replyTo?: string;
  readonly tags?: readonly string[];
  readonly context?: Record<string, unknown>;
}

/**
 * Response from a persona
 */
export interface Response {
  readonly content: string;
  readonly personaId: string;
  readonly timestamp: Date;
  readonly tokens?: number;
  readonly metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  readonly model?: string;
  readonly reasoning?: string;
  readonly confidence?: number;
  readonly [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Persona state - forward declaration to avoid circular dependency
 */
export interface PersonaState {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly config: PersonaConfig;
  readonly memory: PersonaMemory;
  readonly stats: PersonaStats;
}

export interface PersonaConfig {
  readonly intent: string;
  readonly tone?: 'formal' | 'casual' | 'technical' | 'creative' | 'balanced';
  readonly depth?: 'concise' | 'standard' | 'detailed' | 'comprehensive';
  readonly verbosity?: 'terse' | 'normal' | 'verbose';
  readonly outputFormat?: 'prose' | 'structured' | 'code' | 'json' | 'markdown';
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly skills?: readonly string[];
  readonly constraints?: readonly string[];
  readonly tags?: readonly string[];
  readonly [key: string]: unknown;
}

export interface PersonaMemory {
  readonly shortTerm: readonly Message[];
  readonly context: ReadonlyMap<string, unknown>;
  readonly facts: ReadonlyMap<string, unknown>;
}

export interface PersonaStats {
  readonly messagesProcessed: number;
  readonly tokensUsed: number;
  readonly activationCount: number;
  readonly lastActivation?: Date;
}

/**
 * Minimal PersonaInstance interface for type checking
 */
export interface PersonaInstance {
  process(message: Message): Promise<Response>;
  getState(): PersonaState;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
}

export interface TeamState {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly members: readonly TeamMember[];
  readonly mergeStrategy:
    | 'first'
    | 'last'
    | 'all'
    | 'consensus'
    | 'debate'
    | 'chain'
    | 'parallel';
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              WORKFLOW TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkflowState {
  readonly id: string;
  readonly name: string;
  readonly currentStep: number;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
}
