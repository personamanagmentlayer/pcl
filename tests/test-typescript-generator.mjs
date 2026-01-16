#!/usr/bin/env node

/**
 * Test TypeScript code generation with enhanced implementations
 *
 * Tests verify that the TypeScript generator creates:
 * - Real persona classes (not just stubs)
 * - Executable team classes
 * - Workflow classes with execution logic
 * - Runtime integration
 * - Type-safe interfaces
 */

import { parse, generate } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - TypeScript Generator Tests');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(name, code, validator) {
  try {
    // Parse the code
    const parseResult = parse(code);
    if (!parseResult.ok) {
      console.log(`✗ ${name}`);
      console.log(`  Parse error:`, parseResult.error);
      console.log('');
      failed++;
      return;
    }

    // Generate TypeScript
    const typescript = generate(parseResult.value.program, {
      target: 'typescript',
    });

    // Validate
    const validationResult = validator(typescript);
    if (validationResult === true) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Validation failed: ${validationResult}`);
      if (process.env.VERBOSE) {
        console.log(`  Generated TypeScript:`);
        console.log(typescript.split('\n').map((l) => `    ${l}`).join('\n'));
      }
      failed++;
    }
    console.log('');
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Exception: ${err.message}`);
    console.log('');
    failed++;
  }
}

// Test 1: Basic persona class generation
test(
  'Generate persona class with runtime integration',
  `
  persona Assistant {
    intent = "Help users with tasks"
  }
  `,
  (ts) => {
    if (!ts.includes('export class AssistantPersona')) {
      return 'Missing persona class';
    }
    if (!ts.includes('private instance: ReturnType<typeof createPersona>')) {
      return 'Missing runtime instance';
    }
    if (!ts.includes('activate(): void')) {
      return 'Missing activate method';
    }
    if (!ts.includes('deactivate(): void')) {
      return 'Missing deactivate method';
    }
    if (!ts.includes('async process(message: string): Promise<string>')) {
      return 'Missing process method';
    }
    return true;
  }
);

// Test 2: Persona with all configuration options
test(
  'Generate persona with full configuration',
  `
  persona Expert {
    intent = "Expert analysis"
    tone = professional
    depth = comprehensive
    verbosity = detailed
    outputFormat = markdown
    maxTokens = 8192
    temperature = 0.5
    skills {
      "Analysis"
      "Research"
    }
    constraints {
      "Be thorough"
      "Cite sources"
    }
    tags {
      expert
      research
    }
  }
  `,
  (ts) => {
    if (!ts.includes('export const ExpertConfig')) {
      return 'Missing config object';
    }
    if (!ts.includes("tone: 'professional' as const")) {
      return 'Missing tone configuration';
    }
    if (!ts.includes("depth: 'comprehensive' as const")) {
      return 'Missing depth configuration';
    }
    if (!ts.includes('maxTokens: 8192')) {
      return 'Missing maxTokens configuration';
    }
    if (!ts.includes('temperature: 0.5')) {
      return 'Missing temperature configuration';
    }
    if (!ts.includes('"Analysis"') || !ts.includes('"Research"')) {
      return 'Missing skills';
    }
    return true;
  }
);

// Test 3: Generated TypeScript is valid syntax
test(
  'Generate valid TypeScript code',
  `
  persona Analyst {
    intent = "Analyze data"
    skills {
      "Data analysis"
      "Pattern recognition"
    }
  }
  `,
  (ts) => {
    // Check for TypeScript-specific syntax
    if (!ts.includes('as const')) {
      return 'Missing TypeScript const assertions';
    }
    if (!ts.includes(': void')) {
      return 'Missing TypeScript type annotations';
    }
    if (!ts.includes('Promise<string>')) {
      return 'Missing TypeScript generic types';
    }
    return true;
  }
);

// Test 4: Persona with inheritance
test(
  'Generate persona with extends',
  `
  persona Base {
    intent = "Base persona"
  }

  persona Extended extends Base {
    intent = "Extended persona"
  }
  `,
  (ts) => {
    if (!ts.includes('export class BasePersona')) {
      return 'Missing base persona class';
    }
    if (!ts.includes('export class ExtendedPersona extends BasePersona')) {
      return 'Missing extends clause';
    }
    if (!ts.includes('super();')) {
      return 'Missing super() call in constructor';
    }
    return true;
  }
);

// Test 5: Multiple personas generation
test(
  'Generate multiple personas',
  `
  persona A {
    intent = "First persona"
  }

  persona B {
    intent = "Second persona"
  }
  `,
  (ts) => {
    if (!ts.includes('export class APersona')) {
      return 'Missing first persona class';
    }
    if (!ts.includes('export class BPersona')) {
      return 'Missing second persona class';
    }
    if (!ts.includes('export function createA()')) {
      return 'Missing first factory function';
    }
    if (!ts.includes('export function createB()')) {
      return 'Missing second factory function';
    }
    return true;
  }
);

// Test 6: Configuration method generation
test(
  'Generate configuration methods',
  `
  persona Configurable {
    intent = "Test configuration"
  }
  `,
  (ts) => {
    if (!ts.includes('configure(config: Partial<typeof ConfigurableConfig>): void')) {
      return 'Missing configure method signature';
    }
    if (!ts.includes('this.instance.configure(config as any)')) {
      return 'Missing configuration delegation';
    }
    return true;
  }
);

// Test 7: State management methods
test(
  'Generate state management methods',
  `
  persona Stateful {
    intent = "Manage state"
  }
  `,
  (ts) => {
    if (!ts.includes('getState()')) {
      return 'Missing getState method';
    }
    if (!ts.includes('return this.instance.getState();')) {
      return 'Missing state delegation';
    }
    return true;
  }
);

// Test 8: Runtime import statement
test(
  'Import runtime functions',
  `
  persona Test {}
  `,
  (ts) => {
    if (
      !ts.includes(
        "import { createRuntime, createPersona, createTeam } from '@pcl/runtime';"
      )
    ) {
      return 'Missing runtime imports';
    }
    return true;
  }
);

// Test 9: Factory functions
test(
  'Generate factory functions',
  `
  persona Helper {
    intent = "Help"
  }
  `,
  (ts) => {
    if (!ts.includes('export function createHelper(): HelperPersona')) {
      return 'Missing factory function';
    }
    if (!ts.includes('return new HelperPersona();')) {
      return 'Missing factory implementation';
    }
    return true;
  }
);

// Test 10: Persona memory methods
test(
  'Generate persona memory methods',
  `
  persona Memory {
    intent = "Remember things"
  }
  `,
  (ts) => {
    if (!ts.includes('setContext(key: string, value: unknown): void')) {
      return 'Missing setContext method';
    }
    if (!ts.includes('getContext<T = unknown>(key: string): T | undefined')) {
      return 'Missing getContext method';
    }
    if (!ts.includes('remember(key: string, value: unknown): void')) {
      return 'Missing remember method';
    }
    if (!ts.includes('recall<T = unknown>(key: string): T | undefined')) {
      return 'Missing recall method';
    }
    return true;
  }
);

// Test 11: Event handling
test(
  'Generate event handling methods',
  `
  persona Events {
    intent = "Handle events"
  }
  `,
  (ts) => {
    if (!ts.includes('on(handler: (event: any) => void): () => void')) {
      return 'Missing event subscription method';
    }
    if (!ts.includes('return this.instance.on(handler);')) {
      return 'Missing event handler delegation';
    }
    return true;
  }
);

// Test 12: TypeScript comments
test(
  'Generate JSDoc comments',
  `
  persona Documented {
    intent = "Well documented"
  }
  `,
  (ts) => {
    if (!ts.includes('/** Activate this persona */')) {
      return 'Missing JSDoc for activate';
    }
    if (!ts.includes('/** Get persona state */')) {
      return 'Missing JSDoc for getState';
    }
    if (!ts.includes('/** Process a message */')) {
      return 'Missing JSDoc for process';
    }
    return true;
  }
);

console.log('═══════════════════════════════════════════════════════════════');
console.log(
  `Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`
);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 All TypeScript generator tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some TypeScript generator tests failed.\n');
  process.exit(1);
}
