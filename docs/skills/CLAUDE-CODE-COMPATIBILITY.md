# Claude Code Skill Compatibility

PCL Skills are designed to be **fully compatible** with Claude Code's SKILL.md format, allowing seamless integration between both systems.

---

## Overview

- **PCL Format**: `.skill.pcl` files for programmatic skill definitions
- **Claude Code Format**: `SKILL.md` files for markdown-based skills
- **Interoperability**: PCL can import/export Claude Code skills, and vice versa

---

## Format Mapping

### PCL Skill → Claude Code SKILL.md

| PCL Field | Claude Code Field | Mapping |
|-----------|------------------|---------|
| `name` | `name` | Direct 1:1 |
| `description` | `description` | Direct 1:1 |
| `version` | *(custom metadata)* | Added as comment |
| `category` | *(custom metadata)* | Added as comment |
| `instructions` | Markdown body | Converted to markdown |
| `examples` | Markdown examples | Formatted as code blocks |
| `tools` | `allowed-tools` | Direct array mapping |
| `dependencies` | *(custom metadata)* | Added as comment |
| `metadata.author` | *(custom metadata)* | Added as comment |
| `metadata.license` | *(custom metadata)* | Added as comment |

### Claude Code SKILL.md → PCL Skill

| Claude Code Field | PCL Field | Mapping |
|------------------|-----------|---------|
| `name` | `name` | Direct 1:1 |
| `description` | `description` | Direct 1:1 |
| `allowed-tools` | `tools` | Direct array mapping |
| `model` | `config.model` | Mapped to persona config |
| `context` | *(workflow property)* | `fork` → isolated workflow |
| `agent` | *(workflow property)* | Agent type selection |
| `user-invocable` | `metadata.user_invocable` | Boolean flag |
| Markdown body | `instructions` | Triple-quoted string |
| Code examples | `examples` | Extracted and structured |

---

## Example: Python Expert Skill

### PCL Format (`python-expert.skill.pcl`)

```pcl
skill PythonExpert {
  name: "Python Expert"
  version: "1.0.0"
  description: "Expert-level Python programming with PEP 8 standards. Use when writing Python code, debugging Python, or explaining Python concepts."

  metadata: {
    author: "PCL Standard Library"
    license: "MIT"
    category: "programming"
    user_invocable: true
  }

  instructions: """
  # Python Expertise

  When working with Python code:

  1. **Follow PEP 8**: Use Black formatter defaults (88 char lines)
  2. **Type hints**: Always include type annotations
  3. **Error handling**: Use specific exception types
  4. **Best practices**: f-strings, pathlib, dataclasses

  ## Code Quality
  - Use meaningful variable names
  - Keep functions focused (single responsibility)
  - Write docstrings for public functions
  """

  examples: [
    {
      description: "Type-hinted function with error handling"
      code: """
      from typing import List, Optional

      def process_items(
          items: List[str],
          limit: Optional[int] = None
      ) -> List[str]:
          if limit is not None and limit < 0:
              raise ValueError(f"Limit must be non-negative, got {limit}")
          return items[:limit] if limit else items
      """
    }
  ]

  tools: ["Read", "Write", "Bash(python:*)"]
  dependencies: []
}
```

### Claude Code Format (`SKILL.md`)

```markdown
---
name: python-expert
description: Expert-level Python programming with PEP 8 standards. Use when writing Python code, debugging Python, or explaining Python concepts.
allowed-tools:
  - Read
  - Write
  - Bash(python:*)
---

# Python Expert

When working with Python code:

1. **Follow PEP 8**: Use Black formatter defaults (88 char lines)
2. **Type hints**: Always include type annotations
3. **Error handling**: Use specific exception types
4. **Best practices**: f-strings, pathlib, dataclasses

## Code Quality
- Use meaningful variable names
- Keep functions focused (single responsibility)
- Write docstrings for public functions

## Examples

### Type-hinted function with error handling

```python
from typing import List, Optional

def process_items(
    items: List[str],
    limit: Optional[int] = None
) -> List[str]:
    if limit is not None and limit < 0:
        raise ValueError(f"Limit must be non-negative, got {limit}")
    return items[:limit] if limit else items
```

---

<!-- PCL Metadata
version: 1.0.0
author: PCL Standard Library
license: MIT
category: programming
-->
```

---

## CLI Commands for Conversion

### Export PCL Skill to SKILL.md

```bash
# Export single skill
pcl skill export python-expert.skill.pcl --format claude-code -o ~/.claude/skills/python-expert/

# Export all skills in directory
pcl skill export skills/ --format claude-code -o ~/.claude/skills/

# Verify compatibility
pcl skill export python-expert.skill.pcl --format claude-code --validate
```

### Import SKILL.md to PCL

```bash
# Import single skill
pcl skill import ~/.claude/skills/python-expert/SKILL.md -o skills/python-expert.skill.pcl

# Import all Claude Code skills
pcl skill import ~/.claude/skills/ -o skills/

# Preview import without writing
pcl skill import ~/.claude/skills/python-expert/SKILL.md --dry-run
```

---

## Bidirectional Workflow

### Use Case 1: Develop in PCL, Deploy to Claude Code

1. Write skill in PCL format (type-safe, structured)
2. Test with PCL runtime
3. Export to SKILL.md format
4. Deploy to `~/.claude/skills/`
5. Claude Code automatically discovers skill

### Use Case 2: Import Claude Code Skills to PCL

1. Download/create skills in Claude Code format
2. Import to PCL format
3. Use in PCL personas and workflows
4. Benefit from PCL's type system and compiler

### Use Case 3: Hybrid Approach

1. Maintain skills in both formats
2. Use PCL for programmatic composition
3. Use SKILL.md for Claude Code integration
4. Sync changes with `pcl skill sync`

---

## Advanced Features

### Multi-File Skills

**PCL Approach:**
```pcl
skill ComplexSkill {
  name: "complex-skill"
  description: "Multi-file skill example"

  instructions: """
  # Main Instructions

  See also:
  - @import(reference.md) for detailed API docs
  - @import(examples.md) for more examples
  """

  // PCL can reference external files
  files: [
    "reference.md",
    "examples.md",
    "scripts/helper.py"
  ]
}
```

**Claude Code Approach:**
```markdown
---
name: complex-skill
description: Multi-file skill example
---

# Main Instructions

For detailed API reference, see [reference.md](reference.md).
For more examples, see [examples.md](examples.md).
```

Both approaches maintain the same directory structure:
```
complex-skill/
├── SKILL.md or complex-skill.skill.pcl
├── reference.md
├── examples.md
└── scripts/helper.py
```

### Forked Context (Sub-Agents)

**PCL Workflow:**
```pcl
skill CodeAnalysis {
  name: "code-analysis"
  description: "Analyze code quality and generate reports"
}

workflow CodeAnalysisFlow {
  // Run skill in isolated context
  steps: fork(CodeAnalysis) -> REPORT_WRITER
}
```

**Claude Code:**
```markdown
---
name: code-analysis
description: Analyze code quality and generate reports
context: fork
agent: Explore
---
```

---

## Compatibility Matrix

| Feature | PCL | Claude Code | Interop |
|---------|-----|-------------|---------|
| Name/Description | ✅ | ✅ | ✅ 100% |
| Instructions (Markdown) | ✅ | ✅ | ✅ 100% |
| Examples | ✅ Structured | ✅ Freeform | ✅ Convertible |
| Tool Restrictions | ✅ | ✅ | ✅ 100% |
| Model Selection | ✅ | ✅ | ✅ 100% |
| Dependencies | ✅ | ⚠️ Comments | ⚠️ Lossy |
| Type System | ✅ | ❌ | ⚠️ PCL-only |
| Versioning | ✅ | ⚠️ Comments | ⚠️ Lossy |
| Programmatic Composition | ✅ | ❌ | ⚠️ PCL-only |
| Forked Context | ✅ Workflows | ✅ Native | ✅ Compatible |
| User Invocable | ✅ | ✅ | ✅ 100% |

**Legend:**
- ✅ Full support
- ⚠️ Partial support / Lossy conversion
- ❌ Not supported

---

## Best Practices

### 1. Start with PCL for Complex Skills

Use PCL when you need:
- Type safety and validation
- Skill composition and dependencies
- Programmatic generation
- Version management
- Testing and CI/CD

### 2. Export to Claude Code for Distribution

Export to SKILL.md when:
- Sharing with Claude Code users
- Publishing to skill marketplace
- Maximum compatibility needed

### 3. Keep Core Skills Compatible

For maximum portability:
- Use only fields supported by both formats
- Keep instructions under 500 lines
- Use standard markdown formatting
- Avoid PCL-specific features in core skills

### 4. Use PCL Extensions for Power Features

Leverage PCL's unique features:
- Skill dependencies and composition
- Type-checked configurations
- Automated testing
- Skill inheritance and mixins

---

## Migration Path

### Phase 1: Import Existing Claude Code Skills

```bash
# Import all your Claude Code skills
pcl skill import ~/.claude/skills/ -o ./pcl-skills/

# Review and test
pcl skill validate ./pcl-skills/
```

### Phase 2: Enhance with PCL Features

```pcl
// Add type safety and dependencies
skill EnhancedPython {
  extends: @claude-code/python-expert

  dependencies: [
    "@pcl/skills/code-review",
    "@pcl/skills/testing"
  ]

  // Additional PCL-specific config
  config: {
    strict_mode: true
    auto_format: true
  }
}
```

### Phase 3: Export Back to Claude Code

```bash
# Export enhanced skill (compatible subset)
pcl skill export enhanced-python.skill.pcl --format claude-code
```

---

## Future: Skill Registry

PCL will support a unified skill registry:

```bash
# Publish to PCL registry (includes Claude Code format)
pcl publish python-expert.skill.pcl

# Install from registry (auto-detects format)
pcl install @pcl/skills/python-expert

# Registry serves both formats
curl https://registry.pcl.dev/skills/python-expert/skill.pcl
curl https://registry.pcl.dev/skills/python-expert/SKILL.md
```

---

## Summary

✅ **Full Compatibility**: PCL skills work with Claude Code
✅ **Bidirectional**: Convert between formats losslessly (for core features)
✅ **Best of Both**: Structured PCL + human-friendly markdown
✅ **Future-Proof**: Registry supports both formats

**Recommendation**: Develop in PCL, export to SKILL.md for maximum flexibility and compatibility.
