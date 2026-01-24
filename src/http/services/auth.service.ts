/**
 * Authentication Service
 */

import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  UserResponse,
} from '../schemas/auth.schema.js';
import { APIException } from '../middleware/error-handler.js';

/**
 * In-memory user store (temporary - will be replaced with database)
 */
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  fullName?: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

class UserStore {
  private users: Map<string, User> = new Map();
  private usernameIndex: Map<string, string> = new Map(); // username -> id
  private emailIndex: Map<string, string> = new Map(); // email -> id

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    this.usernameIndex.set(user.username.toLowerCase(), user.id);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.users.get(id) || null : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) || null : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.usernameIndex.has(username.toLowerCase());
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.emailIndex.has(email.toLowerCase());
  }
}

const userStore = new UserStore();

/**
 * Refresh token store (in-memory - will be replaced with Redis)
 */
interface RefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}

class RefreshTokenStore {
  private tokens: Map<string, RefreshTokenData> = new Map();

  async save(
    userId: string,
    token: string,
    expiresInSeconds: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    this.tokens.set(token, { userId, token, expiresAt });
  }

  async findByToken(token: string): Promise<RefreshTokenData | null> {
    const data = this.tokens.get(token);
    if (!data) return null;

    // Check if expired
    if (data.expiresAt < new Date()) {
      this.tokens.delete(token);
      return null;
    }

    return data;
  }

  async deleteByToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [token, data] of this.tokens.entries()) {
      if (data.userId === userId) {
        this.tokens.delete(token);
      }
    }
  }
}

const refreshTokenStore = new RefreshTokenStore();

import { randomBytes } from 'crypto';

/**
 * Generate unique user ID using cryptographically secure random
 */
function generateUserId(): string {
  const randomPart = randomBytes(8).toString('hex');
  return `user_${Date.now()}_${randomPart}`;
}

/**
 * Convert User to UserResponse (exclude sensitive fields)
 */
function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Register a new user
 */
export async function registerUser(
  input: RegisterInput
): Promise<AuthResponse> {
  // Check if username already exists
  if (await userStore.existsByUsername(input.username)) {
    throw new APIException(409, 'USERNAME_TAKEN', 'Username is already taken');
  }

  // Check if email already exists
  if (await userStore.existsByEmail(input.email)) {
    throw new APIException(409, 'EMAIL_TAKEN', 'Email is already registered');
  }

  // Hash password
  const hashedPassword = await hashPassword(input.password);

  // Create user
  const user: User = {
    id: generateUserId(),
    username: input.username,
    email: input.email,
    password: hashedPassword,
    fullName: input.fullName,
    roles: ['user'], // Default role
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await userStore.create(user);

  // Generate tokens
  const token = signToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  // Store refresh token
  const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
  await refreshTokenStore.save(user.id, refreshToken, refreshTokenExpiry);

  return {
    user: toUserResponse(user),
    token,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds (default)
  };
}

/**
 * Login user
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  // Find user by username or email
  const user = input.username.includes('@')
    ? await userStore.findByEmail(input.username)
    : await userStore.findByUsername(input.username);

  if (!user) {
    throw new APIException(
      401,
      'INVALID_CREDENTIALS',
      'Invalid username or password'
    );
  }

  // Verify password
  const isValidPassword = await verifyPassword(input.password, user.password);
  if (!isValidPassword) {
    throw new APIException(
      401,
      'INVALID_CREDENTIALS',
      'Invalid username or password'
    );
  }

  // Generate tokens
  const token = signToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  // Store refresh token
  const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
  await refreshTokenStore.save(user.id, refreshToken, refreshTokenExpiry);

  return {
    user: toUserResponse(user),
    token,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResponse> {
  // Verify refresh token
  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch (error) {
    throw new APIException(
      401,
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token'
    );
  }

  // Check if refresh token exists in store
  const storedToken = await refreshTokenStore.findByToken(refreshToken);
  if (!storedToken) {
    throw new APIException(
      401,
      'INVALID_REFRESH_TOKEN',
      'Refresh token not found or expired'
    );
  }

  // Get user
  const user = await userStore.findById(payload.sub);
  if (!user) {
    throw new APIException(401, 'USER_NOT_FOUND', 'User not found');
  }

  // Generate new access token
  const token = signToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  // Generate new refresh token (rotate refresh token)
  const newRefreshToken = signRefreshToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  // Delete old refresh token and store new one
  await refreshTokenStore.deleteByToken(refreshToken);
  const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
  await refreshTokenStore.save(user.id, newRefreshToken, refreshTokenExpiry);

  return {
    user: toUserResponse(user),
    token,
    refreshToken: newRefreshToken,
    expiresIn: 3600, // 1 hour in seconds
  };
}

/**
 * Logout user
 */
export async function logoutUser(userId: string): Promise<void> {
  // Delete all refresh tokens for user
  await refreshTokenStore.deleteByUserId(userId);
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserResponse> {
  const user = await userStore.findById(userId);
  if (!user) {
    throw new APIException(404, 'USER_NOT_FOUND', 'User not found');
  }
  return toUserResponse(user);
}
