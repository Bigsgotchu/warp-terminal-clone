import { configureStore } from '@reduxjs/toolkit';
import aiReducer, {
  // Actions
  updateSettings,
  resetSettings,
  toggleAIEnabled,
  toggleOfflineMode,
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
  
  // Async thunks
  analyzeCommand,
  getCommandExplanation,
  getCommandSuggestions,
  analyzeCommandPatterns,
  
  // Selectors
  selectAISettings,
  selectCommandAnalysis,
  selectCommandExplanation,
  selectAIContext,
  selectSuggestions,
  selectPatternAnalysis,
  selectAIStatus,
  selectIsAIEnabled,
  selectIsOfflineMode
} from '../aiSlice';

// Mock localStorage
const mockLocalStorageData = {};
const localStorageMock = {
  getItem: jest.fn(key => mockLocalStorageData[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorageData[key] = value;
  }),
  removeItem: jest.fn(key => {
    delete mockLocalStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockLocalStorageData).forEach(key => {
      delete mockLocalStorageData[key];
    });
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock console to prevent test output clutter
console.error = jest.fn();

describe('AI Slice', () => {
  let store;
  
  // Helper function to create a fresh store before each test
  const createTestStore = (preloadedState = {}) => {
    return configureStore({
      reducer: {
        ai: aiReducer
      },
      preloadedState
    });
  };
  
  beforeEach(() => {
    // Clear localStorage mock data before each test
    localStorageMock.clear();
    console.error.mockClear();
    
    // Create a fresh store before each test
    store = createTestStore();
  });
  
  // ==================== REDUCER TESTS ====================
  
  describe('Reducer', () => {
    it('should return the initial state', () => {
      const initialState = store.getState().ai;
      
      expect(initialState).toHaveProperty('settings');
      expect(initialState).toHaveProperty('commandAnalysis');
      expect(initialState).toHaveProperty('commandExplanation');
      expect(initialState).toHaveProperty('context');
      expect(initialState).toHaveProperty('suggestions');
      expect(initialState).toHaveProperty('patternAnalysis');
      expect(initialState).toHaveProperty('status');
    });
    
    describe('Settings reducers', () => {
      it('should handle updateSettings', () => {
        const newSettings = {
          enabled: false,
          apiKey: 'test-api-key',
          model: 'gpt-4'
        };
        
        store.dispatch(updateSettings(newSettings));
        
        const state = store.getState().ai;
        expect(state.settings.enabled).toBe(false);
        expect(state.settings.apiKey).toBe('test-api-key');
        expect(state.settings.model).toBe('gpt-4');
        // Other settings should remain at default values
        expect(state.settings.suggestionThreshold).toBe(0.7);
      });
      
      it('should handle resetSettings', () => {
        // First change some settings
        store.dispatch(updateSettings({
          enabled: false,
          apiKey: 'test-api-key'
        }));
        
        // Then reset
        store.dispatch(resetSettings());
        
        const state = store.getState().ai;
        expect(state.settings.enabled).toBe(true); // Default is true
        expect(state.settings.apiKey).toBe(''); // Default is empty string
      });
      
      it('should handle toggleAIEnabled', () => {
        // Default is enabled=true, toggle to false
        store.dispatch(toggleAIEnabled());
        
        let state = store.getState().ai;
        expect(state.settings.enabled).toBe(false);
        
        // Toggle back to true
        store.dispatch(toggleAIEnabled());
        
        state = store.getState().ai;
        expect(state.settings.enabled).toBe(true);
      });
      
      it('should handle toggleOfflineMode', () => {
        // Default is offlineMode=false, toggle to true
        store.dispatch(toggleOfflineMode());
        
        let state = store.getState().ai;
        expect(state.settings.offlineMode).toBe(true);
        expect(state.status.offlineMode).toBe(true);
        
        // Toggle back to false
        store.dispatch(toggleOfflineMode());
        
        state = store.getState().ai;
        expect(state.settings.offlineMode).toBe(false);
        expect(state.status.offlineMode).toBe(false);
      });
    });
    
    describe('Context reducers', () => {
      it('should handle updateContext', () => {
        const newContext = {
          workingDirectory: '/home/user',
          shellType: 'zsh'
        };
        
        store.dispatch(updateContext(newContext));
        
        const state = store.getState().ai;
        expect(state.context.workingDirectory).toBe('/home/user');
        expect(state.context.shellType).toBe('zsh');
        // Other context properties should remain at default values
        expect(state.context.recentCommands).toEqual([]);
      });
      
      it('should handle addCommandToHistory', () => {
        const command1 = 'ls -la';
        const command2 = 'cd /home';
        
        store.dispatch(addCommandToHistory(command1));
        
        let state = store.getState().ai;
        expect(state.context.recentCommands).toEqual([command1]);
        
        store.dispatch(addCommandToHistory(command2));
        
        state = store.getState().ai;
        expect(state.context.recentCommands).toEqual([command2, command1]);
      });
      
      it('should limit command history to contextWindow size', () => {
        // Set contextWindow to 2
        store.dispatch(updateSettings({ contextWindow: 2 }));
        
        // Add 3 commands
        store.dispatch(addCommandToHistory('command1'));
        store.dispatch(addCommandToHistory('command2'));
        store.dispatch(addCommandToHistory('command3'));
        
        const state = store.getState().ai;
        // Should only keep the 2 most recent commands
        expect(state.context.recentCommands).toEqual(['command3', 'command2']);
      });
      
      it('should handle updateEnvironmentVariables', () => {
        const envVars = {
          PATH: '/usr/bin:/bin',
          HOME: '/home/user'
        };
        
        store.dispatch(updateEnvironmentVariables(envVars));
        
        const state = store.getState().ai;
        expect(state.context.environmentVariables).toEqual(envVars);
      });
      
      it('should handle setWorkingDirectory', () => {
        const directory = '/home/user/projects';
        
        store.dispatch(setWorkingDirectory(directory));
        
        const state = store.getState().ai;
        expect(state.context.workingDirectory).toBe(directory);
      });
      
      it('should handle setShellType', () => {
        const shellType = 'fish';
        
        store.dispatch(setShellType(shellType));
        
        const state = store.getState().ai;
        expect(state.context.shellType).toBe(shellType);
      });
      
      it('should handle updateSharedContext', () => {
        const sharedContext = {
          globalVariables: {
            EDITOR: 'vim'
          },
          projectType: 'node'
        };
        
        store.dispatch(updateSharedContext(sharedContext));
        
        const state = store.getState().ai;
        expect(state.context.sharedContext).toEqual(sharedContext);
      });
    });
    
    describe('Command analysis reducers', () => {
      it('should handle setCurrentCommand', () => {
        const command = 'git checkout -b feature/new-branch';
        
        store.dispatch(setCurrentCommand(command));
        
        const state = store.getState().ai;
        expect(state.commandAnalysis.currentCommand).toBe(command);
      });
    });
    
    describe('Error handling reducers', () => {
      it('should handle clearError', () => {
        // Create a store with errors in various parts of the state
        const storeWithErrors = createTestStore({
          ai: {
            status: { error: 'General error' },
            commandExplanation: { error: 'Explanation error' },
            suggestions: { error: 'Suggestions error' },
            patternAnalysis: { error: 'Pattern analysis error' }
          }
        });
        
        storeWithErrors.dispatch(clearError());
        
        const state = storeWithErrors.getState().ai;
        expect(state.status.error).toBeNull();
        expect(state.commandExplanation.error).toBeNull();
        expect(state.suggestions.error).toBeNull();
        expect(state.patternAnalysis.error).toBeNull();
      });
    });
    
    describe('State management reducers', () => {
      it('should handle resetAIState', () => {
        // First modify the state
        store.dispatch(setCurrentCommand('git status'));
        store.dispatch(updateContext({ workingDirectory: '/home/user' }));
        
        // Then reset
        store.dispatch(resetAIState());
        
        const state = store.getState().ai;
        expect(state.commandAnalysis.currentCommand).toBe('');
        expect(state.context.workingDirectory).toBe(''); // This should NOT reset as context is not reset
        // Settings should be preserved
        expect(state.settings.enabled).toBe(true);
      });
      
      it('should handle clearCommandStats', () => {
        // Mock state with some pattern analysis data
        const mockState = {
          ai: {
            patternAnalysis: {
              detectedPatterns: ['Git workflow'],
              suggestedAliases: [{ alias: 'gs', command: 'git status' }],
              workflowOptimizations: ['Use git aliases'],
              commandFrequency: { 'git': 10 }
            }
          }
        };
        
        const storeWithPatterns = createTestStore(mockState);
        
        storeWithPatterns.dispatch(clearCommandStats());
        
        const state = storeWithPatterns.getState().ai;
        expect(state.patternAnalysis.detectedPatterns).toEqual([]);
        expect(state.patternAnalysis.suggestedAliases).toEqual([]);
        expect(state.patternAnalysis.workflowOptimizations).toEqual([]);
        expect(state.patternAnalysis.commandFrequency).toEqual({});
      });
    });
  });
  
  // ==================== ASYNC THUNK TESTS ====================
  
  describe('Async Thunks', () => {
    describe('analyzeCommand', () => {
      it('should handle analyzeCommand.fulfilled', async () => {
        await store.dispatch(analyzeCommand('git checkout -b feature/branch'));
        
        const state = store.getState().ai;
        expect(state.status.loading).toBe(false);
        expect(state.commandAnalysis.parsedCommand).toEqual({
          command: 'git',
          subcommand: 'checkout'
        });
        expect(state.commandAnalysis.flags).toEqual(['-b']);
        expect(state.commandAnalysis.arguments).toContain('feature/branch');
        expect(state.commandAnalysis.isValid).toBe(true);
      });
      
      it('should use simplified analysis in offline mode', async () => {
        // Enable offline mode
        store.dispatch(toggleOfflineMode());
        
        await store.dispatch(analyzeCommand('git checkout -b feature/branch'));
        
        const state = store.getState().ai;
        expect(state.commandAnalysis.parsedCommand).toEqual({
          command: 'git',
          subcommand: 'checkout'
        });
        expect(state.commandAnalysis.flags).toEqual(['-b']);
        expect(state.commandAnalysis.arguments).toContain('feature/branch');
      });
      
      it('should handle analyzeCommand.rejected with error state', async () => {
        // Mock implementation to force rejection
        const originalThunk = analyzeCommand.fulfilled;
        analyzeCommand.fulfilled = jest.fn(() => {
          throw new Error('Test error');
        });
        
        try {
          await store.dispatch(analyzeCommand('invalid command'));
        } catch (err) {
          // Ignore the error as we're just testing error state
        }
        
        // Restore original implementation
        analyzeCommand.fulfilled = originalThunk;
        
        const state = store.getState().ai;
        expect(state.status.loading).toBe(false);
        expect(state.status.error).not.toBeNull();
      });
    });
    
    describe('getCommandExplanation', () => {
      it('should handle getCommandExplanation.fulfilled', async () => {
        await store.dispatch(getCommandExplanation('ls -la'));
        
        const state = store.getState().ai;
        expect(state.commandExplanation.loading).toBe(false);
        expect(state.commandExplanation.explanation).toBeTruthy();
        expect(state.commandExplanation.examples).toBeTruthy();
        expect(state.commandExplanation.seeAlso).toBeTruthy();
      });
      
      it('should use simplified explanation in offline mode', async () => {
        // Enable offline mode
        store.dispatch(toggleOfflineMode());
        
        await store.dispatch(getCommandExplanation('ls -la'));
        
        const state = store.getState().ai;
        expect(state.commandExplanation.explanation).toContain('offline mode');
      });
    });
    
    describe('getCommandSuggestions', () => {
      it('should handle getCommandSuggestions.fulfilled', async () => {
        await store.dispatch(getCommandSuggestions('git'));
        
        const state = store.getState().ai;
        expect(state.suggestions.loading).toBe(false);
        expect(state.suggestions.commandSuggestions.length).toBeGreaterThan(0);
        expect(state.suggestions.autocompletions.length).toBeGreaterThan(0);
      });
      
      it('should use basic suggestions in offline mode', async () => {
        // Enable offline mode
        store.dispatch(toggleOfflineMode());
        
        await store.dispatch(getCommandSuggestions('git'));
        
        const state = store.getState().ai;
        expect(state.suggestions.loading).toBe(false);
        expect(state.suggestions.commandSuggestions).toEqual([
          { command: 'git status', description: 'Show the working tree status' },
          { command: 'git pull', description: 'Fetch from and integrate with another repository or a local branch' },
          { command: 'git push', description: 'Update remote refs along with associated objects' }
        ]);
        expect(state.suggestions.autocompletions).toEqual(['git status', 'git pull', 'git push']);
      });
      
      it('should handle getCommandSuggestions.rejected with error state', async () => {
        // Mock implementation to force rejection
        const originalThunk = getCommandSuggestions.fulfilled;
        getCommandSuggestions.fulfilled = jest.fn(() => {
          throw new Error('Test error for suggestions');
        });
        
        try {
          await store.dispatch(getCommandSuggestions('invalid command'));
        } catch (err) {
          // Ignore the error as we're just testing error state
        }
        
        // Restore original implementation
        getCommandSuggestions.fulfilled = originalThunk;
        
        const state = store.getState().ai;
        expect(state.suggestions.loading).toBe(false);
        expect(state.suggestions.error).not.toBeNull();
      });
    });
    
    describe('analyzeCommandPatterns', () => {
      it('should handle analyzeCommandPatterns.fulfilled', async () => {
        // Simulate command history
        store.dispatch(addCommandToHistory('git status'));
        store.dispatch(addCommandToHistory('git checkout -b feature'));
        store.dispatch(addCommandToHistory('git add .'));
        store.dispatch(addCommandToHistory('git commit -m "Initial commit"'));
        
        await store.dispatch(analyzeCommandPatterns());
        
        const state = store.getState().ai;
        expect(state.patternAnalysis.loading).toBe(false);
        expect(state.patternAnalysis.detectedPatterns).toContain('Git workflow');
        expect(state.patternAnalysis.suggestedAliases.length).toBeGreaterThan(0);
        expect(state.patternAnalysis.workflowOptimizations).toContain('Use git aliases');
        expect(state.patternAnalysis.commandFrequency).toHaveProperty('git');
      });
      
      it('should handle empty command history', async () => {
        await store.dispatch(analyzeCommandPatterns());
        
        const state = store.getState().ai;
        expect(state.patternAnalysis.loading).toBe(false);
        expect(state.patternAnalysis.detectedPatterns).toEqual([]);
        expect(state.patternAnalysis.suggestedAliases).toEqual([]);
        expect(state.patternAnalysis.workflowOptimizations).toEqual([]);
        expect(state.patternAnalysis.commandFrequency).toEqual({});
      });
      
      it('should use simplified analysis in offline mode', async () => {
        // Enable offline mode
        store.dispatch(toggleOfflineMode());
        
        // Add some commands
        store.dispatch(addCommandToHistory('git status'));
        store.dispatch(addCommandToHistory('git commit -m "test"'));
        
        await store.dispatch(analyzeCommandPatterns());
        
        const state = store.getState().ai;
        expect(state.patternAnalysis.detectedPatterns).toEqual(['Basic Git usage']);
        expect(state.patternAnalysis.suggestedAliases).toEqual([
          { alias: 'gs', command: 'git status' },
          { alias: 'gc', command: 'git commit' }
        ]);
        expect(state.patternAnalysis.commandFrequency).toEqual({ 'git': 2 });
      });
      
      it('should handle analyzeCommandPatterns.rejected with error state', async () => {
        // Mock implementation to force rejection
        const originalThunk = analyzeCommandPatterns.fulfilled;
        analyzeCommandPatterns.fulfilled = jest.fn(() => {
          throw new Error('Test error for pattern analysis');
        });
        
        try {
          await store.dispatch(analyzeCommandPatterns());
        } catch (err) {
          // Ignore the error as we're just testing error state
        }
        
        // Restore original implementation
        analyzeCommandPatterns.fulfilled = originalThunk;
        
        const state = store.getState().ai;
        expect(state.patternAnalysis.loading).toBe(false);
        expect(state.patternAnalysis.error).not.toBeNull();
      });
    });
  });
  
  // ==================== SELECTOR TESTS ====================
  
  describe('Selectors', () => {
    it('should select AI settings correctly', () => {
      store.dispatch(updateSettings({
        enabled: false,
        model: 'gpt-3.5-turbo'
      }));
      
      const settings = selectAISettings(store.getState());
      expect(settings.enabled).toBe(false);
      expect(settings.model).toBe('gpt-3.5-turbo');
    });
    
    it('should select command analysis correctly', () => {
      store.dispatch(analyzeCommand('git checkout -b feature/branch'));
      
      const analysis = selectCommandAnalysis(store.getState());
      expect(analysis.parsedCommand).toEqual({
        command: 'git',
        subcommand: 'checkout'
      });
      expect(analysis.flags).toEqual(['-b']);
    });
    
    it('should select command explanation correctly', () => {
      store.dispatch(getCommandExplanation('ls -la'));
      
      const explanation = selectCommandExplanation(store.getState());
      expect(explanation.explanation).toBeTruthy();
      expect(explanation.examples).toBeTruthy();
    });
    
    it('should select AI context correctly', () => {
      store.dispatch(setWorkingDirectory('/home/user'));
      store.dispatch(addCommandToHistory('cd /tmp'));
      
      const context = selectAIContext(store.getState());
      expect(context.workingDirectory).toBe('/home/user');
      expect(context.recentCommands).toContain('cd /tmp');
    });
    
    it('should select suggestions correctly', () => {
      store.dispatch(getCommandSuggestions('git'));
      
      const suggestions = selectSuggestions(store.getState());
      expect(suggestions.commandSuggestions.length).toBeGreaterThan(0);
      expect(suggestions.autocompletions.length).toBeGreaterThan(0);
    });
    
    it('should select pattern analysis correctly', () => {
      // Simulate command history
      store.dispatch(addCommandToHistory('git status'));
      store.dispatch(addCommandToHistory('git commit -m "test"'));
      
      store.dispatch(analyzeCommandPatterns());
      
      const patterns = selectPatternAnalysis(store.getState());
      expect(patterns.detectedPatterns).toBeTruthy();
      expect(patterns.suggestedAliases).toBeTruthy();
      expect(patterns.commandFrequency).toHaveProperty('git');
    });
    
    it('should select AI status correctly', () => {
      const status = selectAIStatus(store.getState());
      expect(status).toHaveProperty('loading');
      expect(status).toHaveProperty('error');
      expect(status).toHaveProperty('offlineMode');
    });
    
    it('should select isAIEnabled correctly', () => {
      // Default should be enabled
      expect(selectIsAIEnabled(store.getState())).toBe(true);
      
      // Disable AI
      store.dispatch(toggleAIEnabled());
      expect(selectIsAIEnabled(store.getState())).toBe(false);
    });
    
    it('should select isOfflineMode correctly', () => {
      // Default should be offline mode disabled
      expect(selectIsOfflineMode(store.getState())).toBe(false);
      
      // Enable offline mode
      store.dispatch(toggleOfflineMode());
      expect(selectIsOfflineMode(store.getState())).toBe(true);
    });
  });
  
  // ==================== LOCALSTORAGE PERSISTENCE TESTS ====================
  
  describe('LocalStorage Persistence', () => {
    it('should load settings from localStorage on state initialization', () => {
      // Prepare localStorage with settings
      const savedSettings = {
        enabled: false,
        apiKey: 'saved-api-key',
        model: 'gpt-4',
        offlineMode: true,
        suggestionThreshold: 0.8,
        contextWindow: 10
      };
      
      localStorageMock.setItem('warpTerminal_aiSettings', JSON.stringify(savedSettings));
      
      // Create a new store to trigger the initialization
      const newStore = createTestStore();
      
      // Check that settings were loaded from localStorage
      const state = newStore.getState().ai;
      expect(state.settings.enabled).toBe(false);
      expect(state.settings.apiKey).toBe('saved-api-key');
      expect(state.settings.model).toBe('gpt-4');
      expect(state.settings.offlineMode).toBe(true);
      expect(state.settings.suggestionThreshold).toBe(0.8);
      expect(state.settings.contextWindow).toBe(10);
    });
    
    it('should save settings to localStorage when updated', () => {
      // Update settings
      store.dispatch(updateSettings({
        apiKey: 'new-api-key',
        model: 'gpt-3.5-turbo'
      }));
      
      // Check localStorage was updated
      const savedSettings = JSON.parse(localStorageMock.getItem('warpTerminal_aiSettings'));
      expect(savedSettings.apiKey).toBe('new-api-key');
      expect(savedSettings.model).toBe('gpt-3.5-turbo');
    });
    
    it('should handle corrupted localStorage data gracefully', () => {
      // Set corrupted data in localStorage
      localStorageMock.setItem('warpTerminal_aiSettings', 'not-valid-json');
      
      // Create a new store to trigger the initialization
      const newStore = createTestStore();
      
      // Should fall back to default settings
      const state = newStore.getState().ai;
      expect(state.settings.enabled).toBe(true); // Default value
      expect(state.settings.apiKey).toBe(''); // Default value
      
      // Should log an error
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should migrate settings from older versions', () => {
      // Set old format settings in localStorage
      const oldFormatSettings = {
        apiEnabled: true, // Old property name
        openAIKey: 'old-api-key', // Old property name
        model: 'text-davinci-003' // Old model name
      };
      
      localStorageMock.setItem('warpTerminal_aiSettings', JSON.stringify(oldFormatSettings));
      
      // Create a new store to trigger the initialization and migration
      const newStore = createTestStore();
      
      // Check that settings were migrated correctly
      const state = newStore.getState().ai;
      expect(state.settings.enabled).toBe(true); // Migrated from apiEnabled
      expect(state.settings.apiKey).toBe('old-api-key'); // Migrated from openAIKey
      expect(state.settings.model).toBe('gpt-3.5-turbo'); // Upgraded from old model
    });
    
    it('should persist selected command history and context', () => {
      // Update context with commands
      store.dispatch(addCommandToHistory('ls -la'));
      store.dispatch(setWorkingDirectory('/home/user'));
      
      // Check if localStorage was updated with the context
      const savedContext = JSON.parse(localStorageMock.getItem('warpTerminal_aiContext'));
      expect(savedContext.recentCommands).toContain('ls -la');
      expect(savedContext.workingDirectory).toBe('/home/user');
    });
  });
  
  // ==================== INTEGRATION TESTS ====================
  
  describe('Integration tests', () => {
    it('should manage command analysis workflow correctly', async () => {
      // Set a current command
      store.dispatch(setCurrentCommand('git checkout -b feature/new-branch'));
      
      // Analyze the command
      await store.dispatch(analyzeCommand('git checkout -b feature/new-branch'));
      
      // Check analysis results
      let state = store.getState().ai;
      expect(state.commandAnalysis.parsedCommand).toEqual({
        command: 'git',
        subcommand: 'checkout'
      });
      expect(state.commandAnalysis.flags).toEqual(['-b']);
      expect(state.commandAnalysis.arguments).toContain('feature/new-branch');
      
      // Get explanation of the command
      await store.dispatch(getCommandExplanation('git checkout -b feature/new-branch'));
      
      // Check explanation was populated
      state = store.getState().ai;
      expect(state.commandExplanation.explanation).toBeTruthy();
      expect(state.commandExplanation.examples).toBeTruthy();
      
      // Add command to history
      store.dispatch(addCommandToHistory('git checkout -b feature/new-branch'));
      
      // Verify command was added to history
      state = store.getState().ai;
      expect(state.context.recentCommands[0]).toBe('git checkout -b feature/new-branch');
      
      // Complete workflow by verifying everything is stored properly
      expect(JSON.parse(localStorage.getItem('warpTerminal_aiContext')).recentCommands[0]).toBe('git checkout -b feature/new-branch');
    });
    
    it('should manage command suggestions workflow correctly', async () => {
      // Set context for better suggestions
      store.dispatch(setWorkingDirectory('/home/user/projects/git-repo'));
      store.dispatch(setShellType('bash'));
      store.dispatch(addCommandToHistory('git status'));
      store.dispatch(setCurrentCommand('git'));
      
      // Get suggestions for the partial command
      await store.dispatch(getCommandSuggestions('git'));
      
      // Check suggestion results
      let state = store.getState().ai;
      expect(state.suggestions.commandSuggestions.length).toBeGreaterThan(0);
      expect(state.suggestions.autocompletions.length).toBeGreaterThan(0);
      expect(state.suggestions.loading).toBe(false);
      
      // Simulate user selecting a suggestion (git status)
      const selectedSuggestion = state.suggestions.commandSuggestions.find(
        suggestion => suggestion.command.includes('git status')
      );
      expect(selectedSuggestion).toBeTruthy();
      
      // Update current command based on suggestion
      store.dispatch(setCurrentCommand(selectedSuggestion.command));
      
      // Verify command was updated
      state = store.getState().ai;
      expect(state.commandAnalysis.currentCommand).toBe(selectedSuggestion.command);
      
      // Run the command and add to history
      store.dispatch(addCommandToHistory(selectedSuggestion.command));
      
      // Verify command was added to history and context
      state = store.getState().ai;
      expect(state.context.recentCommands[0]).toBe(selectedSuggestion.command);
    });
    
    it('should manage pattern analysis workflow with context correctly', async () => {
      // Set up a rich command history showing git workflow
      store.dispatch(setWorkingDirectory('/home/user/projects/my-project'));
      store.dispatch(setShellType('zsh'));
      
      // Simulate a series of git commands
      const gitCommands = [
        'git init',
        'git add .',
        'git commit -m "Initial commit"',
        'git remote add origin https://github.com/user/repo.git',
        'git push -u origin main',
        'git checkout -b feature/new-feature',
        'git status',
        'git add src/components/NewComponent.js',
        'git commit -m "Add new component"',
        'git push origin feature/new-feature'
      ];
      
      // Add commands to history in reverse order to simulate chronological usage
      [...gitCommands].reverse().forEach(cmd => {
        store.dispatch(addCommandToHistory(cmd));
      });
      
      // Run pattern analysis
      await store.dispatch(analyzeCommandPatterns());
      
      // Check pattern analysis results
      let state = store.getState().ai;
      expect(state.patternAnalysis.loading).toBe(false);
      expect(state.patternAnalysis.detectedPatterns).toContain('Git workflow');
      expect(state.patternAnalysis.suggestedAliases.length).toBeGreaterThan(0);
      expect(state.patternAnalysis.workflowOptimizations).toContain('Use git aliases');
      expect(state.patternAnalysis.commandFrequency).toHaveProperty('git');
      expect(state.patternAnalysis.commandFrequency.git).toBe(10);
      
      // Verify that suggested aliases include common git commands
      const hasGitStatusAlias = state.patternAnalysis.suggestedAliases.some(
        alias => alias.command === 'git status'
      );
      expect(hasGitStatusAlias).toBe(true);
      
      // Simulate user adding a new command that fits the pattern
      store.dispatch(addCommandToHistory('git checkout main'));
      
      // Run analysis again to see if it updates
      await store.dispatch(analyzeCommandPatterns());
      
      // Verify command frequency was updated
      state = store.getState().ai;
      expect(state.patternAnalysis.commandFrequency.git).toBe(11);
    });
    
    it('should handle offline mode workflow correctly', async () => {
      // Enable offline mode
      store.dispatch(toggleOfflineMode());
      
      // Set current command
      store.dispatch(setCurrentCommand('find . -name "*.js" | xargs grep "useEffect"'));
      
      // Analyze the command
      await store.dispatch(analyzeCommand('find . -name "*.js" | xargs grep "useEffect"'));
      
      // Verify offline analysis was used
      let state = store.getState().ai;
      expect(state.status.offlineMode).toBe(true);
      expect(state.commandAnalysis.parsedCommand).toEqual({
        command: 'find',
        subcommand: null
      });
      
      // Get explanation (should use offline mode)
      await store.dispatch(getCommandExplanation('find . -name "*.js" | xargs grep "useEffect"'));
      
      // Verify offline explanation was provided
      state = store.getState().ai;
      expect(state.commandExplanation.explanation).toContain('offline mode');
      
      // Get suggestions for a partial command
      await store.dispatch(getCommandSuggestions('git'));
      
      // Verify offline suggestions were provided
      state = store.getState().ai;
      expect(state.suggestions.commandSuggestions).toEqual([
        { command: 'git status', description: 'Show the working tree status' },
        { command: 'git pull', description: 'Fetch from and integrate with another repository or a local branch' },
        { command: 'git push', description: 'Update remote refs along with associated objects' }
      ]);
      
      // Add some commands to history
      store.dispatch(addCommandToHistory('ls -la'));
      store.dispatch(addCommandToHistory('cd /tmp'));
      
      // Run pattern analysis
      await store.dispatch(analyzeCommandPatterns());
      
      // Verify offline pattern analysis was used
      state = store.getState().ai;
      expect(state.patternAnalysis.detectedPatterns).toEqual(['Basic file navigation']);
      
      // Toggle offline mode back off
      store.dispatch(toggleOfflineMode());
      
      // Verify status was updated
      state = store.getState().ai;
      expect(state.status.offlineMode).toBe(false);
      expect(state.settings.offlineMode).toBe(false);
    });
    
    it('should handle error workflows correctly', async () => {
      // Mock API to force errors
      const originalAnalyzeCommand = analyzeCommand.fulfilled;
      analyzeCommand.fulfilled = jest.fn(() => {
        throw new Error('Network error during command analysis');
      });
      
      // Try to analyze command, which will fail
      try {
        await store.dispatch(analyzeCommand('complex command with error'));
      } catch (err) {
        // Expected error
      }
      
      // Verify error state was set
      let state = store.getState().ai;
      expect(state.status.error).toBeTruthy();
      expect(state.status.error).toContain('Network error');
      
      // Clear error
      store.dispatch(clearError());
      
      // Verify error was cleared
      state = store.getState().ai;
      expect(state.status.error).toBeNull();
      
      // Restore original implementation
      analyzeCommand.fulfilled = originalAnalyzeCommand;
      
      // Mock command explanation to fail
      const originalExplanation = getCommandExplanation.fulfilled;
      getCommandExplanation.fulfilled = jest.fn(() => {
        throw new Error('API rate limit exceeded');
      });
      
      // Try to get explanation, which will fail
      try {
        await store.dispatch(getCommandExplanation('ls -la'));
      } catch (err) {
        // Expected error
      }
      
      // Verify error state in command explanation
      state = store.getState().ai;
      expect(state.commandExplanation.error).toBeTruthy();
      expect(state.commandExplanation.loading).toBe(false);
      
      // Enable offline mode to handle the error
      store.dispatch(toggleOfflineMode());
      
      // Try again with offline mode
      await store.dispatch(getCommandExplanation('ls -la'));
      
      // Verify offline explanation was provided despite previous error
      state = store.getState().ai;
      expect(state.commandExplanation.explanation).toContain('offline mode');
      expect(state.commandExplanation.error).toBeNull();
      
      // Restore original implementation
      getCommandExplanation.fulfilled = originalExplanation;
    });
  });
});
