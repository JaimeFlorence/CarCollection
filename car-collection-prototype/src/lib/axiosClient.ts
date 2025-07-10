import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { toast } from 'sonner';
import { activityTracker } from './activityTracker';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
  clearToken: () => localStorage.removeItem('auth_token'),
};

// Request interceptor to add auth token and track activity
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      // Track user activity on authenticated requests
      activityTracker.updateActivity();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token
      tokenManager.clearToken();
      
      // Show toast notification
      toast.error('Session expired. Please log in again.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;