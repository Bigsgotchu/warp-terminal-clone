/**
 * SmartHistorySearch.js
 * 
 * Service for intelligent command history search with natural language understanding
 * Provides semantic search, contextual relevance scoring, and filtering capabilities
 */

import { aiService } from './aiService';

class SmartHistorySearch {
  constructor() {
    // Cache for search results to improve performance
    this.cache = new Map();
    this.cacheSize = 20;
    
    // Vocabulary for command context understanding
    this.vocabulary = this.buildVocabulary();
    
    // Command types and related terms for semantic matching
    this.commandCategories = this.buildCommandCategories();
  }

  /**
   * Search command history using natural language query
   * 
   * @param {string} query - Natural language search query
   * @param {Array} commandHistory - Array of command history entries
   * @param {Object} context - Context information like directory, timestamps
   * @returns {Promise<Object>} Search results with relevance scores
   */
  async search(query, commandHistory, context = {}) {
    // Skip empty queries
    if (!query || query.trim() === '') {
      return { results: [] };
    }
    
    // Check cache for exact query
    const cacheKey = `${query}:${context.currentDirectory || ''}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // In online mode, use AI for semantic search
      if (!aiService.offlineMode && aiService.apiKey) {
        return await this.semanticSearch(query, commandHistory, context);
      } else {
        // In offline mode, use advanced local search
        return this.advancedLocalSearch(query, commandHistory, context);
      }
    } catch (error) {
      console.error('Smart history search error:', error);
      // Fall back to basic search on errors
      return this.basicSearch(query, commandHistory, context);
    }
  }
  
  /**
   * Perform AI-powered semantic search for commands
   * 
   * @param {string} query - Natural language query
   * @param {Array} commandHistory - Command history
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Search results with scores
   */
  async semanticSearch(query, commandHistory, context) {
    // Prepare data for AI service
    const prompt = `
Search through this command history for: "${query}"

Commands:
${commandHistory.slice(0, 50).join('\n')}

Current directory: ${context.currentDirectory || '~'}

Return matches as a JSON array of objects with:
- command: the matching command
- score: relevance score between 0.0-1.0
- matchType: why this matched (e.g. "exact", "semantic", "pattern")
- reason: brief explanation of why this matches the query

Return ONLY valid JSON in the following format:
{"results": [{command, score, matchType, reason}, ...]}
`;

    try {
      const response = await fetch(aiService.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiService.apiKey}`
        },
        body: JSON.stringify({
          model: aiService.model,
          messages: [
            {
              role: 'system',
              content: 'You are a specialized search assistant that finds relevant commands in command history based on natural language queries.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON response (handle potential markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, content];
      const jsonContent = jsonMatch[1].trim();
      
      let results;
      try {
        results = JSON.parse(jsonContent);
      } catch (e) {
        // If parsing fails, try to extract just the JSON object part
        const objectMatch = jsonContent.match(/{[\s\S]*}/);
        if (objectMatch) {
          results = JSON.parse(objectMatch[0]);
        } else {
          throw e;
        }
      }
      
      // Enhance results with metadata
      const enhancedResults = this.enhanceResults(results.results || [], commandHistory, context);
      
      // Cache the results
      this.addToCache(cacheKey, { results: enhancedResults });
      
      return { results: enhancedResults };
    } catch (error) {
      console.error('Semantic search error:', error);
      // Fall back to advanced local search
      return this.advancedLocalSearch(query, commandHistory, context);
    }
  }
  
  /**
   * Advanced local search with contextual understanding
   * Used when offline or as fallback
   * 
   * @param {string} query - Search query
   * @param {Array} commandHistory - Command history
   * @param {Object} context - Context information
   * @returns {Object} Search results
   */
  advancedLocalSearch(query, commandHistory, context) {
    // Normalize and split query into keywords
    const normalizedQuery = query.toLowerCase();
    const keywords = this.extractKeywords(normalizedQuery);
    
    // Extract timeframe (if mentioned in query)
    const timeframe = this.extractTimeframe(normalizedQuery);
    
    // Extract command categories (if mentioned in query)
    const categories = this.extractCategories(normalizedQuery);
    
    // Process each command and calculate relevance score
    const results = commandHistory
      .map((command, index) => {
        const normalizedCommand = command.toLowerCase();
        
        // Calculate base relevance score
        let score = 0;
        
        // Check for keyword matches
        keywords.forEach(keyword => {
          if (normalizedCommand.includes(keyword)) {
            score += 0.2;
          }
        });
        
        // Check for exact command matches or subcommands
        if (normalizedCommand === normalizedQuery) {
          score += 0.8;
        } else if (normalizedCommand.startsWith(normalizedQuery)) {
          score += 0.5;
        }
        
        // Check for command type matches (git, network, etc.)
        if (categories.length > 0) {
          categories.forEach(category => {
            if (this.isCommandInCategory(normalizedCommand, category)) {
              score += 0.3;
            }
          });
        }
        
        // Boost score for more recent commands
        const recencyBoost = Math.max(0, 0.3 - (index * 0.01));
        score += recencyBoost;
        
        // Normalize score to 0-1 range
        score = Math.min(1.0, score);
        
        // Filter by threshold and return structured result
        if (score > 0.2) {
          return {
            command,
            score,
            matchType: this.determineMatchType(normalizedCommand, normalizedQuery, categories),
            reason: this.generateMatchReason(normalizedCommand, normalizedQuery, categories),
            metadata: {
              timestamp: Date.now() - (index * 600000), // Approximate timestamps (10min apart)
              directory: context.currentDirectory || '~'
            }
          };
        }
        return null;
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Limit to top 10 results
      
    return { 
      results,
      query,
      offlineMode: true
    };
  }
  
  /**
   * Basic keyword search (simplest fallback)
   * 
   * @param {string} query - Search query
   * @param {Array} commandHistory - Command history
   * @param {Object} context - Context information
   * @returns {Object} Search results
   */
  basicSearch(query, commandHistory, context) {
    const normalizedQuery = query.toLowerCase();
    
    const results = commandHistory
      .filter(cmd => cmd.toLowerCase().includes(normalizedQuery))
      .map((command, index) => ({
        command,
        score: 1.0 - (index * 0.05), // Simple recency-based scoring
        matchType: 'keyword',
        reason: `Contains keyword "${query}"`,
        metadata: {
          timestamp: Date.now() - (index * 600000),
          directory: context.currentDirectory || '~'
        }
      }))
      .slice(0, 10);
      
    return { 
      results,
      query,
      offlineMode: true
    };
  }
  
  /**
   * Enhance search results with additional metadata
   * 
   * @param {Array} results - Raw search results
   * @param {Array} commandHistory - Full command history
   * @param {Object} context - Context information
   * @returns {Array} Enhanced results
   */
  enhanceResults(results, commandHistory, context) {
    return results.map(result => {
      // Find position in history to estimate timestamp
      const historyIndex = commandHistory.findIndex(cmd => cmd === result.command);
      const position = historyIndex >= 0 ? historyIndex : 0;
      
      // Add metadata if not present
      if (!result.metadata) {
        result.metadata = {
          timestamp: Date.now() - (position * 600000), // Approximate timestamps (10min apart)
          directory: context.currentDirectory || '~'
        };
      }
      
      // Ensure all required fields are present
      return {
        command: result.command,
        score: result.score || 0.5,
        matchType: result.matchType || 'unknown',
        reason: result.reason || 'Matches search criteria',
        metadata: result.metadata
      };
    });
  }
  
  /**
   * Extract meaningful keywords from query
   * 
   * @param {string} query - Search query
   * @returns {Array} Extracted keywords
   */
  extractKeywords(query) {
    // Remove common stop words
    const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'from', 'to', 'of', 'search', 'find', 'show', 'display', 'list', 'get', 'my', 'me', 'commands', 'command'];
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }
  
  /**
   * Extract timeframe references from query
   * 
   * @param {string} query - Search query
   * @returns {Object|null} Timeframe information or null
   */
  extractTimeframe(query) {
    const timePatterns = [
      { regex: /today|last 24 hours/i, hours: 24 },
      { regex: /yesterday/i, hours: 48 },
      { regex: /this week|last 7 days/i, days: 7 },
      { regex: /last week/i, days: 14 },
      { regex: /this month/i, days: 30 },
      { regex: /last month/i, days: 60 }
    ];
    
    for (const pattern of timePatterns) {
      if (pattern.regex.test(query)) {
        return {
          type: pattern.hours ? 'hours' : 'days',
          value: pattern.hours || pattern.days
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract command categories from query
   * 
   * @param {string} query - Search query
   * @returns {Array} Command categories mentioned
   */
  extractCategories(query) {
    const categories = [];
    
    // Check each category against the query
    for (const [category, terms] of Object.entries(this.commandCategories)) {
      for (const term of terms) {
        if (query.includes(term)) {
          categories.push(category);
          break;
        }
      }
    }
    
    return categories;
  }
  
  /**
   * Determine if a command belongs to a specific category
   * 
   * @param {string} command - Command to check
   * @param {string} category - Category to check against
   * @returns {boolean} Whether command belongs to category
   */
  isCommandInCategory(command, category) {
    if (!this.commandCategories[category]) {
      return false;
    }
    
    const baseCommand = command.split(' ')[0];
    
    // Check if base command is directly in the category
    if (this.commandCategories[category].includes(baseCommand)) {
      return true;
    }
    
    // Check for category command patterns
    for (const term of this.commandCategories[category]) {
      if (command.includes(term)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Determine the type of match for a result
   * 
   * @param {string} command - Matched command
   * @param {string} query - Search query
   * @param {Array} categories - Matched categories
   * @returns {string} Match type description
   */
  determineMatchType(command, query, categories) {
    if (command === query) {
      return 'exact';
    }
    
    if (command.startsWith(query)) {
      return 'prefix';
    }
    
    if (categories.length > 0) {
      return categories[0]; // Return the primary category match
    }
    
    if (command.includes(query)) {
      return 'substring';
    }
    
    return 'semantic';
  }
  
  /**
   * Generate a human-readable reason for the match
   * 
   * @param {string} command - Matched command
   * @param {string} query - Search query
   * @param {Array} categories - Matched categories
   * @returns {string} Reason for match
   */
  generateMatchReason(command, query, categories) {
    if (command === query) {
      return 'Exact match for your search';
    }
    
    if (command.startsWith(query)) {
      return `Starts with "${query}"`;
    }
    
    if (categories.length > 0) {
      const categoryNames = {
        'git': 'Git operation',
        'network': 'Network command',
        'filesystem': 'File operation',
        'process': 'Process management',
        'package': 'Package management',
        'docker': 'Container operation'
      };
      
      return categoryNames[categories[0]] || `Related to ${categories[0]}`;
    }
    
    if (command.includes(query)) {
      return `Contains "${query}"`;
    }
    
    return 'Semantically relevant to your search

