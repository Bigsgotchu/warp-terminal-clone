import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CommandInput from '../CommandInput';
import SuggestionsOverlay from '../../AI/SuggestionsOverlay';
import aiReducer, { updateContext } from '../../../features/ai/aiSlice';
import terminalReducer from '../../../features/terminalSlice';

// Mock aiService to avoid real API calls
jest.mock('../../../services/ai/aiService', () => ({
  aiService: {
    analyzeCommand: jest.fn().mockResolvedValue({
      suggestions: [
        { command: 'git status', description: 'Show the working tree status' },
        { command: 'git add .', description: 'Add all files to staging area' }
      ]
    }),
    explainCommand: jest.fn().mockResolvedValue(
      'Displays information about the current working directory status in Git'
    ),
    analyzeCommandPatterns: jest.fn().mockResolvedValue({ patterns: [] })
  }
}));

// Import mocked service to access and control it in tests
import { aiService } from '../../../services/ai/aiService';

// Mock SuggestionsOverlay to control its rendering and interaction
jest.mock('../../AI/SuggestionsOverlay', () => {
  return jest.fn(({ onSelect }) => (
    <div data-testid="suggestions-overlay">
      <ul>
        <li 
          data-testid="suggestion-0" 
          className="suggestion-item active" 
          onClick={() => onSelect({ command: 'git status', description: 'Show the working tree status' })}
        >
          git status
        </li>
        <li 
          data-testid="suggestion-1"
          className="suggestion-item"
          onClick={() => onSelect({ command: 'git add .', description: 'Add all files to staging area' })}
        >
          git add .
        </li>
      </ul>
    </div>
  ));
});

/**
 * Integration tests for CommandInput with AI features
 * These tests focus on how CommandInput interacts with other components and services
 */
describe('CommandInput AI Integration', () => {
  let store;
  
  // Default props for CommandInput
  const defaultProps = {
    onExecuteCommand: jest.fn(),
    onHistoryUp: jest.fn(),
    onHistoryDown: jest.fn(),
    isProcessing: false,
    currentDirectory: '~/projects'
  };

  // Set up store and reset mocks before each test
  beforeEach(() => {
    // Create a real Redux store with our reducers
    store = configureStore({
      reducer: {
        ai: aiReducer,
        terminal: terminalReducer
      },
      // Initial state with AI enabled
      preloadedState: {
        ai: {
          suggestions: [],
          activeSuggestionIndex: -1,
          isAnalyzing: false,
          commandExplanation: null,
          context: {
            recentCommands: [],
            currentDirectory: '~',
            lastError: null
          },
          settings: {
            enabled: true,
            suggestionThreshold: 2,
            maxSuggestions: 5,
            showExplanations: true,
            apiModel: 'gpt-3.5-turbo'
          },
          error: null
        }
      }
    });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock implementation of SuggestionsOverlay
    SuggestionsOverlay.mockClear();
  });

  // 1. Test complete AI suggestion workflow
  describe('AI Suggestion Workflow', () => {
    it('fetches and displays suggestions as user types', async () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );

      // Get the input element
      const input = screen.getByRole('textbox');
      
      // Initially, suggestions should not be shown
      expect(SuggestionsOverlay).not.toHaveBeenCalled();
      
      // Type 'git' into the input
      fireEvent.change(input, { target: { value: 'git' } });
      
      // Wait for debounce and API call
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalledWith(
          'git', 
          expect.any(Object)
        );
      });
      
      // Check suggestions are displayed
      expect(SuggestionsOverlay).toHaveBeenCalled();
      expect(store.getState().ai.suggestions).toHaveLength(2);
      expect(store.getState().ai.suggestions[0].command).toBe('git status');
    });

    it('shows analyzing indicator while fetching suggestions', async () => {
      // Mock delayed API response to ensure analyzing state is visible
      aiService.analyzeCommand.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            suggestions: [{ command: 'git status', description: 'Show status' }]
          }), 100)
        )
      );
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Type to trigger suggestion fetching
      fireEvent.change(input, { target: { value: 'git' } });
      
      // Check for analyzing indicator
      await waitFor(() => {
        expect(store.getState().ai.isAnalyzing).toBe(true);
        expect(screen.getByText('AI')).toBeInTheDocument();
      });
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(store.getState().ai.isAnalyzing).toBe(false);
      });
    });
  });

  // 2. Test command execution with AI suggestions
  describe('Command Execution with Suggestions', () => {
    it('selects and executes a suggestion when clicked', async () => {
      // Initialize store with suggestions
      store.dispatch({
        type: 'ai/setSuggestions',
        payload: [
          { command: 'git status', description: 'Show status' },
          { command: 'git add .', description: 'Stage all files' }
        ]
      });
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      // Find and click the first suggestion
      const suggestion = screen.getByTestId('suggestion-0');
      fireEvent.click(suggestion);
      
      // Check the input was updated with the suggestion
      expect(screen.getByRole('textbox').value).toBe('git status');
      
      // Execute the command
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      
      // Verify the command was executed
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('git status');
    });

    it('updates AI context after executing a command', async () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      // Type and execute a command
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'ls -la' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Check command is executed and context updated
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('ls -la');
      
      // Verify context is updated with the command
      await waitFor(() => {
        const state = store.getState();
        expect(state.ai.context.recentCommands).toContain('ls -la');
      });
    });
  });

  // 3. Test AI context updating
  describe('AI Context Updates', () => {
    it('updates context when directory changes', async () => {
      const { rerender } = render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      // Initial directory should be set in context
      expect(store.getState().ai.context.currentDirectory).toBe('~/projects');
      
      // Change the directory
      rerender(
        <Provider store={store}>
          <CommandInput 
            {...defaultProps} 
            currentDirectory="~/projects/new-folder" 
          />
        </Provider>
      );
      
      // Context should be updated with new directory
      await waitFor(() => {
        expect(store.getState().ai.context.currentDirectory).toBe('~/projects/new-folder');
      });
    });

    it('maintains command history in context', async () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Execute multiple commands
      fireEvent.change(input, { target: { value: 'cd documents' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      fireEvent.change(input, { target: { value: 'ls -la' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Check commands are stored in context
      await waitFor(() => {
        const recentCommands = store.getState().ai.context.recentCommands;
        expect(recentCommands).toContain('cd documents');
        expect(recentCommands).toContain('ls -la');
      });
    });
  });

  // 4. Test keyboard navigation between components
  describe('Keyboard Navigation', () => {
    it('navigates through suggestions with Tab key', async () => {
      // Set up store with suggestions
      store.dispatch({
        type: 'ai/analyzeCommand/fulfilled',
        payload: {
          suggestions: [
            { command: 'git status', description: 'Show status' },
            { command: 'git add .', description: 'Stage all files' }
          ]
        }
      });
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Tab should select first suggestion
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(store.getState().ai.activeSuggestionIndex).toBe(0);
      
      // Tab again should select second suggestion
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(store.getState().ai.activeSuggestionIndex).toBe(1);
      
      // Tab again should wrap to first suggestion
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(store.getState().ai.activeSuggestionIndex).toBe(0);
    });

    it('navigates suggestions backwards with Shift+Tab', async () => {
      // Set up store with suggestions
      store.dispatch({
        type: 'ai/analyzeCommand/fulfilled',
        payload: {
          suggestions: [
            { command: 'git status', description: 'Show status' },
            { command: 'git add .', description: 'Stage all files' }
          ]
        }
      });
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Shift+Tab should select last suggestion
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
      expect(store.getState().ai.activeSuggestionIndex).toBe(1);
      
      // Shift+Tab again should select first suggestion
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
      expect(store.getState().ai.activeSuggestionIndex).toBe(0);
    });

    it('selects active suggestion with Enter key', async () => {
      // Set up store with suggestions and active suggestion
      store.dispatch({
        type: 'ai/analyzeCommand/fulfilled',
        payload: {
          suggestions: [
            { command: 'git status', description: 'Show status' },
            { command: 'git add .', description: 'Stage all files' }
          ]
        }
      });
      store.dispatch({ type: 'ai/nextSuggestion' }); // Select first suggestion
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Press Enter to select active suggestion and execute
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Command should be executed
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('git status');
    });
  });

  // Additional integration scenarios
  describe('Error Handling and Edge Cases', () => {
    it('handles AI service failures gracefully', async () => {
      // Mock AI service to fail
      aiService.analyzeCommand.mockRejectedValueOnce(new Error('API error'));
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Type to trigger suggestion fetching
      fireEvent.change(input, { target: { value: 'git' } });
      
      // Wait for API call to complete
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalled();
      });
      
      // Should handle error gracefully and continue to function
      fireEvent.change(input, { target: { value: 'echo test' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('echo test');
    });

    it('does not show suggestions when AI is disabled', async () => {
      // Disable AI in the store
      store.dispatch({
        type: 'ai/updateSettings',
        payload: { enabled: false }
      });
      
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Type to trigger suggestion fetching
      fireEvent.change(input, { target: { value: 'git' } });
      
      // Wait to ensure analyzer is not called
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Suggestions should not be shown when AI is disabled
      expect(aiService.analyzeCommand).not.toHaveBeenCalled();
      expect(SuggestionsOverlay).not.toHaveBeenCalled();
    });
  });
});

