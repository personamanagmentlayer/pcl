/**
 * Skill Bundle CLI Commands
 *
 * Create, list, and manage skill bundles
 */

import { createRegistry } from '../../config/registry';
import { createSkillRegistry } from '../../../registry/skill-registry';
import type { SkillCategory } from '../../../registry/skill-metadata';
import {
  formatOutput,
  formatError,
  type OutputFormat,
} from '../../utils/output';

export interface SkillBundleListOptions {
  backend?: string;
  category?: SkillCategory;
  format?: OutputFormat;
}

export interface SkillBundleCreateOptions {
  backend?: string;
  description: string;
  category: SkillCategory;
  skills: string;
  tags?: string;
  version?: string;
  author?: string;
}

/**
 * List skill bundles
 */
export async function skillBundleListCommand(
  options: SkillBundleListOptions = {}
): Promise<void> {
  const { backend, category, format = 'table' } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);
    const skillRegistry = createSkillRegistry(registry);

    // Get bundles
    console.log('Fetching skill bundles...');
    if (category) {
      console.log(`Category: ${category}`);
    }

    const result = await skillRegistry.getSkillBundles(category);

    if (!result.ok) {
      console.error(formatError('Failed to get bundles'));
      console.error(result.error.message);
      process.exit(1);
    }

    const bundles = result.value;

    // Display results
    if (bundles.length === 0) {
      console.log('No bundles found');
    } else {
      console.log(`\nFound ${bundles.length} bundle(s):\n`);

      // Format results for display
      const displayData = bundles.map((b) => ({
        name: b.name,
        category: b.category,
        skills: b.skillIds.length,
        version: b.version,
        author: b.author || 'N/A',
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

/**
 * Create a skill bundle
 */
export async function skillBundleCreateCommand(
  name: string,
  options: SkillBundleCreateOptions
): Promise<void> {
  const {
    backend,
    description,
    category,
    skills,
    tags,
    version = '1.0.0',
    author,
  } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);
    const skillRegistry = createSkillRegistry(registry);

    // Parse skill IDs
    const skillIds = skills.split(',').map((s) => s.trim());

    if (skillIds.length === 0) {
      console.error(formatError('No skills specified'));
      process.exit(1);
    }

    // Parse tags
    const tagList = tags ? tags.split(',').map((t) => t.trim()) : [];

    // Create bundle
    console.log(`Creating bundle: ${name}`);
    console.log(`  Skills: ${skillIds.length}`);
    console.log(`  Category: ${category}`);

    const result = await skillRegistry.createBundle({
      name,
      description,
      category,
      skillIds,
      tags: tagList,
      version,
      author,
    });

    if (!result.ok) {
      console.error(formatError('Failed to create bundle'));
      console.error(result.error.message);
      process.exit(1);
    }

    const bundle = result.value;

    console.log('\n✓ Bundle created successfully!');
    console.log(`  ID: ${bundle.id}`);
    console.log(`  Name: ${bundle.name}`);
    console.log(`  Skills: ${bundle.skillIds.length}`);
    console.log(`  Version: ${bundle.version}`);
  } catch (error) {
    console.error(
      formatError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
