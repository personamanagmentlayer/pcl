# PCL Build System & Package Manager

**Version**: 1.0.0
**Status**: ✅ Production Ready

---

## Overview

The PCL Build System provides a comprehensive solution for managing PCL projects, including:

- **Project Initialization** - Bootstrap new PCL projects with `pcl init`
- **Build System** - Compile PCL files to multiple formats with `pcl build`
- **Package Management** - Install and manage dependencies with `pcl install`
- **Dependency Resolution** - Automatic transitive dependency resolution
- **Lock Files** - Reproducible builds with `pcl-lock.json`

### Key Features

- ✅ **Multiple Build Targets** - prompt, json, yaml, typescript, markdown
- ✅ **Per-Persona Prompts** - Individual output files for each persona
- ✅ **Glob Pattern Matching** - Flexible file inclusion/exclusion
- ✅ **Semantic Versioning** - Full semver support with ranges
- ✅ **NPM-Compatible** - Familiar package.json-style format
- ✅ **Lock File Support** - Reproducible builds across environments
- ✅ **Development Dependencies** - Separate dev and production deps

---

## Quick Start

### Initialize a New Project

```bash
# Create a new PCL project
pcl init

# Or specify a name
pcl init my-persona-library

# With options
pcl init --force --verbose
```

This creates:
- `pcl.json` - Project manifest
- `src/index.pcl` - Example persona file
- `src/` - Source directory
- `.gitignore` - PCL-specific ignore rules

### Build Your Project

```bash
# Build with default settings (from pcl.json)
pcl build

# Build to specific target
pcl build --target prompt
pcl build --target typescript

# Verbose output
pcl build --verbose

# Custom config location
pcl build --config ./config/pcl.json
```

### Install Dependencies

```bash
# Install all dependencies from pcl.json
pcl install

# Install specific package
pcl install @pcl/stdlib

# Save to dependencies
pcl install my-persona --save

# Save to devDependencies
pcl install test-helpers --save-dev

# Production install (skip devDependencies)
pcl install --production
```

---

## Project Configuration

### pcl.json Format

The `pcl.json` file is the project manifest for PCL projects.

**Minimal Example**:
```json
{
  "name": "my-persona-library",
  "version": "1.0.0",
  "main": "index.pcl"
}
```

**Complete Example**:
```json
{
  "name": "my-persona-library",
  "version": "1.0.0",
  "description": "A collection of AI personas",
  "license": "MIT",
  "author": "Your Name <you@example.com>",

  "main": "index.pcl",
  "personas": ["src/personas/*.pcl"],
  "teams": ["src/teams/*.pcl"],
  "workflows": ["src/workflows/*.pcl"],
  "skills": ["src/skills/"],

  "dependencies": {
    "@pcl/stdlib": "^1.0.0",
    "code-reviewer": "~2.1.0"
  },

  "devDependencies": {
    "test-helpers": "^1.0.0"
  },

  "peerDependencies": {
    "pcl-runtime": ">=1.0.0"
  },

  "build": {
    "srcDir": "src",
    "outDir": "dist",
    "targets": ["prompt", "json", "typescript"],
    "include": ["**/*.pcl"],
    "exclude": ["node_modules/**", "dist/**", "**/*.test.pcl"],
    "bundle": true,
    "minify": false,
    "sourcemap": true,
    "strict": true
  },

  "scripts": {
    "build": "pcl build",
    "test": "pcl test",
    "dev": "pcl build --watch"
  }
}
```

### Field Reference

#### Package Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Package name (npm naming rules) |
| `version` | string | ✅ Yes | Semantic version (x.y.z) |
| `description` | string | ❌ No | Brief description |
| `license` | string | ❌ No | License type (e.g., "MIT") |
| `author` | string/object | ❌ No | Author information |

**Name Rules**:
- Lowercase letters, numbers, hyphens, dots, underscores
- Can be scoped: `@org/package-name`
- Follow npm package naming conventions

**Version Rules**:
- Must follow semver: `major.minor.patch`
- Can include prerelease: `1.0.0-beta.1`
- Can include build metadata: `1.0.0+build.123`

#### PCL Entry Points

| Field | Type | Description |
|-------|------|-------------|
| `main` | string | Main PCL file (default: "index.pcl") |
| `personas` | string[] | Persona entry points |
| `teams` | string[] | Team entry points |
| `workflows` | string[] | Workflow entry points |
| `skills` | string[] | Skill directories |

#### Dependencies

| Field | Type | Description |
|-------|------|-------------|
| `dependencies` | object | Runtime dependencies |
| `devDependencies` | object | Development-only dependencies |
| `peerDependencies` | object | Peer dependencies (version requirements) |

**Version Specifiers**:
- Exact: `"1.2.3"`
- Caret: `"^1.2.3"` (>=1.2.3 <2.0.0)
- Tilde: `"~1.2.3"` (>=1.2.3 <1.3.0)
- Range: `">=1.0.0 <2.0.0"`
- Latest: `"latest"` or `"*"`

#### Build Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `srcDir` | string | "src" | Source directory |
| `outDir` | string | "dist" | Output directory |
| `targets` | string[] | ["prompt", "json"] | Build targets |
| `include` | string[] | ["**/*.pcl"] | File patterns to include |
| `exclude` | string[] | ["node_modules/**", "dist/**"] | File patterns to exclude |
| `bundle` | boolean | false | Bundle dependencies |
| `minify` | boolean | false | Minify output |
| `sourcemap` | boolean | false | Generate source maps |
| `strict` | boolean | false | Enable strict type checking |

**Available Targets**:
- `prompt` - Generate text prompts (.prompt.txt) for each persona
- `json` - Generate JSON representation (.json)
- `yaml` - Generate YAML representation (.yaml)
- `typescript` - Generate TypeScript types (.ts)
- `markdown` - Generate documentation (.md)

#### Scripts

| Field | Type | Description |
|-------|------|-------------|
| `scripts` | object | Command shortcuts (key: value) |

Scripts can be run with `npm run <script-name>`.

---

## Build Targets

### Prompt Target

Generates individual `.prompt.txt` files for each persona.

**Input** (`src/expert.pcl`):
```pcl
persona PYTHON_EXPERT {
  name: "Python Expert"
  version: "1.0.0"

  config: {
    model: "claude-sonnet-4"
    temperature: 0.7
  }

  prompts: {
    system: """
    You are an expert Python developer.
    """
  }
}

persona CODE_REVIEWER {
  name: "Code Reviewer"
  version: "1.0.0"

  prompts: {
    system: """
    You are a code review specialist.
    """
  }
}
```

**Output**:
- `dist/PYTHON_EXPERT.prompt.txt` - Prompt for Python Expert
- `dist/CODE_REVIEWER.prompt.txt` - Prompt for Code Reviewer

### JSON Target

Generates JSON representation of the entire program.

**Output** (`dist/expert.json`):
```json
{
  "statements": [
    {
      "kind": "PersonaDeclaration",
      "name": "PYTHON_EXPERT",
      "config": {
        "model": "claude-sonnet-4",
        "temperature": 0.7
      },
      "prompts": {
        "system": "You are an expert Python developer."
      }
    }
  ]
}
```

### TypeScript Target

Generates TypeScript types from PCL definitions.

**Output** (`dist/expert.ts`):
```typescript
export interface PythonExpert {
  name: string;
  version: string;
  config: {
    model: string;
    temperature: number;
  };
  prompts: {
    system: string;
  };
}
```

### Markdown Target

Generates human-readable documentation.

**Output** (`dist/expert.md`):
```markdown
# Python Expert

**Version**: 1.0.0

## Configuration
- Model: claude-sonnet-4
- Temperature: 0.7

## System Prompt
You are an expert Python developer.
```

---

## Package Management

### Installing Dependencies

#### Install All Dependencies

```bash
# Install all dependencies from pcl.json
pcl install

# Skip devDependencies (production install)
pcl install --production

# Verbose output
pcl install --verbose
```

#### Install Specific Package

```bash
# Install and save to dependencies
pcl install @pcl/stdlib --save

# Install and save to devDependencies
pcl install test-helpers --save-dev

# Install specific version
pcl install my-persona@1.2.3 --save

# Install latest version
pcl install my-persona@latest --save
```

### Version Resolution

PCL supports semantic versioning with the following operators:

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `1.2.3` | Exact version | Install exactly 1.2.3 |
| `^1.2.3` | Caret range | >=1.2.3 <2.0.0 |
| `~1.2.3` | Tilde range | >=1.2.3 <1.3.0 |
| `>=1.0.0` | Comparison | Greater than or equal |
| `latest` | Latest version | Install newest version |
| `*` | Any version | Install newest version |

**Examples**:
```json
{
  "dependencies": {
    "exact-version": "1.2.3",
    "caret-range": "^1.0.0",
    "tilde-range": "~2.1.0",
    "comparison": ">=1.5.0 <3.0.0",
    "latest": "latest"
  }
}
```

### Lock File

The `pcl-lock.json` file ensures reproducible builds by locking exact versions of all dependencies.

**Structure**:
```json
{
  "version": "1.0.0",
  "packageVersion": "1.0.0",
  "lockfileVersion": 1,
  "dependencies": {
    "@pcl/stdlib": {
      "version": "1.2.3",
      "resolved": "https://registry.pcl.dev/@pcl/stdlib/-/stdlib-1.2.3.tgz",
      "integrity": "sha512-...",
      "dependencies": {}
    }
  },
  "devDependencies": {
    "test-helpers": {
      "version": "2.0.1",
      "resolved": "https://registry.pcl.dev/test-helpers/-/test-helpers-2.0.1.tgz",
      "integrity": "sha512-...",
      "dependencies": {}
    }
  }
}
```

**When to commit**:
- ✅ **Always commit** `pcl-lock.json` to version control
- ✅ Ensures all developers use same versions
- ✅ Enables reproducible builds in CI/CD

---

## Dependency Resolution

### Resolution Algorithm

1. **Parse Dependencies** - Read dependencies from `pcl.json`
2. **Resolve Versions** - Convert version ranges to specific versions
3. **Fetch Metadata** - Get package info from registry
4. **Resolve Transitive** - Recursively resolve sub-dependencies
5. **Flatten Tree** - Deduplicate and flatten dependency tree
6. **Check Conflicts** - Detect version conflicts
7. **Install Order** - Calculate depth-first install order

### Conflict Detection

PCL detects and warns about version conflicts:

```bash
Warning: Version conflict for my-package: 1.0.0 vs 2.0.0
```

**Conflict Resolution**:
1. Use highest compatible version
2. Install conflicting versions separately
3. Warn user about potential issues

### Circular Dependencies

Circular dependencies are detected and reported:

```bash
Error: Circular dependency detected: package-a -> package-b -> package-a
```

---

## Advanced Usage

### Custom Configuration File

```bash
# Use custom config location
pcl build --config ./config/pcl.json
pcl install --config ./config/pcl.json
```

### Watch Mode (Future)

```bash
# Rebuild on file changes
pcl build --watch
```

### Selective Builds

```bash
# Build only specific target
pcl build --target prompt

# Build with verbose output
pcl build --verbose
```

### Production Builds

```bash
# Install only production dependencies
pcl install --production

# Build with optimizations
pcl build --minify --bundle
```

---

## Directory Structure

### Recommended Layout

```
my-persona-library/
├── pcl.json              # Project manifest
├── pcl-lock.json         # Lock file (auto-generated)
├── .gitignore            # Git ignore rules
├── README.md             # Project documentation
├── src/                  # Source files
│   ├── index.pcl         # Main entry point
│   ├── personas/         # Persona definitions
│   │   ├── expert.pcl
│   │   └── reviewer.pcl
│   ├── teams/            # Team definitions
│   │   └── dev-team.pcl
│   └── workflows/        # Workflow definitions
│       └── code-review.pcl
├── dist/                 # Build output (auto-generated)
│   ├── EXPERT.prompt.txt
│   ├── REVIEWER.prompt.txt
│   ├── index.json
│   └── index.ts
├── pcl_modules/          # Installed dependencies (auto-generated)
│   ├── @pcl/
│   │   └── stdlib/
│   └── my-persona/
└── tests/                # Test files
    └── expert.test.pcl
```

### .gitignore

Recommended `.gitignore` (auto-generated by `pcl init`):

```gitignore
# Build output
dist/
*.map

# Dependencies
pcl_modules/
node_modules/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

---

## Integration with Other Tools

### NPM Scripts

Add PCL commands to `package.json`:

```json
{
  "scripts": {
    "build": "pcl build",
    "build:watch": "pcl build --watch",
    "build:prod": "pcl build --minify --bundle",
    "install:prod": "pcl install --production",
    "test": "pcl test"
  }
}
```

### CI/CD Integration

**GitHub Actions**:
```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install PCL
        run: npm install -g @pcl/cli

      - name: Install dependencies
        run: pcl install --production

      - name: Build
        run: pcl build

      - name: Test
        run: pcl test
```

### Pre-commit Hooks

**Using Husky**:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pcl build && pcl test"
    }
  }
}
```

---

## Troubleshooting

### Build Errors

**Problem**: `Error: pcl.json not found`

**Solution**:
```bash
# Initialize a new project
pcl init

# Or specify config location
pcl build --config ./path/to/pcl.json
```

---

**Problem**: `Error: Invalid pcl.json`

**Solution**:
- Check JSON syntax (no trailing commas)
- Validate required fields: `name`, `version`
- Ensure `name` follows npm naming rules (lowercase, hyphens, no spaces)
- Ensure `version` follows semver format (x.y.z)

---

**Problem**: `No PCL files found in src/`

**Solution**:
- Check `build.include` patterns in `pcl.json`
- Verify PCL files exist in source directory
- Check `build.exclude` patterns aren't too broad

---

### Installation Errors

**Problem**: `Error: Package not found: my-package`

**Solution**:
- Check package name spelling
- Verify package exists in registry
- Try `pcl install my-package@latest`

---

**Problem**: `Warning: Version conflict for package`

**Solution**:
- Review dependency versions in `pcl.json`
- Use compatible version ranges (^, ~)
- Consider updating conflicting packages

---

**Problem**: `Error: Circular dependency detected`

**Solution**:
- Review dependency graph
- Refactor to break circular references
- Consider extracting shared code to separate package

---

### Lock File Issues

**Problem**: `Could not parse pcl-lock.json`

**Solution**:
```bash
# Delete and regenerate lock file
rm pcl-lock.json
pcl install
```

---

**Problem**: `Installed versions don't match lock file`

**Solution**:
```bash
# Reinstall from lock file
rm -rf pcl_modules/
pcl install
```

---

## API Reference

### TypeScript API

Import and use programmatically:

```typescript
import { buildCommand } from '@pcl/cli/commands/build';
import { installCommand } from '@pcl/cli/commands/install';
import { initCommand } from '@pcl/cli/commands/init';

// Initialize project
await initCommand({
  name: 'my-project',
  version: '1.0.0',
  verbose: true
});

// Build project
await buildCommand({
  config: './pcl.json',
  target: 'prompt',
  verbose: true
});

// Install dependencies
await installCommand(['@pcl/stdlib'], {
  save: true,
  verbose: true
});
```

### Package Format API

```typescript
import { validatePackage, type PCLPackage } from '@pcl/build/package-format';

const pkg: PCLPackage = {
  name: 'my-package',
  version: '1.0.0',
  dependencies: {
    '@pcl/stdlib': '^1.0.0'
  }
};

const result = validatePackage(pkg);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Dependency Resolver API

```typescript
import { resolveDependencies } from '@pcl/build/dependency-resolver';

const tree = await resolveDependencies(pkg, {
  registry: 'https://registry.pcl.dev',
  production: false,
  verbose: true
});

console.log('Flattened dependencies:', tree.flattened);
```

---

## Future Enhancements

### Planned Features

- [ ] **Watch Mode** - Auto-rebuild on file changes
- [ ] **Registry Integration** - Publish to PCL package registry
- [ ] **Private Registries** - Support for private package registries
- [ ] **Workspace Support** - Monorepo/multi-package projects
- [ ] **Plugin System** - Custom build targets and transformations
- [ ] **Source Maps** - Debug information for generated code
- [ ] **Bundle Optimization** - Tree-shaking and code splitting
- [ ] **Incremental Builds** - Only rebuild changed files

### Roadmap

- **v1.1** - Watch mode, private registries
- **v1.2** - Workspace support, plugin system
- **v1.3** - Advanced optimizations, source maps

---

## Related Documentation

- [CLI Usage](CLI-USAGE.md)
- [PCL Language Guide](LANGUAGE.md)
- [Package Format Specification](../src/build/package-format.ts)
- [Skills CLI](skills/CLI-USAGE.md)
- [Registry System](REGISTRY.md)

---

## Support

**Issues**: [GitHub Issues](https://github.com/personalayer/pcl/issues)
**Discussions**: [GitHub Discussions](https://github.com/personalayer/pcl/discussions)

---

**Last Updated**: 2026-01-19
**PCL Version**: 1.0.0-alpha
**Status**: ✅ Production Ready
