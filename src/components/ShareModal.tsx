import { useState } from 'react';
import { Copy, Check, X, Share2, Link } from 'lucide-react';
import { shareQuiz } from '../services/shareService';
import type { QuizConfig, Question } from '../types';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: QuizConfig;
    questions: Question[];
    creatorId: string;
}

export function ShareModal({ isOpen, onClose, config, questions, creatorId }: ShareModalProps) {
    const [shareUrl, setShareUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        try {
            const shareId = await shareQuiz(config, questions, creatorId);
            const url = `${window.location.origin}/share/${shareId}`;
            setShareUrl(url);
        } catch (err) {
            setError('Error al generar el enlace. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Compartir Quiz</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Tema</span>
                            <p className="font-medium text-slate-900 dark:text-white truncate">{config.topic}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Dificultad</span>
                            <p className="font-medium text-slate-900 dark:text-white capitalize">{config.difficulty}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Preguntas</span>
                            <p className="font-medium text-slate-900 dark:text-white">{questions.length}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">Modo</span>
                            <p className="font-medium text-slate-900 dark:text-white capitalize">{config.mode}</p>
                        </div>
                    </div>
                </div>

                {!shareUrl ? (
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Link className="w-4 h-4" />
                        )}
                        {loading ? 'Generando enlace...' : 'Generar Enlace Compartible'}
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-3">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none min-w-0"
                            />
                            <button
                                onClick={handleCopy}
                                className="flex-shrink-0 p-2 bg-white dark:bg-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Copy className="w-4 h-4 text-slate-500" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                            {copied ? '¡Enlace copiado!' : 'Copia el enlace para compartirlo con quien quieras'}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
                )}
            </div>
        </div>
    );
}
