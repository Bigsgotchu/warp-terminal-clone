import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Tabs, Button, Modal, Layout, Spin, notification, Tooltip } from 'antd';
import { 
  SearchOutlined, 
  SettingOutlined, 
  PlusOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import {
  clearError,
  selectActiveTab,
  selectTabs,
  setProcessing,
  setCurrentDirectory,
  addOutput,
  clearOutput,
  executeCommand,
  historyUp,
  historyDown,
  selectCurrentHistoryCommand
} from '../../features/terminalSlice';
import {
  analyzeCommandPatterns,
  updateTabContext,
  createTabContext,
  setActiveTabContext,
  selectActiveTabContext
} from '../../features/terminal/tabContextSlice';
import TitleBar from '../TitleBar/TitleBar';
import TabManager from '../TabManager/TabManager';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import CommandStats from '../AI/CommandStats';
import ContextVisualizer from '../AI/ContextVisualizer';
import CommandInput from './CommandInput';
import TerminalOutput from './TerminalOutput';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

const { Content } = Layout;

const Terminal = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const allTabs = useSelector(selectTabs);
  const activeContext = useSelector(selectActiveTabContext);
  
  const terminalRef = useRef(null);
  const terminalInstancesRef = useRef({});
  const outputRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ cols: 80, rows: 24 });
  const [isTermReady, setIsTermReady] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  
  // Phase 2 state
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const [isContextVisible, setIsContextVisible] = useState(false);
  
  // Toggle handlers for Phase 2 features
  const handleToggleStats = useCallback(() => {
    setIsStatsVisible(prev => !prev);
  }, []);

  const handleToggleContext = useCallback(() => {
    setIsContextVisible(prev => !prev);
  }, []);

  // Initialize terminal when component mounts
  useEffect(() => {
    // Simulate loading process for better UX
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    if (!window.terminal) {
      console.error('Terminal API not available');
      notification.error({
        message: 'Terminal Error',
        description: 'Terminal API not available. The application may not function correctly.',
        duration: 0
      });
      return () => clearTimeout(loadingTimer);
    }

    // Set up terminal instances for each tab
    const initTerminal = (tabId) => {
      // Skip if terminal already exists for this tab
      if (terminalInstancesRef.current[tabId]) {
        return terminalInstancesRef.current[tabId];
      }

      // Create new terminal instance
      const term = new XTerm({
        cursorBlink: true,
        fontFamily: 'monospace',
        fontSize: 14,
        theme: {
          background: '#1e1e1e',
          foreground: '#f0f0f0',
          cursor: '#f0f0f0',
          selectionBackground: '#3b3f45'
        },
        allowTransparency: true,
        scrollback: 10000,
        cols: dimensions.cols,
        rows: dimensions.rows
      });

      // Add terminal addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();
      const unicode11Addon = new Unicode11Addon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(unicode11Addon);

      // Store terminal instance with its addons
      terminalInstancesRef.current[tabId] = {
        term,
        fitAddon,
        searchAddon
      };

      return terminalInstancesRef.current[tabId];
    };

    // Set up terminal data listener
    const handleTerminalData = (data) => {
      const { id, data: termData, type } = data;
      const termInstance = terminalInstancesRef.current[id];
      
      if (termInstance && termInstance.term) {
        if (type === 'output') {
          // Write output data to terminal
          termInstance.term.write(termData);
          
          // Add to terminal output for scrollback history
          dispatch(addOutput({
            output: termData,
            type: 'stdout'
          }));
          
          // Update tab context with command output
          dispatch(updateTabContext({
            tabId: id,
            updates: {
              commandOutput: {
                command: lastCommand,
                output: termData,
                exitCode: 0
              }
            }
          }));
        } else if (type === 'error') {
          // Handle errors
          termInstance.term.write(`\x1b[31m${termData}\x1b[0m\r\n`);
          
          dispatch(addOutput({
            output: termData,
            type: 'stderr'
          }));
          
          // Update tab context with error
          dispatch(updateTabContext({
            tabId: id,
            updates: {
              error: termData,
              commandOutput: {
                command: lastCommand,
                error: termData,
                exitCode: 1
              }
            }
          }));
        } else if (type === 'exit') {
          // Process has exited
          dispatch(setProcessing({ isProcessing: false }));
          
          // Track exit code for better error handling
          if (termData && termData !== '0') {
            dispatch(addOutput({
              output: `Process exited with code ${termData}`,
              type: 'stderr'
            }));
            
            // Update tab context with exit code
            dispatch(updateTabContext({
              tabId: id,
              updates: {
                lastExitCode: termData
              }
            }));
          }
        } else if (type === 'cwd') {
          // Current directory changed
          dispatch(setCurrentDirectory({ directory: termData }));
          
          // Update tab context with new directory
          dispatch(updateTabContext({
            tabId: id,
            updates: { currentDirectory: termData }
          }));
        }
      }
    };

    // Initialize terminal for active tab
    if (activeTab) {
      const terminalInstance = initTerminal(activeTab.id);
      
      if (terminalRef.current && terminalInstance && !terminalInstance.isAttached) {
        // Attach terminal to DOM
        terminalInstance.term.open(terminalRef.current);
        terminalInstance.isAttached = true;
        
        // Create tab context if it doesn't exist yet
        dispatch(createTabContext({ 
          tabId: activeTab.id,
          initialContext: {
            currentDirectory: activeTab.currentDirectory || '~',
            metadata: { name: activeTab.title }
          }
        }));
        
        // Set active context
        dispatch(setActiveTabContext({ tabId: activeTab.id }));
        
        // Resize terminal to fit container
        setTimeout(() => {
          terminalInstance.fitAddon.fit();
          setIsTermReady(true);
          
          // Get actual dimensions after fitting
          const newDimensions = {
            cols: terminalInstance.term.cols,
            rows: terminalInstance.term.rows
          };
          setDimensions(newDimensions);
          
          // Notify shell of terminal size
          if (window.terminal) {
            window.terminal.resize(activeTab.id, newDimensions.cols, newDimensions.rows);
          }
        }, 100);
        
        // Set up data event listeners
        if (window.terminal) {
          window.terminal.onData(handleTerminalData);
        }
      }
    }
    
    // Set up resize handler
    const handleResize = () => {
      if (activeTab && terminalInstancesRef.current[activeTab.id]) {
        const instance = terminalInstancesRef.current[activeTab.id];
        
        // Resize terminal with a small delay to ensure container has resized
        setTimeout(() => {
          instance.fitAddon.fit();
          
          // Update dimensions
          const newDimensions = {
            cols: instance.term.cols,
            rows: instance.term.rows
          };
          
          // Only update if dimensions actually changed
          if (newDimensions.cols !== dimensions.cols || newDimensions.rows !== dimensions.rows) {
            setDimensions(newDimensions);
            
            // Notify shell of new terminal size
            if (window.terminal) {
              window.terminal.resize(activeTab.id, newDimensions.cols, newDimensions.rows);
            }
          }
        }, 50);
      }
    };
    
    // Add resize event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      clearTimeout(loadingTimer);
      window.removeEventListener('resize', handleResize);
      
      // Clean up terminal instances and event listeners
      if (window.terminal) {
        window.terminal.offData(handleTerminalData);
      }
      
      // Dispose terminal instances on unmount
      Object.values(terminalInstancesRef.current).forEach(instance => {
        if (instance && instance.term) {
          instance.term.dispose();
        }
      });
    };
  }, [activeTab, dimensions, dispatch, lastCommand]);
  
  // Effect to handle tab switching for context
  useEffect(() => {
    if (activeTab) {
      dispatch(setActiveTabContext({ tabId: activeTab.id }));
    }
  }, [activeTab?.id, dispatch]);
  
  // Add keyboard shortcut handlers for Phase 2 features
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Alt+S to toggle stats
      if (e.ctrlKey && e.altKey && e.key === 's') {
        e.preventDefault();
        setIsStatsVisible(prev => !prev);
      }
      
      // Ctrl+Alt+C to toggle context visualizer
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        setIsContextVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Function to update current directory based on cd command
  const updateCurrentDirectory = (dirArg) => {
    if (!activeTab) return;
    
    let newDir = activeTab.currentDirectory;
    
    // Handle special directories and paths
    if (dirArg === '~' || dirArg === '') {
      newDir = window.system?.os?.homeDir || '~';
    } else if (dirArg.startsWith('/')) {
      // Absolute path
      newDir = dirArg;
    } else if (dirArg === '..') {
      // Go up one directory
      const parts = newDir.split('/');
      if (parts.length > 1) {
        parts.pop();
        newDir = parts.join('/') || '/';
      }
    } else {
      // Relative path
      newDir = `${newDir === '/' ? '' : newDir}/${dirArg}`;
    }
    
    // Clean up path by resolving . and .. in the middle of paths
    newDir = newDir.replace(/\/\.\//g, '/'); // Remove /./ segments
    
    // Dispatch action to update current directory
    dispatch(setCurrentDirectory({ directory: newDir }));
    
    // Update tab context with new directory
    dispatch(updateTabContext({
      tabId: activeTab.id,
      updates: { currentDirectory: newDir }
    }));
  };

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
    
    // Also scroll the XTerm instance
    if (activeTab && terminalInstancesRef.current[activeTab.id]?.term) {
      terminalInstancesRef.current[activeTab.id].term.scrollToBottom();
    }
  }, [terminalOutput, activeTab]);
  
  // Clear error notification when error is fixed
  useEffect(() => {
    if (activeTab?.error) {
      // Show error notification for terminal errors
      notification.error({
        message: 'Terminal Error',
        description: activeTab.error,
        duration: 5,
        key: 'terminal-error'
      });
    } else {
      // Close error notification when fixed
      notification.close('terminal-error');
    }
  }, [activeTab?.error]);

  // Handle command execution
  const handleExecuteCommand = async (command) => {
    try {
      // Store last command for directory tracking
      setLastCommand(command);
      
      // Add to command history
      setCommandHistory(prev => [command, ...prev].slice(0, 50));
      
      // Update tab context with command
      if (activeTab) {
        dispatch(updateTabContext({
          tabId: activeTab.id,
          updates: { command }
        }));
      }
      
      // Handle built-in commands
      if (command.trim() === 'clear' || command.trim() === 'cls') {
        dispatch(clearOutput());
        return;
      }
      
      // Handle error commands for testing
      if (command.trim() === 'test:error') {
        dispatch(addOutput({
          output: 'Simulated error for testing purposes',
          type: 'stderr'
        }));
        return;
      }

      // Add command to output immediately for better UX
      dispatch(addOutput({
        output: `${activeTab?.currentDirectory || '~'}$ ${command}`,
        type: 'command'
      }));
      
      // Execute the command via the executeCommand thunk
      dispatch(executeCommand(command))
        .unwrap()
        .catch(error => {
          console.error('Command execution error:', error);
          const errorMessage = `Error executing command: ${error.message || 'Unknown error'}`;
          
          dispatch(addOutput({
            output: errorMessage,
            type: 'stderr'
          }));
          
          // Update tab context with error
          if (activeTab) {
            dispatch(updateTabContext({
              tabId: activeTab.id,
              updates: {
                error: errorMessage,
                commandOutput: {
                  command,
                  error: errorMessage,
                  exitCode: 1
                }
              }
            }));
          }
        });
    } catch (error) {
      console.error('Terminal command error:', error);
      const errorMessage = `Terminal error: ${error.message || 'Unknown error'}`;
      
      dispatch(addOutput({
        output: errorMessage,
        type: 'stderr'
      }));
      
      // Update tab context with error
      if (activeTab) {
        dispatch(updateTabContext({
          tabId: activeTab.id,
          updates: {
            error: errorMessage,
            commandOutput: {
              command: lastCommand,
              error: errorMessage,
              exitCode: 1
            }
          }
        }));
      }
    }
  };
  
  // Handle command history navigation
  const handleHistoryUp = () => {
    dispatch(historyUp());
  };
  
  const handleHistoryDown = () => {
    dispatch(historyDown());
  };

  // Apply theme class based on current theme
  const themeClass = activeTab ? `theme-${activeTab.theme || 'dark'}` : 'theme-dark';

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="loading-screen">
        <h1>Initializing Warp Terminal Clone...</h1>
        <Spin size="large" className="loading-spinner" />
        <p>Setting up terminal environment...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout className={`terminal-container ${themeClass}`}>
        <TitleBar 
          onToggleStats={handleToggleStats}
          onToggleContext={handleToggleContext}
          isStatsVisible={isStatsVisible}
          isContextVisible={isContextVisible}
        />
        <TabManager />
        <Content className="terminal-content">
          <div ref={terminalRef} className="xterm-container" style={{ display: isTermReady ? 'block' : 'none' }} />
          {activeTab?.error && (
            <div className="terminal-error-banner">
              <ExclamationCircleOutlined /> {activeTab.error}
              <Button 
                type="text" 
                size="small" 
                className="clear-error-button"
                onClick={() => dispatch(clearError())}
              >
                Dismiss
              </Button>
            </div>
          )}
          <div ref={outputRef} className="terminal-output-container">
            <TerminalOutput output={terminalOutput} />
          </div>
          <CommandInput 
            onExecuteCommand={handleExecuteCommand}
            onHistoryUp={handleHistoryUp}
            onHistoryDown={handleHistoryDown}
            isProcessing={activeTab?.isProcessing || false}
            currentDirectory={activeTab?.currentDirectory || '~'}
            commandHistory={commandHistory}
          />
          
          {/* Phase 2 Feature Components */}
          <CommandStats
            isVisible={isStatsVisible}
            onClose={handleToggleStats}
          />
          
          <ContextVisualizer
            isVisible={isContextVisible}
            onClose={handleToggleContext}
          />
        </Content>
      </Layout>
    </ErrorBoundary>
  );
};

export default Terminal;

