import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from '../../types/errors';
import { ToastNotification } from './ToastNotification';

interface ToastContainerProps {
  toasts: Toast[];
  onHide: (id: string) => void;
}

export function ToastContainer({ toasts, onHide }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onHide={onHide}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}