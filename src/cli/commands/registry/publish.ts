/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Publish Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createRegistry } from '../../config/registry';
import { formatSuccess, formatError, formatWarning } from '../../utils/output';
import { chalk } from '../../utils/colors';

export interface PublishOptions {
  backend?: string;
  force?: boolean;
}

/**
 * Publish an artifact (make it publicly available)
 */
export async function publishCommand(
  idOrSlug: string,
  options: PublishOptions = {}
): Promise<void> {
  const { backend, force = false } = options;

  try {
    // Connect to registry
    const registry = await createRegistry(backend);

    // Find artifact
    console.log(`Looking up artifact: ${idOrSlug}`);
    let result = await registry.read(idOrSlug);

    // If not found, try by slug/name
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

    const artifact = result.value;

    // Check if already published
    if (artifact.published) {
      if (!force) {
        console.log(
          formatWarning(
            `Artifact is already published: ${artifact.metadata.name} (${artifact.metadata.version})`
          )
        );
        console.log('Use --force to re-publish');
        // await registry.close(); // Not needed - auto-closes on process exit
        return;
      }
    }

    // Publish artifact
    console.log(`Publishing ${artifact.type}: ${artifact.metadata.name}...`);
    const publishResult = await registry.publish(artifact.id, artifact.metadata.version);

    if (!publishResult.ok) {
      console.error(formatError('Failed to publish artifact'));
      console.error(publishResult.error.message);
      process.exit(1);
    }

    console.log(
      formatSuccess(
        `Published ${artifact.metadata.name} v${artifact.metadata.version}`
      )
    );

    // Display artifact details
    console.log('\n' + chalk.bold('Artifact Details:'));
    console.log(`  ID:      ${chalk.dim(artifact.id)}`);
    console.log(`  Name:    ${chalk.cyan(artifact.metadata.name)}`);
    console.log(`  Type:    ${chalk.yellow(artifact.type)}`);
    console.log(`  Version: ${chalk.green(artifact.metadata.version)}`);
    console.log(`  Slug:    ${chalk.blue(artifact.metadata.slug || '(none)')}`);

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
