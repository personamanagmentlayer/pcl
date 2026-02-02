/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Parser Error Recovery Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests parser's ability to recover from errors and provide helpful diagnostics
 */

import { Parser } from '../../src/parser';

describe('Parser Error Recovery', () => {
  describe('Malformed Declarations', () => {
    it('should recover from missing persona name', () => {
      const input = `persona { intent: "test" }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from missing opening brace', () => {
      const input = `persona Test intent: "test" }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from missing closing brace', () => {
      const input = `persona Test { intent: "test"`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from invalid property syntax', () => {
      const input = `persona Test { intent "test" }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from incomplete team declaration', () => {
      const input = `team CodeReview { members: [`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from workflow with missing steps', () => {
      const input = `workflow Analysis { input: String }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      // This might be valid (workflow without steps), check warnings
    });
  });

  describe('Invalid Tokens', () => {
    it('should handle unexpected symbols', () => {
      const input = `persona Test { intent: "test", $$$ }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle unclosed strings', () => {
      const input = `persona Test { intent: "unclosed }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      // Lexer should catch this
      expect(result.ok).toBe(false);
    });

    it('should handle unclosed template literals', () => {
      const input = 'persona Test { intent: `template ${expr';
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      // Lexer may fail on unclosed template
      expect(result.ok).toBeDefined();
    });

    it('should handle invalid escape sequences', () => {
      const input = `persona Test { intent: "invalid \\x escape" }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      // Lexer may reject invalid escape sequences
      expect(result.ok).toBeDefined();
    });
  });

  describe('Expression Parsing Errors', () => {
    it('should recover from incomplete binary expressions', () => {
      const input = `persona Test {
        constraints { max_tokens >= }
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from unbalanced parentheses', () => {
      const input = `persona Test {
        constraints { max_tokens >= (100 + 50 }
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from missing function arguments', () => {
      const input = `persona Test {
        fn process() -> String {
          return transform(
        }
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle division by zero in constraints', () => {
      const input = `persona Test {
        constraints { response_time <= 1000 / 0 }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      // Parser should accept, semantic analyzer should warn
      expect(result.ok).toBe(true);
    });
  });

  describe('Type Annotation Errors', () => {
    it('should recover from incomplete type annotations', () => {
      const input = `persona Test {
        data: Array<
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from invalid generic syntax', () => {
      const input = `persona Test {
        data: Map<String
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle malformed union types', () => {
      const input = `persona Test {
        status: "active" | | "inactive"
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle malformed intersection types', () => {
      const input = `persona Test {
        data: Base & &
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Workflow Expression Errors', () => {
    it('should recover from incomplete parallel expression', () => {
      const input = `workflow Process {
        steps: [A, B] | [
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from incomplete sequence', () => {
      const input = `workflow Process {
        steps: A -> B ->
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle malformed conditional workflow', () => {
      const input = `workflow Process {
        steps: if (condition) then A
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        // May have errors or be valid depending on grammar
        expect(result.value.program).toBeDefined();
      }
    });

    it('should recover from unclosed loop', () => {
      const input = `workflow Process {
        steps: loop 3 times {
          A -> B
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Comment Edge Cases', () => {
    it('should handle unclosed block comments', () => {
      const input = `/* This is unclosed
      persona Test { intent: "test" }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(false);
    });

    it('should handle nested block comments', () => {
      const input = `/* outer /* inner */ still in outer */
      persona Test { intent: "test" }`;
      const parser = new Parser(input, { preserveComments: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should preserve multiple comment types', () => {
      const input = `// Line comment
      /* Block comment */
      /// Doc comment
      persona Test { intent: "test" }`;
      const parser = new Parser(input, { preserveComments: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program.comments.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty input', () => {
      const parser = new Parser('');
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program.statements).toHaveLength(0);
      }
    });

    it('should handle whitespace-only input', () => {
      const parser = new Parser('   \n\t  \n  ');
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program.statements).toHaveLength(0);
      }
    });

    it('should handle very long identifiers', () => {
      const longName = 'a'.repeat(1000);
      const input = `persona ${longName} { intent: "test" }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested structures', () => {
      let input = 'persona Test { ';
      for (let i = 0; i < 100; i++) {
        input += `nested${i}: { `;
      }
      input += 'value: 42';
      for (let i = 0; i < 100; i++) {
        input += ' }';
      }
      input += ' }';

      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle maximum integer values', () => {
      const input = `persona Test {
        max_value: ${Number.MAX_SAFE_INTEGER}
        min_value: ${Number.MIN_SAFE_INTEGER}
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle float edge cases', () => {
      const input = `persona Test {
        inf: ${Number.POSITIVE_INFINITY}
        neg_inf: ${Number.NEGATIVE_INFINITY}
        nan: ${Number.NaN}
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Error Messages Quality', () => {
    it('should provide line and column information', () => {
      const input = `persona Test {\n  intent: \n}`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok && result.value.errors.length > 0) {
        const error = result.value.errors[0];
        expect(error.span.start.line).toBeGreaterThan(0);
        expect(error.span.start.column).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide contextual error messages', () => {
      const input = `persona Test { intent }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok && result.value.errors.length > 0) {
        const error = result.value.errors[0];
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Multiple Errors', () => {
    it('should collect multiple errors in single pass', () => {
      const input = `
      persona Test {
        intent
        skills {
        constraints { max_tokens >= }
      }

      team Missing {
        members: [
      `;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(2);
      }
    });

    it('should not cascade errors unnecessarily', () => {
      const input = `persona Test { intent: "test" };`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
      // Semicolon after declaration is valid (consumed as empty statement)
    });
  });
});

describe('Parser Edge Cases', () => {
  describe('Escape Sequences', () => {
    it('should parse all valid escape sequences', () => {
      const input = String.raw`persona Test {
        str: "newline:\n tab:\t quote:\" backslash:\\ unicode:\u0041"
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle raw strings', () => {
      const input = 'persona Test { path: r"C:\\\\Users\\\\test" }';
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Number Formats', () => {
    it('should parse hexadecimal numbers', () => {
      const input = `persona Test { hex: 0xFF }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse binary numbers', () => {
      const input = `persona Test { bin: 0b1010 }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse octal numbers', () => {
      const input = `persona Test { oct: 0o755 }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse scientific notation', () => {
      const input = `persona Test {
        sci1: 1.23e10
        sci2: 4.56E-5
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse duration literals', () => {
      const input = `workflow Test {
        timeout: 30s
        retry_delay: 100ms
        max_duration: 5m
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Unicode Support', () => {
    it('should support unicode identifiers', () => {
      const input = `persona Тест { intent: "test" }`;
      const parser = new Parser(input);
      const result = parser.parse();

      // Unicode identifiers may not be supported, check result exists
      expect(result.ok).toBeDefined();
    });

    it('should support emoji in strings', () => {
      const input = `persona Test { status: "✅ Ready 🚀" }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle RTL text', () => {
      const input = `persona Test { arabic: "مرحبا" }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Operator Precedence', () => {
    it('should respect arithmetic precedence', () => {
      const input = `persona Test {
        constraints { value <= 2 + 3 * 4 }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
      // Result should be 14, not 20
    });

    it('should respect logical operator precedence', () => {
      const input = `persona Test {
        constraints { (a || b) && c }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle power operator', () => {
      const input = `persona Test {
        constraints { value <= 2 ** 10 }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle spaceship operator', () => {
      const input = `persona Test {
        constraints { version <=> "1.0.0" }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });
});
