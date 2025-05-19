import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import CommandExplanation from '../CommandExplanation';
import {
  renderWithProviders,
  defaultAIState,
  mockSimpleExplanation,
  mockStructuredExplanation,
  mockError
} from './testUtils';
import { aiService } from '../../../services/ai/aiService';

// Mock imports
jest.mock('../../../services/ai/aiService');

describe('Command Explanation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Explanation display', () => {
    it('should display simple text explanation', () => {
      // Set up state with simple text explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation,
          isExplaining: false
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify explanation is displayed
      expect(screen.getByText('Command Explanation')).toBeInTheDocument();
      expect(screen.getByText(mockSimpleExplanation)).toBeInTheDocument();
    });
    
    it('should display structured explanation correctly', () => {
      // Set up state with structured explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockStructuredExplanation,
          isExplaining: false
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify structured explanation sections are displayed
      expect(screen.getByText('Command Explanation')).toBeInTheDocument();
      expect(screen.getByText('Command')).toBeInTheDocument();
      expect(screen.getByText('ls -la')).toBeInTheDocument();
      expect(screen.getByText('Purpose')).toBeInTheDocument();
      expect(screen.getByText(mockStructuredExplanation.purpose)).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('-l')).toBeInTheDocument();
      expect(screen.getByText('-a')).toBeInTheDocument();
      expect(screen.getByText('Examples')).toBeInTheDocument();
      expect(screen.getByText('ls -l')).toBeInTheDocument();
    });
    
    it('should show loading state when explaining', () => {
      // Set up state with loading flag
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: null,
          isExplaining: true
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify loading state
      expect(screen.getByText('Generating explanation...')).toBeInTheDocument();
    });
    
    it('should display error when explanation fails', () => {
      // Set up state with error
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: null,
          isExplaining: false,
          error: mockError
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify error message
      expect(screen.getByText(`Error: ${mockError}`)).toBeInTheDocument();
    });
    
    it('should not render when there is no explanation and no loading state', () => {
      // Set up state with no explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: null,
          isExplaining: false,
          error: null
        }
      };
      
      // Render component
      const { container } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify nothing is rendered
      expect(container.firstChild).toBeNull();
    });
    
    it('should not render when AI is disabled', () => {
      // Set up state with AI disabled
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation,
          settings: {
            ...defaultAIState.settings,
            enabled: false
          }
        }
      };
      
      // Render component
      const { container } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify nothing is rendered
      expect(container.firstChild).toBeNull();
    });
  });
  
  describe('Keyboard interactions', () => {
    it('should close explanation when Escape key is pressed', () => {
      // Set up state with explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation
        }
      };
      
      // Render component
      const { store } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify explanation is displayed initially
      expect(screen.getByText(mockSimpleExplanation)).toBeInTheDocument();
      
      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Verify explanation was cleared in state
      expect(store.getState().ai.commandExplanation).toBeNull();
    });
    
    it('should close explanation when close button is clicked', () => {
      // Set up state with explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation
        }
      };
      
      // Render component
      const { store } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Find and click close button
      const closeButton = screen.getByLabelText('Close explanation');
      fireEvent.click(closeButton);
      
      // Verify explanation was cleared in state
      expect(store.getState().ai.commandExplanation).toBeNull();
    });
    
    it('should handle Ctrl+/ as keyboard shortcut', () => {
      // This just tests that Ctrl+/ is prevented (actual toggle is handled by the Terminal component)
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Create keydown event with preventDefault spy
      const preventDefault = jest.fn();
      const event = new KeyboardEvent('keydown', { 
        key: '/', 
        ctrlKey: true,
        preventDefault 
      });
      
      // Dispatch event
      window.dispatchEvent(event);
      
      // Check that event.preventDefault was called
      expect(preventDefault).toHaveBeenCalled();
    });
  });
  
  describe('Focus and accessibility', () => {
    it('should focus container when explanation appears', () => {
      // Initial state with no explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: null
        }
      };
      
      // Render with initial state
      const { store, rerender } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Update state to add explanation
      act(() => {
        store.dispatch({
          type: 'ai/explainCommand/fulfilled',
          payload: mockSimpleExplanation
        });
      });
      
      // Rerender with new state
      rerender(<CommandExplanation />);
      
      // Get container and check if it's focused
      const container = screen.getByRole('region', { name: 'Command explanation' });
      expect(document.activeElement).toBe(container);
    });
    
    it('should have proper ARIA attributes for accessibility', () => {
      // Set up state with explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Check for accessibility attributes
      const container = screen.getByRole('region', { name: 'Command explanation' });
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('tabIndex', '0');
      
      // Close button should have accessible label
      const closeButton = screen.getByLabelText('Close explanation');
      expect(closeButton).toBeInTheDocument();
      
      // Loading state should have aria-live and aria-busy
      const state2 = {
        ai: {
          ...defaultAIState,
          isExplaining: true
        }
      };
      
      const { rerender } = renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state2 }
      );
      
      const loadingElement = screen.getByText('Generating explanation...');
      const loadingContainer = loadingElement.closest('div');
      expect(loadingContainer).toHaveAttribute('aria-busy', 'true');
      expect(loadingContainer).toHaveAttribute('aria-live', 'polite');
      
      // Error state should have role="alert"
      const state3 = {
        ai: {
          ...defaultAIState,
          error: mockError
        }
      };
      
      rerender(
        <CommandExplanation />,
        { preloadedState: state3 }
      );
      
      const errorElement = screen.getByText(`Error: ${mockError}`);
      const errorContainer = errorElement.closest('div');
      expect(errorContainer).toHaveAttribute('role', 'alert');
    });
    
    it('should display keyboard shortcut hints', () => {
      // Set up state with explanation
      const state = {
        ai: {
          ...defaultAIState,
          commandExplanation: mockSimpleExplanation
        }
      };
      
      // Render component
      renderWithProviders(
        <CommandExplanation />,
        { preloadedState: state }
      );
      
      // Verify keyboard shortcut hints are displayed
      expect(screen.getByText('ESC')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+/')).toBeInTheDocument();
    });
  });
});
