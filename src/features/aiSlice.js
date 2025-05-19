import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

/**
 * Load AI settings from localStorage
 * @returns {Object} AI settings from localStorage or default settings
 */
const loadPersistedSettings = () => {
  try {
    const persistedSettings = localStorage.getItem('aiSettings');
    if (persistedSettings) {
      return JSON.parse(persistedSettings);
    }
  } catch (error) {
    console.error('Failed to load AI settings from localStorage:', error);
  }
  return null;
};

/**
 * Save AI settings to localStorage
 * @param {Object} settings - AI settings to persist
 */
const persistSettings = (settings) => {
  try {
    localStorage.setItem('aiSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save AI settings to localStorage:', error);
  }
};

// Default AI settings
const defaultSettings = {
  enabled: true,
  suggestionThreshold: 0.7,
  apiKey: '',
  offlineMode: false,
  model: 'gpt-3.5-turbo',
  maxTokens: 150,
  temperature: 0.7,
  contextWindow: 10,
  enableCommandExplanation: true,
  enableCommandSuggestions: true,
  enablePatternAnalysis: true,
  shareContextBetweenTabs: false,
  persistHistory: true,
  historyRetentionDays: 30,
};

// Load persisted settings or use defaults
const persistedSettings = loadPersistedSettings();
const initialSettings = persistedSettings ? { ...defaultSettings, ...persistedSettings } : defaultSettings;

// Initial state for the AI slice
const initialState = {
  settings: initialSettings,
  commandAnalysis: {
    currentCommand: '',
    parsedCommand: null,
    flags: [],
    arguments: [],
    isValid: false,
    suggestedCorrections: [],
  },
  commandExplanation: {
    explanation: '',
    examples: [],
    seeAlso: [],
    loading: false,
    error: null,
  },
  context: {
    recentCommands: [],
    environmentVariables: {},
    workingDirectory: '',
    shellType: 'bash',
    patterns: [],
    sharedContext: {},
  },
  suggestions: {
    commandSuggestions: [],
    autocompletions: [],
    loading: false,
    error: null,
  },
  patternAnalysis: {
    detectedPatterns: [],
    suggestedAliases: [],
    workflowOptimizations: [],
    commandFrequency: {},
    loading: false,
    error: null,
  },
  status: {
    loading: false,
    error: null,
    offlineMode: initialSettings.offlineMode,
  },
};

/**
 * Analyze command async thunk
 */
export const analyzeCommand = createAsyncThunk(
  'ai/analyzeCommand',
  async (command, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      if (ai.settings.offlineMode) {
        // Implement offline analysis logic here
        return {
          parsedCommand: {
            command: command.split(' ')[0],
            subcommand: command.split(' ').length > 1 ? command.split(' ')[1] : '',
          },
          flags: command.match(/-{1,2}[a-zA-Z0-9]+/g) || [],
          arguments: command.split(' ').filter(arg => !arg.startsWith('-')).slice(1),
          isValid: true,
          suggestedCorrections: [],
        };
      }
      
      // In a real implementation, this would call an AI service
      // For now, we'll just implement a simple parser
      const parsedCommand = {
        command: command.split(' ')[0],
        subcommand: command.split(' ').length > 1 ? command.split(' ')[1] : '',
      };
      
      const flags = command.match(/-{1,2}[a-zA-Z0-9]+/g) || [];
      const args = command.split(' ').filter(arg => !arg.startsWith('-')).slice(1);
      
      return {
        parsedCommand,
        flags,
        arguments: args,
        isValid: true,
        suggestedCorrections: [],
      };
    } catch (error) {
      return rejectWithValue(error.toString());
    }
  }
);

/**
 * Get command explanation async thunk
 */
export const getCommandExplanation = createAsyncThunk(
  'ai/getCommandExplanation',
  async (command, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      if (ai.settings.offlineMode) {
        // Return a simple explanation for offline mode
        return {
          explanation: `This is a simple explanation for "${command}" in offline mode.`,
          examples: [`Example usage of ${command}`],
          seeAlso: [],
        };
      }
      
      // In a real implementation, this would call an AI service for detailed explanation
      // For now, we'll just return a placeholder
      return {
        explanation: `Explanation for "${command}"`,
        examples: [`Example usage of ${command}`],
        seeAlso: [`Related command 1`, `Related command 2`],
      };
    } catch (error) {
      return rejectWithValue(error.toString());
    }
  }
);

/**
 * Get command suggestions async thunk
 */
export const getCommandSuggestions = createAsyncThunk(
  'ai/getCommandSuggestions',
  async (input, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      if (ai.settings.offlineMode) {
        // Return basic suggestions in offline mode
        return {
          commandSuggestions: ['ls -la', 'cd ..', 'git status'],
          autocompletions: input ? [input + ' --help', input + ' -v'] : [],
        };
      }
      
      // In a real implementation, this would call an AI service
      // For now, return some placeholder suggestions
      return {
        commandSuggestions: ['ls -la', 'cd ..', 'git status'],
        autocompletions: input ? [input + ' --help', input + ' -v'] : [],
      };
    } catch (error) {
      return rejectWithValue(error.toString());
    }
  }
);

/**
 * Analyze command patterns async thunk
 */
export const analyzeCommandPatterns = createAsyncThunk(
  'ai/analyzeCommandPatterns',
  async (commandHistory, { getState, rejectWithValue }) => {
    try {
      const { ai } = getState();
      
      if (ai.settings.offlineMode) {
        // Basic pattern analysis for offline mode
        return {
          detectedPatterns: ['Basic Git workflow', 'File navigation'],
          suggestedAliases: [{ alias: 'gs', command: 'git status' }],
          workflowOptimizations: ['Consider using git aliases'],
          commandFrequency: {
            'ls': 10,
            'cd': 8,
            'git': 15,
          },
        };
      }
      
      // In a real implementation, this would use pattern analysis algorithms
      // For now, return placeholder analysis
      return {
        detectedPatterns: ['Git workflow', 'File navigation', 'Docker operations'],
        suggestedAliases: [
          { alias: 'gs', command: 'git status' },
          { alias: 'll', command: 'ls -la' },
        ],
        workflowOptimizations: [
          'Consider using git aliases',
          'You frequently use npm run commands, consider creating shortcuts',
        ],
        commandFrequency: {
          'ls': 10,
          'cd': 8,
          'git': 15,
          'npm': 7,
          'docker': 5,
        },
      };
    } catch (error) {
      return rejectWithValue(error.toString());
    }
  }
);

/**
 * AI Slice with integrated persistence
 */
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Settings management
    updateSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
      // Persist settings whenever they're updated
      persistSettings(state.settings);
    },
    
    resetSettings: (state) => {
      state.settings = defaultSettings;
      persistSettings(defaultSettings);
    },
    
    toggleAIEnabled: (state) => {
      state.settings.enabled = !state.settings.enabled;
      persistSettings(state.settings);
    },
    
    toggleOfflineMode: (state) => {
      state.settings.offlineMode = !state.settings.offlineMode;
      state.status.offlineMode = state.settings.offlineMode;
      persistSettings(state.settings);
    },
    
    setOfflineMode: (state, action) => {
      const isOffline = action.payload;
      state.settings.offlineMode = isOffline;
      state.status.offlineMode = isOffline;
      
      // When switching to offline mode, clear active AI operations
      if (isOffline) {
        // Clear suggestions
        state.suggestions.commandSuggestions = [];
        state.suggestions.autocompletions = [];
        
        // Clear command explanation
        state.commandExplanation.explanation = '';
        state.commandExplanation.examples = [];
        state.commandExplanation.seeAlso = [];
        
        // Reset processing flags
        state.suggestions.loading = false;
        state.commandExplanation.loading = false;
        state.patternAnalysis.loading = false;
        
        // Add warning about limited functionality
        state.status.error = 'AI functionality is limited in offline mode';
      } else {
        // When switching back to online mode, clear offline-related errors
        if (state.status.error === 'AI functionality is limited in offline mode') {
          state.status.error = null;
        }
      }
      
      persistSettings(state.settings);
    },
    
    // Context management
    updateContext: (state, action) => {
      state.context = {
        ...state.context,
        ...action.payload,
      };
    },
    
    addCommandToHistory: (state, action) => {
      // Add to recent commands while maintaining limit
      state.context.recentCommands = [
        action.payload,
        ...state.context.recentCommands.slice(0, state.settings.contextWindow - 1)
      ];
    },
    
    updateEnvironmentVariables: (state, action) => {
      state.context.environmentVariables = {
        ...state.context.environmentVariables,
        ...action.payload,
      };
    },
    
    setWorkingDirectory: (state, action) => {
      state.context.workingDirectory = action.payload;
    },
    
    setShellType: (state, action) => {
      state.context.shellType = action.payload;
    },
    
    updateSharedContext: (state, action) => {
      state.context.sharedContext = {
        ...state.context.sharedContext,
        ...action.payload,
      };
    },
    
    // Command analysis management
    setCurrentCommand: (state, action) => {
      state.commandAnalysis.currentCommand = action.payload;
    },
    
    // Error handling
    clearError: (state) => {
      state.status.error = null;
      state.commandExplanation.error = null;
      state.suggestions.error = null;
      state.patternAnalysis.error = null;
    },
    
    // State management
    resetAIState: (state) => {
      // Reset everything except settings
      state.commandAnalysis = initialState.commandAnalysis;
      state.commandExplanation = initialState.commandExplanation;
      state.suggestions = initialState.suggestions;
      state.patternAnalysis = initialState.patternAnalysis;
      state.status = {
        ...initialState.status,
        offlineMode: state.settings.offlineMode,  // Keep offline mode setting
      };
    },
    
    clearCommandStats: (state) => {
      state.patternAnalysis = initialState.patternAnalysis;
    },
  },
  extraReducers: (builder) => {
    // Handle analyzeCommand
    builder
      .addCase(analyzeCommand.pending, (state) => {
        state.status.loading = true;
        state.status.error = null;
      })
      .addCase(analyzeCommand.fulfilled, (state, action) => {
        state.status.loading = false;
        state.commandAnalysis = {
          ...state.commandAnalysis,
          ...action.payload,
        };
      })
      .addCase(analyzeCommand.rejected, (state, action) => {
        state.status.loading = false;
        state.status.error = action.payload;
      })
    
    // Handle getCommandExplanation
    builder
      .addCase(getCommandExplanation.pending, (state) => {
        state.commandExplanation.loading = true;
        state.commandExplanation.error = null;
      })
      .addCase(getCommandExplanation.fulfilled, (state, action) => {
        state.commandExplanation.loading = false;
        state.commandExplanation = {
          ...state.commandExplanation,
          ...action.payload,
        };
      })
      .addCase(getCommandExplanation.rejected, (state, action) => {
        state.commandExplanation.loading = false;
        state.commandExplanation.error = action.payload;
      })
    
    // Handle getCommandSuggestions
    builder
      .addCase(getCommandSuggestions.pending, (state) => {
        state.suggestions.loading = true;
        state.suggestions.error = null;
      })
      .addCase(getCommandSuggestions.fulfilled, (state, action) => {
        state.suggestions.loading = false;
        state.suggestions = {
          ...state.suggestions,
          ...action.payload,
        };
      })
      .addCase(getCommandSuggestions.rejected, (state, action) => {
        state.suggestions.loading = false;
        state.suggestions.error = action.payload;
      })
    
    // Handle analyzeCommandPatterns
    builder
      .addCase(analyzeCommandPatterns.pending, (state) => {
        state.patternAnalysis.loading = true;
        state.patternAnalysis.error = null;
      })
      .addCase(analyzeCommandPatterns.fulfilled, (state, action) => {
        state.patternAnalysis.loading = false;
        state.patternAnalysis = {
          ...state.patternAnalysis,
          ...action.payload,
        };
      })
      .addCase(analyzeCommandPatterns.rejected, (state, action) => {
        state.patternAnalysis.loading = false;
        state.patternAnalysis.error = action.payload;
      });
  },
});

// Export actions
export const {
  updateSettings,
  resetSettings,
  toggleAIEnabled,
  toggleOfflineMode,
  setOfflineMode,
  updateContext,
  addCommandToHistory,
  updateEnvironmentVariables,
  setWorkingDirectory,
  setShellType,
  updateSharedContext,
  setCurrentCommand,
  clearError,
  resetAIState,
  clearCommandStats,
} = aiSlice.actions;

// Export selectors
export const selectAISettings = (state) => state.ai.settings;
export const selectCommandAnalysis = (state) => state.ai.commandAnalysis;
export const selectCommandExplanation = (state) => state.ai.commandExplanation;
export const selectAIContext = (state) => state.ai.context;
export const selectSuggestions = (state) => state.ai.suggestions;
export const selectPatternAnalysis = (state) => state.ai.patternAnalysis;
export const selectAIStatus = (state) => state.ai.status;
export const selectIsAIEnabled = (state) => state.ai.settings.enabled;
export const selectIsOfflineMode = (state) => state.ai.settings.offlineMode;

export default aiSlice.reducer;

