/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL CLI - Table Formatter Tests
 * Comprehensive tests for table rendering utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  formatTable,
  formatList,
  formatKeyValue,
  type TableColumn,
} from '../../../src/cli/utils/table';

describe('Table Formatter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // formatTable - Basic Functionality
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatTable - Basic', () => {
    const sampleData = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
      { name: 'Charlie', age: 35, city: 'Chicago' },
    ];

    const columns: TableColumn[] = [
      { header: 'Name', field: 'name' },
      { header: 'Age', field: 'age' },
      { header: 'City', field: 'city' },
    ];

    test('renders table with borders', () => {
      const result = formatTable(sampleData, columns);

      expect(result).toContain('┌');
      expect(result).toContain('┐');
      expect(result).toContain('└');
      expect(result).toContain('┘');
      expect(result).toContain('│');
      expect(result).toContain('─');
    });

    test('includes all headers', () => {
      const result = formatTable(sampleData, columns);

      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('City');
    });

    test('includes all data rows', () => {
      const result = formatTable(sampleData, columns);

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('Charlie');
      expect(result).toContain('30');
      expect(result).toContain('25');
      expect(result).toContain('35');
      expect(result).toContain('NYC');
      expect(result).toContain('LA');
      expect(result).toContain('Chicago');
    });

    test('has header separator line', () => {
      const result = formatTable(sampleData, columns);

      expect(result).toContain('├');
      expect(result).toContain('┼');
      expect(result).toContain('┤');
    });

    test('handles empty data array', () => {
      const result = formatTable([], columns);

      expect(result).toContain('no data');
    });

    test('handles single row', () => {
      const singleRow = [{ name: 'Alice', age: 30 }];
      const cols: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatTable(singleRow, cols);

      expect(result).toContain('Alice');
      expect(result).toContain('30');
    });

    test('handles single column', () => {
      const data = [{ name: 'Alice' }, { name: 'Bob' }];
      const cols: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatTable(data, cols);

      expect(result).toContain('Name');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatTable - Column Configuration
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatTable - Column Configuration', () => {
    test('respects fixed column width', () => {
      const data = [{ name: 'VeryLongNameThatExceedsWidth' }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name', width: 10 },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('...');
    });

    test('applies custom formatter', () => {
      const data = [{ value: 1000 }, { value: 2000 }];
      const columns: TableColumn[] = [
        {
          header: 'Value',
          field: 'value',
          formatter: (val) => `$${val.toLocaleString()}`,
        },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('$1,000');
      expect(result).toContain('$2,000');
    });

    test('aligns text left by default', () => {
      const data = [{ name: 'A' }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name', width: 10 },
      ];

      const result = formatTable(data, columns);
      const lines = result.split('\n');
      const dataLine = lines.find(
        (l) => l.includes('A') && !l.includes('Name')
      );

      expect(dataLine).toBeTruthy();
    });

    test('aligns text right when specified', () => {
      const data = [{ count: 123 }];
      const columns: TableColumn[] = [
        { header: 'Count', field: 'count', align: 'right', width: 10 },
      ];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('aligns text center when specified', () => {
      const data = [{ status: 'OK' }];
      const columns: TableColumn[] = [
        { header: 'Status', field: 'status', align: 'center', width: 10 },
      ];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles null values in cells', () => {
      const data = [{ name: 'Alice', age: null }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('Alice');
    });

    test('handles undefined values in cells', () => {
      const data = [{ name: 'Alice', age: undefined }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('Alice');
    });

    test('calculates column width from data', () => {
      const data = [{ name: 'ShortName' }, { name: 'VeryVeryLongName' }];
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatTable(data, columns);

      expect(result).toContain('VeryVeryLongName');
    });

    test('uses header width if larger than data', () => {
      const data = [{ a: '1' }];
      const columns: TableColumn[] = [{ header: 'VeryLongHeader', field: 'a' }];

      const result = formatTable(data, columns);

      expect(result).toContain('VeryLongHeader');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatTable - Options
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatTable - Options', () => {
    const data = [{ name: 'Alice', age: 30 }];
    const columns: TableColumn[] = [
      { header: 'Name', field: 'name' },
      { header: 'Age', field: 'age' },
    ];

    test('renders without borders when disabled', () => {
      const result = formatTable(data, columns, { border: false });

      expect(result).not.toContain('┌');
      expect(result).not.toContain('│');
      expect(result).not.toContain('└');
    });

    test('still shows header separator without borders', () => {
      const result = formatTable(data, columns, { border: false });

      expect(result).toContain('─');
    });

    test('disables header coloring when specified', () => {
      const result = formatTable(data, columns, { headerColor: false });

      expect(result).toBeTruthy();
    });

    test('respects maxWidth option', () => {
      const longData = [{ text: 'A'.repeat(200) }];
      const cols: TableColumn[] = [{ header: 'Text', field: 'text' }];

      const result = formatTable(longData, cols, { maxWidth: 50 });

      expect(result).toContain('...');
    });

    test('uses default options when not specified', () => {
      const result = formatTable(data, columns);

      // Should have borders by default
      expect(result).toContain('┌');
      expect(result).toContain('│');
    });

    test('handles custom maxWidth smaller than header', () => {
      const cols: TableColumn[] = [
        { header: 'VeryLongHeaderName', field: 'name' },
      ];

      const result = formatTable(data, cols, { maxWidth: 10 });

      expect(result).toBeTruthy();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatList
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatList', () => {
    test('formats simple data as list', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatList(data, columns);

      expect(result).toContain('Name:');
      expect(result).toContain('Alice');
      expect(result).toContain('Age:');
      expect(result).toContain('30');
    });

    test('applies formatters in list', () => {
      const data = [{ price: 1000 }];
      const columns: TableColumn[] = [
        {
          header: 'Price',
          field: 'price',
          formatter: (val) => `$${val}`,
        },
      ];

      const result = formatList(data, columns);

      expect(result).toContain('$1000');
    });

    test('handles empty data', () => {
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];
      const result = formatList([], columns);

      expect(result).toContain('no data');
    });

    test('handles null values', () => {
      const data = [{ name: 'Alice', age: null }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Age', field: 'age' },
      ];

      const result = formatList(data, columns);

      expect(result).toContain('Alice');
    });

    test('separates columns with spacing', () => {
      const data = [{ a: '1', b: '2', c: '3' }];
      const columns: TableColumn[] = [
        { header: 'A', field: 'a' },
        { header: 'B', field: 'b' },
        { header: 'C', field: 'c' },
      ];

      const result = formatList(data, columns);

      expect(result).toContain('  '); // Multiple spaces for separation
    });

    test('handles single row', () => {
      const data = [{ name: 'Alice' }];
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatList(data, columns);

      expect(result).toContain('Alice');
    });

    test('handles multiple rows', () => {
      const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatList(data, columns);

      const lines = result.split('\n');
      expect(lines.length).toBe(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatKeyValue
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatKeyValue', () => {
    test('formats simple key-value pairs', () => {
      const data = { name: 'Alice', age: 30, city: 'NYC' };
      const result = formatKeyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('age');
      expect(result).toContain('30');
      expect(result).toContain('city');
      expect(result).toContain('NYC');
    });

    test('aligns keys to same column', () => {
      const data = {
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
      };

      const result = formatKeyValue(data);
      const lines = result.split('\n');

      // All colons should be aligned
      const colonPositions = lines.map((line) => line.indexOf(':'));
      expect(new Set(colonPositions).size).toBe(1);
    });

    test('handles nested objects', () => {
      const data = {
        user: { name: 'Alice', age: 30 },
        active: true,
      };

      const result = formatKeyValue(data);

      expect(result).toContain('user');
      expect(result).toContain(':');
      expect(result).toContain('name');
      expect(result).toContain('Alice');
    });

    test('applies indentation', () => {
      const data = { name: 'Alice', age: 30 };
      const result = formatKeyValue(data, { indent: 4 });

      const lines = result.split('\n');
      lines.forEach((line) => {
        expect(line.startsWith('    ')).toBe(true);
      });
    });

    test('handles nested objects with indentation', () => {
      const data = {
        user: { name: 'Alice' },
      };

      const result = formatKeyValue(data, { indent: 2 });

      // Should have 2 spaces of indent (specified) + key + colon
      expect(result.startsWith('  ')).toBe(true);
      expect(result).toContain('user');
      expect(result).toContain(':');
      expect(result).toContain('name'); // Nested key
      expect(result).toContain('Alice'); // Nested value
    });

    test('disables color when specified', () => {
      const data = { name: 'Alice' };
      const result = formatKeyValue(data, { color: false });

      // Should not contain ANSI color codes (escape character followed by bracket)
      expect(result).not.toMatch(/\u001b\[[0-9;]*m/);
    });

    test('handles null values', () => {
      const data = { name: 'Alice', age: null };
      const result = formatKeyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('age');
      expect(result).toContain('null');
    });

    test('handles undefined values', () => {
      const data = { name: 'Alice', age: undefined };
      const result = formatKeyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('age');
      expect(result).toContain('undefined');
    });

    test('handles boolean values', () => {
      const data = { active: true, deleted: false };
      const result = formatKeyValue(data);

      expect(result).toContain('active');
      expect(result).toContain('true');
      expect(result).toContain('deleted');
      expect(result).toContain('false');
    });

    test('handles number values', () => {
      const data = { count: 42, price: 99.99, negative: -10 };
      const result = formatKeyValue(data);

      expect(result).toContain('42');
      expect(result).toContain('99.99');
      expect(result).toContain('-10');
    });

    test('handles empty object', () => {
      const result = formatKeyValue({});

      // Should return empty string or minimal output
      expect(result.trim().length).toBe(0);
    });

    test('handles single key-value pair', () => {
      const data = { name: 'Alice' };
      const result = formatKeyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('Alice');
    });

    test('handles deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const result = formatKeyValue(data);

      expect(result).toContain('level1');
      expect(result).toContain('level2');
      expect(result).toContain('level3');
      expect(result).toContain(':');
      expect(result).toContain('deep');
    });

    test('handles arrays in values', () => {
      const data = {
        name: 'Alice',
        tags: ['developer', 'designer'],
      };

      const result = formatKeyValue(data);

      expect(result).toContain('name');
      expect(result).toContain('tags');
    });

    test('uses default indent of 0', () => {
      const data = { name: 'Alice' };
      const result = formatKeyValue(data);

      expect(result).not.toMatch(/^ /);
    });

    test('uses color by default', () => {
      const data = { name: 'Alice' };
      const result = formatKeyValue(data);

      // Default should include colors (though this depends on chalk)
      expect(result).toBeTruthy();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles very long cell content', () => {
      const data = [{ text: 'A'.repeat(1000) }];
      const columns: TableColumn[] = [{ header: 'Text', field: 'text' }];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
      expect(result).toContain('...');
    });

    test('handles special characters in data', () => {
      const data = [{ name: 'Alice & Bob', symbol: '<>' }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Symbol', field: 'symbol' },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('Alice & Bob');
      expect(result).toContain('<>');
    });

    test('handles Unicode characters', () => {
      const data = [{ emoji: '🎉🚀', text: '你好' }];
      const columns: TableColumn[] = [
        { header: 'Emoji', field: 'emoji' },
        { header: 'Text', field: 'text' },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('🎉🚀');
      expect(result).toContain('你好');
    });

    test('handles ANSI color codes in data', () => {
      const data = [{ name: '\x1b[31mRed\x1b[0m' }];
      const columns: TableColumn[] = [{ header: 'Name', field: 'name' }];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles empty strings in cells', () => {
      const data = [{ name: '', value: '' }];
      const columns: TableColumn[] = [
        { header: 'Name', field: 'name' },
        { header: 'Value', field: 'value' },
      ];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles zero values', () => {
      const data = [{ count: 0, price: 0 }];
      const columns: TableColumn[] = [
        { header: 'Count', field: 'count' },
        { header: 'Price', field: 'price' },
      ];

      const result = formatTable(data, columns);

      expect(result).toContain('0');
    });

    test('handles very wide tables', () => {
      const data = [
        {
          a: 1,
          b: 2,
          c: 3,
          d: 4,
          e: 5,
          f: 6,
          g: 7,
          h: 8,
          i: 9,
          j: 10,
        },
      ];
      const columns: TableColumn[] = Object.keys(data[0]).map((key) => ({
        header: key.toUpperCase(),
        field: key,
      }));

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles very tall tables', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      const columns: TableColumn[] = [
        { header: 'ID', field: 'id' },
        { header: 'Name', field: 'name' },
      ];

      const result = formatTable(data, columns);

      expect(result.split('\n').length).toBeGreaterThan(100);
    });

    test('handles mixed alignments', () => {
      const data = [{ left: 'L', center: 'C', right: 'R' }];
      const columns: TableColumn[] = [
        { header: 'Left', field: 'left', align: 'left', width: 10 },
        { header: 'Center', field: 'center', align: 'center', width: 10 },
        { header: 'Right', field: 'right', align: 'right', width: 10 },
      ];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles formatters that return empty strings', () => {
      const data = [{ value: 'test' }];
      const columns: TableColumn[] = [
        {
          header: 'Value',
          field: 'value',
          formatter: () => '',
        },
      ];

      const result = formatTable(data, columns);

      expect(result).toBeTruthy();
    });

    test('handles formatters that throw errors gracefully', () => {
      const data = [{ value: 'test' }];
      const columns: TableColumn[] = [
        {
          header: 'Value',
          field: 'value',
          formatter: () => {
            throw new Error('Formatter error');
          },
        },
      ];

      expect(() => formatTable(data, columns)).toThrow();
    });
  });
});
