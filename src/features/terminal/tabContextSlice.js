import { createSlice, createSelector } from '@reduxjs/toolkit';
/**
 * @typedef {Object} CommandOutputEntry
 * @property {string} command - The executed command
 * @property {string} output - Command output
 * @property {string} [error] - Error message if command failed
 * @property {number} exitCode - Command exit code
 * @property {string} timestamp - When command was executed
 */

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - Pattern name/description
 * @property {string} suggestion - Suggested command
 * @property {string} description - Pattern description
 */

/**
 * @typedef {Object} EnvironmentVariable
 * @property {string} name - Variable name
 * @property {string} value - Variable value
 * @property {boolean} [isExported] - Whether the variable is exported
 */

/**
 * @typedef {Object} TabContext
 * @property {string} tabId - Tab ID
 * @property {string[]} commandHistory - Recent commands executed in the tab
 * @property {string} currentDirectory - Current working directory
 * @property {EnvironmentVariable[]} environment - Environment variables
 * @property {CommandOutputEntry[]} recentOutputs - Recent command outputs
 * @property {string|null} lastError - Last error message
 * @property {CommandPattern[]} commandPatterns - Detected command patterns
 * @property {Object} metadata - Additional tab metadata
 * @property {boolean} isShared - Whether this context is shared with other tabs
 * @property {string[]} sharedWith - IDs of tabs this context is shared with
 */

/**
 * @typedef {Object} TabContextState
 * @property {Object.<string, TabContext>} contexts - Map of tab ID to context
 * @property {string|null} activeTabId - ID of the active tab
 * @property {Object.<string, boolean>} sharedContexts - Map tracking which contexts are shared
 * @property {Object} globalContext - Context shared across all tabs
 */

/**
 * Initial state for tab contexts
 * @type {TabContextState}
 */
const initialState = {
  contexts: {},
  activeTabId: null,
  sharedContexts: {},
  globalContext: {
    environment: [],
    commandPatterns: []
  }
};

/**
 * Slice for managing terminal tab contexts
 */
const tabContextSlice = createSlice({
  name: 'tabContext',
  initialState,
  reducers: {
    /**
     * Create a new tab context
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId and optional initialContext
     */
    createTabContext: (state, action) => {
      const { tabId, initialContext = {} } = action.payload;
      
      if (!state.contexts[tabId]) {
        state.contexts[tabId] = {
          tabId,
          commandHistory: [],
          currentDirectory: initialContext.currentDirectory || '~',
          environment: initialContext.environment || [],
          recentOutputs: [],
          lastError: null,
          commandPatterns: [],
          metadata: initialContext.metadata || {},
          isShared: false,
          sharedWith: []
        };
      }
      
      // If this is the first tab, set it as active
      if (!state.activeTabId) {
        state.activeTabId = tabId;
      }
    },
    
    /**
     * Set the active tab context
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId
     */
    setActiveTabContext: (state, action) => {
      const { tabId } = action.payload;
      
      if (state.contexts[tabId]) {
        state.activeTabId = tabId;
      }
    },
    
    /**
     * Update a tab's context with new information
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId and context updates
     */
    updateTabContext: (state, action) => {
      const { tabId, updates } = action.payload;
      
      if (state.contexts[tabId]) {
        const context = state.contexts[tabId];
        
        // Update command history if provided
        if (updates.command) {
          // Don't add duplicate consecutive commands
          if (context.commandHistory.length === 0 || 
              context.commandHistory[0] !== updates.command) {
            context.commandHistory = [
              updates.command,
              ...context.commandHistory.slice(0, 49) // Limit to 50 commands
            ];
          }
        }
        
        // Update current directory if provided
        if (updates.currentDirectory) {
          context.currentDirectory = updates.currentDirectory;
        }
        
        // Update last error if provided
        if (updates.error !== undefined) {
          context.lastError = updates.error;
        }
        
        // Update command output if provided
        if (updates.commandOutput) {
          const { command, output, error, exitCode } = updates.commandOutput;
          context.recentOutputs = [
            {
              command,
              output,
              error,
              exitCode,
              timestamp: new Date().toISOString()
            },
            ...context.recentOutputs.slice(0, 19) // Limit to 20 outputs
          ];
        }
        
        // Update environment variables if provided
        if (updates.environment) {
          const newEnvVars = updates.environment;
          
          // Update existing or add new variables
          for (const newVar of newEnvVars) {
            const existingIndex = context.environment.findIndex(
              env => env.name === newVar.name
            );
            
            if (existingIndex >= 0) {
              context.environment[existingIndex] = newVar;
            } else {
              context.environment.push(newVar);
            }
          }
        }
        
        // Update command patterns if provided
        if (updates.commandPatterns) {
          context.commandPatterns = updates.commandPatterns;
        }
        
        // Update metadata if provided
        if (updates.metadata) {
          context.metadata = {
            ...context.metadata,
            ...updates.metadata
          };
        }
        
        // Propagate changes to shared tabs if this context is shared
        if (context.isShared && context.sharedWith.length > 0) {
          for (const sharedTabId of context.sharedWith) {
            if (state.contexts[sharedTabId] && sharedTabId !== tabId) {
              // Only share certain updates to other tabs
              const sharedUpdates = {
                ...(updates.currentDirectory && { currentDirectory: updates.currentDirectory }),
                ...(updates.environment && { environment: updates.environment }),
                ...(updates.commandPatterns && { commandPatterns: updates.commandPatterns })
              };
              
              // Apply shared updates to the related tab
              if (Object.keys(sharedUpdates).length > 0) {
                Object.assign(state.contexts[sharedTabId], sharedUpdates);
              }
            }
          }
        }
      }
    },
    
    /**
     * Add a command pattern to a tab context
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId and pattern
     */
    addCommandPattern: (state, action) => {
      const { tabId, pattern } = action.payload;
      
      if (state.contexts[tabId]) {
        // Check if pattern already exists
        const patternExists = state.contexts[tabId].commandPatterns.some(
          p => p.pattern === pattern.pattern && p.suggestion === pattern.suggestion
        );
        
        if (!patternExists) {
          state.contexts[tabId].commandPatterns.push(pattern);
        }
      }
    },
    
    /**
     * Share context between tabs
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with sourceTabId and targetTabIds
     */
    shareContext: (state, action) => {
      const { sourceTabId, targetTabIds } = action.payload;
      
      if (state.contexts[sourceTabId]) {
        const sourceContext = state.contexts[sourceTabId];
        sourceContext.isShared = true;
        
        // Add target tabs to sharedWith list
        for (const targetId of targetTabIds) {
          if (state.contexts[targetId] && !sourceContext.sharedWith.includes(targetId)) {
            sourceContext.sharedWith.push(targetId);
          }
        }
        
        // Track in shared contexts map
        state.sharedContexts[sourceTabId] = true;
        
        // Share relevant data to target tabs
        for (const targetId of targetTabIds) {
          if (state.contexts[targetId]) {
            state.contexts[targetId].currentDirectory = sourceContext.currentDirectory;
            state.contexts[targetId].environment = [...sourceContext.environment];
            state.contexts[targetId].commandPatterns = [...sourceContext.commandPatterns];
          }
        }
      }
    },
    
    /**
     * Stop sharing context with specific tabs
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with sourceTabId and targetTabIds
     */
    unshareContext: (state, action) => {
      const { sourceTabId, targetTabIds } = action.payload;
      
      if (state.contexts[sourceTabId]) {
        const sourceContext = state.contexts[sourceTabId];
        
        // Remove target tabs from sharedWith list
        sourceContext.sharedWith = sourceContext.sharedWith.filter(
          id => !targetTabIds.includes(id)
        );
        
        // If no more shared tabs, mark as not shared
        if (sourceContext.sharedWith.length === 0) {
          sourceContext.isShared = false;
          delete state.sharedContexts[sourceTabId];
        }
      }
    },
    
    /**
     * Clear a tab's context
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId
     */
    clearTabContext: (state, action) => {
      const { tabId } = action.payload;
      
      if (state.contexts[tabId]) {
        // Preserve tabId and currentDirectory, reset everything else
        const currentDirectory = state.contexts[tabId].currentDirectory;
        const isShared = state.contexts[tabId].isShared;
        const sharedWith = state.contexts[tabId].sharedWith;
        
        state.contexts[tabId] = {
          tabId,
          commandHistory: [],
          currentDirectory,
          environment: [],
          recentOutputs: [],
          lastError: null,
          commandPatterns: [],
          metadata: {},
          isShared,
          sharedWith
        };
      }
    },
    
    /**
     * Remove a tab's context (when tab is closed)
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with tabId
     */
    removeTabContext: (state, action) => {
      const { tabId } = action.payload;
      
      if (state.contexts[tabId]) {
        // If this tab was sharing context, unshare it
        if (state.contexts[tabId].isShared) {
          delete state.sharedContexts[tabId];
        }
        
        // Remove this tab from any shared contexts
        for (const contextId in state.contexts) {
          if (state.contexts[contextId].sharedWith.includes(tabId)) {
            state.contexts[contextId].sharedWith = 
              state.contexts[contextId].sharedWith.filter(id => id !== tabId);
            
            // If no more shared tabs, mark as not shared
            if (state.contexts[contextId].sharedWith.length === 0) {
              state.contexts[contextId].isShared = false;
              delete state.sharedContexts[contextId];
            }
          }
        }
        
        // Remove the context
        delete state.contexts[tabId];
        
        // If active tab was removed, select a new active tab
        if (state.activeTabId === tabId) {
          const remainingTabs = Object.keys(state.contexts);
          state.activeTabId = remainingTabs.length > 0 ? remainingTabs[0] : null;
        }
      }
    },
    
    /**
     * Import context data (e.g., from a saved session)
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with contexts data
     */
    importContexts: (state, action) => {
      const { contexts, activeTabId, sharedContexts } = action.payload;
      
      if (contexts) {
        state.contexts = contexts;
      }
      
      if (activeTabId && state.contexts[activeTabId]) {
        state.activeTabId = activeTabId;
      }
      
      if (sharedContexts) {
        state.sharedContexts = sharedContexts;
      }
    },
    
    /**
     * Update global context shared across all tabs
     * @param {TabContextState} state - Current state
     * @param {Object} action - Action with global context updates
     */
    updateGlobalContext: (state, action) => {
      const updates = action.payload;
      
      if (updates.environment) {
        state.globalContext.environment = updates.environment;
      }
      
      if (updates.commandPatterns) {
        state.globalContext.commandPatterns = updates.commandPatterns;
      }
    }
  }
});

// Export actions
export const {
  createTabContext,
  setActiveTabContext,
  updateTabContext,
  addCommandPattern,
  shareContext,
  unshareContext,
  clearTabContext,
  removeTabContext,
  importContexts,
  updateGlobalContext
} = tabContextSlice.actions;

// Basic selectors
export const selectTabContexts = state => state.tabContext.contexts;
export const selectActiveTabId = state => state.tabContext.activeTabId;
export const selectSharedContexts = state => state.tabContext.sharedContexts;
export const selectGlobalContext = state => state.tabContext.globalContext;

// Derived selectors

/**
 * Select a specific tab's context
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for the tab context
 */
export const selectTabContextById = tabId => 
  state => state.tabContext.contexts[tabId] || null;

/**
 * Select the active tab's context
 */
export const selectActiveTabContext = createSelector(
  [selectTabContexts, selectActiveTabId],
  (contexts, activeTabId) => activeTabId ? contexts[activeTabId] : null
);

/**
 * Select command history for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab command history
 */
export const selectTabCommandHistory = tabId => 
  state => state.tabContext.contexts[tabId]?.commandHistory || [];

/**
 * Select command history for the active tab
 */
export const selectActiveTabCommandHistory = createSelector(
  [selectActiveTabContext],
  activeContext => activeContext?.commandHistory || []
);

/**
 * Select recent outputs for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab recent outputs
 */
export const selectTabRecentOutputs = tabId => 
  state => state.tabContext.contexts[tabId]?.recentOutputs || [];

/**
 * Select recent outputs for the active tab
 */
export const selectActiveTabRecentOutputs = createSelector(
  [selectActiveTabContext],
  activeContext => activeContext?.recentOutputs || []
);

/**
 * Select command patterns for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab command patterns
 */
export const selectTabCommandPatterns = tabId => 
  state => state.tabContext.contexts[tabId]?.commandPatterns || [];

/**
 * Select command patterns for the active tab
 */
export const selectActiveTabCommandPatterns = createSelector(
  [selectActiveTabContext],
  activeContext => activeContext?.commandPatterns || []
);

/**
 * Select environment variables for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab environment variables
 */
export const selectTabEnvironment = tabId => 
  state => state.tabContext.contexts[tabId]?.environment || [];

/**
 * Select environment variables for the active tab
 */
export const selectActiveTabEnvironment = createSelector(
  [selectActiveTabContext],
  activeContext => activeContext?.environment || []
);

/**
 * Select last error for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab's last error
 */
export const selectTabLastError = tabId => 
  state => state.tabContext.contexts[tabId]?.lastError || null;

/**
 * Select last error for the active tab
 */
export const selectActiveTabLastError = createSelector(
  [selectActiveTabContext],
  activeContext => activeContext?.lastError || null
);

/**
 * Select tabs that share context with a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tabs sharing context
 */
export const selectTabsSharedWith = tabId => createSelector(
  [selectTabContexts],
  contexts => {
    if (!contexts[tabId] || !contexts[tabId].isShared) {
      return [];
    }
    
    return contexts[tabId].sharedWith
      .filter(id => contexts[id]) // Only include existing tabs
      .map(id => ({ 
        id, 
        name: contexts[id].metadata?.name || `Tab ${id}`,
        currentDirectory: contexts[id].currentDirectory
      }));
  }
);

/**
 * Select all tabs that share their context with other tabs
 */
export const selectAllSharedContexts = createSelector(
  [selectTabContexts, selectSharedContexts],
  (contexts, sharedContexts) => {
    return Object.keys(sharedContexts)
      .filter(id => contexts[id]) // Only include existing tabs
      .map(id => ({
        sourceId: id,
        sourceName: contexts[id].metadata?.name || `Tab ${id}`,
        sourceDirectory: contexts[id].currentDirectory,
        sharedWith: contexts[id].sharedWith.filter(tid => contexts[tid])
      }));
  }
);

/**
 * Select context statistics for the entire terminal
 */
export const selectContextStatistics = createSelector(
  [selectTabContexts, selectSharedContexts],
  (contexts, sharedContexts) => {
    const tabCount = Object.keys(contexts).length;
    const sharedContextCount = Object.keys(sharedContexts).length;
    
    // Calculate unique commands across all tabs
    const allCommands = new Set();
    const allPatterns = new Set();
    const allEnvVars = new Set();
    let totalCommands = 0;
    let totalOutputs = 0;
    
    Object.values(contexts).forEach(context => {
      // Track commands
      context.commandHistory.forEach(cmd => {
        allCommands.add(cmd);
        totalCommands++;
      });
      
      // Track outputs
      totalOutputs += context.recentOutputs.length;
      
      // Track patterns
      context.commandPatterns.forEach(pattern => {
        allPatterns.add(`${pattern.pattern}:${pattern.suggestion}`);
      });
      
      // Track environment variables
      context.environment.forEach(env => {
        allEnvVars.add(env.name);
      });
    });
    
    return {
      tabCount,
      sharedContextCount,
      uniqueCommandCount: allCommands.size,
      totalCommandCount: totalCommands,
      uniquePatternCount: allPatterns.size,
      uniqueEnvVarCount: allEnvVars.size,
      totalOutputCount: totalOutputs
    };
  }
);

/**
 * Select context statistics for a specific tab
 * @param {string} tabId - The tab ID
 * @returns {function} - Selector function for tab context statistics
 */
export const selectTabContextStatistics = tabId => createSelector(
  [selectTabContextById(tabId)],
  context => {
    if (!context) {
      return null;
    }
    
    return {
      commandCount: context.commandHistory.length,
      patternCount: context.commandPatterns.length,
      envVarCount: context.environment.length,
      outputCount: context.recentOutputs.length,
      isShared: context.isShared,
      sharedWithCount: context.sharedWith.length
    };
  }
);

/**
 * Select all tab contexts
 * @param {Object} state - The Redux state
 * @returns {Object.<string, TabContext>} All tab contexts
 */
export const selectAllTabContexts = (state) => state.tabContext.tabContexts;

/**
 * @returns {string} The current directory
 */
export const selectCurrentDirectory = (state, tabId) => {
  const context = selectTabContextById(state, tabId);
  return context ? context.currentDirectory : '~';
};

export default tabContextSlice.reducer;
