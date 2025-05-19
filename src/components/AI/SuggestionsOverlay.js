import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { Spin } from 'antd';
import {
  FileOutlined,
  FolderOutlined,
  CodeOutlined,
  BranchesOutlined,
  TagOutlined,
  RobotOutlined,
  HistoryOutlined,
  ToolOutlined,
  ApiOutlined,
  FormatPainterOutlined
} from '@ant-design/icons';
import {
  selectAIEnabled,
  nextSuggestion,
  prevSuggestion,
  resetSuggestionSelection
} from '../../features/ai/aiSlice';
import './SuggestionsOverlay.css';

/**
 * Get appropriate icon based on suggestion type
 * @param {Object} suggestion - The suggestion object
 * @param {boolean} isAI - Whether this is an AI suggestion
 * @returns {React.ReactNode} The icon component
 */
const getSuggestionIcon = (suggestion, isAI) => {
  if (isAI) {
    return <RobotOutlined className="suggestion-icon ai-icon" />;
  }
  
  // For autocompletion suggestions
  const type = suggestion.type;
  
  switch (type) {
    case 'file':
      return <FileOutlined className="suggestion-icon file-icon" />;
    case 'directory':
      return <FolderOutlined className="suggestion-icon dir-icon" />;
    case 'command':
      return <CodeOutlined className="suggestion-icon cmd-icon" />;
    case 'subcommand':
      return <ApiOutlined className="suggestion-icon subcmd-icon" />;
    case 'flag':
      return <TagOutlined className="suggestion-icon flag-icon" />;
    case 'branch':
      return <BranchesOutlined className="suggestion-icon branch-icon" />;
    case 'history':
      return <HistoryOutlined className="suggestion-icon history-icon" />;
    case 'script':
      return <FormatPainterOutlined className="suggestion-icon script-icon" />;
    default:
      return <ToolOutlined className="suggestion-icon" />;
  }
};

/**
 * SuggestionsOverlay component displays suggestions for terminal commands
 * Handles both AI-powered suggestions and autocompletion suggestions
 * 
 * @typedef {Object} CommandSuggestion
 * @property {string} command - The suggested command text
 * @property {string} description - Description or explanation of the command
 * 
 * @typedef {Object} AutocompletionSuggestion
 * @property {string} value - The completion value
 * @property {string} label - Display label
 * @property {string} description - Description of the suggestion
 * @property {string} type - Type of suggestion (file, directory, etc.)
 * 
 * @typedef {Object} SuggestionsOverlayProps
 * @property {Array<CommandSuggestion|AutocompletionSuggestion>} suggestions - Array of suggestions to display
 * @property {number} activeIndex - Index of the active suggestion
 * @property {boolean} isAI - Whether suggestions are AI-powered or autocompletion
 * @property {boolean} [isLoading] - Whether suggestions are loading
 * @property {function} onSelect - Callback when suggestion is selected
 * 
 * @param {SuggestionsOverlayProps} props - Component props
 * @returns {React.ReactElement|null} The suggestion overlay UI or null if nothing to show
 */
const SuggestionsOverlay = ({ 
  suggestions = [], 
  activeIndex = -1, 
  isAI = true,
  isLoading = false,
  onSelect 
}) => {
  // Get AI enabled state from Redux
  const aiEnabled = useSelector(selectAIEnabled);
  const dispatch = useDispatch();

  // Memoize selection handler to prevent unnecessary re-renders
  const handleSelectSuggestion = useCallback((suggestion) => {
    onSelect(suggestion);
    dispatch(resetSuggestionSelection());
  }, [onSelect, dispatch]);

  // Handle keyboard navigation for suggestions
  // This is only for global keyboard events - local keyboard events
  // in the CommandInput component are handled separately
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle events when we have suggestions and it's AI mode
      if ((!aiEnabled && isAI) || suggestions.length === 0) return;

      // Don't handle Tab/Enter if inside a form field with another purpose
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      // We only handle global keyboard events for AI suggestions
      // Autocompletion navigation is handled in CommandInput
      if (isAI) {
        if (e.key === 'Tab') {
          e.preventDefault();
          // Shift+Tab navigates up, Tab navigates down
          if (e.shiftKey) {
            dispatch(prevSuggestion());
          } else {
            dispatch(nextSuggestion());
          }
        } else if (e.key === 'Enter' && activeIndex >= 0) {
          // Select current suggestion with Enter
          e.preventDefault();
          handleSelectSuggestion(suggestions[activeIndex]);
        } else if (e.key === 'Escape') {
          // Escape clears selection
          dispatch(resetSuggestionSelection());
        }
      }
    };

    // Only add the global listener if we have AI suggestions to navigate
    if (suggestions.length > 0 && isAI) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [suggestions, activeIndex, dispatch, handleSelectSuggestion, aiEnabled, isAI]);

  // Don't render if necessary conditions aren't met
  if ((isAI && !aiEnabled) || (!isLoading && suggestions.length === 0)) {
    return null;
  }

  return (
    <div 
      className={`suggestions-overlay ${isAI ? 'ai-suggestions' : 'auto-suggestions'}`}
      aria-live="polite" 
      role="listbox"
      aria-label={isAI ? "AI command suggestions" : "Autocompletion suggestions"}
    >
      {isLoading ? (
        // Loading state
        <div className="suggestions-loading" aria-busy="true">
          <Spin size="small" aria-hidden="true" />
          <span>
            {isAI ? "Analyzing command..." : "Loading completions..."}
          </span>
        </div>
      ) : (
        // Suggestions list
        <>
          <div className="suggestions-header">
            <span className="suggestions-title">
              {isAI ? (
                <>
                  <RobotOutlined className="header-icon" />
                  <span>AI Suggestions</span>
                </>
              ) : (
                <>
                  <CodeOutlined className="header-icon" />
                  <span>Completions</span>
                </>
              )}
            </span>
            <span className="suggestions-hint">
              {isAI ? "Use Tab to navigate" : "Tab/Shift+Tab to navigate"}
            </span>
          </div>
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className={`suggestion-item ${index === activeIndex ? 'active' : ''} ${
                  suggestion.type ? `type-${suggestion.type}` : ''
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }
                }}
              >
                {/* Icon for suggestion type */}
                {getSuggestionIcon(suggestion, isAI)}
                
                {/* Suggestion content */}
                <div className="suggestion-content">
                  <div className="suggestion-command">
                    {isAI ? suggestion.command : suggestion.label || suggestion.value}
                  </div>
                  {suggestion.description && (
                    <div className="suggestion-description">
                      {suggestion.description}
                    </div>
                  )}
                </div>
                
                {/* Source/type badge */}
                {suggestion.source && (
                  <div className="suggestion-badge">
                    <span className={`badge ${suggestion.source}`}>
                      {suggestion.source}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// PropTypes validation
SuggestionsOverlay.propTypes = {
  suggestions: PropTypes.array,
  activeIndex: PropTypes.number,
  isAI: PropTypes.bool,
  isLoading: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

// Use memo to prevent unnecessary re-renders
export default React.memo(SuggestionsOverlay);
