import axios from 'axios';
import { apiEndpoints } from '../apiEndpoints';

// Access token management (Purely In-Memory)
let inMemoryAccessToken = 'local-finance360-token';

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || 'local-finance360-token';
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

export const getAccessToken = () => {
  return inMemoryAccessToken || 'local-finance360-token';
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
      clearAccessToken();
    }
    return Promise.reject(error);
  }
);

export default api;
