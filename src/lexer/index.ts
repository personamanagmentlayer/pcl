/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Lexer / Tokenizer Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @packageDocumentation
 * @module @pcl/lexer
 * @version 1.0.0
 */

import type { PCLError, Position, Result, Span } from '../types';
import { Err, ErrorCode, Ok, PCLError as createError } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOKEN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All token types in PCL
 */
export enum TokenType {
  // End of file
  EOF = 'EOF',

  // Whitespace & Comments
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE',
  COMMENT_LINE = 'COMMENT_LINE',
  COMMENT_BLOCK = 'COMMENT_BLOCK',
  COMMENT_DOC = 'COMMENT_DOC',

  // Identifiers & Keywords
  IDENTIFIER = 'IDENTIFIER',
  PERSONA_ID = 'PERSONA_ID', // Uppercase identifier
  KEYWORD = 'KEYWORD',

  // Literals
  STRING = 'STRING',
  STRING_TEMPLATE = 'STRING_TEMPLATE',
  STRING_RAW = 'STRING_RAW',
  NUMBER_INT = 'NUMBER_INT',
  NUMBER_FLOAT = 'NUMBER_FLOAT',
  NUMBER_HEX = 'NUMBER_HEX',
  NUMBER_BINARY = 'NUMBER_BINARY',
  NUMBER_OCTAL = 'NUMBER_OCTAL',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',

  // Punctuation
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  LBRACE = 'LBRACE', // {
  RBRACE = 'RBRACE', // }
  LT = 'LT', // <
  GT = 'GT', // >

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  PERCENT = 'PERCENT', // %
  STAR_STAR = 'STAR_STAR', // **

  PLUS_PLUS = 'PLUS_PLUS', // ++
  MINUS_MINUS = 'MINUS_MINUS', // --

  EQ = 'EQ', // =
  PLUS_EQ = 'PLUS_EQ', // +=
  MINUS_EQ = 'MINUS_EQ', // -=
  STAR_EQ = 'STAR_EQ', // *=
  SLASH_EQ = 'SLASH_EQ', // /=
  PERCENT_EQ = 'PERCENT_EQ', // %=
  STAR_STAR_EQ = 'STAR_STAR_EQ', // **=

  EQ_EQ = 'EQ_EQ', // ==
  BANG_EQ = 'BANG_EQ', // !=
  EQ_EQ_EQ = 'EQ_EQ_EQ', // ===
  BANG_EQ_EQ = 'BANG_EQ_EQ', // !==
  LT_EQ = 'LT_EQ', // <=
  GT_EQ = 'GT_EQ', // >=
  LT_EQ_GT = 'LT_EQ_GT', // <=>

  AMP = 'AMP', // &
  PIPE = 'PIPE', // |
  CARET = 'CARET', // ^
  TILDE = 'TILDE', // ~
  AMP_AMP = 'AMP_AMP', // &&
  PIPE_PIPE = 'PIPE_PIPE', // ||
  BANG = 'BANG', // !
  QUESTION = 'QUESTION', // ?
  QUESTION_QUESTION = 'QUESTION_QUESTION', // ??
  QUESTION_DOT = 'QUESTION_DOT', // ?.
  QUESTION_LBRACKET = 'QUESTION_LBRACKET', // ?[

  AMP_EQ = 'AMP_EQ', // &=
  PIPE_EQ = 'PIPE_EQ', // |=
  CARET_EQ = 'CARET_EQ', // ^=
  AMP_AMP_EQ = 'AMP_AMP_EQ', // &&=
  PIPE_PIPE_EQ = 'PIPE_PIPE_EQ', // ||=
  QUESTION_QUESTION_EQ = 'QUESTION_QUESTION_EQ', // ??=

  LT_LT = 'LT_LT', // <<
  GT_GT = 'GT_GT', // >>
  GT_GT_GT = 'GT_GT_GT', // >>>
  LT_LT_EQ = 'LT_LT_EQ', // <<=
  GT_GT_EQ = 'GT_GT_EQ', // >>=

  // Special operators
  ARROW = 'ARROW', // ->
  FAT_ARROW = 'FAT_ARROW', // =>
  TILDE_GT = 'TILDE_GT', // ~>
  LT_MINUS_GT = 'LT_MINUS_GT', // <->

  DOT = 'DOT', // .
  DOT_DOT = 'DOT_DOT', // ..
  DOT_DOT_DOT = 'DOT_DOT_DOT', // ...
  COLON = 'COLON', // :
  COLON_COLON = 'COLON_COLON', // ::
  SEMICOLON = 'SEMICOLON', // ;
  COMMA = 'COMMA', // ,
  AT = 'AT', // @
  HASH = 'HASH', // #

  // Template literals
  TEMPLATE_HEAD = 'TEMPLATE_HEAD', // `...${
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE', // }...${
  TEMPLATE_TAIL = 'TEMPLATE_TAIL', // }...`
  TEMPLATE_LITERAL = 'TEMPLATE_LITERAL', // `...`

  // PCL-specific
  COMMAND_PREFIX = 'COMMAND_PREFIX', // /persona

  // Error
  ERROR = 'ERROR',
}

/**
 * Keywords in PCL
 */
export const KEYWORDS = new Set([
  // Declaration keywords
  'persona',
  'team',
  'workflow',
  'skill',
  'constraint',
  'type',
  'interface',
  'enum',
  'fn',
  'let',
  'const',
  'var',
  'import',
  'export',
  'default',
  'from',
  'module',
  'package',

  // Control flow
  'if',
  'else',
  'match',
  'for',
  'while',
  'loop',
  'break',
  'continue',
  'return',
  'yield',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'then',

  // Modifiers
  'pub',
  'priv',
  'mut',
  'async',
  'static',
  'abstract',
  'override',
  'final',
  'lazy',
  'inline',
  'readonly',

  // Type keywords
  'String',
  'Int',
  'Float',
  'Bool',
  'Void',
  'Never',
  'Any',
  'Unknown',
  'Self',
  'Option',
  'Result',
  'Array',
  'Map',
  'Set',
  'Tuple',

  // Composition
  'merge',
  'primary',
  'chain',
  'parallel',
  'spawn',
  'delegate',
  'isolate',
  'compose',
  'extends',
  'implements',
  'with',
  'as',
  'requires',

  // Literals
  'true',
  'false',
  'null',
  'none',
  'some',

  // Operators
  'and',
  'or',
  'not',
  'in',
  'is',
  'typeof',
  'instanceof',
  'new',
  'keyof',
  'infer',

  // PCL-specific
  'skills',
  'constraints',
  'tags',
  'members',
  'steps',
  'input',
  'output',
  'timeout',
  'retry',
  'fallback',
  'quorum',
  'conflict',
  'weights',
  'topic',
  'depth',
  'verbosity',
  'tone',
  'context',
  'lang',
  'trace',
  'audit',
  'times',
  'until',

  // Merge modes
  'Primary',
  'Consensus',
  'Majority',
  'Dissent',
  'Compare',
  'Append',
  'Debate',
  'Chain',
  'Vote',
  'Weighted',
  'RoundRobin',
  'Random',
]);

/**
 * Reserved words (for future use)
 */
export const RESERVED = new Set([
  'class',
  'struct',
  'trait',
  'impl',
  'macro',
  'unsafe',
  'extern',
  'super',
  'this',
  'delete',
  'sizeof',
  'alignof',
  'offsetof',
  'asm',
  'volatile',
]);

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOKEN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Token representation
 */
export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly span: Span;
  readonly raw?: string; // Original source text
  readonly escaped?: string; // For string literals
  readonly keyword?: string; // For keyword tokens
  readonly error?: string; // Error message for ERROR tokens
}

/**
 * Create a token
 */
export function createToken(
  type: TokenType,
  value: string,
  span: Span,
  options?: {
    raw?: string;
    escaped?: string;
    keyword?: string;
    error?: string;
  }
): Token {
  return {
    type,
    value,
    span,
    ...options,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              LEXER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lexer options
 */
export interface LexerOptions {
  /** Include whitespace tokens */
  includeWhitespace?: boolean;
  /** Include comment tokens */
  includeComments?: boolean;
  /** Source file name (for error reporting) */
  source?: string;
  /** Starting position */
  startPosition?: Position;
}

/**
 * PCL Lexer / Tokenizer
 */
export class Lexer {
  private readonly input: string;
  private readonly source: string;
  private readonly includeWhitespace: boolean;
  private readonly includeComments: boolean;

  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private startPos: number = 0;
  private startLine: number = 1;
  private startColumn: number = 1;

  private readonly tokens: Token[] = [];
  private readonly errors: PCLError[] = [];

  constructor(input: string, options: LexerOptions = {}) {
    this.input = input;
    this.source = options.source ?? '<anonymous>';
    this.includeWhitespace = options.includeWhitespace ?? false;
    this.includeComments = options.includeComments ?? false;

    if (options.startPosition) {
      this.line = options.startPosition.line;
      this.column = options.startPosition.column;
      this.pos = options.startPosition.offset;
    }
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Result<Token[], PCLError[]> {
    while (!this.isAtEnd()) {
      this.startPos = this.pos;
      this.startLine = this.line;
      this.startColumn = this.column;

      const token = this.scanToken();
      if (token) {
        // Filter based on options
        if (
          token.type === TokenType.WHITESPACE ||
          token.type === TokenType.NEWLINE
        ) {
          if (this.includeWhitespace) {
            this.tokens.push(token);
          }
        } else if (
          token.type === TokenType.COMMENT_LINE ||
          token.type === TokenType.COMMENT_BLOCK ||
          token.type === TokenType.COMMENT_DOC
        ) {
          if (this.includeComments) {
            this.tokens.push(token);
          }
        } else {
          this.tokens.push(token);
        }
      }
    }

    // Add EOF token
    this.tokens.push(this.makeToken(TokenType.EOF, ''));

    if (this.errors.length > 0) {
      return Err(this.errors);
    }

    return Ok(this.tokens);
  }

  /**
   * Get next token (for streaming)
   */
  nextToken(): Token {
    while (!this.isAtEnd()) {
      this.startPos = this.pos;
      this.startLine = this.line;
      this.startColumn = this.column;

      const token = this.scanToken();
      if (token) {
        // Filter whitespace and comments unless requested
        if (
          token.type === TokenType.WHITESPACE ||
          token.type === TokenType.NEWLINE
        ) {
          if (this.includeWhitespace) return token;
          continue;
        }
        if (
          token.type === TokenType.COMMENT_LINE ||
          token.type === TokenType.COMMENT_BLOCK ||
          token.type === TokenType.COMMENT_DOC
        ) {
          if (this.includeComments) return token;
          continue;
        }
        return token;
      }
    }

    return this.makeToken(TokenType.EOF, '');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //                           Scanning
  // ─────────────────────────────────────────────────────────────────────────────

  private scanToken(): Token | null {
    const c = this.advance();

    switch (c) {
      // Single-character tokens
      case '(':
        return this.makeToken(TokenType.LPAREN, c);
      case ')':
        return this.makeToken(TokenType.RPAREN, c);
      case '[':
        return this.makeToken(TokenType.LBRACKET, c);
      case ']':
        return this.makeToken(TokenType.RBRACKET, c);
      case '{':
        return this.makeToken(TokenType.LBRACE, c);
      case '}':
        return this.makeToken(TokenType.RBRACE, c);
      case ',':
        return this.makeToken(TokenType.COMMA, c);
      case ';':
        return this.makeToken(TokenType.SEMICOLON, c);
      case '~':
        return this.match('>')
          ? this.makeToken(TokenType.TILDE_GT, '~>')
          : this.makeToken(TokenType.TILDE, c);
      case '^':
        return this.match('=')
          ? this.makeToken(TokenType.CARET_EQ, '^=')
          : this.makeToken(TokenType.CARET, c);
      case '@':
        return this.makeToken(TokenType.AT, c);
      case '#':
        return this.makeToken(TokenType.HASH, c);

      // Multi-character operators
      case '+':
        if (this.match('+')) return this.makeToken(TokenType.PLUS_PLUS, '++');
        if (this.match('=')) return this.makeToken(TokenType.PLUS_EQ, '+=');
        return this.makeToken(TokenType.PLUS, c);

      case '-':
        if (this.match('-')) return this.makeToken(TokenType.MINUS_MINUS, '--');
        if (this.match('=')) return this.makeToken(TokenType.MINUS_EQ, '-=');
        if (this.match('>')) return this.makeToken(TokenType.ARROW, '->');
        return this.makeToken(TokenType.MINUS, c);

      case '*':
        if (this.match('*')) {
          if (this.match('='))
            return this.makeToken(TokenType.STAR_STAR_EQ, '**=');
          return this.makeToken(TokenType.STAR_STAR, '**');
        }
        if (this.match('=')) return this.makeToken(TokenType.STAR_EQ, '*=');
        return this.makeToken(TokenType.STAR, c);

      case '/':
        // Comments
        if (this.match('/')) {
          if (this.peek() === '/') {
            this.advance();
            return this.scanDocComment();
          }
          return this.scanLineComment();
        }
        if (this.match('*')) return this.scanBlockComment();
        if (this.match('=')) return this.makeToken(TokenType.SLASH_EQ, '/=');
        // Check for /persona command
        if (this.isAlpha(this.peek())) {
          return this.scanCommandPrefix();
        }
        return this.makeToken(TokenType.SLASH, c);

      case '%':
        if (this.match('=')) return this.makeToken(TokenType.PERCENT_EQ, '%=');
        return this.makeToken(TokenType.PERCENT, c);

      case '=':
        if (this.match('=')) {
          if (this.match('=')) return this.makeToken(TokenType.EQ_EQ_EQ, '===');
          return this.makeToken(TokenType.EQ_EQ, '==');
        }
        if (this.match('>')) return this.makeToken(TokenType.FAT_ARROW, '=>');
        return this.makeToken(TokenType.EQ, c);

      case '!':
        if (this.match('=')) {
          if (this.match('='))
            return this.makeToken(TokenType.BANG_EQ_EQ, '!==');
          return this.makeToken(TokenType.BANG_EQ, '!=');
        }
        return this.makeToken(TokenType.BANG, c);

      case '<':
        if (this.match('<')) {
          if (this.match('=')) return this.makeToken(TokenType.LT_LT_EQ, '<<=');
          return this.makeToken(TokenType.LT_LT, '<<');
        }
        if (this.match('=')) {
          if (this.match('>')) return this.makeToken(TokenType.LT_EQ_GT, '<=>');
          return this.makeToken(TokenType.LT_EQ, '<=');
        }
        if (this.match('-')) {
          if (this.match('>'))
            return this.makeToken(TokenType.LT_MINUS_GT, '<->');
          // Backtrack
          this.pos--;
          this.column--;
        }
        return this.makeToken(TokenType.LT, c);

      case '>':
        if (this.match('>')) {
          if (this.match('>')) return this.makeToken(TokenType.GT_GT_GT, '>>>');
          if (this.match('=')) return this.makeToken(TokenType.GT_GT_EQ, '>>=');
          return this.makeToken(TokenType.GT_GT, '>>');
        }
        if (this.match('=')) return this.makeToken(TokenType.GT_EQ, '>=');
        return this.makeToken(TokenType.GT, c);

      case '&':
        if (this.match('&')) {
          if (this.match('='))
            return this.makeToken(TokenType.AMP_AMP_EQ, '&&=');
          return this.makeToken(TokenType.AMP_AMP, '&&');
        }
        if (this.match('=')) return this.makeToken(TokenType.AMP_EQ, '&=');
        return this.makeToken(TokenType.AMP, c);

      case '|':
        if (this.match('|')) {
          if (this.match('='))
            return this.makeToken(TokenType.PIPE_PIPE_EQ, '||=');
          return this.makeToken(TokenType.PIPE_PIPE, '||');
        }
        if (this.match('=')) return this.makeToken(TokenType.PIPE_EQ, '|=');
        return this.makeToken(TokenType.PIPE, c);

      case '?':
        if (this.match('?')) {
          if (this.match('='))
            return this.makeToken(TokenType.QUESTION_QUESTION_EQ, '??=');
          return this.makeToken(TokenType.QUESTION_QUESTION, '??');
        }
        if (this.match('.'))
          return this.makeToken(TokenType.QUESTION_DOT, '?.');
        if (this.match('['))
          return this.makeToken(TokenType.QUESTION_LBRACKET, '?[');
        return this.makeToken(TokenType.QUESTION, c);

      case '.':
        if (this.match('.')) {
          if (this.match('.'))
            return this.makeToken(TokenType.DOT_DOT_DOT, '...');
          return this.makeToken(TokenType.DOT_DOT, '..');
        }
        // Check for .123 float
        if (this.isDigit(this.peek())) {
          return this.scanNumber(true);
        }
        return this.makeToken(TokenType.DOT, c);

      case ':':
        if (this.match(':')) return this.makeToken(TokenType.COLON_COLON, '::');
        return this.makeToken(TokenType.COLON, c);

      // Whitespace
      case ' ':
      case '\t':
      case '\r':
        return this.scanWhitespace();

      case '\n':
        this.line++;
        this.column = 1;
        return this.makeToken(TokenType.NEWLINE, c);

      // Strings
      case '"':
        return this.scanString('"');
      case "'":
        return this.scanString("'");
      case '`':
        return this.scanTemplateString();

      default:
        // Numbers
        if (this.isDigit(c)) {
          return this.scanNumber(false, c);
        }

        // Identifiers and keywords
        if (this.isAlpha(c)) {
          return this.scanIdentifier();
        }

      // Unknown character - fall through to error
    }
    return this.errorToken(`Unexpected character: '${this.peek()}'`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //                           Specific Scanners
  // ─────────────────────────────────────────────────────────────────────────────

  private scanWhitespace(): Token {
    while (
      this.peek() === ' ' ||
      this.peek() === '\t' ||
      this.peek() === '\r'
    ) {
      this.advance();
    }
    return this.makeToken(
      TokenType.WHITESPACE,
      this.input.slice(this.startPos, this.pos)
    );
  }

  private scanLineComment(): Token {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
    const value = this.input.slice(this.startPos + 2, this.pos);
    return this.makeToken(TokenType.COMMENT_LINE, value);
  }

  private scanDocComment(): Token {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
    const value = this.input.slice(this.startPos + 3, this.pos);
    return this.makeToken(TokenType.COMMENT_DOC, value);
  }

  private scanBlockComment(): Token {
    let depth = 1;

    while (depth > 0 && !this.isAtEnd()) {
      if (this.peek() === '/' && this.peekNext() === '*') {
        this.advance();
        this.advance();
        depth++;
      } else if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance();
        this.advance();
        depth--;
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 0;
        }
        this.advance();
      }
    }

    if (depth > 0) {
      return this.errorToken('Unterminated block comment');
    }

    // Check if it's a doc comment (starts with /**)
    const raw = this.input.slice(this.startPos, this.pos);
    const isDoc = raw.startsWith('/**') && !raw.startsWith('/***');
    const value = raw.slice(isDoc ? 3 : 2, -2);

    return this.makeToken(
      isDoc ? TokenType.COMMENT_DOC : TokenType.COMMENT_BLOCK,
      value.trim()
    );
  }

  private scanCommandPrefix(): Token {
    // Already consumed '/'
    // Scan the command name
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const value = this.input.slice(this.startPos, this.pos);
    return this.makeToken(TokenType.COMMAND_PREFIX, value);
  }

  private scanString(quote: string): Token {
    const escaped: string[] = [];
    const raw: string[] = [quote];

    while (this.peek() !== quote && !this.isAtEnd()) {
      const c = this.peek();

      if (c === '\n') {
        return this.errorToken('Unterminated string literal');
      }

      if (c === '\\') {
        raw.push(c);
        this.advance();

        const escape = this.peek();
        raw.push(escape);
        this.advance();

        const result = this.processEscape(escape);
        if (result.error) {
          return this.errorToken(result.error);
        }
        escaped.push(result.value!);
      } else {
        raw.push(c);
        escaped.push(c);
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      return this.errorToken('Unterminated string literal');
    }

    // Consume closing quote
    raw.push(this.advance());

    return {
      ...this.makeToken(TokenType.STRING, escaped.join('')),
      raw: raw.join(''),
      escaped: escaped.join(''),
    };
  }

  private scanTemplateString(): Token {
    // Already consumed opening backtick
    const parts: string[] = [];
    const raw: string[] = ['`'];
    let hasExpressions = false;

    while (!this.isAtEnd()) {
      const c = this.peek();

      if (c === '`') {
        raw.push(this.advance());
        break;
      }

      if (c === '$' && this.peekNext() === '{') {
        hasExpressions = true;
        raw.push(this.advance()); // $
        raw.push(this.advance()); // {

        // For now, just mark it - parser will handle nested expressions
        return {
          ...this.makeToken(TokenType.TEMPLATE_HEAD, parts.join('')),
          raw: raw.join(''),
        };
      }

      if (c === '\\') {
        raw.push(c);
        this.advance();
        const escape = this.peek();
        raw.push(escape);
        this.advance();
        const result = this.processEscape(escape);
        if (result.error) {
          return this.errorToken(result.error);
        }
        parts.push(result.value!);
      } else {
        if (c === '\n') {
          this.line++;
          this.column = 0;
        }
        raw.push(c);
        parts.push(c);
        this.advance();
      }
    }

    if (this.isAtEnd() && this.input[this.pos - 1] !== '`') {
      return this.errorToken('Unterminated template literal');
    }

    return {
      ...this.makeToken(TokenType.TEMPLATE_LITERAL, parts.join('')),
      raw: raw.join(''),
    };
  }

  private processEscape(c: string): { value?: string; error?: string } {
    switch (c) {
      case 'n':
        return { value: '\n' };
      case 'r':
        return { value: '\r' };
      case 't':
        return { value: '\t' };
      case 'b':
        return { value: '\b' };
      case 'f':
        return { value: '\f' };
      case 'v':
        return { value: '\v' };
      case '0':
        return { value: '\0' };
      case '\\':
        return { value: '\\' };
      case "'":
        return { value: "'" };
      case '"':
        return { value: '"' };
      case '`':
        return { value: '`' };
      case '$':
        return { value: '$' };
      case 'x': {
        // Hex escape \xHH
        const hex = this.input.slice(this.pos, this.pos + 2);
        if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
          return { error: String.raw`Invalid hex escape sequence: \x${hex}` };
        }
        this.pos += 2;
        this.column += 2;
        return { value: String.fromCodePoint(Number.parseInt(hex, 16)) };
      }
      case 'u':
        // Unicode escape \uHHHH or \u{H...}
        if (this.peek() === '{') {
          this.advance(); // consume {
          let unicode = '';
          while (this.peek() !== '}' && !this.isAtEnd()) {
            unicode += this.advance();
          }
          if (this.isAtEnd()) {
            return { error: 'Unterminated unicode escape sequence' };
          }
          this.advance();
          const codePoint = Number.parseInt(unicode, 16);
          if (Number.isNaN(codePoint) || codePoint > 0x10ffff) {
            return { error: `Invalid unicode code point: ${unicode}` };
          }
          return { value: String.fromCodePoint(codePoint) };
        } else {
          const unicode4 = this.input.slice(this.pos, this.pos + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(unicode4)) {
            return {
              error: String.raw`Invalid unicode escape sequence: \u${unicode4}`,
            };
          }
          this.pos += 4;
          this.column += 4;
          return { value: String.fromCodePoint(Number.parseInt(unicode4, 16)) };
        }
      default:
        // Unknown escape - return as-is (permissive)
        return { value: c };
    }
  }

  private scanNumber(startsWithDot: boolean, firstChar?: string): Token {
    let raw = startsWithDot ? '.' : (firstChar ?? '');

    // Check for hex, octal, or binary
    if (!startsWithDot && firstChar === '0') {
      const next = this.peek().toLowerCase();

      if (next === 'x') {
        raw += this.advance();
        while (this.isHexDigit(this.peek()) || this.peek() === '_') {
          raw += this.advance();
        }
        const cleanValue = raw.replaceAll('_', '');
        return {
          ...this.makeToken(TokenType.NUMBER_HEX, cleanValue),
          raw,
        };
      }

      if (next === 'o') {
        raw += this.advance();
        while (this.isOctalDigit(this.peek()) || this.peek() === '_') {
          raw += this.advance();
        }
        const cleanValue = raw.replaceAll('_', '');
        return {
          ...this.makeToken(TokenType.NUMBER_OCTAL, cleanValue),
          raw,
        };
      }

      if (next === 'b') {
        raw += this.advance();
        while (
          this.peek() === '0' ||
          this.peek() === '1' ||
          this.peek() === '_'
        ) {
          raw += this.advance();
        }
        const cleanValue = raw.replaceAll('_', '');
        return {
          ...this.makeToken(TokenType.NUMBER_BINARY, cleanValue),
          raw,
        };
      }
    }

    // Decimal integer part
    while (this.isDigit(this.peek()) || this.peek() === '_') {
      raw += this.advance();
    }

    // Fractional part
    let isFloat = startsWithDot;
    if (
      !startsWithDot &&
      this.peek() === '.' &&
      this.isDigit(this.peekNext())
    ) {
      raw += this.advance(); // consume '.'
      isFloat = true;
      while (this.isDigit(this.peek()) || this.peek() === '_') {
        raw += this.advance();
      }
    }

    // Exponent part
    if (this.peek().toLowerCase() === 'e') {
      raw += this.advance();
      isFloat = true;
      if (this.peek() === '+' || this.peek() === '-') {
        raw += this.advance();
      }
      if (!this.isDigit(this.peek())) {
        return this.errorToken('Invalid number: expected exponent digits');
      }
      while (this.isDigit(this.peek()) || this.peek() === '_') {
        raw += this.advance();
      }
    }

    // Check for duration suffix (ms, s, m, h, d)
    const durationMatch = /^(ms|[smhd])$/.exec(
      this.input.slice(this.pos, this.pos + 2)
    );
    if (durationMatch) {
      // This will be handled at the parser level
      // For now, just return the number
    }

    const cleanValue = raw.replaceAll('_', '');
    return {
      ...this.makeToken(
        isFloat ? TokenType.NUMBER_FLOAT : TokenType.NUMBER_INT,
        cleanValue
      ),
      raw,
    };
  }

  private scanIdentifier(): Token {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const value = this.input.slice(this.startPos, this.pos);

    // Check for boolean literals
    if (value === 'true' || value === 'false') {
      return {
        ...this.makeToken(TokenType.BOOLEAN, value),
        keyword: value,
      };
    }

    // Check for null literals
    if (value === 'null' || value === 'none') {
      return {
        ...this.makeToken(TokenType.NULL, value),
        keyword: value,
      };
    }

    // Check for keywords
    if (KEYWORDS.has(value)) {
      return {
        ...this.makeToken(TokenType.KEYWORD, value),
        keyword: value,
      };
    }

    // Check for reserved words
    if (RESERVED.has(value)) {
      return this.errorToken(
        `Reserved word '${value}' cannot be used as identifier`
      );
    }

    // Check if it's a persona ID (all uppercase)
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
      return this.makeToken(TokenType.PERSONA_ID, value);
    }

    return this.makeToken(TokenType.IDENTIFIER, value);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //                           Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private isAtEnd(): boolean {
    return this.pos >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.input.length) return '\0';
    return this.input[this.pos + 1];
  }

  private advance(): string {
    const c = this.input[this.pos];
    this.pos++;
    this.column++;
    return c;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.input[this.pos] !== expected) return false;
    this.pos++;
    this.column++;
    return true;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isHexDigit(c: string): boolean {
    return this.isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
  }

  private isOctalDigit(c: string): boolean {
    return c >= '0' && c <= '7';
  }

  private isAlpha(c: string): boolean {
    return (
      (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$'
    );
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private makeToken(type: TokenType, value: string): Token {
    const span: Span = {
      start: {
        line: this.startLine,
        column: this.startColumn,
        offset: this.startPos,
      },
      end: {
        line: this.line,
        column: this.column,
        offset: this.pos,
      },
      source: this.source,
    };

    return createToken(type, value, span);
  }

  private errorToken(message: string): Token {
    const token = this.makeToken(
      TokenType.ERROR,
      this.input.slice(this.startPos, this.pos)
    );

    const error = createError(ErrorCode.PARSE_INVALID_SYNTAX, message, {
      span: token.span,
    });
    this.errors.push(error);

    return {
      ...token,
      error: message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tokenize PCL source code
 */
export function tokenize(
  source: string,
  options?: LexerOptions
): Result<Token[], PCLError[]> {
  const lexer = new Lexer(source, options);
  return lexer.tokenize();
}

/**
 * Create a streaming token iterator
 */
export function* tokenStream(
  source: string,
  options?: LexerOptions
): Generator<Token, void, unknown> {
  const lexer = new Lexer(source, options);
  let token: Token;

  do {
    token = lexer.nextToken();
    yield token;
  } while (token.type !== TokenType.EOF);
}

/**
 * Check if a token is a keyword
 */
export function isKeyword(token: Token): boolean {
  return token.type === TokenType.KEYWORD;
}

/**
 * Check if a token is an identifier
 */
export function isIdentifier(token: Token): boolean {
  return (
    token.type === TokenType.IDENTIFIER || token.type === TokenType.PERSONA_ID
  );
}

/**
 * Check if a token is a literal
 */
export function isLiteral(token: Token): boolean {
  return [
    TokenType.STRING,
    TokenType.NUMBER_INT,
    TokenType.NUMBER_FLOAT,
    TokenType.NUMBER_HEX,
    TokenType.NUMBER_BINARY,
    TokenType.NUMBER_OCTAL,
    TokenType.BOOLEAN,
    TokenType.NULL,
    TokenType.TEMPLATE_LITERAL,
  ].includes(token.type);
}

/**
 * Check if a token is a binary operator
 */
export function isBinaryOperator(token: Token): boolean {
  return [
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.STAR,
    TokenType.SLASH,
    TokenType.PERCENT,
    TokenType.STAR_STAR,
    TokenType.EQ_EQ,
    TokenType.BANG_EQ,
    TokenType.EQ_EQ_EQ,
    TokenType.BANG_EQ_EQ,
    TokenType.LT,
    TokenType.GT,
    TokenType.LT_EQ,
    TokenType.GT_EQ,
    TokenType.LT_EQ_GT,
    TokenType.AMP_AMP,
    TokenType.PIPE_PIPE,
    TokenType.QUESTION_QUESTION,
    TokenType.AMP,
    TokenType.PIPE,
    TokenType.CARET,
    TokenType.LT_LT,
    TokenType.GT_GT,
    TokenType.GT_GT_GT,
    TokenType.ARROW,
    TokenType.FAT_ARROW,
  ].includes(token.type);
}

/**
 * Check if a token is an assignment operator
 */
export function isAssignmentOperator(token: Token): boolean {
  return [
    TokenType.EQ,
    TokenType.PLUS_EQ,
    TokenType.MINUS_EQ,
    TokenType.STAR_EQ,
    TokenType.SLASH_EQ,
    TokenType.PERCENT_EQ,
    TokenType.STAR_STAR_EQ,
    TokenType.AMP_EQ,
    TokenType.PIPE_EQ,
    TokenType.CARET_EQ,
    TokenType.LT_LT_EQ,
    TokenType.GT_GT_EQ,
    TokenType.AMP_AMP_EQ,
    TokenType.PIPE_PIPE_EQ,
    TokenType.QUESTION_QUESTION_EQ,
  ].includes(token.type);
}

/**
 * Get operator precedence
 */
export function getOperatorPrecedence(token: Token): number {
  switch (token.type) {
    case TokenType.COMMA:
      return 1;
    case TokenType.EQ:
    case TokenType.PLUS_EQ:
    case TokenType.MINUS_EQ:
    case TokenType.STAR_EQ:
    case TokenType.SLASH_EQ:
    case TokenType.PERCENT_EQ:
    case TokenType.STAR_STAR_EQ:
    case TokenType.AMP_EQ:
    case TokenType.PIPE_EQ:
    case TokenType.CARET_EQ:
    case TokenType.LT_LT_EQ:
    case TokenType.GT_GT_EQ:
    case TokenType.AMP_AMP_EQ:
    case TokenType.PIPE_PIPE_EQ:
    case TokenType.QUESTION_QUESTION_EQ:
      return 2;
    case TokenType.QUESTION:
      return 3; // Ternary
    case TokenType.QUESTION_QUESTION:
      return 4;
    case TokenType.PIPE_PIPE:
      return 5;
    case TokenType.AMP_AMP:
      return 6;
    case TokenType.PIPE:
      return 7;
    case TokenType.CARET:
      return 8;
    case TokenType.AMP:
      return 9;
    case TokenType.EQ_EQ:
    case TokenType.BANG_EQ:
    case TokenType.EQ_EQ_EQ:
    case TokenType.BANG_EQ_EQ:
      return 10;
    case TokenType.LT:
    case TokenType.GT:
    case TokenType.LT_EQ:
    case TokenType.GT_EQ:
    case TokenType.LT_EQ_GT:
      return 11;
    case TokenType.LT_LT:
    case TokenType.GT_GT:
    case TokenType.GT_GT_GT:
      return 12;
    case TokenType.PLUS:
    case TokenType.MINUS:
      return 13;
    case TokenType.STAR:
    case TokenType.SLASH:
    case TokenType.PERCENT:
      return 14;
    case TokenType.STAR_STAR:
      return 15; // Right-associative
    case TokenType.BANG:
    case TokenType.TILDE:
    case TokenType.PLUS_PLUS:
    case TokenType.MINUS_MINUS:
      return 16; // Unary
    case TokenType.DOT:
    case TokenType.QUESTION_DOT:
    case TokenType.LBRACKET:
    case TokenType.QUESTION_LBRACKET:
    case TokenType.LPAREN:
      return 17; // Member access / call
    default:
      return 0;
  }
}
