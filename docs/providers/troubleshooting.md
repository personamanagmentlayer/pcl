# Provider Troubleshooting Guide

Solutions to common issues when using PCL providers.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authentication Errors](#authentication-errors)
- [Rate Limiting](#rate-limiting)
- [Cost Issues](#cost-issues)
- [Performance Problems](#performance-problems)
- [Provider-Specific Issues](#provider-specific-issues)

---

## Connection Issues

### Error: "Failed to connect to provider"

**Symptoms**: Requests timeout or connection refused

**Solutions**:

1. **Check internet connection**

   ```bash
   ping 8.8.8.8
   ```

2. **Verify API endpoint is accessible**

   ```bash
   # For Anthropic
   curl https://api.anthropic.com/v1/messages

   # For OpenAI
   curl https://api.openai.com/v1/chat/completions

   # For Gemini
   curl https://generativelanguage.googleapis.com/v1/models
   ```

3. **Check firewall/proxy settings**

   ```typescript
   // If behind a proxy
   import { HttpsProxyAgent } from 'https-proxy-agent';

   const provider = new OpenAIProvider({
     apiKey: process.env.OPENAI_API_KEY!,
     // Add proxy configuration if needed
   });
   ```

4. **For Ollama: Ensure server is running**

   ```bash
   # Start Ollama server
   ollama serve

   # Verify it's running
   curl http://localhost:11434/api/version
   ```

### Error: "Request timeout"

**Symptoms**: Requests hang and eventually timeout

**Solutions**:

1. **Increase timeout**

   ```typescript
   const chain = registry.createFallbackChain()
     .withTimeout(60000) // 60 seconds instead of default 30
     .build(...);
   ```

2. **Reduce request size**

   ```typescript
   // If sending large context
   const response = await provider.generateResponse({
     prompt: largeText.slice(0, 10000), // Limit context size
     maxTokens: 500, // Limit response size
   });
   ```

3. **Use streaming for long responses**
   ```typescript
   // Streaming starts faster
   for await (const chunk of provider.streamResponse({ prompt })) {
     process.stdout.write(chunk.content);
   }
   ```

---

## Authentication Errors

### Error: "Invalid API key"

**Symptoms**: 401 Unauthorized, "Invalid authentication"

**Solutions**:

1. **Verify API key is correct**

   ```bash
   # Check environment variable
   echo $OPENAI_API_KEY

   # Check .env file
   cat .env | grep API_KEY
   ```

2. **Ensure no extra spaces/characters**

   ```typescript
   // ✅ Good
   apiKey: process.env.OPENAI_API_KEY!.trim();

   // ❌ Bad - may have trailing spaces
   apiKey: process.env.OPENAI_API_KEY!;
   ```

3. **Check key has correct permissions**
   - Anthropic: Verify at https://console.anthropic.com/
   - OpenAI: Check at https://platform.openai.com/api-keys
   - Google: Verify at https://makersuite.google.com/app/apikey

4. **Regenerate key if needed**

### Error: "API key not found"

**Symptoms**: TypeError: Cannot read property of undefined

**Solutions**:

1. **Load environment variables**

   ```typescript
   import 'dotenv/config'; // Add this at the top

   const provider = new OpenAIProvider({
     apiKey: process.env.OPENAI_API_KEY!,
   });
   ```

2. **Check .env file location**

   ```bash
   # .env should be in project root
   ls -la .env
   ```

3. **Add .env to .gitignore**
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

### Azure: "Resource not found"

**Solutions**:

1. **Verify resource name**

   ```typescript
   // Extract from full endpoint: https://MY-RESOURCE.openai.azure.com/
   const provider = new AzureOpenAIProvider({
     apiKey: process.env.AZURE_OPENAI_API_KEY!,
     resourceName: 'MY-RESOURCE', // Not the full URL!
     deployment: 'gpt-4-deployment',
   });
   ```

2. **Check deployment name**
   ```bash
   # List deployments
   az cognitiveservices account deployment list \
     --name MY-RESOURCE \
     --resource-group MY-RESOURCE-GROUP
   ```

### AWS Bedrock: "Access denied"

**Solutions**:

1. **Verify AWS credentials**

   ```bash
   aws sts get-caller-identity
   ```

2. **Check IAM permissions**

   ```json
   {
     "Effect": "Allow",
     "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
     "Resource": "*"
   }
   ```

3. **Enable model access**
   - Go to AWS Bedrock console
   - Request access to models (Claude, Titan, etc.)
   - Wait for approval (can take a few hours)

---

## Rate Limiting

### Error: "Rate limit exceeded"

**Symptoms**: 429 Too Many Requests

**Solutions**:

1. **Implement rate limiting**

   ```typescript
   registry.register(provider, {
     rateLimiter: {
       requestsPerMinute: 60, // Match your API tier
       tokensPerMinute: 100_000,
       enableQueuing: true, // Queue excess requests
     },
   });
   ```

2. **Use exponential backoff**

   ```typescript
   async function generateWithRetry(prompt: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await provider.generateResponse({ prompt });
       } catch (error: any) {
         if (error.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           console.log(`Rate limited, retrying in ${delay}ms...`);
           await new Promise((resolve) => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

3. **Batch requests**

   ```typescript
   // Instead of many small requests
   const results = [];
   for (const item of items) {
     const result = await provider.generateResponse({ prompt: item });
     results.push(result);
     await new Promise((resolve) => setTimeout(resolve, 100)); // Delay
   }
   ```

4. **Upgrade API tier**
   - Check provider's pricing page for higher rate limits
   - Contact support for enterprise limits

### Tokens Per Minute Exceeded

**Solutions**:

1. **Track token usage**

   ```typescript
   const stats = registry.getRateLimitStats('openai');
   console.log('Tokens used:', stats?.tokensInWindow);
   console.log('Tokens remaining:', stats?.tokensRemaining);
   ```

2. **Reduce tokens per request**

   ```typescript
   const response = await provider.generateResponse({
     prompt,
     maxTokens: 500, // Limit output
   });
   ```

3. **Use cheaper models**
   ```typescript
   // Switch from GPT-4 to GPT-3.5
   const provider = new OpenAIProvider({
     apiKey: process.env.OPENAI_API_KEY!,
     defaultModel: 'gpt-3.5-turbo', // 10x more tokens/minute
   });
   ```

---

## Cost Issues

### Unexpected High Costs

**Solutions**:

1. **Monitor costs in real-time**

   ```typescript
   const stats = registry.getCostStats();
   console.log('Total cost:', stats.global.totalCost);
   console.log('By provider:', stats.global.byProvider);
   console.log('By model:', stats.global.byModel);

   if (stats.global.totalCost > 10.0) {
     console.warn('⚠️  Cost threshold exceeded!');
   }
   ```

2. **Set cost limits**

   ```typescript
   async function generateWithCostLimit(prompt: string, maxCost: number) {
     const currentCost = registry.getCostStats().global.totalCost;

     if (currentCost >= maxCost) {
       throw new Error(`Cost limit reached: $${currentCost.toFixed(2)}`);
     }

     return await registry.generateWithTracking('openai', { prompt });
   }
   ```

3. **Use cost-effective models**

   ```typescript
   // Gemini Flash: $0.075/$0.30 per 1M tokens
   const geminiFlash = new GeminiProvider({
     apiKey: process.env.GOOGLE_AI_API_KEY!,
     defaultModel: 'gemini-1.5-flash',
   });

   // DeepSeek: $0.14/$0.28 per 1M tokens (cheapest cloud)
   const deepseek = new DeepSeekProvider({
     apiKey: process.env.DEEPSEEK_API_KEY!,
   });

   // Ollama: FREE (local)
   const ollama = new OllamaProvider({});
   ```

4. **Optimize prompts**

   ```typescript
   // ❌ Wasteful - sending large context every time
   const response = await provider.generateResponse({
     prompt: `${largeDocument}\n\nQuestion: ${question}`,
   });

   // ✅ Better - summarize first, then ask
   const summary = await cheapProvider.generateResponse({
     prompt: `Summarize: ${largeDocument}`,
     maxTokens: 500,
   });

   const answer = await provider.generateResponse({
     prompt: `Based on this summary: ${summary.content}\n\nQuestion: ${question}`,
   });
   ```

5. **Export and analyze costs**

   ```typescript
   const tracker = registry.getCostTracker('openai');

   // Export to CSV for analysis
   const csv = tracker.exportCSV();
   await fs.writeFile('costs.csv', csv);

   // Or JSON
   const json = tracker.exportJSON();
   console.log(json);
   ```

### Wrong Cost Calculations

**Solutions**:

1. **Verify model pricing**

   ```typescript
   import { KNOWN_MODEL_PRICING } from '@pcl/sdk';

   console.log(KNOWN_MODEL_PRICING['gpt-4-turbo']);
   // { inputCostPer1M: 10.0, outputCostPer1M: 30.0, ... }
   ```

2. **Update pricing if outdated**

   ```typescript
   const calculator = new CostCalculator();

   // Add or update pricing
   calculator.setPricing('gpt-4-turbo', {
     modelId: 'gpt-4-turbo',
     provider: 'openai',
     inputCostPer1M: 10.0, // Current price
     outputCostPer1M: 30.0,
   });
   ```

---

## Performance Problems

### Slow Response Times

**Solutions**:

1. **Use faster models**

   ```typescript
   // ✅ Fast options
   -gemini -
     1.5 -
     flash(fastest, cheap) -
     claude -
     3 -
     haiku(fast, cheap) -
     gpt -
     3.5 -
     turbo(fast) -
     deepseek -
     chat(fast, cheapest) -
     // ❌ Slower options
     gpt -
     4(slower, expensive) -
     claude -
     3 -
     opus(slower, expensive);
   ```

2. **Reduce maxTokens**

   ```typescript
   const response = await provider.generateResponse({
     prompt,
     maxTokens: 200, // Faster than 2000
   });
   ```

3. **Use streaming**

   ```typescript
   // Shows first tokens faster
   for await (const chunk of provider.streamResponse({ prompt })) {
     process.stdout.write(chunk.content);
   }
   ```

4. **Parallel requests**

   ```typescript
   // Sequential (slow)
   const r1 = await provider.generateResponse({ prompt: 'Q1' });
   const r2 = await provider.generateResponse({ prompt: 'Q2' });

   // Parallel (fast)
   const [r1, r2] = await Promise.all([
     provider.generateResponse({ prompt: 'Q1' }),
     provider.generateResponse({ prompt: 'Q2' }),
   ]);
   ```

### Memory Issues

**Solutions**:

1. **Stream large responses**

   ```typescript
   // ❌ Stores entire response in memory
   const response = await provider.generateResponse({
     prompt: 'Write a 10,000 word essay',
   });

   // ✅ Process chunks incrementally
   let fullResponse = '';
   for await (const chunk of provider.streamResponse({
     prompt: 'Write a 10,000 word essay',
   })) {
     // Process chunk immediately
     processChunk(chunk.content);
   }
   ```

2. **Limit conversation history**

   ```typescript
   // Keep only recent messages
   const MAX_HISTORY = 10;
   const history = conversation.messages.slice(-MAX_HISTORY);

   const response = await provider.generateResponse({
     history,
     prompt: newMessage,
   });
   ```

3. **Clear cost tracking periodically**

   ```typescript
   // Reset tracking daily
   setInterval(
     () => {
       const stats = registry.getCostStats();
       console.log('Daily cost:', stats.global.totalCost);

       // Export and reset
       await saveCostReport(stats);
       registry.resetCostTracking();
     },
     24 * 60 * 60 * 1000
   );
   ```

---

## Provider-Specific Issues

### Gemini: "API key not valid"

**Solutions**:

1. Get API key from https://makersuite.google.com/app/apikey
2. Ensure it's a Google AI API key (not Google Cloud)
3. Check project has Generative Language API enabled

### DeepSeek: Connection issues

**Solutions**:

1. Verify base URL is correct: `https://api.deepseek.com/v1`
2. Check API key format (should start with `sk-`)
3. Ensure you're using the correct endpoint (not OpenAI's)

### Ollama: "Connection refused"

**Solutions**:

1. **Start Ollama server**

   ```bash
   ollama serve
   ```

2. **Check if running**

   ```bash
   curl http://localhost:11434/api/version
   ```

3. **Change port if needed**

   ```typescript
   const provider = new OllamaProvider({
     host: 'http://localhost:11434', // Custom port
   });
   ```

4. **Pull models**
   ```bash
   ollama pull llama2
   ollama pull mistral
   ollama list # See installed models
   ```

### Azure: "Deployment not found"

**Solutions**:

1. **Verify deployment name**

   ```bash
   az cognitiveservices account deployment list \
     --name <resource-name> \
     --resource-group <resource-group>
   ```

2. **Use exact deployment name**
   ```typescript
   // Use deployment name, not model name
   const provider = new AzureOpenAIProvider({
     deployment: 'my-gpt-4-deployment', // Deployment name
     // NOT: deployment: 'gpt-4', ❌
   });
   ```

### AWS Bedrock: "Model not enabled"

**Solutions**:

1. **Enable model access**
   - Go to AWS Bedrock console
   - Navigate to "Model access"
   - Request access to models
   - Wait for approval

2. **Check region availability**

   ```typescript
   // Claude 3 available in: us-east-1, us-west-2, eu-central-1
   const provider = new BedrockProvider({
     region: 'us-east-1',
   });
   ```

3. **Verify model ID**

   ```typescript
   // ✅ Correct format
   model: 'anthropic.claude-3-haiku-20240307-v1:0';

   // ❌ Wrong format
   model: 'claude-3-haiku';
   ```

---

## General Debugging

### Enable Debug Logging

```typescript
// Set environment variable
process.env.DEBUG = 'pcl:*';

// Or use console logging
const response = await provider.generateResponse({ prompt });
console.log('Request:', { prompt });
console.log('Response:', {
  content: response.content.slice(0, 100) + '...',
  usage: response.usage,
  finishReason: response.finishReason,
});
```

### Check Provider Status

```typescript
const status = registry.getHealthStatus();
for (const [name, health] of status) {
  console.log(`${name}:`);
  console.log(`  Status: ${health.status}`);
  console.log(`  Available: ${health.available}`);
  console.log(`  Circuit: ${health.circuitState}`);
  console.log(`  Failures: ${health.failureCount}`);
  console.log(`  Last check: ${health.lastCheck}`);
}
```

### Test Individual Providers

```typescript
async function testProvider(provider: AIProvider) {
  console.log(`Testing ${provider.name}...`);

  try {
    const start = Date.now();
    const response = await provider.generateResponse({
      prompt: 'Say "hello" in one word',
      maxTokens: 10,
    });
    const duration = Date.now() - start;

    console.log(`✓ ${provider.name} works!`);
    console.log(`  Response: ${response.content}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Tokens: ${response.usage.totalTokens}`);
  } catch (error: any) {
    console.error(`✗ ${provider.name} failed:`, error.message);
  }
}

// Test all providers
for (const name of registry.list()) {
  const provider = registry.get(name);
  if (provider) await testProvider(provider);
}
```

---

## Getting Help

**Still having issues?**

1. **Check documentation**
   - [Provider Guide](./README.md)
   - [Examples](./examples.md)
   - [API Reference](../api/providers.md)

2. **Search existing issues**
   - [GitHub Issues](https://github.com/personalayer/pcl/issues)

3. **Ask the community**
   - [Discord Server](https://discord.gg/pcl)
   - [GitHub Discussions](https://github.com/personalayer/pcl/discussions)

4. **Report a bug**
   - Include PCL version, provider, error message
   - Provide minimal reproduction code
   - Attach relevant logs (remove API keys!)

---

**Common Issues Not Listed?**
Open an issue or PR to help improve this guide!
