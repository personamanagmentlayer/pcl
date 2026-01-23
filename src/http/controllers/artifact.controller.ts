/**
 * Artifact controller
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CreateArtifactSchema,
  ListArtifactsQuerySchema,
  UpdateArtifactSchema,
} from '../schemas/artifact.schema.js';
import {
  createArtifact,
  deleteArtifact,
  getArtifactById,
  listArtifacts,
  starArtifact,
  trackDownload,
  unstarArtifact,
  updateArtifact,
} from '../services/artifact.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';

/**
 * Create a new artifact
 * POST /artifacts
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    // Validate request body
    const input = CreateArtifactSchema.parse(req.body);

    // Create artifact
    const artifact = await createArtifact(
      input,
      req.user.sub,
      req.user.username
    );

    // Send success response
    sendSuccess(res, artifact, 201);
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
 * Get artifact by ID
 * GET /artifacts/:id
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Get artifact
    const artifact = await getArtifactById(artifactId, req.user?.sub);

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
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Validate request body
    const validatedData = UpdateArtifactSchema.parse(req.body);

    // Update artifact
    const artifact = await updateArtifact(
      artifactId,
      validatedData,
      req.user.sub
    );

    // Send success response
    sendSuccess(res, artifact, 200);
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
 * Delete artifact
 * DELETE /artifacts/:id
 */
export async function deleteById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Delete artifact
    await deleteArtifact(artifactId, req.user.sub);

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
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const query = ListArtifactsQuerySchema.parse(req.query);

    // List artifacts
    const result = await listArtifacts(query);

    // Send success response
    sendSuccess(res, result, 200);
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
 * Star an artifact
 * POST /artifacts/:id/star
 */
export async function star(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Star artifact
    const result = await starArtifact(artifactId, req.user.sub);

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
export async function unstar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Unstar artifact
    const result = await unstarArtifact(artifactId, req.user.sub);

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
export async function download(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const artifactId = Array.isArray(id) ? id[0] : id;

    // Track download
    await trackDownload(artifactId);

    // Send success response
    sendSuccess(res, { message: 'Download tracked' }, 200);
  } catch (error) {
    next(error);
  }
}
