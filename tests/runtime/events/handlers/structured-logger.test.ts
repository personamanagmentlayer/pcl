/**
 * Tests for Structured Logger Event Handler
 */

import {
  StructuredLogger,
  createStructuredLogger,
} from '../../../../src/runtime/events/handlers/structured-logger.js';
import type {
  PersonaBeforeEvent,
  PersonaAfterEvent,
  PersonaErrorEvent,
  PersonaActivatedEvent,
  PersonaDeactivatedEvent,
  WorkflowStartEvent,
  WorkflowStepEvent,
  WorkflowCompleteEvent,
  WorkflowErrorEvent,
  LLMCallEvent,
  LLMResponseEvent,
  LLMErrorEvent,
  TeamFormedEvent,
  TeamDisbandedEvent,
  TeamMergeEvent,
  ErrorEvent,
  RuntimeEvent,
} from '../../../../src/runtime/events/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Event Factories
// ═══════════════════════════════════════════════════════════════════════════════

const mockPersonaState = {
  name: 'TestPersona',
  description: 'Test persona',
  systemPrompt: 'You are a test',
  temperature: 0.7,
  enabled: true,
};

const mockMessage = {
  role: 'user' as const,
  content: 'Test message',
};

const mockResponse = {
  role: 'assistant' as const,
  content: 'Test response',
};

const mockWorkflowState = {
  id: 'workflow-123',
  name: 'TestWorkflow',
  steps: [],
};

const mockTeamState = {
  name: 'TestTeam',
  members: [mockPersonaState, mockPersonaState],
};

function createPersonaBeforeEvent(): PersonaBeforeEvent {
  return {
    type: 'persona:before',
    persona: mockPersonaState,
    message: mockMessage,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createPersonaAfterEvent(): PersonaAfterEvent {
  return {
    type: 'persona:after',
    persona: mockPersonaState,
    message: mockMessage,
    response: mockResponse,
    duration: 150,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createPersonaErrorEvent(): PersonaErrorEvent {
  const error = new Error('Test error');
  error.stack = 'Error: Test error\n  at test.ts:123:45';
  return {
    type: 'persona:error',
    persona: mockPersonaState,
    message: mockMessage,
    error,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createPersonaActivatedEvent(): PersonaActivatedEvent {
  return {
    type: 'persona:activated',
    persona: mockPersonaState,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createPersonaDeactivatedEvent(): PersonaDeactivatedEvent {
  return {
    type: 'persona:deactivated',
    persona: mockPersonaState,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createWorkflowStartEvent(): WorkflowStartEvent {
  return {
    type: 'workflow:start',
    workflow: mockWorkflowState,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createWorkflowStepEvent(): WorkflowStepEvent {
  return {
    type: 'workflow:step',
    workflow: mockWorkflowState,
    stepName: 'Step1',
    stepIndex: 0,
    totalSteps: 3,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createWorkflowCompleteEvent(): WorkflowCompleteEvent {
  return {
    type: 'workflow:complete',
    workflow: mockWorkflowState,
    result: { success: true },
    duration: 500,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createWorkflowErrorEvent(): WorkflowErrorEvent {
  return {
    type: 'workflow:error',
    workflow: mockWorkflowState,
    error: new Error('Workflow failed'),
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createLLMCallEvent(): LLMCallEvent {
  return {
    type: 'llm:call',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    persona: mockPersonaState,
    message: mockMessage,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createLLMResponseEvent(): LLMResponseEvent {
  return {
    type: 'llm:response',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    persona: mockPersonaState,
    response: mockResponse,
    tokensUsed: 250,
    duration: 1200,
    cost: 0.0025,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createLLMErrorEvent(): LLMErrorEvent {
  return {
    type: 'llm:error',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    persona: mockPersonaState,
    error: new Error('API error'),
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createTeamFormedEvent(): TeamFormedEvent {
  return {
    type: 'team:formed',
    team: mockTeamState,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createTeamDisbandedEvent(): TeamDisbandedEvent {
  return {
    type: 'team:disbanded',
    team: mockTeamState,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createTeamMergeEvent(): TeamMergeEvent {
  return {
    type: 'team:merge',
    team: mockTeamState,
    responses: [mockResponse, mockResponse],
    mergedResponse: mockResponse,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

function createErrorEvent(): ErrorEvent {
  return {
    type: 'error',
    error: new Error('Runtime error'),
    context: { source: 'test' },
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('StructuredLogger', () => {
  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const logger = new StructuredLogger();
      expect(logger).toBeDefined();
      const handler = logger.getHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should initialize with custom metadata', () => {
      const logger = new StructuredLogger({
        metadata: { service: 'test', version: '1.0.0' },
      });
      expect(logger).toBeDefined();
    });

    it('should initialize with stack traces disabled', () => {
      const logger = new StructuredLogger({ includeStack: false });
      expect(logger).toBeDefined();
    });

    it('should initialize with custom output function', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      expect(logger).toBeDefined();
    });
  });

  describe('log entry creation', () => {
    it('should create structured log entry with all fields', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      expect(mockOutput).toHaveBeenCalled();
      const entry = mockOutput.mock.calls[0][0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('event');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('data');
    });

    it('should format timestamp as ISO 8601', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should include custom metadata', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({
        output: mockOutput,
        metadata: { service: 'test-service', env: 'production' },
      });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.metadata).toEqual({
        service: 'test-service',
        env: 'production',
      });
    });

    it('should not include metadata when empty', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.metadata).toBeUndefined();
    });

    it('should include error details with stack', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({
        output: mockOutput,
        includeStack: true,
      });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.error).toBeDefined();
      expect(entry.error.name).toBe('Error');
      expect(entry.error.message).toBe('Test error');
      expect(entry.error.stack).toContain('test.ts:123:45');
    });

    it('should include error details without stack', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({
        output: mockOutput,
        includeStack: false,
      });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.error).toBeDefined();
      expect(entry.error.name).toBe('Error');
      expect(entry.error.message).toBe('Test error');
      expect(entry.error.stack).toBeUndefined();
    });

    it('should handle events without timestamp field', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      const event = {
        type: 'persona:after',
        persona: mockPersonaState,
        message: mockMessage,
        response: mockResponse,
        duration: 150,
      } as PersonaAfterEvent;

      handler(event);

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('event level determination', () => {
    it('should classify persona:error as error level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('error');
    });

    it('should classify workflow:error as error level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('error');
    });

    it('should classify llm:error as error level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createLLMErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('error');
    });

    it('should classify error event as error level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('error');
    });

    it('should classify persona:before as debug level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('debug');
    });

    it('should classify workflow:step as debug level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowStepEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('debug');
    });

    it('should classify persona:after as info level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('info');
    });

    it('should classify workflow:start as info level', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowStartEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.level).toBe('info');
    });
  });

  describe('event messages', () => {
    it('should generate message for persona:before', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'Persona "TestPersona" is processing a message'
      );
    });

    it('should generate message for persona:after', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'Persona "TestPersona" completed processing in 150ms'
      );
    });

    it('should generate message for persona:error', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'Persona "TestPersona" encountered an error: Test error'
      );
    });

    it('should generate message for persona:activated', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaActivatedEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Persona "TestPersona" was activated');
    });

    it('should generate message for persona:deactivated', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaDeactivatedEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Persona "TestPersona" was deactivated');
    });

    it('should generate message for workflow:start', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowStartEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Workflow "workflow-123" started execution');
    });

    it('should generate message for workflow:step', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowStepEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'Workflow "workflow-123" executing step 1/3: Step1'
      );
    });

    it('should generate message for workflow:complete', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowCompleteEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Workflow "workflow-123" completed in 500ms');
    });

    it('should generate message for workflow:error', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createWorkflowErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'Workflow "workflow-123" encountered an error: Workflow failed'
      );
    });

    it('should generate message for llm:call', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createLLMCallEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('LLM API call to anthropic/claude-3-5-sonnet');
    });

    it('should generate message for llm:response', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createLLMResponseEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'LLM response received from anthropic/claude-3-5-sonnet in 1200ms'
      );
    });

    it('should generate message for llm:error', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createLLMErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe(
        'LLM API error from anthropic/claude-3-5-sonnet: API error'
      );
    });

    it('should generate message for team:formed', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createTeamFormedEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Team "TestTeam" formed with 2 members');
    });

    it('should generate message for team:disbanded', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createTeamDisbandedEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Team "TestTeam" was disbanded');
    });

    it('should generate message for team:merge', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createTeamMergeEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Team "TestTeam" merged 2 member responses');
    });

    it('should generate message for error event', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Runtime error: Runtime error');
    });

    it('should handle unknown event types', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      const unknownEvent = {
        type: 'unknown:event',
        timestamp: new Date(),
      } as unknown as RuntimeEvent;

      handler(unknownEvent);

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.message).toBe('Event: unknown:event');
    });
  });

  describe('event data extraction', () => {
    it('should extract event data', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.data).toBeDefined();
      expect(entry.data.type).toBe('persona:after');
      expect(entry.data.persona).toEqual(mockPersonaState);
      expect(entry.data.duration).toBe(150);
    });

    it('should remove timestamp from data', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.data.timestamp).toBeUndefined();
    });

    it('should remove error from data when present', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.data.error).toBeUndefined();
      expect(entry.error).toBeDefined(); // Moved to error field
    });
  });

  describe('createStructuredLogger factory', () => {
    it('should create handler function', () => {
      const handler = createStructuredLogger();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create with custom config', () => {
      const mockOutput = vi.fn();
      const handler = createStructuredLogger({
        metadata: { service: 'test' },
        output: mockOutput,
      });

      handler(createPersonaAfterEvent());

      expect(mockOutput).toHaveBeenCalled();
      const entry = mockOutput.mock.calls[0][0];
      expect(entry.metadata).toEqual({ service: 'test' });
    });

    it('should use default console.log output', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const handler = createStructuredLogger();

      handler(createPersonaAfterEvent());

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.event).toBe('persona:after');

      consoleLogSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty config', () => {
      const logger = new StructuredLogger({});
      expect(logger).toBeDefined();
    });

    it('should handle error without stack trace', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({
        output: mockOutput,
        includeStack: true,
      });
      const handler = logger.getHandler();

      const errorWithoutStack = new Error('No stack');
      delete errorWithoutStack.stack;

      const event: PersonaErrorEvent = {
        type: 'persona:error',
        persona: mockPersonaState,
        message: mockMessage,
        error: errorWithoutStack,
        timestamp: new Date(),
      };

      handler(event);

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.error).toBeDefined();
      expect(entry.error.stack).toBeUndefined();
    });

    it('should handle multiple events sequentially', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({ output: mockOutput });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());
      handler(createPersonaAfterEvent());
      handler(createWorkflowStartEvent());

      expect(mockOutput).toHaveBeenCalledTimes(3);
    });

    it('should include all metadata fields', () => {
      const mockOutput = vi.fn();
      const logger = new StructuredLogger({
        output: mockOutput,
        metadata: {
          service: 'pcl-runtime',
          version: '1.0.0',
          environment: 'production',
          datacenter: 'us-east-1',
          custom: { nested: 'value' },
        },
      });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());

      const entry = mockOutput.mock.calls[0][0];
      expect(entry.metadata).toEqual({
        service: 'pcl-runtime',
        version: '1.0.0',
        environment: 'production',
        datacenter: 'us-east-1',
        custom: { nested: 'value' },
      });
    });
  });
});
