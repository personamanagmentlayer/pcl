/**
 * Skill Optimize CLI Command
 *
 * Optimize skills to reduce tokens and improve efficiency
 */

import { readFile, writeFile } from 'fs/promises';
import { parseSkillMd, toSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface SkillOptimizeOptions {
  output?: string;
  aggressive?: boolean;
  dryRun?: boolean;
}

/**
 * Optimize a skill file
 */
export async function skillOptimizeCommand(
  filePath: string,
  options: SkillOptimizeOptions = {}
): Promise<void> {
  const { output, aggressive = false, dryRun = false } = options;

  try {
    console.log(`Optimizing skill: ${filePath}`);

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Get original metrics
    const compiler = new SkillCompiler();
    const originalResult = compiler.compile(skill);

    if (!originalResult.success) {
      console.error(formatError('Skill validation failed!'));
      originalResult.errors.forEach((err) => console.error(`  • ${err}`));
      process.exit(1);
    }

    const originalTokens = originalResult.skill!.metadata.tokenCount;
    const originalLength = originalResult.skill!.metadata.instructionsLength;

    console.log('\nOriginal Metrics:');
    console.log(`  Token Count: ${originalTokens}`);
    console.log(`  Instructions Length: ${originalLength} chars`);
    console.log(`  Examples: ${originalResult.skill!.metadata.exampleCount}`);

    // Optimize skill
    const optimized = optimizeSkill(skill, aggressive);

    // Compile optimized version
    const optimizedResult = compiler.compile(optimized);

    if (!optimizedResult.success) {
      console.error(formatError('Optimization resulted in invalid skill!'));
      optimizedResult.errors.forEach((err) => console.error(`  • ${err}`));
      process.exit(1);
    }

    const optimizedTokens = optimizedResult.skill!.metadata.tokenCount;
    const optimizedLength = optimizedResult.skill!.metadata.instructionsLength;

    // Calculate savings
    const tokenSavings = originalTokens - optimizedTokens;
    const tokenSavingsPct = ((tokenSavings / originalTokens) * 100).toFixed(1);
    const lengthSavings = originalLength - optimizedLength;
    const lengthSavingsPct = ((lengthSavings / originalLength) * 100).toFixed(
      1
    );

    console.log('\nOptimized Metrics:');
    console.log(
      `  Token Count: ${optimizedTokens} (${tokenSavings >= 0 ? '-' : '+'}${Math.abs(tokenSavings)} tokens, ${tokenSavingsPct}%)`
    );
    console.log(
      `  Instructions Length: ${optimizedLength} chars (${lengthSavings >= 0 ? '-' : '+'}${Math.abs(lengthSavings)} chars, ${lengthSavingsPct}%)`
    );

    if (optimizedResult.warnings.length > 0) {
      console.log('\n⚠ Warnings:');
      optimizedResult.warnings.forEach((warn) => {
        console.log(`  • ${warn}`);
      });
    }

    // Save or display
    if (!dryRun) {
      const optimizedContent = toSkillMd(optimized);
      const outputPath = output || filePath;

      await writeFile(outputPath, optimizedContent, 'utf-8');

      console.log(`\n✓ Optimized skill saved to: ${outputPath}`);
    } else {
      console.log('\n[DRY RUN] No changes written. Remove --dry-run to save.');
    }

    // Show recommendations
    if (tokenSavings < originalTokens * 0.1) {
      console.log('\n💡 Tips for further optimization:');
      console.log('  • Remove redundant examples');
      console.log('  • Simplify verbose instructions');
      console.log('  • Use --aggressive flag for more aggressive optimization');
    }
  } catch (error) {
    console.error(
      formatError(
        `Optimize error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Optimize skill content
 */
function optimizeSkill(skill: any, aggressive: boolean): any {
  const optimized = { ...skill };

  // Optimize instructions
  let instructions = skill.instructions;

  // Remove excessive whitespace
  instructions = instructions.replace(/\n\n\n+/g, '\n\n');
  instructions = instructions.replace(/[ \t]+\n/g, '\n');
  instructions = instructions.trim();

  // Remove redundant sections in aggressive mode
  if (aggressive) {
    // Remove "Resources" section if present
    instructions = instructions.replace(
      /## Resources\n\n[\s\S]*?(?=\n## |$)/g,
      ''
    );

    // Remove "Troubleshooting" section if minimal
    instructions = instructions.replace(
      /## Troubleshooting\n\n[\s\S]{0,200}(?=\n## |$)/g,
      ''
    );

    // Condense bullet points
    instructions = instructions.replace(
      /\n- ([^\n]+)\n- ([^\n]+)\n- ([^\n]+)/g,
      (match: string) => {
        if (match.length > 200) return match; // Keep long lists
        return match; // For now, keep as is
      }
    );
  }

  optimized.instructions = instructions;

  // Limit examples in aggressive mode
  if (aggressive && skill.examples && skill.examples.length > 3) {
    optimized.examples = skill.examples.slice(0, 3);
  }

  return optimized;
}
