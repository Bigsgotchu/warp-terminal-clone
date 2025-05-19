import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentHistoryCommand } from '../../features/terminalSlice';
import { useTerminalAI } from '../../hooks/useTerminalAI';
import { AutocompletionService } from '../../services/terminal/autocompletionService';
import SuggestionsOverlay from '../AI/SuggestionsOverlay';
import './CommandInput.css';

// Initialize autocompletion service
const autoCompletionService = new AutocompletionService();

/**
 * Terminal command input with AI integration
 * 
 * @param {Object} props Component props
 * @param {Function} props.onExecuteCommand Callback when command is executed
 * @param {Function} props.onHistoryUp Callback for history navigation up
 * @param {Function} props.onHistoryDown Callback for history navigation down
 * @param {boolean} props.isProcessing Whether terminal is processing a command
 * @param {string} props.currentDirectory Current directory path
 */
const CommandInput = ({ 
  onExecuteCommand, 
  onHistoryUp,
  onHistoryDown,
  isProcessing, 
  currentDirectory,
  commandHistory = []
}) => {
  // Terminal state
  const inputRef = useRef(null);
  const historyCommand = useSelector(selectCurrentHistoryCommand);
  
  // State for autocompletion suggestions
  const [autocompletions, setAutocompletions] = useState([]);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);
  const [activeCompletionIndex, setActiveCompletionIndex] = useState(-1);
  const [completionMode, setCompletionMode] = useState('ai'); // 'ai' or 'auto'
  const [suggestionError, setSuggestionError] = useState(null);
  
  // Initialize AI features via custom hook
  const {
    inputValue,
    setInputValue,
    suggestions,
    activeSuggestion,
    isAnalyzing,
    aiEnabled,
    handleInputChange: handleAIInputChange,
    handleKeyNavigation: handleAIKeyNavigation,
    applyActiveSuggestion,
    handleCommandExecuted,
    updateDirectoryContext
  } = useTerminalAI({
    debounceMs: 150,
    autoExplain: true
  });
  
  // Combined suggestions (AI + autocompletions)
  const allSuggestions = completionMode === 'ai' ? 
    (Array.isArray(suggestions) ? suggestions : []) : 
    autocompletions;
  const isLoading = isAnalyzing || isLoadingCompletions;
  const activeIndex = completionMode === 'ai' ? 
    (Array.isArray(suggestions) ? suggestions.findIndex(s => s === activeSuggestion) : -1) : 
    activeCompletionIndex;
  
  // Get the active suggestion based on current mode
  const getActiveSuggestion = useCallback(() => {
    if (completionMode === 'ai' && activeSuggestion) {
      return activeSuggestion;
    } else if (completionMode === 'auto' && activeCompletionIndex >= 0 && autocompletions[activeCompletionIndex]) {
      return autocompletions[activeCompletionIndex];
    }
    return null;
  }, [completionMode, activeSuggestion, activeCompletionIndex, autocompletions]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Custom input change handler to update both AI and autocompletion
  const handleInputChange = useCallback((value) => {
    // Reset any previous error
    setSuggestionError(null);
    
    try {
      // Update AI input value
      handleAIInputChange(value);
      
      // Toggle to AI mode when we use AI suggestions
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setCompletionMode('ai');
      }
    } catch (error) {
      console.error('Error handling input change:', error);
      setSuggestionError(error);
    }
  }, [handleAIInputChange, suggestions.length]);
  
  // Fetch autocompletions when input changes
  useEffect(() => {
    const fetchAutocompletions = async () => {
      if (!inputValue) {
        setAutocompletions([]);
        return;
      }
      
      try {
        setIsLoadingCompletions(true);
        
        // Get completions from service
        const completions = await autoCompletionService.getCompletions(
          inputValue,
          {
            currentDirectory,
            commandHistory
          }
        );
        
        if (completions.length > 0) {
          setAutocompletions(completions);
        }
      } catch (error) {
        console.error('Error fetching autocompletions:', error);
      } finally {
        setIsLoadingCompletions(false);
      }
    };
    
    fetchAutocompletions();
  }, [inputValue, currentDirectory, commandHistory]);
  
  // Update input when history command changes
  useEffect(() => {
    if (historyCommand) {
      setInputValue(historyCommand);
    }
  }, [historyCommand, setInputValue]);
  
  // Update AI context when directory changes
  useEffect(() => {
    updateDirectoryContext(currentDirectory);
  }, [currentDirectory, updateDirectoryContext]);
  
  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e) => {
    // Determine which completion system should handle this key event
    if (completionMode === 'ai') {
      // Let AI handle suggestion navigation first
      const handledByAI = handleAIKeyNavigation(e);
      if (handledByAI) return;
    } else if (completionMode === 'auto') {
      // Handle autocompletion navigation
      if (autocompletions.length > 0) {
        if (e.key === 'Tab') {
          e.preventDefault();
          
          // Shift+Tab to go up, Tab to go down
          if (e.shiftKey) {
            setActiveCompletionIndex(prev => 
              prev <= 0 ? autocompletions.length - 1 : prev - 1
            );
          } else {
            setActiveCompletionIndex(prev => 
              prev >= autocompletions.length - 1 ? 0 : prev + 1
            );
          }
          return;
        } else if (e.key === 'Enter' && activeCompletionIndex >= 0) {
          e.preventDefault();
          
          // Apply the selected completion
          const selectedCompletion = autocompletions[activeCompletionIndex];
          setInputValue(selectedCompletion.value);
          setAutocompletions([]);
          setActiveCompletionIndex(-1);
          return;
        } else if (e.key === 'Escape') {
          // Escape to clear completions
          setAutocompletions([]);
          setActiveCompletionIndex(-1);
          return;
        }
      }
    }
    
    // Handle Tab key for autocompletion when no AI suggestions
    if (e.key === 'Tab' && !e.altKey && suggestions.length === 0) {
      e.preventDefault();
      
      // Toggle to autocompletion mode and show completions
      setCompletionMode('auto');
      
      // If we have autocompletions, select the first one
      if (autocompletions.length > 0) {
        setActiveCompletionIndex(0);
      }
      
      return;
    }
    
    // Handle command history navigation
    if (e.key === 'ArrowUp' && !e.ctrlKey) {
      e.preventDefault();
      onHistoryUp?.();
    }
    else if (e.key === 'ArrowDown' && !e.ctrlKey) {
      e.preventDefault();
      onHistoryDown?.();
    }
    // Handle command execution
    else if (e.key === 'Enter' && !isProcessing) {
      e.preventDefault();
      
      try {
        // Get active suggestion based on current mode
        const activeSugg = getActiveSuggestion();
        
        // Use active suggestion if available, otherwise use raw input
        const commandToExecute = activeSugg ? 
          (completionMode === 'ai' ? applyActiveSuggestion() : activeSugg.value) : 
          inputValue.trim();
      
        if (commandToExecute) {
          onExecuteCommand(commandToExecute);
          handleCommandExecuted(commandToExecute);
          setInputValue('');
          setAutocompletions([]);
          setActiveCompletionIndex(-1);
          setSuggestionError(null);
        }
      } catch (error) {
        console.error('Error executing command:', error);
        setSuggestionError(error);
      }
    }
    // Handle command cancellation
    else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setInputValue('');
    }
    // Handle terminal clear
    else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onExecuteCommand('clear');
    }
  };
  
  return (
    <div className={`command-input-container ${suggestionError ? 'has-error' : ''}`}>
      {/* Suggestions Overlay - shows either AI or autocompletions */}
      {!isProcessing && allSuggestions.length > 0 && !suggestionError && (
        <SuggestionsOverlay
          suggestions={allSuggestions}
          activeIndex={activeIndex}
          isAI={completionMode === 'ai'}
          onSelect={(suggestion) => {
            // Handle both AI and autocompletion suggestions
            if (completionMode === 'ai') {
              setInputValue(suggestion.command);
            } else {
              setInputValue(suggestion.value);
              setAutocompletions([]);
              setActiveCompletionIndex(-1);
            }
            inputRef.current?.focus();
          }}
        />
      )}
      
      {/* Command Input Area */}
      <div className="command-prompt">
        <span className="directory-part">{currentDirectory}</span>
        <span className="prompt-symbol">$</span>
      </div>
      
      <Input
        ref={inputRef}
        className={`command-input ${activeSuggestion ? 'has-suggestion' : ''}`}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isProcessing}
        bordered={false}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
      />
      
      {/* Processing/Analyzing Indicators */}
      {isProcessing && <Spin className="command-spinner" size="small" />}
      {!isProcessing && isAnalyzing && (
        <div className="ai-analyzing-indicator">
          <Spin size="small" />
          <span className="analyzing-text">AI analyzing...</span>
        </div>
      )}
      
      {/* AI Mode Indicator */}
      {aiEnabled && !isProcessing && (
        <div className="ai-mode-indicator" title="AI suggestions enabled">
          <span className={`ai-status ${isAnalyzing ? 'analyzing' : 'ready'}`} />
        </div>
      )}
      
      {/* Error Handling */}
      {suggestions.error && (
        <div className="suggestion-error-indicator" title={suggestions.error.message}>
          <span className="error-icon">!</span>
        </div>
      )}
    </div>
  );
};

export default CommandInput;
