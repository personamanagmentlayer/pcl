/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Parser Implementation (Recursive Descent + Pratt Expression Parsing)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @packageDocumentation
 * @module @pcl/parser
 * @version 1.0.0
 */

import type { Result, PCLError, Span, Position } from '../types';
import { Ok, Err, ErrorCode, PCLError as createError } from '../types';
import { 
  Lexer, 
  Token, 
  TokenType, 
  KEYWORDS,
  getOperatorPrecedence,
  isAssignmentOperator,
} from '../lexer';
import type * as AST from '../ast';


// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParserOptions {
  /** Source file name for error reporting */
  source?: string;
  /** Preserve comments in AST */
  preserveComments?: boolean;
  /** Allow experimental features */
  experimental?: boolean;
  /** Error recovery mode */
  errorRecovery?: boolean;
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParseResult {
  program: AST.Program;
  errors: PCLError[];
  warnings: PCLError[];
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PCL Parser
 * 
 * Implements a recursive descent parser with Pratt parsing for expressions.
 * Supports error recovery for better developer experience.
 */
export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: PCLError[] = [];
  private warnings: PCLError[] = [];
  private comments: AST.Comment[] = [];
  
  private readonly source: string;
  private readonly preserveComments: boolean;
  private readonly errorRecovery: boolean;
  
  constructor(private readonly input: string, options: ParserOptions = {}) {
    this.source = options.source ?? '<anonymous>';
    this.preserveComments = options.preserveComments ?? false;
    this.errorRecovery = options.errorRecovery ?? true;
  }
  
  /**
   * Parse the input into an AST
   */
  parse(): Result<ParseResult, PCLError[]> {
    // Tokenize
    const lexer = new Lexer(this.input, { 
      source: this.source,
      includeComments: this.preserveComments,
    });
    
    const tokenResult = lexer.tokenize();
    if (!tokenResult.ok) {
      return Err(tokenResult.error);
    }
    
    this.tokens = tokenResult.value;
    
    // Extract comments if preserving
    if (this.preserveComments) {
      this.comments = this.tokens
        .filter(t => 
          t.type === TokenType.COMMENT_LINE ||
          t.type === TokenType.COMMENT_BLOCK ||
          t.type === TokenType.COMMENT_DOC
        )
        .map(t => this.makeComment(t));
      
      // Remove comments from token stream
      this.tokens = this.tokens.filter(t =>
        t.type !== TokenType.COMMENT_LINE &&
        t.type !== TokenType.COMMENT_BLOCK &&
        t.type !== TokenType.COMMENT_DOC
      );
    }
    
    // Parse
    const statements = this.parseStatements();
    
    const program: AST.Program = {
      kind: 'Program',
      statements,
      comments: this.comments,
      span: this.makeSpan(
        statements[0]?.span.start ?? this.position(),
        this.previous().span.end
      ),
    };
    
    return Ok({
      program,
      errors: this.errors,
      warnings: this.warnings,
    });
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Statement Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseStatements(): AST.Statement[] {
    const statements: AST.Statement[] = [];
    
    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
      } catch (e) {
        if (this.errorRecovery) {
          this.synchronize();
        } else {
          throw e;
        }
      }
    }
    
    return statements;
  }
  
  private parseStatement(): AST.Statement | null {
    // Skip empty statements
    while (this.match(TokenType.SEMICOLON)) {
      // Empty statement
    }
    
    if (this.isAtEnd()) return null;
    
    // Decorators
    const decorators = this.parseDecorators();
    
    // Modifiers
    const modifiers = this.parseModifiers();
    
    // Declaration keywords
    if (this.check(TokenType.KEYWORD)) {
      const keyword = this.peek().value;
      
      switch (keyword) {
        case 'persona':
          return this.parsePersonaDeclaration(decorators, modifiers);
        case 'team':
          return this.parseTeamDeclaration(decorators, modifiers);
        case 'workflow':
          return this.parseWorkflowDeclaration(decorators, modifiers);
        case 'skill':
          return this.parseSkillDeclaration(decorators, modifiers);
        case 'type':
          return this.parseTypeDeclaration(decorators, modifiers);
        case 'interface':
          return this.parseInterfaceDeclaration(decorators, modifiers);
        case 'enum':
          return this.parseEnumDeclaration(decorators, modifiers);
        case 'fn':
          return this.parseFunctionDeclaration(decorators, modifiers, false);
        case 'async':
          this.advance();
          if (this.checkKeyword('fn')) {
            return this.parseFunctionDeclaration(decorators, modifiers, true);
          }
          this.error('Expected "fn" after "async"');
          return null;
        case 'let':
        case 'const':
        case 'var':
          return this.parseVariableDeclaration(decorators);
        case 'import':
          return this.parseImportDeclaration();
        case 'export':
          return this.parseExportDeclaration();
        case 'module':
          return this.parseModuleDeclaration();
        case 'if':
          return this.parseIfStatement();
        case 'match':
          return this.parseMatchStatement();
        case 'for':
          return this.parseForStatement();
        case 'while':
          return this.parseWhileStatement();
        case 'loop':
          return this.parseLoopStatement();
        case 'try':
          return this.parseTryStatement();
        case 'return':
          return this.parseReturnStatement();
        case 'break':
          return this.parseBreakStatement();
        case 'continue':
          return this.parseContinueStatement();
        case 'throw':
          return this.parseThrowStatement();
      }
    }
    
    // Command statements (/ or @)
    if (this.check(TokenType.COMMAND_PREFIX) || this.check(TokenType.AT)) {
      return this.parseCommandStatement();
    }
    
    // Block statement
    if (this.check(TokenType.LBRACE)) {
      return this.parseBlockStatement();
    }
    
    // Expression statement
    return this.parseExpressionStatement();
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Declaration Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parsePersonaDeclaration(
    decorators: AST.Decorator[],
    modifiers: AST.Modifier[]
  ): AST.PersonaDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('persona');
    
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    
    // Extends clause
    const extendsClause: AST.TypeReference[] = [];
    if (this.matchKeyword('extends')) {
      do {
        extendsClause.push(this.parseTypeReference());
      } while (this.match(TokenType.COMMA));
    }
    
    // Implements clause
    const implementsClause: AST.TypeReference[] = [];
    if (this.matchKeyword('implements')) {
      do {
        implementsClause.push(this.parseTypeReference());
      } while (this.match(TokenType.COMMA));
    }
    
    // Requires clause (capabilities)
    const capabilities: AST.TypeReference[] = [];
    if (this.matchKeyword('requires')) {
      this.expect(TokenType.LPAREN, 'Expected "(" after "requires"');
      do {
        capabilities.push(this.parseTypeReference());
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.RPAREN, 'Expected ")" after capabilities');
    }
    
    // Body
    const body = this.parsePersonaBody();
    
    return {
      kind: 'PersonaDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      extends: extendsClause,
      implements: implementsClause,
      capabilities,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parsePersonaBody(): AST.PersonaBody {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{" to start persona body');
    
    const members: AST.PersonaMember[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const member = this.parsePersonaMember();
      if (member) {
        members.push(member);
      }
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" to end persona body');
    
    return {
      kind: 'PersonaBody',
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parsePersonaMember(): AST.PersonaMember | null {
    const decorators = this.parseDecorators();
    const modifiers = this.parseModifiers();
    
    // Hook declarations (@onActivate, etc.)
    if (decorators.length > 0 && this.isHookDecorator(decorators[0])) {
      return this.parseHookDeclaration(decorators[0]);
    }
    
    // Skills block
    if (this.checkKeyword('skills')) {
      return this.parseSkillBlock();
    }
    
    // Constraints block
    if (this.checkKeyword('constraints')) {
      return this.parseConstraintBlock();
    }
    
    // Tags block
    if (this.checkKeyword('tags')) {
      return this.parseTagBlock();
    }
    
    // Method (fn keyword)
    if (this.checkKeyword('fn') || this.checkKeyword('async')) {
      const isAsync = this.matchKeyword('async');
      return this.parseMethodDeclaration(decorators, modifiers, isAsync);
    }
    
    // Nested persona
    if (this.checkKeyword('persona')) {
      return this.parsePersonaDeclaration(decorators, modifiers);
    }
    
    // Property
    return this.parsePropertyDeclaration(decorators, modifiers);
  }
  
  private parsePropertyDeclaration(
    decorators: AST.Decorator[],
    modifiers: AST.Modifier[]
  ): AST.PropertyDeclaration {
    const start = this.peek().span.start;
    const name = this.parseIdentifier();
    
    const optional = this.match(TokenType.QUESTION);
    
    let type: AST.TypeNode | null = null;
    let initializer: AST.Expression | null = null;
    
    if (this.match(TokenType.COLON)) {
      // Could be type or value
      if (this.isTypeStart()) {
        type = this.parseType();
      } else {
        initializer = this.parseExpression();
      }
    }
    
    if (this.match(TokenType.EQ)) {
      initializer = this.parseExpression();
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'PropertyDeclaration',
      decorators,
      modifiers,
      name,
      optional,
      type,
      initializer,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseMethodDeclaration(
    decorators: AST.Decorator[],
    modifiers: AST.Modifier[],
    isAsync: boolean
  ): AST.MethodDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('fn');
    
    const name = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    const parameters = this.parseParameterList();
    
    let returnType: AST.TypeNode | null = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }
    
    let body: AST.BlockStatement | null = null;
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlockStatement();
    } else {
      this.consumeOptionalSemicolon();
    }
    
    return {
      kind: 'MethodDeclaration',
      decorators,
      modifiers,
      async: isAsync,
      name,
      typeParameters,
      parameters,
      returnType,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseSkillBlock(): AST.SkillBlock {
    const start = this.peek().span.start;
    this.expectKeyword('skills');
    this.expect(TokenType.LBRACE, 'Expected "{" after "skills"');
    
    const items: AST.SkillItem[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.STRING)) {
        const token = this.advance();
        items.push({
          kind: 'StringSkill',
          value: token.value,
          span: token.span,
        });
      } else if (this.check(TokenType.AT)) {
        this.advance();
        const ref = this.parseQualifiedIdentifier();
        items.push({
          kind: 'RefSkill',
          ref,
          span: ref.span,
        });
      } else if (this.check(TokenType.IDENTIFIER)) {
        const name = this.parseIdentifier();
        items.push({
          kind: 'IdentifierSkill',
          name,
          span: name.span,
        });
      }
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" after skills');
    
    return {
      kind: 'SkillBlock',
      items,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseConstraintBlock(): AST.ConstraintBlock {
    const start = this.peek().span.start;
    this.expectKeyword('constraints');
    this.expect(TokenType.LBRACE, 'Expected "{" after "constraints"');
    
    const items: AST.ConstraintItem[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.STRING)) {
        const token = this.advance();
        items.push({
          kind: 'StringConstraint',
          value: token.value,
          span: token.span,
        });
      } else if (this.check(TokenType.IDENTIFIER)) {
        const field = this.parseIdentifier();
        const op = this.parseComparisonOperator();
        const value = this.parseExpression();
        items.push({
          kind: 'ExprConstraint',
          field,
          op,
          value,
          span: this.makeSpan(field.span.start, value.span.end),
        });
      }
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" after constraints');
    
    return {
      kind: 'ConstraintBlock',
      items,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTagBlock(): AST.TagBlock {
    const start = this.peek().span.start;
    this.expectKeyword('tags');
    this.expect(TokenType.LBRACE, 'Expected "{" after "tags"');
    
    const items: AST.TagItem[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.STRING)) {
        const token = this.advance();
        items.push({
          kind: 'StringTag',
          value: token.value,
          span: token.span,
        });
      } else if (this.check(TokenType.IDENTIFIER)) {
        const name = this.parseIdentifier();
        items.push({
          kind: 'IdentifierTag',
          name,
          span: name.span,
        });
      }
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" after tags');
    
    return {
      kind: 'TagBlock',
      items,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseHookDeclaration(decorator: AST.Decorator): AST.HookDeclaration {
    const start = decorator.span.start;
    const hookType = decorator.name.parts[0].name as AST.HookDeclaration['hookType'];
    
    const parameters: AST.Parameter[] = [];
    if (this.check(TokenType.LPAREN)) {
      parameters.push(...this.parseParameterList());
    }
    
    const body = this.parseBlockStatement();
    
    return {
      kind: 'HookDeclaration',
      hookType,
      parameters,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamDeclaration(
    decorators: AST.Decorator[],
    modifiers: AST.Modifier[]
  ): AST.TeamDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('team');
    
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    const body = this.parseTeamBody();
    
    return {
      kind: 'TeamDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamBody(): AST.TeamBody {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{" to start team body');
    
    const members: AST.TeamMember[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const member = this.parseTeamMember();
      if (member) {
        members.push(member);
      }
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" to end team body');
    
    return {
      kind: 'TeamBody',
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamMember(): AST.TeamMember | null {
    const decorators = this.parseDecorators();
    
    // Hook declarations
    if (decorators.length > 0 && this.isHookDecorator(decorators[0])) {
      return this.parseHookDeclaration(decorators[0]);
    }
    
    if (this.checkKeyword('members')) {
      return this.parseTeamMembersDeclaration();
    }
    
    if (this.checkKeyword('primary')) {
      return this.parseTeamPrimaryDeclaration();
    }
    
    if (this.checkKeyword('merge')) {
      return this.parseTeamMergeDeclaration();
    }
    
    if (this.checkKeyword('quorum')) {
      return this.parseTeamQuorumDeclaration();
    }
    
    if (this.checkKeyword('conflict')) {
      return this.parseTeamConflictDeclaration();
    }
    
    // Property
    return this.parsePropertyDeclaration(decorators, []);
  }
  
  private parseTeamMembersDeclaration(): AST.TeamMembersDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('members');
    
    const members: AST.PersonaReference[] = [];
    
    // Support both styles: members { A, B } and members: [A, B]
    if (this.match(TokenType.COLON)) {
      this.expect(TokenType.LBRACKET, 'Expected "[" for members list');
      
      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        members.push(this.parsePersonaReference());
        if (!this.match(TokenType.COMMA)) break;
      }
      
      this.expect(TokenType.RBRACKET, 'Expected "]" after members list');
    } else {
      // Brace style: members { A, B }
      this.expect(TokenType.LBRACE, 'Expected "{" for members block');
      
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        members.push(this.parsePersonaReference());
        this.match(TokenType.COMMA); // Optional comma
      }
      
      this.expect(TokenType.RBRACE, 'Expected "}" after members block');
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TeamMembersDeclaration',
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamPrimaryDeclaration(): AST.TeamPrimaryDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('primary');
    this.expect(TokenType.COLON, 'Expected ":" after "primary"');
    const primary = this.parsePersonaReference();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TeamPrimaryDeclaration',
      primary,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamMergeDeclaration(): AST.TeamMergeDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('merge');
    this.expect(TokenType.COLON, 'Expected ":" after "merge"');
    const mode = this.parseMergeMode();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TeamMergeDeclaration',
      mode,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamQuorumDeclaration(): AST.TeamQuorumDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('quorum');
    this.expect(TokenType.COLON, 'Expected ":" after "quorum"');
    
    const required = this.parseNumberLiteral();
    this.expect(TokenType.SLASH, 'Expected "/" in quorum expression');
    const total = this.parseNumberLiteral();
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TeamQuorumDeclaration',
      required,
      total,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseTeamConflictDeclaration(): AST.TeamConflictDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('conflict');
    this.expect(TokenType.COLON, 'Expected ":" after "conflict"');
    
    const order: AST.PersonaReference[] = [];
    order.push(this.parsePersonaReference());
    
    while (this.match(TokenType.GT)) {
      order.push(this.parsePersonaReference());
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TeamConflictDeclaration',
      order,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowDeclaration(
    decorators: AST.Decorator[],
    modifiers: AST.Modifier[]
  ): AST.WorkflowDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('workflow');
    
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    const body = this.parseWorkflowBody();
    
    return {
      kind: 'WorkflowDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowBody(): AST.WorkflowBody {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{" to start workflow body');
    
    const members: AST.WorkflowMember[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const member = this.parseWorkflowMember();
      if (member) {
        members.push(member);
      }
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}" to end workflow body');
    
    return {
      kind: 'WorkflowBody',
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowMember(): AST.WorkflowMember | null {
    const decorators = this.parseDecorators();
    
    // Hook declarations
    if (decorators.length > 0 && this.isHookDecorator(decorators[0])) {
      return this.parseHookDeclaration(decorators[0]);
    }
    
    if (this.checkKeyword('input')) {
      return this.parseWorkflowInputDeclaration();
    }
    
    if (this.checkKeyword('output')) {
      return this.parseWorkflowOutputDeclaration();
    }
    
    if (this.checkKeyword('steps')) {
      return this.parseWorkflowStepsDeclaration();
    }
    
    if (this.checkKeyword('timeout')) {
      return this.parseWorkflowTimeoutDeclaration();
    }
    
    if (this.checkKeyword('retry')) {
      return this.parseWorkflowRetryDeclaration();
    }
    
    if (this.checkKeyword('fallback')) {
      return this.parseWorkflowFallbackDeclaration();
    }
    
    if (this.checkKeyword('when')) {
      return this.parseWorkflowConditionDeclaration();
    }
    
    // Property
    return this.parsePropertyDeclaration(decorators, []);
  }
  
  private parseWorkflowInputDeclaration(): AST.WorkflowInputDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('input');
    this.expect(TokenType.COLON, 'Expected ":" after "input"');
    const type = this.parseType();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowInputDeclaration',
      type,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowOutputDeclaration(): AST.WorkflowOutputDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('output');
    this.expect(TokenType.COLON, 'Expected ":" after "output"');
    const type = this.parseType();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowOutputDeclaration',
      type,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowStepsDeclaration(): AST.WorkflowStepsDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('steps');
    this.expect(TokenType.COLON, 'Expected ":" after "steps"');
    const steps = this.parseWorkflowExpression();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowStepsDeclaration',
      steps,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowTimeoutDeclaration(): AST.WorkflowTimeoutDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('timeout');
    this.expect(TokenType.COLON, 'Expected ":" after "timeout"');
    const duration = this.parseDurationLiteral();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowTimeoutDeclaration',
      duration,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowRetryDeclaration(): AST.WorkflowRetryDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('retry');
    this.expect(TokenType.COLON, 'Expected ":" after "retry"');
    
    let config: AST.NumberLiteral | AST.RetryConfigNode;
    
    if (this.check(TokenType.LBRACE)) {
      config = this.parseRetryConfig();
    } else {
      config = this.parseNumberLiteral();
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowRetryDeclaration',
      config,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseRetryConfig(): AST.RetryConfigNode {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{"');
    
    let count: AST.NumberLiteral | null = null;
    let delay: AST.DurationLiteral | null = null;
    let backoff: 'linear' | 'exponential' | 'constant' | null = null;
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const key = this.parseIdentifier();
      this.expect(TokenType.COLON, 'Expected ":"');
      
      switch (key.name) {
        case 'count':
          count = this.parseNumberLiteral();
          break;
        case 'delay':
          delay = this.parseDurationLiteral();
          break;
        case 'backoff':
          const backoffToken = this.advance();
          backoff = backoffToken.value as 'linear' | 'exponential' | 'constant';
          break;
      }
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    if (!count) {
      this.error('Retry config requires "count"');
    }
    
    return {
      kind: 'RetryConfigNode',
      count: count!,
      delay,
      backoff,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowFallbackDeclaration(): AST.WorkflowFallbackDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('fallback');
    this.expect(TokenType.COLON, 'Expected ":" after "fallback"');
    const fallback = this.parsePersonaReference();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowFallbackDeclaration',
      fallback,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWorkflowConditionDeclaration(): AST.WorkflowConditionDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('when');
    this.expect(TokenType.COLON, 'Expected ":" after "when"');
    const condition = this.parseExpression();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'WorkflowConditionDeclaration',
      condition,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Workflow Expression Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseWorkflowExpression(): AST.WorkflowExpression {
    return this.parseWorkflowSequence();
  }
  
  private parseWorkflowSequence(): AST.WorkflowExpression {
    let left = this.parseWorkflowParallel();
    
    while (this.match(TokenType.ARROW)) {
      const right = this.parseWorkflowParallel();
      left = {
        kind: 'WorkflowSequenceExpr',
        steps: this.flattenSequence(left, right),
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private parseWorkflowParallel(): AST.WorkflowExpression {
    let left = this.parseWorkflowChoice();
    
    while (this.match(TokenType.PIPE_PIPE)) {
      const right = this.parseWorkflowChoice();
      left = {
        kind: 'WorkflowParallelExpr',
        branches: this.flattenParallel(left, right),
        sync: false,
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private parseWorkflowChoice(): AST.WorkflowExpression {
    let left = this.parseWorkflowPrimary();
    
    while (this.match(TokenType.PIPE) && !this.check(TokenType.PIPE)) {
      const right = this.parseWorkflowPrimary();
      left = {
        kind: 'WorkflowChoiceExpr',
        branches: [left, right],
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private parseWorkflowPrimary(): AST.WorkflowExpression {
    const start = this.peek().span.start;
    
    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseWorkflowExpression();
      this.expect(TokenType.RPAREN, 'Expected ")" after workflow expression');
      return {
        kind: 'WorkflowGroupExpr',
        expr,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Conditional
    if (this.matchKeyword('if')) {
      const condition = this.parseExpression();
      this.expectKeyword('then');
      const then = this.parseWorkflowExpression();
      let elseExpr: AST.WorkflowExpression | null = null;
      if (this.matchKeyword('else')) {
        elseExpr = this.parseWorkflowExpression();
      }
      return {
        kind: 'WorkflowConditionalExpr',
        condition,
        then,
        else: elseExpr,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Loop
    if (this.matchKeyword('loop')) {
      const body = this.parseWorkflowExpression();
      let loopType: 'times' | 'while' | 'until' | 'for' = 'times';
      let count: AST.NumberLiteral | null = null;
      let condition: AST.Expression | null = null;
      let variable: AST.Identifier | null = null;
      let iterable: AST.Expression | null = null;
      
      if (this.matchKeyword('times')) {
        loopType = 'times';
        count = this.parseNumberLiteral();
      } else if (this.matchKeyword('while')) {
        loopType = 'while';
        condition = this.parseExpression();
      } else if (this.matchKeyword('until')) {
        loopType = 'until';
        condition = this.parseExpression();
      } else if (this.matchKeyword('for')) {
        loopType = 'for';
        variable = this.parseIdentifier();
        this.expectKeyword('in');
        iterable = this.parseExpression();
      }
      
      return {
        kind: 'WorkflowLoopExpr',
        body,
        loopType,
        count,
        condition,
        variable,
        iterable,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Merge
    if (this.matchKeyword('merge')) {
      this.expect(TokenType.LPAREN, 'Expected "(" after "merge"');
      const mode = this.parseMergeMode();
      this.expect(TokenType.RPAREN, 'Expected ")" after merge mode');
      return {
        kind: 'WorkflowMergeExpr',
        mode,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Function call
    if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.LPAREN) {
      const callee = this.parseIdentifier();
      this.expect(TokenType.LPAREN, 'Expected "("');
      const args: AST.Expression[] = [];
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN, 'Expected ")"');
      return {
        kind: 'WorkflowCallExpr',
        callee,
        arguments: args,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Persona reference
    const ref = this.parsePersonaReference();
    return {
      kind: 'WorkflowPersonaRef',
      ref,
      span: ref.span,
    };
  }
  
  private flattenSequence(
    left: AST.WorkflowExpression, 
    right: AST.WorkflowExpression
  ): readonly AST.WorkflowExpression[] {
    const steps: AST.WorkflowExpression[] = [];
    
    if (left.kind === 'WorkflowSequenceExpr') {
      steps.push(...left.steps);
    } else {
      steps.push(left);
    }
    
    if (right.kind === 'WorkflowSequenceExpr') {
      steps.push(...right.steps);
    } else {
      steps.push(right);
    }
    
    return steps;
  }
  
  private flattenParallel(
    left: AST.WorkflowExpression, 
    right: AST.WorkflowExpression
  ): readonly AST.WorkflowExpression[] {
    const branches: AST.WorkflowExpression[] = [];
    
    if (left.kind === 'WorkflowParallelExpr') {
      branches.push(...left.branches);
    } else {
      branches.push(left);
    }
    
    if (right.kind === 'WorkflowParallelExpr') {
      branches.push(...right.branches);
    } else {
      branches.push(right);
    }
    
    return branches;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Expression Parsing (Pratt)
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseExpression(): AST.Expression {
    return this.parseAssignment();
  }
  
  private parseAssignment(): AST.Expression {
    const expr = this.parseConditional();
    
    if (isAssignmentOperator(this.peek())) {
      const operator = this.advance();
      const right = this.parseAssignment();
      
      return {
        kind: 'AssignmentExpression',
        operator: operator.value as AST.AssignmentOperator,
        left: expr,
        right,
        span: this.makeSpan(expr.span.start, right.span.end),
      };
    }
    
    return expr;
  }
  
  private parseConditional(): AST.Expression {
    let expr = this.parseBinary(0);
    
    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseExpression();
      this.expect(TokenType.COLON, 'Expected ":" in conditional expression');
      const alternate = this.parseConditional();
      
      return {
        kind: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
        span: this.makeSpan(expr.span.start, alternate.span.end),
      };
    }
    
    return expr;
  }
  
  private parseBinary(minPrecedence: number): AST.Expression {
    let left = this.parseUnary();
    
    while (true) {
      const precedence = getOperatorPrecedence(this.peek());
      if (precedence <= minPrecedence) break;
      
      const operator = this.advance();
      const right = this.parseBinary(precedence);
      
      left = {
        kind: 'BinaryExpression',
        operator: operator.value as AST.BinaryOperator,
        left,
        right,
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private parseUnary(): AST.Expression {
    if (
      this.check(TokenType.BANG) ||
      this.check(TokenType.TILDE) ||
      this.check(TokenType.PLUS) ||
      this.check(TokenType.MINUS) ||
      this.check(TokenType.PLUS_PLUS) ||
      this.check(TokenType.MINUS_MINUS) ||
      this.checkKeyword('typeof') ||
      this.checkKeyword('await') ||
      this.checkKeyword('yield')
    ) {
      const operator = this.advance();
      const argument = this.parseUnary();
      
      return {
        kind: 'UnaryExpression',
        operator: operator.value as AST.UnaryOperator,
        argument,
        prefix: true,
        span: this.makeSpan(operator.span.start, argument.span.end),
      };
    }
    
    return this.parsePostfix();
  }
  
  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();
    
    while (true) {
      if (this.match(TokenType.DOT)) {
        const property = this.parseIdentifier();
        expr = {
          kind: 'MemberExpression',
          object: expr,
          property,
          optional: false,
          span: this.makeSpan(expr.span.start, property.span.end),
        };
      } else if (this.match(TokenType.QUESTION_DOT)) {
        const property = this.parseIdentifier();
        expr = {
          kind: 'MemberExpression',
          object: expr,
          property,
          optional: true,
          span: this.makeSpan(expr.span.start, property.span.end),
        };
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, 'Expected "]"');
        expr = {
          kind: 'IndexExpression',
          object: expr,
          index,
          optional: false,
          span: this.makeSpan(expr.span.start, this.previous().span.end),
        };
      } else if (this.match(TokenType.LPAREN)) {
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            if (this.match(TokenType.DOT_DOT_DOT)) {
              const argument = this.parseExpression();
              args.push({
                kind: 'SpreadElement',
                argument,
                span: this.makeSpan(argument.span.start, argument.span.end),
              });
            } else {
              args.push(this.parseExpression());
            }
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, 'Expected ")"');
        expr = {
          kind: 'CallExpression',
          callee: expr,
          typeArguments: [],
          arguments: args,
          optional: false,
          span: this.makeSpan(expr.span.start, this.previous().span.end),
        };
      } else if (this.match(TokenType.PLUS_PLUS) || this.match(TokenType.MINUS_MINUS)) {
        const operator = this.previous();
        expr = {
          kind: 'UnaryExpression',
          operator: operator.value as AST.UnaryOperator,
          argument: expr,
          prefix: false,
          span: this.makeSpan(expr.span.start, operator.span.end),
        };
      } else {
        break;
      }
    }
    
    return expr;
  }
  
  private parsePrimary(): AST.Expression {
    const start = this.peek().span.start;
    
    // Literals
    if (this.check(TokenType.STRING)) {
      return this.parseStringLiteral();
    }
    
    if (this.check(TokenType.NUMBER_INT) || this.check(TokenType.NUMBER_FLOAT) ||
        this.check(TokenType.NUMBER_HEX) || this.check(TokenType.NUMBER_BINARY) ||
        this.check(TokenType.NUMBER_OCTAL)) {
      return this.parseNumberLiteral();
    }
    
    if (this.check(TokenType.BOOLEAN)) {
      const token = this.advance();
      return {
        kind: 'BooleanLiteral',
        value: token.value === 'true',
        span: token.span,
      };
    }
    
    if (this.check(TokenType.NULL)) {
      const token = this.advance();
      return {
        kind: 'NullLiteral',
        span: token.span,
      };
    }
    
    // Template literal
    if (this.check(TokenType.TEMPLATE_LITERAL) || this.check(TokenType.TEMPLATE_HEAD)) {
      return this.parseTemplateLiteral();
    }
    
    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayExpression(start);
    }
    
    // Object literal
    if (this.match(TokenType.LBRACE)) {
      return this.parseObjectExpression(start);
    }
    
    // Parenthesized or arrow function
    if (this.match(TokenType.LPAREN)) {
      return this.parseParenthesizedOrArrow(start);
    }
    
    // Function expression
    if (this.checkKeyword('fn')) {
      return this.parseFunctionExpression();
    }
    
    // Async function or arrow
    if (this.checkKeyword('async')) {
      return this.parseAsyncExpression();
    }
    
    // If expression
    if (this.checkKeyword('if')) {
      return this.parseIfExpression();
    }
    
    // Match expression
    if (this.checkKeyword('match')) {
      return this.parseMatchExpression();
    }
    
    // Persona literal (#PERSONA_ID)
    if (this.match(TokenType.HASH)) {
      const id = this.parseIdentifier();
      return {
        kind: 'PersonaLiteralExpression',
        id,
        span: this.makeSpan(start, id.span.end),
      };
    }
    
    // Command expression (@command)
    if (this.check(TokenType.AT)) {
      const command = this.parseCommandStatement();
      return {
        kind: 'CommandExpression',
        command,
        span: command.span,
      };
    }
    
    // Identifier
    if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.PERSONA_ID)) {
      return this.parseIdentifier();
    }
    
    this.error(`Unexpected token: ${this.peek().type}`);
    return this.parseIdentifier(); // Fallback
  }
  
  private parseArrayExpression(start: Position): AST.ArrayExpression {
    const elements: (AST.Expression | AST.SpreadElement | null)[] = [];
    
    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        elements.push(null); // Elision
      } else if (this.match(TokenType.DOT_DOT_DOT)) {
        const argument = this.parseExpression();
        elements.push({
          kind: 'SpreadElement',
          argument,
          span: argument.span,
        });
        if (!this.check(TokenType.RBRACKET)) {
          this.expect(TokenType.COMMA, 'Expected ","');
        }
      } else {
        elements.push(this.parseExpression());
        if (!this.check(TokenType.RBRACKET)) {
          this.match(TokenType.COMMA);
        }
      }
    }
    
    this.expect(TokenType.RBRACKET, 'Expected "]"');
    
    return {
      kind: 'ArrayExpression',
      elements,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseObjectExpression(start: Position): AST.ObjectExpression {
    const properties: AST.ObjectProperty[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      properties.push(this.parseObjectProperty());
      if (!this.check(TokenType.RBRACE)) {
        this.match(TokenType.COMMA);
      }
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'ObjectExpression',
      properties,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseObjectProperty(): AST.ObjectProperty {
    const start = this.peek().span.start;
    
    // Spread
    if (this.match(TokenType.DOT_DOT_DOT)) {
      const argument = this.parseExpression();
      return {
        kind: 'ObjectSpreadProperty',
        argument,
        span: this.makeSpan(start, argument.span.end),
      };
    }
    
    // Computed property
    if (this.match(TokenType.LBRACKET)) {
      const key = this.parseExpression();
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      this.expect(TokenType.COLON, 'Expected ":"');
      const value = this.parseExpression();
      return {
        kind: 'ObjectComputedProperty',
        key,
        value,
        span: this.makeSpan(start, value.span.end),
      };
    }
    
    // Regular property
    const key = this.check(TokenType.STRING)
      ? this.parseStringLiteral()
      : this.check(TokenType.NUMBER_INT)
        ? this.parseNumberLiteral()
        : this.parseIdentifier();
    
    // Shorthand
    if (!this.check(TokenType.COLON) && !this.check(TokenType.LPAREN)) {
      return {
        kind: 'ObjectShorthandProperty',
        key: key as AST.Identifier,
        span: key.span,
      };
    }
    
    // Method
    if (this.check(TokenType.LPAREN)) {
      const parameters = this.parseParameterList();
      const body = this.parseBlockStatement();
      return {
        kind: 'ObjectMethodProperty',
        async: false,
        generator: false,
        key: key as AST.Identifier,
        parameters,
        body,
        span: this.makeSpan(start, body.span.end),
      };
    }
    
    // Key-value
    this.expect(TokenType.COLON, 'Expected ":"');
    const value = this.parseExpression();
    return {
      kind: 'ObjectKeyValueProperty',
      key: key as AST.Identifier | AST.StringLiteral | AST.NumberLiteral,
      value,
      span: this.makeSpan(start, value.span.end),
    };
  }
  
  private parseParenthesizedOrArrow(start: Position): AST.Expression {
    // Look ahead to determine if this is an arrow function
    const savedPos = this.current;
    
    // Try parsing as arrow function parameters
    let isArrow = false;
    try {
      this.skipParameters();
      if (this.check(TokenType.RPAREN)) {
        this.advance();
        if (this.check(TokenType.FAT_ARROW) || this.check(TokenType.COLON)) {
          isArrow = true;
        }
      }
    } catch {
      // Not an arrow function
    }
    
    // Reset
    this.current = savedPos;
    
    if (isArrow) {
      return this.parseArrowFunction(start, false);
    }
    
    // Parenthesized expression
    const expr = this.parseExpression();
    this.expect(TokenType.RPAREN, 'Expected ")"');
    
    return {
      kind: 'ParenthesizedExpression',
      expression: expr,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseArrowFunction(start: Position, isAsync: boolean): AST.ArrowFunctionExpression {
    const parameters = this.parseParameterList();
    
    let returnType: AST.TypeNode | null = null;
    if (this.match(TokenType.COLON)) {
      returnType = this.parseType();
    }
    
    this.expect(TokenType.FAT_ARROW, 'Expected "=>"');
    
    const body = this.check(TokenType.LBRACE)
      ? this.parseBlockStatement()
      : this.parseExpression();
    
    return {
      kind: 'ArrowFunctionExpression',
      async: isAsync,
      parameters,
      returnType,
      body,
      span: this.makeSpan(start, body.span.end),
    };
  }
  
  private parseFunctionExpression(): AST.FunctionExpression {
    const start = this.peek().span.start;
    this.expectKeyword('fn');
    
    let id: AST.Identifier | null = null;
    if (this.check(TokenType.IDENTIFIER)) {
      id = this.parseIdentifier();
    }
    
    const typeParameters = this.parseOptionalTypeParameters();
    const parameters = this.parseParameterList();
    
    let returnType: AST.TypeNode | null = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }
    
    const body = this.parseBlockStatement();
    
    return {
      kind: 'FunctionExpression',
      async: false,
      id,
      typeParameters,
      parameters,
      returnType,
      body,
      span: this.makeSpan(start, body.span.end),
    };
  }
  
  private parseAsyncExpression(): AST.Expression {
    const start = this.peek().span.start;
    this.expectKeyword('async');
    
    if (this.checkKeyword('fn')) {
      this.advance();
      let id: AST.Identifier | null = null;
      if (this.check(TokenType.IDENTIFIER)) {
        id = this.parseIdentifier();
      }
      
      const typeParameters = this.parseOptionalTypeParameters();
      const parameters = this.parseParameterList();
      
      let returnType: AST.TypeNode | null = null;
      if (this.match(TokenType.ARROW)) {
        returnType = this.parseType();
      }
      
      const body = this.parseBlockStatement();
      
      return {
        kind: 'FunctionExpression',
        async: true,
        id,
        typeParameters,
        parameters,
        returnType,
        body,
        span: this.makeSpan(start, body.span.end),
      };
    }
    
    // Async arrow function
    return this.parseArrowFunction(start, true);
  }
  
  private parseIfExpression(): AST.IfExpression {
    const start = this.peek().span.start;
    this.expectKeyword('if');
    
    const test = this.parseExpression();
    this.expectKeyword('then');
    const consequent = this.parseExpression();
    this.expectKeyword('else');
    const alternate = this.parseExpression();
    
    return {
      kind: 'IfExpression',
      test,
      consequent,
      alternate,
      span: this.makeSpan(start, alternate.span.end),
    };
  }
  
  private parseMatchExpression(): AST.MatchExpression {
    const start = this.peek().span.start;
    this.expectKeyword('match');
    
    const discriminant = this.parseExpression();
    this.expect(TokenType.LBRACE, 'Expected "{"');
    
    const cases: AST.MatchCase[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      cases.push(this.parseMatchCase());
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'MatchExpression',
      discriminant,
      cases,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseMatchCase(): AST.MatchCase {
    const start = this.peek().span.start;
    const pattern = this.parsePattern();
    
    let guard: AST.Expression | null = null;
    if (this.matchKeyword('if')) {
      guard = this.parseExpression();
    }
    
    this.expect(TokenType.FAT_ARROW, 'Expected "=>"');
    
    const consequent = this.check(TokenType.LBRACE)
      ? this.parseBlockStatement()
      : this.parseExpression();
    
    this.match(TokenType.COMMA);
    
    return {
      kind: 'MatchCase',
      pattern,
      guard,
      consequent,
      span: this.makeSpan(start, consequent.span.end),
    };
  }
  
  private parseTemplateLiteral(): AST.TemplateLiteral {
    const start = this.peek().span.start;
    const quasis: AST.TemplateElement[] = [];
    const expressions: AST.Expression[] = [];
    
    if (this.check(TokenType.TEMPLATE_LITERAL)) {
      const token = this.advance();
      quasis.push({
        kind: 'TemplateElement',
        value: token.value,
        raw: token.raw ?? token.value,
        tail: true,
        span: token.span,
      });
    } else {
      // Template with expressions
      // This is simplified - full implementation would handle nested templates
      const head = this.advance();
      quasis.push({
        kind: 'TemplateElement',
        value: head.value,
        raw: head.raw ?? head.value,
        tail: false,
        span: head.span,
      });
      
      // For now, just parse until we hit the template tail
      // Full implementation would recursively handle template expressions
      while (!this.check(TokenType.TEMPLATE_TAIL) && !this.isAtEnd()) {
        expressions.push(this.parseExpression());
        if (this.check(TokenType.TEMPLATE_MIDDLE)) {
          const middle = this.advance();
          quasis.push({
            kind: 'TemplateElement',
            value: middle.value,
            raw: middle.raw ?? middle.value,
            tail: false,
            span: middle.span,
          });
        }
      }
      
      if (this.check(TokenType.TEMPLATE_TAIL)) {
        const tail = this.advance();
        quasis.push({
          kind: 'TemplateElement',
          value: tail.value,
          raw: tail.raw ?? tail.value,
          tail: true,
          span: tail.span,
        });
      }
    }
    
    return {
      kind: 'TemplateLiteral',
      quasis,
      expressions,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseDecorators(): AST.Decorator[] {
    const decorators: AST.Decorator[] = [];
    
    while (this.check(TokenType.AT) && !this.isHookAt()) {
      decorators.push(this.parseDecorator());
    }
    
    return decorators;
  }
  
  private parseDecorator(): AST.Decorator {
    const start = this.peek().span.start;
    this.expect(TokenType.AT, 'Expected "@"');
    
    const name = this.parseQualifiedIdentifier();
    const args: AST.Expression[] = [];
    
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN, 'Expected ")"');
    }
    
    return {
      kind: 'Decorator',
      name,
      arguments: args,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private isHookAt(): boolean {
    if (!this.check(TokenType.AT)) return false;
    const next = this.peekNext();
    if (!next || next.type !== TokenType.IDENTIFIER) return false;
    return [
      'onActivate', 'onDeactivate', 'onError', 'onMessage',
      'onStep', 'onComplete', 'beforeMerge', 'afterMerge',
      'onSpawn', 'onDespawn', 'onTimeout', 'onRetry'
    ].includes(next.value);
  }
  
  private isHookDecorator(decorator: AST.Decorator): boolean {
    const name = decorator.name.parts[0]?.name;
    return [
      'onActivate', 'onDeactivate', 'onError', 'onMessage',
      'onStep', 'onComplete', 'beforeMerge', 'afterMerge',
      'onSpawn', 'onDespawn', 'onTimeout', 'onRetry'
    ].includes(name);
  }
  
  private parseModifiers(): AST.Modifier[] {
    const modifiers: AST.Modifier[] = [];
    
    while (true) {
      const token = this.peek();
      if (token.type !== TokenType.KEYWORD) break;
      
      const mod = token.value;
      if (!['pub', 'priv', 'mut', 'async', 'static', 'abstract', 'final'].includes(mod)) {
        break;
      }
      
      this.advance();
      modifiers.push({
        kind: 'Modifier',
        type: mod as AST.Modifier['type'],
        span: token.span,
      });
    }
    
    return modifiers;
  }
  
  private parseIdentifier(): AST.Identifier {
    const token = this.expect(
      [TokenType.IDENTIFIER, TokenType.PERSONA_ID],
      'Expected identifier'
    );
    
    return {
      kind: 'Identifier',
      name: token.value,
      span: token.span,
    };
  }
  
  private parseQualifiedIdentifier(): AST.QualifiedIdentifier {
    const start = this.peek().span.start;
    const parts: AST.Identifier[] = [];
    
    parts.push(this.parseIdentifier());
    
    while (this.match(TokenType.COLON_COLON)) {
      parts.push(this.parseIdentifier());
    }
    
    return {
      kind: 'QualifiedIdentifier',
      parts,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parsePersonaReference(): AST.PersonaReference {
    const start = this.peek().span.start;
    
    // Spawn expression (3xARCHI)
    if (this.check(TokenType.NUMBER_INT)) {
      const count = this.parseNumberLiteral();
      if (this.matchKeyword('x') || this.peek().value.toLowerCase() === 'x') {
        if (this.previous().value.toLowerCase() !== 'x') {
          this.advance(); // consume 'x'
        }
        const persona = this.parseIdentifier();
        return {
          kind: 'PersonaReference',
          ref: { type: 'spawn', count, persona },
          span: this.makeSpan(start, persona.span.end),
        };
      }
    }
    
    // Qualified reference (module::PERSONA)
    const first = this.parseIdentifier();
    
    if (this.match(TokenType.COLON_COLON)) {
      const rest: AST.Identifier[] = [first];
      do {
        rest.push(this.parseIdentifier());
      } while (this.match(TokenType.COLON_COLON));
      
      const path: AST.QualifiedIdentifier = {
        kind: 'QualifiedIdentifier',
        parts: rest,
        span: this.makeSpan(start, this.previous().span.end),
      };
      
      return {
        kind: 'PersonaReference',
        ref: { type: 'qualified', path },
        span: path.span,
      };
    }
    
    // Simple reference
    return {
      kind: 'PersonaReference',
      ref: { type: 'id', id: first },
      span: first.span,
    };
  }
  
  private parseMergeMode(): AST.MergeModeNode {
    const start = this.peek().span.start;
    
    if (this.check(TokenType.LBRACE)) {
      return this.parseMergeConfig();
    }
    
    const token = this.advance();
    return {
      kind: 'SimpleMergeMode',
      mode: token.value as any,
      span: token.span,
    };
  }
  
  private parseMergeConfig(): AST.MergeConfigNode {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{"');
    
    let mode: any = 'primary';
    let weights: AST.WeightEntry[] | null = null;
    let topic: AST.StringLiteral | null = null;
    let timeout: AST.DurationLiteral | null = null;
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const key = this.parseIdentifier();
      this.expect(TokenType.COLON, 'Expected ":"');
      
      switch (key.name) {
        case 'mode':
          mode = this.advance().value;
          break;
        case 'weights':
          weights = this.parseWeights();
          break;
        case 'topic':
          topic = this.parseStringLiteral();
          break;
        case 'timeout':
          timeout = this.parseDurationLiteral();
          break;
      }
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'MergeConfigNode',
      mode,
      weights,
      topic,
      timeout,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseWeights(): AST.WeightEntry[] {
    const weights: AST.WeightEntry[] = [];
    this.expect(TokenType.LBRACE, 'Expected "{"');
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const start = this.peek().span.start;
      const persona = this.parsePersonaReference();
      this.expect(TokenType.COLON, 'Expected ":"');
      const weight = this.parseNumberLiteral();
      
      weights.push({
        kind: 'WeightEntry',
        persona,
        weight,
        span: this.makeSpan(start, weight.span.end),
      });
      
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    return weights;
  }
  
  private parseParameterList(): AST.Parameter[] {
    this.expect(TokenType.LPAREN, 'Expected "("');
    const parameters: AST.Parameter[] = [];
    
    if (!this.check(TokenType.RPAREN)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenType.COMMA));
    }
    
    this.expect(TokenType.RPAREN, 'Expected ")"');
    return parameters;
  }
  
  private parseParameter(): AST.Parameter {
    const start = this.peek().span.start;
    const decorators = this.parseDecorators();
    const rest = this.match(TokenType.DOT_DOT_DOT);
    const name = this.parseIdentifier();
    const optional = this.match(TokenType.QUESTION);
    
    let type: AST.TypeNode | null = null;
    if (this.match(TokenType.COLON)) {
      type = this.parseType();
    }
    
    let initializer: AST.Expression | null = null;
    if (this.match(TokenType.EQ)) {
      initializer = this.parseExpression();
    }
    
    return {
      kind: 'Parameter',
      decorators,
      rest,
      name,
      optional,
      type,
      initializer,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseOptionalTypeParameters(): AST.TypeParameter[] {
    if (!this.match(TokenType.LT)) return [];
    
    const params: AST.TypeParameter[] = [];
    
    do {
      params.push(this.parseTypeParameter());
    } while (this.match(TokenType.COMMA));
    
    this.expect(TokenType.GT, 'Expected ">"');
    return params;
  }
  
  private parseTypeParameter(): AST.TypeParameter {
    const start = this.peek().span.start;
    const name = this.parseIdentifier();
    
    let constraint: AST.TypeNode | null = null;
    if (this.matchKeyword('extends')) {
      constraint = this.parseType();
    }
    
    let defaultType: AST.TypeNode | null = null;
    if (this.match(TokenType.EQ)) {
      defaultType = this.parseType();
    }
    
    return {
      kind: 'TypeParameter',
      name,
      constraint,
      default: defaultType,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseStringLiteral(): AST.StringLiteral {
    const token = this.expect(TokenType.STRING, 'Expected string');
    return {
      kind: 'StringLiteral',
      value: token.value,
      raw: token.raw ?? `"${token.value}"`,
      span: token.span,
    };
  }
  
  private parseNumberLiteral(): AST.NumberLiteral {
    const token = this.expect(
      [TokenType.NUMBER_INT, TokenType.NUMBER_FLOAT, TokenType.NUMBER_HEX, 
       TokenType.NUMBER_BINARY, TokenType.NUMBER_OCTAL],
      'Expected number'
    );
    
    let value: number;
    switch (token.type) {
      case TokenType.NUMBER_HEX:
        value = parseInt(token.value.slice(2), 16);
        break;
      case TokenType.NUMBER_BINARY:
        value = parseInt(token.value.slice(2), 2);
        break;
      case TokenType.NUMBER_OCTAL:
        value = parseInt(token.value.slice(2), 8);
        break;
      default:
        value = parseFloat(token.value);
    }
    
    return {
      kind: 'NumberLiteral',
      value,
      raw: token.raw ?? token.value,
      span: token.span,
    };
  }
  
  private parseDurationLiteral(): AST.DurationLiteral {
    const start = this.peek().span.start;
    const num = this.parseNumberLiteral();
    
    // Check for duration suffix
    const unitToken = this.peek();
    let unit: 'ms' | 's' | 'm' | 'h' | 'd' = 's';
    
    if (unitToken.type === TokenType.IDENTIFIER) {
      const u = unitToken.value.toLowerCase();
      if (['ms', 's', 'm', 'h', 'd'].includes(u)) {
        unit = u as 'ms' | 's' | 'm' | 'h' | 'd';
        this.advance();
      }
    }
    
    return {
      kind: 'DurationLiteral',
      value: num.value,
      unit,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseComparisonOperator(): any {
    const token = this.peek();
    
    switch (token.type) {
      case TokenType.EQ_EQ:
      case TokenType.BANG_EQ:
      case TokenType.LT:
      case TokenType.GT:
      case TokenType.LT_EQ:
      case TokenType.GT_EQ:
        this.advance();
        return token.value;
      default:
        if (token.type === TokenType.KEYWORD) {
          if (['in', 'is', 'matches', 'contains', 'startsWith', 'endsWith'].includes(token.value)) {
            this.advance();
            return token.value;
          }
        }
        this.error('Expected comparison operator');
        return '==';
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Type Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseType(): AST.TypeNode {
    return this.parseUnionType();
  }
  
  private parseUnionType(): AST.TypeNode {
    let left = this.parseIntersectionType();
    
    while (this.match(TokenType.PIPE)) {
      const right = this.parseIntersectionType();
      left = {
        kind: 'UnionType',
        types: this.flattenUnion(left, right),
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private flattenUnion(left: AST.TypeNode, right: AST.TypeNode): readonly AST.TypeNode[] {
    const types: AST.TypeNode[] = [];
    if (left.kind === 'UnionType') {
      types.push(...left.types);
    } else {
      types.push(left);
    }
    if (right.kind === 'UnionType') {
      types.push(...right.types);
    } else {
      types.push(right);
    }
    return types;
  }
  
  private parseIntersectionType(): AST.TypeNode {
    let left = this.parsePrimaryType();
    
    while (this.match(TokenType.AMP)) {
      const right = this.parsePrimaryType();
      left = {
        kind: 'IntersectionType',
        types: [left, right],
        span: this.makeSpan(left.span.start, right.span.end),
      };
    }
    
    return left;
  }
  
  private parsePrimaryType(): AST.TypeNode {
    const start = this.peek().span.start;
    
    // Parenthesized type
    if (this.match(TokenType.LPAREN)) {
      const type = this.parseType();
      this.expect(TokenType.RPAREN, 'Expected ")"');
      
      // Check for function type
      if (this.match(TokenType.ARROW)) {
        const returnType = this.parseType();
        return {
          kind: 'FunctionType',
          typeParameters: [],
          parameters: [], // Would need to parse parameters
          returnType,
          span: this.makeSpan(start, returnType.span.end),
        };
      }
      
      return {
        kind: 'ParenthesizedType',
        type,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Array type (shorthand)
    if (this.match(TokenType.LBRACKET)) {
      if (this.match(TokenType.RBRACKET)) {
        // Empty array type - error
        this.error('Array type requires element type');
      }
      const elements: AST.TypeNode[] = [];
      do {
        elements.push(this.parseType());
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      
      if (elements.length === 1) {
        return {
          kind: 'ArrayType',
          elementType: elements[0],
          span: this.makeSpan(start, this.previous().span.end),
        };
      }
      
      return {
        kind: 'TupleType',
        elements,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Object type
    if (this.match(TokenType.LBRACE)) {
      const members: AST.InterfaceMember[] = [];
      
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        members.push(this.parseTypeObjectMember());
      }
      
      this.expect(TokenType.RBRACE, 'Expected "}"');
      
      return {
        kind: 'ObjectType',
        members,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Keyof type
    if (this.matchKeyword('keyof')) {
      const type = this.parsePrimaryType();
      return {
        kind: 'KeyofType',
        type,
        span: this.makeSpan(start, type.span.end),
      };
    }
    
    // Typeof type
    if (this.matchKeyword('typeof')) {
      const expression = this.parseExpression();
      return {
        kind: 'TypeofType',
        expression,
        span: this.makeSpan(start, expression.span.end),
      };
    }
    
    // Infer type
    if (this.matchKeyword('infer')) {
      const typeParameter = this.parseIdentifier();
      return {
        kind: 'InferType',
        typeParameter,
        span: this.makeSpan(start, typeParameter.span.end),
      };
    }
    
    // Type reference
    return this.parseTypeReference();
  }
  
  private parseTypeReference(): AST.TypeReference {
    const start = this.peek().span.start;
    const typeName = this.parseQualifiedIdentifier();
    
    const typeArguments: AST.TypeNode[] = [];
    if (this.match(TokenType.LT)) {
      do {
        typeArguments.push(this.parseType());
      } while (this.match(TokenType.COMMA));
      this.expect(TokenType.GT, 'Expected ">"');
    }
    
    // Check for array suffix
    let result: AST.TypeNode = {
      kind: 'TypeReference',
      typeName,
      typeArguments,
      span: this.makeSpan(start, this.previous().span.end),
    };
    
    while (this.match(TokenType.LBRACKET)) {
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      result = {
        kind: 'ArrayType',
        elementType: result,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    return result as AST.TypeReference;
  }
  
  private parseTypeObjectMember(): AST.InterfaceMember {
    const start = this.peek().span.start;
    const readonly = this.matchKeyword('readonly');
    
    // Index signature
    if (this.match(TokenType.LBRACKET)) {
      const paramName = this.parseIdentifier();
      this.expect(TokenType.COLON, 'Expected ":"');
      const paramType = this.parseType();
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      this.expect(TokenType.COLON, 'Expected ":"');
      const type = this.parseType();
      this.consumeOptionalSemicolon();
      
      return {
        kind: 'IndexSignature',
        readonly,
        parameter: {
          kind: 'Parameter',
          decorators: [],
          rest: false,
          name: paramName,
          optional: false,
          type: paramType,
          initializer: null,
          span: this.makeSpan(paramName.span.start, paramType.span.end),
        },
        type,
        span: this.makeSpan(start, type.span.end),
      };
    }
    
    const name = this.check(TokenType.STRING)
      ? this.parseStringLiteral()
      : this.parseIdentifier();
    
    const optional = this.match(TokenType.QUESTION);
    
    // Method signature
    if (this.check(TokenType.LPAREN) || this.check(TokenType.LT)) {
      const typeParameters = this.parseOptionalTypeParameters();
      const parameters = this.parseParameterList();
      let returnType: AST.TypeNode = { kind: 'TypeReference', typeName: { kind: 'QualifiedIdentifier', parts: [{ kind: 'Identifier', name: 'void', span: this.peek().span }], span: this.peek().span }, typeArguments: [], span: this.peek().span };
      if (this.match(TokenType.COLON)) {
        returnType = this.parseType();
      }
      this.consumeOptionalSemicolon();
      
      return {
        kind: 'MethodSignature',
        name: name as AST.Identifier,
        optional,
        typeParameters,
        parameters,
        returnType,
        span: this.makeSpan(start, returnType.span.end),
      };
    }
    
    // Property signature
    this.expect(TokenType.COLON, 'Expected ":"');
    const type = this.parseType();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'PropertySignature',
      readonly,
      name: name as AST.Identifier | AST.StringLiteral,
      optional,
      type,
      span: this.makeSpan(start, type.span.end),
    };
  }
  
  private isTypeStart(): boolean {
    const token = this.peek();
    
    // Type keywords
    if (token.type === TokenType.KEYWORD) {
      return [
        'String', 'Int', 'Float', 'Bool', 'Void', 'Never',
        'Any', 'Unknown', 'Array', 'Map', 'Set', 'Tuple',
        'Option', 'Result', 'keyof', 'typeof', 'infer'
      ].includes(token.value);
    }
    
    // Type identifier (starts with uppercase)
    if (token.type === TokenType.IDENTIFIER || token.type === TokenType.PERSONA_ID) {
      return /^[A-Z]/.test(token.value);
    }
    
    // Object type or tuple type
    if (token.type === TokenType.LBRACE || token.type === TokenType.LBRACKET) {
      return true;
    }
    
    // Parenthesized type
    if (token.type === TokenType.LPAREN) {
      return true;
    }
    
    return false;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Pattern Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parsePattern(): AST.Pattern {
    const start = this.peek().span.start;
    
    // Wildcard
    if (this.peek().value === '_') {
      this.advance();
      return {
        kind: 'WildcardPattern',
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Literal
    if (this.check(TokenType.STRING) || this.check(TokenType.NUMBER_INT) ||
        this.check(TokenType.NUMBER_FLOAT) || this.check(TokenType.BOOLEAN) ||
        this.check(TokenType.NULL)) {
      const literal = this.parsePrimary() as AST.Literal;
      return {
        kind: 'LiteralPattern',
        literal,
        span: literal.span,
      };
    }
    
    // Array pattern
    if (this.match(TokenType.LBRACKET)) {
      const elements: (AST.Pattern | null)[] = [];
      let rest: AST.Identifier | null = null;
      
      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        if (this.match(TokenType.DOT_DOT_DOT)) {
          rest = this.parseIdentifier();
          break;
        }
        elements.push(this.parsePattern());
        if (!this.check(TokenType.RBRACKET)) {
          this.match(TokenType.COMMA);
        }
      }
      
      this.expect(TokenType.RBRACKET, 'Expected "]"');
      
      return {
        kind: 'ArrayPattern',
        elements,
        rest,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Object pattern
    if (this.match(TokenType.LBRACE)) {
      const properties: AST.PatternProperty[] = [];
      let rest: AST.Identifier | null = null;
      
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.match(TokenType.DOT_DOT_DOT)) {
          rest = this.parseIdentifier();
          break;
        }
        
        const key = this.parseIdentifier();
        let value: AST.Pattern | null = null;
        let shorthand = true;
        
        if (this.match(TokenType.COLON)) {
          value = this.parsePattern();
          shorthand = false;
        }
        
        properties.push({
          kind: 'PatternProperty',
          key,
          value,
          shorthand,
          span: this.makeSpan(key.span.start, (value ?? key).span.end),
        });
        
        if (!this.check(TokenType.RBRACE)) {
          this.match(TokenType.COMMA);
        }
      }
      
      this.expect(TokenType.RBRACE, 'Expected "}"');
      
      return {
        kind: 'ObjectPattern',
        properties,
        rest,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Identifier pattern
    const name = this.parseIdentifier();
    return {
      kind: 'IdentifierPattern',
      name,
      span: name.span,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Statement Parsing (continued)
  // ─────────────────────────────────────────────────────────────────────────────
  
  private parseBlockStatement(): AST.BlockStatement {
    const start = this.peek().span.start;
    this.expect(TokenType.LBRACE, 'Expected "{"');
    
    const statements: AST.Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'BlockStatement',
      statements,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseIfStatement(): AST.IfStatement {
    const start = this.peek().span.start;
    this.expectKeyword('if');
    
    const test = this.parseExpression();
    const consequent = this.parseBlockStatement();
    
    let alternate: AST.IfStatement | AST.BlockStatement | null = null;
    if (this.matchKeyword('else')) {
      if (this.checkKeyword('if')) {
        alternate = this.parseIfStatement();
      } else {
        alternate = this.parseBlockStatement();
      }
    }
    
    return {
      kind: 'IfStatement',
      test,
      consequent,
      alternate,
      span: this.makeSpan(start, (alternate ?? consequent).span.end),
    };
  }
  
  private parseMatchStatement(): AST.MatchStatement {
    const expr = this.parseMatchExpression();
    return {
      kind: 'MatchStatement',
      discriminant: expr.discriminant,
      cases: expr.cases,
      span: expr.span,
    };
  }
  
  private parseForStatement(): AST.Statement {
    const start = this.peek().span.start;
    this.expectKeyword('for');
    
    // For-in or for-of
    if (!this.check(TokenType.LPAREN)) {
      const left = this.parseIdentifier();
      
      if (this.matchKeyword('in')) {
        const right = this.parseExpression();
        const body = this.parseBlockStatement();
        return {
          kind: 'ForInStatement',
          left,
          right,
          body,
          span: this.makeSpan(start, body.span.end),
        };
      }
      
      if (this.matchKeyword('of')) {
        const right = this.parseExpression();
        const body = this.parseBlockStatement();
        return {
          kind: 'ForOfStatement',
          left,
          right,
          body,
          span: this.makeSpan(start, body.span.end),
        };
      }
    }
    
    // C-style for
    this.expect(TokenType.LPAREN, 'Expected "("');
    
    let init: AST.VariableDeclaration | AST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      if (this.checkKeyword('let') || this.checkKeyword('const') || this.checkKeyword('var')) {
        init = this.parseVariableDeclaration([]);
      } else {
        init = this.parseExpression();
      }
    }
    this.expect(TokenType.SEMICOLON, 'Expected ";"');
    
    let test: AST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      test = this.parseExpression();
    }
    this.expect(TokenType.SEMICOLON, 'Expected ";"');
    
    let update: AST.Expression | null = null;
    if (!this.check(TokenType.RPAREN)) {
      update = this.parseExpression();
    }
    this.expect(TokenType.RPAREN, 'Expected ")"');
    
    const body = this.parseBlockStatement();
    
    return {
      kind: 'ForStatement',
      init,
      test,
      update,
      body,
      span: this.makeSpan(start, body.span.end),
    };
  }
  
  private parseWhileStatement(): AST.WhileStatement {
    const start = this.peek().span.start;
    this.expectKeyword('while');
    
    const test = this.parseExpression();
    const body = this.parseBlockStatement();
    
    return {
      kind: 'WhileStatement',
      test,
      body,
      span: this.makeSpan(start, body.span.end),
    };
  }
  
  private parseLoopStatement(): AST.LoopStatement {
    const start = this.peek().span.start;
    this.expectKeyword('loop');
    
    let label: AST.Identifier | null = null;
    if (this.check(TokenType.IDENTIFIER)) {
      label = this.parseIdentifier();
    }
    
    const body = this.parseBlockStatement();
    
    return {
      kind: 'LoopStatement',
      label,
      body,
      span: this.makeSpan(start, body.span.end),
    };
  }
  
  private parseTryStatement(): AST.TryStatement {
    const start = this.peek().span.start;
    this.expectKeyword('try');
    
    const block = this.parseBlockStatement();
    const handlers: AST.CatchClause[] = [];
    
    while (this.matchKeyword('catch')) {
      const catchStart = this.previous().span.start;
      
      let param: AST.Identifier | AST.Pattern | null = null;
      let type: AST.TypeNode | null = null;
      
      if (this.match(TokenType.LPAREN)) {
        param = this.parseIdentifier();
        if (this.match(TokenType.COLON)) {
          type = this.parseType();
        }
        this.expect(TokenType.RPAREN, 'Expected ")"');
      }
      
      const catchBody = this.parseBlockStatement();
      
      handlers.push({
        kind: 'CatchClause',
        param,
        type,
        body: catchBody,
        span: this.makeSpan(catchStart, catchBody.span.end),
      });
    }
    
    let finalizer: AST.BlockStatement | null = null;
    if (this.matchKeyword('finally')) {
      finalizer = this.parseBlockStatement();
    }
    
    return {
      kind: 'TryStatement',
      block,
      handlers,
      finalizer,
      span: this.makeSpan(start, (finalizer ?? handlers[handlers.length - 1]?.body ?? block).span.end),
    };
  }
  
  private parseReturnStatement(): AST.ReturnStatement {
    const start = this.peek().span.start;
    this.expectKeyword('return');
    
    let argument: AST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      argument = this.parseExpression();
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'ReturnStatement',
      argument,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseBreakStatement(): AST.BreakStatement {
    const start = this.peek().span.start;
    this.expectKeyword('break');
    
    let label: AST.Identifier | null = null;
    if (this.check(TokenType.IDENTIFIER)) {
      label = this.parseIdentifier();
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'BreakStatement',
      label,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseContinueStatement(): AST.ContinueStatement {
    const start = this.peek().span.start;
    this.expectKeyword('continue');
    
    let label: AST.Identifier | null = null;
    if (this.check(TokenType.IDENTIFIER)) {
      label = this.parseIdentifier();
    }
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'ContinueStatement',
      label,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseThrowStatement(): AST.ThrowStatement {
    const start = this.peek().span.start;
    this.expectKeyword('throw');
    
    const argument = this.parseExpression();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'ThrowStatement',
      argument,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseVariableDeclaration(decorators: AST.Decorator[]): AST.VariableDeclaration {
    const start = this.peek().span.start;
    const kind = this.advance().value as 'let' | 'const' | 'var';
    
    const declarations: AST.VariableDeclarator[] = [];
    
    do {
      const declStart = this.peek().span.start;
      const id = this.check(TokenType.LBRACE) || this.check(TokenType.LBRACKET)
        ? this.parsePattern()
        : this.parseIdentifier();
      
      let type: AST.TypeNode | null = null;
      if (this.match(TokenType.COLON)) {
        type = this.parseType();
      }
      
      let init: AST.Expression | null = null;
      if (this.match(TokenType.EQ)) {
        init = this.parseExpression();
      }
      
      declarations.push({
        kind: 'VariableDeclarator',
        id,
        type,
        init,
        span: this.makeSpan(declStart, this.previous().span.end),
      });
    } while (this.match(TokenType.COMMA));
    
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'VariableDeclaration',
      declarationKind: kind,
      declarations,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseExpressionStatement(): AST.ExpressionStatement {
    const start = this.peek().span.start;
    const expression = this.parseExpression();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'ExpressionStatement',
      expression,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseCommandStatement(): AST.CommandStatement {
    const start = this.peek().span.start;
    const prefix = this.check(TokenType.AT) ? '@' : '/';
    
    if (prefix === '@') {
      this.advance();
    } else {
      // Already consumed '/' as part of COMMAND_PREFIX
    }
    
    // For now, return a simplified command statement
    // Full implementation would parse all command variants
    const commandToken = this.check(TokenType.COMMAND_PREFIX) 
      ? this.advance()
      : this.peek();
    
    // Parse command body based on the command type
    // This is simplified - full implementation would handle all command types
    
    return {
      kind: 'CommandStatement',
      prefix: prefix as '/' | '@',
      command: {
        kind: 'HelpCommand',
        topic: null,
        span: commandToken.span,
      },
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  // Stub implementations for remaining declarations
  private parseTypeDeclaration(decorators: AST.Decorator[], modifiers: AST.Modifier[]): AST.TypeDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('type');
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    this.expect(TokenType.EQ, 'Expected "="');
    const type = this.parseType();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'TypeDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      type,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseInterfaceDeclaration(decorators: AST.Decorator[], modifiers: AST.Modifier[]): AST.InterfaceDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('interface');
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    
    const extendsClause: AST.TypeReference[] = [];
    if (this.matchKeyword('extends')) {
      do {
        extendsClause.push(this.parseTypeReference());
      } while (this.match(TokenType.COMMA));
    }
    
    this.expect(TokenType.LBRACE, 'Expected "{"');
    const members: AST.InterfaceMember[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      members.push(this.parseTypeObjectMember());
    }
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'InterfaceDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      extends: extendsClause,
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseEnumDeclaration(decorators: AST.Decorator[], modifiers: AST.Modifier[]): AST.EnumDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('enum');
    const id = this.parseIdentifier();
    
    this.expect(TokenType.LBRACE, 'Expected "{"');
    const members: AST.EnumMember[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const memberStart = this.peek().span.start;
      const name = this.parseIdentifier();
      let initializer: AST.Expression | null = null;
      if (this.match(TokenType.EQ)) {
        initializer = this.parseExpression();
      }
      members.push({
        kind: 'EnumMember',
        name,
        initializer,
        span: this.makeSpan(memberStart, this.previous().span.end),
      });
      this.match(TokenType.COMMA);
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'EnumDeclaration',
      decorators,
      modifiers,
      id,
      members,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseFunctionDeclaration(
    decorators: AST.Decorator[], 
    modifiers: AST.Modifier[],
    isAsync: boolean
  ): AST.FunctionDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('fn');
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    const parameters = this.parseParameterList();
    
    let returnType: AST.TypeNode | null = null;
    // Support both : and -> for return type
    if (this.match(TokenType.COLON) || this.match(TokenType.ARROW)) {
      returnType = this.parseType();
    }
    
    let body: AST.BlockStatement | null = null;
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlockStatement();
    } else {
      this.consumeOptionalSemicolon();
    }
    
    return {
      kind: 'FunctionDeclaration',
      decorators,
      modifiers,
      async: isAsync,
      id,
      typeParameters,
      parameters,
      returnType,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseSkillDeclaration(decorators: AST.Decorator[], modifiers: AST.Modifier[]): AST.SkillDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('skill');
    const id = this.parseIdentifier();
    const typeParameters = this.parseOptionalTypeParameters();
    
    this.expect(TokenType.LBRACE, 'Expected "{"');
    const members: AST.SkillMember[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.checkKeyword('items')) {
        const itemsStart = this.peek().span.start;
        this.advance();
        this.expect(TokenType.COLON, 'Expected ":"');
        this.expect(TokenType.LBRACKET, 'Expected "["');
        const items: AST.StringLiteral[] = [];
        while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
          items.push(this.parseStringLiteral());
          this.match(TokenType.COMMA);
        }
        this.expect(TokenType.RBRACKET, 'Expected "]"');
        this.consumeOptionalSemicolon();
        members.push({
          kind: 'SkillItemsDeclaration',
          items,
          span: this.makeSpan(itemsStart, this.previous().span.end),
        });
      } else if (this.checkKeyword('category')) {
        const catStart = this.peek().span.start;
        this.advance();
        this.expect(TokenType.COLON, 'Expected ":"');
        const category = this.parseStringLiteral();
        this.consumeOptionalSemicolon();
        members.push({
          kind: 'SkillCategoryDeclaration',
          category,
          span: this.makeSpan(catStart, this.previous().span.end),
        });
      } else {
        members.push(this.parsePropertyDeclaration([], []));
      }
    }
    
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'SkillDeclaration',
      decorators,
      modifiers,
      id,
      typeParameters,
      body: {
        kind: 'SkillBody',
        members,
        span: this.makeSpan(start, this.previous().span.end),
      },
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseImportDeclaration(): AST.ImportDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('import');
    
    const specifiers: AST.ImportSpecifier[] = [];
    
    // Default import
    if (this.check(TokenType.IDENTIFIER)) {
      const local = this.parseIdentifier();
      specifiers.push({
        kind: 'ImportDefaultSpecifier',
        local,
        span: local.span,
      });
      
      if (this.match(TokenType.COMMA)) {
        // Continue with named imports
      } else {
        this.expectKeyword('from');
        const source = this.parseStringLiteral();
        this.consumeOptionalSemicolon();
        return {
          kind: 'ImportDeclaration',
          specifiers,
          source,
          span: this.makeSpan(start, this.previous().span.end),
        };
      }
    }
    
    // Namespace import
    if (this.match(TokenType.STAR)) {
      this.expectKeyword('as');
      const local = this.parseIdentifier();
      specifiers.push({
        kind: 'ImportNamespaceSpecifier',
        local,
        span: this.makeSpan(start, local.span.end),
      });
    }
    
    // Named imports
    if (this.match(TokenType.LBRACE)) {
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const typeOnly = this.matchKeyword('type');
        const imported = this.parseIdentifier();
        let local = imported;
        
        if (this.matchKeyword('as')) {
          local = this.parseIdentifier();
        }
        
        specifiers.push({
          kind: 'ImportNamedSpecifier',
          imported,
          local,
          typeOnly,
          span: this.makeSpan(imported.span.start, local.span.end),
        });
        
        if (!this.check(TokenType.RBRACE)) {
          this.match(TokenType.COMMA);
        }
      }
      this.expect(TokenType.RBRACE, 'Expected "}"');
    }
    
    this.expectKeyword('from');
    const source = this.parseStringLiteral();
    this.consumeOptionalSemicolon();
    
    return {
      kind: 'ImportDeclaration',
      specifiers,
      source,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseExportDeclaration(): AST.ExportDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('export');
    
    // Default export
    if (this.matchKeyword('default')) {
      const declaration = this.parseStatement();
      return {
        kind: 'ExportDeclaration',
        declaration: declaration as AST.Declaration | null,
        specifiers: [],
        source: null,
        default: true,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Re-export all
    if (this.match(TokenType.STAR)) {
      let specifiers: AST.ExportSpecifier[] = [];
      
      if (this.matchKeyword('as')) {
        const exported = this.parseIdentifier();
        specifiers.push({
          kind: 'ExportSpecifier',
          local: exported,
          exported,
          span: exported.span,
        });
      }
      
      this.expectKeyword('from');
      const source = this.parseStringLiteral();
      this.consumeOptionalSemicolon();
      
      return {
        kind: 'ExportDeclaration',
        declaration: null,
        specifiers,
        source,
        default: false,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Named exports
    if (this.match(TokenType.LBRACE)) {
      const specifiers: AST.ExportSpecifier[] = [];
      
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const local = this.parseIdentifier();
        let exported = local;
        
        if (this.matchKeyword('as')) {
          exported = this.parseIdentifier();
        }
        
        specifiers.push({
          kind: 'ExportSpecifier',
          local,
          exported,
          span: this.makeSpan(local.span.start, exported.span.end),
        });
        
        if (!this.check(TokenType.RBRACE)) {
          this.match(TokenType.COMMA);
        }
      }
      this.expect(TokenType.RBRACE, 'Expected "}"');
      
      let source: AST.StringLiteral | null = null;
      if (this.matchKeyword('from')) {
        source = this.parseStringLiteral();
      }
      
      this.consumeOptionalSemicolon();
      
      return {
        kind: 'ExportDeclaration',
        declaration: null,
        specifiers,
        source,
        default: false,
        span: this.makeSpan(start, this.previous().span.end),
      };
    }
    
    // Export declaration
    const declaration = this.parseStatement();
    return {
      kind: 'ExportDeclaration',
      declaration: declaration as AST.Declaration | null,
      specifiers: [],
      source: null,
      default: false,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  private parseModuleDeclaration(): AST.ModuleDeclaration {
    const start = this.peek().span.start;
    this.expectKeyword('module');
    const id = this.parseQualifiedIdentifier();
    
    this.expect(TokenType.LBRACE, 'Expected "{"');
    const body: AST.Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    this.expect(TokenType.RBRACE, 'Expected "}"');
    
    return {
      kind: 'ModuleDeclaration',
      id,
      body,
      span: this.makeSpan(start, this.previous().span.end),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  //                           Token Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
  
  private peek(): Token {
    return this.tokens[this.current];
  }
  
  private peekNext(): Token | undefined {
    return this.tokens[this.current + 1];
  }
  
  private previous(): Token {
    return this.tokens[this.current - 1];
  }
  
  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  
  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }
  
  private checkKeyword(keyword: string): boolean {
    const token = this.peek();
    return token.type === TokenType.KEYWORD && token.value === keyword;
  }
  
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  
  private matchKeyword(keyword: string): boolean {
    if (this.checkKeyword(keyword)) {
      this.advance();
      return true;
    }
    return false;
  }
  
  private expect(type: TokenType | TokenType[], message: string): Token {
    const types = Array.isArray(type) ? type : [type];
    for (const t of types) {
      if (this.check(t)) {
        return this.advance();
      }
    }
    this.error(message);
    return this.peek(); // Unreachable
  }
  
  private expectKeyword(keyword: string): Token {
    if (this.checkKeyword(keyword)) {
      return this.advance();
    }
    this.error(`Expected "${keyword}"`);
    return this.peek(); // Unreachable
  }
  
  private consumeOptionalSemicolon(): void {
    this.match(TokenType.SEMICOLON);
  }
  
  private skipParameters(): void {
    // Skip parameters without creating AST nodes
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      if (this.check(TokenType.LPAREN) || this.check(TokenType.LBRACKET) || this.check(TokenType.LBRACE)) {
        this.skipNested();
      } else {
        this.advance();
      }
    }
  }
  
  private skipNested(): void {
    const open = this.advance();
    let depth = 1;
    const closeType = open.type === TokenType.LPAREN ? TokenType.RPAREN
      : open.type === TokenType.LBRACKET ? TokenType.RBRACKET
      : TokenType.RBRACE;
    const openType = open.type;
    
    while (depth > 0 && !this.isAtEnd()) {
      if (this.check(openType)) depth++;
      if (this.check(closeType)) depth--;
      this.advance();
    }
  }
  
  private position(): Position {
    const token = this.peek();
    return token.span.start;
  }
  
  private makeSpan(start: Position, end: Position): Span {
    return {
      start,
      end,
      source: this.source,
    };
  }
  
  private makeComment(token: Token): AST.Comment {
    return {
      kind: 'Comment',
      type: token.type === TokenType.COMMENT_LINE ? 'line'
        : token.type === TokenType.COMMENT_DOC ? 'doc'
        : 'block',
      value: token.value,
      span: token.span,
    };
  }
  
  private error(message: string): never {
    const token = this.peek();
    const error = createError(
      ErrorCode.PARSE_INVALID_SYNTAX,
      `${message} at ${token.span.start.line}:${token.span.start.column}`,
      { span: token.span, details: { found: token.value } }
    );
    this.errors.push(error);
    throw error;
  }
  
  private synchronize(): void {
    this.advance();
    
    while (!this.isAtEnd()) {
      // Synchronize at statement boundaries
      if (this.previous().type === TokenType.SEMICOLON) return;
      if (this.previous().type === TokenType.RBRACE) return;
      
      // Synchronize at declaration keywords
      if (this.check(TokenType.KEYWORD)) {
        const keyword = this.peek().value;
        if ([
          'persona', 'team', 'workflow', 'type', 'interface',
          'enum', 'fn', 'let', 'const', 'var', 'import', 'export',
          'if', 'for', 'while', 'try', 'return'
        ].includes(keyword)) {
          return;
        }
      }
      
      this.advance();
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse PCL source code into an AST
 */
export function parse(
  source: string,
  options?: ParserOptions
): Result<ParseResult, PCLError[]> {
  const parser = new Parser(source, options);
  return parser.parse();
}

/**
 * Parse and return just the program AST
 */
export function parseProgram(
  source: string,
  options?: ParserOptions
): Result<AST.Program, PCLError[]> {
  const result = parse(source, options);
  if (!result.ok) return result;
  return Ok(result.value.program);
}

/**
 * Parse a single expression
 */
export function parseExpression(
  source: string,
  options?: ParserOptions
): Result<AST.Expression, PCLError[]> {
  const parser = new Parser(`(${source})`, options);
  const result = parser.parse();
  if (!result.ok) return result;
  
  const stmt = result.value.program.statements[0];
  if (stmt?.kind === 'ExpressionStatement') {
    const expr = stmt.expression;
    if (expr.kind === 'ParenthesizedExpression') {
      return Ok(expr.expression);
    }
    return Ok(expr);
  }
  
  return Err([createError(
    ErrorCode.PARSE_INVALID_SYNTAX,
    'Expected expression',
    {}
  )]);
}

/**
 * Parse a type annotation
 */
export function parseType(
  source: string,
  options?: ParserOptions
): Result<AST.TypeNode, PCLError[]> {
  // Wrap in a type alias to parse
  const parser = new Parser(`type T = ${source}`, options);
  const result = parser.parse();
  if (!result.ok) return result;
  
  const stmt = result.value.program.statements[0];
  if (stmt?.kind === 'TypeDeclaration') {
    return Ok(stmt.type);
  }
  
  return Err([createError(
    ErrorCode.PARSE_INVALID_SYNTAX,
    'Expected type',
    {}
  )]);
}
