/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Registry Init Command
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { homedir } from 'os';
import { join } from 'path';
import {
  saveConfig,
  initConfigDir,
  hasConfig,
  type CLIConfig,
  type BackendConfig,
} from '../../config/registry';
import { createBackend } from '../../config/registry';
import {
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
} from '../../utils/output';
import { chalk } from '../../utils/colors';

export interface InitOptions {
  backend: 'memory' | 'json-file' | 'sqlite' | 'postgres';
  scope?: 'global' | 'local';
  // JSON file / SQLite options
  db?: string;
  // PostgreSQL options
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  // General options
  force?: boolean;
}

/**
 * Initialize a new registry database
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const { backend, scope = 'global', force = false } = options;

  try {
    // Check if config already exists
    if (hasConfig(scope) && !force) {
      console.log(
        formatWarning(
          `A ${scope} configuration already exists. Use --force to overwrite.`
        )
      );
      process.exit(1);
    }

    // Create config directory
    console.log(`Initializing ${scope} configuration...`);
    const configDir = initConfigDir(scope);
    console.log(formatInfo(`Configuration directory: ${configDir}`));

    // Build backend configuration
    const backendConfig: BackendConfig = buildBackendConfig(backend, options);

    // Create configuration
    const config: CLIConfig = {
      registry: {
        default: 'local',
        backends: {
          local: backendConfig,
          memory: {
            type: 'memory',
          },
        },
      },
      providers: {
        default: 'mock',
      },
    };

    // Test backend connection
    console.log(`Testing ${backend} backend connection...`);
    const testBackend = await createBackend('local');
    const connectResult = await testBackend.connect();

    if (!connectResult.ok) {
      console.error(formatError('Failed to connect to backend'));
      console.error(connectResult.error.message);
      process.exit(1);
    }

    console.log(formatSuccess('Backend connection successful'));

    // Run migrations if needed
    console.log('Running database migrations...');
    const migrateResult = await testBackend.migrate();

    if (!migrateResult.ok) {
      console.error(formatError('Failed to run migrations'));
      console.error(migrateResult.error.message);
      await testBackend.disconnect();
      process.exit(1);
    }

    console.log(formatSuccess('Database migrations complete'));

    // Close test connection
    await testBackend.disconnect();

    // Save configuration
    saveConfig(config, scope);
    console.log(formatSuccess(`Configuration saved (${scope})`));

    // Display configuration
    console.log('\n' + chalk.bold('Configuration:'));
    console.log(JSON.stringify(config, null, 2));

    console.log(
      '\n' +
        formatSuccess(
          'Registry initialized successfully! You can now use registry commands.'
        )
    );
  } catch (error) {
    console.error(
      formatError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}

/**
 * Build backend configuration from options
 */
function buildBackendConfig(
  backend: 'memory' | 'json-file' | 'sqlite' | 'postgres',
  options: InitOptions
): BackendConfig {
  switch (backend) {
    case 'memory':
      return { type: 'memory' };

    case 'json-file': {
      const defaultPath = join(homedir(), '.pcl', 'registry.json');
      return {
        type: 'json-file',
        filePath: options.db || defaultPath,
        pretty: true,
        autoSave: true,
      };
    }

    case 'sqlite': {
      const defaultPath = join(homedir(), '.pcl', 'registry.db');
      return {
        type: 'sqlite',
        path: options.db || defaultPath,
      };
    }

    case 'postgres': {
      if (!options.host || !options.database) {
        throw new Error(
          'PostgreSQL backend requires --host and --database options'
        );
      }

      return {
        type: 'postgres',
        host: options.host,
        port: options.port || 5432,
        database: options.database,
        user: options.user || 'pcl_user',
        password: options.password || '',
        max: options.max || 20,
      };
    }

    default:
      throw new Error(`Unknown backend type: ${backend}`);
  }
}
