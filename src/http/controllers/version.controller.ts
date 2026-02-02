/**
 * Version controller
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CreateVersionSchema,
  UpdateVersionSchema,
} from '../schemas/version.schema.js';
import {
  createVersion,
  deleteVersion,
  getArtifactVersion,
  getLatestVersion,
  listArtifactVersions,
  trackVersionDownload,
  updateVersion,
} from '../services/version.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';

/**
 * Create a new version
 * POST /artifacts/:artifactId/versions
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

    const { artifactId } = req.params;
    const aid = Array.isArray(artifactId) ? artifactId[0] : artifactId;

    // Validate request body
    const input = CreateVersionSchema.parse(req.body);

    // Create version
    const version = await createVersion(aid, input, req.user.sub);

    // Send success response
    sendSuccess(res, version, 201);
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
 * Get specific version
 * GET /artifacts/:artifactId/versions/:version
 */
export async function getByVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { artifactId, version } = req.params;
    const aid = Array.isArray(artifactId) ? artifactId[0] : artifactId;
    const ver = Array.isArray(version) ? version[0] : version;

    // Get version
    const versionData = await getArtifactVersion(aid, ver);

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
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { artifactId } = req.params;
    const aid = Array.isArray(artifactId) ? artifactId[0] : artifactId;

    // List versions
    const result = await listArtifactVersions(aid);

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

    const { versionId } = req.params;
    const vid = Array.isArray(versionId) ? versionId[0] : versionId;

    // Validate request body
    const input = UpdateVersionSchema.parse(req.body);

    // Update version
    const version = await updateVersion(vid, input, req.user.sub);

    // Send success response
    sendSuccess(res, version, 200);
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
 * Delete version
 * DELETE /artifacts/:artifactId/versions/:versionId
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

    const { versionId } = req.params;
    const vid = Array.isArray(versionId) ? versionId[0] : versionId;

    // Delete version
    await deleteVersion(vid, req.user.sub);

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
export async function download(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { versionId } = req.params;
    const vid = Array.isArray(versionId) ? versionId[0] : versionId;

    // Track download
    await trackVersionDownload(vid);

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
export async function latest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { artifactId } = req.params;
    const aid = Array.isArray(artifactId) ? artifactId[0] : artifactId;
    const publishedOnly = req.query.published !== 'false';

    // Get latest version
    const version = await getLatestVersion(aid, publishedOnly);

    // Send success response
    sendSuccess(res, version, 200);
  } catch (error) {
    next(error);
  }
}
