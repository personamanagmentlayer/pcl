/**
 * CLI Commands for Skills Management
 * Implements import, export, validate, list, and info commands for PCL skills
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { resolve, join, basename, dirname, extname } from 'path';
import {
  parseSkillMd,
  toSkillMd,
  loadSkillFromFile,
  saveSkillToFile,
  type PCLSkill,
  type SkillMetadata,
} from '../../skills/skill-loader';

// ═══════════════════════════════════════════════════════════════════════════════
//                              COLOR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function color(c: keyof typeof colors, text: string): string {
  return `${colors[c]}${text}${colors.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SKILL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate skill against Agent Skills specification
 */
function validateAgentSkillsSpec(skill: PCLSkill): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!skill.name) {
    errors.push('Missing required field: name');
  } else {
    // Name validation: lowercase letters, numbers, hyphens only
    const namePattern = /^[a-z][a-z0-9-]*$/;
    if (!namePattern.test(skill.name)) {
      errors.push(
        `Invalid skill name: "${skill.name}". Must match pattern: ^[a-z][a-z0-9-]*$ (lowercase letters, numbers, hyphens only)`
      );
    }
  }

  if (!skill.description) {
    errors.push('Missing required field: description');
  }

  if (!skill.instructions || skill.instructions.trim() === '') {
    errors.push('Missing or empty instructions');
  }

  // Warnings for best practices
  if (skill.instructions && skill.instructions.length < 50) {
    warnings.push(
      'Instructions are very short (<50 chars). Consider adding more detail.'
    );
  }

  if (!skill.tools || skill.tools.length === 0) {
    warnings.push(
      'No allowed-tools specified. Consider restricting tool access for security.'
    );
  }

  if (!skill.examples || skill.examples.length === 0) {
    warnings.push(
      'No examples provided. Examples help users understand usage.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate skill against Claude Code specification
 */
function validateClaudeCodeSpec(skill: PCLSkill): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields (same as Agent Skills)
  if (!skill.name) {
    errors.push('Missing required field: name');
  }

  if (!skill.description) {
    errors.push('Missing required field: description');
  }

  if (!skill.instructions || skill.instructions.trim() === '') {
    errors.push('Missing or empty instructions');
  }

  // Claude Code specific checks
  if (skill.config?.context && skill.config.context !== 'fork') {
    errors.push(
      `Invalid context value: "${skill.config.context}". Must be "fork" or omitted.`
    );
  }

  // Warnings
  if (!skill.config?.model) {
    warnings.push(
      'No model specified. Consider specifying preferred model (e.g., "claude-sonnet-4")'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SKILL DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find all SKILL.md files in a directory (recursively)
 */
async function findSkillFiles(directory: string): Promise<string[]> {
  const skillFiles: string[] = [];

  async function scan(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name === 'SKILL.md') {
          skillFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore inaccessible directories
    }
  }

  await scan(directory);
  return skillFiles;
}

/**
 * Discover skills from common locations
 */
async function discoverSkills(): Promise<
  Array<{ path: string; skill: PCLSkill }>
> {
  const skills: Array<{ path: string; skill: PCLSkill }> = [];

  // Common skill locations
  const locations = [
    join(process.env.HOME || process.env.USERPROFILE || '', '.claude/skills'),
    join(process.cwd(), '.claude/skills'),
    join(process.cwd(), 'examples/skills'),
    join(process.cwd(), 'skills'),
  ];

  for (const location of locations) {
    if (existsSync(location)) {
      const skillFiles = await findSkillFiles(location);

      for (const file of skillFiles) {
        try {
          const skill = await loadSkillFromFile(file);
          skills.push({ path: file, skill });
        } catch (error) {
          // Skip invalid skills
        }
      }
    }
  }

  return skills;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

interface SkillCommandOptions {
  output?: string;
  format?: 'agentskills' | 'claude-code' | 'pcl';
  spec?: 'agentskills' | 'claude-code';
  recursive?: boolean;
  verbose?: boolean;
  force?: boolean;
}

/**
 * Import skill(s) from SKILL.md format
 *
 * Examples:
 *   pcl skill import ~/.claude/skills/python-expert/SKILL.md -o ./skills/
 *   pcl skill import ~/.claude/skills/ -o ./skills/ --recursive
 */
export async function importCommand(
  source: string,
  options: SkillCommandOptions
): Promise<void> {
  const sourcePath = resolve(source);

  if (!existsSync(sourcePath)) {
    console.error(color('red', `Error: Source not found: ${sourcePath}`));
    process.exit(1);
  }

  const stats = await stat(sourcePath);

  if (stats.isFile()) {
    // Import single file
    await importSingleFile(sourcePath, options);
  } else if (stats.isDirectory()) {
    // Import directory
    await importDirectory(sourcePath, options);
  } else {
    console.error(color('red', `Error: Invalid source: ${sourcePath}`));
    process.exit(1);
  }
}

async function importSingleFile(
  filePath: string,
  options: SkillCommandOptions
): Promise<void> {
  try {
    console.log(color('cyan', `Importing ${filePath}...`));

    const skill = await loadSkillFromFile(filePath);

    // Output location
    const outputDir = options.output || './skills';
    const outputPath = join(outputDir, skill.name, 'SKILL.md');

    // Create directory
    await mkdir(dirname(outputPath), { recursive: true });

    // Save skill
    await saveSkillToFile(skill, outputPath);

    console.log(color('green', `✓ Imported skill: ${skill.name}`));
    console.log(color('dim', `  Output: ${outputPath}`));

    if (options.verbose) {
      console.log(color('dim', `  Description: ${skill.description}`));
      if (skill.tools) {
        console.log(color('dim', `  Tools: ${skill.tools.join(', ')}`));
      }
    }
  } catch (error) {
    console.error(
      color(
        'red',
        `Error importing ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

async function importDirectory(
  directory: string,
  options: SkillCommandOptions
): Promise<void> {
  console.log(color('cyan', `Scanning ${directory} for skills...`));

  const skillFiles = await findSkillFiles(directory);

  if (skillFiles.length === 0) {
    console.log(color('yellow', 'No skills found.'));
    return;
  }

  console.log(
    color('cyan', `Found ${skillFiles.length} skill(s). Importing...\n`)
  );

  let imported = 0;
  let failed = 0;

  for (const file of skillFiles) {
    try {
      const skill = await loadSkillFromFile(file);

      // Output location
      const outputDir = options.output || './skills';
      const outputPath = join(outputDir, skill.name, 'SKILL.md');

      // Create directory
      await mkdir(dirname(outputPath), { recursive: true });

      // Save skill
      await saveSkillToFile(skill, outputPath);

      console.log(color('green', `✓ ${skill.name}`));
      if (options.verbose) {
        console.log(color('dim', `  Source: ${file}`));
        console.log(color('dim', `  Output: ${outputPath}`));
      }

      imported++;
    } catch (error) {
      console.error(
        color(
          'red',
          `✗ ${basename(dirname(file))}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      failed++;
    }
  }

  console.log(
    color('cyan', `\nImport complete: ${imported} imported, ${failed} failed`)
  );
}

/**
 * Export skill to specified format
 *
 * Examples:
 *   pcl skill export ./skills/python-expert/SKILL.md --format agentskills
 *   pcl skill export ./skills/python-expert/SKILL.md -o ~/.claude/skills/python-expert/
 */
export async function exportCommand(
  source: string,
  options: SkillCommandOptions
): Promise<void> {
  const sourcePath = resolve(source);

  if (!existsSync(sourcePath)) {
    console.error(color('red', `Error: Source not found: ${sourcePath}`));
    process.exit(1);
  }

  try {
    console.log(color('cyan', `Exporting ${sourcePath}...`));

    const skill = await loadSkillFromFile(sourcePath);
    const format = options.format || 'claude-code';

    // Convert to SKILL.md format
    const output = toSkillMd(skill);

    // Determine output path
    let outputPath: string;
    if (options.output) {
      const stats = existsSync(options.output)
        ? await stat(options.output)
        : null;
      if (stats?.isDirectory()) {
        outputPath = join(options.output, skill.name, 'SKILL.md');
      } else {
        outputPath = options.output;
      }
    } else {
      outputPath = join(process.cwd(), `${skill.name}.md`);
    }

    // Create directory
    await mkdir(dirname(outputPath), { recursive: true });

    // Write output
    await writeFile(outputPath, output, 'utf-8');

    console.log(color('green', `✓ Exported skill: ${skill.name}`));
    console.log(color('dim', `  Format: ${format}`));
    console.log(color('dim', `  Output: ${outputPath}`));
  } catch (error) {
    console.error(
      color(
        'red',
        `Error exporting skill: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Validate skill against specification
 *
 * Examples:
 *   pcl skill validate ./skills/python-expert/SKILL.md --spec agentskills
 *   pcl skill validate ./skills/ --spec claude-code --recursive
 */
export async function validateCommand(
  source: string,
  options: SkillCommandOptions
): Promise<void> {
  const sourcePath = resolve(source);

  if (!existsSync(sourcePath)) {
    console.error(color('red', `Error: Source not found: ${sourcePath}`));
    process.exit(1);
  }

  const stats = await stat(sourcePath);
  const spec = options.spec || 'agentskills';

  if (stats.isFile()) {
    await validateSingleFile(sourcePath, spec, options);
  } else if (stats.isDirectory()) {
    await validateDirectory(sourcePath, spec, options);
  }
}

async function validateSingleFile(
  filePath: string,
  spec: 'agentskills' | 'claude-code',
  options: SkillCommandOptions
): Promise<void> {
  try {
    const skill = await loadSkillFromFile(filePath);

    console.log(color('cyan', `Validating ${skill.name} against ${spec}...`));

    const result =
      spec === 'agentskills'
        ? validateAgentSkillsSpec(skill)
        : validateClaudeCodeSpec(skill);

    if (result.valid) {
      console.log(color('green', `✓ Valid ${spec} skill`));
    } else {
      console.log(color('red', `✗ Validation failed`));
    }

    // Show errors
    if (result.errors.length > 0) {
      console.log(color('red', '\nErrors:'));
      for (const error of result.errors) {
        console.log(color('red', `  - ${error}`));
      }
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log(color('yellow', '\nWarnings:'));
      for (const warning of result.warnings) {
        console.log(color('yellow', `  - ${warning}`));
      }
    }

    if (!result.valid) {
      process.exit(1);
    }
  } catch (error) {
    console.error(
      color(
        'red',
        `Error validating skill: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

async function validateDirectory(
  directory: string,
  spec: 'agentskills' | 'claude-code',
  options: SkillCommandOptions
): Promise<void> {
  console.log(color('cyan', `Scanning ${directory} for skills...`));

  const skillFiles = await findSkillFiles(directory);

  if (skillFiles.length === 0) {
    console.log(color('yellow', 'No skills found.'));
    return;
  }

  console.log(
    color('cyan', `Found ${skillFiles.length} skill(s). Validating...\n`)
  );

  let valid = 0;
  let invalid = 0;

  for (const file of skillFiles) {
    try {
      const skill = await loadSkillFromFile(file);

      const result =
        spec === 'agentskills'
          ? validateAgentSkillsSpec(skill)
          : validateClaudeCodeSpec(skill);

      if (result.valid) {
        console.log(color('green', `✓ ${skill.name}`));
        valid++;
      } else {
        console.log(color('red', `✗ ${skill.name}`));
        for (const error of result.errors) {
          console.log(color('red', `    - ${error}`));
        }
        invalid++;
      }

      if (options.verbose && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(color('yellow', `    ⚠ ${warning}`));
        }
      }
    } catch (error) {
      console.log(
        color(
          'red',
          `✗ ${basename(dirname(file))}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      invalid++;
    }
  }

  console.log(
    color('cyan', `\nValidation complete: ${valid} valid, ${invalid} invalid`)
  );

  if (invalid > 0) {
    process.exit(1);
  }
}

/**
 * List all available skills
 *
 * Examples:
 *   pcl skill list
 *   pcl skill list --verbose
 */
export async function listCommand(options: SkillCommandOptions): Promise<void> {
  console.log(color('cyan', 'Discovering skills...\n'));

  const skills = await discoverSkills();

  if (skills.length === 0) {
    console.log(color('yellow', 'No skills found.'));
    console.log(color('dim', '\nSearched locations:'));
    console.log(color('dim', '  - ~/.claude/skills/'));
    console.log(color('dim', '  - ./.claude/skills/'));
    console.log(color('dim', '  - ./examples/skills/'));
    console.log(color('dim', '  - ./skills/'));
    return;
  }

  console.log(color('bold', `Found ${skills.length} skill(s):\n`));

  for (const { path, skill } of skills) {
    console.log(color('cyan', `● ${skill.name}`));
    console.log(color('dim', `  ${skill.description}`));

    if (options.verbose) {
      console.log(color('dim', `  Path: ${path}`));
      if (skill.tools && skill.tools.length > 0) {
        console.log(color('dim', `  Tools: ${skill.tools.join(', ')}`));
      }
      if (skill.config?.model) {
        console.log(color('dim', `  Model: ${skill.config.model}`));
      }
    }

    console.log();
  }
}

/**
 * Show detailed information about a skill
 *
 * Examples:
 *   pcl skill info python-expert
 *   pcl skill info ./skills/python-expert/SKILL.md
 */
export async function infoCommand(
  skillNameOrPath: string,
  options: SkillCommandOptions
): Promise<void> {
  let skillPath: string;
  let skill: PCLSkill;

  // Check if it's a file path
  if (existsSync(skillNameOrPath)) {
    skillPath = resolve(skillNameOrPath);
    skill = await loadSkillFromFile(skillPath);
  } else {
    // Try to find by name
    const skills = await discoverSkills();
    const found = skills.find((s) => s.skill.name === skillNameOrPath);

    if (!found) {
      console.error(color('red', `Error: Skill not found: ${skillNameOrPath}`));
      console.log(color('dim', '\nAvailable skills:'));
      for (const s of skills) {
        console.log(color('dim', `  - ${s.skill.name}`));
      }
      process.exit(1);
    }

    skillPath = found.path;
    skill = found.skill;
  }

  // Display skill information
  console.log(color('bold', `\n${skill.name}\n`));
  console.log(color('dim', skill.description));
  console.log();

  // Metadata
  console.log(color('bold', 'Metadata:'));
  console.log(color('cyan', '  Path: ') + skillPath);

  if (skill.version) {
    console.log(color('cyan', '  Version: ') + skill.version);
  }

  if (skill.category) {
    console.log(color('cyan', '  Category: ') + skill.category);
  }

  if (skill.metadata?.author) {
    console.log(color('cyan', '  Author: ') + skill.metadata.author);
  }

  if (skill.metadata?.license) {
    console.log(color('cyan', '  License: ') + skill.metadata.license);
  }

  // Configuration
  if (skill.config) {
    console.log(color('bold', '\nConfiguration:'));
    if (skill.config.model) {
      console.log(color('cyan', '  Model: ') + skill.config.model);
    }
    if (skill.config.context) {
      console.log(color('cyan', '  Context: ') + skill.config.context);
    }
    if (skill.config.agent) {
      console.log(color('cyan', '  Agent: ') + skill.config.agent);
    }
  }

  // Tools
  if (skill.tools && skill.tools.length > 0) {
    console.log(color('bold', '\nAllowed Tools:'));
    for (const tool of skill.tools) {
      console.log(color('dim', `  - ${tool}`));
    }
  }

  // Dependencies
  if (skill.dependencies && skill.dependencies.length > 0) {
    console.log(color('bold', '\nDependencies:'));
    for (const dep of skill.dependencies) {
      console.log(color('dim', `  - ${dep}`));
    }
  }

  // Examples
  if (skill.examples && skill.examples.length > 0) {
    console.log(color('bold', `\nExamples (${skill.examples.length}):`));
    for (const example of skill.examples) {
      console.log(color('cyan', `  ● ${example.description}`));
    }
  }

  // Instructions (preview)
  if (skill.instructions && options.verbose) {
    console.log(color('bold', '\nInstructions:'));
    const preview = skill.instructions.substring(0, 500);
    console.log(color('dim', preview));
    if (skill.instructions.length > 500) {
      console.log(color('dim', '\n  ... (truncated)'));
    }
  }

  console.log();
}
