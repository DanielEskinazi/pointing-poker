interface ClientError {
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  sessionId?: string;
  playerId?: string;
  level: 'error' | 'warn' | 'info';
}

class ErrorReportingService {
  private errors: ClientError[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/errors`;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startTimer();
  }

  private startTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private getSessionInfo() {
    // Try to get session info from store or localStorage
    try {
      const stored = localStorage.getItem('planning-poker-session');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          sessionId: data.sessionId,
          playerId: data.currentPlayer?.id,
        };
      }
    } catch {
      // Ignore errors accessing storage
    }
    return {};
  }

  logError(error: Error | string, level: 'error' | 'warn' | 'info' = 'error') {
    const sessionInfo = this.getSessionInfo();
    
    const clientError: ClientError = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      level,
      ...sessionInfo,
    };

    this.errors.push(clientError);

    // Flush immediately if we hit the batch size or it's an error
    if (this.errors.length >= this.batchSize || level === 'error') {
      this.flush();
    }
  }

  private async flush() {
    if (this.errors.length === 0) return;

    // For now, just log errors to console instead of sending to server
    // TODO: Implement /api/errors endpoint in backend
    const errorsToSend = [...this.errors];
    this.errors = [];

    // Just log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Client Error Report');
      errorsToSend.forEach(error => {
        console[error.level](error.message, error);
      });
      console.groupEnd();
    }

    // Commented out server sending until endpoint is implemented
    /*
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorsToSend),
      });

      if (!response.ok) {
        console.warn('Failed to send error reports to server');
        // Put errors back in queue if send failed
        this.errors.unshift(...errorsToSend);
      }
    } catch (err) {
      console.warn('Failed to send error reports to server', err);
      // Put errors back in queue if send failed
      this.errors.unshift(...errorsToSend);
    }
    */
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // Send any remaining errors
  }
}

export const errorReporting = new ErrorReportingService();

// Setup global error handlers
export const setupGlobalErrorHandlers = () => {
  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    errorReporting.logError(
      `JavaScript Error: ${event.error?.message || event.message}`,
      'error'
    );
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorReporting.logError(
      `Unhandled Promise Rejection: ${event.reason}`,
      'error'
    );
  });

  // Handle network errors (fetch failures)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Don't log errors for the error reporting endpoint to prevent infinite loops
      const url = args[0]?.toString() || '';
      const isErrorEndpoint = url.includes('/api/errors');
      
      // Log failed HTTP requests (except for error reporting endpoint)
      if (!response.ok && !isErrorEndpoint) {
        errorReporting.logError(
          `HTTP ${response.status}: ${response.statusText} - ${args[0]}`,
          response.status >= 500 ? 'error' : 'warn'
        );
      }
      
      return response;
    } catch (error) {
      // Don't log network errors for the error reporting endpoint to prevent infinite loops
      const url = args[0]?.toString() || '';
      const isErrorEndpoint = url.includes('/api/errors');
      
      if (!isErrorEndpoint) {
        errorReporting.logError(
          `Network Error: ${error instanceof Error ? error.message : 'Unknown error'} - ${args[0]}`,
          'error'
        );
      }
      throw error;
    }
  };
};

export default errorReporting;