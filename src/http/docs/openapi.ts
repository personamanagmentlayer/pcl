/**
 * OpenAPI 3.0 Specification for PCL HTTP Registry API
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PCL HTTP Registry API',
    version: '1.0.0',
    description:
      'REST API for remote PCL artifact registry - personas, skills, workflows, and teams',
    contact: {
      name: 'PCL Team',
      url: 'https://github.com/personalayer/pcl',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Local development server',
    },
    {
      url: 'https://api.pcl.dev/v1',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Artifacts',
      description: 'Manage PCL artifacts (personas, skills, workflows, teams)',
    },
    {
      name: 'Versions',
      description: 'Artifact version management',
    },
    {
      name: 'Search',
      description: 'Search and discovery',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description:
          'Create a new user account. Rate limited to 5 requests per 15 minutes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 30,
                    pattern: '^[a-zA-Z0-9_-]+$',
                    example: 'johndoe',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'john@example.com',
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                    example: 'SecurePass123',
                  },
                  fullName: {
                    type: 'string',
                    maxLength: 100,
                    example: 'John Doe',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description:
          'Authenticate user and receive access token. Rate limited to 5 requests per 15 minutes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: {
                    type: 'string',
                    description: 'Username or email',
                    example: 'johndoe',
                  },
                  password: {
                    type: 'string',
                    example: 'SecurePass123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Get authenticated user information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
    },
    '/artifacts': {
      get: {
        tags: ['Artifacts'],
        summary: 'List artifacts',
        description:
          'Get paginated list of artifacts with filtering and sorting. Rate limited to 100 requests per 15 minutes.',
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['persona', 'skill', 'workflow', 'team'],
            },
            description: 'Filter by artifact type',
          },
          {
            name: 'tags',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Comma-separated tags to filter by',
            example: 'python,coding',
          },
          {
            name: 'author',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Filter by author username',
          },
          {
            name: 'search',
            in: 'query',
            schema: {
              type: 'string',
            },
            description: 'Search query',
          },
          {
            name: 'published',
            in: 'query',
            schema: {
              type: 'boolean',
            },
            description: 'Filter by published status',
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'offset',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'createdAt:asc',
                'createdAt:desc',
                'downloads:asc',
                'downloads:desc',
                'stars:asc',
                'stars:desc',
              ],
              default: 'createdAt:desc',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Artifacts retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        artifacts: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/Artifact',
                          },
                        },
                        pagination: {
                          $ref: '#/components/schemas/Pagination',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Artifacts'],
        summary: 'Create artifact',
        description:
          'Create a new artifact. Rate limited to 10 creates per hour.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateArtifact',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Artifact created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/Artifact',
                    },
                  },
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '409': {
            description: 'Artifact with slug already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
        },
      },
    },
    '/artifacts/{id}': {
      get: {
        tags: ['Artifacts'],
        summary: 'Get artifact by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Artifact ID',
          },
        ],
        responses: {
          '200': {
            description: 'Artifact retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/Artifact',
                    },
                  },
                },
              },
            },
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
        },
      },
      put: {
        tags: ['Artifacts'],
        summary: 'Update artifact',
        description: 'Update artifact (requires ownership)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateArtifact',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Artifact updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/Artifact',
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            description: 'Not authorized to update this artifact',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
        },
      },
      delete: {
        tags: ['Artifacts'],
        summary: 'Delete artifact',
        description: 'Delete artifact (requires ownership)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Artifact deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Artifact deleted successfully',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
          '403': {
            description: 'Not authorized to delete this artifact',
          },
          '404': {
            $ref: '#/components/responses/NotFoundError',
          },
        },
      },
    },
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Search artifacts',
        description:
          'Full-text search with fuzzy matching and highlighting. Rate limited to 30 requests per minute.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
            },
            description: 'Search query',
            example: 'python developer',
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['persona', 'skill', 'workflow', 'team'],
            },
          },
          {
            name: 'fuzzy',
            in: 'query',
            schema: {
              type: 'boolean',
            },
            description: 'Enable fuzzy matching',
          },
          {
            name: 'highlight',
            in: 'query',
            schema: {
              type: 'boolean',
              default: true,
            },
            description: 'Highlight matches in results',
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
            },
          },
          {
            name: 'offset',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              artifact: {
                                $ref: '#/components/schemas/Artifact',
                              },
                              score: {
                                type: 'number',
                                minimum: 0,
                                maximum: 1,
                                example: 0.95,
                              },
                              highlights: {
                                type: 'object',
                                additionalProperties: {
                                  type: 'array',
                                  items: { type: 'string' },
                                },
                                example: {
                                  name: ['Expert <em>Python</em> Developer'],
                                  tags: ['<em>python</em>'],
                                },
                              },
                            },
                          },
                        },
                        total: { type: 'integer', example: 42 },
                        query: { type: 'string', example: 'python developer' },
                        took: {
                          type: 'integer',
                          description: 'Search time in milliseconds',
                          example: 15,
                        },
                        pagination: {
                          $ref: '#/components/schemas/Pagination',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
          '429': {
            $ref: '#/components/responses/RateLimitError',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user_1234567890_abcdef' },
          username: { type: 'string', example: 'johndoe' },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
          fullName: { type: 'string', example: 'John Doe' },
          roles: {
            type: 'array',
            items: { type: 'string' },
            example: ['user'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User',
              },
              token: {
                type: 'string',
                description: 'JWT access token',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                description: 'JWT refresh token',
              },
              expiresIn: {
                type: 'integer',
                description: 'Token expiry in seconds',
                example: 3600,
              },
            },
          },
        },
      },
      ArtifactMetadata: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            example: 'Python Expert',
          },
          slug: {
            type: 'string',
            pattern: '^[a-z0-9\\-]+$',
            example: 'python-expert',
          },
          description: {
            type: 'string',
            minLength: 10,
            maxLength: 500,
            example: 'Expert Python developer persona',
          },
          version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            example: '1.0.0',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 10,
            example: ['python', 'coding', 'expert'],
          },
          license: { type: 'string', maxLength: 50, example: 'MIT' },
          repository: {
            type: 'string',
            format: 'uri',
            example: 'https://github.com/user/repo',
          },
          homepage: { type: 'string', format: 'uri' },
          keywords: { type: 'array', items: { type: 'string' }, maxItems: 20 },
        },
        required: ['name', 'description', 'version'],
      },
      Artifact: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'artifact_1234567890_abcdef' },
          type: {
            type: 'string',
            enum: ['persona', 'skill', 'workflow', 'team'],
            example: 'persona',
          },
          metadata: {
            $ref: '#/components/schemas/ArtifactMetadata',
          },
          source: {
            type: 'string',
            description: 'PCL source code',
            example: 'persona PythonExpert { ... }',
          },
          stats: {
            type: 'object',
            properties: {
              downloads: { type: 'integer', example: 42 },
              stars: { type: 'integer', example: 15 },
              views: { type: 'integer', example: 123 },
            },
          },
          published: { type: 'boolean', example: true },
          authorId: { type: 'string', example: 'user_1234567890_abcdef' },
          authorUsername: { type: 'string', example: 'johndoe' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateArtifact: {
        type: 'object',
        required: ['type', 'metadata', 'source'],
        properties: {
          type: {
            type: 'string',
            enum: ['persona', 'skill', 'workflow', 'team'],
          },
          metadata: {
            $ref: '#/components/schemas/ArtifactMetadata',
          },
          source: { type: 'string', minLength: 10, maxLength: 100000 },
          published: { type: 'boolean', default: false },
        },
      },
      UpdateArtifact: {
        type: 'object',
        properties: {
          metadata: {
            type: 'object',
            description: 'Partial metadata update',
          },
          source: { type: 'string', minLength: 10, maxLength: 100000 },
          published: { type: 'boolean' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          offset: { type: 'integer', example: 0 },
          limit: { type: 'integer', example: 20 },
          hasMore: { type: 'boolean', example: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: { type: 'array', items: { type: 'object' } },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                timestamp: '2026-01-23T12:00:00Z',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Resource not found',
                timestamp: '2026-01-23T12:00:00Z',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                ],
                timestamp: '2026-01-23T12:00:00Z',
              },
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        headers: {
          'RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per window',
          },
          'RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests',
          },
          'RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Timestamp when the limit resets',
          },
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message:
                  'Too many requests from this IP, please try again later.',
                timestamp: '2026-01-23T12:00:00Z',
              },
            },
          },
        },
      },
    },
  },
};
