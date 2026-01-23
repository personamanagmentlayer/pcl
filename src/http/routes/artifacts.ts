/**
 * Artifact routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  create,
  getById,
  update,
  deleteById,
  list,
  star,
  unstar,
  download,
} from '../controllers/artifact.controller.js';
import { versionRoutes } from './versions.js';
import { createLimiter, downloadLimiter } from '../middleware/rate-limit.js';

export const artifactRoutes = Router();

// Mount version routes under /:artifactId/versions
artifactRoutes.use('/:artifactId/versions', versionRoutes);

/**
 * GET /artifacts
 * List/search artifacts
 *
 * Query parameters:
 * - type: persona | skill | workflow | team
 * - tags: comma-separated tags
 * - author: username
 * - search: search query
 * - published: true | false
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - sort: createdAt:desc | downloads:desc | stars:desc | etc.
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "artifacts": [...],
 *     "pagination": {
 *       "total": 100,
 *       "offset": 0,
 *       "limit": 20,
 *       "hasMore": true
 *     }
 *   }
 * }
 */
artifactRoutes.get('/', list);

/**
 * POST /artifacts
 * Create a new artifact (requires authentication)
 *
 * Rate limit: 10 creates per hour
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "type": "persona",
 *   "metadata": {
 *     "name": "Python Expert",
 *     "description": "Expert Python developer persona",
 *     "version": "1.0.0",
 *     "tags": ["python", "coding"],
 *     "license": "MIT"
 *   },
 *   "source": "persona PythonExpert { ... }",
 *   "published": false
 * }
 *
 * Response: 201
 * {
 *   "success": true,
 *   "data": {
 *     "id": "artifact_...",
 *     "type": "persona",
 *     "metadata": { ... },
 *     "source": "...",
 *     "stats": { "downloads": 0, "stars": 0, "views": 0 },
 *     "published": false,
 *     "authorId": "user_...",
 *     "authorUsername": "johndoe",
 *     "createdAt": "2026-01-23T...",
 *     "updatedAt": "2026-01-23T..."
 *   }
 * }
 */
artifactRoutes.post('/', authenticate, createLimiter, create);

/**
 * GET /artifacts/:id
 * Get artifact by ID
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 */
artifactRoutes.get('/:id', getById);

/**
 * PUT /artifacts/:id
 * Update artifact (requires authentication and ownership)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "metadata": {
 *     "description": "Updated description"
 *   },
 *   "published": true
 * }
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 */
artifactRoutes.put('/:id', authenticate, update);

/**
 * DELETE /artifacts/:id
 * Delete artifact (requires authentication and ownership)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Artifact deleted successfully"
 *   }
 * }
 */
artifactRoutes.delete('/:id', authenticate, deleteById);

/**
 * POST /artifacts/:id/star
 * Star an artifact (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "starred": true,
 *     "totalStars": 42
 *   }
 * }
 */
artifactRoutes.post('/:id/star', authenticate, star);

/**
 * DELETE /artifacts/:id/star
 * Unstar an artifact (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "starred": false,
 *     "totalStars": 41
 *   }
 * }
 */
artifactRoutes.delete('/:id/star', authenticate, unstar);

/**
 * POST /artifacts/:id/download
 * Track download for an artifact
 *
 * Rate limit: 50 downloads per hour
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Download tracked"
 *   }
 * }
 */
artifactRoutes.post('/:id/download', downloadLimiter, download);
