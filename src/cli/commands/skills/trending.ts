/**
 * Skill Trending CLI Command
 *
 * Show trending skills by category and time period
 */

import { createRegistry } from '../../config/registry';
import { createSkillRegistry } from '../../../registry/skill-registry';
import type { SkillCategory } from '../../../registry/skill-metadata';
import {
  formatOutput,
  formatError,
  type OutputFormat,
} from '../../utils/output';

export interface SkillTrendingOptions {
  backend?: string;
  category?: SkillCategory;
  period?: 'day' | 'week' | 'month' | 'year';
  limit?: number;
  format?: OutputFormat;
}

/**
 * Show trending skills
 */
export async function skillTrendingCommand(
  options: SkillTrendingOptions = {}
): Promise<void> {
  const {
    backend,
    category,
    period = 'week',
    limit = 10,
    format = 'table',
  } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);
    const skillRegistry = createSkillRegistry(registry);

    // Get trending skills
    console.log(`Fetching trending skills for ${period}...`);
    if (category) {
      console.log(`Category: ${category}`);
    }

    const result = await skillRegistry.getTrending(category, period, limit);

    if (!result.ok) {
      console.error(formatError('Failed to get trending skills'));
      console.error(result.error.message);
      process.exit(1);
    }

    const trending = result.value;

    // Display results
    if (trending.length === 0) {
      console.log('No trending skills found');
    } else {
      console.log(`\nTop ${trending.length} Trending Skills (${period}):\n`);

      // Format results for display
      const displayData = trending.map((t, index) => ({
        rank: index + 1,
        name: t.name,
        category: t.category,
        score: t.trendingScore.toFixed(0),
        downloads: t.downloads,
        growth: `+${t.growthRate.toFixed(1)}%`,
      }));

      console.log(formatOutput(displayData, format));
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
