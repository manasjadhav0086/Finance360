import express from 'express';
import User from '../models/User.js';
import { verifyUser, verifyAdmin, clearAuthCache } from '../middleware/auth.js';

const router = express.Router();

// Helper to sanitize internal role for client consumption
const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  return {
    ...obj,
    role: obj.role === 'admin' ? 'admin' : 'user',
    business_groups: Array.isArray(obj.business_groups) ? obj.business_groups : [],
    businesses: Array.isArray(obj.businesses) ? obj.businesses : [],
  };
};

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
      SELECT DISTINCT Segment, Segment_N, Biz1, Biz1_N 
      FROM dataai
      WHERE Segment IS NOT NULL AND Biz1 IS NOT NULL
    `;
    const mysqlService = (await import('../utils/mysqlClient.js')).default;
    const rows = await mysqlService.executeQuery(query);

    const groupMap = new Map();
    const allBusinesses = new Set();
    const allGroups = new Set();

    for (const r of rows || []) {
      const s = String(r.Segment_N || r.Segment || '').trim();
      const b = String(r.Biz1_N || r.Biz1 || '').trim();
      if (!s || s.toUpperCase().includes('DCO') || !b || b.toUpperCase().includes('NYJ')) continue;

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

// Get users (admin only)
router.get('/all', verifyAdmin, async (req, res) => {
  try {
    const rawUsers = await User.find(
      {},
      '_id user_id email name role business_groups businesses createdAt updatedAt'
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
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = new RegExp(`^${(email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const existingUser = await User.findOne({ email: emailRegex });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const bizList = Array.isArray(businesses) ? businesses.filter(Boolean) : [];

    if (assignedRole === 'user' && bizList.length === 0) {
      return res.status(400).json({ error: 'Please select at least 1 Business Unit for the user.' });
    }

    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      name: name ? name.trim() : '',
      role: assignedRole,
      business_groups: assignedRole === 'admin' ? [] : (Array.isArray(business_groups) ? business_groups : []),
      businesses: assignedRole === 'admin' ? [] : bizList,
    });

    res.status(201).json({
      message: 'User created successfully.',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user.' });
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

    const effectiveRole = updateFields.role || targetUser.role;

    if (updateFields.email) {
      const emailRegex = new RegExp(`^${updateFields.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const duplicateUser = await User.findOne({
        email: emailRegex,
        _id: { $ne: user_id }
      });
      if (duplicateUser) {
        return res.status(400).json({ error: "A user with this email address already exists." });
      }
      updateFields.email = updateFields.email.toLowerCase().trim();
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
        return res.status(400).json({ error: 'Please select at least 1 Business Unit for the user.' });
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
