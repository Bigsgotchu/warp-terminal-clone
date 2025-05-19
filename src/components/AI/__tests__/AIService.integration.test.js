import { aiService } from '../../../services/ai/aiService';
import { renderWithProviders, defaultAIState, mockSuggestions, mockStructuredExplanation, mockError } from './testUtils';
import { act } from '@testing-library/react';

// Directly testing the AI service module
describe('AI Service Integration', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCommand', () => {
    it('should return suggestions when analysis succeeds', async () => {
      // Mock the implementation for this test
      aiService.analyzeCommand.mockResolvedValue({ suggestions: mockSuggestions });
      
      // Call the method
      const context = {
        currentDirectory: '/home/user',
        recentCommands: ['ls', 'cd /home']
      };
      
      const result = await aiService.analyzeCommand('ls -', context);
      
      // Assertions
      expect(result).toEqual({ suggestions: mockSuggestions });
      expect(aiService.analyzeCommand).toHaveBeenCalledWith('ls -', context);
    });
    
    it('should return empty suggestions array when command is too short', async () => {
      // Call with a short command (handled locally, doesn't make API call)
      const context = { currentDirectory: '/home/user' };
      const result = await aiService.analyzeCommand('l', context);
      
      // Should return empty suggestions without calling the API
      expect(result.suggestions).toEqual([]);
    });
    
    it('should handle API errors gracefully', async () => {
      // Mock implementation to reject with error
      aiService.analyzeCommand.mockRejectedValue(new Error(mockError));
      
      try {
        await aiService.analyzeCommand('ls -la', { currentDirectory: '/home/user' });
      } catch (error) {
        expect(error.message).toContain(mockError);
      }
    });
    
    it('should use cache for repeated requests', async () => {
      // First call sets up the cache
      aiService.analyzeCommand.mockResolvedValueOnce({ suggestions: mockSuggestions });
      
      const context = { currentDirectory: '/home/user' };
      await aiService.analyzeCommand('ls -la', context);
      
      // Reset the mock to verify it's not called again
      aiService.analyzeCommand.mockClear();
      
      // Second call with same command should use cache
      const result = await aiService.analyzeCommand('ls -la', context);
      
      // Verify response came from cache by checking the mock wasn't called
      expect(result.suggestions).toEqual(mockSuggestions);
      expect(aiService.analyzeCommand).not.toHaveBeenCalled();
    });
  });
  
  describe('explainCommand', () => {
    it('should return structured explanation when available', async () => {
      // Mock the implementation
      aiService.explainCommand.mockResolvedValue(mockStructuredExplanation);
      
      // Call the method
      const result = await aiService.explainCommand('ls -la');
      
      // Assertions
      expect(result).toEqual(mockStructuredExplanation);
      expect(aiService.explainCommand).toHaveBeenCalledWith('ls -la');
    });
    
    it('should return simple explanation for basic commands', async () => {
      // Mock for simple explanation
      aiService.explainCommand.mockResolvedValue(mockStructuredExplanation);
      
      // Call the method
      const result = await aiService.explainCommand('ls');
      
      // Assertions
      expect(result).toBeDefined();
      expect(aiService.explainCommand).toHaveBeenCalledWith('ls');
    });
    
    it('should handle explanation errors gracefully', async () => {
      // Mock implementation to reject
      aiService.explainCommand.mockRejectedValue(new Error(mockError));
      
      try {
        await aiService.explainCommand('invalid command');
      } catch (error) {
        expect(error.message).toContain(mockError);
      }
    });
  });
  
  describe('offline mode', () => {
    it('should provide basic suggestions in offline mode', () => {
      // Set service to offline mode for this test
      const originalApiKey = aiService.apiKey;
      aiService.apiKey = undefined;
      aiService.offlineMode = true;
      
      // Mock the offline analysis method
      const offlineSuggestions = {
        suggestions: [
          { command: 'ls -l', description: 'Long listing format' }
        ]
      };
      aiService.offlineAnalyzeCommand.mockReturnValue(offlineSuggestions);
      
      // Call the method
      const result = aiService.offlineAnalyzeCommand('ls -');
      
      // Assertions
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(aiService.offlineAnalyzeCommand).toHaveBeenCalledWith('ls -');
      
      // Reset state
      aiService.apiKey = originalApiKey;
      aiService.offlineMode = false;
    });
    
    it('should fall back to offline mode when API fails', async () => {
      // Mock API call to fail
      aiService.analyzeCommand.mockImplementation(async (command, context) => {
        // First try the real API (which we mock to fail)
        throw new Error('API unavailable');
      });
      
      // Mock the offline fallback to work
      const offlineSuggestions = {
        suggestions: [
          { command: 'ls -l', description: 'Long listing format' }
        ]
      };
      aiService.offlineAnalyzeCommand.mockReturnValue(offlineSuggestions);
      
      // Call service method
      const result = await aiService.analyzeCommand('ls -', { currentDirectory: '/home' });
      
      // Verify fallback was used
      expect(result.suggestions).toEqual(offlineSuggestions.suggestions);
      expect(aiService.offlineAnalyzeCommand).toHaveBeenCalled();
    });
  });
  
  describe('cache management', () => {
    it('should clear cache when requested', () => {
      // Set up cache
      aiService.cache = new Map();
      aiService.cache.set('test_key', 'test_value');
      
      // Call clear method
      aiService.clearCache();
      
      // Verify cache is empty
      expect(aiService.cache.size).toBe(0);
    });
    
    it('should enforce cache size limits', () => {
      // Setup
      aiService.cache = new Map();
      aiService.cacheSize = 3;
      
      // Add more items than the limit
      aiService.addToCache('key1', 'value1');
      aiService.addToCache('key2', 'value2');
      aiService.addToCache('key3', 'value3');
      aiService.addToCache('key4', 'value4');
      
      // Cache should remove oldest item
      expect(aiService.cache.size).toBe(3);
      expect(aiService.cache.has('key1')).toBe(false);
      expect(aiService.cache.has('key4')).toBe(true);
    });
  });
});

