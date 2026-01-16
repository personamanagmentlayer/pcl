import { parse } from '../dist/index.js';

console.log('Testing persona with blocks...\n');

// Test 1: Simple property
console.log('Test 1: Simple property');
const test1 = parse(`persona SEC { intent: "Security" }`);
console.log('Result:', test1.ok ? '✓' : '✗');

// Test 2: Skills block
console.log('\nTest 2: Skills block');
const test2 = parse(`persona SEC {
  skills {
    "OWASP Top 10"
    "Threat Modeling"
  }
}`);
console.log('Result:', test2.ok ? '✓' : '✗', test2.ok ? '' : test2.error[0]?.message);

// Test 3: Tags block
console.log('\nTest 3: Tags block');
const test3 = parse(`persona SEC {
  tags {
    security
    audit
  }
}`);
console.log('Result:', test3.ok ? '✓' : '✗', test3.ok ? '' : test3.error[0]?.message);

// Test 4: Constraints block
console.log('\nTest 4: Constraints block');
const test4 = parse(`persona SEC {
  constraints {
    "No false positives"
  }
}`);
console.log('Result:', test4.ok ? '✓' : '✗', test4.ok ? '' : test4.error[0]?.message);
