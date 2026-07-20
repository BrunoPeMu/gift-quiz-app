import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, AlertCircle, Share2, Target, HelpCircle, Shuffle, Copy, Check } from 'lucide-react';
import { getSharedQuiz } from '../services/shareService';
import type { SharedQuiz } from '../types';

export default function SharePage() {
    const { shareId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [quiz, setQuiz] = useState<SharedQuiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!shareId) return;

        getSharedQuiz(shareId)
            .then(data => {
                if (data) {
                    setQuiz(data);
                } else {
                    setError(t('share.notFound', { defaultValue: 'Quiz not found' }));
                }
            })
            .catch(err => {
                console.error(err);
                setError(t('share.error', { defaultValue: 'Error loading quiz' }));
            })
            .finally(() => setLoading(false));
    }, [shareId]);

    const handleStart = () => {
        if (!quiz) return;
        navigate('/quiz', {
            state: {
                config: quiz.config,
                questions: quiz.questions // Pass explicit questions
            }
        });
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('share.errorTitle', { defaultValue: 'Oops!' })}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="w-full btn-secondary"
                >
                    {t('common.home', { defaultValue: 'Volver al Inicio' })}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 px-4 sm:px-0">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg mb-6 transform rotate-3">
                    <Share2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {t('share.ready', { defaultValue: '¿Listo para el reto?' })}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Te han invitado a completar este quiz
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <Target className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">{t('config.topic')}</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{quiz.config.topic}</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <Shuffle className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">{t('config.difficulty')}</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white capitalize">{quiz.config.difficulty}</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <HelpCircle className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">{t('config.count')}</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white">{quiz.questions.length} Preguntas</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <Share2 className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">{t('config.mode')}</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white capitalize">{quiz.config.mode}</p>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleStart}
                className="w-full btn-primary py-4 text-lg rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center group"
            >
                <Play className="w-5 h-5 mr-2 fill-current group-hover:scale-110 transition-transform" />
                {t('share.start', { defaultValue: 'Empezar Quiz Ahora' })}
            </button>

            <button
                onClick={handleCopyLink}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4 text-green-500" />
                        ¡Enlace copiado!
                    </>
                ) : (
                    <>
                        <Copy className="w-4 h-4" />
                        Copiar enlace
                    </>
                )}
            </button>

            <p className="text-center mt-6 text-sm text-slate-400">
                Al continuar, aceptarás comenzar la sesión inmediatamente.
            </p>
        </div>
    );
}
