import { createSlice } from '@reduxjs/toolkit';

/**
 * @typedef {Object} CommandPattern
 * @property {string} pattern - The command pattern string
 * @property {number} frequency - How often this pattern has been used
 * @property {string} lastUsed - ISO timestamp of last usage
 */

/**
 * @typedef {Object} EnvVariable
 * @property {string} name - Environment variable name
 * @property {string} value - Environment variable value
 */

/**
 * @typedef {Object} TabContext
 * @property {string} id - Unique identifier for the tab
 * @property {string} currentDirectory - Current working directory
 * @property {Array<string>} commandHistory - History of executed commands
 * @property {Array<CommandPattern>} commandPatterns - Detected command patterns
 * @property {Object} environmentVars - Environment variables for this tab
 * @property {boolean} isShared - Whether this context is shared with other tabs
 */

/**
 * Initial state for the tab context slice
 * @type {Object}
 * @property {Object.<string, TabContext>} contexts - Tab contexts indexed by tab ID
 * @property {string} activeTabId - Currently active tab ID
 * @property {Object} globalContext - Context shared across all tabs
 * @property {boolean} isContextSharingEnabled - Whether context sharing is enabled
 */
const initialState = {
  contexts: {},
  activeTabId: null,
  globalContext: {
    environmentVars: {},
    commandPatterns: []
  },
  isContextSharingEnabled: false
};

/**
 * Redux slice for managing terminal tab contexts
 */
const tabContextSlice = createSlice({
  name: 'tabContext',
  initialState,
  reducers: {
    /**
     * Create a new tab context
     */
    createTabContext: (state, action) => {
      const { tabId, initialDirectory = '~' } = action.payload;
      state.contexts[tabId] = {
        id: tabId,
        currentDirectory: initialDirectory,
        commandHistory: [],
        commandPatterns: [],
        environmentVars: {},
        isShared: false
      };
      
      if (!state.activeTabId) {
        state.activeTabId = tabId;
      }
    },
    
    /**
     * Update tab context with new data
     */
    updateTabContext: (state, action) => {
      const { tabId, data } = action.payload;
      if (state.contexts[tabId]) {
        state.contexts[tabId] = {
          ...state.contexts[tabId],
          ...data
        };
      }
    },
    
    /**
     * Set the active tab context
     */
    setActiveTabContext: (state, action) => {
      state.activeTabId = action.payload;
    },
    
    /**
     * Remove a tab context
     */
    removeTabContext: (state, action) => {
      const tabId = action.payload;
      delete state.contexts[tabId];
      
      // Update activeTabId if the active tab is being removed
      if (state.activeTabId === tabId) {
        const tabIds = Object.keys(state.contexts);
        state.activeTabId = tabIds.length > 0 ? tabIds[0] : null;
      }
    },
    
    /**
     * Clear a tab context
     */
    clearTabContext: (state, action) => {
      const tabId = action.payload;
      if (state.contexts[tabId]) {
        state.contexts[tabId] = {
          ...state.contexts[tabId],
          commandHistory: [],
          commandPatterns: []
        };
      }
    },
    
    /**
     * Add command to tab history
     */
    addCommand: (state, action) => {
      const { tabId, command } = action.payload;
      if (state.contexts[tabId]) {
        state.contexts[tabId].commandHistory.unshift(command);
        // Limit history size to 100 commands
        if (state.contexts[tabId].commandHistory.length > 100) {
          state.contexts[tabId].commandHistory.pop();
        }
      }
    },
    
    /**
     * Update environment variables for a tab
     */
    updateEnvironmentVars: (state, action) => {
      const { tabId, vars } = action.payload;
      if (state.contexts[tabId]) {
        state.contexts[tabId].environmentVars = {
          ...state.contexts[tabId].environmentVars,
          ...vars
        };
      }
    },
    
    /**
     * Toggle context sharing between tabs
     */
    toggleContextSharing: (state, action) => {
      const { enabled, tabId } = action.payload;
      state.isContextSharingEnabled = enabled;
      
      if (tabId && state.contexts[tabId]) {
        state.contexts[tabId].isShared = enabled;
      }
    },
    
    /**
     * Add command pattern to a tab
     */
    addCommandPattern: (state, action) => {
      const { tabId, pattern } = action.payload;
      if (state.contexts[tabId]) {
        const existingPatternIndex = state.contexts[tabId].commandPatterns.findIndex(
          p => p.pattern === pattern
        );
        
        if (existingPatternIndex >= 0) {
          // Update existing pattern
          state.contexts[tabId].commandPatterns[existingPatternIndex] = {
            ...state.contexts[tabId].commandPatterns[existingPatternIndex],
            frequency: state.contexts[tabId].commandPatterns[existingPatternIndex].frequency + 1,
            lastUsed: new Date().toISOString()
          };
        } else {
          // Add new pattern
          state.contexts[tabId].commandPatterns.push({
            pattern,
            frequency: 1,
            lastUsed: new Date().toISOString()
          });
        }
      }
    }
  }
});

// Extract action creators
export const {
  createTabContext,
  updateTabContext,
  setActiveTabContext,
  removeTabContext,
  clearTabContext,
  addCommand,
  updateEnvironmentVars,
  toggleContextSharing,
  addCommandPattern
} = tabContextSlice.actions;

// Basic selectors
export const selectTabContexts = state => state.tabContext.contexts;
export const selectActiveTabId = state => state.tabContext.activeTabId;
export const selectGlobalContext = state => state.tabContext.globalContext;
export const selectIsContextSharingEnabled = state => state.tabContext.isContextSharingEnabled;

// Derived selectors
export const selectTabContextById = (state, tabId) => state.tabContext.contexts[tabId];
export const selectActiveTabContext = state => {
  const activeId = selectActiveTabId(state);
  return activeId ? selectTabContextById(state, activeId) : null;
};

export const selectCurrentDirectory = state => {
  const activeContext = selectActiveTabContext(state);
  return activeContext ? activeContext.currentDirectory : '~';
};

export const selectCommandHistory = (state, tabId) => {
  const context = tabId 
    ? selectTabContextById(state, tabId)
    : selectActiveTabContext(state);
  return context ? context.commandHistory : [];
};

export const selectCommandPatterns = (state, tabId) => {
  const context = tabId 
    ? selectTabContextById(state, tabId)
    : selectActiveTabContext(state);
  return context ? context.commandPatterns : [];
};

export const selectEnvironmentVars = (state, tabId) => {
  const context = tabId 
    ? selectTabContextById(state, tabId)
    : selectActiveTabContext(state);
  return context ? context.environmentVars : {};
};

export const selectSharedContexts = state => {
  const contexts = selectTabContexts(state);
  return Object.values(contexts).filter(context => context.isShared);
};

export default tabContextSlice.reducer;

