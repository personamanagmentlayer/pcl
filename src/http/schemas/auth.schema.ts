/**
 * Authentication schemas for request/response validation
 */

import { z } from 'zod';

/**
 * User registration schema
 */
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be at most 255 characters')
    .optional(),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type RegisterInput = RegisterRequest; // Alias for service layer compatibility

/**
 * User login schema
 */
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export type LoginInput = LoginRequest; // Alias for service layer compatibility

/**
 * Refresh token schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;

/**
 * User response schema (public user data)
 */
export const UserResponseSchema = z.object({
  id: z.string().min(1),
  username: z.string(),
  email: z.string().email(),
  fullName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  website: z.string().url().optional(),
  githubUsername: z.string().optional(),
  roles: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * Auth response schema (login/register response)
 */
export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number(), // Seconds until token expiration
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
