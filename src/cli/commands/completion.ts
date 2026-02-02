/**
 * Shell Completion Command
 * Generates shell completion scripts for bash, zsh, fish, and powershell
 */

/* eslint-disable no-useless-escape */

export interface CompletionOptions {
  shell?: 'bash' | 'zsh' | 'fish' | 'powershell';
  verbose?: boolean;
}

const BASH_COMPLETION = `# PCL bash completion
# Add to ~/.bashrc or ~/.bash_profile:
# source <(pcl completion --shell bash)

_pcl_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Main commands
  local commands="parse lex check fmt gen run repl init build install registry skill version help completion"

  # Registry subcommands
  local registry_cmds="init create search list info publish delete"

  # Skill subcommands
  local skill_cmds="import export validate list info"

  # Options
  local opts="-o --output -f --format -t --target -q --quiet -v --verbose --no-color --strict"
  local registry_opts="--backend --db --publish --force --purge --host --port --database --user --password"
  local skill_opts="--spec --recursive --format"
  local project_opts="--config --watch --save --save-dev --production"

  # If we're completing after 'registry', show registry subcommands
  if [[ \${COMP_WORDS[1]} == "registry" ]] && [[ \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( \$(compgen -W "\${registry_cmds}" -- \${cur}) )
    return 0
  fi

  # If we're completing after 'skill', show skill subcommands
  if [[ \${COMP_WORDS[1]} == "skill" ]] && [[ \${COMP_CWORD} -eq 2 ]]; then
    COMPREPLY=( \$(compgen -W "\${skill_cmds}" -- \${cur}) )
    return 0
  fi

  # If we're completing after 'completion', show shell types
  if [[ \${COMP_WORDS[1]} == "completion" ]] && [[ \${prev} == "--shell" ]]; then
    COMPREPLY=( \$(compgen -W "bash zsh fish powershell" -- \${cur}) )
    return 0
  fi

  # Complete file paths for commands that need files
  case "\${prev}" in
    parse|lex|check|fmt|gen|run)
      COMPREPLY=( \$(compgen -f -X '!*.pcl' -- \${cur}) )
      return 0
      ;;
    -o|--output|--db|--config)
      COMPREPLY=( \$(compgen -f -- \${cur}) )
      return 0
      ;;
    -f|--format)
      COMPREPLY=( \$(compgen -W "json yaml table pretty list agentskills claude-code pcl" -- \${cur}) )
      return 0
      ;;
    -t|--target)
      COMPREPLY=( \$(compgen -W "prompt typescript javascript json markdown yaml" -- \${cur}) )
      return 0
      ;;
    --backend)
      COMPREPLY=( \$(compgen -W "memory json-file sqlite postgres" -- \${cur}) )
      return 0
      ;;
    --spec)
      COMPREPLY=( \$(compgen -W "agentskills claude-code" -- \${cur}) )
      return 0
      ;;
  esac

  # If it starts with -, complete with options
  if [[ \${cur} == -* ]]; then
    case "\${COMP_WORDS[1]}" in
      registry)
        COMPREPLY=( \$(compgen -W "\${opts} \${registry_opts}" -- \${cur}) )
        ;;
      skill)
        COMPREPLY=( \$(compgen -W "\${opts} \${skill_opts}" -- \${cur}) )
        ;;
      build|install|init)
        COMPREPLY=( \$(compgen -W "\${opts} \${project_opts}" -- \${cur}) )
        ;;
      *)
        COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
        ;;
    esac
    return 0
  fi

  # If we're on the first word, complete with main commands
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( \$(compgen -W "\${commands}" -- \${cur}) )
    return 0
  fi

  # Default to file completion
  COMPREPLY=( \$(compgen -f -- \${cur}) )
  return 0
}

complete -F _pcl_completion pcl
`;

const ZSH_COMPLETION = `#compdef pcl
# PCL zsh completion
# Add to ~/.zshrc:
# source <(pcl completion --shell zsh)

_pcl() {
  local -a commands registry_cmds skill_cmds
  commands=(
    'parse:Parse a PCL file and show AST'
    'lex:Tokenize a PCL file'
    'check:Type check a PCL file'
    'fmt:Format a PCL file'
    'gen:Generate code from a PCL file'
    'run:Load and run a PCL file'
    'repl:Start interactive REPL'
    'init:Initialize a new PCL project'
    'build:Build PCL project'
    'install:Install dependencies'
    'registry:Registry management commands'
    'skill:Skill management commands'
    'completion:Generate shell completion script'
    'version:Show version information'
    'help:Show help message'
  )

  registry_cmds=(
    'init:Initialize a new registry database'
    'create:Create artifact from PCL file'
    'search:Search for artifacts'
    'list:List all artifacts'
    'info:Show artifact details'
    'publish:Publish an artifact'
    'delete:Delete an artifact'
  )

  skill_cmds=(
    'import:Import skill from SKILL.md format'
    'export:Export skill to SKILL.md format'
    'validate:Validate skill against specification'
    'list:List all discovered skills'
    'info:Show detailed skill information'
  )

  _arguments -C \\
    '1: :->command' \\
    '2: :->subcommand' \\
    '*:: :->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    subcommand)
      case $words[2] in
        registry)
          _describe 'registry subcommand' registry_cmds
          ;;
        skill)
          _describe 'skill subcommand' skill_cmds
          ;;
        parse|lex|check|fmt|gen|run)
          _files -g '*.pcl'
          ;;
      esac
      ;;
    args)
      case $words[2] in
        registry)
          case $words[3] in
            create)
              _files -g '*.pcl'
              ;;
          esac
          ;;
      esac
      ;;
  esac
}

_pcl "$@"
`;

const FISH_COMPLETION = `# PCL fish completion
# Add to ~/.config/fish/completions/pcl.fish

# Main commands
complete -c pcl -f -n "__fish_use_subcommand" -a "parse" -d "Parse a PCL file and show AST"
complete -c pcl -f -n "__fish_use_subcommand" -a "lex" -d "Tokenize a PCL file"
complete -c pcl -f -n "__fish_use_subcommand" -a "check" -d "Type check a PCL file"
complete -c pcl -f -n "__fish_use_subcommand" -a "fmt" -d "Format a PCL file"
complete -c pcl -f -n "__fish_use_subcommand" -a "gen" -d "Generate code from a PCL file"
complete -c pcl -f -n "__fish_use_subcommand" -a "run" -d "Load and run a PCL file"
complete -c pcl -f -n "__fish_use_subcommand" -a "repl" -d "Start interactive REPL"
complete -c pcl -f -n "__fish_use_subcommand" -a "init" -d "Initialize a new PCL project"
complete -c pcl -f -n "__fish_use_subcommand" -a "build" -d "Build PCL project"
complete -c pcl -f -n "__fish_use_subcommand" -a "install" -d "Install dependencies"
complete -c pcl -f -n "__fish_use_subcommand" -a "registry" -d "Registry management"
complete -c pcl -f -n "__fish_use_subcommand" -a "skill" -d "Skill management"
complete -c pcl -f -n "__fish_use_subcommand" -a "completion" -d "Generate shell completion"
complete -c pcl -f -n "__fish_use_subcommand" -a "version" -d "Show version"
complete -c pcl -f -n "__fish_use_subcommand" -a "help" -d "Show help"

# Registry subcommands
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "init" -d "Initialize registry"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "create" -d "Create artifact"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "search" -d "Search artifacts"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "list" -d "List artifacts"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "info" -d "Show details"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "publish" -d "Publish artifact"
complete -c pcl -f -n "__fish_seen_subcommand_from registry" -a "delete" -d "Delete artifact"

# Skill subcommands
complete -c pcl -f -n "__fish_seen_subcommand_from skill" -a "import" -d "Import skill"
complete -c pcl -f -n "__fish_seen_subcommand_from skill" -a "export" -d "Export skill"
complete -c pcl -f -n "__fish_seen_subcommand_from skill" -a "validate" -d "Validate skill"
complete -c pcl -f -n "__fish_seen_subcommand_from skill" -a "list" -d "List skills"
complete -c pcl -f -n "__fish_seen_subcommand_from skill" -a "info" -d "Show skill info"

# Global options
complete -c pcl -s o -l output -d "Output file" -r
complete -c pcl -s f -l format -d "Output format" -xa "json yaml table pretty list"
complete -c pcl -s t -l target -d "Generation target" -xa "prompt typescript javascript json markdown"
complete -c pcl -s q -l quiet -d "Suppress output"
complete -c pcl -s v -l verbose -d "Verbose output"
complete -c pcl -l no-color -d "Disable colors"
complete -c pcl -l strict -d "Strict type checking"

# Registry options
complete -c pcl -n "__fish_seen_subcommand_from registry" -l backend -xa "memory json-file sqlite postgres" -d "Backend type"
complete -c pcl -n "__fish_seen_subcommand_from registry" -l db -d "Database path" -r
complete -c pcl -n "__fish_seen_subcommand_from registry" -l publish -d "Publish after creation"
complete -c pcl -n "__fish_seen_subcommand_from registry" -l force -d "Force operation"
complete -c pcl -n "__fish_seen_subcommand_from registry" -l purge -d "Permanently delete"

# Skill options
complete -c pcl -n "__fish_seen_subcommand_from skill" -l spec -xa "agentskills claude-code" -d "Specification"
complete -c pcl -n "__fish_seen_subcommand_from skill" -l recursive -d "Process directories recursively"

# Project options
complete -c pcl -n "__fish_seen_subcommand_from init build install" -l config -d "Path to pcl.json" -r
complete -c pcl -n "__fish_seen_subcommand_from build" -l watch -d "Watch for changes"
complete -c pcl -n "__fish_seen_subcommand_from install" -l save -d "Save to dependencies"
complete -c pcl -n "__fish_seen_subcommand_from install" -l save-dev -d "Save to devDependencies"
complete -c pcl -n "__fish_seen_subcommand_from install" -l production -d "Skip devDependencies"

# Completion shell option
complete -c pcl -n "__fish_seen_subcommand_from completion" -l shell -xa "bash zsh fish powershell" -d "Shell type"

# File completions
complete -c pcl -n "__fish_seen_subcommand_from parse lex check fmt gen run" -xa "(__fish_complete_suffix .pcl)"
`;

const POWERSHELL_COMPLETION = `# PCL PowerShell completion
# Add to your PowerShell profile ($PROFILE):
# pcl completion --shell powershell | Out-String | Invoke-Expression

Register-ArgumentCompleter -Native -CommandName pcl -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(
        [PSCustomObject]@{ Name = 'parse'; Description = 'Parse a PCL file and show AST' }
        [PSCustomObject]@{ Name = 'lex'; Description = 'Tokenize a PCL file' }
        [PSCustomObject]@{ Name = 'check'; Description = 'Type check a PCL file' }
        [PSCustomObject]@{ Name = 'fmt'; Description = 'Format a PCL file' }
        [PSCustomObject]@{ Name = 'gen'; Description = 'Generate code from a PCL file' }
        [PSCustomObject]@{ Name = 'run'; Description = 'Load and run a PCL file' }
        [PSCustomObject]@{ Name = 'repl'; Description = 'Start interactive REPL' }
        [PSCustomObject]@{ Name = 'init'; Description = 'Initialize a new PCL project' }
        [PSCustomObject]@{ Name = 'build'; Description = 'Build PCL project' }
        [PSCustomObject]@{ Name = 'install'; Description = 'Install dependencies' }
        [PSCustomObject]@{ Name = 'registry'; Description = 'Registry management' }
        [PSCustomObject]@{ Name = 'skill'; Description = 'Skill management' }
        [PSCustomObject]@{ Name = 'completion'; Description = 'Generate shell completion' }
        [PSCustomObject]@{ Name = 'version'; Description = 'Show version' }
        [PSCustomObject]@{ Name = 'help'; Description = 'Show help' }
    )

    $registryCommands = @(
        [PSCustomObject]@{ Name = 'init'; Description = 'Initialize registry' }
        [PSCustomObject]@{ Name = 'create'; Description = 'Create artifact' }
        [PSCustomObject]@{ Name = 'search'; Description = 'Search artifacts' }
        [PSCustomObject]@{ Name = 'list'; Description = 'List artifacts' }
        [PSCustomObject]@{ Name = 'info'; Description = 'Show details' }
        [PSCustomObject]@{ Name = 'publish'; Description = 'Publish artifact' }
        [PSCustomObject]@{ Name = 'delete'; Description = 'Delete artifact' }
    )

    $skillCommands = @(
        [PSCustomObject]@{ Name = 'import'; Description = 'Import skill' }
        [PSCustomObject]@{ Name = 'export'; Description = 'Export skill' }
        [PSCustomObject]@{ Name = 'validate'; Description = 'Validate skill' }
        [PSCustomObject]@{ Name = 'list'; Description = 'List skills' }
        [PSCustomObject]@{ Name = 'info'; Description = 'Show skill info' }
    )

    $tokens = $commandAst.ToString() -split '\s+'

    # Complete main command
    if ($tokens.Count -eq 2) {
        $commands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.Description
            )
        }
        return
    }

    # Complete registry subcommands
    if ($tokens[1] -eq 'registry' -and $tokens.Count -eq 3) {
        $registryCommands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.Description
            )
        }
        return
    }

    # Complete skill subcommands
    if ($tokens[1] -eq 'skill' -and $tokens.Count -eq 3) {
        $skillCommands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.Description
            )
        }
        return
    }

    # Complete options
    if ($wordToComplete -match '^-') {
        $options = @(
            '-o', '--output', '-f', '--format', '-t', '--target',
            '-q', '--quiet', '-v', '--verbose', '--no-color', '--strict',
            '--backend', '--db', '--publish', '--force', '--purge',
            '--spec', '--recursive', '--config', '--watch', '--save', '--save-dev'
        )

        $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_)
        }
        return
    }

    # Complete files with .pcl extension for file commands
    if ($tokens[1] -in @('parse', 'lex', 'check', 'fmt', 'gen', 'run')) {
        Get-ChildItem -Path "$wordToComplete*" -Include *.pcl | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.FullName
            )
        }
    }
}
`;

/**
 * Generate shell completion script
 */
export async function completionCommand(
  options: CompletionOptions
): Promise<void> {
  const shell = options.shell || detectShell();

  if (!shell) {
    console.error(
      'Error: Could not detect shell. Please specify with --shell <bash|zsh|fish|powershell>'
    );
    process.exit(1);
  }

  let script: string;
  switch (shell) {
    case 'bash':
      script = BASH_COMPLETION;
      break;
    case 'zsh':
      script = ZSH_COMPLETION;
      break;
    case 'fish':
      script = FISH_COMPLETION;
      break;
    case 'powershell':
      script = POWERSHELL_COMPLETION;
      break;
    default:
      console.error(`Error: Unsupported shell: ${shell}`);
      process.exit(1);
  }

  console.log(script);

  if (options.verbose) {
    console.error(`\nGenerated ${shell} completion script.`);
    console.error(`\nTo enable completions:`);
    switch (shell) {
      case 'bash':
        console.error('  Add to ~/.bashrc or ~/.bash_profile:');
        console.error('  source <(pcl completion --shell bash)');
        break;
      case 'zsh':
        console.error('  Add to ~/.zshrc:');
        console.error('  source <(pcl completion --shell zsh)');
        break;
      case 'fish':
        console.error('  Save to ~/.config/fish/completions/pcl.fish:');
        console.error(
          '  pcl completion --shell fish > ~/.config/fish/completions/pcl.fish'
        );
        break;
      case 'powershell':
        console.error('  Add to your PowerShell profile ($PROFILE):');
        console.error(
          '  pcl completion --shell powershell | Out-String | Invoke-Expression'
        );
        break;
    }
  }
}

/**
 * Detect the current shell from environment
 */
function detectShell(): 'bash' | 'zsh' | 'fish' | 'powershell' | null {
  const shell = process.env.SHELL || '';

  if (shell.includes('bash')) return 'bash';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('fish')) return 'fish';
  if (process.platform === 'win32' || process.env.PSModulePath)
    return 'powershell';

  return null;
}
