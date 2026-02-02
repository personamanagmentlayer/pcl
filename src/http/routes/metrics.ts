/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Metrics Route
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Prometheus metrics endpoint
 *
 * @packageDocumentation
 * @module @pcl/http/routes/metrics
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { getPrometheusExporter } from '../../observability/telemetry.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create metrics route for Prometheus scraping
 */
export function createMetricsRoute(): Router {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus metrics endpoint
   *
   * Returns metrics in Prometheus text format
   */
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const exporter = getPrometheusExporter();

      if (!exporter) {
        res.status(503).json({
          success: false,
          error: {
            message:
              'Metrics exporter not initialized. Enable telemetry with metrics support.',
            code: 'METRICS_NOT_ENABLED',
          },
        });
        return;
      }

      // The PrometheusExporter serves metrics directly via its own server
      // This endpoint is for integration with the main HTTP server
      res.status(200).json({
        success: true,
        data: {
          message: 'Metrics are served by the Prometheus exporter',
          exporterUrl: `http://localhost:${exporter['_port'] || 9464}/metrics`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'METRICS_ERROR',
        },
      });
    }
  });

  return router;
}
