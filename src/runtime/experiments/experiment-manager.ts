/**
 * Experiment management for A/B testing
 * Part of Q2 2025 Adaptive Intelligence - Phase 7
 */

import { VariantSelector } from './variant-selector.js';
import { ResultsAnalyzer } from './results-analyzer.js';
import type {
  Experiment,
  Variant,
  Assignment,
  ExperimentResult,
  ExperimentAnalysis,
  ExperimentConfig,
} from './types.js';

/**
 * Manages experiments, variant assignments, and results
 */
export class ExperimentManager {
  private readonly experiments: Map<string, Experiment> = new Map();
  private readonly assignments: Map<string, Assignment> = new Map();
  private readonly results: Map<string, Map<string, ExperimentResult>> =
    new Map();
  private readonly variantSelector: VariantSelector;
  private readonly resultsAnalyzer: ResultsAnalyzer;
  private readonly config: ExperimentConfig;

  constructor(config: ExperimentConfig) {
    this.config = config;
    this.variantSelector = new VariantSelector();
    this.resultsAnalyzer = new ResultsAnalyzer(config);
  }

  /**
   * Create a new experiment
   */
  createExperiment(experiment: Experiment): void {
    // Validate experiment
    if (!experiment.id || !experiment.name) {
      throw new Error('Experiment must have id and name');
    }

    if (experiment.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    if (experiment.metrics.length === 0) {
      throw new Error('Experiment must track at least one metric');
    }

    // Validate allocation
    this.variantSelector.validateAllocation(experiment.allocation);

    // Store experiment
    this.experiments.set(experiment.id, experiment);

    // Initialize results map for this experiment
    this.results.set(experiment.id, new Map());

    // Initialize results for each variant
    for (const variant of experiment.variants) {
      this.results.get(experiment.id)!.set(variant.id, {
        experimentId: experiment.id,
        variantId: variant.id,
        sampleSize: 0,
        metrics: {},
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * List all experiments
   */
  listExperiments(status?: Experiment['status']): Experiment[] {
    const experiments = Array.from(this.experiments.values());

    if (status) {
      return experiments.filter((exp) => exp.status === status);
    }

    return experiments;
  }

  /**
   * Update experiment status
   */
  updateStatus(experimentId: string, status: Experiment['status']): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = status;

    if (status === 'running' && !experiment.startTime) {
      experiment.startTime = Date.now();
    }

    if (status === 'completed' && !experiment.endTime) {
      experiment.endTime = Date.now();
    }
  }

  /**
   * Assign a variant to a user/session
   */
  assignVariant(
    experimentId: string,
    sessionId: string,
    userId?: string
  ): Variant {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      throw new Error(
        `Cannot assign variant: experiment is ${experiment.status}`
      );
    }

    // Check if already assigned
    const assignmentKey = `${experimentId}:${userId || sessionId}`;
    const existing = this.assignments.get(assignmentKey);

    if (existing) {
      // Return existing assignment (ensures consistency)
      const variant = experiment.variants.find(
        (v) => v.id === existing.variantId
      );
      if (!variant) {
        throw new Error(`Variant ${existing.variantId} not found`);
      }
      return variant;
    }

    // Assign new variant
    const variant = this.variantSelector.assignVariant(
      experiment,
      sessionId,
      userId
    );

    // Store assignment
    this.assignments.set(assignmentKey, {
      experimentId,
      variantId: variant.id,
      sessionId,
      userId,
      timestamp: Date.now(),
    });

    return variant;
  }

  /**
   * Get variant assignment for a user/session
   */
  getAssignment(
    experimentId: string,
    sessionId: string,
    userId?: string
  ): Assignment | undefined {
    const assignmentKey = `${experimentId}:${userId || sessionId}`;
    return this.assignments.get(assignmentKey);
  }

  /**
   * Record a metric value for a variant
   */
  recordMetric(
    experimentId: string,
    sessionId: string,
    metric: string,
    value: number,
    userId?: string
  ): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Get assignment
    const assignment = this.getAssignment(experimentId, sessionId, userId);
    if (!assignment) {
      throw new Error(
        `No variant assignment found for session ${sessionId} in experiment ${experimentId}`
      );
    }

    // Get variant results
    const variantResults = this.results
      .get(experimentId)
      ?.get(assignment.variantId);
    if (!variantResults) {
      throw new Error(
        `Results not found for variant ${assignment.variantId} in experiment ${experimentId}`
      );
    }

    // Update running average
    const currentAvg = variantResults.metrics[metric] || 0;
    const currentCount = variantResults.sampleSize;

    // Running average formula: newAvg = (oldAvg * oldCount + newValue) / (oldCount + 1)
    const newAvg = (currentAvg * currentCount + value) / (currentCount + 1);

    variantResults.metrics[metric] = newAvg;
    variantResults.sampleSize += 1;
    variantResults.lastUpdated = Date.now();
  }

  /**
   * Get results for an experiment
   */
  getResults(experimentId: string): ExperimentResult[] {
    const variantResults = this.results.get(experimentId);
    if (!variantResults) {
      return [];
    }

    return Array.from(variantResults.values());
  }

  /**
   * Analyze experiment results
   */
  analyzeExperiment(experimentId: string): ExperimentAnalysis {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const results = this.getResults(experimentId);

    return this.resultsAnalyzer.analyzeExperiment(experiment, results);
  }

  /**
   * Get experiment statistics
   */
  getStats(experimentId: string): {
    totalAssignments: number;
    variantDistribution: Record<string, number>;
    metricsRecorded: Record<string, number>;
  } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const results = this.getResults(experimentId);

    // Count assignments per variant
    const variantDistribution: Record<string, number> = {};
    for (const result of results) {
      variantDistribution[result.variantId] = result.sampleSize;
    }

    // Count total assignments
    const totalAssignments = Object.values(variantDistribution).reduce(
      (sum, count) => sum + count,
      0
    );

    // Count metrics recorded
    const metricsRecorded: Record<string, number> = {};
    for (const metric of experiment.metrics) {
      metricsRecorded[metric] = results.reduce(
        (sum, r) => sum + (r.metrics[metric] !== undefined ? r.sampleSize : 0),
        0
      );
    }

    return {
      totalAssignments,
      variantDistribution,
      metricsRecorded,
    };
  }

  /**
   * Delete an experiment (only if draft or completed)
   */
  deleteExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status === 'running') {
      throw new Error('Cannot delete running experiment');
    }

    // Delete experiment
    this.experiments.delete(experimentId);

    // Delete results
    this.results.delete(experimentId);

    // Delete assignments
    const keysToDelete: string[] = [];
    for (const [key, assignment] of this.assignments) {
      if (assignment.experimentId === experimentId) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.assignments.delete(key);
    }
  }

  /**
   * Export experiment data for persistence
   */
  export(): {
    experiments: Experiment[];
    assignments: Assignment[];
    results: Record<string, ExperimentResult[]>;
  } {
    return {
      experiments: Array.from(this.experiments.values()),
      assignments: Array.from(this.assignments.values()),
      results: Object.fromEntries(
        Array.from(this.results.entries()).map(([id, variantResults]) => [
          id,
          Array.from(variantResults.values()),
        ])
      ),
    };
  }

  /**
   * Import experiment data from persistence
   */
  import(data: {
    experiments: Experiment[];
    assignments: Assignment[];
    results: Record<string, ExperimentResult[]>;
  }): void {
    // Import experiments
    for (const experiment of data.experiments) {
      this.experiments.set(experiment.id, experiment);
    }

    // Import assignments
    for (const assignment of data.assignments) {
      const key = `${assignment.experimentId}:${assignment.userId || assignment.sessionId}`;
      this.assignments.set(key, assignment);
    }

    // Import results
    for (const [experimentId, results] of Object.entries(data.results)) {
      const variantResults = new Map<string, ExperimentResult>();
      for (const result of results) {
        variantResults.set(result.variantId, result);
      }
      this.results.set(experimentId, variantResults);
    }
  }

  /**
   * Clear all experiment data
   */
  clear(): void {
    this.experiments.clear();
    this.assignments.clear();
    this.results.clear();
  }
}
