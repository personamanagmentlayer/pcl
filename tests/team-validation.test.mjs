#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Phase 1.0A: Team Validation Tests
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
console.log('PHASE 1.0A: TEAM VALIDATION TESTS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Duplicate Member Detection
// ─────────────────────────────────────────────────────────────────────────────

console.log('1. Duplicate Member Detection\n');

test('should detect duplicate members in team', () => {
  const source = `
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

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.errors.length).toBeGreaterThan(0);
  const duplicateError = result.value.errors.find((e) =>
    e.message.includes('Duplicate team member')
  );
  expect(duplicateError).toBeDefined();
  expect(duplicateError?.message).toContain('Alice');
});

test('should allow unique members without errors', () => {
  const source = `
    persona Alice {
      intent: "Developer"
    }

    persona Bob {
      intent: "Reviewer"
    }

    persona Charlie {
      intent: "Tester"
    }

    team MyTeam {
      members: [Alice, Bob, Charlie]
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const duplicateErrors = result.value.errors.filter((e) =>
    e.message.includes('Duplicate team member')
  );
  expect(duplicateErrors.length).toBe(0);
});

test('should detect multiple duplicate members', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    team T {
      members: [A, B, A, B, A]
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.errors.length).toBeGreaterThan(0);
  const duplicateErrors = result.value.errors.filter((e) =>
    e.message.includes('Duplicate team member')
  );
  expect(duplicateErrors.length).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Primary Persona Validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n2. Primary Persona Validation\n');

test('should detect primary persona not in members list', () => {
  const source = `
    persona Alice { intent: "Developer" }
    persona Bob { intent: "Reviewer" }
    persona Charlie { intent: "Manager" }

    team MyTeam {
      members: [Alice, Bob]
      primary: Charlie
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const primaryError = result.value.errors.find((e) =>
    e.message.includes('Primary persona') && e.message.includes('not a team member')
  );
  expect(primaryError).toBeDefined();
});

test('should allow valid primary persona', () => {
  const source = `
    persona Alice { intent: "Developer" }
    persona Bob { intent: "Reviewer" }

    team MyTeam {
      members: [Alice, Bob]
      primary: Alice
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const primaryErrors = result.value.errors.filter((e) =>
    e.message.includes('Primary persona')
  );
  expect(primaryErrors.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Quorum Consistency Checks
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n3. Quorum Consistency Checks\n');

test('should detect quorum exceeding member count', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    team T {
      members: [A, B]
      quorum: 3/3
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const quorumError = result.value.errors.find((e) =>
    e.message.includes('Quorum') && e.message.includes('exceeds member count')
  );
  expect(quorumError).toBeDefined();
});

test('should allow valid quorum configuration', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    team T {
      members: [A, B, C]
      quorum: 2/3
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const quorumErrors = result.value.errors.filter((e) =>
    e.message.includes('Quorum') && e.message.includes('exceeds')
  );
  expect(quorumErrors.length).toBe(0);
});

test('should warn about quorum total exceeding member count', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    team T {
      members: [A, B]
      quorum: 2/5
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const quorumWarning = result.value.warnings.find((w) =>
    w.message.includes('Quorum total') && w.message.includes('exceeds member count')
  );
  expect(quorumWarning).toBeDefined();
});

test('should detect invalid quorum (required > total)', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    team T {
      members: [A, B, C]
      quorum: 3/2
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const quorumError = result.value.errors.find((e) =>
    e.message.includes('Quorum required') && e.message.includes('cannot exceed total')
  );
  expect(quorumError).toBeDefined();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Conflict Order Validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n4. Conflict Order Validation\n');

test('should warn about incomplete conflict order', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    team T {
      members: [A, B, C]
      conflict: A > B
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const conflictWarning = result.value.warnings.find((w) =>
    w.message.includes('not in conflict resolution order')
  );
  expect(conflictWarning).toBeDefined();
  expect(conflictWarning?.message).toContain('C');
});

test('should detect non-members in conflict order', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    team T {
      members: [A, B]
      conflict: A > B > C
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const conflictError = result.value.errors.find((e) =>
    e.message.includes('Conflict resolution order includes non-members')
  );
  expect(conflictError).toBeDefined();
  expect(conflictError?.message).toContain('C');
});

test('should allow complete valid conflict order', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }
    persona C { intent: "Test" }

    team T {
      members: [A, B, C]
      conflict: A > B > C
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const conflictWarnings = result.value.warnings.filter((w) =>
    w.message.includes('conflict')
  );
  expect(conflictWarnings.length).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Circular Reference Detection
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n5. Circular Reference Detection\n');

test('should detect direct circular reference', () => {
  const source = `
    team TeamA {
      members: [TeamB]
    }

    team TeamB {
      members: [TeamA]
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const circularError = result.value.errors.find((e) =>
    e.message.includes('Circular team reference')
  );
  expect(circularError).toBeDefined();
});

test('should detect indirect circular reference', () => {
  const source = `
    team TeamA {
      members: [TeamB]
    }

    team TeamB {
      members: [TeamC]
    }

    team TeamC {
      members: [TeamA]
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const circularError = result.value.errors.find((e) =>
    e.message.includes('Circular team reference')
  );
  expect(circularError).toBeDefined();
});

test('should allow valid nested teams without circular references', () => {
  const source = `
    persona A { intent: "Test" }
    persona B { intent: "Test" }

    team SubTeam {
      members: [A, B]
    }

    team MainTeam {
      members: [SubTeam, A]
    }
  `;

  const result = parse(source);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const circularErrors = result.value.errors.filter((e) =>
    e.message.includes('Circular')
  );
  expect(circularErrors.length).toBe(0);
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
