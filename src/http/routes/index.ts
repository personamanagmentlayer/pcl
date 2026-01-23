/**
 * API Routes aggregator
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { authRoutes } from './auth.js';
import { artifactRoutes } from './artifacts.js';
import { searchRoutes } from './search.js';

export const routes = Router();

// Mount authentication routes
routes.use('/auth', authRoutes);

// Mount artifact routes
routes.use('/artifacts', artifactRoutes);

// Mount search routes
routes.use('/search', searchRoutes);

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
      },
      documentation: '/docs',
    },
  });
});

// More routes will be added here
