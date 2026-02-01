/**
 * Comprehensive unit tests for Artifact Controller
 * Tests all controller methods with mocking of service layer
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import * as artifactController from '../../../src/http/controllers/artifact.controller.js';
import * as artifactService from '../../../src/http/services/artifact.service.js';
import * as responseUtils from '../../../src/http/utils/response.js';

// Mock dependencies
vi.mock('../../../src/http/services/artifact.service.js');
vi.mock('../../../src/http/utils/response.js');

describe('Artifact Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock response object
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  describe('create', () => {
    const validArtifactData = {
      type: 'persona' as const,
      metadata: {
        name: 'Test Persona',
        description: 'This is a test persona for unit testing',
        version: '1.0.0',
        tags: ['test', 'persona'],
      },
      source: 'persona TestPersona { skills: ["testing"] }',
      published: true,
    };

    const mockCreatedArtifact = {
      id: 'artifact_123',
      ...validArtifactData,
      stats: { downloads: 0, stars: 0, views: 0 },
      authorId: 'user_123',
      authorUsername: 'testuser',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should create artifact successfully with valid data', async () => {
      mockRequest = {
        body: validArtifactData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.createArtifact).mockResolvedValue(
        mockCreatedArtifact
      );
      vi.mocked(responseUtils.sendSuccess).mockImplementation(
        (res, data, status) => {
          res.status(status).json({ success: true, data });
        }
      );

      await artifactController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.createArtifact).toHaveBeenCalledWith(
        validArtifactData,
        'user_123',
        'testuser'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockCreatedArtifact,
        201
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        body: validArtifactData,
        user: undefined,
      };

      await artifactController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(artifactService.createArtifact).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle validation errors from Zod schema', async () => {
      mockRequest = {
        body: {
          type: 'persona',
          metadata: {
            name: 'X', // Too short
            description: 'Short', // Too short
            version: 'invalid', // Invalid version format
          },
          source: 'test', // Too short
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await artifactController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
      expect(artifactService.createArtifact).not.toHaveBeenCalled();
    });

    it('should send validation errors with proper field mapping', async () => {
      mockRequest = {
        body: { type: 'invalid_type' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await artifactController.create(
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
        body: validArtifactData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      const dbError = new Error('Database connection failed');
      vi.mocked(artifactService.createArtifact).mockRejectedValue(dbError);

      await artifactController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(responseUtils.sendSuccess).not.toHaveBeenCalled();
    });

    it('should handle user with missing username field', async () => {
      mockRequest = {
        body: validArtifactData,
        user: { sub: 'user_123' } as any,
      };

      vi.mocked(artifactService.createArtifact).mockResolvedValue(
        mockCreatedArtifact
      );

      await artifactController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.createArtifact).toHaveBeenCalledWith(
        validArtifactData,
        'user_123',
        undefined
      );
    });
  });

  describe('getById', () => {
    const mockArtifact = {
      id: 'artifact_123',
      type: 'persona' as const,
      metadata: {
        name: 'Test Persona',
        description: 'Test description for persona',
        version: '1.0.0',
        tags: ['test'],
      },
      source: 'persona Test {}',
      stats: { downloads: 5, stars: 3, views: 10 },
      published: true,
      authorId: 'user_123',
      authorUsername: 'testuser',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should get artifact by ID successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123' },
      };

      vi.mocked(artifactService.getArtifactById).mockResolvedValue(
        mockArtifact
      );

      await artifactController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.getArtifactById).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockArtifact,
        200
      );
    });

    it('should handle array params by taking first element', async () => {
      mockRequest = {
        params: { id: ['artifact_123', 'artifact_456'] as any },
        user: { sub: 'user_123' },
      };

      vi.mocked(artifactService.getArtifactById).mockResolvedValue(
        mockArtifact
      );

      await artifactController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.getArtifactById).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
    });

    it('should work for unauthenticated users', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: undefined,
      };

      vi.mocked(artifactService.getArtifactById).mockResolvedValue(
        mockArtifact
      );

      await artifactController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.getArtifactById).toHaveBeenCalledWith(
        'artifact_123',
        undefined
      );
    });

    it('should call next when service throws error', async () => {
      mockRequest = {
        params: { id: 'nonexistent' },
        user: { sub: 'user_123' },
      };

      const notFoundError = new Error('Artifact not found');
      vi.mocked(artifactService.getArtifactById).mockRejectedValue(
        notFoundError
      );

      await artifactController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(notFoundError);
    });
  });

  describe('update', () => {
    const updateData = {
      metadata: {
        description: 'Updated description for the test persona',
      },
      published: true,
    };

    const mockUpdatedArtifact = {
      id: 'artifact_123',
      type: 'persona' as const,
      metadata: {
        name: 'Test Persona',
        description: 'Updated description for the test persona',
        version: '1.0.0',
        tags: ['test'],
      },
      source: 'persona Test {}',
      stats: { downloads: 5, stars: 3, views: 10 },
      published: true,
      authorId: 'user_123',
      authorUsername: 'testuser',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should update artifact successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.updateArtifact).mockResolvedValue(
        mockUpdatedArtifact
      );

      await artifactController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.updateArtifact).toHaveBeenCalledWith(
        'artifact_123',
        updateData,
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockUpdatedArtifact,
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        body: updateData,
        user: undefined,
      };

      await artifactController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(artifactService.updateArtifact).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { id: ['artifact_123', 'artifact_456'] as any },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.updateArtifact).mockResolvedValue(
        mockUpdatedArtifact
      );

      await artifactController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.updateArtifact).toHaveBeenCalledWith(
        'artifact_123',
        updateData,
        'user_123'
      );
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        body: {
          metadata: {
            name: 'X'.repeat(200), // Too long
          },
        },
        user: { sub: 'user_123', username: 'testuser' },
      };

      await artifactController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should call next for service errors', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        body: updateData,
        user: { sub: 'user_123', username: 'testuser' },
      };

      const forbiddenError = new Error('Not authorized to update');
      vi.mocked(artifactService.updateArtifact).mockRejectedValue(
        forbiddenError
      );

      await artifactController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(forbiddenError);
    });
  });

  describe('deleteById', () => {
    it('should delete artifact successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.deleteArtifact).mockResolvedValue(undefined);

      await artifactController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.deleteArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { message: 'Artifact deleted successfully' },
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: undefined,
      };

      await artifactController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(artifactService.deleteArtifact).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { id: ['artifact_123'] as any },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.deleteArtifact).mockResolvedValue(undefined);

      await artifactController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.deleteArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      const error = new Error('Delete failed');
      vi.mocked(artifactService.deleteArtifact).mockRejectedValue(error);

      await artifactController.deleteById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('list', () => {
    const mockListResponse = {
      artifacts: [
        {
          id: 'artifact_1',
          type: 'persona' as const,
          metadata: {
            name: 'Persona 1',
            description: 'First test persona for listing',
            version: '1.0.0',
            tags: ['test'],
          },
          source: 'persona P1 {}',
          stats: { downloads: 10, stars: 5, views: 20 },
          published: true,
          authorId: 'user_1',
          authorUsername: 'user1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      pagination: {
        total: 1,
        offset: 0,
        limit: 20,
        hasMore: false,
      },
    };

    it('should list artifacts with default pagination', async () => {
      mockRequest = {
        query: {},
      };

      vi.mocked(artifactService.listArtifacts).mockResolvedValue(
        mockListResponse
      );

      await artifactController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.listArtifacts).toHaveBeenCalled();
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockListResponse,
        200
      );
    });

    it('should handle query parameters', async () => {
      mockRequest = {
        query: {
          type: 'persona',
          tags: 'test,coding',
          limit: '10',
          offset: '5',
          sort: 'stars:desc',
        },
      };

      vi.mocked(artifactService.listArtifacts).mockResolvedValue(
        mockListResponse
      );

      await artifactController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.listArtifacts).toHaveBeenCalled();
    });

    it('should handle validation errors for invalid query params', async () => {
      mockRequest = {
        query: {
          limit: 'not-a-number',
          offset: '-5',
        },
      };

      await artifactController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should handle search parameter', async () => {
      mockRequest = {
        query: {
          search: 'python expert',
          limit: '20',
        },
      };

      vi.mocked(artifactService.listArtifacts).mockResolvedValue(
        mockListResponse
      );

      await artifactController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.listArtifacts).toHaveBeenCalled();
    });

    it('should call next on service error', async () => {
      mockRequest = {
        query: {},
      };

      const error = new Error('Database error');
      vi.mocked(artifactService.listArtifacts).mockRejectedValue(error);

      await artifactController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('star', () => {
    const mockStarResponse = {
      starred: true,
      totalStars: 6,
    };

    it('should star artifact successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.starArtifact).mockResolvedValue(
        mockStarResponse
      );

      await artifactController.star(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.starArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockStarResponse,
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: undefined,
      };

      await artifactController.star(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(artifactService.starArtifact).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { id: ['artifact_123'] as any },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.starArtifact).mockResolvedValue(
        mockStarResponse
      );

      await artifactController.star(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.starArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      const error = new Error('Already starred');
      vi.mocked(artifactService.starArtifact).mockRejectedValue(error);

      await artifactController.star(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('unstar', () => {
    const mockUnstarResponse = {
      starred: false,
      totalStars: 5,
    };

    it('should unstar artifact successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.unstarArtifact).mockResolvedValue(
        mockUnstarResponse
      );

      await artifactController.unstar(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.unstarArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockUnstarResponse,
        200
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: undefined,
      };

      await artifactController.unstar(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(artifactService.unstarArtifact).not.toHaveBeenCalled();
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { id: ['artifact_123'] as any },
        user: { sub: 'user_123', username: 'testuser' },
      };

      vi.mocked(artifactService.unstarArtifact).mockResolvedValue(
        mockUnstarResponse
      );

      await artifactController.unstar(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.unstarArtifact).toHaveBeenCalledWith(
        'artifact_123',
        'user_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: { sub: 'user_123', username: 'testuser' },
      };

      const error = new Error('Not starred');
      vi.mocked(artifactService.unstarArtifact).mockRejectedValue(error);

      await artifactController.unstar(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('download', () => {
    it('should track download successfully', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
      };

      vi.mocked(artifactService.trackDownload).mockResolvedValue(undefined);

      await artifactController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.trackDownload).toHaveBeenCalledWith(
        'artifact_123'
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { message: 'Download tracked' },
        200
      );
    });

    it('should work for unauthenticated users', async () => {
      mockRequest = {
        params: { id: 'artifact_123' },
        user: undefined,
      };

      vi.mocked(artifactService.trackDownload).mockResolvedValue(undefined);

      await artifactController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.trackDownload).toHaveBeenCalledWith(
        'artifact_123'
      );
    });

    it('should handle array params', async () => {
      mockRequest = {
        params: { id: ['artifact_123', 'artifact_456'] as any },
      };

      vi.mocked(artifactService.trackDownload).mockResolvedValue(undefined);

      await artifactController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(artifactService.trackDownload).toHaveBeenCalledWith(
        'artifact_123'
      );
    });

    it('should call next on error', async () => {
      mockRequest = {
        params: { id: 'nonexistent' },
      };

      const error = new Error('Artifact not found');
      vi.mocked(artifactService.trackDownload).mockRejectedValue(error);

      await artifactController.download(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
