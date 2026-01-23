/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Health Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enhanced health check endpoints
 *
 * @packageDocumentation
 * @module @pcl/http/routes/health
 * @version 1.0.0
 */

import { Request, Response, Router } from 'express';
import { getHealthAggregator } from '../../observability/health.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create enhanced health routes
 */
export function createHealthRoute(): Router {
  const router = Router();
  const aggregator = getHealthAggregator();

  /**
   * GET /health/liveness
   * Liveness probe - is the service alive?
   *
   * Returns 200 if at least some components are functional
   */
  router.get('/liveness', async (req: Request, res: Response) => {
    try {
      const isAlive = await aggregator.isAlive();

      if (isAlive) {
        res.status(200).json({
          success: true,
          data: {
            status: 'alive',
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        res.status(503).json({
          success: false,
          error: {
            message: 'Service is not alive',
            code: 'SERVICE_UNHEALTHY',
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HEALTH_CHECK_ERROR',
        },
      });
    }
  });

  /**
   * GET /health/readiness
   * Readiness probe - is the service ready to accept traffic?
   *
   * Returns 200 only if all components are healthy
   */
  router.get('/readiness', async (req: Request, res: Response) => {
    try {
      const isReady = await aggregator.isReady();

      if (isReady) {
        res.status(200).json({
          success: true,
          data: {
            status: 'ready',
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        res.status(503).json({
          success: false,
          error: {
            message: 'Service is not ready',
            code: 'SERVICE_NOT_READY',
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HEALTH_CHECK_ERROR',
        },
      });
    }
  });

  /**
   * GET /health/status
   * Detailed health status of all components
   *
   * Returns comprehensive health information
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const health = await aggregator.checkAll();

      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
            ? 200
            : 503;

      res.status(statusCode).json({
        success: health.status !== 'unhealthy',
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HEALTH_CHECK_ERROR',
        },
      });
    }
  });

  /**
   * GET /health/components/:component
   * Check health of a specific component
   */
  router.get(
    '/components/:component',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { component } = req.params;
        const comp = Array.isArray(component) ? component[0] : component;
        const componentHealth = await aggregator.checkComponent(comp);

        if (!componentHealth) {
          res.status(404).json({
            success: false,
            error: {
              message: `Component '${component}' not found`,
              code: 'COMPONENT_NOT_FOUND',
            },
          });
          return;
        }

        const statusCode =
          componentHealth.status === 'healthy'
            ? 200
            : componentHealth.status === 'degraded'
              ? 200
              : 503;

        res.status(statusCode).json({
          success: componentHealth.status !== 'unhealthy',
          data: {
            component,
            ...componentHealth,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'HEALTH_CHECK_ERROR',
          },
        });
      }
    }
  );

  /**
   * GET /health/components
   * List all registered components
   */
  router.get('/components', (req: Request, res: Response) => {
    try {
      const components = aggregator.getComponents();

      res.status(200).json({
        success: true,
        data: {
          components,
          count: components.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HEALTH_CHECK_ERROR',
        },
      });
    }
  });

  return router;
}
