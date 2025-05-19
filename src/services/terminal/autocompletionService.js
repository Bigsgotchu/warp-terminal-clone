/**
 * Terminal Autocompletion Service
 * 
 * Provides intelligent autocompletion for terminal commands including:
 * - File/directory path completions
 * - Command flag completions
 * - Git branch completions
 * - Package name completions
 * - Command history-based completions
 */

// Import Node.js modules for filesystem operations if in Electron environment
let fs;
let path;
let util;
let childProcess;

// Check if we're in Node.js/Electron environment
if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
  // Electron renderer process
  fs = window.require('fs');
  path = window.require('path');
  util = window.require('util');
  childProcess = window.require('child_process');
} else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Node.js environment
  fs = require('fs');
  path = require('path');
  util = require('util');
  childProcess = require('child_process');
}

// Promisify exec for async/await usage
const execAsync = childProcess ? util.promisify(childProcess.exec) : null;

/**
 * Common command flags and their descriptions
 */
const COMMON_FLAGS = {
  ls: {
    '-a': 'Show all files (including hidden)',
    '-l': 'Use long listing format',
    '-h': 'Human-readable file sizes',
    '--help': 'Display help information',
    '-R': 'List subdirectories recursively',
    '-S': 'Sort by file size',
    '-t': 'Sort by modification time',
    '-r': 'Reverse order while sorting',
    '-1': 'List one file per line'
  },
  git: {
    'add': 'Add files to staging area',
    'commit': 'Commit staged changes',
    'push': 'Push commits to remote',
    'pull': 'Pull changes from remote',
    'checkout': 'Switch branches',
    'branch': 'List or create branches',
    'status': 'Show working tree status',
    'log': 'Show commit logs',
    'fetch': 'Download objects and refs from remote',
    'merge': 'Join two or more development histories',
    'rebase': 'Reapply commits on top of another base',
    'reset': 'Reset current HEAD to specified state',
    'stash': 'Stash changes in working directory',
    'tag': 'Create, list, delete, or verify tags',
    'clone': 'Clone a repository into a new directory',
    'diff': 'Show changes between commits, commit and working tree, etc',
    'remote': 'Manage remote repositories',
    'config': 'Get and set repository or global options'
  },
  npm: {
    'install': 'Install a package',
    'i': 'Shorthand for install',
    'uninstall': 'Remove a package',
    'remove': 'Remove a package',
    'run': 'Run a script defined in package.json',
    'start': 'Start a package',
    'test': 'Test a package',
    'publish': 'Publish a package',
    'update': 'Update packages',
    'list': 'List installed packages',
    'search': 'Search for packages',
    'init': 'Create a package.json file',
    'audit': 'Run a security audit',
    'help': 'Get help on npm',
    '--global': 'Install packages globally'
  },
  yarn: {
    'add': 'Install a package',
    'remove': 'Remove a package',
    'install': 'Install all dependencies',
    'run': 'Run a script defined in package.json',
    'start': 'Start a package',
    'test': 'Test a package',
    'build': 'Build a package',
    'info': 'Show information about a package',
    'list': 'List installed packages',
    'global': 'Install packages globally',
    'upgrade': 'Upgrade packages to their latest version',
    'why': 'Show why a package is installed'
  },
  docker: {
    'run': 'Run a command in a new container',
    'ps': 'List containers',
    'build': 'Build an image from a Dockerfile',
    'pull': 'Pull an image or a repository',
    'push': 'Push an image or a repository',
    'images': 'List images',
    'exec': 'Run a command in a running container',
    'logs': 'Fetch the logs of a container',
    'stop': 'Stop one or more running containers',
    'rm': 'Remove one or more containers',
    'rmi': 'Remove one or more images',
    'volume': 'Manage volumes',
    'network': 'Manage networks',
    'compose': 'Docker Compose (multi-container) commands',
    'system': 'Manage Docker',
    'login': 'Log in to a Docker registry',
    'logout': 'Log out from a Docker registry'
  },
  find: {
    '-name': 'Search for files by name',
    '-type': 'Search for files by type',
    '-size': 'Search for files by size',
    '-mtime': 'Search for files by modification time',
    '-exec': 'Execute a command on found files',
    '-delete': 'Delete found files',
    '-print': 'Print found files',
    '-maxdepth': 'Limit directory traversal depth',
    '-mindepth': 'Start searching at given depth'
  },
  grep: {
    '-i': 'Case-insensitive search',
    '-r': 'Recursive search',
    '-v': 'Invert match (select non-matching lines)',
    '-n': 'Print line numbers',
    '-l': 'Print only names of files containing matches',
    '-c': 'Print only count of matching lines',
    '-e': 'Use pattern as regex pattern',
    '-A': 'Print N lines after match',
    '-B': 'Print N lines before match',
    '-C': 'Print N lines before and after match'
  }
};

/**
 * Git subcommand flags
 */
const GIT_SUBCOMMAND_FLAGS = {
  'commit': {
    '-m': 'Commit message',
    '-a': 'Automatically stage all modified files',
    '--amend': 'Amend previous commit',
    '--no-edit': 'Use previous commit message',
    '--allow-empty': 'Allow empty commit'
  },
  'push': {
    '-u': 'Set upstream for current branch',
    '--force': 'Force push',
    '--tags': 'Push tags',
    '--all': 'Push all branches',
    '--dry-run': 'Simulate push'
  },
  'pull': {
    '--rebase': 'Rebase instead of merge',
    '--no-rebase': 'Merge instead of rebase',
    '--force': 'Force pull',
    '--allow-unrelated-histories': 'Allow unrelated histories'
  },
  'checkout': {
    '-b': 'Create and checkout a new branch',
    '-t': 'Track a remote branch',
    '-f': 'Force checkout',
    '--orphan': 'Create a new orphan branch'
  }
};

/**
 * Main autocompletion service class
 */
class AutocompletionService {
  constructor() {
    this.completionCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.currentDirectory = process.cwd();
    this.nodePackagesCache = null;
  }

  /**
   * Get autocompletions for the current command
   * 
   * @param {string} input - Current command input
   * @param {Object} context - Terminal context (directory, history, etc.)
   * @returns {Promise<Array>} - Array of completion suggestions
   */
  async getCompletions(input, context = {}) {
    if (!input) return [];

    try {
      // Update current directory from context
      this.currentDirectory = context.currentDirectory || process.cwd();

      // Parse command input to determine what to complete
      const { commandName, currentToken, tokenPosition, fullCommand } = this.parseCommandInput(input);

      // Handle different completion types based on command and token position
      let completions = [];

      // Command name completion (first token)
      if (tokenPosition === 0) {
        // Combine explicit commands and command history
        completions = await this.getCommandNameCompletions(currentToken, context);
      } 
      // Subcommand/flag completion (second token onwards)
      else if (tokenPosition === 1 && commandName) {
        completions = await this.getSubcommandCompletions(commandName, currentToken);
      }
      // Option/argument completion (varies by command)
      else if (commandName) {
        completions = await this.getArgumentCompletions(commandName, currentToken, fullCommand, context);
      }

      // Sort and limit completions
      completions = this.sortCompletions(completions);

      return completions;
    } catch (error) {
      console.error('Error getting completions:', error);
      return [];
    }
  }

  /**
   * Parse command input to extract command name, current token, and token position
   * 
   * @param {string} input - Current command input
   * @returns {Object} - Parsed command components
   */
  parseCommandInput(input) {
    const tokens = input.trim().split(/\s+/);
    const commandName = tokens[0];
    
    // Figure out which token the cursor is at
    const lastSpace = input.lastIndexOf(' ');
    let currentToken = '';
    let tokenPosition = 0;
    
    if (lastSpace !== -1) {
      // If there's a space, we're completing a new token
      currentToken = input.substring(lastSpace + 1);
      tokenPosition = tokens.length - 1;
      
      // If input ends with space, we're starting a new token
      if (input.endsWith(' ')) {
        currentToken = '';
        tokenPosition = tokens.length;
      }
    } else {
      // No space means we're on the first token
      currentToken = input;
      tokenPosition = 0;
    }
    
    return {
      commandName,
      currentToken,
      tokenPosition,
      fullCommand: input,
      tokens
    };
  }

  /**
   * Get command name completions
   * 
   * @param {string} prefix - Current command prefix
   * @param {Object} context - Terminal context
   * @returns {Promise<Array>} - Command name completions
   */
  async getCommandNameCompletions(prefix, context) {
    // Common commands to suggest
    const commonCommands = [
      { name: 'ls', description: 'List directory contents' },
      { name: 'cd', description: 'Change directory' },
      { name: 'mkdir', description: 'Make directories' },
      { name: 'rm', description: 'Remove files or directories' },
      { name: 'cp', description: 'Copy files and directories' },
      { name: 'mv', description: 'Move/rename files' },
      { name: 'cat', description: 'Display file contents' },
      { name: 'grep', description: 'Search file patterns' },
      { name: 'find', description: 'Search for files' },
      { name: 'ps', description: 'Show process status' },
      { name: 'kill', description: 'Terminate processes' },
      { name: 'chmod', description: 'Change file permissions' },
      { name: 'chown', description: 'Change file owner/group' },
      { name: 'sudo', description: 'Execute command as superuser' },
      { name: 'apt', description: 'Package management' },
      { name: 'git', description: 'Version control system' },
      { name: 'docker', description: 'Container management' },
      { name: 'npm', description: 'Node.js package manager' },
      { name: 'yarn', description: 'Alternative package manager' }
    ];
    
    // Filter commands that match the prefix
    const filteredCommands = commonCommands
      .filter(cmd => cmd.name.startsWith(prefix))
      .map(cmd => ({
        value: cmd.name,
        label: cmd.name,
        description: cmd.description,
        type: 'command'
      }));
    
    // Add command history items if available
    const historyItems = [];
    if (context.commandHistory && context.commandHistory.length > 0) {
      // Extract command names from history and deduplicate
      const seen = new Set();
      context.commandHistory.forEach(cmd => {
        const cmdName = cmd.split(/\s+/)[0];
        if (!seen.has(cmdName) && cmdName.startsWith(prefix)) {
          seen.add(cmdName);
          historyItems.push({
            value: cmdName,
            label: cmdName,
            description: 'Recent command',
            type: 'history'
          });
        }
      });
    }
    
    // Combine results, with history items first since they're more relevant
    return [...historyItems, ...filteredCommands];
  }

  /**
   * Get subcommand completions for a specific command
   * 
   * @param {string} command - The main command
   * @param {string} prefix - Current subcommand prefix
   * @returns {Promise<Array>} - Subcommand completions
   */
  async getSubcommandCompletions(command, prefix) {
    const completions = [];
    
    // Check if we have predefined completions for this command
    if (COMMON_FLAGS[command]) {
      // For git, npm, yarn, and other commands with subcommands
      const options = COMMON_FLAGS[command];
      
      // Add matching options
      for (const [option, description] of Object.entries(options)) {
        if (option.startsWith(prefix)) {
          completions.push({
            value: option,
            label: option,
            description: description,
            type: 'subcommand'
          });
        }
      }
    } else {
      // Default to path completion for commands like cd, ls, cat, etc.
      return this.getPathCompletions(prefix);
    }
    
    return completions;
  }

  /**
   * Get argument completions based on command context
   * 
   * @param {string} command - The main command
   * @param {string} prefix - Current argument prefix
   * @param {string} fullCommand - Full command line
   * @param {Object} context - Terminal context
   * @returns {Promise<Array>} - Argument completions
   */
  async getArgumentCompletions(command, prefix, fullCommand, context) {
    // Special case handlers for common commands
    switch (command) {
      case 'cd':
      case 'ls':
      case 'mkdir':
      case 'rm':
      case 'cp':
      case 'mv':
      case 'cat':
        // File/directory path completion
        return this.getPathCompletions(prefix, command === 'cd');
        
      case 'git':
        // Git-specific completions
        return this.getGitCompletions(prefix, fullCommand);
        
      case 'npm':
      case 'yarn':
        // NPM/Yarn completions
        return this.getPackageManagerCompletions(command, prefix, fullCommand);
        
      case 'docker':
        // Docker completions
        return this.getDockerCompletions(prefix, fullCommand);
        
      case 'grep':
      case 'find':
        // These commands often have special flags followed by path arguments
        const tokens = fullCommand.trim().split(/\s+/);
        // Check if previous token is a flag that should be followed by a specific type
        const prevToken = tokens[tokens.length - 2];
        
        if (prevToken && prevToken.startsWith('-')) {
          // Check if flag expects a file path
          if (command === 'find' && (prevToken === '-name' || prevToken === '-path')) {
            return [{ value: '"*' + prefix + '*"', label: '"*' + prefix + '*"', description: 'Glob pattern', type: 'pattern' }];
          }
        }
        
        // Default to path completion
        return this.getPathCompletions(prefix);
        
      default:
        // Default to path completion for unknown commands
        return this.getPathCompletions(prefix);
    }
  }

  /**
   * Get path completions for file/directory arguments
   * 
   * @param {string} prefix - Current path prefix
   * @param {boolean} dirsOnly - Whether to only include directories (e.g., for cd)
   * @returns {Promise<Array>} - Path completions
   */
  async getPathCompletions(prefix, dirsOnly = false) {
    try {
      if (!fs) {
        return []; // No filesystem access in this environment
      }
      
      // Normalize the prefix to handle various path formats
      const expandedPrefix = this.expandTilde(prefix);
      
      // Determine which directory to scan
      let targetDir = this.currentDirectory;
      let baseName = expandedPrefix;
      
      // If the prefix contains a path separator, split into dir and base parts
      if (expandedPrefix.includes('/')) {
        const lastSlashIndex = expandedPrefix.lastIndexOf('/');
        const dirPart = expandedPrefix.substring(0, lastSlashIndex + 1);
        baseName = expandedPrefix.substring(lastSlashIndex + 1);
        
        // If dirPart is absolute or relative to home, use it directly
        if (dirPart.startsWith('/') || dirPart.startsWith('~/')) {
          targetDir = path.dirname(expandedPrefix);
        } else {
          // Otherwise, it's relative to current directory
          targetDir = path.join(this.currentDirectory, dirPart);
        }
      }
      
      // Get directory contents
      const cacheKey = `path:${targetDir}`;
      let dirContents = this.completionCache.get(cacheKey);
      const now = Date.now();
      
      if (!dirContents || (now - dirContents.timestamp > this.cacheExpiry)) {
        // Cache expired or not present, read directory
        try {
          const files = await fs.promises.readdir(targetDir, { withFileTypes: true });
          
          // Process directory entries
          dirContents = {
            items: files.map(file => {
              const isDir = file.isDirectory();
              return {
                name: file.name,
                isDirectory: isDir,
                displayName: file.name + (isDir ? '/' : '')
              };
            }),
            timestamp: now
          };
          
          // Cache the result
          this.completionCache.set(cacheKey, dirContents);
        } catch (error) {
          console.error(`Error reading directory ${targetDir}:`, error);
          return [];
        }
      }
      
      // Filter entries based on prefix and dir-only flag
      const filteredEntries = dirContents.items.filter(entry => {
        if (dirsOnly && !entry.isDirectory) {
          return false;
        }
        
        return entry.name.startsWith(baseName);
      });
      
      // Format results for display
      return filteredEntries.map(entry => {
        const fullPath = expandedPrefix.includes('/') 
          ? prefix.substring(0, prefix.lastIndexOf('/') + 1) + entry.name
          : entry.name;
          
        return {
          value: this.escapePath(fullPath),
          label: entry.displayName,
          description: entry.isDirectory ? 'Directory' : 'File',
          type: entry.isDirectory ? 'directory' : 'file'
        };
      });
    } catch (error) {
      console.error('Error getting path completions:', error);
      return [];
    }
  }
  
  /**
   * Get git command completions
   * 
   * @param {string} prefix - Current token prefix
   * @param {string} fullCommand - Full command line
   * @returns {Promise<Array>} - Git-specific completions
   */
  async getGitCompletions(prefix, fullCommand) {
    // Parse git command to determine context
    const tokens = fullCommand.trim().split(/\s+/);
    
    // We need at least "git subcmd" to provide completions
    if (tokens.length < 2) {
      return [];
    }
    
    const gitSubcommand = tokens[1];
    
    // Handle git command flags
    if (prefix.startsWith('-')) {
      // Check if this git subcommand has known flags
      if (GIT_SUBCOMMAND_FLAGS[gitSubcommand]) {
        const flags = GIT_SUBCOMMAND_FLAGS[gitSubcommand];
        
        return Object.entries(flags)
          .filter(([flag]) => flag.startsWith(prefix))
          .map(([flag, description]) => ({
            value: flag,
            label: flag,
            description,
            type: 'flag'
          }));
      }
      return [];
    }
    
    // Special cases for different git subcommands
    switch (gitSubcommand) {
      case 'checkout':
      case 'switch':
      case 'branch':
        // Branch completions
        return this.getGitBranches(prefix);
        
      case 'push':
      case 'fetch':
      case 'pull':
        // Remote completions
        return this.getGitRemotes(prefix);
        
      case 'add':
        // File completions (prefer modified/untracked files)
        return this.getGitUnstagedFiles(prefix);
        
      default:
        // Fall back to path completion for most git commands
        return this.getPathCompletions(prefix);
    }
  }
  
  /**
   * Get git branch completions
   * 
   * @param {string} prefix - Branch name prefix
   * @returns {Promise<Array>} - Branch completions
   */
  async getGitBranches(prefix) {
    // Check if we're in a git repo
    if (!execAsync) {
      return [];
    }
    
    const cacheKey = `git:branches:${this.currentDirectory}`;
    const cached = this.completionCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < this.cacheExpiry)) {
      return cached.branches.filter(branch => branch.value.startsWith(prefix));
    }
    
    try {
      // Get branch list using git command
      const { stdout } = await execAsync('git branch --all', { cwd: this.currentDirectory });
      
      // Parse branches (format: "* master", "  develop", "  remotes/origin/feature")
      const branches = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const isCurrent = line.startsWith('*');
          const name = line.replace(/^\*?\s+/, '').trim();
          const isRemote = name.startsWith('remotes/');
          const displayName = isRemote ? name.replace('remotes/', '') : name;
          
          return {
            value: name,
            label: displayName,
            description: isCurrent ? 'Current branch' : (isRemote ? 'Remote branch' : 'Local branch'),
            type: 'branch'
          };
        });
      
      // Cache the results
      this.completionCache.set(cacheKey, {
        branches,
        timestamp: now
      });
      
      // Filter by prefix
      return branches.filter(branch => branch.value.startsWith(prefix));
    } catch (error) {
      // Not a git repo or other error
      return [];
    }
  }
  
  /**
   * Get git remote completions
   * 
   * @param {string} prefix - Remote name prefix
   * @returns {Promise<Array>} - Remote completions
   */
  async getGitRemotes(prefix) {
    if (!execAsync) {
      return [];
    }
    
    try {
      // Get git remotes
      const { stdout } = await execAsync('git remote', { cwd: this.currentDirectory });
      
      // Parse remotes
      const remotes = stdout.split('\n')
        .filter(line => line.trim())
        .map(remote => ({
          value: remote,
          label: remote,
          description: 'Git remote',
          type: 'remote'
        }));
      
      // Filter by prefix
      return remotes.filter(remote => remote.value.startsWith(prefix));
    } catch (error) {
      // Not a git repo or other error
      return [];
    }
  }
  
  /**
   * Get unstaged/modified git files
   * 
   * @param {string} prefix - File prefix
   * @returns {Promise<Array>} - File completions
   */
  async getGitUnstagedFiles(prefix) {
    if (!execAsync) {
      return [];
    }
    
    try {
      // Get modified/untracked files
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.currentDirectory });
      
      // Parse status output
      const files = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Format: "XY filename" where X=staged, Y=unstaged
          const status = line.substring(0, 2);
          const fileName = line.substring(3);
          
          let description = 'File';
          if (status.includes('M')) description = 'Modified file';
          if (status.includes('A')) description = 'Added file';
          if (status.includes('D')) description = 'Deleted file';
          if (status.includes('R')) description = 'Renamed file';
          if (status.includes('?')) description = 'Untracked file';
          
          return {
            value: this.escapePath(fileName),
            label: fileName,
            description,
            type: 'file'
          };
        });
      
      // Filter by prefix
      if (prefix) {
        return files.filter(file => file.value.startsWith(prefix));
      }
      
      // Add special completions for no prefix
      if (!prefix) {
        files.unshift({
          value: '.',
          label: '.',
          description: 'All changes',
          type: 'gitspec'
        });
      }
      
      return files;
    } catch (error) {
      // Fall back to regular path completion
      return this.getPathCompletions(prefix);
    }
  }
  
  /**
