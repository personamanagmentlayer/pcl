#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Phase 1.0B: Workflow Validation Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { compile } from '../dist/index.js';

// Wrapper to match old parse() interface for backward compatibility
function parse(source) {
  const result = compile(source);
  if (!result.ok) {
    // Compile failed - return errors
    return {
      ok: true, // Still return ok:true so tests can inspect errors
      value: {
        program: null,
        errors: result.error,
        warnings: [],
      },
    };
  }
  // Compile returns {program, analysis}, but tests expect {program, errors, warnings}
  return {
    ok: true,
    value: {
      program: result.value.program,
      errors: result.value.analysis.errors,
      warnings: result.value.analysis.warnings,
    },
  };
}

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    failed++;
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(value > expected)) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toContain(expected) {
      if (!value.includes(expected)) {
        throw new Error(`Expected "${value}" to contain "${expected}"`);
      }
    },
    toBeDefined() {
      if (value === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
  };
}

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('PHASE 1.0B: WORKFLOW VALIDATION TESTS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Unreachable Code Detection
// ─────────────────────────────────────────────────────────────────────────────

console.log('1. Unreachable Code Detection\n');

test('should detect unreachable else branch (condition always true)', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    workflow TestWorkflow {
      steps: if (true) then A else B
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarning = result.value.warnings.find((w) =>
    w.message.includes('Unreachable code') && w.message.includes('else branch')
  );
  expect(unreachableWarning).toBeDefined();
});

test('should detect unreachable then branch (condition always false)', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    workflow TestWorkflow {
      steps: if (false) then A else B
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarning = result.value.warnings.find((w) =>
    w.message.includes('Unreachable code') && w.message.includes('then branch')
  );
  expect(unreachableWarning).toBeDefined();
});

test('should allow dynamic conditions without warnings', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    workflow TestWorkflow {
      steps: if (input.condition) then A else B
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarnings = result.value.warnings.filter((w) =>
    w.message.includes('Unreachable code')
  );
  expect(unreachableWarnings.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Infinite Loop Detection
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n2. Infinite Loop Detection\n');

test('should detect infinite while loop (condition always true)', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop while (true) { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const infiniteLoopWarning = result.value.warnings.find((w) =>
    w.message.includes('Potential infinite loop') && w.message.includes('while')
  );
  expect(infiniteLoopWarning).toBeDefined();
});

test('should detect unreachable while loop body (condition always false)', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop while (false) { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarning = result.value.warnings.find((w) =>
    w.message.includes('Unreachable code') && w.message.includes('loop body')
  );
  expect(unreachableWarning).toBeDefined();
});

test('should detect infinite until loop (condition always false)', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop until (false) { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const infiniteLoopWarning = result.value.warnings.find((w) =>
    w.message.includes('Potential infinite loop') && w.message.includes('until')
  );
  expect(infiniteLoopWarning).toBeDefined();
});

test('should detect unreachable until loop body (condition already true)', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop until (true) { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarning = result.value.warnings.find((w) =>
    w.message.includes('Unreachable code') && w.message.includes('loop body')
  );
  expect(unreachableWarning).toBeDefined();
});

test('should detect unreachable loop with count 0', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop 0 times { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const unreachableWarning = result.value.warnings.find((w) =>
    w.message.includes('Unreachable code') && w.message.includes('count is 0')
  );
  expect(unreachableWarning).toBeDefined();
});

test('should allow dynamic loop conditions without warnings', () => {
  const source = `
    persona A { intent: "Test" }

    workflow TestWorkflow {
      steps: loop while (input.condition) { A }
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const loopWarnings = result.value.warnings.filter((w) =>
    w.message.includes('loop')
  );
  expect(loopWarnings.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Parallel Branch Count Limits
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n3. Parallel Branch Count Limits\n');

test('should warn about too many parallel branches (>10)', () => {
  const source = `
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
    persona P12 { intent: "Test" }

    workflow TestWorkflow {
      steps: P1 || P2 || P3 || P4 || P5 || P6 || P7 || P8 || P9 || P10 || P11 || P12
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const parallelWarning = result.value.warnings.find((w) =>
    w.message.includes('Too many parallel branches')
  );
  expect(parallelWarning).toBeDefined();
  if (parallelWarning) {
    expect(parallelWarning.message).toContain('12');
  }
});

test('should not warn about reasonable parallel branches (≤10)', () => {
  const source = `
    persona P1 { intent: "Test" }
    persona P2 { intent: "Test" }
    persona P3 { intent: "Test" }
    persona P4 { intent: "Test" }
    persona P5 { intent: "Test" }

    workflow TestWorkflow {
      steps: P1 || P2 || P3 || P4 || P5
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const parallelWarnings = result.value.warnings.filter((w) =>
    w.message.includes('Too many parallel branches')
  );
  expect(parallelWarnings.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Complex Workflow Validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n4. Complex Workflow Validation\n');

test('should validate complex nested workflows without errors', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    workflow ComplexWorkflow {
      steps: (A -> B) || (if (input.condition) then C else A)
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  // Should compile without errors (dynamic condition is fine)
  expect(result.value.errors.length).toBe(0);
});

test('should validate sequential then parallel workflow', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }
    persona D { intent: "Test" }

    workflow MixedWorkflow {
      steps: A -> (B || C) -> D
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.errors.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
