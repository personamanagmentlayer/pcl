/**
 * Comprehensive tests for HTTP schemas (artifact, search, version, auth)
 */

import {
  ArtifactTypeSchema,
  ArtifactMetadataSchema,
  ArtifactStatsSchema,
  CreateArtifactSchema,
  UpdateArtifactSchema,
  ArtifactResponseSchema,
  ListArtifactsQuerySchema,
  ListArtifactsResponseSchema,
  StarResponseSchema,
} from '../../../src/http/schemas/artifact.schema';

import {
  SearchQuerySchema,
  SearchHighlightSchema,
  SearchResultSchema,
  SearchResponseSchema,
  SearchSuggestionsSchema,
} from '../../../src/http/schemas/search.schema';

import {
  SemverSchema,
  VersionMetadataSchema,
  CreateVersionSchema,
  UpdateVersionSchema,
  VersionResponseSchema,
  ListVersionsResponseSchema,
  VersionComparisonSchema,
} from '../../../src/http/schemas/version.schema';

import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  UserResponseSchema,
  AuthResponseSchema,
} from '../../../src/http/schemas/auth.schema';

describe('Artifact Schemas', () => {
  describe('ArtifactTypeSchema', () => {
    it('should accept valid artifact types', () => {
      expect(ArtifactTypeSchema.parse('persona')).toBe('persona');
      expect(ArtifactTypeSchema.parse('skill')).toBe('skill');
      expect(ArtifactTypeSchema.parse('workflow')).toBe('workflow');
      expect(ArtifactTypeSchema.parse('team')).toBe('team');
    });

    it('should reject invalid types', () => {
      expect(() => ArtifactTypeSchema.parse('invalid')).toThrow();
      expect(() => ArtifactTypeSchema.parse('Persona')).toThrow();
      expect(() => ArtifactTypeSchema.parse('')).toThrow();
    });
  });

  describe('ArtifactMetadataSchema', () => {
    const validMetadata = {
      name: 'Test Artifact',
      description: 'This is a test artifact with valid description',
      version: '1.0.0',
    };

    it('should accept valid metadata', () => {
      const result = ArtifactMetadataSchema.parse(validMetadata);
      expect(result.name).toBe('Test Artifact');
      expect(result.tags).toEqual([]);
    });

    it('should reject name that is too short', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, name: '' })
      ).toThrow('Name is required');
    });

    it('should reject name that is too long', () => {
      const longName = 'a'.repeat(101);
      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, name: longName })
      ).toThrow('Name must be at most 100 characters');
    });

    it('should reject name with invalid characters', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          name: 'Test@Artifact!',
        })
      ).toThrow(
        'Name can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    });

    it('should accept valid slug', () => {
      const result = ArtifactMetadataSchema.parse({
        ...validMetadata,
        slug: 'test-artifact-123',
      });
      expect(result.slug).toBe('test-artifact-123');
    });

    it('should reject uppercase slug', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          slug: 'Test-Artifact',
        })
      ).toThrow('Slug must be lowercase with hyphens only');
    });

    it('should reject slug with underscores', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          slug: 'test_artifact',
        })
      ).toThrow();
    });

    it('should reject description that is too short', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, description: 'short' })
      ).toThrow('Description must be at least 10 characters');
    });

    it('should reject description that is too long', () => {
      const longDesc = 'a'.repeat(501);
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          description: longDesc,
        })
      ).toThrow('Description must be at most 500 characters');
    });

    it('should reject invalid semver format', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, version: '1.0' })
      ).toThrow('Version must be in semver format');

      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, version: 'v1.0.0' })
      ).toThrow();

      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          version: '1.0.0-alpha',
        })
      ).toThrow();
    });

    it('should accept valid tags', () => {
      const result = ArtifactMetadataSchema.parse({
        ...validMetadata,
        tags: ['ai', 'helper', 'productivity'],
      });
      expect(result.tags).toEqual(['ai', 'helper', 'productivity']);
    });

    it('should default tags to empty array', () => {
      const result = ArtifactMetadataSchema.parse(validMetadata);
      expect(result.tags).toEqual([]);
    });

    it('should reject more than 10 tags', () => {
      const manyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      expect(() =>
        ArtifactMetadataSchema.parse({ ...validMetadata, tags: manyTags })
      ).toThrow('Maximum 10 tags allowed');
    });

    it('should reject tags that are too long', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          tags: ['a'.repeat(51)],
        })
      ).toThrow();
    });

    it('should accept valid URLs for repository and homepage', () => {
      const result = ArtifactMetadataSchema.parse({
        ...validMetadata,
        repository: 'https://github.com/user/repo',
        homepage: 'https://example.com',
      });
      expect(result.repository).toBe('https://github.com/user/repo');
      expect(result.homepage).toBe('https://example.com');
    });

    it('should reject invalid URLs', () => {
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          repository: 'not-a-url',
        })
      ).toThrow('Repository must be a valid URL');
    });

    it('should accept valid keywords', () => {
      const result = ArtifactMetadataSchema.parse({
        ...validMetadata,
        keywords: ['typescript', 'ai', 'automation'],
      });
      expect(result.keywords).toEqual(['typescript', 'ai', 'automation']);
    });

    it('should reject more than 20 keywords', () => {
      const manyKeywords = Array.from({ length: 21 }, (_, i) => `kw${i}`);
      expect(() =>
        ArtifactMetadataSchema.parse({
          ...validMetadata,
          keywords: manyKeywords,
        })
      ).toThrow('Maximum 20 keywords allowed');
    });
  });

  describe('ArtifactStatsSchema', () => {
    it('should accept valid stats', () => {
      const stats = { downloads: 100, stars: 50, views: 1000 };
      const result = ArtifactStatsSchema.parse(stats);
      expect(result).toEqual(stats);
    });

    it('should default to zero', () => {
      const result = ArtifactStatsSchema.parse({});
      expect(result).toEqual({ downloads: 0, stars: 0, views: 0 });
    });

    it('should reject negative numbers', () => {
      expect(() => ArtifactStatsSchema.parse({ downloads: -1 })).toThrow();
      expect(() => ArtifactStatsSchema.parse({ stars: -10 })).toThrow();
      expect(() => ArtifactStatsSchema.parse({ views: -100 })).toThrow();
    });

    it('should reject non-integer values', () => {
      expect(() => ArtifactStatsSchema.parse({ downloads: 10.5 })).toThrow();
    });
  });

  describe('CreateArtifactSchema', () => {
    const validArtifact = {
      type: 'persona' as const,
      metadata: {
        name: 'Test Persona',
        description: 'A test persona for validation',
        version: '1.0.0',
      },
      source: 'persona TestPersona { instructions: "Test instructions here" }',
    };

    it('should accept valid artifact creation', () => {
      const result = CreateArtifactSchema.parse(validArtifact);
      expect(result.type).toBe('persona');
      expect(result.published).toBe(false);
    });

    it('should reject source that is too short', () => {
      expect(() =>
        CreateArtifactSchema.parse({ ...validArtifact, source: 'short' })
      ).toThrow('Source code must be at least 10 characters');
    });

    it('should reject source that is too large', () => {
      const largeSource = 'a'.repeat(100001);
      expect(() =>
        CreateArtifactSchema.parse({ ...validArtifact, source: largeSource })
      ).toThrow('Source code must be at most 100KB');
    });

    it('should accept published flag', () => {
      const result = CreateArtifactSchema.parse({
        ...validArtifact,
        published: true,
      });
      expect(result.published).toBe(true);
    });
  });

  describe('UpdateArtifactSchema', () => {
    it('should accept partial metadata updates', () => {
      const update = {
        metadata: { name: 'Updated Name' },
      };
      const result = UpdateArtifactSchema.parse(update);
      expect(result.metadata?.name).toBe('Updated Name');
    });

    it('should accept source updates', () => {
      const update = { source: 'persona Updated { instructions: "Updated" }' };
      const result = UpdateArtifactSchema.parse(update);
      expect(result.source).toBeTruthy();
    });

    it('should accept empty updates', () => {
      const result = UpdateArtifactSchema.parse({});
      expect(result).toEqual({});
    });

    it('should reject invalid source length', () => {
      expect(() => UpdateArtifactSchema.parse({ source: 'short' })).toThrow();
    });
  });

  describe('ListArtifactsQuerySchema', () => {
    it.skip('should parse query with defaults', () => {
      const result = ListArtifactsQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.sort).toBe('createdAt:desc');
    });

    it('should parse type filter', () => {
      const result = ListArtifactsQuerySchema.parse({ type: 'persona' });
      expect(result.type).toBe('persona');
    });

    it('should parse tags as string', () => {
      const result = ListArtifactsQuerySchema.parse({ tags: 'ai,helper' });
      expect(result.tags).toBe('ai,helper');
    });

    it('should transform published to boolean', () => {
      const result1 = ListArtifactsQuerySchema.parse({ published: 'true' });
      expect(result1.published).toBe(true);

      const result2 = ListArtifactsQuerySchema.parse({ published: 'false' });
      expect(result2.published).toBe(false);
    });

    it('should transform and validate limit', () => {
      const result = ListArtifactsQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('should reject limit above max', () => {
      expect(() => ListArtifactsQuerySchema.parse({ limit: '101' })).toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => ListArtifactsQuerySchema.parse({ offset: '-1' })).toThrow();
    });

    it('should accept valid sort options', () => {
      const sorts = [
        'createdAt:asc',
        'createdAt:desc',
        'downloads:asc',
        'downloads:desc',
        'stars:asc',
        'stars:desc',
      ];

      sorts.forEach((sort) => {
        const result = ListArtifactsQuerySchema.parse({ sort });
        expect(result.sort).toBe(sort);
      });
    });

    it('should reject invalid sort option', () => {
      expect(() =>
        ListArtifactsQuerySchema.parse({ sort: 'invalid:asc' })
      ).toThrow();
    });
  });
});

describe('Search Schemas', () => {
  describe('SearchQuerySchema', () => {
    it('should accept valid search query', () => {
      const result = SearchQuerySchema.parse({ q: 'test query' });
      expect(result.q).toBe('test query');
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.highlight).toBe(true);
    });

    it('should reject empty query', () => {
      expect(() => SearchQuerySchema.parse({ q: '' })).toThrow(
        'Query is required'
      );
    });

    it('should reject query that is too long', () => {
      const longQuery = 'a'.repeat(201);
      expect(() => SearchQuerySchema.parse({ q: longQuery })).toThrow(
        'Query must be at most 200 characters'
      );
    });

    it('should parse type filter', () => {
      const result = SearchQuerySchema.parse({ q: 'test', type: 'skill' });
      expect(result.type).toBe('skill');
    });

    it('should transform fuzzy to boolean', () => {
      const result1 = SearchQuerySchema.parse({ q: 'test', fuzzy: 'true' });
      expect(result1.fuzzy).toBe(true);

      const result2 = SearchQuerySchema.parse({ q: 'test', fuzzy: 'false' });
      expect(result2.fuzzy).toBe(false);
    });

    it('should default highlight to true', () => {
      const result = SearchQuerySchema.parse({ q: 'test' });
      expect(result.highlight).toBe(true);
    });

    it('should transform highlight to boolean', () => {
      const result = SearchQuerySchema.parse({ q: 'test', highlight: 'false' });
      expect(result.highlight).toBe(false);
    });

    it('should validate and transform limit', () => {
      const result = SearchQuerySchema.parse({ q: 'test', limit: '30' });
      expect(result.limit).toBe(30);
    });

    it('should reject limit above 50', () => {
      expect(() =>
        SearchQuerySchema.parse({ q: 'test', limit: '51' })
      ).toThrow();
    });
  });

  describe('SearchResultSchema', () => {
    const validArtifact = {
      id: 'art-123',
      type: 'persona' as const,
      metadata: {
        name: 'Test',
        description: 'Test description here',
        version: '1.0.0',
        tags: [],
      },
      source: 'persona Test {}',
      stats: { downloads: 0, stars: 0, views: 0 },
      published: true,
      authorId: 'user-123',
      authorUsername: 'testuser',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should accept valid search result', () => {
      const result = SearchResultSchema.parse({
        artifact: validArtifact,
        score: 0.95,
      });
      expect(result.score).toBe(0.95);
    });

    it('should reject score below 0', () => {
      expect(() =>
        SearchResultSchema.parse({ artifact: validArtifact, score: -0.1 })
      ).toThrow();
    });

    it('should reject score above 1', () => {
      expect(() =>
        SearchResultSchema.parse({ artifact: validArtifact, score: 1.1 })
      ).toThrow();
    });

    it('should accept highlights', () => {
      const highlights = {
        name: ['<mark>Test</mark>'],
        description: ['<mark>Test</mark> description'],
      };
      const result = SearchResultSchema.parse({
        artifact: validArtifact,
        score: 0.8,
        highlights,
      });
      expect(result.highlights).toEqual(highlights);
    });
  });

  describe('SearchResponseSchema', () => {
    it('should accept valid search response', () => {
      const response = {
        results: [],
        total: 0,
        query: 'test',
        took: 15,
        pagination: {
          offset: 0,
          limit: 20,
          hasMore: false,
        },
      };
      const result = SearchResponseSchema.parse(response);
      expect(result.total).toBe(0);
      expect(result.took).toBe(15);
    });

    it('should reject negative total', () => {
      expect(() =>
        SearchResponseSchema.parse({
          results: [],
          total: -1,
          query: 'test',
          took: 10,
          pagination: { offset: 0, limit: 20, hasMore: false },
        })
      ).toThrow();
    });

    it('should reject negative took time', () => {
      expect(() =>
        SearchResponseSchema.parse({
          results: [],
          total: 0,
          query: 'test',
          took: -5,
          pagination: { offset: 0, limit: 20, hasMore: false },
        })
      ).toThrow();
    });
  });

  describe('SearchSuggestionsSchema', () => {
    it('should accept valid suggestions', () => {
      const result = SearchSuggestionsSchema.parse({
        suggestions: ['persona', 'personal', 'personality'],
        query: 'perso',
      });
      expect(result.suggestions).toHaveLength(3);
    });

    it('should accept empty suggestions', () => {
      const result = SearchSuggestionsSchema.parse({
        suggestions: [],
        query: 'xyz',
      });
      expect(result.suggestions).toEqual([]);
    });
  });
});

describe('Version Schemas', () => {
  describe('SemverSchema', () => {
    it('should accept valid semver', () => {
      expect(SemverSchema.parse('1.0.0')).toBe('1.0.0');
      expect(SemverSchema.parse('0.1.0')).toBe('0.1.0');
      expect(SemverSchema.parse('10.20.30')).toBe('10.20.30');
    });

    it('should reject invalid semver', () => {
      expect(() => SemverSchema.parse('1.0')).toThrow();
      expect(() => SemverSchema.parse('v1.0.0')).toThrow();
      expect(() => SemverSchema.parse('1.0.0-alpha')).toThrow();
      expect(() => SemverSchema.parse('1.0.0+build')).toThrow();
    });
  });

  describe('VersionMetadataSchema', () => {
    it('should accept valid metadata', () => {
      const result = VersionMetadataSchema.parse({
        changelog: 'Fixed bugs',
        breaking: true,
      });
      expect(result.breaking).toBe(true);
      expect(result.deprecated).toBe(false);
    });

    it('should default breaking to false', () => {
      const result = VersionMetadataSchema.parse({});
      expect(result.breaking).toBe(false);
    });

    it('should reject changelog that is too long', () => {
      const longChangelog = 'a'.repeat(2001);
      expect(() =>
        VersionMetadataSchema.parse({ changelog: longChangelog })
      ).toThrow('Changelog must be at most 2000 characters');
    });

    it('should accept deprecation message', () => {
      const result = VersionMetadataSchema.parse({
        deprecated: true,
        deprecationMessage: 'Use v2.0.0 instead',
      });
      expect(result.deprecationMessage).toBe('Use v2.0.0 instead');
    });

    it('should reject deprecation message that is too long', () => {
      const longMessage = 'a'.repeat(501);
      expect(() =>
        VersionMetadataSchema.parse({ deprecationMessage: longMessage })
      ).toThrow('Deprecation message must be at most 500 characters');
    });
  });

  describe('CreateVersionSchema', () => {
    const validVersion = {
      version: '2.0.0',
      source: 'persona Updated { instructions: "Version 2.0" }',
    };

    it('should accept valid version creation', () => {
      const result = CreateVersionSchema.parse(validVersion);
      expect(result.version).toBe('2.0.0');
      expect(result.published).toBe(false);
    });

    it('should accept metadata', () => {
      const result = CreateVersionSchema.parse({
        ...validVersion,
        metadata: { breaking: true, changelog: 'Major update' },
      });
      expect(result.metadata?.breaking).toBe(true);
    });

    it('should reject invalid semver', () => {
      expect(() =>
        CreateVersionSchema.parse({ ...validVersion, version: '2.0' })
      ).toThrow();
    });

    it('should reject short source', () => {
      expect(() =>
        CreateVersionSchema.parse({ ...validVersion, source: 'short' })
      ).toThrow();
    });
  });

  describe('VersionComparisonSchema', () => {
    it('should accept valid comparison', () => {
      const result = VersionComparisonSchema.parse({
        isNewer: true,
        isMajor: true,
        isMinor: false,
        isPatch: false,
        diff: { major: 1, minor: 0, patch: 0 },
      });
      expect(result.isNewer).toBe(true);
      expect(result.isMajor).toBe(true);
    });

    it.skip('should reject negative diff values', () => {
      expect(() =>
        VersionComparisonSchema.parse({
          isNewer: false,
          isMajor: false,
          isMinor: false,
          isPatch: false,
          diff: { major: -1, minor: 0, patch: 0 },
        })
      ).toThrow();
    });
  });
});

describe('Auth Schemas', () => {
  describe('RegisterSchema', () => {
    const validRegister = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123',
    };

    it('should accept valid registration', () => {
      const result = RegisterSchema.parse(validRegister);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should accept full name', () => {
      const result = RegisterSchema.parse({
        ...validRegister,
        fullName: 'Test User',
      });
      expect(result.fullName).toBe('Test User');
    });

    it('should reject username that is too short', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, username: 'ab' })
      ).toThrow('Username must be at least 3 characters');
    });

    it('should reject username that is too long', () => {
      const longUsername = 'a'.repeat(51);
      expect(() =>
        RegisterSchema.parse({ ...validRegister, username: longUsername })
      ).toThrow('Username must be at most 50 characters');
    });

    it('should reject username with invalid characters', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, username: 'test@user' })
      ).toThrow(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('should accept username with hyphens and underscores', () => {
      const result = RegisterSchema.parse({
        ...validRegister,
        username: 'test_user-123',
      });
      expect(result.username).toBe('test_user-123');
    });

    it('should reject invalid email', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, email: 'not-an-email' })
      ).toThrow('Invalid email address');
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() =>
        RegisterSchema.parse({ ...validRegister, email: longEmail })
      ).toThrow('Email must be at most 255 characters');
    });

    it('should reject password that is too short', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, password: 'Short1' })
      ).toThrow('Password must be at least 8 characters');
    });

    it.skip('should reject password without lowercase', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, password: 'ALLUPPERCASE123' })
      ).toThrow('Password must contain at least one lowercase letter');
    });

    it.skip('should reject password without uppercase', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, password: 'alllowercase123' })
      ).toThrow('Password must contain at least one uppercase letter');
    });

    it.skip('should reject password without number', () => {
      expect(() =>
        RegisterSchema.parse({ ...validRegister, password: 'NoNumbersHere' })
      ).toThrow('Password must contain at least one number');
    });

    it('should accept password with special characters', () => {
      const result = RegisterSchema.parse({
        ...validRegister,
        password: 'Secure!Pass123',
      });
      expect(result.password).toBe('Secure!Pass123');
    });
  });

  describe('LoginSchema', () => {
    it('should accept valid login', () => {
      const result = LoginSchema.parse({
        username: 'testuser',
        password: 'password',
      });
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('password');
    });

    it('should reject empty username', () => {
      expect(() =>
        LoginSchema.parse({ username: '', password: 'password' })
      ).toThrow('Username is required');
    });

    it('should reject empty password', () => {
      expect(() =>
        LoginSchema.parse({ username: 'user', password: '' })
      ).toThrow('Password is required');
    });
  });

  describe('RefreshTokenSchema', () => {
    it('should accept valid refresh token', () => {
      const result = RefreshTokenSchema.parse({
        refreshToken: 'valid-token-here',
      });
      expect(result.refreshToken).toBe('valid-token-here');
    });

    it('should reject empty refresh token', () => {
      expect(() => RefreshTokenSchema.parse({ refreshToken: '' })).toThrow(
        'Refresh token is required'
      );
    });
  });

  describe('UserResponseSchema', () => {
    const validUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should accept valid user response', () => {
      const result = UserResponseSchema.parse(validUser);
      expect(result.username).toBe('testuser');
    });

    it('should accept optional fields', () => {
      const result = UserResponseSchema.parse({
        ...validUser,
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        website: 'https://example.com',
        githubUsername: 'testuser',
      });
      expect(result.fullName).toBe('Test User');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should reject invalid email', () => {
      expect(() =>
        UserResponseSchema.parse({ ...validUser, email: 'invalid' })
      ).toThrow();
    });

    it('should reject invalid URL for avatarUrl', () => {
      expect(() =>
        UserResponseSchema.parse({ ...validUser, avatarUrl: 'not-a-url' })
      ).toThrow();
    });

    it('should reject invalid datetime', () => {
      expect(() =>
        UserResponseSchema.parse({ ...validUser, createdAt: 'invalid-date' })
      ).toThrow();
    });
  });

  describe('AuthResponseSchema', () => {
    const validUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should accept valid auth response', () => {
      const result = AuthResponseSchema.parse({
        user: validUser,
        token: 'jwt-token-here',
        expiresIn: 3600,
      });
      expect(result.token).toBe('jwt-token-here');
      expect(result.expiresIn).toBe(3600);
    });

    it('should accept refresh token', () => {
      const result = AuthResponseSchema.parse({
        user: validUser,
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should reject missing required fields', () => {
      expect(() =>
        AuthResponseSchema.parse({
          user: validUser,
          token: 'token',
          // Missing expiresIn
        })
      ).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should validate complete registration flow', () => {
      // 1. Validate registration input
      const registerData = RegisterSchema.parse({
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123',
        fullName: 'New User',
      });

      expect(registerData.username).toBe('newuser');

      // 2. Validate auth response
      const authResponse = AuthResponseSchema.parse({
        user: {
          id: 'user-new',
          username: registerData.username,
          email: registerData.email,
          fullName: registerData.fullName,
          roles: ['user'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });

      expect(authResponse.user.username).toBe('newuser');
    });

    it('should validate complete login flow', () => {
      // 1. Validate login input
      const loginData = LoginSchema.parse({
        username: 'existinguser',
        password: 'password123',
      });

      expect(loginData.username).toBe('existinguser');

      // 2. Validate auth response
      const authResponse = AuthResponseSchema.parse({
        user: {
          id: 'user-existing',
          username: loginData.username,
          email: 'existing@example.com',
          roles: ['user', 'admin'],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });

      expect(authResponse.user.roles).toContain('admin');
    });
  });
});
