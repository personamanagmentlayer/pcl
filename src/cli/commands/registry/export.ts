/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Export Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { JSONFileBackend } from '../../../registry/backends/json-file';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ExportOptions {
  output: string;
  registry?: string;
  includeVersions?: boolean;
  includeDeleted?: boolean;
  compress?: boolean;
  pretty?: boolean;
}

/**
 * Export registry data to file
 */
export const exportCommand = {
  handler: async (args: ExportOptions): Promise<void> => {
    try {
      const registryPath = resolve(args.registry!);
      const outputPath = resolve(args.output);

      // Check if registry exists
      if (!existsSync(registryPath)) {
        console.error(`❌ Registry not found: ${registryPath}`);
        process.exit(1);
      }

      // Create backend
      const backend = new JSONFileBackend({
        filePath: registryPath,
        autoSave: false,
      });

      // Connect to registry
      const connectResult = await backend.connect();
      if (!connectResult.ok) {
        console.error(
          '❌ Failed to connect to registry:',
          connectResult.error.message
        );
        process.exit(1);
      }

      console.log(`📦 Exporting registry from: ${registryPath}`);
      console.log(`📝 Output file: ${outputPath}`);
      console.log('');

      // Export to file
      const result = await backend.exportToFile(outputPath, {
        includeVersions: args.includeVersions,
        includeDeleted: args.includeDeleted,
        compress: args.compress,
        pretty: args.pretty,
      });

      if (!result.ok) {
        console.error('❌ Export failed:', result.error.message);
        process.exit(1);
      }

      console.log('✅ Export completed successfully!');
      console.log('');
      console.log('Options:');
      console.log(`  Include versions: ${args.includeVersions ? 'Yes' : 'No'}`);
      console.log(`  Include deleted: ${args.includeDeleted ? 'Yes' : 'No'}`);
      console.log(`  Compressed: ${args.compress ? 'Yes' : 'No'}`);
      console.log(`  Pretty-print: ${args.pretty ? 'Yes' : 'No'}`);

      await backend.disconnect();
    } catch (error) {
      console.error(
        '❌ Export error:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  },
};
