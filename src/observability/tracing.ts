/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Distributed Tracing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Distributed tracing instrumentation for workflows, personas, and providers
 *
 * @packageDocumentation
 * @module @pcl/observability/tracing
 * @version 1.0.0
 */

import {
  trace,
  context,
  Span,
  SpanStatusCode,
  SpanKind,
  Context,
} from '@opentelemetry/api';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpanOptions {
  readonly kind?: SpanKind;
  readonly attributes?: Record<string, string | number | boolean>;
  readonly parent?: Span | Context;
}

export interface WorkflowSpanOptions extends SpanOptions {
  readonly workflowName: string;
  readonly input?: unknown;
}

export interface PersonaSpanOptions extends SpanOptions {
  readonly personaId: string;
  readonly role?: string;
}

export interface ProviderSpanOptions extends SpanOptions {
  readonly provider: string;
  readonly model: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TRACING INSTRUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Instrumentation for distributed tracing across PCL components
 */
export class TracingInstrumentation {
  private readonly tracer;

  constructor(tracerName: string = 'pcl-runtime') {
    this.tracer = trace.getTracer(tracerName, '1.0.0');
  }

  /**
   * Create a span for workflow execution
   */
  createWorkflowSpan(options: WorkflowSpanOptions): Span {
    const { workflowName, input, attributes = {}, parent } = options;

    const ctx = parent
      ? parent instanceof Object && 'spanContext' in parent
        ? trace.setSpan(context.active(), parent as Span)
        : (parent as Context)
      : context.active();

    const span = this.tracer.startSpan(
      `workflow.execute`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'workflow.name': workflowName,
          'workflow.input_type': input ? typeof input : 'undefined',
          ...attributes,
        },
      },
      ctx
    );

    return span;
  }

  /**
   * Create a span for persona processing
   */
  createPersonaSpan(options: PersonaSpanOptions): Span {
    const { personaId, role, attributes = {}, parent } = options;

    const ctx = parent
      ? parent instanceof Object && 'spanContext' in parent
        ? trace.setSpan(context.active(), parent as Span)
        : (parent as Context)
      : context.active();

    const span = this.tracer.startSpan(
      `persona.process`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'persona.id': personaId,
          'persona.role': role || 'unknown',
          ...attributes,
        },
      },
      ctx
    );

    return span;
  }

  /**
   * Create a span for team processing
   */
  createTeamSpan(
    teamId: string,
    mergeMode: string,
    options: SpanOptions = {}
  ): Span {
    const { attributes = {}, parent } = options;

    const ctx = parent
      ? parent instanceof Object && 'spanContext' in parent
        ? trace.setSpan(context.active(), parent as Span)
        : (parent as Context)
      : context.active();

    const span = this.tracer.startSpan(
      `team.process`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'team.id': teamId,
          'team.merge_mode': mergeMode,
          ...attributes,
        },
      },
      ctx
    );

    return span;
  }

  /**
   * Create a span for provider API calls
   */
  createProviderSpan(options: ProviderSpanOptions): Span {
    const { provider, model, attributes = {}, parent } = options;

    const ctx = parent
      ? parent instanceof Object && 'spanContext' in parent
        ? trace.setSpan(context.active(), parent as Span)
        : (parent as Context)
      : context.active();

    const span = this.tracer.startSpan(
      `provider.request`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'provider.name': provider,
          'provider.model': model,
          ...attributes,
        },
      },
      ctx
    );

    return span;
  }

  /**
   * Create a generic span with custom name
   */
  createSpan(name: string, options: SpanOptions = {}): Span {
    const { kind = SpanKind.INTERNAL, attributes = {}, parent } = options;

    const ctx = parent
      ? parent instanceof Object && 'spanContext' in parent
        ? trace.setSpan(context.active(), parent as Span)
        : (parent as Context)
      : context.active();

    const span = this.tracer.startSpan(
      name,
      {
        kind,
        attributes,
      },
      ctx
    );

    return span;
  }

  /**
   * Add an event to a span
   */
  addSpanEvent(
    span: Span,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    span.addEvent(name, attributes);
  }

  /**
   * Set span status to error
   */
  setSpanError(span: Span, error: Error): void {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }

  /**
   * Set span status to OK
   */
  setSpanOK(span: Span): void {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  /**
   * Add custom attributes to a span
   */
  setSpanAttributes(
    span: Span,
    attributes: Record<string, string | number | boolean>
  ): void {
    span.setAttributes(attributes);
  }

  /**
   * End a span
   */
  endSpan(span: Span): void {
    span.end();
  }

  /**
   * Execute a function within a span context
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options: SpanOptions = {}
  ): Promise<T> {
    const span = this.createSpan(name, options);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      this.setSpanOK(span);
      return result;
    } catch (error) {
      this.setSpanError(span, error as Error);
      throw error;
    } finally {
      this.endSpan(span);
    }
  }

  /**
   * Execute a synchronous function within a span context
   */
  withSpanSync<T>(
    name: string,
    fn: (span: Span) => T,
    options: SpanOptions = {}
  ): T {
    const span = this.createSpan(name, options);

    try {
      const result = context.with(trace.setSpan(context.active(), span), () =>
        fn(span)
      );
      this.setSpanOK(span);
      return result;
    } catch (error) {
      this.setSpanError(span, error as Error);
      throw error;
    } finally {
      this.endSpan(span);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT INSTRUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

let defaultInstrumentation: TracingInstrumentation | null = null;

/**
 * Get the default tracing instrumentation instance
 */
export function getTracingInstrumentation(): TracingInstrumentation {
  if (!defaultInstrumentation) {
    defaultInstrumentation = new TracingInstrumentation();
  }
  return defaultInstrumentation;
}

/**
 * Set the default tracing instrumentation instance
 */
export function setTracingInstrumentation(
  instrumentation: TracingInstrumentation
): void {
  defaultInstrumentation = instrumentation;
}

/**
 * Create a new tracing instrumentation instance
 */
export function createTracingInstrumentation(
  tracerName?: string
): TracingInstrumentation {
  return new TracingInstrumentation(tracerName);
}
