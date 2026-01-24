/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Import Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { JSONFileBackend } from '../../../registry/backends/json-file';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ImportOptions {
  input: string;
  registry?: string;
  merge?: boolean;
  skipDuplicates?: boolean;
  compressed?: boolean;
}

/**
 * Import registry data from file
 */
export const importCommand = {
  handler: async (args: ImportOptions): Promise<void> => {
    try {
      const inputPath = resolve(args.input);
      const registryPath = resolve(args.registry!);

      // Check if input file exists
      if (!existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
      }

      // Create backend
      const backend = new JSONFileBackend({
        filePath: registryPath,
        autoSave: true,
      });

      // Connect to registry (create if doesn't exist)
      const connectResult = await backend.connect();
      if (!connectResult.ok) {
        console.error(
          '❌ Failed to connect to registry:',
          connectResult.error.message
        );
        process.exit(1);
      }

      console.log(`📦 Importing from: ${inputPath}`);
      console.log(`📝 Target registry: ${registryPath}`);
      console.log('');

      // Import from file
      const result = await backend.importFromFile(inputPath, {
        merge: args.merge,
        skipDuplicates: args.skipDuplicates,
        compressed: args.compressed,
      });

      if (!result.ok) {
        console.error('❌ Import failed:', result.error.message);
        process.exit(1);
      }

      const { imported, skipped, errors } = result.value;

      console.log('✅ Import completed!');
      console.log('');
      console.log('Results:');
      console.log(`  Imported: ${imported} artifacts`);
      console.log(`  Skipped: ${skipped} duplicates`);
      console.log(`  Errors: ${errors.length}`);

      if (errors.length > 0) {
        console.log('');
        console.log('Errors encountered:');
        for (const error of errors.slice(0, 10)) {
          console.log(`  ⚠️  ${error}`);
        }
        if (errors.length > 10) {
          console.log(`  ... and ${errors.length - 10} more errors`);
        }
      }

      console.log('');
      console.log('Options:');
      console.log(`  Merge mode: ${args.merge ? 'Yes' : 'No (replace)'}`);
      console.log(`  Skip duplicates: ${args.skipDuplicates ? 'Yes' : 'No'}`);
      console.log(`  Compressed: ${args.compressed ? 'Yes' : 'No'}`);

      await backend.disconnect();

      // Exit with error code if there were errors
      if (errors.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(
        '❌ Import error:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  },
};
