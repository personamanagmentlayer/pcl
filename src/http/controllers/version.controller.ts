/**
 * Version controller
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { CreateVersionSchema, UpdateVersionSchema } from '../schemas/version.schema.js';
import {
  createVersion,
  getVersionById,
  getArtifactVersion,
  listArtifactVersions,
  updateVersion,
  deleteVersion,
  trackVersionDownload,
  getLatestVersion,
} from '../services/version.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';

/**
 * Create a new version
 * POST /artifacts/:artifactId/versions
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { artifactId } = req.params;

    // Validate request body
    const input = CreateVersionSchema.parse(req.body);

    // Create version
    const version = await createVersion(artifactId, input, req.user.sub);

    // Send success response
    sendSuccess(res, version, 201);
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
 * Get specific version
 * GET /artifacts/:artifactId/versions/:version
 */
export async function getByVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { artifactId, version } = req.params;

    // Get version
    const versionData = await getArtifactVersion(artifactId, version);

    // Send success response
    sendSuccess(res, versionData, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * List all versions
 * GET /artifacts/:artifactId/versions
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { artifactId } = req.params;

    // List versions
    const result = await listArtifactVersions(artifactId);

    // Send success response
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update version
 * PUT /artifacts/:artifactId/versions/:versionId
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { versionId } = req.params;

    // Validate request body
    const input = UpdateVersionSchema.parse(req.body);

    // Update version
    const version = await updateVersion(versionId, input, req.user.sub);

    // Send success response
    sendSuccess(res, version, 200);
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
 * Delete version
 * DELETE /artifacts/:artifactId/versions/:versionId
 */
export async function deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { versionId } = req.params;

    // Delete version
    await deleteVersion(versionId, req.user.sub);

    // Send success response
    sendSuccess(res, { message: 'Version deleted successfully' }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Track version download
 * POST /artifacts/:artifactId/versions/:versionId/download
 */
export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { versionId } = req.params;

    // Track download
    await trackVersionDownload(versionId);

    // Send success response
    sendSuccess(res, { message: 'Download tracked' }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get latest version
 * GET /artifacts/:artifactId/versions/latest
 */
export async function latest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { artifactId } = req.params;
    const publishedOnly = req.query.published !== 'false';

    // Get latest version
    const version = await getLatestVersion(artifactId, publishedOnly);

    // Send success response
    sendSuccess(res, version, 200);
  } catch (error) {
    next(error);
  }
}
