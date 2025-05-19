const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'terminal', {
    // Create a new terminal session
    createSession: (options) => {
      return ipcRenderer.invoke('terminal:create', options);
    },
    
    // Write data to terminal
    write: (id, data) => {
      return ipcRenderer.invoke('terminal:write', { id, data });
    },
    
    // Resize terminal
    resize: (id, cols, rows) => {
      return ipcRenderer.invoke('terminal:resize', { id, cols, rows });
    },
    
    // Close terminal session
    closeSession: (id) => {
      return ipcRenderer.invoke('terminal:close', { id });
    },
    
    // Listen for terminal data
    onData: (callback) => {
      ipcRenderer.on('terminal:data', (_, data) => callback(data));
    },
    
    // Remove data listener
    removeDataListener: () => {
      ipcRenderer.removeAllListeners('terminal:data');
    }
  }
);

// Expose system-related information
contextBridge.exposeInMainWorld(
  'system', {
    // Get platform information
    platform: process.platform,
    
    // Get operating system information
    os: {
      hostname: require('os').hostname(),
      type: require('os').type(),
      release: require('os').release(),
      userInfo: require('os').userInfo(),
      homeDir: require('os').homedir()
    }
  }
);

// Expose window control operations
contextBridge.exposeInMainWorld(
  'windowControl', {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
);

