/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL LSP - Rename Symbol
 * Phase 3: Workspace-wide rename with preview and conflict detection
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  PrepareRenameParams,
  Range,
  RenameParams,
  TextDocumentPositionParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver';
import { parse } from '../parser/index.js';
import type * as AST from '../ast/index.js';

export interface RenameConflict {
  /** Conflicting symbol */
  symbol: string;
  /** Location of conflict */
  location: Range;
  /** File URI */
  uri: string;
  /** Conflict type */
  type: 'shadowing' | 'duplicate' | 'reserved' | 'syntax';
  /** Description of conflict */
  message: string;
}

export interface RenamePreview {
  /** All text edits across workspace */
  edits: Map<string, TextEdit[]>;
  /** Detected conflicts */
  conflicts: RenameConflict[];
  /** Number of files affected */
  fileCount: number;
  /** Number of references renamed */
  referenceCount: number;
  /** Whether rename is safe */
  isSafe: boolean;
}

/**
 * Rename symbol provider for PCL
 * Supports workspace-wide rename with conflict detection
 */
export class RenameProvider {
  // Reserved keywords that cannot be used as identifiers
  private readonly RESERVED_KEYWORDS = new Set([
    'persona',
    'team',
    'workflow',
    'skill',
    'context',
    'import',
    'export',
    'from',
    'as',
    'let',
    'const',
    'if',
    'else',
    'for',
    'while',
    'return',
    'true',
    'false',
    'null',
    'undefined',
  ]);

  constructor() {
    // No state needed - all methods are functional
  }

  /**
   * Prepare rename operation (validate position and return range)
   */
  async prepareRename(
    params: PrepareRenameParams,
    source: string
  ): Promise<{ range: Range; placeholder: string } | null> {
    const position = params.position;

    // Parse source
    const parseResult = parse(source);
    if (!parseResult.ok) {
      return null;
    }

    const ast = parseResult.value.program;

    // Find symbol at position
    const symbol = this.findSymbolAtPosition(ast, position, source);
    if (!symbol) {
      return null;
    }

    // Check if symbol can be renamed
    if (!this.canRenameSymbol(symbol)) {
      return null;
    }

    return {
      range: this.nodeToRange(symbol.node),
      placeholder: symbol.name,
    };
  }

  /**
   * Perform rename operation
   */
  async rename(
    params: RenameParams,
    source: string,
    workspaceFiles: Map<string, string>
  ): Promise<WorkspaceEdit | null> {
    const { textDocument, position, newName } = params;

    // Validate new name
    const validation = this.validateNewName(newName);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid name');
    }

    // Parse current file
    const parseResult = parse(source);
    if (!parseResult.ok) {
      return null;
    }

    const ast = parseResult.value.program;

    // Find symbol to rename
    const symbol = this.findSymbolAtPosition(ast, position, source);
    if (!symbol || !this.canRenameSymbol(symbol)) {
      return null;
    }

    // Get preview with conflict detection
    const preview = await this.getPreview(symbol, newName, textDocument.uri, source, workspaceFiles);

    // Check for conflicts
    if (preview.conflicts.length > 0) {
      // Return edits anyway but client should show conflicts
      // In real implementation, might want to reject if conflicts are severe
    }

    return {
      changes: Object.fromEntries(preview.edits),
    };
  }

  /**
   * Get rename preview with conflict detection
   */
  async getPreview(
    symbol: SymbolInfo,
    newName: string,
    currentUri: string,
    currentSource: string,
    workspaceFiles: Map<string, string>
  ): Promise<RenamePreview> {
    const edits = new Map<string, TextEdit[]>();
    const conflicts: RenameConflict[] = [];
    let referenceCount = 0;

    // Analyze current file
    const parseResult = parse(currentSource);
    if (!parseResult.ok) {
      return {
        edits,
        conflicts,
        fileCount: 0,
        referenceCount: 0,
        isSafe: false,
      };
    }

    const ast = parseResult.value.program;

    // Find all references in current file
    const currentReferences = this.findAllReferences(ast, symbol.name, currentSource);
    const currentEdits: TextEdit[] = [];

    for (const ref of currentReferences) {
      currentEdits.push({
        range: this.nodeToRange(ref),
        newText: newName,
      });
      referenceCount++;
    }

    if (currentEdits.length > 0) {
      edits.set(currentUri, currentEdits);
    }

    // Check for conflicts in current file
    conflicts.push(...this.detectConflicts(ast, symbol.name, newName, currentUri, currentSource));

    // Search in other workspace files
    for (const [uri, fileSource] of workspaceFiles) {
      if (uri === currentUri) continue;

      const fileParseResult = parse(fileSource);
      if (!fileParseResult.ok) continue;

      const fileAst = fileParseResult.value.program;

      // Find references in this file
      const fileReferences = this.findAllReferences(fileAst, symbol.name, fileSource);
      const fileEdits: TextEdit[] = [];

      for (const ref of fileReferences) {
        fileEdits.push({
          range: this.nodeToRange(ref),
          newText: newName,
        });
        referenceCount++;
      }

      if (fileEdits.length > 0) {
        edits.set(uri, fileEdits);
      }

      // Check for conflicts in this file
      conflicts.push(...this.detectConflicts(fileAst, symbol.name, newName, uri, fileSource));
    }

    return {
      edits,
      conflicts,
      fileCount: edits.size,
      referenceCount,
      isSafe: conflicts.length === 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              SYMBOL FINDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find symbol at cursor position
   */
  private findSymbolAtPosition(
    ast: AST.Program,
    position: { line: number; character: number },
    source: string
  ): SymbolInfo | null {
    const offset = this.positionToOffset(position, source);

    for (const stmt of ast.statements) {
      const symbol = this.findSymbolInNode(stmt, offset);
      if (symbol) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Find symbol in AST node
   */
  private findSymbolInNode(node: AST.ASTNode, offset: number): SymbolInfo | null {
    // Check if offset is within this node
    if (offset < node.span.start.offset || offset > node.span.end.offset) {
      return null;
    }

    // Handle different node types
    switch (node.kind) {
      case 'PersonaDecl':
      case 'TeamDecl':
      case 'WorkflowDecl':
      case 'SkillDecl':
        const decl = node as AST.PersonaDecl;
        if (this.offsetInNode(decl.name, offset)) {
          return {
            name: decl.name.name,
            node: decl.name,
            kind: 'declaration',
            type: node.kind,
          };
        }
        break;

      case 'Identifier':
        const ident = node as AST.Identifier;
        if (this.offsetInNode(ident, offset)) {
          return {
            name: ident.name,
            node: ident,
            kind: 'reference',
            type: 'Identifier',
          };
        }
        break;

      // Add more node types as needed
    }

    return null;
  }

  /**
   * Find all references to a symbol
   */
  private findAllReferences(ast: AST.Program, symbolName: string, source: string): AST.ASTNode[] {
    const references: AST.ASTNode[] = [];

    const visit = (node: AST.ASTNode) => {
      // Check if this node is a reference to the symbol
      if (node.kind === 'Identifier' && (node as AST.Identifier).name === symbolName) {
        references.push(node);
      }

      // Visit declaration names
      if (
        (node.kind === 'PersonaDecl' ||
          node.kind === 'TeamDecl' ||
          node.kind === 'WorkflowDecl' ||
          node.kind === 'SkillDecl') &&
        (node as any).name.name === symbolName
      ) {
        references.push((node as any).name);
      }

      // Recursively visit child nodes
      this.visitChildren(node, visit);
    };

    for (const stmt of ast.statements) {
      visit(stmt);
    }

    return references;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if symbol can be renamed
   */
  private canRenameSymbol(symbol: SymbolInfo): boolean {
    // Can't rename built-in symbols
    if (this.isBuiltIn(symbol.name)) {
      return false;
    }

    // Can't rename imported symbols (for now)
    if (symbol.kind === 'import') {
      return false;
    }

    return true;
  }

  /**
   * Validate new name
   */
  private validateNewName(name: string): { valid: boolean; error?: string } {
    // Check if empty
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }

    // Check if reserved keyword
    if (this.RESERVED_KEYWORDS.has(name)) {
      return { valid: false, error: `'${name}' is a reserved keyword` };
    }

    // Check if valid identifier
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return { valid: false, error: 'Name must be a valid identifier (letters, numbers, underscore)' };
    }

    // Check length
    if (name.length > 100) {
      return { valid: false, error: 'Name is too long (max 100 characters)' };
    }

    return { valid: true };
  }

  /**
   * Check if symbol is built-in
   */
  private isBuiltIn(name: string): boolean {
    // List of built-in symbols
    const builtIns = new Set(['System', 'Console', 'Math', 'String', 'Array']);
    return builtIns.has(name);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              CONFLICT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect rename conflicts
   */
  private detectConflicts(
    ast: AST.Program,
    oldName: string,
    newName: string,
    uri: string,
    source: string
  ): RenameConflict[] {
    const conflicts: RenameConflict[] = [];

    // Check for reserved keyword conflict
    if (this.RESERVED_KEYWORDS.has(newName)) {
      conflicts.push({
        symbol: newName,
        location: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        uri,
        type: 'reserved',
        message: `'${newName}' is a reserved keyword and cannot be used as an identifier`,
      });
    }

    // Check for duplicate declarations
    const existingDeclarations = this.findDeclarations(ast, newName);
    for (const decl of existingDeclarations) {
      conflicts.push({
        symbol: newName,
        location: this.nodeToRange(decl),
        uri,
        type: 'duplicate',
        message: `Symbol '${newName}' is already declared in this file`,
      });
    }

    // Check for shadowing
    const shadowingConflicts = this.detectShadowing(ast, oldName, newName);
    for (const shadow of shadowingConflicts) {
      conflicts.push({
        symbol: newName,
        location: this.nodeToRange(shadow),
        uri,
        type: 'shadowing',
        message: `Renaming to '${newName}' would shadow existing symbol`,
      });
    }

    // Check for syntax conflicts (e.g., using operators as names)
    if (this.hasSyntaxConflict(newName)) {
      conflicts.push({
        symbol: newName,
        location: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        uri,
        type: 'syntax',
        message: `'${newName}' would cause syntax conflicts`,
      });
    }

    return conflicts;
  }

  /**
   * Find declarations of a symbol
   */
  private findDeclarations(ast: AST.Program, name: string): AST.ASTNode[] {
    const declarations: AST.ASTNode[] = [];

    for (const stmt of ast.statements) {
      if (
        (stmt.kind === 'PersonaDecl' ||
          stmt.kind === 'TeamDecl' ||
          stmt.kind === 'WorkflowDecl' ||
          stmt.kind === 'SkillDecl') &&
        (stmt as any).name.name === name
      ) {
        declarations.push(stmt);
      }
    }

    return declarations;
  }

  /**
   * Detect shadowing conflicts
   */
  private detectShadowing(ast: AST.Program, oldName: string, newName: string): AST.ASTNode[] {
    // Look for cases where renaming would shadow another symbol
    const shadowing: AST.ASTNode[] = [];

    // Build symbol table
    const symbols = new Map<string, AST.ASTNode>();

    for (const stmt of ast.statements) {
      if (
        stmt.kind === 'PersonaDecl' ||
        stmt.kind === 'TeamDecl' ||
        stmt.kind === 'WorkflowDecl' ||
        stmt.kind === 'SkillDecl'
      ) {
        const name = (stmt as any).name.name;
        if (name !== oldName) {
          symbols.set(name, stmt);
        }
      }
    }

    // Check if new name would conflict
    if (symbols.has(newName)) {
      shadowing.push(symbols.get(newName)!);
    }

    return shadowing;
  }

  /**
   * Check for syntax conflicts
   */
  private hasSyntaxConflict(name: string): boolean {
    // Check if name contains operators or special characters
    const operators = ['>', '<', '|', '-', '+', '*', '/', '=', '!', '&', '^', '%', '~'];
    return operators.some((op) => name.includes(op));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //                              HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if offset is within node
   */
  private offsetInNode(node: AST.ASTNode, offset: number): boolean {
    return offset >= node.span.start.offset && offset <= node.span.end.offset;
  }

  /**
   * Convert position to offset
   */
  private positionToOffset(position: { line: number; character: number }, source: string): number {
    const lines = source.split('\n');
    let offset = 0;

    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    offset += position.character;
    return offset;
  }

  /**
   * Convert node to LSP range
   */
  private nodeToRange(node: AST.ASTNode): Range {
    return {
      start: {
        line: node.span.start.line - 1,
        character: node.span.start.column - 1,
      },
      end: {
        line: node.span.end.line - 1,
        character: node.span.end.column - 1,
      },
    };
  }

  /**
   * Visit child nodes recursively
   */
  private visitChildren(node: AST.ASTNode, visitor: (node: AST.ASTNode) => void): void {
    // Visit children based on node type
    switch (node.kind) {
      case 'PersonaDecl': {
        const decl = node as AST.PersonaDecl;
        if (decl.extends) visitor(decl.extends);
        if (decl.body) {
          for (const field of decl.body.fields) {
            if (field.value) visitor(field.value);
          }
        }
        break;
      }

      case 'TeamDecl': {
        const team = node as AST.TeamDecl;
        if (team.body) {
          for (const field of team.body.fields) {
            if (field.value) visitor(field.value);
          }
        }
        break;
      }

      case 'WorkflowDecl': {
        const workflow = node as AST.WorkflowDecl;
        if (workflow.body) visitor(workflow.body);
        break;
      }

      // Add more node types as needed
    }
  }
}

/**
 * Symbol information
 */
interface SymbolInfo {
  /** Symbol name */
  name: string;
  /** AST node */
  node: AST.ASTNode;
  /** Symbol kind */
  kind: 'declaration' | 'reference' | 'import';
  /** Node type */
  type: string;
}
