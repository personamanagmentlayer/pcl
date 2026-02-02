/**
 * PCL Runtime - Integrated Providers
 *
 * Integrates the new 8-provider system with the runtime
 * Provides convenience functions for registering all providers
 */

import {
  getProvider as getNewProvider,
  AnthropicProvider as NewAnthropicProvider,
  OpenAIProvider as NewOpenAIProvider,
  GoogleProvider as NewGoogleProvider,
  DeepSeekProvider as NewDeepSeekProvider,
  OllamaProvider as NewOllamaProvider,
  MistralProvider as NewMistralProvider,
  GroqProvider as NewGroqProvider,
  CohereProvider as NewCohereProvider,
  type ProviderConfig,
} from '../../providers';

import { createProviderAdapter } from './provider-adapter';
import { providers as runtimeRegistry } from './index';
import type { AIProvider, RateLimiterConfig } from './index';

/**
 * Provider configuration for runtime
 */
export interface RuntimeProviderConfig extends ProviderConfig {
  /** Rate limiter configuration */
  rateLimiter?: Partial<RateLimiterConfig>;
}

/**
 * Register a new provider instance with the runtime
 */
async function registerProvider(
  name: string,
  ProviderClass: any,
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  // Create and initialize the provider
  const provider = new ProviderClass();
  await provider.initialize(config);

  // Wrap with adapter
  const adapter = createProviderAdapter(provider);

  // Register with runtime registry
  runtimeRegistry.register(adapter, {
    rateLimiter: config.rateLimiter,
  });

  return adapter;
}

/**
 * Register Anthropic provider
 */
export async function registerAnthropicProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('anthropic', NewAnthropicProvider, config);
}

/**
 * Register OpenAI provider
 */
export async function registerOpenAIProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('openai', NewOpenAIProvider, config);
}

/**
 * Register Google provider
 */
export async function registerGoogleProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('google', NewGoogleProvider, config);
}

/**
 * Register DeepSeek provider
 */
export async function registerDeepSeekProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('deepseek', NewDeepSeekProvider, config);
}

/**
 * Register Ollama provider
 */
export async function registerOllamaProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('ollama', NewOllamaProvider, config);
}

/**
 * Register Mistral AI provider
 */
export async function registerMistralProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('mistral', NewMistralProvider, config);
}

/**
 * Register Groq provider
 */
export async function registerGroqProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('groq', NewGroqProvider, config);
}

/**
 * Register Cohere provider
 */
export async function registerCohereProvider(
  config: RuntimeProviderConfig
): Promise<AIProvider> {
  return registerProvider('cohere', NewCohereProvider, config);
}

/**
 * Register all providers with environment-based configuration
 *
 * Looks for API keys in environment variables:
 * - ANTHROPIC_API_KEY
 * - OPENAI_API_KEY
 * - GOOGLE_API_KEY
 * - DEEPSEEK_API_KEY
 * - MISTRAL_API_KEY
 * - GROQ_API_KEY
 * - COHERE_API_KEY
 * - OLLAMA_BASE_URL (optional, defaults to http://localhost:11434)
 */
export async function registerAllProviders(
  customConfig: Record<string, RuntimeProviderConfig> = {}
): Promise<AIProvider[]> {
  const registeredProviders: AIProvider[] = [];

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY || customConfig.anthropic) {
    try {
      const provider = await registerAnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        ...customConfig.anthropic,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register Anthropic provider:', error);
    }
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY || customConfig.openai) {
    try {
      const provider = await registerOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        ...customConfig.openai,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register OpenAI provider:', error);
    }
  }

  // Google
  if (process.env.GOOGLE_API_KEY || customConfig.google) {
    try {
      const provider = await registerGoogleProvider({
        apiKey: process.env.GOOGLE_API_KEY,
        ...customConfig.google,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register Google provider:', error);
    }
  }

  // DeepSeek
  if (process.env.DEEPSEEK_API_KEY || customConfig.deepseek) {
    try {
      const provider = await registerDeepSeekProvider({
        apiKey: process.env.DEEPSEEK_API_KEY,
        ...customConfig.deepseek,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register DeepSeek provider:', error);
    }
  }

  // Ollama (no API key required)
  try {
    const provider = await registerOllamaProvider({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ...customConfig.ollama,
    });
    registeredProviders.push(provider);
  } catch (error) {
    console.warn('[Runtime] Failed to register Ollama provider:', error);
  }

  // Mistral AI
  if (process.env.MISTRAL_API_KEY || customConfig.mistral) {
    try {
      const provider = await registerMistralProvider({
        apiKey: process.env.MISTRAL_API_KEY,
        ...customConfig.mistral,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register Mistral provider:', error);
    }
  }

  // Groq
  if (process.env.GROQ_API_KEY || customConfig.groq) {
    try {
      const provider = await registerGroqProvider({
        apiKey: process.env.GROQ_API_KEY,
        ...customConfig.groq,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register Groq provider:', error);
    }
  }

  // Cohere
  if (process.env.COHERE_API_KEY || customConfig.cohere) {
    try {
      const provider = await registerCohereProvider({
        apiKey: process.env.COHERE_API_KEY,
        ...customConfig.cohere,
      });
      registeredProviders.push(provider);
    } catch (error) {
      console.warn('[Runtime] Failed to register Cohere provider:', error);
    }
  }

  return registeredProviders;
}

/**
 * Get a provider by name (convenience function)
 */
export function getProvider(name: string): AIProvider | undefined {
  return runtimeRegistry.get(name);
}

/**
 * List all registered providers
 */
export function listProviders(): string[] {
  return runtimeRegistry.list();
}

/**
 * Get the default provider
 */
export function getDefaultProvider(): AIProvider {
  return runtimeRegistry.getDefault();
}

/**
 * Set the default provider
 */
export function setDefaultProvider(name: string): void {
  runtimeRegistry.setDefault(name);
}
