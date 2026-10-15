import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MuiProvider from './theme/MuiProvider';
import NotificationProvider from './components/notificaciones/NotificationProvider';
import AuthProvider from './context/AuthProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MuiProvider>
      <NotificationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NotificationProvider>
    </MuiProvider>
  </React.StrictMode>
);