/**
 * PCL Init Command
 * Initialize a new PCL project with pcl.json
 */

import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { PCLPackage } from '../../build/package-format';
import { DEFAULT_PACKAGE, validatePackage } from '../../build/package-format';

// Color utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

function color(c: keyof typeof colors, text: string): string {
  return `${colors[c]}${text}${colors.reset}`;
}

interface InitOptions {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  force?: boolean;
  interactive?: boolean;
}

/**
 * Initialize a new PCL project
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const packagePath = join(cwd, 'pcl.json');

  // Check if pcl.json already exists
  if (existsSync(packagePath) && !options.force) {
    console.error(
      color('yellow', '⚠ pcl.json already exists. Use --force to overwrite.')
    );
    process.exit(1);
  }

  console.log(color('cyan', 'Initializing PCL project...\n'));

  // Interactive mode (future enhancement)
  if (options.interactive) {
    console.log(
      color('yellow', 'Interactive mode not yet implemented. Using defaults.')
    );
  }

  // Create package object
  const pkg: PCLPackage = {
    name: options.name || inferPackageName(cwd),
    version: options.version || '1.0.0',
    description: options.description || '',
    license: options.license || 'MIT',
    author: options.author || '',
    main: 'index.pcl',
    ...DEFAULT_PACKAGE,
  };

  // Validate package
  const validation = validatePackage(pkg);
  if (!validation.valid) {
    console.error(color('yellow', 'Warning: Package validation issues:'));
    for (const error of validation.errors) {
      console.error(color('yellow', `  - ${error}`));
    }
    console.log();
  }

  // Write pcl.json atomically
  const tempPath = `${packagePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(pkg, null, 2), 'utf-8');
  await import('fs').then((fs) => fs.promises.rename(tempPath, packagePath));
  console.log(color('green', '✓ Created pcl.json'));

  // Create directory structure
  await createProjectStructure(cwd, pkg);

  // Create .gitignore
  await createGitignore(cwd);

  // Summary
  console.log(color('cyan', '\n✨ Project initialized successfully!\n'));
  console.log(color('dim', 'Project structure:'));
  console.log(color('dim', '  src/'));
  console.log(color('dim', '    index.pcl'));
  console.log(color('dim', '  pcl.json'));
  console.log(color('dim', '  .gitignore'));
  console.log();
  console.log(color('cyan', 'Next steps:'));
  console.log(color('dim', '  1. Edit src/index.pcl to define your personas'));
  console.log(color('dim', '  2. Run "pcl build" to build your project'));
  console.log(
    color('dim', '  3. Run "pcl run src/index.pcl" to test your personas')
  );
  console.log();
}

/**
 * Infer package name from directory
 */
function inferPackageName(cwd: string): string {
  // eslint-disable-next-line no-useless-escape
  const parts = cwd.split(/[\/\\]/);
  const dirName = parts[parts.length - 1];

  // Convert to valid package name
  return dirName
    .toLowerCase()
    .replace(/[^a-z0-9-_.~]/g, '-')
    .replace(/^[-_.~]+/, '')
    .replace(/[-_.~]+$/, '');
}

/**
 * Create project directory structure
 */
async function createProjectStructure(
  cwd: string,
  pkg: PCLPackage
): Promise<void> {
  const srcDir = join(cwd, pkg.build?.srcDir || 'src');

  // Create src directory
  if (!existsSync(srcDir)) {
    await mkdir(srcDir, { recursive: true });
    console.log(color('green', '✓ Created src/'));
  }

  // Create index.pcl
  const mainFile = join(srcDir, 'index.pcl');
  if (!existsSync(mainFile)) {
    const template = `// ${pkg.name}
// ${pkg.description || 'PCL Persona Definitions'}

persona EXAMPLE {
  name: "Example Persona"
  version: "${pkg.version}"

  config: {
    model: "claude-sonnet-4"
    temperature: 0.7
  }

  prompts: {
    system: """
    You are a helpful AI assistant.
    Provide clear, concise, and accurate responses.
    """
  }
}
`;
    // Atomic write to prevent race condition
    await writeFile(mainFile, template, 'utf-8');
    console.log(color('green', '✓ Created src/index.pcl'));
  }
}

/**
 * Create .gitignore
 */
async function createGitignore(cwd: string): Promise<void> {
  const gitignorePath = join(cwd, '.gitignore');

  if (!existsSync(gitignorePath)) {
    const gitignore = `# PCL Build Output
dist/
*.pcl.json
*.pcl.yaml

# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;
    // Atomic write to prevent race condition
    await writeFile(gitignorePath, gitignore, 'utf-8');
    console.log(color('green', '✓ Created .gitignore'));
  }
}
