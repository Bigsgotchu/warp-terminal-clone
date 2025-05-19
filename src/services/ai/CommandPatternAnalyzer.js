/**
 * CommandPatternAnalyzer.js
 * 
 * Analyzes terminal command patterns and provides intelligent workflow
 * suggestions based on command history, user behavior, and system context.
 * 
 * This module identifies workflows related to:
 * - File system operations (file navigation, permissions, etc.)
 * - Network operations (connections, downloads, services)
 * - Command optimizations (aliases, pipelines, shortcuts)
 */

class CommandPatternAnalyzer {
  constructor() {
    this.patterns = {
      filesystems: {},
      networks: {},
      optimizations: {}
    };
    
    // Initialize default command pattern recognition
    this.initializePatterns();
  }
  
  /**
   * Initialize built-in command patterns for recognition
   */
  initializePatterns() {
    // File system command patterns
    this.patterns.filesystems = {
      navigation: {
        regex: /^cd\s+(.+)$/,
        followUps: ['ls', 'pwd', 'find']
      },
      fileCreation: {
        regex: /^(touch|nano|vim|mkdir)\s+(.+)$/,
        followUps: ['ls', 'cat', 'cd']
      },
      fileInspection: {
        regex: /^(ls|cat|file|stat|find)\s+(.+)$/,
        followUps: ['cd', 'cp', 'mv', 'rm', 'grep']
      },
      fileTransformation: {
        regex: /^(cp|mv|rm|tar|zip|unzip)\s+(.+)$/,
        followUps: ['ls', 'cd']
      },
      search: {
        regex: /^(find|grep|locate)\s+(.+)$/,
        followUps: ['ls', 'cd', 'xargs', 'cat']
      },
      permissions: {
        regex: /^(chmod|chown|chgrp)\s+(.+)$/,
        followUps: ['ls -la', 'stat']
      }
    };
    
    // Network command patterns
    this.patterns.networks = {
      connectivity: {
        regex: /^(ping|traceroute|nslookup|dig|host|ifconfig|ip)\s+(.+)$/,
        followUps: ['curl', 'wget', 'ssh']
      },
      dataTransfer: {
        regex: /^(curl|wget|scp|rsync)\s+(.+)$/,
        followUps: ['ls', 'cat', 'tar', 'unzip']
      },
      remoteAccess: {
        regex: /^(ssh|telnet|nc)\s+(.+)$/,
        followUps: ['exit', 'scp', 'rsync']
      },
      services: {
        regex: /^(systemctl|service)\s+(status|start|stop|restart)\s+(.+)$/,
        followUps: ['systemctl status', 'ps aux', 'journalctl']
      },
      firewall: {
        regex: /^(iptables|ufw|firewall-cmd)\s+(.+)$/,
        followUps: ['iptables -L', 'ufw status', 'netstat -tulpn']
      },
      ports: {
        regex: /^(netstat|ss|lsof)\s+(.+)$/,
        followUps: ['ps aux', 'kill', 'systemctl']
      }
    };
    
    // Command optimization patterns
    this.patterns.optimizations = {
      aliases: {
        regex: /^alias\s+(.+)=(.+)$/,
        suggestion: command => `Create persistent alias in ~/.bashrc or ~/.zshrc`
      },
      repetition: {
        regex: /^(.+)$/,  // Any command
        checkRepetition: true  // Flag to check if this command appears frequently
      },
      pipes: {
        regex: /^(.+)\|(.+)$/,
        suggestion: (command, history) => this.suggestPipeOptimization(command, history)
      },
      substitution: {
        regex: /^(.+)$/,
        suggestion: command => this.suggestCommandSubstitution(command)
      }
    };
  }
  
  /**
   * Analyze command history to detect patterns and workflows
   * @param {Array} commandHistory - Array of recent command strings
   * @param {Object} context - Terminal context (directory, environment, etc.)
   * @returns {Object} Analysis results with detected patterns
   */
  analyzeCommands(commandHistory, context = {}) {
    if (!commandHistory || commandHistory.length === 0) {
      return { 
        workflows: [],
        suggestions: [] 
      };
    }
    
    // Get various workflow types
    const filesystemWorkflows = this.getFilesystemWorkflows(commandHistory, context);
    const networkWorkflows = this.getNetworkWorkflows(commandHistory, context);
    const optimizations = this.getCommandOptimizations(commandHistory, context);
    
    // Combine all insights
    const allWorkflows = [
      ...filesystemWorkflows,
      ...networkWorkflows
    ];
    
    return {
      workflows: allWorkflows,
      suggestions: optimizations
    };
  }
  
  /**
   * Get file system related command patterns and workflows
   * @param {Array} commandHistory - Array of recent commands
   * @param {Object} context - Terminal context
   * @returns {Array} File system workflows and suggestions
   */
  getFilesystemWorkflows(commandHistory, context = {}) {
    const workflows = [];
    const recentCommands = commandHistory.slice(0, 10); // Focus on most recent commands
    
    // File navigation workflow
    if (this.detectWorkflow(recentCommands, ['cd', 'ls', 'find'])) {
      workflows.push({
        pattern: 'Directory Navigation',
        suggestion: 'find . -type f -name "*.ext" | xargs grep "pattern"',
        description: 'Search for specific files and their contents in one command'
      });
    }
    
    // File creation/editing workflow
    if (this.detectWorkflow(recentCommands, ['touch', 'nano', 'vim', 'emacs'])) {
      workflows.push({
        pattern: 'File Creation',
        suggestion: 'mkdir -p path/to/nested/dir && touch path/to/nested/dir/file.txt',
        description: 'Create directories and files in a single command'
      });
    }
    
    // File search workflow
    if (this.detectWorkflow(recentCommands, ['find', 'grep'])) {
      workflows.push({
        pattern: 'File Search',
        suggestion: 'find . -name "*.txt" -exec grep "pattern" {} \\; -print',
        description: 'Find files and search their contents in a single command'
      });
    }
    
    // File archiving workflow
    if (this.detectWorkflow(recentCommands, ['tar', 'gzip', 'zip', 'unzip'])) {
      workflows.push({
        pattern: 'File Archiving',
        suggestion: 'tar -czvf archive.tar.gz directory/',
        description: 'Create compressed archive of a directory'
      });
    }
    
    // File permission workflow
    if (this.detectWorkflow(recentCommands, ['chmod', 'chown', 'ls -l'])) {
      workflows.push({
        pattern: 'File Permissions',
        suggestion: 'find . -type f -exec chmod 644 {} \\; && find . -type d -exec chmod 755 {} \\;',
        description: 'Recursively set standard permissions for files and directories'
      });
    }
    
    return workflows;
  }
  
  /**
   * Get network related command patterns and workflows
   * @param {Array} commandHistory - Array of recent commands
   * @param {Object} context - Terminal context
   * @returns {Array} Network workflows and suggestions
   */
  getNetworkWorkflows(commandHistory, context = {}) {
    const workflows = [];
    const recentCommands = commandHistory.slice(0, 10);
    
    // Connectivity testing workflow
    if (this.detectWorkflow(recentCommands, ['ping', 'traceroute', 'dig', 'nslookup'])) {
      workflows.push({
        pattern: 'Network Diagnostics',
        suggestion: 'mtr hostname',
        description: 'Use mtr for combined ping and traceroute in a single command'
      });
    }
    
    // Web/API requests workflow
    if (this.detectWorkflow(recentCommands, ['curl', 'wget', 'http'])) {
      workflows.push({
        pattern: 'API Requests',
        suggestion: 'curl -s https://api.example.com | jq',
        description: 'Fetch API data and format JSON response'
      });
    }
    
    // SSH and remote access workflow
    if (this.detectWorkflow(recentCommands, ['ssh', 'scp', 'rsync'])) {
      workflows.push({
        pattern: 'Remote Access',
        suggestion: 'ssh-copy-id user@hostname',
        description: 'Set up passwordless SSH for easier remote access'
      });
    }
    
    // Network services workflow
    if (this.detectWorkflow(recentCommands, ['systemctl', 'service', 'netstat', 'lsof'])) {
      workflows.push({
        pattern: 'Service Management',
        suggestion: 'systemctl status servicename',
        description: 'Check service status with detailed information'
      });
    }
    
    // Docker/container workflow
    if (this.detectWorkflow(recentCommands, ['docker', 'docker-compose', 'kubectl'])) {
      workflows.push({
        pattern: 'Container Management',
        suggestion: 'docker-compose up -d && docker-compose logs -f',
        description: 'Start containers in background and follow logs'
      });
    }
    
    return workflows;
  }
  
  /**
   * Get command optimizations and efficiency suggestions
   * @param {Array} commandHistory - Array of recent commands
   * @param {Object} context - Terminal context
   * @returns {Array} Command optimization suggestions
   */
  getCommandOptimizations(commandHistory, context = {}) {
    const optimizations = [];
    const recentCommands = commandHistory.slice(0, 15);
    
    // Check for repeating commands that could use aliases
    const commandCounts = {};
    recentCommands.forEach(cmd => {
      const baseCmd = cmd.split(' ')[0];
      commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
    });
    
    // Suggest aliases for frequently used commands
    Object.entries(commandCounts)
      .filter(([cmd, count]) => count >= 3 && cmd.length > 10)
      .forEach(([cmd, count]) => {
        const aliasName = this.suggestAliasName(cmd);
        optimizations.push({
          pattern: 'Frequent Command',
          original: cmd,
          suggestion: `alias ${aliasName}='${cmd}'`,
          description: `Create an alias for this command you've used ${count} times`
        });
      });
    
    // Check for long directory navigation commands
    const cdCommands = recentCommands.filter(cmd => cmd.startsWith('cd '));
    cdCommands.forEach(cmd => {
      if (cmd.split('/').length > 3) {
        optimizations.push({
          pattern: 'Directory Shortcut',
          original: cmd,
          suggestion: `export DIR_ALIAS="${cmd.substring(3)}" && cd $DIR_ALIAS`,
          description: 'Create a directory variable for frequently accessed paths'
        });
      }
    });
    
    // Check for repeated command sequences
    const sequences = this.detectCommandSequences(recentCommands);
    sequences.forEach(sequence => {
      if (sequence.commands.length >= 2) {
        const combined = this.combineCommands(sequence.commands);
        if (combined) {
          optimizations.push({
            pattern: 'Command Sequence',
            original: sequence.commands.join(' && '),
            suggestion: combined,
            description: `Optimize this command sequence you've used ${sequence.count} times`
          });
        }
      }
    });
    
    // Check for inefficient file operations
    recentCommands.forEach(cmd => {
      // Find commands that could use xargs
      if (cmd.includes('find') && !cmd.includes('xargs') && !cmd.includes('-exec')) {
        optimizations.push({
          pattern: 'Batch Processing',
          original: cmd,
          suggestion: cmd.replace(/find (.+)/, 'find $1 -type f | xargs'),
          description: 'Use xargs to efficiently process multiple files'
        });
      }
      
      // Inefficient text processing
      if ((cmd.includes('grep') || cmd.includes('awk') || cmd.includes('sed')) && 
          !cmd.includes('|') && !cmd.includes('>')) {
        optimizations.push({
          pattern: 'Text Processing',
          original: cmd,
          suggestion: this.suggestTextProcessingOptimization(cmd),
          description: 'Use pipes and redirections for more efficient text processing'
        });
      }
    });
    
    return optimizations;
  }
  
  /**
   * Detect if a specific workflow pattern is present in command history
   * @param {Array} commands - List of commands
   * @param {Array} patternCommands - Commands that define a workflow
   * @returns {boolean} True if workflow is detected
   */
  detectWorkflow(commands, patternCommands) {
    const commandSet = new Set();
    
    // Extract base commands
    commands.forEach(cmd => {
      const baseCmd = cmd.split(' ')[0];
      commandSet.add(baseCmd);
    });
    
    // Check if any of the pattern commands are present
    return patternCommands.some(cmd => commandSet.has(cmd));
  }
  
  /**
   * Detect repeating command sequences in history
   * @param {Array} commands - Command history
   * @returns {Array} Detected command sequences with count
   */
  detectCommandSequences(commands) {
    const sequences = [];
    
    // Look for 2-3 command sequences
    for (let i = 0; i < commands.length - 1; i++) {
      // Check for 2-command sequence
      const seq2 = [commands[i], commands[i+1]];
      const seq2Count = this.countSequence(commands, seq2);
      
      if (seq2Count >= 2) {
        sequences.push({
          commands: seq2,
          count: seq2Count
        });
      }
      
      // Check for 3-command sequence if possible
      if (i < commands.length - 2) {
        const seq3 = [commands[i], commands[i+1], commands[i+2]];
        const seq3Count = this.countSequence(commands, seq3);
        
        if (seq3Count >= 2) {
          sequences.push({
            commands: seq3,
            count:

