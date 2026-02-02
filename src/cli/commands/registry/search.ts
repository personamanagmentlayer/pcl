/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Search Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createRegistry } from '../../config/registry';
import {
  formatOutput,
  formatError,
  type OutputFormat,
} from '../../utils/output';
import type {
  ArtifactType,
  SearchCriteria,
  QueryFilter,
} from '../../../registry/interfaces';

export interface SearchOptions {
  backend?: string;
  type?: ArtifactType;
  tags?: string;
  author?: string;
  published?: boolean;
  limit?: number;
  offset?: number;
  format?: OutputFormat;
  fields?: string;
}

/**
 * Search for artifacts in the registry
 */
export async function searchCommand(
  query: string,
  options: SearchOptions = {}
): Promise<void> {
  const {
    backend,
    type,
    tags,
    author,
    published,
    limit = 10,
    offset = 0,
    format = 'table',
    fields,
  } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);

    // Build filter object
    const filter: QueryFilter = {};

    if (type) {
      filter.type = type;
    }

    if (tags) {
      filter.tags = tags.split(',').map((t) => t.trim());
    }

    if (author) {
      filter.author = author;
    }

    if (published !== undefined) {
      filter.published = published;
    }

    // Build search criteria
    const searchCriteria: SearchCriteria = {
      query: query || '',
      filter,
      pagination: { limit, offset },
    };

    // Add fields filter if specified
    if (fields) {
      searchCriteria.fields = fields.split(',').map((f) => f.trim()) as any;
    }

    // Execute search
    console.log(`Searching registry: "${query || '(all)'}"`);
    const result = await registry.search(searchCriteria);

    if (!result.ok) {
      console.error(formatError('Search failed'));
      console.error(result.error.message);
      process.exit(1);
    }

    const searchResults = result.value;

    // Display results
    if (searchResults.length === 0) {
      console.log('No artifacts found');
    } else {
      console.log(`\nFound ${searchResults.length} artifact(s):\n`);

      // Extract artifacts from search results
      const artifacts = searchResults.map((r) => r.artifact);
      console.log(formatOutput(artifacts, format));

      // Show relevance scores if available
      if (format === 'table' && query) {
        console.log('\nRelevance scores:');
        searchResults.forEach((r, i) => {
          if (r.artifact) {
            console.log(
              `  ${i + 1}. ${r.artifact.metadata.name}: ${(r.score * 100).toFixed(1)}%`
            );
          }
        });
      }
    }

    // Close registry connection
    // await registry.close(); // Not needed - auto-closes on process exit
  } catch (error) {
    console.error(
      formatError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
