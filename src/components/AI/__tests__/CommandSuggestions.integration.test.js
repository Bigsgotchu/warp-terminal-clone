import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import SuggestionsOverlay from '../SuggestionsOverlay';
import CommandInput from '../../Terminal/CommandInput';
import { renderWithProviders, defaultAIState, mockSuggestions, mockError } from './testUtils';
import { aiService } from '../../../services/ai/aiService';

// Mock imports
jest.mock('../../../services/ai/aiService');

describe('Command Suggestions Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('SuggestionsOverlay integration', () => {
    it('should display suggestions when available', async () => {
      // Set up state with suggestions
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: mockSuggestions,
          isAnalyzing: false
        }
      };
      
      // Mock select function
      const mockSelect = jest.fn();
      
      // Render component
      renderWithProviders(
        <SuggestionsOverlay onSelect={mockSelect} />,
        { preloadedState: state }
      );
      
      // Verify suggestions are displayed
      expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
      expect(screen.getByText('ls -la')).toBeInTheDocument();
      expect(screen.getByText('List all files with details')).toBeInTheDocument();
    });
    
    it('should show loading state when analyzing', () => {
      // Set up state with analyzing flag
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: [],
          isAnalyzing: true
        }
      };
      
      // Render component
      renderWithProviders(
        <SuggestionsOverlay onSelect={() => {}} />,
        { preloadedState: state }
      );
      
      // Verify loading state
      expect(screen.getByText('Analyzing command...')).toBeInTheDocument();
    });
    
    it('should handle keyboard navigation', () => {
      // Set up state with suggestions
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: mockSuggestions,
          activeSuggestionIndex: 0
        }
      };
      
      // Render component with suggestions
      const { store } = renderWithProviders(
        <SuggestionsOverlay onSelect={() => {}} />,
        { preloadedState: state }
      );
      
      // Get first suggestion
      const firstSuggestion = screen.getByText('ls -la');
      expect(firstSuggestion.closest('li')).toHaveAttribute('aria-selected', 'true');
      
      // Simulate Tab keypress to navigate to next suggestion
      fireEvent.keyDown(document, { key: 'Tab' });
      
      // Check if the active suggestion index was updated in state
      expect(store.getState().ai.activeSuggestionIndex).toBe(1);
    });
    
    it('should call onSelect when a suggestion is clicked', () => {
      // Set up state with suggestions
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: mockSuggestions,
          isAnalyzing: false
        }
      };
      
      // Mock select function
      const mockSelect = jest.fn();
      
      // Render component
      renderWithProviders(
        <SuggestionsOverlay onSelect={mockSelect} />,
        { preloadedState: state }
      );
      
      // Click on a suggestion
      fireEvent.click(screen.getByText('ls -la'));
      
      // Verify onSelect was called with the correct suggestion
      expect(mockSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    });
    
    it('should not render when AI is disabled', () => {
      // Set up state with AI disabled
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: mockSuggestions,
          settings: {
            ...defaultAIState.settings,
            enabled: false
          }
        }
      };
      
      // Render component
      const { container } = renderWithProviders(
        <SuggestionsOverlay onSelect={() => {}} />,
        { preloadedState: state }
      );
      
      // Verify nothing is rendered
      expect(container.firstChild).toBeNull();
    });
  });
  
  describe('CommandInput integration with suggestions', () => {
    it('should trigger suggestion analysis when typing', async () => {
      // Mock AI service response
      aiService.analyzeCommand.mockResolvedValue({ suggestions: mockSuggestions });
      
      // Set up initial state
      const state = {
        ai: defaultAIState,
        terminal: defaultTerminalState
      };
      
      // Mock command execution callback
      const mockExecuteCommand = jest.fn();
      
      // Render component
      const { store } = renderWithProviders(
        <CommandInput 
          onExecuteCommand={mockExecuteCommand}
          isProcessing={false}
          currentDirectory="/home/user"
        />,
        { preloadedState: state }
      );
      
      // Get input field
      const inputElement = screen.getByRole('textbox');
      
      // Type in the input to trigger suggestion analysis
      await act(async () => {
        fireEvent.change(inputElement, { target: { value: 'ls -' } });
      });
      
      // Allow time for the debounced analysis to complete
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalledWith(
          'ls -', 
          expect.objectContaining({ currentDirectory: expect.any(String) })
        );
      });
      
      // Update store with analysis results (simulating the thunk's action)
      await act(async () => {
        store.dispatch({
          type: 'ai/analyzeCommand/fulfilled',
          payload: { suggestions: mockSuggestions }
        });
      });
      
      // Verify suggestions were stored in state
      expect(store.getState().ai.suggestions).toEqual(mockSuggestions);
    });
    
    it('should handle tab key to select suggestion', async () => {
      // Mock AI service responses
      aiService.analyzeCommand.mockResolvedValue({ suggestions: mockSuggestions });
      
      // Set up initial state with active suggestion
      const state = {
        ai: {
          ...defaultAIState,
          suggestions: mockSuggestions,
          activeSuggestionIndex: 0
        },
        terminal: defaultTerminalState
      };
      
      // Mock command execution callback
      const mockExecuteCommand = jest.fn();
      
      // Render component
      renderWithProviders(
        <>
          <SuggestionsOverlay onSelect={() => {}} />
          <CommandInput 
            onExecuteCommand={mockExecuteCommand}
            isProcessing={false}
            currentDirectory="/home/user"
          />
        </>,
        { preloadedState: state }
      );
      
      // Get input field
      const inputElement = screen.getByRole('textbox');
      
      // Simulate input value
      await act(async () => {
        fireEvent.change(inputElement, { target: { value: 'ls -' } });
      });
      
      // Simulate Enter key with active suggestion
      await act(async () => {
        fireEvent.keyDown(inputElement, { key: 'Enter' });
      });
      
      // Verify the command was executed with the suggestion
      expect(mockExecuteCommand).toHaveBeenCalledWith(mockSuggestions[0].command);
    });
    
    it('should handle error state when analysis fails', async () => {
      // Mock AI service to reject
      aiService.analyzeCommand.mockRejectedValue(new Error(mockError));
      
      // Set up initial state
      const state = {
        ai: defaultAIState,
        terminal: defaultTerminalState
      };
      
      // Render component
      const { store } = renderWithProviders(
        <CommandInput 
          onExecuteCommand={() => {}}
          isProcessing={false}
          currentDirectory="/home/user"
        />,
        { preloadedState: state }
      );
      
      // Get input field
      const inputElement = screen.getByRole('textbox');
      
      // Type in the input to trigger analysis that will fail
      await act(async () => {
        fireEvent.change(inputElement, { target: { value: 'ls -' } });
      });
      
      // Allow time for the analysis to complete (and fail)
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalled();
      });
      
      // Update store with error results (simulating the thunk's action)
      await act(async () => {
        store.dispatch({
          type: 'ai/analyzeCommand/rejected',
          payload: mockError
        });
      });
      
      // Verify error state was set correctly
      expect(store.getState().ai.error).toEqual(mockError);
      expect(store.getState().ai.suggestions).toEqual([]);
      expect(store.getState().ai.isAnalyzing).toBe(false);
    });
    
    it('should show loading state while analyzing', async () => {
      // Set up initial state with analyzing flag
      const state = {
        ai: {
          ...defaultAIState,
          isAnalyzing: true
        },
        terminal: defaultTerminalState
      };
      
      // Render components
      renderWithProviders(
        <>
          <SuggestionsOverlay onSelect={() => {}} />
          <CommandInput 
            onExecuteCommand={() => {}}
            isProcessing={false}
            currentDirectory="/home/user"
          />
        </>,
        { preloadedState: state }
      );
      
      // Verify loading state is displayed
      expect(screen.getByText('Analyzing command...')).toBeInTheDocument();
    });
  });
});
