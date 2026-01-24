/**
 * Authentication tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { HTTPRegistryServer } from '../../src/http/server.js';
import type { Express } from 'express';

describe('Authentication', () => {
  let server: HTTPRegistryServer;
  let app: Express;

  beforeAll(async () => {
    server = new HTTPRegistryServer({ port: 3002 }); // Different port for auth tests
    app = server.getApp();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123',
          fullName: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password'); // Should not expose password
    });

    it('should reject duplicate username', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'duplicate',
          email: 'user1@example.com',
          password: 'SecurePass123',
        });

      // Second registration with same username
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'duplicate',
          email: 'user2@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'user1',
          email: 'duplicate@example.com',
          password: 'SecurePass123',
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'user2',
          email: 'duplicate@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'ab', // Too short
          email: 'test@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'weak', // No uppercase, no numbers, too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser3',
          email: 'invalid-email',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'logintest',
          email: 'login@example.com',
          password: 'SecurePass123',
        });
    });

    it('should login with username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'logintest',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should login with email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'login@example.com', // Email in username field
          password: 'SecurePass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'logintest',
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token', async () => {
      // Register and get refresh token
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshtest1',
          email: 'refresh1@example.com',
          password: 'SecurePass123',
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      // New refresh token should be different (rotation)
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject reused refresh token', async () => {
      // Register and get refresh token
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'refreshtest2',
          email: 'refresh2@example.com',
          password: 'SecurePass123',
        });

      const refreshToken = registerResponse.body.data.refreshToken;

      // Use refresh token once
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      // Try to use it again (should fail due to rotation)
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user profile', async () => {
      // Register and get token
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'metest1',
          email: 'me1@example.com',
          password: 'SecurePass123',
          fullName: 'Me Test',
        });

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('metest1');
      expect(response.body.data.email).toBe('me1@example.com');
      expect(response.body.data.fullName).toBe('Me Test');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      // Register and get tokens
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'logouttest1',
          email: 'logout1@example.com',
          password: 'SecurePass123',
        });

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Logged out');
    });

    it('should invalidate refresh token after logout', async () => {
      // Register and get tokens
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'logouttest2',
          email: 'logout2@example.com',
          password: 'SecurePass123',
        });

      const token = registerResponse.body.data.token;
      const refreshToken = registerResponse.body.data.refreshToken;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use refresh token (should fail)
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject logout without token', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
