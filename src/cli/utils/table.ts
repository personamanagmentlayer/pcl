/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Table Formatter
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { chalk } from './colors';

export interface TableColumn {
  header: string;
  field: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

export interface TableOptions {
  border?: boolean;
  headerColor?: boolean;
  maxWidth?: number;
}

/**
 * Format data as an ASCII table
 */
export function formatTable(
  data: Record<string, any>[],
  columns: TableColumn[],
  options: TableOptions = {}
): string {
  const {
    border = true,
    headerColor = true,
    maxWidth = process.stdout.columns || 120,
  } = options;

  if (data.length === 0) {
    return chalk.dim('(no data)');
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerWidth = col.header.length;
    const dataWidth = Math.max(
      ...data.map((row) => {
        const value = col.formatter
          ? col.formatter(row[col.field])
          : String(row[col.field] ?? '');
        return stripAnsi(value).length;
      })
    );
    return Math.min(col.width ?? Math.max(headerWidth, dataWidth), maxWidth);
  });

  const lines: string[] = [];

  // Top border
  if (border) {
    lines.push('┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐');
  }

  // Header row
  const headerCells = columns.map((col, i) => {
    const text = col.header.padEnd(widths[i]);
    return headerColor ? chalk.bold(text) : text;
  });
  lines.push(
    (border ? '│ ' : '') +
      headerCells.join(border ? ' │ ' : '  ') +
      (border ? ' │' : '')
  );

  // Header separator
  if (border) {
    lines.push('├' + widths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤');
  } else {
    lines.push(columns.map((_, i) => '─'.repeat(widths[i])).join('  '));
  }

  // Data rows
  for (const row of data) {
    const cells = columns.map((col, i) => {
      let value = col.formatter
        ? col.formatter(row[col.field])
        : String(row[col.field] ?? '');

      // Truncate if too long
      const stripped = stripAnsi(value);
      if (stripped.length > widths[i]) {
        value = value.substring(0, widths[i] - 3) + '...';
      }

      // Pad to column width
      const padLength = widths[i] - stripAnsi(value).length;
      if (col.align === 'right') {
        value = ' '.repeat(padLength) + value;
      } else if (col.align === 'center') {
        const leftPad = Math.floor(padLength / 2);
        const rightPad = padLength - leftPad;
        value = ' '.repeat(leftPad) + value + ' '.repeat(rightPad);
      } else {
        value = value + ' '.repeat(padLength);
      }

      return value;
    });

    lines.push(
      (border ? '│ ' : '') +
        cells.join(border ? ' │ ' : '  ') +
        (border ? ' │' : '')
    );
  }

  // Bottom border
  if (border) {
    lines.push('└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘');
  }

  return lines.join('\n');
}

/**
 * Strip ANSI escape codes from a string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Format data as a simple list
 */
export function formatList(
  data: Record<string, any>[],
  columns: TableColumn[]
): string {
  if (data.length === 0) {
    return chalk.dim('(no data)');
  }

  const lines: string[] = [];

  for (const row of data) {
    const fields = columns.map((col) => {
      const value = col.formatter
        ? col.formatter(row[col.field])
        : String(row[col.field] ?? '');
      return `${chalk.dim(col.header + ':')} ${value}`;
    });

    lines.push(fields.join('  '));
  }

  return lines.join('\n');
}

/**
 * Format a single key-value object
 */
export function formatKeyValue(
  data: Record<string, any>,
  options: { indent?: number; color?: boolean } = {}
): string {
  const { indent = 0, color: useColor = true } = options;
  const padding = ' '.repeat(indent);
  const lines: string[] = [];

  const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));

  for (const [key, value] of Object.entries(data)) {
    const paddedKey = key.padEnd(maxKeyLength);
    const formattedKey = useColor ? chalk.cyan(paddedKey) : paddedKey;
    const formattedValue =
      typeof value === 'object' && value !== null
        ? '\n' + formatKeyValue(value, { indent: indent + 2, color: useColor })
        : String(value);

    lines.push(`${padding}${formattedKey}: ${formattedValue}`);
  }

  return lines.join('\n');
}
