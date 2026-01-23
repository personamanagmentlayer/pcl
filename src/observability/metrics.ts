/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Metrics Collector
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Prometheus metrics collection for PCL runtime
 *
 * @packageDocumentation
 * @module @pcl/observability/metrics
 * @version 1.0.0
 */

import { metrics, ValueType } from '@opentelemetry/api';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricsCollectorOptions {
  readonly prefix?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              METRICS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metrics collector for PCL runtime observability
 */
export class MetricsCollector {
  private readonly meter;
  private readonly prefix: string;

  // Persona metrics
  private readonly personaActivations;
  private readonly personaMessages;
  private readonly personaTokens;
  private readonly personaResponseDuration;
  private readonly activePersonas;

  // Team metrics
  private readonly teamMerges;
  private readonly teamResponseDuration;
  private readonly activeTeams;

  // Workflow metrics
  private readonly workflowExecutions;
  private readonly workflowDuration;
  private readonly workflowSteps;
  private readonly activeWorkflows;

  // Provider metrics
  private readonly providerRequests;
  private readonly providerErrors;
  private readonly providerLatency;
  private readonly providerTokens;
  private readonly providerCost;

  // Scheduler metrics
  private readonly schedulerQueued;
  private readonly schedulerRunning;
  private readonly schedulerCompleted;
  private readonly schedulerFailed;
  private readonly schedulerWaitTime;
  private readonly schedulerExecutionTime;

  // HTTP metrics (auto-instrumented by OpenTelemetry)
  // http_requests_total, http_request_duration_seconds, etc.

  constructor(options: MetricsCollectorOptions = {}) {
    this.prefix = options.prefix || 'pcl';
    this.meter = metrics.getMeter('pcl-runtime', '1.0.0');

    // Initialize persona metrics
    this.personaActivations = this.meter.createCounter(
      `${this.prefix}_persona_activations_total`,
      {
        description: 'Total number of persona activations',
        valueType: ValueType.INT,
      }
    );

    this.personaMessages = this.meter.createCounter(
      `${this.prefix}_persona_messages_total`,
      {
        description: 'Total number of messages processed by personas',
        valueType: ValueType.INT,
      }
    );

    this.personaTokens = this.meter.createCounter(
      `${this.prefix}_persona_tokens_used_total`,
      {
        description: 'Total tokens used by personas',
        valueType: ValueType.INT,
      }
    );

    this.personaResponseDuration = this.meter.createHistogram(
      `${this.prefix}_persona_response_duration_seconds`,
      {
        description: 'Persona response time in seconds',
        valueType: ValueType.DOUBLE,
      }
    );

    this.activePersonas = this.meter.createUpDownCounter(
      `${this.prefix}_active_personas`,
      {
        description: 'Number of currently active personas',
        valueType: ValueType.INT,
      }
    );

    // Initialize team metrics
    this.teamMerges = this.meter.createCounter(
      `${this.prefix}_team_merges_total`,
      {
        description: 'Total number of team response merges',
        valueType: ValueType.INT,
      }
    );

    this.teamResponseDuration = this.meter.createHistogram(
      `${this.prefix}_team_response_duration_seconds`,
      {
        description: 'Team response time in seconds',
        valueType: ValueType.DOUBLE,
      }
    );

    this.activeTeams = this.meter.createUpDownCounter(
      `${this.prefix}_active_teams`,
      {
        description: 'Number of currently active teams',
        valueType: ValueType.INT,
      }
    );

    // Initialize workflow metrics
    this.workflowExecutions = this.meter.createCounter(
      `${this.prefix}_workflow_executions_total`,
      {
        description: 'Total number of workflow executions',
        valueType: ValueType.INT,
      }
    );

    this.workflowDuration = this.meter.createHistogram(
      `${this.prefix}_workflow_duration_seconds`,
      {
        description: 'Workflow execution time in seconds',
        valueType: ValueType.DOUBLE,
      }
    );

    this.workflowSteps = this.meter.createCounter(
      `${this.prefix}_workflow_steps_total`,
      {
        description: 'Total number of workflow steps executed',
        valueType: ValueType.INT,
      }
    );

    this.activeWorkflows = this.meter.createUpDownCounter(
      `${this.prefix}_active_workflows`,
      {
        description: 'Number of currently active workflows',
        valueType: ValueType.INT,
      }
    );

    // Initialize provider metrics
    this.providerRequests = this.meter.createCounter(
      `${this.prefix}_provider_requests_total`,
      {
        description: 'Total number of provider API requests',
        valueType: ValueType.INT,
      }
    );

    this.providerErrors = this.meter.createCounter(
      `${this.prefix}_provider_errors_total`,
      {
        description: 'Total number of provider errors',
        valueType: ValueType.INT,
      }
    );

    this.providerLatency = this.meter.createHistogram(
      `${this.prefix}_provider_latency_seconds`,
      {
        description: 'Provider API latency in seconds',
        valueType: ValueType.DOUBLE,
      }
    );

    this.providerTokens = this.meter.createCounter(
      `${this.prefix}_provider_tokens_total`,
      {
        description: 'Total tokens used by provider',
        valueType: ValueType.INT,
      }
    );

    this.providerCost = this.meter.createCounter(
      `${this.prefix}_provider_cost_usd`,
      {
        description: 'Total cost in USD for provider usage',
        valueType: ValueType.DOUBLE,
      }
    );

    // Initialize scheduler metrics
    this.schedulerQueued = this.meter.createUpDownCounter(
      `${this.prefix}_scheduler_queued`,
      {
        description: 'Number of tasks in scheduler queue',
        valueType: ValueType.INT,
      }
    );

    this.schedulerRunning = this.meter.createUpDownCounter(
      `${this.prefix}_scheduler_running`,
      {
        description: 'Number of tasks currently running',
        valueType: ValueType.INT,
      }
    );

    this.schedulerCompleted = this.meter.createCounter(
      `${this.prefix}_scheduler_completed_total`,
      {
        description: 'Total number of completed tasks',
        valueType: ValueType.INT,
      }
    );

    this.schedulerFailed = this.meter.createCounter(
      `${this.prefix}_scheduler_failed_total`,
      {
        description: 'Total number of failed tasks',
        valueType: ValueType.INT,
      }
    );

    this.schedulerWaitTime = this.meter.createHistogram(
      `${this.prefix}_scheduler_wait_time_seconds`,
      {
        description: 'Task wait time in queue (seconds)',
        valueType: ValueType.DOUBLE,
      }
    );

    this.schedulerExecutionTime = this.meter.createHistogram(
      `${this.prefix}_scheduler_execution_time_seconds`,
      {
        description: 'Task execution time (seconds)',
        valueType: ValueType.DOUBLE,
      }
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              PERSONA METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  recordPersonaActivation(personaId: string): void {
    this.personaActivations.add(1, { persona_id: personaId });
    this.activePersonas.add(1, { persona_id: personaId });
  }

  recordPersonaDeactivation(personaId: string): void {
    this.activePersonas.add(-1, { persona_id: personaId });
  }

  recordPersonaMessage(
    personaId: string,
    durationMs: number,
    tokens?: number
  ): void {
    this.personaMessages.add(1, { persona_id: personaId });
    this.personaResponseDuration.record(durationMs / 1000, {
      persona_id: personaId,
    });

    if (tokens !== undefined) {
      this.personaTokens.add(tokens, { persona_id: personaId });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              TEAM METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  recordTeamActivation(teamId: string): void {
    this.activeTeams.add(1, { team_id: teamId });
  }

  recordTeamDeactivation(teamId: string): void {
    this.activeTeams.add(-1, { team_id: teamId });
  }

  recordTeamMerge(teamId: string, mergeMode: string, durationMs: number): void {
    this.teamMerges.add(1, { team_id: teamId, merge_mode: mergeMode });
    this.teamResponseDuration.record(durationMs / 1000, {
      team_id: teamId,
      merge_mode: mergeMode,
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              WORKFLOW METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  recordWorkflowStart(workflowName: string): void {
    this.activeWorkflows.add(1, { workflow_name: workflowName });
  }

  recordWorkflowEnd(
    workflowName: string,
    durationMs: number,
    status: 'success' | 'failure'
  ): void {
    this.activeWorkflows.add(-1, { workflow_name: workflowName });
    this.workflowExecutions.add(1, { workflow_name: workflowName, status });
    this.workflowDuration.record(durationMs / 1000, {
      workflow_name: workflowName,
      status,
    });
  }

  recordWorkflowStep(workflowName: string, stepName: string): void {
    this.workflowSteps.add(1, {
      workflow_name: workflowName,
      step_name: stepName,
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              PROVIDER METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  recordProviderRequest(
    provider: string,
    model: string,
    latencyMs: number
  ): void {
    this.providerRequests.add(1, { provider, model });
    this.providerLatency.record(latencyMs / 1000, { provider, model });
  }

  recordProviderError(provider: string, errorType: string): void {
    this.providerErrors.add(1, { provider, error_type: errorType });
  }

  recordProviderTokens(
    provider: string,
    model: string,
    tokens: number,
    type: 'input' | 'output'
  ): void {
    this.providerTokens.add(tokens, { provider, model, type });
  }

  recordProviderCost(provider: string, model: string, costUsd: number): void {
    this.providerCost.add(costUsd, { provider, model });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  //                              SCHEDULER METRICS
  // ═════════════════════════════════════════════════════════════════════════════

  recordTaskQueued(priority: string): void {
    this.schedulerQueued.add(1, { priority });
  }

  recordTaskDequeued(priority: string): void {
    this.schedulerQueued.add(-1, { priority });
  }

  recordTaskStarted(priority: string): void {
    this.schedulerRunning.add(1, { priority });
  }

  recordTaskCompleted(
    priority: string,
    waitTimeMs: number,
    executionTimeMs: number
  ): void {
    this.schedulerRunning.add(-1, { priority });
    this.schedulerCompleted.add(1, { priority });
    this.schedulerWaitTime.record(waitTimeMs / 1000, { priority });
    this.schedulerExecutionTime.record(executionTimeMs / 1000, { priority });
  }

  recordTaskFailed(priority: string, waitTimeMs: number): void {
    this.schedulerRunning.add(-1, { priority });
    this.schedulerFailed.add(1, { priority });
    this.schedulerWaitTime.record(waitTimeMs / 1000, { priority });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DEFAULT COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

let defaultCollector: MetricsCollector | null = null;

/**
 * Get the default metrics collector instance
 */
export function getMetricsCollector(): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector();
  }
  return defaultCollector;
}

/**
 * Set the default metrics collector instance
 */
export function setMetricsCollector(collector: MetricsCollector): void {
  defaultCollector = collector;
}

/**
 * Create a new metrics collector
 */
export function createMetricsCollector(
  options?: MetricsCollectorOptions
): MetricsCollector {
  return new MetricsCollector(options);
}
