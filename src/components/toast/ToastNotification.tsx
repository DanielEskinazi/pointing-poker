import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiCheckCircle, HiXCircle, HiExclamationTriangle, HiInformationCircle, HiXMark } from 'react-icons/hi2';
import { Toast } from '../../types/errors';

interface ToastNotificationProps {
  toast: Toast;
  onHide: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: HiCheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-800'
  },
  error: {
    icon: HiXCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800'
  },
  warning: {
    icon: HiExclamationTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-800'
  },
  info: {
    icon: HiInformationCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800'
  }
};

export function ToastNotification({ toast, onHide }: ToastNotificationProps) {
  const [progress, setProgress] = useState(100);
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (toast.duration! / 100));
        return Math.max(0, newProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast.duration]);

  const handleClose = () => {
    onHide(toast.id);
  };

  return (
    <motion.div
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-lg shadow-lg p-4 relative overflow-hidden
        max-w-sm w-full
      `}
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5 }}
      transition={{ duration: 0.3, ease: 'backOut' }}
      layout
    >
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
          <motion.div
            className={`h-full ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-5">
            {toast.title}
          </p>
          
          {toast.message && (
            <p className="text-sm opacity-90 mt-1 leading-5">
              {toast.message}
            </p>
          )}
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`
                text-sm font-medium underline mt-2 hover:no-underline
                ${config.textColor}
              `}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className={`
            ${config.iconColor} hover:opacity-70 flex-shrink-0
            p-1 -m-1 rounded transition-opacity
          `}
          aria-label="Close notification"
        >
          <HiXMark className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}