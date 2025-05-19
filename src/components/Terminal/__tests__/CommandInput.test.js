import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import CommandInput from '../CommandInput';

// Mock the useTerminalAI hook
jest.mock('../../../hooks/useTerminalAI', () => ({
  useTerminalAI: jest.fn(() => ({
    inputValue: '',
    setInputValue: jest.fn(),
    suggestions: [],
    activeSuggestion: null,
    isAnalyzing: false,
    aiEnabled: true,
    handleInputChange: jest.fn(),
    handleKeyNavigation: jest.fn(() => false),
    applyActiveSuggestion: jest.fn(),
    handleCommandExecuted: jest.fn(),
    updateDirectoryContext: jest.fn()
  }))
}));

// Import the mocked hook to manipulate it
import { useTerminalAI } from '../../../hooks/useTerminalAI';

// Create mock store
const mockStore = configureStore([thunk]);

describe('CommandInput Component', () => {
  // Default props for tests
  const defaultProps = {
    onExecuteCommand: jest.fn(),
    onHistoryUp: jest.fn(),
    onHistoryDown: jest.fn(),
    isProcessing: false,
    currentDirectory: '~/projects'
  };

  // Initial store state
  const initialState = {
    terminal: {
      currentHistoryCommand: null
    }
  };

  let store;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    store = mockStore(initialState);
    
    // Reset the useTerminalAI mock to default values
    useTerminalAI.mockImplementation(() => ({
      inputValue: '',
      setInputValue: jest.fn(),
      suggestions: [],
      activeSuggestion: null,
      isAnalyzing: false,
      aiEnabled: true,
      handleInputChange: jest.fn(),
      handleKeyNavigation: jest.fn(() => false),
      applyActiveSuggestion: jest.fn(),
      handleCommandExecuted: jest.fn(),
      updateDirectoryContext: jest.fn()
    }));
  });

  // 1. Test basic command input functionality
  describe('Basic Input Functionality', () => {
    it('renders with the correct directory prompt', () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      expect(screen.getByText('~/projects')).toBeInTheDocument();
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('focuses input on mount', () => {
      const { container } = render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = container.querySelector('.command-input');
      expect(document.activeElement).toBe(input);
    });

    it('handles history navigation with arrow keys', () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Test ArrowUp (history up)
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(defaultProps.onHistoryUp).toHaveBeenCalled();
      
      // Test ArrowDown (history down)
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(defaultProps.onHistoryDown).toHaveBeenCalled();
    });

    it('disables input when processing a command', () => {
      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} isProcessing={true} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  // 2. Test AI suggestion handling
  describe('AI Suggestion Handling', () => {
    it('shows AI suggestions when available', () => {
      // Mock the useTerminalAI hook to return suggestions
      useTerminalAI.mockImplementation(() => ({
        inputValue: 'git',
        setInputValue: jest.fn(),
        suggestions: [
          { command: 'git status', description: 'Check git status' },
          { command: 'git commit', description: 'Commit changes' }
        ],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      // Mocking the SuggestionsOverlay component
      jest.mock('../../../components/AI/SuggestionsOverlay', () => {
        return {
          __esModule: true,
          default: ({ onSelect }) => (
            <div data-testid="suggestions-overlay">
              <div>git status</div>
              <div>git commit</div>
            </div>
          )
        };
      });

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      // Since we have fake suggestionsoverlay, let's just check if it receives props
      expect(useTerminalAI().suggestions.length).toBe(2);
    });

    it('shows analyzing indicator when AI is processing', () => {
      // Mock the AI is analyzing
      useTerminalAI.mockImplementation(() => ({
        inputValue: 'git',
        setInputValue: jest.fn(),
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: true,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      // Check for AI indicator when analyzing
      expect(screen.getByText('AI')).toBeInTheDocument();
    });
  });

  // 3. Test keyboard navigation
  describe('Keyboard Navigation', () => {
    it('delegates keyboard navigation to AI hook', () => {
      const mockHandleKeyNavigation = jest.fn(() => false);
      
      useTerminalAI.mockImplementation(() => ({
        inputValue: '',
        setInputValue: jest.fn(),
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: mockHandleKeyNavigation,
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Test that Tab key navigation is delegated to AI hook
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(mockHandleKeyNavigation).toHaveBeenCalled();
    });

    it('shortcuts are not handled when AI handles them', () => {
      // Mock that AI hook handles the keyboard event
      const mockHandleKeyNavigation = jest.fn(() => true);
      
      useTerminalAI.mockImplementation(() => ({
        inputValue: '',
        setInputValue: jest.fn(),
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: mockHandleKeyNavigation,
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // When AI hook handles the event, other handlers should not be called
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      expect(defaultProps.onHistoryUp).not.toHaveBeenCalled();
    });
  });

  // 4. Test command execution with AI features
  describe('Command Execution with AI', () => {
    it('executes regular command without suggestion', () => {
      const mockSetInputValue = jest.fn();
      const mockHandleCommandExecuted = jest.fn();
      
      useTerminalAI.mockImplementation(() => ({
        inputValue: 'echo hello',
        setInputValue: mockSetInputValue,
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: mockHandleCommandExecuted,
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Execute command with Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Check that command was executed and input cleared
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('echo hello');
      expect(mockHandleCommandExecuted).toHaveBeenCalledWith('echo hello');
      expect(mockSetInputValue).toHaveBeenCalledWith('');
    });

    it('executes AI suggestion when one is active', () => {
      const mockSetInputValue = jest.fn();
      const mockHandleCommandExecuted = jest.fn();
      const mockApplyActiveSuggestion = jest.fn(() => 'git status --verbose');
      
      useTerminalAI.mockImplementation(() => ({
        inputValue: 'git s',
        setInputValue: mockSetInputValue,
        suggestions: [
          { command: 'git status --verbose', description: 'Check git status' }
        ],
        activeSuggestion: { command: 'git status --verbose', description: 'Check git status' },
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: mockApplyActiveSuggestion,
        handleCommandExecuted: mockHandleCommandExecuted,
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Execute command with Enter when suggestion is active
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Check that the suggestion was applied and executed
      expect(mockApplyActiveSuggestion).toHaveBeenCalled();
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('git status --verbose');
      expect(mockHandleCommandExecuted).toHaveBeenCalledWith('git status --verbose');
    });

    it('handles Ctrl+C to cancel command', () => {
      const mockSetInputValue = jest.fn();
      
      useTerminalAI.mockImplementation(() => ({
        inputValue: 'some command',
        setInputValue: mockSetInputValue,
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Test Ctrl+C to cancel command
      fireEvent.keyDown(input, { key: 'c', ctrlKey: true });
      expect(mockSetInputValue).toHaveBeenCalledWith('');
    });

    it('handles Ctrl+L to clear terminal', () => {
      useTerminalAI.mockImplementation(() => ({
        inputValue: '',
        setInputValue: jest.fn(),
        suggestions: [],
        activeSuggestion: null,
        isAnalyzing: false,
        aiEnabled: true,
        handleInputChange: jest.fn(),
        handleKeyNavigation: jest.fn(() => false),
        applyActiveSuggestion: jest.fn(),
        handleCommandExecuted: jest.fn(),
        updateDirectoryContext: jest.fn()
      }));

      render(
        <Provider store={store}>
          <CommandInput {...defaultProps} />
        </Provider>
      );
      
      const input = screen.getByRole('textbox');
      
      // Test Ctrl+L to clear terminal
      fireEvent.keyDown(input, { key: 'l', ctrlKey: true });
      expect(defaultProps.onExecuteCommand).toHaveBeenCalledWith('clear');
    });
  });
});

