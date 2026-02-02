/**
 * Tests for Console Logger Event Handler
 */

import {
  ConsoleLogger,
  createConsoleLogger,
} from '../../../../src/runtime/events/handlers/console-logger.js';
import type {
  RuntimeEvent,
  PersonaBeforeEvent,
  PersonaAfterEvent,
  PersonaErrorEvent,
  PersonaActivatedEvent,
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
} from '../../../../src/runtime/events/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════════

let consoleLogSpy: any;
let consoleErrorSpy: any;

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Event Factories
// ═══════════════════════════════════════════════════════════════════════════════

const mockPersonaState = {
  name: 'TestPersona',
  description: 'Test persona description',
  systemPrompt: 'You are a test persona',
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
  return {
    type: 'persona:error',
    persona: mockPersonaState,
    message: mockMessage,
    error: new Error('Test error'),
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

describe('ConsoleLogger', () => {
  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const logger = new ConsoleLogger();
      const handler = logger.getHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should initialize with custom level', () => {
      const logger = new ConsoleLogger({ level: 'debug' });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should initialize with timestamps disabled', () => {
      const logger = new ConsoleLogger({ timestamps: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('2024-01-01');
    });

    it('should initialize with colors disabled', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('\x1b[');
    });

    it('should initialize with pretty printing enabled', () => {
      const logger = new ConsoleLogger({ pretty: true });
      const handler = logger.getHandler();

      handler(createErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('log level filtering', () => {
    it('should filter debug events when level is info', () => {
      const logger = new ConsoleLogger({ level: 'info' });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent()); // debug level
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should show debug events when level is debug', () => {
      const logger = new ConsoleLogger({ level: 'debug' });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent()); // debug level
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show info events when level is info', () => {
      const logger = new ConsoleLogger({ level: 'info' });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent()); // info level
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should filter info events when level is warn', () => {
      const logger = new ConsoleLogger({ level: 'warn' });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent()); // info level
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should always show error events', () => {
      const logger = new ConsoleLogger({ level: 'error' });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('event level determination', () => {
    it('should classify persona:before as debug', () => {
      const logger = new ConsoleLogger({ level: 'debug' });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[DEBUG]');
    });

    it('should classify persona:after as info', () => {
      const logger = new ConsoleLogger({ level: 'info', colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[INFO]');
    });

    it('should classify persona:error as error', () => {
      const logger = new ConsoleLogger({ level: 'info', colors: false });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('[ERROR]');
    });

    it('should classify workflow:step as debug', () => {
      const logger = new ConsoleLogger({ level: 'debug', colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowStepEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[DEBUG]');
    });

    it('should classify workflow:start as info', () => {
      const logger = new ConsoleLogger({ level: 'info', colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowStartEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[INFO]');
    });

    it('should classify llm:call as debug', () => {
      const logger = new ConsoleLogger({ level: 'debug', colors: false });
      const handler = logger.getHandler();

      handler(createLLMCallEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[DEBUG]');
    });
  });

  describe('message formatting', () => {
    it('should include timestamp when enabled', () => {
      const logger = new ConsoleLogger({ timestamps: true, colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('2024-01-01T00:00:00.000Z');
    });

    it('should omit timestamp when disabled', () => {
      const logger = new ConsoleLogger({ timestamps: false, colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('2024-01-01');
    });

    it('should include colors when enabled', () => {
      const logger = new ConsoleLogger({ colors: true });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('\x1b[');
    });

    it('should omit colors when disabled', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('\x1b[');
    });

    it('should include log level in output', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[INFO]');
    });

    it('should include event type in output', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('[persona:after]');
    });
  });

  describe('event-specific details', () => {
    it('should format persona:before event', () => {
      const logger = new ConsoleLogger({ level: 'debug', colors: false });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Persona "TestPersona" processing message');
    });

    it('should format persona:after event with duration', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Persona "TestPersona" responded');
      expect(output).toContain('150ms');
    });

    it('should format persona:error event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Persona "TestPersona" error: Test error');
    });

    it('should format persona:activated event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createPersonaActivatedEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Persona "TestPersona" activated');
    });

    it('should format workflow:start event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowStartEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Workflow "workflow-123" started');
    });

    it('should format workflow:step event', () => {
      const logger = new ConsoleLogger({ level: 'debug', colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowStepEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Workflow "workflow-123" step 1/3: Step1');
    });

    it('should format workflow:complete event with duration', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowCompleteEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Workflow "workflow-123" completed');
      expect(output).toContain('500ms');
    });

    it('should format workflow:error event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createWorkflowErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain(
        'Workflow "workflow-123" error: Workflow failed'
      );
    });

    it('should format llm:call event', () => {
      const logger = new ConsoleLogger({ level: 'debug', colors: false });
      const handler = logger.getHandler();

      handler(createLLMCallEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('LLM call: anthropic/claude-3-5-sonnet');
    });

    it('should format llm:response event with metrics', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createLLMResponseEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('LLM response: anthropic/claude-3-5-sonnet');
      expect(output).toContain('1200ms');
      expect(output).toContain('250 tokens');
      expect(output).toContain('$0.0025');
    });

    it('should format llm:error event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createLLMErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain(
        'LLM error: anthropic/claude-3-5-sonnet: API error'
      );
    });

    it('should format team:formed event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createTeamFormedEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Team "TestTeam" formed with 2 members');
    });

    it('should format team:disbanded event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createTeamDisbandedEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Team "TestTeam" disbanded');
    });

    it('should format team:merge event', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createTeamMergeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('Team "TestTeam" merged 2 responses');
    });

    it('should format error event with context', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      handler(createErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Runtime error: Runtime error');
      expect(output).toContain('source');
    });

    it('should format error event with pretty context', () => {
      const logger = new ConsoleLogger({ colors: false, pretty: true });
      const handler = logger.getHandler();

      handler(createErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Runtime error: Runtime error');
      expect(output).toContain('"source": "test"');
    });
  });

  describe('output streams', () => {
    it('should output error events to console.error', () => {
      const logger = new ConsoleLogger();
      const handler = logger.getHandler();

      handler(createPersonaErrorEvent());
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should output info events to console.log', () => {
      const logger = new ConsoleLogger();
      const handler = logger.getHandler();

      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output debug events to console.log', () => {
      const logger = new ConsoleLogger({ level: 'debug' });
      const handler = logger.getHandler();

      handler(createPersonaBeforeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('createConsoleLogger factory', () => {
    it('should create a handler function', () => {
      const handler = createConsoleLogger();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom config', () => {
      const handler = createConsoleLogger({ level: 'debug' });
      handler(createPersonaBeforeEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should create handler with default config', () => {
      const handler = createConsoleLogger();
      handler(createPersonaAfterEvent());
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle events without timestamp field', () => {
      const logger = new ConsoleLogger({ timestamps: true, colors: false });
      const handler = logger.getHandler();

      const event = {
        type: 'persona:after',
        persona: mockPersonaState,
        message: mockMessage,
        response: mockResponse,
        duration: 150,
      } as PersonaAfterEvent;

      handler(event);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle llm:response without tokens', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      const event = createLLMResponseEvent();
      const eventWithoutTokens = { ...event, tokensUsed: undefined };

      handler(eventWithoutTokens);
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).toContain('0 tokens');
    });

    it('should handle llm:response without cost', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      const event = createLLMResponseEvent();
      const eventWithoutCost = { ...event, cost: undefined };

      handler(eventWithoutCost);
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0] as string;
      expect(output).not.toContain('$');
    });

    it('should handle error event without context', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      const event: ErrorEvent = {
        type: 'error',
        error: new Error('Test error'),
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      handler(event);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Runtime error: Test error');
    });

    it('should handle unknown event types gracefully', () => {
      const logger = new ConsoleLogger({ colors: false });
      const handler = logger.getHandler();

      const event = {
        type: 'unknown:type',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      } as unknown as RuntimeEvent;

      handler(event);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
