import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNative } from './lib/native';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Wire native-shell features (status bar, etc). No-ops on web preview.
void initNative().catch((err) => {
  // eslint-disable-next-line no-console
  console.warn('[native] initialization failed:', err);
});
