import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyUser, verifyAdmin, clearAuthCache } from '../middleware/auth.js';
import emailService from '../utils/emailService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finance360-jwt-secret-key-production-ready-2025';

// Helper to sanitize internal role and fields for client consumption
const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete obj.password_hash;
  delete obj.reset_token_hash;
  delete obj.reset_token_expires_at;
  delete obj.temp_password_expires_at;
  return {
    ...obj,
    role: obj.role === 'admin' ? 'admin' : 'user',
    status: ['active', 'pending_setup', 'disabled'].includes(obj.status) ? obj.status : 'active',
    must_change_password: Boolean(obj.must_change_password === 1 || obj.must_change_password === true),
    business_groups: Array.isArray(obj.business_groups) ? obj.business_groups : [],
    businesses: Array.isArray(obj.businesses) ? obj.businesses : [],
  };
};

// ==========================================
// Authentication Routes (Public Endpoints)
// ==========================================

// Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your user account has been disabled. Please contact an administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Password not set. Please use forgot password or the setup link to configure your password.' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const mustChangePassword = Boolean(user.must_change_password || user.status === 'pending_setup');

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        must_change_password: mustChangePassword,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: sanitizeUser(user),
      must_change_password: mustChangePassword,
      message: mustChangePassword
        ? 'Temporary credentials verified. Please configure your new permanent password.'
        : 'Sign in successful.',
    });
  } catch (err) {
    console.error('Error in /login route:', err);
    return res.status(500).json({ error: 'Internal login error. Please try again.' });
  }
});

// Mandatory First-Login or Self-Service Change Password
router.post('/change-password', verifyUser, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body || {};
    const cleanNewPass = String(newPassword || '');
    const cleanConfirmPass = String(confirmPassword || '');

    if (!cleanNewPass || !cleanConfirmPass) {
      return res.status(400).json({ error: 'New password and confirmation are required.' });
    }

    if (cleanNewPass.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (cleanNewPass !== cleanConfirmPass) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter.' });
    }

    const user = req.dbUser;
    const passwordHash = await bcrypt.hash(cleanNewPass, 10);

    const mysqlService = (await import('../utils/mysqlClient.js')).default;
    await mysqlService.executeQuery(
      'UPDATE users SET password_hash = ?, must_change_password = 0, status = "active", temp_password_expires_at = NULL, reset_token_hash = NULL, reset_token_expires_at = NULL, updatedAt = NOW() WHERE _id = ?',
      [passwordHash, user._id]
    );

    const updatedUser = await User.findById(user._id);
    clearAuthCache(updatedUser.email);

    // Issue a clean standard JWT token
    const token = jwt.sign(
      {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        must_change_password: false,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Password configured successfully. Welcome to Finance360!',
      token,
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    console.error('Error in /change-password route:', err);
    return res.status(500).json({ error: 'Failed to update password. Please try again.' });
  }
});

// Forgot Password - Initiate password reset with anti-enumeration protection and email delivery
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (user && user.status !== 'disabled') {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes single-use token

      user.reset_token_hash = tokenHash;
      user.reset_token_expires_at = expiresAt;
      await user.save();

      // Trigger email delivery via configured SMTP provider
      const deliveryResult = await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: rawToken,
      });
      console.log(`[Forgot Password] Reset token issued for ${user.email}. Live email sent: ${deliveryResult.sent}${deliveryResult.previewLink ? ` (Dev link: ${deliveryResult.previewLink})` : ''}`);
    } else {
      console.warn(`[Forgot Password] Reset requested for email "${cleanEmail}", but no active account was found in the database.`);
    }

    // Always return neutral anti-enumeration message
    return res.json({
      success: true,
      message: 'If an account associated with this email exists, password reset instructions have been generated.',
    });
  } catch (err) {
    console.error('Error in /forgot-password route:', err);
    return res.status(500).json({ error: 'Unable to process password reset request.' });
  }
});

// Verify Reset Token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body || {};
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      return res.status(400).json({ valid: false, error: 'Reset token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    const mysqlService = (await import('../utils/mysqlClient.js')).default;
    const rows = await mysqlService.executeQuery(
      'SELECT _id, email, reset_token_expires_at FROM users WHERE reset_token_hash = ? AND reset_token_expires_at > NOW() LIMIT 1',
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ valid: false, error: 'Password reset link is invalid or has expired.' });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error('Error in /verify-reset-token route:', err);
    return res.status(500).json({ valid: false, error: 'Failed to verify reset token.' });
  }
});

// Reset Password - Invalidate token upon successful reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    const cleanToken = String(token || '').trim();
    const cleanNewPassword = String(newPassword || '');

    if (!cleanToken || !cleanNewPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (cleanNewPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    const mysqlService = (await import('../utils/mysqlClient.js')).default;
    const rows = await mysqlService.executeQuery(
      'SELECT * FROM users WHERE reset_token_hash = ? AND reset_token_expires_at > NOW() LIMIT 1',
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
    }

    const targetUser = rows[0];
    const passwordHash = await bcrypt.hash(cleanNewPassword, 10);

    // Update password, activate account, and invalidate reset token
    await mysqlService.executeQuery(
      'UPDATE users SET password_hash = ?, status = "active", must_change_password = 0, temp_password_expires_at = NULL, reset_token_hash = NULL, reset_token_expires_at = NULL, updatedAt = NOW() WHERE _id = ?',
      [passwordHash, targetUser._id]
    );

    clearAuthCache(targetUser.email);

    return res.json({
      success: true,
      message: 'Password has been successfully reset. Please log in with your new password.',
    });
  } catch (err) {
    console.error('Error in /reset-password route:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ==========================================
// User Profile & Management (Protected)
// ==========================================

// Get current user
router.get('/me', verifyUser, async (req, res) => {
  try {
    const user = sanitizeUser(req.dbUser);
    res.json({ user });
  } catch (err) {
    console.error('Error in /me route:', err);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Get business hierarchy options for user permissions (admin only)
router.get('/business-options', verifyAdmin, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT Segment, Biz1 
      FROM dataai
      WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
    `;
    const mysqlService = (await import('../utils/mysqlClient.js')).default;
    const rows = await mysqlService.executeQuery(query);

    const groupMap = new Map();
    const allBusinesses = new Set();
    const allGroups = new Set();

    for (const r of rows || []) {
      const s = String(r.Segment || '').trim();
      const b = String(r.Biz1 || '').trim();
      if (!s || !b) continue;

      allGroups.add(s);
      allBusinesses.add(b);

      if (!groupMap.has(s)) {
        groupMap.set(s, new Set());
      }
      groupMap.get(s).add(b);
    }

    const structure = Array.from(groupMap.entries())
      .map(([group, bizSet]) => ({
        group,
        businesses: Array.from(bizSet).sort(),
      }))
      .sort((a, b) => a.group.localeCompare(b.group));

    res.json({
      groups: Array.from(allGroups).sort(),
      businesses: Array.from(allBusinesses).sort(),
      hierarchy: structure,
    });
  } catch (err) {
    console.error('Error fetching business options:', err);
    res.status(500).json({ error: 'Failed to fetch business options' });
  }
});

// Get all users (admin only)
router.get('/all', verifyAdmin, async (req, res) => {
  try {
    const rawUsers = await User.find(
      {},
      '_id user_id email name role status must_change_password business_groups businesses createdAt updatedAt'
    ).sort({ createdAt: -1 });

    const users = rawUsers.map((u) => sanitizeUser(u));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Create user (admin only)
router.post('/create', verifyAdmin, async (req, res) => {
  try {
    const { email, name, role, business_groups = [], businesses = [] } = req.body;
    const cleanEmail = String(email || '').toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const bizList = Array.isArray(businesses) ? businesses.filter(Boolean) : [];

    if (assignedRole === 'user' && bizList.length === 0) {
      return res.status(400).json({ error: 'Please select at least 1 Business for the user.' });
    }

    const defaultUserPass = req.body.password || process.env.DEFAULT_USER_PASSWORD || 'Welcome@Finance360';
    const passwordHash = await bcrypt.hash(String(defaultUserPass), 10);

    const rawSetupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = crypto.createHash('sha256').update(rawSetupToken).digest('hex');
    const setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours activation window

    const newUser = await User.create({
      email: cleanEmail,
      name: name ? name.trim() : '',
      role: assignedRole,
      status: 'pending_setup',
      must_change_password: 1,
      business_groups: assignedRole === 'admin' ? [] : (Array.isArray(business_groups) ? business_groups : []),
      businesses: assignedRole === 'admin' ? [] : bizList,
      password_hash: passwordHash,
      reset_token_hash: setupTokenHash,
      reset_token_expires_at: setupTokenExpiry,
    });

    // Send welcome invite email if configured
    await emailService.sendWelcomeInviteEmail({
      to: cleanEmail,
      name: name ? name.trim() : '',
      setupToken: rawSetupToken,
      temporaryPassword: defaultUserPass,
    });

    const setupLink = `${emailService.getAppUrl()}/fin/reset-password?token=${rawSetupToken}`;

    res.status(201).json({
      message: 'User authorized successfully. First-login password workflow initialized.',
      user: sanitizeUser(newUser),
      setupLink: emailService.isConfigured() ? undefined : setupLink,
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Send/Resend Activation or Password Setup Link (admin only)
router.post('/send-invite/:user_id', verifyAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const rawSetupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = crypto.createHash('sha256').update(rawSetupToken).digest('hex');
    const setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    targetUser.reset_token_hash = setupTokenHash;
    targetUser.reset_token_expires_at = setupTokenExpiry;
    await targetUser.save();

    await emailService.sendWelcomeInviteEmail({
      to: targetUser.email,
      name: targetUser.name,
      setupToken: rawSetupToken,
      temporaryPassword: process.env.DEFAULT_USER_PASSWORD || 'Welcome@Finance360',
    });

    const setupLink = `${emailService.getAppUrl()}/fin/reset-password?token=${rawSetupToken}`;

    res.json({
      success: true,
      message: `Setup instructions generated for ${targetUser.email}.`,
      setupLink: emailService.isConfigured() ? undefined : setupLink,
    });
  } catch (err) {
    console.error('Error generating invite link:', err);
    res.status(500).json({ error: 'Failed to send setup link.' });
  }
});

// Update user details (admin only)
router.put('/:user_id', verifyAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const updateFields = { ...req.body };

    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const isSelf =
      (req.dbUser?._id && targetUser._id.toString() === req.dbUser._id.toString()) ||
      (req.user?.email && targetUser.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (req.user?.sub && targetUser.user_id === req.user.sub);

    if (updateFields.role) {
      updateFields.role = updateFields.role === 'admin' ? 'admin' : 'user';
    }

    if (isSelf && updateFields.role && updateFields.role !== 'admin') {
      return res.status(400).json({ error: "You cannot remove admin privileges from your own account." });
    }

    if (isSelf && updateFields.status && updateFields.status === 'disabled') {
      return res.status(400).json({ error: "You cannot disable your own administrator account." });
    }

    // Protect against disabling or demoting the last active administrator
    if (
      (targetUser.role === 'admin' && updateFields.role === 'user') ||
      (targetUser.role === 'admin' && updateFields.status === 'disabled')
    ) {
      const mysqlService = (await import('../utils/mysqlClient.js')).default;
      const [adminCountRow] = await mysqlService.executeQuery(
        "SELECT count(*) as c FROM users WHERE role = 'admin' AND status = 'active' AND _id != ?",
        [targetUser._id]
      );
      if (adminCountRow.c === 0) {
        return res.status(400).json({ error: "Cannot modify this account: At least 1 active administrator must remain." });
      }
    }

    const effectiveRole = updateFields.role || targetUser.role;

    if (updateFields.password) {
      updateFields.password_hash = await bcrypt.hash(String(updateFields.password), 10);
      delete updateFields.password;
    }

    if (updateFields.email) {
      const cleanEmail = updateFields.email.toLowerCase().trim();
      const duplicateUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user_id }
      });
      if (duplicateUser) {
        return res.status(400).json({ error: "A user with this email address already exists." });
      }
      updateFields.email = cleanEmail;
    }

    if (effectiveRole === 'admin') {
      updateFields.business_groups = [];
      updateFields.businesses = [];
    } else {
      if (updateFields.business_groups !== undefined) {
        updateFields.business_groups = Array.isArray(updateFields.business_groups) ? updateFields.business_groups : [];
      }

      if (updateFields.businesses !== undefined) {
        updateFields.businesses = Array.isArray(updateFields.businesses) ? updateFields.businesses : [];
      }

      const bizs = updateFields.businesses !== undefined ? updateFields.businesses : targetUser.businesses;
      if (!Array.isArray(bizs) || bizs.length === 0) {
        return res.status(400).json({ error: 'Please select at least 1 Business for the user.' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    clearAuthCache(targetUser.email);

    res.json({
      message: "User details updated successfully.",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ error: "Failed to update user details." });
  }
});

// Delete user (admin only)
router.delete('/:user_id', verifyAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;

    const targetUser = await User.findById(user_id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const isSelf =
      (req.dbUser?._id && targetUser._id.toString() === req.dbUser._id.toString()) ||
      (req.user?.email && targetUser.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (req.user?.sub && targetUser.user_id === req.user.sub);

    if (isSelf) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    if (targetUser.role === 'admin') {
      const mysqlService = (await import('../utils/mysqlClient.js')).default;
      const [adminCountRow] = await mysqlService.executeQuery(
        "SELECT count(*) as c FROM users WHERE role = 'admin' AND status = 'active' AND _id != ?",
        [targetUser._id]
      );
      if (adminCountRow.c === 0) {
        return res.status(400).json({ error: "Cannot delete the last active administrator account." });
      }
    }

    await User.findByIdAndDelete(user_id);
    clearAuthCache(targetUser.email);

    res.json({
      message: "User deleted successfully."
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;
