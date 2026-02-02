/**
 * Distributed Tracing Tests
 *
 * Tests for tracing instrumentation, span creation, context propagation,
 * and distributed tracing capabilities.
 */

import {
  TracingInstrumentation,
  getTracingInstrumentation,
  setTracingInstrumentation,
  createTracingInstrumentation,
  type SpanOptions,
  type WorkflowSpanOptions,
  type PersonaSpanOptions,
  type ProviderSpanOptions,
} from '../../src/observability/tracing';
import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  type Span,
  type Context as OtelContext,
} from '@opentelemetry/api';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCK SPAN
// ═══════════════════════════════════════════════════════════════════════════════

class MockSpan {
  private _attributes: Record<string, string | number | boolean> = {};
  private _events: Array<{
    name: string;
    attributes?: Record<string, string | number | boolean>;
  }> = [];
  private _status?: { code: number; message?: string };
  private _ended = false;
  private _exception?: Error;

  spanContext() {
    return {
      traceId: 'mock-trace-id',
      spanId: 'mock-span-id',
      traceFlags: 1,
    };
  }

  setAttribute(key: string, value: string | number | boolean): this {
    this._attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Record<string, string | number | boolean>): this {
    Object.assign(this._attributes, attributes);
    return this;
  }

  addEvent(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): this {
    this._events.push({ name, attributes });
    return this;
  }

  setStatus(status: { code: number; message?: string }): this {
    this._status = status;
    return this;
  }

  recordException(error: Error): this {
    this._exception = error;
    return this;
  }

  end(): void {
    this._ended = true;
  }

  // Test helpers
  getAttributes(): Record<string, string | number | boolean> {
    return this._attributes;
  }

  getEvents(): Array<{
    name: string;
    attributes?: Record<string, string | number | boolean>;
  }> {
    return this._events;
  }

  getStatus(): { code: number; message?: string } | undefined {
    return this._status;
  }

  isEnded(): boolean {
    return this._ended;
  }

  getException(): Error | undefined {
    return this._exception;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SETUP
// ═══════════════════════════════════════════════════════════════════════════════

describe('TracingInstrumentation', () => {
  let mockTracer: {
    startSpan: ReturnType<typeof vi.fn>;
  };
  let instrumentation: TracingInstrumentation;

  beforeEach(() => {
    mockTracer = {
      startSpan: vi.fn(() => new MockSpan() as unknown as Span),
    };

    vi.spyOn(trace, 'getTracer').mockReturnValue(mockTracer as any);
    vi.spyOn(context, 'active').mockReturnValue({} as OtelContext);
    vi.spyOn(trace, 'setSpan').mockReturnValue({} as OtelContext);
    vi.spyOn(context, 'with').mockImplementation((ctx, fn) => fn());

    instrumentation = new TracingInstrumentation('test-tracer');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Constructor', () => {
    it('should create instrumentation with default tracer name', () => {
      const defaultInstr = new TracingInstrumentation();
      expect(trace.getTracer).toHaveBeenCalledWith('pcl-runtime', '1.0.0');
    });

    it('should create instrumentation with custom tracer name', () => {
      const customInstr = new TracingInstrumentation('custom-tracer');
      expect(trace.getTracer).toHaveBeenCalledWith('custom-tracer', '1.0.0');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              WORKFLOW SPANS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createWorkflowSpan', () => {
    it('should create workflow span with minimal options', () => {
      const options: WorkflowSpanOptions = {
        workflowName: 'test-workflow',
      };

      const span = instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.execute',
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: expect.objectContaining({
            'workflow.name': 'test-workflow',
            'workflow.input_type': 'undefined',
          }),
        }),
        expect.anything()
      );
      expect(span).toBeInstanceOf(MockSpan);
    });

    it('should create workflow span with input', () => {
      const options: WorkflowSpanOptions = {
        workflowName: 'test-workflow',
        input: { message: 'test' },
      };

      instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.execute',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'workflow.name': 'test-workflow',
            'workflow.input_type': 'object',
          }),
        }),
        expect.anything()
      );
    });

    it('should create workflow span with custom attributes', () => {
      const options: WorkflowSpanOptions = {
        workflowName: 'test-workflow',
        attributes: {
          customAttribute: 'value',
          priority: 1,
        },
      };

      instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.execute',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'workflow.name': 'test-workflow',
            customAttribute: 'value',
            priority: 1,
          }),
        }),
        expect.anything()
      );
    });

    it('should create workflow span with parent span', () => {
      const parentSpan = new MockSpan() as unknown as Span;
      const options: WorkflowSpanOptions = {
        workflowName: 'child-workflow',
        parent: parentSpan,
      };

      instrumentation.createWorkflowSpan(options);

      expect(trace.setSpan).toHaveBeenCalledWith(expect.anything(), parentSpan);
    });

    it('should create workflow span with parent context', () => {
      const parentContext = {} as OtelContext;
      const options: WorkflowSpanOptions = {
        workflowName: 'child-workflow',
        parent: parentContext,
      };

      instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalled();
    });

    it('should handle string input type', () => {
      const options: WorkflowSpanOptions = {
        workflowName: 'test-workflow',
        input: 'string input',
      };

      instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.execute',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'workflow.input_type': 'string',
          }),
        }),
        expect.anything()
      );
    });

    it('should handle number input type', () => {
      const options: WorkflowSpanOptions = {
        workflowName: 'test-workflow',
        input: 42,
      };

      instrumentation.createWorkflowSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'workflow.execute',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'workflow.input_type': 'number',
          }),
        }),
        expect.anything()
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PERSONA SPANS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createPersonaSpan', () => {
    it('should create persona span with minimal options', () => {
      const options: PersonaSpanOptions = {
        personaId: 'persona-123',
      };

      const span = instrumentation.createPersonaSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'persona.process',
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: expect.objectContaining({
            'persona.id': 'persona-123',
            'persona.role': 'unknown',
          }),
        }),
        expect.anything()
      );
      expect(span).toBeInstanceOf(MockSpan);
    });

    it('should create persona span with role', () => {
      const options: PersonaSpanOptions = {
        personaId: 'persona-123',
        role: 'assistant',
      };

      instrumentation.createPersonaSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'persona.process',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'persona.id': 'persona-123',
            'persona.role': 'assistant',
          }),
        }),
        expect.anything()
      );
    });

    it('should create persona span with custom attributes', () => {
      const options: PersonaSpanOptions = {
        personaId: 'persona-123',
        role: 'expert',
        attributes: {
          expertise: 'coding',
          language: 'typescript',
        },
      };

      instrumentation.createPersonaSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'persona.process',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'persona.id': 'persona-123',
            'persona.role': 'expert',
            expertise: 'coding',
            language: 'typescript',
          }),
        }),
        expect.anything()
      );
    });

    it('should create persona span with parent', () => {
      const parentSpan = new MockSpan() as unknown as Span;
      const options: PersonaSpanOptions = {
        personaId: 'persona-123',
        parent: parentSpan,
      };

      instrumentation.createPersonaSpan(options);

      expect(trace.setSpan).toHaveBeenCalledWith(expect.anything(), parentSpan);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              TEAM SPANS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createTeamSpan', () => {
    it('should create team span with minimal options', () => {
      const span = instrumentation.createTeamSpan('team-123', 'parallel');

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'team.process',
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: expect.objectContaining({
            'team.id': 'team-123',
            'team.merge_mode': 'parallel',
          }),
        }),
        expect.anything()
      );
      expect(span).toBeInstanceOf(MockSpan);
    });

    it('should create team span with custom attributes', () => {
      const options: SpanOptions = {
        attributes: {
          memberCount: 5,
          teamType: 'expert',
        },
      };

      instrumentation.createTeamSpan('team-123', 'debate', options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'team.process',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'team.id': 'team-123',
            'team.merge_mode': 'debate',
            memberCount: 5,
            teamType: 'expert',
          }),
        }),
        expect.anything()
      );
    });

    it('should create team span with parent', () => {
      const parentSpan = new MockSpan() as unknown as Span;
      const options: SpanOptions = {
        parent: parentSpan,
      };

      instrumentation.createTeamSpan('team-123', 'chain', options);

      expect(trace.setSpan).toHaveBeenCalledWith(expect.anything(), parentSpan);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              PROVIDER SPANS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createProviderSpan', () => {
    it('should create provider span with minimal options', () => {
      const options: ProviderSpanOptions = {
        provider: 'openai',
        model: 'gpt-4',
      };

      const span = instrumentation.createProviderSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'provider.request',
        expect.objectContaining({
          kind: SpanKind.CLIENT,
          attributes: expect.objectContaining({
            'provider.name': 'openai',
            'provider.model': 'gpt-4',
          }),
        }),
        expect.anything()
      );
      expect(span).toBeInstanceOf(MockSpan);
    });

    it('should create provider span with custom attributes', () => {
      const options: ProviderSpanOptions = {
        provider: 'anthropic',
        model: 'claude-3',
        attributes: {
          temperature: 0.7,
          maxTokens: 1000,
        },
      };

      instrumentation.createProviderSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'provider.request',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'provider.name': 'anthropic',
            'provider.model': 'claude-3',
            temperature: 0.7,
            maxTokens: 1000,
          }),
        }),
        expect.anything()
      );
    });

    it('should use CLIENT span kind for provider spans', () => {
      const options: ProviderSpanOptions = {
        provider: 'openai',
        model: 'gpt-4',
      };

      instrumentation.createProviderSpan(options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'provider.request',
        expect.objectContaining({
          kind: SpanKind.CLIENT,
        }),
        expect.anything()
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              GENERIC SPANS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createSpan', () => {
    it('should create span with default options', () => {
      const span = instrumentation.createSpan('custom.operation');

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'custom.operation',
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: {},
        }),
        expect.anything()
      );
      expect(span).toBeInstanceOf(MockSpan);
    });

    it('should create span with custom kind', () => {
      const options: SpanOptions = {
        kind: SpanKind.SERVER,
      };

      instrumentation.createSpan('server.request', options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'server.request',
        expect.objectContaining({
          kind: SpanKind.SERVER,
        }),
        expect.anything()
      );
    });

    it('should create span with attributes', () => {
      const options: SpanOptions = {
        attributes: {
          userId: 'user-123',
          action: 'create',
        },
      };

      instrumentation.createSpan('user.action', options);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'user.action',
        expect.objectContaining({
          attributes: {
            userId: 'user-123',
            action: 'create',
          },
        }),
        expect.anything()
      );
    });

    it('should create span with parent', () => {
      const parentSpan = new MockSpan() as unknown as Span;
      const options: SpanOptions = {
        parent: parentSpan,
      };

      instrumentation.createSpan('child.operation', options);

      expect(trace.setSpan).toHaveBeenCalledWith(expect.anything(), parentSpan);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              SPAN OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Span Operations', () => {
    describe('addSpanEvent', () => {
      it('should add event without attributes', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.addSpanEvent(span, 'operation.started');

        const events = (span as any).getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({ name: 'operation.started' });
      });

      it('should add event with attributes', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.addSpanEvent(span, 'operation.progress', {
          progress: 50,
          stage: 'processing',
        });

        const events = (span as any).getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
          name: 'operation.progress',
          attributes: { progress: 50, stage: 'processing' },
        });
      });
    });

    describe('setSpanError', () => {
      it('should record exception and set error status', () => {
        const span = new MockSpan() as unknown as Span;
        const error = new Error('Test error');

        instrumentation.setSpanError(span, error);

        const mockSpan = span as any;
        expect(mockSpan.getException()).toBe(error);
        expect(mockSpan.getStatus()).toEqual({
          code: SpanStatusCode.ERROR,
          message: 'Test error',
        });
      });

      it('should handle error with empty message', () => {
        const span = new MockSpan() as unknown as Span;
        const error = new Error('');

        instrumentation.setSpanError(span, error);

        const mockSpan = span as any;
        expect(mockSpan.getStatus()).toEqual({
          code: SpanStatusCode.ERROR,
          message: '',
        });
      });
    });

    describe('setSpanOK', () => {
      it('should set OK status', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.setSpanOK(span);

        const mockSpan = span as any;
        expect(mockSpan.getStatus()).toEqual({
          code: SpanStatusCode.OK,
        });
      });
    });

    describe('setSpanAttributes', () => {
      it('should set single attribute', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.setSpanAttributes(span, { key: 'value' });

        const mockSpan = span as any;
        expect(mockSpan.getAttributes()).toEqual({ key: 'value' });
      });

      it('should set multiple attributes', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.setSpanAttributes(span, {
          stringAttr: 'value',
          numberAttr: 42,
          boolAttr: true,
        });

        const mockSpan = span as any;
        expect(mockSpan.getAttributes()).toEqual({
          stringAttr: 'value',
          numberAttr: 42,
          boolAttr: true,
        });
      });

      it('should merge with existing attributes', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.setSpanAttributes(span, { attr1: 'value1' });
        instrumentation.setSpanAttributes(span, { attr2: 'value2' });

        const mockSpan = span as any;
        expect(mockSpan.getAttributes()).toEqual({
          attr1: 'value1',
          attr2: 'value2',
        });
      });
    });

    describe('endSpan', () => {
      it('should end span', () => {
        const span = new MockSpan() as unknown as Span;
        instrumentation.endSpan(span);

        const mockSpan = span as any;
        expect(mockSpan.isEnded()).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  //                              CONTEXT EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('withSpan', () => {
    it('should execute async function in span context', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result = await instrumentation.withSpan('test.operation', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(mockTracer.startSpan).toHaveBeenCalled();
    });

    it('should set span to OK on success', async () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);

      await instrumentation.withSpan('test.operation', async () => 'result');

      expect((mockSpan as any).getStatus()).toEqual({
        code: SpanStatusCode.OK,
      });
      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should set span to ERROR on failure', async () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);
      const error = new Error('Test error');

      await expect(
        instrumentation.withSpan('test.operation', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      expect((mockSpan as any).getStatus()).toEqual({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
      expect((mockSpan as any).getException()).toBe(error);
      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should always end span', async () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);

      await instrumentation.withSpan('test.operation', async () => 'result');

      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should pass span to function', async () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);
      const fn = vi.fn().mockResolvedValue('result');

      await instrumentation.withSpan('test.operation', fn);

      expect(fn).toHaveBeenCalledWith(mockSpan);
    });

    it('should support custom span options', async () => {
      const options: SpanOptions = {
        kind: SpanKind.SERVER,
        attributes: { customAttr: 'value' },
      };

      await instrumentation.withSpan(
        'test.operation',
        async () => 'result',
        options
      );

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'test.operation',
        expect.objectContaining({
          kind: SpanKind.SERVER,
          attributes: { customAttr: 'value' },
        }),
        expect.anything()
      );
    });
  });

  describe('withSpanSync', () => {
    it('should execute sync function in span context', () => {
      const fn = vi.fn().mockReturnValue('result');

      const result = instrumentation.withSpanSync('test.operation', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(mockTracer.startSpan).toHaveBeenCalled();
    });

    it('should set span to OK on success', () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);

      instrumentation.withSpanSync('test.operation', () => 'result');

      expect((mockSpan as any).getStatus()).toEqual({
        code: SpanStatusCode.OK,
      });
      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should set span to ERROR on failure', () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);
      const error = new Error('Test error');

      expect(() =>
        instrumentation.withSpanSync('test.operation', () => {
          throw error;
        })
      ).toThrow('Test error');

      expect((mockSpan as any).getStatus()).toEqual({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
      expect((mockSpan as any).getException()).toBe(error);
      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should always end span', () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);

      instrumentation.withSpanSync('test.operation', () => 'result');

      expect((mockSpan as any).isEnded()).toBe(true);
    });

    it('should pass span to function', () => {
      const mockSpan = new MockSpan() as unknown as Span;
      mockTracer.startSpan.mockReturnValue(mockSpan);
      const fn = vi.fn().mockReturnValue('result');

      instrumentation.withSpanSync('test.operation', fn);

      expect(fn).toHaveBeenCalledWith(mockSpan);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              GLOBAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Global Tracing Functions', () => {
  beforeEach(() => {
    vi.spyOn(trace, 'getTracer').mockReturnValue({
      startSpan: vi.fn(() => new MockSpan() as unknown as Span),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTracingInstrumentation', () => {
    it('should return singleton instance', () => {
      const instr1 = getTracingInstrumentation();
      const instr2 = getTracingInstrumentation();

      expect(instr1).toBe(instr2);
    });

    it('should create instance on first call', () => {
      const instr = getTracingInstrumentation();
      expect(instr).toBeInstanceOf(TracingInstrumentation);
    });
  });

  describe('setTracingInstrumentation', () => {
    it('should set custom instrumentation', () => {
      const custom = new TracingInstrumentation('custom');
      setTracingInstrumentation(custom);

      const retrieved = getTracingInstrumentation();
      expect(retrieved).toBe(custom);
    });
  });

  describe('createTracingInstrumentation', () => {
    it('should create new instance with default name', () => {
      const instr = createTracingInstrumentation();
      expect(instr).toBeInstanceOf(TracingInstrumentation);
      expect(trace.getTracer).toHaveBeenCalledWith('pcl-runtime', '1.0.0');
    });

    it('should create new instance with custom name', () => {
      const instr = createTracingInstrumentation('custom-tracer');
      expect(instr).toBeInstanceOf(TracingInstrumentation);
      expect(trace.getTracer).toHaveBeenCalledWith('custom-tracer', '1.0.0');
    });

    it('should create independent instances', () => {
      const instr1 = createTracingInstrumentation();
      const instr2 = createTracingInstrumentation();

      expect(instr1).not.toBe(instr2);
    });
  });
});
