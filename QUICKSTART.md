# 🚀 Quick Start Guide

**Get started with PCL (Persona Control Language) in 5 minutes!**

This guide will walk you through installing PCL, writing your first persona, and running it through the compiler.

---

## Prerequisites

Make sure you have:

- **Node.js 20.0.0 or higher** ([download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **A code editor** (VS Code recommended)

Check your versions:

```bash
node --version  # Should be v20.0.0 or higher
npm --version   # Should be 10.0.0 or higher
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/personamanagmentlayer/pcl-lite.git
cd pcl-lite
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs:

- TypeScript compiler
- Vitest test runner
- ESLint and Prettier for code quality
- Build tools (tsup, tsx)

---

## Step 3: Build the PCL Compiler

```bash
npm run build
```

This compiles the TypeScript source code to JavaScript in the `dist/` folder.

**Verify the build**:

```bash
node dist/cli/index.js --version
```

You should see version information (or a successful execution).

---

## Step 4: Write Your First PCL Program

Create a new file called `hello-persona.pcl`:

```pcl
// Define a helpful assistant persona
persona HELPER {
  intent: "Provide helpful and friendly assistance"

  tone: friendly

  skills {
    "Active listening"
    "Clear communication"
    "Problem solving"
  }

  constraints {
    "Be concise and respectful"
    "Ask clarifying questions"
  }
}

// Export for use in other files
export HELPER
```

---

## Step 5: Parse Your PCL Program

**Run the parser** to see the Abstract Syntax Tree (AST):

```bash
npm run parse hello-persona.pcl
```

or using the CLI directly:

```bash
node dist/cli/index.js parse hello-persona.pcl
```

**Expected output**:

- Pretty-printed AST showing PersonaDeclaration, skills, constraints, etc.
- No parse errors ✅

---

## Step 6: Type-Check Your Program

**Run the semantic analyzer** to validate types and catch errors:

```bash
npm run check hello-persona.pcl
```

or:

```bash
node dist/cli/index.js check hello-persona.pcl
```

**Expected output**:

- "✅ No semantic errors" (if everything is correct)
- Error messages with line/column numbers (if there are issues)

---

## Step 7: Try the REPL

**Launch the interactive REPL** to experiment with PCL expressions:

```bash
npm run repl
```

or:

```bash
node dist/cli/index.js repl
```

**Try these commands**:

```
pcl> let name = "Alice"
pcl> let age = 30
pcl> name
"Alice"
pcl> age + 10
40
```

Type `.exit` or press `Ctrl+C` twice to quit.

---

## Step 8: Run the Test Suite

**Run all tests** to verify your installation:

```bash
npm test
```

You should see:

- ✅ SymbolTable tests (8 passing)
- ✅ TypeChecker tests (13 passing)
- ✅ SemanticAnalyzer tests (33/35 passing - expected)
- ✅ Runtime tests (30/33 passing - expected)

**Run tests in watch mode** (auto-rerun on file changes):

```bash
npm run test:watch
```

**Generate coverage report**:

```bash
npm run test:coverage
```

Coverage report will be in `coverage/index.html`.

---

## Step 9: Explore Example Personas

Check out `examples/showcase.pcl` for more complex examples:

```bash
cat examples/showcase.pcl
```

or

```powershell
Get-Content examples/showcase.pcl
```

**Parse the showcase**:

```bash
npm run parse examples/showcase.pcl
```

---

## Step 10: Set Up Your Development Environment

### VS Code Users

**Install recommended extensions**:

1. Open VS Code in the `pcl-lite` folder
2. Look for the "Install Workspace Recommended Extensions" notification
3. Click "Install All" (30+ extensions including Copilot, ESLint, Prettier)

**Configure GitHub Copilot**:

- Copilot will automatically read [.github/copilot-instructions.md](.github/copilot-instructions.md)
- This provides 500+ lines of PCL-specific guidance for AI pair programming

**Debugging**:

- Press `F5` to launch the debugger
- Choose from 6 preconfigured debug profiles:
  - Debug PCL CLI
  - Debug Current TypeScript File
  - Debug Vitest Tests
  - Debug Parser
  - Attach to Node Process

---

## Common Commands

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run build`         | Compile TypeScript to JavaScript     |
| `npm run build:watch`   | Compile in watch mode (auto-rebuild) |
| `npm test`              | Run all tests                        |
| `npm run test:watch`    | Run tests in watch mode              |
| `npm run test:coverage` | Generate coverage report             |
| `npm run typecheck`     | Check types without emitting files   |
| `npm run lint`          | Lint source code with ESLint         |
| `npm run lint:fix`      | Auto-fix linting issues              |
| `npm run format`        | Format code with Prettier            |
| `npm run format:check`  | Check if code is formatted           |
| `npm run clean`         | Remove build artifacts               |
| `npm run parse <file>`  | Parse a PCL file                     |
| `npm run check <file>`  | Type-check a PCL file                |
| `npm run repl`          | Launch interactive REPL              |

---

## Project Structure

```
pcl-lite/
├── src/                    # TypeScript source code
│   ├── lexer/             # Tokenizer
│   ├── parser/            # Syntax parser
│   ├── semantic/          # Type checker and semantic analyzer
│   ├── ast/               # AST node definitions
│   ├── types/             # Type system
│   ├── runtime/           # Execution engine
│   ├── codegen/           # Code generator (planned)
│   ├── stdlib/            # Built-in personas and utilities
│   └── cli/               # Command-line interface
├── tests/                 # Test suite
│   ├── semantic.test.ts   # Semantic analyzer tests
│   ├── runtime.test.ts    # Runtime tests
│   └── integration.test.ts # Integration tests
├── examples/              # Example PCL programs
├── .github/               # GitHub Actions workflows
│   └── copilot-instructions.md  # Copilot guidance
├── .vscode/               # VS Code configuration
├── dist/                  # Compiled JavaScript (after build)
├── package.json           # npm package configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test configuration
└── QUICKSTART.md          # This file!
```

---

## Learning Resources

### 📚 Documentation

- [README.md](README.md) - Project overview and features
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [GitHub Copilot Instructions](.github/copilot-instructions.md) - Coding standards and patterns
- [PCL Bootstrap Specification](.roadmap/bootstrap/BOOTSTRAP_EN.md) - Persona system deep dive

### 🔧 Language Reference

- **Grammar**: `src/grammar/pcl.ebnf` - EBNF grammar specification
- **AST**: `src/ast/index.ts` - AST node definitions
- **Type System**: `src/types/index.ts` - Type definitions
- **Semantic Rules**: `src/semantic/index.ts` - Type checking logic

### 🧪 Testing

- **Test Examples**: Browse `tests/*.test.ts` for usage examples
- **Coverage**: Run `npm run test:coverage` and open `coverage/index.html`

---

## Troubleshooting

### Build Fails with TypeScript Errors

```bash
npm run typecheck
```

Check the error messages for type issues.

### Tests Fail

**Known issues** (expected failures):

- 2/35 semantic tests: Duplicate declaration detection
- 3/33 runtime tests: Team messaging edge cases
- 12/17 integration tests: Under development

If you see additional failures, try:

```bash
npm run clean
npm install
npm run build
npm test
```

### CLI Not Working

Make sure you've built the project:

```bash
npm run build
node dist/cli/index.js --version
```

### Import Errors in VS Code

Reload the TypeScript server:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "TypeScript: Restart TS Server"
3. Press Enter

---

## Next Steps

### Learn More

- **[Syntax Reference](./docs/reference/SYNTAX.md)** - Complete syntax guide with examples
- **[Getting Started Guide](./docs/guides/GETTING-STARTED.md)** - Detailed tutorials
- **[Examples](./docs/examples/)** - Real-world PCL examples
- **[Formal Grammar](./src/grammar/pcl.ebnf)** - EBNF specification

### Write More Complex Personas

```pcl
// Team composition
team SECURITY_REVIEW {
  members: [SEC, AUDIT, ARCHI]
  primary: SEC
  merge: consensus
}

// Workflow orchestration
workflow SECURE_CODE_REVIEW {
  input: code: String
  output: report: String

  steps {
    step analyze {
      persona: SEC
      action: "Analyze code for vulnerabilities"
    }

    step audit {
      persona: AUDIT
      action: "Check compliance"
    }

    step recommend {
      persona: ARCHI
      action: "Suggest improvements"
    }
  }
}
```

### Contribute to PCL

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** and add tests
4. **Run tests**: `npm test`
5. **Lint and format**: `npm run lint:fix && npm run format`
6. **Commit with conventional commits**: `git commit -m "feat: add new feature"`
7. **Push and create a Pull Request**

Read [GitHub Copilot Instructions](.github/copilot-instructions.md) for coding standards.

### Report Issues

Found a bug? Have a feature request?

**Open an issue**: https://github.com/personamanagmentlayer/pcl-lite/issues

Please include:

- PCL version (`npm list @pcl/sdk`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior

---

## Community & Support

- **GitHub**: https://github.com/personamanagmentlayer/pcl-lite
- **Issues**: https://github.com/personamanagmentlayer/pcl-lite/issues
- **Discussions**: https://github.com/personamanagmentlayer/pcl-lite/discussions

---

## License

PCL is licensed under **Apache-2.0**. See [LICENSE](LICENSE) for details.

---

**🎉 Congratulations!** You're now ready to start building with PCL!

Happy coding! 🚀
