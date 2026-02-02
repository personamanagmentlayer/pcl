/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Registry - Elasticsearch Integration
 * Phase 1.2C: Advanced Search with Full-Text, Fuzzy Matching, and Analytics
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Client, type ClientOptions } from '@elastic/elasticsearch';
import type { SearchBackend, SearchOptions, SearchResult } from '../interfaces';

export interface ElasticsearchConfig {
  /** Elasticsearch node URL(s) */
  nodes?: string | string[];
  /** Authentication credentials */
  auth?:
    | {
        username: string;
        password: string;
      }
    | {
        apiKey: string;
      };
  /** Index name for artifacts */
  indexName?: string;
  /** Number of shards */
  shards?: number;
  /** Number of replicas */
  replicas?: number;
  /** Enable search analytics */
  analytics?: boolean;
}

export interface SearchAnalytics {
  /** Total searches performed */
  totalSearches: number;
  /** Popular search queries */
  popularQueries: Map<string, number>;
  /** Average search latency (ms) */
  avgLatency: number;
  /** Search success rate (%) */
  successRate: number;
}

/**
 * Elasticsearch-based search backend for advanced full-text search
 *
 * Features:
 * - Full-text search with relevance scoring
 * - Fuzzy matching for typo tolerance
 * - Search result highlighting
 * - Faceted search (aggregations)
 * - Search analytics
 * - Auto-complete suggestions
 */
export class ElasticsearchBackend implements SearchBackend {
  private readonly client: Client;
  private readonly config: Required<ElasticsearchConfig>;
  private analytics: SearchAnalytics;

  constructor(config: ElasticsearchConfig = {}) {
    this.config = {
      nodes: config.nodes || 'http://localhost:9200',
      auth: config.auth || undefined!,
      indexName: config.indexName || 'pcl-artifacts',
      shards: config.shards || 1,
      replicas: config.replicas || 1,
      analytics: config.analytics ?? true,
    };

    const clientConfig: ClientOptions = {
      node: this.config.nodes,
    };

    if (this.config.auth) {
      if ('apiKey' in this.config.auth) {
        clientConfig.auth = { apiKey: this.config.auth.apiKey };
      } else {
        clientConfig.auth = {
          username: this.config.auth.username,
          password: this.config.auth.password,
        };
      }
    }

    this.client = new Client(clientConfig);

    this.analytics = {
      totalSearches: 0,
      popularQueries: new Map(),
      avgLatency: 0,
      successRate: 100,
    };
  }

  /**
   * Initialize Elasticsearch index with mappings
   */
  async initialize(): Promise<void> {
    const indexExists = await this.client.indices.exists({
      index: this.config.indexName,
    });

    if (!indexExists) {
      // Elasticsearch client type overload mismatch - using any cast
      await this.client.indices.create({
        index: this.config.indexName,
        body: {
          settings: {
            number_of_shards: this.config.shards,
            number_of_replicas: this.config.replicas,
            analysis: {
              analyzer: {
                pcl_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding', 'pcl_edge_ngram'],
                },
              },
              filter: {
                pcl_edge_ngram: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                },
              },
            },
          },
          mappings: {
            properties: {
              name: {
                type: 'text',
                analyzer: 'pcl_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: {
                    type: 'completion',
                  },
                },
              },
              description: {
                type: 'text',
                analyzer: 'standard',
              },
              version: {
                type: 'keyword',
              },
              tags: {
                type: 'keyword',
              },
              author: {
                type: 'keyword',
              },
              kind: {
                type: 'keyword',
              },
              downloads: {
                type: 'long',
              },
              stars: {
                type: 'long',
              },
              created: {
                type: 'date',
              },
              updated: {
                type: 'date',
              },
              metadata: {
                type: 'object',
                enabled: false,
              },
            },
          },
        },
      } as any);
    }
  }

  /**
   * Index an artifact for searching
   */
  async index(id: string, document: Record<string, unknown>): Promise<void> {
    await this.client.index({
      index: this.config.indexName,
      id,
      document: {
        ...document,
        // Add name suggestion
        name_suggest: document.name,
      },
      refresh: 'wait_for', // Make immediately searchable
    });
  }

  /**
   * Search artifacts with advanced options
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const start = Date.now();

    try {
      const searchBody: any = {
        query: this.buildQuery(query, options),
        highlight: {
          fields: {
            name: {},
            description: {},
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        from: options.offset || 0,
        size: options.limit || 20,
      };

      // Add sorting
      if (options.sortBy) {
        searchBody.sort = this.buildSort(options.sortBy, options.sortOrder);
      }

      // Add facets/aggregations
      if (options.facets) {
        searchBody.aggs = this.buildAggregations(options.facets);
      }

      const response = await this.client.search({
        index: this.config.indexName,
        body: searchBody,
      });

      // Record analytics
      if (this.config.analytics) {
        this.recordSearch(
          query,
          Date.now() - start,
          (response.hits.total as any) > 0
        );
      }

      // Transform results
      const results: SearchResult[] = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score || 0,
        artifact: hit._source,
        highlights: hit.highlight
          ? {
              name: hit.highlight.name?.[0],
              description: hit.highlight.description?.[0],
            }
          : undefined,
      }));

      return results;
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      if (this.config.analytics) {
        this.recordSearch(query, Date.now() - start, false);
      }
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async suggest(prefix: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: this.config.indexName,
        body: {
          suggest: {
            name_suggestion: {
              prefix,
              completion: {
                field: 'name.suggest',
                size: limit,
                skip_duplicates: true,
              },
            },
          },
        },
      } as any);

      const suggestions = response.suggest?.name_suggestion?.[0]?.options || [];
      return Array.isArray(suggestions)
        ? suggestions.map((opt: any) => opt.text)
        : [];
    } catch (error) {
      console.error('Elasticsearch suggest error:', error);
      return [];
    }
  }

  /**
   * Delete artifact from search index
   */
  async delete(id: string): Promise<void> {
    await this.client.delete({
      index: this.config.indexName,
      id,
      refresh: 'wait_for',
    });
  }

  /**
   * Clear all indexed artifacts
   */
  async clear(): Promise<void> {
    await this.client.deleteByQuery({
      index: this.config.indexName,
      body: {
        query: {
          match_all: {},
        },
      },
      refresh: true,
    } as any);
  }

  /**
   * Get search analytics
   */
  getAnalytics(): SearchAnalytics {
    return {
      ...this.analytics,
      popularQueries: new Map(
        Array.from(this.analytics.popularQueries.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
      ),
    };
  }

  /**
   * Reset search analytics
   */
  resetAnalytics(): void {
    this.analytics = {
      totalSearches: 0,
      popularQueries: new Map(),
      avgLatency: 0,
      successRate: 100,
    };
  }

  /**
   * Build Elasticsearch query from search options
   */
  private buildQuery(query: string, options: SearchOptions): any {
    const mustClauses: any[] = [];
    const shouldClauses: any[] = [];
    const filterClauses: any[] = [];

    // Main text query with fuzzy matching
    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'tags^2'],
          fuzziness: options.fuzzy ? 'AUTO' : 0,
          prefix_length: 2,
          operator: 'or',
        },
      });
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      filterClauses.push({
        terms: {
          tags: options.tags,
        },
      });
    }

    // Filter by kind
    if (options.kind) {
      filterClauses.push({
        term: {
          kind: options.kind,
        },
      });
    }

    // Filter by author
    if (options.author) {
      filterClauses.push({
        term: {
          author: options.author,
        },
      });
    }

    // Boost by popularity (downloads, stars)
    if (options.boostPopular) {
      shouldClauses.push({
        function_score: {
          query: { match_all: {} },
          functions: [
            {
              field_value_factor: {
                field: 'downloads',
                factor: 0.1,
                modifier: 'log1p',
                missing: 0,
              },
            },
            {
              field_value_factor: {
                field: 'stars',
                factor: 0.5,
                modifier: 'log1p',
                missing: 0,
              },
            },
          ],
          score_mode: 'sum',
          boost_mode: 'multiply',
        },
      });
    }

    return {
      bool: {
        must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
        should: shouldClauses,
        filter: filterClauses,
      },
    };
  }

  /**
   * Build sort clause
   */
  private buildSort(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): any[] {
    const validFields = [
      'name',
      'downloads',
      'stars',
      'created',
      'updated',
      '_score',
    ];

    if (!validFields.includes(sortBy)) {
      return [{ _score: 'desc' }];
    }

    if (sortBy === 'name') {
      return [{ 'name.keyword': sortOrder }];
    }

    return [{ [sortBy]: sortOrder }];
  }

  /**
   * Build aggregations for faceted search
   */
  private buildAggregations(facets: string[]): any {
    const aggs: any = {};

    for (const facet of facets) {
      if (facet === 'tags') {
        aggs.tags = {
          terms: {
            field: 'tags',
            size: 50,
          },
        };
      } else if (facet === 'kind') {
        aggs.kind = {
          terms: {
            field: 'kind',
            size: 10,
          },
        };
      } else if (facet === 'author') {
        aggs.author = {
          terms: {
            field: 'author',
            size: 20,
          },
        };
      }
    }

    return aggs;
  }

  /**
   * Record search for analytics
   */
  private recordSearch(query: string, latency: number, success: boolean): void {
    this.analytics.totalSearches++;

    // Track popular queries
    const count = this.analytics.popularQueries.get(query) || 0;
    this.analytics.popularQueries.set(query, count + 1);

    // Update average latency
    const total = this.analytics.totalSearches;
    this.analytics.avgLatency =
      (this.analytics.avgLatency * (total - 1) + latency) / total;

    // Update success rate
    const successCount = success ? 1 : 0;
    this.analytics.successRate =
      (this.analytics.successRate * (total - 1) + successCount * 100) / total;
  }

  /**
   * Close Elasticsearch connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
