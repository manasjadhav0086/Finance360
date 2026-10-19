import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'finance360-jwt-secret-key-production-ready-2025';
const AUTH_CACHE = new Map();

export function clearAuthCache(targetIdOrEmail) {
  if (!targetIdOrEmail) {
    AUTH_CACHE.clear();
    return;
  }
  const target = String(targetIdOrEmail).trim().toLowerCase();
  for (const [token, value] of AUTH_CACHE.entries()) {
    if (
      value.data?.user?.email?.toLowerCase() === target ||
      value.data?.user?.sub === target ||
      value.data?.user_id === target ||
      value.data?.dbUser?._id?.toString() === target ||
      value.data?.dbUser?.email?.toLowerCase() === target
    ) {
      AUTH_CACHE.delete(token);
    }
  }
}

/**
 * Enterprise Standalone Authentication & RBAC Middleware
 * Independent MySQL-backed authentication verifying signed JWT tokens.
 */
export const verifyUser = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || (!decoded.email && !decoded.id)) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    const email = decoded.email ? decoded.email.toLowerCase().trim() : null;
    let user = null;

    if (decoded.id) {
      user = await User.findById(decoded.id);
    }
    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(401).json({ error: 'User account not found or access revoked.' });
    }

    // 1. Enforce account status
    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your user account has been disabled. Please contact an administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    req.user = typeof user.toObject === 'function' ? user.toObject() : user;
    req.user_id = user.user_id || user._id;
    req.dbUser = user;
    req.role = user.role || 'user';

    // 2. Enforce mandatory password setup before accessing any dashboard or data APIs
    const isChangePasswordRoute =
      (req.baseUrl === '/fin/api/user' || req.baseUrl?.endsWith('/user')) &&
      (req.path === '/change-password' || req.path === '/me' || req.path === '/logout');

    if (user.must_change_password && !isChangePasswordRoute) {
      return res.status(403).json({
        error: 'Password configuration required before accessing platform features.',
        code: 'PASSWORD_CHANGE_REQUIRED',
        must_change_password: true,
      });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid or corrupted session token.' });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyUser(req, res, () => {
    if (req.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  });
};
