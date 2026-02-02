/**
 * Provider System Tests
 *
 * Tests for provider registry and Anthropic provider
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  getProviderRegistry,
  registerProvider,
  getProvider,
  listProviders,
  AnthropicProvider,
  OpenAIProvider,
  GoogleProvider,
  DeepSeekProvider,
  OllamaProvider,
  MistralProvider,
  GroqProvider,
  CohereProvider,
} from '../../dist/providers/index.js';

describe('Provider Registry', () => {
  let registry;

  before(() => {
    registry = getProviderRegistry();
  });

  after(async () => {
    await registry.shutdownAll();
  });

  it('should have Anthropic provider registered', () => {
    const providers = listProviders();
    const anthropic = providers.find((p) => p.name === 'anthropic');

    assert.ok(anthropic, 'Anthropic provider should be registered');
    assert.strictEqual(anthropic.displayName, 'Anthropic');
  });

  it('should list all registered providers', () => {
    const providers = listProviders();
    assert.ok(Array.isArray(providers), 'Should return array of providers');
    assert.ok(providers.length > 0, 'Should have at least one provider');
  });

  it('should check if provider exists', () => {
    assert.ok(registry.has('anthropic'), 'Should have anthropic provider');
    assert.ok(!registry.has('nonexistent'), 'Should not have nonexistent provider');
  });

  it('should get provider metadata', () => {
    const metadata = registry.getMetadata('anthropic');
    assert.ok(metadata, 'Should return metadata');
    assert.strictEqual(metadata.name, 'anthropic');
    assert.strictEqual(metadata.displayName, 'Anthropic');
  });
});

describe('Anthropic Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new AnthropicProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'anthropic');
    assert.strictEqual(provider.displayName, 'Anthropic');
  });

  it('should require API key for initialization', async () => {
    const provider = new AnthropicProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'Anthropic API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new AnthropicProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for Claude 3.5 Sonnet
    const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');
    assert.ok(sonnet, 'Should have Claude 3.5 Sonnet');
    assert.strictEqual(sonnet.name, 'Claude 3.5 Sonnet');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('claude-3-5-sonnet-20241022');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'claude-3-5-sonnet-20241022');
    assert.strictEqual(model.name, 'Claude 3.5 Sonnet');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should check if model exists', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const hasSonnet = await provider.hasModel('claude-3-5-sonnet-20241022');
    assert.ok(hasSonnet, 'Should have Claude 3.5 Sonnet');

    const hasNonexistent = await provider.hasModel('nonexistent-model');
    assert.ok(!hasNonexistent, 'Should not have nonexistent model');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.vision, true);
    assert.strictEqual(capabilities.systemMessages, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should estimate token count', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const text = 'Hello, world!';
    const tokens = await provider.countTokens(text);
    assert.ok(tokens > 0, 'Should return positive token count');
    assert.ok(tokens <= text.length, 'Token count should be reasonable');

    await provider.shutdown();
  });

  it('should require initialization before completion', async () => {
    const provider = new AnthropicProvider();

    await assert.rejects(
      async () => {
        await provider.complete({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
        });
      },
      {
        message: /not initialized/,
      },
      'Should reject if not initialized'
    );
  });

  it('should validate completion request', async () => {
    const provider = new AnthropicProvider();
    await provider.initialize({ apiKey: 'test-key' });

    await assert.rejects(
      async () => {
        await provider.complete({
          model: '',
          messages: [],
        });
      },
      {
        message: /Model is required|At least one message/,
      },
      'Should reject invalid request'
    );

    await provider.shutdown();
  });
});

describe('OpenAI Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new OpenAIProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'openai');
    assert.strictEqual(provider.displayName, 'OpenAI');
  });

  it('should require API key for initialization', async () => {
    const provider = new OpenAIProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'OpenAI API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new OpenAIProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for GPT-4 Turbo
    const gpt4turbo = models.find((m) => m.id === 'gpt-4-turbo-2024-04-09');
    assert.ok(gpt4turbo, 'Should have GPT-4 Turbo');
    assert.strictEqual(gpt4turbo.name, 'GPT-4 Turbo');

    // Check for GPT-4o
    const gpt4o = models.find((m) => m.id === 'gpt-4o');
    assert.ok(gpt4o, 'Should have GPT-4o');

    // Check for GPT-3.5 Turbo
    const gpt35 = models.find((m) => m.id === 'gpt-3.5-turbo-0125');
    assert.ok(gpt35, 'Should have GPT-3.5 Turbo');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('gpt-4-turbo-2024-04-09');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'gpt-4-turbo-2024-04-09');
    assert.strictEqual(model.name, 'GPT-4 Turbo');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should check if model exists', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const hasGPT4 = await provider.hasModel('gpt-4-turbo-2024-04-09');
    assert.ok(hasGPT4, 'Should have GPT-4 Turbo');

    const hasNonexistent = await provider.hasModel('nonexistent-model');
    assert.ok(!hasNonexistent, 'Should not have nonexistent model');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.vision, true);
    assert.strictEqual(capabilities.jsonMode, true);
    assert.strictEqual(capabilities.systemMessages, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should estimate token count', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const text = 'Hello, world!';
    const tokens = await provider.countTokens(text);
    assert.ok(tokens > 0, 'Should return positive token count');
    assert.ok(tokens <= text.length, 'Token count should be reasonable');

    await provider.shutdown();
  });

  it('should have OpenAI provider registered', () => {
    const providers = listProviders();
    const openai = providers.find((p) => p.name === 'openai');

    assert.ok(openai, 'OpenAI provider should be registered');
    assert.strictEqual(openai.displayName, 'OpenAI');
  });
});

describe('Google Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new GoogleProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'google');
    assert.strictEqual(provider.displayName, 'Google');
  });

  it('should require API key for initialization', async () => {
    const provider = new GoogleProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'Google API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new GoogleProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new GoogleProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for Gemini 2.0 Flash
    const gemini2 = models.find((m) => m.id === 'gemini-2.0-flash-exp');
    assert.ok(gemini2, 'Should have Gemini 2.0 Flash');
    assert.strictEqual(gemini2.name, 'Gemini 2.0 Flash (Experimental)');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new GoogleProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('gemini-1.5-pro');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'gemini-1.5-pro');
    assert.strictEqual(model.name, 'Gemini 1.5 Pro');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should check if model exists', async () => {
    const provider = new GoogleProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const hasGemini = await provider.hasModel('gemini-1.5-pro');
    assert.ok(hasGemini, 'Should have Gemini 1.5 Pro');

    const hasNonexistent = await provider.hasModel('nonexistent-model');
    assert.ok(!hasNonexistent, 'Should not have nonexistent model');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new GoogleProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.vision, true);
    assert.strictEqual(capabilities.systemMessages, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should estimate token count', async () => {
    const provider = new GoogleProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const text = 'Hello, world!';
    const tokens = await provider.countTokens(text);
    assert.ok(tokens > 0, 'Should return positive token count');
    assert.ok(tokens <= text.length, 'Token count should be reasonable');

    await provider.shutdown();
  });

  it('should have Google provider registered', () => {
    const providers = listProviders();
    const google = providers.find((p) => p.name === 'google');

    assert.ok(google, 'Google provider should be registered');
    assert.strictEqual(google.displayName, 'Google');
  });
});

describe('DeepSeek Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new DeepSeekProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'deepseek');
    assert.strictEqual(provider.displayName, 'DeepSeek');
  });

  it('should require API key for initialization', async () => {
    const provider = new DeepSeekProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'DeepSeek API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new DeepSeekProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for DeepSeek Chat
    const chat = models.find((m) => m.id === 'deepseek-chat');
    assert.ok(chat, 'Should have DeepSeek Chat');
    assert.strictEqual(chat.name, 'DeepSeek Chat');

    // Check for DeepSeek Coder
    const coder = models.find((m) => m.id === 'deepseek-coder');
    assert.ok(coder, 'Should have DeepSeek Coder');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('deepseek-chat');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'deepseek-chat');
    assert.strictEqual(model.name, 'DeepSeek Chat');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should check if model exists', async () => {
    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const hasChat = await provider.hasModel('deepseek-chat');
    assert.ok(hasChat, 'Should have DeepSeek Chat');

    const hasNonexistent = await provider.hasModel('nonexistent-model');
    assert.ok(!hasNonexistent, 'Should not have nonexistent model');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.systemMessages, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should estimate token count', async () => {
    const provider = new DeepSeekProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const text = 'Hello, world!';
    const tokens = await provider.countTokens(text);
    assert.ok(tokens > 0, 'Should return positive token count');
    assert.ok(tokens <= text.length, 'Token count should be reasonable');

    await provider.shutdown();
  });

  it('should have DeepSeek provider registered', () => {
    const providers = listProviders();
    const deepseek = providers.find((p) => p.name === 'deepseek');

    assert.ok(deepseek, 'DeepSeek provider should be registered');
    assert.strictEqual(deepseek.displayName, 'DeepSeek');
  });
});

describe('Ollama Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new OllamaProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'ollama');
    assert.strictEqual(provider.displayName, 'Ollama');
  });

  it('should allow initialization without API key', async () => {
    const provider = new OllamaProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({});
    }, 'Should initialize without API key');

    await provider.shutdown();
  });

  it('should initialize with custom baseUrl', async () => {
    const provider = new OllamaProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ baseUrl: 'http://custom:11434' });
    }, 'Should initialize with custom baseUrl');

    await provider.shutdown();
  });

  it('should reject invalid baseUrl', async () => {
    const provider = new OllamaProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({ baseUrl: 'invalid-url' });
      },
      {
        message: /must start with http/,
      },
      'Should reject invalid baseUrl'
    );
  });

  it('should list available models', async () => {
    const provider = new OllamaProvider();
    await provider.initialize({});

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    // Ollama may have 0 models if none installed, so just check array type

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new OllamaProvider();
    await provider.initialize({});

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.jsonMode, true);
    assert.strictEqual(capabilities.systemMessages, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should estimate token count', async () => {
    const provider = new OllamaProvider();
    await provider.initialize({});

    const text = 'Hello, world!';
    const tokens = await provider.countTokens(text);
    assert.ok(tokens > 0, 'Should return positive token count');
    assert.ok(tokens <= text.length, 'Token count should be reasonable');

    await provider.shutdown();
  });

  it('should have Ollama provider registered', () => {
    const providers = listProviders();
    const ollama = providers.find((p) => p.name === 'ollama');

    assert.ok(ollama, 'Ollama provider should be registered');
    assert.strictEqual(ollama.displayName, 'Ollama');
  });

  it('should have free pricing for local models', async () => {
    const provider = new OllamaProvider();
    await provider.initialize({});

    const models = await provider.getModels();
    // All Ollama models should be free (0 cost)
    for (const model of models) {
      assert.strictEqual(model.inputTokenCost, 0, 'Input tokens should be free');
      assert.strictEqual(model.outputTokenCost, 0, 'Output tokens should be free');
    }

    await provider.shutdown();
  });
});

describe('Mistral AI Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new MistralProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'mistral');
    assert.strictEqual(provider.displayName, 'Mistral AI');
  });

  it('should require API key for initialization', async () => {
    const provider = new MistralProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'Mistral API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new MistralProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new MistralProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for Mistral Large
    const large = models.find((m) => m.id === 'mistral-large-latest');
    assert.ok(large, 'Should have Mistral Large');
    assert.strictEqual(large.name, 'Mistral Large');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new MistralProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('mistral-small-latest');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'mistral-small-latest');
    assert.strictEqual(model.name, 'Mistral Small');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new MistralProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.jsonMode, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should have Mistral provider registered', () => {
    const providers = listProviders();
    const mistral = providers.find((p) => p.name === 'mistral');

    assert.ok(mistral, 'Mistral provider should be registered');
    assert.strictEqual(mistral.displayName, 'Mistral AI');
  });
});

describe('Groq Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new GroqProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'groq');
    assert.strictEqual(provider.displayName, 'Groq');
  });

  it('should require API key for initialization', async () => {
    const provider = new GroqProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'Groq API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new GroqProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new GroqProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for Llama 3.3 70B
    const llama = models.find((m) => m.id === 'llama-3.3-70b-versatile');
    assert.ok(llama, 'Should have Llama 3.3 70B');
    assert.strictEqual(llama.name, 'Llama 3.3 70B');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new GroqProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('llama-3.1-8b-instant');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'llama-3.1-8b-instant');
    assert.strictEqual(model.name, 'Llama 3.1 8B Instant');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new GroqProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should have Groq provider registered', () => {
    const providers = listProviders();
    const groq = providers.find((p) => p.name === 'groq');

    assert.ok(groq, 'Groq provider should be registered');
    assert.strictEqual(groq.displayName, 'Groq');
  });
});

describe('Cohere Provider', () => {
  let provider;

  it('should create provider instance', () => {
    provider = new CohereProvider();
    assert.ok(provider, 'Provider should be created');
    assert.strictEqual(provider.name, 'cohere');
    assert.strictEqual(provider.displayName, 'Cohere');
  });

  it('should require API key for initialization', async () => {
    const provider = new CohereProvider();

    await assert.rejects(
      async () => {
        await provider.initialize({});
      },
      {
        message: 'Cohere API key is required',
      },
      'Should reject without API key'
    );
  });

  it('should initialize with API key', async () => {
    const provider = new CohereProvider();

    await assert.doesNotReject(async () => {
      await provider.initialize({ apiKey: 'test-key' });
    }, 'Should initialize with API key');

    await provider.shutdown();
  });

  it('should list available models', async () => {
    const provider = new CohereProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const models = await provider.getModels();
    assert.ok(Array.isArray(models), 'Should return array of models');
    assert.ok(models.length > 0, 'Should have at least one model');

    // Check for Command R+
    const commandRPlus = models.find((m) => m.id === 'command-r-plus');
    assert.ok(commandRPlus, 'Should have Command R+');
    assert.strictEqual(commandRPlus.name, 'Command R+');

    await provider.shutdown();
  });

  it('should get specific model info', async () => {
    const provider = new CohereProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const model = await provider.getModel('command-r');
    assert.ok(model, 'Should return model');
    assert.strictEqual(model.id, 'command-r');
    assert.strictEqual(model.name, 'Command R');
    assert.ok(model.capabilities, 'Should have capabilities');

    await provider.shutdown();
  });

  it('should report capabilities', async () => {
    const provider = new CohereProvider();
    await provider.initialize({ apiKey: 'test-key' });

    const capabilities = provider.getCapabilities();
    assert.ok(capabilities, 'Should have capabilities');
    assert.strictEqual(capabilities.streaming, true);
    assert.strictEqual(capabilities.functionCalling, true);
    assert.strictEqual(capabilities.topK, true);
    assert.ok(capabilities.maxContextTokens > 0, 'Should have max context tokens');

    await provider.shutdown();
  });

  it('should have Cohere provider registered', () => {
    const providers = listProviders();
    const cohere = providers.find((p) => p.name === 'cohere');

    assert.ok(cohere, 'Cohere provider should be registered');
    assert.strictEqual(cohere.displayName, 'Cohere');
  });
});

console.log('✅ All provider tests passed');
