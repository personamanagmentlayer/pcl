/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Semantic Conventions Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for OpenTelemetry semantic conventions
 *
 * @packageDocumentation
 */

import {
  SemanticMetrics,
  SemanticAttributes,
  SemanticSpans,
  MetricUnits,
  createGenAIAttributes,
  createTokenUsageAttributes,
  createWorkflowAttributes,
  createPersonaAttributes,
  createTeamAttributes,
  createErrorAttributes,
} from '../../src/observability/semantic-conventions';

// ═══════════════════════════════════════════════════════════════════════════════
//                              METRIC NAMES
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticMetrics - AI Persona Metrics', () => {
  it('should define persona activation metric', () => {
    expect(SemanticMetrics.AI_PERSONA_ACTIVATIONS_TOTAL).toBe(
      'ai.persona.activations.total'
    );
  });

  it('should define persona messages metric', () => {
    expect(SemanticMetrics.AI_PERSONA_MESSAGES_TOTAL).toBe(
      'ai.persona.messages.total'
    );
  });

  it('should define persona tokens used metric', () => {
    expect(SemanticMetrics.AI_PERSONA_TOKENS_USED).toBe(
      'ai.persona.tokens.used'
    );
  });

  it('should define persona response duration metric', () => {
    expect(SemanticMetrics.AI_PERSONA_RESPONSE_DURATION).toBe(
      'ai.persona.response.duration'
    );
  });

  it('should define persona active gauge metric', () => {
    expect(SemanticMetrics.AI_PERSONA_ACTIVE).toBe('ai.persona.active');
  });

  it('should use consistent naming pattern for persona metrics', () => {
    const personaMetrics = [
      SemanticMetrics.AI_PERSONA_ACTIVATIONS_TOTAL,
      SemanticMetrics.AI_PERSONA_MESSAGES_TOTAL,
      SemanticMetrics.AI_PERSONA_TOKENS_USED,
      SemanticMetrics.AI_PERSONA_RESPONSE_DURATION,
      SemanticMetrics.AI_PERSONA_ACTIVE,
    ];

    personaMetrics.forEach((metric) => {
      expect(metric).toMatch(/^ai\.persona\./);
    });
  });
});

describe('SemanticMetrics - AI Team Metrics', () => {
  it('should define team merges total metric', () => {
    expect(SemanticMetrics.AI_TEAM_MERGES_TOTAL).toBe('ai.team.merges.total');
  });

  it('should define team response duration metric', () => {
    expect(SemanticMetrics.AI_TEAM_RESPONSE_DURATION).toBe(
      'ai.team.response.duration'
    );
  });

  it('should define team active gauge metric', () => {
    expect(SemanticMetrics.AI_TEAM_ACTIVE).toBe('ai.team.active');
  });

  it('should use consistent naming pattern for team metrics', () => {
    const teamMetrics = [
      SemanticMetrics.AI_TEAM_MERGES_TOTAL,
      SemanticMetrics.AI_TEAM_RESPONSE_DURATION,
      SemanticMetrics.AI_TEAM_ACTIVE,
    ];

    teamMetrics.forEach((metric) => {
      expect(metric).toMatch(/^ai\.team\./);
    });
  });
});

describe('SemanticMetrics - Workflow Metrics', () => {
  it('should define workflow executions total metric', () => {
    expect(SemanticMetrics.WORKFLOW_EXECUTIONS_TOTAL).toBe(
      'workflow.executions.total'
    );
  });

  it('should define workflow duration metric', () => {
    expect(SemanticMetrics.WORKFLOW_DURATION).toBe('workflow.duration');
  });

  it('should define workflow steps total metric', () => {
    expect(SemanticMetrics.WORKFLOW_STEPS_TOTAL).toBe('workflow.steps.total');
  });

  it('should define workflow active gauge metric', () => {
    expect(SemanticMetrics.WORKFLOW_ACTIVE).toBe('workflow.active');
  });

  it('should use consistent naming pattern for workflow metrics', () => {
    const workflowMetrics = [
      SemanticMetrics.WORKFLOW_EXECUTIONS_TOTAL,
      SemanticMetrics.WORKFLOW_DURATION,
      SemanticMetrics.WORKFLOW_STEPS_TOTAL,
      SemanticMetrics.WORKFLOW_ACTIVE,
    ];

    workflowMetrics.forEach((metric) => {
      expect(metric).toMatch(/^workflow\./);
    });
  });
});

describe('SemanticMetrics - Gen AI Provider Metrics', () => {
  it('should define gen AI operation duration metric', () => {
    expect(SemanticMetrics.GEN_AI_CLIENT_OPERATION_DURATION).toBe(
      'gen_ai.client.operation.duration'
    );
  });

  it('should define gen AI token usage metric', () => {
    expect(SemanticMetrics.GEN_AI_CLIENT_TOKEN_USAGE).toBe(
      'gen_ai.client.token.usage'
    );
  });

  it('should define gen AI operation cost metric', () => {
    expect(SemanticMetrics.GEN_AI_CLIENT_OPERATION_COST).toBe(
      'gen_ai.client.operation.cost'
    );
  });

  it('should define gen AI server request duration metric', () => {
    expect(SemanticMetrics.GEN_AI_SERVER_REQUEST_DURATION).toBe(
      'gen_ai.server.request.duration'
    );
  });

  it('should follow OpenTelemetry gen_ai naming convention', () => {
    const genAIMetrics = [
      SemanticMetrics.GEN_AI_CLIENT_OPERATION_DURATION,
      SemanticMetrics.GEN_AI_CLIENT_TOKEN_USAGE,
      SemanticMetrics.GEN_AI_CLIENT_OPERATION_COST,
      SemanticMetrics.GEN_AI_SERVER_REQUEST_DURATION,
    ];

    genAIMetrics.forEach((metric) => {
      expect(metric).toMatch(/^gen_ai\./);
    });
  });
});

describe('SemanticMetrics - Task Scheduler Metrics', () => {
  it('should define task queue size metric', () => {
    expect(SemanticMetrics.TASK_QUEUE_SIZE).toBe('task.queue.size');
  });

  it('should define task running gauge metric', () => {
    expect(SemanticMetrics.TASK_RUNNING).toBe('task.running');
  });

  it('should define task completed total metric', () => {
    expect(SemanticMetrics.TASK_COMPLETED_TOTAL).toBe('task.completed.total');
  });

  it('should define task failed total metric', () => {
    expect(SemanticMetrics.TASK_FAILED_TOTAL).toBe('task.failed.total');
  });

  it('should define task wait duration metric', () => {
    expect(SemanticMetrics.TASK_WAIT_DURATION).toBe('task.wait.duration');
  });

  it('should define task execution duration metric', () => {
    expect(SemanticMetrics.TASK_EXECUTION_DURATION).toBe(
      'task.execution.duration'
    );
  });

  it('should use consistent naming pattern for task metrics', () => {
    const taskMetrics = [
      SemanticMetrics.TASK_QUEUE_SIZE,
      SemanticMetrics.TASK_RUNNING,
      SemanticMetrics.TASK_COMPLETED_TOTAL,
      SemanticMetrics.TASK_FAILED_TOTAL,
      SemanticMetrics.TASK_WAIT_DURATION,
      SemanticMetrics.TASK_EXECUTION_DURATION,
    ];

    taskMetrics.forEach((metric) => {
      expect(metric).toMatch(/^task\./);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ATTRIBUTE NAMES
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticAttributes - AI Persona Attributes', () => {
  it('should define persona ID attribute', () => {
    expect(SemanticAttributes.AI_PERSONA_ID).toBe('ai.persona.id');
  });

  it('should define persona role attribute', () => {
    expect(SemanticAttributes.AI_PERSONA_ROLE).toBe('ai.persona.role');
  });

  it('should define persona tone attribute', () => {
    expect(SemanticAttributes.AI_PERSONA_TONE).toBe('ai.persona.tone');
  });

  it('should use consistent naming pattern for persona attributes', () => {
    const personaAttrs = [
      SemanticAttributes.AI_PERSONA_ID,
      SemanticAttributes.AI_PERSONA_ROLE,
      SemanticAttributes.AI_PERSONA_TONE,
    ];

    personaAttrs.forEach((attr) => {
      expect(attr).toMatch(/^ai\.persona\./);
    });
  });
});

describe('SemanticAttributes - AI Team Attributes', () => {
  it('should define team ID attribute', () => {
    expect(SemanticAttributes.AI_TEAM_ID).toBe('ai.team.id');
  });

  it('should define team merge mode attribute', () => {
    expect(SemanticAttributes.AI_TEAM_MERGE_MODE).toBe('ai.team.merge.mode');
  });

  it('should use consistent naming pattern for team attributes', () => {
    const teamAttrs = [
      SemanticAttributes.AI_TEAM_ID,
      SemanticAttributes.AI_TEAM_MERGE_MODE,
    ];

    teamAttrs.forEach((attr) => {
      expect(attr).toMatch(/^ai\.team\./);
    });
  });
});

describe('SemanticAttributes - Workflow Attributes', () => {
  it('should define workflow name attribute', () => {
    expect(SemanticAttributes.WORKFLOW_NAME).toBe('workflow.name');
  });

  it('should define workflow step name attribute', () => {
    expect(SemanticAttributes.WORKFLOW_STEP_NAME).toBe('workflow.step.name');
  });

  it('should define workflow status attribute', () => {
    expect(SemanticAttributes.WORKFLOW_STATUS).toBe('workflow.status');
  });

  it('should use consistent naming pattern for workflow attributes', () => {
    const workflowAttrs = [
      SemanticAttributes.WORKFLOW_NAME,
      SemanticAttributes.WORKFLOW_STEP_NAME,
      SemanticAttributes.WORKFLOW_STATUS,
    ];

    workflowAttrs.forEach((attr) => {
      expect(attr).toMatch(/^workflow\./);
    });
  });
});

describe('SemanticAttributes - Gen AI Provider Attributes', () => {
  it('should define gen AI operation name attribute', () => {
    expect(SemanticAttributes.GEN_AI_OPERATION_NAME).toBe(
      'gen_ai.operation.name'
    );
  });

  it('should define gen AI request model attribute', () => {
    expect(SemanticAttributes.GEN_AI_REQUEST_MODEL).toBe(
      'gen_ai.request.model'
    );
  });

  it('should define gen AI response model attribute', () => {
    expect(SemanticAttributes.GEN_AI_RESPONSE_MODEL).toBe(
      'gen_ai.response.model'
    );
  });

  it('should define gen AI system attribute', () => {
    expect(SemanticAttributes.GEN_AI_SYSTEM).toBe('gen_ai.system');
  });

  it('should define gen AI request parameters', () => {
    expect(SemanticAttributes.GEN_AI_REQUEST_TEMPERATURE).toBe(
      'gen_ai.request.temperature'
    );
    expect(SemanticAttributes.GEN_AI_REQUEST_TOP_P).toBe(
      'gen_ai.request.top_p'
    );
    expect(SemanticAttributes.GEN_AI_REQUEST_MAX_TOKENS).toBe(
      'gen_ai.request.max_tokens'
    );
  });

  it('should define gen AI response attributes', () => {
    expect(SemanticAttributes.GEN_AI_RESPONSE_FINISH_REASONS).toBe(
      'gen_ai.response.finish_reasons'
    );
  });

  it('should define gen AI token usage attributes', () => {
    expect(SemanticAttributes.GEN_AI_USAGE_INPUT_TOKENS).toBe(
      'gen_ai.usage.input_tokens'
    );
    expect(SemanticAttributes.GEN_AI_USAGE_OUTPUT_TOKENS).toBe(
      'gen_ai.usage.output_tokens'
    );
    expect(SemanticAttributes.GEN_AI_TOKEN_TYPE).toBe('gen_ai.token.type');
  });

  it('should follow OpenTelemetry gen_ai naming convention', () => {
    const genAIAttrs = [
      SemanticAttributes.GEN_AI_OPERATION_NAME,
      SemanticAttributes.GEN_AI_REQUEST_MODEL,
      SemanticAttributes.GEN_AI_RESPONSE_MODEL,
      SemanticAttributes.GEN_AI_SYSTEM,
    ];

    genAIAttrs.forEach((attr) => {
      expect(attr).toMatch(/^gen_ai\./);
    });
  });
});

describe('SemanticAttributes - Task Scheduler Attributes', () => {
  it('should define task priority attribute', () => {
    expect(SemanticAttributes.TASK_PRIORITY).toBe('task.priority');
  });

  it('should define task status attribute', () => {
    expect(SemanticAttributes.TASK_STATUS).toBe('task.status');
  });
});

describe('SemanticAttributes - Error Attributes', () => {
  it('should define error type attribute', () => {
    expect(SemanticAttributes.ERROR_TYPE).toBe('error.type');
  });

  it('should define error code attribute', () => {
    expect(SemanticAttributes.ERROR_CODE).toBe('error.code');
  });

  it('should define error message attribute', () => {
    expect(SemanticAttributes.ERROR_MESSAGE).toBe('error.message');
  });

  it('should use consistent naming pattern for error attributes', () => {
    const errorAttrs = [
      SemanticAttributes.ERROR_TYPE,
      SemanticAttributes.ERROR_CODE,
      SemanticAttributes.ERROR_MESSAGE,
    ];

    errorAttrs.forEach((attr) => {
      expect(attr).toMatch(/^error\./);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SPAN NAMES
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticSpans', () => {
  it('should define workflow execute span', () => {
    expect(SemanticSpans.WORKFLOW_EXECUTE).toBe('workflow.execute');
  });

  it('should define persona process span', () => {
    expect(SemanticSpans.PERSONA_PROCESS).toBe('ai.persona.process');
  });

  it('should define team process span', () => {
    expect(SemanticSpans.TEAM_PROCESS).toBe('ai.team.process');
  });

  it('should define provider request span', () => {
    expect(SemanticSpans.PROVIDER_REQUEST).toBe('gen_ai.client.request');
  });

  it('should define task execute span', () => {
    expect(SemanticSpans.TASK_EXECUTE).toBe('task.execute');
  });

  it('should use verb-based naming convention', () => {
    const spanNames = Object.values(SemanticSpans);

    spanNames.forEach((span) => {
      expect(span).toMatch(/\.(execute|process|request)$/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              METRIC UNITS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MetricUnits', () => {
  it('should define time units', () => {
    expect(MetricUnits.SECONDS).toBe('s');
    expect(MetricUnits.MILLISECONDS).toBe('ms');
    expect(MetricUnits.MICROSECONDS).toBe('us');
  });

  it('should define data size units', () => {
    expect(MetricUnits.BYTES).toBe('By');
  });

  it('should define domain-specific units', () => {
    expect(MetricUnits.TOKENS).toBe('{tokens}');
    expect(MetricUnits.REQUESTS).toBe('{requests}');
    expect(MetricUnits.ERRORS).toBe('{errors}');
    expect(MetricUnits.USD).toBe('{USD}');
  });

  it('should define percentage unit', () => {
    expect(MetricUnits.PERCENT).toBe('%');
  });

  it('should use UCUM-compliant format for custom units', () => {
    const customUnits = [
      MetricUnits.TOKENS,
      MetricUnits.REQUESTS,
      MetricUnits.ERRORS,
      MetricUnits.USD,
    ];

    customUnits.forEach((unit) => {
      expect(unit).toMatch(/^\{.+\}$/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Gen AI
// ═══════════════════════════════════════════════════════════════════════════════

describe('createGenAIAttributes', () => {
  it('should create basic Gen AI attributes', () => {
    const attrs = createGenAIAttributes({
      system: 'anthropic',
      model: 'claude-3-opus',
    });

    expect(attrs).toEqual({
      'gen_ai.system': 'anthropic',
      'gen_ai.request.model': 'claude-3-opus',
    });
  });

  it('should include optional operation name', () => {
    const attrs = createGenAIAttributes({
      system: 'openai',
      model: 'gpt-4',
      operation: 'chat.completions',
    });

    expect(attrs).toHaveProperty('gen_ai.operation.name', 'chat.completions');
  });

  it('should include optional temperature', () => {
    const attrs = createGenAIAttributes({
      system: 'anthropic',
      model: 'claude-3-opus',
      temperature: 0.7,
    });

    expect(attrs).toHaveProperty('gen_ai.request.temperature', 0.7);
  });

  it('should include optional topP', () => {
    const attrs = createGenAIAttributes({
      system: 'openai',
      model: 'gpt-4',
      topP: 0.9,
    });

    expect(attrs).toHaveProperty('gen_ai.request.top_p', 0.9);
  });

  it('should include optional maxTokens', () => {
    const attrs = createGenAIAttributes({
      system: 'anthropic',
      model: 'claude-3-opus',
      maxTokens: 4096,
    });

    expect(attrs).toHaveProperty('gen_ai.request.max_tokens', 4096);
  });

  it('should include all optional parameters when provided', () => {
    const attrs = createGenAIAttributes({
      system: 'openai',
      model: 'gpt-4-turbo',
      operation: 'embeddings',
      temperature: 0.5,
      topP: 0.95,
      maxTokens: 8192,
    });

    expect(attrs).toEqual({
      'gen_ai.system': 'openai',
      'gen_ai.request.model': 'gpt-4-turbo',
      'gen_ai.operation.name': 'embeddings',
      'gen_ai.request.temperature': 0.5,
      'gen_ai.request.top_p': 0.95,
      'gen_ai.request.max_tokens': 8192,
    });
  });

  it('should handle zero values for numeric parameters', () => {
    const attrs = createGenAIAttributes({
      system: 'anthropic',
      model: 'claude-3-opus',
      temperature: 0,
      topP: 0,
      maxTokens: 0,
    });

    expect(attrs).toHaveProperty('gen_ai.request.temperature', 0);
    expect(attrs).toHaveProperty('gen_ai.request.top_p', 0);
    expect(attrs).toHaveProperty('gen_ai.request.max_tokens', 0);
  });

  it('should not include undefined optional parameters', () => {
    const attrs = createGenAIAttributes({
      system: 'anthropic',
      model: 'claude-3-opus',
      temperature: 0.7,
    });

    expect(attrs).not.toHaveProperty('gen_ai.operation.name');
    expect(attrs).not.toHaveProperty('gen_ai.request.top_p');
    expect(attrs).not.toHaveProperty('gen_ai.request.max_tokens');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Token Usage
// ═══════════════════════════════════════════════════════════════════════════════

describe('createTokenUsageAttributes', () => {
  it('should create token usage attributes', () => {
    const attrs = createTokenUsageAttributes(100, 50);

    expect(attrs).toEqual({
      'gen_ai.usage.input_tokens': 100,
      'gen_ai.usage.output_tokens': 50,
    });
  });

  it('should handle zero tokens', () => {
    const attrs = createTokenUsageAttributes(0, 0);

    expect(attrs).toEqual({
      'gen_ai.usage.input_tokens': 0,
      'gen_ai.usage.output_tokens': 0,
    });
  });

  it('should handle large token counts', () => {
    const attrs = createTokenUsageAttributes(100000, 50000);

    expect(attrs).toEqual({
      'gen_ai.usage.input_tokens': 100000,
      'gen_ai.usage.output_tokens': 50000,
    });
  });

  it('should handle asymmetric token usage', () => {
    const attrs = createTokenUsageAttributes(1000, 1);

    expect(attrs['gen_ai.usage.input_tokens']).toBe(1000);
    expect(attrs['gen_ai.usage.output_tokens']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Workflow
// ═══════════════════════════════════════════════════════════════════════════════

describe('createWorkflowAttributes', () => {
  it('should create workflow attributes for success', () => {
    const attrs = createWorkflowAttributes('data-pipeline', 'success');

    expect(attrs).toEqual({
      'workflow.name': 'data-pipeline',
      'workflow.status': 'success',
    });
  });

  it('should create workflow attributes for failure', () => {
    const attrs = createWorkflowAttributes('data-pipeline', 'failure');

    expect(attrs).toEqual({
      'workflow.name': 'data-pipeline',
      'workflow.status': 'failure',
    });
  });

  it('should handle workflow names with special characters', () => {
    const attrs = createWorkflowAttributes('workflow-123_v2', 'success');

    expect(attrs['workflow.name']).toBe('workflow-123_v2');
  });

  it('should handle empty workflow name', () => {
    const attrs = createWorkflowAttributes('', 'success');

    expect(attrs['workflow.name']).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Persona
// ═══════════════════════════════════════════════════════════════════════════════

describe('createPersonaAttributes', () => {
  it('should create persona attributes with ID only', () => {
    const attrs = createPersonaAttributes({ personaId: 'analyst-v1' });

    expect(attrs).toEqual({
      'ai.persona.id': 'analyst-v1',
    });
  });

  it('should include optional role', () => {
    const attrs = createPersonaAttributes({
      personaId: 'analyst-v1',
      role: 'data-analyst',
    });

    expect(attrs).toEqual({
      'ai.persona.id': 'analyst-v1',
      'ai.persona.role': 'data-analyst',
    });
  });

  it('should include optional tone', () => {
    const attrs = createPersonaAttributes({
      personaId: 'analyst-v1',
      tone: 'professional',
    });

    expect(attrs).toEqual({
      'ai.persona.id': 'analyst-v1',
      'ai.persona.tone': 'professional',
    });
  });

  it('should include both role and tone when provided', () => {
    const attrs = createPersonaAttributes({
      personaId: 'analyst-v1',
      role: 'data-analyst',
      tone: 'friendly',
    });

    expect(attrs).toEqual({
      'ai.persona.id': 'analyst-v1',
      'ai.persona.role': 'data-analyst',
      'ai.persona.tone': 'friendly',
    });
  });

  it('should handle persona IDs with special characters', () => {
    const attrs = createPersonaAttributes({
      personaId: 'persona_123-v2',
    });

    expect(attrs['ai.persona.id']).toBe('persona_123-v2');
  });

  it('should not include undefined optional fields', () => {
    const attrs = createPersonaAttributes({
      personaId: 'analyst-v1',
      role: 'data-analyst',
    });

    expect(attrs).not.toHaveProperty('ai.persona.tone');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Team
// ═══════════════════════════════════════════════════════════════════════════════

describe('createTeamAttributes', () => {
  it('should create team attributes', () => {
    const attrs = createTeamAttributes('research-team', 'consensus');

    expect(attrs).toEqual({
      'ai.team.id': 'research-team',
      'ai.team.merge.mode': 'consensus',
    });
  });

  it('should handle different merge modes', () => {
    const modes = ['chain', 'parallel', 'debate', 'consensus'];

    modes.forEach((mode) => {
      const attrs = createTeamAttributes('test-team', mode);
      expect(attrs['ai.team.merge.mode']).toBe(mode);
    });
  });

  it('should handle team IDs with special characters', () => {
    const attrs = createTeamAttributes('team_123-v2', 'consensus');

    expect(attrs['ai.team.id']).toBe('team_123-v2');
  });

  it('should handle empty strings', () => {
    const attrs = createTeamAttributes('', '');

    expect(attrs).toEqual({
      'ai.team.id': '',
      'ai.team.merge.mode': '',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS - Error
// ═══════════════════════════════════════════════════════════════════════════════

describe('createErrorAttributes', () => {
  it('should create error attributes from Error object', () => {
    const error = new Error('Something went wrong');
    const attrs = createErrorAttributes(error);

    expect(attrs).toEqual({
      'error.type': 'Error',
      'error.message': 'Something went wrong',
    });
  });

  it('should handle custom error types', () => {
    class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    }

    const error = new ValidationError('Invalid input');
    const attrs = createErrorAttributes(error);

    expect(attrs).toEqual({
      'error.type': 'ValidationError',
      'error.message': 'Invalid input',
    });
  });

  it('should handle errors with empty messages', () => {
    const error = new Error('');
    const attrs = createErrorAttributes(error);

    expect(attrs).toEqual({
      'error.type': 'Error',
      'error.message': '',
    });
  });

  it('should handle TypeError', () => {
    const error = new TypeError('Type mismatch');
    const attrs = createErrorAttributes(error);

    expect(attrs['error.type']).toBe('TypeError');
    expect(attrs['error.message']).toBe('Type mismatch');
  });

  it('should handle RangeError', () => {
    const error = new RangeError('Out of range');
    const attrs = createErrorAttributes(error);

    expect(attrs['error.type']).toBe('RangeError');
    expect(attrs['error.message']).toBe('Out of range');
  });

  it('should handle errors with long messages', () => {
    const longMessage = 'x'.repeat(1000);
    const error = new Error(longMessage);
    const attrs = createErrorAttributes(error);

    expect(attrs['error.message']).toBe(longMessage);
  });

  it('should handle errors with special characters', () => {
    const error = new Error('Error with "quotes" and \n newlines');
    const attrs = createErrorAttributes(error);

    expect(attrs['error.message']).toBe('Error with "quotes" and \n newlines');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONVENTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Semantic Conventions - Naming Standards', () => {
  it('should use dot notation for metrics', () => {
    const metrics = Object.values(SemanticMetrics);

    metrics.forEach((metric) => {
      expect(metric).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    });
  });

  it('should use dot notation for attributes', () => {
    const attributes = Object.values(SemanticAttributes);

    attributes.forEach((attr) => {
      expect(attr).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    });
  });

  it('should use dot notation for span names', () => {
    const spans = Object.values(SemanticSpans);

    spans.forEach((span) => {
      expect(span).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    });
  });

  it('should use underscore for gen_ai conventions', () => {
    const genAIMetrics = Object.values(SemanticMetrics).filter((m) =>
      m.startsWith('gen_ai')
    );
    const genAIAttrs = Object.values(SemanticAttributes).filter((a) =>
      a.startsWith('gen_ai')
    );

    [...genAIMetrics, ...genAIAttrs].forEach((name) => {
      expect(name).toMatch(/^gen_ai\./);
    });
  });

  it('should not have uppercase letters in convention names', () => {
    const allNames = [
      ...Object.values(SemanticMetrics),
      ...Object.values(SemanticAttributes),
      ...Object.values(SemanticSpans),
    ];

    allNames.forEach((name) => {
      expect(name).toBe(name.toLowerCase());
    });
  });
});

describe('Semantic Conventions - Consistency', () => {
  it('should have consistent persona prefix for persona metrics', () => {
    const personaMetrics = [
      SemanticMetrics.AI_PERSONA_ACTIVATIONS_TOTAL,
      SemanticMetrics.AI_PERSONA_MESSAGES_TOTAL,
      SemanticMetrics.AI_PERSONA_TOKENS_USED,
      SemanticMetrics.AI_PERSONA_RESPONSE_DURATION,
      SemanticMetrics.AI_PERSONA_ACTIVE,
    ];

    personaMetrics.forEach((metric) => {
      expect(metric.startsWith('ai.persona.')).toBe(true);
    });
  });

  it('should have consistent team prefix for team metrics', () => {
    const teamMetrics = [
      SemanticMetrics.AI_TEAM_MERGES_TOTAL,
      SemanticMetrics.AI_TEAM_RESPONSE_DURATION,
      SemanticMetrics.AI_TEAM_ACTIVE,
    ];

    teamMetrics.forEach((metric) => {
      expect(metric.startsWith('ai.team.')).toBe(true);
    });
  });

  it('should use .total suffix for counter metrics', () => {
    const counterMetrics = [
      SemanticMetrics.AI_PERSONA_ACTIVATIONS_TOTAL,
      SemanticMetrics.AI_PERSONA_MESSAGES_TOTAL,
      SemanticMetrics.AI_TEAM_MERGES_TOTAL,
      SemanticMetrics.WORKFLOW_EXECUTIONS_TOTAL,
      SemanticMetrics.WORKFLOW_STEPS_TOTAL,
      SemanticMetrics.TASK_COMPLETED_TOTAL,
      SemanticMetrics.TASK_FAILED_TOTAL,
    ];

    counterMetrics.forEach((metric) => {
      expect(metric.endsWith('.total')).toBe(true);
    });
  });

  it('should use .duration suffix for timing metrics', () => {
    const durationMetrics = [
      SemanticMetrics.AI_PERSONA_RESPONSE_DURATION,
      SemanticMetrics.AI_TEAM_RESPONSE_DURATION,
      SemanticMetrics.WORKFLOW_DURATION,
      SemanticMetrics.TASK_WAIT_DURATION,
      SemanticMetrics.TASK_EXECUTION_DURATION,
    ];

    durationMetrics.forEach((metric) => {
      expect(metric.endsWith('.duration')).toBe(true);
    });
  });

  it('should have matching metric and attribute prefixes', () => {
    // Persona
    expect(
      SemanticMetrics.AI_PERSONA_ACTIVATIONS_TOTAL.startsWith('ai.persona.')
    ).toBe(true);
    expect(SemanticAttributes.AI_PERSONA_ID.startsWith('ai.persona.')).toBe(
      true
    );

    // Team
    expect(SemanticMetrics.AI_TEAM_MERGES_TOTAL.startsWith('ai.team.')).toBe(
      true
    );
    expect(SemanticAttributes.AI_TEAM_ID.startsWith('ai.team.')).toBe(true);

    // Workflow
    expect(
      SemanticMetrics.WORKFLOW_EXECUTIONS_TOTAL.startsWith('workflow.')
    ).toBe(true);
    expect(SemanticAttributes.WORKFLOW_NAME.startsWith('workflow.')).toBe(true);
  });
});
