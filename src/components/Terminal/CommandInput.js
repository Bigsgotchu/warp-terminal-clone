import React, { useEffect, useRef } from 'react';
import { Input, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentHistoryCommand } from '../../features/terminalSlice';
import { useTerminalAI } from '../../hooks/useTerminalAI';
import SuggestionsOverlay from '../AI/SuggestionsOverlay';
import './CommandInput.css';

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
  
  // Initialize AI features via custom hook
  const {
    inputValue,
    setInputValue,
    suggestions,
    activeSuggestion,
    isAnalyzing,
    aiEnabled,
    handleInputChange,
    handleKeyNavigation,
    applyActiveSuggestion,
    handleCommandExecuted,
    updateDirectoryContext
  } = useTerminalAI({
    debounceMs: 150,
    autoExplain: true
  });
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
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
    // Let AI handle suggestion navigation first
    const handledByAI = handleKeyNavigation(e);
    if (handledByAI) return;
    
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
      
      // Use active suggestion if available, otherwise use raw input
      const commandToExecute = activeSuggestion ? 
        applyActiveSuggestion() : 
        inputValue.trim();
      
      if (commandToExecute) {
        onExecuteCommand(commandToExecute);
        handleCommandExecuted(commandToExecute);
        setInputValue('');
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
    <div className="command-input-container">
      {/* AI Suggestions Overlay */}
      {aiEnabled && !isProcessing && suggestions.length > 0 && (
        <SuggestionsOverlay
          onSelect={(suggestion) => {
            setInputValue(suggestion.command);
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
        <div className="ai-analyzing">
          <span className="ai-indicator">AI</span>
          <Spin className="command-spinner" size="small" />
        </div>
      )}
      
      {/* Keyboard Shortcut Hint */}
      {aiEnabled && (
        <div className="keyboard-hint">
          Tab for suggestions • Ctrl+/ for explanation
        </div>
      )}
    </div>
  );
};

export default CommandInput;

