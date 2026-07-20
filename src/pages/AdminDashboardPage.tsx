import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, updateUserStatus } from '../services/adminService';
import type { UserProfile } from '../types';
import { Shield, Search, RefreshCw } from 'lucide-react';

export default function AdminDashboardPage() {
    const { userProfile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserUpdate = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await updateUserStatus(uid, {
                ...data,
                // Ensure we handle boolean flags if the partial data includes subscription changes
                isPremium: data.isPremium,
                isAdmin: data.isAdmin
            });
            // Update local state
            setUsers(users.map(u => u.uid === uid ? { ...u, ...data } : u));
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to update user");
        }
    };

    const handleTogglePremium = async (uid: string, currentStatus: boolean) => {
        handleUserUpdate(uid, { isPremium: !currentStatus });
    };

    const handleToggleAdmin = async (uid: string, currentStatus: boolean) => {
        if (!confirm("Are you sure you want to toggle Admin status?")) return;
        handleUserUpdate(uid, { isAdmin: !currentStatus });
    };

    if (!userProfile?.isAdmin) {
        return <div className="p-8 text-center text-red-600">Access Denied</div>;
    }

    const filteredUsers = users.filter(u =>
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-8 h-8 text-purple-500" />
                    Admin Dashboard
                    <button
                        onClick={loadUsers}
                        className="ml-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </h1>
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">Loading users...</div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-slate-900/60 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.uid}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                {user.photoURL ? (
                                                    <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                        {user.displayName?.[0] || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-white">{user.displayName}</div>
                                                <div className="text-sm text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.isAdmin ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.isPremium ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                Premium
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                                                Free
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleTogglePremium(user.uid, !!user.isPremium)}
                                            className={`text-xs px-3 py-1 rounded border ${user.isPremium ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                        >
                                            {user.isPremium ? 'Remove Premium' : 'Grant Premium'}
                                        </button>
                                        <button
                                            onClick={() => handleToggleAdmin(user.uid, !!user.isAdmin)}
                                            className="text-xs text-slate-400 hover:text-indigo-600 ml-2"
                                            title="Toggle Admin"
                                        >
                                            <Shield className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedUser(user)}
                                            className="text-xs text-purple-400 hover:text-purple-300 ml-2 font-medium"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdate={handleUserUpdate}
                />
            )}
        </div>
    );
}

function UserDetailModal({ user, onClose, onUpdate }: { user: UserProfile, onClose: () => void, onUpdate: (uid: string, data: Partial<UserProfile>) => Promise<void> }) {
    const [formData, setFormData] = useState({
        role: user.isAdmin ? 'admin' as string : (user.role || 'user'),
        plan: (user.subscription?.plan || 'free') as string,
        status: user.subscription?.status || 'active',
        renewalDate: user.subscription?.renewalDate ? new Date(user.subscription.renewalDate).toISOString().split('T')[0] : '',
        notes: user.adminNotes || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: Partial<UserProfile> = {
                role: formData.role as any,
                isAdmin: formData.role === 'admin',
                isPremium: formData.plan !== 'free',
                tier: formData.plan === 'free' ? 'free' : formData.plan === 'basic' ? 'basic' : 'pro',
                adminNotes: formData.notes,
                subscription: {
                    ...user.subscription,
                    plan: formData.plan as any,
                    status: formData.status as any,
                    renewalDate: formData.renewalDate ? new Date(formData.renewalDate).getTime() : undefined,
                    provider: user.subscription?.provider || 'manual'
                }
            };
            await onUpdate(user.uid, updates);
            onClose();
        } catch (e) {
            alert('Error saving user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <p className="text-xs text-slate-500 mt-1">UID: {user.uid}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Role Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">System Role</h3>
                        <div className="flex gap-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="user"
                                    checked={formData.role === 'user'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>User</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="role"
                                    value="admin"
                                    checked={formData.role === 'admin'}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-medium text-purple-600">Administrator</span>
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                            Subscription & Billing
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Manual Management</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
                                <select
                                    value={formData.plan}
                                    onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="free">Free</option>
                                    <option value="basic">Basic (30 gen/mes)</option>
                                    <option value="monthly">Monthly → PRO</option>
                                    <option value="annual">Annual → PRO</option>
                                    <option value="lifetime">Lifetime → PRO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="canceled">Canceled</option>
                                    <option value="expired">Expired</option>
                                    <option value="trialing">Trial / Grace Period</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Renewal / Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.renewalDate}
                                    onChange={e => setFormData({ ...formData, renewalDate: e.target.value })}
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Admin Notes</h3>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            placeholder="Add private notes about this user (e.g. 'Gifted premium for testing')..."
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
