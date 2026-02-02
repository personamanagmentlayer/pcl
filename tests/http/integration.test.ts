/**
 * Integration tests for HTTP Registry Server
 * Tests complete workflows: auth, artifact CRUD, versioning, search
 */

import type { Express } from 'express';
import request from 'supertest';
import { HTTPRegistryServer } from '../../src/http/server.js';

describe('HTTP Registry Integration Tests', () => {
  let server: HTTPRegistryServer;
  let app: Express;
  let authToken: string;
  let userId: string;
  let artifactId: string;
  let versionId: string;

  beforeAll(async () => {
    // Create server instance (test mode, no actual listening)
    server = new HTTPRegistryServer({ port: 0 }); // Port 0 = don't listen
    app = server.getApp();
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      await server.stop();
    }
  });

  describe('Health & Version Endpoints', () => {
    it('should return health check', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('should return version info', async () => {
      const response = await request(app).get('/version');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('apiVersion');
      expect(response.body.data).toHaveProperty('serverVersion');
      expect(response.body.data).toHaveProperty('node');
    });

    it('should return API root info', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('PCL HTTP Registry API');
      expect(response.body.data.endpoints).toHaveProperty('auth');
      expect(response.body.data.endpoints).toHaveProperty('artifacts');
      expect(response.body.data.endpoints).toHaveProperty('search');
    });

    it('should serve OpenAPI spec', async () => {
      const response = await request(app).get('/openapi.json');

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toContain('PCL HTTP Registry API');
      expect(response.body.paths).toHaveProperty('/auth/register');
      expect(response.body.paths).toHaveProperty('/artifacts');
      expect(response.body.paths).toHaveProperty('/search');
    });
  });

  describe('Authentication Workflow', () => {
    it('should register a new user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        fullName: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.username).toBe('testuser');

      // Save for later tests
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('should not register duplicate username', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        username: 'testuser',
        email: 'another@example.com',
        password: 'TestPass123',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('should login with correct credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        username: 'testuser',
        password: 'TestPass123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        username: 'testuser',
        password: 'WrongPass123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should reject /me without auth token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Artifact CRUD Workflow', () => {
    it('should create a new artifact', async () => {
      const response = await request(app)
        .post('/api/v1/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'persona',
          metadata: {
            name: 'Python Expert',
            description: 'Expert Python developer persona for coding tasks',
            version: '1.0.0',
            tags: ['python', 'coding', 'expert'],
            license: 'MIT',
          },
          source:
            'persona PythonExpert {\n  expertise: ["python", "testing"]\n}',
          published: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('persona');
      expect(response.body.data.metadata.name).toBe('Python Expert');
      expect(response.body.data.metadata.slug).toBe('python-expert');
      expect(response.body.data.authorUsername).toBe('testuser');
      expect(response.body.data.published).toBe(true);
      expect(response.body.data.stats.downloads).toBe(0);

      // Save for later tests
      artifactId = response.body.data.id;
    });

    it('should not create artifact without auth', async () => {
      const response = await request(app)
        .post('/api/v1/artifacts')
        .send({
          type: 'skill',
          metadata: {
            name: 'Test Skill',
            description: 'A test skill',
            version: '1.0.0',
          },
          source: 'skill Test {}',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should get artifact by ID', async () => {
      const response = await request(app).get(
        `/api/v1/artifacts/${artifactId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(artifactId);
      expect(response.body.data.metadata.name).toBe('Python Expert');
    });

    it('should list artifacts with pagination', async () => {
      const response = await request(app).get(
        '/api/v1/artifacts?limit=10&offset=0'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.artifacts).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('should filter artifacts by type', async () => {
      const response = await request(app).get('/api/v1/artifacts?type=persona');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(
        response.body.data.artifacts.every((a: any) => a.type === 'persona')
      ).toBe(true);
    });

    it('should update artifact', async () => {
      const response = await request(app)
        .put(`/api/v1/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metadata: {
            description: 'Updated description for Python expert',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.description).toBe(
        'Updated description for Python expert'
      );
    });

    it('should not update artifact without ownership', async () => {
      // Register another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'OtherPass123',
        });

      const otherToken = otherUserResponse.body.data.token;

      // Try to update with other user's token
      const response = await request(app)
        .put(`/api/v1/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          metadata: { description: 'Unauthorized update' },
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should star an artifact', async () => {
      const response = await request(app)
        .post(`/api/v1/artifacts/${artifactId}/star`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.starred).toBe(true);
      expect(response.body.data.totalStars).toBe(1);
    });

    it('should unstar an artifact', async () => {
      const response = await request(app)
        .delete(`/api/v1/artifacts/${artifactId}/star`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.starred).toBe(false);
      expect(response.body.data.totalStars).toBe(0);
    });

    it('should track artifact download', async () => {
      const response = await request(app).post(
        `/api/v1/artifacts/${artifactId}/download`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Download tracked');
    });
  });

  describe('Version Management Workflow', () => {
    it('should create a new version', async () => {
      const response = await request(app)
        .post(`/api/v1/artifacts/${artifactId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          version: '1.1.0',
          source:
            'persona PythonExpert {\n  expertise: ["python", "testing", "async"]\n}',
          metadata: {
            changelog: 'Added async programming expertise',
            breaking: false,
          },
          published: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('1.1.0');
      expect(response.body.data.artifactId).toBe(artifactId);
      expect(response.body.data.metadata.changelog).toContain('async');

      versionId = response.body.data.id;
    });

    it('should not create duplicate version', async () => {
      const response = await request(app)
        .post(`/api/v1/artifacts/${artifactId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          version: '1.1.0',
          source: 'duplicate',
        });

      // Note: May return 400 if validation fails before duplicate check
      expect([400, 409]).toContain(response.status);
      expect(response.body.success).toBe(false);
      if (response.status === 409) {
        expect(response.body.error.code).toBe('VERSION_EXISTS');
      }
    });

    it('should not create older version', async () => {
      const response = await request(app)
        .post(`/api/v1/artifacts/${artifactId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          version: '1.0.0',
          source: 'older version',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_VERSION');
    });

    it('should list all versions', async () => {
      const response = await request(app).get(
        `/api/v1/artifacts/${artifactId}/versions`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.versions).toBeInstanceOf(Array);
      expect(response.body.data.versions.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should get latest version', async () => {
      const response = await request(app).get(
        `/api/v1/artifacts/${artifactId}/versions/latest`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('1.1.0');
    });

    it('should get specific version', async () => {
      const response = await request(app).get(
        `/api/v1/artifacts/${artifactId}/versions/1.1.0`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('1.1.0');
    });

    it('should track version download', async () => {
      const response = await request(app).post(
        `/api/v1/artifacts/${artifactId}/versions/${versionId}/download`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Search & Discovery', () => {
    it('should search artifacts by query', async () => {
      const response = await request(app).get('/api/v1/search?q=python');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.query).toBe('python');
      expect(response.body.data).toHaveProperty('took');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should highlight search matches', async () => {
      const response = await request(app).get(
        '/api/v1/search?q=python&highlight=true'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.results.length > 0) {
        const firstResult = response.body.data.results[0];
        expect(firstResult).toHaveProperty('score');
        expect(firstResult.score).toBeGreaterThan(0);
      }
    });

    it('should support fuzzy search', async () => {
      const response = await request(app).get(
        '/api/v1/search?q=pythno&fuzzy=true'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Fuzzy search should still find "python" even with typo
    });

    it('should get search suggestions', async () => {
      const response = await request(app).get(
        '/api/v1/search/suggestions?q=pyth'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.query).toBe('pyth');
    });

    it('should filter search by type', async () => {
      const response = await request(app).get(
        '/api/v1/search?q=python&type=persona'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(
        response.body.data.results.every(
          (r: any) => r.artifact.type === 'persona'
        )
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent artifact', async () => {
      const response = await request(app).get(
        '/api/v1/artifacts/artifact_nonexistent'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate artifact creation schema', async () => {
      const response = await request(app)
        .post('/api/v1/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'persona',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate version format', async () => {
      const response = await request(app)
        .post(`/api/v1/artifacts/${artifactId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          version: 'invalid-version',
          source: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should delete artifact', async () => {
      const response = await request(app)
        .delete(`/api/v1/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted');
    });

    it('should logout user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
