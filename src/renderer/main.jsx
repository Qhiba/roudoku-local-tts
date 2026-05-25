import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// NOTE: StrictMode intentionally removed — it double-invokes effects in dev which
// causes IPC listeners to register twice, doubling every PCM chunk enqueue → doubled audio.
// Re-enable only when all effects have been verified idempotent under double-invocation.
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
