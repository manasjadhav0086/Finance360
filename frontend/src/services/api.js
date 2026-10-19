import axios from 'axios';
import { apiEndpoints } from '../apiEndpoints';

// Access token management (localStorage with in-memory caching)
const TOKEN_KEY = 'finance360_access_token';
let inMemoryAccessToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getAccessToken = () => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window !== 'undefined') {
    inMemoryAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return inMemoryAccessToken;
};

const api = axios.create({
  baseURL: `${apiEndpoints.API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include token if present
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isPublicAuthEndpoint =
        requestUrl.includes(apiEndpoints.LOGIN) ||
        requestUrl.includes(apiEndpoints.FORGOT_PASSWORD) ||
        requestUrl.includes(apiEndpoints.VERIFY_RESET_TOKEN) ||
        requestUrl.includes(apiEndpoints.RESET_PASSWORD);

      // Only purge credentials and dispatch auth:unauthorized for authenticated session failures
      if (!isPublicAuthEndpoint) {
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
