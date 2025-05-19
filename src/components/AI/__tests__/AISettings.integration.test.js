import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AISettings from '../AISettings';
import { renderWithProviders, defaultAIState } from './testUtils';
import { aiService } from '../../../services/ai/aiService';

// Mock imports
jest.mock('../../../services/ai/aiService');

describe('AI Settings Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Settings form display', () => {
    it('should display settings form when visible prop is true', () => {
      // Render component with visible=true
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Verify form elements are displayed
      expect(screen.getByText('AI Settings')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('Data Management')).toBeInTheDocument();
    });
    
    it('should not display settings form when visible prop is false', () => {
      // Render component with visible=false
      const { container } = renderWithProviders(
        <AISettings isVisible={false} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Verify nothing is rendered
      expect(container.firstChild).toBeNull();
    });
    
    it('should display current settings values from state', () => {
      // Custom state with specific settings
      const state = {
        ai: {
          ...defaultAIState,
          settings: {
            ...defaultAIState.settings,
            suggestionThreshold: 3,
            showExplanations: false
          }
        }
      };
      
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: state }
      );
      
      // Find form elements and check their values
      const suggestionThresholdSlider = screen.getByLabelText(/Suggestion Threshold/i);
      expect(suggestionThresholdSlider).toHaveValue('3');
      
      const explanationsSwitch = screen.getByLabelText(/Command Explanations/i);
      expect(explanationsSwitch).not.toBeChecked();
    });
  });
  
  describe('Settings toggle functionality', () => {
    it('should toggle AI features when switch is clicked', () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Find AI toggle switch
      const enableToggle = screen.getByRole('switch', { name: /AI Features/i });
      expect(enableToggle).toBeChecked();
      
      // Click to toggle off
      fireEvent.click(enableToggle);
      
      // Verify state was updated
      expect(store.getState().ai.settings.enabled).toBe(false);
      
      // Click to toggle back on
      fireEvent.click(enableToggle);
      
      // Verify state was updated
      expect(store.getState().ai.settings.enabled).toBe(true);
    });
    
    it('should disable form fields when AI is disabled', () => {
      // State with AI disabled
      const state = {
        ai: {
          ...defaultAIState,
          settings: {
            ...defaultAIState.settings,
            enabled: false
          }
        }
      };
      
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: state }
      );
      
      // Check that form fields are disabled
      const maxSuggestionsInput = screen.getByLabelText(/Maximum Suggestions/i);
      expect(maxSuggestionsInput).toBeDisabled();
      
      const contextDepthSelect = screen.getByLabelText(/Context Depth/i);
      expect(contextDepthSelect).toBeDisabled();
      
      const explanationsSwitch = screen.getByLabelText(/Command Explanations/i);
      expect(explanationsSwitch).toBeDisabled();
    });
  });
  
  describe('Settings form validation', () => {
    it('should validate API key format', async () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Find API key input
      const apiKeyInput = screen.getByLabelText(/API Key/i);
      
      // Enter invalid API key
      fireEvent.change(apiKeyInput, { target: { value: 'sk-invalid' } });
      
      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText(/Invalid OpenAI API key format/i)).toBeInTheDocument();
      });
    });
    
    it('should allow valid API keys', async () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Find API key input
      const apiKeyInput = screen.getByLabelText(/API Key/i);
      
      // Enter valid API key (valid OpenAI key format starts with sk- followed by characters)
      const validApiKey = 'sk-' + 'a'.repeat(48);
      fireEvent.change(apiKeyInput, { target: { value: validApiKey } });
      
      // Find API endpoint input and update it
      const apiEndpointInput = screen.getByLabelText(/API Endpoint/i);
      fireEvent.change(apiEndpointInput, { 
        target: { value: 'https://custom-api.openai.com/v1/chat/completions' } 
      });
      
      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Wait for cache to clear (should be called when API endpoint changes)
      await waitFor(() => {
        expect(aiService.clearCache).toHaveBeenCalled();
      });
      
      // Verify state was updated with new values
      expect(store.getState().ai.settings.apiKey).toBe(validApiKey);
      expect(store.getState().ai.settings.apiEndpoint).toBe('https://custom-api.openai.com/v1/chat/completions');
    });
  });
  
  describe('Settings persistence', () => {
    it('should persist changes when Save Changes is clicked', () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Change several settings
      const maxSuggestionsInput = screen.getByLabelText(/Maximum Suggestions/i);
      fireEvent.change(maxSuggestionsInput, { target: { value: '8' } });
      
      const contextDepthSelect = screen.getByLabelText(/Context Depth/i);
      fireEvent.change(contextDepthSelect, { target: { value: '10' } });
      
      const offlineToggle = screen.getByLabelText(/Offline Mode/i);
      fireEvent.click(offlineToggle);
      
      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Verify state was updated with new values
      expect(store.getState().ai.settings.maxSuggestions).toBe(8);
      expect(store.getState().ai.settings.contextDepth).toBe(10);
      expect(store.getState().ai.settings.offlineMode).toBe(true);
    });
    
    it('should reset to defaults when Reset to Defaults is clicked', () => {
      // Start with customized settings
      const customizedState = {
        ai: {
          ...defaultAIState,
          settings: {
            ...defaultAIState.settings,
            suggestionThreshold: 4,
            maxSuggestions: 8,
            contextDepth: 10,
            showExplanations: false,
            offlineMode: true
          }
        }
      };
      
      // Render component with customized settings
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: customizedState }
      );
      
      // Verify customized settings are displayed
      const suggestionThresholdSlider = screen.getByLabelText(/Suggestion Threshold/i);
      expect(suggestionThresholdSlider).toHaveValue('4');
      
      // Click Reset to Defaults button
      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);
      
      // Verify form is reset to default values
      expect(suggestionThresholdSlider).toHaveValue('2');
      
      const explanationsSwitch = screen.getByLabelText(/Command Explanations/i);
      expect(explanationsSwitch).toBeChecked();
      
      const offlineToggle = screen.getByLabelText(/Offline Mode/i);
      expect(offlineToggle).not.toBeChecked();
      
      // Save button should now be enabled
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeEnabled();
    });

    it('should warn about unsaved changes when closing', () => {
      // Mock onClose callback
      const mockOnClose = jest.fn();
      
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} onClose={mockOnClose} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Change a setting
      const suggestionThresholdSlider = screen.getByLabelText(/Suggestion Threshold/i);
      fireEvent.change(suggestionThresholdSlider, { target: { value: 4 } });
      
      // Try to close without saving
      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.click(closeButton);
      
      // Verify warning notification appears
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByText('You have unsaved changes. Save or discard your changes before closing.')).toBeInTheDocument();
      
      // onClose should not have been called
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Click Discard button
      const discardButton = screen.getByText('Discard');
      fireEvent.click(discardButton);
      
      // onClose should now have been called
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Numerical input validation', () => {
    it('should enforce min/max values for numerical inputs', () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Try to set maxSuggestions below minimum
      const maxSuggestionsInput = screen.getByLabelText(/Maximum Suggestions/i);
      fireEvent.change(maxSuggestionsInput, { target: { value: '0' } });
      
      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Verify value was constrained to minimum
      expect(store.getState().ai.settings.maxSuggestions).toBe(1);
      
      // Try to set maxSuggestions above maximum
      fireEvent.change(maxSuggestionsInput, { target: { value: '20' } });
      fireEvent.click(saveButton);
      
      // Verify value was constrained to maximum
      expect(store.getState().ai.settings.maxSuggestions).toBe(10);
    });
    
    it('should handle non-numeric input gracefully', () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Enter non-numeric value
      const maxSuggestionsInput = screen.getByLabelText(/Maximum Suggestions/i);
      fireEvent.change(maxSuggestionsInput, { target: { value: 'abc' } });
      
      // Input should be empty or invalid
      expect(maxSuggestionsInput.value).toBe('');
      
      // Save button should be disabled due to invalid input
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });
  });
  
  describe('API Configuration', () => {
    it('should disable API settings when offline mode is enabled', () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Enable offline mode
      const offlineToggle = screen.getByLabelText(/Offline Mode/i);
      fireEvent.click(offlineToggle);
      
      // Verify API settings are disabled
      const apiKeyInput = screen.getByLabelText(/API Key/i);
      expect(apiKeyInput).toBeDisabled();
      
      const apiEndpointInput = screen.getByLabelText(/API Endpoint/i);
      expect(apiEndpointInput).toBeDisabled();
      
      const apiModelSelect = screen.getByLabelText(/AI Model/i);
      expect(apiModelSelect).toBeDisabled();
    });
    
    it('should clear cache when API endpoint changes', async () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Change API endpoint
      const apiEndpointInput = screen.getByLabelText(/API Endpoint/i);
      fireEvent.change(apiEndpointInput, { 
        target: { value: 'https://different-endpoint.com/v1/chat/completions' } 
      });
      
      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Verify cache was cleared
      await waitFor(() => {
        expect(aiService.clearCache).toHaveBeenCalled();
      });
      
      // Verify endpoint was updated in state
      expect(store.getState().ai.settings.apiEndpoint).toBe('https://different-endpoint.com/v1/chat/completions');
    });
  });
  
  describe('Offline Mode Behavior', () => {
    it('should keep AI enabled when switching to offline mode', () => {
      // Render component
      const { store } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Enable offline mode
      const offlineToggle = screen.getByLabelText(/Offline Mode/i);
      fireEvent.click(offlineToggle);
      
      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Verify AI is still enabled
      expect(store.getState().ai.settings.enabled).toBe(true);
      expect(store.getState().ai.settings.offlineMode).toBe(true);
    });
    
    it('should handle AI data reset', async () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Click the Reset AI Data button
      const resetDataButton = screen.getByText('Reset AI Data');
      fireEvent.click(resetDataButton);
      
      // Wait for notification about reset
      await waitFor(() => {
        expect(screen.getByText('AI State Reset')).toBeInTheDocument();
        expect(screen.getByText('All AI data has been reset. Command history and context have been cleared.')).toBeInTheDocument();
      });
    });
  });
  
  describe('Keyboard Navigation and Accessibility', () => {
    it('should support keyboard navigation between form elements', () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Start with first input focused
      const enableToggle = screen.getByRole('switch', { name: /AI Features/i });
      enableToggle.focus();
      expect(document.activeElement).toBe(enableToggle);
      
      // Tab to next element
      fireEvent.keyDown(enableToggle, { key: 'Tab' });
      const suggestionThresholdSlider = screen.getByLabelText(/Suggestion Threshold/i);
      expect(document.activeElement).toBe(suggestionThresholdSlider);
      
      // Tab to the next element
      fireEvent.keyDown(suggestionThresholdSlider, { key: 'Tab' });
      const maxSuggestionsInput = screen.getByLabelText(/Maximum Suggestions/i);
      expect(document.activeElement).toBe(maxSuggestionsInput);
    });
    
    it('should have accessible form controls with proper labels', () => {
      // Render component
      renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Check that all form controls have accessible labels
      expect(screen.getByLabelText(/Suggestion Threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Maximum Suggestions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Command Explanations/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Context Depth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Offline Mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/AI Model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/API Endpoint/i)).toBeInTheDocument();
    });
    
    it('should close settings panel when Escape key is pressed', () => {
      // Mock onClose callback
      const mockOnClose = jest.fn();
      
      // Render component with no unsaved changes
      renderWithProviders(
        <AISettings isVisible={true} onClose={mockOnClose} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Verify onClose was called
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    it('should follow ARIA best practices for modal dialogs', () => {
      // Render component
      const { container } = renderWithProviders(
        <AISettings isVisible={true} />,
        { preloadedState: { ai: defaultAIState } }
      );
      
      // Check container for proper modal dialog role
      const settingsContainer = container.firstChild;
      expect(settingsContainer).toHaveAttribute('role', 'dialog');
      expect(settingsContainer).toHaveAttribute('aria-labelledby', expect.any(String));
      
      // Ensure focus is trapped within the dialog
      const firstFocusableElement = screen.getByRole('switch', { name: /AI Features/i });
      const lastFocusableElement = screen.getByText('Save Changes');
      
      // Focus should move from last to first element when Shift+Tab is pressed at the beginning
      firstFocusableElement.focus();
      fireEvent.keyDown(firstFocusableElement, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastFocusableElement);
      
      // Focus should move from last to first element when Tab is pressed at the end
      lastFocusableElement.focus();
      fireEvent.keyDown(lastFocusableElement, { key: 'Tab' });
      expect(document.activeElement).toBe(firstFocusableElement);
    });
  });
});
