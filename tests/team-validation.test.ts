/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Phase 1.0A: Team Validation Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser';

// ═══════════════════════════════════════════════════════════════════════════════
//                          PHASE 1.0A: TEAM VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 1.0A: Team Validation', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Test 1: Duplicate Member Detection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('duplicate member detection', () => {
    it('should detect duplicate members in team', () => {
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

    it('should allow unique members without errors', () => {
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

      const duplicateError = result.value.errors.find((e) =>
        e.message.includes('Duplicate team member')
      );
      expect(duplicateError).toBeUndefined();
    });

    it('should detect multiple duplicate members', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        persona Bob {
          intent: "Reviewer"
        }

        team MyTeam {
          members: [Alice, Bob, Alice, Bob]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const duplicateErrors = result.value.errors.filter((e) =>
        e.message.includes('Duplicate team member')
      );
      expect(duplicateErrors.length).toBe(2); // Alice and Bob duplicated
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 2: Primary Persona Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('primary persona validation', () => {
    it('should error when primary is not in members list', () => {
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
          members: [Alice, Bob]
          primary: Charlie
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.errors.length).toBeGreaterThan(0);
      const primaryError = result.value.errors.find((e) =>
        e.message.includes('Primary persona') && e.message.includes('not a team member')
      );
      expect(primaryError).toBeDefined();
    });

    it('should allow primary when in members list', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        persona Bob {
          intent: "Reviewer"
        }

        team MyTeam {
          members: [Alice, Bob]
          primary: Alice
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const primaryError = result.value.errors.find((e) =>
        e.message.includes('Primary persona') && e.message.includes('not a team member')
      );
      expect(primaryError).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 3: Quorum Consistency Checks
  // ─────────────────────────────────────────────────────────────────────────────

  describe('quorum consistency checks', () => {
    it('should error when quorum required exceeds member count', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        persona Bob {
          intent: "Reviewer"
        }

        team MyTeam {
          members: [Alice, Bob]
          quorum: 3/3
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.errors.length).toBeGreaterThan(0);
      const quorumError = result.value.errors.find((e) =>
        e.message.includes('Quorum') && e.message.includes('exceeds member count')
      );
      expect(quorumError).toBeDefined();
    });

    it('should warn when quorum total exceeds member count', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        persona Bob {
          intent: "Reviewer"
        }

        team MyTeam {
          members: [Alice, Bob]
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

    it('should error when quorum required exceeds total', () => {
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
          quorum: 4/3
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

    it('should allow valid quorum configuration', () => {
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
          quorum: 2/3
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const quorumError = result.value.errors.find((e) =>
        e.message.includes('Quorum')
      );
      expect(quorumError).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 4: Conflict Order Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('conflict order validation', () => {
    it('should warn when members are missing from conflict order', () => {
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
          conflict: [Alice, Bob]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const conflictWarning = result.value.warnings.find((w) =>
        w.message.includes('Members not in conflict resolution order') &&
        w.message.includes('Charlie')
      );
      expect(conflictWarning).toBeDefined();
    });

    it('should error when conflict order includes non-members', () => {
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
          members: [Alice, Bob]
          conflict: [Alice, Bob, Charlie]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const conflictError = result.value.errors.find((e) =>
        e.message.includes('Conflict resolution order includes non-members') &&
        e.message.includes('Charlie')
      );
      expect(conflictError).toBeDefined();
    });

    it('should allow complete conflict order matching members', () => {
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
          conflict: [Alice, Bob, Charlie]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const conflictWarning = result.value.warnings.find((w) =>
        w.message.includes('Members not in conflict resolution order')
      );
      expect(conflictWarning).toBeUndefined();

      const conflictError = result.value.errors.find((e) =>
        e.message.includes('Conflict resolution order includes non-members')
      );
      expect(conflictError).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test 5: Circular Reference Detection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('circular reference detection', () => {
    it('should detect direct circular reference', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        team TeamA {
          members: [Alice, TeamB]
        }

        team TeamB {
          members: [Alice, TeamA]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const circularError = result.value.errors.find((e) =>
        e.message.includes('Circular team reference detected')
      );
      expect(circularError).toBeDefined();
    });

    it('should detect indirect circular reference', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        team TeamA {
          members: [Alice, TeamB]
        }

        team TeamB {
          members: [Alice, TeamC]
        }

        team TeamC {
          members: [Alice, TeamA]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const circularError = result.value.errors.find((e) =>
        e.message.includes('Circular team reference detected')
      );
      expect(circularError).toBeDefined();
    });

    it('should allow valid nested teams without cycles', () => {
      const source = `
        persona Alice {
          intent: "Developer"
        }

        persona Bob {
          intent: "Reviewer"
        }

        team SubTeam {
          members: [Alice, Bob]
        }

        team MainTeam {
          members: [Alice, SubTeam]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const circularError = result.value.errors.find((e) =>
        e.message.includes('Circular team reference detected')
      );
      expect(circularError).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Combined Validation Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('combined validation scenarios', () => {
    it('should detect multiple validation issues in one team', () => {
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
          members: [Alice, Bob, Alice]
          primary: Charlie
          quorum: 5/3
          conflict: [Alice, Bob, Charlie, NotAMember]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should have multiple errors
      expect(result.value.errors.length).toBeGreaterThan(2);

      // Duplicate member error
      const duplicateError = result.value.errors.find((e) =>
        e.message.includes('Duplicate team member')
      );
      expect(duplicateError).toBeDefined();

      // Primary not in members error
      const primaryError = result.value.errors.find((e) =>
        e.message.includes('Primary persona') && e.message.includes('not a team member')
      );
      expect(primaryError).toBeDefined();

      // Quorum error
      const quorumError = result.value.errors.find((e) =>
        e.message.includes('Quorum')
      );
      expect(quorumError).toBeDefined();
    });

    it('should pass all validations with correct configuration', () => {
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
          primary: Alice
          quorum: 2/3
          conflict: [Alice, Bob, Charlie]
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should have no errors related to team validation
      const teamErrors = result.value.errors.filter(
        (e) =>
          e.message.includes('Duplicate') ||
          e.message.includes('Primary persona') ||
          e.message.includes('Quorum') ||
          e.message.includes('Circular')
      );
      expect(teamErrors.length).toBe(0);
    });
  });
});
