import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import aiReducer from '../../../features/ai/aiSlice';
import terminalReducer from '../../../features/terminalSlice';

// Mock aiService
jest.mock('../../../services/ai/aiService', () => ({
  analyzeCommand: jest.fn(),
  explainCommand: jest.fn(),
  analyzeCommandPatterns: jest.fn(),
  clearCache: jest.fn(),
  getCacheStats: jest.fn(),
  getOfflineExplanation: jest.fn(),
  offlineAnalyzeCommand: jest.fn()
}));

// Default mock responses
export const mockSuggestions = [
  { command: 'ls -la', description: 'List all files with details' },
  { command: 'ls -lh', description: 'List with human readable sizes' },
  { command: 'ls --color', description: 'List with colorized output' }
];

export const mockSimpleExplanation = 
  'The ls command lists directory contents. Options like -l show detailed views and -a shows hidden files.';

export const mockStructuredExplanation = {
  command: 'ls -la',
  purpose: 'List all files and directories including hidden ones in long listing format',
  options: {
    '-l': 'Use long listing format',
    '-a': 'Show hidden files (those starting with .)'
  },
  examples: [
    { command: 'ls -l', description: 'Long listing format without hidden files' },
    { command: 'ls -la /etc', description: 'List all files in /etc directory' }
  ]
};

export const mockCommandPatterns = {
  patterns: [
    {
      pattern: 'Directory Navigation',
      suggestion: 'ls -la',
      description: 'List all files after changing directory'
    }
  ]
};

export const mockError = 'Failed to connect to AI service';

// Custom render function that includes Redux provider
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        ai: aiReducer,
        terminal: terminalReducer
      },
      preloadedState
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }
  
  // Return rendered UI along with utility functions and store
  return {
    store,
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// Default AI state for testing
export const defaultAIState = {
  suggestions: [],
  activeSuggestionIndex: -1,
  commandExplanation: null,
  commandPatterns: [],
  isAnalyzing: false,
  isExplaining: false,
  isAnalyzingPatterns: false,
  error: null,
  context: {
    recentCommands: ['ls', 'cd /home', 'cat file.txt'],
    currentDirectory: '/home/user',
    lastOutput: 'test output',
    lastError: null,
    environment: {},
    commandHistory: []
  },
  settings: {
    enabled: true,
    suggestionThreshold: 2,
    maxSuggestions: 5,
    showExplanations: true,
    apiModel: 'gpt-3.5-turbo',
    contextDepth: 5,
    offlineMode: false,
    apiEndpoint: 'https://api.openai.com/v1/chat/completions'
  }
};

// Default terminal state for testing
export const defaultTerminalState = {
  activeTab: 'tab1',
  tabs: {
    tab1: {
      id: 'tab1',
      title: 'Terminal',
      currentDirectory: '/home/user',
      isProcessing: false,
      output: [],
      history: ['ls', 'cd /home', 'cat file.txt'],
      currentHistoryIndex: -1
    }
  }
};

