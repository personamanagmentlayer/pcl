/**
 * Skill Info CLI Command
 *
 * Show detailed skill information
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parseSkillMd } from '../../../skills/skill-loader';
import { SkillCompiler } from '../../../skills/skill-compiler';
import { formatError } from '../../utils/output';

export interface SkillInfoOptions {
  directory?: string;
}

/**
 * Show skill information
 */
export async function skillInfoCommand(
  skillName: string,
  options: SkillInfoOptions = {}
): Promise<void> {
  const { directory } = options;

  try {
    // Determine skills directory
    const skillsDir = directory || join(process.cwd(), '.claude', 'skills');
    const filePath = join(skillsDir, `${skillName}.md`);

    if (!existsSync(filePath)) {
      console.error(formatError(`Skill not found: ${skillName}`));
      console.error(`\nExpected location: ${filePath}`);
      console.error('\nAvailable skills:');
      console.error('  pcl skill list');
      process.exit(1);
    }

    // Read and parse skill
    const content = await readFile(filePath, 'utf-8');
    const skill = parseSkillMd(content);

    // Compile for metadata
    const compiler = new SkillCompiler();
    const result = compiler.compile(skill);

    // Display information
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`  ${skill.name.toUpperCase()}`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    console.log(`Description: ${skill.description}`);
    console.log(`Version: ${skill.version || 'N/A'}`);
    console.log(`Category: ${skill.category || 'N/A'}`);

    if (skill.metadata?.author) {
      console.log(`Author: ${skill.metadata.author}`);
    }

    if (skill.metadata?.license) {
      console.log(`License: ${skill.metadata.license}`);
    }

    console.log('\nCapabilities:');
    if (skill.tools && skill.tools.length > 0) {
      console.log(`  Tools: ${skill.tools.join(', ')}`);
    } else {
      console.log('  Tools: None specified');
    }

    console.log('\nContent:');
    console.log(`  Instructions: ${skill.instructions.length} characters`);
    console.log(`  Examples: ${skill.examples?.length || 0}`);

    if (result.success && result.skill) {
      console.log('\nMetadata:');
      console.log(`  Hash: ${result.skill.hash}`);
      console.log(`  Token Count: ${result.skill.metadata.tokenCount}`);
      console.log(`  Example Count: ${result.skill.metadata.exampleCount}`);
      console.log(`  Tool Count: ${result.skill.metadata.toolCount}`);
    }

    if (skill.dependencies && skill.dependencies.length > 0) {
      console.log('\nDependencies:');
      skill.dependencies.forEach((dep) => {
        console.log(`  • ${dep}`);
      });
    }

    if (skill.examples && skill.examples.length > 0) {
      console.log('\nExamples:');
      skill.examples.forEach((ex, i) => {
        console.log(`  ${i + 1}. ${ex.description}`);
      });
    }

    console.log(`\nFile: ${filePath}`);

    // Show warnings if any
    if (result.warnings.length > 0) {
      console.log('\n⚠ Warnings:');
      result.warnings.forEach((warn) => {
        console.log(`  • ${warn}`);
      });
    }

    console.log('\nActions:');
    console.log(`  Validate: pcl skill validate ${filePath}`);
    console.log(`  Compile: pcl skill compile ${filePath}`);
    console.log(`  Test: pcl skill test ${filePath}`);
  } catch (error) {
    console.error(
      formatError(
        `Info error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
