# VS Code Setup Guide for PCL Development

Complete guide to configuring Visual Studio Code for optimal PCL development experience.

## 🎯 Prerequisites

- **VS Code**: Version 1.85+
- **Node.js**: Version 18+
- **Git**: For version control

## 🚀 Quick Start (5 Minutes)

### 1. Clone and Install

```bash
git clone https://github.com/personamanagmentlayer/pcl-lite.git
cd pcl-lite
npm install
```

### 2. Open in VS Code

```bash
code .
```

### 3. Install Recommended Extensions

When VS Code opens, you'll see a notification:

> "This workspace has extension recommendations."

Click **"Install All"** or:

```
Ctrl+Shift+P → "Extensions: Show Recommended Extensions"
→ Click "Install Workspace Recommended Extensions"
```

### 4. Verify Setup

Run the quality gate:

```bash
npm run lint
npm run test
npm run build
```

All should pass! ✅

---

## 📦 Essential Extensions

### Must-Have (Core Development)

1. **GitHub Copilot** (`github.copilot`)
   - AI-powered code completion
   - Suggests whole functions and patterns
   - Context-aware recommendations

2. **GitHub Copilot Chat** (`github.copilot-chat`)
   - Natural language code assistance
   - Explains code, finds bugs, writes tests
   - Supports `/persona` commands (see copilot-instructions.md)

3. **ESLint** (`dbaeumer.vscode-eslint`)
   - Real-time linting
   - Auto-fixes on save
   - Enforces code style

4. **Prettier** (`esbenp.prettier-vscode`)
   - Code formatter
   - Consistent style across project
   - Format on save enabled

### Highly Recommended (Quality)

5. **Error Lens** (`usernamehw.errorlens`)
   - Inline error messages
   - See errors without hovering
   - Improves debugging speed

6. **Code Spell Checker** (`streetsidesoftware.code-spell-checker`)
   - Catches typos in comments/strings
   - Supports technical terms
   - Reduces embarrassing bugs

7. **Vitest Explorer** (`vitest.explorer`)
   - Test runner UI
   - Click to run individual tests
   - Visual test results

### Nice to Have (Productivity)

8. **GitLens** (`eamodio.gitlens`)
   - Enhanced Git integration
   - Blame annotations
   - File history visualization

9. **Todo Tree** (`gruntfuggly.todo-tree`)
   - Finds TODO/FIXME comments
   - Organizes in sidebar
   - Quick navigation

10. **Better Comments** (`aaron-bond.better-comments`)
    - Color-coded comments
    - `// TODO:` = orange
    - `// !` = red alert
    - `// ?` = blue question

---

## ⚙️ Workspace Settings

The project includes pre-configured settings in `.vscode/settings.json`. Key features:

### TypeScript Optimization

```jsonc
{
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
}
```

### Auto-Formatting

```jsonc
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true,
  },
}
```

### Performance

```jsonc
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/coverage/**": true,
  },
}
```

---

## 🎯 Task Runner

Press `Ctrl+Shift+P` → `Tasks: Run Task` to access:

### Development Tasks

- **npm: dev** - Build + watch for changes
- **npm: build** - One-time build
- **npm: build:watch** - Auto-rebuild on save

### Testing Tasks

- **npm: test** - Run all tests once
- **npm: test:watch** - Auto-rerun on changes
- **npm: test:coverage** - Generate HTML coverage report

### Quality Tasks

- **npm: lint** - Check code style
- **npm: lint:fix** - Auto-fix style issues
- **npm: format** - Format with Prettier

### Custom Shortcuts

- **🚀 Quick Start** - `npm install && npm run build`
- **✅ Quality Gate** - Lint → Type Check → Test (sequential)
- **🔍 Pre-Commit Check** - Fix all + test
- **📊 Coverage Report** - Test coverage + open HTML

**Tip**: Assign keyboard shortcuts in `.vscode/keybindings.json`

---

## 🐛 Debugging

### Debug Current Test File

1. Open a `.test.ts` file
2. Set breakpoint (click left of line number)
3. Press `F5` or select "🐛 Debug Current Test"
4. Debugger stops at breakpoint

### Debug All Tests

1. Open any file
2. Press `F5`
3. Select "🧪 Debug All Tests"
4. Step through with F10/F11

### Debug Parser/Runtime

1. Select "🎯 Debug Parser" configuration
2. Press `F5`
3. Inspect variables in Debug sidebar

---

## ⌨️ Keyboard Shortcuts

### Default Shortcuts

| Action               | Shortcut       |
| -------------------- | -------------- |
| **Command Palette**  | `Ctrl+Shift+P` |
| **Quick Open**       | `Ctrl+P`       |
| **Toggle Terminal**  | ``Ctrl+` ``    |
| **Split Editor**     | `Ctrl+\`       |
| **Go to Definition** | `F12`          |
| **Find References**  | `Shift+F12`    |
| **Rename Symbol**    | `F2`           |
| **Format Document**  | `Shift+Alt+F`  |
| **Show Problems**    | `Ctrl+Shift+M` |

### Custom Shortcuts (Optional)

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask",
    "args": "npm: test"
  },
  {
    "key": "ctrl+shift+q",
    "command": "workbench.action.tasks.runTask",
    "args": "✅ Quality Gate"
  }
]
```

---

## 🎨 Editor Tips

### IntelliSense

- **Trigger**: `Ctrl+Space`
- **Parameter Hints**: `Ctrl+Shift+Space`
- **Quick Info**: Hover over symbol

### Refactoring

- **Extract Function**: Select code → Right-click → Refactor → Extract Function
- **Rename**: F2 on symbol name
- **Organize Imports**: `Alt+Shift+O`

### Multi-Cursor Editing

- **Add Cursor**: `Alt+Click`
- **Add Cursor Above/Below**: `Ctrl+Alt+Up/Down`
- **Select All Occurrences**: `Ctrl+Shift+L`

### Code Navigation

- **Go to File**: `Ctrl+P` → type filename
- **Go to Symbol**: `Ctrl+Shift+O` → type symbol
- **Go to Line**: `Ctrl+G` → type line number
- **Breadcrumbs**: Top of editor shows file structure

---

## 📊 Quality Monitoring

### Real-Time Feedback

With **Error Lens** installed:

- Errors appear inline (red)
- Warnings appear inline (yellow)
- No need to check Problems panel

### Coverage Gutters

With **Coverage Gutters** installed:

1. Run `npm run test:coverage`
2. Click "Watch" in status bar
3. Green = covered, Red = not covered
4. See coverage in editor gutter

### Test Explorer

With **Vitest Explorer**:

- Tests appear in sidebar
- Click to run individual test
- See pass/fail status
- Jump to test code

---

## 🔧 Troubleshooting

### Problem: TypeScript Errors Not Showing

**Solution**:

```
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Problem: ESLint Not Running

**Solution**:

```
Ctrl+Shift+P → "ESLint: Restart ESLint Server"
```

Check Output panel (View → Output → ESLint) for errors.

### Problem: Format on Save Not Working

**Check**:

1. `.vscode/settings.json` has `"editor.formatOnSave": true`
2. Prettier extension is installed and enabled
3. No conflicting formatters (disable others)

### Problem: Tests Not Running

**Solution**:

```bash
# Clear cache
npm run clean
rm -rf node_modules
npm install

# Restart Vitest
Ctrl+Shift+P → "Vitest: Restart Test Runner"
```

### Problem: Slow Performance

**Solutions**:

1. Increase TypeScript memory:
   ```json
   "typescript.tsserver.maxTsServerMemory": 8192
   ```
2. Close unused editor tabs
3. Disable unused extensions
4. Restart VS Code

---

## 🚀 Advanced Configuration

### Custom Code Snippets

Create `.vscode/pcl.code-snippets`:

```json
{
  "PCL Persona Declaration": {
    "prefix": "persona",
    "body": [
      "persona ${1:NAME} {",
      "  skills: [${2:skills}]",
      "  constraints: {",
      "    ${3:constraints}",
      "  }",
      "}"
    ],
    "description": "Create a PCL persona declaration"
  }
}
```

Usage: Type `persona` → Tab → fills template

### Multi-Root Workspace

For multiple PCL projects:

```json
{
  "folders": [
    { "path": "../pcl-lite" },
    { "path": "../pcl-examples" },
    { "path": "../pcl-stdlib" }
  ],
  "settings": {
    "editor.formatOnSave": true
  }
}
```

Save as `pcl-workspace.code-workspace`

### Tasks with Problem Matchers

Add to `.vscode/tasks.json`:

```json
{
  "label": "Build with Error Matching",
  "type": "shell",
  "command": "npm run build",
  "problemMatcher": {
    "owner": "typescript",
    "fileLocation": "relative",
    "pattern": {
      "regexp": "^(.*)\\((\\d+),(\\d+)\\):\\s+(error|warning)\\s+(TS\\d+):\\s+(.*)$",
      "file": 1,
      "line": 2,
      "column": 3,
      "severity": 4,
      "code": 5,
      "message": 6
    }
  }
}
```

Errors appear in Problems panel after build.

---

## 💡 Workflow Recommendations

### Morning Routine

1. `git pull` - Get latest changes
2. `npm install` - Update dependencies
3. `npm run build` - Verify build
4. `npm run test` - Check tests
5. Start `npm run dev` - Watch mode

### Coding Session

1. Open file in editor
2. Split editor (code + test side-by-side)
3. Use Copilot for suggestions
4. Save often (auto-format triggers)
5. Watch test output in terminal

### Before Commit

1. Run **🔍 Pre-Commit Check** task
2. Review git diff (GitLens)
3. Check coverage report
4. Stage changes (`Ctrl+Shift+G`)
5. Write descriptive commit message

### Code Review

1. Open PR branch locally
2. Use GitLens file history
3. Run **✅ Quality Gate** task
4. Check test coverage
5. Review inline comments

---

## 📚 Learning Resources

### VS Code

- [Official Docs](https://code.visualstudio.com/docs)
- [Keyboard Shortcuts PDF](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf)
- [Tips and Tricks](https://code.visualstudio.com/docs/getstarted/tips-and-tricks)

### TypeScript

- [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)

### Testing

- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### PCL-Specific

- [Copilot Instructions](../../.github/copilot-instructions.md)
- [Roadmap](../../.roadmap/ROADMAP.md)
- [Quick Status](../../.roadmap/QUICK-STATUS.md)

---

## 🎯 Next Steps

1. ✅ Install recommended extensions
2. ✅ Run quality gate to verify setup
3. ✅ Explore keyboard shortcuts
4. ✅ Read [copilot-instructions.md](../../.github/copilot-instructions.md)
5. ✅ Try `/persona` commands in Copilot Chat
6. ✅ Start contributing!

---

**Questions?** Open an issue or ask in Discussions!

**Happy Coding!** 🚀
