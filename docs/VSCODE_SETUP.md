# VS Code Configuration Guide for PCL

This directory contains VS Code workspace configuration for optimal development experience with PCL (Persona Control Language).

## 📁 Configuration Files

- **settings.json** - Workspace settings (editor, TypeScript, linting, formatting)
- **extensions.json** - Recommended extensions
- **tasks.json** - Build, test, and automation tasks
- **launch.json** - Debugging configurations
- **keybindings.json** - Custom keyboard shortcuts

## 🚀 Quick Setup

1. **Install Recommended Extensions**:

   ```
   Open Command Palette (Ctrl+Shift+P)
   → "Extensions: Show Recommended Extensions"
   → Install All
   ```

2. **Verify Configuration**:

   ```bash
   npm install
   npm run build
   npm run test
   ```

3. **Enable Format on Save**:
   Already configured in settings.json ✅

## ⚡ Performance Optimizations

### TypeScript Server

- Max memory: 4096MB
- Auto imports: Enabled

- Inlay hints: Enabled for better code readability

### File Watchers

Excluded directories for performance:

- node_modules/

- dist/

- coverage/
- .git/

### Search Optimization

Excluded from search to improve speed:

- node_modules/

- dist/
- coverage/
- .vscode-test/

## 🎯 Available Tasks

Run tasks via:

- Command Palette: `Tasks: Run Task`
- Keyboard: `Ctrl+Shift+B` (build) or `Ctrl+Shift+T` (test)
- Menu: Terminal → Run Task

### Core Tasks

- **npm: build** - Compile TypeScript
- **npm: build:watch** - Build with auto-rebuild

- **npm: test** - Run all tests
- **npm: test:watch** - Test with auto-rerun
- **npm: test:coverage** - Generate coverage report
- **npm: lint** - Check code style
- **npm: lint:fix** - Fix code style issues
- **npm: format** - Format code with Prettier
- **npm: clean** - Clean build artifacts

### Custom Tasks

- **🚀 Quick Start** - Install deps + build
- **✅ Quality Gate** - Lint + type check + test (sequential)
- **🔍 Pre-Commit Check** - Fix lint + format + test
- **📊 Coverage Report** - Generate and open HTML coverage

## 🐛 Debugging

### Available Configurations

1. **🐛 Debug Current Test**
   - Debugs the currently open test file
   - Usage: Open a .test.ts file → F5

2. **🧪 Debug All Tests**
   - Debugs the entire test suite
   - Usage: Select config → F5

3. **🎯 Debug Parser**
   - Debugs the parser module
   - Usage: Select config → F5

### Breakpoints

- Click left of line number to set breakpoint
- Red dot = active breakpoint
- F5 = Start debugging
- F10 = Step over
- F11 = Step into
- Shift+F11 = Step out

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |

| `Ctrl+Shift+T` | Run tests |
| `Ctrl+Shift+B` | Build project |
| `Ctrl+Shift+Q` | Quality gate check |
| `Ctrl+K Ctrl+D` | Copilot generate |
| `Ctrl+K Ctrl+I` | Copilot explain |
| `F5` | Start debugging |

| `Ctrl+Shift+P` | Command palette |

## 📦 Recommended Extensions

### Core Development

- **GitHub Copilot** - AI pair programmer
- **GitHub Copilot Chat** - AI assistant
- **ESLint** - JavaScript/TypeScript linting

- **Prettier** - Code formatter

### TypeScript Enhancement

- **TypeScript Next** - Latest TypeScript features
- **Error Lens** - Inline error display
- **Code Spell Checker** - Catch typos

### Testing

- **Vitest Explorer** - Test runner integration
- **Test Explorer** - Unified test UI

### Git Workflow

- **GitLens** - Enhanced Git integration

- **GitHub Pull Requests** - PR management

### Documentation

- **Markdown All in One** - Markdown editing

- **Markdown Mermaid** - Diagram support
- **Markdown Preview Enhanced** - Rich preview

### Productivity

- **Todo Tree** - Todo comment tracking
- **Better Comments** - Highlighted comments
- **Coverage Gutters** - Visual coverage

## 🎨 Editor Features

### Auto-Formatting

- **On Save**: Automatically formats files
- **On Paste**: Formats pasted code
- **Organize Imports**: Auto-sorts imports

### IntelliSense

- **Auto Imports**: Suggests and adds imports
- **Parameter Hints**: Shows parameter info
- **Quick Suggestions**: Context-aware completions

### Code Actions

- **Fix All ESLint**: Fixes linting issues on save
- **Organize Imports**: Sorts imports on save

## 📊 Quality Metrics Dashboard

Check these regularly:

```bash
# Build status
npm run build
# → Should complete in <10s


# Test results
npm run test
# → All tests should pass

# Type checking

npx tsc --noEmit
# → Should show 0 errors

# Code coverage
npm run test:coverage

# → Should be ≥80%

# Linting
npm run lint
# → Should show 0 errors

```

## 🔧 Troubleshooting

### TypeScript Server Issues

```

Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### ESLint Not Working

```

Ctrl+Shift+P → "ESLint: Restart ESLint Server"
```

### Slow IntelliSense

1. Check TypeScript server memory: 4096MB in settings.json
2. Restart TS server
3. Close unused editor tabs

### Test Runner Not Finding Tests

```
Ctrl+Shift+P → "Vitest: Restart Test Runner"
```

## 🎯 Workflow Recommendations

### Daily Development

1. **Start**: `npm run dev` (watch mode)
2. **Code**: Use Copilot for assistance
3. **Test**: `npm run test:watch` in parallel
4. **Check**: Run quality gate before commits

### Before Committing

```bash
npm run lint:fix
npm run format
npm run test
npm run build
```

Or use the **🔍 Pre-Commit Check** task.

### Code Review

1. Use GitLens to view file history
2. Run quality gate on PR branch
3. Check coverage report
4. Verify all tasks pass

## 💡 Pro Tips

1. **Split Editor**: Drag tabs to split view (code + test side-by-side)
2. **Zen Mode**: `Ctrl+K Z` for distraction-free coding
3. **Breadcrumbs**: Navigate code structure at top of editor
4. **Outline**: View file structure in sidebar
5. **Timeline**: See file change history (GitLens)
6. **Problems**: `Ctrl+Shift+M` to see all errors/warnings
7. **Terminal**: `` Ctrl+` `` to toggle integrated terminal
8. **Multi-Cursor**: `Alt+Click` or `Ctrl+Alt+Up/Down`

## 🔗 Additional Resources

- [VS Code Docs](https://code.visualstudio.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

---

**Happy Coding!** 🚀
