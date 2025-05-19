import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Terminal from '../Terminal';
import aiReducer from '../../../features/ai/aiSlice';
import terminalReducer from '../../../features/terminalSlice';

// Mock the aiService to avoid actual API calls
jest.mock('../../../services/ai/aiService', () => ({
  aiService: {
    analyzeCommand: jest.fn().mockResolvedValue({
      suggestions: [
        { command: 'git status', description: 'Show the working tree status' },
        { command: 'git add .', description: 'Add all changes to staging area' },
        { command: 'git commit -m "message"', description: 'Commit staged changes' }
      ]
    }),
    explainCommand: jest.fn().mockResolvedValue({
      command: 'git status',
      purpose: 'Shows the status of files in the working directory and staging area',
      options: {
        '-s': 'Give output in short format',
        '-b': 'Show branch information'
      },
      examples: [
        { command: 'git status -s', description: 'Show status in short format' }
      ]
    }),
    analyzeCommandPatterns: jest.fn().mockResolvedValue({
      patterns: [
        { suggestion: 'git commit -m "fix: update readme"', description: 'Commit changes with conventional commit format' }
      ]
    })
  }
}));

// Import the mocked service to control it
import { aiService } from '../../../services/ai/aiService';

/**
 * End-to-end tests for the AI-powered terminal workflow
 */
describe('Terminal E2E Tests', () => {
  let store;
  
  // Set up the Redux store with real reducers before each test
  beforeEach(() => {
    // Create a store with both AI and terminal reducers
    store = configureStore({
      reducer: {
        ai: aiReducer,
        terminal: terminalReducer
      },
      // Preload with initial state
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
        },
        terminal: {
          activeTabId: 'tab1',
          tabs: [{
            id: 'tab1',
            title: 'Terminal',
            currentDirectory: '~',
            output: [],
            history: [],
            historyIndex: -1,
            isProcessing: false
          }]
        }
      }
    });
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  // 1. Test complete user interaction flows
  describe('User Interaction Flows', () => {
    it('completes a full command cycle with AI suggestions', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      // Find the command input
      const commandInput = screen.getByRole('textbox');
      
      // Step 1: User types a command prefix
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Step 2: AI service should be called to analyze the command
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalledWith(
          'git',
          expect.any(Object)
        );
      });
      
      // Step 3: User navigates suggestions with Tab key
      fireEvent.keyDown(commandInput, { key: 'Tab' });
      
      // Step 4: User executes the selected suggestion
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Step 5: Verify the command was executed and added to output
      expect(screen.getByText(/git status/i)).toBeInTheDocument();
      
      // Step 6: Verify command explanation was requested
      await waitFor(() => {
        expect(aiService.explainCommand).toHaveBeenCalledWith('git status');
      });
    });
    
    it('handles manual command typing and execution', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Type a complete command manually
      fireEvent.change(commandInput, { target: { value: 'echo "Hello AI"' } });
      
      // Execute the command
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Verify command was executed
      expect(screen.getByText(/echo "Hello AI"/i)).toBeInTheDocument();
      
      // Verify AI context was updated with the command
      await waitFor(() => {
        const state = store.getState();
        expect(state.ai.context.recentCommands[0]).toBe('echo "Hello AI"');
      });
    });
  });
  
  // 2. Test AI feature integration
  describe('AI Feature Integration', () => {
    it('provides command suggestions as user types', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Type command prefix
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'gi' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Verify AI suggestions are shown
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalled();
        expect(store.getState().ai.suggestions.length).toBeGreaterThan(0);
      });
    });
    
    it('shows command explanations after execution', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Execute a command that should trigger explanation
      fireEvent.change(commandInput, { target: { value: 'git status' } });
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Verify explanation was requested
      await waitFor(() => {
        expect(aiService.explainCommand).toHaveBeenCalledWith('git status');
      });
      
      // Verify explanation appears in the UI
      await waitFor(() => {
        const state = store.getState();
        expect(state.ai.commandExplanation).not.toBeNull();
      });
    });
    
    it('toggles AI features on and off', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // First test with AI enabled
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      expect(aiService.analyzeCommand).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Disable AI
      store.dispatch({ type: 'ai/toggleAI' });
      
      // Test again with AI disabled
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // AI should not be called when disabled
      expect(aiService.analyzeCommand).not.toHaveBeenCalled();
    });
  });
  
  // 3. Test command history and context
  describe('Command History and Context', () => {
    it('maintains command history between executions', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Execute multiple commands
      await act(async () => {
        // First command
        fireEvent.change(commandInput, { target: { value: 'cd documents' } });
        fireEvent.keyDown(commandInput, { key: 'Enter' });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Second command
        fireEvent.change(commandInput, { target: { value: 'ls -la' } });
        fireEvent.keyDown(commandInput, { key: 'Enter' });
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Navigate history with arrow keys
      fireEvent.keyDown(commandInput, { key: 'ArrowUp' });
      
      // Input should now contain the last command
      expect(commandInput.value).toBe('ls -la');
      
      // Navigate further back
      fireEvent.keyDown(commandInput, { key: 'ArrowUp' });
      
      // Input should now contain the first command
      expect(commandInput.value).toBe('cd documents');
    });
    
    it('uses command history for more relevant suggestions', async () => {
      // Set up command history
      store.dispatch({
        type: 'ai/updateContext',
        payload: { 
          recentCommands: ['git status', 'git add .']
        }
      });
      
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Type command prefix
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Verify context is passed to AI service
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalledWith(
          'git',
          expect.objectContaining({
            recentCommands: expect.arrayContaining(['git status', 'git add .'])
          })
        );
      });
    });
    
    it('updates context when directory changes', async () => {
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Execute cd command
      fireEvent.change(commandInput, { target: { value: 'cd projects' } });
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Verify directory is updated
      await waitFor(() => {
        const state = store.getState();
        expect(state.ai.context.currentDirectory).toBe('~/projects');
      });
      
      // Type a command to trigger AI with new context
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Verify new context is used
      await waitFor(() => {
        expect(aiService.analyzeCommand).toHaveBeenCalledWith(
          'git',
          expect.objectContaining({
            currentDirectory: '~/projects'
          })
        );
      });
    });
  });
  
  // 4. Test error recovery scenarios
  describe('Error Recovery', () => {
    it('continues to function when AI service fails', async () => {
      // Make AI service throw an error
      aiService.analyzeCommand.mockRejectedValueOnce(new Error('API unavailable'));
      
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Type a command to trigger AI
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Verify error is handled
      await waitFor(() => {
        const state = store.getState();
        expect(state.ai.error).not.toBeNull();
      });
      
      // Execute a command to ensure terminal still works
      fireEvent.change(commandInput, { target: { value: 'echo test' } });
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Verify command was executed despite AI failure
      expect(screen.getByText(/echo test/i)).toBeInTheDocument();
    });
    
    it('falls back to basic functionality when AI is disabled', async () => {
      // Disable AI
      store.dispatch({ type: 'ai/toggleAI' });
      
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Type a command
      fireEvent.change(commandInput, { target: { value: 'echo "AI is off"' } });
      
      // AI service should not be called
      expect(aiService.analyzeCommand).not.toHaveBeenCalled();
      
      // Execute command
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Command should still execute
      expect(screen.getByText(/echo "AI is off"/i)).toBeInTheDocument();
      
      // Basic history should still work
      fireEvent.keyDown(commandInput, { key: 'ArrowUp' });
      expect(commandInput.value).toBe('echo "AI is off"');
    });
    
    it('recovers when re-enabling AI after disabling it', async () => {
      // Start with AI disabled
      store.dispatch({ type: 'ai/toggleAI' });
      
      render(
        <Provider store={store}>
          <Terminal />
        </Provider>
      );
      
      const commandInput = screen.getByRole('textbox');
      
      // Execute a command with AI off
      fireEvent.change(commandInput, { target: { value: 'echo test' } });
      fireEvent.keyDown(commandInput, { key: 'Enter' });
      
      // Verify AI service was not called
      expect(aiService.analyzeCommand).not.toHaveBeenCalled();
      
      // Re-enable AI
      store.dispatch({ type: 'ai/toggleAI' });
      
      // Type a command to trigger AI
      await act(async () => {
        fireEvent.change(commandInput, { target: { value: 'git' } });
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Verify AI service is

