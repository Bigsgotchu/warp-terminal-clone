/**
 * CommandPatternAnalyzer.js
 * Service responsible for analyzing command patterns, detecting repetitive sequences,
 * and suggesting optimizations like aliases and workflow improvements.
 */

class CommandPatternAnalyzer {
  constructor(commandHistoryService, configService) {
    this.commandHistoryService = commandHistoryService;
    this.configService = configService;
    this.minSequenceLength = 2;
    this.minSequenceOccurrences = 3;
    this.maxSequenceLength = 5;
    this.textProcessingCommands = [
      'grep', 'awk', 'sed', 'tr', 'cut', 'sort', 'uniq', 
      'head', 'tail', 'cat', 'less', 'more', 'find', 'xargs'
    ];
  }

  /**
   * Main entry point for pattern analysis.
   * Returns optimization suggestions based on command history.
   */
  async analyzePatterns() {
    const commandHistory = await this.commandHistoryService.getRecentCommands(500);
    
    const results = {
      frequentCommands: this.findFrequentCommands(commandHistory),
      commandSequences: this.detectCommandSequences(commandHistory),
      textProcessingWorkflows: this.analyzeTextProcessingWorkflows(commandHistory),
      statisticalInsights: this.generateStatisticalInsights(commandHistory)
    };

    return results;
  }

  /**
   * Finds commands that are used frequently and might benefit from aliases
   */
  findFrequentCommands(commandHistory) {
    const commandCounts = {};
    
    // Count command occurrences
    for (const entry of commandHistory) {
      const command = this.extractBaseCommand(entry.command);
      if (!command) continue;
      
      commandCounts[command] = (commandCounts[command] || 0) + 1;
    }
    
    // Filter commands that exceed threshold and sort by frequency
    const frequentCommands = Object.entries(commandCounts)
      .filter(([_, count]) => count >= this.minSequenceOccurrences)
      .sort((a, b) => b[1] - a[1])
      .map(([command, count]) => ({
        command,
        count,
        suggestedAlias: this.suggestAliasName(command)
      }));
    
    return frequentCommands;
  }

  /**
   * Detects sequences of commands that are repeatedly used together
   * and could be combined into scripts or functions
   */
  detectCommandSequences(commandHistory) {
    // Store all potential sequences and their occurrences
    const sequenceCounts = {};
    const commandsOnly = commandHistory.map(entry => entry.command);
    
    // Look for sequences of different lengths
    for (let seqLength = this.minSequenceLength; seqLength <= this.maxSequenceLength; seqLength++) {
      // For each possible starting position in history
      for (let i = 0; i <= commandsOnly.length - seqLength; i++) {
        // Extract the sequence
        const sequence = commandsOnly.slice(i, i + seqLength);
        const sequenceStr = sequence.join(' && ');
        
        // Skip if sequence contains empty commands
        if (sequence.some(cmd => !cmd.trim())) continue;
        
        // Count occurrences of this sequence throughout history
        const occurrences = this.countSequence(commandsOnly, sequence);
        
        if (occurrences >= this.minSequenceOccurrences) {
          sequenceCounts[sequenceStr] = {
            commands: sequence,
            count: occurrences,
            combinedCommand: this.combineCommands(sequence),
            scriptSuggestion: this.createScriptSuggestion(sequence)
          };
        }
      }
    }
    
    // Convert to array and sort by frequency
    return Object.values(sequenceCounts)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyzes sequences of text processing commands and suggests optimizations
   */
  analyzeTextProcessingWorkflows(commandHistory) {
    const workflows = [];
    const textCommands = commandHistory.filter(entry => 
      this.textProcessingCommands.some(cmd => entry.command.startsWith(cmd)));
    
    // Look for consecutive text processing commands
    for (let i = 0; i < textCommands.length - 1; i++) {
      const currentCmd = textCommands[i].command;
      const nextCmd = textCommands[i + 1].command;
      
      // Check if they're related (e.g., piped commands broken into separate entries)
      if (this.areRelatedTextCommands(currentCmd, nextCmd)) {
        const optimizedCommand = this.suggestTextProcessingOptimization([currentCmd, nextCmd]);
        
        if (optimizedCommand) {
          workflows.push({
            originalCommands: [currentCmd, nextCmd],
            optimizedCommand,
            improvementDescription: this.getOptimizationDescription(currentCmd, nextCmd, optimizedCommand)
          });
        }
      }
    }
    
    return workflows;
  }

  /**
   * Suggests a concise, meaningful alias name for a command
   */
  suggestAliasName(command) {
    // Extract base command without arguments
    const baseCommand = command.split(' ')[0];
    
    // Strategy 1: Use first letter of multi-word commands
    if (baseCommand.includes('-')) {
      return baseCommand.split('-').map(word => word[0]).join('');
    }
    
    // Strategy 2: Use first 1-2 characters for short commands
    if (baseCommand.length <= 4) {
      return baseCommand;
    }
    
    // Strategy 3: Use first and last characters plus length for medium commands
    if (baseCommand.length <= 8) {
      return `${baseCommand[0]}${baseCommand.length}${baseCommand[baseCommand.length-1]}`;
    }
    
    // Strategy 4: Use consonants from the command for longer commands
    const consonants = baseCommand.replace(/[aeiou]/gi, '');
    return consonants.substring(0, 3);
  }

  /**
   * Combines a sequence of commands into a single command with && or | as appropriate
   */
  combineCommands(commandSequence) {
    // Check if these commands should be piped
    if (this.shouldUsePipes(commandSequence)) {
      return commandSequence.join(' | ');
    }
    
    // Otherwise use sequential execution
    return commandSequence.join(' && ');
  }

  /**
   * Suggests optimizations for text processing pipelines
   */
  suggestTextProcessingOptimization(commands) {
    // Common optimization patterns
    const patterns = [
      {
        match: (cmds) => cmds[0].includes('grep') && cmds[1].includes('grep'),
        optimize: (cmds) => `grep -E '${this.extractPattern(cmds[0])}.*${this.extractPattern(cmds[1])}'`
      },
      {
        match: (cmds) => cmds[0].includes('sort') && cmds[1].includes('uniq'),
        optimize: (cmds) => `sort ${this.extractSortOptions(cmds[0])} | uniq -c | sort -nr`
      },
      {
        match: (cmds) => cmds[0].includes('cat') && cmds[1].includes('grep'),
        optimize: (cmds) => `grep ${this.extractPattern(cmds[1])} ${this.extractFilename(cmds[0])}`
      },
      {
        match: (cmds) => cmds[0].includes('find') && cmds[1].includes('xargs'),
        optimize: (cmds) => `find ${this.extractFindOptions(cmds[0])} -exec ${this.extractXargsCommand(cmds[1])} \\;`
      }
    ];
    
    // Try to match and apply optimization patterns
    for (const pattern of patterns) {
      if (pattern.match(commands)) {
        return pattern.optimize(commands);
      }
    }
    
    // No specific optimization found, return a simple pipe by default
    return commands.join(' | ');
  }

  /**
   * Counts occurrences of a command sequence in command history
   */
  countSequence(commandHistory, targetSequence) {
    let count = 0;
    
    // Check each possible starting position
    for (let i = 0; i <= commandHistory.length - targetSequence.length; i++) {
      let matches = true;
      
      // Check if sequence matches at this position
      for (let j = 0; j < targetSequence.length; j++) {
        if (commandHistory[i + j] !== targetSequence[j]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        count++;
        // Skip ahead to avoid overlapping matches
        i += targetSequence.length - 1;
      }
    }
    
    return count;
  }

  /**
   * Generates statistical insights about command usage patterns
   */
  generateStatisticalInsights(commandHistory) {
    const baseCommands = commandHistory.map(entry => this.extractBaseCommand(entry.command));
    const uniqueCommands = new Set(baseCommands.filter(Boolean));
    
    // Calculate command diversity and common patterns
    return {
      uniqueCommandCount: uniqueCommands.size,
      totalCommandsAnalyzed: commandHistory.length,
      mostUsedCommands: this.getMostUsedCommands(baseCommands, 5),
      commandCategoryDistribution: this.categorizeCommands(baseCommands),
      timeOfDayPatterns: this.analyzeTimePatterns(commandHistory)
    };
  }

  // Helper methods

  extractBaseCommand(commandString) {
    if (!commandString) return null;
    return commandString.trim().split(' ')[0];
  }

  createScriptSuggestion(sequence) {
    const scriptName = sequence
      .map(cmd => this.extractBaseCommand(cmd))
      .filter(Boolean)
      .join('_')
      .substring(0, 20);
    
    return `#!/bin/bash\n\n# Auto-generated script for common workflow\n${sequence.join('\n')}`;
  }

  shouldUsePipes(commands) {
    // Check if this sequence looks like a pipeline (output of one feeds to next)
    for (let i = 0; i < commands.length - 1; i++) {
      if (commands[i].includes('grep') || 
          commands[i].includes('awk') || 
          commands[i].includes('sort')) {
        return true;
      }
    }
    return false;
  }

  areRelatedTextCommands(cmd1, cmd2) {
    // Check if commands are likely part of the same pipeline
    const cmd1Base = this.extractBaseCommand(cmd1);
    const cmd2Base = this.extractBaseCommand(cmd2);
    
    return this.textProcessingCommands.includes(cmd1Base) && 
           this.textProcessingCommands.includes(cmd2Base);
  }

  getMostUsedCommands(commands, limit) {
    const counts = {};
    commands.forEach(cmd => {
      if (!cmd) return;
      counts[cmd] = (counts[cmd] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([command, count]) => ({ command, count }));
  }

  categorizeCommands(commands) {
    const categories = {
      'File Operations': ['ls', 'cd', 'cp', 'mv', 'rm', 'mkdir', 'touch'],
      'Text Processing': this.textProcessingCommands,
      'System Admin': ['ps', 'top', 'kill', 'systemctl', 'service', 'df', 'du'],
      'Network': ['ping', 'curl', 'wget', 'ssh', 'nslookup', 'dig', 'netstat'],
      'Development': ['git', 'npm', 'node', 'python', 'make', 'gcc', 'docker'],
      'Other': []
    };
    
    const distribution = {};
    Object.keys(categories).forEach(cat => distribution[cat] = 0);
    
    commands.forEach(cmd => {
      let categorized = false;
      for (const [category, categoryCommands] of Object.entries(categories)) {
        if (categoryCommands.includes(cmd)) {
          distribution[category]++;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        distribution['Other']++;
      }
    });
    
    return distribution;
  }

  analyzeTimePatterns(commandHistory) {
    const hourCounts = Array(24).fill(0);
    
    commandHistory.forEach(entry => {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts[hour]++;
      }
    });
    
    // Find peak hours
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    return {
      hourlyDistribution: hourCounts,
      peakActivityHour: peakHour,
      peakActivityPeriod: this.getPeriodOfDay(peakHour)
    };
  }

  getPeriodOfDay(hour) {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Night';
  }

  // Pattern extraction helpers

  extractPattern(grepCommand) {
    const matches = grepCommand.match(/grep\s+['"](.*?)['"]|grep\s+(\S+)/);
    return matches ? (matches[1] || matches[2]) : '';
  }

  extractSortOptions(sortCommand) {
    const options = sortCommand.match(/sort\s+(-\S+)/);
    return options ? options[1] : '';
  }

  extractFilename(catCommand) {
    const filename = catCommand.match(/cat\s+(\S+)/);
    return filename ? filename[1] : '';
  }

  extractFindOptions(findCommand) {
    const options = findCommand.match(/find\s+(.*?)(-name|-type)/);
    return options ? options[1].trim() : '.';
  }

  extractXargsCommand(xargsCommand) {
    const command = xargsCommand.match(/xargs\s+(.*)/);
    return command ? command[1] : '';
  }

  getOptimizationDescription(cmd1, cmd2, optimized) {
    if (optimized.includes('grep -E')) {
      return 'Combined multiple grep commands into a single pattern with extended regex';
    } else if (optimized.includes('sort') && optimized.includes('uniq')) {
      return 'Optimized sort and uniq operations with count and numeric reverse sort';
    } else if (optimized.includes('grep') && cmd1.includes('cat')) {
      return 'Simplified by directly grepping the file instead of using cat';
    } else if (optimized.includes('find') && optimized.includes('-exec')) {
      return 'Improved find command by using -exec instead of piping to xargs';
    } else if (optimized.includes('|')) {
      return 'Connected commands together using pipe for more efficient data flow';
    }
    return 'Optimized command sequence for better performance and readability';
  }

/**
 * CommandPatternAnalyzer Service
 * 
 * Provides a comprehensive system for detecting patterns in command sequences,
 * recognizing workflows, and suggesting optimizations for terminal commands.
 *
 * @module CommandPatternAnalyzer
 */

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - The regex or string pattern to match
 * @property {string} name - The friendly name of the pattern
 * @property {string} description - Description of what the pattern does
 * @property {string} [suggestion] - Optional suggestion for optimizing the command
 * @property {string} [category] - The category this pattern belongs to
 */

/**
 * @typedef {Object} CommandWorkflow
 * @property {string} name - The name of the workflow
 * @property {string} description - Description of the workflow
 * @property {Array<string>} patterns - Array of commands or regex patterns that make up this workflow
 * @property {number} matchThreshold - Number of patterns needed to identify this workflow
 * @property {string} [suggestedCommand] - An optional suggested command or alias
 */

/**
 * @typedef {Object} WorkflowSuggestion
 * @property {string} workflowName - The name of the detected workflow
 * @property {string} description - Description of the workflow
 * @property {Array<string>} detectedCommands - Commands that were detected as part of this workflow
 * @property {string} [suggestion] - Suggestion for optimizing the workflow
 * @property {Array<string>} [missingCommands] - Optional commands that are usually part of this workflow but were not detected
 */

/**
 * @typedef {Object} CommandOptimization
 * @property {string} originalCommand - The original command that was analyzed
 * @property {string} optimizedCommand - The suggested optimized version
 * @property {string} description - Description of why this optimization is recommended
 * @property {string} category - Category of the optimization (performance, shorthand, etc.)
 */

/**
 * Service for analyzing command patterns and suggesting optimizations
 */
class CommandPatternAnalyzer {
  /**
   * Create a new CommandPatternAnalyzer
   * @param {string} shellType - The type of shell (bash, zsh, fish)
   */
  constructor(shellType = 'bash') {
    this.shellType = shellType;
    this.commandHistory = [];
    this.initializePatternDatabases();
  }

  /**
   * Initialize all pattern databases used for analysis
   * @private
   */
  initializePatternDatabases() {
    // Initialize pattern databases based on shell type
    this.repetitivePatterns = this.getRepetitivePatterns();
    this.sequentialPatterns = this.getSequentialPatterns();
    this.gitWorkflows = this.getGitWorkflows();
    this.nodeWorkflows = this.getNodeWorkflows();
    this.dockerWorkflows = this.getDockerWorkflows();
    this.filesystemWorkflows = this.getFilesystemWorkflows();
    this.networkWorkflows = this.getNetworkWorkflows(); 
    this.commandOptimizations = this.getCommandOptimizations();
  }

  /**
   * Get patterns for detecting repetitive commands
   * @returns {Array<CommandPattern>} Array of repetitive command patterns
   * @private
   */
  getRepetitivePatterns() {
    // Common patterns across all shells
    const commonPatterns = [
      {
        pattern: /^(.*?)\s*&&\s*\1$/,
        name: 'Duplicate Command',
        description: 'The same command is repeated using && operator',
        suggestion: 'Consider using a loop or function if you need to run the command multiple times'
      },
      {
        pattern: /^(.+?)\s*;\s*\1$/,
        name: 'Sequential Duplicate',
        description: 'The same command is executed multiple times sequentially',
        suggestion: 'Consider using a loop for repeating the same command'
      },
      {
        pattern: /^(!!\s*;?\s*){2,}$/,
        name: 'History Repetition',
        description: 'Repeatedly executing the previous command',
        suggestion: 'Consider creating an alias or function for commands you run frequently'
      },
      {
        pattern: /^([^|&;]+)((\s*;\s*)\1){2,}$/,
        name: 'Triple+ Repetition',
        description: 'The same command is executed 3 or more times',
        suggestion: 'Use a for loop: for i in {1..N}; do command; done'
      }
    ];

    // Shell-specific patterns
    const shellSpecificPatterns = {
      bash: [
        {
          pattern: /for\s+\w+\s+in\s+\$\(seq\s+\d+\s+\d+\)/,
          name: 'Bash Sequence Loop',
          description: 'Using seq in a for loop',
          suggestion: 'Consider using bash range: for i in {1..10}; do command; done'
        }
      ],
      zsh: [
        {
          pattern: /repeat\s+\d+\s+/,
          name: 'Zsh Repeat',
          description: 'Using the zsh repeat construct',
          suggestion: 'This is already an efficient way to repeat commands in zsh'
        }
      ],
      fish: [
        {
          pattern: /for\s+\w+\s+in\s+\(seq\s+\d+\s+\d+\)/,
          name: 'Fish Sequence Loop',
          description: 'Using seq in a fish for loop',
          suggestion: 'This is a common pattern in fish shell'
        }
      ]
    };
    
    // Combine common patterns with shell-specific patterns
    return [...commonPatterns, ...(shellSpecificPatterns[this.shellType] || [])];
  }

  /**
   * Get patterns for detecting sequential command patterns
   * @returns {Array<CommandPattern>} Array of sequential command patterns
   * @private
   */
  getSequentialPatterns() {
    // Common patterns across all shells
    const commonPatterns = [
      {
        pattern: /^cd\s+.+?\s*;\s*ls(\s+-\w+)?$/,
        name: 'Change Directory and List',
        description: 'Change directory and list contents',
        suggestion: 'Consider creating an alias like "cdls" for this common pattern'
      },
      {
        pattern: /^mkdir\s+(.+?)\s*;\s*cd\s+\1$/,
        name: 'Make Directory and Enter',
        description: 'Create a directory and then change to it',
        suggestion: 'Consider creating a function like mkcd() { mkdir -p "$1" && cd "$1"; }'
      },
      {
        pattern: /^(grep|find)\s+.+?\s*\|\s*(grep|sed|awk)\s+.+?$/,
        name: 'Search and Filter',
        description: 'Search for data and filter the results',
        suggestion: 'You can often combine these operations into a single command with more complex regex'
      },
      {
        pattern: /^cp\s+(.+?)\s+(.+?)\s*;\s*cd\s+\2$/,
        name: 'Copy and Navigate',
        description: 'Copy files and then navigate to the destination',
        suggestion: 'Consider creating a function for this operation if you do it frequently'
      }
    ];

    // Shell-specific patterns
    const shellSpecificPatterns = {
      bash: [
        {
          pattern: /;\s*sudo\s+!!\s*$/,
          name: 'Retry as Root',
          description: 'Retry the previous command with sudo',
          suggestion: 'You can use "sudo !!" directly without the preceding command'
        }
      ],
      zsh: [
        {
          pattern: /;\s*sudo\s+!!\s*$/,
          name: 'Retry as Root',
          description: 'Retry the previous command with sudo',
          suggestion: 'You can use "sudo !!" directly without the preceding command'
        }
      ],
      fish: [
        {
          pattern: /;\s*sudo\s+!!\s*$/,
          name: 'Retry as Root in Fish',
          description: 'Trying to retry the previous command with sudo in fish',
          suggestion: 'In fish, use "sudo $history[1]" instead of "sudo !!"'
        }
      ]
    };
    
    // Combine common patterns with shell-specific patterns
    return [...commonPatterns, ...(shellSpecificPatterns[this.shellType] || [])];
  }

  /**
   * Get patterns for Git workflows
   * @returns {Array<CommandWorkflow>} Array of Git workflow patterns
   * @private
   */
  getGitWorkflows() {
    return [
      {
        name: 'Git Feature Branch Workflow',
        description: 'Creating and working with a feature branch',
        patterns: [
          /git\s+checkout\s+-b\s+\w+/,
          /git\s+add\s+/,
          /git\s+commit\s+-m/,
          /git\s+push\s+(\w+\s+)?\w+/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider using "git flow feature start/finish" for structured feature development'
      },
      {
        name: 'Git Pull Request Workflow',
        description: 'Creating and submitting a pull request',
        patterns: [
          /git\s+checkout\s+-b\s+\w+/,
          /git\s+add\s+/,
          /git\s+commit\s+-m/,
          /git\s+push\s+(\w+\s+)?\w+/,
          /git\s+checkout\s+\w+/
        ],
        matchThreshold: 4,
        suggestedCommand: 'Consider using a git GUI or hub CLI for PR management'
      },
      {
        name: 'Git Stash Workflow',
        description: 'Temporarily saving changes with stash',
        patterns: [
          /git\s+stash(\s+save)?/,
          /git\s+checkout\s+\w+/,
          /git\s+stash\s+(pop|apply)/
        ],
        matchThreshold: 2,
        suggestedCommand: 'Use named stashes with "git stash save "message"" for better organization'
      },
      {
        name: 'Git Rebase Workflow',
        description: 'Rebasing a branch onto another',
        patterns: [
          /git\s+checkout\s+\w+/,
          /git\s+pull(\s+--rebase)?/,
          /git\s+rebase\s+\w+/,
          /git\s+push\s+--force/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider using "git pull --rebase" to simplify the rebase process'
      },
      {
        name: 'Git Commit Amend Workflow',
        description: 'Amending the last commit',
        patterns: [
          /git\s+add\s+/,
          /git\s+commit\s+--amend/,
          /git\s+push\s+--force/
        ],
        matchThreshold: 2,
        suggestedCommand: 'Be cautious with force pushing to shared branches'
      }
    ];
  }

  /**
   * Get patterns for Node.js/npm workflows
   * @returns {Array<CommandWorkflow>} Array of Node.js workflow patterns
   * @private
   */
  getNodeWorkflows() {
    return [
      {
        name: 'Node Project Setup',
        description: 'Setting up a new Node.js project',
        patterns: [
          /mkdir\s+\w+/,
          /cd\s+\w+/,
          /npm\s+init(\s+-y)?/,
          /npm\s+install/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider using npm init -y for quick project initialization'
      },
      {
        name: 'Node Development Workflow',
        description: 'Common Node.js development tasks',
        patterns: [
          /npm\s+install/,
          /npm\s+(run\s+)?start/,
          /npm\s+(run\s+)?test/,
          /npm\s+(run\s+)?build/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider using "npm-run-all" for running multiple scripts'
      },
      {
        name: 'Node Dependency Management',
        description: 'Managing dependencies in a Node.js project',
        patterns: [
          /npm\s+install\s+--save(\s+\w+)+/,
          /npm\s+install\s+--save-dev(\s+\w+)+/,
          /npm\s+uninstall(\s+\w+)+/,
          /npm\s+update/
        ],
        matchThreshold: 2,
        suggestedCommand: 'Use npm install --save-prod/--save-dev or shorthand -P/-D'
      },
      {
        name: 'Node Package Publishing',
        description: 'Publishing a package to npm',
        patterns: [
          /npm\s+version\s+(patch|minor|major)/,
          /npm\s+run\s+build/,
          /npm\s+run\s+test/,
          /npm\s+publish/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider creating an npm "prepublishOnly" script to automate test and build'
      },
      {
        name: 'Yarn Workflow',
        description: 'Using Yarn package manager',
        patterns: [
          /yarn\s+add/,
          /yarn\s+remove/,
          /yarn\s+start/,
          /yarn\s+build/,
          /yarn\s+test/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Consider using yarn workspaces for monorepo management'
      }
    ];
  }

  /**
   * Get patterns for Docker workflows
   * @returns {Array<CommandWorkflow>} Array of Docker workflow patterns
   * @private
   */
  getDockerWorkflows() {
    return [
      {
        name: 'Docker Build and Run',
        description: 'Building and running a Docker container',
        patterns: [
          /docker\s+build\s+-t\s+\w+/,
          /docker\s+run\s+/,
          /docker\s+ps/
        ],
        matchThreshold: 2,
        suggestedCommand: 'Consider using Docker Compose for more complex applications'
      },
      {
        name: 'Docker Compose Workflow',
        description: 'Using Docker Compose to manage services',
        patterns: [
          /docker-compose\s+build/,
          /docker-compose\s+up/,
          /docker-compose\s+down/,
          /docker-compose\s+logs/
        ],
        matchThreshold: 3,
        suggestedCommand: 'Use "docker-compose up -d && docker-compose logs -f" to start services and follow logs'

/**
 * CommandPatternAnalyzer
 * 
 * Advanced service for analyzing command patterns and generating intelligent suggestions.
 * Enhances the basic pattern recognition of the aiService with more sophisticated algorithms.
 */

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - Pattern name/type
 * @property {string} suggestion - Suggested command
 * @property {string} description - Pattern description
 * @property {number} [confidence] - Confidence score (0-100)
 * @property {string} [shellType] - Shell type this pattern applies to (bash, zsh, fish, etc.)
 */

/**
 * @typedef {Object} OptimizationSuggestion
 * @property {string} original - Original command
 * @property {string} optimized - Optimized version
 * @property {string} explanation - Explanation of the optimization
 * @property {string} [category] - Optimization category
 * @property {string} [shellType] - Shell type this optimization applies to
 */

class CommandPatternAnalyzer {
  constructor() {
    // Common shell patterns by shell type
    this.shellPatterns = {
      bash: this.getBashPatterns(),
      zsh: this.getZshPatterns(),
      fish: this.getFishPatterns(),
      all: this.getGenericPatterns() // Patterns that work in all shells
    };
    
    // Command workflows by category
    this.workflowPatterns = {
      git: this.getGitWorkflows(),
      docker: this.getDockerWorkflows(),
      npm: this.getNpmWorkflows(),
      filesystem: this.getFilesystemWorkflows(),
      network: this.getNetworkWorkflows()
    };
    
    // Common command optimizations
    this.optimizations = this.getCommandOptimizations();
    
    // Pattern detection strategies
    this.detectionStrategies = [
      this.detectRepetitiveCommands,
      this.detectSequentialPatterns,
      this.detectWorkflowPatterns,
      this.detectInefficiencies
    ];
  }
  
  /**
   * Analyze command history to detect patterns and generate suggestions
   * 
   * @param {string[]} commandHistory - List of recent commands (most recent first)
   * @param {Object} context - Terminal context data
   * @param {string} [shellType='bash'] - Shell type
   * @returns {CommandPattern[]} - Detected patterns and suggestions
   */
  analyzePatterns(commandHistory, context = {}, shellType = 'bash') {
    if (!commandHistory || commandHistory.length < 2) {
      return [];
    }
    
    const patterns = [];
    
    // Apply each detection strategy
    for (const detectFn of this.detectionStrategies) {
      const detectedPatterns = detectFn.call(this, commandHistory, context, shellType);
      patterns.push(...detectedPatterns);
    }
    
    // Get shell-specific patterns
    const shellSpecificPatterns = this.getShellSpecificPatterns(commandHistory, shellType);
    patterns.push(...shellSpecificPatterns);
    
    // Deduplicate and sort by confidence
    const uniquePatterns = this.deduplicatePatterns(patterns);
    const sortedPatterns = this.sortPatternsByConfidence(uniquePatterns);
    
    return sortedPatterns;
  }
  
  /**
   * Deduplicate patterns based on suggestion
   * 
   * @param {CommandPattern[]} patterns - Detected patterns
   * @returns {CommandPattern[]} - Deduplicated patterns
   */
  deduplicatePatterns(patterns) {
    const uniquePatterns = [];
    const seen = new Set();
    
    for (const pattern of patterns) {
      const key = `${pattern.suggestion}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    }
    
    return uniquePatterns;
  }
  
  /**
   * Sort patterns by confidence score
   * 
   * @param {CommandPattern[]} patterns - Patterns to sort
   * @returns {CommandPattern[]} - Sorted patterns
   */
  sortPatternsByConfidence(patterns) {
    return [...patterns].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }
  
  /**
   * Detect repetitive commands in history
   * 
   * @param {string[]} commandHistory - Command history
   * @returns {CommandPattern[]} - Detected patterns
   */
  detectRepetitiveCommands(commandHistory) {
    const patterns = [];
    const commandCounts = {};
    
    // Count command frequencies
    commandHistory.forEach(cmd => {
      const baseCmd = cmd.trim();
      commandCounts[baseCmd] = (commandCounts[baseCmd] || 0) + 1;
    });
    
    // Find commands used multiple times
    Object.entries(commandCounts)
      .filter(([cmd, count]) => count > 1)
      .forEach(([cmd, count]) => {
        const confidence = Math.min(100, count * 20); // Higher count = higher confidence
        
        patterns.push({
          pattern: 'Repeated Command',
          suggestion: cmd,
          description: `You've used this command ${count} times recently`,
          confidence
        });
        
        // For really frequent commands, suggest creating an alias
        if (count >= 3 && cmd.includes(' ')) {
          const aliasName = this.suggestAliasName(cmd);
          patterns.push({
            pattern: 'Create Alias',
            suggestion: `alias ${aliasName}='${cmd}'`,
            description: `Create an alias for this frequently used command`,
            confidence: confidence - 10 // Slightly lower confidence than the command itself
          });
        }
      });
    
    return patterns;
  }
  
  /**
   * Detect sequential patterns (commands that are often run in sequence)
   * 
   * @param {string[]} commandHistory - Command history
   * @returns {CommandPattern[]} - Detected patterns
   */
  detectSequentialPatterns(commandHistory) {
    const patterns = [];
    
    // Check for common sequential patterns
    const sequentialPatterns = [
      {
        match: this.matchSequence(['cd', 'ls'], commandHistory),
        suggestion: 'ls',
        description: 'List files in the new directory',
        confidence: 80
      },
      {
        match: this.matchSequence(['git add', 'git commit'], commandHistory),
        suggestion: 'git commit -m "commit message"',
        description: 'Commit the changes you just added',
        confidence: 85
      },
      {
        match: this.matchSequence(['git commit', 'git push'], commandHistory),
        suggestion: 'git push',
        description: 'Push your commits to the remote repository',
        confidence: 90
      },
      {
        match: this.matchSequence(['npm install', 'npm start'], commandHistory),
        suggestion: 'npm start',
        description: 'Start the npm application after installation',
        confidence: 75
      },
      {
        match: this.matchSequence(['mkdir', 'cd'], commandHistory),
        suggestion: `cd ${this.extractDirFromMkdir(commandHistory)}`,
        description: 'Change to the directory you just created',
        confidence: 70
      }
    ];
    
    // Add all matched patterns
    sequentialPatterns
      .filter(pattern => pattern.match)
      .forEach(pattern => {
        patterns.push({
          pattern: 'Sequential Commands',
          suggestion: pattern.suggestion,
          description: pattern.description,
          confidence: pattern.confidence
        });
      });
    
    return patterns;
  }
  
  /**
   * Detect if a command workflow pattern is in progress
   * 
   * @param {string[]} commandHistory - Command history
   * @param {Object} context - Terminal context
   * @returns {CommandPattern[]} - Detected workflow patterns
   */
  detectWorkflowPatterns(commandHistory, context) {
    const patterns = [];
    
    // Check for Git workflow
    if (this.isGitRepository(context)) {
      patterns.push(...this.analyzeGitWorkflow(commandHistory));
    }
    
    // Check for NPM/Node project
    if (this.isNodeProject(context)) {
      patterns.push(...this.analyzeNodeWorkflow(commandHistory));
    }
    
    // Check for Docker workflow
    if (this.isDockerProject(context)) {
      patterns.push(...this.analyzeDockerWorkflow(commandHistory));
    }
    
    return patterns;
  }
  
  /**
   * Detect inefficient command usage
   * 
   * @param {string[]} commandHistory - Command history
   * @returns {CommandPattern[]} - Detected inefficiencies
   */
  detectInefficiencies(commandHistory) {
    const patterns = [];
    
    // Check for inefficient commands
    for (const cmd of commandHistory) {
      // Find optimizations for this command
      const optimization = this.findOptimization(cmd);
      if (optimization) {
        patterns.push({
          pattern: 'Command Optimization',
          suggestion: optimization.optimized,
          description: optimization.explanation,
          confidence: 65
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Get shell-specific patterns
   * 
   * @param {string[]} commandHistory - Command history
   * @param {string} shellType - Shell type
   * @returns {CommandPattern[]} - Shell-specific patterns
   */
  getShellSpecificPatterns(commandHistory, shellType) {
    const patterns = [];
    
    // Get patterns specific to this shell
    const shellPatterns = [...(this.shellPatterns[shellType] || []), ...this.shellPatterns.all];
    
    // Check if any shell patterns match the command history
    for (const shellPattern of shellPatterns) {
      if (this.matchShellPattern(shellPattern, commandHistory)) {
        patterns.push({
          pattern: shellPattern.name,
          suggestion: shellPattern.suggestion,
          description: shellPattern.description,
          confidence: shellPattern.confidence || 60,
          shellType
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Check if a shell pattern matches command history
   * 
   * @param {Object} pattern - Shell pattern to check
   * @param {string[]} commandHistory - Command history
   * @returns {boolean} - True if pattern matches
   */
  matchShellPattern(pattern, commandHistory) {
    if (pattern.matchLastCommand) {
      const lastCommand = commandHistory[0];
      return lastCommand && pattern.matchLastCommand.test(lastCommand);
    }
    
    if (pattern.matchSequence && pattern.matchSequence.length > 0) {
      return this.matchSequence(pattern.matchSequence, commandHistory);
    }
    
    return false;
  }
  
  /**
   * Check if a sequence of commands appears in history
   * 
   * @param {string|RegExp[]} sequence - Command sequence to match
   * @param {string[]} commandHistory - Command history
   * @returns {boolean} - True if sequence matches
   */
  matchSequence(sequence, commandHistory) {
    if (commandHistory.length < sequence.length) return false;
    
    for (let i = 0; i < sequence.length; i++) {
      const patternCmd = sequence[i];
      const historyCmd = commandHistory[i];
      
      if (!historyCmd) return false;
      
      // Match using string prefix or regex
      const match = typeof patternCmd === 'string' 
        ? historyCmd.startsWith(patternCmd)
        : patternCmd.test(historyCmd);
        
      if (!match) return false;
    }
    
    return true;
  }
  
  /**
   * Extract directory name from mkdir command
   * 
   * @param {string[]} commandHistory - Command history
   * @returns {string} - Extracted directory name or empty string
   */
  extractDirFromMkdir(commandHistory) {
    for (const cmd of commandHistory) {
      if (cmd.startsWith('mkdir ')) {
        const parts = cmd.split(' ');
        if (parts.length > 1) {
          // Take the last part as the directory name (handles mkdir -p)
          return parts[parts.length - 1];
        }
      }
    }
    return '';
  }
  
  /**
   * Find optimization for a command
   * 
   * @param {string} command - Command to optimize
   * @returns {OptimizationSuggestion|null} - Optimization or null
   */
  findOptimization(command) {
    for (const opt of this.optimizations) {
      if (opt.match.test(command)) {
        return {
          original: command,
          optimized: command.replace(opt.match, opt.replace),
          explanation: opt.explanation,
          category: opt.category
        };
      }
    }
    return null;
  }
  
  /**
   * Suggest alias name for a command
   * 
   * @param {string} command - Command to create alias for
   * @returns {string} - Suggested alias name
   */
  suggestAliasName(command) {
    // Extract the main command and first param
    const parts = command.split(' ');
    const mainCmd = parts[0];
    
    // For git commands, use g + command
    if (mainCmd === 'git' && parts.length > 1) {
      return `g${parts[1]}`;
    }
    
    // For docker commands, use d + command
    if (mainCmd === 'docker' && parts.length > 1) {
      return `d${parts[1]}`;
    }
    
    // For npm commands, use n + command
    if (mainCmd === 'npm' && parts.length > 1) {
      return `n${parts[1]}`;
    }
    
    // For other commands, use abbreviation
    return mainCmd.substring(0, 1) + (parts[1] ? parts[1].substring(0, 2) : '');
  }
  
  /**
   * Check if current directory is a Git repository
   * 
   * @param {Object} context - Terminal context
   * @returns {boolean} - True if in a Git repository
   */
  isGitRepository(context) {
    // Check recent commands for git commands
    const { recentCommands = [] } = context;
    return recentCommands.some(cmd => cmd.startsWith('git '));
  }
  
  /**
   * Check if current directory is a Node.js project
   * 
   * @param {Object} context - Terminal context
   * @returns {boolean} - True if in a Node.js project
   */
  isNodeProject(context) {
    // Check recent commands for npm/node/yarn commands
    const { recentCommands = [] } = context;
    return recentCommands.some(cmd => /^(npm|yarn|node) /.test(cmd));
  }
  
  /**
   * Check if current directory is a Docker project
   * 
   * @param {Object} context - Terminal context
   * @returns {boolean} - True if in a Docker project
   */
  isDockerProject(context) {
    // Check recent commands for docker commands
    const { recentCommands = [] } = context;
    return recentCommands.some(cmd => cmd.startsWith('docker ') || cmd.includes('dockerfile') || cmd.includes('docker-compose'));
  }
  
  /**
   * Get Bash-specific command patterns
   * 
   * @returns {Object[]} - Bash command patterns
   */
  getBashPatterns() {
    return [
      {
        name: 'Bash History Navigation',
        matchLastCommand: /^history$/,
        suggestion: 'CTRL+R',
        description: 'Use CTRL+R to interactively search command history',
        confidence: 75
      },
      {
        name: 'Bash Job Control',
        matchLastCommand: /^jobs$/,
        suggestion: 'fg %1',
        description: 'Use fg to bring background jobs to foreground',
        confidence: 70
      },
      {
        name: 'Bash Command Substitution',
        matchLastCommand: /`.*`/,
        suggestion: '$(command)',
        description: 'Use $(command) for command substitution instead of backticks',
        confidence: 65
      },
      {
        name: 'Bash For Loop',
        matchLastCommand: /^for\s+\w+\s+in/,
        suggestion: 'for i in {1..10}; do echo $i; done',
        description: 'Use brace expansion for numeric sequences in for loops',
        confidence: 60
      },
      {
        name: 'Bash Tab Completion',
        matchLastCommand: /\w+$/,
        suggestion: 'TAB key',
        description: 'Use TAB for command and filename completion',
        confidence: 50
      }
    ];
  }
  
  /**
   * Get Zsh-specific command patterns
   * 
   * @returns {Object[]} - Zsh command patterns
   */
  getZshPatterns() {
    return [
      {
        name: 'Zsh Globbing',
        matchLastCommand: /ls \*\.\w+$/,
        suggestion: 'ls **/*.ext',
        description: 'Use ** glob for recursive matching in zsh',
        confidence: 75
      },
      {
        name: 'Zsh Extended Globbing',
        matchLastCommand: /^ls/,
        suggestion: 'ls ^*.tmp',
        description: 'Use ^ for negation in zsh globbing patterns',
        confidence: 70
      },
      {
        name: 'Zsh Directory Stack',
        matchLastCommand: /^pushd|popd$/,
        suggestion: 'cd -',
        description: 'Use cd - to navigate to previous directory',
        confidence: 80
      },
      {
        name: 'Zsh Spell Correction',
        matchLastCommand: /command not found/,
        suggestion: 'setopt CORRECT',
        description: 'Enable zsh spelling correction with setopt CORRECT',
        confidence: 65
      },
      {
        name: 'Zsh Named Directories',
        matchSequence: ['cd /long/path/to/directory', 'cd /long/path'],
        suggestion: 'hash -d proj=/long/path/to/directory',
        description: 'Create named directories with hash -d for faster navigation',
        confidence: 75
      }
    ];
  }
  
  /**
   * Get Fish-specific command patterns
   * 
   * @returns {Object[]} - Fish command patterns
   */
  getFishPatterns() {
    return [
      {
        name: 'Fish Autosuggestions',
        matchLastCommand: /^history/,
        suggestion: 'Use → key',
        description: 'Press the right arrow key to accept autosuggestions',
        confidence: 90
      },
      {
        name: 'Fish Functions',
        matchLastCommand: /^function\s+\w+/,
        suggestion: 'funcsave function_name',
        description: 'Use funcsave to persist functions across sessions',
        confidence: 75
      },
      {
        name: 'Fish Abbreviations',
        matchLastCommand: /^abbr/,
        suggestion: 'abbr -a gs "git status"',
        description: 'Create abbreviations for common commands',
        confidence: 80
      },
      {
        name: 'Fish Path Variable',
        matchLastCommand: /^set -x PATH/,
        suggestion: 'fish_add_path /new/path',
        description: 'Use fish_add_path to add directories to PATH variable',
        confidence: 85
      },
      {
        name: 'Fish Command Substitution',
        matchLastCommand: /\$\(.*\)/,
        suggestion: '(command)',
        description: 'Use (command) for command substitution in fish',
        confidence: 70
      }
    ];
  }
  
  /**
   * Get generic command patterns applicable to all shells
   * 
   * @returns {Object[]} - Generic command patterns
   */
  getGenericPatterns() {
    return [
      {
        name: 'Find Command',
        matchLastCommand: /^find\s+\.\s+-name/,
        suggestion: 'find . -type f -name "*.js" -exec grep -l "pattern" {} \\;',
        description: 'Combine find with grep to search file contents',
        confidence: 70
      },
      {
        name: 'Grep Command',
        matchLastCommand: /^grep\s+-r/,
        suggestion: 'grep -r --include="*.js" "pattern" .',
        description: 'Use --include to filter files when grepping',
        confidence: 75
      },
      {
        name: 'Output Redirection',
        matchLastCommand: />\s*\/dev\/null/,
        suggestion: 'command &>/dev/null',
        description: 'Use &> to redirect both stdout and stderr',
        confidence: 65
      },
      {
        name: 'Disk Usage',
        matchLastCommand: /^du\s+-h/,
        suggestion: 'du -h --max-depth=1 | sort -hr',
        description: 'Combine du with sort to see largest directories first',
        confidence: 80
      },
      {
        name: 'Process Management',
        matchLastCommand: /^ps\s+aux/,
        suggestion: 'ps aux | grep "process name"',
        description: 'Filter ps output with grep to find specific processes',
        confidence: 75
      }
    ];
  }
  
  /**
   * Get Git workflow patterns
   * 
   * @returns {Object[]} - Git workflow patterns
   */
  getGitWorkflows() {
    return [
      {
        name: 'Git Feature Branch',
        commands: ['git checkout -b', 'git add', 'git commit', 'git push'],
        nextCommand: 'git push --set-upstream origin',
        description: 'Set upstream branch for the new feature branch'
      },
      {
        name: 'Git Pull Request',
        commands: ['git push', 'git checkout main', 'git pull'],
        nextCommand: 'git merge',
        description: 'Merge changes after pull request is approved'
      },
      {
        name: 'Git Stash Workflow',
        commands: ['git stash', 'git checkout', 'git pull'],
        nextCommand: 'git stash pop',
        description: 'Apply stashed changes after switching branches'
      },
      {
        name: 'Git Rebase Workflow',
        commands: ['git checkout main', 'git pull', 'git checkout feature'],
        nextCommand: 'git rebase main',
        description: 'Rebase feature branch onto updated main branch'
      },
      {
        name: 'Git Conflict Resolution',
        commands: ['git merge', 'git status'],
        nextCommand: 'git add . && git merge --continue',
        description: 'Continue merge after resolving conflicts'
      }
    ];
  }
  
  /**
   * Get Docker workflow patterns
   * 
   * @returns {Object[]} - Docker workflow patterns
   */
  getDockerWorkflows() {
    return [
      {
        name: 'Docker Build and Run',
        commands: ['docker build -t', 'docker images'],
        nextCommand: 'docker run -d -p 8080:80',
        description: 'Run container with port mapping after building image'
      },
      {
        name: 'Docker Compose Workflow',
        commands: ['docker-compose up -d', 'docker-compose ps'],
        nextCommand: 'docker-compose logs -f',
        description: 'View logs after starting services with docker-compose'
      },
      {
        name: 'Docker Container Management',
        commands: ['docker ps', 'docker exec -it'],
        nextCommand: 'docker cp container_name:/path/file.txt .',
        description: 'Copy files from container to host'
      },
      {
        name: 'Docker Image Cleanup',
        commands: ['docker images', 'docker rmi'],
        nextCommand: 'docker system prune -a',
        description: 'Remove unused images, containers, and networks'
      },
      {
        name: 'Docker Volume Management',
        commands: ['docker volume ls', 'docker volume create'],
        nextCommand: 'docker run -v volume_name:/container/path',
        description: 'Use volume in a container after creating it'
      }
    ];
  }
  
  /**
   * Get NPM workflow patterns
   * 
   * @returns {Object[]} - NPM workflow patterns
   */
  getNpmWorkflows() {
    return [
      {
        name: 'NPM Init Workflow',
        commands: ['npm init', 'mkdir src'],
        nextCommand: 'npm install --save-dev webpack',
        description: 'Set up development dependencies after project initialization'
      },
      {
        name: 'NPM Install and Start',
        commands: ['npm install', 'npm run build'],
        nextCommand: 'npm start',
        description: 'Start application after installing and building'
      },
      {
        name: 'NPM Dependency Update',
        commands: ['npm outdated', 'npm update'],
        nextCommand: 'npm audit fix',
        description: 'Fix security vulnerabilities after updating dependencies'
      },
      {
        name: 'NPM Script Workflow',
        commands: ['npm run test', 'npm run lint'],
        nextCommand: 'npm run build',
        description: 'Build application after testing and linting'
      },
      {
        name: 'NPM Publishing Workflow',
        commands: ['npm version patch', 'npm run build'],
        nextCommand: 'npm publish',
        description: 'Publish package after version bump and build'
      }
    ];
  }
  
  /**
   * Get filesystem workflow patterns
   * 
   * @returns {Object[]} - Filesystem workflow patterns
   */
  getFilesystemWorkflows() {
    return [
      {
        name: 'Directory Creation',
        commands: ['mkdir -p', 'cd'],
        nextCommand: 'touch index.js',
        description: 'Create initial file after setting up directory structure'
      },
      {
        name: 'File Search and Edit',
        commands: ['find . -name "*.js"', 'grep -r "pattern"'],
        nextCommand: 'vi path/to/file.js',
        description: 'Edit file after finding it with search'
      },
      {
        name: 'Archive Extraction',
        commands: ['wget http://example.com/file.tar.gz', 'ls -l file.tar.gz'],
        nextCommand: 'tar -xzf file.tar.gz',
        description: 'Extract archive after downloading'
      },
      {
        name: 'File Permission Management',
        commands: ['ls -l', 'chmod 755'],
        nextCommand: 'chown -R user:group directory',
        description: 'Update ownership after changing permissions'
      },
      {
        name: 'Disk Usage Analysis',
        commands: ['df -h', 'du -h --max-depth=1'],
        nextCommand: 'du -sh */.*',
        description: 'Check size of hidden directories after disk space analysis'
      },
      {
        name: 'Log File Analysis',
        commands: ['ls -ltr /var/log', 'cat /var/log/syslog'],
        nextCommand: 'grep ERROR /var/log/syslog | tail -n 50',
        description: 'Filter error messages from logs after initial inspection'
      }
    ];
  }

  /**
   * Get network workflow patterns
   * 
   * @returns {Object[]} - Network workflow patterns
   */
  getNetworkWorkflows() {
    return [
      {
        name: 'Network Diagnostics',
        commands: ['ping google.com', 'traceroute google.com'],
        nextCommand: 'nslookup google.com',
        description: 'Resolve DNS after testing connectivity'
      },
      {
        name: 'Remote Connection',
        commands: ['ssh user@hostname', 'ls -la'],
        nextCommand: 'scp file.txt user@hostname:/path',
        description: 'Transfer files after establishing SSH connection'
      },
      {
        name: 'Service Management',
        commands: ['systemctl status service', 'journalctl -u service'],
        nextCommand: 'systemctl restart service',
        description: 'Restart service after checking status and logs'
      },
      {
        name: 'HTTP Request',
        commands: ['curl -I https://example.com', 'wget https://example.com'],
        nextCommand: 'curl -s https://example.com | grep "pattern"',
        description: 'Search response content after initial request'
      },
      {
        name: 'Port Scanning',
        commands: ['netstat -tuln', 'ss -tuln'],
        nextCommand: 'lsof -i :80',
        description: 'Check which process is using a specific port'
      }
    ];
  }

  /**
   * Get command optimization patterns
   * 
   * @returns {Object[]} - Command optimization patterns
   */
  getCommandOptimizations() {
    return [
      {
        match: /cat\s+([^\s|>]+)\s+\|\s+grep\s+([^\s]+)/,
        replace: 'grep $2 $1',
        explanation: 'Use grep directly on the file instead of piping from cat',
        category: 'Simplification'
      },
      {
        match: /find\s+([^\s]+)\s+-name\s+["']([^"']+)["']\s+\|\s+xargs\s+([^\s]+)/,
        replace: 'find $1 -name "$2" -exec $3 {} \\;',
        explanation: 'Use find with -exec instead of piping to xargs',
        category: 'Efficiency'
      },
      {
        match: /echo\s+["']?([^|>"']+)["']?\s+>\s+([^\s]+)/,
        replace: 'printf "$1\\n" > $2',
        explanation: 'Use printf instead of echo for more predictable output',
        category: 'Reliability'
      },
      {
        match: /ls\s+-la\s+\|\s+grep\s+([^\s]+)/,
        replace: 'ls -la | grep --color=auto $1',
        explanation: 'Add color to grep output for better readability',
        category: 'Usability'
      },
      {
        match: /for\s+i\s+in\s+\$\(seq\s+(\d+)\s+(\d+)\)/,
        replace: 'for i in {$1..$2}',
        explanation: 'Use brace expansion instead of seq for better performance',
        category: 'Performance'
      }
    ];
  }
