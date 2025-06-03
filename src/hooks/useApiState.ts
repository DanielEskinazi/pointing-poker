import { useState, useCallback } from 'react';
import { ApiResponse, ApiError } from '../types';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export const useApiState = <T>() => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });
  
  const execute = useCallback(async (promise: Promise<ApiResponse<T>>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await promise;
      setState({ data: response.data, loading: false, error: null });
      return response.data;
    } catch (error) {
      setState({ data: null, loading: false, error: error as ApiError });
      throw error;
    }
  }, []);
  
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);
  
  return { ...state, execute, reset };
};