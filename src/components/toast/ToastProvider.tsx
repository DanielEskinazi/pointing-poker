import React, { createContext, useContext, useCallback, useState } from 'react';
import { Toast, ToastType } from '../../types/errors';
import { ToastContainer } from './ToastContainer';

interface ToastContextType {
  showToast: (title: string, type: ToastType, options?: Partial<Toast>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    title: string, 
    type: ToastType, 
    options: Partial<Toast> = {}
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = options.duration ?? (type === 'error' ? 6000 : 4000);
    
    const toast: Toast = {
      id,
      title,
      type,
      duration,
      ...options
    };

    setToasts(prev => [...prev, toast]);

    // Auto-hide toast after duration
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    showToast,
    hideToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
}