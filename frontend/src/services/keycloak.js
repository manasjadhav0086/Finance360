import Keycloak from 'keycloak-js';

const isProdEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('-dev') ||
    host.includes('-qa') ||
    host.includes('local')
  ) {
    return false;
  }
  return true;
};

const isProd = isProdEnvironment();

// Dev / Localhost Keycloak Config
const DEV_CONFIG = {
  url: 'https://login-dev.stackroute.io/shield',
  realm: 'lxp-lbg-qa',
  clientId: 'finsight-edge',
};

// Prod Keycloak Config (etech)
const PROD_CONFIG = {
  url: 'https://dst.stackroute.in/shield',
  realm: 'lxp-etech-sso',
  clientId: 'finsight-edge',
};

const ACTIVE_CONFIG = isProd ? PROD_CONFIG : DEV_CONFIG;

export const KEYCLOAK_URL = ACTIVE_CONFIG.url;
export const KEYCLOAK_REALM = ACTIVE_CONFIG.realm;
export const KEYCLOAK_CLIENT_ID = ACTIVE_CONFIG.clientId;

export const keycloakConfig = {
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
};

const keycloak = new Keycloak(keycloakConfig);

let initPromise = null;

// Initialize keycloak without onLoad to prevent auto-redirect loops
export const initKeycloak = (options = {}) => {
  if (!initPromise) {
    initPromise = keycloak.init({
      pkceMethod: 'S256',
      checkLoginIframe: false,
      ...options,
    });
  }
  return initPromise;
};

export const getKeycloakLoginUrl = (options = {}) => {
  return keycloak.createLoginUrl({
    redirectUri: window.location.origin,
    ...options,
  });
};

export const login = async (options = {}) => {
  const currentTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark';
  const redirectUri = options.redirectUri || window.location.origin;

  try {
    if (initPromise) {
      await initPromise;
    }
  } catch (e) { }

  try {
    if (keycloak && keycloak.endpoints && typeof keycloak.login === 'function') {
      return keycloak.login({
        redirectUri,
        theme: currentTheme,
        ...options,
      });
    }
  } catch (e) {
    console.warn('keycloak.login error, falling back to direct auth URL:', e);
  }

  const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?client_id=${KEYCLOAK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid`;
  window.location.href = authUrl;
};

export const logout = (options = {}) => {
  const currentTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark';
  return keycloak.logout({
    redirectUri: window.location.origin,
    theme: currentTheme,
    ...options,
  });
};

export default keycloak;
