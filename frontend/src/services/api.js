import axios from 'axios';
import { apiEndpoints } from '../apiEndpoints';
import keycloak from './keycloak';

// Access token management (Purely In-Memory)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

export const getAccessToken = () => {
  if (keycloak && keycloak.token) {
    return keycloak.token;
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
      clearAccessToken();
    }
    return Promise.reject(error);
  }
);

export default api;
