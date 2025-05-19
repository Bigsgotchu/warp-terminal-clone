/**
 * CommandPatternAnalyzer.test.js
 * Test suite for the CommandPatternAnalyzer service
 */

import CommandPatternAnalyzer from '../CommandPatternAnalyzer';

describe('CommandPatternAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    // Create a new analyzer with specified shell type for each test
    analyzer = new CommandPatternAnalyzer('bash');
  });

  describe('Basic pattern detection', () => {
    test('should detect repeated commands', () => {
      const commandHistory = [
        'git status',
        'ls -la',
        'git status',
        'cd src',
        'git status'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we detected the repeated git status command
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => 
        p.pattern === 'Repeated Command' && 
        p.suggestion === 'git status'
      )).toBe(true);
    });

    test('should suggest alias for frequently used commands', () => {
      const commandHistory = [
        'docker-compose up -d',
        'cd src',
        'docker-compose up -d',
        'ls',
        'docker-compose up -d',
        'grep pattern file.txt',
        'docker-compose up -d'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we have a create alias suggestion
      expect(patterns.some(p => 
        p.pattern === 'Create Alias' && 
        p.suggestion.startsWith('alias') && 
        p.suggestion.includes('docker-compose up -d')
      )).toBe(true);
    });
  });

  describe('Command optimization suggestions', () => {
    test('should suggest optimizations for inefficient commands', () => {
      const commandHistory = [
        'cat file.txt | grep pattern',
        'ls -la'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we detected the useless use of cat
      expect(patterns.some(p => 
        p.pattern === 'Command Optimization' && 
        p.suggestion.includes('grep pattern file.txt')
      )).toBe(true);
    });

    test('should suggest optimization for find and xargs', () => {
      const commandHistory = [
        'find . -name "*.js" | xargs grep "console.log"',
        'ls'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we suggested using find with exec
      expect(patterns.some(p => 
        p.pattern === 'Command Optimization' && 
        p.suggestion.includes('-exec') &&
        p.description.includes('instead of piping to xargs')
      )).toBe(true);
    });
  });

  describe('Git workflow detection', () => {
    test('should detect git feature branch workflow', () => {
      const commandHistory = [
        'git checkout -b feature/new-feature',
        'git status',
        'git add .',
        'git commit -m "Add new feature"',
        'git push origin feature/new-feature'
      ];

      // Create a context that indicates we're in a git repository
      const context = {
        recentCommands: commandHistory
      };

      const patterns = analyzer.analyzePatterns(commandHistory, context);
      
      // Check that we detected a git workflow
      expect(patterns.some(p => 
        p.description && p.description.includes('Git') && 
        p.suggestion && (
          p.suggestion.includes('git push --set-upstream') || 
          p.suggestion.includes('git flow')
        )
      )).toBe(true);
    });

    test('should detect git pull request preparation', () => {
      const commandHistory = [
        'git checkout main',
        'git pull',
        'git checkout feature/branch',
        'git rebase main'
      ];

      // Create a context that indicates we're in a git repository
      const context = {
        recentCommands: commandHistory
      };

      const patterns = analyzer.analyzePatterns(commandHistory, context);
      
      // Should detect git workflow with appropriate suggestions
      expect(patterns.some(p => 
        p.description && p.description.includes('Git') &&
        p.suggestion
      )).toBe(true);
    });
  });

  describe('Shell-specific pattern detection', () => {
    test('should detect bash-specific patterns', () => {
      // Create analyzer with bash shell type
      const bashAnalyzer = new CommandPatternAnalyzer('bash');
      
      const commandHistory = [
        'for i in $(seq 1 10); do echo $i; done',
        'history',
        'grep pattern file.txt'
      ];

      const patterns = bashAnalyzer.analyzePatterns(commandHistory);
      
      // Check for bash-specific suggestions
      expect(patterns.some(p => 
        (p.suggestion && p.suggestion.includes('{1..10}')) || 
        (p.description && p.description.includes('Bash'))
      )).toBe(true);
    });

    test('should detect fish-specific patterns', () => {
      // Create analyzer with fish shell type
      const fishAnalyzer = new CommandPatternAnalyzer('fish');
      
      const commandHistory = [
        'history',
        'function sayHello; echo "Hello"; end',
        'abbr'
      ];

      const patterns = fishAnalyzer.analyzePatterns(commandHistory);
      
      // Check for fish-specific suggestions
      expect(patterns.some(p => 
        (p.suggestion && p.suggestion.includes('funcsave')) || 
        (p.description && p.description.includes('fish'))
      )).toBe(true);
    });
  });

  describe('Sequential command patterns', () => {
    test('should detect cd and ls sequence', () => {
      const commandHistory = [
        'cd /path/to/dir',
        'ls -la'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we detected the cd+ls pattern
      expect(patterns.some(p => 
        p.pattern === 'Sequential Commands' && 
        p.suggestion === 'ls' &&
        p.description.includes('List files')
      )).toBe(true);
    });

    test('should detect mkdir and cd sequence', () => {
      const commandHistory = [
        'mkdir new-project',
        'cd new-project'
      ];

      const patterns = analyzer.analyzePatterns(commandHistory);
      
      // Check that we detected the mkdir+cd pattern
      expect(patterns.some(p => 
        p.pattern === 'Sequential Commands' && 
        p.suggestion.includes('cd') &&
        p.description.includes('directory you just created')
      )).toBe(true);
    });
  });
});

