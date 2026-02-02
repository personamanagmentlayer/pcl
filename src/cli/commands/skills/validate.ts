/**
 * Skill Validate CLI Command
 *
 * Validate skill files for correctness
 */

import { readFile } from 'fs/promises';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface SkillValidateOptions {
  strict?: boolean;
  verbose?: boolean;
}

/**
 * Validate a skill file
 */
export async function skillValidateCommand(
  filePath: string,
  options: SkillValidateOptions = {}
): Promise<void> {
  const { strict = false, verbose = false } = options;

  try {
    console.log(`Validating skill: ${filePath}`);

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

    if (verbose) {
      console.log('\nParsed skill:');
      console.log(`  Name: ${skill.name}`);
      console.log(`  Description: ${skill.description}`);
      console.log(`  Category: ${skill.category || 'N/A'}`);
      console.log(`  Tools: ${skill.tools?.length || 0}`);
      console.log(`  Examples: ${skill.examples?.length || 0}`);
    }

    // Compile skill (validates structure)
    const compiler = new SkillCompiler();
    const result = compiler.compile(skill);

    // Check results
    if (!result.success) {
      console.error(formatError('Validation failed!'));
      console.error('\nErrors:');
      result.errors.forEach((err, i) => {
        console.error(`  ${i + 1}. ${err}`);
      });
      process.exit(1);
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.warn('\n⚠ Warnings:');
      result.warnings.forEach((warn, i) => {
        console.warn(`  ${i + 1}. ${warn}`);
      });

      if (strict) {
        console.error(
          '\n✗ Validation failed in strict mode (warnings treated as errors)'
        );
        process.exit(1);
      }
    }

    // Show metadata
    if (verbose && result.skill) {
      console.log('\nMetadata:');
      console.log(`  Hash: ${result.skill.hash}`);
      console.log(`  Token Count: ${result.skill.metadata.tokenCount}`);
      console.log(
        `  Instructions Length: ${result.skill.metadata.instructionsLength} chars`
      );
      console.log(`  Example Count: ${result.skill.metadata.exampleCount}`);
      console.log(`  Tool Count: ${result.skill.metadata.toolCount}`);
      console.log(
        `  Dependency Count: ${result.skill.metadata.dependencyCount}`
      );
      console.log(
        `  Compiled At: ${result.skill.metadata.compiledAt.toISOString()}`
      );
    }

    // Success
    console.log('\n✓ Skill is valid!');
    if (!verbose && result.warnings.length === 0) {
      console.log(`  Hash: ${result.skill!.hash}`);
      console.log(`  Tokens: ${result.skill!.metadata.tokenCount}`);
    }
  } catch (error) {
    console.error(
      formatError(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
