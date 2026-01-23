/**
 * SemverManager Tests - Phase 1.2C
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemverManager } from '../../../src/registry/version/semver-manager';

describe('SemverManager', () => {
  let manager: SemverManager;

  beforeEach(() => {
    manager = new SemverManager();
  });

  describe('Validation', () => {
    it('should validate correct semver strings', () => {
      expect(manager.isValid('1.0.0')).toBe(true);
      expect(manager.isValid('0.1.2')).toBe(true);
      expect(manager.isValid('1.2.3-alpha.1')).toBe(true);
      expect(manager.isValid('1.0.0-beta+exp.sha.5114f85')).toBe(true);
    });

    it('should reject invalid semver strings', () => {
      expect(manager.isValid('1.0')).toBe(false);
      expect(manager.isValid('v1.0.0')).toBe(false);
      expect(manager.isValid('1.0.0.0')).toBe(false);
      expect(manager.isValid('invalid')).toBe(false);
    });

    it('should parse and clean version strings', () => {
      expect(manager.parse('v1.0.0')).toBe('1.0.0');
      expect(manager.parse('1.0')).toBe('1.0.0');
      expect(manager.parse('1')).toBe('1.0.0');
      expect(manager.parse('invalid')).toBeNull();
    });
  });

  describe('Comparison', () => {
    it('should compare versions correctly', () => {
      expect(manager.compare('1.0.0', '1.0.0')).toBe(0);
      expect(manager.compare('1.0.0', '2.0.0')).toBe(-1);
      expect(manager.compare('2.0.0', '1.0.0')).toBe(1);
      expect(manager.compare('1.2.3', '1.2.4')).toBe(-1);
    });

    it('should check greater than', () => {
      expect(manager.gt('2.0.0', '1.0.0')).toBe(true);
      expect(manager.gt('1.0.0', '2.0.0')).toBe(false);
      expect(manager.gt('1.0.0', '1.0.0')).toBe(false);
    });

    it('should check less than', () => {
      expect(manager.lt('1.0.0', '2.0.0')).toBe(true);
      expect(manager.lt('2.0.0', '1.0.0')).toBe(false);
      expect(manager.lt('1.0.0', '1.0.0')).toBe(false);
    });

    it('should check equality', () => {
      expect(manager.eq('1.0.0', '1.0.0')).toBe(true);
      expect(manager.eq('1.0.0', '2.0.0')).toBe(false);
    });
  });

  describe('Increment', () => {
    it('should increment major version', () => {
      expect(manager.nextMajor('1.2.3')).toBe('2.0.0');
      expect(manager.nextMajor('0.1.0')).toBe('1.0.0');
    });

    it('should increment minor version', () => {
      expect(manager.nextMinor('1.2.3')).toBe('1.3.0');
      expect(manager.nextMinor('1.0.0')).toBe('1.1.0');
    });

    it('should increment patch version', () => {
      expect(manager.nextPatch('1.2.3')).toBe('1.2.4');
      expect(manager.nextPatch('1.0.0')).toBe('1.0.1');
    });

    it('should increment by type', () => {
      expect(manager.increment('1.2.3', 'major')).toBe('2.0.0');
      expect(manager.increment('1.2.3', 'minor')).toBe('1.3.0');
      expect(manager.increment('1.2.3', 'patch')).toBe('1.2.4');
    });
  });

  describe('Constraints', () => {
    it('should check exact version', () => {
      expect(manager.satisfies('1.2.3', '1.2.3')).toBe(true);
      expect(manager.satisfies('1.2.4', '1.2.3')).toBe(false);
    });

    it('should check caret range (^)', () => {
      expect(manager.satisfies('1.2.3', '^1.2.0')).toBe(true);
      expect(manager.satisfies('1.9.9', '^1.2.0')).toBe(true);
      expect(manager.satisfies('2.0.0', '^1.2.0')).toBe(false);
    });

    it('should check tilde range (~)', () => {
      expect(manager.satisfies('1.2.3', '~1.2.0')).toBe(true);
      expect(manager.satisfies('1.2.9', '~1.2.0')).toBe(true);
      expect(manager.satisfies('1.3.0', '~1.2.0')).toBe(false);
    });

    it('should check comparison operators', () => {
      expect(manager.satisfies('1.2.3', '>=1.0.0')).toBe(true);
      expect(manager.satisfies('1.2.3', '>1.2.0')).toBe(true);
      expect(manager.satisfies('1.2.3', '<2.0.0')).toBe(true);
      expect(manager.satisfies('1.2.3', '<=1.2.3')).toBe(true);
    });

    it('should check wildcard patterns', () => {
      expect(manager.satisfies('1.2.3', '1.2.x')).toBe(true);
      expect(manager.satisfies('1.9.0', '1.x')).toBe(true);
      expect(manager.satisfies('2.0.0', '*')).toBe(true);
    });

    it('should parse constraints', () => {
      const constraint = manager.parseConstraint('^1.2.3');
      expect(constraint).toBeDefined();
      expect(constraint?.constraint).toBe('^1.2.3');
    });
  });

  describe('Sorting', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['2.0.0', '1.0.0', '1.2.0', '1.1.0'];
      const sorted = manager.sort(versions);

      expect(sorted).toEqual(['1.0.0', '1.1.0', '1.2.0', '2.0.0']);
    });

    it('should sort versions in descending order', () => {
      const versions = ['1.0.0', '2.0.0', '1.1.0', '1.2.0'];
      const sorted = manager.rsort(versions);

      expect(sorted).toEqual(['2.0.0', '1.2.0', '1.1.0', '1.0.0']);
    });
  });

  describe('Max/Min Satisfying', () => {
    it('should find max satisfying version', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
      const max = manager.maxSatisfying(versions, '^1.0.0');

      expect(max).toBe('1.2.0');
    });

    it('should find min satisfying version', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
      const min = manager.minSatisfying(versions, '^1.0.0');

      expect(min).toBe('1.0.0');
    });

    it('should return null if no version satisfies', () => {
      const versions = ['1.0.0', '1.1.0'];
      const max = manager.maxSatisfying(versions, '^2.0.0');

      expect(max).toBeNull();
    });
  });

  describe('Version Components', () => {
    it('should get major version', () => {
      expect(manager.getMajor('1.2.3')).toBe(1);
      expect(manager.getMajor('5.0.0')).toBe(5);
    });

    it('should get minor version', () => {
      expect(manager.getMinor('1.2.3')).toBe(2);
      expect(manager.getMinor('5.9.0')).toBe(9);
    });

    it('should get patch version', () => {
      expect(manager.getPatch('1.2.3')).toBe(3);
      expect(manager.getPatch('5.9.7')).toBe(7);
    });
  });

  describe('Prerelease', () => {
    it('should detect prerelease versions', () => {
      expect(manager.isPrerelease('1.0.0-alpha')).toBe(true);
      expect(manager.isPrerelease('1.0.0-beta.1')).toBe(true);
      expect(manager.isPrerelease('1.0.0')).toBe(false);
    });

    it('should get prerelease tags', () => {
      expect(manager.getPrerelease('1.0.0-alpha.1')).toEqual(['alpha', '1']);
      expect(manager.getPrerelease('1.0.0')).toBeNull();
    });
  });

  describe('Version Registration', () => {
    it('should register new version', () => {
      manager.registerVersion('artifact1', '1.0.0', {
        changelog: 'Initial release',
      });

      const versions = manager.getVersions('artifact1');
      expect(versions).toContain('1.0.0');
    });

    it('should reject invalid version', () => {
      expect(() => {
        manager.registerVersion('artifact1', 'invalid');
      }).toThrow('Invalid semantic version');
    });

    it('should reject duplicate version', () => {
      manager.registerVersion('artifact1', '1.0.0');

      expect(() => {
        manager.registerVersion('artifact1', '1.0.0');
      }).toThrow('Version 1.0.0 already exists');
    });

    it('should update latest version', () => {
      manager.registerVersion('artifact1', '1.0.0');
      manager.registerVersion('artifact1', '1.1.0');
      manager.registerVersion('artifact1', '2.0.0');

      const latest = manager.getLatest('artifact1');
      expect(latest).toBe('2.0.0');
    });
  });

  describe('Version History', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0', { changelog: 'Initial' });
      manager.registerVersion('artifact1', '1.1.0', { changelog: 'Features' });
      manager.registerVersion('artifact1', '2.0.0', { changelog: 'Breaking', breaking: true });
    });

    it('should get version history', () => {
      const history = manager.getHistory('artifact1');

      expect(history).toBeDefined();
      expect(history?.versions).toHaveLength(3);
      expect(history?.latest).toBe('2.0.0');
    });

    it('should get all versions', () => {
      const versions = manager.getVersions('artifact1');

      expect(versions).toEqual(['1.0.0', '1.1.0', '2.0.0']);
    });

    it('should get version info', () => {
      const info = manager.getVersionInfo('artifact1', '1.1.0');

      expect(info).toBeDefined();
      expect(info?.version).toBe('1.1.0');
      expect(info?.changelog).toBe('Features');
    });

    it('should get changelog', () => {
      const changelog = manager.getChangelog('artifact1', '2.0.0');
      expect(changelog).toBe('Breaking');
    });

    it('should get all changelogs', () => {
      const changelogs = manager.getAllChangelogs('artifact1');

      expect(changelogs.size).toBe(3);
      expect(changelogs.get('1.0.0')).toBe('Initial');
      expect(changelogs.get('1.1.0')).toBe('Features');
      expect(changelogs.get('2.0.0')).toBe('Breaking');
    });
  });

  describe('Rollback', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0');
      manager.registerVersion('artifact1', '1.1.0');
      manager.registerVersion('artifact1', '2.0.0');
    });

    it('should rollback to previous version', () => {
      manager.rollback('artifact1', '1.1.0', 'Bug in 2.0.0');

      const latest = manager.getLatest('artifact1');
      expect(latest).toBe('1.1.0');
    });

    it('should record rollback history', () => {
      manager.rollback('artifact1', '1.1.0', 'Bug found');

      const history = manager.getRollbackHistory('artifact1');

      expect(history).toHaveLength(1);
      expect(history[0].from).toBe('2.0.0');
      expect(history[0].to).toBe('1.1.0');
      expect(history[0].reason).toBe('Bug found');
    });

    it('should throw error for non-existent artifact', () => {
      expect(() => {
        manager.rollback('nonexistent', '1.0.0');
      }).toThrow('No version history found');
    });

    it('should throw error for non-existent version', () => {
      expect(() => {
        manager.rollback('artifact1', '99.0.0');
      }).toThrow('Version 99.0.0 not found');
    });
  });

  describe('Find Versions', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0');
      manager.registerVersion('artifact1', '1.1.0');
      manager.registerVersion('artifact1', '1.2.0');
      manager.registerVersion('artifact1', '2.0.0');
    });

    it('should find versions matching constraint', () => {
      const versions = manager.findVersions('artifact1', '^1.0.0');

      expect(versions).toEqual(['1.0.0', '1.1.0', '1.2.0']);
    });

    it('should return empty array if no matches', () => {
      const versions = manager.findVersions('artifact1', '^3.0.0');

      expect(versions).toEqual([]);
    });
  });

  describe('Breaking Changes', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0');
      manager.registerVersion('artifact1', '1.1.0', { breaking: false });
      manager.registerVersion('artifact1', '2.0.0', { breaking: true });
      manager.registerVersion('artifact1', '3.0.0', { breaking: true });
    });

    it('should get breaking changes since version', () => {
      const breaking = manager.getBreakingChangesSince('artifact1', '1.0.0');

      expect(breaking).toHaveLength(2);
      expect(breaking.map(v => v.version)).toEqual(['2.0.0', '3.0.0']);
    });

    it('should check if upgrade has breaking changes', () => {
      const hasBreaking = manager.hasBreakingChanges('artifact1', '1.1.0', '2.0.0');
      expect(hasBreaking).toBe(true);

      const noBreaking = manager.hasBreakingChanges('artifact1', '1.0.0', '1.1.0');
      expect(noBreaking).toBe(false);
    });
  });

  describe('Deprecation', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0', { deprecated: true });
      manager.registerVersion('artifact1', '1.1.0', { deprecated: 'Use 2.0.0 instead' });
      manager.registerVersion('artifact1', '2.0.0');
    });

    it('should get deprecated versions', () => {
      const deprecated = manager.getDeprecatedVersions('artifact1');

      expect(deprecated).toHaveLength(2);
      expect(deprecated.map(v => v.version)).toEqual(['1.0.0', '1.1.0']);
    });

    it('should check if version is deprecated', () => {
      expect(manager.isDeprecated('artifact1', '1.0.0')).toBe(true);
      expect(manager.isDeprecated('artifact1', '1.1.0')).toBe(true);
      expect(manager.isDeprecated('artifact1', '2.0.0')).toBe(false);
    });
  });

  describe('Version Diff', () => {
    it('should get diff type between versions', () => {
      expect(manager.diff('1.0.0', '2.0.0')).toBe('major');
      expect(manager.diff('1.0.0', '1.1.0')).toBe('minor');
      expect(manager.diff('1.0.0', '1.0.1')).toBe('patch');
      expect(manager.diff('1.0.0', '1.0.0')).toBeNull();
    });
  });

  describe('Clear', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0');
      manager.registerVersion('artifact2', '1.0.0');
    });

    it('should clear all history', () => {
      manager.clear();

      expect(manager.getHistory('artifact1')).toBeNull();
      expect(manager.getHistory('artifact2')).toBeNull();
    });

    it('should clear specific artifact', () => {
      manager.clearArtifact('artifact1');

      expect(manager.getHistory('artifact1')).toBeNull();
      expect(manager.getHistory('artifact2')).toBeDefined();
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      manager.registerVersion('artifact1', '1.0.0', { changelog: 'Test' });
    });

    it('should export history', () => {
      const exported = manager.export('artifact1');

      expect(exported).toBeDefined();
      expect(exported.artifact1).toBeDefined();
      expect(exported.artifact1.versions).toHaveLength(1);
    });

    it('should export all history', () => {
      manager.registerVersion('artifact2', '1.0.0');

      const exported = manager.export();

      expect(exported.artifact1).toBeDefined();
      expect(exported.artifact2).toBeDefined();
    });

    it('should import history', () => {
      const exported = manager.export('artifact1');

      const newManager = new SemverManager();
      newManager.import(exported);

      const history = newManager.getHistory('artifact1');
      expect(history).toBeDefined();
      expect(history?.versions).toHaveLength(1);
    });
  });
});
