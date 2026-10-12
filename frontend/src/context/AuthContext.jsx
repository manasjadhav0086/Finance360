import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import keycloak, { initKeycloak, login as kcLogin, logout as kcLogout } from '../services/keycloak';
import api, { setAccessToken, clearAccessToken } from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import { Loader2 } from 'lucide-react';

const DEFAULT_AUTH = {
  isAuthorized: false,
  role: 'user',
  isAdmin: false,
};

export function parseTokenRoles(profile) {
  if (!profile) return DEFAULT_AUTH;

  return {
    isAuthorized: true,
    role: 'user',
    isAdmin: false,
  };
}

const AuthContext = createContext({
  isLoggedIn: false,
  authenticated: false,
  user: null,
  setUser: () => { },
  token: null,
  role: 'user',
  isAdmin: false,
  authData: DEFAULT_AUTH,
  isUnauthorized: false,
  setIsUnauthorized: () => { },
  syncDbProfile: async () => { },
  fetchCurrentUser: async () => { },
  loading: true,
  loadingUser: true,
  authLoading: true,
  login: () => { },
  logout: () => { },
  keycloak: null,
});

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authData, setAuthData] = useState(DEFAULT_AUTH);
  const [isForbidden, setIsForbidden] = useState(false);
  const isInitializedRef = useRef(false);

  const syncDbProfile = async (currentToken) => {
    try {
      const res = await api.get(apiEndpoints.USER, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });
      const data = res.data;
      if (data?.user) {
        const dbUser = data.user;
        setUser(dbUser);
        setToken(currentToken);
        setAccessToken(currentToken);
        setAuthenticated(true);
        setIsForbidden(false);
        setAuthData({
          isAuthorized: true,
          role: dbUser.role || 'user',
          isAdmin: dbUser.role === 'admin',
        });
        return dbUser;
      }
      throw new Error('No user profile found in database');
    } catch (err) {
      console.warn('DB Profile sync / verification failed:', err.response?.data || err.message);
      setAuthenticated(false);
      setUser(null);
      setToken(null);
      clearAccessToken();
      setIsForbidden(true);
      setAuthData(DEFAULT_AUTH);
      return null;
    }
  };

  const handleAuthenticatedUser = async (accessToken) => {
    const verifiedUser = await syncDbProfile(accessToken);
    return Boolean(verifiedUser);
  };

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    initKeycloak({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
      .then(async (isAuth) => {
        if (isAuth && keycloak.token) {
          await handleAuthenticatedUser(keycloak.token);
        } else {
          setAuthenticated(false);
          setIsForbidden(false);
          setAuthData(DEFAULT_AUTH);
        }
      })
      .catch((err) => {
        console.error('Keycloak initialization error:', err);
        setAuthenticated(false);
        setIsForbidden(false);
        setAuthData(DEFAULT_AUTH);
      })
      .finally(() => {
        setLoading(false);
      });

    keycloak.onTokenExpired = () => {
      setAuthenticated(false);
      setUser(null);
      setToken(null);
      clearAccessToken();
    };

    keycloak.onAuthLogout = () => {
      setIsLoggingOut(true);
      setAuthenticated(false);
      setUser(null);
      setToken(null);
      clearAccessToken();
    };
  }, []);

  const login = useCallback((options = {}) => {
    return kcLogin({ redirectUri: window.location.origin, ...options });
  }, []);

  const logout = useCallback((options = {}) => {
    setIsLoggingOut(true);
    setLoading(true);
    setAuthenticated(false);
    setUser(null);
    setToken(null);
    clearAccessToken();
    return kcLogout(options);
  }, []);

  const role = user?.role || authData.role || 'user';
  const isAdmin = Boolean(user?.role === 'admin' || authData.isAdmin);
  const isLoggedIn = authenticated;
  const isUnauthorized = isForbidden;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        authenticated,
        user,
        setUser,
        token,
        role,
        isAdmin,
        authData,
        isUnauthorized,
        isLoggingOut,
        setIsUnauthorized: () => { },
        syncDbProfile,
        fetchCurrentUser: syncDbProfile,
        loading,
        loadingUser: loading,
        authLoading: loading,
        login,
        logout,
        keycloak,
      }}
    >
      {loading || isLoggingOut ? (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-6 select-none">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          {isLoggingOut && (
            <div className="text-xs font-bold tracking-widest uppercase text-blue-900 font-mono">
              Signing out...
            </div>
          )}
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;



