import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  analyzeCommand,
  clearSuggestions,
  nextSuggestion,
  prevSuggestion,
  resetSuggestionSelection,
  updateContext,
  addCommandToHistory,
  explainCommand,
  clearExplanation,
  selectSuggestions,
  selectActiveSuggestionIndex,
  selectActiveSuggestion,
  selectIsAnalyzing,
  selectAIEnabled,
  selectAISettings,
  selectCommandExplanation
} from '../features/ai/aiSlice';

/**
 * Hook for integrating AI functionality with the terminal
 * Provides command suggestions, keyboard navigation, and context tracking
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce time for input analysis in ms
 * @param {boolean} options.autoExplain - Whether to auto-explain executed commands
 * @returns {Object} AI terminal integration utilities
 */
export function useTerminalAI(options = {}) {
  const {
    debounceMs = 200,
    autoExplain = true
  } = options;
  
  // Redux state
  const dispatch = useDispatch();
  const suggestions = useSelector(selectSuggestions);
  const activeSuggestionIndex = useSelector(selectActiveSuggestionIndex);
  const activeSuggestion = useSelector(selectActiveSuggestion);
  const isAnalyzing = useSelector(selectIsAnalyzing);
  const aiEnabled = useSelector(selectAIEnabled);
  const aiSettings = useSelector(selectAISettings);
  const commandExplanation = useSelector(selectCommandExplanation);
  
  // Local state
  const [inputValue, setInputValue] = useState('');
  const debounceTimer = useRef(null);
  
  /**
   * Reset suggestions when AI is disabled
   */
  useEffect(() => {
    if (!aiEnabled) {
      dispatch(clearSuggestions());
    }
  }, [aiEnabled, dispatch]);
  
  /**
   * Handle input changes and trigger AI analysis with debouncing
   * @param {string} value - The current input value
   */
  const handleInputChange = useCallback((value) => {
    setInputValue(value);
    
    // Clear any pending analysis
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Don't analyze if input is too short or AI is disabled
    if (!value || value.length < aiSettings.suggestionThreshold || !aiEnabled) {
      dispatch(clearSuggestions());
      return;
    }
    
    // Debounce the analysis to avoid excessive API calls
    debounceTimer.current = setTimeout(() => {
      dispatch(analyzeCommand(value));
    }, debounceMs);
  }, [dispatch, aiEnabled, aiSettings.suggestionThreshold, debounceMs]);
  
  /**
   * Handle keyboard navigation for suggestions
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} Whether the event was handled
   */
  const handleKeyNavigation = useCallback((event) => {
    // Only handle navigation when suggestions are available
    if (!suggestions.length || !aiEnabled) return false;
    
    let handled = true;
    
    switch (event.key) {
      case 'Tab':
        // Tab for next, Shift+Tab for previous
        event.preventDefault();
        dispatch(event.shiftKey ? prevSuggestion() : nextSuggestion());
        break;
        
      case 'ArrowUp':
        // Ctrl+Up for previous suggestion
        if (event.ctrlKey) {
          event.preventDefault();
          dispatch(prevSuggestion());
        } else {
          handled = false;
        }
        break;
        
      case 'ArrowDown':
        // Ctrl+Down for next suggestion
        if (event.ctrlKey) {
          event.preventDefault();
          dispatch(nextSuggestion());
        } else {
          handled = false;
        }
        break;
        
      case 'Escape':
        // Escape to clear suggestions
        dispatch(clearSuggestions());
        break;
        
      default:
        handled = false;
    }
    
    return handled;
  }, [dispatch, suggestions.length, aiEnabled]);
  
  /**
   * Apply the active suggestion to the input
   * @returns {string|null} The applied suggestion or null if none active
   */
  const applyActiveSuggestion = useCallback(() => {
    if (!activeSuggestion) return null;
    
    const command = activeSuggestion.command;
    setInputValue(command);
    dispatch(resetSuggestionSelection());
    return command;
  }, [activeSuggestion, dispatch]);
  
  /**
   * Handle command execution
   * Updates context and optionally explains the command
   * @param {string} command - The executed command
   */
  const handleCommandExecuted = useCallback((command) => {
    // Skip empty commands
    if (!command || !command.trim()) return;
    
    // Add command to history
    dispatch(addCommandToHistory(command));
    
    // Get explanation if enabled
    if (autoExplain && aiEnabled && aiSettings.showExplanations) {
      dispatch(explainCommand(command));
    }
  }, [dispatch, autoExplain, aiEnabled, aiSettings.showExplanations]);
  
  /**
   * Update terminal context with current directory
   * @param {string} directory - The current directory path
   */
  const updateDirectoryContext = useCallback((directory) => {
    dispatch(updateContext({ currentDirectory: directory }));
  }, [dispatch]);
  
  /**
   * Update context with command result
   * @param {Object} result - Command execution result
   */
  const updateCommandResultContext = useCallback((result) => {
    dispatch(updateContext({
      lastOutput: result.stdout,
      lastError: result.stderr || (result.exitCode !== 0 ? `Exit code: ${result.exitCode}` : null)
    }));
  }, [dispatch]);
  
  /**
   * Clear command explanation
   */
  const clearExplanationDisplay = useCallback(() => {
    dispatch(clearExplanation());
  }, [dispatch]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);
  
  return {
    // State
    inputValue,
    suggestions,
    activeSuggestionIndex,
    activeSuggestion,
    isAnalyzing,
    aiEnabled,
    commandExplanation,
    
    // Input handlers
    setInputValue,
    handleInputChange,
    
    // Navigation and selection
    handleKeyNavigation,
    applyActiveSuggestion,
    
    // Command execution
    handleCommandExecuted,
    
    // Context updates
    updateDirectoryContext,
    updateCommandResultContext,
    clearExplanationDisplay
  };
}

export default useTerminalAI;

