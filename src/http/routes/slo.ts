/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * SLO Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SLO and error budget monitoring endpoints
 *
 * @packageDocumentation
 * @module @pcl/http/routes/slo
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import {
  getSLORegistry,
  CommonSLOs,
  type SLOConfig,
} from '../../observability/slo.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create SLO monitoring routes
 */
export function createSLORoute(): Router {
  const router = Router();
  const registry = getSLORegistry();

  /**
   * GET /slo
   * Get all SLO statuses
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const statuses = registry.getAllStatuses();

      res.status(200).json({
        success: true,
        data: {
          slos: statuses,
          overallHealthy: registry.isHealthy(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  /**
   * GET /slo/:name
   * Get specific SLO status
   */
  router.get('/:name', (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const tracker = registry.get(name);

      if (!tracker) {
        return res.status(404).json({
          success: false,
          error: {
            message: `SLO '${name}' not found`,
            code: 'SLO_NOT_FOUND',
          },
        });
      }

      const status = tracker.getStatus();

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  /**
   * POST /slo
   * Register a new SLO
   */
  router.post('/', (req: Request, res: Response) => {
    try {
      const config = req.body as SLOConfig;

      // Validate config
      if (!config.name || !config.target || !config.windowSeconds) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: name, target, windowSeconds',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      if (config.target < 0 || config.target > 1) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Target must be between 0 and 1',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const tracker = registry.register(config);
      const status = tracker.getStatus();

      res.status(201).json({
        success: true,
        data: {
          message: 'SLO registered successfully',
          slo: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /slo/:name
   * Unregister an SLO
   */
  router.delete('/:name', (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const deleted = registry.unregister(name);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            message: `SLO '${name}' not found`,
            code: 'SLO_NOT_FOUND',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'SLO unregistered successfully',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  /**
   * POST /slo/:name/record
   * Record a request result for an SLO
   */
  router.post('/:name/record', (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { success } = req.body;

      if (typeof success !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing or invalid "success" field (must be boolean)',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const tracker = registry.get(name);

      if (!tracker) {
        return res.status(404).json({
          success: false,
          error: {
            message: `SLO '${name}' not found`,
            code: 'SLO_NOT_FOUND',
          },
        });
      }

      tracker.record(success);
      const status = tracker.getStatus();

      res.status(200).json({
        success: true,
        data: {
          message: 'Request recorded',
          slo: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  /**
   * GET /slo/presets/common
   * Get common SLO presets
   */
  router.get('/presets/common', (req: Request, res: Response) => {
    try {
      res.status(200).json({
        success: true,
        data: {
          presets: CommonSLOs,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SLO_ERROR',
        },
      });
    }
  });

  return router;
}
