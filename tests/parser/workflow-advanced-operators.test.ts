/**
 * Tests for Phase 1.2 Advanced Workflow Operators
 * - Async pipe (~>)
 * - Bidirectional (<->)
 * - Accumulate (>>>)
 * - Composition (::)
 * - Break/Continue statements
 */

import { parse } from '../../src/index';

describe('Advanced Workflow Operators', () => {
  describe('Async Pipe Operator (~>)', () => {
    it('should parse async pipe operator', () => {
      const source = `
        workflow AsyncPipeline {
          steps: Fetch ~> Process ~> Store
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      expect(workflow.kind).toBe('WorkflowDeclaration');

      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');
      expect(stepsDecl).toBeTruthy(); // Should have steps declaration

      // Should parse as async pipe expression
      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowAsyncPipeExpr');
      expect(steps.left).toBeTruthy(); // Should have left operand
      expect(steps.right).toBeTruthy(); // Should have right operand
    });

    it('should chain multiple async pipes', () => {
      const source = `
        workflow MultiStage {
          steps: A ~> B ~> C ~> D
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      // Should create nested async pipe expressions
      let steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowAsyncPipeExpr');

      // Verify chaining structure
      expect(steps.right.kind).toBe('WorkflowAsyncPipeExpr');
    });

    it('should have higher precedence than sequence operator', () => {
      const source = `
        workflow Mixed {
          steps: A ~> B -> C
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      // Should parse as: (A ~> B) -> C
      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowSequenceExpr', 'Outer should be sequence');
      expect(steps.steps[0].kind).toBe('WorkflowAsyncPipeExpr', 'First step should be async pipe');
    });
  });

  describe('Bidirectional Operator (<->)', () => {
    it('should parse bidirectional operator', () => {
      const source = `
        workflow Negotiation {
          steps: Buyer <-> Seller
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowBidirectionalExpr');
      expect(steps.left).toBeTruthy(); // Should have left operand
      expect(steps.right).toBeTruthy(); // Should have right operand
      expect(steps.maxIterations).toBe(null, 'Should have no max iterations by default');
    });

    it('should parse bidirectional with max iterations', () => {
      const source = `
        workflow LimitedNegotiation {
          steps: Buyer <-> Seller (5)
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowBidirectionalExpr');
      expect(steps.maxIterations).toBeTruthy(); // Should have max iterations
      expect(steps.maxIterations.value).toBe(5);
    });
  });

  describe('Accumulate Operator (>>>)', () => {
    it('should parse accumulate operator', () => {
      const source = `
        workflow Aggregation {
          steps: Collect >>> Aggregate >>> Summarize
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowAccumulateExpr');
      expect(Array.isArray(steps.steps)).toBeTruthy(); // Should have steps array
      expect(steps.steps.length).toBe(3, 'Should have 3 accumulated steps');
    });

    it('should have correct precedence with other operators', () => {
      const source = `
        workflow ComplexFlow {
          steps: A >>> B ~> C
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      // Should parse as: (A >>> B) ~> C
      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowAsyncPipeExpr', 'Outer should be async pipe');
      expect(steps.left.kind).toBe('WorkflowAccumulateExpr', 'Left should be accumulate');
    });
  });

  describe('Composition Operator (::)', () => {
    it('should parse composition operator', () => {
      const source = `
        workflow ETL {
          steps: Extract :: Transform :: Load
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const steps = stepsDecl.steps;
      expect(steps.kind).toBe('WorkflowComposeExpr');
      expect(Array.isArray(steps.workflows)).toBeTruthy(); // Should have workflows array
      expect(steps.workflows.length).toBe(3, 'Should have 3 composed workflows');
    });

    it('should have highest precedence', () => {
      const source = `
        workflow AllOperators {
          steps: A :: B >>> C <-> D ~> E -> F
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      // Should parse with :: having highest precedence
      // (A :: B) is evaluated first
      const steps = stepsDecl.steps;

      // Outer should be sequence (->)
      expect(steps.kind).toBe('WorkflowSequenceExpr', 'Outermost should be sequence');
    });
  });

  describe('Break Statement', () => {
    it('should parse break statement', () => {
      const source = `
        workflow Search {
          steps: loop {
            break
          } times 10
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const loop = stepsDecl.steps;
      expect(loop.kind).toBe('WorkflowLoopExpr');
      expect(loop.body.kind).toBe('WorkflowBreakStmt');
      expect(loop.body.label).toBe(null, 'Should have no label');
    });

    it('should parse break with label', () => {
      const source = `
        workflow NestedSearch {
          steps: loop {
            break outer
          } times 5
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const loop = stepsDecl.steps;
      const breakStmt = loop.body;
      expect(breakStmt.kind).toBe('WorkflowBreakStmt');
      expect(breakStmt.label).toBeTruthy(); // Should have label
      expect(breakStmt.label.name).toBe('outer');
    });
  });

  describe('Continue Statement', () => {
    it('should parse continue statement', () => {
      const source = `
        workflow Filter {
          steps: loop {
            continue
          } times 10
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const loop = stepsDecl.steps;
      expect(loop.kind).toBe('WorkflowLoopExpr');
      expect(loop.body.kind).toBe('WorkflowContinueStmt');
      expect(loop.body.label).toBe(null, 'Should have no label');
    });

    it('should parse continue with label', () => {
      const source = `
        workflow NestedFilter {
          steps: loop {
            continue outer
          } times 5
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const stepsDecl = workflow.body.members.find(m => m.kind === 'WorkflowStepsDeclaration');

      const loop = stepsDecl.steps;
      const continueStmt = loop.body;
      expect(continueStmt.kind).toBe('WorkflowContinueStmt');
      expect(continueStmt.label).toBeTruthy(); // Should have label
      expect(continueStmt.label.name).toBe('outer');
    });
  });

  describe('Enhanced Retry Configuration', () => {
    it('should parse exponential backoff', () => {
      const source = `
        workflow ResilientAPI {
          retry: {
            count: 5,
            delay: 1s,
            backoff: exponential
          }
          steps: CallAPI
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl).toBeTruthy(); // Should have retry declaration
      expect(retryDecl.config.kind).toBe('RetryConfigNode');
      expect(retryDecl.config.backoff).toBe('exponential');
    });

    it('should parse fibonacci backoff', () => {
      const source = `
        workflow SmartRetry {
          retry: {
            count: 8,
            delay: 500ms,
            backoff: fibonacci
          }
          steps: ProcessData
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl.config.backoff).toBe('fibonacci');
    });

    it('should parse random backoff', () => {
      const source = `
        workflow RandomRetry {
          retry: {
            count: 3,
            delay: 1s,
            backoff: random
          }
          steps: TryOperation
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl.config.backoff).toBe('random');
    });

    it('should parse linear backoff', () => {
      const source = `
        workflow LinearRetry {
          retry: {
            count: 3,
            delay: 2s,
            backoff: linear
          }
          steps: RunTask
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl.config.backoff).toBe('linear');
    });

    it('should parse retry with maxDelay', () => {
      const source = `
        workflow CappedRetry {
          retry: {
            count: 10,
            delay: 1s,
            backoff: exponential,
            maxDelay: 30s
          }
          steps: LongOperation
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl.config.maxDelay).toBeTruthy(); // Should have maxDelay
      expect(retryDecl.config.maxDelay.value).toBe(30);
      expect(retryDecl.config.maxDelay.unit).toBe('s');
    });

    it('should parse retry with jitter', () => {
      const source = `
        workflow JitteredRetry {
          retry: {
            count: 5,
            delay: 1s,
            backoff: exponential,
            jitter: true
          }
          steps: DistributedTask
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      expect(retryDecl.config.jitter).toBe(true);
    });

    it('should parse complete retry configuration', () => {
      const source = `
        workflow FullRetry {
          retry: {
            count: 7,
            delay: 500ms,
            backoff: fibonacci,
            maxDelay: 1m,
            jitter: true
          }
          steps: ComplexOperation
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      const retryDecl = workflow.body.members.find(m => m.kind === 'WorkflowRetryDeclaration');

      const config = retryDecl.config;
      expect(config.count.value).toBe(7);
      expect(config.delay.value).toBe(500);
      expect(config.delay.unit).toBe('ms');
      expect(config.backoff).toBe('fibonacci');
      expect(config.maxDelay.value).toBe(1);
      expect(config.maxDelay.unit).toBe('m');
      expect(config.jitter).toBe(true);
    });
  });

  describe('Complex Workflow Combinations', () => {
    it('should parse workflow with all new features', () => {
      const source = `
        workflow CompleteExample {
          input: Request
          output: Response
          timeout: 5m
          retry: {
            count: 5,
            delay: 1s,
            backoff: exponential,
            maxDelay: 30s,
            jitter: true
          }
          fallback: BackupWorkflow
          when: is_enabled

          steps: Validate :: (Fetch ~> Process) >>> Aggregate <-> Refine -> Store
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully

      const workflow = result.value.program.statements[0];
      expect(workflow.kind).toBe('WorkflowDeclaration');

      // Verify all configuration blocks
      const members = workflow.body.members;
      expect(members.find(m => m.kind === 'WorkflowInputDeclaration')).toBeTruthy(); // Should have input
      expect(members.find(m => m.kind === 'WorkflowOutputDeclaration')).toBeTruthy(); // Should have output
      expect(members.find(m => m.kind === 'WorkflowTimeoutDeclaration')).toBeTruthy(); // Should have timeout
      expect(members.find(m => m.kind === 'WorkflowRetryDeclaration')).toBeTruthy(); // Should have retry
      expect(members.find(m => m.kind === 'WorkflowFallbackDeclaration')).toBeTruthy(); // Should have fallback
      expect(members.find(m => m.kind === 'WorkflowConditionDeclaration')).toBeTruthy(); // Should have when
      expect(members.find(m => m.kind === 'WorkflowStepsDeclaration')).toBeTruthy(); // Should have steps
    });

    it('should parse nested loops with break and continue', () => {
      const source = `
        workflow NestedLoops {
          steps: loop {
            loop {
              if should_break then break
              if should_skip then continue
              ProcessItem
            } times 10
          } while has_more
        }
      `;
      const result = parse(source);
      expect(result.ok).toBeTruthy(); // Should parse successfully
    });
  });
});
