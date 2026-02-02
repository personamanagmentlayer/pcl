/**
 * PCL Package Format
 * Defines the structure of pcl.json (PCL project manifest)
 */

/**
 * PCL Package Manifest (pcl.json)
 */
export interface PCLPackage {
  // Package metadata
  name: string;
  version: string;
  description?: string;
  license?: string;
  author?: string | Author;
  homepage?: string;
  repository?: string | Repository;

  // PCL-specific
  main?: string; // Main PCL file (default: "index.pcl")
  personas?: string[]; // Persona entry points
  teams?: string[]; // Team entry points
  workflows?: string[]; // Workflow entry points
  skills?: string[]; // Skill directories

  // Dependencies
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;

  // Build configuration
  build?: BuildConfig;

  // Scripts
  scripts?: Record<string, string>;

  // Publishing
  files?: string[];
  private?: boolean;

  // Metadata
  keywords?: string[];
  engines?: {
    pcl?: string;
    node?: string;
  };
}

export interface Author {
  name: string;
  email?: string;
  url?: string;
}

export interface Repository {
  type: string;
  url: string;
  directory?: string;
}

export interface BuildConfig {
  // Output directory
  outDir?: string; // Default: "dist"

  // Source directory
  srcDir?: string; // Default: "src"

  // Target formats
  targets?: BuildTarget[];

  // Include/exclude patterns
  include?: string[];
  exclude?: string[];

  // Bundling options
  bundle?: boolean; // Bundle dependencies
  minify?: boolean; // Minify output
  sourcemap?: boolean; // Generate sourcemaps

  // Type checking
  strict?: boolean; // Strict type checking
  skipTypeCheck?: boolean; // Skip type checking
}

export type BuildTarget =
  | 'prompt' // Generate prompts
  | 'json' // Generate JSON
  | 'yaml' // Generate YAML
  | 'typescript' // Generate TypeScript
  | 'markdown'; // Generate documentation

/**
 * PCL Lock File (pcl-lock.json)
 */
export interface PCLLockFile {
  version: string; // Lock file format version
  packageVersion: string; // Package version when locked
  lockfileVersion: number; // Lockfile format version (1, 2, 3...)

  // Dependency tree
  dependencies?: Record<string, LockDependency>;
  devDependencies?: Record<string, LockDependency>;

  // Integrity hashes
  integrity?: Record<string, string>;
}

export interface LockDependency {
  version: string;
  resolved?: string; // URL where package was fetched
  integrity?: string; // Integrity hash (SHA-512)
  dependencies?: Record<string, string>; // Nested dependencies
}

/**
 * Default package.json template
 */
export const DEFAULT_PACKAGE: Partial<PCLPackage> = {
  version: '1.0.0',
  main: 'index.pcl',
  build: {
    outDir: 'dist',
    srcDir: 'src',
    targets: ['prompt', 'json'],
    bundle: false,
    minify: false,
    sourcemap: false,
    strict: false,
  },
  engines: {
    pcl: '^1.0.0',
    node: '>=20.0.0',
  },
};

/**
 * Validate package.json
 */
export function validatePackage(pkg: PCLPackage): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!pkg.name) {
    errors.push('Missing required field: name');
  } else {
    // Validate name format (npm package name rules)
    const namePattern =
      /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    if (!namePattern.test(pkg.name)) {
      errors.push(
        `Invalid package name: "${pkg.name}". Must follow npm naming rules (lowercase, hyphens, dots, underscores)`
      );
    }
  }

  if (!pkg.version) {
    errors.push('Missing required field: version');
  } else {
    // Validate semver format
    const semverPattern =
      /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    if (!semverPattern.test(pkg.version)) {
      errors.push(
        `Invalid version: "${pkg.version}". Must follow semver format (e.g., 1.0.0)`
      );
    }
  }

  // Validate main file
  if (pkg.main && !pkg.main.endsWith('.pcl')) {
    errors.push(`Main file must be a .pcl file, got: "${pkg.main}"`);
  }

  // Validate build targets
  if (pkg.build?.targets) {
    const validTargets: BuildTarget[] = [
      'prompt',
      'json',
      'yaml',
      'typescript',
      'markdown',
    ];
    for (const target of pkg.build.targets) {
      if (!validTargets.includes(target)) {
        errors.push(
          `Invalid build target: "${target}". Must be one of: ${validTargets.join(', ')}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge package configurations (for overrides)
 */
export function mergePackages(
  base: PCLPackage,
  override: Partial<PCLPackage>
): PCLPackage {
  return {
    ...base,
    ...override,
    dependencies: {
      ...base.dependencies,
      ...override.dependencies,
    },
    devDependencies: {
      ...base.devDependencies,
      ...override.devDependencies,
    },
    build: {
      ...base.build,
      ...override.build,
    },
  };
}
