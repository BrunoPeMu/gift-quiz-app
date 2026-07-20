import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Cookie, Crown, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LEGAL_VERSION, LEGAL_URLS, shouldReaccept } from '../config/legal';

export default function CookieConsentModal() {
    const { userProfile, updateUserProfile } = useAuth();
    const [showDetails, setShowDetails] = useState(false);
    
    const hasActiveSubscription = userProfile?.subscription?.status === 'active' || userProfile?.isPremium || userProfile?.tier === 'pro';
    const needsCookiesConsent = shouldReaccept(!!userProfile?.cookiesAccepted, userProfile?.cookiesAcceptedVersion);
    
    if (hasActiveSubscription || !needsCookiesConsent) return null;

    const handleAcceptCookies = async () => {
        await updateUserProfile({
            cookiesAccepted: true,
            cookiesAcceptedAt: Date.now(),
            cookiesAcceptedVersion: LEGAL_VERSION,
            personalizedAds: true,
        });
    };

    const handleRejectCookies = async () => {
        await updateUserProfile({
            cookiesAccepted: true,
            cookiesAcceptedAt: Date.now(),
            cookiesAcceptedVersion: LEGAL_VERSION,
            personalizedAds: false,
        });
    };

    const handleSubscribe = async () => {
        await updateUserProfile({
            cookiesAccepted: true,
            cookiesAcceptedAt: Date.now(),
            cookiesAcceptedVersion: LEGAL_VERSION,
            personalizedAds: true,
        });
        window.location.href = '/?showPricing=true';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Cookie className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Cookies y Publicidad
                    </h2>
                    
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Para continuar usando FlashTests, debes elegir una opción:
                    </p>
                    <div className="mb-5 flex flex-wrap justify-center gap-3 text-[11px] text-slate-400">
                        <Link to={LEGAL_URLS.cookies} className="hover:text-indigo-400 underline-offset-4 hover:underline">
                            Política de Cookies
                        </Link>
                        <Link to={LEGAL_URLS.privacy} className="hover:text-indigo-400 underline-offset-4 hover:underline">
                            Privacidad
                        </Link>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                        {/* Option 1: Accept Cookies */}
                        <button
                            onClick={handleAcceptCookies}
                            className="w-full p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors text-left"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Aceptar cookies</h3>
                                    <p className="text-xs text-slate-500">Publicidad personalizada + 3 créditos IA/día</p>
                                </div>
                                <Cookie className="w-5 h-5 text-indigo-500" />
                            </div>
                        </button>

                        {/* Option 2: Reject non-essential cookies */}
                        <button
                            onClick={handleRejectCookies}
                            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors text-left"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Solo cookies necesarias</h3>
                                    <p className="text-xs text-slate-500">Tests manuales sin IA ni publicidad personalizada</p>
                                </div>
                                <XCircle className="w-5 h-5 text-slate-400" />
                            </div>
                        </button>
                        
                        {/* Option 3: Subscribe */}
                        <button
                            onClick={handleSubscribe}
                            className="w-full p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 hover:border-amber-500 dark:hover:border-amber-500 transition-colors text-left bg-amber-50 dark:bg-amber-900/10"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Crown className="w-4 h-4 text-amber-500" />
                                        Suscribirse
                                    </h3>
                                    <p className="text-xs text-slate-500">Sin publicidad + créditos ilimitados</p>
                                </div>
                                <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                                    PRO
                                </span>
                            </div>
                        </button>
                    </div>
                    
                    {/* Details toggle */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-slate-500 hover:text-indigo-500 underline"
                    >
                        {showDetails ? 'Ocultar detalles' : 'Ver detalles de cookies'}
                    </button>
                    
                    {showDetails && (
                        <div className="mt-4 text-xs text-slate-500 text-left space-y-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                            <p><strong>Cookies necesarias:</strong> Para el funcionamiento básico (login, sesión).</p>
                            <p><strong>Cookies de análisis:</strong> Para entender cómo usas la app y mejorarla.</p>
                            <p><strong>Cookies de publicidad:</strong> Para mostrar anuncios relevantes (Google AdSense).</p>
                            <p className="mt-2">Si te suscribes, no necesitas aceptar cookies publicitarias. El plan PRO incluye sin publicidad.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
