# Skill Marketplace Guidelines

**Version**: 1.0
**Last Updated**: 2026-01-22
**Audience**: Skill Publishers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Publishing Standards](#publishing-standards)
3. [Quality Criteria](#quality-criteria)
4. [Licensing & Attribution](#licensing--attribution)
5. [Curation Process](#curation-process)
6. [Ratings & Reviews](#ratings--reviews)
7. [Versioning & Updates](#versioning--updates)
8. [Marketplace Best Practices](#marketplace-best-practices)

---

## Introduction

The PCL Skill Marketplace is a community-driven repository of high-quality, reusable skills. These guidelines ensure skills meet quality standards and provide value to users.

### Marketplace Goals

- **Quality**: Only high-quality, tested skills
- **Discoverability**: Easy to find relevant skills
- **Trust**: Transparent ratings and reviews
- **Maintainability**: Active maintenance and updates
- **Safety**: Secure, validated skills

---

## Publishing Standards

### Minimum Requirements

Before publishing to the marketplace, your skill MUST:

#### 1. ✅ Pass Validation

```bash
pcl skill validate my-skill.md --strict
# Must pass with zero errors
```

#### 2. ✅ Pass Linting

```bash
pcl skill lint my-skill.md --strict
# Minimum score: 75/100 (Good)
```

#### 3. ✅ Include Examples

- Minimum: **2 examples**
- Recommended: **3-5 examples**
- Maximum: **7 examples**

#### 4. ✅ Specify Metadata

Required fields:
```yaml
name: skill-name
description: Clear, concise description (20-200 chars)
category: <one of 14 categories>
complexity: <beginner|intermediate|advanced|expert>
version: 1.0.0
allowed-tools:
  - <list of tools>
```

Recommended fields:
```yaml
author: Your Name
license: MIT
user-invocable: true
```

#### 5. ✅ Token Optimization

- **Target**: < 2000 tokens
- **Maximum**: < 4000 tokens
- **Recommended**: Run optimizer before publishing

```bash
pcl skill compile my-skill.md
# Check token count

pcl skill optimize my-skill.md --aggressive
# If needed
```

#### 6. ✅ Test Examples

```bash
pcl skill test my-skill.md
# All examples must pass
```

---

## Quality Criteria

### Tier 1: Featured Skills ⭐⭐⭐⭐⭐

**Requirements**:
- Quality score: **90-100** (Excellent)
- Token count: **< 1500**
- Examples: **4-6 high-quality examples**
- Documentation: **Complete and clear**
- Testing: **100% example pass rate**
- Usage: **50+ installations**
- Rating: **4.5+ stars** (from reviews)
- Maintenance: **Active maintenance** (updated < 3 months)

**Benefits**:
- Featured in marketplace homepage
- Priority in search results
- "Featured" badge
- Highlighted in newsletters

### Tier 2: Recommended Skills ⭐⭐⭐⭐

**Requirements**:
- Quality score: **75-89** (Good)
- Token count: **< 2000**
- Examples: **3-5 examples**
- Documentation: **Complete**
- Testing: **100% pass rate**
- Usage: **20+ installations**
- Rating: **4.0+ stars**
- Maintenance: **Regular updates** (< 6 months)

**Benefits**:
- Listed in recommended section
- Good search visibility
- "Recommended" badge

### Tier 3: Approved Skills ⭐⭐⭐

**Requirements**:
- Quality score: **60-74** (Fair)
- Token count: **< 3000**
- Examples: **2+ examples**
- Documentation: **Adequate**
- Testing: **> 80% pass rate**
- Rating: **3.5+ stars**

**Benefits**:
- Listed in marketplace
- Standard search visibility

### Tier 4: Community Skills

**Requirements**:
- Minimum standards met
- Quality score: **< 60**
- Listed but not promoted

---

## Licensing & Attribution

### Recommended Licenses

#### 1. MIT License (Recommended)
```yaml
license: MIT
```

**Best for**: Maximum reusability and permissive use

#### 2. Apache 2.0
```yaml
license: Apache-2.0
```

**Best for**: Patent protection needs

#### 3. Creative Commons CC BY 4.0
```yaml
license: CC-BY-4.0
```

**Best for**: Documentation and educational content

### Attribution Requirements

#### If Deriving from Existing Skill

```markdown
---
name: my-enhanced-skill
derived-from:
  skill: original-skill
  author: Original Author
  url: https://marketplace.pcl.dev/skills/original-skill
  license: MIT
---

# My Enhanced Skill

Based on [original-skill](url) by Original Author.

## Changes from Original
- Enhancement 1
- Enhancement 2
```

#### If Using External Resources

```markdown
## Resources

This skill incorporates concepts from:
- [Source 1](url) by Author 1
- [Source 2](url) by Author 2
```

### License Compatibility

**MIT → MIT**: ✅ Compatible
**Apache 2.0 → Apache 2.0**: ✅ Compatible
**GPL → MIT**: ❌ Incompatible (cannot relicense)
**MIT → GPL**: ✅ Compatible (can become more restrictive)

---

## Curation Process

### Submission Review

All new skills go through review:

#### Step 1: Automated Validation (Immediate)

```bash
# Runs automatically on submission
pcl skill validate skill.md --strict
pcl skill lint skill.md --strict
pcl skill test skill.md
```

**Pass Criteria**:
- ✅ Zero validation errors
- ✅ Quality score ≥ 60
- ✅ All tests pass

#### Step 2: Security Review (24-48 hours)

**Checks**:
- No malicious code patterns
- No hardcoded secrets/credentials
- No excessive tool permissions
- No data exfiltration attempts
- No prompt injection patterns

#### Step 3: Quality Review (2-5 days)

**Human reviewers check**:
- Instructions clarity
- Example quality
- Documentation completeness
- Originality (not duplicate)
- Value proposition

#### Step 4: Approval & Publishing

**Outcomes**:
- ✅ **Approved**: Published to marketplace
- ⏸️ **Revisions Needed**: Feedback provided, resubmit
- ❌ **Rejected**: Does not meet standards

### Review Turnaround

- **Automated**: Instant
- **Security**: 24-48 hours
- **Quality**: 2-5 business days
- **Total**: ~3-7 days average

---

## Ratings & Reviews

### User Ratings

Users can rate skills on 5-star scale:

⭐⭐⭐⭐⭐ **Excellent** (5 stars)
- Exceptional quality
- Solves problem perfectly
- Well-documented
- Great examples

⭐⭐⭐⭐ **Good** (4 stars)
- High quality
- Mostly solves problem
- Good documentation
- Solid examples

⭐⭐⭐ **Fair** (3 stars)
- Adequate quality
- Partially solves problem
- Basic documentation
- Some examples

⭐⭐ **Poor** (2 stars)
- Below expectations
- Doesn't fully solve problem
- Incomplete documentation

⭐ **Very Poor** (1 star)
- Major issues
- Doesn't work as described
- Missing critical information

### Review Guidelines

**Good Reviews** ✅:
```
⭐⭐⭐⭐⭐ "Excellent Python testing skill"

This skill dramatically improved my pytest workflows. The examples are
clear and cover common scenarios. The fixture patterns section was
particularly helpful.

Pros:
- Clear examples with expected output
- Covers edge cases
- Great fixture patterns

Suggestions:
- Add example for async testing
```

**Poor Reviews** ❌:
```
⭐ "Doesn't work"
```

**Better**:
```
⭐⭐ "Incomplete for my needs"

Missing coverage of async testing and fixture scopes. Examples work
but don't cover the advanced scenarios mentioned in the description.

Suggestions:
- Add async/await examples
- Explain fixture scopes (function, class, module)
```

### Response to Reviews

**Authors should**:
- ✅ Respond professionally
- ✅ Thank reviewers
- ✅ Address valid concerns
- ✅ Update skill based on feedback

**Example Response**:
```
Thanks for the feedback! I've added async testing examples in v1.1.0
and expanded the fixture scopes section. Hope this addresses your needs!
```

---

## Versioning & Updates

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

#### MAJOR (1.0.0 → 2.0.0)
**Breaking changes**:
- Changed interface
- Removed features
- Incompatible with previous version

#### MINOR (1.0.0 → 1.1.0)
**New features**:
- Added capabilities
- New examples
- Backward compatible

#### PATCH (1.0.0 → 1.0.1)
**Bug fixes**:
- Fixed errors
- Improved clarity
- Updated examples
- Backward compatible

### Update Best Practices

#### When to Update

**Update when**:
- Bug fixes needed
- Examples outdated
- New patterns emerge
- User feedback addressed
- Dependencies updated

**Update frequency**:
- **Active skills**: Monthly reviews
- **Stable skills**: Quarterly reviews
- **Mature skills**: Annual reviews

#### Changelog

**Maintain CHANGELOG.md**:
```markdown
# Changelog

## [1.2.0] - 2026-01-22
### Added
- Async testing examples
- Fixture scope explanations

### Fixed
- Typo in example 3
- Incorrect import statement

## [1.1.0] - 2026-01-15
### Added
- Parameterized test examples

## [1.0.0] - 2026-01-10
### Initial Release
- Core testing patterns
- 5 examples
```

### Deprecation Policy

**If deprecating a skill**:

1. **Mark as deprecated** (v1.x → v2.0):
   ```yaml
   deprecated: true
   deprecated-reason: "Replaced by new-skill-name"
   replacement: new-skill-name
   ```

2. **Provide migration guide**:
   ```markdown
   ## Migration Guide

   This skill is deprecated. Use `new-skill-name` instead.

   ### Changes Required
   1. Update skill reference: `old-skill` → `new-skill`
   2. Update examples: [migration steps]
   ```

3. **Maintain for transition period** (6 months):
   - Security fixes only
   - No new features
   - Clear deprecation warnings

4. **Archive after transition**:
   - Remove from active marketplace
   - Keep in archive for reference

---

## Marketplace Best Practices

### Naming Conventions

✅ **Good Names**:
- `python-testing-pytest`
- `react-hooks-patterns`
- `aws-lambda-deployment`
- `sql-query-optimization`

❌ **Bad Names**:
- `skill1` (non-descriptive)
- `MySkill` (wrong case)
- `python_skill` (wrong separator)
- `best-skill-ever` (promotional)

### Description Writing

✅ **Good**:
```yaml
description: "Expert Python testing with pytest framework, covering fixtures, parametrization, and mocking"
```

❌ **Bad**:
```yaml
description: "Test"  # Too short
description: "This is the most amazing comprehensive complete guide to absolutely everything you need to know about testing in Python with all possible scenarios covered"  # Too long
```

### Tags & Keywords

**Use relevant tags** for discoverability:
```yaml
tags:
  - python
  - testing
  - pytest
  - qa
  - automation
```

**Limit**: 3-7 tags per skill

### README Enhancement

**Include in skill**:
- Clear use cases
- Prerequisites
- Installation instructions (if dependencies)
- Troubleshooting tips
- FAQ section

---

## Moderation & Safety

### Prohibited Content

❌ **Not Allowed**:
- Malicious code or instructions
- Personally identifiable information (PII)
- Hardcoded credentials/secrets
- Copyright violations
- Spam or promotional content
- Offensive or discriminatory content

### Reporting Issues

**If you find problematic content**:
```bash
# Report via CLI
pcl skill report <skill-name> --reason "description"

# Or via marketplace
Visit: https://marketplace.pcl.dev/skills/<skill-name>/report
```

### Takedown Process

**Immediate removal** for:
- Security vulnerabilities
- Malicious code
- Copyright violations
- Terms of service violations

**Author notified** within 24 hours

---

## Success Metrics

### For Skill Authors

Track your skill's performance:

```bash
pcl skill stats my-skill

# Output:
# Installations: 127
# Active Users: 89
# Rating: 4.6/5.0 (42 reviews)
# Quality Score: 92/100
# Tier: Featured ⭐⭐⭐⭐⭐
```

### Performance Indicators

**Healthy Skill**:
- Steady installation growth
- High rating (4.0+)
- Active usage
- Positive reviews
- Regular updates

**Needs Attention**:
- Declining installations
- Low rating (< 3.5)
- Negative reviews
- No recent updates

---

## Resources

- [Skill Authoring Guide](./SKILL-AUTHORING-GUIDE.md)
- [Composition Patterns](./SKILL-COMPOSITION-PATTERNS.md)
- [CLI Reference](../.roadmap/SKILLS-TOOLING-SUMMARY.md)
- [Standard Library Examples](../stdlib/)

---

## Getting Started

### Publish Your First Skill

```bash
# 1. Create skill (wizard or manual)
pcl skill wizard

# 2. Develop and test
pcl skill validate my-skill.md --strict
pcl skill lint my-skill.md --strict
pcl skill test my-skill.md

# 3. Optimize
pcl skill optimize my-skill.md

# 4. Publish
pcl skill publish my-skill.md \
  --version "1.0.0" \
  --license "MIT" \
  --tags "python,testing,pytest" \
  --public

# 5. Monitor
pcl skill stats my-skill
```

---

**Build amazing skills and share them with the community!** 🚀

For questions: marketplace-support@pcl.dev
