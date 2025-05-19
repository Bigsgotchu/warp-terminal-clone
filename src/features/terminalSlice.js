import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit';

// Generate a unique ID for tabs
const generateId = () => `tab_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

// Get the user's home directory or provide a fallback
const getHomeDirectory = () => {
  return window.system?.os?.homeDir || '~';
};

// Async thunk for executing terminal commands
export const executeCommand = createAsyncThunk(
  'terminal/executeCommand',
  async (command, { getState, dispatch }) => {
    try {
      if (!window.terminal) {
        throw new Error('Terminal API not available');
      }
      
      // Store the command in our state first
      const state = getState();
      const activeTab = state.terminal.tabs.find(
        tab => tab.id === state.terminal.activeTabId
      );
      
      // Add command with prompt to output for immediate feedback
      dispatch(addOutput({
        output: `${activeTab.currentDirectory}$ ${command}`,
        type: 'command'
      }));
      
      // Execute command through Electron IPC
      const result = await window.terminal.executeCommand(command);
      
      // Process cd commands to update current directory
      if (command.trim().startsWith('cd ')) {
        const dir = command.trim().substring(3).trim();
        let newDir = activeTab.currentDirectory;
        
        if (dir === '~' || dir === '') {
          newDir = window.system?.os?.homeDir || '~';
        } else if (dir.startsWith('/')) {
          // Absolute path
          newDir = dir;
        } else if (dir === '..') {
          // Go up one directory
          const parts = newDir.split('/');
          if (parts.length > 1) {
            parts.pop();
            newDir = parts.join('/') || '/';
          }
        } else {
          // Relative path
          newDir = `${newDir === '/' ? '' : newDir}/${dir}`;
        }
        
        dispatch(setCurrentDirectory({ directory: newDir }));
      }
      
      return {
        command,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message || 'Command execution failed',
        command
      };
    }
  }
);


// Initial state for the terminal slice
const initialState = {
  tabs: [
    {
      id: generateId(),
      title: 'Terminal',
      currentDirectory: getHomeDirectory(),
      commands: [],
      history: [],
      historyIndex: -1,
      output: [],
      isProcessing: false,
      error: null
    }
  ],
  activeTabId: '', // Will be set after initialization
  theme: 'dark',
  fontSize: 14,
  loadingTerminal: false
};

// Set the activeTabId to the first tab initially
initialState.activeTabId = initialState.tabs[0].id;

// Terminal slice
const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    // Add output to the terminal
    addOutput: (state, action) => {
      const { tabId = state.activeTabId, output, type = 'stdout' } = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        state.tabs[tabIndex].output.push({
          content: output,
          type,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // Clear terminal output
    clearOutput: (state, action) => {
      const tabId = action.payload || state.activeTabId;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        state.tabs[tabIndex].output = [];
      }
    },
    
    // Clear error message
    clearError: (state) => {
      const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
      if (tabIndex !== -1) {
        state.tabs[tabIndex].error = null;
      }
    },
    
    // Set current directory
    setCurrentDirectory: (state, action) => {
      const { tabId = state.activeTabId, directory } = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        state.tabs[tabIndex].currentDirectory = directory;
      }
    },
    
    // Set command processing state
    setProcessing: (state, action) => {
      const { tabId = state.activeTabId, isProcessing } = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        state.tabs[tabIndex].isProcessing = isProcessing;
      }
    },
    
    // Add new terminal tab
    addTab: (state, action) => {
      const id = generateId();
      const title = action.payload?.title || `Terminal ${state.tabs.length + 1}`;
      
      state.tabs.push({
        id,
        title,
        currentDirectory: getHomeDirectory(),
        commands: [],
        history: [],
        historyIndex: -1,
        output: [],
        isProcessing: false,
        error: null
      });
      
      state.activeTabId = id;
    },
    
    // Close a terminal tab
    closeTab: (state, action) => {
      const tabId = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1 && state.tabs.length > 1) {
        state.tabs.splice(tabIndex, 1);
        
        // If we closed the active tab, activate another one
        if (state.activeTabId === tabId && state.tabs.length > 0) {
          state.activeTabId = state.tabs[Math.max(0, tabIndex - 1)].id;
        }
      }
    },
    
    // Set active tab
    setActiveTab: (state, action) => {
      const tabId = action.payload;
      if (state.tabs.some(tab => tab.id === tabId)) {
        state.activeTabId = tabId;
      }
    },
    
    // Rename tab
    renameTab: (state, action) => {
      const { tabId, title } = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
      
      if (tabIndex !== -1) {
        state.tabs[tabIndex].title = title;
      }
    },
    
    // Navigate history up (for command history)
    historyUp: (state) => {
      const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
      if (tabIndex === -1) return;
      
      const tab = state.tabs[tabIndex];
      if (tab.history.length > 0 && tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex += 1;
      }
    },
    
    // Navigate history down (for command history)
    historyDown: (state) => {
      const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
      if (tabIndex === -1) return;
      
      const tab = state.tabs[tabIndex];
      if (tab.historyIndex > -1) {
        tab.historyIndex -= 1;
      }
    },
    
    // Change theme
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    
    // Change font size
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle command execution states
      .addCase(executeCommand.pending, (state, action) => {
        const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
        if (tabIndex !== -1) {
          state.tabs[tabIndex].isProcessing = true;
        }
      })
      .addCase(executeCommand.fulfilled, (state, action) => {
        const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
        if (tabIndex === -1) return;
        
        const tab = state.tabs[tabIndex];
        tab.isProcessing = false;
        
        if (action.payload.command) {
          // Add command to history if it was a valid command
          if (tab.history.length === 0 || tab.history[0] !== action.payload.command) {
            tab.history.unshift(action.payload.command);
          }
          tab.historyIndex = -1;
          
          // Add command to commands list
          tab.commands.push({
            command: action.payload.command,
            timestamp: action.payload.timestamp,
          });
        }
      })
      .addCase(executeCommand.rejected, (state, action) => {
        const tabIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
        if (tabIndex !== -1) {
          state.tabs[tabIndex].isProcessing = false;
          state.tabs[tabIndex].error = action.error.message;
        }
      });
  },
});

// Export actions
export const {
  addOutput,
  clearOutput,
  setCurrentDirectory,
  setProcessing,
  addTab,
  closeTab,
  setActiveTab,
  renameTab,
  historyUp,
  historyDown,
  setTheme,
  setFontSize,
  clearError,
} = terminalSlice.actions;

// Export selectors
export const selectActiveTab = (state) => {
  const activeTab = state.terminal.tabs.find(tab => tab.id === state.terminal.activeTabId);
  return activeTab || null;
};

export const selectActiveTabOutput = (state) => {
  const activeTab = selectActiveTab(state);
  return activeTab ? activeTab.output : [];
};

export const selectActiveTabHistory = (state) => {
  const activeTab = selectActiveTab(state);
  return activeTab ? activeTab.history : [];
};

export const selectCurrentHistoryCommand = (state) => {
  const activeTab = selectActiveTab(state);
  if (!activeTab || activeTab.historyIndex === -1) return '';
  return activeTab.history[activeTab.historyIndex] || '';
};

export const selectTabs = (state) => state.terminal.tabs;
export const selectActiveTabId = (state) => state.terminal.activeTabId;
export const selectTheme = (state) => state.terminal.theme;
export const selectFontSize = (state) => state.terminal.fontSize;

export default terminalSlice.reducer;

