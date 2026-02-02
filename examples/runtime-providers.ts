/**
 * PCL Runtime - Provider Integration Example
 *
 * Shows how to use the new 8-provider system with the PCL runtime
 */

import {
  registerAllProviders,
  registerAnthropicProvider,
  registerOpenAIProvider,
  getDefaultProvider,
  getRuntimeProvider,
  listRuntimeProviders,
} from '@pcl/sdk/runtime/providers';

// ═══════════════════════════════════════════════════════════════════════════════
// Example 1: Register All Providers from Environment
// ═══════════════════════════════════════════════════════════════════════════════

async function example1_registerAllProviders() {
  console.log('\n=== Example 1: Register All Providers ===\n');

  // Automatically registers all providers that have API keys in env
  // Looks for: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, etc.
  const providers = await registerAllProviders();

  console.log(`Registered ${providers.length} providers:`);
  listRuntimeProviders().forEach((name) => {
    console.log(`  - ${name}`);
  });

  // Use the default provider
  const defaultProvider = getDefaultProvider();
  console.log(`\nDefault provider: ${defaultProvider.name}`);

  return providers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 2: Register Individual Providers
// ═══════════════════════════════════════════════════════════════════════════════

async function example2_registerIndividualProviders() {
  console.log('\n=== Example 2: Register Individual Providers ===\n');

  // Register Anthropic
  const anthropic = await registerAnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    timeout: 30000,
    maxRetries: 3,
    rateLimiter: {
      maxRequests: 50, // Max 50 requests per window
      windowMs: 60000, // 60 seconds
      maxTokens: 100000, // Max 100k tokens per window
    },
  });

  console.log(`Registered: ${anthropic.name}`);
  console.log(`Capabilities:`, anthropic.capabilities);

  // Register OpenAI
  const openai = await registerOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY || 'test-key',
    timeout: 30000,
    rateLimiter: {
      maxRequests: 100,
      windowMs: 60000,
    },
  });

  console.log(`\nRegistered: ${openai.name}`);
  console.log(`Capabilities:`, openai.capabilities);

  return { anthropic, openai };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 3: Generate Response with Provider
// ═══════════════════════════════════════════════════════════════════════════════

async function example3_generateResponse() {
  console.log('\n=== Example 3: Generate Response ===\n');

  // Register a provider (using Mock for this example)
  const provider = getDefaultProvider();

  // Generate a response
  const response = await provider.generateResponse({
    prompt: 'Explain quantum computing in simple terms',
    systemPrompt:
      'You are a helpful AI assistant that explains complex topics simply.',
    temperature: 0.7,
    maxTokens: 500,
  });

  console.log('Response:');
  console.log(response.content);
  console.log('\nToken Usage:');
  console.log(`  Prompt: ${response.usage.promptTokens}`);
  console.log(`  Completion: ${response.usage.completionTokens}`);
  console.log(`  Total: ${response.usage.totalTokens}`);
  console.log(`  Finish Reason: ${response.finishReason}`);

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 4: Stream Response
// ═══════════════════════════════════════════════════════════════════════════════

async function example4_streamResponse() {
  console.log('\n=== Example 4: Stream Response ===\n');

  const provider = getDefaultProvider();

  console.log('Streaming response...\n');

  let fullContent = '';
  for await (const chunk of provider.streamResponse({
    prompt: 'Write a haiku about programming',
    systemPrompt: 'You are a creative poet',
    temperature: 0.9,
  })) {
    if (chunk.content) {
      process.stdout.write(chunk.content);
      fullContent += chunk.content;
    }

    if (chunk.done) {
      console.log('\n\nFinish Reason:', chunk.finishReason);
    }
  }

  return fullContent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 5: Using Conversation History
// ═══════════════════════════════════════════════════════════════════════════════

async function example5_conversationHistory() {
  console.log('\n=== Example 5: Conversation History ===\n');

  const provider = getDefaultProvider();

  // First message
  const response1 = await provider.generateResponse({
    prompt: 'What is TypeScript?',
    systemPrompt: 'You are a programming tutor',
  });

  console.log('Assistant:', response1.content);

  // Follow-up with history
  const response2 = await provider.generateResponse({
    prompt: 'Can you give me a code example?',
    systemPrompt: 'You are a programming tutor',
    history: [
      {
        id: '1',
        from: null, // User message
        to: 'assistant',
        content: 'What is TypeScript?',
        metadata: {},
        timestamp: new Date(),
      },
      {
        id: '2',
        from: 'assistant',
        to: null,
        content: response1.content,
        metadata: {},
        timestamp: new Date(),
      },
    ],
  });

  console.log('\nAssistant:', response2.content);

  return { response1, response2 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Example 6: Using Multiple Providers
// ═══════════════════════════════════════════════════════════════════════════════

async function example6_multipleProviders() {
  console.log('\n=== Example 6: Multiple Providers ===\n');

  await registerAllProviders();

  const prompt = 'What is the meaning of life?';

  // Get responses from different providers
  for (const providerName of listRuntimeProviders()) {
    const provider = getRuntimeProvider(providerName);
    if (!provider) continue;

    console.log(`\n--- ${providerName} ---`);

    try {
      const response = await provider.generateResponse({
        prompt,
        temperature: 0.8,
        maxTokens: 100,
      });

      console.log(response.content.substring(0, 200) + '...');
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Run Examples
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    // Run examples
    await example1_registerAllProviders();
    await example2_registerIndividualProviders();

    // These examples require actual API keys
    if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      await example3_generateResponse();
      await example4_streamResponse();
      await example5_conversationHistory();
      await example6_multipleProviders();
    } else {
      console.log('\nSkipping generation examples (no API keys configured)');
      console.log(
        'Set ANTHROPIC_API_KEY or OPENAI_API_KEY to run all examples'
      );
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
