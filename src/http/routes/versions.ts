/**
 * Version routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  create,
  getByVersion,
  list,
  update,
  deleteById,
  download,
  latest,
} from '../controllers/version.controller.js';
import { createLimiter, downloadLimiter } from '../middleware/rate-limit.js';

export const versionRoutes = Router({ mergeParams: true }); // mergeParams to access :artifactId from parent router

/**
 * GET /artifacts/:artifactId/versions
 * List all versions of an artifact
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "versions": [
 *       {
 *         "id": "version_...",
 *         "artifactId": "artifact_...",
 *         "version": "1.2.0",
 *         "source": "...",
 *         "metadata": {
 *           "changelog": "Added new features",
 *           "breaking": false,
 *           "deprecated": false
 *         },
 *         "published": true,
 *         "downloads": 42,
 *         "createdAt": "2026-01-23T...",
 *         "updatedAt": "2026-01-23T..."
 *       }
 *     ],
 *     "total": 5
 *   }
 * }
 */
versionRoutes.get('/', list);

/**
 * POST /artifacts/:artifactId/versions
 * Create a new version (requires authentication)
 *
 * Rate limit: 10 creates per hour
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "version": "1.2.0",
 *   "source": "persona PythonExpert { ... }",
 *   "metadata": {
 *     "changelog": "Added async support",
 *     "breaking": false
 *   },
 *   "published": false
 * }
 *
 * Response: 201
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 */
versionRoutes.post('/', authenticate, createLimiter, create);

/**
 * GET /artifacts/:artifactId/versions/latest
 * Get the latest version
 *
 * Query parameters:
 * - published: true | false (default: true)
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 */
versionRoutes.get('/latest', latest);

/**
 * GET /artifacts/:artifactId/versions/:version
 * Get a specific version (by semver or "latest")
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 */
versionRoutes.get('/:version', getByVersion);

/**
 * PUT /artifacts/:artifactId/versions/:versionId
 * Update a version (requires authentication and ownership)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "source": "updated source...",
 *   "metadata": {
 *     "changelog": "Bug fixes"
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
versionRoutes.put('/:versionId', authenticate, update);

/**
 * DELETE /artifacts/:artifactId/versions/:versionId
 * Delete a version (requires authentication and ownership)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Version deleted successfully"
 *   }
 * }
 */
versionRoutes.delete('/:versionId', authenticate, deleteById);

/**
 * POST /artifacts/:artifactId/versions/:versionId/download
 * Track download for a specific version
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
versionRoutes.post('/:versionId/download', downloadLimiter, download);
