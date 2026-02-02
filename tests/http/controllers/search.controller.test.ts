/**
 * Comprehensive unit tests for Search Controller
 * Tests search endpoints with service layer mocking
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import * as searchController from '../../../src/http/controllers/search.controller.js';
import * as searchService from '../../../src/http/services/search.service.js';
import * as responseUtils from '../../../src/http/utils/response.js';

// Mock dependencies
vi.mock('../../../src/http/services/search.service.js');
vi.mock('../../../src/http/utils/response.js');

describe('Search Controller', () => {
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

  describe('search', () => {
    const mockSearchResults = {
      results: [
        {
          artifact: {
            id: 'artifact_1',
            type: 'persona' as const,
            metadata: {
              name: 'Python Expert',
              description: 'Expert Python developer for coding tasks',
              version: '1.0.0',
              tags: ['python', 'coding'],
            },
            source: 'persona PythonExpert {}',
            stats: { downloads: 50, stars: 20, views: 100 },
            published: true,
            authorId: 'user_1',
            authorUsername: 'pythondev',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          score: 0.95,
          highlights: {
            'metadata.name': ['<mark>Python</mark> Expert'],
            'metadata.description': [
              'Expert <mark>Python</mark> developer for coding tasks',
            ],
          },
        },
      ],
      total: 1,
      query: 'python',
      took: 15,
      pagination: {
        offset: 0,
        limit: 20,
        hasMore: false,
      },
    };

    it('should search artifacts successfully with basic query', async () => {
      mockRequest = {
        query: { q: 'python' },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'python' })
      );
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockSearchResults,
        200
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle search with all query parameters', async () => {
      mockRequest = {
        query: {
          q: 'python expert',
          type: 'persona',
          fuzzy: 'true',
          highlight: 'true',
          limit: '10',
          offset: '5',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockSearchResults,
        200
      );
    });

    it('should handle search with fuzzy matching enabled', async () => {
      mockRequest = {
        query: {
          q: 'pythno', // Typo
          fuzzy: 'true',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should handle search with fuzzy matching disabled', async () => {
      mockRequest = {
        query: {
          q: 'python',
          fuzzy: 'false',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should handle search with highlighting disabled', async () => {
      mockRequest = {
        query: {
          q: 'python',
          highlight: 'false',
        },
      };

      const resultsWithoutHighlights = {
        ...mockSearchResults,
        results: mockSearchResults.results.map((r) => ({
          ...r,
          highlights: undefined,
        })),
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        resultsWithoutHighlights
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      mockRequest = {
        query: {
          q: 'testing',
          type: 'skill',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      mockRequest = {
        query: {
          q: 'python',
          limit: '50',
          offset: '10',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should use default values for optional parameters', async () => {
      mockRequest = {
        query: {
          q: 'test',
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should return validation error for missing query', async () => {
      mockRequest = {
        query: {},
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
      expect(searchService.searchArtifacts).not.toHaveBeenCalled();
    });

    it('should return validation error for empty query', async () => {
      mockRequest = {
        query: { q: '' },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should return validation error for too long query', async () => {
      mockRequest = {
        query: { q: 'x'.repeat(201) }, // Over 200 chars
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should return validation error for invalid type', async () => {
      mockRequest = {
        query: {
          q: 'test',
          type: 'invalid_type',
        },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should return validation error for invalid limit', async () => {
      mockRequest = {
        query: {
          q: 'test',
          limit: 'not-a-number',
        },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should return validation error for negative offset', async () => {
      mockRequest = {
        query: {
          q: 'test',
          offset: '-5',
        },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should return validation error for limit exceeding max', async () => {
      mockRequest = {
        query: {
          q: 'test',
          limit: '100', // Max is 50
        },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
    });

    it('should map validation errors with proper field paths', async () => {
      mockRequest = {
        query: {
          q: '',
          type: 'bad',
        },
      };

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendValidationError).toHaveBeenCalled();
      const call = vi.mocked(responseUtils.sendValidationError).mock.calls[0];
      expect(call[1]).toBeInstanceOf(Array);
    });

    it('should handle empty search results', async () => {
      mockRequest = {
        query: { q: 'nonexistent-term-xyz' },
      };

      const emptyResults = {
        results: [],
        total: 0,
        query: 'nonexistent-term-xyz',
        took: 5,
        pagination: {
          offset: 0,
          limit: 20,
          hasMore: false,
        },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(emptyResults);

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        emptyResults,
        200
      );
    });

    it('should handle search service errors', async () => {
      mockRequest = {
        query: { q: 'test' },
      };

      const searchError = new Error('Search index unavailable');
      vi.mocked(searchService.searchArtifacts).mockRejectedValue(searchError);

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(searchError);
    });

    it('should work for all artifact types', async () => {
      const types = ['persona', 'skill', 'workflow', 'team'] as const;

      for (const type of types) {
        vi.clearAllMocks();
        mockRequest = {
          query: { q: 'test', type },
        };

        vi.mocked(searchService.searchArtifacts).mockResolvedValue(
          mockSearchResults
        );

        await searchController.search(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(searchService.searchArtifacts).toHaveBeenCalled();
      }
    });

    it('should handle special characters in query', async () => {
      mockRequest = {
        query: { q: 'test@#$%^&*()' },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should handle unicode characters in query', async () => {
      mockRequest = {
        query: { q: 'Python 中文 日本語' },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });

    it('should handle multi-word queries', async () => {
      mockRequest = {
        query: { q: 'advanced python machine learning expert' },
      };

      vi.mocked(searchService.searchArtifacts).mockResolvedValue(
        mockSearchResults
      );

      await searchController.search(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.searchArtifacts).toHaveBeenCalled();
    });
  });

  describe('suggestions', () => {
    const mockSuggestions = {
      suggestions: ['python', 'python expert', 'python developer'],
      query: 'pyth',
    };

    it('should get search suggestions successfully', async () => {
      mockRequest = {
        query: { q: 'pyth' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue(
        mockSuggestions
      );

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith('pyth');
      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        mockSuggestions,
        200
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle single character query', async () => {
      mockRequest = {
        query: { q: 'p' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: ['python', 'pandas', 'pytorch'],
        query: 'p',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith('p');
    });

    it('should handle full word query', async () => {
      mockRequest = {
        query: { q: 'python' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: ['python expert', 'python developer', 'python ai'],
        query: 'python',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith('python');
    });

    it('should return empty suggestions for empty query', async () => {
      mockRequest = {
        query: { q: '' },
      };

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { suggestions: [], query: '' },
        200
      );
      expect(searchService.getSearchSuggestions).not.toHaveBeenCalled();
    });

    it('should return empty suggestions for missing query', async () => {
      mockRequest = {
        query: {},
      };

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { suggestions: [], query: '' },
        200
      );
      expect(searchService.getSearchSuggestions).not.toHaveBeenCalled();
    });

    it('should return empty suggestions for undefined query', async () => {
      mockRequest = {
        query: { q: undefined },
      };

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { suggestions: [], query: '' },
        200
      );
      expect(searchService.getSearchSuggestions).not.toHaveBeenCalled();
    });

    it('should handle empty suggestions result', async () => {
      mockRequest = {
        query: { q: 'zzznonexistent' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: [],
        query: 'zzznonexistent',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseUtils.sendSuccess).toHaveBeenCalledWith(
        mockResponse,
        { suggestions: [], query: 'zzznonexistent' },
        200
      );
    });

    it('should handle service errors', async () => {
      mockRequest = {
        query: { q: 'test' },
      };

      const error = new Error('Suggestion service unavailable');
      vi.mocked(searchService.getSearchSuggestions).mockRejectedValue(error);

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle special characters in suggestion query', async () => {
      mockRequest = {
        query: { q: 'test@#' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: [],
        query: 'test@#',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith('test@#');
    });

    it('should handle unicode in suggestion query', async () => {
      mockRequest = {
        query: { q: '中文' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: ['中文编程', '中文AI'],
        query: '中文',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith('中文');
    });

    it('should handle whitespace in query', async () => {
      mockRequest = {
        query: { q: '  python  ' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: ['python expert'],
        query: '  python  ',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith(
        '  python  '
      );
    });

    it('should handle very long suggestion queries', async () => {
      const longQuery = 'a'.repeat(200);
      mockRequest = {
        query: { q: longQuery },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: [],
        query: longQuery,
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith(
        longQuery
      );
    });

    it('should handle query with multiple words', async () => {
      mockRequest = {
        query: { q: 'python machine learning' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue({
        suggestions: [
          'python machine learning expert',
          'python machine learning tutorial',
        ],
        query: 'python machine learning',
      });

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith(
        'python machine learning'
      );
    });

    it('should not validate query parameter (suggestions endpoint has no schema validation)', async () => {
      mockRequest = {
        query: { q: 'any-value-is-accepted' },
      };

      vi.mocked(searchService.getSearchSuggestions).mockResolvedValue(
        mockSuggestions
      );

      await searchController.suggestions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(searchService.getSearchSuggestions).toHaveBeenCalled();
      expect(responseUtils.sendValidationError).not.toHaveBeenCalled();
    });
  });
});
