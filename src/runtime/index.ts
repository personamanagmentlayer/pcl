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
import type { AIProvider } from './providers';

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private readonly handlers: Map<string, Function> = new Map();
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();
  private provider: AIProvider | null = null;

  constructor(
    id: string,
    name: string,
    config: Partial<PersonaConfig> = {},
    provider?: AIProvider
  ) {
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

    if (provider) {
      this.provider = provider;
    }
  }

  /**
   * Get persona state
   */
  getState(): PersonaState {
    return this.state;
  }

  /**
   * Set the AI provider for this persona
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current AI provider
   */
  getProvider(): AIProvider | null {
    return this.provider;
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

    // Generate response using provider
    const response = await this.generateResponse(message);

    // Update stats
    const duration = Date.now() - startTime;
    this.updateStats(duration);

    this.emit({ type: 'persona:response', persona: this.state, response });

    return response;
  }

  /**
   * Process a message with streaming response
   */
  async *processStream(message: Message): AsyncIterator<{
    chunk: string;
    done: boolean;
    response?: Response;
  }> {
    const startTime = Date.now();

    // Add to short-term memory
    this.addToMemory(message);

    this.emit({ type: 'persona:message', persona: this.state, message });

    // If no provider, yield single chunk with placeholder
    if (!this.provider) {
      const response: Response = {
        id: generateId(),
        personaId: this.state.id,
        content: `[${this.state.name}] Response to: ${message.content.substring(0, 50)}... (No provider configured)`,
        confidence: 0.8,
        metadata: {
          tokensUsed: 100,
          duration: Date.now() - startTime,
        },
        timestamp: new Date(),
      };

      yield { chunk: response.content, done: true, response };
      return;
    }

    // Check if provider supports streaming
    if (!this.provider.capabilities.streaming) {
      // Fall back to non-streaming
      const response = await this.generateResponse(message);
      yield { chunk: response.content, done: true, response };
      return;
    }

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt();

    // Use short-term memory as history (already in Message format)
    const history = this.state.memory.shortTerm;

    let fullContent = '';
    let totalTokens = 0;

    try {
      // Stream response using provider
      for await (const chunk of this.provider.streamResponse({
        prompt: message.content,
        systemPrompt,
        history,
        temperature: this.state.config.temperature,
        maxTokens: this.state.config.maxTokens,
        model: undefined,
      })) {
        fullContent += chunk.content;

        if (chunk.done) {
          const duration = Date.now() - startTime;

          // Approximate token count
          totalTokens = this.provider.countTokens(fullContent);

          // Update token usage stats
          this.state = {
            ...this.state,
            stats: {
              ...this.state.stats,
              tokensUsed: this.state.stats.tokensUsed + totalTokens,
            },
          };

          const response: Response = {
            id: generateId(),
            personaId: this.state.id,
            content: fullContent,
            confidence: 0.9,
            metadata: {
              tokensUsed: totalTokens,
              duration,
              context: {
                finishReason: chunk.finishReason,
                streaming: true,
              },
            },
            timestamp: new Date(),
          };

          // Update stats
          this.updateStats(duration);

          this.emit({
            type: 'persona:response',
            persona: this.state,
            response,
          });

          yield { chunk: chunk.content, done: true, response };
        } else {
          yield { chunk: chunk.content, done: false };
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const response: Response = {
        id: generateId(),
        personaId: this.state.id,
        content: `Error streaming response: ${errorMessage}`,
        confidence: 0.0,
        metadata: {
          duration,
          context: {
            error: errorMessage,
            streaming: true,
          },
        },
        timestamp: new Date(),
      };

      yield { chunk: '', done: true, response };
    }
  }

  /**
   * Register a hook handler
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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

  /**
   * Build system prompt from persona configuration
   */
  private buildSystemPrompt(): string {
    const { config } = this.state;
    const parts: string[] = [];

    // Add intent
    if (config.intent) {
      parts.push(
        `You are a persona with the following intent: ${config.intent}`
      );
    }

    // Add tone guidance
    parts.push(`Your communication tone should be: ${config.tone}`);

    // Add depth guidance
    const depthGuidance: Record<Depth, string> = {
      shallow: 'Provide very brief, high-level overviews.',
      standard: 'Balance breadth and depth appropriately.',
      detailed: 'Provide thorough, detailed analysis.',
      thorough: 'Provide comprehensive analysis with depth.',
      exhaustive:
        'Provide exhaustive analysis covering all aspects and implications.',
    };
    parts.push(depthGuidance[config.depth]);

    // Add verbosity guidance
    const verbosityGuidance = {
      minimal: 'Be extremely concise. Use minimal words.',
      concise: 'Be brief and to the point.',
      normal: 'Use an appropriate level of detail.',
      detailed: 'Provide comprehensive explanations.',
      verbose: 'Be thorough and elaborate in your responses.',
    };
    parts.push(verbosityGuidance[config.verbosity]);

    // Add skills
    if (config.skills.length > 0) {
      parts.push(`Your expertise includes: ${config.skills.join(', ')}`);
    }

    // Add constraints
    if (config.constraints.length > 0) {
      parts.push(
        `You must adhere to these constraints:\n${config.constraints.map((c) => `- ${c}`).join('\n')}`
      );
    }

    // Add output format guidance
    if (config.outputFormat !== 'prose') {
      const formatGuidance: Partial<Record<OutputFormat, string>> = {
        markdown: 'Format your response using Markdown syntax.',
        json: 'Format your response as valid JSON.',
        yaml: 'Format your response as valid YAML.',
        code: 'Format your response as code.',
        table: 'Format your response as a table.',
        RFC: 'Format your response as an RFC document.',
        PRD: 'Format your response as a Product Requirements Document.',
        ADR: 'Format your response as an Architecture Decision Record.',
        C4: 'Format your response as a C4 architecture diagram description.',
        mermaid: 'Format your response as a Mermaid diagram.',
        plantuml: 'Format your response as a PlantUML diagram.',
        openapi: 'Format your response as an OpenAPI specification.',
        executive: 'Format your response as an executive summary.',
        minimal: 'Format your response in minimal style.',
      };
      const guidance = formatGuidance[config.outputFormat];
      if (guidance) {
        parts.push(guidance);
      }
    }

    return parts.join('\n\n');
  }

  private async generateResponse(message: Message): Promise<Response> {
    // If no provider is set, return placeholder
    if (!this.provider) {
      return {
        id: generateId(),
        personaId: this.state.id,
        content: `[${this.state.name}] Response to: ${message.content.substring(0, 50)}... (No provider configured)`,
        confidence: 0.8,
        metadata: {
          tokensUsed: 100,
          duration: 500,
        },
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();

    // Build system prompt from configuration
    const systemPrompt = this.buildSystemPrompt();

    // Use short-term memory as history (already in Message format)
    const history = this.state.memory.shortTerm;

    try {
      // Generate response using provider
      const result = await this.provider.generateResponse({
        prompt: message.content,
        systemPrompt,
        history,
        temperature: this.state.config.temperature,
        maxTokens: this.state.config.maxTokens,
        model: undefined, // Use provider default
      });

      const duration = Date.now() - startTime;

      // Update token usage stats
      if (result.usage) {
        this.state = {
          ...this.state,
          stats: {
            ...this.state.stats,
            tokensUsed: this.state.stats.tokensUsed + result.usage.totalTokens,
          },
        };
      }

      return {
        id: generateId(),
        personaId: this.state.id,
        content: result.content,
        confidence: 0.9, // High confidence for actual LLM responses
        metadata: {
          tokensUsed: result.usage?.totalTokens,
          duration,
          model: result.metadata?.model as string | undefined,
          context: {
            finishReason: result.finishReason,
            provider: result.metadata?.provider,
          },
        },
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to error response
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        id: generateId(),
        personaId: this.state.id,
        content: `Error generating response: ${errorMessage}`,
        confidence: 0.0,
        metadata: {
          duration,
          context: {
            error: errorMessage,
          },
        },
        timestamp: new Date(),
      };
    }
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
    const selectedResponse = primaryResponse ?? responses[0];

    // Return response marked as coming from the team
    return {
      ...selectedResponse,
      personaId: 'team:' + this.state.id,
      metadata: {
        ...selectedResponse.metadata,
        context: {
          ...selectedResponse.metadata.context,
          team: this.state.id,
          primary: selectedResponse.personaId,
        },
      },
    };
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
    const selectedResponse = sorted[0];

    return {
      ...selectedResponse,
      personaId: 'team:' + this.state.id,
      metadata: {
        ...selectedResponse.metadata,
        context: {
          ...selectedResponse.metadata.context,
          team: this.state.id,
          majority: selectedResponse.personaId,
        },
      },
    };
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
    const selectedResponse = scored[0].response;
    return {
      ...selectedResponse,
      personaId: 'team:' + this.state.id,
      metadata: {
        ...selectedResponse.metadata,
        context: {
          ...selectedResponse.metadata.context,
          team: this.state.id,
          weighted: selectedResponse.personaId,
        },
      },
    };
  }

  private mergeRandom(responses: Response[]): Response {
    // Random selection
    const index = Math.floor(Math.random() * responses.length);
    const selectedResponse = responses[index];

    return {
      ...selectedResponse,
      personaId: 'team:' + this.state.id,
      metadata: {
        ...selectedResponse.metadata,
        context: {
          ...selectedResponse.metadata.context,
          team: this.state.id,
          random: selectedResponse.personaId,
        },
      },
    };
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
//                              EXPRESSION EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple expression evaluator for workflow conditions
 * Evaluates boolean expressions and comparisons
 */
class ExpressionEvaluator {
  /**
   * Evaluate an expression in a given context
   */
  evaluate(expr: AST.Expression, context: Record<string, unknown>): unknown {
    switch (expr.kind) {
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value;

      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value;

      case 'StringLiteral':
        return (expr as AST.StringLiteral).value;

      case 'Identifier': {
        const id = (expr as AST.Identifier).name;
        return context[id] ?? null;
      }

      case 'BinaryExpression':
        return this.evaluateBinary(expr as AST.BinaryExpression, context);

      case 'UnaryExpression':
        return this.evaluateUnary(expr as AST.UnaryExpression, context);

      case 'MemberExpression':
        return this.evaluateMember(expr as AST.MemberExpression, context);

      case 'CallExpression':
        return this.evaluateCall(expr as AST.CallExpression, context);

      default:
        // Unsupported expression type, return false for safety
        console.warn(`Unsupported expression type: ${expr.kind}`);
        return false;
    }
  }

  private evaluateBinary(
    expr: AST.BinaryExpression,
    context: Record<string, unknown>
  ): unknown {
    const left = this.evaluate(expr.left, context);
    const right = this.evaluate(expr.right, context);

    switch (expr.operator) {
      // Logical operators
      case '&&':
        return Boolean(left) && Boolean(right);
      case '||':
        return Boolean(left) || Boolean(right);

      // Equality operators
      case '==':
        return left === right;
      case '!=':
        return left !== right;

      // Comparison operators
      case '<':
        return (left as number) < (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>':
        return (left as number) > (right as number);
      case '>=':
        return (left as number) >= (right as number);

      // Arithmetic operators
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);

      default:
        console.warn(`Unsupported binary operator: ${expr.operator}`);
        return false;
    }
  }

  private evaluateUnary(
    expr: AST.UnaryExpression,
    context: Record<string, unknown>
  ): unknown {
    const operand = this.evaluate(expr.argument, context);

    switch (expr.operator) {
      case '!':
        return !operand;
      case '-':
        return -(operand as number);
      case '+':
        return +(operand as number);
      default:
        console.warn(`Unsupported unary operator: ${expr.operator}`);
        return false;
    }
  }

  private evaluateMember(
    expr: AST.MemberExpression,
    context: Record<string, unknown>
  ): unknown {
    const object = this.evaluate(expr.object, context);
    if (object === null || object === undefined) return null;

    const property =
      expr.property.kind === 'Identifier'
        ? (expr.property as AST.Identifier).name
        : this.evaluate(expr.property, context);

    return (object as Record<string, unknown>)[property as string];
  }

  private evaluateCall(
    expr: AST.CallExpression,
    context: Record<string, unknown>
  ): unknown {
    // Simple built-in functions for workflow conditions
    if (expr.callee.kind === 'Identifier') {
      const funcName = (expr.callee as AST.Identifier).name;
      const args = expr.arguments.map((arg) => this.evaluate(arg, context));

      switch (funcName) {
        case 'length':
          return (args[0] as unknown[])?.length ?? 0;
        case 'isEmpty':
          return !args[0] || (args[0] as unknown[]).length === 0;
        case 'isNull':
          return args[0] === null || args[0] === undefined;
        case 'isDefined':
          return args[0] !== null && args[0] !== undefined;
        default:
          console.warn(`Unknown function: ${funcName}`);
          return null;
      }
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              WORKFLOW RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retry configuration for workflow steps
 */
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Workflow executor - runs workflow definitions
 */
export class WorkflowExecutor {
  private state: WorkflowState | null = null;
  private readonly eventHandlers: Set<RuntimeEventHandler> = new Set();
  private aborted = false;
  private readonly evaluator = new ExpressionEvaluator();
  private context: Record<string, unknown> = {};
  private abortController: AbortController | null = null;

  /**
   * Execute a workflow
   */
  async execute(
    workflow: AST.WorkflowDeclaration,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>,
    options?: { signal?: AbortSignal }
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
    this.abortController = new AbortController();

    // Listen to external abort signal if provided
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        this.abort();
      });
    }

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
    this.abortController?.abort();
    if (this.state) {
      this.updateStatus('cancelled');
    }
  }

  /**
   * Get the AbortSignal for this workflow
   */
  getSignal(): AbortSignal | null {
    return this.abortController?.signal ?? null;
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

  /**
   * Execute with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this was the last attempt, throw the error
        if (attempt === config.maxAttempts) {
          break;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw new Error(
      `Operation failed after ${config.maxAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

      case 'WorkflowAsyncPipeExpr':
        return this.executeAsyncPipe(
          expr as AST.WorkflowAsyncPipeExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowBidirectionalExpr':
        return this.executeBidirectional(
          expr as AST.WorkflowBidirectionalExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowAccumulateExpr':
        return this.executeAccumulate(
          expr as AST.WorkflowAccumulateExpr,
          input,
          personas,
          teams
        );

      case 'WorkflowComposeExpr':
        return this.executeCompose(
          expr as AST.WorkflowComposeExpr,
          input,
          personas,
          teams
        );

      default:
        throw new Error(`Unknown workflow expression: ${expr.kind}`);
    }
  }

  /**
   * Execute async pipe (~>) - fire-and-forget execution
   * Left side executes and returns immediately, right side runs in background
   */
  private async executeAsyncPipe(
    expr: AST.WorkflowAsyncPipeExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    // Execute left side first
    const leftResult = await this.executeExpression(
      expr.left,
      input,
      personas,
      teams
    );

    // Fire right side asynchronously (don't await)
    this.executeExpression(expr.right, leftResult, personas, teams).catch(
      (error) => {
        // Emit error event but don't block
        this.emit({
          type: 'error',
          error:
            error instanceof Error
              ? error
              : new Error(`Async pipe error: ${String(error)}`),
        });
      }
    );

    // Return left result immediately
    return leftResult;
  }

  /**
   * Execute bidirectional (<->) - feedback loop with iterations
   * Left and right exchange results iteratively
   */
  private async executeBidirectional(
    expr: AST.WorkflowBidirectionalExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    const maxIterations = expr.maxIterations?.value ?? 3;
    let leftResult = input;
    let rightResult: unknown = null;

    for (let i = 0; i < maxIterations && !this.aborted; i++) {
      // Execute left with current input
      leftResult = await this.executeExpression(
        expr.left,
        i === 0 ? input : rightResult,
        personas,
        teams
      );

      // Execute right with left's output
      rightResult = await this.executeExpression(
        expr.right,
        leftResult,
        personas,
        teams
      );

      // Check for convergence (simple check - results unchanged)
      if (i > 0 && leftResult === rightResult) {
        break;
      }
    }

    return rightResult ?? leftResult;
  }

  /**
   * Execute accumulate (>>>) - collect and aggregate results
   * All steps execute with same input, results are accumulated
   */
  private async executeAccumulate(
    expr: AST.WorkflowAccumulateExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const step of expr.steps) {
      const result = await this.executeExpression(step, input, personas, teams);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute compose (::) - workflow composition
   * Compose multiple workflows into a sequential chain
   */
  private async executeCompose(
    expr: AST.WorkflowComposeExpr,
    input: unknown,
    personas: Map<string, PersonaInstance>,
    teams: Map<string, TeamInstance>
  ): Promise<unknown> {
    let current = input;

    for (const workflow of expr.workflows) {
      if (workflow.kind === 'Identifier') {
        // TODO: Look up workflow by name from context
        // For now, just pass through
        continue;
      } else {
        // Execute workflow expression
        current = await this.executeExpression(
          workflow as AST.WorkflowExpression,
          current,
          personas,
          teams
        );
      }
    }

    return current;
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
    // Build context for expression evaluation
    const evalContext = {
      ...this.context,
      input,
      result: input,
    };

    // Evaluate condition using expression evaluator
    const conditionResult = this.evaluator.evaluate(
      expr.condition,
      evalContext
    );
    const condition = Boolean(conditionResult);

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
      // Build context for condition evaluation
      const evalContext = {
        ...this.context,
        input,
        result: current,
        iteration: iterations,
      };

      let shouldContinue = true;

      switch (expr.loopType) {
        case 'times':
          if (expr.count && iterations >= expr.count.value) {
            shouldContinue = false;
          }
          break;

        case 'while':
          // Evaluate condition - continue while it's true
          if (expr.condition) {
            const conditionResult = this.evaluator.evaluate(
              expr.condition,
              evalContext
            );
            shouldContinue = Boolean(conditionResult);
          } else {
            shouldContinue = false;
          }
          break;

        case 'until':
          // Evaluate condition - continue until it's true
          if (expr.condition) {
            const conditionResult = this.evaluator.evaluate(
              expr.condition,
              evalContext
            );
            shouldContinue = !conditionResult;
          } else {
            shouldContinue = false;
          }
          break;
      }

      if (!shouldContinue) {
        return current;
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
  private defaultProvider: AIProvider | null = null;
  private readonly providerMap: Map<string, AIProvider> = new Map();

  constructor(config: Partial<RuntimeConfig> = {}) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  }

  /**
   * Set the default AI provider for all personas
   */
  setDefaultProvider(provider: AIProvider): void {
    this.defaultProvider = provider;

    // Update all existing personas
    for (const persona of this.personas.values()) {
      if (!persona.getProvider()) {
        persona.setProvider(provider);
      }
    }
  }

  /**
   * Set a specific provider for a persona
   */
  setPersonaProvider(personaName: string, provider: AIProvider): void {
    const persona = this.personas.get(personaName);
    if (persona) {
      persona.setProvider(provider);
    }
    this.providerMap.set(personaName, provider);
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): AIProvider | null {
    return this.defaultProvider;
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
      return Ok(await team.process(message, members));
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

    // Get provider for this persona (specific or default)
    const provider = this.providerMap.get(name) ?? this.defaultProvider;

    const instance = new PersonaInstance(
      name,
      name,
      config,
      provider ?? undefined
    );

    // Forward events
    instance.on((event) => this.emit(event));

    this.personas.set(name, instance);
  }

  private extractPersonaConfig(
    decl: AST.PersonaDeclaration
  ): Partial<PersonaConfig> {
    const config: {
      intent?: string;
      tone?: Tone;
      depth?: Depth;
      verbosity?: Verbosity;
      outputFormat?: OutputFormat;
      maxTokens?: number;
      temperature?: number;
      skills?: string[];
      constraints?: string[];
      tags?: string[];
    } = {};

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
  config?: Partial<PersonaConfig>,
  provider?: AIProvider
): PersonaInstance {
  return new PersonaInstance(id, name, config, provider);
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

// Export async & concurrency utilities
export * from './backpressure.js';
export * from './providers/connection-pool.js';
export * from './scheduler.js';
export * from './streams.js';

// Export Phase 1.2 features
export * from './state-machine.js';
export * from './team-edge-cases.js';
export * from './snapshot.js';

// Export Event System (Phase 2)
export * from './events/index.js';
