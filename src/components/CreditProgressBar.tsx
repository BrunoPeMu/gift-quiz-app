import { Sparkles } from 'lucide-react';

interface CreditProgressBarProps {
    current: number;
    max: number;
    label?: string;
    variant?: 'default' | 'compact';
}

export function CreditProgressBar({ current, max, label, variant = 'default' }: CreditProgressBarProps) {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const isLow = percentage <= 20;
    const isMedium = percentage > 20 && percentage <= 50;

    const barColor = isLow
        ? 'bg-red-500 dark:bg-red-400'
        : isMedium
            ? 'bg-amber-500 dark:bg-amber-400'
            : 'bg-indigo-500 dark:bg-indigo-400';

    const bgColor = isLow
        ? 'bg-red-100 dark:bg-red-900/30'
        : isMedium
            ? 'bg-amber-100 dark:bg-amber-900/30'
            : 'bg-indigo-100 dark:bg-indigo-900/30';

    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${bgColor}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                    {current}/{max}
                </span>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {label ?? 'Créditos IA'}
                    </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {current} <span className="text-slate-400 font-normal">/ {max}</span>
                </span>
            </div>
            <div className={`h-2.5 rounded-full ${bgColor}`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {isLow
                    ? `Te quedan solo ${current} generaciones`
                    : isMedium
                        ? `Te quedan ${current} generaciones este mes`
                        : `${current} generaciones disponibles este mes`}
            </p>
        </div>
    );
}
