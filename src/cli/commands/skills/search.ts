/**
 * Skill Search CLI Command
 *
 * Search for skills in the registry with advanced filters
 */

import { createRegistry } from '../../config/registry';
import { createSkillRegistry } from '../../../registry/skill-registry';
import type { SkillSearchFilters, SkillCategory, SkillComplexity } from '../../../registry/skill-metadata';
import {
  formatOutput,
  formatError,
  type OutputFormat,
} from '../../utils/output';

export interface SkillSearchOptions {
  backend?: string;
  category?: SkillCategory;
  tools?: string;
  complexity?: SkillComplexity;
  minRating?: number;
  tags?: string;
  limit?: number;
  offset?: number;
  format?: OutputFormat;
  trending?: boolean;
}

/**
 * Search for skills in the registry
 */
export async function skillSearchCommand(
  query: string,
  options: SkillSearchOptions = {}
): Promise<void> {
  const {
    backend,
    category,
    tools,
    complexity,
    minRating,
    tags,
    limit = 20,
    offset = 0,
    format = 'table',
    trending,
  } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);
    const skillRegistry = createSkillRegistry(registry);

    // Build filters
    const filters: SkillSearchFilters = {};

    if (category) {
      filters.category = category;
    }

    if (tools) {
      filters.tools = tools.split(',').map((t) => t.trim());
    }

    if (complexity) {
      filters.complexity = complexity;
    }

    if (minRating !== undefined) {
      filters.minRating = minRating;
    }

    if (tags) {
      filters.tags = tags.split(',').map((t) => t.trim());
    }

    if (trending) {
      filters.trendingOnly = true;
    }

    // Execute search
    console.log(`Searching for skills: "${query || '(all)'}"`);
    if (Object.keys(filters).length > 0) {
      console.log('Filters:', JSON.stringify(filters, null, 2));
    }

    const result = await skillRegistry.searchSkills(query, filters, { limit, offset });

    if (!result.ok) {
      console.error(formatError('Search failed'));
      console.error(result.error.message);
      process.exit(1);
    }

    const results = result.value;

    // Display results
    if (results.length === 0) {
      console.log('No skills found');
    } else {
      console.log(`\nFound ${results.length} skill(s):\n`);

      // Format results for display
      const displayData = results.map((r) => ({
        name: r.metadata.name,
        category: r.metadata.category,
        complexity: r.metadata.complexity,
        tools: r.metadata.tools.slice(0, 3).join(', ') + (r.metadata.tools.length > 3 ? '...' : ''),
        rating: r.metadata.rating ? `${r.metadata.rating.toFixed(1)}/5` : 'N/A',
        relevance: `${(r.relevance * 100).toFixed(0)}%`,
      }));

      console.log(formatOutput(displayData, format));

      // Show detailed info for top result in table format
      if (format === 'table' && results.length > 0) {
        const top = results[0];
        console.log('\nTop Result Details:');
        console.log(`  Name: ${top.metadata.name}`);
        console.log(`  Description: ${top.metadata.description || 'N/A'}`);
        console.log(`  Category: ${top.metadata.category}`);
        console.log(`  Complexity: ${top.metadata.complexity}`);
        console.log(`  Tools: ${top.metadata.tools.join(', ')}`);
        console.log(`  Tokens: ${top.metadata.tokenCount || 'N/A'}`);
        console.log(`  Examples: ${top.metadata.exampleCount || 0}`);
      }
    }
  } catch (error) {
    console.error(
      formatError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
