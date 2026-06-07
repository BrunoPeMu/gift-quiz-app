import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export function AdBanner({ className = '' }: { className?: string }) {
    const { t } = useTranslation();
    const { userProfile } = useAuth();

    // Don't show ads if user is premium
    if (userProfile?.isPremium) {
        return null;
    }

    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div className={`w-full flex justify-center my-4 ${className}`}>
            {/* Responsive Ad Unit */}
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-6507952865569841"
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>

            {/* Fallback/Test Label (Visible only if ad fails to load in dev or adblock) */}
            <div className="hidden">
                <p className="text-xs text-slate-400">{t('ad.sponsored', { defaultValue: 'Sponsored' })}</p>
            </div>
        </div>
    );
}
