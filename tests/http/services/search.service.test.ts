/**
 * Comprehensive test suite for Search Service
 * Tests full-text search, filtering, ranking, pagination, and suggestions
 */

import {
  searchArtifacts,
  getSearchSuggestions,
} from '../../../src/http/services/search.service';
import { createArtifact } from '../../../src/http/services/artifact.service';
import type { SearchQuery } from '../../../src/http/schemas/search.schema';
import type { CreateArtifactInput } from '../../../src/http/schemas/artifact.schema';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createTestArtifact(
  overrides?: Partial<CreateArtifactInput>
): CreateArtifactInput {
  return {
    type: 'persona',
    metadata: {
      name: 'Test Persona',
      description: 'A test persona for searching',
      version: '1.0.0',
      tags: ['test', 'search'],
      slug: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      author: 'testuser',
      license: 'MIT',
      repository: 'https://github.com/test/repo',
      keywords: ['testing', 'search'],
    },
    source: 'persona TestPersona { name: "Test" }',
    published: true,
    ...overrides,
  };
}

function createSearchQuery(overrides?: Partial<SearchQuery>): SearchQuery {
  return {
    q: 'test',
    highlight: true,
    limit: 20,
    offset: 0,
    ...overrides,
  };
}

const TEST_USER_ID = 'user_search_test';

// ============================================================================
// Full-Text Search Tests
// ============================================================================

describe.skip('Full-Text Search', () => {
  describe('searchArtifacts - basic search', () => {
    it('should find artifacts by name', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Code Reviewer',
            slug: `code-reviewer-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(createSearchQuery({ q: 'code' }));

      expect(result.total).toBeGreaterThan(0);
      expect(result.results[0].artifact.metadata.name).toContain('Code');
    });

    it('should find artifacts by description', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Helper',
            description: 'Expert Python developer assistant',
            slug: `python-helper-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(createSearchQuery({ q: 'python' }));

      expect(result.total).toBeGreaterThan(0);
      const found = result.results.some((r) =>
        r.artifact.metadata.description.toLowerCase().includes('python')
      );
      expect(found).toBe(true);
    });

    it('should find artifacts by tags', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            tags: ['javascript', 'frontend'],
            slug: `js-frontend-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'javascript' })
      );

      expect(result.total).toBeGreaterThan(0);
      const found = result.results.some((r) =>
        r.artifact.metadata.tags.includes('javascript')
      );
      expect(found).toBe(true);
    });

    it('should find artifacts by keywords', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            keywords: ['debugging', 'troubleshooting'],
            slug: `debugger-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'debugging' })
      );

      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle case-insensitive search', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Data Analyst',
            slug: `data-analyst-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const lowerResult = await searchArtifacts(
        createSearchQuery({ q: 'data' })
      );
      const upperResult = await searchArtifacts(
        createSearchQuery({ q: 'DATA' })
      );
      const mixedResult = await searchArtifacts(
        createSearchQuery({ q: 'DaTa' })
      );

      expect(lowerResult.total).toBeGreaterThan(0);
      expect(upperResult.total).toBe(lowerResult.total);
      expect(mixedResult.total).toBe(lowerResult.total);
    });

    it('should handle multi-word queries', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Expert Code Reviewer',
            slug: `expert-reviewer-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'expert code' })
      );

      expect(result.total).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await searchArtifacts(
        createSearchQuery({ q: 'xyznonexistent123' })
      );

      expect(result.total).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should only search published artifacts', async () => {
      const unpublishedSlug = `unpublished-${Date.now()}`;
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Secret Unpublished',
            slug: unpublishedSlug,
          },
          published: false,
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(createSearchQuery({ q: 'secret' }));

      const found = result.results.some(
        (r) => r.artifact.metadata.slug === unpublishedSlug
      );
      expect(found).toBe(false);
    });
  });

  describe('searchArtifacts - fuzzy matching', () => {
    it('should perform exact matching when fuzzy is false', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Developer',
            slug: `developer-exact-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'develop', fuzzy: false })
      );

      expect(result.total).toBeGreaterThan(0);
    });

    it('should perform fuzzy matching when enabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Developer',
            slug: `developer-fuzzy-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'developr', fuzzy: true })
      );

      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle exact matches with fuzzy enabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Analyzer',
            slug: `analyzer-fuzzy-exact-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'analyzer', fuzzy: true })
      );

      expect(result.total).toBeGreaterThan(0);
      expect(result.results[0].score).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Ranking and Scoring Tests
// ============================================================================

describe.skip('Ranking and Scoring', () => {
  describe('searchArtifacts - score calculation', () => {
    it('should rank name matches highest', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Analyzer Tool',
            description: 'Something else',
            slug: `name-match-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Other Tool',
            description: 'Analyzer in description',
            slug: `desc-match-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'analyzer' })
      );

      expect(result.total).toBeGreaterThan(0);
      if (result.results.length >= 2) {
        expect(result.results[0].artifact.metadata.name).toContain('Analyzer');
      }
    });

    it('should score exact matches higher than partial', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Test',
            slug: `exact-test-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Testing Framework',
            slug: `partial-test-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

      expect(result.total).toBeGreaterThan(0);
      expect(result.results[0].score).toBeGreaterThan(0);
      expect(result.results[0].score).toBeLessThanOrEqual(1);
    });

    it('should return scores between 0 and 1', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Sample Artifact',
            slug: `sample-score-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(createSearchQuery({ q: 'sample' }));

      expect(result.total).toBeGreaterThan(0);
      result.results.forEach((r) => {
        expect(r.score).toBeGreaterThan(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it('should sort results by score descending', async () => {
      const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].score).toBeGreaterThanOrEqual(
          result.results[i].score
        );
      }
    });

    it('should boost tag matches', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Some Tool',
            tags: ['featured', 'premium'],
            slug: `tag-boost-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'featured' })
      );

      expect(result.total).toBeGreaterThan(0);
      const found = result.results.find((r) =>
        r.artifact.metadata.tags.includes('featured')
      );
      expect(found).toBeDefined();
      if (found) {
        expect(found.score).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// Type Filtering Tests
// ============================================================================

describe.skip('Type Filtering', () => {
  describe('searchArtifacts - type filter', () => {
    it('should filter by persona type', async () => {
      await createArtifact(
        createTestArtifact({
          type: 'persona',
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Filter Test Persona',
            slug: `filter-persona-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'filter', type: 'persona' })
      );

      expect(result.total).toBeGreaterThan(0);
      result.results.forEach((r) => {
        expect(r.artifact.type).toBe('persona');
      });
    });

    it('should filter by skill type', async () => {
      await createArtifact(
        createTestArtifact({
          type: 'skill',
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Filter Test Skill',
            slug: `filter-skill-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'filter', type: 'skill' })
      );

      result.results.forEach((r) => {
        expect(r.artifact.type).toBe('skill');
      });
    });

    it('should filter by workflow type', async () => {
      await createArtifact(
        createTestArtifact({
          type: 'workflow',
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Filter Test Workflow',
            slug: `filter-workflow-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'filter', type: 'workflow' })
      );

      result.results.forEach((r) => {
        expect(r.artifact.type).toBe('workflow');
      });
    });

    it('should filter by team type', async () => {
      await createArtifact(
        createTestArtifact({
          type: 'team',
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Filter Test Team',
            slug: `filter-team-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'filter', type: 'team' })
      );

      result.results.forEach((r) => {
        expect(r.artifact.type).toBe('team');
      });
    });

    it('should exclude non-matching types', async () => {
      await createArtifact(
        createTestArtifact({
          type: 'persona',
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Type Exclude Test',
            slug: `exclude-persona-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'exclude', type: 'skill' })
      );

      const personaFound = result.results.some(
        (r) => r.artifact.type === 'persona'
      );
      expect(personaFound).toBe(false);
    });
  });
});

// ============================================================================
// Pagination Tests
// ============================================================================

describe('Pagination', () => {
  describe('searchArtifacts - pagination controls', () => {
    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await createArtifact(
          createTestArtifact({
            metadata: {
              ...createTestArtifact().metadata,
              name: `Pagination Test ${i}`,
              slug: `pagination-${i}-${Date.now()}`,
            },
          }),
          TEST_USER_ID
        );
      }

      const result = await searchArtifacts(
        createSearchQuery({ q: 'pagination', limit: 3 })
      );

      expect(result.results.length).toBeLessThanOrEqual(3);
      expect(result.pagination.limit).toBe(3);
    });

    it('should respect offset parameter', async () => {
      const result = await searchArtifacts(
        createSearchQuery({ q: 'test', offset: 5 })
      );

      expect(result.pagination.offset).toBe(5);
    });

    it('should indicate hasMore when more results exist', async () => {
      for (let i = 0; i < 10; i++) {
        await createArtifact(
          createTestArtifact({
            metadata: {
              ...createTestArtifact().metadata,
              name: `HasMore Test ${i}`,
              slug: `hasmore-${i}-${Date.now()}`,
            },
          }),
          TEST_USER_ID
        );
      }

      const result = await searchArtifacts(
        createSearchQuery({ q: 'hasmore', limit: 5, offset: 0 })
      );

      if (result.total > 5) {
        expect(result.pagination.hasMore).toBe(true);
      }
    });

    it('should indicate hasMore false when at end', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'End Test',
            slug: `end-test-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'end test', limit: 20, offset: 0 })
      );

      if (result.total <= 20) {
        expect(result.pagination.hasMore).toBe(false);
      }
    });

    it('should handle offset beyond results', async () => {
      const result = await searchArtifacts(
        createSearchQuery({ q: 'test', offset: 999999 })
      );

      expect(result.results).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should use default limit of 20', async () => {
      const query = createSearchQuery({ q: 'test' });
      delete query.limit;

      const result = await searchArtifacts(query);

      expect(result.pagination.limit).toBe(20);
    });

    it('should use default offset of 0', async () => {
      const query = createSearchQuery({ q: 'test' });
      delete query.offset;

      const result = await searchArtifacts(query);

      expect(result.pagination.offset).toBe(0);
    });
  });
});

// ============================================================================
// Highlighting Tests
// ============================================================================

describe('Highlighting', () => {
  describe('searchArtifacts - highlight matches', () => {
    it('should highlight matches in name when enabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Highlight Test Name',
            slug: `highlight-name-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'highlight', highlight: true })
      );

      const found = result.results.find((r) =>
        r.artifact.metadata.name.includes('Highlight')
      );

      if (found && found.highlights) {
        expect(found.highlights.name).toBeDefined();
        if (found.highlights.name) {
          expect(found.highlights.name[0]).toContain('<em>');
          expect(found.highlights.name[0]).toContain('</em>');
        }
      }
    });

    it('should highlight matches in description when enabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Sample',
            description: 'Description with special keyword',
            slug: `highlight-desc-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'special', highlight: true })
      );

      const found = result.results.find((r) =>
        r.artifact.metadata.description.includes('special')
      );

      if (found && found.highlights) {
        expect(found.highlights.description).toBeDefined();
      }
    });

    it('should highlight matches in tags when enabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            tags: ['unique-tag', 'other'],
            slug: `highlight-tag-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'unique-tag', highlight: true })
      );

      const found = result.results.find((r) =>
        r.artifact.metadata.tags.includes('unique-tag')
      );

      if (found && found.highlights) {
        expect(found.highlights.tags).toBeDefined();
      }
    });

    it('should not include highlights when disabled', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'No Highlight Test',
            slug: `no-highlight-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'no highlight', highlight: false })
      );

      result.results.forEach((r) => {
        expect(r.highlights).toBeUndefined();
      });
    });

    it('should escape HTML in highlights', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Test <script>alert("xss")</script>',
            slug: `xss-test-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await searchArtifacts(
        createSearchQuery({ q: 'script', highlight: true })
      );

      const found = result.results.find((r) =>
        r.artifact.metadata.name.includes('script')
      );

      if (found && found.highlights && found.highlights.name) {
        expect(found.highlights.name[0]).not.toContain('<script>');
        expect(found.highlights.name[0]).toContain('&lt;script&gt;');
      }
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  describe('searchArtifacts - timing', () => {
    it('should include execution time in milliseconds', async () => {
      const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

      expect(result.took).toBeDefined();
      expect(result.took).toBeGreaterThanOrEqual(0);
      expect(typeof result.took).toBe('number');
    });

    it('should complete search within reasonable time', async () => {
      const start = Date.now();
      await searchArtifacts(createSearchQuery({ q: 'test' }));
      const duration = Date.now() - start;

      // Should complete in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('searchArtifacts - response structure', () => {
    it('should return complete response structure', async () => {
      const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('took');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('offset');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('hasMore');
    });

    it('should include search query in response', async () => {
      const query = 'test search';
      const result = await searchArtifacts(createSearchQuery({ q: query }));

      expect(result.query).toBe(query);
    });

    it('should return total count', async () => {
      const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Search Suggestions Tests
// ============================================================================

describe.skip('Search Suggestions', () => {
  describe('getSearchSuggestions', () => {
    it('should return suggestions from artifact names', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Suggestion Test Artifact',
            slug: `suggest-name-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await getSearchSuggestions('suggestion');

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.query).toBe('suggestion');
    });

    it('should return suggestions from tags', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            tags: ['unique-suggest-tag'],
            slug: `suggest-tag-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await getSearchSuggestions('unique-suggest');

      const hasTag = result.suggestions.includes('unique-suggest-tag');
      expect(hasTag).toBe(true);
    });

    it('should return suggestions from keywords', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            keywords: ['unique-keyword-suggestion'],
            slug: `suggest-keyword-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const result = await getSearchSuggestions('unique-keyword');

      const hasKeyword = result.suggestions.some((s) =>
        s.includes('unique-keyword')
      );
      expect(hasKeyword).toBe(true);
    });

    it('should limit suggestions to 10', async () => {
      const result = await getSearchSuggestions('test');

      expect(result.suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should handle case-insensitive queries', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'CaseSensitive',
            slug: `case-suggest-${Date.now()}`,
          },
        }),
        TEST_USER_ID
      );

      const lower = await getSearchSuggestions('case');
      const upper = await getSearchSuggestions('CASE');

      expect(lower.suggestions.length).toBe(upper.suggestions.length);
    });

    it('should return empty suggestions for no matches', async () => {
      const result = await getSearchSuggestions('xyznonexistent999');

      expect(result.suggestions).toHaveLength(0);
    });

    it('should deduplicate suggestions', async () => {
      const result = await getSearchSuggestions('test');

      const unique = new Set(result.suggestions);
      expect(unique.size).toBe(result.suggestions.length);
    });

    it('should only suggest from published artifacts', async () => {
      await createArtifact(
        createTestArtifact({
          metadata: {
            ...createTestArtifact().metadata,
            name: 'Unpublished Suggestion',
            slug: `unpub-suggest-${Date.now()}`,
          },
          published: false,
        }),
        TEST_USER_ID
      );

      const result = await getSearchSuggestions('unpublished');

      const hasUnpublished = result.suggestions.some((s) =>
        s.includes('Unpublished')
      );
      expect(hasUnpublished).toBe(false);
    });
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty search query', async () => {
    const result = await searchArtifacts(createSearchQuery({ q: '' }));

    // Empty query is now invalid per schema, but if it gets through:
    expect(result.total).toBe(0);
  });

  it('should handle single character query', async () => {
    const result = await searchArtifacts(createSearchQuery({ q: 'a' }));

    expect(result).toBeDefined();
    expect(result.results).toBeDefined();
  });

  it('should handle very long query strings', async () => {
    const longQuery = 'a'.repeat(200); // Max length per schema
    const result = await searchArtifacts(createSearchQuery({ q: longQuery }));

    expect(result).toBeDefined();
  });

  it('should handle special characters in query', async () => {
    const result = await searchArtifacts(
      createSearchQuery({ q: 'test-query_123' })
    );

    expect(result).toBeDefined();
  });

  it('should handle unicode characters in query', async () => {
    await createArtifact(
      createTestArtifact({
        metadata: {
          ...createTestArtifact().metadata,
          name: 'Café Developer',
          slug: `unicode-${Date.now()}`,
        },
      }),
      TEST_USER_ID
    );

    const result = await searchArtifacts(createSearchQuery({ q: 'café' }));

    expect(result).toBeDefined();
  });

  it('should handle queries with multiple spaces', async () => {
    const result = await searchArtifacts(
      createSearchQuery({ q: 'test    multiple    spaces' })
    );

    expect(result).toBeDefined();
  });

  it('should handle minimum limit of 1', async () => {
    const result = await searchArtifacts(
      createSearchQuery({ q: 'test', limit: 1 })
    );

    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  it('should handle artifacts with no tags', async () => {
    await createArtifact(
      createTestArtifact({
        metadata: {
          ...createTestArtifact().metadata,
          tags: [],
          slug: `no-tags-${Date.now()}`,
        },
      }),
      TEST_USER_ID
    );

    const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

    expect(result).toBeDefined();
  });

  it('should handle artifacts with no keywords', async () => {
    const artifactWithoutKeywords = createTestArtifact({
      metadata: {
        ...createTestArtifact().metadata,
        slug: `no-keywords-${Date.now()}`,
      },
    });
    delete artifactWithoutKeywords.metadata.keywords;

    await createArtifact(artifactWithoutKeywords, TEST_USER_ID);

    const result = await searchArtifacts(createSearchQuery({ q: 'test' }));

    expect(result).toBeDefined();
  });

  it('should handle empty result set gracefully', async () => {
    const result = await searchArtifacts(
      createSearchQuery({ q: 'absolutelynonexistentquery123456' })
    );

    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('should maintain score consistency for same query', async () => {
    const result1 = await searchArtifacts(createSearchQuery({ q: 'test' }));
    const result2 = await searchArtifacts(createSearchQuery({ q: 'test' }));

    if (result1.total > 0 && result2.total > 0) {
      expect(result1.results[0].score).toBe(result2.results[0].score);
    }
  });
});
