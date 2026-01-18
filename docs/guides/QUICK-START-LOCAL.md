# Quick Start - Local Development (No Database Required!)

Get started with PCL registry in **under 1 minute** - no database installation needed!

## 🚀 5-Minute Setup

### Step 1: Initialize Registry

```bash
# Use the database-free JSON file backend (default)
pcl registry init --backend json-file
```

**Output:**

```
✓ Configuration saved (global)
✓ Registry initialized successfully! You can now use registry commands.
```

This creates `~/.pcl/registry.json` - a simple JSON file that stores all your personas.

### Step 2: Create Your First Persona

Create a file `python-expert.pcl`:

```pcl
persona PythonExpert {
  name: "Python Expert"
  version: "1.0.0"
  description: "Expert in Python development, testing, and best practices"

  tags: ["python", "backend", "testing"]

  instruction: """
  You are an expert Python developer with deep knowledge of:
  - Modern Python (3.11+)
  - Type hints and mypy
  - pytest and test-driven development
  - FastAPI and async programming
  """
}
```

Add it to the registry:

```bash
pcl registry create python-expert.pcl
```

**Output:**

```
Reading PCL file: python-expert.pcl
Parsing PCL source...
Connecting to registry (backend: local)...
Creating persona artifact: Python Expert...
✓ Created artifact: abc123...

Artifact Details:
  Name:    Python Expert
  Type:    persona
  Version: 1.0.0
```

### Step 3: List Your Personas

```bash
pcl registry list --format table
```

**Output:**

```
┌────────────┬────────────────┬─────────┬─────────┬──────────┬──────┐
│ ID         │ Name           │ Type    │ Version │ Downloads│ Stars│
├────────────┼────────────────┼─────────┼─────────┼──────────┼──────┤
│ abc123...  │ Python Expert  │ persona │ 1.0.0   │ 0        │ 0    │
└────────────┴────────────────┴─────────┴─────────┴──────────┴──────┘
```

## 📁 Where's My Data?

All your registry data is stored in **one human-readable file**:

```bash
# View your registry
cat ~/.pcl/registry.json
```

```json
{
  "artifacts": {
    "abc123-def456-...": {
      "id": "abc123-def456-...",
      "type": "persona",
      "content": "persona PythonExpert {...}",
      "metadata": {
        "name": "Python Expert",
        "version": "1.0.0",
        "description": "Expert in Python development...",
        "tags": ["python", "backend", "testing"]
      },
      "published": false,
      "deleted": false,
      "createdAt": "2026-01-18T...",
      "updatedAt": "2026-01-18T..."
    }
  },
  "versions": {},
  "lastModified": "2026-01-18T..."
}
```

## 🎯 Common Tasks

### Search for Personas

```bash
# Search by keyword
pcl registry search "python"

# Filter by tags
pcl registry search "expert" --tags backend,testing

# Filter by type
pcl registry search "" --type persona
```

### View Details

```bash
# By name (slug)
pcl registry info python-expert

# By ID
pcl registry info abc123-def456-...

# Show source code
pcl registry info python-expert --show-source
```

### Publish a Persona

```bash
pcl registry publish python-expert
```

### Delete a Persona

```bash
# Soft delete (can be recovered)
pcl registry delete python-expert

# Permanent delete
pcl registry delete python-expert --purge
```

## 🔄 Using Different Backends

### Memory (Temporary)

Perfect for testing - data is lost when CLI exits:

```bash
pcl registry init --backend memory
pcl registry create test-persona.pcl --backend memory
```

### JSON File (Persistent, Default)

Best for local development:

```bash
pcl registry init --backend json-file
# or custom location
pcl registry init --backend json-file --db ./my-registry.json
```

### SQLite (Optional - Requires Installation)

For better performance with many personas:

```bash
# First install: npm install better-sqlite3
pcl registry init --backend sqlite
```

### PostgreSQL (Optional - Requires Server)

For teams and production:

```bash
# Requires PostgreSQL server
pcl registry init --backend postgres --host localhost --database pcl --user myuser
```

## 📦 Version Control Your Registry

```bash
# Initialize in your project directory
cd my-project
pcl registry init --backend json-file --db ./.pcl/registry.json --scope local

# Add to git
echo ".pcl/" >> .gitignore
git add .pcl/registry.json
git commit -m "Add team personas to registry"
```

Now your whole team can use the same persona library!

## 🎉 Next Steps

- Create more personas for different tasks
- Organize personas with tags
- Share your registry file with teammates
- Version control your persona library
- Upgrade to SQLite when you have 100+ personas

## 💡 Pro Tips

1. **Multiple Registries**: Use `--backend` flag to switch between registries

   ```bash
   pcl registry list --backend memory
   pcl registry list --backend local
   ```

2. **Backup Your Registry**:

   ```bash
   cp ~/.pcl/registry.json ~/.pcl/registry-backup.json
   ```

3. **Export as JSON**:

   ```bash
   pcl registry list --format json > personas-export.json
   ```

4. **Pretty Print**:
   ```bash
   pcl registry list --format yaml
   pcl registry list --format table
   pcl registry list --format pretty
   ```

## 🆘 Troubleshooting

### "Backend not found"

Run `pcl registry init` first to create the configuration.

### "File not found"

Make sure your PCL file exists and the path is correct.

### Registry file corrupted

Reset to empty:

```bash
echo '{"artifacts":{},"versions":{},"lastModified":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}' > ~/.pcl/registry.json
```

---

**You're ready to go!** No database, no complex setup - just start creating and managing your personas. 🎉
