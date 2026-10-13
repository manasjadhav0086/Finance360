import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const AUTH_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;

// In-memory cache for Keycloak JWKS public certs (12 hour TTL with 60s refetch throttle)
const JWKS_KEY_CACHE = new Map();
const JWKS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const JWKS_MIN_REFETCH_INTERVAL_MS = 60 * 1000; // Throttle refetches on unknown kid to max 1 per 60s

const ALLOWED_ISSUERS = [
  'https://login-dev.stackroute.io/shield/realms/lxp-lbg-qa',
  'https://dst.stackroute.in/shield/realms/lxp-etech-sso',
];

const ALLOWED_CLIENT_IDS = ['finance360', 'finance-360'];

// Periodic cleanup of expired cache entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of AUTH_CACHE.entries()) {
    if (now > data.expiry) {
      AUTH_CACHE.delete(token);
    }
  }
}, 10 * 60 * 1000);

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
 * Fetch and construct RSA public key from Keycloak JWKS endpoint with rate-limiting
 */
async function getPublicKeyForToken(token, issuer) {
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
    throw new Error('Token missing key ID (kid) in header');
  }

  const { kid } = decodedToken.header;
  const now = Date.now();
  let cached = JWKS_KEY_CACHE.get(issuer);

  const isExpired = !cached || now > cached.expiry;
  const isMissingKid = cached && !cached.keys.has(kid);
  const canRefetch = !cached || (now - (cached.lastFetched || 0) > JWKS_MIN_REFETCH_INTERVAL_MS);

  if (isExpired || (isMissingKid && canRefetch)) {
    const certsUrl = `${issuer}/protocol/openid-connect/certs`;
    const res = await fetch(certsUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch Keycloak public certificates from ${certsUrl}`);
    }
    const jwks = await res.json();
    const keyMap = new Map();

    if (Array.isArray(jwks.keys)) {
      for (const key of jwks.keys) {
        if (key.kid) {
          try {
            const pubKey = crypto.createPublicKey({ key, format: 'jwk' });
            keyMap.set(key.kid, pubKey);
          } catch (e) {
            console.warn('Failed to parse public key for kid:', key.kid, e.message);
          }
        }
      }
    }

    cached = { keys: keyMap, expiry: now + JWKS_CACHE_TTL_MS, lastFetched: now };
    JWKS_KEY_CACHE.set(issuer, cached);
  }

  const publicKey = cached?.keys?.get(kid);
  if (!publicKey) {
    throw new Error(`No matching public key found on Keycloak for kid: ${kid}`);
  }

  return publicKey;
}

export const verifyUser = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const now = Date.now();

  // 1. Check in-memory cache first
  const cached = AUTH_CACHE.get(token);
  if (cached && now < cached.expiry) {
    req.user = cached.data.user;
    req.user_id = cached.data.user_id;

    try {
      let user = await User.findOne({ user_id: req.user_id });
      if (!user && req.user?.email) {
        const emailRegex = new RegExp(`^${req.user.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        user = await User.findOne({ email: emailRegex });
      }

      // Instant authorization check: User must exist in DB
      if (!user) {
        AUTH_CACHE.delete(token);
        return res.status(403).json({ error: 'Access Restricted: Your account is not authorized in this system. Please contact an administrator.' });
      }

      req.dbUser = user;
      req.role = user.role || 'user';

      return next();
    } catch (dbErr) {
      console.error('Error fetching user from DB in cached path:', dbErr);
      return res.status(500).json({ error: 'Database error verifying user' });
    }
  }

  // 2. Cryptographic Signature Verification & Claim Validation
  try {
    const preliminaryDecoded = jwt.decode(token);
    if (!preliminaryDecoded || !preliminaryDecoded.iss) {
      return res.status(401).json({ error: 'Invalid token structure: missing issuer' });
    }

    if (!ALLOWED_ISSUERS.includes(preliminaryDecoded.iss)) {
      return res.status(403).json({
        error: 'Unauthorized: Token from untrusted issuer',
        received: preliminaryDecoded.iss,
      });
    }

    // Cryptographically verify token signature against Keycloak Public Key (Detects ANY tampering)
    const publicKey = await getPublicKeyForToken(token, preliminaryDecoded.iss);
    const verifiedPayload = jwt.verify(token, publicKey, {
      algorithms: [
        'RS256', 'RS384', 'RS512',
        'ES256', 'ES384', 'ES512',
        'PS256', 'PS384', 'PS512',
        'EdDSA'
      ],
      issuer: ALLOWED_ISSUERS,
    });

    // 2. Client Audience Verification (Strict cross-client token replay prevention)
    const tokenAudience = Array.isArray(verifiedPayload.aud)
      ? verifiedPayload.aud
      : [verifiedPayload.aud].filter(Boolean);
    const hasValidAzp = verifiedPayload.azp && ALLOWED_CLIENT_IDS.includes(verifiedPayload.azp);
    const hasValidAud = tokenAudience.some((aud) => ALLOWED_CLIENT_IDS.includes(aud));

    if (!hasValidAzp && !hasValidAud) {
      return res.status(403).json({
        error: 'Access Denied: Token was not issued for Finance360 application',
        received_azp: verifiedPayload.azp || 'none',
        received_aud: verifiedPayload.aud || 'none',
      });
    }

    if (!verifiedPayload.exp) {
      return res.status(401).json({ error: 'Invalid token: missing expiration claim' });
    }

    const tokenExpiryMs = verifiedPayload.exp * 1000;
    if (tokenExpiryMs < now) {
      return res.status(401).json({ error: 'Token expired' });
    }

    const decoded = { ...verifiedPayload };
    const sub = decoded.sub;

    if (!sub) {
      return res.status(400).json({ error: 'Token missing sub field' });
    }

    if (!decoded.email) {
      return res.status(401).json({ error: 'Invalid token: email claim is required.' });
    }

    const email = decoded.email.toLowerCase().trim();
    const name = decoded.name || decoded.preferred_username || email;

    req.user = decoded;
    req.user_id = sub;

    // 3. Authorize against pre-provisioned user in database (Point 4: Strict sub/UUID binding)
    let user = await User.findOne({ user_id: sub });

    if (!user && email) {
      const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      user = await User.findOne({ email: emailRegex });
      if (user) {
        // Permanently lock user to this Keycloak sub UUID
        user.user_id = sub;
      }
    }

    if (!user) {
      return res.status(403).json({
        error: 'Access Restricted: Your account is not authorized in this system. Please contact an administrator.',
      });
    }

    let updated = false;

    if (user.user_id !== sub) {
      user.user_id = sub;
      updated = true;
    }
    if (user.email !== email && email) {
      user.email = email;
      updated = true;
    }
    if (user.name !== name && name) {
      user.name = name;
      updated = true;
    }

    if (updated) {
      await user.save();
    }

    req.dbUser = user;
    req.role = user.role || 'user';

    // Evict oldest entries if cache limit is reached
    if (AUTH_CACHE.size >= MAX_CACHE_ENTRIES) {
      const oldestToken = AUTH_CACHE.keys().next().value;
      if (oldestToken) {
        AUTH_CACHE.delete(oldestToken);
      }
    }

    // Store in cache with lean user object to strictly bound memory
    AUTH_CACHE.set(token, {
      expiry: tokenExpiryMs,
      data: {
        user: decoded,
        user_id: sub,
        role: req.role,
        dbUser: typeof user?.toObject === 'function' ? user.toObject() : user,
      },
    });

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Tampered or invalid token signature: cryptographic verification failed.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: err.message });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyUser(req, res, () => {
    if (req.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  });
};


