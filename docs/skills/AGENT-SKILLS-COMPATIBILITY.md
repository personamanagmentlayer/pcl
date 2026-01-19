# Agent Skills Specification Compatibility

PCL is fully compatible with the [Agent Skills specification](https://agentskills.io), enabling PCL personas to use skills from the broader AI agent ecosystem.

---

## Overview

**Agent Skills** is an open specification for portable, reusable AI agent capabilities. PCL supports:

- ✅ Agent Skills SKILL.md format (YAML + Markdown)
- ✅ Directory structure (`skill-name/SKILL.md`)
- ✅ All required and optional metadata fields
- ✅ Progressive disclosure pattern
- ✅ Multi-file skills with references and scripts

---

## Specification Comparison

### PCL vs Agent Skills vs Claude Code

| Feature | PCL | Agent Skills | Claude Code |
|---------|-----|--------------|-------------|
| **Format** | SKILL.md or .skill.pcl | SKILL.md (spec) | SKILL.md |
| **Frontmatter** | YAML | YAML | YAML |
| **Name constraints** | Flexible | Strict (lowercase, hyphens) | Strict |
| **Description** | 1-1024 chars | 1-1024 chars | 1-1024 chars |
| **Metadata** | Arbitrary | Arbitrary `metadata:` field | Limited fields |
| **Allowed tools** | Array | Space-delimited | Array |
| **License** | In metadata | Top-level field | In metadata |
| **Compatibility** | N/A | Top-level field | N/A |
| **Versioning** | `version` field | In `metadata` | In metadata |
| **Scripts** | ✅ `scripts/` dir | ✅ `scripts/` dir | ✅ Supported |
| **References** | ✅ Relative links | ✅ `references/` dir | ✅ Relative links |
| **Assets** | ✅ Any files | ✅ `assets/` dir | ✅ Any files |

**Compatibility Score: 100%** for all required fields

---

## Agent Skills Specification

### Required Fields

```yaml
---
name: skill-name              # REQUIRED: 1-64 chars, lowercase, hyphens
description: What this does   # REQUIRED: 1-1024 chars
---
```

### Optional Fields

```yaml
---
name: pdf-processing
description: Extract text from PDFs, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires git, docker, jq, and internet access
metadata:
  author: pcl-org
  version: "1.0.0"
  category: document-processing
allowed-tools: Bash(git:*) Bash(jq:*) Read Write
---
```

### Field Constraints

| Field | PCL Support | Notes |
|-------|-------------|-------|
| `name` | ✅ Full | Validates lowercase + hyphens |
| `description` | ✅ Full | 1-1024 char limit enforced |
| `license` | ✅ Full | Maps to `metadata.license` |
| `compatibility` | ✅ Full | Maps to `metadata.compatibility` |
| `metadata` | ✅ Full | Arbitrary key-value pairs |
| `allowed-tools` | ✅ Full | Converts space-delimited ↔ array |

---

## Directory Structure

### Agent Skills Standard

```
my-skill/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Optional: executable code
│   ├── process.py
│   └── helper.sh
├── references/           # Optional: documentation
│   ├── REFERENCE.md
│   └── API.md
└── assets/               # Optional: static resources
    ├── template.json
    └── diagram.png
```

### PCL Compatible Structure

```
my-skill/
├── SKILL.md              # Agent Skills format
├── skill.pcl             # Optional: PCL native format
├── scripts/
├── references/
└── assets/
```

**PCL can load from either format:**
- `SKILL.md` → Parsed as Agent Skills format
- `skill.pcl` → Parsed as PCL native format (richer features)

---

## Format Mapping

### Agent Skills → PCL

```typescript
// Agent Skills SKILL.md
---
name: data-analysis
description: Analyze datasets with pandas, matplotlib, seaborn
license: MIT
compatibility: Requires Python 3.8+, pandas, matplotlib
metadata:
  author: data-team
  version: "2.1.0"
  category: analytics
allowed-tools: Read Write Bash(python:*)
---

# Data Analysis

Instructions here...

// PCL Internal Format
{
  name: "data-analysis",
  description: "Analyze datasets with pandas, matplotlib, seaborn",
  instructions: "# Data Analysis\n\nInstructions here...",
  tools: ["Read", "Write", "Bash(python:*)"],
  metadata: {
    license: "MIT",
    compatibility: "Requires Python 3.8+, pandas, matplotlib",
    author: "data-team",
    version: "2.1.0",
    category: "analytics"
  }
}
```

### PCL → Agent Skills

```pcl
// PCL Skill
skill DataAnalysis {
  name: "data-analysis"
  description: "Analyze datasets with pandas, matplotlib, seaborn"

  metadata: {
    author: "data-team"
    version: "2.1.0"
    category: "analytics"
    license: "MIT"
    compatibility: "Requires Python 3.8+, pandas, matplotlib"
  }

  tools: ["Read", "Write", "Bash(python:*)"]

  instructions: """
  # Data Analysis

  Instructions here...
  """
}

// Exported SKILL.md (Agent Skills format)
---
name: data-analysis
description: Analyze datasets with pandas, matplotlib, seaborn
license: MIT
compatibility: Requires Python 3.8+, pandas, matplotlib
metadata:
  author: data-team
  version: "2.1.0"
  category: analytics
allowed-tools: Read Write Bash(python:*)
---

# Data Analysis

Instructions here...
```

---

## Progressive Disclosure

Agent Skills uses a **three-tier loading strategy** that PCL fully supports:

### Tier 1: Metadata (~50-100 tokens)
```typescript
// Loaded at startup for all skills
{
  name: "pdf-processing",
  description: "Extract text from PDFs...",
  location: "/skills/pdf-processing"
}
```

### Tier 2: Instructions (<5000 tokens)
```markdown
# Full SKILL.md body loaded when skill is activated
```

### Tier 3: Resources (on-demand)
```markdown
See [API Reference](references/API.md) for details.
Run: scripts/extract.py input.pdf
```

**PCL Implementation:**

```typescript
class SkillLoader {
  // Tier 1: Fast metadata scan
  async scanSkillMetadata(dir: string): Promise<SkillMetadata[]> {
    const skills = await findSkillFiles(dir);
    return skills.map(file => parseMetadataOnly(file)); // <100 tokens each
  }

  // Tier 2: Load full instructions
  async loadSkillInstructions(name: string): Promise<string> {
    const skillPath = resolveSkillPath(name);
    return readFullSkillMd(skillPath); // ~1000-5000 tokens
  }

  // Tier 3: Load resources on-demand
  async loadSkillResource(name: string, path: string): Promise<string> {
    return readFile(`${resolveSkillPath(name)}/${path}`);
  }
}
```

---

## Integration Patterns

### Pattern 1: Filesystem-Based (Shell Access)

```pcl
persona DEVELOPER {
  name: "Developer"

  // Skills loaded from filesystem
  skills: [
    "@agentskills/pdf-processing",    // ~/.agentskills/pdf-processing/
    "@agentskills/data-analysis"      // ~/.agentskills/data-analysis/
  ]

  prompts: {
    system: """
    You have access to specialized skills:

    <available_skills>
      <skill>
        <name>pdf-processing</name>
        <description>Extract text from PDFs, fill forms, merge documents</description>
        <location>~/.agentskills/pdf-processing/SKILL.md</location>
      </skill>
    </available_skills>

    To use a skill: cat <location>
    To run scripts: bash <location>/scripts/script.sh
    """
  }
}
```

### Pattern 2: Tool-Based (No Shell)

```pcl
persona API_AGENT {
  name: "API Agent"

  // Skills available via tool interface
  tools: [
    {
      name: "load_skill"
      description: "Load and execute a skill"
      parameters: {
        skill_name: "string"
        action: "enum[load_instructions, execute_script, load_reference]"
        resource_path: "string?"
      }
    }
  ]
}
```

---

## Name Validation

Agent Skills has **strict name requirements**. PCL validates names according to spec:

```typescript
function validateSkillName(name: string): ValidationResult {
  // Must be 1-64 characters
  if (name.length < 1 || name.length > 64) {
    return { valid: false, error: "Name must be 1-64 characters" };
  }

  // Must be lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: "Name must be lowercase letters, numbers, hyphens only" };
  }

  // Cannot start or end with hyphen
  if (name.startsWith('-') || name.endsWith('-')) {
    return { valid: false, error: "Name cannot start or end with hyphen" };
  }

  // Cannot have consecutive hyphens
  if (name.includes('--')) {
    return { valid: false, error: "Name cannot have consecutive hyphens" };
  }

  return { valid: true };
}
```

**Examples:**

✅ Valid:
- `pdf-processing`
- `data-analysis`
- `code-review`
- `git-workflow`

❌ Invalid:
- `PDF-Processing` (uppercase)
- `-pdf` (starts with hyphen)
- `pdf--processing` (consecutive hyphens)
- `pdf_processing` (underscores not allowed)

---

## Allowed Tools Format

Agent Skills uses **space-delimited** format. PCL supports both:

### Agent Skills Format
```yaml
allowed-tools: Read Write Bash(python:*) Bash(git:*)
```

### PCL Native Format
```yaml
allowed-tools:
  - Read
  - Write
  - Bash(python:*)
  - Bash(git:*)
```

**PCL Converter:**

```typescript
function convertAllowedTools(input: string | string[]): string[] {
  if (typeof input === 'string') {
    // Space-delimited → Array
    return input.split(/\s+/).filter(Boolean);
  }
  return input; // Already array
}

function toSpaceDelimited(tools: string[]): string {
  // Array → Space-delimited
  return tools.join(' ');
}
```

---

## CLI Integration

### Import Agent Skills

```bash
# Import from agentskills.io
pcl skill import ~/.agentskills/ -o ./skills/

# Import single skill
pcl skill import ~/.agentskills/pdf-processing/ -o ./skills/pdf-processing/

# Validate Agent Skills compliance
pcl skill validate ./skills/pdf-processing/ --spec agentskills

# Convert to PCL native format (optional)
pcl skill convert ./skills/pdf-processing/SKILL.md -o ./skills/pdf-processing/skill.pcl
```

### Export to Agent Skills

```bash
# Export PCL skill to Agent Skills format
pcl skill export ./my-skill.pcl --format agentskills -o ~/.agentskills/my-skill/

# Validate exported skill
pcl skill validate ~/.agentskills/my-skill/ --spec agentskills

# Publish to registry (both formats)
pcl publish my-skill --formats pcl,agentskills,claude-code
```

---

## Example: Complete Agent Skills Skill

```markdown
---
name: git-workflow
description: Manage git repositories with best practices for commits, branches, PRs. Use when working with version control, creating commits, or managing branches.
license: MIT
compatibility: Requires git CLI
metadata:
  author: pcl-org
  version: "1.2.0"
  category: development
  keywords: git,version-control,commits,branches
allowed-tools: Bash(git:*) Read Write
---

# Git Workflow

## Commit Best Practices

When creating commits:

1. **Write descriptive messages**
   - First line: imperative mood, <50 chars
   - Body: explain why, not what
   - Reference issues: `Fixes #123`

2. **Atomic commits**
   - One logical change per commit
   - All tests passing
   - Builds successfully

3. **Sign commits**
   ```bash
   git commit -S -m "feat: add user authentication"
   ```

## Branch Strategy

Follow Git Flow:
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `hotfix/*` - urgent fixes
- `release/*` - release preparation

## Examples

### Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/user-auth
```

### Clean Commit
```bash
git add src/auth/
git commit -m "feat(auth): implement JWT authentication

- Add JWT token generation
- Implement token validation middleware
- Add refresh token rotation

Fixes #42"
```

## Scripts

Run the commit template installer:
```bash
bash scripts/install-commit-template.sh
```

## References

- [Git Flow Guide](references/GIT-FLOW.md)
- [Commit Message Convention](references/COMMITS.md)
- [Branch Naming](references/BRANCHES.md)

---

<!-- PCL Metadata
pcl_version: 1.0.0
tested_with: git 2.40+
-->
```

---

## Compatibility Matrix

| Feature | PCL | Agent Skills | Claude Code |
|---------|-----|--------------|-------------|
| **Core Spec** | | | |
| YAML frontmatter | ✅ | ✅ | ✅ |
| `name` field | ✅ | ✅ Required | ✅ Required |
| `description` field | ✅ | ✅ Required | ✅ Required |
| Markdown body | ✅ | ✅ | ✅ |
| **Metadata** | | | |
| `license` field | ✅ | ✅ Top-level | ⚠️ In metadata |
| `compatibility` field | ✅ | ✅ Top-level | ❌ |
| Arbitrary `metadata` | ✅ | ✅ | ⚠️ Limited |
| **Tools** | | | |
| `allowed-tools` | ✅ Array | ✅ Space-delimited | ✅ Array |
| Tool patterns | ✅ | ✅ `Bash(cmd:*)` | ✅ |
| **Structure** | | | |
| `scripts/` directory | ✅ | ✅ | ✅ |
| `references/` directory | ✅ | ✅ | ⚠️ Any files |
| `assets/` directory | ✅ | ✅ | ⚠️ Any files |
| **Validation** | | | |
| Name constraints | ✅ | ✅ Strict | ✅ Strict |
| Progressive disclosure | ✅ | ✅ | ✅ |

**Overall Compatibility: 100%** (all Agent Skills features supported)

---

## Benefits of Agent Skills Support

### 1. **Ecosystem Access**
- Use skills from agentskills.io
- Share skills across AI products
- Community-contributed skills

### 2. **Standardization**
- Open specification
- Cross-platform portability
- Vendor-neutral

### 3. **Validation**
- Spec-compliant validation
- `skills-ref` CLI integration
- Automated testing

### 4. **Security**
- Explicit compatibility declarations
- Sandboxed script execution
- Tool allowlisting

---

## Migration Guide

### From Agent Skills to PCL

**Step 1:** Import skills
```bash
pcl skill import ~/.agentskills/ -o ./skills/
```

**Step 2:** Use in personas
```pcl
persona MyPersona {
  skills: [
    "@agentskills/pdf-processing",
    "@agentskills/data-analysis"
  ]
}
```

**Step 3:** Optionally convert to PCL native format for enhanced features
```bash
pcl skill convert ./skills/pdf-processing/SKILL.md -o ./skills/pdf-processing/skill.pcl
```

### From PCL to Agent Skills

**Step 1:** Export with validation
```bash
pcl skill export ./my-skill.pcl --format agentskills -o ~/.agentskills/my-skill/ --validate
```

**Step 2:** Verify with skills-ref
```bash
skills-ref validate ~/.agentskills/my-skill/
```

**Step 3:** Share or publish
```bash
# Publish to registry
pcl publish my-skill --format agentskills
```

---

## Resources

### Specifications
- [Agent Skills Specification](https://agentskills.io/specification)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [PCL Skills Documentation](./CLAUDE-CODE-COMPATIBILITY.md)

### Tools
- [skills-ref](https://github.com/agentskills/agentskills) - Reference implementation
- PCL CLI - `pcl skill` commands
- Agent Skills Registry - [agentskills.io](https://agentskills.io)

### Examples
- [examples/skills/python-expert/](../../examples/skills/python-expert/) - PCL example
- [Agent Skills Registry](https://agentskills.io/home) - Community skills

---

## Summary

✅ **PCL is 100% compatible with Agent Skills specification**

- All required fields supported
- All optional fields supported
- Name validation enforced
- Progressive disclosure pattern implemented
- Multi-file skills supported
- Bidirectional conversion working

**PCL extends Agent Skills with:**
- Type system (optional)
- Programmatic composition
- Dependency management
- Version control
- Registry integration

**Recommendation:** Use Agent Skills SKILL.md format for maximum portability, with optional PCL enhancements when needed.
