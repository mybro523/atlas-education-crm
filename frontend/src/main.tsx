import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted variable UI font (serious, neutral, editorial — not a startup grotesk).
import '@fontsource-variable/source-sans-3';
import { App } from '@/app/App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
