/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Info Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createRegistry } from '../../config/registry';
import {
  formatArtifactDetails,
  formatError,
  formatOutput,
  type OutputFormat,
} from '../../utils/output';
import { chalk } from '../../utils/colors';

export interface InfoOptions {
  backend?: string;
  version?: string;
  format?: OutputFormat;
  showSource?: boolean;
}

/**
 * Show detailed information about an artifact
 */
export async function infoCommand(
  idOrSlug: string,
  options: InfoOptions = {}
): Promise<void> {
  const { backend, version, format = 'pretty', showSource = false } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);

    // Try to find artifact by ID first
    console.log(`Looking up artifact: ${idOrSlug}`);
    let result = await registry.read(idOrSlug);

    // If not found, try by slug
    if (!result.ok || !result.value) {
      const findResult = await registry.find({
        filter: { deleted: false },
      });

      if (findResult.ok) {
        const artifact = findResult.value.find(
          (a) => a.metadata.slug === idOrSlug || a.metadata.name === idOrSlug
        );
        result = artifact ? { ok: true as const, value: artifact } : result;
      }
    }

    if (!result.ok || !result.value) {
      console.error(formatError(`Artifact not found: ${idOrSlug}`));
      process.exit(1);
    }

    let artifact = result.value;

    // Get specific version if requested
    if (version) {
      const versionResult = await registry.getVersion(artifact.id, version);

      if (!versionResult.ok || !versionResult.value) {
        console.error(
          formatError(`Version not found: ${version} for artifact ${idOrSlug}`)
        );
        process.exit(1);
      }

      artifact = versionResult.value;
    }

    // Display artifact details based on format
    if (format === 'json') {
      console.log(formatOutput(artifact, 'json'));
    } else if (format === 'yaml') {
      console.log(formatOutput(artifact, 'yaml'));
    } else {
      console.log(formatArtifactDetails(artifact));
    }

    // Show source code if requested
    if (showSource) {
      console.log('\n' + chalk.bold('Source Code:'));
      console.log(chalk.dim('─'.repeat(80)));
      console.log(artifact.content);
      console.log(chalk.dim('─'.repeat(80)));
    }

    // Show version history
    const versionsResult = await registry.listVersions(artifact.id);
    if (versionsResult.ok && versionsResult.value.length > 1) {
      console.log('\n' + chalk.bold('Version History:'));
      for (const ver of versionsResult.value) {
        const isCurrent = ver.version === artifact.metadata.version;
        const prefix = isCurrent ? chalk.green('● ') : chalk.dim('○ ');
        const date = new Date(ver.createdAt).toLocaleString();
        console.log(
          `${prefix}${ver.version} - ${date}${isCurrent ? chalk.green(' (current)') : ''}`
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
