/**
 * PCL Language Server - Completion Items Generator
 *
 * Generates completion items for keywords, symbols, properties, and snippets
 */

import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
} from 'vscode-languageserver/node';

import {
  PCL_KEYWORDS,
  getPropertiesForType,
  MERGE_STRATEGIES,
  MODEL_NAMES,
  THINKING_STYLES,
  RESPONSE_FORMATS,
} from './keywords';
import { PCL_SNIPPETS, getSnippetsForContext } from './snippets';
import {
  CompletionContext,
  PCLKeyword,
  SnippetDefinition,
  SymbolInfo,
} from './completion-types';

/**
 * Generate completion items for keywords
 */
export function generateKeywordCompletions(
  context: CompletionContext
): CompletionItem[] {
  const items: CompletionItem[] = [];

  for (const keyword of PCL_KEYWORDS) {
    // Filter keywords based on context
    if (context.insideBlock && keyword.category === 'declaration') {
      continue; // Don't suggest declarations inside blocks
    }

    const item: CompletionItem = {
      label: keyword.keyword,
      kind: getCompletionItemKind(keyword),
      detail: keyword.detail,
      documentation: {
        kind: MarkupKind.Markdown,
        value: keyword.documentation,
      },
      insertText: keyword.insertText || keyword.keyword,
      insertTextFormat: keyword.insertTextFormat || InsertTextFormat.PlainText,
      sortText: `0_${keyword.keyword}`, // High priority
    };

    items.push(item);
  }

  return items;
}

/**
 * Generate completion items for snippets
 */
export function generateSnippetCompletions(
  context: CompletionContext
): CompletionItem[] {
  const items: CompletionItem[] = [];
  const contextType = context.declarationType || 'global';
  const snippets = getSnippetsForContext(contextType);

  for (const snippet of snippets) {
    const item: CompletionItem = {
      label: snippet.label,
      kind: CompletionItemKind.Snippet,
      detail: snippet.detail,
      documentation: {
        kind: MarkupKind.Markdown,
        value: `${snippet.documentation}\n\n\`\`\`pcl\n${snippet.snippet}\n\`\`\``,
      },
      insertText: snippet.snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: `1_${snippet.sortPriority || 100}_${snippet.label}`, // Medium priority
    };

    items.push(item);
  }

  return items;
}

/**
 * Generate completion items for properties
 */
export function generatePropertyCompletions(
  context: CompletionContext
): CompletionItem[] {
  const items: CompletionItem[] = [];

  if (!context.declarationType) {
    return items;
  }

  const properties = getPropertiesForType(context.declarationType);

  for (const property of properties) {
    const item: CompletionItem = {
      label: property,
      kind: CompletionItemKind.Property,
      detail: `Property of ${context.declarationType}`,
      documentation: getPropertyDocumentation(
        context.declarationType,
        property
      ),
      insertText: `${property}: `,
      sortText: `2_${property}`, // Lower priority than keywords/snippets
    };

    items.push(item);
  }

  return items;
}

/**
 * Generate completion items for symbols
 */
export function generateSymbolCompletions(
  symbols: SymbolInfo[]
): CompletionItem[] {
  const items: CompletionItem[] = [];

  for (const symbol of symbols) {
    const item: CompletionItem = {
      label: symbol.name,
      kind: getSymbolCompletionKind(symbol.type),
      detail: `${symbol.type}${symbol.exported ? ' (exported)' : ''}`,
      documentation: symbol.documentation
        ? {
            kind: MarkupKind.Markdown,
            value: symbol.documentation,
          }
        : undefined,
      insertText: symbol.name,
      sortText: `3_${symbol.name}`, // Lowest priority
    };

    items.push(item);
  }

  return items;
}

/**
 * Generate completion items for enum values
 */
export function generateEnumCompletions(
  property: string,
  values: string[]
): CompletionItem[] {
  const items: CompletionItem[] = [];

  for (const value of values) {
    const item: CompletionItem = {
      label: value,
      kind: CompletionItemKind.EnumMember,
      detail: `Value for ${property}`,
      insertText: `"${value}"`,
      sortText: `2_${value}`,
    };

    items.push(item);
  }

  return items;
}

/**
 * Get completion items for specific property values
 */
export function getPropertyValueCompletions(
  property: string
): CompletionItem[] {
  switch (property) {
    case 'merge':
      return generateEnumCompletions('merge', MERGE_STRATEGIES);
    case 'model':
      return generateEnumCompletions('model', MODEL_NAMES);
    case 'thinking_style':
      return generateEnumCompletions('thinking_style', THINKING_STYLES);
    case 'response_format':
      return generateEnumCompletions('response_format', RESPONSE_FORMATS);
    default:
      return [];
  }
}

/**
 * Get completion item kind for keyword
 */
function getCompletionItemKind(keyword: PCLKeyword): CompletionItemKind {
  switch (keyword.category) {
    case 'declaration':
      return CompletionItemKind.Keyword;
    case 'visibility':
      return CompletionItemKind.Keyword;
    case 'type':
      return CompletionItemKind.Class;
    case 'workflow':
      return CompletionItemKind.Keyword;
    case 'command':
      return CompletionItemKind.Function;
    case 'control':
      return CompletionItemKind.Value;
    default:
      return CompletionItemKind.Keyword;
  }
}

/**
 * Get completion item kind for symbol type
 */
function getSymbolCompletionKind(symbolType: string): CompletionItemKind {
  switch (symbolType.toLowerCase()) {
    case 'persona':
      return CompletionItemKind.Class;
    case 'team':
      return CompletionItemKind.Module;
    case 'workflow':
      return CompletionItemKind.Function;
    case 'skill':
      return CompletionItemKind.Interface;
    case 'type':
      return CompletionItemKind.TypeParameter;
    case 'const':
      return CompletionItemKind.Constant;
    default:
      return CompletionItemKind.Variable;
  }
}

/**
 * Get documentation for property
 */
function getPropertyDocumentation(
  declarationType: string,
  property: string
): string {
  const docs: Record<string, Record<string, string>> = {
    persona: {
      name: 'Display name of the persona',
      version: 'Semantic version (e.g., "1.0.0")',
      metadata: 'Metadata block with category, description, tags, etc.',
      config: 'Configuration block with model, temperature, etc.',
      prompts: 'System and user prompts for the persona',
      skills: 'List of skill names the persona possesses',
      includes: 'Include other persona definitions',
    },
    team: {
      name: 'Display name of the team',
      version: 'Semantic version (e.g., "1.0.0")',
      metadata: 'Metadata block with category, description, tags, etc.',
      members: 'Array of persona references that are team members',
      primary: 'Primary persona for decision-making',
      merge:
        'Strategy for merging responses (Primary, Consensus, Voting, etc.)',
      quorum: 'Required number of members for consensus (e.g., 2/3)',
      conflict: 'Priority order for conflict resolution',
    },
    workflow: {
      name: 'Display name of the workflow',
      version: 'Semantic version (e.g., "1.0.0")',
      metadata: 'Metadata block with category, description, tags, etc.',
      steps: 'Workflow expression with personas and operators',
      timeout: 'Timeout duration for the workflow',
      retry: 'Retry configuration with count and backoff',
      fallback: 'Fallback persona if workflow fails',
    },
    skill: {
      name: 'Display name of the skill',
      version: 'Semantic version (e.g., "1.0.0")',
      category: 'Skill category (Technical, Domain, etc.)',
      items: 'List of skill items',
      description: 'Detailed skill description',
    },
    config: {
      model: 'LLM model name (e.g., "claude-sonnet-4")',
      temperature: 'Temperature parameter (0.0-1.0)',
      max_tokens: 'Maximum tokens in response',
      top_p: 'Top-p sampling parameter',
      top_k: 'Top-k sampling parameter',
      thinking_style: 'Thinking style (analytical, creative, etc.)',
      response_format: 'Response format (text, json, markdown, etc.)',
    },
    metadata: {
      category: 'Category classification',
      description: 'Detailed description',
      tags: 'Array of tags for discovery',
      skills: 'Skills associated with this entity',
      author: 'Author name or organization',
      license: 'License identifier (MIT, Apache-2.0, etc.)',
    },
  };

  return docs[declarationType]?.[property] || `Property: ${property}`;
}
