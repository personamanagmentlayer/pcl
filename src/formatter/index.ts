/**
 * PCL Code Formatter
 *
 * Standalone formatter that can be used by CLI or programmatically
 */

export interface FormatOptions {
  /**
   * Number of spaces per indentation level (default: 2)
   */
  tabSize?: number;

  /**
   * Use spaces instead of tabs (default: true)
   */
  insertSpaces?: boolean;

  /**
   * Maximum line length before wrapping (default: 100)
   */
  maxLineLength?: number;

  /**
   * Add trailing comma in multi-line arrays/objects (default: true)
   */
  trailingComma?: boolean;

  /**
   * Space after colon in property definitions (default: true)
   */
  spaceAfterColon?: boolean;
}

const DEFAULT_OPTIONS: Required<FormatOptions> = {
  tabSize: 2,
  insertSpaces: true,
  maxLineLength: 100,
  trailingComma: true,
  spaceAfterColon: true,
};

/**
 * Format PCL source code
 */
export function format(source: string, options: FormatOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = source.split('\n');
  const formatted: string[] = [];
  let indentLevel = 0;
  const indentString = opts.insertSpaces ? ' '.repeat(opts.tabSize) : '\t';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines but preserve one blank line between major blocks
    if (!trimmed) {
      // Only add empty line if previous line was not empty
      if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
        formatted.push('');
      }
      continue;
    }

    // Handle comments
    if (trimmed.startsWith('//')) {
      formatted.push(indentString.repeat(indentLevel) + trimmed);
      continue;
    }

    // Decrease indent for closing braces/brackets
    if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Format the line
    const indented = indentString.repeat(indentLevel) + formatLine(trimmed, opts);
    formatted.push(indented);

    // Increase indent after opening braces/brackets
    if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
      indentLevel++;
    }

    // Handle single-line blocks that close on same line
    const openCount = (trimmed.match(/[{[]/g) || []).length;
    const closeCount = (trimmed.match(/[}\]]/g) || []).length;
    if (openCount > 0 && closeCount > 0 && openCount === closeCount) {
      // Single-line block, no indent change
      indentLevel = Math.max(0, indentLevel - openCount);
    }
  }

  // Remove trailing empty lines
  while (formatted.length > 0 && formatted[formatted.length - 1] === '') {
    formatted.pop();
  }

  // Ensure file ends with newline
  return formatted.join('\n') + '\n';
}

/**
 * Format a single line
 */
function formatLine(line: string, options: Required<FormatOptions>): string {
  let formatted = line;

  // Add space before opening brace if missing
  formatted = formatted.replace(/(\w)\{/g, '$1 {');

  // Add space after colon in property definitions
  if (options.spaceAfterColon) {
    formatted = formatted.replace(/:\s*/g, ': ');
  }

  // Normalize spacing around operators
  formatted = formatted.replace(/\s*=\s*/g, ' = ');
  formatted = formatted.replace(/\s*==\s*/g, ' == ');
  formatted = formatted.replace(/\s*!=\s*/g, ' != ');
  formatted = formatted.replace(/\s*<=\s*/g, ' <= ');
  formatted = formatted.replace(/\s*>=\s*/g, ' >= ');
  formatted = formatted.replace(/\s*\|\|\s*/g, ' || ');
  formatted = formatted.replace(/\s*&&\s*/g, ' && ');
  formatted = formatted.replace(/\s*->\s*/g, ' -> ');

  // Normalize spacing in function calls and arrays
  formatted = formatted.replace(/,\s*/g, ', ');

  // Normalize spacing around brackets
  formatted = formatted.replace(/\[\s+/g, '[');
  formatted = formatted.replace(/\s+\]/g, ']');

  // Remove extra spaces
  formatted = formatted.replace(/\s+/g, ' ');

  return formatted;
}

/**
 * Check if source code is already formatted
 */
export function isFormatted(source: string, options: FormatOptions = {}): boolean {
  const formatted = format(source, options);
  return source === formatted || source === formatted.trimEnd();
}

/**
 * Get formatting changes as diff
 */
export interface FormattingEdit {
  start: { line: number; character: number };
  end: { line: number; character: number };
  newText: string;
}

export function getFormattingEdits(
  source: string,
  options: FormatOptions = {}
): FormattingEdit[] {
  const formatted = format(source, options);

  if (source === formatted || source === formatted.trimEnd()) {
    return []; // No changes needed
  }

  // Return single edit that replaces entire document
  const sourceLines = source.split('\n');
  return [
    {
      start: { line: 0, character: 0 },
      end: { line: sourceLines.length, character: 0 },
      newText: formatted,
    },
  ];
}
