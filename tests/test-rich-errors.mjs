#!/usr/bin/env node

/**
 * Test script to verify rich error messages are working
 */

import { compile } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('TESTING RICH ERROR MESSAGES');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Test 1: Duplicate team member
console.log('Test 1: Duplicate team member\n');
console.log('─'.repeat(79));

const source1 = `
persona Alice {
  intent: "Developer"
}

persona Bob {
  intent: "Reviewer"
}

team MyTeam {
  members: [Alice, Bob, Alice]
}
`;

const result1 = compile(source1, { source: 'test.pcl' });
if (!result1.ok) {
  console.log('Errors:');
  result1.error.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
} else if (result1.value.analysis.errors.length > 0) {
  console.log('Errors from analysis:');
  result1.value.analysis.errors.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
}

// Test 2: Primary persona not in members
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 2: Primary persona not in members list\n');
console.log('─'.repeat(79));

const source2 = `
persona Alice {
  intent: "Developer"
}

persona Bob {
  intent: "Reviewer"
}

persona Charlie {
  intent: "Manager"
}

team MyTeam {
  members: [Alice, Bob]
  primary: Charlie
}
`;

const result2 = compile(source2, { source: 'test.pcl' });
if (!result2.ok) {
  console.log('Errors:');
  result2.error.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
} else if (result2.value.analysis.errors.length > 0) {
  console.log('Errors from analysis:');
  result2.value.analysis.errors.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
}

// Test 3: Quorum exceeds member count
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 3: Quorum exceeding member count\n');
console.log('─'.repeat(79));

const source3 = `
persona A { intent: "Test" }
persona B { intent: "Test" }

team T {
  members: [A, B]
  quorum: 3/3
}
`;

const result3 = compile(source3, { source: 'test.pcl' });
if (!result3.ok) {
  console.log('Errors:');
  result3.error.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
} else if (result3.value.analysis.errors.length > 0) {
  console.log('Errors from analysis:');
  result3.value.analysis.errors.forEach((err, i) => {
    console.log(`\n[${i + 1}] ${err.message}`);
  });
}

console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('RICH ERROR MESSAGE TEST COMPLETE');
console.log('═══════════════════════════════════════════════════════════════════════════════');
