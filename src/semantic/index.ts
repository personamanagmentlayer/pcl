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

import * as AST from '../ast';
import type { ComparisonOp, PCLError, Result, Span } from '../types';
import { ErrorCode, Ok, Err, PCLError as createError } from '../types';

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
  | 'void'
  | 'null';

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
    // Check if assignable to any member of a union
    if (other instanceof UnionType) {
      return other.members.some((m) => this.isAssignableTo(m));
    }
    // Allow Int → Float widening
    if (
      this.name === 'Int' &&
      other instanceof PrimitiveType &&
      other.name === 'Float'
    ) {
      return true;
    }
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
    return (
      other instanceof ArrayType && this.elementType.equals(other.elementType)
    );
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
    return `[${this.elements.map((e) => e.toString()).join(', ')}]`;
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
      return this.elements.every((e) => e.isAssignableTo(other.elementType));
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
      .map(
        (m) =>
          `${m.readonly ? 'readonly ' : ''}${m.name}${m.optional ? '?' : ''}: ${m.type.toString()}`
      )
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
      .map(
        (p) =>
          `${p.rest ? '...' : ''}${p.name}${p.optional ? '?' : ''}: ${p.type.toString()}`
      )
      .join(', ');
    const typeParams =
      this.typeParameters.length > 0
        ? `<${this.typeParameters.map((t) => t.toString()).join(', ')}>`
        : '';
    return `${typeParams}(${params}) -> ${this.returnType.toString()}`;
  }

  equals(other: Type): boolean {
    if (!(other instanceof FunctionType)) return false;
    if (this.parameters.length !== other.parameters.length) return false;
    if (!this.returnType.equals(other.returnType)) return false;
    return this.parameters.every((p, i) =>
      p.type.equals(other.parameters[i].type)
    );
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
    return this.members.map((m) => m.toString()).join(' | ');
  }

  equals(other: Type): boolean {
    if (!(other instanceof UnionType)) return false;
    if (this.members.length !== other.members.length) return false;
    return this.members.every((m) => other.members.some((o) => m.equals(o)));
  }

  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof UnionType) {
      return this.members.every((m) =>
        other.members.some((o) => m.isAssignableTo(o))
      );
    }
    return this.members.every((m) => m.isAssignableTo(other));
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
    const unique = flattened.filter(
      (t, i) => !flattened.slice(0, i).some((prev) => prev.equals(t))
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
    return this.members.map((m) => m.toString()).join(' & ');
  }

  equals(other: Type): boolean {
    if (!(other instanceof IntersectionType)) return false;
    if (this.members.length !== other.members.length) return false;
    return this.members.every((m) => other.members.some((o) => m.equals(o)));
  }

  isAssignableTo(other: Type): boolean {
    if (other instanceof AnyType) return true;
    if (other instanceof IntersectionType) {
      return other.members.every((o) =>
        this.members.some((m) => m.isAssignableTo(o))
      );
    }
    return this.members.some((m) => m.isAssignableTo(other));
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
    const unique = flattened.filter(
      (t, i) => !flattened.slice(0, i).some((prev) => prev.equals(t))
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
    return `${this.base.toString()}<${this.typeArguments.map((a) => a.toString()).join(', ')}>`;
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
      return this.typeArguments.every((a, i) =>
        a.equals(other.typeArguments[i])
      );
    }
    return false;
  }
}

/**
 * Persona type
 */
/**
 * Represents a constraint expression in a persona
 */
export interface ConstraintExpression {
  readonly field: string;
  readonly operator: ComparisonOp;
  readonly value: any; // Evaluated value
  readonly valueExpr: AST.Expression; // Original expression
  readonly span: Span;
}

export class PersonaType implements Type {
  readonly kind = 'persona' as const;

  constructor(
    readonly name: string,
    readonly intent: string,
    readonly skills: readonly string[],
    readonly constraints: readonly string[],
    readonly exprConstraints: readonly ConstraintExpression[],
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
      return (
        this.inputType.isAssignableTo(other.inputType) &&
        this.outputType.isAssignableTo(other.outputType)
      );
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
  toString(): string {
    return 'Any';
  }
  equals(other: Type): boolean {
    return other instanceof AnyType;
  }
  isAssignableTo(_other: Type): boolean {
    return true;
  }
}

export class UnknownType implements Type {
  readonly kind = 'unknown' as const;
  toString(): string {
    return 'Unknown';
  }
  equals(other: Type): boolean {
    return other instanceof UnknownType;
  }
  isAssignableTo(other: Type): boolean {
    return other instanceof AnyType || other instanceof UnknownType;
  }
}

export class NeverType implements Type {
  readonly kind = 'never' as const;
  toString(): string {
    return 'Never';
  }
  equals(other: Type): boolean {
    return other instanceof NeverType;
  }
  isAssignableTo(_other: Type): boolean {
    return true;
  }
}

export class VoidType implements Type {
  readonly kind = 'void' as const;
  toString(): string {
    return 'Void';
  }
  equals(other: Type): boolean {
    return other instanceof VoidType;
  }
  isAssignableTo(other: Type): boolean {
    return other instanceof VoidType || other instanceof AnyType;
  }
}

export class NullType implements Type {
  readonly kind = 'null' as const;
  toString(): string {
    return 'null';
  }
  equals(other: Type): boolean {
    return other instanceof NullType;
  }
  isAssignableTo(other: Type): boolean {
    return other instanceof NullType || other instanceof AnyType;
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
  Null: new NullType(),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPES NAMESPACE
// ═══════════════════════════════════════════════════════════════════════════════

export const Types = {
  // Primitive types
  String: BuiltinTypes.String,
  Int: BuiltinTypes.Int,
  Float: BuiltinTypes.Float,
  Bool: BuiltinTypes.Bool,
  Any: BuiltinTypes.Any,
  Unknown: BuiltinTypes.Unknown,
  Never: BuiltinTypes.Never,
  Void: BuiltinTypes.Void,
  Null: BuiltinTypes.Null,

  // Factory methods
  array: (elementType: Type) => new ArrayType(elementType),
  tuple: (elements: Type[]) => new TupleType(elements),
  union: (members: Type[]) => new UnionType(members),
  intersection: (members: Type[]) => new IntersectionType(members),
  literal: (value: string | number | boolean) => {
    let baseType: PrimitiveType;
    if (typeof value === 'string') {
      baseType = Types.String;
    } else if (typeof value === 'boolean') {
      baseType = Types.Bool;
    } else if (Number.isInteger(value)) {
      baseType = Types.Int;
    } else {
      baseType = Types.Float;
    }
    return new LiteralType(value, baseType);
  },
  object: (members: ObjectType['members']) => new ObjectType(members),
  function: (params: FunctionType['parameters'], returnType: Type) =>
    new FunctionType(params, returnType),
  typeVariable: (name: string, constraint?: Type) =>
    new TypeVariable(name, constraint),
  generic: (base: Type, args: Type[]) => new GenericType(base, args),
  persona: (
    name: string,
    intent: string,
    skills: string[],
    constraints: string[],
    exprConstraints: ConstraintExpression[] = [],
    methods: Map<string, FunctionType> = new Map()
  ) =>
    new PersonaType(
      name,
      intent,
      skills,
      constraints,
      exprConstraints,
      methods
    ),
  team: (name: string, members: PersonaType[]) => new TeamType(name, members),
  workflow: (name: string, input: Type, output: Type) =>
    new WorkflowType(name, input, output),
  skill: (name: string, items: string[]) => new SkillType(name, items),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

export class TypeChecker {
  /**
   * Check if two types are structurally equal
   */
  isEqual(a: Type, b: Type): boolean {
    return a.equals(b);
  }

  /**
   * Check if type 'a' is assignable to type 'b'
   */
  isAssignableTo(a: Type, b: Type): boolean {
    return a.isAssignableTo(b);
  }

  /**
   * Get the common type of two types (for type inference)
   */
  getCommonType(types: Type[]): Type {
    if (types.length === 0) return Types.Never;
    if (types.length === 1) return types[0];

    // If all types are equal, return that type
    const first = types[0];
    if (types.every((t) => t.equals(first))) return first;

    // Try to find a type that all others can be assigned to
    for (const candidate of types) {
      if (types.every((t) => t.isAssignableTo(candidate))) {
        return candidate;
      }
    }

    // For numeric types, prefer Float
    const allNumeric = types.every(
      (t) =>
        t instanceof PrimitiveType && (t.name === 'Int' || t.name === 'Float')
    );
    if (allNumeric) {
      return Types.Float;
    }

    // Otherwise create a union
    return UnionType.create(types);
  }

  /**
   * Widen a literal type to its base type
   */
  widenType(type: Type): Type {
    if (type instanceof LiteralType) {
      return type.baseType;
    }
    if (type instanceof ArrayType) {
      return new ArrayType(this.widenType(type.elementType));
    }
    if (type instanceof TupleType) {
      return new TupleType(type.elements.map((e) => this.widenType(e)));
    }
    if (type instanceof UnionType) {
      const widened = type.members.map((m) => this.widenType(m));
      // Deduplicate
      const unique: Type[] = [];
      for (const t of widened) {
        if (!unique.some((u) => u.equals(t))) {
          unique.push(t);
        }
      }
      return unique.length === 1 ? unique[0] : new UnionType(unique);
    }
    return type;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SYMBOL TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export const SymbolKind = {
  Variable: 'variable',
  Function: 'function',
  Parameter: 'parameter',
  Type: 'type',
  Interface: 'interface',
  Enum: 'enum',
  Persona: 'persona',
  Team: 'team',
  Workflow: 'workflow',
  Skill: 'skill',
  Module: 'module',
} as const;

export type SymbolKind = (typeof SymbolKind)[keyof typeof SymbolKind];

export interface Symbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: Type;
  readonly declaration?: AST.ASTNode | null;
  readonly span?: Span;
  readonly scope?: Scope;
  readonly flags?: number;
  readonly exported?: boolean;
  readonly mutable?: boolean;
  readonly visibility?: 'pub' | 'priv'; // Public or private visibility
  readonly module?: string; // Module path where symbol is defined
}

export class Scope {
  symbols = new Map<string, Symbol>();
  types = new Map<string, Type>();
  declaration?: AST.ASTNode;

  constructor(
    public kind: string,
    public parent: Scope | null
  ) {}

  hasLocal(name: string): boolean {
    return this.symbols.has(name);
  }

  lookup(name: string): Symbol | undefined {
    return this.symbols.get(name) || this.parent?.lookup(name);
  }

  define(symbol: Symbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  defineType(name: string, type: Type): void {
    this.types.set(name, type);
  }

  lookupType(name: string): Type | undefined {
    return this.types.get(name) || this.parent?.lookupType(name);
  }
}

export class SymbolTable {
  private currentScope: Scope;
  private globalScope: Scope;

  constructor() {
    // Create global scope
    this.globalScope = new Scope('Global', null);
    this.currentScope = this.globalScope;

    // Add built-in types to global scope
    this.globalScope.types.set('String', BuiltinTypes.String);
    this.globalScope.types.set('Int', BuiltinTypes.Int);
    this.globalScope.types.set('Float', BuiltinTypes.Float);
    this.globalScope.types.set('Bool', BuiltinTypes.Bool);
    this.globalScope.types.set('Any', BuiltinTypes.Any);
    this.globalScope.types.set('Unknown', BuiltinTypes.Unknown);
    this.globalScope.types.set('Never', BuiltinTypes.Never);
    this.globalScope.types.set('Void', BuiltinTypes.Void);
    this.globalScope.types.set('null', BuiltinTypes.Null);

    // Also add built-in types as symbols for convenience
    const builtInTypes = [
      { name: 'String', type: BuiltinTypes.String },
      { name: 'Int', type: BuiltinTypes.Int },
      { name: 'Float', type: BuiltinTypes.Float },
      { name: 'Bool', type: BuiltinTypes.Bool },
      { name: 'Any', type: BuiltinTypes.Any },
      { name: 'Unknown', type: BuiltinTypes.Unknown },
      { name: 'Never', type: BuiltinTypes.Never },
      { name: 'Void', type: BuiltinTypes.Void },
      { name: 'null', type: BuiltinTypes.Null },
    ];
    for (const { name, type } of builtInTypes) {
      this.globalScope.symbols.set(name, {
        name,
        kind: SymbolKind.Type,
        type,
        declaration: null,
        span: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
          source: '',
        },
        scope: this.globalScope,
      });
    }
  }

  getCurrentScope(): Scope {
    return this.currentScope;
  }

  getGlobalScope(): Scope {
    return this.globalScope;
  }

  enterScope(kind: string, declaration?: AST.ASTNode | null): Scope {
    const newScope = new Scope(kind, this.currentScope);
    if (declaration) {
      newScope.declaration = declaration;
    }
    this.currentScope = newScope;
    return newScope;
  }

  exitScope(): Scope {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
    return this.currentScope;
  }

  define(symbol: Symbol): void {
    this.currentScope.symbols.set(symbol.name, symbol);
  }

  defineType(name: string, type: Type): void {
    this.currentScope.types.set(name, type);
  }

  lookup(name: string): Symbol | undefined {
    let scope: Scope | null = this.currentScope;
    while (scope) {
      const symbol = scope.symbols.get(name);
      if (symbol) return symbol;
      scope = scope.parent;
    }
    return undefined;
  }

  lookupType(name: string): Type | undefined {
    let scope: Scope | null = this.currentScope;
    while (scope) {
      const type = scope.types.get(name);
      if (type) return type;
      scope = scope.parent;
    }
    return undefined;
  }

  lookupLocal(name: string): Symbol | undefined {
    return this.currentScope.symbols.get(name);
  }

  has(name: string): boolean {
    return this.lookup(name) !== undefined;
  }

  hasLocal(name: string): boolean {
    return this.currentScope.symbols.has(name);
  }

  getAllSymbols(): Map<string, Symbol> {
    const all = new Map<string, Symbol>();
    let scope: Scope | null = this.currentScope;
    while (scope) {
      for (const [name, symbol] of scope.symbols) {
        if (!all.has(name)) {
          all.set(name, symbol);
        }
      }
      scope = scope.parent;
    }
    return all;
  }

  getExportedSymbols(): Symbol[] {
    return Array.from(this.globalScope.symbols.values()).filter(
      (s) => s.exported
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SEMANTIC ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyzerOptions {
  source?: string; // Source file path or identifier
  sourceCode?: string; // Actual source code for error messages
  strict?: boolean;
  modulePath?: string; // Path to the module being analyzed
}

export interface AnalysisResult {
  symbols: SymbolTable;
  errors: PCLError[];
  warnings: PCLError[];
}

/**
 * Module information for tracking imports, exports, and dependencies
 */
export interface ModuleInfo {
  path: string; // Module file path
  exports: Map<string, Symbol>; // Exported symbols
  imports: Map<string, Symbol>; // Imported symbols
  dependencies: Set<string>; // Imported module paths
}

/**
 * Type narrowing context for control flow analysis
 */
export interface NarrowingContext {
  // Map of variable names to their narrowed types in current context
  narrowedTypes: Map<string, Type>;
  // Parent context for nested scopes
  parent: NarrowingContext | null;
}

/**
 * Semantic Analyzer
 *
 * Performs:
 * - Symbol table building
 * - Type checking
 * - Reference resolution
 * - Scope management
 * - Type narrowing and control flow analysis
 */
export class SemanticAnalyzer {
  private symbolTable: SymbolTable;
  private globalScope: Scope;
  private currentScope: Scope;
  private errors: PCLError[] = [];
  private warnings: PCLError[] = [];
  private readonly source: string; // Source file path
  private readonly sourceCode: string | undefined; // Actual source code
  private readonly strict: boolean;

  // Module visibility tracking
  private currentModule: ModuleInfo | null = null;
  private modules: Map<string, ModuleInfo> = new Map();

  // Type inference context
  private typeVariables: Map<string, Type> = new Map();
  private returnType: Type | null = null;

  // Type narrowing context for control flow analysis
  private narrowingContext: NarrowingContext | null = null;

  constructor(options: AnalyzerOptions = {}) {
    this.source = options.source ?? '<anonymous>';
    this.sourceCode = options.sourceCode;
    this.strict = options.strict ?? false;
    this.symbolTable = new SymbolTable();
    this.globalScope = this.symbolTable.getGlobalScope();
    this.currentScope = this.globalScope;

    // Initialize module context if path provided
    if (options.modulePath) {
      this.currentModule = {
        path: options.modulePath,
        exports: new Map(),
        imports: new Map(),
        dependencies: new Set(),
      };
      this.modules.set(options.modulePath, this.currentModule);
    }
  }

  /**
   * Analyze a program
   */
  analyze(program: AST.Program): Result<AnalysisResult, PCLError[]> {
    // First pass: collect declarations
    this.collectDeclarations(program);

    // Second pass: resolve types and check
    this.checkProgram(program);

    // Third pass: validate exports
    this.validateExports();

    // Return error result if there are any errors
    if (this.errors.length > 0) {
      return Err(this.errors);
    }

    return Ok({
      symbols: this.symbolTable,
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
    const exprConstraints: ConstraintExpression[] = [];
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
          } else if (item.kind === 'ExprConstraint') {
            // Collect expression constraint metadata
            exprConstraints.push({
              field: item.field.name,
              operator: item.op,
              value: null, // Will be evaluated during validation
              valueExpr: item.value,
              span: item.span,
            });
          }
        }
      } else if (member.kind === 'PropertyDeclaration') {
        const prop = member as AST.PropertyDeclaration;
        if (
          prop.name.name === 'intent' &&
          prop.initializer?.kind === 'StringLiteral'
        ) {
          intent = (prop.initializer as AST.StringLiteral).value;
        }
      }
    }

    const type = new PersonaType(
      name,
      intent,
      skills,
      constraints,
      exprConstraints,
      methods,
      parent
    );

    this.currentScope.define({
      name,
      kind: 'persona',
      type,
      declaration: decl,
      span: decl.span,
      exported: this.hasModifier(decl.modifiers, 'pub'),
      visibility: this.getVisibility(decl.modifiers),
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
      visibility: this.getVisibility(decl.modifiers),
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
        inputType = this.resolveTypeNode(
          (member as AST.WorkflowInputDeclaration).type
        );
      } else if (member.kind === 'WorkflowOutputDeclaration') {
        outputType = this.resolveTypeNode(
          (member as AST.WorkflowOutputDeclaration).type
        );
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
      visibility: this.getVisibility(decl.modifiers),
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
      visibility: this.getVisibility(decl.modifiers),
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
        const propName =
          typeof prop.name === 'string'
            ? prop.name
            : prop.name.kind === 'Identifier'
              ? prop.name.name
              : prop.name.value;
        members.set(propName, {
          name: propName,
          type: this.resolveTypeNode(prop.type),
          optional: prop.optional,
          readonly: prop.readonly,
        });
      } else if (member.kind === 'MethodSignature') {
        const method = member as AST.MethodSignature;
        const params: FunctionParameter[] = method.parameters.map((p) => ({
          name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
          type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
          optional: p.optional,
          rest: p.rest,
        }));
        members.set(method.name.name, {
          name: method.name.name,
          type: new FunctionType(
            params,
            this.resolveTypeNode(method.returnType)
          ),
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
      visibility: this.getVisibility(decl.modifiers),
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
    const memberTypes: Type[] = decl.members.map((member) => {
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
      visibility: this.getVisibility(decl.modifiers),
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
          this.error(
            `Duplicate variable declaration: ${name}`,
            declarator.span
          );
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
    // Track module dependency
    if (this.currentModule) {
      this.currentModule.dependencies.add(decl.source.value);
    }

    // For now, just create placeholder symbols
    // Full implementation would resolve the module and validate access
    for (const spec of decl.specifiers) {
      let symbol: Symbol;

      if (spec.kind === 'ImportNamedSpecifier') {
        const named = spec as AST.ImportNamedSpecifier;
        symbol = {
          name: named.local.name,
          kind: 'variable',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
          visibility: 'pub', // Imported symbols are accessible in current module
          module: decl.source.value, // Track source module
        };
        this.currentScope.define(symbol);
      } else if (spec.kind === 'ImportDefaultSpecifier') {
        const def = spec as AST.ImportDefaultSpecifier;
        symbol = {
          name: def.local.name,
          kind: 'variable',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
          visibility: 'pub',
          module: decl.source.value,
        };
        this.currentScope.define(symbol);
      } else if (spec.kind === 'ImportNamespaceSpecifier') {
        const ns = spec as AST.ImportNamespaceSpecifier;
        symbol = {
          name: ns.local.name,
          kind: 'module',
          type: BuiltinTypes.Any,
          declaration: spec,
          span: spec.span,
          exported: false,
          mutable: false,
          visibility: 'pub',
          module: decl.source.value,
        };
        this.currentScope.define(symbol);
      }

      // Track imported symbol
      if (this.currentModule && symbol!) {
        this.currentModule.imports.set(symbol.name, symbol);
      }
    }
  }

  private collectExport(decl: AST.ExportDeclaration): void {
    if (decl.declaration) {
      this.collectStatement(decl.declaration);
      // Mark as exported
      if ('id' in decl.declaration && decl.declaration.id) {
        const name = (decl.declaration.id as AST.Identifier).name;
        const symbol = this.currentScope.symbols.get(name);
        if (symbol) {
          const exportedSymbol = {
            ...symbol,
            exported: true,
          };
          this.currentScope.define(exportedSymbol);

          // Track in module exports
          if (this.currentModule) {
            this.currentModule.exports.set(name, exportedSymbol);
          }
        }
      }
    }

    // Handle export specifiers (export { foo, bar })
    for (const spec of decl.specifiers) {
      if (spec.kind === 'ExportSpecifier') {
        const named = spec as AST.ExportSpecifier;
        const localName = named.local.name;
        const exportedName = named.exported ? named.exported.name : localName;

        const symbol = this.currentScope.lookup(localName);
        if (symbol) {
          const exportedSymbol = {
            ...symbol,
            name: exportedName,
            exported: true,
          };

          // Track in module exports
          if (this.currentModule) {
            this.currentModule.exports.set(exportedName, exportedSymbol);
          }
        } else {
          this.error(
            `Cannot export '${localName}': symbol not found`,
            spec.span
          );
        }
      }
    }
  }

  private collectModule(decl: AST.ModuleDeclaration): void {
    const name = decl.id.parts.map((p) => p.name).join('::');

    // Create module scope
    const moduleScope = this.createScope(this.currentScope, name);
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

    // Validate constraints
    const symbol = this.currentScope.lookup(decl.id.name);
    if (symbol?.type instanceof PersonaType) {
      this.validateConstraints(decl, symbol.type);
    }
  }

  /**
   * Validate expression constraints in a persona
   */
  private validateConstraints(
    decl: AST.PersonaDeclaration,
    personaType: PersonaType
  ): void {
    for (const constraint of personaType.exprConstraints) {
      // 1. Validate field exists and get its type
      const fieldType = this.getConstraintFieldType(
        constraint.field,
        personaType,
        decl
      );

      if (!fieldType) {
        this.error(
          `Constraint references unknown field: ${constraint.field}`,
          constraint.span
        );
        continue;
      }

      // 2. Evaluate constraint value expression
      const valueType = this.checkExpression(constraint.valueExpr);

      // 3. Check operator compatibility with field type
      this.validateConstraintOperator(
        constraint.field,
        constraint.operator,
        fieldType,
        valueType,
        constraint.span
      );
    }
  }

  /**
   * Get the type of a constraint field from the persona
   */
  private getConstraintFieldType(
    fieldName: string,
    personaType: PersonaType,
    decl: AST.PersonaDeclaration
  ): Type | null {
    // Check if field exists as a property in the declaration
    for (const member of decl.body.members) {
      if (member.kind === 'PropertyDeclaration') {
        const prop = member as AST.PropertyDeclaration;
        if (prop.name.name === fieldName) {
          // Get the type of the property
          if (prop.type) {
            return this.resolveTypeNode(prop.type);
          }
          // If no type annotation, try to infer from initializer
          if (prop.initializer) {
            return this.checkExpression(prop.initializer);
          }
          return BuiltinTypes.Any;
        }
      }
    }

    // Check if field exists as a method
    if (personaType.methods.has(fieldName)) {
      return personaType.methods.get(fieldName)!;
    }

    // Check parent persona if exists
    if (personaType.parent) {
      if (personaType.parent.methods.has(fieldName)) {
        return personaType.parent.methods.get(fieldName)!;
      }
    }

    // Field not found
    return null;
  }

  /**
   * Validate operator compatibility with types
   */
  private validateConstraintOperator(
    fieldName: string,
    operator: ComparisonOp,
    fieldType: Type,
    valueType: Type,
    span: Span
  ): void {
    const numericOps: ComparisonOp[] = ['<', '>', '<=', '>='];

    // Validate numeric operators require numeric types for the field
    if (numericOps.includes(operator)) {
      const isFieldNumeric =
        (fieldType instanceof PrimitiveType &&
          (fieldType.name === 'Float' || fieldType.name === 'Int')) ||
        (fieldType instanceof LiteralType &&
          typeof fieldType.value === 'number');

      if (!isFieldNumeric) {
        this.error(
          `Operator '${operator}' cannot be used with field '${fieldName}' of type ${fieldType.toString()}`,
          span
        );
      }

      // Also validate the value is numeric
      const isValueNumeric =
        (valueType instanceof PrimitiveType &&
          (valueType.name === 'Float' || valueType.name === 'Int')) ||
        (valueType instanceof LiteralType &&
          typeof valueType.value === 'number');

      if (!isValueNumeric) {
        this.error(
          `Operator '${operator}' requires numeric value, got ${valueType.toString()}`,
          span
        );
      }
    }

    // Validate 'matches' requires string type
    if (operator === 'matches') {
      const isFieldString =
        (fieldType instanceof PrimitiveType && fieldType.name === 'String') ||
        (fieldType instanceof LiteralType &&
          typeof fieldType.value === 'string');

      if (!isFieldString) {
        this.error(
          `Operator 'matches' cannot be used with field '${fieldName}' of type ${fieldType.toString()}`,
          span
        );
      }
    }

    // Note: 'in', '==', '!=' are allowed for all types
  }

  private checkTeam(decl: AST.TeamDeclaration): void {
    const teamSymbol = this.currentScope.lookup(decl.id.name);
    if (!teamSymbol || !(teamSymbol.type instanceof TeamType)) return;

    // Collect all member names for duplicate detection
    const memberNames = new Set<string>();
    const memberList: string[] = [];
    let quorumDecl: AST.TeamQuorumDeclaration | null = null;
    let conflictDecl: AST.TeamConflictDeclaration | null = null;

    for (const member of decl.body.members) {
      if (member.kind === 'TeamMembersDeclaration') {
        for (const ref of (member as AST.TeamMembersDeclaration).members) {
          const personaName = this.getPersonaRefName(ref);

          // Phase 1.0A: Duplicate member detection
          if (memberNames.has(personaName)) {
            this.error(
              `Duplicate team member '${personaName}'`,
              ref.span,
              ErrorCode.SEMANTIC_DUPLICATE_MEMBER,
              `Remove the duplicate occurrence of '${personaName}' from the members list`
            );
          }
          memberNames.add(personaName);
          memberList.push(personaName);

          const persona = this.currentScope.lookup(personaName);
          if (!persona) {
            this.error(
              `Unknown persona: ${personaName}`,
              ref.span,
              ErrorCode.TYPE_UNKNOWN,
              `Define the persona '${personaName}' before using it in the team, or check for typos`
            );
          } else if (
            !(persona.type instanceof PersonaType) &&
            !(persona.type instanceof TeamType)
          ) {
            this.error(
              `${personaName} is not a persona or team`,
              ref.span,
              ErrorCode.TYPE_MISMATCH,
              `Only personas and teams can be team members`
            );
          }
        }
      } else if (member.kind === 'TeamPrimaryDeclaration') {
        const primaryRef = (member as AST.TeamPrimaryDeclaration).primary;
        const personaName = this.getPersonaRefName(primaryRef);
        const persona = this.currentScope.lookup(personaName);
        if (!persona) {
          this.error(
            `Unknown persona: ${personaName}`,
            primaryRef.span,
            ErrorCode.TYPE_UNKNOWN,
            `Define the persona '${personaName}' before setting it as primary`
          );
        } else if (
          !teamSymbol.type.members.some((m) => m.name === personaName)
        ) {
          const availableMembers = memberList.join(', ');
          this.error(
            `Primary persona ${personaName} is not a team member`,
            primaryRef.span,
            ErrorCode.SEMANTIC_INVALID_PRIMARY,
            `Add '${personaName}' to the members list, or choose from available members: ${availableMembers}`
          );
        }
      } else if (member.kind === 'TeamQuorumDeclaration') {
        quorumDecl = member as AST.TeamQuorumDeclaration;
      } else if (member.kind === 'TeamConflictDeclaration') {
        conflictDecl = member as AST.TeamConflictDeclaration;
      }
    }

    // Phase 1.0A: Quorum consistency check
    if (quorumDecl) {
      this.validateTeamQuorum(quorumDecl, memberList.length, decl.span);
    }

    // Phase 1.0A: Conflict order completeness check
    if (conflictDecl) {
      this.validateTeamConflict(conflictDecl, memberList, decl.span);
    }

    // Phase 1.0A: Circular reference detection
    this.detectCircularTeamReferences(decl.id.name, new Set(), decl.span);
  }

  /**
   * Phase 1.0A: Validate quorum does not exceed member count
   */
  private validateTeamQuorum(
    quorumDecl: AST.TeamQuorumDeclaration,
    memberCount: number,
    span: Span
  ): void {
    const required = quorumDecl.required.value;
    const total = quorumDecl.total.value;

    if (required > memberCount) {
      this.error(
        `Quorum ${required}/${total} exceeds member count ${memberCount}`,
        span,
        ErrorCode.SEMANTIC_INVALID_QUORUM,
        `Change quorum to at most ${memberCount}/${total}, or add more team members`
      );
    }

    if (total > memberCount) {
      this.warning(
        `Quorum total ${total} exceeds member count ${memberCount}`,
        span,
        ErrorCode.SEMANTIC_INVALID_QUORUM,
        `Consider changing quorum total to ${memberCount} to match actual team size`
      );
    }

    if (required > total) {
      this.error(
        `Quorum required ${required} cannot exceed total ${total}`,
        span,
        ErrorCode.SEMANTIC_INVALID_QUORUM,
        `Change quorum to ${total}/${total} for unanimity, or reduce the required count`
      );
    }
  }

  /**
   * Phase 1.0A: Validate all members are in conflict resolution order
   */
  private validateTeamConflict(
    conflictDecl: AST.TeamConflictDeclaration,
    memberList: string[],
    span: Span
  ): void {
    const conflictOrder = conflictDecl.order.map((ref) =>
      this.getPersonaRefName(ref)
    );

    const missingFromConflict = memberList.filter(
      (m) => !conflictOrder.includes(m)
    );

    if (missingFromConflict.length > 0) {
      const fullOrder = [...conflictOrder, ...missingFromConflict].join(' > ');
      this.warning(
        `Members not in conflict resolution order: ${missingFromConflict.join(', ')}`,
        span,
        ErrorCode.SEMANTIC_CONFLICT_ORDER,
        `Add all members to conflict order, e.g.: conflict: ${fullOrder}`
      );
    }

    // Also check for personas in conflict order that aren't members
    const notInMembers = conflictOrder.filter((c) => !memberList.includes(c));
    if (notInMembers.length > 0) {
      this.error(
        `Conflict resolution order includes non-members: ${notInMembers.join(', ')}`,
        span,
        ErrorCode.SEMANTIC_CONFLICT_ORDER,
        `Remove ${notInMembers.join(', ')} from conflict order, or add them to the members list`
      );
    }
  }

  /**
   * Phase 1.0A: Detect circular team references (team-in-team cycles)
   */
  private detectCircularTeamReferences(
    teamName: string,
    visited: Set<string>,
    span: Span
  ): boolean {
    if (visited.has(teamName)) {
      this.error(
        `Circular team reference detected: ${Array.from(visited).join(' -> ')} -> ${teamName}`,
        span
      );
      return true;
    }

    visited.add(teamName);
    const teamSymbol = this.currentScope.lookup(teamName);

    if (!teamSymbol || !(teamSymbol.type instanceof TeamType)) {
      return false;
    }

    // Check if any team members are themselves teams
    for (const member of teamSymbol.type.members) {
      const memberSymbol = this.currentScope.lookup(member.name);
      if (memberSymbol?.type instanceof TeamType) {
        if (
          this.detectCircularTeamReferences(member.name, new Set(visited), span)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private checkWorkflow(decl: AST.WorkflowDeclaration): void {
    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowStepsDeclaration') {
        this.checkWorkflowExpression(
          (member as AST.WorkflowStepsDeclaration).steps
        );
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
      case 'WorkflowParallelExpr': {
        const parallelExpr = expr as AST.WorkflowParallelExpr;

        // Phase 1.0B: Warn if too many parallel branches
        if (parallelExpr.branches.length > 10) {
          this.warning(
            `Too many parallel branches (${parallelExpr.branches.length}). Consider refactoring for maintainability.`,
            expr.span,
            ErrorCode.SEMANTIC_TOO_MANY_BRANCHES,
            `Split into smaller sub-workflows or use sequential processing with -> operator`
          );
        }

        for (const branch of parallelExpr.branches) {
          this.checkWorkflowExpression(branch);
        }
        break;
      }
      case 'WorkflowChoiceExpr':
        for (const branch of (expr as AST.WorkflowChoiceExpr).branches) {
          this.checkWorkflowExpression(branch);
        }
        break;
      case 'WorkflowGroupExpr':
        this.checkWorkflowExpression((expr as AST.WorkflowGroupExpr).expr);
        break;
      case 'WorkflowConditionalExpr': {
        const cond = expr as AST.WorkflowConditionalExpr;
        this.checkExpression(cond.condition);

        // Phase 1.0B: Detect unreachable branches
        const conditionValue = this.evaluateConstantCondition(cond.condition);
        if (conditionValue === true && cond.else) {
          this.warning(
            'Unreachable code: else branch will never execute because condition is always true',
            cond.else.span,
            ErrorCode.SEMANTIC_UNREACHABLE_CODE,
            `Remove the else branch or change the condition to a dynamic expression`
          );
        } else if (conditionValue === false) {
          this.warning(
            'Unreachable code: then branch will never execute because condition is always false',
            cond.then.span,
            ErrorCode.SEMANTIC_UNREACHABLE_CODE,
            `Remove the then branch or change the condition to a dynamic expression`
          );
        }

        this.checkWorkflowExpression(cond.then);
        if (cond.else) this.checkWorkflowExpression(cond.else);
        break;
      }
      case 'WorkflowLoopExpr': {
        const loop = expr as AST.WorkflowLoopExpr;

        // Phase 1.0B: Detect infinite loops
        if (loop.loopType === 'while' && loop.condition) {
          const conditionValue = this.evaluateConstantCondition(loop.condition);
          if (conditionValue === true) {
            this.warning(
              'Potential infinite loop: while condition is always true',
              expr.span,
              ErrorCode.SEMANTIC_INFINITE_LOOP,
              `Use a dynamic condition that can become false, or use 'loop N times' for bounded iteration`
            );
          } else if (conditionValue === false) {
            this.warning(
              'Unreachable code: loop body will never execute because while condition is always false',
              loop.body.span,
              ErrorCode.SEMANTIC_UNREACHABLE_CODE,
              `Remove the loop or use a condition that can be true`
            );
          }
        }

        if (loop.loopType === 'until' && loop.condition) {
          const conditionValue = this.evaluateConstantCondition(loop.condition);
          if (conditionValue === false) {
            this.warning(
              'Potential infinite loop: until condition is always false',
              expr.span,
              ErrorCode.SEMANTIC_INFINITE_LOOP,
              `Use a dynamic condition that can become true, or use 'loop N times' for bounded iteration`
            );
          } else if (conditionValue === true) {
            this.warning(
              'Unreachable code: loop body will never execute because until condition is already true',
              loop.body.span,
              ErrorCode.SEMANTIC_UNREACHABLE_CODE,
              `Remove the loop or use a condition that starts false`
            );
          }
        }

        if (loop.loopType === 'times' && loop.count) {
          // Check if count is a literal 0
          if (
            loop.count.kind === 'NumberLiteral' &&
            (loop.count as AST.NumberLiteral).value === 0
          ) {
            this.warning(
              'Unreachable code: loop will never execute (count is 0)',
              loop.body.span,
              ErrorCode.SEMANTIC_UNREACHABLE_CODE,
              `Remove the loop or change count to a positive number`
            );
          }
        }

        this.checkWorkflowExpression(loop.body);
        if (loop.condition) this.checkExpression(loop.condition);
        break;
      }
      case 'WorkflowPersonaRef':
        const personaName = this.getPersonaRefName(
          (expr as AST.WorkflowPersonaRef).ref
        );
        const persona = this.currentScope.lookup(personaName);
        if (!persona) {
          this.error(`Unknown persona: ${personaName}`, expr.span);
        } else if (
          !(persona.type instanceof PersonaType) &&
          !(persona.type instanceof TeamType)
        ) {
          this.error(`${personaName} is not a persona or team`, expr.span);
        }
        break;
    }
  }

  /**
   * Phase 1.0B: Evaluate constant conditions for unreachable code detection
   * Returns true/false if the condition is a constant, or null if it's dynamic
   */
  private evaluateConstantCondition(expr: AST.Expression): boolean | null {
    switch (expr.kind) {
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value;

      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value !== 0;

      case 'StringLiteral':
        return (expr as AST.StringLiteral).value.length > 0;

      case 'NullLiteral':
        return false;

      case 'ParenthesizedExpression':
        // Unwrap parenthesized expressions
        return this.evaluateConstantCondition(
          (expr as AST.ParenthesizedExpression).expression
        );

      case 'UnaryExpression': {
        const unary = expr as AST.UnaryExpression;
        if (unary.operator === '!') {
          const argumentValue = this.evaluateConstantCondition(unary.argument);
          return argumentValue !== null ? !argumentValue : null;
        }
        break;
      }

      case 'BinaryExpression': {
        const binary = expr as AST.BinaryExpression;
        const left = this.evaluateConstantCondition(binary.left);
        const right = this.evaluateConstantCondition(binary.right);

        if (left !== null && right !== null) {
          switch (binary.operator) {
            case '&&':
              return left && right;
            case '||':
              return left || right;
            case '==':
              return left === right;
            case '!=':
              return left !== right;
          }
        }
        break;
      }
    }

    // Not a constant condition
    return null;
  }

  private checkFunction(decl: AST.FunctionDeclaration): void {
    if (!decl.body) return;

    // Enter function scope
    const funcScope = this.createScope(this.currentScope, 'Function');
    funcScope.declaration = decl;
    const savedScope = this.currentScope;
    this.currentScope = funcScope;

    // Add parameters to function scope
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
    const methodScope = this.createScope(this.currentScope, decl.name.name);
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
      this.warning(
        `Condition should be a boolean, got '${testType.toString()}'`,
        stmt.test.span
      );
    }

    // Create narrowing context for then branch
    const savedContext = this.narrowingContext;
    this.narrowingContext = this.createNarrowingContext(savedContext);

    // Apply type narrowing based on test expression
    this.applyTypeNarrowing(stmt.test, true);

    // Check then branch with narrowed types
    this.checkBlock(stmt.consequent);

    // Restore context
    this.narrowingContext = savedContext;

    // Handle else branch
    if (stmt.alternate) {
      // Create narrowing context for else branch
      this.narrowingContext = this.createNarrowingContext(savedContext);

      // Apply negated narrowing (opposite of test)
      this.applyTypeNarrowing(stmt.test, false);

      if (stmt.alternate.kind === 'IfStatement') {
        this.checkIfStatement(stmt.alternate as AST.IfStatement);
      } else {
        this.checkBlock(stmt.alternate as AST.BlockStatement);
      }

      // Restore context
      this.narrowingContext = savedContext;
    }
  }

  private checkForStatement(
    stmt: AST.ForStatement | AST.ForInStatement | AST.ForOfStatement
  ): void {
    const loopScope = this.createScope(this.currentScope, 'for');
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
      const catchScope = this.createScope(this.currentScope, 'catch');
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
    } else if (
      this.returnType &&
      !BuiltinTypes.Void.isAssignableTo(this.returnType)
    ) {
      this.error('Missing return value', stmt.span);
    }
  }

  private checkBlock(block: AST.BlockStatement): void {
    const blockScope = this.createScope(this.currentScope, 'block');
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
        return new LiteralType(
          (expr as AST.StringLiteral).value,
          BuiltinTypes.String
        );

      case 'NumberLiteral':
        const num = expr as AST.NumberLiteral;
        const isInt = Number.isInteger(num.value);
        return new LiteralType(
          num.value,
          isInt ? BuiltinTypes.Int : BuiltinTypes.Float
        );

      case 'BooleanLiteral':
        return new LiteralType(
          (expr as AST.BooleanLiteral).value,
          BuiltinTypes.Bool
        );

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
        return this.inferConditionalExpression(
          expr as AST.ConditionalExpression
        );

      case 'AssignmentExpression':
        return this.inferAssignmentExpression(expr as AST.AssignmentExpression);

      case 'MatchExpression':
        return this.inferMatchExpression(expr as AST.MatchExpression);

      case 'AwaitExpression':
        return this.inferExpressionType((expr as AST.AwaitExpression).argument);

      case 'ParenthesizedExpression':
        return this.inferExpressionType(
          (expr as AST.ParenthesizedExpression).expression
        );

      default:
        return BuiltinTypes.Any;
    }
  }

  private inferIdentifier(id: AST.Identifier): Type {
    // Check for narrowed type first (from control flow analysis)
    const narrowedType = this.getNarrowedType(id.name);
    if (narrowedType) {
      return narrowedType;
    }

    // Fall back to symbol lookup
    const symbol = this.currentScope.lookup(id.name);
    if (!symbol) {
      this.error(`Unknown identifier: ${id.name}`, id.span);
      return BuiltinTypes.Any;
    }

    // Check module visibility
    this.checkSymbolAccess(symbol, id.span);

    return symbol.type;
  }

  private inferBinaryExpression(expr: AST.BinaryExpression): Type {
    const leftType = this.inferExpressionType(expr.left);
    const rightType = this.inferExpressionType(expr.right);

    switch (expr.operator) {
      // Arithmetic
      case '+':
        if (
          leftType.isAssignableTo(BuiltinTypes.String) ||
          rightType.isAssignableTo(BuiltinTypes.String)
        ) {
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
      const requiredParams = calleeType.parameters.filter(
        (p) => !p.optional && !p.rest
      ).length;
      if (expr.arguments.length < requiredParams) {
        this.error(
          `Expected ${requiredParams} arguments, got ${expr.arguments.length}`,
          expr.span
        );
      }

      // Check argument types
      for (
        let i = 0;
        i < expr.arguments.length && i < calleeType.parameters.length;
        i++
      ) {
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

      this.error(
        `Property '${propertyName}' does not exist on type`,
        expr.span
      );
      return BuiltinTypes.Any;
    }

    if (objectType instanceof PersonaType) {
      const method = objectType.getMethod(propertyName);
      if (method) return method;

      this.error(
        `Method '${propertyName}' does not exist on persona '${objectType.name}'`,
        expr.span
      );
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
      if (
        indexType instanceof LiteralType &&
        typeof indexType.value === 'number'
      ) {
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
        const spreadType = this.inferExpressionType(
          (element as AST.SpreadElement).argument
        );
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
        const name =
          kvProp.key.kind === 'Identifier'
            ? kvProp.key.name
            : String(
                kvProp.key.kind === 'StringLiteral'
                  ? kvProp.key.value
                  : kvProp.key.value
              );

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
        const name =
          methodProp.key.kind === 'Identifier'
            ? methodProp.key.name
            : String(methodProp.key.value);
        const params: FunctionParameter[] = methodProp.parameters.map((p) => ({
          name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
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
    const params: FunctionParameter[] = expr.parameters.map((p) => ({
      name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
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
    const params: FunctionParameter[] = expr.parameters.map((p) => ({
      name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));

    const returnType = expr.returnType
      ? this.resolveTypeNode(expr.returnType)
      : BuiltinTypes.Void;

    const typeVars = expr.typeParameters.map(
      (tp) =>
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
    const leftType =
      expr.left.kind === 'Identifier'
        ? this.inferExpressionType(expr.left as AST.Identifier)
        : BuiltinTypes.Unknown;
    const rightType = this.inferExpressionType(expr.right);

    if (!rightType.isAssignableTo(leftType)) {
      this.error(
        `Type '${rightType.toString()}' is not assignable to type '${leftType.toString()}'`,
        expr.span
      );
    }

    // Check mutability
    if (expr.left.kind === 'Identifier') {
      const symbol = this.currentScope.lookup(
        (expr.left as AST.Identifier).name
      );
      if (symbol && !symbol.mutable) {
        this.error(
          `Cannot assign to immutable variable '${symbol.name}'`,
          expr.span
        );
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
        caseTypes.push(
          this.inferExpressionType(c.consequent as AST.Expression)
        );
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
        const unionTypes = (node as AST.UnionType).types.map((t) =>
          this.resolveTypeNode(t)
        );
        return UnionType.create(unionTypes);

      case 'IntersectionType':
        const intersectionTypes = (node as AST.IntersectionType).types.map(
          (t) => this.resolveTypeNode(t)
        );
        return IntersectionType.create(intersectionTypes);

      case 'ArrayType':
        return new ArrayType(
          this.resolveTypeNode((node as AST.ArrayType).elementType)
        );

      case 'TupleType':
        return new TupleType(
          (node as AST.TupleType).elements.map((e) => this.resolveTypeNode(e))
        );

      case 'FunctionType':
        const funcNode = node as AST.FunctionType;
        const params: FunctionParameter[] = funcNode.parameters.map((p) => ({
          name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
          type: this.resolveTypeNode(p.type),
          optional: false,
          rest: false,
        }));
        return new FunctionType(
          params,
          this.resolveTypeNode(funcNode.returnType)
        );

      case 'ObjectType':
        const members = new Map<string, ObjectTypeMember>();
        for (const member of (node as AST.ObjectType).members) {
          if (member.kind === 'PropertySignature') {
            const prop = member as AST.PropertySignature;
            const name =
              typeof prop.name === 'string'
                ? prop.name
                : prop.name.kind === 'Identifier'
                  ? prop.name.name
                  : prop.name.value;
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
    const name = ref.typeName.parts.map((p) => p.name).join('::');

    // Check built-in types
    const builtin = this.currentScope.lookupType(name);
    if (builtin) {
      if (ref.typeArguments.length > 0) {
        const args = ref.typeArguments.map((a) => this.resolveTypeNode(a));
        return new GenericType(builtin, args);
      }
      return builtin;
    }

    // Check declared types
    const symbol = this.currentScope.lookup(name);
    if (symbol) {
      if (ref.typeArguments.length > 0) {
        const args = ref.typeArguments.map((a) => this.resolveTypeNode(a));
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
    const params: FunctionParameter[] = decl.parameters.map((p) => ({
      name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));

    const returnType = decl.returnType
      ? this.resolveTypeNode(decl.returnType)
      : BuiltinTypes.Void;

    const typeVars = decl.typeParameters.map(
      (tp) =>
        new TypeVariable(
          tp.name.name,
          tp.constraint ? this.resolveTypeNode(tp.constraint) : undefined,
          tp.default ? this.resolveTypeNode(tp.default) : undefined
        )
    );

    return new FunctionType(params, returnType, typeVars);
  }

  private methodToFunctionType(decl: AST.MethodDeclaration): FunctionType {
    const params: FunctionParameter[] = decl.parameters.map((p) => ({
      name: p.name && p.name.kind === 'Identifier' ? p.name.name : '',
      type: p.type ? this.resolveTypeNode(p.type) : BuiltinTypes.Any,
      optional: p.optional,
      rest: p.rest,
    }));

    const returnType = decl.returnType
      ? this.resolveTypeNode(decl.returnType)
      : BuiltinTypes.Void;

    const typeVars = decl.typeParameters.map(
      (tp) =>
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
      return ref.ref.path.parts.map((p) => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return ref.ref.persona.name;
    }
    return '';
  }

  private hasModifier(
    modifiers: readonly AST.Modifier[],
    type: string
  ): boolean {
    return modifiers.some((m) => m.type === type);
  }

  /**
   * Extract visibility from modifiers
   */
  private getVisibility(modifiers: readonly AST.Modifier[]): 'pub' | 'priv' {
    if (this.hasModifier(modifiers, 'pub')) return 'pub';
    if (this.hasModifier(modifiers, 'priv')) return 'priv';
    return 'priv'; // Default to private
  }

  /**
   * Create a symbol with visibility and module information
   */
  private createSymbol(
    name: string,
    kind: SymbolKind,
    type: Type,
    declaration: AST.ASTNode | null,
    span: Span,
    options: {
      exported?: boolean;
      mutable?: boolean;
      modifiers?: readonly AST.Modifier[];
    } = {}
  ): Symbol {
    return {
      name,
      kind,
      type,
      declaration,
      span,
      scope: this.currentScope,
      exported: options.exported ?? false,
      mutable: options.mutable ?? false,
      visibility: options.modifiers
        ? this.getVisibility(options.modifiers)
        : 'priv',
      module: this.currentModule?.path,
    };
  }

  /**
   * Validate exported symbols
   */
  private validateExports(): void {
    if (!this.currentModule) return;

    for (const [name, symbol] of this.currentModule.exports) {
      // Verify symbol exists in scope
      const found = this.globalScope.lookup(name);
      if (!found) {
        this.error(`Exported symbol '${name}' is not defined`, symbol.span);
        continue;
      }

      // Warn if exporting a private symbol
      if (found.visibility === 'priv') {
        this.warning(
          `Exporting private symbol '${name}'. Consider marking it as 'pub'`,
          symbol.span
        );
      }
    }
  }

  /**
   * Check if a symbol can be accessed from the current module
   */
  private checkSymbolAccess(symbol: Symbol, accessSpan?: Span): boolean {
    // No module tracking - allow all access (backward compatibility)
    if (!this.currentModule || !symbol.module) {
      return true;
    }

    // Symbol is public or explicitly exported - allow access
    if (symbol.visibility === 'pub' || symbol.exported) {
      return true;
    }

    // Symbol is in same module - allow access
    if (symbol.module === this.currentModule.path) {
      return true;
    }

    // Private symbol accessed from different module - error
    if (accessSpan) {
      this.error(
        `Cannot access private symbol '${symbol.name}' from module '${symbol.module}'`,
        accessSpan
      );
    }
    return false;
  }

  /**
   * Convert typeof string to actual type
   */
  private typeFromTypeofString(typeString: string): Type | null {
    switch (typeString) {
      case 'string':
        return BuiltinTypes.String;
      case 'number':
        return BuiltinTypes.Float;
      case 'boolean':
        return BuiltinTypes.Bool;
      case 'object':
        return BuiltinTypes.Any; // Could be more specific
      case 'function':
        return new FunctionType([], BuiltinTypes.Any);
      default:
        return null;
    }
  }

  /**
   * Narrow type based on typeof check
   * Handles: typeof x === "string", typeof x === "number", etc.
   */
  private narrowTypeByTypeofCheck(
    expr: AST.BinaryExpression,
    trueBranch: boolean
  ): void {
    // Handle: typeof x === "string"
    if (expr.operator === '===' || expr.operator === '==') {
      const { left, right } = expr;

      // Check if left is typeof expression and right is string literal
      if (
        left.kind === 'UnaryExpression' &&
        (left as AST.UnaryExpression).operator === 'typeof' &&
        right.kind === 'StringLiteral'
      ) {
        const varExpr = (left as AST.UnaryExpression).argument;
        if (varExpr.kind === 'Identifier') {
          const typeString = (right as AST.StringLiteral).value;
          const narrowedType = this.typeFromTypeofString(typeString);

          if (trueBranch && narrowedType) {
            this.setNarrowedType(
              (varExpr as AST.Identifier).name,
              narrowedType
            );
          }
        }
      }

      // Also handle reverse: "string" === typeof x
      if (
        left.kind === 'StringLiteral' &&
        right.kind === 'UnaryExpression' &&
        (right as AST.UnaryExpression).operator === 'typeof'
      ) {
        const varExpr = (right as AST.UnaryExpression).argument;
        if (varExpr.kind === 'Identifier') {
          const typeString = (left as AST.StringLiteral).value;
          const narrowedType = this.typeFromTypeofString(typeString);

          if (trueBranch && narrowedType) {
            this.setNarrowedType(
              (varExpr as AST.Identifier).name,
              narrowedType
            );
          }
        }
      }
    }
  }

  /**
   * Narrow type based on null/undefined check
   * Handles: x !== null, x != null, x === null, etc.
   */
  private narrowTypeByNullCheck(
    expr: AST.BinaryExpression,
    trueBranch: boolean
  ): void {
    const { left, right, operator } = expr;

    // Check for x !== null or x != null
    if (
      (operator === '!==' || operator === '!=') &&
      left.kind === 'Identifier' &&
      right.kind === 'NullLiteral'
    ) {
      if (trueBranch) {
        // In true branch, remove null from union type
        const symbol = this.currentScope.lookup((left as AST.Identifier).name);
        if (symbol && symbol.type instanceof UnionType) {
          const nonNullTypes = symbol.type.members.filter(
            (t: Type) => t !== BuiltinTypes.Null && t.toString() !== 'null'
          );
          if (nonNullTypes.length > 0) {
            const narrowed =
              nonNullTypes.length === 1
                ? nonNullTypes[0]
                : new UnionType(nonNullTypes);
            this.setNarrowedType((left as AST.Identifier).name, narrowed);
          }
        }
      }
    }

    // Check for x === null
    if (
      (operator === '===' || operator === '==') &&
      left.kind === 'Identifier' &&
      right.kind === 'NullLiteral'
    ) {
      if (trueBranch) {
        // In true branch, narrow to null type
        this.setNarrowedType((left as AST.Identifier).name, BuiltinTypes.Null);
      }
    }
  }

  /**
   * Apply type narrowing based on an expression
   */
  private applyTypeNarrowing(expr: AST.Expression, truthy: boolean): void {
    switch (expr.kind) {
      case 'BinaryExpression':
        const binExpr = expr as AST.BinaryExpression;
        this.narrowTypeByTypeofCheck(binExpr, truthy);
        this.narrowTypeByNullCheck(binExpr, truthy);
        break;

      case 'UnaryExpression':
        // Handle negation - flip truthiness
        const unExpr = expr as AST.UnaryExpression;
        if (unExpr.operator === '!') {
          this.applyTypeNarrowing(unExpr.argument, !truthy);
        }
        break;

      // Could add more narrowing patterns here:
      // - Identifier (truthiness narrowing)
      // - Member expressions
      // - Call expressions (custom type guards)
    }
  }

  /**
   * Create a new narrowing context for control flow analysis
   */
  private createNarrowingContext(
    parent: NarrowingContext | null
  ): NarrowingContext {
    return {
      narrowedTypes: new Map(),
      parent,
    };
  }

  /**
   * Get narrowed type for a variable in current context
   */
  private getNarrowedType(name: string): Type | undefined {
    let ctx = this.narrowingContext;
    while (ctx) {
      const narrowed = ctx.narrowedTypes.get(name);
      if (narrowed) return narrowed;
      ctx = ctx.parent;
    }
    return undefined;
  }

  /**
   * Set narrowed type for a variable in current context
   */
  private setNarrowedType(name: string, type: Type): void {
    if (this.narrowingContext) {
      this.narrowingContext.narrowedTypes.set(name, type);
    }
  }

  private createScope(parent: Scope | null, kind: string): Scope {
    return new Scope(kind, parent);
  }

  /**
   * Generate rich error message with code snippet
   */
  private formatErrorWithContext(
    message: string,
    span?: Span,
    suggestion?: string
  ): string {
    if (!span || !this.sourceCode) {
      // No span or source code - return simple message
      if (suggestion) {
        return `${message}\n\nSuggestion: ${suggestion}`;
      }
      return message;
    }

    const lines = this.sourceCode.split('\n');
    const errorLine = span.start.line;
    const errorCol = span.start.column;

    // Validate line number
    if (errorLine < 1 || errorLine > lines.length) {
      return message;
    }

    const lineContent = lines[errorLine - 1];

    // Build rich error message
    let richMessage = message + '\n\n';

    // Source location
    richMessage += `  ${this.source}:${errorLine}:${errorCol}\n\n`;

    // Show the error line with line number
    const lineNumStr = String(errorLine);
    const lineNumWidth = lineNumStr.length;
    const padding = ' '.repeat(lineNumWidth + 1);

    richMessage += `${padding}|\n`;
    richMessage += `${lineNumStr} | ${lineContent}\n`;
    richMessage += `${padding}| ${' '.repeat(errorCol - 1)}^\n`;

    // Add suggestion if provided
    if (suggestion) {
      richMessage += `\nSuggestion: ${suggestion}`;
    }

    return richMessage;
  }

  private error(
    message: string,
    span?: Span,
    code: string = ErrorCode.TYPE_MISMATCH,
    suggestion?: string
  ): void {
    const richMessage = this.formatErrorWithContext(message, span, suggestion);
    this.errors.push(createError(code, richMessage, { span }));
  }

  private warning(
    message: string,
    span?: Span,
    code: string = ErrorCode.TYPE_MISMATCH,
    suggestion?: string
  ): void {
    const richMessage = this.formatErrorWithContext(message, span, suggestion);
    this.warnings.push(createError(code, richMessage, { span }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new symbol table
 */
export function createSymbolTable(): SymbolTable {
  return new SymbolTable();
}

/**
 * Create a new type checker
 */
export function createTypeChecker(): TypeChecker {
  return new TypeChecker();
}

/**
 * Symbol flags for additional metadata
 */
export const SymbolFlags = {
  None: 0,
  Exported: 1 << 0,
  Mutable: 1 << 1,
  Readonly: 1 << 2,
  Optional: 1 << 3,
  Deprecated: 1 << 4,
} as const;

export type SymbolFlags = (typeof SymbolFlags)[keyof typeof SymbolFlags];

/**
 * Scope kinds for symbol table scopes
 */
export const ScopeKind = {
  Global: 'global',
  Module: 'module',
  Function: 'function',
  Block: 'block',
  Loop: 'loop',
  Catch: 'catch',
} as const;

export type ScopeKind = (typeof ScopeKind)[keyof typeof ScopeKind];

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
