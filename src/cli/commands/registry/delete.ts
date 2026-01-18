/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Delete Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as readline from 'readline';
import { createRegistry } from '../../config/registry';
import { formatSuccess, formatError, formatWarning } from '../../utils/output';
import { chalk } from '../../utils/colors';

export interface DeleteOptions {
  backend?: string;
  purge?: boolean;
  force?: boolean;
}

/**
 * Delete an artifact (soft delete by default, hard delete with --purge)
 */
export async function deleteCommand(
  idOrSlug: string,
  options: DeleteOptions = {}
): Promise<void> {
  const { backend, purge = false, force = false } = options;

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

    // Check if already deleted
    if (artifact.deleted && !purge) {
      console.log(
        formatWarning(
          `Artifact is already deleted: ${artifact.metadata.name} (${artifact.id})`
        )
      );
      console.log('Use --purge to permanently delete');
      // await registry.close(); // Not needed - auto-closes on process exit
      return;
    }

    // Confirm deletion
    if (!force) {
      const action = purge ? 'PERMANENTLY DELETE' : 'delete';
      const warning = purge
        ? chalk.red('This action CANNOT be undone!')
        : 'This artifact can be recovered later.';

      console.log(
        formatWarning(`You are about to ${action} the following artifact:`)
      );
      console.log(`  Name:    ${chalk.cyan(artifact.metadata.name)}`);
      console.log(`  Type:    ${chalk.yellow(artifact.type)}`);
      console.log(`  Version: ${chalk.green(artifact.metadata.version)}`);
      console.log(`  ID:      ${chalk.dim(artifact.id)}`);
      console.log(`\n${warning}`);

      const confirmed = await confirm(
        `\nAre you sure you want to ${action} this artifact?`
      );

      if (!confirmed) {
        console.log('Cancelled');
        // await registry.close(); // Not needed - auto-closes on process exit
        return;
      }
    }

    // Delete or purge artifact
    let deleteResult;
    if (purge) {
      console.log('Permanently deleting artifact...');
      // Purge = permanent delete
      deleteResult = await registry.delete(artifact.id);
    } else {
      console.log('Deleting artifact (soft delete)...');
      deleteResult = await registry.delete(artifact.id);
    }

    if (!deleteResult.ok) {
      console.error(
        formatError(`Failed to ${purge ? 'purge' : 'delete'} artifact`)
      );
      console.error(deleteResult.error.message);
      process.exit(1);
    }

    if (purge) {
      console.log(
        formatSuccess(
          `Permanently deleted ${artifact.metadata.name} (${artifact.id})`
        )
      );
    } else {
      console.log(
        formatSuccess(`Deleted ${artifact.metadata.name} (${artifact.id})`)
      );
      console.log(
        formatWarning(
          'This is a soft delete. Use --purge to permanently delete.'
        )
      );
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

/**
 * Prompt user for confirmation
 */
function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
