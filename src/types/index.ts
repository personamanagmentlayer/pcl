/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Core Type Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @packageDocumentation
 * @module @pcl/types
 * @version 1.0.0
 * @license Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a branded type for nominal typing
 */
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for personas (uppercase) */
export type PersonaId = Brand<string, 'PersonaId'>;

/** Unique identifier for teams */
export type TeamId = Brand<string, 'TeamId'>;

/** Unique identifier for workflows */
export type WorkflowId = Brand<string, 'WorkflowId'>;

/** Unique identifier for skills */
export type SkillId = Brand<string, 'SkillId'>;

/** Unique identifier for snapshots */
export type SnapshotId = Brand<string, 'SnapshotId'>;

/** Unique identifier for sessions */
export type SessionId = Brand<string, 'SessionId'>;

/** Unique identifier for modules */
export type ModuleId = Brand<string, 'ModuleId'>;

/** Unique identifier for registries */
export type RegistryId = Brand<string, 'RegistryId'>;

/** Semantic version string */
export type SemVer = Brand<string, 'SemVer'>;

/** ISO 639-1 language code */
export type LangCode = Brand<string, 'LangCode'>;

/** URL string */
export type URLString = Brand<string, 'URLString'>;

/** UUID string */
export type UUID = Brand<string, 'UUID'>;

// Brand constructors
export const PersonaId = (id: string): PersonaId =>
  id.toUpperCase() as PersonaId;
export const TeamId = (id: string): TeamId => id as TeamId;
export const WorkflowId = (id: string): WorkflowId => id as WorkflowId;
export const SkillId = (id: string): SkillId => id as SkillId;
export const SnapshotId = (id: string): SnapshotId => id as SnapshotId;
export const SessionId = (id: string): SessionId => id as SessionId;
export const ModuleId = (id: string): ModuleId => id as ModuleId;
export const RegistryId = (id: string): RegistryId => id as RegistryId;

// ═══════════════════════════════════════════════════════════════════════════════
//                              RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = PCLError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Constructors for Result */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Type guard for Ok result */
export const isOk = <T, E>(
  result: Result<T, E>
): result is { ok: true; value: T } => result.ok === true;

/** Type guard for Err result */
export const isErr = <T, E>(
  result: Result<T, E>
): result is { ok: false; error: E } => result.ok === false;

/**
 * Option type for nullable values
 * Inspired by Rust's Option<T>
 */
export type Option<T> = Some<T> | None;

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

/** Constructors for Option */
export const Some = <T>(value: T): Option<T> => ({ _tag: 'Some', value });
export const None: Option<never> = { _tag: 'None' };

/** Type guards for Option */
export const isSome = <T>(opt: Option<T>): opt is Some<T> =>
  opt._tag === 'Some';
export const isNone = <T>(opt: Option<T>): opt is None => opt._tag === 'None';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SOURCE LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Position in source code */
export interface Position {
  /** 1-based line number */
  readonly line: number;
  /** 1-based column number */
  readonly column: number;
  /** 0-based byte offset */
  readonly offset: number;
}

/** Span in source code */
export interface Span {
  readonly start: Position;
  readonly end: Position;
  /** Source file path or identifier */
  readonly source?: string;
}

/** Creates a position */
export const Position = (
  line: number,
  column: number,
  offset: number
): Position => ({
  line,
  column,
  offset,
});

/** Creates a span */
export const Span = (
  start: Position,
  end: Position,
  source?: string
): Span => ({
  start,
  end,
  source,
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ENUMERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tone styles for personas
 */
export type Tone =
  | 'formal'
  | 'direct'
  | 'casual'
  | 'socratic'
  | 'academic'
  | 'analytical'
  | 'pragmatic'
  | 'vigilant'
  | 'strategic'
  | 'empathetic'
  | 'challenging'
  | 'accessible'
  | 'precise'
  | 'rigorous'
  | 'nuanced'
  | 'technical'
  | 'factual'
  | 'cautious';

export const TONES: readonly Tone[] = [
  'formal',
  'direct',
  'casual',
  'socratic',
  'academic',
  'analytical',
  'pragmatic',
  'vigilant',
  'strategic',
  'empathetic',
  'challenging',
  'accessible',
  'precise',
  'rigorous',
  'nuanced',
  'technical',
  'factual',
  'cautious',
] as const;

/**
 * Output formats
 */
export type OutputFormat =
  | 'prose'
  | 'markdown'
  | 'json'
  | 'yaml'
  | 'code'
  | 'table'
  | 'RFC'
  | 'PRD'
  | 'ADR'
  | 'C4'
  | 'mermaid'
  | 'plantuml'
  | 'openapi'
  | 'executive'
  | 'minimal';

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  'prose',
  'markdown',
  'json',
  'yaml',
  'code',
  'table',
  'RFC',
  'PRD',
  'ADR',
  'C4',
  'mermaid',
  'plantuml',
  'openapi',
  'executive',
  'minimal',
] as const;

/**
 * Merge modes for persona composition
 */
export type MergeMode =
  | 'primary' // Lead persona decides, others advise
  | 'consensus' // Synthesize all perspectives
  | 'majority' // Weighted voting
  | 'dissent' // Highlight disagreements
  | 'compare' // Side-by-side comparison
  | 'append' // Concatenate outputs
  | 'debate' // Visible deliberation
  | 'chain' // Sequential transformation
  | 'vote' // Democratic decision
  | 'weighted' // Weighted combination
  | 'roundrobin' // Rotating leadership
  | 'random'; // Random selection

export const MERGE_MODES: readonly MergeMode[] = [
  'primary',
  'consensus',
  'majority',
  'dissent',
  'compare',
  'append',
  'debate',
  'chain',
  'vote',
  'weighted',
  'roundrobin',
  'random',
] as const;

/**
 * Context size levels
 */
export type ContextSize = 'minimal' | 'compact' | 'standard' | 'full';

export const CONTEXT_SIZES: readonly ContextSize[] = [
  'minimal',
  'compact',
  'standard',
  'full',
] as const;

/**
 * Depth levels for response detail
 */
export type Depth =
  | 'shallow'
  | 'standard'
  | 'detailed'
  | 'thorough'
  | 'exhaustive';

export const DEPTH_LEVELS: readonly Depth[] = [
  'shallow',
  'standard',
  'detailed',
  'thorough',
  'exhaustive',
] as const;

/**
 * Verbosity levels for response length
 */
export type Verbosity =
  | 'minimal'
  | 'concise'
  | 'normal'
  | 'detailed'
  | 'verbose';

export const VERBOSITY_LEVELS: readonly Verbosity[] = [
  'minimal',
  'concise',
  'normal',
  'detailed',
  'verbose',
] as const;

/**
 * Trace levels
 */
export type TraceLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'events'
  | 'reasoning'
  | 'full';

export const TRACE_LEVELS: readonly TraceLevel[] = [
  'debug',
  'info',
  'warn',
  'error',
  'events',
  'reasoning',
  'full',
] as const;

/**
 * Audit modes
 */
export type AuditMode = 'off' | 'on' | 'strict';

export const AUDIT_MODES: readonly AuditMode[] = [
  'off',
  'on',
  'strict',
] as const;

/**
 * Runtime status
 */
export type RuntimeStatus = 'idle' | 'active' | 'workflow' | 'paused' | 'error';

export const RUNTIME_STATUSES: readonly RuntimeStatus[] = [
  'idle',
  'active',
  'workflow',
  'paused',
  'error',
] as const;

/**
 * Workflow step status
 */
export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export const STEP_STATUSES: readonly StepStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'cancelled',
] as const;

/**
 * Hook types
 */
export type HookType =
  | 'onActivate'
  | 'onDeactivate'
  | 'onError'
  | 'onMessage'
  | 'onStep'
  | 'onComplete'
  | 'beforeMerge'
  | 'afterMerge'
  | 'onSpawn'
  | 'onDespawn'
  | 'onTimeout'
  | 'onRetry';

export const HOOK_TYPES: readonly HookType[] = [
  'onActivate',
  'onDeactivate',
  'onError',
  'onMessage',
  'onStep',
  'onComplete',
  'beforeMerge',
  'afterMerge',
  'onSpawn',
  'onDespawn',
  'onTimeout',
  'onRetry',
] as const;

/**
 * Visibility modifiers
 */
export type Visibility = 'pub' | 'priv';

/**
 * Backoff strategies for retries
 */
export type BackoffStrategy =
  | 'linear'
  | 'exponential'
  | 'constant'
  | 'fibonacci'
  | 'random';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SKILL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shared skill category
 */
export interface SharedSkillCategory {
  readonly id: SkillId;
  readonly category: string;
  readonly skills: readonly string[];
  readonly description?: string;
}

/**
 * Skill reference - can be a string or a reference to a shared skill
 */
export type SkillRef =
  | { readonly kind: 'inline'; readonly value: string }
  | { readonly kind: 'shared'; readonly id: SkillId }
  | {
      readonly kind: 'qualified';
      readonly module: ModuleId;
      readonly id: SkillId;
    };

/**
 * Skill definition for personas
 */
export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  readonly category?: string;
  readonly items: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTRAINT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Constraint types
 */
export type ConstraintType =
  | 'text' // Simple text constraint
  | 'comparison' // value op expression
  | 'assertion' // boolean expression
  | 'limit' // resource limit
  | 'pattern'; // regex pattern

/**
 * Comparison operators for constraints
 */
export type ComparisonOp =
  | '=='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'in'
  | 'matches';

/**
 * Constraint definition
 */
export type Constraint =
  | { readonly kind: 'text'; readonly value: string }
  | {
      readonly kind: 'comparison';
      readonly field: string;
      readonly op: ComparisonOp;
      readonly value: unknown;
    }
  | { readonly kind: 'assertion'; readonly expression: string }
  | {
      readonly kind: 'limit';
      readonly resource: string;
      readonly max: number;
      readonly unit?: string;
    }
  | {
      readonly kind: 'pattern';
      readonly field: string;
      readonly pattern: string;
    };

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete persona definition
 */
export interface Persona {
  // Identity
  readonly id: PersonaId;
  readonly name: string;
  readonly version?: SemVer;

  // Core
  readonly intent: string;
  readonly capabilities?: readonly string[];
  readonly tone: Tone;

  // Skills
  readonly sharedSkills?: readonly SkillId[];
  readonly specializedSkills?: readonly string[];
  readonly skills?: readonly SkillRef[];

  // Constraints
  readonly constraints?: readonly Constraint[];

  // Tags for semantic routing
  readonly tags?: readonly string[];

  // Metadata
  readonly metadata?: PersonaMetadata;

  // Source location (for error reporting)
  readonly span?: Span;
}

/**
 * Persona metadata
 */
export interface PersonaMetadata {
  readonly author?: string;
  readonly license?: string;
  readonly source?: URLString;
  readonly description?: string;
  readonly documentation?: URLString;
  readonly repository?: URLString;
  readonly homepage?: URLString;
  readonly keywords?: readonly string[];
  readonly deprecated?: boolean | string;
  readonly since?: SemVer;
  readonly recommendedLLM?: string;
  readonly [key: string]: unknown;
}

/**
 * Runtime persona instance
 */
export interface PersonaInstance {
  readonly persona: Persona;
  readonly activatedAt: Date;
  readonly weight: number;
  readonly spawnIndex?: number; // For spawned instances
  readonly context?: Record<string, unknown>;
}

/**
 * Lightweight persona reference for state
 */
export interface PersonaRef {
  readonly kind: 'id' | 'tag' | 'skill' | 'qualified' | 'spawn';
  readonly id?: PersonaId;
  readonly tag?: string;
  readonly skill?: string;
  readonly module?: ModuleId;
  readonly count?: number; // For spawn
}

/** Create persona reference helpers */
export const PersonaRef = {
  id: (id: PersonaId): PersonaRef => ({ kind: 'id', id }),
  tag: (tag: string): PersonaRef => ({ kind: 'tag', tag }),
  skill: (skill: string): PersonaRef => ({ kind: 'skill', skill }),
  qualified: (module: ModuleId, id: PersonaId): PersonaRef => ({
    kind: 'qualified',
    module,
    id,
  }),
  spawn: (id: PersonaId, count: number): PersonaRef => ({
    kind: 'spawn',
    id,
    count,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Team definition
 */
export interface Team {
  // Identity
  readonly id: TeamId;
  readonly name: string;
  readonly version?: SemVer;

  // Composition
  readonly members: readonly PersonaRef[];
  readonly defaultPrimary?: PersonaRef;
  readonly defaultMerge?: MergeMode;

  // Configuration
  readonly quorum?: Quorum;
  readonly conflictOrder?: readonly PersonaRef[];
  readonly weights?: Record<string, number>;

  // Metadata
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly metadata?: TeamMetadata;

  // Source location
  readonly span?: Span;
}

/**
 * Team metadata
 */
export interface TeamMetadata {
  readonly author?: string;
  readonly domain?: string;
  readonly escalation?: string;
  readonly [key: string]: unknown;
}

/**
 * Quorum configuration
 */
export interface Quorum {
  readonly required: number;
  readonly total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              WORKFLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Workflow operators
 */
export type WorkflowOp =
  | '->' // Sequential
  | '||' // Parallel
  | '|' // Choice
  | '=>' // Transform
  | '~>' // Async pipe
  | '<->' // Bidirectional
  | '>>>'; // Accumulate

/**
 * Workflow expression types
 */
export type WorkflowExpr =
  | WorkflowPersonaRef
  | WorkflowSequence
  | WorkflowParallel
  | WorkflowChoice
  | WorkflowTransform
  | WorkflowGroup
  | WorkflowConditional
  | WorkflowLoop
  | WorkflowCall
  | WorkflowMerge;

export interface WorkflowPersonaRef {
  readonly kind: 'persona';
  readonly ref: PersonaRef;
}

export interface WorkflowSequence {
  readonly kind: 'sequence';
  readonly steps: readonly WorkflowExpr[];
}

export interface WorkflowParallel {
  readonly kind: 'parallel';
  readonly branches: readonly WorkflowExpr[];
  readonly sync?: boolean;
}

export interface WorkflowChoice {
  readonly kind: 'choice';
  readonly branches: readonly WorkflowExpr[];
  readonly condition?: string;
}

export interface WorkflowTransform {
  readonly kind: 'transform';
  readonly input: WorkflowExpr;
  readonly output: WorkflowExpr;
}

export interface WorkflowGroup {
  readonly kind: 'group';
  readonly expr: WorkflowExpr;
}

export interface WorkflowConditional {
  readonly kind: 'conditional';
  readonly condition: string;
  readonly then: WorkflowExpr;
  readonly else?: WorkflowExpr;
}

export interface WorkflowLoop {
  readonly kind: 'loop';
  readonly body: WorkflowExpr;
  readonly loopType: 'times' | 'while' | 'until' | 'for';
  readonly count?: number;
  readonly condition?: string;
  readonly variable?: string;
  readonly iterable?: string;
}

export interface WorkflowCall {
  readonly kind: 'call';
  readonly workflow: WorkflowId;
  readonly args?: readonly unknown[];
}

export interface WorkflowMerge {
  readonly kind: 'merge';
  readonly mode: MergeMode;
  readonly topic?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly count: number;
  readonly delay?: Duration;
  readonly backoff?: BackoffStrategy;
  readonly retryOn?: readonly string[]; // Error codes
}

/**
 * Duration value
 */
export interface Duration {
  readonly value: number;
  readonly unit: 'ms' | 's' | 'm' | 'h' | 'd';
}

/**
 * Workflow definition
 */
export interface Workflow {
  // Identity
  readonly id: WorkflowId;
  readonly name?: string;
  readonly version?: SemVer;

  // Type parameters
  readonly inputType?: string;
  readonly outputType?: string;

  // Steps
  readonly steps: WorkflowExpr;

  // Configuration
  readonly timeout?: Duration;
  readonly retry?: RetryConfig | number;
  readonly fallback?: PersonaRef;
  readonly when?: string; // Condition expression

  // Metadata
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly metadata?: Record<string, unknown>;

  // Source location
  readonly span?: Span;
}

/**
 * Workflow execution state
 */
export interface WorkflowExecution {
  readonly id: UUID;
  readonly workflow: WorkflowId;
  readonly status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'paused';
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly currentStep?: number;
  readonly steps: readonly WorkflowStepExecution[];
  readonly input?: unknown;
  readonly output?: unknown;
  readonly error?: PCLError;
}

export interface WorkflowStepExecution {
  readonly index: number;
  readonly persona?: PersonaRef;
  readonly status: StepStatus;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly duration?: number;
  readonly output?: unknown;
  readonly error?: PCLError;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete PCL runtime state
 */
export interface PCLState {
  // System
  readonly system: SystemState;

  // Personas
  readonly personas: PersonaState;

  // Composition
  readonly composition: CompositionState;

  // Teams
  readonly teamsLoaded: readonly TeamId[];

  // Workflows
  readonly workflows: WorkflowState;

  // Cognitive parameters
  readonly cognitive: CognitiveState;

  // Observability
  readonly observability: ObservabilityState;

  // Snapshots
  readonly snapshots: Record<string, Snapshot>;

  // Context variables
  readonly context: Record<string, unknown>;
}

export interface SystemState {
  readonly version: SemVer;
  readonly status: RuntimeStatus;
  readonly sessionId: SessionId;
  readonly startedAt: Date;
}

export interface PersonaState {
  readonly active: readonly PersonaId[];
  readonly primary: PersonaId | null;
  readonly weights: Record<string, number>;
  readonly spawned: Record<string, number>;
  readonly instances: Record<string, PersonaInstance>;
  readonly calibration: Record<string, CalibrationConfig>;
}

export interface CalibrationConfig {
  readonly strategy: 'single' | 'ensemble' | 'voting';
  readonly weights: Record<string, number>;
}

export interface CompositionState {
  readonly mergeMode: MergeMode;
  readonly quorum: Quorum;
  readonly conflictOrder: readonly PersonaId[];
  readonly topic: string | null;
  readonly delegate: Record<string, PersonaId>;
}

export interface WorkflowState {
  readonly active: WorkflowExecution | null;
  readonly saved: Record<string, Workflow>;
  readonly history: readonly WorkflowExecution[];
}

export interface CognitiveState {
  readonly depth: number; // 1-5
  readonly verbosity: number; // 0-3
  readonly tone: Tone;
  readonly output: OutputFormat;
  readonly context: ContextSize;
  readonly lang: LangCode;
}

export interface ObservabilityState {
  readonly trace: boolean;
  readonly traceLevel: TraceLevel;
  readonly audit: AuditMode;
  readonly metrics: Metrics;
  readonly history: readonly CommandExecution[];
}

export interface Metrics {
  readonly activations: number;
  readonly deactivations: number;
  readonly workflowsRun: number;
  readonly commandsExecuted: number;
  readonly errors: number;
  readonly avgResponseTime: number;
}

export interface CommandExecution {
  readonly command: string;
  readonly timestamp: Date;
  readonly duration: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface Snapshot {
  readonly id: SnapshotId;
  readonly name: string;
  readonly createdAt: Date;
  readonly state: PCLState;
  readonly description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT STATE
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_COGNITIVE: CognitiveState = {
  depth: 3,
  verbosity: 2,
  tone: 'formal',
  output: 'markdown',
  context: 'standard',
  lang: 'en' as LangCode,
};

export const DEFAULT_STATE: PCLState = {
  system: {
    version: '1.0.0' as SemVer,
    status: 'idle',
    sessionId: '' as SessionId,
    startedAt: new Date(),
  },
  personas: {
    active: [],
    primary: null,
    weights: {},
    spawned: {},
    instances: {},
    calibration: {},
  },
  composition: {
    mergeMode: 'primary',
    quorum: { required: 0, total: 0 },
    conflictOrder: [],
    topic: null,
    delegate: {},
  },
  teamsLoaded: [],
  workflows: {
    active: null,
    saved: {},
    history: [],
  },
  cognitive: DEFAULT_COGNITIVE,
  observability: {
    trace: false,
    traceLevel: 'events',
    audit: 'off',
    metrics: {
      activations: 0,
      deactivations: 0,
      workflowsRun: 0,
      commandsExecuted: 0,
      errors: 0,
      avgResponseTime: 0,
    },
    history: [],
  },
  snapshots: {},
  context: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base PCL error
 */
export interface PCLError {
  readonly code: string;
  readonly message: string;
  readonly span?: Span;
  readonly cause?: PCLError | Error;
  readonly details?: Record<string, unknown>;
}

/**
 * Error codes
 */
export const ErrorCode = {
  // Parse errors (E_PARSE_*)
  PARSE_UNEXPECTED_TOKEN: 'E_PARSE_001',
  PARSE_UNEXPECTED_EOF: 'E_PARSE_002',
  PARSE_INVALID_SYNTAX: 'E_PARSE_003',
  PARSE_INVALID_ESCAPE: 'E_PARSE_004',
  PARSE_UNTERMINATED_STRING: 'E_PARSE_005',

  // Type errors (E_TYPE_*)
  TYPE_MISMATCH: 'E_TYPE_001',
  TYPE_UNKNOWN: 'E_TYPE_002',
  TYPE_NOT_ASSIGNABLE: 'E_TYPE_003',
  TYPE_MISSING_PROPERTY: 'E_TYPE_004',
  TYPE_CIRCULAR: 'E_TYPE_005',

  // Runtime errors (E_RUNTIME_*)
  PERSONA_NOT_FOUND: 'E_RUNTIME_001',
  TEAM_NOT_FOUND: 'E_RUNTIME_002',
  WORKFLOW_NOT_FOUND: 'E_RUNTIME_003',
  ALREADY_ACTIVE: 'E_RUNTIME_004',
  NOT_ACTIVE: 'E_RUNTIME_005',
  INVALID_STATE: 'E_RUNTIME_006',
  MAX_PERSONAS_EXCEEDED: 'E_RUNTIME_007',

  // Registry errors (E_REGISTRY_*)
  REGISTRY_NOT_FOUND: 'E_REGISTRY_001',
  REGISTRY_NETWORK: 'E_REGISTRY_002',
  REGISTRY_SCHEMA: 'E_REGISTRY_003',
  REGISTRY_AUTH: 'E_REGISTRY_004',
  REGISTRY_CONFLICT: 'E_REGISTRY_005',

  // Workflow errors (E_WORKFLOW_*)
  WORKFLOW_TIMEOUT: 'E_WORKFLOW_001',
  WORKFLOW_CANCELLED: 'E_WORKFLOW_002',
  WORKFLOW_FAILED: 'E_WORKFLOW_003',
  WORKFLOW_INVALID: 'E_WORKFLOW_004',

  // Validation errors (E_VALIDATION_*)
  VALIDATION_REQUIRED: 'E_VALIDATION_001',
  VALIDATION_FORMAT: 'E_VALIDATION_002',
  VALIDATION_RANGE: 'E_VALIDATION_003',
  VALIDATION_CONSTRAINT: 'E_VALIDATION_004',

  // Security errors (E_SECURITY_*)
  SECURITY_FORBIDDEN: 'E_SECURITY_001',
  SECURITY_SIGNATURE: 'E_SECURITY_002',
  SECURITY_SANDBOX: 'E_SECURITY_003',

  // Phase 1.0: Semantic errors (E_SEMANTIC_*)
  SEMANTIC_DUPLICATE_MEMBER: 'E_SEMANTIC_001',
  SEMANTIC_INVALID_PRIMARY: 'E_SEMANTIC_002',
  SEMANTIC_INVALID_QUORUM: 'E_SEMANTIC_003',
  SEMANTIC_CIRCULAR_REFERENCE: 'E_SEMANTIC_004',
  SEMANTIC_UNREACHABLE_CODE: 'E_SEMANTIC_005',
  SEMANTIC_INFINITE_LOOP: 'E_SEMANTIC_006',
  SEMANTIC_TYPE_MISMATCH: 'E_SEMANTIC_007',
  SEMANTIC_TOO_MANY_BRANCHES: 'E_SEMANTIC_008',
  SEMANTIC_CONFLICT_ORDER: 'E_SEMANTIC_009',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Create PCL error */
export const PCLError = (
  code: string,
  message: string,
  options?: {
    span?: Span;
    cause?: PCLError | Error;
    details?: Record<string, unknown>;
  }
): PCLError => ({
  code,
  message,
  span: options?.span,
  cause: options?.cause,
  details: options?.details,
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Event types emitted by the runtime
 */
export type PCLEventType =
  // Persona events
  | 'persona:activated'
  | 'persona:deactivated'
  | 'persona:spawned'
  | 'persona:despawned'
  // Composition events
  | 'primary:changed'
  | 'merge:changed'
  | 'weights:changed'
  | 'topic:changed'
  // Team events
  | 'team:loaded'
  | 'team:unloaded'
  // Workflow events
  | 'workflow:started'
  | 'workflow:step'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'workflow:paused'
  | 'workflow:resumed'
  // State events
  | 'state:reset'
  | 'state:cleared'
  | 'snapshot:saved'
  | 'snapshot:restored'
  // Cognitive events
  | 'cognitive:changed'
  // Error events
  | 'error'
  // Custom events
  | `custom:${string}`;

/**
 * Event payload types
 */
export interface PCLEventMap {
  'persona:activated': { personas: readonly PersonaId[] };
  'persona:deactivated': { personas: readonly PersonaId[] };
  'persona:spawned': { persona: PersonaId; count: number };
  'persona:despawned': { persona: PersonaId };
  'primary:changed': { previous: PersonaId | null; current: PersonaId | null };
  'merge:changed': { previous: MergeMode; current: MergeMode };
  'weights:changed': { weights: Record<string, number> };
  'topic:changed': { topic: string | null };
  'team:loaded': { team: TeamId };
  'team:unloaded': { team: TeamId };
  'workflow:started': { execution: WorkflowExecution };
  'workflow:step': {
    execution: WorkflowExecution;
    step: WorkflowStepExecution;
  };
  'workflow:completed': { execution: WorkflowExecution };
  'workflow:failed': { execution: WorkflowExecution; error: PCLError };
  'workflow:cancelled': { execution: WorkflowExecution };
  'workflow:paused': { execution: WorkflowExecution };
  'workflow:resumed': { execution: WorkflowExecution };
  'state:reset': Record<string, never>;
  'state:cleared': Record<string, never>;
  'snapshot:saved': { snapshot: Snapshot };
  'snapshot:restored': { snapshot: Snapshot };
  'cognitive:changed': { changes: Partial<CognitiveState> };
  error: { error: PCLError };
  [key: `custom:${string}`]: unknown;
}

/**
 * Event handler type
 */
export type PCLEventHandler<T extends PCLEventType> = (
  event: T extends keyof PCLEventMap ? PCLEventMap[T] : unknown
) => void | Promise<void>;

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry backend types
 */
export type RegistryBackendType =
  | 'memory'
  | 'file'
  | 'sqlite'
  | 'http'
  | 'indexeddb'
  | 'hybrid';

/**
 * Registry configuration
 */
export interface RegistryConfig {
  readonly type: RegistryBackendType;
  readonly path?: string;
  readonly url?: URLString;
  readonly auth?: RegistryAuth;
  readonly cache?: CacheConfig;
  readonly readonly?: boolean;
}

export interface RegistryAuth {
  readonly type: 'none' | 'token' | 'basic' | 'oauth';
  readonly token?: string;
  readonly username?: string;
  readonly password?: string;
}

export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttl: number; // seconds
  readonly maxSize: number;
}

/**
 * Registry search filter
 */
export interface RegistryFilter {
  readonly query?: string;
  readonly tags?: readonly string[];
  readonly skills?: readonly string[];
  readonly tone?: Tone;
  readonly domain?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Registry sync result
 */
export interface SyncResult {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
  readonly conflicts: readonly SyncConflict[];
}

export interface SyncConflict {
  readonly id: PersonaId | TeamId | WorkflowId;
  readonly type: 'persona' | 'team' | 'workflow';
  readonly local: unknown;
  readonly remote: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PCLPACK FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PCLPack - package format for distributing personas, teams, and workflows
 */
export interface PCLPack {
  // Header
  readonly kind: 'PCLPack';
  readonly version: SemVer;
  readonly specVersion: SemVer;

  // Metadata
  readonly metadata: PCLPackMetadata;

  // Content
  readonly sharedSkills?: readonly SharedSkillCategory[];
  readonly personas?: readonly Persona[];
  readonly teams?: readonly Team[];
  readonly workflows?: readonly Workflow[];

  // Registry configuration
  readonly registry?: RegistryConfig;

  // Initial state (optional)
  readonly initialState?: Partial<PCLState>;
}

export interface PCLPackMetadata {
  readonly name: string;
  readonly description?: string;
  readonly author?: string;
  readonly license?: string;
  readonly homepage?: URLString;
  readonly repository?: URLString;
  readonly documentation?: URLString;
  readonly keywords?: readonly string[];
  readonly dependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  readonly streaming: boolean;
  readonly multiTurn: boolean;
  readonly systemPrompt: boolean;
  readonly tools: boolean;
  readonly vision: boolean;
  readonly audio: boolean;
  readonly maxTokens: number;
  readonly contextWindow: number;
  readonly mcp?: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  readonly id: string;
  readonly apiKey?: string;
  readonly baseUrl?: URLString;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

/**
 * Provider response
 */
export interface ProviderResponse {
  readonly id: string;
  readonly model: string;
  readonly content: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly finishReason: 'stop' | 'length' | 'tool_use' | 'error';
  readonly toolCalls?: readonly ToolCall[];
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

/**
 * Streaming chunk
 */
export interface ProviderChunk {
  readonly id: string;
  readonly delta: string;
  readonly finishReason?: 'stop' | 'length' | 'tool_use';
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Extract keys of a certain type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Value of a record
 */
export type ValueOf<T> = T[keyof T];

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Re-export all types for convenience
  Brand,
};
