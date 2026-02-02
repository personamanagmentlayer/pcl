/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Profiler Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performance profiling endpoints
 *
 * @packageDocumentation
 * @module @pcl/http/routes/profiler
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import {
  getProfiler,
  formatBytes,
  formatDuration,
} from '../../observability/profiler.js';

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATE
// ═══════════════════════════════════════════════════════════════════════════════

let isProfilerRunning = false;

// ═══════════════════════════════════════════════════════════════════════════════
//                              ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create profiler routes
 */
export function createProfilerRoute(): Router {
  const router = Router();
  const profiler = getProfiler();

  /**
   * POST /profiler/start
   * Start CPU profiling
   */
  router.post('/start', (req: Request, res: Response): void => {
    try {
      if (isProfilerRunning) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Profiler already running',
            code: 'PROFILER_ALREADY_RUNNING',
          },
        });
        return;
      }

      profiler.startCPUProfiling();
      isProfilerRunning = true;

      res.status(200).json({
        success: true,
        data: {
          message: 'CPU profiling started',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  /**
   * POST /profiler/stop
   * Stop CPU profiling and get profile data
   */
  router.post('/stop', (req: Request, res: Response): void => {
    try {
      if (!isProfilerRunning) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Profiler not running',
            code: 'PROFILER_NOT_RUNNING',
          },
        });
        return;
      }

      const profileData = profiler.stopCPUProfiling();
      isProfilerRunning = false;

      res.status(200).json({
        success: true,
        data: {
          ...profileData,
          durationFormatted: formatDuration(profileData.duration * 1000),
        },
      });
    } catch (error) {
      isProfilerRunning = false;
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  /**
   * GET /profiler/memory
   * Get current memory snapshot
   */
  router.get('/memory', (req: Request, res: Response) => {
    try {
      const snapshot = profiler.getMemorySnapshot();

      res.status(200).json({
        success: true,
        data: {
          ...snapshot,
          formatted: {
            heapUsed: formatBytes(snapshot.heapUsed),
            heapTotal: formatBytes(snapshot.heapTotal),
            external: formatBytes(snapshot.external),
            arrayBuffers: formatBytes(snapshot.arrayBuffers),
            rss: formatBytes(snapshot.rss),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  /**
   * GET /profiler/stats
   * Get comprehensive runtime statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await profiler.getRuntimeStats();

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          formatted: {
            heapUsed: formatBytes(stats.heapUsed),
            heapTotal: formatBytes(stats.heapTotal),
            external: formatBytes(stats.external),
            rss: formatBytes(stats.rss),
            eventLoopLag: `${stats.eventLoopLag} ms`,
            uptime: `${Math.round(stats.uptime)} seconds`,
            cpuUsage: {
              user: formatDuration(stats.cpuUsage.user),
              system: formatDuration(stats.cpuUsage.system),
            },
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  /**
   * GET /profiler/marks
   * Get all performance marks
   */
  router.get('/marks', (req: Request, res: Response) => {
    try {
      const marks = profiler.getMarks();

      res.status(200).json({
        success: true,
        data: {
          marks,
          count: marks.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /profiler/marks
   * Clear all performance marks
   */
  router.delete('/marks', (req: Request, res: Response) => {
    try {
      profiler.clearMarks();

      res.status(200).json({
        success: true,
        data: {
          message: 'Performance marks cleared',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROFILER_ERROR',
        },
      });
    }
  });

  return router;
}
