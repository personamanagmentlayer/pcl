/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL CLI - Shell Completion Tests
 * Comprehensive tests for shell completion generation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { completionCommand } from '../../../src/cli/commands/completion';

describe('Shell Completion Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let originalShell: string | undefined;
  let originalPlatform: string;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: any) => {
        throw new Error(`process.exit: ${code}`);
      });

    originalShell = process.env.SHELL;
    originalPlatform = process.platform;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.env.SHELL = originalShell;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Bash Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('Bash Completion', () => {
    test('generates bash completion script', async () => {
      await completionCommand({ shell: 'bash' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('bash completion');
      expect(output).toContain('_pcl_completion');
      expect(output).toContain('complete -F _pcl_completion pcl');
    });

    test('includes main commands in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('parse');
      expect(output).toContain('lex');
      expect(output).toContain('check');
      expect(output).toContain('fmt');
      expect(output).toContain('gen');
      expect(output).toContain('run');
      expect(output).toContain('repl');
      expect(output).toContain('registry');
      expect(output).toContain('skill');
      expect(output).toContain('completion');
    });

    test('includes registry subcommands in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('registry_cmds');
      expect(output).toContain('init');
      expect(output).toContain('create');
      expect(output).toContain('search');
      expect(output).toContain('publish');
      expect(output).toContain('delete');
    });

    test('includes skill subcommands in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('skill_cmds');
      expect(output).toContain('import');
      expect(output).toContain('export');
      expect(output).toContain('validate');
    });

    test('includes common options in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('--output');
      expect(output).toContain('--format');
      expect(output).toContain('--target');
      expect(output).toContain('--quiet');
      expect(output).toContain('--verbose');
      expect(output).toContain('--no-color');
    });

    test('includes file completion for PCL files in bash', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('*.pcl');
      expect(output).toContain('compgen -f');
    });

    test('includes format options in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('json');
      expect(output).toContain('yaml');
      expect(output).toContain('table');
      expect(output).toContain('pretty');
    });

    test('includes target options in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('prompt');
      expect(output).toContain('typescript');
      expect(output).toContain('javascript');
      expect(output).toContain('markdown');
    });

    test('includes backend options in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('memory');
      expect(output).toContain('json-file');
      expect(output).toContain('sqlite');
      expect(output).toContain('postgres');
    });

    test('includes installation instructions in bash script', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('~/.bashrc');
      expect(output).toContain('source <(pcl completion');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Zsh Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('Zsh Completion', () => {
    test('generates zsh completion script', async () => {
      await completionCommand({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('#compdef pcl');
      expect(output).toContain('zsh completion');
      expect(output).toContain('_pcl');
    });

    test('includes command descriptions in zsh script', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('Parse a PCL file and show AST');
      expect(output).toContain('Tokenize a PCL file');
      expect(output).toContain('Type check a PCL file');
      expect(output).toContain('Format a PCL file');
    });

    test('includes registry subcommands with descriptions in zsh', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('registry_cmds');
      expect(output).toContain('Initialize a new registry database');
      expect(output).toContain('Create artifact from PCL file');
      expect(output).toContain('Search for artifacts');
    });

    test('includes skill subcommands in zsh script', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('skill_cmds');
      expect(output).toContain('Import skill from SKILL.md format');
      expect(output).toContain('Validate skill against specification');
    });

    test('uses _arguments for command parsing in zsh', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('_arguments');
      expect(output).toContain('_describe');
      expect(output).toContain('_files');
    });

    test('includes file completion for PCL files in zsh', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('_files -g');
      expect(output).toContain('*.pcl');
    });

    test('includes installation instructions in zsh script', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('~/.zshrc');
      expect(output).toContain('source <(pcl completion');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fish Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('Fish Completion', () => {
    test('generates fish completion script', async () => {
      await completionCommand({ shell: 'fish' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('fish completion');
      expect(output).toContain('complete -c pcl');
    });

    test('includes main commands with descriptions in fish', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('-a "parse"');
      expect(output).toContain('-d "Parse a PCL file and show AST"');
      expect(output).toContain('-a "lex"');
      expect(output).toContain('-d "Tokenize a PCL file"');
    });

    test('includes registry subcommands in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('__fish_seen_subcommand_from registry');
      expect(output).toContain('-a "init"');
      expect(output).toContain('-a "create"');
      expect(output).toContain('-a "search"');
    });

    test('includes skill subcommands in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('__fish_seen_subcommand_from skill');
      expect(output).toContain('-a "import"');
      expect(output).toContain('-a "export"');
      expect(output).toContain('-a "validate"');
    });

    test('includes global options in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('-s o');
      expect(output).toContain('-l output');
      expect(output).toContain('-s f');
      expect(output).toContain('-l format');
      expect(output).toContain('-s v');
      expect(output).toContain('-l verbose');
    });

    test('includes format options in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('-xa "json yaml table pretty list"');
    });

    test('includes backend options in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('-xa "memory json-file sqlite postgres"');
    });

    test('includes file completion for PCL files in fish', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('__fish_complete_suffix .pcl');
    });

    test('includes installation instructions in fish script', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('~/.config/fish/completions/pcl.fish');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PowerShell Completion
  // ───────────────────────────────────────────────────────────────────────────

  describe('PowerShell Completion', () => {
    test('generates powershell completion script', async () => {
      await completionCommand({ shell: 'powershell' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('PowerShell completion');
      expect(output).toContain('Register-ArgumentCompleter');
      expect(output).toContain('-CommandName pcl');
    });

    test('includes main commands with descriptions in powershell', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain("Name = 'parse'");
      expect(output).toContain("Description = 'Parse a PCL file and show AST'");
      expect(output).toContain("Name = 'lex'");
      expect(output).toContain("Description = 'Tokenize a PCL file'");
    });

    test('includes registry subcommands in powershell script', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('$registryCommands');
      expect(output).toContain("Name = 'init'");
      expect(output).toContain("Description = 'Initialize registry'");
    });

    test('includes skill subcommands in powershell script', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('$skillCommands');
      expect(output).toContain("Name = 'import'");
      expect(output).toContain("Name = 'export'");
    });

    test('includes options array in powershell script', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain("'-o'");
      expect(output).toContain("'--output'");
      expect(output).toContain("'--format'");
      expect(output).toContain("'--verbose'");
    });

    test('includes file completion in powershell script', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('Get-ChildItem');
      expect(output).toContain('*.pcl');
    });

    test('uses PSCustomObject for command definitions', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('[PSCustomObject]@{');
      expect(output).toContain('Name =');
      expect(output).toContain('Description =');
    });

    test('includes installation instructions in powershell script', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      expect(output).toContain('$PROFILE');
      expect(output).toContain('Out-String');
      expect(output).toContain('Invoke-Expression');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Shell Detection
  // ───────────────────────────────────────────────────────────────────────────

  describe('Shell Detection', () => {
    test('detects bash from SHELL environment variable', async () => {
      process.env.SHELL = '/bin/bash';

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('bash completion');
    });

    test('detects zsh from SHELL environment variable', async () => {
      process.env.SHELL = '/usr/bin/zsh';

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('zsh completion');
    });

    test('detects fish from SHELL environment variable', async () => {
      process.env.SHELL = '/usr/local/bin/fish';

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('fish completion');
    });

    test('detects powershell on Windows platform', async () => {
      delete process.env.SHELL;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('PowerShell completion');
    });

    test('detects powershell from PSModulePath', async () => {
      process.env.SHELL = '';
      process.env.PSModulePath = '/some/path';
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('PowerShell completion');
    });

    test('errors when shell cannot be detected', async () => {
      delete process.env.SHELL;
      delete process.env.PSModulePath;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      await expect(completionCommand({})).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not detect shell')
      );
    });

    test('prefers explicit shell option over detection', async () => {
      process.env.SHELL = '/bin/bash';

      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('fish completion');
      expect(output).not.toContain('bash completion');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Verbose Mode
  // ───────────────────────────────────────────────────────────────────────────

  describe('Verbose Mode', () => {
    test('shows installation instructions in verbose mode for bash', async () => {
      await completionCommand({ shell: 'bash', verbose: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated bash completion script')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('To enable completions:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.bashrc')
      );
    });

    test('shows installation instructions in verbose mode for zsh', async () => {
      await completionCommand({ shell: 'zsh', verbose: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated zsh completion script')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.zshrc')
      );
    });

    test('shows installation instructions in verbose mode for fish', async () => {
      await completionCommand({ shell: 'fish', verbose: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated fish completion script')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('~/.config/fish/completions/pcl.fish')
      );
    });

    test('shows installation instructions in verbose mode for powershell', async () => {
      await completionCommand({ shell: 'powershell', verbose: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated powershell completion script')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('$PROFILE')
      );
    });

    test('does not show instructions in non-verbose mode', async () => {
      await completionCommand({ shell: 'bash', verbose: false });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('does not show instructions when verbose is undefined', async () => {
      await completionCommand({ shell: 'bash' });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    test('exits with code 1 when shell not detected', async () => {
      delete process.env.SHELL;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      await expect(completionCommand({})).rejects.toThrow('process.exit: 1');

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    test('shows error message for unsupported shell', async () => {
      await expect(
        completionCommand({ shell: 'unsupported' as any })
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported shell: unsupported')
      );
    });

    test('handles invalid shell option gracefully', async () => {
      // Empty string goes through detectShell which returns null
      delete process.env.SHELL;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      await expect(completionCommand({ shell: '' as any })).rejects.toThrow(
        'process.exit: 1'
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Output Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Output Validation', () => {
    test('bash script is valid shell syntax', async () => {
      await completionCommand({ shell: 'bash' });

      const output = consoleLogSpy.mock.calls[0][0];

      // Check for proper function definition
      expect(output).toMatch(/_pcl_completion\(\) \{/);
      // Check for proper completion registration
      expect(output).toMatch(/complete -F _pcl_completion pcl/);
      // Check for proper case statement
      expect(output).toContain('case');
      expect(output).toContain('esac');
    });

    test('zsh script uses correct syntax', async () => {
      await completionCommand({ shell: 'zsh' });

      const output = consoleLogSpy.mock.calls[0][0];

      // Check for compdef
      expect(output).toMatch(/#compdef pcl/);
      // Check for proper function definition
      expect(output).toMatch(/_pcl\(\) \{/);
      // Check for _arguments usage
      expect(output).toContain('_arguments');
    });

    test('fish script uses complete syntax correctly', async () => {
      await completionCommand({ shell: 'fish' });

      const output = consoleLogSpy.mock.calls[0][0];

      // All lines should start with # or complete
      const lines = output.split('\n').filter((l: string) => l.trim());
      const validLines = lines.every(
        (line: string) => line.startsWith('#') || line.startsWith('complete ')
      );
      expect(validLines).toBe(true);
    });

    test('powershell script uses valid syntax', async () => {
      await completionCommand({ shell: 'powershell' });

      const output = consoleLogSpy.mock.calls[0][0];

      // Check for Register-ArgumentCompleter
      expect(output).toContain('Register-ArgumentCompleter');
      // Check for PSCustomObject
      expect(output).toContain('[PSCustomObject]@{');
      // Check for proper param block
      expect(output).toContain('param(');
    });

    test('all scripts contain pcl command name', async () => {
      const shells: Array<'bash' | 'zsh' | 'fish' | 'powershell'> = [
        'bash',
        'zsh',
        'fish',
        'powershell',
      ];

      for (const shell of shells) {
        consoleLogSpy.mockClear();
        await completionCommand({ shell });

        const output = consoleLogSpy.mock.calls[0][0];
        expect(output).toContain('pcl');
      }
    });

    test('scripts do not contain placeholder values', async () => {
      const shells: Array<'bash' | 'zsh' | 'fish' | 'powershell'> = [
        'bash',
        'zsh',
        'fish',
        'powershell',
      ];

      for (const shell of shells) {
        consoleLogSpy.mockClear();
        await completionCommand({ shell });

        const output = consoleLogSpy.mock.calls[0][0];
        expect(output).not.toContain('TODO');
        expect(output).not.toContain('FIXME');
        expect(output).not.toContain('XXX');
      }
    });

    test('all scripts are non-empty', async () => {
      const shells: Array<'bash' | 'zsh' | 'fish' | 'powershell'> = [
        'bash',
        'zsh',
        'fish',
        'powershell',
      ];

      for (const shell of shells) {
        consoleLogSpy.mockClear();
        await completionCommand({ shell });

        const output = consoleLogSpy.mock.calls[0][0];
        expect(output.length).toBeGreaterThan(100);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    test('handles empty options object', async () => {
      process.env.SHELL = '/bin/bash';

      await completionCommand({});

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test('handles SHELL variable with extra path components', async () => {
      process.env.SHELL = '/usr/local/bin/zsh';

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('zsh completion');
    });

    test('handles Windows-style paths in SHELL variable', async () => {
      process.env.SHELL = 'C:\\Program Files\\Git\\bin\\bash.exe';

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('bash completion');
    });

    test('shell option is case-sensitive', async () => {
      await expect(
        completionCommand({ shell: 'BASH' as any })
      ).rejects.toThrow();
    });

    test('handles very long SHELL paths', async () => {
      process.env.SHELL = '/very/long/path/to/shell/bin/fish'.repeat(10);

      await completionCommand({});

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('fish completion');
    });
  });
});
