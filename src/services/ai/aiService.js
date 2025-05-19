/**
 * AI Service for terminal command analysis and suggestions
 * Handles interactions with AI API for command completion and explanation
 */
import {
  analyzeCommandPatterns as analyzePatterns,
  enhanceSuggestionsWithPatterns,
  createCommandSearchIndex
} from './commandPatternService';
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
    
    // Pattern analysis state
    this.patternAnalysisCache = null;
    this.searchIndex = null;
    this.lastAnalysisTimestamp = 0;
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
    
    // Check for command corrections and typos
    const correction = this.checkCommandCorrections(command);
    
    // If we found a correction, add it to our suggestions
    let correctionSuggestions = [];
    if (correction) {
      correctionSuggestions = [correction];
      
      // For serious warnings, just return the correction immediately
      if (correction.isWarning && correction.type === 'danger') {
        const result = { 
          suggestions: correctionSuggestions,
          hasWarning: true
        };
        this.addToCache(cacheKey, result);
        return result;
      }
    }
    
    // Always analyze command patterns locally first (regardless of online/offline mode)
    // This provides immediate pattern-based suggestions even in offline mode
    let patternSuggestions = [];
    
    // Use pattern analysis if we have some command history
    if (context.recentCommands && context.recentCommands.length > 0) {
      try {
        // Get or generate pattern analysis
        const analysis = this.getPatternAnalysis(context.recentCommands, context);
        
        // Enhance suggestions with patterns if analysis available
        if (analysis) {
          const lastCommand = context.recentCommands[0] || '';
          patternSuggestions = enhanceSuggestionsWithPatterns(command, analysis, {
            currentDirectory: context.currentDirectory,
            lastCommand
          });
          
          // Add source information to pattern suggestions for UI differentiation
          patternSuggestions = patternSuggestions.map(suggestion => ({
            ...suggestion,
            source: 'pattern'
          }));
        }
      } catch (error) {
        console.error('Error generating pattern suggestions:', error);
        patternSuggestions = []; // Reset on error
      }
    }
    
    // If we're in offline mode, combine pattern suggestions with basic suggestions
    if (this.offlineMode) {
      // Get basic suggestions for the command
      const basicSuggestions = this.offlineAnalyzeCommand(command).suggestions || [];
      
      // Combine all suggestion types
      const combinedSuggestions = [
        ...correctionSuggestions,  // Correction suggestions first (highest priority)
        ...patternSuggestions,     // Pattern-based suggestions next
        ...basicSuggestions        // Basic offline suggestions last
      ];
      
      // Remove duplicates and limit to 7 suggestions
      const dedupedSuggestions = this.deduplicateSuggestions(combinedSuggestions).slice(0, 7);
      
      const result = { suggestions: dedupedSuggestions };
      this.addToCache(cacheKey, result);
      return result;
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
      const apiSuggestions = this.parseSuggestions(data.choices[0].message.content);
      
      // Combine AI suggestions with pattern-based suggestions
      const combinedSuggestions = [
        ...patternSuggestions, // Pattern-based suggestions first (higher priority)
        ...apiSuggestions      // Then AI-generated suggestions
      ];
      
      // Remove duplicates and limit to 7 suggestions
      const dedupedSuggestions = this.deduplicateSuggestions(combinedSuggestions).slice(0, 7);
      
      // Categorize suggestions to provide more context to the user
      const categorizedSuggestions = dedupedSuggestions.map(suggestion => {
        // Keep existing source information if available
        if (suggestion.source) {
          return suggestion;
        }
        
        // Otherwise, mark as AI-generated
        return {
          ...suggestion,
          source: 'ai'
        };
      });
      
      const result = { suggestions: categorizedSuggestions };
      
      // Cache the result
      this.addToCache(cacheKey, result);
      
      return result;
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
    
    // Use our local pattern analysis first for immediate results
    const localAnalysis = this.getPatternAnalysis(commandHistory, {
      currentDirectory: this.getCurrentDirectory(commandHistory)
    });
    
    // For offline mode, use only local pattern analysis
    if (this.offlineMode) {
      return {
        patterns: localAnalysis?.recognizedPatterns || [],
        commandFrequency: localAnalysis?.commandFrequency || [],
        commandSequences: localAnalysis?.commandSequences || [],
        optimizations: localAnalysis?.optimizations || []
      };
    }
    
    // For online mode, enhance with AI-based pattern analysis
    try {
      // Include any optimizations from local analysis in the prompt
      const localOptimizations = localAnalysis?.optimizations || [];
      const optimizationPrompt = localOptimizations.length > 0 
        ? `\nI've identified these potential optimizations:\n${localOptimizations
            .map(opt => `- ${opt.original} → ${opt.optimized} (${opt.explanation})`)
            .join('\n')}`
        : '';
      
      const prompt = `
Analyze these recent terminal commands and identify patterns or suggest follow-up commands:
${commandHistory.slice(0, 10).join('\n')}
${optimizationPrompt}

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
      const aiPatterns = this.parsePatterns(data.choices[0].message.content);
      
      // Combine AI-generated patterns with local pattern analysis
      return { 
        patterns: [...aiPatterns, ...(localAnalysis?.recognizedPatterns || [])],
        commandFrequency: localAnalysis?.commandFrequency || [],
        commandSequences: localAnalysis?.commandSequences || [],
        optimizations: localAnalysis?.optimizations || []
      };
    } catch (error) {
      console.error('Command pattern analysis error:', error);
      // Fall back to just the local analysis on error
      return {
        patterns: localAnalysis?.recognizedPatterns || [],
        commandFrequency: localAnalysis?.commandFrequency || [],
        commandSequences: localAnalysis?.commandSequences || [],
        optimizations: localAnalysis?.optimizations || []
      };
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
      patternAnalysisAge: this.lastAnalysisTimestamp > 0 
        ? Math.floor((Date.now() - this.lastAnalysisTimestamp) / 1000) + ' seconds ago'
        : 'never',
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
  
  /**
   * Remove duplicate suggestions based on command
   * @param {Array} suggestions - Array of suggestion objects
   * @returns {Array} - Deduplicated suggestions
   */
  deduplicateSuggestions(suggestions) {
    const dedupedSuggestions = [];
    const seen = new Set();
    
    suggestions.forEach(suggestion => {
      if (!seen.has(suggestion.command)) {
        dedupedSuggestions.push(suggestion);
        seen.add(suggestion.command);
      }
    });
    
    return dedupedSuggestions;
  }
  
  /**
   * Check for common command errors and provide corrections
   * @param {string} command - The command to check
   * @returns {Object|null} - Correction suggestion or null if no errors found
   */
  checkCommandCorrections(command) {
    if (!command || command.trim() === '') {
      return null;
    }
    
    // Get or initialize corrections module
    const corrections = this.getCommandCorrections();
    
    // Check for exact matches in common typos
    if (corrections.commonTypos[command]) {
      return {
        command: corrections.commonTypos[command].correction,
        description: corrections.commonTypos[command].explanation,
        source: 'correction',
        score: 0.98,  // Very high score for direct typo corrections
        type: 'typo'
      };
    }
    
    // Check for dangerous commands
    for (const [pattern, info] of Object.entries(corrections.dangerousCommands)) {
      if (command.match(new RegExp(pattern))) {
        return {
          command: info.safeAlternative || command,
          description: `⚠️ ${info.warning}`,
          source: 'safety',
          score: 0.99,  // Highest priority for safety warnings
          type: 'danger',
          isWarning: true
        };
      }
    }
    
    // Check for common mistakes in command syntax
    for (const [pattern, info] of Object.entries(corrections.syntaxErrors)) {
      if (command.match(new RegExp(pattern))) {
        return {
          command: info.correctedForm,
          description: info.explanation,
          source: 'syntax',
          score: 0.97,
          type: 'syntax'
        };
      }
    }
    
    // Check for fuzzy matches in common commands
    const words = command.split(' ');
    const firstWord = words[0];
    
    // Only check first word of command for fuzzy matches
    if (firstWord && firstWord.length >= 2) {
      const topMatch = this.findClosestCommand(firstWord);
      
      if (topMatch && topMatch.distance <= 2 && topMatch.command !== firstWord) {
        // Replace the first word with the correction
        words[0] = topMatch.command;
        const correctedCommand = words.join(' ');
        
        return {
          command: correctedCommand,
          description: `Did you mean '${topMatch.command}'?`,
          source: 'fuzzy',
          score: 0.96,
          type: 'fuzzy'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get command corrections database
   * @returns {Object} - Correction patterns object
   */
  getCommandCorrections() {
    // Lazy initialize the corrections object
    if (!this._corrections) {
      this._corrections = {
        // Common typos and their corrections
        commonTypos: {
          'cd..': { 
            correction: 'cd ..', 
            explanation: 'Space required between cd and ..' 
          },
          'giit': { 
            correction: 'git', 
            explanation: 'Typo in git command' 
          },
          'grpe': { 
            correction: 'grep', 
            explanation: 'Typo in grep command' 
          },
          'pythno': { 
            correction: 'python', 
            explanation: 'Typo in python command' 
          },
          'npmm': { 
            correction: 'npm', 
            explanation: 'Typo in npm command' 
          },
          'tra': { 
            correction: 'tar', 
            explanation: 'Typo in tar command' 
          },
          'cta': { 
            correction: 'cat', 
            explanation: 'Typo in cat command' 
          },
          'mkidr': { 
            correction: 'mkdir', 
            explanation: 'Typo in mkdir command' 
          },
          'touhc': { 
            correction: 'touch', 
            explanation: 'Typo in touch command' 
          },
          'suod': { 
            correction: 'sudo', 
            explanation: 'Typo in sudo command' 
          }
        },
        
        // Dangerous commands that need warnings
        dangerousCommands: {
          '^rm\\s+-rf\\s+/': {
            warning: 'This command will delete your entire filesystem!',
            safeAlternative: null  // No safe alternative, just a warning
          },
          '^rm\\s+-rf\\s+~': {
            warning: 'This command will delete your home directory!',
            safeAlternative: null
          },
          '^rm\\s+-rf\\s+\\.': {
            warning: 'This will delete the current directory and all contents',
            safeAlternative: 'rm -rf ./specific-dir'
          },
          '^chmod\\s+-R\\s+777': {
            warning: 'Setting 777 permissions is a security risk',
            safeAlternative: 'chmod -R 755 for directories, 644 for files'
          },
          '^sudo\\s+chmod\\s+-R\\s+777': {
            warning: 'Setting 777 permissions is a security risk',
            safeAlternative: 'sudo chmod -R 755 for directories, 644 for files'
          },
          'git\\s+reset\\s+--hard': {
            warning: 'This will discard all local changes!',
            safeAlternative: 'git stash to preserve changes'
          },
          ':\\s*[wW][qQ]!': {
            warning: 'Force-quitting Vim without saving changes',
            safeAlternative: ':w to save changes first'
          }
        },
        
        // Common syntax errors
        syntaxErrors: {
          '^cd\\s+([^\\s]+)\\s+([^\\s]+)': {
            correctedForm: 'cd $1',
            explanation: 'cd only takes one directory argument'
          },
          '^git\\s+commit\\s+([^-].*)': {
            correctedForm: 'git commit -m "$1"',
            explanation: 'Missing -m flag for commit message'
          },
          '^git\\s+add\\s+(\\S+)\\s+git\\s+commit': {
            correctedForm: 'git add $1 && git commit',
            explanation: 'Use && between commands'
          },
          '^find\\s+\\S+\\s+-name': {
            correctedForm: 'find $1 -name "*pattern*"',
            explanation: 'The -name argument needs a pattern in quotes'
          }
        }
      };
      
      // Add common commands for fuzzy matching
      this._corrections.commonCommands = Object.keys(this.basicCommands);
    }
    
    return this._corrections;
  }
  
  /**
   * Find the closest matching command using Levenshtein distance
   * @param {string} input - User input to check
   * @returns {Object|null} - Closest match with distance score
   */
  findClosestCommand(input) {
    if (!input || input.length < 2) return null;
    
    const corrections = this.getCommandCorrections();
    const commands = corrections.commonCommands;
    
    let bestMatch = null;
    let minDistance = Infinity;
    
    for (const command of commands) {
      // Skip if lengths are too different (optimization)
      if (Math.abs(command.length - input.length) > 3) continue;
      
      const distance = this.levenshteinDistance(input.toLowerCase(), command.toLowerCase());
      
      if (distance < minDistance && distance <= 3) { // Only consider reasonable distances
        minDistance = distance;
        bestMatch = {
          command,
          distance
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
}

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
