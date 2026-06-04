import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initAppearance } from './hooks/useAppearance';
import { registerSW } from './hooks/usePWA';

// Apply saved appearance settings before first paint (no flash)
initAppearance();

// Register PWA service worker
registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
