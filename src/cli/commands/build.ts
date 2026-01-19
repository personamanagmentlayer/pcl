/**
 * PCL Build Command
 * Build PCL projects according to pcl.json configuration
 */

import { existsSync, readFileSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename, relative } from 'path';
import { glob } from 'glob';
import type { PCLPackage, BuildTarget } from '../../build/package-format';
import { validatePackage } from '../../build/package-format';
import { parse } from '../../parser';
import {
  generatePrompt,
  generateJSON,
  generateTypeScript,
  generateMarkdown,
} from '../../codegen';
import type { PersonaDeclaration } from '../../ast';

// Color utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function color(c: keyof typeof colors, text: string): string {
  return `${colors[c]}${text}${colors.reset}`;
}

interface BuildOptions {
  config?: string; // Path to pcl.json
  watch?: boolean;
  verbose?: boolean;
  target?: BuildTarget;
}

/**
 * Build PCL project
 */
export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const configPath = options.config || join(cwd, 'pcl.json');

  // Load pcl.json
  if (!existsSync(configPath)) {
    console.error(color('red', 'Error: pcl.json not found'));
    console.log(color('dim', 'Run "pcl init" to create a new project'));
    process.exit(1);
  }

  const pkg: PCLPackage = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Validate package
  const validation = validatePackage(pkg);
  if (!validation.valid) {
    console.error(color('red', 'Error: Invalid pcl.json:'));
    for (const error of validation.errors) {
      console.error(color('red', `  - ${error}`));
    }
    process.exit(1);
  }

  console.log(color('cyan', `Building ${pkg.name}@${pkg.version}...\n`));

  const srcDir = pkg.build?.srcDir || 'src';
  const outDir = pkg.build?.outDir || 'dist';
  const targets = options.target ? [options.target] : pkg.build?.targets || ['prompt', 'json'];

  // Find all PCL files
  const include = pkg.build?.include || ['**/*.pcl'];
  const exclude = pkg.build?.exclude || ['node_modules/**', 'dist/**'];

  const files = await glob(include, {
    cwd: join(cwd, srcDir),
    ignore: exclude,
    absolute: false,
  });

  if (files.length === 0) {
    console.log(color('yellow', 'No PCL files found in src/'));
    return;
  }

  console.log(color('dim', `Found ${files.length} file(s) to build`));

  let builtCount = 0;
  let errorCount = 0;

  // Build each file
  for (const file of files) {
    const inputPath = join(cwd, srcDir, file);
    const relativePath = file;

    if (options.verbose) {
      console.log(color('dim', `\nBuilding ${relativePath}...`));
    }

    try {
      // Parse file
      const source = await readFile(inputPath, 'utf-8');
      const parseResult = parse(source, { source: relativePath });

      if (!parseResult.ok) {
        console.error(color('red', `✗ ${relativePath}: Parse error`));
        for (const error of parseResult.error) {
          console.error(color('red', `    ${error.message}`));
        }
        errorCount++;
        continue;
      }

      const program = parseResult.value.program;

      // Build for each target
      for (const target of targets) {
        await buildTarget(program, relativePath, target, cwd, srcDir, outDir, options);
      }

      console.log(color('green', `✓ ${relativePath}`));
      builtCount++;
    } catch (error) {
      console.error(
        color('red', `✗ ${relativePath}: ${error instanceof Error ? error.message : String(error)}`)
      );
      errorCount++;
    }
  }

  // Summary
  console.log(color('cyan', `\nBuild complete: ${builtCount} succeeded, ${errorCount} failed`));

  if (errorCount > 0) {
    process.exit(1);
  }
}

/**
 * Build for specific target
 */
async function buildTarget(
  program: any,
  relativePath: string,
  target: BuildTarget,
  cwd: string,
  srcDir: string,
  outDir: string,
  options: BuildOptions
): Promise<void> {
  const baseName = basename(relativePath, '.pcl');
  const dirName = dirname(relativePath);

  let output: string;
  let extension: string;

  switch (target) {
    case 'prompt': {
      // Generate prompt for each persona
      const personas = program.statements.filter((s: any) => s.kind === 'PersonaDeclaration');

      if (personas.length === 0) {
        if (options.verbose) {
          console.log(color('dim', `    No personas found in ${relativePath}`));
        }
        return;
      }

      for (const persona of personas) {
        output = generatePrompt(persona as PersonaDeclaration);
        extension = '.prompt.txt';

        const personaName = (persona as PersonaDeclaration).name.value;
        const outputPath = join(cwd, outDir, dirName, `${personaName}${extension}`);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, output, 'utf-8');

        if (options.verbose) {
          console.log(color('dim', `    → ${relative(cwd, outputPath)}`));
        }
      }
      break;
    }

    case 'json':
      output = generateJSON(program);
      extension = '.json';
      break;

    case 'yaml':
      // Generate YAML (using JSON as base for now)
      output = generateJSON(program);
      extension = '.yaml';
      break;

    case 'typescript':
      output = generateTypeScript(program);
      extension = '.ts';
      break;

    case 'markdown':
      output = generateMarkdown(program);
      extension = '.md';
      break;

    default:
      throw new Error(`Unknown build target: ${target}`);
  }

  // Write output (for non-prompt targets)
  if (target !== 'prompt') {
    const outputPath = join(cwd, outDir, dirName, baseName + extension);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, 'utf-8');

    if (options.verbose) {
      console.log(color('dim', `    → ${relative(cwd, outputPath)}`));
    }
  }
}
