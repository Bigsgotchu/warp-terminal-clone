import { createSearchIndex, findSimilarCommands } from './searchUtils';

/**
 * @typedef {Object} CommandFrequency
 * @property {string} command - The command
 * @property {number} count - Number of times used
 * @property {string[]} contexts - Contexts where command was used (directories, etc.)
 * @property {number} lastUsed - Timestamp of last usage
 */

/**
 * @typedef {Object} CommandSequence
 * @property {string[]} commands - Sequence of commands
 * @property {number} count - Number of times sequence occurred
 * @property {string[]} contexts - Contexts where sequence was used
 */

/**
 * @typedef {Object} CommandOptimization
 * @property {string} original - Original command or pattern
 * @property {string} optimized - Optimized version
 * @property {string} explanation - Explanation of optimization
 * @property {string} benefitType - Type of benefit (e.g., "speed", "readability", "safety")
 */

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - Pattern name/description
 * @property {string} regex - Regex pattern if applicable
 * @property {string[]} examples - Example commands matching the pattern
 * @property {CommandOptimization[]} optimizations - Possible optimizations
 */

// Cache of command analysis results
const analysisCache = new Map();

// Common command patterns to recognize
const COMMAND_PATTERNS = [
  {
    name: 'file-search',
    regex: /^(find|grep|ack|ag|rg)\s.+/,
    description: 'File content search',
    optimizationTips: [
      { from: 'grep -r', to: 'rg', benefit: 'speed' },
      { from: 'find . -name', to: 'fd', benefit: 'simplicity' }
    ]
  },
  {
    name: 'file-navigation',
    regex: /^(cd|pushd|popd)\s.+/,
    description: 'Directory navigation',
    optimizationTips: [
      { from: 'cd ..; cd ..', to: 'cd ../..', benefit: 'brevity' }
    ]
  },
  {
    name: 'file-operations',
    regex: /^(cp|mv|rm|mkdir)\s.+/,
    description: 'File operations',
    optimizationTips: [
      { from: 'mkdir dir && cd dir', to: 'mkdir -p dir && cd $_', benefit: 'efficiency' }
    ]
  },
  {
    name: 'git-operations',
    regex: /^git\s.+/,
    description: 'Git operations',
    optimizationTips: [
      { from: 'git add . && git commit -m', to: 'git commit -am', benefit: 'brevity' },
      { from: 'git checkout', to: 'git switch', benefit: 'modern' }
    ]
  },
  {
    name: 'package-management',
    regex: /^(apt|yum|brew|npm|pip|cargo)\s.+/,
    description: 'Package management',
    optimizationTips: [
      { from: 'npm install', to: 'npm i', benefit: 'brevity' },
      { from: 'apt-get update && apt-get upgrade', to: 'apt update && apt upgrade', benefit: 'modern' }
    ]
  },
  {
    name: 'process-management',
    regex: /^(ps|kill|pkill|top|htop)\s.+/,
    description: 'Process management',
    optimizationTips: [
      { from: 'ps aux | grep', to: 'pgrep', benefit: 'simplicity' }
    ]
  },
  {
    name: 'permission-operations',
    regex: /^(chmod|chown|sudo)\s.+/,
    description: 'Permission operations',
    optimizationTips: [
      { from: 'chmod +x', to: 'chmod 755', benefit: 'explicitness' }
    ]
  }
];

/**
 * Analyze command history to identify usage patterns
 * 
 * @param {string[]} commandHistory - Array of command strings
 * @param {Object} context - Additional context like directory, etc.
 * @returns {Object} Analysis results
 */
export const analyzeCommandPatterns = (commandHistory, context = {}) => {
  // Return cached analysis if available and command history hasn't changed
  const cacheKey = JSON.stringify({
    commands: commandHistory.slice(0, 20),
    contextDir: context.currentDirectory
  });
  
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey);
  }
  
  // Command frequency analysis
  const commandFrequency = analyzeCommandFrequency(commandHistory);
  
  // Command sequence analysis
  const commandSequences = analyzeCommandSequences(commandHistory);
  
  // Pattern recognition
  const recognizedPatterns = recognizeCommandPatterns(commandHistory, context);
  
  // Generate optimization suggestions
  const optimizations = generateOptimizations(commandHistory, commandFrequency, recognizedPatterns);
  
  // Prepare results
  const results = {
    commandFrequency: commandFrequency.slice(0, 5), // Top 5 most frequent
    commandSequences: commandSequences.slice(0, 3), // Top 3 sequences
    recognizedPatterns,
    optimizations,
    timestamp: Date.now()
  };
  
  // Cache results
  analysisCache.set(cacheKey, results);
  
  return results;
};

/**
 * Analyze command frequency
 * 
 * @param {string[]} commandHistory - Array of command strings
 * @returns {CommandFrequency[]} Sorted array of command frequencies
 */
function analyzeCommandFrequency(commandHistory) {
  const frequencyMap = new Map();
  
  // Count command occurrences
  commandHistory.forEach((cmd) => {
    // Extract base command (remove arguments)
    const baseCommand = cmd.split(' ')[0];
    
    if (!frequencyMap.has(baseCommand)) {
      frequencyMap.set(baseCommand, {
        command: baseCommand,
        count: 0,
        contexts: [],
        arguments: new Map(),
        lastUsed: Date.now()
      });
    }
    
    const entry = frequencyMap.get(baseCommand);
    entry.count += 1;
    
    // Track command arguments and their frequencies
    const args = cmd.substr(baseCommand.length).trim();
    if (args) {
      if (!entry.arguments.has(args)) {
        entry.arguments.set(args, 0);
      }
      entry.arguments.set(args, entry.arguments.get(args) + 1);
    }
  });
  
  // Convert to array and sort by frequency
  return Array.from(frequencyMap.values())
    .sort((a, b) => b.count - a.count)
    .map(entry => {
      // Convert arguments map to array of [arg, count] pairs
      const args = Array.from(entry.arguments.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);  // Keep top 3 argument patterns
      
      return {
        ...entry,
        popularArgs: args
      };
    });
}

/**
 * Analyze command sequences (commands that frequently occur together)
 * 
 * @param {string[]} commandHistory - Array of command strings
 * @returns {CommandSequence[]} Sorted array of command sequences
 */
function analyzeCommandSequences(commandHistory) {
  const sequences = [];
  const sequenceMap = new Map();
  
  // Look for sequences of 2-3 commands
  for (let length = 2; length <= 3; length++) {
    if (commandHistory.length < length) continue;
    
    for (let i = 0; i <= commandHistory.length - length; i++) {
      const sequence = commandHistory.slice(i, i + length);
      const sequenceKey = sequence.join(' -> ');
      
      if (!sequenceMap.has(sequenceKey)) {
        sequenceMap.set(sequenceKey, {
          commands: sequence,
          count: 0,
          contexts: []
        });
      }
      
      sequenceMap.get(sequenceKey).count += 1;
    }
  }
  
  // Convert to array and sort by frequency
  return Array.from(sequenceMap.values())
    .filter(seq => seq.count > 1)  // Only include sequences that occur multiple times
    .sort((a, b) => b.count - a.count);
}

/**
 * Recognize command patterns in history
 * 
 * @param {string[]} commandHistory - Array of command strings
 * @param {Object} context - Additional context
 * @returns {Object[]} Recognized patterns
 */
function recognizeCommandPatterns(commandHistory, context) {
  const recognizedPatterns = [];
  
  // Check each command against defined patterns
  commandHistory.forEach(cmd => {
    COMMAND_PATTERNS.forEach(pattern => {
      if (pattern.regex.test(cmd)) {
        // Check if this pattern is already recognized
        const existingPattern = recognizedPatterns.find(p => p.name === pattern.name);
        
        if (existingPattern) {
          // Add as example if not already included
          if (!existingPattern.examples.includes(cmd)) {
            existingPattern.examples.push(cmd);
          }
          existingPattern.count += 1;
        } else {
          // Add new recognized pattern
          recognizedPatterns.push({
            name: pattern.name,
            description: pattern.description,
            examples: [cmd],
            count: 1,
            optimizationTips: pattern.optimizationTips
          });
        }
      }
    });
  });
  
  // Sort by frequency
  return recognizedPatterns.sort((a, b) => b.count - a.count);
}

/**
 * Generate optimization suggestions based on command usage
 * 
 * @param {string[]} commandHistory - Array of command strings
 * @param {CommandFrequency[]} frequencies - Command frequency analysis
 * @param {Object[]} patterns - Recognized patterns
 * @returns {CommandOptimization[]} Optimization suggestions
 */
function generateOptimizations(commandHistory, frequencies, patterns) {
  const optimizations = [];
  
  // Check for pattern-based optimizations
  patterns.forEach(pattern => {
    if (pattern.optimizationTips && pattern.examples.length > 0) {
      pattern.optimizationTips.forEach(tip => {
        // Check if any examples match the "from" pattern
        pattern.examples.forEach(example => {
          if (example.includes(tip.from)) {
            const optimized = example.replace(tip.from, tip.to);
            
            optimizations.push({
              original: example,
              optimized,
              explanation: `Use '${tip.to}' instead of '${tip.from}' for better ${tip.benefit}.`,
              benefitType: tip.benefit
            });
          }
        });
      });
    }
  });
  
  // Check for frequent long commands that could be aliased
  frequencies
    .filter(freq => freq.count >= 3 && freq.command.length > 10)
    .forEach(freq => {
      const aliasName = suggestAliasName(freq.command);
      
      optimizations.push({
        original: freq.command,
        optimized: `alias ${aliasName}='${freq.command}'`,
        explanation: `Create an alias for this frequently used command.`,
        benefitType: 'efficiency'
      });
    });
  
  // Check for repetitive command sequences
  const topSequences = analyzeCommandSequences(commandHistory)
    .filter(seq => seq.count >= 2 && seq.commands.length >= 2);
  
  topSequences.forEach(seq => {
    const combined = combineSequence(seq.commands);
    if (combined) {
      optimizations.push({
        original: seq.commands.join(' && '),
        optimized: combined,
        explanation: `Combine these commands for efficiency.`,
        benefitType: 'efficiency'
      });
    }
  });
  
  return optimizations;
}

/**
 * Suggest an alias name for a command
 * 
 * @param {string} command - Command to create alias for
 * @returns {string} Suggested alias name
 */
function suggestAliasName(command) {
  // Extract first letter of each word
  const words = command.split(/\s+/);
  let alias = '';
  
  if (words.length > 1) {
    // For multi-word commands, use first letter of each word
    alias = words.map(word => word[0]).join('');
  } else {
    // For single word, use first 2-3 letters
    alias = command.substring(0, Math.min(3, command.length));
  }
  
  return alias.toLowerCase();
}

/**
 * Try to combine a sequence of commands into a more efficient form
 * 
 * @param {string[]} commands - Sequence of commands to combine
 * @returns {string|null} Combined command or null if not possible
 */
function combineSequence(commands) {
  // Special case: cd + ls
  if (commands.length === 2 && 
      commands[0].startsWith('cd ') && 
      commands[1] === 'ls') {
    const dir = commands[0].substring(3);
    return `ls ${dir}`;
  }
  
  // Special case: mkdir + cd
  if (commands.length === 2 && 
      commands[0].startsWith('mkdir ') && 
      commands[1].startsWith('cd ')) {
    const dir1 = commands[0].substring(6);
    const dir2 = commands[1].substring(3);
    
    if (dir1 === dir2) {
      return `mkdir -p ${dir1} && cd $_`;
    }
  }
  
  // Special case: git add + git commit
  if (commands.length === 2 && 
      commands[0].startsWith('git add ') && 
      commands[1].startsWith('git commit -m')) {
    const files = commands[0].substring(8);
    const message = commands[1].substring(13);
    
    if (files === '.') {
      return `git commit -am ${message}`;
    }
  }
  
  return null;
}

/**
 * Integrate pattern analysis with AI suggestions
 * 
 * @param {string} currentInput - Current command input
 * @param {Object} analysis - Command pattern analysis results
 * @param {Object} context - Current context (directory, etc.)
 * @returns {Object[]} Enhanced suggestions
 */
export const enhanceSuggestionsWithPatterns = (currentInput, analysis, context) => {
  const suggestions = [];
  
  if (!analysis || !currentInput) {
    return suggestions;
  }
  
  // Add suggestions based on command frequency
  if (analysis.commandFrequency && analysis.commandFrequency.length > 0) {
    const matchingFrequent = analysis.commandFrequency.filter(cmd => 
      cmd.command.startsWith(currentInput) && cmd.command !== currentInput
    );
    
    matchingFrequent.forEach(cmd => {
      // Add suggestion for the base command
      suggestions.push({
        command: cmd.command,
        description: `Used ${cmd.count} times recently`,
        source: 'frequency',
        score: 0.9 * (cmd.count / 10) // Score based on frequency, max 0.9
      });
      
      // Add common argument patterns for this command
      if (cmd.popularArgs && cmd.popularArgs.length > 0) {
        cmd.popularArgs.forEach(([args, count]) => {
          suggestions.push({
            command: `${cmd.command} ${args}`,
            description: `Used ${count} times`,
            source: 'frequency',
            score: 0.85 * (count / 10) // Slightly lower score than base command
          });
        });
      }
    });
  }
  
  // Add suggestions based on recognized patterns
  if (analysis.recognizedPatterns && analysis.recognizedPatterns.length > 0) {
    // Find patterns that match the current input
    const matchingPatterns = analysis.recognizedPatterns.filter(pattern => {
      // Check if any pattern examples match the current input
      return pattern.examples.some(example => 
        example.startsWith(currentInput) && example !== currentInput
      );
    });
    
    matchingPatterns.forEach(pattern => {
      // Find matching examples
      const matchingExamples = pattern.examples.filter(example => 
        example.startsWith(currentInput) && example !== currentInput
      );
      
      // Add suggestions from pattern examples
      matchingExamples.forEach(example => {
        suggestions.push({
          command: example,
          description: `${pattern.description} pattern`,
          source: 'pattern',
          score: 0.8 // Lower priority than frequency-based suggestions
        });
      });
    });
  }
  
  // Add optimization suggestions
  if (analysis.optimizations && analysis.optimizations.length > 0) {
    // Find optimizations that could apply to the current input
    const matchingOptimizations = analysis.optimizations.filter(opt => 
      opt.original.startsWith(currentInput) || 
      (currentInput.length > 3 && opt.original.includes(currentInput))
    );
    
    matchingOptimizations.forEach(opt => {
      suggestions.push({
        command: opt.optimized,
        description: `Optimization: ${opt.explanation}`,
        source: 'optimization',
        score: 0.75, // Lower priority than patterns
        original: opt.original,
        benefitType: opt.benefitType
      });
    });
  }
  
  // Add suggestions from common command sequences
  if (context.lastCommand && analysis.commandSequences && analysis.commandSequences.length > 0) {
    // Find sequences where the first command matches the last executed command
    const matchingSequences = analysis.commandSequences.filter(seq => 
      seq.commands[0] === context.lastCommand && 
      seq.commands.length > 1
    );
    
    matchingSequences.forEach(seq => {
      // Suggest the next command in the sequence
      const nextCommand = seq.commands[1];
      
      if (nextCommand.startsWith(currentInput) || currentInput === '') {
        suggestions.push({
          command: nextCommand,
          description: `Often follows '${context.lastCommand}'`,
          source: 'sequence',
          score: 0.95, // Higher priority because it's contextually relevant
          count: seq.count
        });
      }
    });
  }
  
  // Sort by score in descending order
  suggestions.sort((a, b) => b.score - a.score);
  
  // Limit to a reasonable number of suggestions and remove duplicates
  return suggestions
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.command === suggestion.command)
    )
    .slice(0, 5);
};

