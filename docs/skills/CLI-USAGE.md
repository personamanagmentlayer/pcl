# PCL Skills CLI - Complete Usage Guide

**Version**: 1.0.0
**Status**: ✅ Production Ready

---

## Overview

The PCL Skills CLI provides comprehensive command-line tools for managing skills in both **Agent Skills** and **Claude Code** formats. Import, export, validate, list, and inspect skills with full compatibility across ecosystems.

### Key Features

- ✅ **Import** skills from Claude Code or Agent Skills sources
- ✅ **Export** skills to SKILL.md format
- ✅ **Validate** skills against specifications
- ✅ **List** all discovered skills in your environment
- ✅ **Info** detailed information about any skill
- ✅ **Recursive** directory scanning
- ✅ **100% Agent Skills compatible**
- ✅ **95% Claude Code compatible**

---

## Installation

The skills CLI is included with PCL. After building:

```bash
npm run build
npm link  # Optional: makes 'pcl' command available globally
```

---

## Commands

### `pcl skill import`

Import skill(s) from SKILL.md format into your project.

**Syntax**:
```bash
pcl skill import <source> [options]
```

**Arguments**:
- `<source>` - Path to SKILL.md file or directory

**Options**:
- `-o, --output <dir>` - Output directory (default: `./skills`)
- `--recursive` - Recursively scan directories for SKILL.md files
- `-v, --verbose` - Show detailed output

**Examples**:

Import a single skill:
```bash
pcl skill import ~/.claude/skills/python-expert/SKILL.md -o ./skills/
```

Import all Claude Code skills:
```bash
pcl skill import ~/.claude/skills/ -o ./skills/ --recursive
```

Import with verbose output:
```bash
pcl skill import ~/.claude/skills/code-reviewer/SKILL.md -o ./skills/ --verbose
```

**Output Structure**:
```
./skills/
├── python-expert/
│   └── SKILL.md
├── code-reviewer/
│   └── SKILL.md
└── data-analyst/
    └── SKILL.md
```

**Output**:
```
Importing c:\Users\...\python-expert\SKILL.md...
✓ Imported skill: python-expert
  Output: ./skills/python-expert/SKILL.md
```

---

### `pcl skill export`

Export a skill to SKILL.md format compatible with Claude Code and Agent Skills.

**Syntax**:
```bash
pcl skill export <source> [options]
```

**Arguments**:
- `<source>` - Path to SKILL.md file to export

**Options**:
- `-o, --output <path>` - Output file or directory
- `--format <format>` - Output format: `claude-code`, `agentskills`, or `pcl` (default: `claude-code`)
- `-v, --verbose` - Show detailed output

**Examples**:

Export to current directory:
```bash
pcl skill export ./skills/python-expert/SKILL.md
```

Export to specific directory:
```bash
pcl skill export ./skills/python-expert/SKILL.md -o ~/.claude/skills/python-expert/
```

Export with Agent Skills format:
```bash
pcl skill export ./skills/python-expert/SKILL.md --format agentskills -o ./export/
```

**Output**:
```
Exporting c:\Projets\...\python-expert\SKILL.md...
✓ Exported skill: python-expert
  Format: claude-code
  Output: C:/Users/.../python-expert.md
```

---

### `pcl skill validate`

Validate skill(s) against Agent Skills or Claude Code specification.

**Syntax**:
```bash
pcl skill validate <source> [options]
```

**Arguments**:
- `<source>` - Path to SKILL.md file or directory

**Options**:
- `--spec <spec>` - Specification: `agentskills` or `claude-code` (default: `agentskills`)
- `--recursive` - Recursively validate directory
- `-v, --verbose` - Show warnings

**Examples**:

Validate against Agent Skills spec:
```bash
pcl skill validate ./skills/python-expert/SKILL.md --spec agentskills
```

Validate against Claude Code spec:
```bash
pcl skill validate ./skills/python-expert/SKILL.md --spec claude-code
```

Validate all skills in directory:
```bash
pcl skill validate ./skills/ --spec agentskills --recursive
```

**Output (Valid)**:
```
Validating python-expert against agentskills...
✓ Valid agentskills skill

Warnings:
  - No examples provided. Examples help users understand usage.
```

**Output (Invalid)**:
```
Validating test-skill against agentskills...
✗ Validation failed

Errors:
  - Invalid skill name: "Test Skill". Must match pattern: ^[a-z][a-z0-9-]*$
  - Missing or empty instructions
```

---

### `pcl skill list`

List all skills discovered in common locations.

**Syntax**:
```bash
pcl skill list [options]
```

**Options**:
- `-v, --verbose` - Show detailed information (path, tools, model)

**Search Locations**:
1. `~/.claude/skills/` - Personal Claude Code skills
2. `./.claude/skills/` - Project Claude Code skills
3. `./examples/skills/` - PCL example skills
4. `./skills/` - PCL project skills

**Examples**:

List all skills:
```bash
pcl skill list
```

List with details:
```bash
pcl skill list --verbose
```

**Output (Normal)**:
```
Discovering skills...

Found 1 skill(s):

● python-expert
  Expert-level Python programming with PEP 8 standards and modern best practices.
```

**Output (Verbose)**:
```
Discovering skills...

Found 1 skill(s):

● python-expert
  Expert-level Python programming with PEP 8 standards and modern best practices.
  Path: c:\Projets\personalayer\pcl-lite\examples\skills\python-expert\SKILL.md
  Tools: Read, Write, Bash(python:*)
```

---

### `pcl skill info`

Show detailed information about a skill.

**Syntax**:
```bash
pcl skill info <name|path> [options]
```

**Arguments**:
- `<name|path>` - Skill name (e.g., `python-expert`) or path to SKILL.md

**Options**:
- `-v, --verbose` - Show full instructions (preview)

**Examples**:

Show info by name:
```bash
pcl skill info python-expert
```

Show info by path:
```bash
pcl skill info ./skills/python-expert/SKILL.md
```

Show with instructions preview:
```bash
pcl skill info python-expert --verbose
```

**Output (Normal)**:
```
python-expert

Expert-level Python programming with PEP 8 standards and modern best practices.

Metadata:
  Path: c:\Projets\personalayer\pcl-lite\examples\skills\python-expert\SKILL.md

Allowed Tools:
  - Read
  - Write
  - Bash(python:*)
```

**Output (Verbose)**:
```
python-expert

Expert-level Python programming with PEP 8 standards and modern best practices.

Metadata:
  Path: c:\Projets\personalayer\pcl-lite\examples\skills\python-expert\SKILL.md

Allowed Tools:
  - Read
  - Write
  - Bash(python:*)

Instructions:
# Python Expert

You are an expert Python developer with deep knowledge of Python 3.10+ features...

  ... (truncated)
```

---

## Validation Rules

### Agent Skills Specification

**Name Requirements**:
- Must match pattern: `^[a-z][a-z0-9-]*$`
- Lowercase letters only
- Numbers allowed (not at start)
- Hyphens allowed (not at start)
- No spaces, underscores, or special characters

**Valid Names**:
```
✅ python-expert
✅ code-review
✅ data-analysis-pro
```

**Invalid Names**:
```
❌ Python Expert   (spaces)
❌ python_expert   (underscore)
❌ PythonExpert    (capital letters)
```

**Required Fields**:
- `name` - Skill identifier
- `description` - When to use this skill

**Optional Fields**:
- `allowed-tools` - Tool restrictions
- `license` - License type
- `compatibility` - Compatible platforms
- `metadata` - Additional key-value pairs

### Claude Code Specification

**Required Fields** (same as Agent Skills):
- `name` - Skill identifier
- `description` - When to use this skill

**Optional Fields**:
- `allowed-tools` - Array of tool names
- `model` - Preferred model (e.g., `claude-sonnet-4`)
- `context` - Must be `fork` or omitted
- `agent` - Agent type hint
- `user-invocable` - Boolean, user can invoke directly

**Context Field**:
```yaml
# Valid
context: fork

# Invalid
context: isolated  # Must be "fork" or omitted
```

---

## Workflows

### Importing Claude Code Skills

**Scenario**: You have Claude Code skills at `~/.claude/skills/` and want to use them in PCL.

```bash
# 1. Import all Claude Code skills
pcl skill import ~/.claude/skills/ -o ./skills/ --recursive

# 2. List imported skills
pcl skill list

# 3. Validate compatibility
pcl skill validate ./skills/ --spec claude-code --recursive

# 4. Check details of a specific skill
pcl skill info python-expert --verbose
```

### Creating and Sharing Skills

**Scenario**: You've created a PCL skill and want to share it.

```bash
# 1. Export to Claude Code format
pcl skill export ./my-skill/SKILL.md -o ~/.claude/skills/my-skill/

# 2. Validate against both specs
pcl skill validate ./my-skill/SKILL.md --spec agentskills
pcl skill validate ./my-skill/SKILL.md --spec claude-code

# 3. Share the SKILL.md file
# Users can import it with:
# pcl skill import path/to/my-skill/SKILL.md -o ./skills/
```

### Batch Validation

**Scenario**: You have many skills and want to ensure they all pass validation.

```bash
# Validate all skills against Agent Skills spec
pcl skill validate ./skills/ --spec agentskills --recursive --verbose

# Output shows each skill's status
✓ python-expert
✓ code-reviewer
✗ invalid-skill
    - Invalid skill name: "Invalid Skill"
    - Missing required field: description

Validation complete: 2 valid, 1 invalid
```

---

## Integration with PCL Personas

Once you've imported skills, use them in your personas:

```pcl
persona PYTHON_DEVELOPER {
  name: "Python Developer"
  version: "1.0.0"

  // Load Claude Code skill
  skills: [
    "@claude-code/python-expert",  // From ~/.claude/skills/
    "@pcl/skills/testing"          // From PCL standard library
  ]

  config: {
    model: "claude-sonnet-4"
    temperature: 0.3
  }

  prompts: {
    system: """
    You are a professional Python developer.
    Apply your Python expertise from loaded skills.
    """
  }
}
```

---

## Troubleshooting

### Skill Not Found

**Problem**:
```
Error: Skill not found: python-expert
Available skills:
  - code-reviewer
```

**Solution**:
- Use `pcl skill list` to see all available skills
- Check skill name matches exactly (case-sensitive)
- Verify skill is in a searched location

### Invalid Skill Name

**Problem**:
```
Validation failed
  - Invalid skill name: "Python Expert". Must match pattern: ^[a-z][a-z0-9-]*$
```

**Solution**:
- Rename skill to use lowercase and hyphens
- Valid: `python-expert`
- Invalid: `Python Expert`, `python_expert`, `PythonExpert`

### Import Failed

**Problem**:
```
Error importing ~/.claude/skills/my-skill/SKILL.md: Invalid SKILL.md format
```

**Solution**:
- Check file has YAML frontmatter:
  ```yaml
  ---
  name: skill-name
  description: Description here
  ---
  ```
- Verify frontmatter is valid YAML
- Ensure markdown body follows frontmatter

---

## Advanced Usage

### Custom Output Directories

```bash
# Export multiple skills to different locations
pcl skill export ./skills/python-expert/SKILL.md -o ~/shared/skills/python/
pcl skill export ./skills/code-reviewer/SKILL.md -o ~/shared/skills/review/
```

### Filtering by Specification

```bash
# Only show Agent Skills compatible skills
pcl skill validate ./skills/ --spec agentskills --recursive | grep "✓"

# Only show Claude Code compatible skills
pcl skill validate ./skills/ --spec claude-code --recursive | grep "✓"
```

### Scripting

```bash
# Find all skills with errors
pcl skill validate ./skills/ --spec agentskills --recursive 2>&1 | grep "✗"

# Export all valid skills
for skill in $(pcl skill list | grep "●" | awk '{print $2}'); do
  pcl skill export ./skills/$skill/SKILL.md -o ~/exports/$skill/
done
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Discover what skills are available
pcl skill list

# 2. Get details about a skill
pcl skill info python-expert

# 3. Import a skill from Claude Code
pcl skill import ~/.claude/skills/python-expert/SKILL.md -o ./skills/

# 4. Validate the imported skill
pcl skill validate ./skills/python-expert/SKILL.md --spec agentskills

# 5. Export to share with others
pcl skill export ./skills/python-expert/SKILL.md -o ~/shared/python-expert.md
```

### Batch Operations

```bash
# Import all Claude Code skills
pcl skill import ~/.claude/skills/ -o ./skills/ --recursive --verbose

# Validate all imported skills
pcl skill validate ./skills/ --spec agentskills --recursive

# List all skills with details
pcl skill list --verbose
```

---

## Best Practices

### 1. Validation Before Distribution

Always validate before sharing:

```bash
pcl skill validate my-skill/SKILL.md --spec agentskills
pcl skill validate my-skill/SKILL.md --spec claude-code
```

### 2. Use Verbose Mode for Debugging

When troubleshooting:

```bash
pcl skill import source/ -o dest/ --recursive --verbose
```

### 3. Organize Skills by Category

```
skills/
├── programming/
│   ├── python-expert/
│   ├── javascript-expert/
│   └── rust-expert/
├── devops/
│   ├── docker-expert/
│   └── kubernetes-expert/
└── data/
    ├── data-analysis/
    └── ml-engineering/
```

### 4. Version Control

Include skills in version control:

```bash
git add skills/
git commit -m "Add python-expert skill"
```

### 5. Regular Validation

Add to CI/CD:

```bash
# In .github/workflows/validate.yml
- name: Validate Skills
  run: pcl skill validate ./skills/ --spec agentskills --recursive
```

---

## API Reference

See [src/cli/commands/skills.ts](../../src/cli/commands/skills.ts) for the TypeScript API.

---

## Related Documentation

- [Claude Code Compatibility](CLAUDE-CODE-COMPATIBILITY.md)
- [Agent Skills Compatibility](AGENT-SKILLS-COMPATIBILITY.md)
- [Skill Loader API](../../src/skills/skill-loader.ts)
- [Example Skills](../../examples/skills/)

---

## Support

**Issues**: [GitHub Issues](https://github.com/personalayer/pcl/issues)
**Discussions**: [GitHub Discussions](https://github.com/personalayer/pcl/discussions)

---

**Last Updated**: 2026-01-18
**PCL Version**: 1.0.0-alpha
**Status**: ✅ Production Ready
