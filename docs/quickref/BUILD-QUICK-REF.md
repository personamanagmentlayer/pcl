# PCL Build System - Quick Reference

## Commands

```bash
# Initialize project
pcl init [name] [--force] [--verbose]

# Build project
pcl build [--target <target>] [--config <path>] [--watch] [--verbose]

# Install dependencies
pcl install [packages...] [--save] [--save-dev] [--production] [--verbose]
```

## Quick Start

```bash
# 1. Create new project
pcl init my-persona-library

# 2. Build project
pcl build

# 3. Install dependencies
pcl install @pcl/stdlib --save
```

## pcl.json

**Minimal**:
```json
{
  "name": "my-package",
  "version": "1.0.0",
  "main": "index.pcl"
}
```

**With Build Config**:
```json
{
  "name": "my-package",
  "version": "1.0.0",
  "build": {
    "srcDir": "src",
    "outDir": "dist",
    "targets": ["prompt", "json", "typescript"]
  },
  "dependencies": {
    "@pcl/stdlib": "^1.0.0"
  }
}
```

## Build Targets

- `prompt` - Text prompts (.prompt.txt)
- `json` - JSON representation (.json)
- `yaml` - YAML representation (.yaml)
- `typescript` - TypeScript types (.ts)
- `markdown` - Documentation (.md)

## Version Specifiers

- `1.2.3` - Exact version
- `^1.2.3` - >=1.2.3 <2.0.0 (caret)
- `~1.2.3` - >=1.2.3 <1.3.0 (tilde)
- `latest` - Latest version
- `*` - Any version

## Common Workflows

### New Project
```bash
pcl init
cd my-project
pcl install @pcl/stdlib --save
pcl build
```

### Add Dependency
```bash
pcl install my-persona --save
pcl build
```

### Production Build
```bash
pcl install --production
pcl build --minify
```

## Directory Structure

```
my-project/
├── pcl.json          # Project manifest
├── pcl-lock.json     # Lock file
├── src/              # Source files
│   └── index.pcl
├── dist/             # Build output
└── pcl_modules/      # Dependencies
```

## Options

### Init Options
- `--force` - Overwrite existing pcl.json
- `--verbose` - Show detailed output

### Build Options
- `--target <target>` - Build target (prompt, json, typescript, etc.)
- `--config <path>` - Path to pcl.json
- `--watch` - Watch for changes
- `--verbose` - Show detailed output

### Install Options
- `--save` - Save to dependencies
- `--save-dev` - Save to devDependencies
- `--production` - Skip devDependencies
- `--verbose` - Show detailed output

## Troubleshooting

### pcl.json not found
```bash
pcl init
```

### Build errors
```bash
pcl build --verbose
```

### Dependency conflicts
```bash
rm pcl-lock.json
pcl install
```

## Full Documentation

See [docs/BUILD-SYSTEM.md](docs/BUILD-SYSTEM.md) for complete guide.
