/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Abstract Syntax Tree Node Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @packageDocumentation
 * @module @pcl/ast
 * @version 1.0.0
 */

import type {
  BackoffStrategy,
  ComparisonOp,
  HookType,
  MergeMode,
  Span,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              BASE NODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  readonly kind: string;
  readonly span: Span;
}

/**
 * All possible AST node types
 */
export type Node =
  | Program
  | Statement
  | Expression
  | Declaration
  | TypeNode
  | Pattern;

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROGRAM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Root program node
 */
export interface Program extends ASTNode {
  readonly kind: 'Program';
  readonly statements: readonly Statement[];
  readonly comments: readonly Comment[];
}

/**
 * Comment node
 */
export interface Comment extends ASTNode {
  readonly kind: 'Comment';
  readonly type: 'line' | 'block' | 'doc';
  readonly value: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type Statement =
  | Declaration
  | ExpressionStatement
  | ControlStatement
  | CommandStatement
  | EmptyStatement
  | BlockStatement;

export interface ExpressionStatement extends ASTNode {
  readonly kind: 'ExpressionStatement';
  readonly expression: Expression;
}

export interface EmptyStatement extends ASTNode {
  readonly kind: 'EmptyStatement';
}

export interface BlockStatement extends ASTNode {
  readonly kind: 'BlockStatement';
  readonly statements: readonly Statement[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type Declaration =
  | PersonaDeclaration
  | TeamDeclaration
  | WorkflowDeclaration
  | SkillDeclaration
  | TypeDeclaration
  | InterfaceDeclaration
  | EnumDeclaration
  | FunctionDeclaration
  | VariableDeclaration
  | ImportDeclaration
  | ExportDeclaration
  | ModuleDeclaration;

// ─────────────────────────────────────────────────────────────────────────────
//                           Persona Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaDeclaration extends ASTNode {
  readonly kind: 'PersonaDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly extends: readonly TypeReference[];
  readonly implements: readonly TypeReference[];
  readonly capabilities: readonly TypeReference[];
  readonly body: PersonaBody;
}

export interface PersonaBody extends ASTNode {
  readonly kind: 'PersonaBody';
  readonly members: readonly PersonaMember[];
}

export type PersonaMember =
  | PropertyDeclaration
  | MethodDeclaration
  | SkillBlock
  | ConstraintBlock
  | TagBlock
  | HookDeclaration
  | PersonaDeclaration; // Nested persona

export interface PropertyDeclaration extends ASTNode {
  readonly kind: 'PropertyDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly name: Identifier;
  readonly optional: boolean;
  readonly type: TypeNode | null;
  readonly initializer: Expression | null;
}

export interface MethodDeclaration extends ASTNode {
  readonly kind: 'MethodDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly async: boolean;
  readonly name: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode | null;
  readonly body: BlockStatement | null;
}

export interface Parameter extends ASTNode {
  readonly kind: 'Parameter';
  readonly decorators: readonly Decorator[];
  readonly rest: boolean;
  readonly name: Identifier | Pattern;
  readonly optional: boolean;
  readonly type: TypeNode | null;
  readonly initializer: Expression | null;
}

export interface SkillBlock extends ASTNode {
  readonly kind: 'SkillBlock';
  readonly items: readonly SkillItem[];
}

export type SkillItem =
  | {
      readonly kind: 'StringSkill';
      readonly value: string;
      readonly span: Span;
    }
  | {
      readonly kind: 'IdentifierSkill';
      readonly name: Identifier;
      readonly span: Span;
    }
  | {
      readonly kind: 'RefSkill';
      readonly ref: QualifiedIdentifier;
      readonly span: Span;
    };

export interface ConstraintBlock extends ASTNode {
  readonly kind: 'ConstraintBlock';
  readonly items: readonly ConstraintItem[];
}

export type ConstraintItem =
  | {
      readonly kind: 'StringConstraint';
      readonly value: string;
      readonly span: Span;
    }
  | {
      readonly kind: 'ExprConstraint';
      readonly field: Identifier;
      readonly op: ComparisonOp;
      readonly value: Expression;
      readonly span: Span;
    };

export interface TagBlock extends ASTNode {
  readonly kind: 'TagBlock';
  readonly items: readonly TagItem[];
}

export type TagItem =
  | { readonly kind: 'StringTag'; readonly value: string; readonly span: Span }
  | {
      readonly kind: 'IdentifierTag';
      readonly name: Identifier;
      readonly span: Span;
    };

export interface HookDeclaration extends ASTNode {
  readonly kind: 'HookDeclaration';
  readonly hookType: HookType;
  readonly parameters: readonly Parameter[];
  readonly body: BlockStatement;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Team Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamDeclaration extends ASTNode {
  readonly kind: 'TeamDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly body: TeamBody;
}

export interface TeamBody extends ASTNode {
  readonly kind: 'TeamBody';
  readonly members: readonly TeamMember[];
}

export type TeamMember =
  | TeamMembersDeclaration
  | TeamPrimaryDeclaration
  | TeamMergeDeclaration
  | TeamQuorumDeclaration
  | TeamConflictDeclaration
  | PropertyDeclaration
  | HookDeclaration;

export interface TeamMembersDeclaration extends ASTNode {
  readonly kind: 'TeamMembersDeclaration';
  readonly members: readonly PersonaReference[];
}

export interface TeamPrimaryDeclaration extends ASTNode {
  readonly kind: 'TeamPrimaryDeclaration';
  readonly primary: PersonaReference;
}

export interface TeamMergeDeclaration extends ASTNode {
  readonly kind: 'TeamMergeDeclaration';
  readonly mode: MergeModeNode;
}

export interface TeamQuorumDeclaration extends ASTNode {
  readonly kind: 'TeamQuorumDeclaration';
  readonly required: NumberLiteral;
  readonly total: NumberLiteral;
}

export interface TeamConflictDeclaration extends ASTNode {
  readonly kind: 'TeamConflictDeclaration';
  readonly order: readonly PersonaReference[];
}

export interface PersonaReference extends ASTNode {
  readonly kind: 'PersonaReference';
  readonly ref:
    | { readonly type: 'id'; readonly id: Identifier }
    | { readonly type: 'qualified'; readonly path: QualifiedIdentifier }
    | {
        readonly type: 'spawn';
        readonly count: NumberLiteral;
        readonly persona: Identifier;
      };
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Workflow Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowDeclaration extends ASTNode {
  readonly kind: 'WorkflowDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly body: WorkflowBody;
}

export interface WorkflowBody extends ASTNode {
  readonly kind: 'WorkflowBody';
  readonly members: readonly WorkflowMember[];
}

export type WorkflowMember =
  | WorkflowInputDeclaration
  | WorkflowOutputDeclaration
  | WorkflowStepsDeclaration
  | WorkflowTimeoutDeclaration
  | WorkflowRetryDeclaration
  | WorkflowFallbackDeclaration
  | WorkflowConditionDeclaration
  | PropertyDeclaration
  | HookDeclaration;

export interface WorkflowInputDeclaration extends ASTNode {
  readonly kind: 'WorkflowInputDeclaration';
  readonly type: TypeNode;
}

export interface WorkflowOutputDeclaration extends ASTNode {
  readonly kind: 'WorkflowOutputDeclaration';
  readonly type: TypeNode;
}

export interface WorkflowStepsDeclaration extends ASTNode {
  readonly kind: 'WorkflowStepsDeclaration';
  readonly steps: WorkflowExpression;
}

export interface WorkflowTimeoutDeclaration extends ASTNode {
  readonly kind: 'WorkflowTimeoutDeclaration';
  readonly duration: DurationLiteral;
}

export interface WorkflowRetryDeclaration extends ASTNode {
  readonly kind: 'WorkflowRetryDeclaration';
  readonly config: NumberLiteral | RetryConfigNode;
}

export interface RetryConfigNode extends ASTNode {
  readonly kind: 'RetryConfigNode';
  readonly count: NumberLiteral;
  readonly delay: DurationLiteral | null;
  readonly backoff: BackoffStrategy | null;
  readonly maxDelay: DurationLiteral | null;
  readonly jitter: boolean;
}

export interface WorkflowFallbackDeclaration extends ASTNode {
  readonly kind: 'WorkflowFallbackDeclaration';
  readonly fallback: PersonaReference;
}

export interface WorkflowConditionDeclaration extends ASTNode {
  readonly kind: 'WorkflowConditionDeclaration';
  readonly condition: Expression;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Workflow Expressions
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowExpression =
  | WorkflowPersonaRef
  | WorkflowSequenceExpr
  | WorkflowParallelExpr
  | WorkflowChoiceExpr
  | WorkflowTransformExpr
  | WorkflowGroupExpr
  | WorkflowConditionalExpr
  | WorkflowLoopExpr
  | WorkflowCallExpr
  | WorkflowMergeExpr
  | WorkflowAsyncPipeExpr
  | WorkflowBidirectionalExpr
  | WorkflowAccumulateExpr
  | WorkflowComposeExpr
  | WorkflowBreakStmt
  | WorkflowContinueStmt;

export interface WorkflowPersonaRef extends ASTNode {
  readonly kind: 'WorkflowPersonaRef';
  readonly ref: PersonaReference;
}

export interface WorkflowSequenceExpr extends ASTNode {
  readonly kind: 'WorkflowSequenceExpr';
  readonly steps: readonly WorkflowExpression[];
}

export interface WorkflowParallelExpr extends ASTNode {
  readonly kind: 'WorkflowParallelExpr';
  readonly branches: readonly WorkflowExpression[];
  readonly sync: boolean;
}

export interface WorkflowChoiceExpr extends ASTNode {
  readonly kind: 'WorkflowChoiceExpr';
  readonly branches: readonly WorkflowExpression[];
}

export interface WorkflowTransformExpr extends ASTNode {
  readonly kind: 'WorkflowTransformExpr';
  readonly input: WorkflowExpression;
  readonly output: WorkflowExpression;
}

export interface WorkflowGroupExpr extends ASTNode {
  readonly kind: 'WorkflowGroupExpr';
  readonly expr: WorkflowExpression;
}

export interface WorkflowConditionalExpr extends ASTNode {
  readonly kind: 'WorkflowConditionalExpr';
  readonly condition: Expression;
  readonly then: WorkflowExpression;
  readonly else: WorkflowExpression | null;
}

export interface WorkflowLoopExpr extends ASTNode {
  readonly kind: 'WorkflowLoopExpr';
  readonly body: WorkflowExpression;
  readonly loopType: 'times' | 'while' | 'until' | 'for';
  readonly count: NumberLiteral | null;
  readonly condition: Expression | null;
  readonly variable: Identifier | null;
  readonly iterable: Expression | null;
}

export interface WorkflowCallExpr extends ASTNode {
  readonly kind: 'WorkflowCallExpr';
  readonly callee: Identifier;
  readonly arguments: readonly Expression[];
}

export interface WorkflowMergeExpr extends ASTNode {
  readonly kind: 'WorkflowMergeExpr';
  readonly mode: MergeModeNode;
}

/**
 * Async pipe operator (~>) for non-blocking workflow chains
 * Allows workflows to continue without waiting for completion
 */
export interface WorkflowAsyncPipeExpr extends ASTNode {
  readonly kind: 'WorkflowAsyncPipeExpr';
  readonly left: WorkflowExpression;
  readonly right: WorkflowExpression;
}

/**
 * Bidirectional operator (<->) for feedback loops
 * Allows bidirectional communication between workflow steps
 */
export interface WorkflowBidirectionalExpr extends ASTNode {
  readonly kind: 'WorkflowBidirectionalExpr';
  readonly left: WorkflowExpression;
  readonly right: WorkflowExpression;
  readonly maxIterations: NumberLiteral | null;
}

/**
 * Accumulate operator (>>>) for result aggregation
 * Collects and aggregates results from multiple workflow executions
 */
export interface WorkflowAccumulateExpr extends ASTNode {
  readonly kind: 'WorkflowAccumulateExpr';
  readonly steps: readonly WorkflowExpression[];
}

/**
 * Composition operator (::) for workflow reuse
 * Composes workflows into reusable units
 */
export interface WorkflowComposeExpr extends ASTNode {
  readonly kind: 'WorkflowComposeExpr';
  readonly workflows: readonly (Identifier | WorkflowExpression)[];
}

/**
 * Break statement for loop control
 * Exits the current loop immediately
 */
export interface WorkflowBreakStmt extends ASTNode {
  readonly kind: 'WorkflowBreakStmt';
  readonly label: Identifier | null;
}

/**
 * Continue statement for loop control
 * Skips to the next iteration of the loop
 */
export interface WorkflowContinueStmt extends ASTNode {
  readonly kind: 'WorkflowContinueStmt';
  readonly label: Identifier | null;
}

export type MergeModeNode =
  | {
      readonly kind: 'SimpleMergeMode';
      readonly mode: MergeMode;
      readonly span: Span;
    }
  | MergeConfigNode;

export interface MergeConfigNode extends ASTNode {
  readonly kind: 'MergeConfigNode';
  readonly mode: MergeMode;
  readonly weights: readonly WeightEntry[] | null;
  readonly topic: StringLiteral | null;
  readonly timeout: DurationLiteral | null;
}

export interface WeightEntry extends ASTNode {
  readonly kind: 'WeightEntry';
  readonly persona: PersonaReference;
  readonly weight: NumberLiteral;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Type Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface TypeDeclaration extends ASTNode {
  readonly kind: 'TypeDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly type: TypeNode;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Interface Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface InterfaceDeclaration extends ASTNode {
  readonly kind: 'InterfaceDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly extends: readonly TypeReference[];
  readonly members: readonly InterfaceMember[];
}

export type InterfaceMember =
  | PropertySignature
  | MethodSignature
  | IndexSignature
  | CallSignature
  | ConstructSignature;

export interface PropertySignature extends ASTNode {
  readonly kind: 'PropertySignature';
  readonly readonly: boolean;
  readonly name: Identifier | StringLiteral;
  readonly optional: boolean;
  readonly type: TypeNode;
}

export interface MethodSignature extends ASTNode {
  readonly kind: 'MethodSignature';
  readonly name: Identifier;
  readonly optional: boolean;
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode;
}

export interface IndexSignature extends ASTNode {
  readonly kind: 'IndexSignature';
  readonly readonly: boolean;
  readonly parameter: Parameter;
  readonly type: TypeNode;
}

export interface CallSignature extends ASTNode {
  readonly kind: 'CallSignature';
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode;
}

export interface ConstructSignature extends ASTNode {
  readonly kind: 'ConstructSignature';
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Enum Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface EnumDeclaration extends ASTNode {
  readonly kind: 'EnumDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly members: readonly EnumMember[];
}

export interface EnumMember extends ASTNode {
  readonly kind: 'EnumMember';
  readonly name: Identifier;
  readonly initializer: Expression | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Function Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionDeclaration extends ASTNode {
  readonly kind: 'FunctionDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly async: boolean;
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode | null;
  readonly body: BlockStatement | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Variable Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface VariableDeclaration extends ASTNode {
  readonly kind: 'VariableDeclaration';
  readonly declarationKind: 'let' | 'const' | 'var';
  readonly declarations: readonly VariableDeclarator[];
}

export interface VariableDeclarator extends ASTNode {
  readonly kind: 'VariableDeclarator';
  readonly id: Identifier | Pattern;
  readonly type: TypeNode | null;
  readonly init: Expression | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Import/Export Declarations
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportDeclaration extends ASTNode {
  readonly kind: 'ImportDeclaration';
  readonly specifiers: readonly ImportSpecifier[];
  readonly source: StringLiteral;
}

export type ImportSpecifier =
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier
  | ImportNamedSpecifier;

export interface ImportDefaultSpecifier extends ASTNode {
  readonly kind: 'ImportDefaultSpecifier';
  readonly local: Identifier;
}

export interface ImportNamespaceSpecifier extends ASTNode {
  readonly kind: 'ImportNamespaceSpecifier';
  readonly local: Identifier;
}

export interface ImportNamedSpecifier extends ASTNode {
  readonly kind: 'ImportNamedSpecifier';
  readonly imported: Identifier;
  readonly local: Identifier;
  readonly typeOnly: boolean;
}

export interface ExportDeclaration extends ASTNode {
  readonly kind: 'ExportDeclaration';
  readonly declaration: Declaration | null;
  readonly specifiers: readonly ExportSpecifier[];
  readonly source: StringLiteral | null;
  readonly default: boolean;
}

export interface ExportSpecifier extends ASTNode {
  readonly kind: 'ExportSpecifier';
  readonly local: Identifier;
  readonly exported: Identifier;
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Module Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface ModuleDeclaration extends ASTNode {
  readonly kind: 'ModuleDeclaration';
  readonly id: QualifiedIdentifier;
  readonly body: readonly Statement[];
}

// ─────────────────────────────────────────────────────────────────────────────
//                           Skill Declaration
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillDeclaration extends ASTNode {
  readonly kind: 'SkillDeclaration';
  readonly decorators: readonly Decorator[];
  readonly modifiers: readonly Modifier[];
  readonly id: Identifier;
  readonly typeParameters: readonly TypeParameter[];
  readonly body: SkillBody;
}

export interface SkillBody extends ASTNode {
  readonly kind: 'SkillBody';
  readonly members: readonly SkillMember[];
}

export type SkillMember =
  | SkillItemsDeclaration
  | SkillCategoryDeclaration
  | SkillInstructionsDeclaration
  | SkillExamplesDeclaration
  | SkillToolsDeclaration
  | SkillDependenciesDeclaration
  | PropertyDeclaration;

export interface SkillItemsDeclaration extends ASTNode {
  readonly kind: 'SkillItemsDeclaration';
  readonly items: readonly StringLiteral[];
}

export interface SkillCategoryDeclaration extends ASTNode {
  readonly kind: 'SkillCategoryDeclaration';
  readonly category: StringLiteral;
}

export interface SkillInstructionsDeclaration extends ASTNode {
  readonly kind: 'SkillInstructionsDeclaration';
  readonly instructions: StringLiteral; // Markdown or plain text
}

export interface SkillExamplesDeclaration extends ASTNode {
  readonly kind: 'SkillExamplesDeclaration';
  readonly examples: readonly SkillExample[];
}

export interface SkillExample extends ASTNode {
  readonly kind: 'SkillExample';
  readonly description: StringLiteral;
  readonly code: StringLiteral;
}

export interface SkillToolsDeclaration extends ASTNode {
  readonly kind: 'SkillToolsDeclaration';
  readonly tools: readonly StringLiteral[];
}

export interface SkillDependenciesDeclaration extends ASTNode {
  readonly kind: 'SkillDependenciesDeclaration';
  readonly dependencies: readonly StringLiteral[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE NODES
// ═══════════════════════════════════════════════════════════════════════════════

export type TypeNode =
  | TypeReference
  | UnionType
  | IntersectionType
  | ArrayType
  | TupleType
  | FunctionType
  | ObjectType
  | LiteralType
  | ConditionalType
  | MappedType
  | TemplateLiteralType
  | InferType
  | KeyofType
  | TypeofType
  | ParenthesizedType;

export interface TypeReference extends ASTNode {
  readonly kind: 'TypeReference';
  readonly typeName: QualifiedIdentifier;
  readonly typeArguments: readonly TypeNode[];
}

export interface UnionType extends ASTNode {
  readonly kind: 'UnionType';
  readonly types: readonly TypeNode[];
}

export interface IntersectionType extends ASTNode {
  readonly kind: 'IntersectionType';
  readonly types: readonly TypeNode[];
}

export interface ArrayType extends ASTNode {
  readonly kind: 'ArrayType';
  readonly elementType: TypeNode;
}

export interface TupleType extends ASTNode {
  readonly kind: 'TupleType';
  readonly elements: readonly TypeNode[];
}

export interface FunctionType extends ASTNode {
  readonly kind: 'FunctionType';
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly ParameterType[];
  readonly returnType: TypeNode;
}

export interface ParameterType extends ASTNode {
  readonly kind: 'ParameterType';
  readonly name: Identifier | null;
  readonly type: TypeNode;
}

export interface ObjectType extends ASTNode {
  readonly kind: 'ObjectType';
  readonly members: readonly InterfaceMember[];
}

export interface LiteralType extends ASTNode {
  readonly kind: 'LiteralType';
  readonly literal: StringLiteral | NumberLiteral | BooleanLiteral;
}

export interface ConditionalType extends ASTNode {
  readonly kind: 'ConditionalType';
  readonly checkType: TypeNode;
  readonly extendsType: TypeNode;
  readonly trueType: TypeNode;
  readonly falseType: TypeNode;
}

export interface MappedType extends ASTNode {
  readonly kind: 'MappedType';
  readonly typeParameter: Identifier;
  readonly constraint: TypeNode;
  readonly optional: '+?' | '-?' | '?' | null;
  readonly type: TypeNode;
}

export interface TemplateLiteralType extends ASTNode {
  readonly kind: 'TemplateLiteralType';
  readonly spans: readonly TemplateLiteralTypeSpan[];
}

export interface TemplateLiteralTypeSpan extends ASTNode {
  readonly kind: 'TemplateLiteralTypeSpan';
  readonly type: TypeNode | null;
  readonly text: string;
}

export interface InferType extends ASTNode {
  readonly kind: 'InferType';
  readonly typeParameter: Identifier;
}

export interface KeyofType extends ASTNode {
  readonly kind: 'KeyofType';
  readonly type: TypeNode;
}

export interface TypeofType extends ASTNode {
  readonly kind: 'TypeofType';
  readonly expression: Expression;
}

export interface ParenthesizedType extends ASTNode {
  readonly kind: 'ParenthesizedType';
  readonly type: TypeNode;
}

export interface TypeParameter extends ASTNode {
  readonly kind: 'TypeParameter';
  readonly name: Identifier;
  readonly constraint: TypeNode | null;
  readonly default: TypeNode | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPRESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type Expression =
  | Identifier
  | Literal
  | ArrayExpression
  | ObjectExpression
  | FunctionExpression
  | ArrowFunctionExpression
  | CallExpression
  | MemberExpression
  | IndexExpression
  | UnaryExpression
  | BinaryExpression
  | ConditionalExpression
  | AssignmentExpression
  | SequenceExpression
  | AwaitExpression
  | YieldExpression
  | MatchExpression
  | IfExpression
  | TryExpression
  | CommandExpression
  | PersonaLiteralExpression
  | WorkflowLiteralExpression
  | ParenthesizedExpression
  | SpreadElement
  | TemplateLiteral;

export interface Identifier extends ASTNode {
  readonly kind: 'Identifier';
  readonly name: string;
}

export interface QualifiedIdentifier extends ASTNode {
  readonly kind: 'QualifiedIdentifier';
  readonly parts: readonly Identifier[];
}

export type Literal =
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | DurationLiteral;

export interface StringLiteral extends ASTNode {
  readonly kind: 'StringLiteral';
  readonly value: string;
  readonly raw: string;
}

export interface NumberLiteral extends ASTNode {
  readonly kind: 'NumberLiteral';
  readonly value: number;
  readonly raw: string;
}

export interface BooleanLiteral extends ASTNode {
  readonly kind: 'BooleanLiteral';
  readonly value: boolean;
}

export interface NullLiteral extends ASTNode {
  readonly kind: 'NullLiteral';
}

export interface DurationLiteral extends ASTNode {
  readonly kind: 'DurationLiteral';
  readonly value: number;
  readonly unit: 'ms' | 's' | 'm' | 'h' | 'd';
}

export interface TemplateLiteral extends ASTNode {
  readonly kind: 'TemplateLiteral';
  readonly quasis: readonly TemplateElement[];
  readonly expressions: readonly Expression[];
}

export interface TemplateElement extends ASTNode {
  readonly kind: 'TemplateElement';
  readonly value: string;
  readonly raw: string;
  readonly tail: boolean;
}

export interface ArrayExpression extends ASTNode {
  readonly kind: 'ArrayExpression';
  readonly elements: readonly (Expression | SpreadElement | null)[];
}

export interface ObjectExpression extends ASTNode {
  readonly kind: 'ObjectExpression';
  readonly properties: readonly ObjectProperty[];
}

export type ObjectProperty =
  | ObjectKeyValueProperty
  | ObjectShorthandProperty
  | ObjectMethodProperty
  | ObjectSpreadProperty
  | ObjectComputedProperty;

export interface ObjectKeyValueProperty extends ASTNode {
  readonly kind: 'ObjectKeyValueProperty';
  readonly key: Identifier | StringLiteral | NumberLiteral;
  readonly value: Expression;
}

export interface ObjectShorthandProperty extends ASTNode {
  readonly kind: 'ObjectShorthandProperty';
  readonly key: Identifier;
}

export interface ObjectMethodProperty extends ASTNode {
  readonly kind: 'ObjectMethodProperty';
  readonly async: boolean;
  readonly generator: boolean;
  readonly key: Identifier | StringLiteral | NumberLiteral;
  readonly parameters: readonly Parameter[];
  readonly body: BlockStatement;
}

export interface ObjectSpreadProperty extends ASTNode {
  readonly kind: 'ObjectSpreadProperty';
  readonly argument: Expression;
}

export interface ObjectComputedProperty extends ASTNode {
  readonly kind: 'ObjectComputedProperty';
  readonly key: Expression;
  readonly value: Expression;
}

export interface FunctionExpression extends ASTNode {
  readonly kind: 'FunctionExpression';
  readonly async: boolean;
  readonly id: Identifier | null;
  readonly typeParameters: readonly TypeParameter[];
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode | null;
  readonly body: BlockStatement;
}

export interface ArrowFunctionExpression extends ASTNode {
  readonly kind: 'ArrowFunctionExpression';
  readonly async: boolean;
  readonly parameters: readonly Parameter[];
  readonly returnType: TypeNode | null;
  readonly body: Expression | BlockStatement;
}

export interface CallExpression extends ASTNode {
  readonly kind: 'CallExpression';
  readonly callee: Expression;
  readonly typeArguments: readonly TypeNode[];
  readonly arguments: readonly Expression[];
  readonly optional: boolean;
}

export interface MemberExpression extends ASTNode {
  readonly kind: 'MemberExpression';
  readonly object: Expression;
  readonly property: Identifier;
  readonly optional: boolean;
}

export interface IndexExpression extends ASTNode {
  readonly kind: 'IndexExpression';
  readonly object: Expression;
  readonly index: Expression;
  readonly optional: boolean;
}

export type UnaryOperator =
  | '++'
  | '--'
  | '+'
  | '-'
  | '!'
  | '~'
  | 'typeof'
  | 'await'
  | 'yield';

export interface UnaryExpression extends ASTNode {
  readonly kind: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: Expression;
  readonly prefix: boolean;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '=='
  | '!='
  | '==='
  | '!=='
  | '<'
  | '>'
  | '<='
  | '>='
  | '<=>'
  | '&&'
  | '||'
  | '??'
  | '&'
  | '|'
  | '^'
  | '<<'
  | '>>'
  | '>>>'
  | 'in'
  | 'instanceof';

export interface BinaryExpression extends ASTNode {
  readonly kind: 'BinaryExpression';
  readonly operator: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export interface ConditionalExpression extends ASTNode {
  readonly kind: 'ConditionalExpression';
  readonly test: Expression;
  readonly consequent: Expression;
  readonly alternate: Expression;
}

export type AssignmentOperator =
  | '='
  | '+='
  | '-='
  | '*='
  | '/='
  | '%='
  | '**='
  | '&='
  | '|='
  | '^='
  | '<<='
  | '>>='
  | '&&='
  | '||='
  | '??=';

export interface AssignmentExpression extends ASTNode {
  readonly kind: 'AssignmentExpression';
  readonly operator: AssignmentOperator;
  readonly left: Expression | Pattern;
  readonly right: Expression;
}

export interface SequenceExpression extends ASTNode {
  readonly kind: 'SequenceExpression';
  readonly expressions: readonly Expression[];
}

export interface AwaitExpression extends ASTNode {
  readonly kind: 'AwaitExpression';
  readonly argument: Expression;
}

export interface YieldExpression extends ASTNode {
  readonly kind: 'YieldExpression';
  readonly argument: Expression | null;
  readonly delegate: boolean;
}

export interface MatchExpression extends ASTNode {
  readonly kind: 'MatchExpression';
  readonly discriminant: Expression;
  readonly cases: readonly MatchCase[];
}

export interface MatchCase extends ASTNode {
  readonly kind: 'MatchCase';
  readonly pattern: Pattern;
  readonly guard: Expression | null;
  readonly consequent: Expression | BlockStatement;
}

export interface IfExpression extends ASTNode {
  readonly kind: 'IfExpression';
  readonly test: Expression;
  readonly consequent: Expression;
  readonly alternate: Expression;
}

export interface TryExpression extends ASTNode {
  readonly kind: 'TryExpression';
  readonly expression: Expression;
}

export interface CommandExpression extends ASTNode {
  readonly kind: 'CommandExpression';
  readonly command: CommandStatement;
}

export interface PersonaLiteralExpression extends ASTNode {
  readonly kind: 'PersonaLiteralExpression';
  readonly id: Identifier;
}

export interface WorkflowLiteralExpression extends ASTNode {
  readonly kind: 'WorkflowLiteralExpression';
  readonly expr: WorkflowExpression;
}

export interface ParenthesizedExpression extends ASTNode {
  readonly kind: 'ParenthesizedExpression';
  readonly expression: Expression;
}

export interface SpreadElement extends ASTNode {
  readonly kind: 'SpreadElement';
  readonly argument: Expression;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONTROL STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ControlStatement =
  | IfStatement
  | MatchStatement
  | ForStatement
  | ForInStatement
  | ForOfStatement
  | WhileStatement
  | DoWhileStatement
  | LoopStatement
  | TryStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ThrowStatement
  | WithStatement;

export interface IfStatement extends ASTNode {
  readonly kind: 'IfStatement';
  readonly test: Expression;
  readonly consequent: BlockStatement;
  readonly alternate: IfStatement | BlockStatement | null;
}

export interface MatchStatement extends ASTNode {
  readonly kind: 'MatchStatement';
  readonly discriminant: Expression;
  readonly cases: readonly MatchCase[];
}

export interface ForStatement extends ASTNode {
  readonly kind: 'ForStatement';
  readonly init: VariableDeclaration | Expression | null;
  readonly test: Expression | null;
  readonly update: Expression | null;
  readonly body: BlockStatement;
}

export interface ForInStatement extends ASTNode {
  readonly kind: 'ForInStatement';
  readonly left: Identifier | Pattern;
  readonly right: Expression;
  readonly body: BlockStatement;
}

export interface ForOfStatement extends ASTNode {
  readonly kind: 'ForOfStatement';
  readonly left: Identifier | Pattern;
  readonly right: Expression;
  readonly body: BlockStatement;
}

export interface WhileStatement extends ASTNode {
  readonly kind: 'WhileStatement';
  readonly test: Expression;
  readonly body: BlockStatement;
}

export interface DoWhileStatement extends ASTNode {
  readonly kind: 'DoWhileStatement';
  readonly body: BlockStatement;
  readonly test: Expression;
}

export interface LoopStatement extends ASTNode {
  readonly kind: 'LoopStatement';
  readonly label: Identifier | null;
  readonly body: BlockStatement;
}

export interface TryStatement extends ASTNode {
  readonly kind: 'TryStatement';
  readonly block: BlockStatement;
  readonly handlers: readonly CatchClause[];
  readonly finalizer: BlockStatement | null;
}

export interface CatchClause extends ASTNode {
  readonly kind: 'CatchClause';
  readonly param: Identifier | Pattern | null;
  readonly type: TypeNode | null;
  readonly body: BlockStatement;
}

export interface ReturnStatement extends ASTNode {
  readonly kind: 'ReturnStatement';
  readonly argument: Expression | null;
}

export interface BreakStatement extends ASTNode {
  readonly kind: 'BreakStatement';
  readonly label: Identifier | null;
}

export interface ContinueStatement extends ASTNode {
  readonly kind: 'ContinueStatement';
  readonly label: Identifier | null;
}

export interface ThrowStatement extends ASTNode {
  readonly kind: 'ThrowStatement';
  readonly argument: Expression;
}

export interface WithStatement extends ASTNode {
  readonly kind: 'WithStatement';
  readonly object: Expression;
  readonly body: BlockStatement;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export type Pattern =
  | IdentifierPattern
  | WildcardPattern
  | LiteralPattern
  | ArrayPatternNode
  | ObjectPatternNode
  | TuplePattern
  | TypePattern
  | OrPattern;

export interface IdentifierPattern extends ASTNode {
  readonly kind: 'IdentifierPattern';
  readonly name: Identifier;
}

export interface WildcardPattern extends ASTNode {
  readonly kind: 'WildcardPattern';
}

export interface LiteralPattern extends ASTNode {
  readonly kind: 'LiteralPattern';
  readonly literal: Literal;
}

export interface ArrayPatternNode extends ASTNode {
  readonly kind: 'ArrayPattern';
  readonly elements: readonly (Pattern | null)[];
  readonly rest: Identifier | null;
}

export interface ObjectPatternNode extends ASTNode {
  readonly kind: 'ObjectPattern';
  readonly properties: readonly PatternProperty[];
  readonly rest: Identifier | null;
}

export interface PatternProperty extends ASTNode {
  readonly kind: 'PatternProperty';
  readonly key: Identifier;
  readonly value: Pattern | null;
  readonly shorthand: boolean;
}

export interface TuplePattern extends ASTNode {
  readonly kind: 'TuplePattern';
  readonly elements: readonly Pattern[];
}

export interface TypePattern extends ASTNode {
  readonly kind: 'TypePattern';
  readonly type: TypeReference;
  readonly pattern: Pattern;
}

export interface OrPattern extends ASTNode {
  readonly kind: 'OrPattern';
  readonly patterns: readonly Pattern[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              COMMAND STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommandStatement extends ASTNode {
  readonly kind: 'CommandStatement';
  readonly prefix: '/' | '@';
  readonly command: CommandBody;
}

export type CommandBody =
  | ActivationCommand
  | ConfigurationCommand
  | TeamCommand
  | WorkflowCommand
  | RegistryCommand
  | StateCommand
  | CognitiveCommand
  | ObservabilityCommand
  | DebugCommand
  | SecurityCommand
  | ModuleCommand
  | EventCommand
  | QueryCommand
  | TestCommand
  | HelpCommand;

export interface ActivationCommand extends ASTNode {
  readonly kind: 'ActivationCommand';
  readonly subKind:
    | 'activate'
    | 'deactivate'
    | 'clear'
    | 'reset'
    | 'spawn'
    | 'isolate';
  readonly targets: readonly PersonaReference[];
  readonly options: readonly CommandOption[];
  readonly count: NumberLiteral | null;
}

export interface ConfigurationCommand extends ASTNode {
  readonly kind: 'ConfigurationCommand';
  readonly subKind:
    | 'primary'
    | 'merge'
    | 'weights'
    | 'quorum'
    | 'conflict'
    | 'topic'
    | 'delegate'
    | 'compose'
    | 'chain'
    | 'parallel'
    | 'context';
  readonly value: Expression | PersonaReference | MergeModeNode | null;
  readonly options: readonly CommandOption[];
}

export interface TeamCommand extends ASTNode {
  readonly kind: 'TeamCommand';
  readonly subKind:
    | 'load'
    | 'unload'
    | 'list'
    | 'show'
    | 'create'
    | 'edit'
    | 'delete';
  readonly target: Identifier | null;
  readonly options: readonly CommandOption[];
  readonly body: TeamBody | null;
}

export interface WorkflowCommand extends ASTNode {
  readonly kind: 'WorkflowCommand';
  readonly subKind:
    | 'inline'
    | 'run'
    | 'save'
    | 'delete'
    | 'list'
    | 'graph'
    | 'export'
    | 'import'
    | 'pause'
    | 'resume'
    | 'cancel'
    | 'status';
  readonly target: Identifier | StringLiteral | WorkflowExpression | null;
  readonly options: readonly CommandOption[];
  readonly saveAs: Identifier | null;
}

export interface RegistryCommand extends ASTNode {
  readonly kind: 'RegistryCommand';
  readonly subKind:
    | 'list'
    | 'show'
    | 'search'
    | 'add'
    | 'remove'
    | 'sync'
    | 'auth'
    | 'publish'
    | 'install'
    | 'update'
    | 'remote';
  readonly target: PersonaReference | StringLiteral | null;
  readonly filters: readonly CommandOption[];
}

export interface StateCommand extends ASTNode {
  readonly kind: 'StateCommand';
  readonly subKind:
    | 'status'
    | 'export'
    | 'import'
    | 'convert'
    | 'snapshot'
    | 'session'
    | 'pack'
    | 'template';
  readonly action: string | null;
  readonly target: Identifier | StringLiteral | null;
  readonly options: readonly CommandOption[];
}

export interface CognitiveCommand extends ASTNode {
  readonly kind: 'CognitiveCommand';
  readonly subKind:
    | 'depth'
    | 'verbosity'
    | 'tone'
    | 'output'
    | 'context'
    | 'lang';
  readonly value: NumberLiteral | Identifier | StringLiteral;
}

export interface ObservabilityCommand extends ASTNode {
  readonly kind: 'ObservabilityCommand';
  readonly subKind:
    | 'trace'
    | 'audit'
    | 'diff'
    | 'explain'
    | 'history'
    | 'metrics'
    | 'profile';
  readonly value: BooleanLiteral | Identifier | NumberLiteral | null;
  readonly targets: readonly PersonaReference[];
  readonly options: readonly CommandOption[];
}

export interface DebugCommand extends ASTNode {
  readonly kind: 'DebugCommand';
  readonly subKind:
    | 'enable'
    | 'disable'
    | 'breakpoint'
    | 'step'
    | 'inspect'
    | 'stack'
    | 'watch'
    | 'unwatch'
    | 'eval';
  readonly target: PersonaReference | Identifier | Expression | null;
}

export interface SecurityCommand extends ASTNode {
  readonly kind: 'SecurityCommand';
  readonly subKind:
    | 'audit'
    | 'scan'
    | 'allowlist'
    | 'sign'
    | 'verify'
    | 'encrypt'
    | 'decrypt';
  readonly action: 'add' | 'remove' | 'list' | null;
  readonly target: PersonaReference | StringLiteral | null;
}

export interface ModuleCommand extends ASTNode {
  readonly kind: 'ModuleCommand';
  readonly subKind:
    | 'create'
    | 'import'
    | 'export'
    | 'list'
    | 'deps'
    | 'namespace'
    | 'alias';
  readonly target: Identifier | PersonaReference | null;
  readonly action: string | null;
  readonly alias: Identifier | null;
}

export interface EventCommand extends ASTNode {
  readonly kind: 'EventCommand';
  readonly subKind: 'emit' | 'on' | 'off' | 'list' | 'watch' | 'unwatch';
  readonly event: Identifier | null;
  readonly handler: Expression | null;
}

export interface QueryCommand extends ASTNode {
  readonly kind: 'QueryCommand';
  readonly subKind: 'select' | 'save' | 'run' | 'list' | 'explain';
  readonly query: PQLStatement | null;
  readonly name: Identifier | null;
}

export interface PQLStatement extends ASTNode {
  readonly kind: 'PQLStatement';
  readonly columns: readonly Identifier[] | '*';
  readonly table: 'personas' | 'teams' | 'workflows' | 'skills' | 'registries';
  readonly where: PQLCondition | null;
  readonly orderBy: readonly PQLOrderBy[];
  readonly limit: NumberLiteral | null;
  readonly offset: NumberLiteral | null;
}

export interface PQLCondition extends ASTNode {
  readonly kind: 'PQLCondition';
  readonly left: Identifier;
  readonly op: ComparisonOp;
  readonly right: Expression;
  readonly next: { logic: 'AND' | 'OR'; condition: PQLCondition } | null;
}

export interface PQLOrderBy extends ASTNode {
  readonly kind: 'PQLOrderBy';
  readonly column: Identifier;
  readonly direction: 'ASC' | 'DESC';
}

export interface TestCommand extends ASTNode {
  readonly kind: 'TestCommand';
  readonly subKind:
    | 'create'
    | 'run'
    | 'assert'
    | 'mock'
    | 'coverage'
    | 'benchmark'
    | 'report'
    | 'watch';
  readonly target: Identifier | PersonaReference | Expression | null;
}

export interface HelpCommand extends ASTNode {
  readonly kind: 'HelpCommand';
  readonly topic: Identifier | StringLiteral | null;
}

export interface CommandOption extends ASTNode {
  readonly kind: 'CommandOption';
  readonly name: Identifier;
  readonly value: Expression | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              DECORATORS & MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Decorator extends ASTNode {
  readonly kind: 'Decorator';
  readonly name: QualifiedIdentifier;
  readonly arguments: readonly Expression[];
}

export interface Modifier extends ASTNode {
  readonly kind: 'Modifier';
  readonly type:
    | 'pub'
    | 'priv'
    | 'mut'
    | 'async'
    | 'static'
    | 'abstract'
    | 'final';
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              AST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Visitor pattern for AST traversal
 */
export interface ASTVisitor<T = void> {
  visitProgram?(node: Program): T;
  visitPersonaDeclaration?(node: PersonaDeclaration): T;
  visitTeamDeclaration?(node: TeamDeclaration): T;
  visitWorkflowDeclaration?(node: WorkflowDeclaration): T;
  visitFunctionDeclaration?(node: FunctionDeclaration): T;
  visitVariableDeclaration?(node: VariableDeclaration): T;
  visitTypeDeclaration?(node: TypeDeclaration): T;
  visitInterfaceDeclaration?(node: InterfaceDeclaration): T;
  visitEnumDeclaration?(node: EnumDeclaration): T;
  visitImportDeclaration?(node: ImportDeclaration): T;
  visitExportDeclaration?(node: ExportDeclaration): T;
  visitExpression?(node: Expression): T;
  visitStatement?(node: Statement): T;
  visitTypeNode?(node: TypeNode): T;
  visitPattern?(node: Pattern): T;
  visitCommandStatement?(node: CommandStatement): T;
  visitWorkflowExpression?(node: WorkflowExpression): T;
  visitDefault?(node: ASTNode): T;
}

/**
 * Walk the AST with a visitor
 */
export function walk<T>(node: ASTNode, visitor: ASTVisitor<T>): T | undefined {
  switch (node.kind) {
    case 'Program':
      return (
        visitor.visitProgram?.(node as Program) ?? visitor.visitDefault?.(node)
      );
    case 'PersonaDeclaration':
      return (
        visitor.visitPersonaDeclaration?.(node as PersonaDeclaration) ??
        visitor.visitDefault?.(node)
      );
    case 'TeamDeclaration':
      return (
        visitor.visitTeamDeclaration?.(node as TeamDeclaration) ??
        visitor.visitDefault?.(node)
      );
    case 'WorkflowDeclaration':
      return (
        visitor.visitWorkflowDeclaration?.(node as WorkflowDeclaration) ??
        visitor.visitDefault?.(node)
      );
    case 'FunctionDeclaration':
      return (
        visitor.visitFunctionDeclaration?.(node as FunctionDeclaration) ??
        visitor.visitDefault?.(node)
      );
    case 'VariableDeclaration':
      return (
        visitor.visitVariableDeclaration?.(node as VariableDeclaration) ??
        visitor.visitDefault?.(node)
      );
    case 'CommandStatement':
      return (
        visitor.visitCommandStatement?.(node as CommandStatement) ??
        visitor.visitDefault?.(node)
      );
    default:
      return visitor.visitDefault?.(node);
  }
}

/**
 * Create AST node factories
 */
export const AST = {
  program: (
    statements: readonly Statement[],
    comments: readonly Comment[],
    span: Span
  ): Program => ({
    kind: 'Program',
    statements,
    comments,
    span,
  }),

  identifier: (name: string, span: Span): Identifier => ({
    kind: 'Identifier',
    name,
    span,
  }),

  stringLiteral: (value: string, raw: string, span: Span): StringLiteral => ({
    kind: 'StringLiteral',
    value,
    raw,
    span,
  }),

  numberLiteral: (value: number, raw: string, span: Span): NumberLiteral => ({
    kind: 'NumberLiteral',
    value,
    raw,
    span,
  }),

  booleanLiteral: (value: boolean, span: Span): BooleanLiteral => ({
    kind: 'BooleanLiteral',
    value,
    span,
  }),

  nullLiteral: (span: Span): NullLiteral => ({
    kind: 'NullLiteral',
    span,
  }),

  // Add more factories as needed...
};
