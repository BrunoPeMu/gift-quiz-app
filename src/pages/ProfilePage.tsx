import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { User, Shield, Check, X, Loader2, Save } from 'lucide-react';

export default function ProfilePage() {
    const { userProfile, updateUserProfile, checkUsernameAvailability } = useAuth();
    const { t } = useTranslation();

    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [username, setUsername] = useState(userProfile?.username || '');
    const [bio, setBio] = useState(userProfile?.bio || '');

    // Username validation state
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sync state if userProfile loads late
    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setUsername(userProfile.username || '');
            setBio(userProfile.bio || '');
        }
    }, [userProfile]);

    const handleUsernameChange = async (val: string) => {
        const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Only allow lowercase alphanumeric + underscore
        setUsername(cleaned);
        setUsernameAvailable(null);
        setUsernameError('');

        if (cleaned.length < 3) {
            setUsernameError('Min 3 chars');
            return;
        }

        if (cleaned === userProfile?.username) {
            return; // Same as current is always valid
        }

        setIsCheckingUsername(true);
        try {
            const isAvailable = await checkUsernameAvailability(cleaned);
            setUsernameAvailable(isAvailable);
            if (!isAvailable) setUsernameError('Username taken');
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (usernameError || (username && usernameAvailable === false)) {
            return;
        }

        setIsSaving(true);
        setMsg(null);

        try {
            await updateUserProfile({
                displayName,
                username,
                bio
            });
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error("Save error:", error);
            setMsg({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!userProfile) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="heading-1">{t('profile.title', { defaultValue: 'Edit Profile' })}</h1>

            <div className="card p-6">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Role Badge */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${userProfile.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted">Current Role</p>
                                <p className="font-semibold capitalize text-slate-900 dark:text-white flex items-center gap-2">
                                    {userProfile.role}
                                    {userProfile.isAdmin && <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Legacy Admin</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">Display Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="input-field pl-10"
                                placeholder="Your Name"
                            />
                        </div>
                    </div>

                    {/* Username (Handle) */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">Username (Handle)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                className={`input-field pl-8 ${usernameError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' :
                                        usernameAvailable ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : ''
                                    }`}
                                placeholder="username"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isCheckingUsername ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                ) : username && username !== userProfile.username ? (
                                    usernameAvailable ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <X className="w-4 h-4 text-red-500" />
                                    )
                                ) : null}
                            </div>
                        </div>
                        {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
                        <p className="text-xs text-muted mt-1">Unique handle for your profile URL.</p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="input-field"
                            rows={3}
                            placeholder="Tell us a bit about yourself..."
                        />
                    </div>

                    {/* Submit */}
                    <div className="pt-4 flex items-center justify-between">
                        {msg ? (
                            <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {msg.text}
                            </p>
                        ) : <div></div>}

                        <button
                            type="submit"
                            disabled={isSaving || !!usernameError}
                            className="btn-primary flex items-center disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
