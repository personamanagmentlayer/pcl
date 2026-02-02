# PCL Installation Guide

**Complete installation instructions for PCL**

---

## Quick Install

```bash
# Clone the repository
git clone https://github.com/personamanagmentlayer/pcl.git
cd pcl

# Install dependencies
npm install

# Build PCL
npm run build

# Verify installation
node dist/cli/index.js --version
```

---

## System Requirements

### Minimum Requirements

- **Node.js:** >= 20.0.0
- **npm:** >= 9.0.0
- **Operating System:** Windows, macOS, Linux
- **RAM:** 2GB minimum, 4GB recommended
- **Disk Space:** 500MB for installation

### Recommended Requirements

- **Node.js:** Latest LTS version
- **npm:** Latest version
- **RAM:** 8GB or more
- **Disk Space:** 1GB or more

---

## Installation Methods

### Method 1: From Source (Recommended for Development)

```bash
# Clone repository
git clone https://github.com/personamanagmentlayer/pcl.git
cd pcl

# Install dependencies
npm install

# Build the project
npm run build

# Optionally link globally
npm link

# Verify
pcl --version
```

### Method 2: From npm (Coming Soon)

```bash
# Global installation
npm install -g @pcl/sdk

# Verify
pcl --version
```

### Method 3: Using npx (No Installation)

```bash
# Run without installing
npx @pcl/sdk parse example.pcl
npx @pcl/sdk check example.pcl
```

---

## Post-Installation Setup

### 1. Shell Completions

Enable tab completion for your shell:

#### Bash

```bash
# Add to ~/.bashrc or ~/.bash_profile
source <(pcl completion --shell bash)
```

#### Zsh

```bash
# Add to ~/.zshrc
source <(pcl completion --shell zsh)
```

#### Fish

```bash
# Save to completions directory
pcl completion --shell fish > ~/.config/fish/completions/pcl.fish
```

#### PowerShell

```powershell
# Add to your profile: $PROFILE
pcl completion --shell powershell | Out-String | Invoke-Expression
```

### 2. Initialize Registry

```bash
# Initialize local registry (JSON File backend)
pcl registry init --backend json-file

# Or with SQLite backend
pcl registry init --backend sqlite --db-path ~/.pcl/registry.db

# Or with PostgreSQL backend (requires server)
pcl registry init --backend postgresql --connection-string "postgresql://localhost/pcl"
```

### 3. Configure Environment

Create `.env` file or set environment variables:

```bash
# API Keys (if using cloud providers)
export ANTHROPIC_API_KEY="your-api-key"
export OPENAI_API_KEY="your-api-key"
export GOOGLE_AI_API_KEY="your-api-key"

# Registry configuration
export PCL_REGISTRY_BACKEND="json-file"
export PCL_REGISTRY_PATH="~/.pcl/registry.json"

# Default provider
export PCL_DEFAULT_PROVIDER="anthropic"
export PCL_DEFAULT_MODEL="claude-3-5-sonnet-20241022"
```

---

## IDE Setup

### VS Code Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "PCL Language"
4. Click Install

Or install from VSIX:

```bash
code --install-extension pcl-language-*.vsix
```

See [VSCODE_SETUP.md](VSCODE_SETUP.md) for detailed configuration.

### Other IDEs

PCL provides Language Server Protocol (LSP) support for any LSP-compatible editor:

- **Neovim**: Use `nvim-lspconfig`
- **Emacs**: Use `lsp-mode`
- **Sublime Text**: Use `LSP` package
- **Vim**: Use `vim-lsp`

LSP server command:

```bash
node dist/lsp/server.js --stdio
```

---

## Verification

### Check Installation

```bash
# Version
pcl --version

# Help
pcl --help

# Parse a file
pcl parse examples/hello-world.pcl

# Check types
pcl check examples/hello-world.pcl

# Start REPL
pcl repl
```

### Run Tests

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Build from Source

```bash
# Clean previous builds
npm run clean

# Full build
npm run build

# Watch mode (for development)
npm run build:watch
```

---

## Development Setup

### For Contributors

```bash
# Clone repository
git clone https://github.com/personamanagmentlayer/pcl.git
cd pcl

# Install dependencies
npm install

# Install pre-commit hooks
npm run prepare

# Build in watch mode
npm run build:watch

# In another terminal, run tests
npm run test:watch
```

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Vitest**: Testing framework
- **TypeScript**: Type checking

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup.

---

## Troubleshooting

### Common Issues

#### Issue: "command not found: pcl"

**Solution:**

```bash
# Ensure build completed successfully
npm run build

# Link globally
npm link

# Or use full path
node dist/cli/index.js --version
```

#### Issue: "Cannot find module..."

**Solution:**

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Issue: "EACCES: permission denied"

**Solution:**

```bash
# Use npm without sudo
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Then reinstall
npm install -g @pcl/sdk
```

#### Issue: Build fails with TypeScript errors

**Solution:**

```bash
# Ensure TypeScript version is correct
npm install typescript@^5.3.3 --save-dev

# Clean and rebuild
npm run clean
npm run build
```

### Getting Help

- **GitHub Issues**: https://github.com/personamanagmentlayer/pcl/issues
- **Documentation**: [docs/README.md](README.md)
- **Community**: Discord/Slack (links in README)

---

## Updating PCL

### Update from Source

```bash
cd pcl
git pull origin main
npm install
npm run build
```

### Update from npm

```bash
npm update -g @pcl/sdk
```

---

## Uninstallation

### Remove Global Installation

```bash
npm uninstall -g @pcl/sdk
```

### Remove Registry Data

```bash
rm -rf ~/.pcl
```

### Remove Shell Completions

Remove the completion lines added to your shell configuration files (`.bashrc`, `.zshrc`, etc.).

---

## Next Steps

- **[Quick Start Guide](QUICK_START.md)** - Get started quickly
- **[Getting Started](guides/GETTING-STARTED-CURRENT.md)** - Detailed tutorial
- **[Core Concepts](CORE_CONCEPTS.md)** - Learn the fundamentals
- **[CLI Commands](COMMANDS.md)** - Command reference

---

**Last Updated:** 2026-02-02
