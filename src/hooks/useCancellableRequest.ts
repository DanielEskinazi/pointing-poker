import { useRef, useEffect } from 'react';
import axios, { CancelTokenSource } from 'axios';

export const useCancellableRequest = () => {
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  
  const createCancelToken = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request cancelled');
    }
    
    cancelTokenRef.current = axios.CancelToken.source();
    return cancelTokenRef.current.token;
  };
  
  const cancel = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request cancelled by user');
    }
  };
  
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);
  
  return { createCancelToken, cancel };
};