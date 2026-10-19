// Central API config

const API_BASE_URL = `/fin/api`;

export const apiEndpoints = {
  API_BASE_URL: API_BASE_URL,

  // Health check & connection status
  HEALTH_CHECK: '/health',

  // Authentication & Password Management
  LOGIN: '/user/login',
  FORGOT_PASSWORD: '/user/forgot-password',
  VERIFY_RESET_TOKEN: '/user/verify-reset-token',
  RESET_PASSWORD: '/user/reset-password',
  CHANGE_PASSWORD: '/user/change-password',

  // Current logged in user (self profile)
  USER: '/user/me',

  // User Administration
  GET_ALL_USERS: '/user/all',
  CREATE_USER: '/user/create',
  SEND_INVITE: (userId) => `/user/send-invite/${userId}`,
  GET_BUSINESS_OPTIONS: '/user/business-options',
  UPDATE_USER: (userId) => `/user/${userId}`,
  DELETE_USER: (userId) => `/user/${userId}`,

  // Core Dashboard dataset (P&L, metadata, business mapping)
  DASHBOARD_DATA: '/dashboard-data',

  // MySQL authoritative views for Performance tab
  PERFORMANCE_VIEWS: '/performance-views',

  // MySQL-backed Finance AI Assistant
  AI_ASSISTANT: '/ai',

  // Market Intelligence & Macro Environment Agent
  LIVE_NEWS: '/news',
};

export default apiEndpoints;
