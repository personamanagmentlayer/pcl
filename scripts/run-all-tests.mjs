#!/usr/bin/env node
/**
 * Run All PCL Tests
 *
 * Executes all standalone test files and reports results
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  {
    name: 'Core Feature Tests',
    file: 'tests/test-working.mjs',
    critical: true
  },
  {
    name: 'Simple Parsing',
    file: 'tests/test-simple.mjs',
    critical: true
  },
  {
    name: 'Full Persona Test',
    file: 'tests/full-persona-test.mjs',
    critical: true
  },
  {
    name: 'Parse Test',
    file: 'tests/test-parse.mjs',
    critical: true
  },
  {
    name: 'Feature Examples',
    file: 'tests/test-example.mjs',
    critical: false
  },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - Test Runner');
console.log('  Running all standalone tests');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
let total = 0;

async function runTest(test) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, '..', test.file);
    const proc = spawn('node', [testPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      timeout: 10000
    });

    let output = '';
    let hasError = false;

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      hasError = true;
      output += data.toString();
    });

    proc.on('close', (code) => {
      const success = code === 0 && !hasError;
      resolve({ success, output });
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: err.message });
    });

    // Timeout handler
    setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: 'Test timed out (>10s)' });
    }, 10000);
  });
}

async function runAllTests() {
  for (const test of tests) {
    total++;
    process.stdout.write(`${total}. ${test.name}... `);

    const result = await runTest(test);

    if (result.success) {
      console.log('✓ PASS');
      passed++;
    } else {
      console.log('✗ FAIL');
      if (test.critical) {
        console.log('   Output:');
        console.log(result.output.split('\n').slice(0, 5).map(l => `   ${l}`).join('\n'));
      }
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed out of ${total} tests`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (passed === total) {
    console.log('\n🎉 All tests passed! PCL is working correctly.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
