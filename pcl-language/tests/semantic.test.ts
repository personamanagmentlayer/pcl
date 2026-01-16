/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Semantic Analyzer Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../src/parser';
import { analyze, SymbolTable, BuiltinTypes } from '../src/semantic';


// ═══════════════════════════════════════════════════════════════════════════════
//                              SYMBOL TABLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SymbolTable', () => {
  let symbolTable: SymbolTable;
  
  beforeEach(() => {
    symbolTable = new SymbolTable();
  });
  
  describe('symbol management', () => {
    it('should define and lookup symbols', () => {
      symbolTable.define({
        name: 'foo',
        kind: 'variable',
        type: BuiltinTypes.String,
      });
      
      const symbol = symbolTable.lookup('foo');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('foo');
      expect(symbol?.kind).toBe('variable');
    });
    
    it('should lookup symbols from parent scopes', () => {
      symbolTable.define({
        name: 'outer',
        kind: 'variable',
        type: BuiltinTypes.Int,
      });
      
      const childScope = new SymbolTable(symbolTable);
      
      const symbol = childScope.lookup('outer');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('outer');
    });
    
    it('should shadow symbols in inner scopes', () => {
      symbolTable.define({
        name: 'x',
        kind: 'variable',
        type: BuiltinTypes.Int,
      });
      
      const childScope = new SymbolTable(symbolTable);
      childScope.define({
        name: 'x',
        kind: 'variable',
        type: BuiltinTypes.String,
      });
      
      const innerSymbol = childScope.lookup('x');
      expect(innerSymbol?.type).toBe(BuiltinTypes.String);
      
      const outerSymbol = symbolTable.lookup('x');
      expect(outerSymbol?.type).toBe(BuiltinTypes.Int);
    });
    
    it('should check local scope with lookupLocal', () => {
      symbolTable.define({
        name: 'outer',
        kind: 'variable',
        type: BuiltinTypes.Int,
      });
      
      const childScope = new SymbolTable(symbolTable);
      
      expect(childScope.lookupLocal('outer')).toBeUndefined();
      expect(childScope.lookup('outer')).toBeDefined();
    });
    
    it('should have built-in types', () => {
      expect(symbolTable.lookupType('String')).toBeDefined();
      expect(symbolTable.lookupType('Int')).toBeDefined();
      expect(symbolTable.lookupType('Float')).toBeDefined();
      expect(symbolTable.lookupType('Bool')).toBeDefined();
      expect(symbolTable.lookupType('Any')).toBeDefined();
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
  });
  
  describe('function analysis', () => {
    it('should analyze function declarations', () => {
      const source = `
        fn add(a: Int, b: Int): Int {
          return a + b
        }
      `;
      
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;
      
      const analysisResult = analyze(parseResult.value.program);
      expect(analysisResult.ok).toBe(true);
    });
    
    it('should analyze async functions', () => {
      const source = `
        async fn fetch(url: String): String {
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
