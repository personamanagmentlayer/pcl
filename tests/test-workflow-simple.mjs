#!/usr/bin/env node

/**
 * Simple test to debug workflow validation
 */

import { compile } from '../dist/index.js';

console.log('Testing workflow validation...\n');

// Test 1: Simple unreachable else branch
const source1 = `
persona A { intent: "Test" }
persona B { intent: "Test" }

workflow TestWorkflow {
  steps: if (true) then A else B
}
`;

console.log('Test 1: Unreachable else branch');
console.log('Source:', source1);

const result1 = compile(source1, { source: 'test.pcl' });
console.log('\nResult:', {
  ok: result1.ok,
  errors: result1.ok ? result1.value.analysis.errors.length : result1.error.length,
  warnings: result1.ok ? result1.value.analysis.warnings.length : 0,
});

if (result1.ok && result1.value.analysis.warnings.length > 0) {
  console.log('\nWarnings:');
  result1.value.analysis.warnings.forEach((w, i) => {
    console.log(`[${i + 1}] ${w.message}`);
  });
} else if (!result1.ok) {
  console.log('\nErrors:');
  result1.error.forEach((e, i) => {
    console.log(`[${i + 1}] ${e.message}`);
  });
}

// Test 2: Parallel branches
const source2 = `
persona P1 { intent: "Test" }
persona P2 { intent: "Test" }
persona P3 { intent: "Test" }
persona P4 { intent: "Test" }
persona P5 { intent: "Test" }
persona P6 { intent: "Test" }
persona P7 { intent: "Test" }
persona P8 { intent: "Test" }
persona P9 { intent: "Test" }
persona P10 { intent: "Test" }
persona P11 { intent: "Test" }

workflow TestWorkflow {
  steps: P1 || P2 || P3 || P4 || P5 || P6 || P7 || P8 || P9 || P10 || P11
}
`;

console.log('\n\nTest 2: Too many parallel branches');
const result2 = compile(source2, { source: 'test.pcl' });
console.log('Result:', {
  ok: result2.ok,
  errors: result2.ok ? result2.value.analysis.errors.length : result2.error.length,
  warnings: result2.ok ? result2.value.analysis.warnings.length : 0,
});

if (result2.ok && result2.value.analysis.warnings.length > 0) {
  console.log('\nWarnings:');
  result2.value.analysis.warnings.forEach((w, i) => {
    console.log(`[${i + 1}] ${w.message}`);
  });
}
