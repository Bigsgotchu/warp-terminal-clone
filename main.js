const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const Store = require('electron-store');
const pty = require('node-pty');

// Initialize store for window bounds persistence
const store = new Store();

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Detect development mode
const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Debug logging utility
const logDebug = (category, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
  if (data) console.log(data);
};

// Define the shell executable based on the OS
const getShellExecutable = () => {
  const platform = process.platform;
  if (platform === 'win32') {
    return 'powershell.exe';
  } else if (platform === 'darwin') {
    return '/bin/zsh';
  } else {
    // Default to fish shell on Linux as per requirement
    return '/usr/bin/fish';
  }
};

// Keep track of all terminal sessions
const terminals = {};

// Create a new terminal session
function createTerminalSession(id) {
  logDebug('Terminal', `Creating new terminal session with ID: ${id}`);
  
  const shell = getShellExecutable();
  const env = Object.assign({}, process.env);
  
  // Set UTF-8 encoding and xterm-256color terminal type
  env.LANG = env.LANG || 'en_US.UTF-8';
  env.TERM = 'xterm-256color';
  
  // Create the pty process
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
    env: env
  });
  
  // Store the terminal session
  terminals[id] = {
    pty: ptyProcess,
    created: new Date().toISOString()
  };
  
  // Return the created session ID
  return id;
}

function createWindow() {
  // Get stored window bounds or use defaults
  const defaultBounds = {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined
  };
  const bounds = store.get('windowBounds', defaultBounds);
  
  // Ensure window is on screen
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Create the browser window with enhanced visibility settings
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#282c34',
    center: !bounds.x && !bounds.y, // Center only if no position stored
    alwaysOnTop: true, // Keep window visible
    skipTaskbar: process.platform !== 'darwin', // Hide from taskbar except on macOS
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: !isDevelopment, // Disable web security in development
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false, // Frameless window for custom titlebar like Warp
    titleBarStyle: 'hidden',
    show: false, // Don't show until ready-to-show
  });
  
  logDebug('Window', 'Created window with bounds:', bounds);
  
  // Store window bounds when they change
  ['resize', 'move'].forEach(event => {
    mainWindow.on(event, () => {
      const newBounds = mainWindow.getBounds();
      store.set('windowBounds', newBounds);
      logDebug('Window', `Window ${event}d to:`, newBounds);
    });
  });

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
    
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
    logDebug('Development', 'Loading development URL and opening DevTools');
  } else {
    // In production, load from build directory
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    logDebug('Production', 'Loading production build');
  }

  // Enhanced window show logic with activation
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform !== 'darwin') {
      mainWindow.moveTop(); // Ensure window is at the top of the z-order
    }
    logDebug('Window', 'Window shown and activated');
  });
  
  // Window state logging
  mainWindow.on('maximize', () => {
    logDebug('Window', 'Window maximized');
  });
  
  mainWindow.on('unmaximize', () => {
    logDebug('Window', 'Window unmaximized');
  });
  
  mainWindow.on('minimize', () => {
    logDebug('Window', 'Window minimized');
  });
  
  mainWindow.on('restore', () => {
    logDebug('Window', 'Window restored');
  });
  
  mainWindow.on('focus', () => {
    logDebug('Window', 'Window focused');
  });
  
  mainWindow.on('blur', () => {
    logDebug('Window', 'Window lost focus');
  });

  // Handle window closing
  mainWindow.on('closed', () => {
    logDebug('Window', 'Window closed');
    mainWindow = null;
  });

  // Open links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  logDebug('App', 'Application ready, creating window');
  createWindow();

  app.on('activate', () => {
    // On macOS, recreate a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      logDebug('App', 'Activating application, creating new window');
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logDebug('App', 'All windows closed, quitting application');
    app.quit();
  }
});

// Handle window control events with enhanced logging
ipcMain.on('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
    logDebug('Window Control', 'Window minimized via IPC');
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      logDebug('Window Control', 'Window unmaximized via IPC');
    } else {
      mainWindow.maximize();
      logDebug('Window Control', 'Window maximized via IPC');
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) {
    logDebug('Window Control', 'Window close requested via IPC');
    mainWindow.close();
  }
});

// Restore window if minimized before focusing
ipcMain.on('window:focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    logDebug('Window Control', 'Window focus requested via IPC');
  }
});

// Terminal process handling
ipcMain.handle('terminal:create', (event, { id, rows, cols }) => {
  try {
    logDebug('Terminal', `Creating terminal session: ${id}, rows: ${rows}, cols: ${cols}`);
    
    const sessionId = createTerminalSession(id);
    
    // Set up data handler for this terminal
    const ptyProcess = terminals[sessionId].pty;
    
    ptyProcess.onData((data) => {
      // Make sure window is not destroyed before sending
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:data', { id: sessionId, data });
      }
    });
    
    return { success: true, id: sessionId };
  } catch (error) {
    logDebug('Terminal', 'Error creating terminal session:', error);
    return { error: error.message, success: false };
  }
});

// Handle input to terminal
ipcMain.handle('terminal:write', (event, { id, data }) => {
  try {
    if (!terminals[id] || !terminals[id].pty) {
      throw new Error(`Terminal session not found: ${id}`);
    }
    
    terminals[id].pty.write(data);
    return { success: true };
  } catch (error) {
    logDebug('Terminal', `Error writing to terminal session ${id}:`, error);
    return { error: error.message, success: false };
  }
});

// Handle terminal resize
ipcMain.handle('terminal:resize', (event, { id, cols, rows }) => {
  try {
    if (!terminals[id] || !terminals[id].pty) {
      throw new Error(`Terminal session not found: ${id}`);
    }
    
    logDebug('Terminal', `Resizing terminal ${id} to ${cols}x${rows}`);
    terminals[id].pty.resize(cols, rows);
    return { success: true };
  } catch (error) {
    logDebug('Terminal', `Error resizing terminal session ${id}:`, error);
    return { error: error.message, success: false };
  }
});

// Handle terminal close
ipcMain.handle('terminal:close', (event, { id }) => {
  try {
    if (!terminals[id]) {
      return { success: true }; // Already closed
    }
    
    logDebug('Terminal', `Closing terminal session: ${id}`);
    terminals[id].pty.kill();
    delete terminals[id];
    return { success: true };
  } catch (error) {
    logDebug('Terminal', `Error closing terminal session ${id}:`, error);
    return { error: error.message, success: false };
  }
});

// Handle GPU acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');

