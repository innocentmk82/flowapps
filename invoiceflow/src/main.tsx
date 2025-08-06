import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW, debugPWAStatus } from './lib/pwa';

// Register service worker for PWA
registerSW();

// Debug PWA status in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    debugPWAStatus();
  }, 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
