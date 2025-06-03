# Story 7: API Client Integration

## Summary
Create a comprehensive API client service for the React frontend to communicate with the backend REST API, including authentication, error handling, and request/response interceptors.

## Acceptance Criteria
- [ ] Axios or Fetch-based API client configured
- [ ] Authentication token management
- [ ] Request/response interceptors
- [ ] Error handling and retry logic
- [ ] TypeScript types for all API calls
- [ ] Loading states for API requests
- [ ] React Query integration for caching
- [ ] Environment-based API URL configuration
- [ ] Request cancellation support

## Technical Details

### API Client Setup
```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout user
            useAuthStore.getState().logout();
            window.location.href = '/';
            return Promise.reject(refreshError);
          }
        }
        
        // Handle network errors
        if (!error.response) {
          return Promise.reject({
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR'
          });
        }
        
        // Transform error response
        return Promise.reject(this.transformError(error));
      }
    );
  }
  
  private async refreshToken(): Promise<string> {
    // Prevent multiple refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.post<{ token: string }>('/auth/refresh', {
      refreshToken: useAuthStore.getState().refreshToken
    }).then(response => {
      const { token } = response.data;
      useAuthStore.getState().setToken(token);
      this.refreshPromise = null;
      return token;
    });
    
    return this.refreshPromise;
  }
  
  private transformError(error: any): ApiError {
    return {
      message: error.response?.data?.error || 'An error occurred',
      code: error.response?.data?.code || error.code,
      status: error.response?.status,
      details: error.response?.data?.details
    };
  }
  
  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### API Service Layer
```typescript
// src/services/api/sessions.ts
import { apiClient } from './client';
import { Session, CreateSessionDto, JoinSessionDto } from '@/types';

export const sessionApi = {
  create: async (data: CreateSessionDto) => {
    return apiClient.post<{
      session: Session;
      joinUrl: string;
      hostToken: string;
    }>('/sessions', data);
  },
  
  get: async (sessionId: string) => {
    return apiClient.get<Session>(`/sessions/${sessionId}`);
  },
  
  join: async (sessionId: string, data: JoinSessionDto) => {
    return apiClient.post<{
      playerId: string;
      sessionId: string;
      token: string;
    }>(`/sessions/${sessionId}/join`, data);
  },
  
  update: async (sessionId: string, data: Partial<Session>) => {
    return apiClient.put<Session>(`/sessions/${sessionId}`, data);
  },
  
  delete: async (sessionId: string) => {
    return apiClient.delete(`/sessions/${sessionId}`);
  }
};

// src/services/api/players.ts
export const playerApi = {
  getAll: async (sessionId: string) => {
    return apiClient.get<Player[]>(`/sessions/${sessionId}/players`);
  },
  
  update: async (playerId: string, data: UpdatePlayerDto) => {
    return apiClient.put<Player>(`/players/${playerId}`, data);
  },
  
  remove: async (playerId: string) => {
    return apiClient.delete(`/players/${playerId}`);
  }
};

// src/services/api/voting.ts
export const votingApi = {
  submitVote: async (sessionId: string, data: SubmitVoteDto) => {
    return apiClient.post<Vote>(`/sessions/${sessionId}/vote`, data);
  },
  
  getVotes: async (sessionId: string, storyId?: string) => {
    const params = storyId ? { storyId } : {};
    return apiClient.get<VotingState>(`/sessions/${sessionId}/votes`, { params });
  },
  
  revealCards: async (sessionId: string) => {
    return apiClient.post<RevealResult>(`/sessions/${sessionId}/reveal`);
  },
  
  resetGame: async (sessionId: string, newStory?: StoryData) => {
    return apiClient.post(`/sessions/${sessionId}/reset`, { newStory });
  }
};
```

### React Query Integration
```typescript
// src/hooks/api/useSession.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '@/services/api/sessions';

export const useSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.get(sessionId),
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionApi.create,
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(
        ['session', data.data.session.id], 
        data.data.session
      );
      
      // Store auth token
      useAuthStore.getState().setToken(data.data.hostToken);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
};

export const useJoinSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, ...data }: JoinSessionDto & { sessionId: string }) => 
      sessionApi.join(sessionId, data),
    onSuccess: (data, variables) => {
      // Invalidate session query to refresh player list
      queryClient.invalidateQueries(['session', variables.sessionId]);
      
      // Store auth token
      useAuthStore.getState().setToken(data.data.token);
    }
  });
};
```

### Loading State Management
```typescript
// src/hooks/useApiState.ts
import { useState, useCallback } from 'react';

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
  
  return { ...state, execute };
};

// Usage example
const MyComponent = () => {
  const { data, loading, error, execute } = useApiState<Session>();
  
  const handleCreate = async () => {
    try {
      await execute(sessionApi.create({ name: 'New Session' }));
      // Success
    } catch (error) {
      // Error handled by hook
    }
  };
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (data) return <SessionView session={data} />;
};
```

### Error Handling Component
```typescript
// src/components/ApiError.tsx
interface ApiErrorProps {
  error: ApiError;
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
        <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
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
```

### Request Cancellation
```typescript
// src/hooks/useCancellableRequest.ts
import { useRef, useEffect } from 'react';
import axios, { CancelTokenSource } from 'axios';

export const useCancellableRequest = () => {
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  
  const createCancelToken = () => {
    // Cancel previous request if exists
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);
  
  return { createCancelToken, cancel };
};

// Usage
const SearchComponent = () => {
  const { createCancelToken, cancel } = useCancellableRequest();
  const [results, setResults] = useState([]);
  
  const handleSearch = async (query: string) => {
    try {
      const response = await apiClient.get('/search', {
        params: { q: query },
        cancelToken: createCancelToken()
      });
      setResults(response.data);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Search failed:', error);
      }
    }
  };
  
  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      <button onClick={cancel}>Cancel</button>
    </div>
  );
};
```

### Environment Configuration
```typescript
// .env.local
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

// .env.production
VITE_API_URL=https://api.planningpoker.app/api
VITE_WS_URL=wss://api.planningpoker.app

// vite.config.ts
export default defineConfig({
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL),
    __WS_URL__: JSON.stringify(process.env.VITE_WS_URL),
  }
});
```

## Implementation Steps
1. Install axios and react-query
2. Create API client with interceptors
3. Implement service layer for each API domain
4. Create React Query hooks
5. Build error handling components
6. Add loading state management
7. Implement request cancellation
8. Configure environment variables
9. Test all API integrations

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 6-8 hours

## Dependencies
- Backend API must be running
- API documentation available
- TypeScript types defined

## Testing Requirements
- API client handles auth correctly
- Token refresh works seamlessly
- Error states display properly
- Loading states show during requests
- Request cancellation works
- React Query caching functions
- Network errors handled gracefully

## Definition of Done
- [ ] API client fully configured
- [ ] All API endpoints integrated
- [ ] React Query hooks created
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Request cancellation functional
- [ ] Environment config complete
- [ ] All tests passing