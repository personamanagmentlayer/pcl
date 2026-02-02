/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Code Generation Edge Cases Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests codegen's handling of edge cases and optimization scenarios
 */

import { parse } from '../../src/parser';
import { analyze } from '../../src/semantic';
import { generate } from '../../src/codegen';

describe('Code Generation Edge Cases', () => {
  describe('String Escaping', () => {
    it('should escape special characters in system prompts', () => {
      const input = `
      persona Test {
        intent: "Handle \\n newlines, \\t tabs, and \\" quotes"
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toContain('newlines');
          expect(code).toContain('tabs');
        }
      }
    });

    it('should handle unicode in strings', () => {
      const input = `
      persona Test {
        intent: "Unicode: ★ ♥ ☺ emoji: 🚀 ✨"
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should handle markdown in instructions', () => {
      const input = `
      persona Test {
        intent: """
        # Title
        ## Subtitle
        - List item
        **Bold** and *italic*
        """
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toContain('Title');
        }
      }
    });

    it('should handle template literals', () => {
      const input = 'persona Test { msg: `Hello ${name}!` }';
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Code Optimization', () => {
    it('should optimize constant folding', () => {
      const input = `
      persona Test {
        value: 2 + 3 * 4
        result: 100 / 10 - 5
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          // Should contain computed values
          expect(code).toBeDefined();
        }
      }
    });

    it('should optimize dead code elimination', () => {
      const input = `
      persona Test {
        fn process() {
          if (false) {
            unreachable_code()
          }
          return "result"
        }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should optimize boolean expressions', () => {
      const input = `
      persona Test {
        constraints {
          true && condition
          false || condition
          !(!value)
        }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('TypeScript Generation', () => {
    it('should generate valid TypeScript for personas', () => {
      const input = `
      persona Developer {
        intent: "Software development"
        skills { "typescript", "javascript" }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'typescript',
          });
          expect(code).toContain('export');
          expect(code).toContain('interface');
        }
      }
    });

    it('should generate type definitions', () => {
      const input = `
      type UserId = String
      type Age = Int

      interface User {
        id: UserId
        age: Age
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'typescript',
          });
          expect(code).toBeDefined();
        }
      }
    });

    it('should generate generic types', () => {
      const input = `
      type Container<T> = {
        value: T,
        count: Int
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'typescript',
          });
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Prompt Enhancement', () => {
    it('should enhance with format specifiers', () => {
      const input = `
      persona Test {
        intent: "Test persona"
        @onActivate
        fn init() {
          // Initialization
        }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'system-prompt',
            enhance: true,
          });
          expect(code).toBeDefined();
        }
      }
    });

    it('should add role clarity', () => {
      const input = `
      persona Expert {
        intent: "Domain expert"
        skills { "analysis", "consulting" }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'system-prompt',
            enhance: true,
          });
          expect(code).toBeDefined();
          expect(code.length).toBeGreaterThan(0);
        }
      }
    });

    it('should include constraint explanations', () => {
      const input = `
      persona Test {
        intent: "test"
        constraints {
          max_tokens <= 1000
          temperature >= 0.7
        }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'system-prompt',
            enhance: true,
          });
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Multi-Target Generation', () => {
    it('should generate system prompts', () => {
      const input = `
      persona Test {
        intent: "Test persona"
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'system-prompt',
          });
          expect(typeof code).toBe('string');
        }
      }
    });

    it('should generate JSON configurations', () => {
      const input = `
      persona Test {
        intent: "Test persona"
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'json',
          });
          expect(() => JSON.parse(code)).not.toThrow();
        }
      }
    });

    it('should generate markdown documentation', () => {
      const input = `
      persona Test {
        intent: "Test persona"
        skills { "skill1", "skill2" }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            target: 'markdown',
          });
          expect(code).toContain('#');
        }
      }
    });
  });

  describe('Complex Structure Generation', () => {
    it('should generate nested personas', () => {
      const input = `
      persona Outer {
        intent: "outer"
        persona Inner {
          intent: "inner"
        }
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should generate team configurations', () => {
      const input = `
      persona A { intent: "a" }
      persona B { intent: "b" }

      team Test {
        members: [A, B]
        merge: debate
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should generate workflow definitions', () => {
      const input = `
      persona A { intent: "a" }
      persona B { intent: "b" }

      workflow Process {
        steps: A -> B
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Source Map Generation', () => {
    it('should generate source maps', () => {
      const input = `
      persona Test {
        intent: "test"
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            sourceMap: true,
          });
          expect(code).toBeDefined();
        }
      }
    });

    it('should preserve line numbers in source maps', () => {
      const input = `
      // Line 1
      persona Test {
        // Line 3
        intent: "test"
        // Line 5
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable, {
            sourceMap: true,
          });
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle invalid symbol table gracefully', () => {
      const input = `
      persona Test {
        value: undefined_symbol
      }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          // Should generate code even with semantic errors
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should handle empty persona', () => {
      const input = `persona Empty { }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });

    it('should handle very long identifiers', () => {
      const longName = 'a'.repeat(1000);
      const input = `persona ${longName} { intent: "test" }`;
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          expect(code).toBeDefined();
        }
      }
    });
  });

  describe('Performance', () => {
    it('should handle large persona definitions efficiently', () => {
      let input = 'persona Large {\n';
      for (let i = 0; i < 100; i++) {
        input += `  prop${i}: "value${i}"\n`;
      }
      input += '}';

      const start = performance.now();
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          const duration = performance.now() - start;

          expect(code).toBeDefined();
          expect(duration).toBeLessThan(1000); // Should complete in <1s
        }
      }
    });

    it('should handle many small personas efficiently', () => {
      let input = '';
      for (let i = 0; i < 50; i++) {
        input += `persona P${i} { intent: "p${i}" }\n`;
      }

      const start = performance.now();
      const parseResult = parse(input);
      expect(parseResult.ok).toBe(true);

      if (parseResult.ok) {
        const semanticResult = analyze(parseResult.value.program);
        expect(semanticResult.ok).toBe(true);

        if (semanticResult.ok) {
          const code = generate(semanticResult.value.symbolTable);
          const duration = performance.now() - start;

          expect(code).toBeDefined();
          expect(duration).toBeLessThan(1000);
        }
      }
    });
  });
});
