/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Advanced Workflow Parser Edge Cases Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests parser's handling of advanced workflow operators and edge cases
 */

import { Parser } from '../../src/parser';

describe('Advanced Workflow Operators', () => {
  describe('Async Pipe Operator (~>)', () => {
    it('should parse simple async pipe', () => {
      const input = `
      workflow Async {
        steps: A ~> B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0];
        expect(workflow.kind).toBe('WorkflowDeclaration');
      }
    });

    it('should parse chained async pipes', () => {
      const input = `
      workflow AsyncChain {
        steps: A ~> B ~> C ~> D
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse async pipe with parallel branches', () => {
      const input = `
      workflow AsyncParallel {
        steps: A ~> [B, C, D]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse mixed sync and async pipes', () => {
      const input = `
      workflow Mixed {
        steps: A -> B ~> C -> D
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Bidirectional Operator (<->)', () => {
    it('should parse simple bidirectional flow', () => {
      const input = `
      workflow Feedback {
        steps: A <-> B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse bidirectional with max iterations', () => {
      const input = `
      workflow LimitedFeedback {
        steps: A <->(5) B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex bidirectional chains', () => {
      const input = `
      workflow ComplexFeedback {
        steps: A <-> B <-> C
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse bidirectional with convergence condition', () => {
      const input = `
      workflow ConditionalFeedback {
        steps: A <->(until: converged) B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Accumulate Operator (>>>)', () => {
    it('should parse simple accumulate', () => {
      const input = `
      workflow Accumulate {
        steps: A >>> B >>> C
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse accumulate with array', () => {
      const input = `
      workflow AccumulateArray {
        steps: [A, B, C] >>> Aggregator
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse nested accumulate', () => {
      const input = `
      workflow NestedAccumulate {
        steps: (A >>> B) >>> (C >>> D)
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Compose Operator (::)', () => {
    it('should parse simple composition', () => {
      const input = `
      workflow Composed {
        steps: WorkflowA :: WorkflowB
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse multiple compositions', () => {
      const input = `
      workflow MultiCompose {
        steps: W1 :: W2 :: W3 :: W4
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse composition with inline workflows', () => {
      const input = `
      workflow InlineCompose {
        steps: (A -> B) :: (C -> D)
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Combined Advanced Operators', () => {
    it('should parse all operators together', () => {
      const input = `
      workflow AllOperators {
        steps: A ~> B <-> C >>> D :: E
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex nested operator combinations', () => {
      const input = `
      workflow Complex {
        steps: (
          (A ~> B) <->(3) (C -> D)
        ) >>> (
          [E, F, G] | [H, I]
        ) :: ExistingWorkflow
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should respect operator precedence', () => {
      const input = `
      workflow Precedence {
        steps: A -> B | C ~> D <-> E >>> F :: G
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle parentheses for explicit ordering', () => {
      const input = `
      workflow Explicit {
        steps: ((A -> B) | C) ~> (D <-> E)
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Loop Control Statements', () => {
    it('should parse break statement', () => {
      const input = `
      workflow WithBreak {
        steps: loop while condition {
          if (done) then break
          else Process
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse continue statement', () => {
      const input = `
      workflow WithContinue {
        steps: loop 10 times {
          if (skip) then continue
          else Process
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse labeled break', () => {
      const input = `
      workflow LabeledBreak {
        steps: outer: loop 5 times {
          inner: loop 3 times {
            if (exit_all) then break outer
            else if (exit_inner) then break inner
            else Process
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse labeled continue', () => {
      const input = `
      workflow LabeledContinue {
        steps: outer: loop while condition {
          if (skip_to_next_outer) then continue outer
          else Process
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Advanced Loop Types', () => {
    it('should parse while loops', () => {
      const input = `
      workflow WhileLoop {
        steps: loop while (counter < 10) {
          Process -> Increment
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse until loops', () => {
      const input = `
      workflow UntilLoop {
        steps: loop until (complete) {
          Process -> Check
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse for-in loops', () => {
      const input = `
      workflow ForInLoop {
        steps: for item in items {
          Process -> Validate
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse for-of loops', () => {
      const input = `
      workflow ForOfLoop {
        steps: for value of values {
          Transform -> Store
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse range-based loops', () => {
      const input = `
      workflow RangeLoop {
        steps: for i in range(0, 10) {
          Process
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Conditional Workflows', () => {
    it('should parse if-then-else in workflow', () => {
      const input = `
      workflow Conditional {
        steps: if (condition) then A else B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse nested conditionals', () => {
      const input = `
      workflow NestedConditional {
        steps: if (x > 0) then (
          if (y > 0) then A else B
        ) else (
          if (z > 0) then C else D
        )
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse conditional with complex expressions', () => {
      const input = `
      workflow ComplexCondition {
        steps: if (x > 10 && y < 5 || z == 0) then (
          A -> B -> C
        ) else (
          D -> E
        )
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse conditional chains', () => {
      const input = `
      workflow ConditionalChain {
        steps: if (x < 0) then Negative
          else if (x == 0) then Zero
          else if (x <= 10) then Small
          else Large
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Transform Operator (->)', () => {
    it('should parse basic transform', () => {
      const input = `
      workflow Transform {
        steps: Input -> Process -> Output
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse transform with mapping', () => {
      const input = `
      workflow MapTransform {
        steps: Input -> map(x => x * 2) -> Output
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse transform with filter', () => {
      const input = `
      workflow FilterTransform {
        steps: Input -> filter(x => x > 0) -> Output
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse transform pipeline', () => {
      const input = `
      workflow Pipeline {
        steps: Input
          -> validate
          -> normalize
          -> transform
          -> enrich
          -> Output
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Parallel Workflows', () => {
    it('should parse basic parallel', () => {
      const input = `
      workflow Parallel {
        steps: [A, B, C]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse parallel with sync option', () => {
      const input = `
      workflow ParallelSync {
        steps: [A, B, C] sync
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse nested parallel', () => {
      const input = `
      workflow NestedParallel {
        steps: [
          [A, B],
          [C, D],
          [E, F]
        ]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse parallel with sequential chains', () => {
      const input = `
      workflow ParallelChains {
        steps: [
          A -> B -> C,
          D -> E -> F,
          G -> H -> I
        ]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Choice Workflows', () => {
    it('should parse basic choice', () => {
      const input = `
      workflow Choice {
        steps: A | B | C
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse weighted choice', () => {
      const input = `
      workflow WeightedChoice {
        steps: A(0.5) | B(0.3) | C(0.2)
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse choice with fallback', () => {
      const input = `
      workflow ChoiceWithFallback {
        steps: Primary | Fallback1 | Fallback2 | Default
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Workflow Configuration', () => {
    it('should parse workflow with timeout', () => {
      const input = `
      workflow Timed {
        timeout: 30s
        steps: A -> B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with retry', () => {
      const input = `
      workflow Retry {
        retry: {
          count: 3,
          delay: 1s,
          backoff: exponential,
          max_delay: 60s,
          jitter: true
        }
        steps: A -> B
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with fallback', () => {
      const input = `
      workflow WithFallback {
        fallback: FallbackPersona
        steps: Primary -> Secondary
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with all configuration options', () => {
      const input = `
      workflow FullConfig {
        input: String
        output: Int
        timeout: 60s
        retry: 3
        fallback: DefaultHandler
        condition: valid_input

        steps: Validate -> Process -> Store
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Error Recovery in Workflows', () => {
    it('should recover from missing arrow', () => {
      const input = `
      workflow Error {
        steps: A B C
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from unbalanced brackets', () => {
      const input = `
      workflow Error {
        steps: [A, B
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });

    it('should recover from incomplete loop', () => {
      const input = `
      workflow Error {
        steps: loop 3 times
      }`;
      const parser = new Parser(input, { errorRecovery: true });
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty workflow', () => {
      const input = `workflow Empty { }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle workflow with only configuration', () => {
      const input = `
      workflow ConfigOnly {
        timeout: 30s
        retry: 3
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested workflow expressions', () => {
      let input = 'workflow Deep { steps: ';
      for (let i = 0; i < 50; i++) {
        input += '(';
      }
      input += 'A';
      for (let i = 0; i < 50; i++) {
        input += ')';
      }
      input += ' }';

      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle very long workflow chains', () => {
      let input = 'workflow Long { steps: A';
      for (let i = 1; i < 100; i++) {
        input += ` -> P${i}`;
      }
      input += ' }';

      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should handle mixed operator precedence edge cases', () => {
      const input = `
      workflow MixedPrecedence {
        steps: A -> B | C ~> D <-> E -> F | G
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });
});
