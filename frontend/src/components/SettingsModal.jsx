import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Search, RefreshCw, KeyRound, UserPlus, Plus, Building2, Check, Edit3, Shield } from 'lucide-react';
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
  email,
  setEmail,
  role,
  setRole,
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
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150 max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
              {isEdit ? <Edit3 className="w-4.5 h-4.5" /> : <UserPlus className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
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
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 flex-1 overflow-y-auto custom-scroll flex flex-col gap-4">
          <div className={`grid gap-3.5 ${isEdit ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@niit.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
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
                  Select at least 1 business unit
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Authorized Business Groups (Segments)
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
                          className={`px-3 py-1.5 text-xs rounded-xs border transition-all font-semibold cursor-pointer ${isSelected
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
                      Authorized Businesses (Biz Units)
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
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-xs border transition-all cursor-pointer ${isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
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

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
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
              {isEdit ? 'Save Permissions' : 'Authorize User'}
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
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newGroups, setNewGroups] = useState([]);
  const [newBizs, setNewBizs] = useState([]);
  const [creatingUser, setCreatingUser] = useState(false);

  // Business options state
  const [businessOptions, setBusinessOptions] = useState({ groups: [], businesses: [], hierarchy: [] });

  // Dedicated Edit Permissions modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('user');
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
    }
  }, [isOpen, fetchUsers, fetchBusinessOptions]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      showNotification('Email address is required.', 'error');
      return;
    }

    if (newRole === 'user' && newBizs.length === 0) {
      showNotification('Please select at least 1 Business Unit for the user.', 'error');
      return;
    }

    try {
      setCreatingUser(true);
      await api.post(apiEndpoints.CREATE_USER, {
        email: newEmail.trim().toLowerCase(),
        name: '',
        role: newRole,
        business_groups: newRole === 'admin' ? [] : newGroups,
        businesses: newRole === 'admin' ? [] : newBizs,
      });

      showNotification(`User ${newEmail.trim()} authorized successfully.`, 'success');
      setNewEmail('');
      setNewRole('user');
      setNewGroups([]);
      setNewBizs([]);
      setIsAddUserOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error authorizing user:', err);
      showNotification(err.response?.data?.error || 'Failed to authorize user.', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditRole(user.role || 'user');
    setEditGroups(Array.isArray(user.business_groups) ? [...user.business_groups] : []);
    setEditBizs(Array.isArray(user.businesses) ? [...user.businesses] : []);
  };

  const handleSavePermissions = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingUser) return;
    if (editRole === 'user' && editBizs.length === 0) {
      showNotification('Please select at least 1 Business Unit for the user.', 'error');
      return;
    }

    try {
      setSavingEdit(true);
      await api.put(apiEndpoints.UPDATE_USER(editingUser._id), {
        role: editRole,
        business_groups: editRole === 'admin' ? [] : editGroups,
        businesses: editRole === 'admin' ? [] : editBizs,
      });

      showNotification(`Permissions updated for ${editingUser.email}.`, 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating permissions:', err);
      showNotification(err.response?.data?.error || 'Failed to update permissions.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const promptDeleteUser = (userId, userEmail) => {
    setDeleteConfirmState({
      isOpen: true,
      userId,
      userEmail,
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
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.business_groups || []).some((g) => g.toLowerCase().includes(q)) ||
      (u.businesses || []).some((b) => b.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      {notification && (
        <AppNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        title="Delete User Access"
        message={`Are you sure you want to permanently delete ${deleteConfirmState.userEmail}? This will remove all their dashboard and platform permissions.`}
        confirmText="Delete User"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoadingId === deleteConfirmState.userId}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmState({ isOpen: false, userId: null, userEmail: '' })}
      />

      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh] z-10 animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
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
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scroll flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user, email, business group, or business..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-900 font-medium placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="px-3 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add User
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Authorized Data Scope</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading user directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
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

                      return (
                        <tr key={u._id || u.email} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {(u.name || u.email || 'U').substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 truncate">
                                  {u.name || u.email.split('@')[0]}
                                  {isCurrentUser && (
                                    <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                                      You
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-400 text-[11px] truncate">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${displayRole === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                              {displayRole}
                            </span>
                          </td>

                          <td className="py-3 px-3 max-w-xs">
                            {displayRole === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700">
                                <Shield className="w-3.5 h-3.5" />
                                All Business Groups (Admin)
                              </span>
                            ) : !hasSpecificScope ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                No Access (0 Business Units)
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
                                    <span className="text-[10px] font-bold text-slate-400">Biz:</span>
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

                          <td className="py-3 px-4 text-right">
                            {isCurrentUser ? (
                              <span className="text-[10px] text-slate-400 italic">—</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => handleOpenEdit(u)}
                                  className="px-2 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Scope
                                </button>
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => promptDeleteUser(u._id, u.email)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-colors cursor-pointer"
                                  title="Delete user"
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

      <UserScopeDialog
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        isEdit={false}
        email={newEmail}
        setEmail={setNewEmail}
        role={newRole}
        setRole={setNewRole}
        groups={newGroups}
        setGroups={setNewGroups}
        bizs={newBizs}
        setBizs={setNewBizs}
        businessOptions={businessOptions}
        cleanLabel={cleanLabel}
        onSubmit={handleCreateUser}
        isSubmitting={creatingUser}
      />

      <UserScopeDialog
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        isEdit={true}
        userEmail={editingUser?.email || ''}
        userName={editingUser?.name || ''}
        role={editRole}
        setRole={setEditRole}
        groups={editGroups}
        setGroups={setEditGroups}
        bizs={editBizs}
        setBizs={setEditBizs}
        businessOptions={businessOptions}
        cleanLabel={cleanLabel}
        onSubmit={handleSavePermissions}
        isSubmitting={savingEdit}
      />
    </div>
  );
}
