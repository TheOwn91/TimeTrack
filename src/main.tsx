import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isStandalone, requestPersistentStorage } from './lib/device';
import { NEW_APP_URL, isOldAddress } from './lib/moved';
import { registerServiceWorker } from './lib/update';
import { StoreProvider } from './lib/store';
import './styles.css';

// Umzug: Im Browser direkt zur neuen Adresse, die installierte App zeigt einen Hinweis (MovedNotice)
if (isOldAddress() && !isStandalone()) window.location.replace(NEW_APP_URL + window.location.hash);

registerServiceWorker();
requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
