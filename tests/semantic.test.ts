/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Semantic Analyzer Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { parse } from '../src/parser';
import {
  analyze,
  SymbolKind,
  SymbolTable,
  TypeChecker,
  Types,
} from '../src/semantic';

// ═══════════════════════════════════════════════════════════════════════════════
//                              SYMBOL TABLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SymbolTable', () => {
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolTable = new SymbolTable();
  });

  describe('scope management', () => {
    it('should create global scope by default', () => {
      const scope = symbolTable.getCurrentScope();
      expect(scope.kind).toBe('Global');
      expect(scope.parent).toBeNull();
    });

    it('should enter and exit scopes', () => {
      const global = symbolTable.getCurrentScope();

      symbolTable.enterScope('Function' as any, null);
      const funcScope = symbolTable.getCurrentScope();
      expect(funcScope.parent).toBe(global);
      expect(funcScope.kind).toBe('Function');

      symbolTable.exitScope();
      expect(symbolTable.getCurrentScope()).toBe(global);
    });

    it('should maintain nested scopes', () => {
      symbolTable.enterScope('Function' as any, null);
      symbolTable.enterScope('Block' as any, null);
      symbolTable.enterScope('Block' as any, null);

      let depth = 0;
      let scope = symbolTable.getCurrentScope();
      while (scope.parent) {
        depth++;
        scope = scope.parent;
      }

      expect(depth).toBe(3);
    });
  });

  describe('symbol management', () => {
    it('should define and lookup symbols', () => {
      symbolTable.define({
        name: 'foo',
        kind: SymbolKind.Variable,
        flags: 0,
        type: Types.String,
        declaration: null,
        span: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 3, offset: 3 },
          source: '',
        },
        scope: symbolTable.getCurrentScope(),
      });

      const symbol = symbolTable.lookup('foo');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('foo');
      expect(symbol?.kind).toBe(SymbolKind.Variable);
    });

    it('should lookup symbols from parent scopes', () => {
      symbolTable.define({
        name: 'outer',
        kind: SymbolKind.Variable,
        flags: 0,
        type: Types.Int,
        declaration: null,
        span: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 5, offset: 5 },
          source: '',
        },
        scope: symbolTable.getCurrentScope(),
      });

      symbolTable.enterScope('Function' as any, null);

      const symbol = symbolTable.lookup('outer');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('outer');
    });

    it('should shadow symbols in inner scopes', () => {
      symbolTable.define({
        name: 'x',
        kind: SymbolKind.Variable,
        flags: 0,
        type: Types.Int,
        declaration: null,
        span: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 1, offset: 1 },
          source: '',
        },
        scope: symbolTable.getCurrentScope(),
      });

      symbolTable.enterScope('Block' as any, null);

      symbolTable.define({
        name: 'x',
        kind: SymbolKind.Variable,
        flags: 0,
        type: Types.String, // Different type
        declaration: null,
        span: {
          start: { line: 2, column: 0, offset: 10 },
          end: { line: 2, column: 1, offset: 11 },
          source: '',
        },
        scope: symbolTable.getCurrentScope(),
      });

      const innerSymbol = symbolTable.lookup('x');
      expect(innerSymbol?.type).toBe(Types.String);

      symbolTable.exitScope();

      const outerSymbol = symbolTable.lookup('x');
      expect(outerSymbol?.type).toBe(Types.Int);
    });

    it('should check local scope with lookupLocal', () => {
      symbolTable.define({
        name: 'outer',
        kind: SymbolKind.Variable,
        flags: 0,
        type: Types.Int,
        declaration: null,
        span: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 5, offset: 5 },
          source: '',
        },
        scope: symbolTable.getCurrentScope(),
      });

      symbolTable.enterScope('Block' as any, null);

      expect(symbolTable.lookupLocal('outer')).toBeUndefined();
      expect(symbolTable.lookup('outer')).toBeDefined();
    });

    it('should have built-in types', () => {
      expect(symbolTable.lookup('String')).toBeDefined();
      expect(symbolTable.lookup('Int')).toBeDefined();
      expect(symbolTable.lookup('Float')).toBeDefined();
      expect(symbolTable.lookup('Bool')).toBeDefined();
      expect(symbolTable.lookup('Any')).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE CHECKER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TypeChecker', () => {
  let typeChecker: TypeChecker;

  beforeEach(() => {
    typeChecker = new TypeChecker();
  });

  describe('type equality', () => {
    it('should check primitive type equality', () => {
      expect(typeChecker.isEqual(Types.String, Types.String)).toBe(true);
      expect(typeChecker.isEqual(Types.Int, Types.Int)).toBe(true);
      expect(typeChecker.isEqual(Types.String, Types.Int)).toBe(false);
    });

    it('should check array type equality', () => {
      const arrStr1 = Types.array(Types.String);
      const arrStr2 = Types.array(Types.String);
      const arrInt = Types.array(Types.Int);

      expect(typeChecker.isEqual(arrStr1, arrStr2)).toBe(true);
      expect(typeChecker.isEqual(arrStr1, arrInt)).toBe(false);
    });

    it('should check tuple type equality', () => {
      const tuple1 = Types.tuple([Types.String, Types.Int]);
      const tuple2 = Types.tuple([Types.String, Types.Int]);
      const tuple3 = Types.tuple([Types.Int, Types.String]);

      expect(typeChecker.isEqual(tuple1, tuple2)).toBe(true);
      expect(typeChecker.isEqual(tuple1, tuple3)).toBe(false);
    });

    it('should check literal type equality', () => {
      const lit1 = Types.literal('hello');
      const lit2 = Types.literal('hello');
      const lit3 = Types.literal('world');

      expect(typeChecker.isEqual(lit1, lit2)).toBe(true);
      expect(typeChecker.isEqual(lit1, lit3)).toBe(false);
    });
  });

  describe('type assignability', () => {
    it('should allow assigning to Any', () => {
      expect(typeChecker.isAssignableTo(Types.String, Types.Any)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Int, Types.Any)).toBe(true);
      expect(
        typeChecker.isAssignableTo(Types.array(Types.String), Types.Any)
      ).toBe(true);
    });

    it('should allow assigning Never to anything', () => {
      expect(typeChecker.isAssignableTo(Types.Never, Types.String)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Never, Types.Int)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Never, Types.Any)).toBe(true);
    });

    it('should allow Int to Float (widening)', () => {
      expect(typeChecker.isAssignableTo(Types.Int, Types.Float)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Float, Types.Int)).toBe(false);
    });

    it('should allow literal to base type', () => {
      expect(
        typeChecker.isAssignableTo(Types.literal('hello'), Types.String)
      ).toBe(true);
      expect(typeChecker.isAssignableTo(Types.literal(42), Types.Int)).toBe(
        true
      );
      expect(typeChecker.isAssignableTo(Types.literal(true), Types.Bool)).toBe(
        true
      );
    });

    it('should check union type assignability', () => {
      const union = Types.union([Types.String, Types.Int]);

      expect(typeChecker.isAssignableTo(Types.String, union)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Int, union)).toBe(true);
      expect(typeChecker.isAssignableTo(Types.Bool, union)).toBe(false);
    });

    it('should check array covariance', () => {
      const arrInt = Types.array(Types.Int);
      const arrFloat = Types.array(Types.Float);

      expect(typeChecker.isAssignableTo(arrInt, arrFloat)).toBe(true);
      expect(typeChecker.isAssignableTo(arrFloat, arrInt)).toBe(false);
    });
  });

  describe('type operations', () => {
    it('should get common type', () => {
      const common = typeChecker.getCommonType([Types.String, Types.String]);
      expect(common).toBe(Types.String);
    });

    it('should create union for different types', () => {
      const common = typeChecker.getCommonType([Types.String, Types.Int]);
      expect(common.kind).toBe('union');
    });

    it('should widen literal types', () => {
      const widened = typeChecker.widenType(Types.literal('hello'));
      expect(widened).toBe(Types.String);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEMANTIC ANALYSIS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticAnalyzer', () => {
  describe('persona analysis', () => {
    it('should analyze simple persona', () => {
      const source = `
        persona SEC {
          intent: "Security expert"
          tone: cautious
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });

    it('should detect duplicate persona declarations', () => {
      const source = `
        persona SEC {
          intent: "First"
        }
        persona SEC {
          intent: "Second"
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(false);
    });

    it('should analyze persona with extends', () => {
      const source = `
        persona BASE {
          intent: "Base persona"
        }

        persona DERIVED extends BASE {
          intent: "Derived persona"
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });

  describe('team analysis', () => {
    it('should analyze team with valid members', () => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }

        team AB {
          members { A, B }
          primary: A
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });

  describe('variable analysis', () => {
    it('should analyze typed variable declarations', () => {
      const source = `
        let x: Int = 42
        let y: String = "hello"
        const z: Bool = true
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });

    it('should detect duplicate variable declarations', () => {
      const source = `
        let x = 1
        let x = 2
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(false);
    });
  });

  describe('function analysis', () => {
    it('should analyze function declarations', () => {
      const source = `
        fn add(a: Int, b: Int) -> Int {
          return a + b
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      if (!analysisResult.ok) {
        console.log(
          'Semantic errors:',
          JSON.stringify(analysisResult.error, null, 2)
        );
      }
      expect(analysisResult.ok).toBe(true);
    });

    it('should analyze async functions', () => {
      const source = `
        async fn fetch(url: String) -> String {
          return "data"
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });

  describe('type analysis', () => {
    it('should analyze type aliases', () => {
      const source = `
        type ID = String
        type Point = { x: Int, y: Int }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });

    it('should analyze interface declarations', () => {
      const source = `
        interface Person {
          name: String
          age: Int
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });

    it('should analyze enum declarations', () => {
      const source = `
        enum Status {
          Active
          Inactive
          Pending
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });

  describe('workflow analysis', () => {
    it('should analyze workflow declarations', () => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }

        workflow Process {
          input: String
          output: String
          steps { A -> B }
        }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });

  describe('import/export analysis', () => {
    it('should analyze import declarations', () => {
      const source = `
        import { Foo, Bar } from "module"
        import * as Utils from "utils"
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });

    it('should analyze export declarations', () => {
      const source = `
        pub persona PUB { intent: "Public" }

        export { PUB }
      `;

      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
  });
});
