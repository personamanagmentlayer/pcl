/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * AST Node Creation and Validation Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests AST node factory methods and validation logic
 */

import * as AST from '../../src/ast';
import type { Span } from '../../src/types';

// Helper to create a span
const makeSpan = (
  line: number = 1,
  column: number = 0,
  offset: number = 0
): Span => ({
  start: { line, column, offset },
  end: { line, column: column + 1, offset: offset + 1 },
  source: '<test>',
});

describe('AST Node Creation', () => {
  describe('Factory Methods', () => {
    it('should create Program node', () => {
      const program = AST.AST.program([], [], makeSpan());

      expect(program.kind).toBe('Program');
      expect(program.statements).toEqual([]);
      expect(program.comments).toEqual([]);
      expect(program.span).toBeDefined();
    });

    it('should create Identifier node', () => {
      const id = AST.AST.identifier('test', makeSpan());

      expect(id.kind).toBe('Identifier');
      expect(id.name).toBe('test');
      expect(id.span).toBeDefined();
    });

    it('should create StringLiteral node', () => {
      const str = AST.AST.stringLiteral('hello', '"hello"', makeSpan());

      expect(str.kind).toBe('StringLiteral');
      expect(str.value).toBe('hello');
      expect(str.raw).toBe('"hello"');
    });

    it('should create NumberLiteral node', () => {
      const num = AST.AST.numberLiteral(42, '42', makeSpan());

      expect(num.kind).toBe('NumberLiteral');
      expect(num.value).toBe(42);
      expect(num.raw).toBe('42');
    });

    it('should create BooleanLiteral node', () => {
      const bool = AST.AST.booleanLiteral(true, makeSpan());

      expect(bool.kind).toBe('BooleanLiteral');
      expect(bool.value).toBe(true);
    });

    it('should create NullLiteral node', () => {
      const nul = AST.AST.nullLiteral(makeSpan());

      expect(nul.kind).toBe('NullLiteral');
    });
  });

  describe('Node Immutability', () => {
    it('should create readonly nodes', () => {
      const id = AST.AST.identifier('test', makeSpan());

      // TypeScript enforces readonly at compile time
      // At runtime, JavaScript allows mutation but TypeScript prevents it
      expect(id.name).toBe('test');
    });

    it('should create readonly arrays', () => {
      const program = AST.AST.program([], [], makeSpan());

      // TypeScript enforces readonly arrays at compile time
      expect(program.statements).toHaveLength(0);
    });
  });

  describe('Span Information', () => {
    it('should preserve span information', () => {
      const span = makeSpan(10, 5, 105);
      const id = AST.AST.identifier('test', span);

      expect(id.span.start.line).toBe(10);
      expect(id.span.start.column).toBe(5);
      expect(id.span.start.offset).toBe(105);
    });

    it('should handle multi-line spans', () => {
      const span: Span = {
        start: { line: 1, column: 0, offset: 0 },
        end: { line: 5, column: 10, offset: 50 },
        source: '<test>',
      };

      const program = AST.AST.program([], [], span);
      expect(program.span.start.line).toBe(1);
      expect(program.span.end.line).toBe(5);
    });
  });

  describe('Visitor Pattern', () => {
    it('should walk Program node', () => {
      const program = AST.AST.program([], [], makeSpan());
      let visited = false;

      AST.walk(program, {
        visitProgram: (node) => {
          visited = true;
          expect(node).toBe(program);
        },
      });

      expect(visited).toBe(true);
    });

    it('should use default visitor for unhandled nodes', () => {
      const id = AST.AST.identifier('test', makeSpan());
      let defaultCalled = false;

      AST.walk(id, {
        visitDefault: (node) => {
          defaultCalled = true;
          expect(node).toBe(id);
        },
      });

      expect(defaultCalled).toBe(true);
    });

    it('should return visitor result', () => {
      const program = AST.AST.program([], [], makeSpan());

      const result = AST.walk(program, {
        visitProgram: () => 'visited',
      });

      expect(result).toBe('visited');
    });
  });

  describe('Node Type Guards', () => {
    it('should distinguish between node kinds', () => {
      const id = AST.AST.identifier('test', makeSpan());
      const str = AST.AST.stringLiteral('test', '"test"', makeSpan());

      expect(id.kind).toBe('Identifier');
      expect(str.kind).toBe('StringLiteral');
      expect(id.kind).not.toBe(str.kind);
    });

    it('should handle union type nodes', () => {
      const nodes: AST.Expression[] = [
        AST.AST.identifier('x', makeSpan()),
        AST.AST.numberLiteral(42, '42', makeSpan()),
        AST.AST.booleanLiteral(true, makeSpan()),
      ];

      expect(nodes[0].kind).toBe('Identifier');
      expect(nodes[1].kind).toBe('NumberLiteral');
      expect(nodes[2].kind).toBe('BooleanLiteral');
    });
  });

  describe('Complex Node Structures', () => {
    it('should create PersonaDeclaration with all fields', () => {
      const persona: AST.PersonaDeclaration = {
        kind: 'PersonaDeclaration',
        decorators: [],
        modifiers: [],
        id: AST.AST.identifier('Test', makeSpan()),
        typeParameters: [],
        extends: [],
        implements: [],
        capabilities: [],
        body: {
          kind: 'PersonaBody',
          members: [],
          span: makeSpan(),
        },
        span: makeSpan(),
      };

      expect(persona.kind).toBe('PersonaDeclaration');
      expect(persona.id.name).toBe('Test');
      expect(persona.body.members).toHaveLength(0);
    });

    it('should create TeamDeclaration with members', () => {
      const team: AST.TeamDeclaration = {
        kind: 'TeamDeclaration',
        decorators: [],
        modifiers: [],
        id: AST.AST.identifier('DevTeam', makeSpan()),
        typeParameters: [],
        body: {
          kind: 'TeamBody',
          members: [
            {
              kind: 'TeamMembersDeclaration',
              members: [
                {
                  kind: 'PersonaReference',
                  ref: {
                    type: 'id',
                    id: AST.AST.identifier('Developer', makeSpan()),
                  },
                  span: makeSpan(),
                },
              ],
              span: makeSpan(),
            },
          ],
          span: makeSpan(),
        },
        span: makeSpan(),
      };

      expect(team.kind).toBe('TeamDeclaration');
      expect(team.id.name).toBe('DevTeam');
    });

    it('should create WorkflowDeclaration with steps', () => {
      const workflow: AST.WorkflowDeclaration = {
        kind: 'WorkflowDeclaration',
        decorators: [],
        modifiers: [],
        id: AST.AST.identifier('Process', makeSpan()),
        typeParameters: [],
        body: {
          kind: 'WorkflowBody',
          members: [
            {
              kind: 'WorkflowStepsDeclaration',
              steps: {
                kind: 'WorkflowPersonaRef',
                ref: {
                  kind: 'PersonaReference',
                  ref: {
                    type: 'id',
                    id: AST.AST.identifier('Worker', makeSpan()),
                  },
                  span: makeSpan(),
                },
                span: makeSpan(),
              },
              span: makeSpan(),
            },
          ],
          span: makeSpan(),
        },
        span: makeSpan(),
      };

      expect(workflow.kind).toBe('WorkflowDeclaration');
      expect(workflow.id.name).toBe('Process');
    });
  });

  describe('Type Nodes', () => {
    it('should create TypeReference', () => {
      const typeRef: AST.TypeReference = {
        kind: 'TypeReference',
        typeName: {
          kind: 'QualifiedIdentifier',
          parts: [AST.AST.identifier('String', makeSpan())],
          span: makeSpan(),
        },
        typeArguments: [],
        span: makeSpan(),
      };

      expect(typeRef.kind).toBe('TypeReference');
    });

    it('should create UnionType', () => {
      const union: AST.UnionType = {
        kind: 'UnionType',
        types: [
          {
            kind: 'TypeReference',
            typeName: {
              kind: 'QualifiedIdentifier',
              parts: [AST.AST.identifier('String', makeSpan())],
              span: makeSpan(),
            },
            typeArguments: [],
            span: makeSpan(),
          },
          {
            kind: 'TypeReference',
            typeName: {
              kind: 'QualifiedIdentifier',
              parts: [AST.AST.identifier('Int', makeSpan())],
              span: makeSpan(),
            },
            typeArguments: [],
            span: makeSpan(),
          },
        ],
        span: makeSpan(),
      };

      expect(union.kind).toBe('UnionType');
      expect(union.types).toHaveLength(2);
    });

    it('should create ArrayType', () => {
      const arrayType: AST.ArrayType = {
        kind: 'ArrayType',
        elementType: {
          kind: 'TypeReference',
          typeName: {
            kind: 'QualifiedIdentifier',
            parts: [AST.AST.identifier('String', makeSpan())],
            span: makeSpan(),
          },
          typeArguments: [],
          span: makeSpan(),
        },
        span: makeSpan(),
      };

      expect(arrayType.kind).toBe('ArrayType');
    });

    it('should create TupleType', () => {
      const tupleType: AST.TupleType = {
        kind: 'TupleType',
        elements: [
          {
            kind: 'TypeReference',
            typeName: {
              kind: 'QualifiedIdentifier',
              parts: [AST.AST.identifier('String', makeSpan())],
              span: makeSpan(),
            },
            typeArguments: [],
            span: makeSpan(),
          },
          {
            kind: 'TypeReference',
            typeName: {
              kind: 'QualifiedIdentifier',
              parts: [AST.AST.identifier('Int', makeSpan())],
              span: makeSpan(),
            },
            typeArguments: [],
            span: makeSpan(),
          },
        ],
        span: makeSpan(),
      };

      expect(tupleType.kind).toBe('TupleType');
      expect(tupleType.elements).toHaveLength(2);
    });

    it('should create FunctionType', () => {
      const funcType: AST.FunctionType = {
        kind: 'FunctionType',
        typeParameters: [],
        parameters: [
          {
            kind: 'ParameterType',
            name: AST.AST.identifier('x', makeSpan()),
            type: {
              kind: 'TypeReference',
              typeName: {
                kind: 'QualifiedIdentifier',
                parts: [AST.AST.identifier('String', makeSpan())],
                span: makeSpan(),
              },
              typeArguments: [],
              span: makeSpan(),
            },
            span: makeSpan(),
          },
        ],
        returnType: {
          kind: 'TypeReference',
          typeName: {
            kind: 'QualifiedIdentifier',
            parts: [AST.AST.identifier('Int', makeSpan())],
            span: makeSpan(),
          },
          typeArguments: [],
          span: makeSpan(),
        },
        span: makeSpan(),
      };

      expect(funcType.kind).toBe('FunctionType');
      expect(funcType.parameters).toHaveLength(1);
    });
  });

  describe('Expression Nodes', () => {
    it('should create BinaryExpression', () => {
      const binary: AST.BinaryExpression = {
        kind: 'BinaryExpression',
        operator: '+',
        left: AST.AST.numberLiteral(1, '1', makeSpan()),
        right: AST.AST.numberLiteral(2, '2', makeSpan()),
        span: makeSpan(),
      };

      expect(binary.kind).toBe('BinaryExpression');
      expect(binary.operator).toBe('+');
    });

    it('should create CallExpression', () => {
      const call: AST.CallExpression = {
        kind: 'CallExpression',
        callee: AST.AST.identifier('func', makeSpan()),
        typeArguments: [],
        arguments: [AST.AST.stringLiteral('arg', '"arg"', makeSpan())],
        optional: false,
        span: makeSpan(),
      };

      expect(call.kind).toBe('CallExpression');
      expect(call.arguments).toHaveLength(1);
    });

    it('should create ArrayExpression', () => {
      const arr: AST.ArrayExpression = {
        kind: 'ArrayExpression',
        elements: [
          AST.AST.numberLiteral(1, '1', makeSpan()),
          AST.AST.numberLiteral(2, '2', makeSpan()),
          null, // hole
        ],
        span: makeSpan(),
      };

      expect(arr.kind).toBe('ArrayExpression');
      expect(arr.elements).toHaveLength(3);
      expect(arr.elements[2]).toBeNull();
    });

    it('should create ObjectExpression', () => {
      const obj: AST.ObjectExpression = {
        kind: 'ObjectExpression',
        properties: [
          {
            kind: 'ObjectKeyValueProperty',
            key: AST.AST.identifier('name', makeSpan()),
            value: AST.AST.stringLiteral('test', '"test"', makeSpan()),
            span: makeSpan(),
          },
        ],
        span: makeSpan(),
      };

      expect(obj.kind).toBe('ObjectExpression');
      expect(obj.properties).toHaveLength(1);
    });

    it('should create ConditionalExpression', () => {
      const cond: AST.ConditionalExpression = {
        kind: 'ConditionalExpression',
        test: AST.AST.booleanLiteral(true, makeSpan()),
        consequent: AST.AST.stringLiteral('yes', '"yes"', makeSpan()),
        alternate: AST.AST.stringLiteral('no', '"no"', makeSpan()),
        span: makeSpan(),
      };

      expect(cond.kind).toBe('ConditionalExpression');
    });
  });

  describe('Workflow Expressions', () => {
    it('should create WorkflowSequenceExpr', () => {
      const seq: AST.WorkflowSequenceExpr = {
        kind: 'WorkflowSequenceExpr',
        steps: [
          {
            kind: 'WorkflowPersonaRef',
            ref: {
              kind: 'PersonaReference',
              ref: { type: 'id', id: AST.AST.identifier('A', makeSpan()) },
              span: makeSpan(),
            },
            span: makeSpan(),
          },
          {
            kind: 'WorkflowPersonaRef',
            ref: {
              kind: 'PersonaReference',
              ref: { type: 'id', id: AST.AST.identifier('B', makeSpan()) },
              span: makeSpan(),
            },
            span: makeSpan(),
          },
        ],
        span: makeSpan(),
      };

      expect(seq.kind).toBe('WorkflowSequenceExpr');
      expect(seq.steps).toHaveLength(2);
    });

    it('should create WorkflowParallelExpr', () => {
      const parallel: AST.WorkflowParallelExpr = {
        kind: 'WorkflowParallelExpr',
        branches: [
          {
            kind: 'WorkflowPersonaRef',
            ref: {
              kind: 'PersonaReference',
              ref: { type: 'id', id: AST.AST.identifier('A', makeSpan()) },
              span: makeSpan(),
            },
            span: makeSpan(),
          },
        ],
        sync: true,
        span: makeSpan(),
      };

      expect(parallel.kind).toBe('WorkflowParallelExpr');
      expect(parallel.sync).toBe(true);
    });

    it('should create WorkflowLoopExpr', () => {
      const loop: AST.WorkflowLoopExpr = {
        kind: 'WorkflowLoopExpr',
        body: {
          kind: 'WorkflowPersonaRef',
          ref: {
            kind: 'PersonaReference',
            ref: { type: 'id', id: AST.AST.identifier('Worker', makeSpan()) },
            span: makeSpan(),
          },
          span: makeSpan(),
        },
        loopType: 'times',
        count: AST.AST.numberLiteral(3, '3', makeSpan()),
        condition: null,
        variable: null,
        iterable: null,
        span: makeSpan(),
      };

      expect(loop.kind).toBe('WorkflowLoopExpr');
      expect(loop.loopType).toBe('times');
    });
  });
});
