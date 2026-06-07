import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, Layers, LogIn, User, Layout, Menu, X, Shield, Sun, Moon, Languages, Palette, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Navbar() {
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { currentUser, logout, userProfile, updateUserProfile } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', label: t('nav.home', { defaultValue: 'Inicio' }), icon: Layout },
        { path: '/setup', label: t('nav.takeQuiz', { defaultValue: 'Test' }), icon: BookOpen },
        { path: '/upload', label: t('nav.upload', { defaultValue: 'Crear' }), icon: Upload },
        { path: '/manage', label: t('nav.manage', { defaultValue: 'Contenido' }), icon: Layers },
    ];

    if (userProfile?.isAdmin) {
        navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
    }

    const toggleLanguage = () => {
        const newLang = i18n.language === 'es' ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    return (
        <nav className="bg-slate-900/40 backdrop-blur-xl border-b border-white/10 shadow-sm relative z-50">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-indigo-600">FlashTests</span>
                        </div>
                        <div className="hidden md:ml-6 md:flex md:space-x-4 lg:space-x-8">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'border-indigo-500 text-white'
                                                : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-200'
                                        )}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>


                    {/* Desktop User Menu & Dropdown */}
                    <div className="hidden md:flex items-center ml-2">
                        {currentUser ? (
                            <div className="relative flex items-center gap-4">
                                {/* Credits Display (Desktop) */}
                                <div className="hidden lg:flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                    <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
                                    <span>{userProfile?.tier === 'pro' ? '∞' : (userProfile?.credits ?? 0)}</span>
                                </div>

                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center space-x-2 text-slate-700 hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                                >
                                    {currentUser.photoURL ? (
                                        <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start leading-tight text-left mr-1">
                                        <span className="font-semibold text-sm">{currentUser.displayName?.split(' ')[0] || 'User'}</span>
                                        {userProfile?.username && <span className="text-[10px] text-slate-500 font-medium tracking-wide">@{userProfile.username}</span>}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 mb-2">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUser.displayName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                                            </div>

                                            <Link
                                                to="/profile"
                                                className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4 mr-3" />
                                                {t('dashboard.editProfile')}
                                            </Link>

                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                                            {/* Theme Toggle Item */}
                                            <button
                                                onClick={() => {
                                                    const currentTheme = userProfile?.preferences?.theme || 'system';
                                                    let nextTheme: 'light' | 'dark' | 'system' = 'light';
                                                    if (currentTheme === 'system') {
                                                        nextTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
                                                    } else {
                                                        nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
                                                    }
                                                    updateUserProfile({ preferences: { ...userProfile?.preferences, theme: nextTheme } });
                                                }}
                                                className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                <Palette className="w-4 h-4 mr-3" />
                                                <span className="flex-grow text-left">{t('dashboard.theme')}</span>
                                                {userProfile?.preferences?.theme === 'dark' || (userProfile?.preferences?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? (
                                                    <Moon className="w-3.5 h-3.5 ml-2 text-slate-400" />
                                                ) : (
                                                    <Sun className="w-3.5 h-3.5 ml-2 text-slate-400" />
                                                )}
                                            </button>

                                            {/* Language Toggle Item */}
                                            <button
                                                onClick={toggleLanguage}
                                                className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                <Languages className="w-4 h-4 mr-3" />
                                                <span className="flex-grow text-left">{t('common.language', { defaultValue: 'Language' })}</span>
                                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                                                    {i18n.language.split('-')[0].toUpperCase()}
                                                </span>
                                            </button>

                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setIsProfileMenuOpen(false);
                                                }}
                                                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4 mr-3" />
                                                {t('nav.logout')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                <LogIn className="w-5 h-5" />
                                <span>{t('nav.login', { defaultValue: 'Login' })}</span>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMobileMenuOpen ? (
                                <X className="block w-6 h-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block w-6 h-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-lg">
                    <div className="pt-2 pb-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center px-4 py-3 text-base font-medium border-l-4 transition-colors',
                                        isActive
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                            : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'
                                    )}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="pt-4 pb-4 border-t border-slate-200">
                        {currentUser ? (
                            <div className="px-4 space-y-4">
                                {/* Credits Display (Mobile) */}
                                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <div className="flex items-center text-indigo-700 dark:text-indigo-300 font-medium">
                                        <Sparkles className="w-5 h-5 mr-3 text-indigo-500" />
                                        <span>{t('Credits', { defaultValue: 'Créditos' })}</span>
                                    </div>
                                    <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {userProfile?.tier === 'pro' ? '∞' : (userProfile?.credits ?? 0)}
                                    </span>
                                </div>

                                <Link
                                    to="/profile"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center w-full"
                                >
                                    {currentUser.photoURL ? (
                                        <img src={currentUser.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                            <User className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-slate-800 dark:text-white">{currentUser.displayName || 'Guest'}</div>
                                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('dashboard.viewProfile', { defaultValue: 'View Profile' })}</div>
                                    </div>
                                </Link>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            const currentTheme = userProfile?.preferences?.theme || 'system';
                                            let nextTheme: 'light' | 'dark' | 'system' = 'light';
                                            if (currentTheme === 'system') {
                                                nextTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
                                            } else {
                                                nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
                                            }
                                            updateUserProfile({ preferences: { ...userProfile?.preferences, theme: nextTheme } });
                                        }}
                                        className="flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        <Palette className="w-4 h-4 mr-2" />
                                        {t('dashboard.theme')}
                                    </button>

                                    <button
                                        onClick={toggleLanguage}
                                        className="flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        <Languages className="w-4 h-4 mr-2" />
                                        {i18n.language.toUpperCase()}
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('nav.logout')}
                                </button>
                            </div>
                        ) : (
                            <div className="px-4">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex w-full items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <LogIn className="w-5 h-5 mr-2" />
                                    {t('nav.login', { defaultValue: 'Login' })}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
