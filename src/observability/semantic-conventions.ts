/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * OpenTelemetry Semantic Conventions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Semantic conventions for AI/LLM observability aligned with OpenTelemetry standards
 *
 * @packageDocumentation
 * @module @pcl/observability/semantic-conventions
 * @version 1.0.0
 * @see https://opentelemetry.io/docs/specs/semconv/
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              METRIC NAMES (Semantic Conventions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic convention metric names following OpenTelemetry AI/LLM conventions
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export const SemanticMetrics = {
  // AI Persona Metrics
  AI_PERSONA_ACTIVATIONS_TOTAL: 'ai.persona.activations.total',
  AI_PERSONA_MESSAGES_TOTAL: 'ai.persona.messages.total',
  AI_PERSONA_TOKENS_USED: 'ai.persona.tokens.used',
  AI_PERSONA_RESPONSE_DURATION: 'ai.persona.response.duration',
  AI_PERSONA_ACTIVE: 'ai.persona.active',

  // AI Team Metrics
  AI_TEAM_MERGES_TOTAL: 'ai.team.merges.total',
  AI_TEAM_RESPONSE_DURATION: 'ai.team.response.duration',
  AI_TEAM_ACTIVE: 'ai.team.active',

  // Workflow Metrics
  WORKFLOW_EXECUTIONS_TOTAL: 'workflow.executions.total',
  WORKFLOW_DURATION: 'workflow.duration',
  WORKFLOW_STEPS_TOTAL: 'workflow.steps.total',
  WORKFLOW_ACTIVE: 'workflow.active',

  // AI Provider Metrics (Gen AI Semantic Conventions)
  GEN_AI_CLIENT_OPERATION_DURATION: 'gen_ai.client.operation.duration',
  GEN_AI_CLIENT_TOKEN_USAGE: 'gen_ai.client.token.usage',
  GEN_AI_CLIENT_OPERATION_COST: 'gen_ai.client.operation.cost',
  GEN_AI_SERVER_REQUEST_DURATION: 'gen_ai.server.request.duration',

  // Scheduler Metrics
  TASK_QUEUE_SIZE: 'task.queue.size',
  TASK_RUNNING: 'task.running',
  TASK_COMPLETED_TOTAL: 'task.completed.total',
  TASK_FAILED_TOTAL: 'task.failed.total',
  TASK_WAIT_DURATION: 'task.wait.duration',
  TASK_EXECUTION_DURATION: 'task.execution.duration',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              ATTRIBUTE NAMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic convention attribute names
 */
export const SemanticAttributes = {
  // AI Persona Attributes
  AI_PERSONA_ID: 'ai.persona.id',
  AI_PERSONA_ROLE: 'ai.persona.role',
  AI_PERSONA_TONE: 'ai.persona.tone',

  // AI Team Attributes
  AI_TEAM_ID: 'ai.team.id',
  AI_TEAM_MERGE_MODE: 'ai.team.merge.mode',

  // Workflow Attributes
  WORKFLOW_NAME: 'workflow.name',
  WORKFLOW_STEP_NAME: 'workflow.step.name',
  WORKFLOW_STATUS: 'workflow.status',

  // Gen AI Provider Attributes (OpenTelemetry Gen AI Semantic Conventions)
  GEN_AI_OPERATION_NAME: 'gen_ai.operation.name',
  GEN_AI_REQUEST_MODEL: 'gen_ai.request.model',
  GEN_AI_RESPONSE_MODEL: 'gen_ai.response.model',
  GEN_AI_SYSTEM: 'gen_ai.system', // e.g., "anthropic", "openai"
  GEN_AI_REQUEST_TEMPERATURE: 'gen_ai.request.temperature',
  GEN_AI_REQUEST_TOP_P: 'gen_ai.request.top_p',
  GEN_AI_REQUEST_MAX_TOKENS: 'gen_ai.request.max_tokens',
  GEN_AI_RESPONSE_FINISH_REASONS: 'gen_ai.response.finish_reasons',
  GEN_AI_USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
  GEN_AI_USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
  GEN_AI_TOKEN_TYPE: 'gen_ai.token.type', // "input" | "output"

  // Task Scheduler Attributes
  TASK_PRIORITY: 'task.priority',
  TASK_STATUS: 'task.status',

  // Error Attributes
  ERROR_TYPE: 'error.type',
  ERROR_CODE: 'error.code',
  ERROR_MESSAGE: 'error.message',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              SPAN NAMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic convention span names for distributed tracing
 */
export const SemanticSpans = {
  WORKFLOW_EXECUTE: 'workflow.execute',
  PERSONA_PROCESS: 'ai.persona.process',
  TEAM_PROCESS: 'ai.team.process',
  PROVIDER_REQUEST: 'gen_ai.client.request',
  TASK_EXECUTE: 'task.execute',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              UNIT CONVENTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard units for metrics
 */
export const MetricUnits = {
  SECONDS: 's',
  MILLISECONDS: 'ms',
  MICROSECONDS: 'us',
  BYTES: 'By',
  TOKENS: '{tokens}',
  REQUESTS: '{requests}',
  ERRORS: '{errors}',
  USD: '{USD}',
  PERCENT: '%',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create attributes object for Gen AI provider requests
 */
export function createGenAIAttributes(options: {
  system: string;
  model: string;
  operation?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}): Record<string, string | number> {
  const attrs: Record<string, string | number> = {
    [SemanticAttributes.GEN_AI_SYSTEM]: options.system,
    [SemanticAttributes.GEN_AI_REQUEST_MODEL]: options.model,
  };

  if (options.operation) {
    attrs[SemanticAttributes.GEN_AI_OPERATION_NAME] = options.operation;
  }
  if (options.temperature !== undefined) {
    attrs[SemanticAttributes.GEN_AI_REQUEST_TEMPERATURE] = options.temperature;
  }
  if (options.topP !== undefined) {
    attrs[SemanticAttributes.GEN_AI_REQUEST_TOP_P] = options.topP;
  }
  if (options.maxTokens !== undefined) {
    attrs[SemanticAttributes.GEN_AI_REQUEST_MAX_TOKENS] = options.maxTokens;
  }

  return attrs;
}

/**
 * Create attributes object for token usage
 */
export function createTokenUsageAttributes(
  inputTokens: number,
  outputTokens: number
): Record<string, number> {
  return {
    [SemanticAttributes.GEN_AI_USAGE_INPUT_TOKENS]: inputTokens,
    [SemanticAttributes.GEN_AI_USAGE_OUTPUT_TOKENS]: outputTokens,
  };
}

/**
 * Create attributes object for workflow execution
 */
export function createWorkflowAttributes(
  workflowName: string,
  status: 'success' | 'failure'
): Record<string, string> {
  return {
    [SemanticAttributes.WORKFLOW_NAME]: workflowName,
    [SemanticAttributes.WORKFLOW_STATUS]: status,
  };
}

/**
 * Create attributes object for persona
 */
export function createPersonaAttributes(options: {
  personaId: string;
  role?: string;
  tone?: string;
}): Record<string, string> {
  const attrs: Record<string, string> = {
    [SemanticAttributes.AI_PERSONA_ID]: options.personaId,
  };

  if (options.role) {
    attrs[SemanticAttributes.AI_PERSONA_ROLE] = options.role;
  }
  if (options.tone) {
    attrs[SemanticAttributes.AI_PERSONA_TONE] = options.tone;
  }

  return attrs;
}

/**
 * Create attributes object for team
 */
export function createTeamAttributes(
  teamId: string,
  mergeMode: string
): Record<string, string> {
  return {
    [SemanticAttributes.AI_TEAM_ID]: teamId,
    [SemanticAttributes.AI_TEAM_MERGE_MODE]: mergeMode,
  };
}

/**
 * Create attributes object for errors
 */
export function createErrorAttributes(error: Error): Record<string, string> {
  return {
    [SemanticAttributes.ERROR_TYPE]: error.name,
    [SemanticAttributes.ERROR_MESSAGE]: error.message,
  };
}
