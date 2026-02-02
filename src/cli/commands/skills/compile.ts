/**
 * Skill Compile CLI Command
 *
 * Compile skill files and output metadata
 */

import { readFile, writeFile } from 'fs/promises';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import {
  formatError,
  formatOutput,
  type OutputFormat,
} from '../../utils/output';

export interface SkillCompileOptions {
  output?: string;
  format?: OutputFormat;
  verbose?: boolean;
}

/**
 * Compile a skill file
 */
export async function skillCompileCommand(
  filePath: string,
  options: SkillCompileOptions = {}
): Promise<void> {
  const { output, format = 'json', verbose = false } = options;

  try {
    console.log(`Compiling skill: ${filePath}`);

    // Read file
    const content = await readFile(filePath, 'utf-8');

    // Parse skill
    let skill;
    try {
      skill = parseSkillMd(content);
    } catch (error) {
      console.error(formatError('Failed to parse skill file'));
      console.error((error as Error).message);
      process.exit(1);
    }

    // Compile skill
    const compiler = new SkillCompiler();
    const result = compiler.compile(skill);

    // Check results
    if (!result.success) {
      console.error(formatError('Compilation failed!'));
      console.error('\nErrors:');
      result.errors.forEach((err, i) => {
        console.error(`  ${i + 1}. ${err}`);
      });
      process.exit(1);
    }

    const compiled = result.skill!;

    // Show warnings
    if (result.warnings.length > 0) {
      console.warn('\n⚠ Warnings:');
      result.warnings.forEach((warn, i) => {
        console.warn(`  ${i + 1}. ${warn}`);
      });
    }

    // Prepare output data
    const compiledData = {
      name: compiled.skill.name,
      hash: compiled.hash,
      metadata: {
        compiledAt: compiled.metadata.compiledAt.toISOString(),
        tokenCount: compiled.metadata.tokenCount,
        instructionsLength: compiled.metadata.instructionsLength,
        exampleCount: compiled.metadata.exampleCount,
        toolCount: compiled.metadata.toolCount,
        dependencyCount: compiled.metadata.dependencyCount,
      },
      skill: compiled.skill,
      resolvedDependencies: compiled.resolvedDependencies,
    };

    // Output to file or console
    if (output) {
      const outputContent =
        format === 'json'
          ? JSON.stringify(compiledData, null, 2)
          : format === 'yaml'
            ? formatOutput([compiledData], 'yaml')
            : formatOutput([compiledData], format);

      await writeFile(output, outputContent, 'utf-8');
      console.log(`\n✓ Compiled skill written to: ${output}`);
    } else {
      // Display to console
      console.log('\n✓ Skill compiled successfully!');
      console.log(`\n${formatOutput([compiledData], format)}`);
    }

    if (verbose) {
      console.log('\nDetailed Metadata:');
      console.log(`  Name: ${compiled.skill.name}`);
      console.log(`  Hash: ${compiled.hash}`);
      console.log(`  Token Count: ${compiled.metadata.tokenCount}`);
      console.log(
        `  Instructions: ${compiled.metadata.instructionsLength} chars`
      );
      console.log(`  Examples: ${compiled.metadata.exampleCount}`);
      console.log(`  Tools: ${compiled.metadata.toolCount}`);
      console.log(`  Dependencies: ${compiled.metadata.dependencyCount}`);
      console.log(`  Compiled: ${compiled.metadata.compiledAt.toISOString()}`);
    }
  } catch (error) {
    console.error(
      formatError(
        `Compilation error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
