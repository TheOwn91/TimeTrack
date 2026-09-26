import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistentStorage } from './lib/device';
import { registerServiceWorker } from './lib/update';
import { StoreProvider } from './lib/store';
import './styles.css';

registerServiceWorker();
requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
