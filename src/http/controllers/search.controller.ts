/**
 * Search controller
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { SearchQuerySchema } from '../schemas/search.schema.js';
import {
  searchArtifacts,
  getSearchSuggestions,
} from '../services/search.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';

/**
 * Search artifacts
 * GET /search
 */
export async function search(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const query = SearchQuerySchema.parse(req.query);

    // Search artifacts
    const results = await searchArtifacts(query);

    // Send success response
    sendSuccess(res, results, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(
        res,
        error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
      return;
    }
    next(error);
  }
}

/**
 * Get search suggestions
 * GET /search/suggestions
 */
export async function suggestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query.q as string;

    if (!query || query.length === 0) {
      sendSuccess(res, { suggestions: [], query: '' }, 200);
      return;
    }

    // Get suggestions
    const result = await getSearchSuggestions(query);

    // Send success response
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
