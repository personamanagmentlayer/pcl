/**
 * Comprehensive unit tests for Version Controller
 * Tests version management endpoints with service layer mocking
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import * as versionController from '../../../src/http/controllers/version.controller.js';
import * as versionService from '../../../src/http/services/version.service.js';
import * as responseUtils from '../../../src/http/utils/response.js';

// Mock dependencies
vi.mock('../../../src/http/services/version.service.js');
vi.mock('../../../src/http/utils/response.js');

describe('Version Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  describe('create', () => {
    const validVersionData = {
      version: '2.0.0',
      source: 'persona UpdatedPersona { skills: ["advanced-testing"] }',
      metadata: {
        changelog: 'Added advanced testing capabilities',
        breaking: true,
        deprecated: false,
      },
      published: true,
    };

    const mockCreatedVersion = {
      id: 'version_123',
      artifactId: 'artifact_123',
      version: '2.0.0',
      source: validVersionData.source,
      metadata: validVersionData.metadata,
      published: true,
      downloads: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should create version successfully with valid data', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: validVersionData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.createVersion).mockResolvedValue(
        mockCreatedVersion
      );

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.createVersion).toHaveBeenCalledWith(
        'artifact_123',
        validVersionData,
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockCreatedVersion,
        201
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: validVersionData,
        user: undefined,
      };

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(versionService.createVersion).not.toHaveBeenCalled();
    });

    it('should handle array params by taking first element', async () => {
      mockRequest = {
        params: { artifactId: ['artifact_123', 'artifact_456'] as any },
        body: validVersionData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.createVersion).mockResolvedValue(
        mockCreatedVersion
      );

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.createVersion).toHaveBeenCalledWith(
        'artifact_123',
        validVersionData,
        'user_123'
      );
    });

    it('should handle validation errors for invalid version format', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: {
          version: 'invalid-version',
          source: 'test source code here',
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
      expect(versionService.createVersion).not.toHaveBeenCalled();
    });

    it('should handle validation errors for short source code', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: {
          version: '1.0.0',
          source: 'short', // Too short
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should handle validation errors for long changelog', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: {
          version: '1.0.0',
          source: 'valid source code here for testing',
          metadata: {
            changelog: 'x'.repeat(2001), // Too long
          },
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should validate field paths in error messages', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: {
          version: 'bad',
          source: 'x',
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
      const call = vi.mocked(responseUtils.sendValidationError).mock.calls[0];
      expect(call[1]).toBeInstanceOf(Array);
    });

    it('should call next for non-validation errors', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: validVersionData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      const dbError = new Error('Database connection failed');
      vi.mocked(versionService.createVersion).mockRejectedValue(dbError);

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle service error for version conflict', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        body: validVersionData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      const conflictError = new Error('Version already exists');
      vi.mocked(versionService.createVersion).mockRejectedValue(conflictError);

      await versionController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(conflictError);
    });
  });

  describe('getByVersion', () => {
    const mockVersion = {
      id: 'version_123',
      artifactId: 'artifact_123',
      version: '1.5.0',
      source: 'persona TestPersona { skills: ["testing"] }',
      metadata: {
        changelog: 'Initial release',
        breaking: false,
        deprecated: false,
      },
      published: true,
      downloads: 42,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should get version successfully', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123', version: '1.5.0' },
      };

      vi.mocked(versionService.getArtifactVersion).mockResolvedValue(
        mockVersion
      );

      await versionController.getByVersion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getArtifactVersion).toHaveBeenCalledWith(
        'artifact_123',
        '1.5.0'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockVersion,
        200
      );
    });

    it('should handle array params for artifactId', async () => {
      mockRequest = {
        params: {
          artifactId: ['artifact_123', 'artifact_456'] as any,
          version: '1.5.0',
        },
      };

      vi.mocked(versionService.getArtifactVersion).mockResolvedValue(
        mockVersion
      );

      await versionController.getByVersion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getArtifactVersion).toHaveBeenCalledWith(
        'artifact_123',
        '1.5.0'
      );
    });

    it('should handle array params for version', async () => {
      mockRequest = {
        params: {
          artifactId: 'artifact_123',
          version: ['1.5.0', '2.0.0'] as any,
        },
      };

      vi.mocked(versionService.getArtifactVersion).mockResolvedValue(
        mockVersion
      );

      await versionController.getByVersion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getArtifactVersion).toHaveBeenCalledWith(
        'artifact_123',
        '1.5.0'
      );
    });

    it('should call next when version not found', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123', version: '9.9.9' },
      };

      const notFoundError = new Error('Version not found');
      vi.mocked(versionService.getArtifactVersion).mockRejectedValue(
        notFoundError
      );

      await versionController.getByVersion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });

    it('should work for unauthenticated users', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123', version: '1.5.0' },
        user: undefined,
      };

      vi.mocked(versionService.getArtifactVersion).mockResolvedValue(
        mockVersion
      );

      await versionController.getByVersion(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getArtifactVersion).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const mockListResponse = {
      versions: [
        {
          id: 'version_1',
          artifactId: 'artifact_123',
          version: '1.0.0',
          source: 'persona V1 {}',
          metadata: {
            changelog: 'Initial release',
            breaking: false,
            deprecated: false,
          },
          published: true,
          downloads: 10,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'version_2',
          artifactId: 'artifact_123',
          version: '2.0.0',
          source: 'persona V2 {}',
          metadata: {
            changelog: 'Major update',
            breaking: true,
            deprecated: false,
          },
          published: true,
          downloads: 5,
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ],
      total: 2,
    };

    it('should list all versions successfully', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
      };

      vi.mocked(versionService.listArtifactVersions).mockResolvedValue(
        mockListResponse
      );

      await versionController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.listArtifactVersions).toHaveBeenCalledWith(
        'artifact_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockListResponse,
        200
      );
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { artifactId: ['artifact_123'] as any },
      };

      vi.mocked(versionService.listArtifactVersions).mockResolvedValue(
        mockListResponse
      );

      await versionController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.listArtifactVersions).toHaveBeenCalledWith(
        'artifact_123'
      );
    });

    it('should return empty list for artifact with no versions', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_new' },
      };

      const emptyResponse = { versions: [], total: 0 };
      vi.mocked(versionService.listArtifactVersions).mockResolvedValue(
        emptyResponse
      );

      await versionController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        emptyResponse,
        200
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
      };

      const error = new Error('Database error');
      vi.mocked(versionService.listArtifactVersions).mockRejectedValue(error);

      await versionController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    const updateData = {
      source: 'persona UpdatedPersona { skills: ["new-skill"] }',
      metadata: {
        deprecated: true,
        deprecationMessage: 'Use version 3.0.0 instead',
      },
      published: false,
    };

    const mockUpdatedVersion = {
      id: 'version_123',
      artifactId: 'artifact_123',
      version: '2.0.0',
      source: updateData.source,
      metadata: {
        changelog: 'Original changelog',
        breaking: false,
        deprecated: true,
        deprecationMessage: 'Use version 3.0.0 instead',
      },
      published: false,
      downloads: 42,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    };

    it('should update version successfully', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.updateVersion).mockResolvedValue(
        mockUpdatedVersion
      );

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.updateVersion).toHaveBeenCalledWith(
        'version_123',
        updateData,
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockUpdatedVersion,
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        body: updateData,
        user: undefined,
      };

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(versionService.updateVersion).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { versionId: ['version_123', 'version_456'] as any },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.updateVersion).mockResolvedValue(
        mockUpdatedVersion
      );

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.updateVersion).toHaveBeenCalledWith(
        'version_123',
        updateData,
        'user_123'
      );
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        body: {
          source: 'x', // Too short
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        body: {
          metadata: {
            deprecated: true,
          },
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.updateVersion).mockResolvedValue(
        mockUpdatedVersion
      );

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.updateVersion).toHaveBeenCalled();
    });

    it('should call next for service errors', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      const forbiddenError = new Error('Not authorized');
      vi.mocked(versionService.updateVersion).mockRejectedValue(forbiddenError);

      await versionController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(forbiddenError);
    });
  });

  describe('deleteById', () => {
    it('should delete version successfully', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.deleteVersion).mockResolvedValue(undefined);

      await versionController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.deleteVersion).toHaveBeenCalledWith(
        'version_123',
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { message: 'Version deleted successfully' },
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        user: undefined,
      };

      await versionController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(versionService.deleteVersion).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { versionId: ['version_123'] as any },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(versionService.deleteVersion).mockResolvedValue(undefined);

      await versionController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.deleteVersion).toHaveBeenCalledWith(
        'version_123',
        'user_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      const error = new Error('Version has dependencies');
      vi.mocked(versionService.deleteVersion).mockRejectedValue(error);

      await versionController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('download', () => {
    it('should track version download successfully', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
      };

      vi.mocked(versionService.trackVersionDownload).mockResolvedValue(
        undefined
      );

      await versionController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.trackVersionDownload).toHaveBeenCalledWith(
        'version_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { message: 'Download tracked' },
        200
      );
    });

    it('should work for unauthenticated users', async () => {
      mockRequest = {
        params: { versionId: 'version_123' },
        user: undefined,
      };

      vi.mocked(versionService.trackVersionDownload).mockResolvedValue(
        undefined
      );

      await versionController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.trackVersionDownload).toHaveBeenCalledWith(
        'version_123'
      );
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { versionId: ['version_123', 'version_456'] as any },
      };

      vi.mocked(versionService.trackVersionDownload).mockResolvedValue(
        undefined
      );

      await versionController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.trackVersionDownload).toHaveBeenCalledWith(
        'version_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { versionId: 'nonexistent' },
      };

      const error = new Error('Version not found');
      vi.mocked(versionService.trackVersionDownload).mockRejectedValue(error);

      await versionController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('latest', () => {
    const mockLatestVersion = {
      id: 'version_latest',
      artifactId: 'artifact_123',
      version: '3.2.1',
      source: 'persona LatestPersona { skills: ["latest"] }',
      metadata: {
        changelog: 'Latest stable release',
        breaking: false,
        deprecated: false,
      },
      published: true,
      downloads: 100,
      createdAt: '2026-01-05T00:00:00Z',
      updatedAt: '2026-01-05T00:00:00Z',
    };

    it('should get latest published version by default', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        query: {},
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalledWith(
        'artifact_123',
        true
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockLatestVersion,
        200
      );
    });

    it('should get latest version including unpublished when requested', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        query: { published: 'false' },
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalledWith(
        'artifact_123',
        false
      );
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { artifactId: ['artifact_123'] as any },
        query: {},
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalledWith(
        'artifact_123',
        true
      );
    });

    it('should treat published=true query param correctly', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        query: { published: 'true' },
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalledWith(
        'artifact_123',
        true
      );
    });

    it('should handle any non-false value as true for published', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        query: { published: 'yes' },
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalledWith(
        'artifact_123',
        true
      );
    });

    it('should call next when no versions exist', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_new' },
        query: {},
      };

      const error = new Error('No versions found');
      vi.mocked(versionService.getLatestVersion).mockRejectedValue(error);

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should work for unauthenticated users', async () => {
      mockRequest = {
        params: { artifactId: 'artifact_123' },
        query: {},
        user: undefined,
      };

      vi.mocked(versionService.getLatestVersion).mockResolvedValue(
        mockLatestVersion
      );

      await versionController.latest(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(versionService.getLatestVersion).toHaveBeenCalled();
    });
  });
});
