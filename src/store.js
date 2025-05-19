import { configureStore } from '@reduxjs/toolkit';
import terminalReducer from './features/terminalSlice';

/**
 * Configure Redux store with middlewares and devtools
 * @returns {import('@reduxjs/toolkit').EnhancedStore} The configured Redux store
 */
export const store = configureStore({
  reducer: {
    terminal: terminalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['terminal/executeCommand/fulfilled'],
        // Ignore these paths in the state for serialization check
        ignoredPaths: ['terminal.tabs.output'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export types for better TypeScript support if needed later
export const RootState = store.getState();
export const AppDispatch = store.dispatch;

export default store;

