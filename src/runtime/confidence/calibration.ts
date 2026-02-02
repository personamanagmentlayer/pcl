/**
 * Confidence calibration for improving accuracy over time
 * Part of Q2 2025 Adaptive Intelligence - Phase 2
 */

import type { CalibrationPoint, ExecutionContext } from './types.js';

/**
 * Calibrates confidence scores based on actual outcomes
 */
export class ConfidenceCalibrator {
  private calibrationData: Map<string, CalibrationPoint[]>;
  private readonly maxPointsPerPersona: number = 1000;

  constructor() {
    this.calibrationData = new Map();
  }

  /**
   * Calibrate a raw confidence score based on historical accuracy
   */
  calibrate(rawConfidence: number, context: ExecutionContext): number {
    const history = this.calibrationData.get(context.personaId) || [];

    if (history.length === 0) {
      return rawConfidence; // No calibration data yet
    }

    // Find similar confidence ranges and check actual outcomes
    const similarPoints = history.filter(
      (p) => Math.abs(p.predicted - rawConfidence) < 0.1
    );

    if (similarPoints.length < 5) {
      return rawConfidence; // Not enough data for reliable calibration
    }

    // Compute average actual vs predicted
    const avgActual =
      similarPoints.reduce((sum, p) => sum + p.actual, 0) /
      similarPoints.length;
    const avgPredicted =
      similarPoints.reduce((sum, p) => sum + p.predicted, 0) /
      similarPoints.length;

    // Apply calibration correction (conservative: 50% of difference)
    const correction = (avgActual - avgPredicted) * 0.5;
    const calibrated = rawConfidence + correction;

    return Math.max(0, Math.min(1, calibrated));
  }

  /**
   * Record actual outcome for calibration
   */
  recordOutcome(personaId: string, predicted: number, actual: number): void {
    if (!this.calibrationData.has(personaId)) {
      this.calibrationData.set(personaId, []);
    }

    const points = this.calibrationData.get(personaId)!;
    points.push({
      predicted,
      actual,
      timestamp: Date.now(),
    });

    // Keep only recent points
    if (points.length > this.maxPointsPerPersona) {
      this.calibrationData.set(
        personaId,
        points.slice(-this.maxPointsPerPersona)
      );
    }
  }

  /**
   * Get calibration statistics for a persona
   */
  getCalibrationStats(personaId: string): {
    dataPoints: number;
    avgError: number;
    calibrationQuality: number;
  } {
    const history = this.calibrationData.get(personaId) || [];

    if (history.length === 0) {
      return {
        dataPoints: 0,
        avgError: 0,
        calibrationQuality: 0,
      };
    }

    // Compute average error
    const errors = history.map((p) => Math.abs(p.predicted - p.actual));
    const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;

    // Calibration quality: inverse of error (0 = perfect, 1 = random)
    const calibrationQuality = Math.max(0, 1 - avgError * 2);

    return {
      dataPoints: history.length,
      avgError,
      calibrationQuality,
    };
  }

  /**
   * Clear calibration data for a persona
   */
  clear(personaId?: string): void {
    if (personaId) {
      this.calibrationData.delete(personaId);
    } else {
      this.calibrationData.clear();
    }
  }

  /**
   * Export calibration data
   */
  export(): Map<string, CalibrationPoint[]> {
    return new Map(this.calibrationData);
  }

  /**
   * Import calibration data
   */
  import(data: Map<string, CalibrationPoint[]>): void {
    this.calibrationData = new Map(data);
  }
}
