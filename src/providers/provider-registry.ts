/**
 * PCL Provider Registry
 *
 * Manages registration and lookup of AI model providers
 */

import type {
  Provider,
  ProviderConfig,
  ProviderFactory,
  ProviderRegistryEntry,
} from './provider-interface';

/**
 * Provider registry singleton
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, ProviderRegistryEntry> = new Map();
  private activeProviders: Map<string, Provider> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get registry instance
   */
  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider
   */
  register(entry: ProviderRegistryEntry): void {
    const name = entry.metadata.name;

    if (this.providers.has(name)) {
      throw new Error(`Provider "${name}" is already registered`);
    }

    this.providers.set(name, entry);
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): void {
    // Shutdown active instance if exists
    const activeProvider = this.activeProviders.get(name);
    if (activeProvider) {
      activeProvider.shutdown().catch(() => {
        // Ignore shutdown errors
      });
      this.activeProviders.delete(name);
    }

    this.providers.delete(name);
  }

  /**
   * Check if provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider metadata
   */
  getMetadata(name: string): ProviderRegistryEntry['metadata'] | null {
    const entry = this.providers.get(name);
    return entry ? entry.metadata : null;
  }

  /**
   * List all registered providers
   */
  list(): ProviderRegistryEntry['metadata'][] {
    return Array.from(this.providers.values()).map((entry) => entry.metadata);
  }

  /**
   * Create provider instance
   */
  async create(name: string, config: ProviderConfig): Promise<Provider> {
    const entry = this.providers.get(name);

    if (!entry) {
      throw new Error(`Provider "${name}" not found. Available: ${this.listNames().join(', ')}`);
    }

    const provider = entry.factory(config);
    await provider.initialize(config);

    return provider;
  }

  /**
   * Get or create singleton provider instance
   */
  async get(name: string, config: ProviderConfig): Promise<Provider> {
    // Return existing instance if available
    const existing = this.activeProviders.get(name);
    if (existing) {
      return existing;
    }

    // Create new instance
    const provider = await this.create(name, config);
    this.activeProviders.set(name, provider);

    return provider;
  }

  /**
   * Shutdown all active providers
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.activeProviders.values()).map((provider) =>
      provider.shutdown().catch(() => {
        // Ignore shutdown errors
      })
    );

    await Promise.all(shutdownPromises);
    this.activeProviders.clear();
  }

  /**
   * List provider names
   */
  listNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.shutdownAll().catch(() => {
      // Ignore shutdown errors
    });
    this.providers.clear();
    this.activeProviders.clear();
  }
}

/**
 * Get global provider registry instance
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

/**
 * Register a provider (convenience function)
 */
export function registerProvider(entry: ProviderRegistryEntry): void {
  getProviderRegistry().register(entry);
}

/**
 * Get or create provider instance (convenience function)
 */
export async function getProvider(name: string, config: ProviderConfig): Promise<Provider> {
  return getProviderRegistry().get(name, config);
}

/**
 * List all registered providers (convenience function)
 */
export function listProviders(): ProviderRegistryEntry['metadata'][] {
  return getProviderRegistry().list();
}
