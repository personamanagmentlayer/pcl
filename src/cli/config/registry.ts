/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Registry Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { IBackend } from '../../registry/index.js';
import {
  MemoryBackend,
  JSONFileBackend,
  SQLiteBackend,
  PostgreSQLBackend,
  RegistryManager,
} from '../../registry/index.js';

export interface BackendConfig {
  type: 'memory' | 'json-file' | 'sqlite' | 'postgres';
  // JSON file options
  filePath?: string;
  pretty?: boolean;
  autoSave?: boolean;
  // SQLite options
  path?: string;
  // PostgreSQL options
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
}

export interface CLIRegistryConfig {
  default?: string;
  backends: Record<string, BackendConfig>;
}

export interface ProviderConfig {
  apiKey?: string;
}

export interface CLIConfig {
  registry: CLIRegistryConfig;
  providers?: {
    default?: string;
    anthropic?: ProviderConfig;
    openai?: ProviderConfig;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CLIConfig = {
  registry: {
    default: 'local',
    backends: {
      local: {
        type: 'json-file',
        filePath: join(homedir(), '.pcl', 'registry.json'),
        pretty: true,
        autoSave: true,
      },
      memory: {
        type: 'memory',
      },
    },
  },
  providers: {
    default: 'mock',
  },
};

/**
 * Configuration file paths
 */
function getConfigPaths(): { global: string; local: string } {
  return {
    global: join(homedir(), '.pcl', 'config.json'),
    local: join(process.cwd(), '.pcl', 'config.json'),
  };
}

/**
 * Load configuration from file
 */
export function loadConfig(): CLIConfig {
  const paths = getConfigPaths();

  // Try local config first
  if (existsSync(paths.local)) {
    try {
      const content = readFileSync(paths.local, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(
        `Warning: Failed to parse local config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Try global config
  if (existsSync(paths.global)) {
    try {
      const content = readFileSync(paths.global, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(
        `Warning: Failed to parse global config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Return default config
  return DEFAULT_CONFIG;
}

/**
 * Save configuration to file
 */
export function saveConfig(
  config: CLIConfig,
  scope: 'global' | 'local' = 'global'
): void {
  const paths = getConfigPaths();
  const path = scope === 'global' ? paths.global : paths.local;

  // Ensure directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write config
  writeFileSync(path, JSON.stringify(config, null, 2));
}

/**
 * Get backend configuration
 */
export function getBackendConfig(backendName?: string): BackendConfig | null {
  const config = loadConfig();
  const name = backendName || config.registry.default || 'local';
  return config.registry.backends[name] || null;
}

/**
 * Create backend instance from configuration
 */
export async function createBackend(backendName?: string): Promise<IBackend> {
  const config = getBackendConfig(backendName);

  if (!config) {
    throw new Error(
      `Backend not found: ${backendName || 'default'}\nRun 'pcl registry init' to configure.`
    );
  }

  switch (config.type) {
    case 'memory':
      return new MemoryBackend();

    case 'json-file': {
      if (!config.filePath) {
        throw new Error('JSON file backend requires a filePath');
      }

      return new JSONFileBackend({
        filePath: config.filePath,
        pretty: config.pretty ?? true,
        autoSave: config.autoSave ?? true,
      });
    }

    case 'sqlite': {
      if (!config.path) {
        throw new Error('SQLite backend requires a path');
      }

      // Ensure directory exists
      const dir = dirname(config.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      return new SQLiteBackend({
        filename: config.path,
        wal: true,
      });
    }

    case 'postgres': {
      if (!config.host || !config.database) {
        throw new Error('PostgreSQL backend requires host and database');
      }

      return new PostgreSQLBackend({
        host: config.host,
        port: config.port || 5432,
        database: config.database,
        user: config.user || 'pcl_user',
        password: config.password || '',
        max: config.max || 20,
      });
    }

    default:
      throw new Error(`Unknown backend type: ${(config as any).type}`);
  }
}

/**
 * Create registry manager instance
 */
export async function createRegistry(
  backendName?: string
): Promise<RegistryManager> {
  const backend = await createBackend(backendName);
  await backend.connect();

  return new RegistryManager({
    backend,
    autoGenerateSlugs: true,
    validateArtifacts: true,
  });
}

/**
 * Get provider configuration
 */
export function getProviderConfig(
  providerName?: string
): ProviderConfig | null {
  const config = loadConfig();

  if (!config.providers) {
    return null;
  }

  const name = providerName || config.providers.default || 'mock';

  // Get provider-specific config
  const providerConfig =
    config.providers[name as keyof typeof config.providers];

  if (!providerConfig || typeof providerConfig === 'string') {
    return null;
  }

  return providerConfig as ProviderConfig;
}

/**
 * Expand environment variables in configuration values
 */
function expandEnvVars(value: string): string {
  return value.replace(/\${([^}]+)}/g, (_, envVar) => {
    return process.env[envVar] || '';
  });
}

/**
 * Initialize configuration directory
 */
export function initConfigDir(scope: 'global' | 'local' = 'global'): string {
  const paths = getConfigPaths();
  const path = scope === 'global' ? paths.global : paths.local;
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * Check if configuration exists
 */
export function hasConfig(scope?: 'global' | 'local'): boolean {
  const paths = getConfigPaths();

  if (scope === 'global') {
    return existsSync(paths.global);
  }

  if (scope === 'local') {
    return existsSync(paths.local);
  }

  // Check both
  return existsSync(paths.local) || existsSync(paths.global);
}

/**
 * Get configuration file path
 */
export function getConfigPath(scope: 'global' | 'local' = 'global'): string {
  const paths = getConfigPaths();
  return scope === 'global' ? paths.global : paths.local;
}
