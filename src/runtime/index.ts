/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Runtime Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Executes PCL programs by:
 * - Managing persona instances
 * - Orchestrating teams
 * - Running workflows
 * - Handling message passing
 *
 * @packageDocumentation
 * @module @pcl/runtime
 * @version 1.0.0
 */

import type * as AST from '../ast';
import type {
  Depth,
  MergeMode,
  OutputFormat,
  Result,
  Tone,
  Verbosity,
} from '../types';
import { Err, Ok } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Message passed between personas
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
  readonly id: string;
  readonly personaId: string;
  readonly content: string;
  readonly confidence: number;
  readonly reasoning?: string;
  readonly suggestions?: readonly string[];
  readonly metadata: ResponseMetadata;
  readonly timestamp: Date;
}

export interface ResponseMetadata {
  readonly tokensUsed?: number;
  readonly duration?: number;
  readonly model?: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Persona instance state
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
  readonly tone: Tone;
  readonly depth: Depth;
  readonly verbosity: Verbosity;
  readonly outputFormat: OutputFormat;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly skills: readonly string[];
  readonly constraints: readonly string[];
  readonly tags: readonly string[];
}

export interface PersonaMemory {
  readonly shortTerm: readonly Message[];
  readonly context: Map<string, unknown>;
  readonly facts: Map<string, unknown>;
}

export interface PersonaStats {
  readonly messagesProcessed: number;
  readonly tokensUsed: number;
  readonly activationCount: number;
  readonly lastActive: Date | null;
  readonly averageResponseTime: number;
}

/**
 * Team instance state
 */
export interface TeamState {
  readonly id: string;
  readonly name: string;
  readonly members: readonly PersonaState[];
  readonly primary: PersonaState | null;
  readonly config: TeamConfig;
  readonly stats: TeamStats;
}

export interface TeamConfig {
  readonly mergeMode: MergeMode;
  readonly quorum: { required: number; total: number } | null;
  readonly conflictOrder: readonly string[];
  readonly weights: Map<string, number>;
  readonly topic: string | null;
  readonly timeout: number;
}

export interface TeamStats {
  readonly requestsProcessed: number;
  readonly consensusReached: number;
  readonly conflictsResolved: number;
  readonly averageResponseTime: number;
}

/**
 * Workflow execution state
 */
export interface WorkflowState {
  readonly id: string;
  readonly name: string;
  readonly status: WorkflowStatus;
  readonly currentStep: number;
  readonly input: unknown;
  readonly output: unknown;
  readonly steps: readonly WorkflowStepState[];
  readonly startTime: Date;
  readonly endTime: Date | null;
}

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowStepState {
  readonly index: number;
  readonly type: string;
  readonly status: WorkflowStatus;
  readonly input: unknown;
  readonly output: unknown;
  readonly error: string | null;
  readonly startTime: Date | null;
  readonly endTime: Date | null;
}

/**
 * Runtime events
 */
export type RuntimeEvent =
  | { type: 'persona:activated'; persona: PersonaState }
  | { type: 'persona:deactivated'; persona: PersonaState }
  | { type: 'persona:message'; persona: PersonaState; message: Message }
  | { type: 'persona:response'; persona: PersonaState; response: Response }
  | { type: 'team:formed'; team: TeamState }
  | { type: 'team:disbanded'; team: TeamState }
  | {
      type: 'team:merge';
      team: TeamState;
      responses: Response[];
      merged: Response;
    }
  | { type: 'workflow:started'; workflow: WorkflowState }
  | { type: 'workflow:step'; workflow: WorkflowState; step: WorkflowStepState }
  | { type: 'workflow:completed'; workflow: WorkflowState }
  | { type: 'workflow:failed'; workflow: WorkflowState; error: string }
  | { type: 'error'; error: Error };

export type RuntimeEventHandler = (event: RuntimeEvent) => void;

// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default persona configuration
 */
const DEFAULT_PERSONA_CONFIG: PersonaConfig = {
  intent: '',
  tone: 'formal',
  depth: 'standard',
  verbosity: 'normal',
  outputFormat: 'prose',
  maxTokens: 4096,
  temperature: 0.7,
  skills: [],
  constraints: [],
  tags: [],
};

/**
 * Persona instance - represents a running persona
 */
export class PersonaInstance {
  private state: PersonaState;
  private readonly handlers: Map<string, Function> = new Map();
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();

  constructor(id: string, name: string, config: Partial<PersonaConfig> = {}) {
    this.state = {
      id,
      name,
      active: false,
      config: { ...DEFAULT_PERSONA_CONFIG, ...config },
      memory: {
        shortTerm: [],
        context: new Map(),
        facts: new Map(),
      },
      stats: {
        messagesProcessed: 0,
        tokensUsed: 0,
        activationCount: 0,
        lastActive: null,
        averageResponseTime: 0,
      },
    };
  }

  /**
   * Get persona state
   */
  getState(): PersonaState {
    return this.state;
  }

  /**
   * Activate the persona
   */
  activate(): void {
    if (this.state.active) return;

    this.state = {
      ...this.state,
      active: true,
      stats: {
        ...this.state.stats,
        activationCount: this.state.stats.activationCount + 1,
        lastActive: new Date(),
      },
    };

    this.emit({ type: 'persona:activated', persona: this.state });
  }

  /**
   * Deactivate the persona
   */
  deactivate(): void {
    if (!this.state.active) return;

    this.state = {
      ...this.state,
      active: false,
    };

    this.emit({ type: 'persona:deactivated', persona: this.state });
  }

  /**
   * Process a message and generate a response
   */
  async process(message: Message): Promise<Response> {
    const startTime = Date.now();

    // Add to short-term memory
    this.addToMemory(message);

    this.emit({ type: 'persona:message', persona: this.state, message });

    // Generate response (placeholder - would integrate with LLM)
    const response = await this.generateResponse(message);

    // Update stats
    const duration = Date.now() - startTime;
    this.updateStats(duration);

    this.emit({ type: 'persona:response', persona: this.state, response });

    return response;
  }

  /**
   * Register a hook handler
   */
  registerHook(hook: string, handler: Function): void {
    this.handlers.set(hook, handler);
  }

  /**
   * Subscribe to events
   */
  on(handler: RuntimeEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Update persona configuration
   */
  configure(config: Partial<PersonaConfig>): void {
    this.state = {
      ...this.state,
      config: { ...this.state.config, ...config },
    };
  }

  /**
   * Set context value
   */
  setContext(key: string, value: unknown): void {
    this.state.memory.context.set(key, value);
  }

  /**
   * Get context value
   */
  getContext(key: string): unknown {
    return this.state.memory.context.get(key);
  }

  /**
   * Store a fact
   */
  remember(key: string, value: unknown): void {
    this.state.memory.facts.set(key, value);
  }

  /**
   * Recall a fact
   */
  recall(key: string): unknown {
    return this.state.memory.facts.get(key);
  }

  private addToMemory(message: Message): void {
    const shortTerm = [...this.state.memory.shortTerm, message];
    // Keep only last 100 messages
    const trimmed = shortTerm.slice(-100);

    this.state = {
      ...this.state,
      memory: {
        ...this.state.memory,
        shortTerm: trimmed,
      },
    };
  }

  private async generateResponse(message: Message): Promise<Response> {
    // This would integrate with an LLM API
    // For now, return a placeholder response
    return {
      id: generateId(),
      personaId: this.state.id,
      content: `[${this.state.name}] Response to: ${message.content.substring(0, 50)}...`,
      confidence: 0.8,
      metadata: {
        tokensUsed: 100,
        duration: 500,
      },
      timestamp: new Date(),
    };
  }

  private updateStats(duration: number): void {
    const processed = this.state.stats.messagesProcessed + 1;
    const currentAvg = this.state.stats.averageResponseTime;
    const newAvg = (currentAvg * (processed - 1) + duration) / processed;

    this.state = {
      ...this.state,
      stats: {
        ...this.state.stats,
        messagesProcessed: processed,
        lastActive: new Date(),
        averageResponseTime: newAvg,
      },
    };
  }

  private emit(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default team configuration
 */
const DEFAULT_TEAM_CONFIG: TeamConfig = {
  mergeMode: 'primary',
  quorum: null,
  conflictOrder: [],
  weights: new Map(),
  topic: null,
  timeout: 30000,
};

/**
 * Team instance - orchestrates multiple personas
 */
export class TeamInstance {
  private state: TeamState;
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();

  constructor(
    id: string,
    name: string,
    members: PersonaInstance[],
    config: Partial<TeamConfig> = {}
  ) {
    this.state = {
      id,
      name,
      members: members.map((m) => m.getState()),
      primary:
        config.mergeMode === 'primary' && members.length > 0
          ? members[0].getState()
          : null,
      config: { ...DEFAULT_TEAM_CONFIG, ...config },
      stats: {
        requestsProcessed: 0,
        consensusReached: 0,
        conflictsResolved: 0,
        averageResponseTime: 0,
      },
    };
  }

  /**
   * Get team state
   */
  getState(): TeamState {
    return this.state;
  }

  /**
   * Process a message through the team
   */
  async process(
    message: Message,
    members: PersonaInstance[]
  ): Promise<Response> {
    const startTime = Date.now();

    // Collect responses from all members
    const responses = await this.collectResponses(message, members);

    // Merge responses based on mode
    const merged = await this.mergeResponses(responses);

    // Update stats
    const duration = Date.now() - startTime;
    this.updateStats(duration, responses);

    this.emit({ type: 'team:merge', team: this.state, responses, merged });

    return merged;
  }

  /**
   * Subscribe to events
   */
  on(handler: RuntimeEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Update team configuration
   */
  configure(config: Partial<TeamConfig>): void {
    this.state = {
      ...this.state,
      config: { ...this.state.config, ...config },
    };
  }

  private async collectResponses(
    message: Message,
    members: PersonaInstance[]
  ): Promise<Response[]> {
    // Check quorum
    const quorum = this.state.config.quorum;
    const requiredCount = quorum ? quorum.required : members.length;

    // Collect responses with timeout
    const timeout = this.state.config.timeout;
    const responsePromises = members.map((m) =>
      Promise.race([
        m.process(message),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]).catch((e) => null)
    );

    const results = await Promise.all(responsePromises);
    const responses = results.filter((r): r is Response => r !== null);

    // Check if quorum is met
    if (responses.length < requiredCount) {
      throw new Error(`Quorum not met: ${responses.length}/${requiredCount}`);
    }

    return responses;
  }

  private async mergeResponses(responses: Response[]): Promise<Response> {
    if (responses.length === 0) {
      throw new Error('No responses to merge');
    }

    const mode = this.state.config.mergeMode;

    switch (mode) {
      case 'primary':
        return this.mergePrimary(responses);
      case 'consensus':
        return this.mergeConsensus(responses);
      case 'majority':
        return this.mergeMajority(responses);
      case 'append':
        return this.mergeAppend(responses);
      case 'debate':
        return this.mergeDebate(responses);
      case 'weighted':
        return this.mergeWeighted(responses);
      case 'random':
        return this.mergeRandom(responses);
      default:
        return responses[0];
    }
  }

  private mergePrimary(responses: Response[]): Response {
    // Return primary persona's response, or first if no primary
    const primaryId = this.state.primary?.id;
    const primaryResponse = responses.find((r) => r.personaId === primaryId);
    return primaryResponse ?? responses[0];
  }

  private mergeConsensus(responses: Response[]): Response {
    // Find common themes/agreement (simplified)
    const contents = responses.map((r) => r.content);
    const merged =
      `[Consensus from ${responses.length} personas]\n\n` +
      contents.join('\n\n---\n\n');

    return {
      id: generateId(),
      personaId: 'team:' + this.state.id,
      content: merged,
      confidence: this.calculateAverageConfidence(responses),
      metadata: { context: { merged: true, mode: 'consensus' } },
      timestamp: new Date(),
    };
  }

  private mergeMajority(responses: Response[]): Response {
    // Simple majority voting (by content similarity)
    // For now, just return most confident response
    const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
    return sorted[0];
  }

  private mergeAppend(responses: Response[]): Response {
    // Concatenate all responses
    const contents = responses.map((r) => `[${r.personaId}]\n${r.content}`);

    return {
      id: generateId(),
      personaId: 'team:' + this.state.id,
      content: contents.join('\n\n---\n\n'),
      confidence: this.calculateAverageConfidence(responses),
      metadata: { context: { merged: true, mode: 'append' } },
      timestamp: new Date(),
    };
  }

  private mergeDebate(responses: Response[]): Response {
    // Present as a debate (showing different perspectives)
    const topic = this.state.config.topic ?? 'the topic';
    const contents = responses.map((r) => `**${r.personaId}**: ${r.content}`);

    const merged = `[Debate on ${topic}]\n\n` + contents.join('\n\n');

    return {
      id: generateId(),
      personaId: 'team:' + this.state.id,
      content: merged,
      confidence: this.calculateAverageConfidence(responses),
      metadata: { context: { merged: true, mode: 'debate' } },
      timestamp: new Date(),
    };
  }

  private mergeWeighted(responses: Response[]): Response {
    // Weight by configured weights
    const weights = this.state.config.weights;

    // Score each response
    const scored = responses.map((r) => ({
      response: r,
      score: (weights.get(r.personaId) ?? 1) * r.confidence,
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return highest scored
    return scored[0].response;
  }

  private mergeRandom(responses: Response[]): Response {
    // Random selection
    const index = Math.floor(Math.random() * responses.length);
    return responses[index];
  }

  private calculateAverageConfidence(responses: Response[]): number {
    if (responses.length === 0) return 0;
    const sum = responses.reduce((acc, r) => acc + r.confidence, 0);
    return sum / responses.length;
  }

  private updateStats(duration: number, responses: Response[]): void {
    const processed = this.state.stats.requestsProcessed + 1;
    const currentAvg = this.state.stats.averageResponseTime;
    const newAvg = (currentAvg * (processed - 1) + duration) / processed;

    this.state = {
      ...this.state,
      stats: {
        ...this.state.stats,
        requestsProcessed: processed,
        averageResponseTime: newAvg,
      },
    };
  }

  private emit(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              WORKFLOW RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Workflow executor - runs workflow definitions
 */
export class WorkflowExecutor {
  private state: WorkflowState | null = null;
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();
  private aborted = false;

  /**
   * Execute a workflow
   */
  async execute(
    workflow: AST.WorkflowDeclaration,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<Result<unknown, Error>> {
    const id = generateId();

    this.state = {
      id,
      name: workflow.id.name,
      status: 'pending',
      currentStep: 0,
      input,
      output: null,
      steps: [],
      startTime: new Date(),
      endTime: null,
    };

    this.aborted = false;

    try {
      this.updateStatus('running');
      this.emit({ type: 'workflow:started', workflow: this.state });

      // Find steps declaration
      const stepsDecl = workflow.body.members.find(
        (m) => m.kind === 'WorkflowStepsDeclaration'
      ) as AST.WorkflowStepsDeclaration | undefined;

      if (!stepsDecl) {
        throw new Error('Workflow has no steps');
      }

      // Execute workflow expression
      const result = await this.executeExpression(
        stepsDecl.steps,
        input,
        personas,
        teams
      );

      this.state = {
        ...this.state!,
        status: 'completed',
        output: result,
        endTime: new Date(),
      };

      this.emit({ type: 'workflow:completed', workflow: this.state });

      return Ok(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.state = {
        ...this.state!,
        status: 'failed',
        endTime: new Date(),
      };

      this.emit({
        type: 'workflow:failed',
        workflow: this.state,
        error: err.message,
      });

      return Err(err);
    }
  }

  /**
   * Abort the workflow
   */
  abort(): void {
    this.aborted = true;
    if (this.state) {
      this.updateStatus('cancelled');
    }
  }

  /**
   * Get current state
   */
  getState(): WorkflowState | null {
    return this.state;
  }

  /**
   * Subscribe to events
   */
  on(handler: RuntimeEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private async executeExpression(
    expr: AST.WorkflowExpression,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    if (this.aborted) {
      throw new Error('Workflow aborted');
    }

    switch (expr.kind) {
      case 'WorkflowSequenceExpr':
        return this.executeSequence(
          expr as AST.WorkflowSequenceExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowParallelExpr':
        return this.executeParallel(
          expr as AST.WorkflowParallelExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowChoiceExpr':
        return this.executeChoice(
          expr as AST.WorkflowChoiceExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowConditionalExpr':
        return this.executeConditional(
          expr as AST.WorkflowConditionalExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowLoopExpr':
        return this.executeLoop(
          expr as AST.WorkflowLoopExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowPersonaRef':
        return this.executePersonaRef(
          expr as AST.WorkflowPersonaRef,
          input,
          personas,
          teams
        );

      case 'WorkflowMergeExpr':
        // Merge is handled in parallel execution
        return input;

      case 'WorkflowGroupExpr':
        return this.executeExpression(
          (expr as AST.WorkflowGroupExpr).expr,
          input,
          personas,
          teams
        );

      default:
        throw new Error(`Unknown workflow expression: ${expr.kind}`);
    }
  }

  private async executeSequence(
    expr: AST.WorkflowSequenceExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    let current = input;

    for (const step of expr.steps) {
      current = await this.executeExpression(step, current, personas, teams);
    }

    return current;
  }

  private async executeParallel(
    expr: AST.WorkflowParallelExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown[]> {
    const results = await Promise.all(
      expr.branches.map((branch) =>
        this.executeExpression(branch, input, personas, teams)
      )
    );

    return results;
  }

  private async executeChoice(
    expr: AST.WorkflowChoiceExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    // Execute first available branch (simplified)
    for (const branch of expr.branches) {
      try {
        return await this.executeExpression(branch, input, personas, teams);
      } catch {
        continue;
      }
    }

    throw new Error('All choice branches failed');
  }

  private async executeConditional(
    expr: AST.WorkflowConditionalExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    // Evaluate condition (simplified - would need expression evaluator)
    const condition = true; // Placeholder

    if (condition) {
      return this.executeExpression(expr.then, input, personas, teams);
    } else if (expr.else) {
      return this.executeExpression(expr.else, input, personas, teams);
    }

    return input;
  }

  private async executeLoop(
    expr: AST.WorkflowLoopExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    let current = input;
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations && !this.aborted) {
      switch (expr.loopType) {
        case 'times':
          if (expr.count && iterations >= expr.count.value) {
            return current;
          }
          break;

        case 'while':
          // Evaluate condition (simplified)
          if (iterations > 0) return current;
          break;

        case 'until':
          // Evaluate condition (simplified)
          if (iterations > 0) return current;
          break;
      }

      current = await this.executeExpression(
        expr.body,
        current,
        personas,
        teams
      );
      iterations++;
    }

    return current;
  }

  private async executePersonaRef(
    expr: AST.WorkflowPersonaRef,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    const ref = expr.ref;
    let name: string;

    if (ref.ref.type === 'id') {
      name = ref.ref.id.name;
    } else if (ref.ref.type === 'qualified') {
      name = ref.ref.path.parts.map((p) => p.name).join('::');
    } else if (ref.ref.type === 'spawn') {
      name = ref.ref.persona.name;
    } else {
      throw new Error('Invalid persona reference');
    }

    // Try to find persona
    const persona = personas.get(name);
    if (persona) {
      const message: Message = {
        id: generateId(),
        from: 'workflow',
        to: name,
        content: typeof input === 'string' ? input : JSON.stringify(input),
        metadata: {},
        timestamp: new Date(),
      };

      const response = await persona.process(message);
      return response.content;
    }

    // Try to find team
    const team = teams.get(name);
    if (team) {
      const message: Message = {
        id: generateId(),
        from: 'workflow',
        to: name,
        content: typeof input === 'string' ? input : JSON.stringify(input),
        metadata: {},
        timestamp: new Date(),
      };

      // Get team members
      const memberInstances = Array.from(personas.values()).filter((p) =>
        team.getState().members.some((m) => m.id === p.getState().id)
      );

      const response = await team.process(message, memberInstances);
      return response.content;
    }

    throw new Error(`Unknown persona or team: ${name}`);
  }

  private updateStatus(status: WorkflowStatus): void {
    if (this.state) {
      this.state = { ...this.state, status };
    }
  }

  private emit(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  readonly maxPersonas: number;
  readonly maxTeams: number;
  readonly maxWorkflows: number;
  readonly defaultTimeout: number;
  readonly enableTracing: boolean;
  readonly enableMetrics: boolean;
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  maxPersonas: 100,
  maxTeams: 50,
  maxWorkflows: 10,
  defaultTimeout: 30000,
  enableTracing: false,
  enableMetrics: true,
};

/**
 * PCL Runtime Engine
 */
export class Runtime {
  private readonly config: RuntimeConfig;
  private readonly personas: Map<string, PersonaInstance> = new Map();
  private readonly teams: Map<string, TeamInstance> = new Map();
  private readonly workflows: Map<string, WorkflowExecutor> = new Map();
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();

  constructor(config: Partial<RuntimeConfig> = {}) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  }

  /**
   * Load a program into the runtime
   */
  load(program: AST.Program): void {
    for (const stmt of program.statements) {
      switch (stmt.kind) {
        case 'PersonaDeclaration':
          this.loadPersona(stmt as AST.PersonaDeclaration);
          break;
        case 'TeamDeclaration':
          this.loadTeam(stmt as AST.TeamDeclaration);
          break;
      }
    }
  }

  /**
   * Get or create a persona instance
   */
  getPersona(name: string): PersonaInstance | undefined {
    return this.personas.get(name);
  }

  /**
   * Get or create a team instance
   */
  getTeam(name: string): TeamInstance | undefined {
    return this.teams.get(name);
  }

  /**
   * Activate a persona
   */
  activate(name: string): Result<PersonaInstance, Error> {
    const persona = this.personas.get(name);
    if (!persona) {
      return Err(new Error(`Unknown persona: ${name}`));
    }

    persona.activate();
    return Ok(persona);
  }

  /**
   * Deactivate a persona
   */
  deactivate(name: string): Result<void, Error> {
    const persona = this.personas.get(name);
    if (!persona) {
      return Err(new Error(`Unknown persona: ${name}`));
    }

    persona.deactivate();
    return Ok(undefined);
  }

  /**
   * Activate all personas in a team
   */
  activateTeam(name: string): Result<TeamInstance, Error> {
    const team = this.teams.get(name);
    if (!team) {
      return Err(new Error(`Unknown team: ${name}`));
    }

    for (const member of team.getState().members) {
      const persona = this.personas.get(member.id);
      persona?.activate();
    }

    return Ok(team);
  }

  /**
   * Send a message to a persona
   */
  async send(
    personaName: string,
    content: string,
    metadata: MessageMetadata = {}
  ): Promise<Result<Response, Error>> {
    const persona = this.personas.get(personaName);
    if (!persona) {
      return Err(new Error(`Unknown persona: ${personaName}`));
    }

    if (!persona.getState().active) {
      return Err(new Error(`Persona ${personaName} is not active`));
    }

    const message: Message = {
      id: generateId(),
      from: null,
      to: personaName,
      content,
      metadata,
      timestamp: new Date(),
    };

    try {
      const response = await persona.process(message);
      return Ok(response);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Send a message to a team
   */
  async sendToTeam(
    teamName: string,
    content: string,
    metadata: MessageMetadata = {}
  ): Promise<Result<Response, Error>> {
    const team = this.teams.get(teamName);
    if (!team) {
      return Err(new Error(`Unknown team: ${teamName}`));
    }

    const message: Message = {
      id: generateId(),
      from: null,
      to: teamName,
      content,
      metadata,
      timestamp: new Date(),
    };

    // Get active team members
    const members = team
      .getState()
      .members.map((m) => this.personas.get(m.id))
      .filter(
        (p): p is PersonaInstance => p !== undefined && p.getState().active
      );

    if (members.length === 0) {
      return Err(new Error('No active team members'));
    }

    try {
      const response = await team.process(message, members);
      return Ok(response);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute a workflow
   */
  async runWorkflow(
    workflow: AST.WorkflowDeclaration,
    input: unknown
  ): Promise<Result<unknown, Error>> {
    const executor = new WorkflowExecutor();
    this.workflows.set(workflow.id.name, executor);

    // Forward events
    executor.on((event) => this.emit(event));

    const result = await executor.execute(
      workflow,
      input,
      this.personas,
      this.teams
    );

    this.workflows.delete(workflow.id.name);
    return result;
  }

  /**
   * Subscribe to runtime events
   */
  on(handler: RuntimeEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Get all personas
   */
  getAllPersonas(): PersonaInstance[] {
    return Array.from(this.personas.values());
  }

  /**
   * Get all teams
   */
  getAllTeams(): TeamInstance[] {
    return Array.from(this.teams.values());
  }

  /**
   * Get active personas
   */
  getActivePersonas(): PersonaInstance[] {
    return this.getAllPersonas().filter((p) => p.getState().active);
  }

  /**
   * Clear all state
   */
  reset(): void {
    for (const persona of this.personas.values()) {
      persona.deactivate();
    }
    this.personas.clear();
    this.teams.clear();
    this.workflows.clear();
  }

  private loadPersona(decl: AST.PersonaDeclaration): void {
    const name = decl.id.name;

    if (this.personas.size >= this.config.maxPersonas) {
      throw new Error(`Maximum personas reached: ${this.config.maxPersonas}`);
    }

    // Extract configuration from declaration
    const config = this.extractPersonaConfig(decl);

    const instance = new PersonaInstance(name, name, config);

    // Forward events
    instance.on((event) => this.emit(event));

    this.personas.set(name, instance);
  }

  private extractPersonaConfig(
    decl: AST.PersonaDeclaration
  ): Partial<PersonaConfig> {
    const config: Partial<PersonaConfig> = {};

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'PropertyDeclaration': {
          const prop = member as AST.PropertyDeclaration;
          if (
            prop.name.name === 'intent' &&
            prop.initializer?.kind === 'StringLiteral'
          ) {
            config.intent = (prop.initializer as AST.StringLiteral).value;
          }
          if (
            prop.name.name === 'tone' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            config.tone = (prop.initializer as AST.Identifier).name as Tone;
          }
          if (
            prop.name.name === 'depth' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            config.depth = (prop.initializer as AST.Identifier).name as Depth;
          }
          if (
            prop.name.name === 'verbosity' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            config.verbosity = (prop.initializer as AST.Identifier)
              .name as Verbosity;
          }
          break;
        }

        case 'SkillBlock': {
          const block = member as AST.SkillBlock;
          config.skills = block.items
            .filter((i) => i.kind === 'StringSkill')
            .map((i) => (i as { value: string }).value);
          break;
        }

        case 'ConstraintBlock': {
          const block = member as AST.ConstraintBlock;
          config.constraints = block.items
            .filter((i) => i.kind === 'StringConstraint')
            .map((i) => (i as { value: string }).value);
          break;
        }

        case 'TagBlock': {
          const block = member as AST.TagBlock;
          config.tags = block.items.map((i) =>
            i.kind === 'StringTag'
              ? (i as { value: string }).value
              : (i as { name: AST.Identifier }).name.name
          );
          break;
        }
      }
    }

    return config;
  }

  private loadTeam(decl: AST.TeamDeclaration): void {
    const name = decl.id.name;

    if (this.teams.size >= this.config.maxTeams) {
      throw new Error(`Maximum teams reached: ${this.config.maxTeams}`);
    }

    // Collect team members
    const memberNames: string[] = [];
    let mergeMode: MergeMode = 'primary';
    let primaryName: string | null = null;

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'TeamMembersDeclaration': {
          const membersDecl = member as AST.TeamMembersDeclaration;
          for (const ref of membersDecl.members) {
            const refName = this.getPersonaRefName(ref);
            if (refName) memberNames.push(refName);
          }
          break;
        }

        case 'TeamPrimaryDeclaration': {
          primaryName = this.getPersonaRefName(
            (member as AST.TeamPrimaryDeclaration).primary
          );
          break;
        }

        case 'TeamMergeDeclaration': {
          const mergeDecl = member as AST.TeamMergeDeclaration;
          if (mergeDecl.mode.kind === 'SimpleMergeMode') {
            mergeMode = mergeDecl.mode.mode;
          }
          break;
        }
      }
    }

    // Get persona instances
    const memberInstances = memberNames
      .map((n) => this.personas.get(n))
      .filter((p): p is PersonaInstance => p !== undefined);

    const teamConfig: Partial<TeamConfig> = {
      mergeMode,
    };

    const instance = new TeamInstance(name, name, memberInstances, teamConfig);

    // Forward events
    instance.on((event) => this.emit(event));

    this.teams.set(name, instance);
  }

  private getPersonaRefName(ref: AST.PersonaReference): string | null {
    if (ref.ref.type === 'id') {
      return ref.ref.id.name;
    }
    if (ref.ref.type === 'qualified') {
      return ref.ref.path.parts.map((p) => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return ref.ref.persona.name;
    }
    return null;
  }

  private emit(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        this.emit({ type: 'error', error: e as Error });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

let idCounter = 0;

function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new PCL runtime
 */
export function createRuntime(config?: Partial<RuntimeConfig>): Runtime {
  return new Runtime(config);
}

/**
 * Create a persona instance
 */
export function createPersona(
  id: string,
  name: string,
  config?: Partial<PersonaConfig>
): PersonaInstance {
  return new PersonaInstance(id, name, config);
}

/**
 * Create a team instance
 */
export function createTeam(
  id: string,
  name: string,
  members: PersonaInstance[],
  config?: Partial<TeamConfig>
): TeamInstance {
  return new TeamInstance(id, name, members, config);
}
