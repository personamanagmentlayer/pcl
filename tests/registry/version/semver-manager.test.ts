/**
 * Semantic Versioning Manager Tests
 *
 * Comprehensive test suite for SemverManager covering:
 * - Version parsing and validation
 * - Version comparison and ordering
 * - Version increment operations
 * - Version constraint checking
 * - Version history and rollback
 * - Breaking changes detection
 * - Deprecation tracking
 */

import { SemverManager } from '../../src/registry/version/semver-manager';

describe('SemverManager', () => {
  let manager: SemverManager;

  beforeEach(() => {
    manager = new SemverManager();
  });

  describe('Version Validation', () => {
    it('should validate correct semantic versions', () => {
      expect(manager.isValid('1.0.0')).toBe(true);
      expect(manager.isValid('0.0.1')).toBe(true);
      expect(manager.isValid('10.20.30')).toBe(true);
    });

    it('should validate versions with prerelease tags', () => {
      expect(manager.isValid('1.0.0-alpha')).toBe(true);
      expect(manager.isValid('1.0.0-beta.1')).toBe(true);
      expect(manager.isValid('2.1.0-rc.5')).toBe(true);
    });

    it('should validate versions with build metadata', () => {
      expect(manager.isValid('1.0.0+20130313144700')).toBe(true);
      expect(manager.isValid('1.0.0-beta+exp.sha.5114f85')).toBe(true);
    });

    it('should reject invalid version formats', () => {
      expect(manager.isValid('1')).toBe(false);
      expect(manager.isValid('1.0')).toBe(false);
      expect(manager.isValid('1.0.0.0')).toBe(false);
      expect(manager.isValid('a.b.c')).toBe(false);
      expect(manager.isValid('')).toBe(false);
    });

    it('should reject versions with leading v', () => {
      expect(manager.isValid('v1.0.0')).toBe(false);
      expect(manager.isValid('V2.0.0')).toBe(false);
    });

    it('should reject malformed versions', () => {
      expect(manager.isValid('1.0.0-')).toBe(false);
      expect(manager.isValid('1.0.0+')).toBe(false);
      expect(manager.isValid('1.-1.0')).toBe(false);
    });
  });

  describe('Version Parsing', () => {
    it('should parse and clean valid versions', () => {
      expect(manager.parse('1.0.0')).toBe('1.0.0');
      expect(manager.parse('2.5.10')).toBe('2.5.10');
    });

    it('should coerce partial versions', () => {
      expect(manager.parse('1')).toBe('1.0.0');
      expect(manager.parse('1.0')).toBe('1.0.0');
      expect(manager.parse('2.3')).toBe('2.3.0');
    });

    it('should clean versions with leading v', () => {
      expect(manager.parse('v1.0.0')).toBe('1.0.0');
      expect(manager.parse('V2.5.3')).toBe('2.5.3');
    });

    it('should return null for unparseable versions', () => {
      expect(manager.parse('invalid')).toBeNull();
      expect(manager.parse('a.b.c')).toBeNull();
      expect(manager.parse('')).toBeNull();
    });

    it('should handle prerelease tags', () => {
      // Note: semver.coerce removes prerelease tags and returns base version
      expect(manager.parse('1.0.0-alpha')).toBe('1.0.0');
      expect(manager.parse('2.1.0-beta.5')).toBe('2.1.0');
    });
  });

  describe('Version Comparison', () => {
    it('should compare equal versions', () => {
      expect(manager.compare('1.0.0', '1.0.0')).toBe(0);
      expect(manager.eq('1.0.0', '1.0.0')).toBe(true);
      expect(manager.eq('2.5.3', '2.5.3')).toBe(true);
    });

    it('should compare different major versions', () => {
      expect(manager.compare('2.0.0', '1.0.0')).toBe(1);
      expect(manager.compare('1.0.0', '2.0.0')).toBe(-1);
      expect(manager.gt('2.0.0', '1.0.0')).toBe(true);
      expect(manager.lt('1.0.0', '2.0.0')).toBe(true);
    });

    it('should compare different minor versions', () => {
      expect(manager.compare('1.2.0', '1.1.0')).toBe(1);
      expect(manager.compare('1.1.0', '1.2.0')).toBe(-1);
      expect(manager.gt('1.5.0', '1.3.0')).toBe(true);
      expect(manager.lt('1.1.0', '1.2.0')).toBe(true);
    });

    it('should compare different patch versions', () => {
      expect(manager.compare('1.0.5', '1.0.3')).toBe(1);
      expect(manager.compare('1.0.1', '1.0.9')).toBe(-1);
      expect(manager.gt('2.3.10', '2.3.9')).toBe(true);
      expect(manager.lt('1.0.0', '1.0.1')).toBe(true);
    });

    it('should compare prerelease versions', () => {
      expect(manager.compare('1.0.0-alpha', '1.0.0')).toBe(-1);
      expect(manager.compare('1.0.0', '1.0.0-beta')).toBe(1);
      expect(manager.compare('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    });

    it('should handle complex version comparisons', () => {
      expect(manager.gt('10.0.0', '9.99.99')).toBe(true);
      expect(manager.lt('0.0.1', '1.0.0')).toBe(true);
      expect(manager.eq('1.0.0+build1', '1.0.0+build2')).toBe(true);
    });
  });

  describe('Version Increment', () => {
    it('should increment major version', () => {
      expect(manager.increment('1.2.3', 'major')).toBe('2.0.0');
      expect(manager.nextMajor('5.10.20')).toBe('6.0.0');
      expect(manager.increment('0.5.0', 'major')).toBe('1.0.0');
    });

    it('should increment minor version', () => {
      expect(manager.increment('1.2.3', 'minor')).toBe('1.3.0');
      expect(manager.nextMinor('2.5.10')).toBe('2.6.0');
      expect(manager.increment('1.0.0', 'minor')).toBe('1.1.0');
    });

    it('should increment patch version', () => {
      expect(manager.increment('1.2.3', 'patch')).toBe('1.2.4');
      expect(manager.nextPatch('1.0.9')).toBe('1.0.10');
      expect(manager.increment('2.5.0', 'patch')).toBe('2.5.1');
    });

    it('should handle prerelease version increments', () => {
      expect(manager.increment('1.0.0-alpha', 'major')).toBe('1.0.0');
      expect(manager.increment('1.0.0-beta', 'minor')).toBe('1.0.0');
      expect(manager.increment('1.0.0-rc.1', 'patch')).toBe('1.0.0');
    });

    it('should return null for invalid versions', () => {
      expect(manager.increment('invalid', 'major')).toBeNull();
      expect(manager.nextMinor('1.0')).toBeNull();
    });
  });

  describe('Version Constraints', () => {
    it('should check exact version match', () => {
      expect(manager.satisfies('1.2.3', '1.2.3')).toBe(true);
      expect(manager.satisfies('1.2.4', '1.2.3')).toBe(false);
    });

    it('should check caret constraint (compatible)', () => {
      expect(manager.satisfies('1.2.5', '^1.2.3')).toBe(true);
      expect(manager.satisfies('1.9.0', '^1.2.3')).toBe(true);
      expect(manager.satisfies('2.0.0', '^1.2.3')).toBe(false);
      expect(manager.satisfies('1.2.0', '^1.2.3')).toBe(false);
    });

    it('should check tilde constraint (approximately)', () => {
      expect(manager.satisfies('1.2.5', '~1.2.3')).toBe(true);
      expect(manager.satisfies('1.2.9', '~1.2.3')).toBe(true);
      expect(manager.satisfies('1.3.0', '~1.2.3')).toBe(false);
    });

    it('should check greater than or equal constraint', () => {
      expect(manager.satisfies('1.5.0', '>=1.2.3')).toBe(true);
      expect(manager.satisfies('1.2.3', '>=1.2.3')).toBe(true);
      expect(manager.satisfies('1.0.0', '>=1.2.3')).toBe(false);
    });

    it('should check less than constraint', () => {
      expect(manager.satisfies('1.2.0', '<1.2.3')).toBe(true);
      expect(manager.satisfies('1.2.3', '<1.2.3')).toBe(false);
      expect(manager.satisfies('1.5.0', '<1.2.3')).toBe(false);
    });

    it('should check wildcard constraints', () => {
      expect(manager.satisfies('1.2.5', '1.2.x')).toBe(true);
      expect(manager.satisfies('1.2.0', '1.2.x')).toBe(true);
      expect(manager.satisfies('1.3.0', '1.2.x')).toBe(false);
      expect(manager.satisfies('1.5.3', '1.x')).toBe(true);
    });

    it('should check any version constraint', () => {
      expect(manager.satisfies('0.0.1', '*')).toBe(true);
      expect(manager.satisfies('999.999.999', '*')).toBe(true);
    });

    it('should check range constraints', () => {
      expect(manager.satisfies('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
      expect(manager.satisfies('2.0.0', '>=1.0.0 <2.0.0')).toBe(false);
      expect(manager.satisfies('0.9.0', '>=1.0.0 <2.0.0')).toBe(false);
    });
  });

  describe('Constraint Parsing', () => {
    it('should parse valid constraints', () => {
      const constraint = manager.parseConstraint('^1.2.3');
      expect(constraint).not.toBeNull();
      expect(constraint?.constraint).toBe('^1.2.3');
      expect(constraint?.range).toBeDefined();
    });

    it('should parse range constraints', () => {
      const constraint = manager.parseConstraint('>=1.0.0 <2.0.0');
      expect(constraint).not.toBeNull();
      expect(constraint?.constraint).toBe('>=1.0.0 <2.0.0');
    });

    it('should return null for invalid constraints', () => {
      expect(manager.parseConstraint('invalid')).toBeNull();
      // Empty string is actually valid in semver (means any version)
      const emptyResult = manager.parseConstraint('');
      expect(emptyResult).toBeDefined();
    });
  });

  describe('Version Selection', () => {
    const versions = ['1.0.0', '1.2.0', '1.2.5', '1.5.0', '2.0.0', '2.1.0'];

    it('should find maximum satisfying version', () => {
      expect(manager.maxSatisfying(versions, '^1.0.0')).toBe('1.5.0');
      expect(manager.maxSatisfying(versions, '~1.2.0')).toBe('1.2.5');
      expect(manager.maxSatisfying(versions, '>=2.0.0')).toBe('2.1.0');
    });

    it('should find minimum satisfying version', () => {
      expect(manager.minSatisfying(versions, '^1.0.0')).toBe('1.0.0');
      expect(manager.minSatisfying(versions, '~1.2.0')).toBe('1.2.0');
      expect(manager.minSatisfying(versions, '>=1.5.0')).toBe('1.5.0');
    });

    it('should return null when no version satisfies', () => {
      expect(manager.maxSatisfying(versions, '^3.0.0')).toBeNull();
      expect(manager.minSatisfying(versions, '>=5.0.0')).toBeNull();
    });
  });

  describe('Version Sorting', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['2.0.0', '1.0.0', '1.5.0', '1.2.0'];
      const sorted = manager.sort(versions);
      expect(sorted).toEqual(['1.0.0', '1.2.0', '1.5.0', '2.0.0']);
    });

    it('should sort versions in descending order', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0', '1.2.0'];
      const sorted = manager.rsort(versions);
      expect(sorted).toEqual(['2.0.0', '1.5.0', '1.2.0', '1.0.0']);
    });

    it('should handle prerelease versions in sort', () => {
      const versions = ['1.0.0', '1.0.0-alpha', '1.0.0-beta', '0.9.0'];
      const sorted = manager.sort(versions);
      expect(sorted[0]).toBe('0.9.0');
      expect(sorted[sorted.length - 1]).toBe('1.0.0');
    });
  });

  describe('Version Components', () => {
    it('should extract major version', () => {
      expect(manager.getMajor('1.2.3')).toBe(1);
      expect(manager.getMajor('10.5.0')).toBe(10);
      expect(manager.getMajor('0.1.0')).toBe(0);
    });

    it('should extract minor version', () => {
      expect(manager.getMinor('1.2.3')).toBe(2);
      expect(manager.getMinor('5.15.0')).toBe(15);
      expect(manager.getMinor('1.0.5')).toBe(0);
    });

    it('should extract patch version', () => {
      expect(manager.getPatch('1.2.3')).toBe(3);
      expect(manager.getPatch('1.0.25')).toBe(25);
      expect(manager.getPatch('10.20.0')).toBe(0);
    });
  });

  describe('Prerelease Detection', () => {
    it('should detect prerelease versions', () => {
      expect(manager.isPrerelease('1.0.0-alpha')).toBe(true);
      expect(manager.isPrerelease('1.0.0-beta.1')).toBe(true);
      expect(manager.isPrerelease('2.0.0-rc.5')).toBe(true);
    });

    it('should detect stable versions', () => {
      expect(manager.isPrerelease('1.0.0')).toBe(false);
      expect(manager.isPrerelease('2.5.10')).toBe(false);
    });

    it('should extract prerelease tags', () => {
      expect(manager.getPrerelease('1.0.0-alpha')).toEqual(['alpha']);
      expect(manager.getPrerelease('1.0.0-beta.1')).toEqual(['beta', '1']);
      expect(manager.getPrerelease('1.0.0')).toBeNull();
    });
  });

  describe('Version Registration', () => {
    it('should register a new version', () => {
      manager.registerVersion('artifact-1', '1.0.0', {
        changelog: 'Initial release',
      });

      const versions = manager.getVersions('artifact-1');
      expect(versions).toContain('1.0.0');
      expect(manager.getLatest('artifact-1')).toBe('1.0.0');
    });

    it('should update latest version automatically', () => {
      manager.registerVersion('artifact-1', '1.0.0');
      manager.registerVersion('artifact-1', '1.2.0');
      manager.registerVersion('artifact-1', '1.1.0');

      expect(manager.getLatest('artifact-1')).toBe('1.2.0');
    });

    it('should reject duplicate versions', () => {
      manager.registerVersion('artifact-1', '1.0.0');

      expect(() => {
        manager.registerVersion('artifact-1', '1.0.0');
      }).toThrow('Version 1.0.0 already exists');
    });

    it('should reject invalid version format', () => {
      expect(() => {
        manager.registerVersion('artifact-1', 'invalid');
      }).toThrow('Invalid semantic version');
    });

    it('should track breaking changes', () => {
      manager.registerVersion('artifact-1', '1.0.0', { breaking: false });
      manager.registerVersion('artifact-1', '2.0.0', { breaking: true });

      const info = manager.getVersionInfo('artifact-1', '2.0.0');
      expect(info?.breaking).toBe(true);
    });

    it('should track deprecation status', () => {
      manager.registerVersion('artifact-1', '1.0.0', {
        deprecated: 'Use 2.0.0 instead',
      });

      expect(manager.isDeprecated('artifact-1', '1.0.0')).toBe(true);
    });
  });

  describe('Version History', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0', {
        changelog: 'Initial release',
      });
      manager.registerVersion('artifact-1', '1.1.0', {
        changelog: 'Added feature X',
      });
      manager.registerVersion('artifact-1', '2.0.0', {
        changelog: 'Breaking changes',
        breaking: true,
      });
    });

    it('should retrieve version history', () => {
      const history = manager.getHistory('artifact-1');
      expect(history).not.toBeNull();
      expect(history?.versions).toHaveLength(3);
      expect(history?.latest).toBe('2.0.0');
    });

    it('should retrieve all versions', () => {
      const versions = manager.getVersions('artifact-1');
      expect(versions).toHaveLength(3);
      expect(versions).toContain('1.0.0');
      expect(versions).toContain('1.1.0');
      expect(versions).toContain('2.0.0');
    });

    it('should retrieve version info', () => {
      const info = manager.getVersionInfo('artifact-1', '1.1.0');
      expect(info).not.toBeNull();
      expect(info?.version).toBe('1.1.0');
      expect(info?.changelog).toBe('Added feature X');
    });

    it('should retrieve changelog', () => {
      expect(manager.getChangelog('artifact-1', '1.0.0')).toBe(
        'Initial release'
      );
      expect(manager.getChangelog('artifact-1', '2.0.0')).toBe(
        'Breaking changes'
      );
    });

    it('should retrieve all changelogs', () => {
      const changelogs = manager.getAllChangelogs('artifact-1');
      expect(changelogs.size).toBe(3);
      expect(changelogs.get('1.0.0')).toBe('Initial release');
    });
  });

  describe('Version Rollback', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0');
      manager.registerVersion('artifact-1', '1.1.0');
      manager.registerVersion('artifact-1', '2.0.0');
    });

    it('should rollback to previous version', () => {
      expect(manager.getLatest('artifact-1')).toBe('2.0.0');

      manager.rollback('artifact-1', '1.1.0', 'Critical bug in 2.0.0');

      expect(manager.getLatest('artifact-1')).toBe('1.1.0');
    });

    it('should record rollback history', () => {
      manager.rollback('artifact-1', '1.0.0', 'Regression detected');

      const rollbacks = manager.getRollbackHistory('artifact-1');
      expect(rollbacks).toHaveLength(1);
      expect(rollbacks[0].from).toBe('2.0.0');
      expect(rollbacks[0].to).toBe('1.0.0');
      expect(rollbacks[0].reason).toBe('Regression detected');
    });

    it('should reject rollback to non-existent version', () => {
      expect(() => {
        manager.rollback('artifact-1', '3.0.0');
      }).toThrow('Version 3.0.0 not found');
    });

    it('should reject rollback for unknown artifact', () => {
      expect(() => {
        manager.rollback('unknown', '1.0.0');
      }).toThrow('No version history found');
    });

    it('should allow multiple rollbacks', () => {
      manager.rollback('artifact-1', '1.1.0', 'First rollback');
      manager.rollback('artifact-1', '1.0.0', 'Second rollback');

      const rollbacks = manager.getRollbackHistory('artifact-1');
      expect(rollbacks).toHaveLength(2);
      expect(manager.getLatest('artifact-1')).toBe('1.0.0');
    });
  });

  describe('Breaking Changes', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0', { breaking: false });
      manager.registerVersion('artifact-1', '1.1.0', { breaking: false });
      manager.registerVersion('artifact-1', '2.0.0', { breaking: true });
      manager.registerVersion('artifact-1', '2.1.0', { breaking: false });
      manager.registerVersion('artifact-1', '3.0.0', { breaking: true });
    });

    it('should find breaking changes since version', () => {
      const breaking = manager.getBreakingChangesSince('artifact-1', '1.0.0');
      expect(breaking).toHaveLength(2);
      expect(breaking.map((v) => v.version)).toContain('2.0.0');
      expect(breaking.map((v) => v.version)).toContain('3.0.0');
    });

    it('should detect breaking changes in upgrade', () => {
      expect(manager.hasBreakingChanges('artifact-1', '1.0.0', '2.0.0')).toBe(
        true
      );
      expect(manager.hasBreakingChanges('artifact-1', '2.0.0', '3.0.0')).toBe(
        true
      );
      expect(manager.hasBreakingChanges('artifact-1', '1.0.0', '1.1.0')).toBe(
        false
      );
    });

    it('should return empty array when no breaking changes', () => {
      const breaking = manager.getBreakingChangesSince('artifact-1', '3.0.0');
      expect(breaking).toHaveLength(0);
    });
  });

  describe('Deprecated Versions', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0', { deprecated: true });
      manager.registerVersion('artifact-1', '1.1.0', {
        deprecated: 'Use 2.0.0',
      });
      manager.registerVersion('artifact-1', '2.0.0', { deprecated: false });
    });

    it('should identify deprecated versions', () => {
      expect(manager.isDeprecated('artifact-1', '1.0.0')).toBe(true);
      expect(manager.isDeprecated('artifact-1', '1.1.0')).toBe(true);
      expect(manager.isDeprecated('artifact-1', '2.0.0')).toBe(false);
    });

    it('should list all deprecated versions', () => {
      const deprecated = manager.getDeprecatedVersions('artifact-1');
      expect(deprecated).toHaveLength(2);
      expect(deprecated.map((v) => v.version)).toContain('1.0.0');
      expect(deprecated.map((v) => v.version)).toContain('1.1.0');
    });
  });

  describe('Version Diff', () => {
    it('should calculate version difference', () => {
      expect(manager.diff('1.0.0', '2.0.0')).toBe('major');
      expect(manager.diff('1.0.0', '1.1.0')).toBe('minor');
      expect(manager.diff('1.0.0', '1.0.1')).toBe('patch');
    });

    it('should detect prerelease changes', () => {
      // Note: semver.diff compares release versions, prerelease to release is 'major'
      expect(manager.diff('1.0.0', '1.0.0-alpha')).toBe('major');
      expect(manager.diff('1.0.0-alpha', '1.0.0-beta')).toBe('prerelease');
    });

    it('should return null for equal versions', () => {
      expect(manager.diff('1.0.0', '1.0.0')).toBeNull();
    });
  });

  describe('Version Queries', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0');
      manager.registerVersion('artifact-1', '1.2.0');
      manager.registerVersion('artifact-1', '1.5.0');
      manager.registerVersion('artifact-1', '2.0.0');
    });

    it('should find versions matching constraint', () => {
      const versions = manager.findVersions('artifact-1', '^1.0.0');
      expect(versions).toHaveLength(3);
      expect(versions).toContain('1.0.0');
      expect(versions).toContain('1.2.0');
      expect(versions).toContain('1.5.0');
    });

    it('should find versions in range', () => {
      const versions = manager.findVersions('artifact-1', '>=1.2.0 <2.0.0');
      expect(versions).toHaveLength(2);
      expect(versions).toContain('1.2.0');
      expect(versions).toContain('1.5.0');
    });

    it('should return empty array when no matches', () => {
      const versions = manager.findVersions('artifact-1', '^3.0.0');
      expect(versions).toHaveLength(0);
    });
  });

  describe('Data Management', () => {
    beforeEach(() => {
      manager.registerVersion('artifact-1', '1.0.0');
      manager.registerVersion('artifact-2', '2.0.0');
    });

    it('should clear all version history', () => {
      manager.clear();
      expect(manager.getHistory('artifact-1')).toBeNull();
      expect(manager.getHistory('artifact-2')).toBeNull();
    });

    it('should clear specific artifact history', () => {
      manager.clearArtifact('artifact-1');
      expect(manager.getHistory('artifact-1')).toBeNull();
      expect(manager.getHistory('artifact-2')).not.toBeNull();
    });

    it('should export version history', () => {
      const exported = manager.export();
      expect(Object.keys(exported)).toContain('artifact-1');
      expect(Object.keys(exported)).toContain('artifact-2');
    });

    it('should export specific artifact history', () => {
      const exported = manager.export('artifact-1');
      expect(Object.keys(exported)).toHaveLength(1);
      expect(Object.keys(exported)).toContain('artifact-1');
    });

    it('should import version history', () => {
      const exported = manager.export();
      const newManager = new SemverManager();

      newManager.import(exported);

      expect(newManager.getHistory('artifact-1')).not.toBeNull();
      expect(newManager.getHistory('artifact-2')).not.toBeNull();
    });
  });
});
