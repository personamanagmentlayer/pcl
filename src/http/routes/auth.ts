/**
 * Authentication routes
 */

import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';

export const authRoutes = Router();

/**
 * POST /auth/register
 * Register a new user
 *
 * Rate limit: 5 requests per 15 minutes
 *
 * Body:
 * {
 *   "username": "johndoe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123",
 *   "fullName": "John Doe" (optional)
 * }
 *
 * Response: 201
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "token": "...",
 *     "refreshToken": "...",
 *     "expiresIn": 3600
 *   }
 * }
 */
authRoutes.post('/register', authLimiter, register);

/**
 * POST /auth/login
 * Login user
 *
 * Rate limit: 5 requests per 15 minutes
 *
 * Body:
 * {
 *   "username": "johndoe",  // or email
 *   "password": "SecurePass123"
 * }
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "token": "...",
 *     "refreshToken": "...",
 *     "expiresIn": 3600
 *   }
 * }
 */
authRoutes.post('/login', authLimiter, login);

/**
 * POST /auth/refresh
 * Refresh access token
 *
 * Rate limit: 5 requests per 15 minutes
 *
 * Body:
 * {
 *   "refreshToken": "..."
 * }
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "token": "...",
 *     "refreshToken": "...",
 *     "expiresIn": 3600
 *   }
 * }
 */
authRoutes.post('/refresh', authLimiter, refresh);

/**
 * POST /auth/logout
 * Logout user (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Logged out successfully"
 *   }
 * }
 */
authRoutes.post('/logout', authenticate, logout);

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response: 200
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user_...",
 *     "username": "johndoe",
 *     "email": "john@example.com",
 *     "fullName": "John Doe",
 *     "roles": ["user"],
 *     "createdAt": "2026-01-23T...",
 *     "updatedAt": "2026-01-23T..."
 *   }
 * }
 */
authRoutes.get('/me', authenticate, me);
