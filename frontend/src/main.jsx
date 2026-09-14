import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import AppErrorFallback from './components/observability/AppErrorFallback.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { initAnalytics } from './lib/analytics.js';
import { initMonitoring, Sentry } from './lib/monitoring.js';
import './styles/global.css';
import './styles/exam.css';

initAnalytics();
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}>
      <HelmetProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <I18nProvider>
            <App />
          </I18nProvider>
        </BrowserRouter>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
