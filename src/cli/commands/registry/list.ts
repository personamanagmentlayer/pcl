/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry List Command
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
  Query,
  SortOrder,
} from '../../../registry/interfaces';

export interface ListOptions {
  backend?: string;
  type?: ArtifactType;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  format?: OutputFormat;
  published?: boolean;
}

/**
 * List all artifacts in the registry
 */
export async function listCommand(options: ListOptions = {}): Promise<void> {
  const {
    backend,
    type,
    sort = 'createdAt',
    order = 'desc',
    limit = 20,
    offset = 0,
    format = 'table',
    published,
  } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);

    // Build query
    const query: Query = {
      pagination: { limit, offset },
      sorting: {
        field: sort as any,
        order: order as SortOrder,
      },
    };

    // Add filters
    if (type) {
      query.filters = { type };
    }

    if (published !== undefined) {
      query.filters = {
        ...query.filters,
        published,
      };
    }

    // Execute query
    console.log('Listing artifacts...');
    const result = await registry.find(query);

    if (!result.ok) {
      console.error(formatError('Failed to list artifacts'));
      console.error(result.error.message);
      process.exit(1);
    }

    const artifacts = result.value;

    // Display results
    if (artifacts.length === 0) {
      console.log('No artifacts found');
    } else {
      console.log(`\nFound ${artifacts.length} artifact(s):\n`);
      console.log(formatOutput(artifacts, format));

      // Show pagination info
      if (artifacts.length === limit) {
        console.log(
          `\nShowing ${offset + 1}-${offset + artifacts.length}. Use --offset to see more.`
        );
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
