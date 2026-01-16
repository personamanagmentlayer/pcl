#!/usr/bin/env node

/**
 * Test constraint validation in PCL semantic analyzer
 */

import { parse, analyze } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - Constraint Validation Tests');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(name, code, expectErrors = false) {
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

    // Analyze the AST
    const analysisResult = analyze(parseResult.value.program);

    // Extract errors from analysis result
    const errors = analysisResult.ok && analysisResult.value.errors ? analysisResult.value.errors : [];

    if (expectErrors) {
      if (errors.length > 0) {
        console.log(`✓ ${name}`);
        console.log(`  Expected errors found: ${errors.length}`);
        errors.forEach(err => {
          console.log(`    - ${err.message}`);
        });
        passed++;
      } else {
        console.log(`✗ ${name}`);
        console.log(`  Expected errors but got none`);
        failed++;
      }
    } else if (errors.length > 0) {
      console.log(`✗ ${name}`);
      console.log(`  Unexpected errors:`);
      errors.forEach(err => {
        console.log(`    - ${err.message}`);
      });
      failed++;
    } else {
      console.log(`✓ ${name}`);
      passed++;
    }
    console.log('');
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Exception: ${err.message}`);
    console.log('');
    failed++;
  }
}

// Test 1: Valid string constraint (should pass)
test(
  'Valid string constraint',
  `
  persona TestPersona {
    constraints {
      "Always be helpful"
      "Apply best practices"
    }
  }
  `,
  false
);

// Test 2: Valid expression constraint with numeric operator
test(
  'Valid expression constraint with numeric field',
  `
  persona TestPersona {
    maxTokens: Int;
    constraints {
      maxTokens <= 4096
    }
  }
  `,
  false
);

// Test 3: Invalid - constraint references unknown field (should fail)
test(
  'Invalid constraint - unknown field',
  `
  persona TestPersona {
    constraints {
      unknownField <= 5.0
    }
  }
  `,
  true
);

// Test 4: Invalid - numeric operator with wrong type (should fail)
test(
  'Invalid constraint - numeric operator with string literal',
  `
  persona TestPersona {
    maxTokens = 1000
    constraints {
      maxTokens <= "test"
    }
  }
  `,
  true
);

// Test 5: Valid - equality operator with any type
test(
  'Valid constraint - equality with string',
  `
  persona TestPersona {
    status: String;
    constraints {
      status == "active"
    }
  }
  `,
  false
);

// Test 6: Mixed string and expression constraints
test(
  'Mixed constraint types',
  `
  persona TestPersona {
    maxTokens: Int;
    constraints {
      "Always assume breach"
      maxTokens <= 4096
      "Apply least privilege"
    }
  }
  `,
  false
);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 All constraint validation tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some constraint validation tests failed.\n');
  process.exit(1);
}
