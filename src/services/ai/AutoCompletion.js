/**
 * AutoCompletion.js
 * 
 * Advanced terminal autocompletion service that provides context-aware completions
 * and intelligent suggestions by integrating with CommandPatternAnalyzer.
 * 
 * Features:
 * - Real-time suggestions as user types
 * - Context-aware completions (files, git branches, process IDs, etc.)
 * - Shell-specific completion rules (bash, zsh, fish)
 * - Integration with AI for smart suggestions
 * - Keyboard navigation for completions
 */

import { aiService } from './aiService';

class AutoCompletion {
  constructor(options = {}) {
    // Configuration
    this.options = {
      minChars: 1,               // Minimum characters before showing completions
      maxResults: 10,            // Maximum number of results to show
      debounceMs: 100,           // Debounce delay for input
      enabledCompletions: {
        commands: true,          // Basic command completions
        files: true,             // File/directory completions
        git: true,               // Git branch/command completions
        npm: true,               // NPM command completions
        cargo: true,             // Cargo (Rust) command completions
        processIds: true,        // Process ID completions
        shellSpecific: true,     // Shell-specific completions
        aiSuggestions: true,     // AI-powered suggestions
      },
      ...options,
    };

    // State
    this.currentInput = '';
    this.completions = [];
    this.activeIndex = -1;
    this.isLoading = false;
    this.currentDir = '~';
    this.shell = 'bash';         // Default shell type
    this.debounceTimer = null;

    // Context caches
    this.fileCache = new Map();  // Cache for file listings
    this.commandCache = new Map(); // Cache for command completions
    this.gitCache = new Map();   // Cache for git information
    
    // Reference to pattern analyzer
    this.patternAnalyzer = null;
    
    // Bind methods
    this.updateInput = this.updateInput.bind(this);
    this.getCompletions = this.getCompletions.bind(this);
    this.applyCompletion = this.applyCompletion.bind(this);
    this.navigateCompletions = this.navigateCompletions.bind(this);
    this.clearCompletions = this.clearCompletions.bind(this);
  }

  /**
   * Set reference to CommandPatternAnalyzer
   * @param {Object} analyzer - Instance of CommandPatternAnalyzer
   */
  setPatternAnalyzer(analyzer) {
    this.patternAnalyzer = analyzer;
  }

  /**
   * Set current shell type
   * @param {string} shell - Shell type (bash, zsh, fish)
   */
  setShell(shell) {
    this.shell = shell;
  }

  /**
   * Update current directory context
   * @param {string} directory - Current directory path
   */
  setCurrentDirectory(directory) {
    this.currentDir = directory;
  }

  /**
   * Update current input and generate completions
   * @param {string} input - Current command input
   * @param {Object} context - Terminal context (environment, history, etc.)
   * @returns {Promise<Array>} - Completions
   */
  async updateInput(input, context = {}) {
    this.currentInput = input;
    
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Clear completions if input is too short
    if (!input || input.length < this.options.minChars) {
      this.clearCompletions();
      return [];
    }
    
    // Set loading state
    this.isLoading = true;
    
    // Debounce completion generation
    return new Promise(resolve => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const completions = await this.generateCompletions(input, context);
          this.completions = completions;
          this.activeIndex = completions.length > 0 ? 0 : -1;
          this.isLoading = false;
          resolve(completions);
        } catch (error) {
          console.error('Error generating completions:', error);
          this.isLoading = false;
          this.completions = [];
          this.activeIndex = -1;
          resolve([]);
        }
      }, this.options.debounceMs);
    });
  }

  /**
   * Get current completions
   * @returns {Array} Current completions
   */
  getCompletions() {
    return {
      completions: this.completions,
      activeIndex: this.activeIndex,
      isLoading: this.isLoading
    };
  }

  /**
   * Apply the currently selected completion
   * @returns {string|null} The completed command or null if no completion selected
   */
  applyCompletion() {
    if (this.activeIndex === -1 || !this.completions.length) {
      return null;
    }
    
    const completion = this.completions[this.activeIndex];
    
    // Clear completions after applying
    this.clearCompletions();
    
    return completion.command;
  }

  /**
   * Navigate through completions
   * @param {string} direction - 'next' or 'prev'
   */
  navigateCompletions(direction) {
    if (!this.completions.length) {
      return;
    }
    
    if (direction === 'next') {
      this.activeIndex = (this.activeIndex + 1) % this.completions.length;
    } else {
      this.activeIndex = (this.activeIndex - 1 + this.completions.length) % this.completions.length;
    }
  }

  /**
   * Clear all completions
   */
  clearCompletions() {
    this.completions = [];
    this.activeIndex = -1;
    this.isLoading = false;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Generate completions for the current input
   * @param {string} input - Current command input
   * @param {Object} context - Terminal context
   * @returns {Promise<Array>} - Completions array
   * @private
   */
  async generateCompletions(input, context) {
    // Split input into command and current token
    const { commandParts, currentToken, tokenType } = this.parseInput(input);
    
    // Gather completions from different sources
    const completions = [];
    
    // File completions (for paths and file arguments)
    if (this.options.enabledCompletions.files && 
        (tokenType === 'path' || tokenType === 'arg')) {
      const fileCompletions = await this.getFileCompletions(currentToken, this.currentDir);
      completions.push(...fileCompletions);
    }
    
    // Git completions (branches, commands)
    if (this.options.enabledCompletions.git && 
        (commandParts[0] === 'git' || tokenType === 'git-arg')) {
      const gitCompletions = await this.getGitCompletions(commandParts, currentToken);
      completions.push(...gitCompletions);
    }
    
    // Package manager completions (npm, yarn, cargo)
    if (this.options.enabledCompletions.npm && 
        ['npm', 'yarn'].includes(commandParts[0])) {
      const npmCompletions = this.getNpmCompletions(commandParts, currentToken);
      completions.push(...npmCompletions);
    }
    
    if (this.options.enabledCompletions.cargo && commandParts[0] === 'cargo') {
      const cargoCompletions = this.getCargoCompletions(commandParts, currentToken);
      completions.push(...cargoCompletions);
    }
    
    // Process ID completions (for kill, etc.)
    if (this.options.enabledCompletions.processIds && 
        ['kill', 'top', 'ps'].includes(commandParts[0])) {
      const processCompletions = await this.getProcessCompletions(commandParts, currentToken);
      completions.push(...processCompletions);
    }
    
    // Command completions (if at beginning of line)
    if (this.options.enabledCompletions.commands && commandParts.length <= 1) {
      const commandCompletions = await this.getCommandCompletions(currentToken);
      completions.push(...commandCompletions);
    }
    
    // Shell-specific completions
    if (this.options.enabledCompletions.shellSpecific) {
      const shellCompletions = this.getShellSpecificCompletions(
        commandParts, 
        currentToken, 
        this.shell
      );
      completions.push(...shellCompletions);
    }
    
    // AI suggestions from pattern analyzer and AI service
    if (this.options.enabledCompletions.aiSuggestions) {
      const aiCompletions = await this.getAISuggestions(input, context);
      completions.push(...aiCompletions);
    }
    
    // Sort completions by relevance and limit results
    return this.rankCompletions(completions, currentToken)
      .slice(0, this.options.maxResults);
  }

  /**
   * Parse command input into parts for better analysis
   * @param {string} input - Raw command input
   * @returns {Object} Parsed input information
   * @private
   */
  parseInput(input) {
    // Extract the parts of the command
    const parts = input.trim().split(/\s+/);
    const lastSpace = input.lastIndexOf(' ');
    
    let currentToken = '';
    if (lastSpace === -1) {
      // Input is a single token (command)
      currentToken = input;
    } else {
      // Input has multiple parts, get the current token being typed
      currentToken = input.slice(lastSpace + 1);
    }
    
    // Determine token type
    let tokenType = 'command'; // Default
    
    if (parts.length > 1) {
      tokenType = 'arg'; // General argument
      
      // Check for path
      if (currentToken.includes('/') || currentToken.startsWith('~') ||
          currentToken.startsWith('./') || currentToken.startsWith('../')) {
        tokenType = 'path';
      }
      
      // Check for git arguments
      if (parts[0] === 'git') {
        tokenType = 'git-arg';
      }
      
      // Check for flags
      if (currentToken.startsWith('-')) {
        tokenType = 'flag';
      }
    }
    
    return {
      commandParts: parts,
      currentToken,
      tokenType,
      fullCommand: input
    };
  }

  /**
   * Get file and directory completions
   * @param {string} partial - Partial file/dir path
   * @param {string} currentDir - Current directory
   * @returns {Promise<Array>} - File/directory completions
   * @private
   */
  async getFileCompletions(partial, currentDir) {
    // Determine the directory to search in
    let searchDir = currentDir;
    let prefix = partial;
    
    if (partial.includes('/')) {
      // If partial contains a path separator, split the path
      const lastSlash = partial.lastIndexOf('/');
      const pathPart = partial.substring(0, lastSlash);
      prefix = partial.substring(lastSlash + 1);
      
      // Resolve relative to currentDir if not absolute path
      if (pathPart.startsWith('/')) {
        searchDir = pathPart;
      } else if (pathPart.startsWith('~')) {
        searchDir = pathPart.replace('~', '/home'); // Simple home dir expansion
      } else {
        searchDir = `${currentDir}/${pathPart}`;
      }
    }
    
    // Try to get file list from cache
    const cacheKey = searchDir;
    let files = this.fileCache.get(cacheKey);
    
    if (!files) {
      try {
        // In a real implementation, this would call the shell service to list files
        // For now, simulate calling an external service
        if (window.terminal && window.terminal.listFiles) {
          files = await window.terminal.listFiles(searchDir);
        } else {
          // Provide a minimal fallback for testing
          files = [
            { name: 'file1.txt', type: 'file' },
            { name: 'file2.js', type: 'file' },
            { name: 'dir1', type: 'directory' },
            { name: 'dir2', type: 'directory' }
          ];
        }
        
        // Cache results
        this.fileCache.set(cacheKey, files);
        
        // Set expiration for cache (5 seconds)
        setTimeout(() => {
          this.fileCache.delete(cacheKey);
        }, 5000);
      } catch (error) {
        console.error('Error listing files:', error);
        files = [];
      }
    }
    
    // Filter and format completions
    return files
      .filter(file => file.name.startsWith(prefix))
      .map(file => {
        const isDir = file.type === 'directory';
        const pathSeparator = partial.includes('/') ? 
            partial.substring(0, partial.lastIndexOf('/') + 1) : '';
        
        return {
          command: `${pathSeparator}${file.name}${isDir ? '/' : ''}`,
          displayText: file.name,
          description: isDir ? 'Directory' : `File (${this.getFileExtDescription(file.name)})`,
          icon: isDir ? 'folder' : 'file',
          type: 'file',
          category: 'Files',
          replacement: file.name,
          append: isDir ? '/' : ' ',
          score: 80 // Base score for files
        };
      });
  }

  /**
   * Get git command completions
   * @param {Array} commandParts - Command parts array
   * @param {string} currentToken - Current token being completed
   * @returns {Promise<Array>} - Git completions
   * @private
   */
  async getGitCompletions(commandParts, currentToken) {
    // If not a git command, return empty array
    if (commandParts[0] !== 'git') {
      return [];
    }
    
    // Git subcommand completions
    if (commandParts.length === 1 || (commandParts.length === 2 &&
        !commandParts[1].startsWith('-'))) {
      // Complete git subcommand
      const subcommands = [
        { cmd: 'status', desc: 'Show the working tree status' },
        { cmd: 'add', desc: 'Add file contents to the index' },
        { cmd: 'commit', desc: 'Record changes to the repository' },
        { cmd: 'push', desc: 'Update remote refs along with associated objects' },
        { cmd: 'pull', desc: 'Fetch from and integrate with another repository or a local branch' },
        { cmd: 'checkout', desc: 'Switch branches or restore working tree files' },
        { cmd: 'branch', desc: 'List, create, or delete branches' },
        { cmd: 'merge', desc: 'Join two or more development histories together' },
        { cmd: 'clone', desc: 'Clone a repository into a new directory' },
        { cmd: 'fetch', desc: 'Download objects and refs from another repository' },
        { cmd: 'log', desc: 'Show commit logs' },
        { cmd: 'diff', desc: 'Show changes between commits, commit and working tree, etc' },
        { cmd: 'remote', desc: 'Manage set of tracked repositories' },
        { cmd: 'reset', desc: 'Reset current HEAD to the specified state' },
        { cmd: 'stash', desc: 'Stash the changes in a dirty working directory away' },
        { cmd: 'tag', desc: 'Create, list, delete or verify a tag object signed with GPG' },
        { cmd: 'init', desc: 'Create an empty Git repository or reinitialize an existing one' },
        { cmd: 'config', desc: 'Get and set repository or global options' }
      ];
      
      const gitCommand = currentToken || '';
      return subcommands
        .filter(({ cmd }) => cmd.startsWith(gitCommand))
        .map(({ cmd, desc }) => ({
          command: `git ${cmd}`,
          displayText: cmd,
          description: desc,
          icon: 'git',
          type: 'git',
          category: 'Git',
          replacement: cmd,
          append: ' ',
          score: 85
        }));
    }
    
    // Git subcommand arguments and flags
    const subcommand = commandParts[1];
    const gitCompletions = [];
    
    // Common flags for frequently used git commands
    const commonFlags = {
      'commit': [
        { flag: '-m', desc: 'Use the given message as the commit message' },
        { flag: '-a', desc: 'Stage all modified and deleted files' },
        { flag: '--amend', desc: 'Replace the tip of the current branch by creating a new commit' },
        { flag: '--no-edit', desc: 'Use the selected commit message without launching an editor' }
      ],
      'checkout': [
        { flag: '-b', desc: 'Create and checkout a new branch' },
        { flag: '-f', desc: 'Force checkout (throw away local modifications)' }
      ],
      'push': [
        { flag: '--force', desc: 'Force push even when the remote contains work you do not have locally' },
        { flag: '-u', desc: 'Set upstream for git pull/push' }
      ],
      'pull': [
        { flag: '--rebase', desc: 'Rebase the current branch on top of the upstream branch after fetching' },
        { flag: '--no-rebase', desc: 'Merge the upstream branch into the current branch' }
      ],
      'branch': [
        { flag: '-d', desc: 'Delete a branch' },
        { flag: '-D', desc: 'Force delete a branch' },
        { flag: '-a', desc: 'List both remote-tracking and local branches' },
        { flag: '-r', desc: 'List the remote-tracking branches' }
      ],
      'diff': [
        { flag: '--staged', desc: 'Show differences between the index and the HEAD' },
        { flag: '--name-only', desc: 'Show only names of changed files' }
      ],
      'log': [
        { flag: '--oneline', desc: 'Show each commit as a single line' },
        { flag: '--graph', desc: 'Draw a text-based graphical representation of the commit history' },
        { flag: '-p', desc: 'Show the patch introduced with each commit' },
        { flag: '--stat', desc: 'Show statistics for files modified in each commit' }
      ]
    };
    
    // Add flags based on subcommand if current token starts with '-'
    if (currentToken.startsWith('-') && commonFlags[subcommand]) {
      commonFlags[subcommand]
        .filter(({ flag }) => flag.startsWith(currentToken))
        .forEach(({ flag, desc }) => {
          gitCompletions.push({
            command: `git ${subcommand} ${flag}`,
            displayText: flag,
            description: desc,
            icon: 'flag',
            type: 'git',
            category: 'Git Flags',
            replacement: flag,
            append: ' ',
            score: 83
          });
        });
    }
    
    // Add branch completions for commands that accept branches
    if ((['checkout', 'merge', 'pull', 'push', 'rebase', 'branch', 'diff']).includes(subcommand) && 
        !currentToken.startsWith('-')) {
      
      // Get branches from cache or fetch them
      const cacheKey = 'git-branches';
      let branches = this.gitCache.get(cacheKey);
      
      if (!branches) {
        try {
          // In a real implementation, this would call the shell service to list branches
          // For now, simulate calling an external service
          if (window.terminal && window.terminal.getGitBranches) {
            branches = await window.terminal.getGitBranches();
          } else {
            // Provide some fallback branches for testing
            branches = [
              { name: 'main', current: true, remote: false },
              { name: 'develop', current: false, remote: false },
              { name: 'feature/new-ui', current: false, remote: false },
              { name: 'origin/main', current: false, remote: true },
              { name: 'origin/develop', current: false, remote: true }
            ];
          }
          
          // Cache the branches
          this.gitCache.set(cacheKey, branches);
          
          // Set expiration for cache (10 seconds)
          setTimeout(() => {
            this.gitCache.delete(cacheKey);
          }, 10000);
        } catch (error) {
          console.error('Error getting git branches:', error);
          branches = [];
        }
      }
      
      // Filter branches based on current token and add to completions
      branches
        .filter(branch => branch.name.startsWith(currentToken))
        .forEach(branch => {
          gitCompletions.push({
            command: `git ${subcommand} ${branch.name}`,
            displayText: branch.name,
            description: branch.current ? 'Current branch' : (branch.remote ? 'Remote branch' : 'Local branch'),
            icon: 'git-branch',
            type: 'git',
            category: 'Git Branches',
            replacement: branch.name,
            append: ' ',
            score: 90
          });
        });
    }
    
    return gitCompletions;
  }

  /**
   * Get npm command completions
   * @param {Array} commandParts - Command parts array
   * @param {string} currentToken - Current token being completed
   * @returns {Array} - NPM completions
   * @private
   */
  getNpmCompletions(commandParts, currentToken) {
    // Common npm commands
    const npmCommands = [
      { cmd: 'install', desc: 'Install a package', aliases: ['i'] },
      { cmd: 'uninstall', desc: 'Remove a package', aliases: ['un', 'remove', 'rm', 'r'] },
      { cmd: 'update', desc: 'Update packages', aliases: ['up', 'upgrade'] },
      { cmd: 'run', desc: 'Run a script', aliases: ['run-script'] },
      { cmd: 'test', desc: 'Run tests', aliases: ['t'] },
      { cmd: 'start', desc: 'Start the package', aliases: [] },
      { cmd: 'build', desc: 'Build the package', aliases: [] },
      { cmd: 'publish', desc: 'Publish package', aliases: [] },
      { cmd: 'init', desc: 'Create a package.json file', aliases: [] },
      { cmd: 'list', desc: 'List installed packages', aliases: ['ls', 'll', 'la'] },
      { cmd: 'search', desc: 'Search for packages', aliases: ['s', 'find'] },
      { cmd: 'info', desc: 'View package info', aliases: ['show', 'view'] }
    ];
    
    const npmCompletions = [];
    const packageManager = commandParts[0]; // 'npm' or 'yarn'
    
    // If only the package manager command has been typed
    if (commandParts.length === 1 || (commandParts.length === 2 && !commandParts[1].startsWith('-'))) {
      // Filter and map npm commands
      return npmCommands
        .filter(({ cmd, aliases }) => 
          cmd.startsWith(currentToken) || aliases.some(alias => alias.startsWith(currentToken))
        )
        .map(({ cmd, desc }) => ({
          command: `${packageManager} ${cmd}`,
          displayText: cmd,
          description: desc,
          icon: 'npm',
          type: 'npm',
          category: packageManager.toUpperCase(),
          replacement: cmd,
          append: ' ',
          score: 85
        }));
    }
    
    // If 'npm run' or 'yarn run' - attempt to complete with scripts from package.json
    if (commandParts.length > 1 && commandParts[1] === 'run' && commandParts.length <= 3) {
      try {
        let scripts = [];
        
        // In a real implementation, this would get scripts from package.json
        if (window.terminal && window.terminal.getNpmScripts) {
          scripts = window.terminal.getNpmScripts();
        } else {
          // Fallback scripts for testing
          scripts = [
            { name: 'start', description: 'Start the development server' },
            { name: 'build', description: 'Build for production' },
            { name: 'test', description: 'Run tests' },
            { name: 'lint', description: 'Lint code' },
            { name: 'deploy', description: 'Deploy to production' }
          ];
        }
        
        // Filter scripts that match the current token
        scripts
          .filter(script => script.name.startsWith(currentToken))
          .forEach(script => {
            npmCompletions.push({
              command: `${packageManager} run ${script.name}`,
              displayText: script.name,
              description: script.description || `Run ${script.name} script`,
              icon: 'script',
              type: 'npm',
              category: 'Scripts',
              replacement: script.name,
              append: ' ',
              score: 90
            });
          });
      } catch (error) {
        console.error('Error getting npm scripts:', error);
      }
    }
    
    // Common flags for npm commands
    if (commandParts.length > 1 && currentToken.startsWith('-')) {
      const commonFlags = {
        'install': [
          { flag: '--save-dev', desc: 'Save package to your devDependencies' },
          { flag: '--save-prod', desc: 'Save package to your dependencies' },
          { flag: '--global', desc: 'Install package globally' },
          { flag: '--no-save', desc: 'Prevent saving to dependencies' }
        ],
        'run': [
          { flag: '--silent', desc: 'Silent mode, don\'t show npm ERR! output' }
        ],
        'test': [
          { flag: '--coverage', desc: 'Include coverage report' }
        ],
        'publish': [
          { flag: '--access=public', desc: 'Publish with

