# PCL Language Support for VSCode

This extension provides language support for Persona Configuration Language (PCL) files.

## Features

- **Syntax Highlighting** - Full TextMate grammar for PCL syntax
- **IntelliSense** - Smart completions for keywords, properties, and symbols
- **Hover Information** - Documentation and type information on hover
- **Go to Definition** - Navigate to symbol definitions (Ctrl+Click)
- **Find All References** - Find all usages of a symbol
- **Document Outline** - Symbol tree in the outline view
- **Code Formatting** - Auto-format PCL code
- **Diagnostics** - Real-time error detection and reporting

## Installation

### From VSIX Package

1. Build the extension:
   ```bash
   cd vscode-pcl
   npm install
   npm run compile
   npm run package
   ```

2. Install in VSCode:
   - Open VSCode
   - Press `Ctrl+Shift+P`
   - Run "Extensions: Install from VSIX..."
   - Select `vscode-pcl-1.0.0.vsix`

### From Source (Development)

1. Clone the repository
2. Build the language server:
   ```bash
   npm install
   npm run build
   ```

3. Build the extension:
   ```bash
   cd vscode-pcl
   npm install
   npm run compile
   ```

4. Press F5 to launch Extension Development Host

## Configuration

Configure the extension in VSCode settings (`Ctrl+,`):

```json
{
  "pcl.trace.server": "off",           // Trace LSP communication: "off" | "messages" | "verbose"
  "pcl.maxCachedDocuments": 100,       // Maximum documents to cache
  "pcl.diagnosticsDebounce": 300       // Debounce time (ms) for diagnostics
}
```

## Language Features

### Syntax Highlighting

The extension provides comprehensive syntax highlighting for:
- Keywords: `persona`, `team`, `workflow`, `skill`, `if`, `then`, `else`, etc.
- Types: `String`, `Int`, `Float`, `Bool`, `Array`, `Map`, `Persona`, `Team`, etc.
- Operators: `->`, `||`, `|`, `=>`, `==`, `!=`, etc.
- Comments: `//` line comments and `/* */` block comments
- Strings: Double-quoted and triple-quoted strings

### IntelliSense

Smart completions include:
- **Keywords** - All PCL keywords with documentation
- **Code Snippets** - Templates for persona, team, workflow, skill declarations
- **Properties** - Context-aware property suggestions
- **Symbols** - Defined personas, teams, workflows, and skills
- **Values** - Model names, thinking styles, response formats, etc.

### Hover Information

Hover over any symbol to see:
- **Keywords** - Category and detailed documentation
- **Properties** - Type, description, and examples
- **Symbols** - Type, version, visibility, and documentation

### Go to Definition

Navigate to symbol definitions:
- Click any persona/team/workflow/skill reference while holding Ctrl
- Jump directly to the declaration

### Find All References

Find all usages of a symbol:
- Right-click on any symbol → "Find All References"
- See all locations where the symbol is used

### Document Outline

View document structure:
- Open the Outline view (Ctrl+Shift+O)
- See all personas, teams, workflows, and skills
- Click to navigate

### Code Formatting

Format PCL code:
- Press `Shift+Alt+F` to format the entire document
- Automatically indents blocks and aligns properties

### Diagnostics

Real-time error detection:
- Syntax errors highlighted in red
- Semantic errors (undefined symbols, type mismatches)
- Warnings for best practices

## Example PCL Code

```pcl
// Define a coding assistant persona
persona DEVELOPER {
  name: "Code Assistant"
  version: "1.0.0"

  metadata: {
    category: "development"
    description: "Expert software developer"
    tags: ["coding", "debugging", "review"]
  }

  config: {
    model: "claude-sonnet-4"
    temperature: 0.7
    thinking_style: "analytical"
  }

  prompts: {
    system: """
    You are an expert software developer.
    You write clean, efficient, and well-documented code.
    """
  }
}

// Define a code review team
team CODE_REVIEW {
  members: [DEVELOPER, REVIEWER, TESTER]
  primary: REVIEWER
  merge: Consensus
  quorum: 2/3
}

// Define a development workflow
workflow DEVELOPMENT {
  steps: DEVELOPER -> REVIEWER || TESTER -> LEAD
  timeout: "30m"
  retry: {
    count: 3
    delay: "5s"
    backoff: exponential
  }
}
```

## Requirements

- VSCode 1.75.0 or higher
- Node.js 18.0 or higher

## Known Issues

- Workspace symbols (global symbol search) is simplified
- Code actions (quick fixes) are not yet implemented
- Rename refactoring is not yet implemented

## Release Notes

### 1.0.0

Initial release:
- Full syntax highlighting
- IntelliSense with keyword, snippet, and symbol completions
- Hover information for keywords, properties, and symbols
- Go to definition
- Find all references
- Document outline
- Code formatting
- Real-time diagnostics

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/personalayer/pcl) for contribution guidelines.

## License

MIT License - see LICENSE file for details
