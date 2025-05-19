import { useEffect } from 'react';

/**
 * A hook for registering global keyboard shortcuts
 * @param {Object} shortcuts - An object mapping shortcut keys to handler functions
 * @param {Array} deps - Dependencies array for the effect
 */
export const useKeyboardShortcuts = (shortcuts, deps = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Build the key combination string
      const key = [
        event.ctrlKey ? 'Ctrl+' : '',
        event.altKey ? 'Alt+' : '',
        event.shiftKey ? 'Shift+' : '',
        event.key
      ].join('');
      
      // Format special keys
      const formattedKey = key
        .replace('Escape', 'Esc')
        .replace(' ', 'Space')
        .replace('ArrowUp', 'Up')
        .replace('ArrowDown', 'Down')
        .replace('ArrowLeft', 'Left')
        .replace('ArrowRight', 'Right');
      
      // Check if we have a handler for this shortcut
      const handler = shortcuts[formattedKey];
      if (handler) {
        // If input element is focused and not a special shortcut, don't handle
        if (
          document.activeElement?.tagName === 'INPUT' &&
          !event.ctrlKey && !event.altKey && !event.metaKey
        ) {
          return;
        }
        
        handler(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, deps);
};

export default useKeyboardShortcuts;

