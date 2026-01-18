# JSON File Backend - Database-Free Local Registry

The **JSON File Backend** provides a simple, dependency-free way to persist your PCL registry locally without requiring PostgreSQL or SQLite.

## ✨ Benefits

- **Zero Dependencies** - No database software required
- **Human-Readable** - Registry data stored in plain JSON
- **Portable** - Single file you can backup, version, or share
- **Perfect for Development** - Instant setup, no configuration
- **Git-Friendly** - Pretty-printed JSON works well in version control

## 🚀 Quick Start

### Initialize Registry

```bash
# Initialize with JSON file backend (default for local use)
pcl registry init --backend json-file

# Custom location
pcl registry init --backend json-file --db ./my-registry.json
```

### Default Configuration

By default, the registry creates `~/.pcl/registry.json`:

```json
{
  "artifacts": {},
  "versions": {},
  "lastModified": "2026-01-18T..."
}
```

### Usage Examples

```bash
# All registry commands work the same
pcl registry create ./my-persona.pcl
pcl registry list
pcl registry search "python expert"
pcl registry info my-persona
pcl registry publish my-persona
```

## 📝 Configuration

### Global Config (`~/.pcl/config.json`)

```json
{
  "registry": {
    "default": "local",
    "backends": {
      "local": {
        "type": "json-file",
        "filePath": "~/.pcl/registry.json",
        "pretty": true,
        "autoSave": true
      }
    }
  }
}
```

### Options

| Option     | Type    | Default                | Description                        |
| ---------- | ------- | ---------------------- | ---------------------------------- |
| `filePath` | string  | `~/.pcl/registry.json` | Path to JSON file                  |
| `pretty`   | boolean | `true`                 | Pretty-print JSON (easier to read) |
| `autoSave` | boolean | `true`                 | Auto-save on every change          |

## 🔄 When to Use Each Backend

| Backend       | Best For                        | Pros                                      | Cons                             |
| ------------- | ------------------------------- | ----------------------------------------- | -------------------------------- |
| **json-file** | Local development, personal use | No dependencies, human-readable, portable | Not suitable for >1000 artifacts |
| **memory**    | Testing, temporary use          | Fastest, zero setup                       | Data lost on exit                |
| **sqlite**    | Production, teams               | Fast, handles large datasets              | Requires better-sqlite3 package  |
| **postgres**  | Enterprise, cloud               | Scalable, concurrent access               | Requires PostgreSQL server       |

## 💡 Tips

### Version Control Your Registry

```bash
# Initialize in your project
cd my-project
pcl registry init --backend json-file --db ./.pcl/registry.json --scope local

# Add to git
git add .pcl/registry.json
git commit -m "Add PCL registry"
```

### Share Your Registry

```bash
# Export registry as a single file
cp ~/.pcl/registry.json ./shared-registry.json

# Others can use it
pcl registry init --backend json-file --db ./shared-registry.json
```

### Backup and Restore

```bash
# Backup
cp ~/.pcl/registry.json ~/.pcl/registry-backup-$(date +%Y%m%d).json

# Restore
cp ~/.pcl/registry-backup-20260118.json ~/.pcl/registry.json
```

## 🎯 Example Workflow

```bash
# 1. Initialize local registry
pcl registry init --backend json-file

# 2. Create personas from PCL files
pcl registry create ./personas/python-expert.pcl
pcl registry create ./personas/code-reviewer.pcl
pcl registry create ./personas/architect.pcl

# 3. List all personas
pcl registry list --format table

# 4. View your registry file
cat ~/.pcl/registry.json

# 5. Commit to git (if in a project)
git add .pcl/registry.json
git commit -m "Add team personas"
```

## ⚠️ Limitations

- **Scalability**: Best for <1,000 artifacts (larger datasets should use SQLite/PostgreSQL)
- **Concurrent Access**: Single file can't handle multiple simultaneous writes
- **Search Performance**: Full-text search is slower than database backends
- **File Size**: Pretty-printed JSON uses more disk space than binary databases

## 🔧 Troubleshooting

### Registry file corrupted

```bash
# Reset to empty registry
echo '{"artifacts":{},"versions":{},"lastModified":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' > ~/.pcl/registry.json
```

### Performance issues

If you have many artifacts (>500), consider migrating to SQLite:

```bash
# Export current artifacts
pcl registry list --format json > artifacts-export.json

# Initialize SQLite backend
pcl registry init --backend sqlite

# Re-import artifacts
# (import tool coming in Phase 2)
```

## 🎉 Summary

The JSON File Backend is perfect for:

- **Individual developers** working locally
- **Small teams** sharing a registry file
- **Projects** wanting to version-control their persona library
- **Learning** and experimenting with PCL

For production deployments or teams >5 people, consider **SQLite** or **PostgreSQL**.
