import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { LoadingButton } from '../loading';
import { authActions } from '../../store/actions/auth';

interface Props {
  children: ReactNode;
  sessionId?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SessionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SessionErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  private handleLeaveSession = () => {
    authActions.logout();
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isSessionError = this.state.error?.message.includes('session') || 
                            this.state.error?.message.includes('Session');

      return (
        <div className="min-h-[400px] bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-8">
          <motion.div
            className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isSessionError ? 'Session Error' : 'Something went wrong'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {isSessionError 
                ? 'There was a problem with your session. You may need to rejoin.'
                : 'We encountered an error while loading your session.'
              }
            </p>

            {this.props.sessionId && (
              <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 p-2 rounded">
                Session: {this.props.sessionId.slice(0, 8)}...
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <LoadingButton
                onClick={this.handleRetry}
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </LoadingButton>
              
              <LoadingButton
                onClick={this.handleLeaveSession}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Session
              </LoadingButton>
            </div>

            <button
              onClick={this.handleReload}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reload page
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}