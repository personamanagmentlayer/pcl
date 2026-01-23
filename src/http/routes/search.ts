/**
 * Search routes
 */

import { Router } from 'express';
import { search, suggestions } from '../controllers/search.controller.js';
import { searchLimiter } from '../middleware/rate-limit.js';

export const searchRoutes = Router();

/**
 * GET /search
 * Search artifacts with full-text search
 *
 * Rate limit: 30 requests per minute
 *
 * Query parameters:
 * - q: search query (required)
 * - type: persona | skill | workflow | team
 * - fuzzy: true | false (enable fuzzy matching)
 * - highlight: true | false (highlight matches, default: true)
 * - limit: number (default: 20, max: 50)
 * - offset: number (default: 0)
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "results": [
 *       {
 *         "artifact": { ... },
 *         "score": 0.95,
 *         "highlights": {
 *           "name": ["Expert <em>Python</em> Developer"],
 *           "description": ["..."],
 *           "tags": ["<em>python</em>"]
 *         }
 *       }
 *     ],
 *     "total": 42,
 *     "query": "python",
 *     "took": 15,
 *     "pagination": {
 *       "offset": 0,
 *       "limit": 20,
 *       "hasMore": true
 *     }
 *   }
 * }
 */
searchRoutes.get('/', searchLimiter, search);

/**
 * GET /search/suggestions
 * Get search suggestions/autocomplete
 *
 * Rate limit: 30 requests per minute
 *
 * Query parameters:
 * - q: partial query string
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "suggestions": ["Python Expert", "Python Developer", "python"],
 *     "query": "pyth"
 *   }
 * }
 */
searchRoutes.get('/suggestions', searchLimiter, suggestions);
