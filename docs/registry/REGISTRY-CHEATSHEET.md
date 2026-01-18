# PCL Registry - Quick Reference

## 🚀 Getting Started (Database-Free!)

```bash
# Initialize registry (creates ~/.pcl/registry.json)
pcl registry init --backend json-file

# You're ready! No database needed.
```

---

## 📝 Common Commands

### Create Artifacts

```bash
# From a PCL file
pcl registry create ./my-persona.pcl

# Create and publish immediately
pcl registry create ./my-persona.pcl --publish
```

### List Artifacts

```bash
# Table format (default)
pcl registry list

# JSON format
pcl registry list --format json

# YAML format
pcl registry list --format yaml

# Filter by type
pcl registry list --type persona
```

### View Details

```bash
# By slug or name
pcl registry info my-persona

# By ID
pcl registry info abc123-def456-...

# Show source code
pcl registry info my-persona --show-source
```

### Publish Artifacts

```bash
# Make artifact publicly available
pcl registry publish my-persona

# Force re-publish
pcl registry publish my-persona --force
```

### Delete Artifacts

```bash
# Soft delete (recoverable)
pcl registry delete my-persona

# Permanent delete
pcl registry delete my-persona --purge

# Skip confirmation
pcl registry delete my-persona --force
```

---

## 🎯 Backend Options

### Memory (No Persistence)

```bash
pcl registry init --backend memory
pcl registry create file.pcl --backend memory
```

### JSON File (Default - Persistent)

```bash
pcl registry init --backend json-file
pcl registry init --backend json-file --db ./custom.json
```

### SQLite (Optional - Requires Installation)

```bash
npm install better-sqlite3
pcl registry init --backend sqlite
```

### PostgreSQL (Optional - Requires Server)

```bash
npm install pg
pcl registry init --backend postgres \
  --host localhost \
  --database pcl \
  --user myuser
```

---

## 📂 File Locations

```
~/.pcl/
├── config.json       # Configuration
└── registry.json     # All your artifacts (JSON backend)
```

---

## 🎨 Output Formats

| Format   | Use Case            | Command                    |
| -------- | ------------------- | -------------------------- |
| `table`  | Human-readable      | `--format table` (default) |
| `json`   | Machine-readable    | `--format json`            |
| `yaml`   | Configuration files | `--format yaml`            |
| `list`   | Compact view        | `--format list`            |
| `pretty` | Detailed view       | `--format pretty`          |

---

## 💡 Tips & Tricks

### Version Control Your Registry

```bash
# Project-local registry
cd my-project
pcl registry init --backend json-file --db ./.pcl/registry.json --scope local

# Add to git
git add .pcl/registry.json
git commit -m "Add team personas"
```

### Backup Registry

```bash
cp ~/.pcl/registry.json ~/.pcl/registry-backup.json
```

### Reset Registry

```bash
rm ~/.pcl/registry.json
pcl registry init --backend json-file
```

### View Raw Data

```bash
# Pretty print
cat ~/.pcl/registry.json | jq

# Or just cat
cat ~/.pcl/registry.json
```

---

## 🔧 Troubleshooting

### "Backend not found"

```bash
# Run init first
pcl registry init --backend json-file
```

### "File not found"

```bash
# Check file path
ls -la my-persona.pcl

# Use absolute path
pcl registry create "$(pwd)/my-persona.pcl"
```

### Registry corrupted

```bash
# Reset to empty
echo '{"artifacts":{},"versions":{},"lastModified":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' > ~/.pcl/registry.json
```

---

## 📊 When to Use Each Backend

| Backend       | Artifacts | Users     | Use Case         |
| ------------- | --------- | --------- | ---------------- |
| **memory**    | Any       | 1         | Testing, CI/CD   |
| **json-file** | <1,000    | 1-10      | **Local dev** ⭐ |
| **sqlite**    | <100,000  | 1-50      | Teams            |
| **postgres**  | Unlimited | Unlimited | Enterprise       |

**Recommendation:** Start with **json-file**, upgrade to **sqlite** if needed!

---

## 🎉 Quick Examples

### Create a Python Expert Persona

```pcl
# python-expert.pcl
persona PythonExpert {
  intent "Expert in Python development and testing"
  tone professional
  depth detailed

  skills {
    "Python 3.11+"
    "pytest and TDD"
    "FastAPI"
  }
}
```

```bash
pcl registry create python-expert.pcl
```

### List All Personas

```bash
pcl registry list --type persona --format table
```

### Share With Team

```bash
# Copy registry file
cp ~/.pcl/registry.json ./team-personas.json

# Team member uses it
pcl registry init --backend json-file --db ./team-personas.json
```

---

**Need help?** Check out:

- [Quick Start Guide](../guides/QUICK-START-LOCAL.md)
- [JSON Backend Guide](../guides/JSON-FILE-BACKEND.md)
- [Test Results](TEST-RESULTS.md)

---

**Ready to go!** 🚀 Start building your persona library!
