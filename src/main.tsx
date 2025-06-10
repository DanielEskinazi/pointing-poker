import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { setupGlobalErrorHandlers } from './services/errorReporting';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000,
      gcTime: 300000,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Setup global error handlers
setupGlobalErrorHandlers();

// Expose debug utilities in development
if (process.env.NODE_ENV === 'development') {
  import('./store/actions/auth').then(({ authActions }) => {
    (window as unknown as { clearPersistenceData: () => Promise<void> }).clearPersistenceData = authActions.clearAllPersistenceData;
    console.log('🛠️ Debug utilities available:');
    console.log('  window.clearPersistenceData() - Clear all stored data');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);