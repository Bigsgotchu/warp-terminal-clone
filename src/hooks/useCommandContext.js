import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateTabContext,
  selectActiveTabContext,
  selectTabContextById,
  clearTabContext,
  createTabContext,
  importContexts
} from '../features/terminal/tabContextSlice';

// Constants
const STORAGE_KEY = 'warp_terminal_command_context';
const CONTEXT_VERSION = '1.0.0'; // For future compatibility

/**
 * Hook to manage command execution context for the terminal
 * 
 * This hook provides methods to:
 * - Track command history and results
 * - Persist context between sessions
 * - Handle environment variables and working directory
 * - Interface with AI features
 */
export const useCommandContext = (tabId = null) => {
  const dispatch = useDispatch();
  
  // Get active tab context or specific tab context if tabId is provided
  const context = useSelector(tabId ? 
    selectTabContextById(tabId) : 
    selectActiveTabContext
  );
  
  /**
   * Save the current context to local storage
   */
  const saveContextToStorage = useCallback(() => {
    try {
      if (!context) return;
      
      const allContexts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      // Update this specific tab's context in storage
      allContexts[context.tabId] = {
        ...context,
        // Limit size of stored data to prevent localStorage overflow
        commandHistory: context.commandHistory.slice(0, 100),
        recentOutputs: context.recentOutputs.slice(0, 20),
        lastUpdated: new Date().toISOString(),
        version: CONTEXT_VERSION
      };
      
      // Save tracking data for context restoration
      allContexts._meta = {
        lastActiveTabId: context.tabId,
        version: CONTEXT_VERSION,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allContexts));
    } catch (error) {
      console.error('Failed to save context to storage:', error);
    }
  }, [context]);
  
  /**
   * Update specific fields in the context
   */
  const updateContext = useCallback((newContext) => {
    if (!context?.tabId) return;
    
    dispatch(updateTabContext({
      tabId: context.tabId,
      updates: newContext
    }));
    
    // Persist changes to storage
    setTimeout(saveContextToStorage, 100);
  }, [context?.tabId, dispatch, saveContextToStorage]);
  
  /**
   * Add a command and its result to the context history
   */
  const addCommandToHistory = useCallback((command, result, exitCode = 0) => {
    if (!context?.tabId || !command) return;
    
    const commandOutput = {
      command,
      output: typeof result === 'string' ? result : JSON.stringify(result),
      exitCode: exitCode || 0,
      timestamp: new Date().toISOString()
    };
    
    // If there was an error, capture it
    if (exitCode !== 0 && result?.error) {
      commandOutput.error = result.error;
    }
    
    dispatch(updateTabContext({
      tabId: context.tabId,
      updates: {
        command,
        commandOutput
      }
    }));
    
    // Persist changes to storage
    setTimeout(saveContextToStorage, 100);
  }, [context?.tabId, dispatch, saveContextToStorage]);
  
  /**
   * Track the current environment context (cwd, exit codes)
   */
  const trackEnvironmentContext = useCallback((environmentContext) => {
    if (!context?.tabId) return;
    
    const updates = {};
    
    if (environmentContext.currentDirectory) {
      updates.currentDirectory = environmentContext.currentDirectory;
    }
    
    if (environmentContext.environment) {
      updates.environment = environmentContext.environment;
    }
    
    if (environmentContext.lastExitCode !== undefined) {
      updates.lastExitCode = environmentContext.lastExitCode;
    }
    
    if (Object.keys(updates).length > 0) {
      dispatch(updateTabContext({
        tabId: context.tabId,
        updates
      }));
      
      // Persist changes to storage
      setTimeout(saveContextToStorage, 100);
    }
  }, [context?.tabId, dispatch, saveContextToStorage]);
  
  /**
   * Retrieve context from local storage
   */
  const getPersistedContext = useCallback(() => {
    try {
      const storedContexts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      // If we have stored contexts and metadata
      if (storedContexts._meta && Object.keys(storedContexts).length > 1) {
        // Filter out potentially corrupted or outdated contexts
        const validContexts = {};
        
        for (const [tabId, tabContext] of Object.entries(storedContexts)) {
          if (tabId !== '_meta' && tabContext.tabId === tabId) {
            validContexts[tabId] = tabContext;
          }
        }
        
        return {
          contexts: validContexts,
          activeTabId: storedContexts._meta.lastActiveTabId,
          timestamp: storedContexts._meta.lastUpdated
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve context from storage:', error);
      return null;
    }
  }, []);
  
  /**
   * Restore persisted context from local storage
   */
  const restorePersistedContext = useCallback(() => {
    const persistedContext = getPersistedContext();
    
    if (persistedContext && Object.keys(persistedContext.contexts).length > 0) {
      dispatch(importContexts({
        contexts: persistedContext.contexts,
        activeTabId: persistedContext.activeTabId
      }));
      
      return true;
    }
    
    return false;
  }, [dispatch, getPersistedContext]);
  
  /**
   * Clear the current context
   */
  const clearContext = useCallback(() => {
    if (!context?.tabId) return;
    
    dispatch(clearTabContext({ tabId: context.tabId }));
    
    // Update storage to remove this tab's context
    try {
      const allContexts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      delete allContexts[context.tabId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allContexts));
    } catch (error) {
      console.error('Failed to update storage after clearing context:', error);
    }
  }, [context?.tabId, dispatch]);
  
  /**
   * Initialize a new context for a tab
   */
  const initializeContext = useCallback((tabId, initialContext = {}) => {
    dispatch(createTabContext({ 
      tabId, 
      initialContext 
    }));
    
    // Persist the new context
    setTimeout(saveContextToStorage, 100);
  }, [dispatch, saveContextToStorage]);
  
  // Automatically save context when component unmounts or tab changes
  useEffect(() => {
    if (context?.tabId) {
      return () => {
        saveContextToStorage();
      };
    }
  }, [context?.tabId, saveContextToStorage]);
  
  return {
    context,
    updateContext,
    addCommandToHistory,
    trackEnvironmentContext,
    getPersistedContext,
    restorePersistedContext,
    clearContext,
    initializeContext
  };
};

/**
 * Helper function to retrieve the persisted context without using the hook
 * Useful for initialization before components are mounted
 */
export const getPersistedContext = () => {
  try {
    const storedContexts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (storedContexts._meta && Object.keys(storedContexts).length > 1) {
      const validContexts = {};
      
      for (const [tabId, tabContext] of Object.entries(storedContexts)) {
        if (tabId !== '_meta' && tabContext.tabId === tabId) {
          validContexts[tabId] = tabContext;
        }
      }
      
      return {
        contexts: validContexts,
        activeTabId: storedContexts._meta.lastActiveTabId,
        timestamp: storedContexts._meta.lastUpdated
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to retrieve context from storage:', error);
    return null;
  }
};

/**
 * Helper function to clear all persisted contexts
 * Useful for resetting the application state
 */
export const clearAllPersistedContexts = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear persisted contexts:', error);
    return false;
  }
};

