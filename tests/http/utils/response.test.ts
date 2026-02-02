/**
 * Tests for HTTP response helper utilities
 */

import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
} from '../../../src/http/utils/response';
import type { Response } from 'express';
import type { APISuccess, APIError } from '../../../src/http/types/response';

describe('Response Utils', () => {
  let mockResponse: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
  });

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: '123', name: 'Test' };
      sendSuccess(mockResponse as Response, data);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should support custom status code', () => {
      const data = { created: true };
      sendSuccess(mockResponse as Response, data, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should handle null data', () => {
      sendSuccess(mockResponse as Response, null);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      sendSuccess(mockResponse as Response, data);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should handle string data', () => {
      const data = 'Operation successful';
      sendSuccess(mockResponse as Response, data);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it('should handle boolean data', () => {
      sendSuccess(mockResponse as Response, true);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: true,
      });
    });

    it('should use 200 as default status code', () => {
      sendSuccess(mockResponse as Response, {});

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('sendError', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send error response with code and message', () => {
      sendError(mockResponse as Response, 'TEST_ERROR', 'Something went wrong');

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Something went wrong',
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should support custom status code', () => {
      sendError(mockResponse as Response, 'CUSTOM_ERROR', 'Custom error', 418);

      expect(statusMock).toHaveBeenCalledWith(418);
    });

    it('should include validation details if provided', () => {
      const details = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      sendError(
        mockResponse as Response,
        'VALIDATION',
        'Invalid input',
        400,
        details
      );

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.details).toEqual(details);
    });

    it('should use 500 as default status code', () => {
      sendError(mockResponse as Response, 'ERROR', 'Error message');

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should include timestamp in ISO format', () => {
      sendError(mockResponse as Response, 'ERROR', 'Message');

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.timestamp).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should handle empty details array', () => {
      sendError(mockResponse as Response, 'ERROR', 'Message', 400, []);

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.details).toEqual([]);
    });
  });

  describe('sendValidationError', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send validation error with 400 status', () => {
      const errors = [{ field: 'email', message: 'Required' }];
      sendValidationError(mockResponse as Response, errors);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors,
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should handle multiple validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid format' },
        { field: 'password', message: 'Too short' },
        { field: 'username', message: 'Already taken' },
      ];

      sendValidationError(mockResponse as Response, errors);

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.details).toEqual(errors);
    });

    it('should handle errors without field names', () => {
      const errors = [{ message: 'General validation error' }];
      sendValidationError(mockResponse as Response, errors);

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.details).toEqual(errors);
    });
  });

  describe('sendUnauthorized', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send 401 unauthorized error', () => {
      sendUnauthorized(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should support custom message', () => {
      sendUnauthorized(mockResponse as Response, 'Invalid credentials');

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.message).toBe('Invalid credentials');
    });
  });

  describe('sendForbidden', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send 403 forbidden error', () => {
      sendForbidden(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Forbidden',
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should support custom message', () => {
      sendForbidden(mockResponse as Response, 'Insufficient permissions');

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.message).toBe('Insufficient permissions');
    });
  });

  describe('sendNotFound', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send 404 not found error', () => {
      sendNotFound(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should support custom message', () => {
      sendNotFound(mockResponse as Response, 'User not found');

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.message).toBe('User not found');
    });
  });

  describe('sendConflict', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should send 409 conflict error', () => {
      sendConflict(mockResponse as Response, 'Resource already exists');

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
          timestamp: '2024-01-01T12:00:00.000Z',
        },
      });
    });

    it('should handle duplicate email scenario', () => {
      sendConflict(mockResponse as Response, 'Email already registered');

      const call = jsonMock.mock.calls[0][0] as APIError;
      expect(call.error.message).toBe('Email already registered');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle typical REST API success flow', () => {
      // GET request
      sendSuccess(mockResponse as Response, { users: [] });
      expect(statusMock).toHaveBeenCalledWith(200);

      // POST request (created)
      sendSuccess(mockResponse as Response, { id: 'new-id' }, 201);
      expect(statusMock).toHaveBeenCalledWith(201);

      // DELETE request (no content)
      sendSuccess(mockResponse as Response, null, 204);
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it('should handle typical error flow', () => {
      // Validation error
      sendValidationError(mockResponse as Response, [
        { field: 'email', message: 'Required' },
      ]);
      expect(statusMock).toHaveBeenCalledWith(400);

      // Unauthorized
      sendUnauthorized(mockResponse as Response);
      expect(statusMock).toHaveBeenCalledWith(401);

      // Not found
      sendNotFound(mockResponse as Response, 'User not found');
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should maintain response structure consistency', () => {
      // All error responses should have same structure
      const responses: APIError[] = [];

      sendError(mockResponse as Response, 'ERR1', 'Message 1', 400);
      responses.push(jsonMock.mock.calls[0][0]);

      sendValidationError(mockResponse as Response, []);
      responses.push(jsonMock.mock.calls[1][0]);

      sendUnauthorized(mockResponse as Response);
      responses.push(jsonMock.mock.calls[2][0]);

      // All should have success: false and error object
      responses.forEach((response) => {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        expect(response.error.code).toBeDefined();
        expect(response.error.message).toBeDefined();
        expect(response.error.timestamp).toBeDefined();
      });
    });
  });
});
