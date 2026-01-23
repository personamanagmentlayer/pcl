/**
 * Artifact controller
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  CreateArtifactSchema,
  UpdateArtifactSchema,
  ListArtifactsQuerySchema,
} from '../schemas/artifact.schema.js';
import {
  createArtifact,
  getArtifactById,
  updateArtifact,
  deleteArtifact,
  listArtifacts,
  starArtifact,
  unstarArtifact,
  trackDownload,
} from '../services/artifact.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';

/**
 * Create a new artifact
 * POST /artifacts
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Validate request body
    const input = CreateArtifactSchema.parse(req.body);

    // Create artifact
    const artifact = await createArtifact(input, req.user.sub, req.user.username);

    // Send success response
    sendSuccess(res, artifact, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })));
      return;
    }
    next(error);
  }
}

/**
 * Get artifact by ID
 * GET /artifacts/:id
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Get artifact
    const artifact = await getArtifactById(id, req.user?.sub);

    // Send success response
    sendSuccess(res, artifact, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update artifact
 * PUT /artifacts/:id
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    const input = UpdateArtifactSchema.parse(req.body);

    // Update artifact
    const artifact = await updateArtifact(id, input, req.user.sub);

    // Send success response
    sendSuccess(res, artifact, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })));
      return;
    }
    next(error);
  }
}

/**
 * Delete artifact
 * DELETE /artifacts/:id
 */
export async function deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Delete artifact
    await deleteArtifact(id, req.user.sub);

    // Send success response
    sendSuccess(res, { message: 'Artifact deleted successfully' }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * List artifacts
 * GET /artifacts
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validate query parameters
    const query = ListArtifactsQuerySchema.parse(req.query);

    // List artifacts
    const result = await listArtifacts(query);

    // Send success response
    sendSuccess(res, result, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })));
      return;
    }
    next(error);
  }
}

/**
 * Star an artifact
 * POST /artifacts/:id/star
 */
export async function star(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Star artifact
    const result = await starArtifact(id, req.user.sub);

    // Send success response
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Unstar an artifact
 * DELETE /artifacts/:id/star
 */
export async function unstar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Unstar artifact
    const result = await unstarArtifact(id, req.user.sub);

    // Send success response
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Track download
 * POST /artifacts/:id/download
 */
export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Track download
    await trackDownload(id);

    // Send success response
    sendSuccess(res, { message: 'Download tracked' }, 200);
  } catch (error) {
    next(error);
  }
}
