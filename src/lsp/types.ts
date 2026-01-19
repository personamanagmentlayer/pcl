/**
 * PCL Language Server - Type Definitions
 *
 * Common types used throughout the LSP implementation
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Program } from '../ast';
import { AnalysisResult } from '../semantic';

/**
 * Cached document information
 */
export interface DocumentInfo {
  /** The text document */
  document: TextDocument;
  /** Parsed AST (if parsing succeeded) */
  ast?: Program;
  /** Semantic analysis result (if analysis succeeded) */
  analysis?: AnalysisResult;
  /** Last parse/analysis timestamp */
  timestamp: number;
}

/**
 * LSP server configuration
 */
export interface ServerConfig {
  /** Enable trace logging */
  trace?: boolean;
  /** Maximum number of cached documents */
  maxCachedDocuments?: number;
  /** Debounce time for diagnostics (ms) */
  diagnosticsDebounce?: number;
}

/**
 * Position utilities type
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * Range type
 */
export interface Range {
  start: Position;
  end: Position;
}
