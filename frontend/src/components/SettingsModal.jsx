import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Trash2,
  Search,
  RefreshCw,
  KeyRound,
  UserPlus,
  Plus,
  Building2,
  Check,
  Edit3,
  Shield,
  Mail,
  Power,
  PowerOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';
import api from '../services/api';
import { apiEndpoints } from '../apiEndpoints';
import AppNotification from './ui/AppNotification';
import ConfirmModal from './ui/ConfirmModal';

function UserScopeDialog({
  isOpen,
  onClose,
  isEdit = false,
  userEmail = '',
  userName = '',
  name,
  setName,
  email,
  setEmail,
  role,
  setRole,
  status,
  setStatus,
  groups,
  setGroups,
  bizs,
  setBizs,
  businessOptions,
  cleanLabel,
  onSubmit,
  isSubmitting,
}) {
  if (!isOpen) return null;

  const handleToggleGroup = (group) => {
    const relatedBizs = businessOptions.hierarchy.find((h) => h.group === group)?.businesses || [];
    const isSelected = groups.includes(group);

    if (!isSelected) {
      setGroups((prev) => [...prev, group]);
      if (relatedBizs.length > 0) {
        setBizs((prev) => Array.from(new Set([...prev, ...relatedBizs])));
      }
    } else {
      const nextGroups = groups.filter((g) => g !== group);
      setGroups(nextGroups);
      if (relatedBizs.length > 0) {
        const coveredBizs = new Set(
          businessOptions.hierarchy
            .filter((h) => nextGroups.includes(h.group))
            .flatMap((h) => h.businesses || [])
        );
        setBizs((prev) => prev.filter((b) => !relatedBizs.includes(b) || coveredBizs.has(b)));
      }
    }
  };

  const handleToggleBiz = (biz) => {
    setBizs((prev) =>
      prev.includes(biz) ? prev.filter((b) => b !== biz) : [...prev, biz]
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150 max-h-[92vh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {isEdit ? <Edit3 className="w-4.5 h-4.5" /> : <UserPlus className="w-4.5 h-4.5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {isEdit ? 'Edit Scoped Data Permissions' : 'Authorize New User'}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-sm">
                {isEdit
                  ? (userName ? `${userName} (${userEmail})` : userEmail)
                  : 'Add user and configure authorized data visibility'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scroll flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Finance Analyst"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 font-medium"
              />
            </div>

            {!isEdit ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@finance360.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 font-semibold cursor-pointer"
                >
                  <option value="active">Active (Access Granted)</option>
                  <option value="pending_setup">Pending Setup (Password Required)</option>
                  <option value="disabled">Disabled (Access Revoked)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Platform Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 font-semibold cursor-pointer"
              >
                <option value="user">User (Scoped Data Access)</option>
                <option value="admin">Admin (Complete Access)</option>
              </select>
            </div>
          </div>

          {!isEdit && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
              <span className="font-bold">First-Login Setup:</span> This account will be initialized in <strong>Pending Setup</strong> status. The user will be required to set a permanent password upon first login before accessing any dashboard or financial reports.
            </div>
          )}

          {role === 'user' ? (
            <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-lg flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Data Visibility Restrictions
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Select at least 1 Business
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Authorized Business Groups (Segment)
                    </span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setGroups([...businessOptions.groups]);
                          setBizs([...businessOptions.businesses]);
                        }}
                        className="text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setGroups([])}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {businessOptions.groups.map((group) => {
                      const isSelected = groups.includes(group);
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => handleToggleGroup(group)}
                          className={`px-3 py-1.5 text-xs rounded-md border transition-all font-semibold cursor-pointer ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                            }`}
                        >
                          {cleanLabel(group)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Authorized Businesses (Biz1)
                    </span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBizs([...businessOptions.businesses])}
                        className="text-blue-600 hover:underline cursor-pointer font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setBizs([])}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scroll p-2.5 border border-slate-200 rounded-md bg-white">
                    {businessOptions.businesses.map((biz) => {
                      const isSelected = bizs.includes(biz);
                      return (
                        <button
                          key={biz}
                          type="button"
                          onClick={() => handleToggleBiz(biz)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                        >
                          {biz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 leading-relaxed font-medium">
              Administrator role automatically grants complete access to all Business Groups and Businesses data.
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:bg-blue-400 shadow-xs"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isEdit ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {isEdit ? 'Save User Details' : 'Authorize User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Add user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newGroups, setNewGroups] = useState([]);
  const [newBizs, setNewBizs] = useState([]);
  const [creatingUser, setCreatingUser] = useState(false);

  // Setup Link Dialog (shows generated link if SMTP is not configured)
  const [setupLinkDialog, setSetupLinkDialog] = useState({ isOpen: false, email: '', link: '', copied: false });

  // Business options state
  const [businessOptions, setBusinessOptions] = useState({ groups: [], businesses: [], hierarchy: [] });

  // Dedicated Edit Permissions modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editStatus, setEditStatus] = useState('active');
  const [editGroups, setEditGroups] = useState([]);
  const [editBizs, setEditBizs] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteConfirmState, setDeleteConfirmState] = useState({
    isOpen: false,
    userId: null,
    userEmail: '',
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const cleanLabel = (text) => {
    if (!text) return '';
    return String(text).replace(/^\d+[\s._-]+/, '').trim() || text;
  };

  const fetchBusinessOptions = useCallback(async () => {
    try {
      const res = await api.get(apiEndpoints.GET_BUSINESS_OPTIONS);
      if (res.data) {
        setBusinessOptions({
          groups: res.data.groups || [],
          businesses: res.data.businesses || [],
          hierarchy: res.data.hierarchy || [],
        });
      }
    } catch (err) {
      console.warn('Failed to fetch business options:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(apiEndpoints.GET_ALL_USERS);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      showNotification(err.response?.data?.error || 'Failed to load users. Please verify admin privileges.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchBusinessOptions();
      setNotification(null);
      setIsAddUserOpen(false);
      setEditingUser(null);
      setDeleteConfirmState({ isOpen: false, userId: null, userEmail: '' });
      setSetupLinkDialog({ isOpen: false, email: '', link: '', copied: false });
    }
  }, [isOpen, fetchUsers, fetchBusinessOptions]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) {
      showNotification('Email address is required.', 'error');
      return;
    }

    if (newRole === 'user' && newBizs.length === 0) {
      showNotification('Please select at least 1 Business for the user.', 'error');
      return;
    }

    try {
      setCreatingUser(true);
      const res = await api.post(apiEndpoints.CREATE_USER, {
        name: newName.trim(),
        email: cleanEmail,
        role: newRole,
        business_groups: newRole === 'admin' ? [] : newGroups,
        businesses: newRole === 'admin' ? [] : newBizs,
      });

      showNotification(`User ${cleanEmail} authorized successfully in Pending Setup status.`, 'success');
      setNewName('');
      setNewEmail('');
      setNewRole('user');
      setNewGroups([]);
      setNewBizs([]);
      setIsAddUserOpen(false);
      fetchUsers();

      if (res.data?.setupLink) {
        setSetupLinkDialog({
          isOpen: true,
          email: cleanEmail,
          link: res.data.setupLink,
          copied: false,
        });
      }
    } catch (err) {
      console.error('Error authorizing user:', err);
      showNotification(err.response?.data?.error || 'Failed to authorize user.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'user');
    setEditStatus(user.status || 'active');
    setEditGroups(Array.isArray(user.business_groups) ? [...user.business_groups] : []);
    setEditBizs(Array.isArray(user.businesses) ? [...user.businesses] : []);
  };

  const handleSavePermissions = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingUser) return;
    if (editRole === 'user' && editBizs.length === 0) {
      showNotification('Please select at least 1 Business for the user.', 'error');
      return;
    }

    try {
      setSavingEdit(true);
      await api.put(apiEndpoints.UPDATE_USER(editingUser._id), {
        name: editName.trim(),
        role: editRole,
        status: editStatus,
        business_groups: editRole === 'admin' ? [] : editGroups,
        businesses: editRole === 'admin' ? [] : editBizs,
      });

      showNotification('User details and permissions updated successfully.', 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      showNotification(err.response?.data?.error || 'Failed to update user details.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const isCurrentUser =
      currentUser?.email &&
      targetUser.email &&
      currentUser.email.toLowerCase() === targetUser.email.toLowerCase();

    if (isCurrentUser) {
      showNotification('You cannot disable your own administrator account.', 'error');
      return;
    }

    const nextStatus = targetUser.status === 'disabled' ? 'active' : 'disabled';
    try {
      setActionLoadingId(targetUser._id);
      await api.put(apiEndpoints.UPDATE_USER(targetUser._id), {
        status: nextStatus,
      });
      showNotification(`Account for ${targetUser.email} has been ${nextStatus === 'disabled' ? 'disabled' : 'activated'}.`, 'success');
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      showNotification(err.response?.data?.error || 'Failed to toggle account status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendInvite = async (targetUser) => {
    try {
      setActionLoadingId(targetUser._id);
      const res = await api.post(apiEndpoints.SEND_INVITE(targetUser._id));
      showNotification(res.data?.message || `Setup instructions sent for ${targetUser.email}.`, 'success');
      if (res.data?.setupLink) {
        setSetupLinkDialog({
          isOpen: true,
          email: targetUser.email,
          link: res.data.setupLink,
          copied: false,
        });
      }
    } catch (err) {
      console.error('Error sending invite:', err);
      showNotification(err.response?.data?.error || 'Failed to generate setup link.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRequestDelete = (u) => {
    const isCurrentUser =
      currentUser?.email &&
      u.email &&
      currentUser.email.toLowerCase() === u.email.toLowerCase();

    if (isCurrentUser) {
      showNotification('You cannot delete your own account.', 'error');
      return;
    }

    setDeleteConfirmState({
      isOpen: true,
      userId: u._id,
      userEmail: u.email,
    });
  };

  const handleConfirmDelete = async () => {
    const { userId, userEmail } = deleteConfirmState;
    if (!userId) return;

    try {
      setActionLoadingId(userId);
      await api.delete(apiEndpoints.DELETE_USER(userId));
      showNotification(`User ${userEmail} deleted successfully.`, 'success');
      setDeleteConfirmState({ isOpen: false, userId: null, userEmail: '' });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification(err.response?.data?.error || 'Failed to delete user.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const email = (u.email || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const status = (u.status || '').toLowerCase();
    const groups = (Array.isArray(u.business_groups) ? u.business_groups : []).join(' ').toLowerCase();
    const bizs = (Array.isArray(u.businesses) ? u.businesses : []).join(' ').toLowerCase();
    return (
      email.includes(q) ||
      name.includes(q) ||
      role.includes(q) ||
      status.includes(q) ||
      groups.includes(q) ||
      bizs.includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (deleteConfirmState.isOpen) {
            setDeleteConfirmState({ isOpen: false, userId: null, userEmail: '' });
          } else if (editingUser) {
            setEditingUser(null);
          } else if (isAddUserOpen) {
            setIsAddUserOpen(false);
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, isAddUserOpen, editingUser, deleteConfirmState, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="fixed inset-0" onClick={onClose} />

        <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[94vh] animate-in zoom-in-95 duration-150">
          {notification && (
            <div className="absolute top-4 right-4 z-50">
              <AppNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(null)}
              />
            </div>
          )}

          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Settings & User Access Control
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Manage accounts, role-based access, and row-level Business Group & Business data visibility
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scroll flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by user, email, business group, or business..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-900 font-medium placeholder-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto custom-scroll">
                <table className="w-full border-collapse text-left text-xs min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-3">Role</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-3">Authorized Data Scope</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                          Loading user directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isCurrentUser =
                          currentUser?.email &&
                          u.email &&
                          currentUser.email.toLowerCase() === u.email.toLowerCase();
                        const isActionBusy = actionLoadingId === u._id;
                        const displayRole = u.role === 'admin' ? 'admin' : 'user';
                        const groups = Array.isArray(u.business_groups) ? u.business_groups : [];
                        const bizs = Array.isArray(u.businesses) ? u.businesses : [];
                        const hasSpecificScope = groups.length > 0 || bizs.length > 0;
                        const userStatus = u.status || 'active';
                        const mustChangePass = Boolean(u.must_change_password);

                        return (
                          <tr key={u._id || u.email} className={`hover:bg-slate-50/80 transition-colors ${userStatus === 'disabled' ? 'bg-slate-50/40 opacity-75' : ''}`}>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${displayRole === 'admin' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                  {(u.name || u.email || 'U').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 truncate">
                                      {u.name || u.email.split('@')[0]}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-400 text-[11px] truncate">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${displayRole === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                              >
                                {displayRole}
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              {userStatus === 'disabled' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                  Disabled
                                </span>
                              ) : mustChangePass || userStatus === 'pending_setup' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200" title="User must configure permanent password on first login">
                                  Pending Setup
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Active
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3 max-w-xs">
                              {displayRole === 'admin' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700">
                                  <Shield className="w-3.5 h-3.5" />
                                  All Business Groups & Businesses (Admin)
                                </span>
                              ) : !hasSpecificScope ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  No Access (0 Businesses)
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {groups.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] font-bold text-slate-400">Groups:</span>
                                      {groups.map((g) => (
                                        <span
                                          key={g}
                                          className="px-1.5 py-0.2 bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-semibold rounded-xs"
                                        >
                                          {cleanLabel(g)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {bizs.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] font-bold text-slate-400">Business:</span>
                                      {bizs.map((b) => (
                                        <span
                                          key={b}
                                          className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium rounded-xs"
                                        >
                                          {b}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isCurrentUser ? (
                                <span className="text-[10px] text-slate-400 italic">—</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Send invite / setup link button */}
                                  <button
                                    type="button"
                                    title="Send or generate password setup link"
                                    disabled={isActionBusy}
                                    onClick={() => handleSendInvite(u)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Toggle active / disabled */}
                                  <button
                                    type="button"
                                    title={userStatus === 'disabled' ? 'Activate User Account' : 'Disable User Account'}
                                    disabled={isActionBusy}
                                    onClick={() => handleToggleStatus(u)}
                                    className={`p-1.5 rounded-md border transition-colors cursor-pointer ${userStatus === 'disabled'
                                      ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                      : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50 border-slate-200 hover:border-amber-200'
                                      }`}
                                  >
                                    {userStatus === 'disabled' ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                                  </button>

                                  {/* Edit scope & details */}
                                  <button
                                    type="button"
                                    title="Edit Scoped Permissions"
                                    disabled={isActionBusy}
                                    onClick={() => handleOpenEdit(u)}
                                    className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Scope</span>
                                  </button>

                                  {/* Delete user */}
                                  <button
                                    type="button"
                                    title="Delete Account"
                                    disabled={isActionBusy}
                                    onClick={() => handleRequestDelete(u)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <UserScopeDialog
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        isEdit={false}
        name={newName}
        setName={setNewName}
        email={newEmail}
        setEmail={setNewEmail}
        role={newRole}
        setRole={setNewRole}
        status="pending_setup"
        setStatus={() => {}}
        groups={newGroups}
        setGroups={setNewGroups}
        bizs={newBizs}
        setBizs={setNewBizs}
        businessOptions={businessOptions}
        cleanLabel={cleanLabel}
        onSubmit={handleCreateUser}
        isSubmitting={creatingUser}
      />

      {/* Edit User Modal */}
      <UserScopeDialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        isEdit={true}
        userEmail={editingUser?.email}
        userName={editingUser?.name}
        name={editName}
        setName={setEditName}
        email={editingUser?.email || ''}
        setEmail={() => {}}
        role={editRole}
        setRole={setEditRole}
        status={editStatus}
        setStatus={setEditStatus}
        groups={editGroups}
        setGroups={setEditGroups}
        bizs={editBizs}
        setBizs={setEditBizs}
        businessOptions={businessOptions}
        cleanLabel={cleanLabel}
        onSubmit={handleSavePermissions}
        isSubmitting={savingEdit}
      />

      {/* Setup Link Modal (Convenience preview when SMTP is in development mode) */}
      {setupLinkDialog.isOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">One-Time Setup Link Generated</h3>
                <p className="text-xs text-slate-500">For user: <strong>{setupLinkDialog.email}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If an SMTP provider is configured, instructions were automatically dispatched. You can also share this single-use link directly with the user to activate their account:
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <code className="text-xs text-blue-900 break-all select-all font-mono">
                {setupLinkDialog.link}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(setupLinkDialog.link);
                  setSetupLinkDialog((prev) => ({ ...prev, copied: true }));
                  setTimeout(() => setSetupLinkDialog((prev) => ({ ...prev, copied: false })), 2000);
                }}
                className="shrink-0 p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                {setupLinkDialog.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSetupLinkDialog({ isOpen: false, email: '', link: '', copied: false })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Revoke and Delete User Account"
        message={`Are you sure you want to permanently remove ${deleteConfirmState.userEmail}? This will revoke their platform authentication and row-level data access permissions.`}
        confirmText="Delete Account"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmState({ isOpen: false, userId: null, userEmail: '' })}
      />
    </>
  );
}
