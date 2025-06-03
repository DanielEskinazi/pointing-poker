import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ApiError as ApiErrorType } from '../types';

interface ApiErrorProps {
  error: ApiErrorType;
  onRetry?: () => void;
}

export const ApiError: React.FC<ApiErrorProps> = ({ error, onRetry }) => {
  const getErrorMessage = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to server. Please check your internet connection.';
      case 'SESSION_NOT_FOUND':
        return 'This session no longer exists.';
      case 'UNAUTHORIZED':
        return 'You are not authorized to perform this action.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {getErrorMessage()}
          </p>
          {error.details && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">
                Technical details
              </summary>
              <pre className="mt-1 text-xs text-red-600 overflow-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-3 text-sm text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};