/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Cost Tracking Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Cost tracking and reporting endpoints
 *
 * @packageDocumentation
 * @module @pcl/http/routes/costs
 * @version 1.0.0
 */

import { Request, Response, Router } from 'express';
import type { CostTrackerRegistry } from '../../runtime/providers/cost-tracker.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create cost tracking routes
 */
export function createCostsRoute(costRegistry?: CostTrackerRegistry): Router {
  const router = Router();

  // Middleware to check if cost registry is available
  const checkRegistry = (
    req: Request,
    res: Response,
    next: () => void
  ): void => {
    if (!costRegistry) {
      res.status(503).json({
        success: false,
        error: {
          message: 'Cost tracking not initialized',
          code: 'COST_TRACKING_DISABLED',
        },
      });
      return;
    }
    next();
  };

  /**
   * GET /costs
   * Get overall cost summary
   */
  router.get('/', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      const stats = costRegistry.getStats();

      res.status(200).json({
        success: true,
        data: {
          summary: stats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  /**
   * GET /costs/providers
   * Get costs grouped by provider
   */
  router.get('/providers', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      const stats = costRegistry.getStats();

      res.status(200).json({
        success: true,
        data: {
          providers: stats.byProvider,
          total: stats.global.totalCost,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  /**
   * GET /costs/models
   * Get costs grouped by model
   */
  router.get('/models', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      const stats = costRegistry.getStats();

      res.status(200).json({
        success: true,
        data: {
          models: stats.global.byModel,
          total: stats.global.totalCost,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  /**
   * GET /costs/export
   * Export cost data in JSON or CSV format
   */
  router.get('/export', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      const format = (req.query.format as string) || 'json';

      if (format === 'csv') {
        const csv = costRegistry.exportCSV();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="cost-report-${Date.now()}.csv"`
        );
        res.send(csv);
      } else if (format === 'json') {
        const json = costRegistry.exportJSON();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="cost-report-${Date.now()}.json"`
        );
        res.send(json);
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: `Invalid format: ${format}. Supported formats: json, csv`,
            code: 'INVALID_FORMAT',
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  /**
   * POST /costs/reset
   * Reset cost tracking
   */
  router.post('/reset', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      costRegistry.reset();

      res.status(200).json({
        success: true,
        data: {
          message: 'Cost tracking reset',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  /**
   * GET /costs/providers/:provider
   * Get cost for a specific provider
   */
  router.get(
    '/providers/:provider',
    checkRegistry,
    (req: Request, res: Response) => {
      try {
        if (!costRegistry) {
          throw new Error('Cost registry not available');
        }

        const { provider } = req.params;
        const providerName = Array.isArray(provider) ? provider[0] : provider;
        const cost = costRegistry.getProviderCost(providerName);
        res.status(200).json({
          success: true,
          data: {
            provider,
            cost,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'COST_TRACKING_ERROR',
          },
        });
      }
    }
  );

  /**
   * GET /costs/models/:model
   * Get cost for a specific model
   */
  router.get('/models/:model', checkRegistry, (req: Request, res: Response) => {
    try {
      if (!costRegistry) {
        throw new Error('Cost registry not available');
      }

      const { model } = req.params;
      const modelName = Array.isArray(model) ? model[0] : model;
      const cost = costRegistry.getModelCost(modelName);

      res.status(200).json({
        success: true,
        data: {
          model,
          cost,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COST_TRACKING_ERROR',
        },
      });
    }
  });

  return router;
}
