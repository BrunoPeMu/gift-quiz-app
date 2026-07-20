import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const AD_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-6507952865569841';
const AD_SLOT = import.meta.env.VITE_ADSENSE_SLOT_ID || '1234567890';

export function AdBanner({ className = '' }: { className?: string }) {
    const { t } = useTranslation();
    const { userProfile } = useAuth();
    const isPremium = userProfile?.tier === 'basic' || userProfile?.tier === 'pro';
    const isPersonalized = userProfile?.personalizedAds !== false;

    useEffect(() => {
        if (isPremium) return;
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, [isPremium]);

    if (isPremium) {
        return null;
    }

    if (AD_SLOT === '1234567890') {
        return (
            <div className={`w-full flex justify-center my-2 ${className}`}>
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-xs text-slate-400 dark:text-slate-500">
                    {t('ad.sponsored', { defaultValue: 'Sponsored' })}
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full flex justify-center my-2 ${className}`}>
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={AD_CLIENT}
                data-ad-slot={AD_SLOT}
                data-ad-format="auto"
                data-full-width-responsive="true"
                {...(!isPersonalized && { 'data-npa-on-unknown-consent': 'true' })}
            ></ins>
        </div>
    );
}
