// ═══════════════════════════════════════════════════════════════════════════════
// PCL Runtime - Workflow Execution Tests
// Tests for WorkflowExecutor with sequential, parallel, and conditional workflows
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, test, expect, beforeEach } from 'vitest';
import { WorkflowExecutor, createPersona, createRuntime } from '../../src/runtime/index';
import { MockProvider } from '../../src/runtime/providers/mock';
import type * as AST from '../../src/types/ast';

describe('WorkflowExecutor', () => {
  let mockProvider: MockProvider;
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    mockProvider = new MockProvider({
      responses: ['Response 1', 'Response 2', 'Response 3'],
    });
    runtime = createRuntime();
    runtime.setDefaultProvider(mockProvider);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Sequential Workflows (A -> B)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Sequential Workflows', () => {
    test('executes two personas in sequence', async () => {
      const personaA = createPersona('A', 'A', { intent: 'First step' }, mockProvider);
      const personaB = createPersona('B', 'B', { intent: 'Second step' }, mockProvider);

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'TestWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowSequenceExpr',
                steps: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'test input', personas, new Map());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeDefined();
      }

      const state = executor.getState();
      expect(state?.status).toBe('completed');
      expect(state?.name).toBe('TestWorkflow');
    });

    test('passes output from first persona to second', async () => {
      const provider = new MockProvider({
        responses: ['First output', 'Second output'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      const personaB = createPersona('B', 'B', {}, provider);

      personaA.activate();
      personaB.activate();

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'PipelineWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowSequenceExpr',
                steps: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });

    test('executes three personas in sequence', async () => {
      const provider = new MockProvider({
        responses: ['Step 1', 'Step 2', 'Step 3'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      const personaB = createPersona('B', 'B', {}, provider);
      const personaC = createPersona('C', 'C', {}, provider);

      personaA.activate();
      personaB.activate();
      personaC.activate();

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
        ['C', personaC],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ThreeStepWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowSequenceExpr',
                steps: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'C' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Parallel Workflows (A || B)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Parallel Workflows', () => {
    test('executes two personas in parallel', async () => {
      const provider = new MockProvider({
        responses: ['Response A', 'Response B'],
        delay: 50, // Small delay to simulate async
      });

      const personaA = createPersona('A', 'A', {}, provider);
      const personaB = createPersona('B', 'B', {}, provider);

      personaA.activate();
      personaB.activate();

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ParallelWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowParallelExpr',
                branches: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const start = Date.now();
      const result = await executor.execute(workflow, 'input', personas, new Map());
      const elapsed = Date.now() - start;

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Result should be an array of both responses
        expect(Array.isArray(result.value)).toBe(true);
        expect((result.value as unknown[]).length).toBe(2);
      }

      // Should execute in parallel (not 2x delay)
      expect(elapsed).toBeLessThan(150); // Allow some margin
    });

    test('executes three personas in parallel', async () => {
      const provider = new MockProvider({
        responses: ['A', 'B', 'C'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      const personaB = createPersona('B', 'B', {}, provider);
      const personaC = createPersona('C', 'C', {}, provider);

      personaA.activate();
      personaB.activate();
      personaC.activate();

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
        ['C', personaC],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ThreeParallelWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowParallelExpr',
                branches: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'C' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect((result.value as unknown[]).length).toBe(3);
      }
    });

    test('returns all parallel results', async () => {
      const provider = new MockProvider({
        responses: ['Result 1', 'Result 2'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      const personaB = createPersona('B', 'B', {}, provider);

      personaA.activate();
      personaB.activate();

      const personas = new Map([
        ['A', personaA],
        ['B', personaB],
      ]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ParallelResultsWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowParallelExpr',
                branches: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      if (result.ok) {
        const results = result.value as unknown[];
        expect(results).toBeDefined();
        expect(results.length).toBe(2);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Conditional Workflows (if/then/else)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Conditional Workflows', () => {
    test('executes then branch when condition is true', async () => {
      const provider = new MockProvider({
        responses: ['Then branch'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.setProvider(provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ConditionalWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowConditionalExpr',
                condition: {
                  kind: 'BooleanLiteral',
                  value: true,
                },
                thenBranch: {
                  kind: 'WorkflowPersonaRef',
                  persona: { kind: 'Identifier', name: 'A' },
                },
                elseBranch: undefined,
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });

    test('executes else branch when condition is false', async () => {
      const provider = new MockProvider({
        responses: ['Else branch'],
      });

      const personaB = createPersona('B', 'B', {}, provider);
      personaB.activate();

      const personas = new Map([['B', personaB]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ConditionalElseWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowConditionalExpr',
                condition: {
                  kind: 'BooleanLiteral',
                  value: false,
                },
                thenBranch: {
                  kind: 'WorkflowPersonaRef',
                  persona: { kind: 'Identifier', name: 'A' },
                },
                elseBranch: {
                  kind: 'WorkflowPersonaRef',
                  persona: { kind: 'Identifier', name: 'B' },
                },
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });

    test('returns input when condition is false and no else branch', async () => {
      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ConditionalNoElseWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowConditionalExpr',
                condition: {
                  kind: 'BooleanLiteral',
                  value: false,
                },
                thenBranch: {
                  kind: 'WorkflowPersonaRef',
                  persona: { kind: 'Identifier', name: 'A' },
                },
                elseBranch: undefined,
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'test input', new Map(), new Map());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('test input'); // Input passed through
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Choice Workflows (A | B)
  // ───────────────────────────────────────────────────────────────────────────

  describe('Choice Workflows', () => {
    test('executes first successful branch', async () => {
      const provider = new MockProvider({
        responses: ['First success'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ChoiceWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowChoiceExpr',
                branches: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });

    test('falls back to second branch if first fails', async () => {
      const provider = new MockProvider({
        responses: ['Second branch'],
        simulateErrors: false,
      });

      // B exists but A does not
      const personaB = createPersona('B', 'B', {}, provider);
      personaB.activate();

      const personas = new Map([['B', personaB]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'ChoiceFallbackWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowChoiceExpr',
                branches: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } }, // Doesn't exist
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'B' } }, // Exists
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Workflow State & Events
  // ───────────────────────────────────────────────────────────────────────────

  describe('Workflow State', () => {
    test('tracks workflow status through lifecycle', async () => {
      const provider = new MockProvider({
        responses: ['Done'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.setProvider(provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'StatusWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowPersonaRef',
                persona: { kind: 'Identifier', name: 'A' },
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();

      // Before execution
      expect(executor.getState()).toBeNull();

      // Execute
      await executor.execute(workflow, 'input', personas, new Map());

      // After execution
      const state = executor.getState();
      expect(state).toBeDefined();
      expect(state?.status).toBe('completed');
      expect(state?.name).toBe('StatusWorkflow');
      expect(state?.startTime).toBeDefined();
      expect(state?.endTime).toBeDefined();
    });

    test('emits workflow events', async () => {
      const provider = new MockProvider({
        responses: ['Done'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.setProvider(provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'EventWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowPersonaRef',
                persona: { kind: 'Identifier', name: 'A' },
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const events: string[] = [];

      executor.on((event) => {
        events.push(event.type);
      });

      await executor.execute(workflow, 'input', personas, new Map());

      expect(events).toContain('workflow:started');
      expect(events).toContain('workflow:completed');
    });

    test('sets status to failed on error', async () => {
      const provider = new MockProvider({
        simulateErrors: true,
        errorRate: 1.0,
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'FailWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowPersonaRef',
                persona: { kind: 'Identifier', name: 'A' },
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(false);
      expect(executor.getState()?.status).toBe('failed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Workflow Abort
  // ───────────────────────────────────────────────────────────────────────────

  describe('Workflow Abort', () => {
    test('can abort a workflow', async () => {
      const provider = new MockProvider({
        responses: ['Response'],
        delay: 200, // Long enough to abort
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'AbortWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowSequenceExpr',
                steps: [
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                  {
                    kind: 'WorkflowPersonaRef',
                    ref: {
                      kind: 'PersonaReference',
                      ref: { type: 'id', id: { kind: 'Identifier', name: 'A' } },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();

      // Abort after a short delay
      setTimeout(() => executor.abort(), 100);

      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('abort');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group Expressions
  // ───────────────────────────────────────────────────────────────────────────

  describe('Group Expressions', () => {
    test('executes grouped expression', async () => {
      const provider = new MockProvider({
        responses: ['Grouped'],
      });

      const personaA = createPersona('A', 'A', {}, provider);
      personaA.setProvider(provider);
      personaA.activate();

      const personas = new Map([['A', personaA]]);

      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        id: { kind: 'Identifier', name: 'GroupWorkflow' },
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowGroupExpr',
                expr: {
                  kind: 'WorkflowPersonaRef',
                  persona: { kind: 'Identifier', name: 'A' },
                },
              },
            },
          ],
        },
      };

      const executor = new WorkflowExecutor();
      const result = await executor.execute(workflow, 'input', personas, new Map());

      expect(result.ok).toBe(true);
      expect(executor.getState()?.status).toBe('completed');
    });
  });
});
