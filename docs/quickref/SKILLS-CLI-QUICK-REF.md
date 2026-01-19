# PCL Skills CLI - Quick Reference

## Commands

```bash
# Import skills
pcl skill import <source> [-o <output>] [--recursive] [-v]

# Export skills
pcl skill export <source> [-o <output>] [--format <fmt>] [-v]

# Validate skills
pcl skill validate <source> [--spec <spec>] [--recursive] [-v]

# List all skills
pcl skill list [-v]

# Show skill info
pcl skill info <name|path> [-v]
```

## Common Tasks

### Import from Claude Code
```bash
pcl skill import ~/.claude/skills/ -o ./skills/ --recursive
```

### Validate Skills
```bash
# Agent Skills spec (default)
pcl skill validate ./skills/ --recursive

# Claude Code spec
pcl skill validate ./skills/ --spec claude-code --recursive
```

### List Available Skills
```bash
pcl skill list --verbose
```

### Show Skill Details
```bash
pcl skill info python-expert
```

## Options

- `-o, --output <dir>` - Output directory/file
- `--recursive` - Scan directories recursively
- `--spec <spec>` - Specification: `agentskills` (default) or `claude-code`
- `--format <fmt>` - Format: `claude-code` (default), `agentskills`, or `pcl`
- `-v, --verbose` - Show detailed output

## Auto-Discovery Locations

1. `~/.claude/skills/` - Personal Claude Code skills
2. `./.claude/skills/` - Project Claude Code skills
3. `./examples/skills/` - PCL example skills
4. `./skills/` - PCL project skills

## Validation Rules

### Agent Skills Name Pattern
```
✅ python-expert
✅ code-review
✅ data-analysis-pro

❌ Python Expert   (spaces)
❌ python_expert   (underscores)
❌ PythonExpert    (capitals)
```

**Pattern**: `^[a-z][a-z0-9-]*$` (lowercase, numbers, hyphens only)

## Exit Codes

- `0` - Success
- `1` - Error or validation failed

## Examples

```bash
# Import all Claude Code skills
pcl skill import ~/.claude/skills/ -o ./skills/ --recursive

# Validate all skills
pcl skill validate ./skills/ --spec agentskills --recursive

# Export for sharing
pcl skill export ./skills/my-skill/SKILL.md -o ~/shared/

# List with details
pcl skill list --verbose

# Show full info
pcl skill info my-skill --verbose
```

## Documentation

Full guide: [docs/skills/CLI-USAGE.md](docs/skills/CLI-USAGE.md)

## Status

✅ Production Ready
✅ 5 Commands
✅ Dual Spec Support
✅ 76% Bundle Reduction
