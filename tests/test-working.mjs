#!/usr/bin/env node
/**
 * PCL Working Features Test
 * Shows what currently works in PCL
 */

import { parse } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('PCL - Working Features Test');
console.log('═══════════════════════════════════════════════════════════════\n');

const tests = [
  {
    name: 'Basic Persona',
    code: `persona SEC {
  intent: "Security analysis"
}`
  },
  {
    name: 'Persona with Skills (strings)',
    code: `persona SEC {
  intent: "Security analysis"
  skills {
    "OWASP Top 10"
    "Threat Modeling"
  }
}`
  },
  {
    name: 'Persona with Constraints',
    code: `persona SEC {
  constraints {
    "No false positives"
    "Focus on critical issues"
  }
}`
  },
  {
    name: 'Team Declaration',
    code: `team SecurityReview {
  members: [SEC, AUDIT, ARCHI]
}`
  },
  {
    name: 'Team with Primary and Quorum',
    code: `team Review {
  members: [SEC, AUDIT]
  primary: SEC
  quorum: 2/3
}`
  },
  {
    name: 'Workflow Declaration',
    code: `workflow CodeReview {
  steps: ARCHI -> SEC -> CRITIC
}`
  },
  {
    name: 'Workflow with Timeout',
    code: `workflow Review {
  steps: SEC -> AUDIT
  timeout: 60s
  retry: 3
}`
  },
  {
    name: 'Function Declaration',
    code: `fn analyze(target: String) -> Report {
  return scan(target);
}`
  },
  {
    name: 'Variable Declarations',
    code: `let x = 42;
const PI = 3.14;
var name = "test";`
  },
  {
    name: 'Type Declaration',
    code: `type SecurityPersona = SEC | AUDIT;`
  },
  {
    name: 'Interface Declaration',
    code: `interface Reviewable {
  id: String
  fn review() -> Result
}`
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
  process.stdout.write(`${idx + 1}. ${test.name}... `);

  try {
    const result = parse(test.code);

    if (result.ok) {
      console.log('✓ PASS');
      passed++;
    } else {
      console.log('✗ FAIL');
      console.log(`   Error: ${result.error[0]?.message}`);
      failed++;
    }
  } catch (error) {
    console.log('✗ ERROR');
    console.log(`   ${error.message}`);
    failed++;
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
console.log('═══════════════════════════════════════════════════════════════');

if (passed === tests.length) {
  console.log('\n🎉 All tests passed! PCL is working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  Some tests failed. PCL is partially working.\n`);
  process.exit(1);
}
