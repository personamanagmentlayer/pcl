/**
 * PCL Language Server - Completion Types
 *
 * Type definitions for IntelliSense/auto-complete functionality
 */

import {
  CompletionItemKind,
  InsertTextFormat,
} from 'vscode-languageserver/node';

/**
 * PCL keyword categories
 */
export enum PCLKeywordCategory {
  Declaration = 'declaration',
  Visibility = 'visibility',
  Type = 'type',
  Workflow = 'workflow',
  Command = 'command',
  Control = 'control',
}

/**
 * PCL keyword definition
 */
export interface PCLKeyword {
  /** Keyword text */
  keyword: string;
  /** Category for filtering */
  category: PCLKeywordCategory;
  /** Documentation string */
  documentation: string;
  /** Detail string (shown in completion list) */
  detail?: string;
  /** Insert text (if different from keyword) */
  insertText?: string;
  /** Insert text format (plain or snippet) */
  insertTextFormat?: InsertTextFormat;
}

/**
 * Completion context
 */
export interface CompletionContext {
  /** Current line text */
  lineText: string;
  /** Character at cursor position */
  charAtPosition?: string;
  /** Character before cursor */
  charBefore?: string;
  /** Word being typed (partial) */
  wordBeingTyped?: string;
  /** Is inside a declaration block? */
  insideBlock?: boolean;
  /** Current declaration type (persona, team, workflow, skill) */
  declarationType?: string;
  /** Is after colon (property value context) */
  afterColon?: boolean;
  /** Is inside array */
  insideArray?: boolean;
  /** Is inside string */
  insideString?: boolean;
}

/**
 * Snippet definition
 */
export interface SnippetDefinition {
  /** Unique label */
  label: string;
  /** Insert text with placeholders */
  snippet: string;
  /** Documentation */
  documentation: string;
  /** Detail (shown in completion list) */
  detail: string;
  /** Applicable contexts */
  contexts?: string[];
  /** Sort priority (lower = higher priority) */
  sortPriority?: number;
}

/**
 * Property completion info
 */
export interface PropertyInfo {
  /** Property name */
  name: string;
  /** Property type */
  type: string;
  /** Is required? */
  required: boolean;
  /** Documentation */
  documentation: string;
  /** Default value (if any) */
  defaultValue?: string;
  /** Allowed values (for enums) */
  allowedValues?: string[];
}

/**
 * Symbol completion info
 */
export interface SymbolInfo {
  /** Symbol name */
  name: string;
  /** Symbol type (Persona, Team, Workflow, Skill) */
  type: string;
  /** Is exported? */
  exported: boolean;
  /** Documentation (if available) */
  documentation?: string;
  /** File where defined */
  file: string;
}
