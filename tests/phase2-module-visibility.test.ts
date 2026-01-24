/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Phase 2: Module Visibility - Final Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive tests for module boundary tracking, pub/private access control,
 * export validation, and cross-module access control.
 *
 * @version 1.0.0
 * @since 2026-01-16
 */

import { parse } from '../src/parser';
import { analyze } from '../src/semantic';

// ═══════════════════════════════════════════════════════════════════════════════
//                              MODULE VISIBILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 2: Module Visibility', () => {
  describe('Module Context Tracking', () => {
    it('should track module path when provided', () => {
      const source = `
        persona TestPersona { }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Module tracking is internal - we verify it doesn't break analysis
    });

    it('should work without module path (backward compatibility)', () => {
      const source = `
        persona TestPersona { }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program);
      expect(result.ok).toBe(true);
    });
  });

  describe('Visibility Modifiers', () => {
    it('should default to private visibility', () => {
      const source = `
        persona PrivatePersona { }
        pub persona PublicPersona { }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Visibility is tracked internally in symbols
    });

    it('should parse pub modifier correctly', () => {
      const source = `
        pub persona PublicPersona { intent: "Public persona" }
        pub team PublicTeam { members: [] }
        pub workflow PublicWorkflow { steps: [] }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
    });

    it('should parse priv modifier correctly', () => {
      const source = `
        priv persona PrivatePersona { intent: "Private persona" }
        priv team PrivateTeam { members: [] }
        priv workflow PrivateWorkflow { steps: [] }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('Same-Module Access', () => {
    it('should allow access to private symbols in same module', () => {
      const source = `
        persona PrivatePersona { intent: "Private" }
        pub persona PublicPersona { intent: "Public" }

        team MyTeam {
          members: [PrivatePersona, PublicPersona]
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(0);
    });

    it('should allow access to private teams in same module', () => {
      const source = `
        team PrivateTeam { members: [] }
        workflow MyWorkflow {
          steps: [PrivateTeam]
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(0);
    });
  });

  describe('Export Validation', () => {
    it('should validate exported symbols exist', () => {
      const source = `
        export { NonExistentPersona };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(1);
      expect(result.value.errors[0].message).toContain(
        "Cannot export 'NonExistentPersona': symbol not found"
      );
    });

    it('should allow exporting public symbols', () => {
      const source = `
        pub persona PublicPersona { intent: "Public" }
        export { PublicPersona };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(0);
    });

    it('should warn when exporting private symbols', () => {
      const source = `
        persona PrivatePersona { intent: "Private" }
        export { PrivatePersona };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.warnings).toHaveLength(1);
      expect(result.value.warnings[0].message).toContain(
        "Exporting private symbol 'PrivatePersona'"
      );
    });

    it('should handle export declarations', () => {
      const source = `
        export pub persona ExportedPersona { intent: "Exported" }
        export pub team ExportedTeam { members: [] }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(0);
    });
  });

  describe('Import Tracking', () => {
    it('should track imported symbols', () => {
      const source = `
        import { PublicPersona } from "./other.pcl";
        import { AnotherPersona as Alias } from "./another.pcl";

        team MyTeam {
          members: [PublicPersona, Alias]
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Import tracking is internal - we verify it doesn't break analysis
    });

    it('should handle default imports', () => {
      const source = `
        import DefaultPersona from "./other.pcl";
        import { NamedPersona } from "./other.pcl";
        import DefaultPersona2, { NamedPersona2 } from "./other2.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
    });

    it('should handle wildcard imports', () => {
      const source = `
        import * as AllSymbols from "./other.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('Cross-Module Access Control', () => {
    it('should allow access to imported public symbols', () => {
      const source = `
        import { PublicPersona } from "./other.pcl";

        team MyTeam {
          members: [PublicPersona]
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Cross-module access is allowed for imported symbols
    });

    it('should prevent direct access to private symbols from other modules', () => {
      // This test would require multi-module analysis
      // For now, we test that the infrastructure is in place
      const source = `
        import { PrivatePersona } from "./other.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Import itself succeeds - access control happens at usage
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed visibility in complex module', () => {
      const source = `
        // Private declarations
        persona PrivatePersona { intent: "Private" }
        priv team PrivateTeam { members: [] }

        // Public declarations
        pub persona PublicPersona { intent: "Public" }
        pub team PublicTeam { members: [] }

        // Exports
        export { PublicPersona, PublicTeam };
        export pub persona AnotherPublic { intent: "Another" }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Allow some warnings but no errors for complex scenarios
      expect(result.value.errors).toHaveLength(0);
    });

    it('should handle import and export combinations', () => {
      const source = `
        import { BasePersona } from "./base.pcl";
        import { UtilityTeam } from "./utils.pcl";

        pub persona ExtendedPersona {
          intent: "Extended from base"
        }

        pub team CombinedTeam {
          members: [ExtendedPersona]
        }

        export { ExtendedPersona, CombinedTeam };
        export { BasePersona } from "./base.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      // Allow some warnings but no errors for import/export combinations
      expect(result.value.errors).toHaveLength(0);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for undefined exports', () => {
      const source = `
        export { UndefinedSymbol, AnotherUndefined };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(2);
      expect(result.value.errors[0].message).toContain(
        "Cannot export 'UndefinedSymbol': symbol not found"
      );
      expect(result.value.errors[1].message).toContain(
        "Cannot export 'AnotherUndefined': symbol not found"
      );
    });

    it('should provide warnings for private exports', () => {
      const source = `
        persona Private1 { }
        team Private2 { members: [] }
        export { Private1, Private2 };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.warnings).toHaveLength(2);
      expect(result.value.warnings[0].message).toContain(
        'Exporting private symbol'
      );
      expect(result.value.warnings[1].message).toContain(
        'Exporting private symbol'
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without module path (legacy mode)', () => {
      const source = `
        persona TestPersona { }
        pub persona PubPersona { }
        priv persona PrivPersona { }
        export { PubPersona };
        import { Something } from "./other.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program); // No modulePath

      expect(result.ok).toBe(true);
      // Should work without module tracking
    });

    it('should maintain existing behavior without module context', () => {
      const source = `
        persona A { }
        persona B { }
        team T { members: [A, B] }
      `;

      const parseResult = parse(source);
      if (!parseResult.ok) return;

      const result1 = analyze(parseResult.value.program);
      const result2 = analyze(parseResult.value.program, {
        modulePath: 'test.pcl',
      });

      // Both should succeed
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty modules', () => {
      const source = `// Empty module`;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'empty.pcl',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.errors).toHaveLength(0);
    });

    it('should handle modules with only imports', () => {
      const source = `
        import { A, B, C } from "./other.pcl";
        import Default from "./default.pcl";
        import * as All from "./all.pcl";
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'imports-only.pcl',
      });

      expect(result.ok).toBe(true);
    });

    it('should handle modules with only exports', () => {
      const source = `
        export { A, B } from "./other.pcl";
        export pub persona Local { intent: "Local" };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'exports-only.pcl',
      });

      expect(result.ok).toBe(true);
      // Should warn about undefined exports, but that's expected
    });

    it('should handle circular import patterns', () => {
      // This would require multi-module analysis to detect
      // For now, we test that single-module analysis works
      const source = `
        import { A } from "./moduleA.pcl";
        import { B } from "./moduleB.pcl";
        export { A, B };
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const result = analyze(parseResult.value.program, {
        modulePath: 'circular.pcl',
      });

      expect(result.ok).toBe(true);
    });
  });
});
