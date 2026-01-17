#!/usr/bin/env node

import { compile } from '../dist/index.js';

const source = `
  persona A { intent: "Test" }
  persona B { intent: "Test" }
  persona C { intent: "Test" }

  workflow ComplexWorkflow {
    steps: (A -> B) || (if (input.condition) then C else A)
  }
`;

const result = compile(source, { source: 'test.pcl' });

console.log('Result:', {
  ok: result.ok,
  errors: result.ok ? result.value.analysis.errors.length : result.error.length,
  warnings: result.ok ? result.value.analysis.warnings.length : 0,
});

if (result.ok) {
  console.log('\nErrors:');
  result.value.analysis.errors.forEach((e, i) => {
    console.log(`[${i + 1}] ${e.code}: ${e.message.split('\n')[0]}`);
  });
  console.log('\nWarnings:');
  result.value.analysis.warnings.forEach((w, i) => {
    console.log(`[${i + 1}] ${w.code}: ${w.message.split('\n')[0]}`);
  });
} else {
  console.log('\nParse errors:');
  result.error.forEach((e, i) => {
    console.log(`[${i + 1}] ${e.code}: ${e.message.split('\n')[0]}`);
  });
}
