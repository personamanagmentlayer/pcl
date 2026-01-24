/**
 * PCL Dependency Resolution
 * Resolve and install PCL package dependencies
 */

import type { PCLPackage } from './package-format';

export interface DependencyNode {
  name: string;
  version: string;
  versionSpec: string;
  dependencies: Map<string, DependencyNode>;
  devDependencies: Map<string, DependencyNode>;
  resolved: string;
  integrity?: string;
}

export interface DependencyTree {
  root: DependencyNode;
  flattened: Map<string, DependencyNode>;
}

export interface ResolveOptions {
  registry?: string;
  production?: boolean;
  verbose?: boolean;
}

/**
 * Resolve dependency tree for a package
 */
export async function resolveDependencies(
  pkg: PCLPackage,
  options: ResolveOptions = {}
): Promise<DependencyTree> {
  const registry = options.registry || 'https://registry.pcl.dev';

  // Create root node
  const root: DependencyNode = {
    name: pkg.name,
    version: pkg.version,
    versionSpec: pkg.version,
    dependencies: new Map(),
    devDependencies: new Map(),
    resolved: '',
  };

  // Resolve dependencies
  if (pkg.dependencies) {
    for (const [name, versionSpec] of Object.entries(pkg.dependencies)) {
      const node = await resolveDependency(
        name,
        versionSpec,
        registry,
        new Set(),
        options
      );
      root.dependencies.set(name, node);
    }
  }

  // Resolve dev dependencies (unless --production)
  if (!options.production && pkg.devDependencies) {
    for (const [name, versionSpec] of Object.entries(pkg.devDependencies)) {
      const node = await resolveDependency(
        name,
        versionSpec,
        registry,
        new Set(),
        options
      );
      root.devDependencies.set(name, node);
    }
  }

  // Flatten dependency tree
  const flattened = flattenDependencyTree(root);

  return { root, flattened };
}

/**
 * Resolve a single dependency recursively
 */
async function resolveDependency(
  name: string,
  versionSpec: string,
  registry: string,
  visited: Set<string>,
  options: ResolveOptions
): Promise<DependencyNode> {
  const key = `${name}@${versionSpec}`;

  // Check for circular dependencies
  if (visited.has(key)) {
    throw new Error(`Circular dependency detected: ${key}`);
  }
  visited.add(key);

  // Resolve version
  const version = await resolveVersion(name, versionSpec, registry, options);

  // Fetch package metadata
  const metadata = await fetchPackageMetadata(name, version, registry, options);

  // Create node
  const node: DependencyNode = {
    name,
    version,
    versionSpec,
    dependencies: new Map(),
    devDependencies: new Map(),
    resolved: `${registry}/${name}/-/${name}-${version}.tgz`,
    integrity: metadata.integrity,
  };

  // Resolve transitive dependencies
  if (metadata.dependencies) {
    for (const [depName, depVersionSpec] of Object.entries(
      metadata.dependencies
    )) {
      const depNode = await resolveDependency(
        depName,
        depVersionSpec,
        registry,
        new Set(visited),
        options
      );
      node.dependencies.set(depName, depNode);
    }
  }

  return node;
}

/**
 * Resolve version from version specification
 */
async function resolveVersion(
  name: string,
  versionSpec: string,
  registry: string,
  options: ResolveOptions
): Promise<string> {
  // Handle exact versions
  const exactVersion = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  if (exactVersion.test(versionSpec)) {
    return versionSpec;
  }

  // Handle 'latest' and '*'
  if (versionSpec === 'latest' || versionSpec === '*') {
    return await fetchLatestVersion(name, registry, options);
  }

  // Handle caret ranges (^1.2.3)
  if (versionSpec.startsWith('^')) {
    const baseVersion = versionSpec.slice(1);
    return await resolveCaretRange(name, baseVersion, registry, options);
  }

  // Handle tilde ranges (~1.2.3)
  if (versionSpec.startsWith('~')) {
    const baseVersion = versionSpec.slice(1);
    return await resolveTildeRange(name, baseVersion, registry, options);
  }

  // Handle greater than/less than ranges
  if (/^[<>=]/.test(versionSpec)) {
    return await resolveComparisonRange(name, versionSpec, registry, options);
  }

  // Default: treat as exact version
  return versionSpec;
}

/**
 * Fetch latest version from registry
 */
async function fetchLatestVersion(
  name: string,
  registry: string,
  options: ResolveOptions
): Promise<string> {
  // TODO: Implement actual registry fetch
  // For now, return placeholder
  if (options.verbose) {
    console.log(`Fetching latest version for ${name} from ${registry}`);
  }
  return '1.0.0';
}

/**
 * Resolve caret range (^1.2.3 -> >=1.2.3 <2.0.0)
 */
async function resolveCaretRange(
  name: string,
  baseVersion: string,
  registry: string,
  options: ResolveOptions
): Promise<string> {
  // TODO: Implement actual range resolution
  // For now, return base version
  if (options.verbose) {
    console.log(`Resolving caret range ^${baseVersion} for ${name}`);
  }
  return baseVersion;
}

/**
 * Resolve tilde range (~1.2.3 -> >=1.2.3 <1.3.0)
 */
async function resolveTildeRange(
  name: string,
  baseVersion: string,
  registry: string,
  options: ResolveOptions
): Promise<string> {
  // TODO: Implement actual range resolution
  // For now, return base version
  if (options.verbose) {
    console.log(`Resolving tilde range ~${baseVersion} for ${name}`);
  }
  return baseVersion;
}

/**
 * Resolve comparison range (>=1.2.3, <2.0.0)
 */
async function resolveComparisonRange(
  name: string,
  versionSpec: string,
  registry: string,
  options: ResolveOptions
): Promise<string> {
  // TODO: Implement actual range resolution
  // For now, strip operator and return version
  if (options.verbose) {
    console.log(`Resolving comparison range ${versionSpec} for ${name}`);
  }
  return versionSpec.replace(/^[<>=]+/, '');
}

/**
 * Fetch package metadata from registry
 */
async function fetchPackageMetadata(
  name: string,
  version: string,
  registry: string,
  options: ResolveOptions
): Promise<{
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  integrity?: string;
}> {
  // TODO: Implement actual registry fetch
  // For now, return placeholder
  if (options.verbose) {
    console.log(`Fetching metadata for ${name}@${version} from ${registry}`);
  }

  return {
    name,
    version,
    dependencies: {},
    integrity: '', // TODO: Calculate integrity hash
  };
}

/**
 * Flatten dependency tree to map of unique packages
 */
function flattenDependencyTree(
  root: DependencyNode
): Map<string, DependencyNode> {
  const flattened = new Map<string, DependencyNode>();

  function traverse(node: DependencyNode) {
    // Add dependencies
    for (const [name, dep] of node.dependencies) {
      const key = `${name}@${dep.version}`;

      // Only add if not already present (deduplication)
      if (!flattened.has(name)) {
        flattened.set(name, dep);
        traverse(dep);
      } else {
        // Check for version conflicts
        const existing = flattened.get(name)!;
        if (existing.version !== dep.version) {
          console.warn(
            `Warning: Version conflict for ${name}: ${existing.version} vs ${dep.version}`
          );
        }
      }
    }

    // Add dev dependencies
    for (const [name, dep] of node.devDependencies) {
      const key = `${name}@${dep.version}`;

      if (!flattened.has(name)) {
        flattened.set(name, dep);
        traverse(dep);
      }
    }
  }

  traverse(root);

  return flattened;
}

/**
 * Check for dependency conflicts in tree
 */
export function checkDependencyConflicts(tree: DependencyTree): Array<{
  package: string;
  versions: string[];
}> {
  const conflicts: Array<{ package: string; versions: string[] }> = [];
  const versionMap = new Map<string, Set<string>>();

  // Collect all versions for each package
  function traverse(node: DependencyNode) {
    for (const [name, dep] of node.dependencies) {
      if (!versionMap.has(name)) {
        versionMap.set(name, new Set());
      }
      versionMap.get(name)!.add(dep.version);
      traverse(dep);
    }

    for (const [name, dep] of node.devDependencies) {
      if (!versionMap.has(name)) {
        versionMap.set(name, new Set());
      }
      versionMap.get(name)!.add(dep.version);
      traverse(dep);
    }
  }

  traverse(tree.root);

  // Find conflicts (packages with multiple versions)
  for (const [name, versions] of versionMap) {
    if (versions.size > 1) {
      conflicts.push({
        package: name,
        versions: Array.from(versions),
      });
    }
  }

  return conflicts;
}

/**
 * Validate dependency tree integrity
 */
export function validateDependencyTree(tree: DependencyTree): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  function traverse(node: DependencyNode, path: string[] = []) {
    const currentPath = [...path, `${node.name}@${node.version}`];

    // Check for circular dependencies
    if (path.some((p) => p === `${node.name}@${node.version}`)) {
      errors.push(`Circular dependency: ${currentPath.join(' -> ')}`);
      return;
    }

    // Validate dependencies
    for (const [name, dep] of node.dependencies) {
      traverse(dep, currentPath);
    }

    // Validate dev dependencies
    for (const [name, dep] of node.devDependencies) {
      traverse(dep, currentPath);
    }
  }

  traverse(tree.root);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate install order from dependency tree
 */
export function calculateInstallOrder(tree: DependencyTree): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function traverse(node: DependencyNode) {
    const key = `${node.name}@${node.version}`;

    if (visited.has(key)) {
      return;
    }

    // Visit dependencies first (depth-first)
    for (const dep of node.dependencies.values()) {
      traverse(dep);
    }

    for (const dep of node.devDependencies.values()) {
      traverse(dep);
    }

    // Then add current node
    if (node.name) {
      // Skip root
      order.push(key);
      visited.add(key);
    }
  }

  traverse(tree.root);

  return order;
}
