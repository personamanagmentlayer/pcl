/**
 * Minimal PCL Compiler Test Suite
 *
 * Purpose: Fast sanity checks for core PCL functionality
 * - Lexer: Basic tokenization
 * - Parser: Simple persona declaration
 * - Semantic: Basic validation
 * - End-to-end: Complete compilation pipeline
 */

import { describe, expect, it } from 'vitest';
import { compile, parse } from '../src';

describe('PCL Minimal Sanity Checks', () => {
  describe('Parser', () => {
    it('should parse minimal persona declaration', () => {
      const source = `
        persona ARCHI {
          intent: "Design systems"
        }
      `;

      const result = parse(source);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.program.statements).toHaveLength(1);
      expect(result.value.program.statements[0].kind).toBe(
        'PersonaDeclaration'
      );
    });

    it('should parse persona with skills', () => {
      const source = `
        persona DEV {
          intent: "Write code"
          skills {
            "TypeScript"
            "Debugging"
          }
        }
      `;

      const result = parse(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const stmt = result.value.program.statements[0];
      expect(stmt.kind).toBe('PersonaDeclaration');
    });
  });

  describe('Semantic Analyzer', () => {
    it('should validate simple persona', () => {
      const source = `
        persona ARCHI {
          intent: "Design systems"
        }
      `;

      const result = compile(source);

      // Debug: log errors if compilation fails
      if (!result.ok) {
        console.log('Compilation errors:', result.error);
      }

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.analysis.errors).toHaveLength(0);
    });

    it('should detect duplicate persona', () => {
      const source = `
        persona ARCHI {
          intent: "Design systems"
        }
        persona ARCHI {
          intent: "Duplicate"
        }
      `;

      const result = compile(source);
      // Compilation fails when there are semantic errors
      expect(result.ok).toBe(false);
    });
  });

  describe('End-to-End Compilation', () => {
    it('should compile complete program with team', () => {
      const source = `
        persona SEC {
          intent: "Security analysis"
          skills {
            "OWASP Top 10"
            "Threat modeling"
          }
        }

        persona DEV {
          intent: "Write code"
        }

        team SECURITY_REVIEW {
          members: [SEC, DEV]
        }
      `;

      const result = compile(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.program.statements).toHaveLength(3);
      expect(result.value.analysis.errors).toHaveLength(0);
    });

    it('should detect invalid team member reference', () => {
      const source = `
        persona SEC {}

        team BAD_TEAM {
          members: [SEC, NONEXISTENT]
        }
      `;

      const result = compile(source);
      // Compilation fails when there are undefined references
      expect(result.ok).toBe(false);
    });
  });
});
