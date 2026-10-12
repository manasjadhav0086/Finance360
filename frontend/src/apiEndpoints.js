// Central API config

const API_BASE_URL = `/fin/api`;

export const apiEndpoints = {
  API_BASE_URL: API_BASE_URL,

  // Health check & connection status
  HEALTH_CHECK: '/health',

  // Current logged in user (self profile)
  USER: '/user/me',

  // User Administration
  GET_ALL_USERS: '/user/all',
  CREATE_USER: '/user/create',
  GET_BUSINESS_OPTIONS: '/user/business-options',
  UPDATE_USER: (userId) => `/user/${userId}`,
  DELETE_USER: (userId) => `/user/${userId}`,

  // Core Dashboard dataset (P&L, metadata, business mapping)
  DASHBOARD_DATA: '/dashboard-data',

  // BigQuery authoritative views for Performance tab
  PERFORMANCE_VIEWS: '/performance-views',

  // Google Cloud BigQuery Data Agent / AI Assistant
  AI_ASSISTANT: '/ai',

  // Google Vertex AI Grounded Live News & Macro Environment Agent
  LIVE_NEWS: '/news',
};

export default apiEndpoints;
