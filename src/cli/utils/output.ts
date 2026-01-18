/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * CLI Output Formatters
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Artifact } from '../../registry/interfaces';
import { chalk } from './colors';
import { formatTable, formatKeyValue, type TableColumn } from './table';

export type OutputFormat = 'json' | 'yaml' | 'table' | 'list' | 'pretty';

/**
 * Format output in the specified format
 */
export function formatOutput(
  data: any,
  format: OutputFormat = 'table'
): string {
  switch (format) {
    case 'json':
      return formatJSON(data);
    case 'yaml':
      return formatYAML(data);
    case 'table':
      return formatAsTable(data);
    case 'list':
      return formatAsList(data);
    case 'pretty':
      return formatPretty(data);
    default:
      return formatJSON(data);
  }
}

/**
 * Format as JSON
 */
function formatJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format as YAML (simple implementation)
 */
function formatYAML(data: any, indent: number = 0): string {
  const padding = ' '.repeat(indent);

  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data === 'string') {
    // Quote strings that contain special characters
    if (/[:\n{}[\]&*#?|<>=!%@`]/.test(data)) {
      return `"${data.replace(/"/g, '\\"')}"`;
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return (
      '\n' +
      data
        .map((item) => `${padding}- ${formatYAML(item, indent + 2).trim()}`)
        .join('\n')
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';

    return (
      '\n' +
      entries
        .map(([key, value]) => {
          const formattedValue = formatYAML(value, indent + 2);
          if (formattedValue.startsWith('\n')) {
            return `${padding}${key}:${formattedValue}`;
          }
          return `${padding}${key}: ${formattedValue}`;
        })
        .join('\n')
    );
  }

  return String(data);
}

/**
 * Format as table (for arrays of objects)
 */
function formatAsTable(data: any): string {
  if (!Array.isArray(data)) {
    return formatKeyValue(data);
  }

  if (data.length === 0) {
    return chalk.dim('(no results)');
  }

  // Check if data contains Artifact objects
  if (isArtifactArray(data)) {
    return formatArtifactsTable(data);
  }

  // Generic table formatting
  const keys = Object.keys(data[0]);
  const columns: TableColumn[] = keys.map((key) => ({
    header: key.charAt(0).toUpperCase() + key.slice(1),
    field: key,
  }));

  return formatTable(data, columns);
}

/**
 * Format as list (for arrays)
 */
function formatAsList(data: any): string {
  if (!Array.isArray(data)) {
    return formatKeyValue(data);
  }

  if (data.length === 0) {
    return chalk.dim('(no results)');
  }

  return data
    .map((item, i) => `${chalk.dim(`${i + 1}.`)} ${formatPretty(item)}`)
    .join('\n\n');
}

/**
 * Format in a pretty, human-readable way
 */
function formatPretty(data: any): string {
  if (data === null || data === undefined) {
    return chalk.dim('null');
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return chalk.yellow(String(data));
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return chalk.dim('[]');
    return (
      '[\n' + data.map((item) => '  ' + formatPretty(item)).join(',\n') + '\n]'
    );
  }

  if (typeof data === 'object') {
    return formatKeyValue(data);
  }

  return String(data);
}

/**
 * Check if data is an array of Artifacts
 */
function isArtifactArray(data: any[]): data is Artifact[] {
  return data.length > 0 && 'type' in data[0] && 'metadata' in data[0];
}

/**
 * Format Artifacts as a table
 */
function formatArtifactsTable(artifacts: Artifact[]): string {
  const columns: TableColumn[] = [
    {
      header: 'ID',
      field: 'id',
      width: 12,
      formatter: (value: string) => chalk.dim(value.substring(0, 8) + '...'),
    },
    {
      header: 'Name',
      field: 'name',
      width: 30,
      formatter: (value: string) => chalk.bold(value),
    },
    {
      header: 'Type',
      field: 'type',
      width: 10,
      formatter: (value: string) => {
        const colors: Record<string, any> = {
          persona: chalk.cyan,
          team: chalk.magenta,
          workflow: chalk.blue,
          skill: chalk.green,
        };
        return (colors[value] || chalk.white)(value);
      },
    },
    {
      header: 'Version',
      field: 'version',
      width: 10,
    },
    {
      header: 'Downloads',
      field: 'downloads',
      width: 10,
      align: 'right' as const,
      formatter: (value: number) => chalk.yellow(String(value)),
    },
    {
      header: 'Stars',
      field: 'stars',
      width: 8,
      align: 'right' as const,
      formatter: (value: number) => chalk.green(String(value)),
    },
  ];

  const rows = artifacts.map((artifact) => ({
    id: artifact.id,
    name: artifact.metadata.name,
    type: artifact.type,
    version: artifact.metadata.version,
    downloads: artifact.stats.downloads,
    stars: artifact.stats.stars,
  }));

  return formatTable(rows, columns);
}

/**
 * Format artifact details (full information)
 */
export function formatArtifactDetails(artifact: Artifact): string {
  const lines: string[] = [];

  lines.push(chalk.bold(artifact.metadata.name));
  lines.push('');

  // Metadata section
  lines.push(chalk.bold('Metadata:'));
  lines.push(
    formatKeyValue(
      {
        ID: artifact.id,
        Type: artifact.type,
        Version: artifact.metadata.version,
        Slug: artifact.metadata.slug || chalk.dim('(none)'),
        Author: artifact.metadata.author || chalk.dim('(anonymous)'),
        Email: artifact.metadata.authorEmail || chalk.dim('(none)'),
        Organization: artifact.metadata.organization || chalk.dim('(none)'),
        License: artifact.metadata.license || chalk.dim('(none)'),
      },
      { indent: 2 }
    )
  );
  lines.push('');

  // Description
  if (artifact.metadata.description) {
    lines.push(chalk.bold('Description:'));
    lines.push('  ' + artifact.metadata.description);
    lines.push('');
  }

  // Tags
  if (artifact.metadata.tags.length > 0) {
    lines.push(chalk.bold('Tags:'));
    lines.push('  ' + artifact.metadata.tags.join(', '));
    lines.push('');
  }

  // Skills
  if (artifact.metadata.skills && artifact.metadata.skills.length > 0) {
    lines.push(chalk.bold('Skills:'));
    lines.push('  ' + artifact.metadata.skills.join(', '));
    lines.push('');
  }

  // Statistics
  lines.push(chalk.bold('Statistics:'));
  lines.push(
    formatKeyValue(
      {
        Downloads: artifact.stats.downloads,
        Stars: artifact.stats.stars,
        Views: artifact.stats.views,
      },
      { indent: 2 }
    )
  );
  lines.push('');

  // Timestamps
  lines.push(chalk.bold('Timestamps:'));
  lines.push(
    formatKeyValue(
      {
        Created: new Date(artifact.createdAt).toLocaleString(),
        Updated: new Date(artifact.updatedAt).toLocaleString(),
      },
      { indent: 2 }
    )
  );
  lines.push('');

  // Status
  lines.push(chalk.bold('Status:'));
  lines.push(
    formatKeyValue(
      {
        Published: artifact.published ? chalk.green('Yes') : chalk.yellow('No'),
        Deleted: artifact.deleted ? chalk.red('Yes') : chalk.green('No'),
      },
      { indent: 2 }
    )
  );

  return lines.join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green('✓ ') + message;
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return chalk.red('✗ ') + message;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow('⚠ ') + message;
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return chalk.cyan('ℹ ') + message;
}
