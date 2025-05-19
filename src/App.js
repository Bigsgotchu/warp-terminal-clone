import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Terminal from './components/Terminal/Terminal';
import 'antd/dist/reset.css';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Terminal />
    </Provider>
  );
}

export default App;
