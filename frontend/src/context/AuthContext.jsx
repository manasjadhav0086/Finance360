import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, clearAccessToken, getAccessToken } from '../services/api';
import { apiEndpoints } from '../apiEndpoints';

const AuthContext = createContext({
  isLoggedIn: false,
  authenticated: false,
  user: null,
  setUser: () => { },
  token: null,
  role: 'user',
  isAdmin: false,
  authData: { isAuthorized: false, role: 'user', isAdmin: false },
  isUnauthorized: false,
  setIsUnauthorized: () => { },
  syncDbProfile: async () => null,
  fetchCurrentUser: async () => null,
  loading: false,
  loadingUser: false,
  authLoading: true,
  login: async () => { },
  logout: () => { },
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getAccessToken());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Initialize and verify existing session token on application mount
  useEffect(() => {
    const existingToken = getAccessToken();
    if (!existingToken) {
      setAuthLoading(false);
      return;
    }

    setAccessToken(existingToken);
    api.get(apiEndpoints.USER)
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          setToken(existingToken);
        } else {
          clearAccessToken();
          setUser(null);
          setToken(null);
        }
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // Listen for unauthorized 401 events dispatched from axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAccessToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post(apiEndpoints.LOGIN, { email, password });
    const { token: receivedToken, user: receivedUser, must_change_password } = res.data || {};

    if (!receivedToken || !receivedUser) {
      throw new Error('Invalid response from authentication server.');
    }

    setAccessToken(receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    setIsUnauthorized(false);
    return { user: receivedUser, must_change_password: Boolean(must_change_password || receivedUser.must_change_password) };
  }, []);

  const changePassword = useCallback(async (newPassword, confirmPassword) => {
    const res = await api.post(apiEndpoints.CHANGE_PASSWORD, { newPassword, confirmPassword });
    const { token: freshToken, user: updatedUser } = res.data || {};

    if (freshToken) {
      setAccessToken(freshToken);
      setToken(freshToken);
    }
    if (updatedUser) {
      setUser(updatedUser);
    }
    return updatedUser;
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setToken(null);
    setUser(null);
    setIsUnauthorized(false);
  }, []);

  const syncDbProfile = useCallback(async () => {
    try {
      const res = await api.get(apiEndpoints.USER);
      if (res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
    } catch {
      // User fetch failed
    }
    return user;
  }, [user]);

  const role = user?.role || 'user';
  const isAdmin = Boolean(role === 'admin');
  const isLoggedIn = Boolean(token && user);
  const mustChangePassword = Boolean(user?.must_change_password);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        authenticated: isLoggedIn,
        user,
        setUser,
        token,
        role,
        isAdmin,
        mustChangePassword,
        authData: { isAuthorized: isLoggedIn, role, isAdmin },
        isUnauthorized,
        isLoggingOut: false,
        setIsUnauthorized,
        syncDbProfile,
        fetchCurrentUser: syncDbProfile,
        loading: authLoading,
        loadingUser: authLoading,
        authLoading,
        login,
        changePassword,
        logout,
      }}
    >
      {children}
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
