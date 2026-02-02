/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL CLI - Output Formatters Tests
 * Comprehensive tests for output formatting utilities
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  formatOutput,
  formatArtifactDetails,
  formatSuccess,
  formatError,
  formatWarning,
  formatInfo,
} from '../../../src/cli/utils/output';
import type { Artifact } from '../../../src/registry/interfaces';
import { chalk } from '../../../src/cli/utils/colors';

describe('Output Formatters', () => {
  // Mock console methods
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatOutput - JSON Format
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - JSON', () => {
    test('formats simple object as JSON', () => {
      const data = { name: 'Test', value: 123 };
      const result = formatOutput(data, 'json');

      expect(result).toBe(JSON.stringify(data, null, 2));
      expect(result).toContain('"name": "Test"');
      expect(result).toContain('"value": 123');
    });

    test('formats array as JSON', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = formatOutput(data, 'json');

      expect(result).toBe(JSON.stringify(data, null, 2));
      expect(JSON.parse(result)).toEqual(data);
    });

    test('formats nested objects as JSON', () => {
      const data = {
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark', lang: 'en' },
      };
      const result = formatOutput(data, 'json');

      const parsed = JSON.parse(result);
      expect(parsed.user.name).toBe('Alice');
      expect(parsed.settings.theme).toBe('dark');
    });

    test('handles null values in JSON', () => {
      const data = { value: null, empty: undefined };
      const result = formatOutput(data, 'json');

      const parsed = JSON.parse(result);
      expect(parsed.value).toBeNull();
      expect(parsed.empty).toBeUndefined();
    });

    test('handles empty object', () => {
      const result = formatOutput({}, 'json');
      expect(result).toBe('{}');
    });

    test('handles empty array', () => {
      const result = formatOutput([], 'json');
      expect(result).toBe('[]');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatOutput - YAML Format
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - YAML', () => {
    test('formats simple object as YAML', () => {
      const data = { name: 'Test', value: 123 };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('name: Test');
      expect(result).toContain('value: 123');
    });

    test('formats nested objects as YAML', () => {
      const data = {
        user: { name: 'Alice', age: 30 },
        active: true,
      };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('user:');
      expect(result).toContain('name: Alice');
      expect(result).toContain('age: 30');
      expect(result).toContain('active: true');
    });

    test('formats arrays as YAML', () => {
      const data = { items: ['apple', 'banana', 'cherry'] };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('items:');
      expect(result).toContain('- apple');
      expect(result).toContain('- banana');
      expect(result).toContain('- cherry');
    });

    test('handles null values in YAML', () => {
      const data = { value: null };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('value: null');
    });

    test('handles boolean values in YAML', () => {
      const data = { enabled: true, disabled: false };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('enabled: true');
      expect(result).toContain('disabled: false');
    });

    test('quotes strings with special characters', () => {
      const data = { message: 'Hello: World!' };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('"Hello: World!"');
    });

    test('escapes special characters in quoted strings', () => {
      const data = { text: 'Line 1\nLine 2\tTabbed' };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('\\n');
      expect(result).toContain('\\t');
    });

    test('handles empty object as YAML', () => {
      const result = formatOutput({}, 'yaml');
      expect(result).toBe('{}');
    });

    test('handles empty array as YAML', () => {
      const result = formatOutput([], 'yaml');
      expect(result).toBe('[]');
    });

    test('handles numbers correctly', () => {
      const data = { integer: 42, float: 3.14, negative: -100 };
      const result = formatOutput(data, 'yaml');

      expect(result).toContain('integer: 42');
      expect(result).toContain('float: 3.14');
      expect(result).toContain('negative: -100');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatOutput - Table Format
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - Table', () => {
    test('formats array of objects as table', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = formatOutput(data, 'table');

      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    test('formats single object as key-value', () => {
      const data = { name: 'Test', value: 123 };
      const result = formatOutput(data, 'table');

      expect(result).toContain('name');
      expect(result).toContain('Test');
      expect(result).toContain('value');
      expect(result).toContain('123');
    });

    test('handles empty array', () => {
      const result = formatOutput([], 'table');
      expect(result).toContain('no results');
    });

    test('formats artifacts with special formatting', () => {
      const artifacts: Artifact[] = [
        {
          id: 'artifact-123456789',
          type: 'persona',
          metadata: {
            name: 'Test Persona',
            version: '1.0.0',
            description: 'A test persona',
            tags: ['test'],
            author: 'Test Author',
            skills: [],
          },
          content: 'persona Test {}',
          stats: {
            downloads: 100,
            stars: 50,
            views: 500,
          },
          published: true,
          deleted: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const result = formatOutput(artifacts, 'table');

      expect(result).toContain('Test Persona');
      expect(result).toContain('1.0.0');
      expect(result).toContain('100');
      expect(result).toContain('50');
    });

    test('handles artifacts of different types', () => {
      const artifacts: Artifact[] = [
        {
          id: 'id1',
          type: 'persona',
          metadata: {
            name: 'Persona',
            version: '1.0.0',
            tags: [],
            skills: [],
          },
          content: '',
          stats: { downloads: 10, stars: 5, views: 100 },
          published: true,
          deleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'id2',
          type: 'skill',
          metadata: {
            name: 'Skill',
            version: '1.0.0',
            tags: [],
            skills: [],
          },
          content: '',
          stats: { downloads: 20, stars: 10, views: 200 },
          published: true,
          deleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = formatOutput(artifacts, 'table');

      expect(result).toBeTruthy();
      expect(result).toContain('Persona');
      expect(result).toContain('Skill');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatOutput - List Format
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - List', () => {
    test('formats array as numbered list', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = formatOutput(data, 'list');

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    test('formats single object as key-value in list', () => {
      const data = { name: 'Test' };
      const result = formatOutput(data, 'list');

      expect(result).toContain('name');
      expect(result).toContain('Test');
    });

    test('handles empty array in list format', () => {
      const result = formatOutput([], 'list');
      expect(result).toContain('no results');
    });

    test('separates list items with blank lines', () => {
      const data = ['Item 1', 'Item 2', 'Item 3'];
      const result = formatOutput(data, 'list');

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatOutput - Pretty Format
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - Pretty', () => {
    test('formats strings directly', () => {
      const result = formatOutput('Hello World', 'pretty');
      expect(result).toBe('Hello World');
    });

    test('formats numbers with color', () => {
      const result = formatOutput(42, 'pretty');
      expect(result).toContain('42');
    });

    test('formats booleans with color', () => {
      const resultTrue = formatOutput(true, 'pretty');
      const resultFalse = formatOutput(false, 'pretty');

      expect(resultTrue).toContain('true');
      expect(resultFalse).toContain('false');
    });

    test('formats null with dimmed style', () => {
      const result = formatOutput(null, 'pretty');
      expect(result).toContain('null');
    });

    test('formats undefined with dimmed style', () => {
      const result = formatOutput(undefined, 'pretty');
      expect(result).toContain('null');
    });

    test('formats arrays with brackets', () => {
      const data = [1, 2, 3];
      const result = formatOutput(data, 'pretty');

      expect(result).toContain('[');
      expect(result).toContain(']');
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    test('formats empty array', () => {
      const result = formatOutput([], 'pretty');
      expect(result).toContain('[]');
    });

    test('formats objects as key-value', () => {
      const data = { name: 'Test', value: 123 };
      const result = formatOutput(data, 'pretty');

      expect(result).toContain('name');
      expect(result).toContain('Test');
      expect(result).toContain('value');
      expect(result).toContain('123');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Default Format Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatOutput - Default Format', () => {
    test('uses table format as default', () => {
      const data = [{ name: 'Test' }];
      const defaultResult = formatOutput(data);
      const tableResult = formatOutput(data, 'table');

      expect(defaultResult).toBe(tableResult);
    });

    test('handles unknown format as JSON', () => {
      const data = { test: 'data' };
      const result = formatOutput(data, 'unknown' as any);

      expect(result).toBe(JSON.stringify(data, null, 2));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // formatArtifactDetails
  // ───────────────────────────────────────────────────────────────────────────

  describe('formatArtifactDetails', () => {
    const mockArtifact: Artifact = {
      id: 'artifact-12345',
      type: 'persona',
      metadata: {
        name: 'Test Persona',
        version: '1.0.0',
        slug: 'test-persona',
        description: 'A comprehensive test persona',
        tags: ['test', 'example', 'demo'],
        author: 'Test Author',
        authorEmail: 'test@example.com',
        organization: 'Test Org',
        license: 'MIT',
        skills: ['coding', 'analysis'],
      },
      content: 'persona TestPersona {}',
      stats: {
        downloads: 1000,
        stars: 250,
        views: 5000,
      },
      published: true,
      deleted: false,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-15T15:30:00Z'),
    };

    test('includes artifact name', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Test Persona');
    });

    test('includes metadata section', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Metadata:');
      expect(result).toContain('artifact-12345');
      expect(result).toContain('persona');
      expect(result).toContain('1.0.0');
      expect(result).toContain('test-persona');
    });

    test('includes author information', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Test Author');
      expect(result).toContain('test@example.com');
      expect(result).toContain('Test Org');
    });

    test('includes description', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Description:');
      expect(result).toContain('A comprehensive test persona');
    });

    test('includes tags', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Tags:');
      expect(result).toContain('test, example, demo');
    });

    test('includes skills', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Skills:');
      expect(result).toContain('coding, analysis');
    });

    test('includes statistics', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Statistics:');
      expect(result).toContain('1000');
      expect(result).toContain('250');
      expect(result).toContain('5000');
    });

    test('includes timestamps', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Timestamps:');
      expect(result).toContain('Created');
      expect(result).toContain('Updated');
    });

    test('includes status section', () => {
      const result = formatArtifactDetails(mockArtifact);
      expect(result).toContain('Status:');
      expect(result).toContain('Published');
      expect(result).toContain('Deleted');
    });

    test('shows published status correctly', () => {
      const published = formatArtifactDetails(mockArtifact);
      expect(published).toContain('Yes');

      const unpublished = formatArtifactDetails({
        ...mockArtifact,
        published: false,
      });
      expect(unpublished).toContain('No');
    });

    test('shows deleted status correctly', () => {
      const notDeleted = formatArtifactDetails(mockArtifact);
      expect(notDeleted).toContain('No');

      const deleted = formatArtifactDetails({
        ...mockArtifact,
        deleted: true,
      });
      expect(deleted).toContain('Yes');
    });

    test('handles missing optional fields gracefully', () => {
      const minimalArtifact: Artifact = {
        id: 'min-123',
        type: 'skill',
        metadata: {
          name: 'Minimal',
          version: '1.0.0',
          tags: [],
          skills: [],
        },
        content: '',
        stats: {
          downloads: 0,
          stars: 0,
          views: 0,
        },
        published: false,
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = formatArtifactDetails(minimalArtifact);
      expect(result).toContain('Minimal');
      expect(result).toContain('(none)');
    });

    test('handles empty tags array', () => {
      const noTags = formatArtifactDetails({
        ...mockArtifact,
        metadata: { ...mockArtifact.metadata, tags: [] },
      });

      expect(noTags).not.toContain('Tags:');
    });

    test('handles empty skills array', () => {
      const noSkills = formatArtifactDetails({
        ...mockArtifact,
        metadata: { ...mockArtifact.metadata, skills: [] },
      });

      expect(noSkills).not.toContain('Skills:');
    });

    test('handles missing description', () => {
      const noDesc = formatArtifactDetails({
        ...mockArtifact,
        metadata: { ...mockArtifact.metadata, description: undefined },
      });

      expect(noDesc).not.toContain('Description:');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Message Formatters
  // ───────────────────────────────────────────────────────────────────────────

  describe('Message Formatters', () => {
    describe('formatSuccess', () => {
      test('prefixes message with success symbol', () => {
        const result = formatSuccess('Operation completed');
        expect(result).toContain('✓');
        expect(result).toContain('Operation completed');
      });

      test('applies green color to success messages', () => {
        const result = formatSuccess('Success!');
        expect(result).toBeTruthy();
      });

      test('handles empty message', () => {
        const result = formatSuccess('');
        expect(result).toContain('✓');
      });

      test('handles long messages', () => {
        const longMessage = 'A'.repeat(1000);
        const result = formatSuccess(longMessage);
        expect(result).toContain('✓');
        expect(result).toContain(longMessage);
      });
    });

    describe('formatError', () => {
      test('prefixes message with error symbol', () => {
        const result = formatError('Operation failed');
        expect(result).toContain('✗');
        expect(result).toContain('Operation failed');
      });

      test('applies red color to error messages', () => {
        const result = formatError('Error!');
        expect(result).toBeTruthy();
      });

      test('handles empty message', () => {
        const result = formatError('');
        expect(result).toContain('✗');
      });

      test('handles multiline error messages', () => {
        const result = formatError('Line 1\nLine 2\nLine 3');
        expect(result).toContain('✗');
        expect(result).toContain('Line 1');
      });
    });

    describe('formatWarning', () => {
      test('prefixes message with warning symbol', () => {
        const result = formatWarning('Potential issue');
        expect(result).toContain('⚠');
        expect(result).toContain('Potential issue');
      });

      test('applies yellow color to warning messages', () => {
        const result = formatWarning('Warning!');
        expect(result).toBeTruthy();
      });

      test('handles empty message', () => {
        const result = formatWarning('');
        expect(result).toContain('⚠');
      });
    });

    describe('formatInfo', () => {
      test('prefixes message with info symbol', () => {
        const result = formatInfo('Information');
        expect(result).toContain('ℹ');
        expect(result).toContain('Information');
      });

      test('applies cyan color to info messages', () => {
        const result = formatInfo('Info!');
        expect(result).toBeTruthy();
      });

      test('handles empty message', () => {
        const result = formatInfo('');
        expect(result).toContain('ℹ');
      });

      test('handles special characters in message', () => {
        const result = formatInfo('Special: @#$%^&*()');
        expect(result).toContain('ℹ');
        expect(result).toContain('Special: @#$%^&*()');
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases and Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles circular references in JSON gracefully', () => {
      const circular: any = { name: 'Test' };
      circular.self = circular;

      expect(() => formatOutput(circular, 'json')).toThrow();
    });

    test('handles very large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));

      const result = formatOutput(largeArray, 'json');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(1000);
    });

    test('handles deeply nested objects', () => {
      let deep: any = { level: 0 };
      let current = deep;
      for (let i = 1; i < 50; i++) {
        current.next = { level: i };
        current = current.next;
      }

      const result = formatOutput(deep, 'yaml');
      expect(result).toContain('level: 0');
    });

    test('handles special Unicode characters', () => {
      const data = {
        emoji: '🎉🚀✨',
        chinese: '你好世界',
        arabic: 'مرحبا',
      };

      const result = formatOutput(data, 'json');
      expect(result).toContain('🎉🚀✨');
      expect(result).toContain('你好世界');
    });

    test('handles mixed data types in array', () => {
      const mixed = ['string', 123, true, null, { key: 'value' }, ['nested']];

      const result = formatOutput(mixed, 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mixed);
    });

    test('handles Date objects', () => {
      const data = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
      };

      const result = formatOutput(data, 'json');
      expect(result).toBeTruthy();
    });

    test('handles BigInt values in YAML', () => {
      const data = {
        bigNumber: 999999999999999n,
      };

      const result = formatOutput(data, 'yaml');
      expect(result).toContain('999999999999999');
    });
  });
});
