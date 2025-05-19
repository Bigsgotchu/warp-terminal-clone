/**
 * AI Service for terminal command analysis and suggestions
 * Handles interactions with AI API for command completion and explanation
 */
class AIService {
  constructor() {
    this.apiEndpoint = process.env.REACT_APP_AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.model = 'gpt-3.5-turbo';
    
    // For local/offline mode where no API access is available
    this.offlineMode = !this.apiKey;
    
    // Command analysis cache
    this.cache = new Map();
    this.cacheSize = 100;
    
    // Basic commands for fallback mode
    this.basicCommands = this.getBasicCommands();
  }
  
  /**
   * Get fallback suggestions when working offline
   */
  getBasicCommands() {
    return {
      'ls': 'List directory contents',
      'cd': 'Change directory',
      'mkdir': 'Make directories',
      'rm': 'Remove files or directories',
      'cp': 'Copy files and directories',
      'mv': 'Move/rename files',
      'cat': 'Display file contents',
      'grep': 'Search file patterns',
      'find': 'Search for files',
      'ps': 'Show process status',
      'kill': 'Terminate processes',
      'chmod': 'Change file permissions',
      'chown': 'Change file owner/group',
      'sudo': 'Execute command as superuser',
      'apt': 'Package management',
      'git': 'Version control system',
      'ssh': 'Secure shell client',
      'scp': 'Secure copy'
    };
  }
  
  /**
   * Analyze a command and generate suggestions
   * @param {string} command - The current command input
   * @param {object} context - The terminal context
   * @returns {Promise<{suggestions: Array}>}
   */
  async analyzeCommand(command, context) {
    // Return empty result for empty commands
    if (!command || command.trim() === '') {
      return { suggestions: [] };
    }
    
    // Check cache for exact command
    const cacheKey = `${command}:${context.currentDirectory}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // In offline mode, provide basic command completion
    if (this.offlineMode) {
      return this.offlineAnalyzeCommand(command);
    }
    
    try {
      // Prepare prompt with command and context
      const prompt = this.buildAnalysisPrompt(command, context);
      
      // Call AI API (OpenAI in this case)
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a terminal assistant. Provide command completions and suggestions based on user input and context.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const suggestions = this.parseSuggestions(data.choices[0].message.content);
      
      // Cache the result
      this.addToCache(cacheKey, { suggestions });
      
      return { suggestions };
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback to offline mode on API failures
      return this.offlineAnalyzeCommand(command);
    }
  }
  
  /**
   * Offline command analysis with basic pattern matching
   * @param {string} command - The current command input
   * @returns {{suggestions: Array}}
   */
  offlineAnalyzeCommand(command) {
    const suggestions = [];
    const commandWords = command.trim().split(' ');
    const lastWord = commandWords[commandWords.length - 1];
    
    // Try to match commands
    Object.entries(this.basicCommands).forEach(([cmd, description]) => {
      if (cmd.startsWith(lastWord) && cmd !== lastWord) {
        suggestions.push({
          command: this.replaceLastWord(command, cmd),
          description,
          replacement: cmd
        });
      }
    });
    
    // Try some common flags for known commands
    const mainCommand = commandWords[0];
    if (mainCommand === 'ls' && lastWord.startsWith('-')) {
      const lsFlags = {
        '-l': 'Long listing format',
        '-a': 'Include hidden files',
        '-h': 'Human readable sizes',
        '-t': 'Sort by modification time'
      };
      
      Object.entries(lsFlags).forEach(([flag, desc]) => {
        if (flag.startsWith(lastWord) && flag !== lastWord) {
          suggestions.push({
            command: this.replaceLastWord(command, flag),
            description: desc,
            replacement: flag
          });
        }
      });
    }
    
    return { suggestions: suggestions.slice(0, 5) };
  }
  
  /**
   * Replace the last word in a command with a new one
   * @param {string} command - The full command
   * @param {string} replacement - The replacement word
   * @returns {string}
   */
  replaceLastWord(command, replacement) {
    const words = command.split(' ');
    words[words.length - 1] = replacement;
    return words.join(' ');
  }
  
  /**
   * Build prompt for AI command analysis
   * @param {string} command - Current command
   * @param {object} context - Terminal context
   * @returns {string}
   */
  buildAnalysisPrompt(command, context) {
    return `
Current command: ${command}
Current directory: ${context.currentDirectory}
Recent commands: ${context.recentCommands.join(', ')}
${context.lastError ? `Last error: ${context.lastError}` : ''}

Based on this context, suggest 5 likely command completions or next actions.
Format each suggestion as "command: brief explanation"
Keep suggestions relevant and focused on the current command.
`.trim();
  }
  
  /**
   * Parse AI suggestions into structured format
   * @param {string} content - Raw AI response
   * @returns {Array}
   */
  parseSuggestions(content) {
    try {
      const suggestions = [];
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Try to extract command and description with regex
        const match = line.match(/^(?:\d+\.\s*)?([^:]+):(.+)$/);
        if (match) {
          suggestions.push({
            command: match[1].trim(),
            description: match[2].trim()
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return [];
    }
  }
  
  /**
   * Analyze command patterns based on command history
   * @param {Array} commandHistory - Array of recent commands
   * @returns {Promise<{patterns: Array}>}
   */
  async analyzeCommandPatterns(commandHistory) {
    // Skip if no history or too few commands
    if (!commandHistory || commandHistory.length < 2) {
      return { patterns: [] };
    }
    
    // For offline mode, use basic pattern matching
    if (this.offlineMode) {
      return this.offlineAnalyzePatterns(commandHistory);
    }
    
    try {
      const prompt = `
Analyze these recent terminal commands and identify patterns or suggest follow-up commands:
${commandHistory.slice(0, 10).join('\n')}

Based on this command history:
1. What patterns do you see?
2. What might be the user's next likely command?
3. Are there command optimizations or shortcuts you would suggest?

Format your response as a list of suggestions with explanations.
`.trim();
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You analyze command history patterns to provide intelligent suggestions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { 
        patterns: this.parsePatterns(data.choices[0].message.content)
      };
    } catch (error) {
      console.error('Command pattern analysis error:', error);
      return this.offlineAnalyzePatterns(commandHistory);
    }
  }
  
  /**
   * Offline analysis of command patterns
   * @param {Array} commandHistory - Array of recent commands
   * @returns {{patterns: Array}}
   */
  offlineAnalyzePatterns(commandHistory) {
    const patterns = [];
    
    // Check for cd followed by ls pattern
    if (commandHistory[0].startsWith('cd ') && commandHistory.length > 1) {
      patterns.push({
        pattern: 'Directory Navigation',
        suggestion: 'ls',
        description: 'List files in the new directory'
      });
    }
    
    // Check for git operations
    const gitCommands = commandHistory.filter(cmd => cmd.startsWith('git '));
    if (gitCommands.length > 0) {
      const lastGitCommand = gitCommands[0];
      
      if (lastGitCommand === 'git add .') {
        patterns.push({
          pattern: 'Git Workflow',
          suggestion: 'git commit -m "commit message"',
          description: 'Commit the changes you just added'
        });
      } else if (lastGitCommand.startsWith('git commit')) {
        patterns.push({
          pattern: 'Git Workflow',
          suggestion: 'git push',
          description: 'Push your commits to the remote repository'
        });
      }
    }
    
    // Check for command repetitions
    const commandCounts = {};
    commandHistory.forEach(cmd => {
      commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
    });
    
    Object.entries(commandCounts)
      .filter(([cmd, count]) => count > 1)
      .forEach(([cmd, count]) => {
        patterns.push({
          pattern: 'Repeated Command',
          suggestion: cmd,
          description: `You've used this command ${count} times recently`
        });
      });
    
    return { patterns: patterns.slice(0, 3) };
  }
  
  /**
   * Parse patterns from AI response
   * @param {string} content - Raw AI response
   * @returns {Array}
   */
  parsePatterns(content) {
    try {
      const patterns = [];
      const lines = content.split('\n');
      
      // Look for suggestion patterns in the text
      let currentPattern = null;
      
      for (const line of lines) {
        const suggestionMatch = line.match(/^(?:\d+\.\s*)?[Ss]uggest(?:ion)?:?\s*`?([^`]+)`?:?\s*(.+)/);
        const patternMatch = line.match(/^(?:\d+\.\s*)?[Pp]attern:?\s*(.+)/);
        
        if (suggestionMatch) {
          patterns.push({
            suggestion: suggestionMatch[1].trim(),
            description: suggestionMatch[2].trim(),
            pattern: currentPattern || 'Suggestion'
          });
        } else if (patternMatch) {
          currentPattern = patternMatch[1].trim();
        }
      }
      
      return patterns.slice(0, 5);
    } catch (error) {
      console.error('Error parsing patterns:', error);
      return [];
    }
  }
  
  /**
   * Get explanation for a command
   * @param {string} command - The command to explain
   * @returns {Promise<string|object>} - Explanation text or structured explanation object
   */
  async explainCommand(command) {
    // Empty or incomplete commands don't need explanation
    if (!command || command.trim() === '') {
      return null;
    }
    
    // Check cache
    const cacheKey = `explain:${command}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Offline mode basic explanations
    if (this.offlineMode) {
      const mainCommand = command.split(' ')[0];
      const explanation = this.getOfflineExplanation(mainCommand);
      this.addToCache(cacheKey, explanation);
      return explanation;
    }
    
    try {
      // For structured explanations of common commands
      if (this.shouldUseStructuredExplanation(command)) {
        return await this.getStructuredExplanation(command);
      }
      
      // For general command explanations
      const prompt = `
Explain this terminal command in a clear and concise way:
${command}

Include:
1. What the command does
2. Key arguments and flags used
3. Potential risks or side effects, if any
4. Common use cases

Format your response as a single concise paragraph.
`.trim();
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a terminal assistant providing clear, accurate, and concise explanations of command line commands.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const explanation = data.choices[0].message.content;
      
      // Cache the explanation
      this.addToCache(cacheKey, explanation);
      
      return explanation;
    } catch (error) {
      console.error('Command explanation error:', error);
      // Fallback to offline explanation
      const mainCommand = command.split(' ')[0];
      const fallbackExplanation = this.getOfflineExplanation(mainCommand);
      this.addToCache(cacheKey, fallbackExplanation);
      return fallbackExplanation;
    }
  }
  
  /**
   * Determine if we should use structured explanation for this command
   * @param {string} command - The command to analyze
   * @returns {boolean}
   */
  shouldUseStructuredExplanation(command) {
    const mainCommand = command.split(' ')[0];
    const commonCommands = ['ls', 'cd', 'grep', 'find', 'git', 'docker', 'npm', 'yarn'];
    return commonCommands.includes(mainCommand);
  }
  
  /**
   * Get structured explanation for a command
   * @param {string} command - The command to explain
   * @returns {Promise<object>} - Structured explanation object
   */
  async getStructuredExplanation(command) {
    try {
      const prompt = `
Explain this terminal command in detail:
${command}

Provide a structured response with:
- command: The exact command being explained
- purpose: A short description of what this command does
- options: A dictionary of key flags/options used with brief explanations
- examples: A couple of related example commands with brief descriptions

IMPORTANT: Format your response as a valid JSON object with those exact fields.
`.trim();
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You provide structured explanations of command line commands in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Sometimes the AI might wrap the JSON response in markdown code blocks
        // or add explanatory text, so we need to extract just the JSON part
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        }
        
        // Try to parse the JSON
        const explanation = JSON.parse(jsonContent);
        
        // Validate the required fields exist
        if (!explanation.command || !explanation.purpose) {
          throw new Error('Response missing required command or purpose fields');
        }
        
        // Ensure optional fields exist (even if empty)
        explanation.options = explanation.options || {};
        explanation.examples = explanation.examples || [];
        
        // Cache the successful result
        this.addToCache(`structured:${command}`, explanation);
        
        return explanation;
      } catch (parseError) {
        console.error('Error parsing JSON explanation:', parseError);
        
        // Fall back to a basic structured explanation
        const fallbackExplanation = {
          command: command,
          purpose: this.getOfflineExplanation(command.split(' ')[0]),
          options: {},
          examples: []
        };
        
        // Cache the fallback result to avoid repeated failures
        this.addToCache(`structured:${command}`, fallbackExplanation);
        
        return fallbackExplanation;
      }
    } catch (error) {
      console.error('Failed to get structured explanation:', error);
      // Fall back to basic offline explanation in structured format
      return {
        command: command,
        purpose: this.getOfflineExplanation(command.split(' ')[0]),
        options: {},
        examples: []
      };
    }
  }

  /**
   * Get offline explanation for basic commands
   * @param {string} command - The command to explain
   * @returns {string}
   */
  getOfflineExplanation(command) {
    const explanations = {
      ls: 'List directory contents. Shows files and folders in the current directory.',
      cd: 'Change directory. Moves you to a different directory in the filesystem.',
      pwd: 'Print working directory. Shows your current location in the filesystem.',
      mkdir: 'Make directory. Creates a new directory with the specified name.',
      rm: 'Remove files or directories. Permanently deletes specified items.',
      cp: 'Copy files and directories from one location to another.',
      mv: 'Move or rename files and directories.',
      cat: 'Display contents of a file.',
      grep: 'Search for patterns in files or command output.',
      find: 'Search for files in a directory hierarchy.',
      chmod: 'Change file mode (permissions).',
      chown: 'Change file owner and group.',
      sudo: 'Execute a command with superuser privileges.',
      ssh: 'Secure shell client for remote system access.',
      git: 'Version control system for tracking changes in files.',
      docker: 'Platform for developing and running containers.',
      npm: 'Node.js package manager for installing JavaScript packages.',
      yarn: 'Alternative package manager for Node.js.',
      ping: 'Test network connectivity to a host.',
      curl: 'Transfer data from or to a server.',
      wget: 'Download files from the web.'
    };
    
    return explanations[command] || `No offline explanation available for "${command}".`;
  }

  /**
   * Add result to cache with size limit management
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  addToCache(key, value) {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, value);
  }

  /**
   * Clear the entire cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear cache entries by prefix
   * @param {string} prefix - Prefix to match cache keys
   */
  clearCacheByPrefix(prefix) {
    if (!prefix) return;
    
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.cacheSize,
      categories: {
        suggestions: 0,
        explanations: 0,
        structured: 0,
        patterns: 0,
        other: 0
      }
    };
    
    // Count entries by category
    for (const key of this.cache.keys()) {
      if (key.startsWith('explain:')) {
        stats.categories.explanations++;
      } else if (key.startsWith('structured:')) {
        stats.categories.structured++;
      } else if (key.startsWith('pattern:')) {
        stats.categories.patterns++;
      } else if (key.includes(':')) {
        stats.categories.suggestions++;
      } else {
        stats.categories.other++;
      }
    }
    
    return stats;
  }

  /**
   * Clean up resources and prepare for shutdown
   */
  cleanup() {
    console.log('AI Service cleaning up...');
    this.clearCache();
  }
}

// Create singleton instance
export const aiService = new AIService();

// Set up cleanup handlers
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('beforeunload', () => {
    aiService.cleanup();
  });
} else if (typeof process !== 'undefined') {
  // Node.js environment
  process.on('beforeExit', () => {
    aiService.cleanup();
  });
}

// Default export
export default aiService;
