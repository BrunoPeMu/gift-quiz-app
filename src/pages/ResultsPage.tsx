import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw, Home, Award, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { saveProgress } from '../services/progressService';
import { ShareModal } from '../components/ShareModal';
import type { QuizState, QuizConfig } from '../types';

export default function ResultsPage() {
    const location = useLocation();
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const result = location.state?.result as QuizState;
    const config = location.state?.config as QuizConfig;
    const [showShareModal, setShowShareModal] = useState(false);

    const percentage = result ? Math.round((result.score / result.questions.length) * 100) : 0;
    const isPerfect = percentage === 100;
    const isGood = percentage >= 70;

    useEffect(() => {
        if (!result) return;

        const attempts = result.questions.map((q: any) => {
            const userAnswer = result.answers[q.id];
            let isCorrect = false;
            // Enhanced answer checking logic (case insensitive, trim)
            if (Array.isArray(q.answer)) {
                isCorrect = q.answer.some((a: string | number) => String(a).split('#')[0].trim().toLowerCase() === String(userAnswer).toLowerCase());
            } else {
                isCorrect = String(q.answer).split('#')[0].trim().toLowerCase() === String(userAnswer).toLowerCase();
            }
            return {
                questionId: q.id,
                correct: isCorrect,
                topic: q.topic,
                difficulty: q.difficulty,
                subject: q.subject
            };
        });

        // Only save progress for logged-in users
        if (currentUser && currentUser.uid !== 'guest') {
            saveProgress(currentUser.uid, attempts).catch(console.error);
        }
    }, [result, currentUser]);

    if (!result) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('results.noResults')}</h2>
            <Link to="/" className="btn-primary mt-4">
                {t('common.home', { defaultValue: 'Volver al Inicio' })}
            </Link>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Score Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center mb-8 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>

                <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-slate-50 dark:bg-slate-900/50 ring-8 ring-slate-50 dark:ring-slate-800">
                        {isPerfect ? (
                            <Award className="w-10 h-10 text-yellow-500" />
                        ) : isGood ? (
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        ) : (
                            <Award className="w-10 h-10 text-slate-400" />
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {isPerfect ? '¡Perfecto!' : isGood ? '¡Buen trabajo!' : '¡Sigue practicando!'}
                    </h1>

                    <div className="flex items-baseline justify-center mb-6">
                        <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                            {percentage}%
                        </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        {t('results.summary', { score: result.score, total: result.questions.length })}
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                        <Link
                            to="/config"
                            className="flex items-center justify-center px-4 py-3 rounded-xl border border-transparent text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('results.tryAgain')}
                        </Link>
                        {config && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Compartir
                            </button>
                        )}
                        <Link
                            to="/"
                            className="btn-primary py-3 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            {t('results.home')}
                        </Link>
                    </div>
                </div>
            </div>


            <div className="space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white px-2">
                    {t('results.review')}
                </h2>
                {result.questions.map((q: any) => {
                    const userAnswer = result.answers[q.id];
                    let isCorrect = false;
                    if (Array.isArray(q.answer)) {
                        isCorrect = q.answer.some((a: string | number) => String(a).split('#')[0].trim().toLowerCase() === String(userAnswer).toLowerCase());
                    } else {
                        isCorrect = String(q.answer).split('#')[0].trim().toLowerCase() === String(userAnswer).toLowerCase();
                    }

                    return (
                        <div key={q.id} className={`group bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 duration-200 ${isCorrect
                            ? 'border-slate-200 dark:border-slate-700'
                            : 'border-red-200 dark:border-red-900/30 bg-red-50/10'
                            }`}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-0.5">
                                    {isCorrect ? (
                                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white mb-3 text-lg leading-snug">
                                        {q.text}
                                    </p>

                                    <div className="space-y-2 text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-baseline">
                                            <span className="text-slate-500 dark:text-slate-400 w-24 flex-shrink-0 mb-1 sm:mb-0">
                                                {t('results.yourAnswer')}:
                                            </span>
                                            <span className={`font-semibold break-all ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {String(userAnswer || '-')}
                                            </span>
                                        </div>
                                        {!isCorrect && (
                                            <div className="flex flex-col sm:flex-row sm:items-baseline pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                <span className="text-slate-500 dark:text-slate-400 w-24 flex-shrink-0 mb-1 sm:mb-0">
                                                    {t('results.correctAnswer')}:
                                                </span>
                                                <span className="text-green-700 dark:text-green-400 font-semibold break-all">
                                                    {Array.isArray(q.answer)
                                                        ? q.answer.map((a: string | number) => String(a).split('#')[0].trim()).join(' / ')
                                                        : String(q.answer).split('#')[0].trim()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {config && result && currentUser && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    config={config}
                    questions={result.questions}
                    creatorId={currentUser.uid}
                />
            )}
        </div>
    );
}
