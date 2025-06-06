/**
 * Utility functions for consistent error handling across the application
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ErrorMessage {
  title: string;
  message: string;
}

/**
 * Determines appropriate user-facing error message based on error type and context
 */
export function getErrorMessage(error: any, context: string): ErrorMessage {
  // Permission errors (403)
  if (error.status === 403 || error.message?.includes('Host authorization required')) {
    return {
      title: 'Permission required',
      message: 'Only the session host can perform this action'
    };
  }
  
  if (error.status === 403 || error.message?.includes('authorization required')) {
    return {
      title: 'Access denied',
      message: 'You do not have permission to perform this action'
    };
  }

  // Authentication errors (401)
  if (error.status === 401 || error.message?.includes('Authentication')) {
    return {
      title: 'Authentication required',
      message: 'Please refresh the page and rejoin the session'
    };
  }

  // Not found errors (404)
  if (error.status === 404 || error.message?.includes('not found')) {
    return {
      title: 'Resource not found',
      message: 'The requested resource could not be found'
    };
  }

  // Session-specific errors
  if (error.message?.includes('Session not found') || error.message?.includes('Session has expired')) {
    return {
      title: 'Session not found',
      message: 'The session may have expired. Please rejoin.'
    };
  }

  // Server errors (5xx)
  if (error.status >= 500) {
    return {
      title: 'Server error occurred',
      message: 'Please try again in a moment'
    };
  }

  // Network/connection errors
  if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
    return {
      title: 'Connection error',
      message: 'Please check your internet connection and try again'
    };
  }

  // Default fallback
  return {
    title: `Failed to ${context}`,
    message: 'Please try again or contact support'
  };
}

/**
 * Context-specific error messages for story operations
 */
export function getStoryErrorMessage(error: any, operation: 'create' | 'update' | 'delete' | 'activate'): ErrorMessage {
  // Check for permission errors first
  if (error.status === 403 || error.message?.includes('Host authorization required')) {
    const actionMap = {
      create: 'create stories',
      update: 'update stories', 
      delete: 'delete stories',
      activate: 'change active stories'
    };
    
    return {
      title: 'Only the session host can ' + actionMap[operation],
      message: 'Ask the host to manage stories for the session'
    };
  }

  // Fall back to generic error handling
  const contextMap = {
    create: 'create story',
    update: 'update story',
    delete: 'delete story', 
    activate: 'activate story'
  };

  return getErrorMessage(error, contextMap[operation]);
}

/**
 * Context-specific error messages for voting operations  
 */
export function getVotingErrorMessage(error: any, operation: 'submit' | 'reveal' | 'reset'): ErrorMessage {
  // Check for spectator errors
  if (error.message?.includes('Spectators cannot vote')) {
    return {
      title: 'Spectators cannot vote',
      message: 'Ask the host to change your role to participate in voting'
    };
  }

  // Fall back to generic error handling
  const contextMap = {
    submit: 'submit vote',
    reveal: 'reveal cards',
    reset: 'reset voting'
  };

  return getErrorMessage(error, contextMap[operation]);
}