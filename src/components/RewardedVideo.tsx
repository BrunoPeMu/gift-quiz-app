
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, X, Loader2 } from 'lucide-react';

interface RewardedVideoProps {
    isOpen: boolean;
    onClose: () => void;
    onReward: () => void;
}

export function RewardedVideo({ isOpen, onClose, onReward }: RewardedVideoProps) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState(5);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft(5);
            setCanClose(false);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanClose(true);
                    onReward();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, onReward]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden relative shadow-2xl">

                {/* Header / Timer */}
                <div className="absolute top-4 right-4 z-10">
                    {canClose ? (
                        <button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-mono border border-white/10 flex items-center">
                            <span className="mr-2">Ad</span>
                            {timeLeft}s
                        </div>
                    )}
                </div>

                {/* Mock Video Content */}
                <div className="aspect-video bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center text-white p-8 text-center">
                    <Play className="w-16 h-16 mb-4 animate-pulse opacity-50" />
                    <h3 className="text-2xl font-bold mb-2">Amazing Product™</h3>
                    <p className="text-slate-300">This is a simulation of a Rewarded Video Ad.</p>
                    <p className="text-xs text-slate-500 mt-8">Provider: Internal Mock Adapter</p>
                </div>

                {/* Footer */}
                <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        Reward: +1 Credit
                    </div>
                    {!canClose && (
                        <div className="flex items-center text-xs text-indigo-400">
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                            {t('ad.watching', { defaultValue: 'Watching to earn reward...' })}
                        </div>
                    )}
                    {canClose && (
                        <div className="text-xs text-green-400 font-medium">
                            {t('ad.rewarded', { defaultValue: 'Reward Earned!' })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
