#!/usr/bin/env node
/**
 * Tutorial 1: Your First Persona
 * Test with MockProvider (no API keys needed)
 */

import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 1: Your First Persona');
console.log('Testing with MockProvider (no API keys required)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Load and parse the PCL file
const source = readFileSync(join(__dirname, 'simple-reviewer.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse error:', parseResult.error);
  process.exit(1);
}

const program = parseResult.value.program;

// Create runtime with MockProvider
const runtime = new Runtime();
const mockProvider = new MockProvider();
runtime.setDefaultProvider(mockProvider);

// Load personas
runtime.load(program);

// Get the persona
const reviewer = runtime.getPersona('CodeReviewer');

console.log('✓ Loaded persona:', reviewer.getState().name);
console.log('✓ Provider:', reviewer.getProvider()?.name);
console.log('\nSending code for review...\n');

// Test it
const response = await reviewer.process({
  id: 'msg-1',
  from: 'user',
  content: `
Review this function:

function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].quantity;
  }
  return total;
}
  `,
  timestamp: new Date(),
});

console.log('─'.repeat(80));
console.log('RESPONSE:');
console.log('─'.repeat(80));
console.log(response.content);
console.log('\n' + '─'.repeat(80));
console.log('METADATA:');
console.log('─'.repeat(80));
console.log('Tokens used:', response.metadata.tokensUsed);
console.log('Duration:', response.metadata.duration + 'ms');
console.log('Confidence:', response.confidence);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Tutorial 1 Complete!');
console.log('\nNote: This used MockProvider for testing.');
console.log('To use real AI, see test-with-claude.mjs or test-with-openai.mjs');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
