export interface AppError {
  id?: string;
  type: 'network' | 'api' | 'validation' | 'connection' | 'session' | 'websocket';
  message: string;
  code?: string;
  retry?: () => void;
  details?: string;
  timestamp?: number;
}

export interface ErrorState {
  errors: AppError[];
  showError: (error: AppError) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
}

export interface LoadingState {
  isLoading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isAnyLoading: () => boolean;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastState {
  toasts: Toast[];
  showToast: (title: string, type: ToastType, options?: Partial<Toast>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Connection problem. Check your internet and try again.",
  SESSION_NOT_FOUND: "This session doesn't exist or has expired.",
  INVALID_VOTE: "Please select a valid card before voting.",
  WEBSOCKET_FAILED: "Real-time updates aren't working. Page will auto-refresh.",
  SESSION_EXPIRED: "Your session has expired. Please rejoin.",
  PLAYER_NOT_FOUND: "Player not found in session.",
  VOTE_SUBMISSION_FAILED: "Failed to submit vote. Please try again.",
  STORY_CREATION_FAILED: "Failed to create story. Please try again.",
  INVALID_SESSION_DATA: "Invalid session data received.",
  CONNECTION_TIMEOUT: "Connection timeout. Please check your internet.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment.",
  GENERIC_ERROR: "Something went wrong. Please try again."
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationState {
  errors: Record<string, ValidationError[]>;
  isValid: boolean;
  hasErrors: (field?: string) => boolean;
  getFieldError: (field: string) => string | undefined;
  setFieldError: (field: string, error: ValidationError) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
}