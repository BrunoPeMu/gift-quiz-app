import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, Loader } from 'lucide-react';

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { loginWithGoogle, loginWithGoogleRedirect, loginWithEmail, registerWithEmail } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            await loginWithGoogle();
            navigate('/');
        } catch (err: any) {
            console.error("Popup login error", err);
            // Fallback to redirect if popup is blocked or closed
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                try {
                    await loginWithGoogleRedirect();
                    // Redirect happens, no need to navigate
                } catch (redirectErr: any) {
                    setError(redirectErr.message || 'Failed to login with Google (Redirect)');
                    setLoading(false);
                }
            } else {
                setError(err.message || 'Failed to login with Google');
                setLoading(false);
            }
        }
    };



    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isRegistering) {
                if (!name.trim()) throw new Error('Name is required');
                if (!termsChecked) throw new Error(t('auth.termsRequired', { defaultValue: 'You must accept the terms and conditions' }));
                await registerWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
            navigate('/');
        } catch (err: any) {
            // Map common Firebase errors to user friendly messages
            if (err.code === 'auth/email-already-in-use') {
                setError(t('auth.errorEmailInUse', { defaultValue: 'This email is already registered.' }));
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError(t('auth.errorInvalidCredential', { defaultValue: 'Account not found or incorrect password. Please Sign Up if you are new.' }));
            } else if (err.code === 'auth/weak-password') {
                setError(t('auth.errorWeakPassword', { defaultValue: 'Password should be at least 6 characters.' }));
            } else {
                setError(err.message || t('auth.errorGeneric', { defaultValue: 'Authentication failed' }));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {isRegistering ? t('auth.createAccount', { defaultValue: 'Create Account' }) : t('auth.welcomeBack', { defaultValue: 'Welcome Back' })}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isRegistering ? t('auth.joinMessage', { defaultValue: 'Start creating amazing quizzes today' }) : t('auth.loginMessage', { defaultValue: 'Sign in to access your quizzes' })}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg flex items-center text-sm">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26+-.19-.58z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        {t('auth.continueWithGoogle', { defaultValue: 'Continue with Google' })}
                    </button>


                </div>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                            {t('auth.or', { defaultValue: 'Or continue with email' })}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('auth.name', { defaultValue: 'Name' })}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('auth.email', { defaultValue: 'Email' })}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('auth.password', { defaultValue: 'Password' })}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {isRegistering && (
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={termsChecked}
                                onChange={(e) => setTermsChecked(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                {t('auth.acceptTerms', { defaultValue: 'He leído y acepto los ' })}
                                <a href="/terms" target="_blank" className="text-indigo-600 hover:text-indigo-500 underline">
                                    {t('auth.termsLink', { defaultValue: 'términos de uso' })}
                                </a>
                            </span>
                        </label>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            isRegistering ? t('auth.signUp', { defaultValue: 'Sign Up' }) : t('auth.signIn', { defaultValue: 'Sign In' })
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isRegistering ? t('auth.haveAccount', { defaultValue: 'Already have an account?' }) : t('auth.noAccount', { defaultValue: 'Don\'t have an account?' })}{' '}
                        <button
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError(null);
                            }}
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            {isRegistering ? t('auth.signIn', { defaultValue: 'Sign In' }) : t('auth.signUp', { defaultValue: 'Sign Up' })}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
