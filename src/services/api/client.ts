import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '../../types';

const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  
  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        config.headers['X-Request-ID'] = generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearToken();
            window.location.href = '/';
            return Promise.reject(refreshError);
          }
        }
        
        if (!error.response) {
          return Promise.reject({
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR'
          });
        }
        
        return Promise.reject(this.transformError(error));
      }
    );
  }
  
  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    this.refreshPromise = this.post<{ token: string }>('/auth/refresh', {
      refreshToken
    }).then(response => {
      const { token } = response.data;
      this.setToken(token);
      this.refreshPromise = null;
      return token;
    });
    
    return this.refreshPromise;
  }
  
  private transformError(error: unknown): ApiError {
    const axiosError = error as {
      response?: {
        data?: { error?: string; message?: string; code?: string; details?: unknown };
        status?: number;
      };
      code?: string;
    };
    
    return {
      message: axiosError.response?.data?.error || axiosError.response?.data?.message || 'An error occurred',
      code: axiosError.response?.data?.code || axiosError.code,
      status: axiosError.response?.status,
      details: axiosError.response?.data?.details
    };
  }
  
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
  
  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }
  
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
  
  private clearToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();