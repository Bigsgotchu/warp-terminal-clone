
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { aiService } from '../../services/ai/aiService';

/**
 * Initial state for the AI feature slice
 * @typedef {Object} AIState
 */
const initialState = {
  // Command suggestions
  suggestions: [],
  activeSuggestionIndex: -1,
  
  // Command explanation
  commandExplanation: null,
  
  // Command patterns from history analysis
  commandPatterns: [],
  
  // Search history state
  searchHistory: {
    query: '',
    results: [],
    loading: false,
    error: null,
    lastSearchTimestamp: null
  },
  
  // Loading states
  isAnalyzing: false,
  isExplaining: false,
  isAnalyzingPatterns: false,
  isSearching: false,
  
  // Error handling
  error: null,
  
  // Context tracking for AI
  context: {
    recentCommands: [],
    currentDirectory: '~',
    lastOutput: null,
    lastError: null,
    environment: {},
    commandHistory: []
  },
  
  // AI settings
  settings: {
    enabled: true,
    suggestionThreshold: 2, // Min chars before showing suggestions
    maxSuggestions: 5,
    showExplanations: true,
    apiModel: 'gpt-3.5-turbo',
    contextDepth: 5, // Number of commands to keep in context
    offlineMode: false,
    apiEndpoint: process.env.REACT_APP_AI_API_ENDPOINT
  }
};

/**
 * Async thunk for analyzing command and getting suggestions
 * @param {string} command - The command to analyze
 * @returns {Promise<{suggestions: Array}>} - Promise resolving to suggestions
 */
export const analyzeCommand = createAsyncThunk(
  'ai/analyzeCommand',
  async (command, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      // Skip analysis if AI is disabled or command is too short
      if (!ai.settings.enabled || command.length < ai.settings.suggestionThreshold) {
        return { suggestions: [] };
      }
      
      const result = await aiService.analyzeCommand(command, ai.context);
      return result;
    } catch (error) {
      console.error('AI analysis error:', error);
      return rejectWithValue(error.message || 'Failed to analyze command');
    }
  }
);

/**
 * Async thunk for explaining a command
 * @param {string} command - The command to explain
 * @returns {Promise<Object|string>} - Promise resolving to explanation
 */
export const explainCommand = createAsyncThunk(
  'ai/explainCommand',
  async (command, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      // Skip if explanations are disabled
      if (!ai.settings.enabled || !ai.settings.showExplanations) {
        return null;
      }
      
      const explanation = await aiService.explainCommand(command);
      return explanation;
    } catch (error) {
      console.error('AI explanation error:', error);
      return rejectWithValue(error.message || 'Failed to explain command');
    }
  }
);

/**
 * Analyze command history and provide insights
 * @param {void} - No parameters needed, uses command history from state
 * @returns {Promise<{patterns: Array}>} - Promise resolving to command patterns
 */
export const analyzeCommandPatterns = createAsyncThunk(
  'ai/analyzeCommandPatterns',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      // Skip if AI is disabled or not enough history
      if (!ai.settings.enabled || ai.context.recentCommands.length < 2) {
        return { patterns: [] };
      }
      
      const result = await aiService.analyzeCommandPatterns(ai.context.recentCommands);
      return result;
    } catch (error) {
      console.error('Command pattern analysis error:', error);
      return rejectWithValue(error.message || 'Failed to analyze command patterns');
    }
  }
);

/**
 * Search command history using natural language query
 * @param {string} query - Natural language search query
 * @returns {Promise<{results: Array}>} - Promise resolving to search results
 */
export const searchCommandHistory = createAsyncThunk(
  'ai/searchCommandHistory',
  async (query, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      // Return empty results for empty queries
      if (!query || query.trim() === '') {
        return { results: [] };
      }
      
      // If offline mode is enabled, fall back to basic keyword matching
      if (ai.settings.offlineMode) {
        // Simple offline search implementation
        const results = ai.context.recentCommands
          .filter(cmd => cmd.toLowerCase().includes(query.toLowerCase()))
          .map((cmd, index) => ({
            command: cmd,
            score: 1.0 - (index * 0.1), // Simple relevance scoring based on recency
            matchType: 'keyword',
            metadata: {
              timestamp: Date.now() - (index * 60000), // Fake timestamps (now - index minutes)
              directory: ai.context.currentDirectory || '~'
            }
          }));
        
        return { 
          results, 
          offlineMode: true,
          timestamp: Date.now()
        };
      }
      
      // Use AI service for intelligent search in online mode
      const result = await aiService.searchCommandHistory(
        query,
        ai.context.recentCommands,
        {
          currentDirectory: ai.context.currentDirectory,
          environment: ai.context.environment
        }
      );
      
      // Add timestamp to the results
      return {
        ...result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Command history search error:', error);
      return rejectWithValue(error.message || 'Failed to search command history');
    }
  }
);

/**
 * Add command to history and update context
 * @param {string} command - The command to add to history
 * @returns {Promise<void>} - Promise resolving when history is updated
 */
export const addCommandToHistory = createAsyncThunk(
  'ai/addCommandToHistory',
  async (command, { dispatch, getState }) => {
    // First update the context with the new command
    dispatch(updateContext({
      lastCommand: command
    }));
    
    // Update recent commands with the new command at the start
    dispatch(updateRecentCommands(command));
    
    // If we have enough history, analyze patterns
    const { ai } = getState();
    if (ai.settings.enabled && ai.context.recentCommands.length >= 2) {
      dispatch(analyzeCommandPatterns());
    }
    
    return;
  }
);

/**
 * AI slice with reducers and actions
 */
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    /**
     * Update context with new information
     * @param {Object} action.payload - Context fields to update
     */
    updateContext: (state, action) => {
      state.context = {
        ...state.context,
        ...action.payload
      };
    },
    
    /**
     * Add a command to recent commands history
     * @param {string} action.payload - Command to add to history
     */
    updateRecentCommands: (state, action) => {
      const command = action.payload;
      // Avoid duplicates at the start of the history
      if (state.context.recentCommands[0] !== command) {
        state.context.recentCommands = [
          command,
          ...state.context.recentCommands.slice(0, state.settings.contextDepth - 1)
        ];
      }
    },
    
    /**
     * Clear all suggestions
     */
    clearSuggestions: (state) => {
      state.suggestions = [];
      state.activeSuggestionIndex = -1;
    },
    
    /**
     * Move to next suggestion
     */
    nextSuggestion: (state) => {
      if (state.suggestions.length > 0) {
        state.activeSuggestionIndex = 
          (state.activeSuggestionIndex + 1) % state.suggestions.length;
      }
    },
    
    /**
     * Move to previous suggestion
     */
    prevSuggestion: (state) => {
      if (state.suggestions.length > 0) {
        state.activeSuggestionIndex = 
          (state.activeSuggestionIndex - 1 + state.suggestions.length) % state.suggestions.length;
      }
    },
    
    /**
     * Reset suggestion navigation
     */
    resetSuggestionSelection: (state) => {
      state.activeSuggestionIndex = -1;
    },
    
    /**
     * Toggle AI features on/off
     */
    toggleAI: (state) => {
      state.settings.enabled = !state.settings.enabled;
      if (!state.settings.enabled) {
        state.suggestions = [];
        state.commandExplanation = null;
        state.commandPatterns = [];
      }
    },
    
    /**
     * Update AI settings
     * @param {Object} action.payload - Settings to update
     */
    updateSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload
      };
      
      // If changing API endpoint, clear cache in aiService
      if (action.payload.apiEndpoint !== undefined) {
        aiService.clearCache();
      }
    },
    
    /**
     * Clear command explanation
     */
    clearExplanation: (state) => {
      state.commandExplanation = null;
    },
    
    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * Clear command statistics (patterns and history)
     */
    clearCommandStats: (state) => {
      state.commandPatterns = [];
      state.context.commandHistory = [];
      // Reset any related statistics state
      state.isAnalyzingPatterns = false;
    },
    
    /**
     * Set search query
     * @param {string} action.payload - Search query string
     */
    setSearchQuery: (state, action) => {
      state.searchHistory.query = action.payload;
    },
    
    /**
     * Clear search results
     */
    clearSearchResults: (state) => {
      state.searchHistory.results = [];
      state.searchHistory.query = '';
      state.searchHistory.error = null;
    },
    
    /**
     * Clear all AI data (for sign out, etc.)
     */
    resetAIState: (state) => {
      state.suggestions = [];
      state.commandExplanation = null;
      state.commandPatterns = [];
      state.activeSuggestionIndex = -1;
      state.error = null;
      state.context.recentCommands = [];
      state.context.lastOutput = null;
      state.context.lastError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle analyzeCommand states
      .addCase(analyzeCommand.pending, (state) => {
        state.isAnalyzing = true;
        state.error = null;
      })
      .addCase(analyzeCommand.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.suggestions = action.payload.suggestions || [];
        state.activeSuggestionIndex = -1;
      })
      .addCase(analyzeCommand.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.error = action.payload;
        state.suggestions = [];
      })
      
      // Handle explainCommand states
      .addCase(explainCommand.pending, (state) => {
        state.isExplaining = true;
      })
      .addCase(explainCommand.fulfilled, (state, action) => {
        state.isExplaining = false;
        state.commandExplanation = action.payload;
      })
      .addCase(explainCommand.rejected, (state, action) => {
        state.isExplaining = false;
        state.error = action.payload;
      })
      
      // Handle analyzeCommandPatterns states
      .addCase(analyzeCommandPatterns.pending, (state) => {
        state.isAnalyzingPatterns = true;
      })
      .addCase(analyzeCommandPatterns.fulfilled, (state, action) => {
        state.isAnalyzingPatterns = false;
        state.commandPatterns = action.payload.patterns || [];
      })
      .addCase(analyzeCommandPatterns.rejected, (state, action) => {
        state.isAnalyzingPatterns = false;
        state.error = action.payload;
        state.commandPatterns = [];
      })
      
      // Handle searchCommandHistory states
      .addCase(searchCommandHistory.pending, (state) => {
        state.isSearching = true;
        state.searchHistory.loading = true;
        state.searchHistory.error = null;
      })
      .addCase(searchCommandHistory.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchHistory.loading = false;
        state.searchHistory.results = action.payload.results || [];
        state.searchHistory.lastSearchTimestamp = action.payload.timestamp;
        // Keep the current query (don't reset it on success)
      })
      .addCase(searchCommandHistory.rejected, (state, action) => {
        state.isSearching = false;
        state.searchHistory.loading = false;
        state.searchHistory.error = action.payload;
        state.searchHistory.results = []; // Clear results on error
      });
  }
});

// Export actions
export const {
  updateContext,
  updateRecentCommands,
  clearSuggestions,
  nextSuggestion,
  prevSuggestion,
  resetSuggestionSelection,
  toggleAI,
  updateSettings,
  clearExplanation,
  clearError,
  clearCommandStats,
  resetAIState,
  setSearchQuery,
  clearSearchResults
} = aiSlice.actions;

// Export selectors
/**
 * Select suggestions from state
 * @param {Object} state - Redux state
 * @returns {Array} - Suggestions array
 */
export const selectSuggestions = (state) => state.ai.suggestions;

/**
 * Select active suggestion from state
 * @param {Object} state - Redux state
 * @returns {Object|null} - Active suggestion or null
 */
export const selectActiveSuggestion = (state) => {
  if (state.ai.activeSuggestionIndex >= 0 && state.ai.suggestions.length > 0) {
    return state.ai.suggestions[state.ai.activeSuggestionIndex];
  }
  return null;
};

/**
 * Select active suggestion index from state
 * @param {Object} state - Redux state
 * @returns {number} - Active suggestion index
 */
export const selectActiveSuggestionIndex = (state) => state.ai.activeSuggestionIndex;

/**
 * Select is analyzing state
 * @param {Object} state - Redux state
 * @returns {boolean} - True if currently analyzing
 */
export const selectIsAnalyzing = (state) => state.ai.isAnalyzing;

/**
 * Select is explaining state
 * @param {Object} state - Redux state
 * @returns {boolean} - True if currently explaining
 */
export const selectIsExplaining = (state) => state.ai.isExplaining;

/**
 * Select AI enabled state
 * @param {Object} state - Redux state
 * @returns {boolean} - True if AI is enabled
 */
export const selectAIEnabled = (state) => state.ai.settings.enabled;

/**
 * Select AI settings
 * @param {Object} state - Redux state
 * @returns {Object} - AI settings object
 */
export const selectAISettings = (state) => state.ai.settings;

/**
 * Select command explanation
 * @param {Object} state - Redux state
 * @returns {Object|string|null} - Command explanation or null
 */
export const selectCommandExplanation = (state) => state.ai.commandExplanation;

/**
 * Select context
 * @param {Object} state - Redux state
 * @returns {Object} - AI context
 */
export const selectContext = (state) => state.ai.context;

/**
 * Select command patterns
 * @param {Object} state - Redux state
 * @returns {Array} - Command patterns
 */
export const selectCommandPatterns = (state) => state.ai.commandPatterns;

/**
 * Select error state
 * @param {Object} state - Redux state
 * @returns {string|null} - Error message or null
 */
export const selectError = (state) => state.ai.error;

/**
 * Select command history from context
 * @param {Object} state - Redux state
 * @returns {Array} - Command history array
 */
export const selectCommandHistory = (state) => state.ai.context.commandHistory;

/**
 * Select search history state
 * @param {Object} state - Redux state
 * @returns {Object} - Search history state
 */
export const selectSearchHistory = (state) => state.ai.searchHistory;

/**
 * Select search results
 * @param {Object} state - Redux state
 * @returns {Array} - Search results array
 */
export const selectSearchResults = (state) => state.ai.searchHistory.results;

/**
 * Select if search is in progress
 * @param {Object} state - Redux state
 * @returns {boolean} - True if search is in progress
 */
export const selectIsSearching = (state) => state.ai.isSearching;

/**
 * Select search query
 * @param {Object} state - Redux state
 * @returns {string} - Current search query
 */
export const selectSearchQuery = (state) => state.ai.searchHistory.query;

export default aiSlice.reducer;
