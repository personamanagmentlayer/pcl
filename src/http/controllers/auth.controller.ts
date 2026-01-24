/**
 * Authentication controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from '../schemas/auth.schema.js';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
} from '../services/auth.service.js';
import { sendSuccess, sendValidationError } from '../utils/response.js';
import { ZodError } from 'zod';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const input = RegisterSchema.parse(req.body);

    // Register user
    const authResponse = await registerUser(input);

    // Send success response
    sendSuccess(res, authResponse, 201);
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
 * Login user
 * POST /auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const input = LoginSchema.parse(req.body);

    // Login user
    const authResponse = await loginUser(input);

    // Send success response
    sendSuccess(res, authResponse, 200);
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
 * Refresh access token
 * POST /auth/refresh
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const { refreshToken } = RefreshTokenSchema.parse(req.body);

    // Refresh token
    const authResponse = await refreshAccessToken(refreshToken);

    // Send success response
    sendSuccess(res, authResponse, 200);
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
 * Logout user
 * POST /auth/logout
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User must be authenticated
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    // Logout user (invalidate refresh tokens)
    await logoutUser(req.user.sub);

    // Send success response
    sendSuccess(res, { message: 'Logged out successfully' }, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 * GET /auth/me
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User must be authenticated
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }

    // Get user profile
    const user = await getUserById(req.user.sub);

    // Send success response
    sendSuccess(res, user, 200);
  } catch (error) {
    next(error);
  }
}
