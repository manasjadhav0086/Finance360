import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken } from '../services/api';
import { apiEndpoints } from '../apiEndpoints';

const DEFAULT_ADMIN_USER = {
  user_id: 'usr_admin',
  email: 'admin@finance360.internal',
  name: 'Finance360 Admin',
  role: 'admin',
  business_groups: [],
  businesses: [],
};

const DEFAULT_AUTH = {
  isAuthorized: true,
  role: 'admin',
  isAdmin: true,
};

const AuthContext = createContext({
  isLoggedIn: true,
  authenticated: true,
  user: DEFAULT_ADMIN_USER,
  setUser: () => { },
  token: 'local-finance360-token',
  role: 'admin',
  isAdmin: true,
  authData: DEFAULT_AUTH,
  isUnauthorized: false,
  setIsUnauthorized: () => { },
  syncDbProfile: async () => DEFAULT_ADMIN_USER,
  fetchCurrentUser: async () => DEFAULT_ADMIN_USER,
  loading: false,
  loadingUser: false,
  authLoading: false,
  login: () => { },
  logout: () => { },
});

export const AuthProvider = ({ children }) => {
  const [authenticated] = useState(true);
  const [user, setUser] = useState(DEFAULT_ADMIN_USER);
  const [token] = useState('local-finance360-token');
  const [authData, setAuthData] = useState(DEFAULT_AUTH);

  useEffect(() => {
    setAccessToken('local-finance360-token');
    // Optionally fetch user profile from MySQL if available
    api.get(apiEndpoints.USER)
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          setAuthData({
            isAuthorized: true,
            role: res.data.user.role || 'admin',
            isAdmin: res.data.user.role === 'admin',
          });
        }
      })
      .catch(() => {
        // Safe fallback to default admin
      });
  }, []);

  const syncDbProfile = async () => {
    try {
      const res = await api.get(apiEndpoints.USER);
      if (res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
    } catch {
      // Keep default admin user
    }
    return DEFAULT_ADMIN_USER;
  };

  const login = useCallback(() => { }, []);
  const logout = useCallback(() => { }, []);

  const role = user?.role || authData.role || 'admin';
  const isAdmin = Boolean(role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: true,
        authenticated: true,
        user,
        setUser,
        token,
        role,
        isAdmin,
        authData,
        isUnauthorized: false,
        isLoggingOut: false,
        setIsUnauthorized: () => { },
        syncDbProfile,
        fetchCurrentUser: syncDbProfile,
        loading: false,
        loadingUser: false,
        authLoading: false,
        login,
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
