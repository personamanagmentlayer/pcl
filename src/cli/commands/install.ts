/**
 * PCL Install Command
 * Install dependencies for PCL projects
 */

import { existsSync, readFileSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { PCLPackage, PCLLockFile } from '../../build/package-format';
import { validatePackage } from '../../build/package-format';
import { resolveDependencies, calculateInstallOrder } from '../../build/dependency-resolver';

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

interface InstallOptions {
  config?: string; // Path to pcl.json
  save?: boolean; // Save to dependencies
  saveDev?: boolean; // Save to devDependencies
  verbose?: boolean;
  production?: boolean; // Skip devDependencies
}

/**
 * Install PCL packages
 */
export async function installCommand(
  packages: string[] = [],
  options: InstallOptions = {}
): Promise<void> {
  const cwd = process.cwd();
  const configPath = options.config || join(cwd, 'pcl.json');
  const lockPath = join(cwd, 'pcl-lock.json');

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

  // Load existing lock file if it exists
  let lockFile: PCLLockFile | null = null;
  if (existsSync(lockPath)) {
    try {
      lockFile = JSON.parse(readFileSync(lockPath, 'utf-8'));
    } catch (error) {
      console.warn(color('yellow', 'Warning: Could not parse pcl-lock.json'));
    }
  }

  // Install specific packages or all dependencies
  if (packages.length > 0) {
    await installPackages(packages, pkg, lockFile, cwd, options);
  } else {
    await installAllDependencies(pkg, lockFile, cwd, options);
  }

  // Save updated pcl.json if --save or --save-dev was used
  if ((options.save || options.saveDev) && packages.length > 0) {
    await writeFile(configPath, JSON.stringify(pkg, null, 2), 'utf-8');
    console.log(color('green', '\n✓ Updated pcl.json'));
  }

  // Generate/update lock file
  const newLockFile = await generateLockFile(pkg, cwd, options);
  await writeFile(lockPath, JSON.stringify(newLockFile, null, 2), 'utf-8');
  console.log(color('green', '✓ Updated pcl-lock.json'));

  console.log(color('cyan', '\n✨ Installation complete!\n'));
}

/**
 * Install specific packages
 */
async function installPackages(
  packages: string[],
  pkg: PCLPackage,
  lockFile: PCLLockFile | null,
  cwd: string,
  options: InstallOptions
): Promise<void> {
  console.log(color('cyan', `Installing ${packages.length} package(s)...\n`));

  let installedCount = 0;
  let errorCount = 0;

  for (const packageSpec of packages) {
    try {
      const { name, version } = parsePackageSpec(packageSpec);

      if (options.verbose) {
        console.log(color('dim', `Installing ${name}@${version}...`));
      }

      // Resolve package version
      const resolvedVersion = await resolvePackageVersion(name, version, options);

      // Download and install package
      await downloadPackage(name, resolvedVersion, cwd, options);

      // Update package.json dependencies
      if (options.save) {
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies[name] = version || resolvedVersion;
      } else if (options.saveDev) {
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies[name] = version || resolvedVersion;
      }

      console.log(color('green', `✓ ${name}@${resolvedVersion}`));
      installedCount++;
    } catch (error) {
      console.error(
        color('red', `✗ ${packageSpec}: ${error instanceof Error ? error.message : String(error)}`)
      );
      errorCount++;
    }
  }

  console.log(
    color('cyan', `\nPackage installation: ${installedCount} succeeded, ${errorCount} failed`)
  );

  if (errorCount > 0) {
    process.exit(1);
  }
}

/**
 * Install all dependencies from pcl.json
 */
async function installAllDependencies(
  pkg: PCLPackage,
  lockFile: PCLLockFile | null,
  cwd: string,
  options: InstallOptions
): Promise<void> {
  const deps = pkg.dependencies || {};
  const devDeps = options.production ? {} : pkg.devDependencies || {};

  const allDeps = { ...deps, ...devDeps };
  const depCount = Object.keys(allDeps).length;

  if (depCount === 0) {
    console.log(color('yellow', 'No dependencies to install'));
    return;
  }

  console.log(color('cyan', `Installing ${depCount} package(s)...\n`));

  let installedCount = 0;
  let errorCount = 0;

  // Install dependencies
  for (const [name, versionSpec] of Object.entries(deps)) {
    try {
      const version = lockFile?.dependencies?.[name]?.version || versionSpec;

      if (options.verbose) {
        console.log(color('dim', `Installing ${name}@${version}...`));
      }

      const resolvedVersion = await resolvePackageVersion(name, version, options);
      await downloadPackage(name, resolvedVersion, cwd, options);

      console.log(color('green', `✓ ${name}@${resolvedVersion}`));
      installedCount++;
    } catch (error) {
      console.error(
        color('red', `✗ ${name}: ${error instanceof Error ? error.message : String(error)}`)
      );
      errorCount++;
    }
  }

  // Install dev dependencies (unless --production)
  if (!options.production) {
    for (const [name, versionSpec] of Object.entries(devDeps)) {
      try {
        const version = lockFile?.devDependencies?.[name]?.version || versionSpec;

        if (options.verbose) {
          console.log(color('dim', `Installing ${name}@${version} (dev)...`));
        }

        const resolvedVersion = await resolvePackageVersion(name, version, options);
        await downloadPackage(name, resolvedVersion, cwd, options);

        console.log(color('green', `✓ ${name}@${resolvedVersion} (dev)`));
        installedCount++;
      } catch (error) {
        console.error(
          color('red', `✗ ${name}: ${error instanceof Error ? error.message : String(error)}`)
        );
        errorCount++;
      }
    }
  }

  console.log(color('cyan', `\nInstallation: ${installedCount} succeeded, ${errorCount} failed`));

  if (errorCount > 0) {
    process.exit(1);
  }
}

/**
 * Parse package specification (name@version)
 */
function parsePackageSpec(spec: string): { name: string; version?: string } {
  const atIndex = spec.lastIndexOf('@');

  if (atIndex <= 0) {
    // No version specified or scoped package without version
    return { name: spec };
  }

  // Check if @ is part of scope
  if (spec.startsWith('@')) {
    const secondAt = spec.indexOf('@', 1);
    if (secondAt === -1) {
      // Scoped package without version
      return { name: spec };
    }
    return {
      name: spec.substring(0, secondAt),
      version: spec.substring(secondAt + 1),
    };
  }

  return {
    name: spec.substring(0, atIndex),
    version: spec.substring(atIndex + 1),
  };
}

/**
 * Resolve package version from registry
 */
async function resolvePackageVersion(
  name: string,
  version: string | undefined,
  options: InstallOptions
): Promise<string> {
  // TODO: Implement actual registry resolution
  // For now, return the specified version or 'latest'

  if (version && version !== 'latest' && version !== '*') {
    // Validate semver format
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    const rangePattern = /^[\^~<>=]/;

    if (semverPattern.test(version)) {
      return version;
    } else if (rangePattern.test(version)) {
      // TODO: Resolve range to specific version
      if (options.verbose) {
        console.log(color('dim', `  Resolving version range: ${version}`));
      }
      // For now, strip the range operator and use the base version
      return version.replace(/^[\^~<>=]+/, '');
    }
  }

  // TODO: Fetch latest version from registry
  if (options.verbose) {
    console.log(color('dim', `  Fetching latest version for ${name}...`));
  }

  return '1.0.0'; // Placeholder
}

/**
 * Download and install a package
 */
async function downloadPackage(
  name: string,
  version: string,
  cwd: string,
  options: InstallOptions
): Promise<void> {
  const modulesDir = join(cwd, 'pcl_modules');
  const packageDir = join(modulesDir, name);

  // Create pcl_modules directory
  await mkdir(modulesDir, { recursive: true });
  await mkdir(packageDir, { recursive: true });

  // TODO: Implement actual package download from registry
  // For now, create a placeholder

  if (options.verbose) {
    console.log(color('dim', `  Installing to ${packageDir}`));
  }

  // Create package.json in the installed package
  const packageJson = {
    name,
    version,
    // TODO: Add other metadata from registry
  };

  await writeFile(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');
}

/**
 * Generate lock file from current dependencies
 */
async function generateLockFile(
  pkg: PCLPackage,
  cwd: string,
  options: InstallOptions
): Promise<PCLLockFile> {
  const lockFile: PCLLockFile = {
    version: '1.0.0',
    packageVersion: pkg.version,
    lockfileVersion: 1,
    dependencies: {},
    devDependencies: {},
    integrity: {},
  };

  // Add dependencies to lock file
  if (pkg.dependencies) {
    for (const [name, versionSpec] of Object.entries(pkg.dependencies)) {
      const resolvedVersion = await resolvePackageVersion(name, versionSpec, options);
      lockFile.dependencies![name] = {
        version: resolvedVersion,
        resolved: `https://registry.pcl.dev/${name}/-/${name}-${resolvedVersion}.tgz`, // TODO: Use actual registry URL
        integrity: '', // TODO: Calculate integrity hash
        dependencies: {}, // TODO: Resolve transitive dependencies
      };
    }
  }

  // Add dev dependencies to lock file (unless --production)
  if (!options.production && pkg.devDependencies) {
    for (const [name, versionSpec] of Object.entries(pkg.devDependencies)) {
      const resolvedVersion = await resolvePackageVersion(name, versionSpec, options);
      lockFile.devDependencies![name] = {
        version: resolvedVersion,
        resolved: `https://registry.pcl.dev/${name}/-/${name}-${resolvedVersion}.tgz`,
        integrity: '',
        dependencies: {},
      };
    }
  }

  return lockFile;
}
