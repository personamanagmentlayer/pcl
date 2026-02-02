/**
 * API Routes aggregator
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { authRoutes } from './auth.js';
import { artifactRoutes } from './artifacts.js';
import { searchRoutes } from './search.js';
import { createMetricsRoute } from './metrics.js';
import { createHealthRoute } from './health.js';
import { createProfilerRoute } from './profiler.js';
import { createCostsRoute } from './costs.js';
import { createSLORoute } from './slo.js';

export const routes = Router();

// Mount authentication routes
routes.use('/auth', authRoutes);

// Mount artifact routes
routes.use('/artifacts', artifactRoutes);

// Mount search routes
routes.use('/search', searchRoutes);

// Mount observability routes
routes.use('/metrics', createMetricsRoute());
routes.use('/health', createHealthRoute());
routes.use('/profiler', createProfilerRoute());
routes.use('/costs', createCostsRoute());
routes.use('/slo', createSLORoute());

// API root route
routes.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'PCL HTTP Registry API v1',
      endpoints: {
        health: '/health',
        version: '/version',
        auth: '/api/v1/auth',
        artifacts: '/api/v1/artifacts',
        search: '/api/v1/search',
        metrics: '/api/v1/metrics',
        healthStatus: '/api/v1/health',
        profiler: '/api/v1/profiler',
        costs: '/api/v1/costs',
        slo: '/api/v1/slo',
      },
      documentation: '/docs',
    },
  });
});

// More routes will be added here
