/**
 * Elasticsearch Search Backend Tests - Phase 1.2C
 * Comprehensive test suite for advanced full-text search
 */

import { ElasticsearchBackend } from '../../../src/registry/search/elasticsearch';
import type { Client } from '@elastic/elasticsearch';

// Mock Elasticsearch client
const mockElasticClient = {
  indices: {
    exists: vi.fn(),
    create: vi.fn(),
  },
  index: vi.fn(),
  search: vi.fn(),
  delete: vi.fn(),
  deleteByQuery: vi.fn(),
  close: vi.fn(),
};

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(() => mockElasticClient),
}));

describe('ElasticsearchBackend', () => {
  let backend: ElasticsearchBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new ElasticsearchBackend({
      nodes: 'http://localhost:9200',
      indexName: 'test-artifacts',
      analytics: true,
    });
  });

  describe('Initialization', () => {
    it('should create index if it does not exist', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await backend.initialize();

      expect(mockElasticClient.indices.exists).toHaveBeenCalledWith({
        index: 'test-artifacts',
      });
      expect(mockElasticClient.indices.create).toHaveBeenCalled();
    });

    it('should not create index if it already exists', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(true);

      await backend.initialize();

      expect(mockElasticClient.indices.create).not.toHaveBeenCalled();
    });

    it('should create index with custom analyzer', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await backend.initialize();

      const createCall = mockElasticClient.indices.create.mock.calls[0][0];
      expect(createCall.body.settings.analysis).toBeDefined();
      expect(
        createCall.body.settings.analysis.analyzer.pcl_analyzer
      ).toBeDefined();
    });

    it('should configure edge n-gram filter', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await backend.initialize();

      const createCall = mockElasticClient.indices.create.mock.calls[0][0];
      expect(
        createCall.body.settings.analysis.filter.pcl_edge_ngram
      ).toBeDefined();
      expect(
        createCall.body.settings.analysis.filter.pcl_edge_ngram.min_gram
      ).toBe(2);
    });

    it('should set up field mappings', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await backend.initialize();

      const createCall = mockElasticClient.indices.create.mock.calls[0][0];
      const mappings = createCall.body.mappings.properties;

      expect(mappings.name).toBeDefined();
      expect(mappings.description).toBeDefined();
      expect(mappings.tags).toBeDefined();
      expect(mappings.author).toBeDefined();
      expect(mappings.kind).toBeDefined();
    });

    it('should configure completion suggester field', async () => {
      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await backend.initialize();

      const createCall = mockElasticClient.indices.create.mock.calls[0][0];
      const nameField = createCall.body.mappings.properties.name;

      expect(nameField.fields.suggest.type).toBe('completion');
    });

    it('should use custom shard and replica configuration', async () => {
      const customBackend = new ElasticsearchBackend({
        shards: 5,
        replicas: 2,
      });

      mockElasticClient.indices.exists.mockResolvedValue(false);
      mockElasticClient.indices.create.mockResolvedValue({
        acknowledged: true,
      });

      await customBackend.initialize();

      const createCall = mockElasticClient.indices.create.mock.calls[0][0];
      expect(createCall.body.settings.number_of_shards).toBe(5);
      expect(createCall.body.settings.number_of_replicas).toBe(2);
    });
  });

  describe('Indexing', () => {
    it('should index a document', async () => {
      mockElasticClient.index.mockResolvedValue({ result: 'created' });

      const doc = {
        name: 'Test Artifact',
        description: 'A test artifact',
        version: '1.0.0',
      };

      await backend.index('artifact-123', doc);

      expect(mockElasticClient.index).toHaveBeenCalledWith({
        index: 'test-artifacts',
        id: 'artifact-123',
        document: expect.objectContaining(doc),
        refresh: 'wait_for',
      });
    });

    it('should add name suggestion field when indexing', async () => {
      mockElasticClient.index.mockResolvedValue({ result: 'created' });

      const doc = {
        name: 'Test Artifact',
      };

      await backend.index('artifact-123', doc);

      const indexCall = mockElasticClient.index.mock.calls[0][0];
      expect(indexCall.document.name_suggest).toBe('Test Artifact');
    });

    it('should make document immediately searchable', async () => {
      mockElasticClient.index.mockResolvedValue({ result: 'created' });

      await backend.index('artifact-123', { name: 'Test' });

      const indexCall = mockElasticClient.index.mock.calls[0][0];
      expect(indexCall.refresh).toBe('wait_for');
    });

    it('should handle indexing errors', async () => {
      mockElasticClient.index.mockRejectedValue(new Error('Index error'));

      await expect(
        backend.index('artifact-123', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('Search', () => {
    it('should perform basic search', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _id: 'artifact-123',
              _score: 1.5,
              _source: { name: 'Test Artifact' },
            },
          ],
        },
      });

      const results = await backend.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('artifact-123');
      expect(results[0].score).toBe(1.5);
      expect(results[0].artifact).toEqual({ name: 'Test Artifact' });
    });

    it('should enable fuzzy matching when requested', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { fuzzy: true });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const multiMatch = searchCall.body.query.bool.must[0].multi_match;

      expect(multiMatch.fuzziness).toBe('AUTO');
    });

    it('should disable fuzzy matching by default', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { fuzzy: false });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const multiMatch = searchCall.body.query.bool.must[0].multi_match;

      expect(multiMatch.fuzziness).toBe(0);
    });

    it('should search across multiple fields', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const multiMatch = searchCall.body.query.bool.must[0].multi_match;

      expect(multiMatch.fields).toContain('name^3');
      expect(multiMatch.fields).toContain('description');
      expect(multiMatch.fields).toContain('tags^2');
    });

    it('should boost name field more than others', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const multiMatch = searchCall.body.query.bool.must[0].multi_match;

      expect(multiMatch.fields[0]).toBe('name^3');
    });

    it('should highlight matching text', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _id: 'artifact-123',
              _score: 1.5,
              _source: { name: 'Test Artifact' },
              highlight: {
                name: ['<mark>Test</mark> Artifact'],
                description: ['A <mark>test</mark> description'],
              },
            },
          ],
        },
      });

      const results = await backend.search('test');

      expect(results[0].highlights).toBeDefined();
      expect(results[0].highlights?.name).toBe('<mark>Test</mark> Artifact');
      expect(results[0].highlights?.description).toBe(
        'A <mark>test</mark> description'
      );
    });

    it('should apply pagination with offset and limit', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { offset: 20, limit: 10 });

      const searchCall = mockElasticClient.search.mock.calls[0][0];

      expect(searchCall.body.from).toBe(20);
      expect(searchCall.body.size).toBe(10);
    });

    it('should use default pagination values', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];

      expect(searchCall.body.from).toBe(0);
      expect(searchCall.body.size).toBe(20);
    });

    it('should filter by tags', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { tags: ['typescript', 'testing'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters).toBeDefined();
      expect(filters[0].terms.tags).toEqual(['typescript', 'testing']);
    });

    it('should filter by kind', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { kind: 'persona' });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters).toBeDefined();
      expect(filters[0].term.kind).toBe('persona');
    });

    it('should filter by author', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { author: 'john.doe' });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters).toBeDefined();
      expect(filters[0].term.author).toBe('john.doe');
    });

    it('should boost popular artifacts when requested', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { boostPopular: true });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const should = searchCall.body.query.bool.should;

      expect(should).toBeDefined();
      expect(should[0].function_score).toBeDefined();
    });

    it('should boost by downloads and stars', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { boostPopular: true });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const functionScore = searchCall.body.query.bool.should[0].function_score;

      expect(functionScore.functions).toHaveLength(2);
      expect(functionScore.functions[0].field_value_factor.field).toBe(
        'downloads'
      );
      expect(functionScore.functions[1].field_value_factor.field).toBe('stars');
    });

    it('should sort by relevance score by default', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.sort).toBeUndefined();
    });

    it('should sort by field when specified', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { sortBy: 'downloads', sortOrder: 'desc' });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.sort).toEqual([{ downloads: 'desc' }]);
    });

    it('should sort by name using keyword field', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { sortBy: 'name', sortOrder: 'asc' });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.sort).toEqual([{ 'name.keyword': 'asc' }]);
    });

    it('should validate sort field', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { sortBy: 'invalid_field' as any });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.sort).toEqual([{ _score: 'desc' }]);
    });

    it('should include aggregations when facets requested', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { facets: ['tags', 'kind', 'author'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.aggs).toBeDefined();
      expect(searchCall.body.aggs.tags).toBeDefined();
      expect(searchCall.body.aggs.kind).toBeDefined();
      expect(searchCall.body.aggs.author).toBeDefined();
    });

    it('should handle empty query with match_all', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('', {});

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.must).toEqual([{ match_all: {} }]);
    });

    it('should record search analytics', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [{ _id: 'test', _score: 1, _source: {} }],
        },
      });

      await backend.search('test query');

      const analytics = backend.getAnalytics();
      expect(analytics.totalSearches).toBe(1);
      expect(analytics.popularQueries.get('test query')).toBe(1);
    });

    it('should not record analytics when disabled', async () => {
      const noAnalyticsBackend = new ElasticsearchBackend({
        analytics: false,
      });

      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await noAnalyticsBackend.search('test');

      const analytics = noAnalyticsBackend.getAnalytics();
      expect(analytics.totalSearches).toBe(0);
    });

    it('should handle search errors', async () => {
      mockElasticClient.search.mockRejectedValue(new Error('Search error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(backend.search('test')).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should update success rate on search failure', async () => {
      mockElasticClient.search.mockRejectedValue(new Error('Search error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await backend.search('test');
      } catch (e) {
        // Expected
      }

      const analytics = backend.getAnalytics();
      expect(analytics.successRate).toBeLessThan(100);
    });
  });

  describe('Autocomplete Suggestions', () => {
    it('should get suggestions for prefix', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          name_suggestion: [
            {
              options: [
                { text: 'test artifact' },
                { text: 'testing framework' },
              ],
            },
          ],
        },
      });

      const suggestions = await backend.suggest('test');

      expect(suggestions).toEqual(['test artifact', 'testing framework']);
    });

    it('should limit suggestions count', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          name_suggestion: [
            {
              options: [{ text: 'test1' }, { text: 'test2' }],
            },
          ],
        },
      });

      await backend.suggest('test', 5);

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.suggest.name_suggestion.completion.size).toBe(5);
    });

    it('should skip duplicate suggestions', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          name_suggestion: [
            {
              options: [{ text: 'test' }],
            },
          ],
        },
      });

      await backend.suggest('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(
        searchCall.body.suggest.name_suggestion.completion.skip_duplicates
      ).toBe(true);
    });

    it('should use default limit of 10', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          name_suggestion: [{ options: [] }],
        },
      });

      await backend.suggest('test');

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.suggest.name_suggestion.completion.size).toBe(10);
    });

    it('should handle suggestion errors', async () => {
      mockElasticClient.search.mockRejectedValue(new Error('Suggest error'));
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const suggestions = await backend.suggest('test');

      expect(suggestions).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed suggestion response', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: { name_suggestion: null },
      });

      const suggestions = await backend.suggest('test');

      expect(suggestions).toEqual([]);
    });
  });

  describe('Delete', () => {
    it('should delete document from index', async () => {
      mockElasticClient.delete.mockResolvedValue({ result: 'deleted' });

      await backend.delete('artifact-123');

      expect(mockElasticClient.delete).toHaveBeenCalledWith({
        index: 'test-artifacts',
        id: 'artifact-123',
        refresh: 'wait_for',
      });
    });

    it('should make deletion immediately visible', async () => {
      mockElasticClient.delete.mockResolvedValue({ result: 'deleted' });

      await backend.delete('artifact-123');

      const deleteCall = mockElasticClient.delete.mock.calls[0][0];
      expect(deleteCall.refresh).toBe('wait_for');
    });

    it('should handle delete errors', async () => {
      mockElasticClient.delete.mockRejectedValue(new Error('Delete error'));

      await expect(backend.delete('artifact-123')).rejects.toThrow();
    });
  });

  describe('Clear', () => {
    it('should delete all documents', async () => {
      mockElasticClient.deleteByQuery.mockResolvedValue({ deleted: 100 });

      await backend.clear();

      expect(mockElasticClient.deleteByQuery).toHaveBeenCalledWith({
        index: 'test-artifacts',
        body: {
          query: {
            match_all: {},
          },
        },
        refresh: true,
      });
    });

    it('should refresh index after clear', async () => {
      mockElasticClient.deleteByQuery.mockResolvedValue({ deleted: 0 });

      await backend.clear();

      const clearCall = mockElasticClient.deleteByQuery.mock.calls[0][0];
      expect(clearCall.refresh).toBe(true);
    });

    it('should handle clear errors', async () => {
      mockElasticClient.deleteByQuery.mockRejectedValue(
        new Error('Clear error')
      );

      await expect(backend.clear()).rejects.toThrow();
    });
  });

  describe('Analytics', () => {
    it('should track total searches', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('query1');
      await backend.search('query2');
      await backend.search('query3');

      const analytics = backend.getAnalytics();
      expect(analytics.totalSearches).toBe(3);
    });

    it('should track popular queries', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('popular query');
      await backend.search('popular query');
      await backend.search('another query');

      const analytics = backend.getAnalytics();
      expect(analytics.popularQueries.get('popular query')).toBe(2);
      expect(analytics.popularQueries.get('another query')).toBe(1);
    });

    it('should calculate average latency', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('query1');
      await backend.search('query2');

      const analytics = backend.getAnalytics();
      expect(analytics.avgLatency).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 1, hits: [] },
      });

      await backend.search('success1');
      await backend.search('success2');

      const analytics = backend.getAnalytics();
      expect(analytics.successRate).toBeGreaterThan(0);
    });

    it('should limit popular queries to top 20', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      for (let i = 0; i < 30; i++) {
        await backend.search(`query${i}`);
      }

      const analytics = backend.getAnalytics();
      expect(analytics.popularQueries.size).toBeLessThanOrEqual(20);
    });

    it('should reset analytics', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test');

      backend.resetAnalytics();

      const analytics = backend.getAnalytics();
      expect(analytics.totalSearches).toBe(0);
      expect(analytics.popularQueries.size).toBe(0);
      expect(analytics.avgLatency).toBe(0);
      expect(analytics.successRate).toBe(100);
    });
  });

  describe('Configuration', () => {
    it('should use default nodes', () => {
      const defaultBackend = new ElasticsearchBackend();
      expect(defaultBackend).toBeDefined();
    });

    it('should accept custom nodes array', () => {
      const customBackend = new ElasticsearchBackend({
        nodes: ['http://es1:9200', 'http://es2:9200'],
      });
      expect(customBackend).toBeDefined();
    });

    it('should accept username/password auth', () => {
      const authBackend = new ElasticsearchBackend({
        auth: {
          username: 'elastic',
          password: 'secret',
        },
      });
      expect(authBackend).toBeDefined();
    });

    it('should accept API key auth', () => {
      const apiKeyBackend = new ElasticsearchBackend({
        auth: {
          apiKey: 'base64-encoded-key',
        },
      });
      expect(apiKeyBackend).toBeDefined();
    });

    it('should use custom index name', () => {
      const customBackend = new ElasticsearchBackend({
        indexName: 'custom-index',
      });
      expect(customBackend).toBeDefined();
    });

    it('should disable analytics when configured', () => {
      const noAnalyticsBackend = new ElasticsearchBackend({
        analytics: false,
      });
      expect(noAnalyticsBackend).toBeDefined();
    });
  });

  describe('Close', () => {
    it('should close Elasticsearch connection', async () => {
      mockElasticClient.close.mockResolvedValue(undefined);

      await backend.close();

      expect(mockElasticClient.close).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      mockElasticClient.close.mockRejectedValue(new Error('Close error'));

      await expect(backend.close()).rejects.toThrow();
    });
  });

  describe('Query Building', () => {
    it('should combine multiple filters', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', {
        tags: ['typescript'],
        kind: 'persona',
        author: 'john',
      });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters).toHaveLength(3);
    });

    it('should handle empty filters array', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', {});

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters).toHaveLength(0);
    });

    it('should use OR logic for tags', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { tags: ['tag1', 'tag2', 'tag3'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const filters = searchCall.body.query.bool.filter;

      expect(filters[0].terms.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should apply prefix length for fuzzy matching', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { fuzzy: true });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const multiMatch = searchCall.body.query.bool.must[0].multi_match;

      expect(multiMatch.prefix_length).toBe(2);
    });
  });

  describe('Relevance Scoring', () => {
    it('should return results with relevance scores', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 2,
          hits: [
            {
              _id: 'artifact-1',
              _score: 2.5,
              _source: { name: 'Highly Relevant' },
            },
            {
              _id: 'artifact-2',
              _score: 1.2,
              _source: { name: 'Less Relevant' },
            },
          ],
        },
      });

      const results = await backend.search('test');

      expect(results[0].score).toBe(2.5);
      expect(results[1].score).toBe(1.2);
    });

    it('should handle missing scores', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _id: 'artifact-1',
              _source: { name: 'Test' },
            },
          ],
        },
      });

      const results = await backend.search('test');

      expect(results[0].score).toBe(0);
    });

    it('should apply logarithmic scaling to downloads', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { boostPopular: true });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      const functionScore = searchCall.body.query.bool.should[0].function_score;
      const downloadBoost = functionScore.functions[0].field_value_factor;

      expect(downloadBoost.modifier).toBe('log1p');
    });
  });

  describe('Aggregations', () => {
    it('should configure tags aggregation', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { facets: ['tags'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.aggs.tags.terms.field).toBe('tags');
      expect(searchCall.body.aggs.tags.terms.size).toBe(50);
    });

    it('should configure kind aggregation', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { facets: ['kind'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.aggs.kind.terms.field).toBe('kind');
      expect(searchCall.body.aggs.kind.terms.size).toBe(10);
    });

    it('should configure author aggregation', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { facets: ['author'] });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.aggs.author.terms.field).toBe('author');
      expect(searchCall.body.aggs.author.terms.size).toBe(20);
    });

    it('should handle unknown facets', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test', { facets: ['unknown_facet'] as any });

      const searchCall = mockElasticClient.search.mock.calls[0][0];
      expect(searchCall.body.aggs.unknown_facet).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      const results = await backend.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle results without highlights', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _id: 'artifact-1',
              _score: 1.0,
              _source: { name: 'Test' },
            },
          ],
        },
      });

      const results = await backend.search('test');

      expect(results[0].highlights).toBeUndefined();
    });

    it('should handle very long queries', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      const longQuery = 'a'.repeat(1000);
      await backend.search(longQuery);

      expect(mockElasticClient.search).toHaveBeenCalled();
    });

    it('should handle special characters in queries', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      await backend.search('test@#$%^&*()');

      expect(mockElasticClient.search).toHaveBeenCalled();
    });

    it('should handle concurrent searches', async () => {
      mockElasticClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      });

      const searches = [
        backend.search('query1'),
        backend.search('query2'),
        backend.search('query3'),
      ];

      const results = await Promise.all(searches);

      expect(results).toHaveLength(3);
    });
  });
});
