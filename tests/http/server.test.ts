/**
 * HTTP Registry Server Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { HTTPRegistryServer } from '../../src/http/server.js';
import type { Express } from 'express';

describe('HTTPRegistryServer', () => {
  let server: HTTPRegistryServer;
  let app: Express;

  beforeAll(async () => {
    server = new HTTPRegistryServer({ port: 3001 }); // Use different port for testing
    app = server.getApp();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('Version Info', () => {
    it('should return API version info', async () => {
      const response = await request(app).get('/version');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.apiVersion).toBe('v1');
      expect(response.body.data).toHaveProperty('serverVersion');
      expect(response.body.data).toHaveProperty('node');
    });
  });

  describe('API Root', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('PCL HTTP Registry API');
      expect(response.body.data).toHaveProperty('endpoints');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });
  });
});
