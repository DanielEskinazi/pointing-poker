import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { HiExclamationTriangle, HiArrowPath, HiForward } from 'react-icons/hi2';
import { LoadingButton } from '../loading';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onSkip?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VotingErrorBoundary extends Component<Props, State> {
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
    console.error('VotingErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
    
    this.props.onRetry?.();
  };

  private handleSkip = () => {
    this.setState({
      hasError: false,
      error: null
    });
    
    this.props.onSkip?.();
  };

  public render() {
    if (this.state.hasError) {
      const isVotingError = this.state.error?.message.includes('vote') || 
                           this.state.error?.message.includes('Vote') ||
                           this.state.error?.message.includes('story') ||
                           this.state.error?.message.includes('Story');

      return (
        <motion.div
          className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <HiExclamationTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {isVotingError ? 'Voting Error' : 'Something went wrong'}
          </h3>
          
          <p className="text-red-700 mb-4 text-sm">
            {isVotingError 
              ? 'There was a problem with the voting system. You can try again or skip this round.'
              : 'We encountered an error. Please try again.'
            }
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 text-left bg-red-100 p-3 rounded text-xs">
              <summary className="cursor-pointer text-red-800 font-medium mb-1">
                Error Details
              </summary>
              <pre className="text-red-600 overflow-auto whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <div className="flex gap-2 justify-center">
            <LoadingButton
              onClick={this.handleRetry}
              variant="primary"
              size="sm"
              className="flex items-center gap-1"
            >
              <HiArrowPath className="w-4 h-4" />
              Try Again
            </LoadingButton>
            
            {this.props.onSkip && (
              <LoadingButton
                onClick={this.handleSkip}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <HiForward className="w-4 h-4" />
                Skip
              </LoadingButton>
            )}
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}