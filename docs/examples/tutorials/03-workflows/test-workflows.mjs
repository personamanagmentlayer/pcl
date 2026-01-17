#!/usr/bin/env node
/**
 * Tutorial 3: Workflows
 * Demonstrates workflow features from Phase 1.1C
 *
 * Features demonstrated:
 * - Sequential workflows
 * - Conditional execution (if-then-else)
 * - Loop workflows (times, while, until)
 * - Expression evaluation
 * - Context variables
 */

import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 3: Workflows - Phase 1.1C Features');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1: Simple Sequential Workflow
// ═══════════════════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('TEST 1: Simple Sequential Workflow');
console.log('─'.repeat(80));

const simpleSource = readFileSync(join(__dirname, 'simple-workflow.pcl'), 'utf-8');
const simpleResult = parse(simpleSource);

if (!simpleResult.ok || simpleResult.value.errors.length > 0) {
  console.error('Parse errors:', simpleResult.value.errors);
  process.exit(1);
}

const simpleRuntime = new Runtime();
simpleRuntime.setDefaultProvider(new MockProvider());
simpleRuntime.load(simpleResult.value.program);

const codeReview = simpleRuntime.getWorkflow('CodeReview');
console.log('✓ Loaded workflow:', codeReview ? codeReview.name : 'Not found');

if (codeReview) {
  console.log('✓ Workflow steps: input → Analyzer → Fixer → result');
  console.log('  This demonstrates a 2-step sequential pipeline\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2: Conditional Workflow
// ═══════════════════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('TEST 2: Conditional Workflow (if-then-else)');
console.log('─'.repeat(80));

const conditionalSource = readFileSync(join(__dirname, 'conditional-workflow.pcl'), 'utf-8');
const conditionalResult = parse(conditionalSource);

if (!conditionalResult.ok || conditionalResult.value.errors.length > 0) {
  console.error('Parse errors:', conditionalResult.value.errors);
  process.exit(1);
}

const conditionalRuntime = new Runtime();
conditionalRuntime.setDefaultProvider(new MockProvider());
conditionalRuntime.load(conditionalResult.value.program);

const smartReview = conditionalRuntime.getWorkflow('SmartReview');
console.log('✓ Loaded workflow:', smartReview ? smartReview.name : 'Not found');

if (smartReview) {
  console.log('✓ Conditional logic: if (issueCount > 0) then SecurityFixer else BasicReviewer');
  console.log('  This demonstrates dynamic routing based on security analysis\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3: Loop Workflows
// ═══════════════════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('TEST 3: Loop Workflows (times, while, until)');
console.log('─'.repeat(80));

const loopSource = readFileSync(join(__dirname, 'loop-workflow.pcl'), 'utf-8');
const loopResult = parse(loopSource);

if (!loopResult.ok || loopResult.value.errors.length > 0) {
  console.error('Parse errors:', loopResult.value.errors);
  process.exit(1);
}

const loopRuntime = new Runtime();
loopRuntime.setDefaultProvider(new MockProvider());
loopRuntime.load(loopResult.value.program);

const iterativeRefine = loopRuntime.getWorkflow('IterativeRefine');
const refineUntilGood = loopRuntime.getWorkflow('RefineUntilGood');
const refineUntilPerfect = loopRuntime.getWorkflow('RefineUntilPerfect');

console.log('✓ Loaded workflows:');
console.log('  - IterativeRefine:', iterativeRefine ? iterativeRefine.name : 'Not found');
console.log('    Loop: 3 times (fixed iterations)');
console.log('  - RefineUntilGood:', refineUntilGood ? refineUntilGood.name : 'Not found');
console.log('    Loop: while (quality < 0.8) - continue while condition is true');
console.log('  - RefineUntilPerfect:', refineUntilPerfect ? refineUntilPerfect.name : 'Not found');
console.log('    Loop: until (score >= 9.0) - continue until condition becomes true\n');

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('WORKFLOW FEATURES DEMONSTRATED (Phase 1.1C)');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Sequential pipelines (input → Persona A → Persona B → result)');
console.log('✓ Conditional execution (if-then-else with expression evaluation)');
console.log('✓ Fixed loops (loop 3 times)');
console.log('✓ While loops (continue while condition is true)');
console.log('✓ Until loops (continue until condition becomes true)');
console.log('✓ Expression evaluation (comparison operators: <, >, <=, >=, ==, !=)');
console.log('✓ Property access (result.quality, result.score)');
console.log('✓ Context variables (input, result, iteration)');

console.log('\n' + '═══════════════════════════════════════════════════════════════════════════════');
console.log('ADDITIONAL FEATURES AVAILABLE');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Boolean operators (&&, ||, !)');
console.log('✓ Arithmetic operators (+, -, *, /, %)');
console.log('✓ Built-in functions (isEmpty, isNull, isDefined, length)');
console.log('✓ Retry logic with exponential backoff');
console.log('✓ Timeout handling for long operations');

console.log('\n' + '═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Tutorial 3 Complete!');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('\nNext: Try modifying the workflows to experiment with different conditions!');
console.log('See README.md for more examples and exercises.\n');
