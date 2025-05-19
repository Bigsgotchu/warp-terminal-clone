import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spin } from 'antd';
import {
  selectSuggestions,
  selectActiveSuggestionIndex,
  selectIsAnalyzing,
  selectAIEnabled,
  nextSuggestion,
  prevSuggestion,
  resetSuggestionSelection
} from '../../features/ai/aiSlice';
import './SuggestionsOverlay.css';

/**
 * SuggestionsOverlay component displays AI-powered command suggestions
 * 
 * @typedef {Object} CommandSuggestion
 * @property {string} command - The suggested command text
 * @property {string} description - Description or explanation of the command
 * 
 * @typedef {Object} SuggestionsOverlayProps
 * @property {function(CommandSuggestion): void} onSelect - Callback when suggestion is selected
 * 
 * @param {SuggestionsOverlayProps} props - Component props
 * @returns {React.ReactElement|null} The suggestion overlay UI or null if nothing to show
 */
const SuggestionsOverlay = ({ onSelect }) => {
  // Get AI state from Redux
  const suggestions = useSelector(selectSuggestions);
  const activeIndex = useSelector(selectActiveSuggestionIndex);
  const isAnalyzing = useSelector(selectIsAnalyzing);
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
      // Only handle events when we have suggestions
      if (!aiEnabled || suggestions.length === 0) return;

      // Don't handle Tab/Enter if inside a form field with another purpose
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

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
    };

    // Only add the global listener if we have suggestions to navigate
    if (suggestions.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [suggestions, activeIndex, dispatch, handleSelectSuggestion, aiEnabled]);

  // Don't render if AI is disabled or there's nothing to show
  if (!aiEnabled || (!isAnalyzing && suggestions.length === 0)) {
    return null;
  }

  return (
    <div 
      className="suggestions-overlay" 
      aria-live="polite" 
      role="listbox"
      aria-label="AI command suggestions"
    >
      {isAnalyzing ? (
        // Loading state
        <div className="suggestions-loading" aria-busy="true">
          <Spin size="small" aria-hidden="true" />
          <span>Analyzing command...</span>
        </div>
      ) : (
        // Suggestions list
        <>
          <div className="suggestions-header">
            <span className="suggestions-title">AI Suggestions</span>
            <span className="suggestions-hint">Use Tab to navigate</span>
          </div>
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
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
                <div className="suggestion-command">
                  {suggestion.command}
                </div>
                {suggestion.description && (
                  <div className="suggestion-description" aria-description={suggestion.description}>
                    {suggestion.description}
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

// Use memo to prevent unnecessary re-renders
export default React.memo(SuggestionsOverlay);
