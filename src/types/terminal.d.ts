/**
 * TypeScript definitions for the terminal state and related entities
 */

// Terminal output item
export interface TerminalOutputItem {
  content: string;
  type: 'stdout' | 'stderr' | 'command';
  timestamp: string;
}

// Command history item
export interface CommandHistoryItem {
  command: string;
  timestamp: string;
}

// Terminal tab
export interface TerminalTab {
  id: string;
  title: string;
  currentDirectory: string;
  commands: CommandHistoryItem[];
  history: string[];
  historyIndex: number;
  output: TerminalOutputItem[];
  isProcessing: boolean;
  error: string | null;
}

// Terminal state
export interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string;
  theme: 'dark' | 'light';
  fontSize: number;
  loadingTerminal: boolean;
}

// Command execution result
export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
  error?: string;
}

// Command execution response
export interface CommandExecutionResponse {
  command: string;
  result: CommandResult;
  timestamp: string;
  error?: string;
}

// Action payloads
export interface AddOutputPayload {
  tabId?: string;
  output: string;
  type?: 'stdout' | 'stderr' | 'command';
}

export interface SetCurrentDirectoryPayload {
  tabId?: string;
  directory: string;
}

export interface SetProcessingPayload {
  tabId?: string;
  isProcessing: boolean;
}

export interface RenameTabPayload {
  tabId: string;
  title: string;
}

