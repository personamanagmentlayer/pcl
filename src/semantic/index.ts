/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Semantic Analyzer (Type Checker, Symbol Table, Scope Management)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @packageDocumentation
 * @module @pcl/semantic
 * @version 1.0.0
 */

import type { Span, Result, PCLError } from '../types';
import { Ok, Err, ErrorCode, PCLError as createError } from '../types';
import * as AST from '../ast';


// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base type interface
 */
export interface Type {
  readonly kind: TypeKind;
  toString(): string;
  equals(other: Type): boolean;
  isAssignableTo(other: Type): boolean;
}

export type TypeKind =
  | 'primitive'
  | 'literal'
  | 'array'
  | 'tuple'
  | 'object'
  | 'function'
  | 'union'
  | 'intersection'
  | 'generic'
  | 'typevar'
  | 'persona'
  | 'team'
  | 'workflow'
  | 'skill'
  | 'unknown'
  | 'never'
  | 'any'
  | 'void';

/**
 * Primitive types: String, Int, Float, Bool
 */
export class PrimitiveType implements Type {
  readonly kind = 'primitive' as const;
  
  constructor(readonly name: 'String' | 'Int' | 'Float' | 'Bool') {}
  
  toString(): string {
    return this.name;
  }
  
  equals(other: Type): boolean {
    return other instanceof PrimitiveType && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof UnknownType) return true;
    return this.equals(other);
  }
}

/**
 * Literal types: "hello", 42, true
 */
export class LiteralType implements Type {
  readonly kind = 'literal' as const;
  
  constructor(
    readonly value: string | number | boolean,
    readonly baseType: PrimitiveType
  ) {}
  
  toString(): string {
    if (typeof this.value === 'string') return `"${this.value}"`;
    return String(this.value);
  }
  
  equals(other: Type): boolean {
    return other instanceof LiteralType && other.value === this.value;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (this.equals(other)) return true;
    return this.baseType.isAssignableTo(other);
  }
}

/**
 * Array type: Array<T> or T[]
 */
export class ArrayType implements Type {
  readonly kind = 'array' as const;
  
  constructor(readonly elementType: Type) {}
  
  toString(): string {
    return `Array<${this.elementType.toString()}>`;
  }
  
  equals(other: Type): boolean {
    return other instanceof ArrayType && this.elementType.equals(other.elementType);
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof ArrayType) {
      return this.elementType.isAssignableTo(other.elementType);
    }
    return false;
  }
}

/**
 * Tuple type: [String, Int, Bool]
 */
export class TupleType implements Type {
  readonly kind = 'tuple' as const;
  
  constructor(readonly elements: readonly Type[]) {}
  
  toString(): string {
    return `[${this.elements.map(e => e.toString()).join(', ')}]`;
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof TupleType)) return false;
    if (this.elements.length !== other.elements.length) return false;
    return this.elements.every((e, i) => e.equals(other.elements[i]));
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof TupleType) {
      if (this.elements.length !== other.elements.length) return false;
      return this.elements.every((e, i) => e.isAssignableTo(other.elements[i]));
    }
    if (other instanceof ArrayType) {
      return this.elements.every(e => e.isAssignableTo(other.elementType));
    }
    return false;
  }
}

/**
 * Object type: { foo: String, bar: Int }
 */
export interface ObjectTypeMember {
  readonly name: string;
  readonly type: Type;
  readonly optional: boolean;
  readonly readonly: boolean;
}

export class ObjectType implements Type {
  readonly kind = 'object' as const;
  
  constructor(
    readonly members: Map<string, ObjectTypeMember>,
    readonly indexSignature?: { key: Type; value: Type }
  ) {}
  
  toString(): string {
    const props = Array.from(this.members.values())
      .map(m => `${m.readonly ? 'readonly ' : ''}${m.name}${m.optional ? '?' : ''}: ${m.type.toString()}`)
      .join(', ');
    return `{ ${props} }`;
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof ObjectType)) return false;
    if (this.members.size !== other.members.size) return false;
    
    for (const [name, member] of this.members) {
      const otherMember = other.members.get(name);
      if (!otherMember) return false;
      if (!member.type.equals(otherMember.type)) return false;
      if (member.optional !== otherMember.optional) return false;
    }
    
    return true;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (!(other instanceof ObjectType)) return false;
    
    // Check that all required members in other exist in this
    for (const [name, otherMember] of other.members) {
      const thisMember = this.members.get(name);
      if (!thisMember) {
        if (!otherMember.optional) return false;
        continue;
      }
      if (!thisMember.type.isAssignableTo(otherMember.type)) return false;
    }
    
    return true;
  }
  
  getMember(name: string): ObjectTypeMember | undefined {
    return this.members.get(name);
  }
}

/**
 * Function type: (a: String, b: Int) -> Bool
 */
export interface FunctionParameter {
  readonly name: string;
  readonly type: Type;
  readonly optional: boolean;
  readonly rest: boolean;
}

export class FunctionType implements Type {
  readonly kind = 'function' as const;
  
  constructor(
    readonly parameters: readonly FunctionParameter[],
    readonly returnType: Type,
    readonly typeParameters: readonly TypeVariable[] = []
  ) {}
  
  toString(): string {
    const params = this.parameters
      .map(p => `${p.rest ? '...' : ''}${p.name}${p.optional ? '?' : ''}: ${p.type.toString()}`)
      .join(', ');
    const typeParams = this.typeParameters.length > 0
      ? `<${this.typeParameters.map(t => t.toString()).join(', ')}>`
      : '';
    return `${typeParams}(${params}) -> ${this.returnType.toString()}`;
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof FunctionType)) return false;
    if (this.parameters.length !== other.parameters.length) return false;
    if (!this.returnType.equals(other.returnType)) return false;
    return this.parameters.every((p, i) => p.type.equals(other.parameters[i].type));
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (!(other instanceof FunctionType)) return false;
    
    // Contravariant parameters
    if (this.parameters.length < other.parameters.length) return false;
    for (let i = 0; i < other.parameters.length; i++) {
      if (!other.parameters[i].type.isAssignableTo(this.parameters[i].type)) {
        return false;
      }
    }
    
    // Covariant return
    return this.returnType.isAssignableTo(other.returnType);
  }
}

/**
 * Union type: A | B | C
 */
export class UnionType implements Type {
  readonly kind = 'union' as const;
  
  constructor(readonly members: readonly Type[]) {}
  
  toString(): string {
    return this.members.map(m => m.toString()).join(' | ');
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof UnionType)) return false;
    if (this.members.length !== other.members.length) return false;
    return this.members.every(m => other.members.some(o => m.equals(o)));
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof UnionType) {
      return this.members.every(m => 
        other.members.some(o => m.isAssignableTo(o))
      );
    }
    return this.members.every(m => m.isAssignableTo(other));
  }
  
  static create(types: Type[]): Type {
    // Flatten nested unions
    const flattened: Type[] = [];
    for (const t of types) {
      if (t instanceof UnionType) {
        flattened.push(...t.members);
      } else {
        flattened.push(t);
      }
    }
    
    // Remove duplicates
    const unique = flattened.filter((t, i) => 
      !flattened.slice(0, i).some(prev => prev.equals(t))
    );
    
    if (unique.length === 0) return new NeverType();
    if (unique.length === 1) return unique[0];
    return new UnionType(unique);
  }
}

/**
 * Intersection type: A & B & C
 */
export class IntersectionType implements Type {
  readonly kind = 'intersection' as const;
  
  constructor(readonly members: readonly Type[]) {}
  
  toString(): string {
    return this.members.map(m => m.toString()).join(' & ');
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof IntersectionType)) return false;
    if (this.members.length !== other.members.length) return false;
    return this.members.every(m => other.members.some(o => m.equals(o)));
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof IntersectionType) {
      return other.members.every(o => 
        this.members.some(m => m.isAssignableTo(o))
      );
    }
    return this.members.some(m => m.isAssignableTo(other));
  }
  
  static create(types: Type[]): Type {
    // Flatten nested intersections
    const flattened: Type[] = [];
    for (const t of types) {
      if (t instanceof IntersectionType) {
        flattened.push(...t.members);
      } else {
        flattened.push(t);
      }
    }
    
    // Remove duplicates
    const unique = flattened.filter((t, i) => 
      !flattened.slice(0, i).some(prev => prev.equals(t))
    );
    
    if (unique.length === 0) return new UnknownType();
    if (unique.length === 1) return unique[0];
    return new IntersectionType(unique);
  }
}

/**
 * Type variable: T, U, K extends keyof T
 */
export class TypeVariable implements Type {
  readonly kind = 'typevar' as const;
  
  constructor(
    readonly name: string,
    readonly constraint?: Type,
    readonly defaultType?: Type
  ) {}
  
  toString(): string {
    let result = this.name;
    if (this.constraint) {
      result += ` extends ${this.constraint.toString()}`;
    }
    if (this.defaultType) {
      result += ` = ${this.defaultType.toString()}`;
    }
    return result;
  }
  
  equals(other: Type): boolean {
    return other instanceof TypeVariable && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (this.equals(other)) return true;
    if (this.constraint) return this.constraint.isAssignableTo(other);
    return false;
  }
}

/**
 * Generic type: Container<T>
 */
export class GenericType implements Type {
  readonly kind = 'generic' as const;
  
  constructor(
    readonly base: Type,
    readonly typeArguments: readonly Type[]
  ) {}
  
  toString(): string {
    return `${this.base.toString()}<${this.typeArguments.map(a => a.toString()).join(', ')}>`;
  }
  
  equals(other: Type): boolean {
    if (!(other instanceof GenericType)) return false;
    if (!this.base.equals(other.base)) return false;
    if (this.typeArguments.length !== other.typeArguments.length) return false;
    return this.typeArguments.every((a, i) => a.equals(other.typeArguments[i]));
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof GenericType) {
      if (!this.base.equals(other.base)) return false;
      // Invariant type arguments for now
      return this.typeArguments.every((a, i) => a.equals(other.typeArguments[i]));
    }
    return false;
  }
}

/**
 * Persona type
 */
export class PersonaType implements Type {
  readonly kind = 'persona' as const;
  
  constructor(
    readonly name: string,
    readonly intent: string,
    readonly skills: readonly string[],
    readonly constraints: readonly string[],
    readonly methods: Map<string, FunctionType>,
    readonly parent?: PersonaType
  ) {}
  
  toString(): string {
    return `persona ${this.name}`;
  }
  
  equals(other: Type): boolean {
    return other instanceof PersonaType && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof PersonaType) {
      // Check if this extends other
      let current: PersonaType | undefined = this;
      while (current) {
        if (current.name === other.name) return true;
        current = current.parent;
      }
    }
    return false;
  }
  
  getMethod(name: string): FunctionType | undefined {
    const method = this.methods.get(name);
    if (method) return method;
    return this.parent?.getMethod(name);
  }
}

/**
 * Team type
 */
export class TeamType implements Type {
  readonly kind = 'team' as const;
  
  constructor(
    readonly name: string,
    readonly members: readonly PersonaType[],
    readonly primary?: PersonaType
  ) {}
  
  toString(): string {
    return `team ${this.name}`;
  }
  
  equals(other: Type): boolean {
    return other instanceof TeamType && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    return this.equals(other);
  }
}

/**
 * Workflow type
 */
export class WorkflowType implements Type {
  readonly kind = 'workflow' as const;
  
  constructor(
    readonly name: string,
    readonly inputType: Type,
    readonly outputType: Type
  ) {}
  
  toString(): string {
    return `workflow ${this.name}<${this.inputType.toString()}, ${this.outputType.toString()}>`;
  }
  
  equals(other: Type): boolean {
    return other instanceof WorkflowType && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof WorkflowType) {
      return this.inputType.isAssignableTo(other.inputType) &&
             this.outputType.isAssignableTo(other.outputType);
    }
    return false;
  }
}

/**
 * Skill type
 */
export class SkillType implements Type {
  readonly kind = 'skill' as const;
  
  constructor(
    readonly name: string,
    readonly items: readonly string[]
  ) {}
  
  toString(): string {
    return `skill ${this.name}`;
  }
  
  equals(other: Type): boolean {
    return other instanceof SkillType && other.name === this.name;
  }
  
  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    return this.equals(other);
  }
}

/**
 * Special types
 */
export class AnyType implements Type {
  readonly kind = 'any' as const;
  toString(): string { return 'Any'; }
  equals(other: Type): boolean { return other instanceof AnyType; }
  isAssignableTo(_other: Type): boolean { return true; }
}

export class UnknownType implements Type {
  readonly kind = 'unknown' as const;
  toString(): string { return 'Unknown'; }
  equals(other: Type): boolean { return other instanceof UnknownType; }
  isAssignableTo(other: Type): boolean {
    return other instanceof AnyType || other instanceof UnknownType;
  }
}

export class NeverType implements Type {
  readonly kind = 'never' as const;
  toString(): string { return 'Never'; }
  equals(other: Type): boolean { return other instanceof NeverType; }
  isAssignableTo(_other: Type): boolean { return true; }
}

export class VoidType implements Type {
  readonly kind = 'void' as const;
  toString(): string { return 'Void'; }
  equals(other: Type): boolean { return other instanceof VoidType; }
  isAssignableTo(other: Type): boolean {
    return other instanceof VoidType || other instanceof AnyType;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              BUILT-IN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const BuiltinTypes = {
  String: new PrimitiveType('String'),
  Int: new PrimitiveType('Int'),
  Float: new PrimitiveType('Float'),
  Bool: new PrimitiveType('Bool'),
  Any: new AnyType(),
  Unknown: new UnknownType(),
  Never: new NeverType(),
  Void: new VoidType(),
} as const;


// ═══════════════════════════════════════════════════════════════════════════════
//                              SYMBOL TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export type SymbolKind = 
  | 'variable'
  | 'function'
  | 'parameter'
  | 'type'
  | 'interface'
  | 'enum'
  | 'persona'
  | 'team'
  | 'workflow'
  | 'skill'
  | 'module';

export interface Symbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: Type;
  readonly declaration?: AST.ASTNode;
  readonly span?: Span;
  readonly exported: boolean;
  readonly mutable: boolean;
}

export class SymbolTable {
  private symbols: Map<string, Symbol> = new Map();
  private types: Map<string, Type> = new Map();
  
  constructor(
    readonly parent?: SymbolTable,
    readonly name?: string
  ) {
    // Add built-in types
    if (!parent) {
      this.types.set('String', BuiltinTypes.String);
      this.types.set('Int', BuiltinTypes.Int);
      this.types.set('Float', BuiltinTypes.Float);
      this.types.set('Bool', BuiltinTypes.Bool);
      this.types.set('Any', BuiltinTypes.Any);
      this.types.set('Unknown', BuiltinTypes.Unknown);
      this.types.set('Never', BuiltinTypes.Never);
      this.types.set('Void', BuiltinTypes.Void);
    }
  }
  
  define(symbol: Symbol): void {
    this.symbols.set(symbol.name, symbol);
  }
  
  defineType(name: string, type: Type): void {
    this.types.set(name, type);
  }
  
  lookup(name: string): Symbol | undefined {
    const symbol = this.symbols.get(name);
    if (symbol) return symbol;
    return this.parent?.lookup(name);
  }
  
  lookupType(name: string): Type | undefined {
    const type = this.types.get(name);
    if (type) return type;
    return this.parent?.lookupType(name);
  }
  
  lookupLocal(name: string): Symbol | undefined {
    return this.symbols.get(name);
  }
  
  has(name: string): boolean {
    return this.symbols.has(name) || (this.parent?.has(name) ?? false);
  }
  
  hasLocal(name: string): boolean {
    return this.symbols.has(name);
  }
  
  getAllSymbols(): Map<string, Symbol> {
    const all = new Map<string, Symbol>();
    if (this.parent) {
      for (const [name, symbol] of this.parent.getAllSymbols()) {
        all.set(name, symbol);
      }
    }
    for (const [name, symbol] of this.symbols) {
      all.set(name, symbol);
    }
    return all;
  }
  
  getExportedSymbols(): Symbol[] {
    return Array.from(this.symbols.values()).filter(s => s.exported);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              SEMANTIC ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyzerOptions {
  source?: string;
  strict?: boolean;
}

export interface AnalysisResult {
  symbols: SymbolTable;
  errors: PCLError[];
  warnings: PCLError[];
}

/**
 * Semantic Analyzer
 * 
 * Performs:
 * - Symbol table building
 * - Type checking
 * - Reference resolution
 * - Scope management
 */
export class SemanticAnalyzer {
  private globalScope: SymbolTable;
  private currentScope: SymbolTable;
  private errors: PCLError[] = [];
  private warnings: PCLError[] = [];
  private readonly source: string;
  private readonly strict: boolean;
  
  // Type inference context
  private typeVariables: Map<string, Type> = new Map();
  private returnType: Type | null = null;
  
  constructor(options: AnalyzerOptions = {}) {
    this.source = options.source ?? '<anonymous>';
    this.strict = options.strict ?? false;
    this.globalScope = new SymbolTable(undefined, 'global');
    this.currentScope = this.globalScope;
  }
  
  /**
   * Analyze a program
   */
  analyze(program: AST.Program): Result<AnalysisResult, PCLError[]> {
    // First pass: collect declarations
    this.collectDeclarations(program);
    
    // Second pass: resolve types and check
    this.checkProgram(program);
    
    if (this.errors.length > 0) {
      return Err(this.errors);
    }
    
    return Ok({
      symbols: this.globalScope,
      errors: this.errors,
      warnings: this.warnings,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Declaration Collection
  // ─────────────────────────────────────────────────────────────────────────────
  
  private collectDeclarations(program: AST.Program): void {
    for (const stmt of program.statements) {
      this.collectStatement(stmt);
    }
  }
  
  private collectStatement(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case 'PersonaDeclaration':
        this.collectPersona(stmt as AST.PersonaDeclaration);
        break;
      case 'TeamDeclaration':
        this.collectTeam(stmt as AST.TeamDeclaration);
        break;
      case 'WorkflowDeclaration':
        this.collectWorkflow(stmt as AST.WorkflowDeclaration);
        break;
      case 'TypeDeclaration':
        this.collectTypeAlias(stmt as AST.TypeDeclaration);
        break;
      case 'InterfaceDeclaration':
        this.collectInterface(stmt as AST.InterfaceDeclaration);
        break;
      case 'EnumDeclaration':
        this.collectEnum(stmt as AST.EnumDeclaration);
        break;
      case 'FunctionDeclaration':
        this.collectFunction(stmt as AST.FunctionDeclaration);
        break;
      case 'VariableDeclaration':
        this.collectVariables(stmt as AST.VariableDeclaration);
        break;
      case 'SkillDeclaration':
        this.collectSkill(stmt as AST.SkillDeclaration);
        break;
      case 'ImportDeclaration':
        this.collectImport(stmt as AST.ImportDeclaration);
        break;
      case 'ExportDeclaration':
        this.collectExport(stmt as AST.ExportDeclaration);
        break;
      case 'ModuleDeclaration':
        this.collectModule(stmt as AST.ModuleDeclaration);
        break;
    }
  }
  
  private collectPersona(decl: AST.PersonaDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate declaration: ${name}`, decl.span);
      return;
    }
    
    // Collect methods
    const methods = new Map<string, FunctionType>();
    for (const member of decl.body.members) {
      if (member.kind === 'MethodDeclaration') {
        const method = member as AST.MethodDeclaration;
        methods.set(method.name.name, this.methodToFunctionType(method));
      }
    }
    
    // Find parent persona
    let parent: PersonaType | undefined;
    if (decl.extends && decl.extends.length > 0) {
      const parentName = decl.extends[0].typeName.parts[0].name;
      const parentSymbol = this.currentScope.lookup(parentName);
      if (parentSymbol?.type instanceof PersonaType) {
        parent = parentSymbol.type;
      }
    }
    
    // Collect skills and constraints
    const skills: string[] = [];
    const constraints: string[] = [];
    let intent = '';
    
    for (const member of decl.body.members) {
      if (member.kind === 'SkillBlock') {
        for (const item of (member as AST.SkillBlock).items) {
          if (item.kind === 'StringSkill') {
            skills.push(item.value);
          }
        }
      } else if (member.kind === 'ConstraintBlock') {
        for (const item of (member as AST.ConstraintBlock).items) {
          if (item.kind === 'StringConstraint') {
            constraints.push(item.value);
          }
        }
      } else if (member.kind === 'PropertyDeclaration') {
        const prop = member as AST.PropertyDeclaration;
        if (prop.name.name === 'intent' && prop.initializer?.kind === 'StringLiteral') {
          intent = (prop.initializer as AST.StringLiteral).value;
        }
      }
    }
    
    const type = new PersonaType(name, intent, skills, constraints, methods, parent);
    
    this.currentScope.define({
      name,
      kind: 'persona',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectTeam(decl: AST.TeamDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate declaration: ${name}`, decl.span);
      return;
    }
    
    // Collect members
    const members: PersonaType[] = [];
    let primary: PersonaType | undefined;
    
    for (const member of decl.body.members) {
      if (member.kind === 'TeamMembersDeclaration') {
        const membersDecl = member as AST.TeamMembersDeclaration;
        for (const ref of membersDecl.members) {
          const personaName = this.getPersonaRefName(ref);
          const symbol = this.currentScope.lookup(personaName);
          if (symbol?.type instanceof PersonaType) {
            members.push(symbol.type);
          }
        }
      } else if (member.kind === 'TeamPrimaryDeclaration') {
        const primaryDecl = member as AST.TeamPrimaryDeclaration;
        const personaName = this.getPersonaRefName(primaryDecl.primary);
        const symbol = this.currentScope.lookup(personaName);
        if (symbol?.type instanceof PersonaType) {
          primary = symbol.type;
        }
      }
    }
    
    const type = new TeamType(name, members, primary);
    
    this.currentScope.define({
      name,
      kind: 'team',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectWorkflow(decl: AST.WorkflowDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate declaration: ${name}`, decl.span);
      return;
    }
    
    let inputType: Type = BuiltinTypes.Any;
    let outputType: Type = BuiltinTypes.Any;
    
    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowInputDeclaration') {
        inputType = this.resolveTypeNode((member as AST.WorkflowInputDeclaration).type);
      } else if (member.kind === 'WorkflowOutputDeclaration') {
        outputType = this.resolveTypeNode((member as AST.WorkflowOutputDeclaration).type);
      }
    }
    
    const type = new WorkflowType(name, inputType, outputType);
    
    this.currentScope.define({
      name,
      kind: 'workflow',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectTypeAlias(decl: AST.TypeDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate type declaration: ${name}`, decl.span);
      return;
    }
    
    const type = this.resolveTypeNode(decl.type);
    
    this.currentScope.define({
      name,
      kind: 'type',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectInterface(decl: AST.InterfaceDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate interface declaration: ${name}`, decl.span);
      return;
    }
    
    const members = new Map<string, ObjectTypeMember>();
    
    for (const member of decl.members) {
      if (member.kind === 'PropertySignature') {
        const prop = member as AST.PropertySignature;
        const propName = typeof prop.name === 'string' ? prop.name : prop.name.name;
        members.set(propName, {
          name: propName,
          type: this.resolveTypeNode(prop.type),
          optional: prop.optional,
          readonly: prop.readonly,
        });
      } else if (member.kind === 'MethodSignature') {
        const method = member as AST.MethodSignature;
        const params: FunctionParameter[] = method.parameters.map(p => ({
          name: p.name.kind === 'Identifier' ? p.name.name : '',
          type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
          optional: p.optional,
          rest: p.rest,
        }));
        members.set(method.name.name, {
          name: method.name.name,
          type: new FunctionType(params, this.resolveTypeNode(method.returnType)),
          optional: method.optional,
          readonly: false,
        });
      }
    }
    
    const type = new ObjectType(members);
    
    this.currentScope.define({
      name,
      kind: 'interface',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectEnum(decl: AST.EnumDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate enum declaration: ${name}`, decl.span);
      return;
    }
    
    // Create a union of literal types for the enum
    const memberTypes: Type[] = decl.members.map(member => {
      if (member.initializer) {
        const initType = this.inferExpressionType(member.initializer);
        if (initType instanceof LiteralType) {
          return initType;
        }
        return new LiteralType(member.name.name, BuiltinTypes.String);
      }
      return new LiteralType(member.name.name, BuiltinTypes.String);
    });
    
    const type = UnionType.create(memberTypes);
    
    this.currentScope.define({
      name,
      kind: 'enum',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
    
    // Also add each enum member
    for (const member of decl.members) {
      const memberName = `${name}.${member.name.name}`;
      let memberType: Type;
      
      if (member.initializer) {
        memberType = this.inferExpressionType(member.initializer);
      } else {
        memberType = new LiteralType(member.name.name, BuiltinTypes.String);
      }
      
      this.currentScope.define({
        name: memberName,
        kind: 'variable',
        type: memberType,
        declaration: member,
        span: member.span,
        exported: false,
        mutable: false,
      });
    }
  }
  
  private collectFunction(decl: AST.FunctionDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate function declaration: ${name}`, decl.span);
      return;
    }
    
    const type = this.functionToType(decl);
    
    this.currentScope.define({
      name,
      kind: 'function',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
  }
  
  private collectVariables(decl: AST.VariableDeclaration): void {
    for (const declarator of decl.declarations) {
      if (declarator.id.kind === 'Identifier') {
        const name = declarator.id.name;
        
        if (this.currentScope.hasLocal(name)) {
          this.error(`Duplicate variable declaration: ${name}`, declarator.span);
          continue;
        }
        
        let type: Type;
        if (declarator.type) {
          type = this.resolveTypeNode(declarator.type);
        } else if (declarator.init) {
          type = this.inferExpressionType(declarator.init);
        } else {
          type = BuiltinTypes.Any;
        }
        
        this.currentScope.define({
          name,
          kind: 'variable',
          type,
          declaration: declarator,
          span: declarator.span,
          exported: false,
          mutable: decl.declarationKind !== 'const',
        });
      }
    }
  }
  
  private collectSkill(decl: AST.SkillDeclaration): void {
    const name = decl.id.name;
    
    if (this.currentScope.hasLocal(name)) {
      this.error(`Duplicate skill declaration: ${name}`, decl.span);
      return;
    }
    
    const items: string[] = [];
    for (const member of decl.body.members) {
      if (member.kind === 'SkillItemsDeclaration') {
        for (const item of (member as AST.SkillItemsDeclaration).items) {
          items.push(item.value);
        }
      }
    }
    
    const type = new SkillType(name, items);
    
    this.currentScope.define({
      name,
      kind: 'skill',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      mutable: false,
    });
    
    this.currentScope.defineType(name, type);
  }
  
  private collectImport(decl: AST.ImportDeclaration): void {
    // For now, just create placeholder symbols
    // Full implementation would resolve the module
    for (const spec of decl.specifiers) {
      if (spec.kind === 'ImportNamedSpecifier') {
        const named = spec as AST.ImportNamedSpecifier;
        this.currentScope.define({
          name: named.local.name,
          kind: 'variable',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
        });
      } else if (spec.kind === 'ImportDefaultSpecifier') {
        const def = spec as AST.ImportDefaultSpecifier;
        this.currentScope.define({
          name: def.local.name,
          kind: 'variable',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
        });
      } else if (spec.kind === 'ImportNamespaceSpecifier') {
        const ns = spec as AST.ImportNamespaceSpecifier;
        this.currentScope.define({
          name: ns.local.name,
          kind: 'module',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
        });
      }
    }
  }
  
  private collectExport(decl: AST.ExportDeclaration): void {
    if (decl.declaration) {
      this.collectStatement(decl.declaration);
      // Mark as exported
      if ('id' in decl.declaration && decl.declaration.id) {
        const name = (decl.declaration.id as AST.Identifier).name;
        const symbol = this.currentScope.lookupLocal(name);
        if (symbol) {
          this.currentScope.define({
            ...symbol,
            exported: true,
          });
        }
      }
    }
  }
  
  private collectModule(decl: AST.ModuleDeclaration): void {
    const name = decl.id.parts.map(p => p.name).join('::');
    
    // Create module scope
    const moduleScope = new SymbolTable(this.currentScope, name);
    const savedScope = this.currentScope;
    this.currentScope = moduleScope;
    
    // Collect module contents
    for (const stmt of decl.body) {
      this.collectStatement(stmt);
    }
    
    this.currentScope = savedScope;
    
    // Add module symbol
    this.currentScope.define({
      name,
      kind: 'module',
      type: BuiltinTypes.Any, // Module type would be more complex
      declaration: decl,
      span: decl.span,
      exported: false,
      mutable: false,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Type Checking
  // ─────────────────────────────────────────────────────────────────────────────
  
  private checkProgram(program: AST.Program): void {
    for (const stmt of program.statements) {
      this.checkStatement(stmt);
    }
  }
  
  private checkStatement(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case 'PersonaDeclaration':
        this.checkPersona(stmt as AST.PersonaDeclaration);
        break;
      case 'TeamDeclaration':
        this.checkTeam(stmt as AST.TeamDeclaration);
        break;
      case 'WorkflowDeclaration':
        this.checkWorkflow(stmt as AST.WorkflowDeclaration);
        break;
      case 'FunctionDeclaration':
        this.checkFunction(stmt as AST.FunctionDeclaration);
        break;
      case 'VariableDeclaration':
        this.checkVariableDeclaration(stmt as AST.VariableDeclaration);
        break;
      case 'IfStatement':
        this.checkIfStatement(stmt as AST.IfStatement);
        break;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
        this.checkForStatement(stmt as any);
        break;
      case 'WhileStatement':
        this.checkWhileStatement(stmt as AST.WhileStatement);
        break;
      case 'TryStatement':
        this.checkTryStatement(stmt as AST.TryStatement);
        break;
      case 'ReturnStatement':
        this.checkReturnStatement(stmt as AST.ReturnStatement);
        break;
      case 'ExpressionStatement':
        this.checkExpression((stmt as AST.ExpressionStatement).expression);
        break;
      case 'BlockStatement':
        this.checkBlock(stmt as AST.BlockStatement);
        break;
    }
  }
  
  private checkPersona(decl: AST.PersonaDeclaration): void {
    // Check that parent persona exists
    if (decl.extends) {
      for (const ext of decl.extends) {
        const parentName = ext.typeName.parts[0].name;
        const parent = this.currentScope.lookup(parentName);
        if (!parent) {
          this.error(`Unknown persona: ${parentName}`, ext.span);
        } else if (!(parent.type instanceof PersonaType)) {
          this.error(`${parentName} is not a persona`, ext.span);
        }
      }
    }
    
    // Check methods
    for (const member of decl.body.members) {
      if (member.kind === 'MethodDeclaration') {
        this.checkMethod(member as AST.MethodDeclaration);
      }
    }
  }
  
  private checkTeam(decl: AST.TeamDeclaration): void {
    const teamSymbol = this.currentScope.lookup(decl.id.name);
    if (!teamSymbol || !(teamSymbol.type instanceof TeamType)) return;
    
    for (const member of decl.body.members) {
      if (member.kind === 'TeamMembersDeclaration') {
        for (const ref of (member as AST.TeamMembersDeclaration).members) {
          const personaName = this.getPersonaRefName(ref);
          const persona = this.currentScope.lookup(personaName);
          if (!persona) {
            this.error(`Unknown persona: ${personaName}`, ref.span);
          } else if (!(persona.type instanceof PersonaType)) {
            this.error(`${personaName} is not a persona`, ref.span);
          }
        }
      } else if (member.kind === 'TeamPrimaryDeclaration') {
        const primaryRef = (member as AST.TeamPrimaryDeclaration).primary;
        const personaName = this.getPersonaRefName(primaryRef);
        const persona = this.currentScope.lookup(personaName);
        if (!persona) {
          this.error(`Unknown persona: ${personaName}`, primaryRef.span);
        } else if (!teamSymbol.type.members.some(m => m.name === personaName)) {
          this.error(`Primary persona ${personaName} is not a team member`, primaryRef.span);
        }
      }
    }
  }
  
  private checkWorkflow(decl: AST.WorkflowDeclaration): void {
    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowStepsDeclaration') {
        this.checkWorkflowExpression((member as AST.WorkflowStepsDeclaration).steps);
      }
    }
  }
  
  private checkWorkflowExpression(expr: AST.WorkflowExpression): void {
    switch (expr.kind) {
      case 'WorkflowSequenceExpr':
        for (const step of (expr as AST.WorkflowSequenceExpr).steps) {
          this.checkWorkflowExpression(step);
        }
        break;
      case 'WorkflowParallelExpr':
        for (const branch of (expr as AST.WorkflowParallelExpr).branches) {
          this.checkWorkflowExpression(branch);
        }
        break;
      case 'WorkflowChoiceExpr':
        for (const branch of (expr as AST.WorkflowChoiceExpr).branches) {
          this.checkWorkflowExpression(branch);
        }
        break;
      case 'WorkflowGroupExpr':
        this.checkWorkflowExpression((expr as AST.WorkflowGroupExpr).expr);
        break;
      case 'WorkflowConditionalExpr':
        const cond = expr as AST.WorkflowConditionalExpr;
        this.checkExpression(cond.condition);
        this.checkWorkflowExpression(cond.then);
        if (cond.else) this.checkWorkflowExpression(cond.else);
        break;
      case 'WorkflowLoopExpr':
        const loop = expr as AST.WorkflowLoopExpr;
        this.checkWorkflowExpression(loop.body);
        if (loop.condition) this.checkExpression(loop.condition);
        break;
      case 'WorkflowPersonaRef':
        const personaName = this.getPersonaRefName((expr as AST.WorkflowPersonaRef).ref);
        const persona = this.currentScope.lookup(personaName);
        if (!persona) {
          this.error(`Unknown persona: ${personaName}`, expr.span);
        } else if (!(persona.type instanceof PersonaType) && !(persona.type instanceof TeamType)) {
          this.error(`${personaName} is not a persona or team`, expr.span);
        }
        break;
    }
  }
  
  private checkFunction(decl: AST.FunctionDeclaration): void {
    if (!decl.body) return;
    
    // Enter function scope
    const functionScope = new SymbolTable(this.currentScope, decl.id.name);
    const savedScope = this.currentScope;
    this.currentScope = functionScope;
    
    // Add parameters
    for (const param of decl.parameters) {
      if (param.name.kind === 'Identifier') {
        const paramType = param.type 
          ? this.resolveTypeNode(param.type) 
          : BuiltinTypes.Any;
        
        this.currentScope.define({
          name: param.name.name,
          kind: 'parameter',
          type: paramType,
          declaration: param,
          span: param.span,
          exported: false,
          mutable: true,
        });
      }
    }
    
    // Set return type for checking return statements
    const savedReturnType = this.returnType;
    this.returnType = decl.returnType 
      ? this.resolveTypeNode(decl.returnType) 
      : BuiltinTypes.Void;
    
    // Check body
    this.checkBlock(decl.body);
    
    this.returnType = savedReturnType;
    this.currentScope = savedScope;
  }
  
  private checkMethod(decl: AST.MethodDeclaration): void {
    if (!decl.body) return;
    
    // Enter method scope
    const methodScope = new SymbolTable(this.currentScope, decl.name.name);
    const savedScope = this.currentScope;
    this.currentScope = methodScope;
    
    // Add parameters
    for (const param of decl.parameters) {
      if (param.name.kind === 'Identifier') {
        const paramType = param.type 
          ? this.resolveTypeNode(param.type) 
          : BuiltinTypes.Any;
        
        this.currentScope.define({
          name: param.name.name,
          kind: 'parameter',
          type: paramType,
          declaration: param,
          span: param.span,
          exported: false,
          mutable: true,
        });
      }
    }
    
    // Set return type
    const savedReturnType = this.returnType;
    this.returnType = decl.returnType 
      ? this.resolveTypeNode(decl.returnType) 
      : BuiltinTypes.Void;
    
    // Check body
    this.checkBlock(decl.body);
    
    this.returnType = savedReturnType;
    this.currentScope = savedScope;
  }
  
  private checkVariableDeclaration(decl: AST.VariableDeclaration): void {
    for (const declarator of decl.declarations) {
      if (declarator.init) {
        const initType = this.checkExpression(declarator.init);
        
        if (declarator.type) {
          const declaredType = this.resolveTypeNode(declarator.type);
          if (!initType.isAssignableTo(declaredType)) {
            this.error(
              `Type '${initType.toString()}' is not assignable to type '${declaredType.toString()}'`,
              declarator.span
            );
          }
        }
      } else if (decl.declarationKind === 'const') {
        this.error('const declaration must be initialized', declarator.span);
      }
    }
  }
  
  private checkIfStatement(stmt: AST.IfStatement): void {
    const testType = this.checkExpression(stmt.test);
    if (!testType.isAssignableTo(BuiltinTypes.Bool) && this.strict) {
      this.warning(`Condition should be a boolean, got '${testType.toString()}'`, stmt.test.span);
    }
    
    this.checkBlock(stmt.consequent);
    
    if (stmt.alternate) {
      if (stmt.alternate.kind === 'IfStatement') {
        this.checkIfStatement(stmt.alternate as AST.IfStatement);
      } else {
        this.checkBlock(stmt.alternate as AST.BlockStatement);
      }
    }
  }
  
  private checkForStatement(stmt: AST.ForStatement | AST.ForInStatement | AST.ForOfStatement): void {
    const loopScope = new SymbolTable(this.currentScope, 'for');
    const savedScope = this.currentScope;
    this.currentScope = loopScope;
    
    if (stmt.kind === 'ForInStatement' || stmt.kind === 'ForOfStatement') {
      const leftNode = stmt.left;
      if (leftNode.kind === 'Identifier') {
        this.currentScope.define({
          name: leftNode.name,
          kind: 'variable',
          type: BuiltinTypes.Any,
          span: leftNode.span,
          exported: false,
          mutable: true,
        });
      }
      this.checkExpression(stmt.right);
    } else if (stmt.kind === 'ForStatement') {
      if (stmt.init) {
        if (stmt.init.kind === 'VariableDeclaration') {
          this.checkVariableDeclaration(stmt.init);
        } else {
          this.checkExpression(stmt.init);
        }
      }
      if (stmt.test) {
        const testType = this.checkExpression(stmt.test);
        if (!testType.isAssignableTo(BuiltinTypes.Bool) && this.strict) {
          this.warning(`For condition should be boolean`, stmt.test.span);
        }
      }
      if (stmt.update) {
        this.checkExpression(stmt.update);
      }
    }
    
    this.checkBlock(stmt.body);
    this.currentScope = savedScope;
  }
  
  private checkWhileStatement(stmt: AST.WhileStatement): void {
    const testType = this.checkExpression(stmt.test);
    if (!testType.isAssignableTo(BuiltinTypes.Bool) && this.strict) {
      this.warning(`While condition should be boolean`, stmt.test.span);
    }
    
    this.checkBlock(stmt.body);
  }
  
  private checkTryStatement(stmt: AST.TryStatement): void {
    this.checkBlock(stmt.block);
    
    for (const handler of stmt.handlers) {
      const catchScope = new SymbolTable(this.currentScope, 'catch');
      const savedScope = this.currentScope;
      this.currentScope = catchScope;
      
      if (handler.param && handler.param.kind === 'Identifier') {
        const paramType = handler.type 
          ? this.resolveTypeNode(handler.type) 
          : BuiltinTypes.Any;
        
        this.currentScope.define({
          name: handler.param.name,
          kind: 'variable',
          type: paramType,
          span: handler.param.span,
          exported: false,
          mutable: false,
        });
      }
      
      this.checkBlock(handler.body);
      this.currentScope = savedScope;
    }
    
    if (stmt.finalizer) {
      this.checkBlock(stmt.finalizer);
    }
  }
  
  private checkReturnStatement(stmt: AST.ReturnStatement): void {
    if (stmt.argument) {
      const returnedType = this.checkExpression(stmt.argument);
      
      if (this.returnType && !returnedType.isAssignableTo(this.returnType)) {
        this.error(
          `Type '${returnedType.toString()}' is not assignable to return type '${this.returnType.toString()}'`,
          stmt.span
        );
      }
    } else if (this.returnType && !BuiltinTypes.Void.isAssignableTo(this.returnType)) {
      this.error('Missing return value', stmt.span);
    }
  }
  
  private checkBlock(block: AST.BlockStatement): void {
    const blockScope = new SymbolTable(this.currentScope, 'block');
    const savedScope = this.currentScope;
    this.currentScope = blockScope;
    
    for (const stmt of block.statements) {
      this.checkStatement(stmt);
    }
    
    this.currentScope = savedScope;
  }
  
  private checkExpression(expr: AST.Expression): Type {
    return this.inferExpressionType(expr);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Type Inference
  // ─────────────────────────────────────────────────────────────────────────────
  
  private inferExpressionType(expr: AST.Expression): Type {
    switch (expr.kind) {
      case 'StringLiteral':
        return new LiteralType((expr as AST.StringLiteral).value, BuiltinTypes.String);
      
      case 'NumberLiteral':
        const num = expr as AST.NumberLiteral;
        const isInt = Number.isInteger(num.value);
        return new LiteralType(num.value, isInt ? BuiltinTypes.Int : BuiltinTypes.Float);
      
      case 'BooleanLiteral':
        return new LiteralType((expr as AST.BooleanLiteral).value, BuiltinTypes.Bool);
      
      case 'NullLiteral':
        return BuiltinTypes.Any;
      
      case 'Identifier':
        return this.inferIdentifier(expr as AST.Identifier);
      
      case 'BinaryExpression':
        return this.inferBinaryExpression(expr as AST.BinaryExpression);
      
      case 'UnaryExpression':
        return this.inferUnaryExpression(expr as AST.UnaryExpression);
      
      case 'CallExpression':
        return this.inferCallExpression(expr as AST.CallExpression);
      
      case 'MemberExpression':
        return this.inferMemberExpression(expr as AST.MemberExpression);
      
      case 'IndexExpression':
        return this.inferIndexExpression(expr as AST.IndexExpression);
      
      case 'ArrayExpression':
        return this.inferArrayExpression(expr as AST.ArrayExpression);
      
      case 'ObjectExpression':
        return this.inferObjectExpression(expr as AST.ObjectExpression);
      
      case 'ArrowFunctionExpression':
        return this.inferArrowFunction(expr as AST.ArrowFunctionExpression);
      
      case 'FunctionExpression':
        return this.inferFunctionExpression(expr as AST.FunctionExpression);
      
      case 'ConditionalExpression':
        return this.inferConditionalExpression(expr as AST.ConditionalExpression);
      
      case 'AssignmentExpression':
        return this.inferAssignmentExpression(expr as AST.AssignmentExpression);
      
      case 'MatchExpression':
        return this.inferMatchExpression(expr as AST.MatchExpression);
      
      case 'AwaitExpression':
        return this.inferExpressionType((expr as AST.AwaitExpression).argument);
      
      case 'ParenthesizedExpression':
        return this.inferExpressionType((expr as AST.ParenthesizedExpression).expression);
      
      default:
        return BuiltinTypes.Any;
    }
  }
  
  private inferIdentifier(id: AST.Identifier): Type {
    const symbol = this.currentScope.lookup(id.name);
    if (!symbol) {
      this.error(`Unknown identifier: ${id.name}`, id.span);
      return BuiltinTypes.Any;
    }
    return symbol.type;
  }
  
  private inferBinaryExpression(expr: AST.BinaryExpression): Type {
    const leftType = this.inferExpressionType(expr.left);
    const rightType = this.inferExpressionType(expr.right);
    
    switch (expr.operator) {
      // Arithmetic
      case '+':
        if (leftType.isAssignableTo(BuiltinTypes.String) || rightType.isAssignableTo(BuiltinTypes.String)) {
          return BuiltinTypes.String;
        }
        return BuiltinTypes.Float;
      case '-':
      case '*':
      case '/':
      case '%':
      case '**':
        return BuiltinTypes.Float;
      
      // Comparison
      case '==':
      case '!=':
      case '===':
      case '!==':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return BuiltinTypes.Bool;
      
      // Logical
      case '&&':
      case '||':
        return UnionType.create([leftType, rightType]);
      
      case '??':
        return UnionType.create([leftType, rightType]);
      
      // Bitwise
      case '&':
      case '|':
      case '^':
      case '<<':
      case '>>':
      case '>>>':
        return BuiltinTypes.Int;
      
      default:
        return BuiltinTypes.Any;
    }
  }
  
  private inferUnaryExpression(expr: AST.UnaryExpression): Type {
    const argType = this.inferExpressionType(expr.argument);
    
    switch (expr.operator) {
      case '!':
        return BuiltinTypes.Bool;
      case '-':
      case '+':
        return argType;
      case '~':
        return BuiltinTypes.Int;
      case '++':
      case '--':
        return argType;
      case 'typeof':
        return BuiltinTypes.String;
      default:
        return BuiltinTypes.Any;
    }
  }
  
  private inferCallExpression(expr: AST.CallExpression): Type {
    const calleeType = this.inferExpressionType(expr.callee);
    
    if (calleeType instanceof FunctionType) {
      // Check argument count
      const requiredParams = calleeType.parameters.filter(p => !p.optional && !p.rest).length;
      if (expr.arguments.length < requiredParams) {
        this.error(
          `Expected ${requiredParams} arguments, got ${expr.arguments.length}`,
          expr.span
        );
      }
      
      // Check argument types
      for (let i = 0; i < expr.arguments.length && i < calleeType.parameters.length; i++) {
        const argType = this.inferExpressionType(expr.arguments[i]);
        const paramType = calleeType.parameters[i].type;
        
        if (!argType.isAssignableTo(paramType)) {
          this.error(
            `Argument type '${argType.toString()}' is not assignable to parameter type '${paramType.toString()}'`,
            expr.arguments[i].span
          );
        }
      }
      
      return calleeType.returnType;
    }
    
    if (calleeType instanceof PersonaType) {
      // Calling a persona as a function - probably a method call
      return BuiltinTypes.Any;
    }
    
    return BuiltinTypes.Any;
  }
  
  private inferMemberExpression(expr: AST.MemberExpression): Type {
    const objectType = this.inferExpressionType(expr.object);
    const propertyName = expr.property.name;
    
    if (objectType instanceof ObjectType) {
      const member = objectType.getMember(propertyName);
      if (member) return member.type;
      
      if (objectType.indexSignature) {
        return objectType.indexSignature.value;
      }
      
      this.error(`Property '${propertyName}' does not exist on type`, expr.span);
      return BuiltinTypes.Any;
    }
    
    if (objectType instanceof PersonaType) {
      const method = objectType.getMethod(propertyName);
      if (method) return method;
      
      this.error(`Method '${propertyName}' does not exist on persona '${objectType.name}'`, expr.span);
      return BuiltinTypes.Any;
    }
    
    return BuiltinTypes.Any;
  }
  
  private inferIndexExpression(expr: AST.IndexExpression): Type {
    const objectType = this.inferExpressionType(expr.object);
    const indexType = this.inferExpressionType(expr.index);
    
    if (objectType instanceof ArrayType) {
      return objectType.elementType;
    }
    
    if (objectType instanceof TupleType) {
      if (indexType instanceof LiteralType && typeof indexType.value === 'number') {
        const idx = indexType.value;
        if (idx >= 0 && idx < objectType.elements.length) {
          return objectType.elements[idx];
        }
      }
      return UnionType.create([...objectType.elements]);
    }
    
    if (objectType instanceof ObjectType && objectType.indexSignature) {
      return objectType.indexSignature.value;
    }
    
    return BuiltinTypes.Any;
  }
  
  private inferArrayExpression(expr: AST.ArrayExpression): Type {
    if (expr.elements.length === 0) {
      return new ArrayType(BuiltinTypes.Any);
    }
    
    const elementTypes: Type[] = [];
    for (const element of expr.elements) {
      if (element === null) continue;
      if (element.kind === 'SpreadElement') {
        const spreadType = this.inferExpressionType((element as AST.SpreadElement).argument);
        if (spreadType instanceof ArrayType) {
          elementTypes.push(spreadType.elementType);
        }
      } else {
        elementTypes.push(this.inferExpressionType(element));
      }
    }
    
    const unionType = UnionType.create(elementTypes);
    return new ArrayType(unionType);
  }
  
  private inferObjectExpression(expr: AST.ObjectExpression): Type {
    const members = new Map<string, ObjectTypeMember>();
    
    for (const prop of expr.properties) {
      if (prop.kind === 'ObjectKeyValueProperty') {
        const kvProp = prop as AST.ObjectKeyValueProperty;
        const name = kvProp.key.kind === 'Identifier' 
          ? kvProp.key.name 
          : String(kvProp.key.kind === 'StringLiteral' ? kvProp.key.value : kvProp.key.value);
        
        members.set(name, {
          name,
          type: this.inferExpressionType(kvProp.value),
          optional: false,
          readonly: false,
        });
      } else if (prop.kind === 'ObjectShorthandProperty') {
        const shortProp = prop as AST.ObjectShorthandProperty;
        const name = shortProp.key.name;
        
        members.set(name, {
          name,
          type: this.inferIdentifier(shortProp.key),
          optional: false,
          readonly: false,
        });
      } else if (prop.kind === 'ObjectMethodProperty') {
        const methodProp = prop as AST.ObjectMethodProperty;
        const name = methodProp.key.name;
        const params: FunctionParameter[] = methodProp.parameters.map(p => ({
          name: p.name.kind === 'Identifier' ? p.name.name : '',
          type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
          optional: p.optional,
          rest: p.rest,
        }));
        
        members.set(name, {
          name,
          type: new FunctionType(params, BuiltinTypes.Any),
          optional: false,
          readonly: false,
        });
      }
    }
    
    return new ObjectType(members);
  }
  
  private inferArrowFunction(expr: AST.ArrowFunctionExpression): Type {
    const params: FunctionParameter[] = expr.parameters.map(p => ({
      name: p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));
    
    let returnType: Type;
    if (expr.returnType) {
      returnType = this.resolveTypeNode(expr.returnType);
    } else if (expr.body.kind !== 'BlockStatement') {
      // Infer from expression body
      returnType = this.inferExpressionType(expr.body as AST.Expression);
    } else {
      returnType = BuiltinTypes.Void;
    }
    
    return new FunctionType(params, returnType);
  }
  
  private inferFunctionExpression(expr: AST.FunctionExpression): Type {
    const params: FunctionParameter[] = expr.parameters.map(p => ({
      name: p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));
    
    const returnType = expr.returnType 
      ? this.resolveTypeNode(expr.returnType) 
      : BuiltinTypes.Void;
    
    const typeVars = expr.typeParameters.map(tp => 
      new TypeVariable(
        tp.name.name,
        tp.constraint ? this.resolveTypeNode(tp.constraint) : undefined,
        tp.default ? this.resolveTypeNode(tp.default) : undefined
      )
    );
    
    return new FunctionType(params, returnType, typeVars);
  }
  
  private inferConditionalExpression(expr: AST.ConditionalExpression): Type {
    this.checkExpression(expr.test);
    const consequentType = this.inferExpressionType(expr.consequent);
    const alternateType = this.inferExpressionType(expr.alternate);
    
    return UnionType.create([consequentType, alternateType]);
  }
  
  private inferAssignmentExpression(expr: AST.AssignmentExpression): Type {
    const leftType = this.inferExpressionType(expr.left);
    const rightType = this.inferExpressionType(expr.right);
    
    if (!rightType.isAssignableTo(leftType)) {
      this.error(
        `Type '${rightType.toString()}' is not assignable to type '${leftType.toString()}'`,
        expr.span
      );
    }
    
    // Check mutability
    if (expr.left.kind === 'Identifier') {
      const symbol = this.currentScope.lookup((expr.left as AST.Identifier).name);
      if (symbol && !symbol.mutable) {
        this.error(`Cannot assign to immutable variable '${symbol.name}'`, expr.span);
      }
    }
    
    return rightType;
  }
  
  private inferMatchExpression(expr: AST.MatchExpression): Type {
    this.checkExpression(expr.discriminant);
    
    const caseTypes: Type[] = [];
    for (const c of expr.cases) {
      if (c.consequent.kind === 'BlockStatement') {
        caseTypes.push(BuiltinTypes.Void);
      } else {
        caseTypes.push(this.inferExpressionType(c.consequent as AST.Expression));
      }
    }
    
    return UnionType.create(caseTypes);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Type Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  
  private resolveTypeNode(node: AST.TypeNode): Type {
    switch (node.kind) {
      case 'TypeReference':
        return this.resolveTypeReference(node as AST.TypeReference);
      
      case 'UnionType':
        const unionTypes = (node as AST.UnionType).types.map(t => this.resolveTypeNode(t));
        return UnionType.create(unionTypes);
      
      case 'IntersectionType':
        const intersectionTypes = (node as AST.IntersectionType).types.map(t => this.resolveTypeNode(t));
        return IntersectionType.create(intersectionTypes);
      
      case 'ArrayType':
        return new ArrayType(this.resolveTypeNode((node as AST.ArrayType).elementType));
      
      case 'TupleType':
        return new TupleType((node as AST.TupleType).elements.map(e => this.resolveTypeNode(e)));
      
      case 'FunctionType':
        const funcNode = node as AST.FunctionType;
        const params: FunctionParameter[] = funcNode.parameters.map(p => ({
          name: p.name.kind === 'Identifier' ? p.name.name : '',
          type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
          optional: p.optional,
          rest: p.rest,
        }));
        return new FunctionType(params, this.resolveTypeNode(funcNode.returnType));
      
      case 'ObjectType':
        const members = new Map<string, ObjectTypeMember>();
        for (const member of (node as AST.ObjectType).members) {
          if (member.kind === 'PropertySignature') {
            const prop = member as AST.PropertySignature;
            const name = typeof prop.name === 'string' ? prop.name : prop.name.name;
            members.set(name, {
              name,
              type: this.resolveTypeNode(prop.type),
              optional: prop.optional,
              readonly: prop.readonly,
            });
          }
        }
        return new ObjectType(members);
      
      case 'LiteralType':
        const lit = node as AST.LiteralType;
        if (lit.literal.kind === 'StringLiteral') {
          return new LiteralType(lit.literal.value, BuiltinTypes.String);
        } else if (lit.literal.kind === 'NumberLiteral') {
          return new LiteralType(lit.literal.value, BuiltinTypes.Int);
        } else if (lit.literal.kind === 'BooleanLiteral') {
          return new LiteralType(lit.literal.value, BuiltinTypes.Bool);
        }
        return BuiltinTypes.Any;
      
      case 'ParenthesizedType':
        return this.resolveTypeNode((node as AST.ParenthesizedType).type);
      
      default:
        return BuiltinTypes.Any;
    }
  }
  
  private resolveTypeReference(ref: AST.TypeReference): Type {
    const name = ref.typeName.parts.map(p => p.name).join('::');
    
    // Check built-in types
    const builtin = this.currentScope.lookupType(name);
    if (builtin) {
      if (ref.typeArguments.length > 0) {
        const args = ref.typeArguments.map(a => this.resolveTypeNode(a));
        return new GenericType(builtin, args);
      }
      return builtin;
    }
    
    // Check declared types
    const symbol = this.currentScope.lookup(name);
    if (symbol) {
      if (ref.typeArguments.length > 0) {
        const args = ref.typeArguments.map(a => this.resolveTypeNode(a));
        return new GenericType(symbol.type, args);
      }
      return symbol.type;
    }
    
    this.error(`Unknown type: ${name}`, ref.span);
    return BuiltinTypes.Any;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────
  
  private functionToType(decl: AST.FunctionDeclaration): FunctionType {
    const params: FunctionParameter[] = decl.parameters.map(p => ({
      name: p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));
    
    const returnType = decl.returnType 
      ? this.resolveTypeNode(decl.returnType) 
      : BuiltinTypes.Void;
    
    const typeVars = decl.typeParameters.map(tp => 
      new TypeVariable(
        tp.name.name,
        tp.constraint ? this.resolveTypeNode(tp.constraint) : undefined,
        tp.default ? this.resolveTypeNode(tp.default) : undefined
      )
    );
    
    return new FunctionType(params, returnType, typeVars);
  }
  
  private methodToFunctionType(decl: AST.MethodDeclaration): FunctionType {
    const params: FunctionParameter[] = decl.parameters.map(p => ({
      name: p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));
    
    const returnType = decl.returnType 
      ? this.resolveTypeNode(decl.returnType) 
      : BuiltinTypes.Void;
    
    const typeVars = decl.typeParameters.map(tp => 
      new TypeVariable(
        tp.name.name,
        tp.constraint ? this.resolveTypeNode(tp.constraint) : undefined,
        tp.default ? this.resolveTypeNode(tp.default) : undefined
      )
    );
    
    return new FunctionType(params, returnType, typeVars);
  }
  
  private getPersonaRefName(ref: AST.PersonaReference): string {
    if (ref.ref.type === 'id') {
      return ref.ref.id.name;
    }
    if (ref.ref.type === 'qualified') {
      return ref.ref.path.parts.map(p => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return ref.ref.persona.name;
    }
    return '';
  }
  
  private hasModifier(modifiers: AST.Modifier[], type: string): boolean {
    return modifiers.some(m => m.type === type);
  }
  
  private error(message: string, span?: Span): void {
    this.errors.push(createError(
      ErrorCode.TYPE_MISMATCH,
      message,
      { span }
    ));
  }
  
  private warning(message: string, span?: Span): void {
    this.warnings.push(createError(
      ErrorCode.TYPE_MISMATCH,
      message,
      { span }
    ));
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze a PCL program
 */
export function analyze(
  program: AST.Program,
  options?: AnalyzerOptions
): Result<AnalysisResult, PCLError[]> {
  const analyzer = new SemanticAnalyzer(options);
  return analyzer.analyze(program);
}

/**
 * Full pipeline: parse + analyze
 */
export function check(
  source: string,
  options?: AnalyzerOptions
): Result<AnalysisResult, PCLError[]> {
  // This would import from parser
  // const parseResult = parse(source, { source: options?.source });
  // if (!parseResult.ok) return parseResult;
  // return analyze(parseResult.value, options);
  throw new Error('Not implemented - requires parser import');
}
