import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getQuestions, updateQuestion } from '../services/questionService';
import { selectQuestions } from '../lib/quizEngine';
import type { QuizConfig, QuizState, Question } from '../types';

import { useAuth } from '../contexts/AuthContext';
import { getLocalUserId } from '../services/progressService';

export default function QuizPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const config = location.state?.config as QuizConfig;

    const [state, setState] = useState<QuizState>({
        questions: [],
        currentIndex: 0,
        answers: {},
        score: 0,
        isFinished: false
    });
    const [loading, setLoading] = useState(true);
    const [showFeedback, setShowFeedback] = useState(false);
    const [shortAnswerText, setShortAnswerText] = useState('');

    useEffect(() => {
        if (!config) {
            navigate('/config');
            return;
        }

        async function initQuiz() {
            // Check if questions were passed in state (from SharePage)
            const preSelectedQuestions = location.state?.questions as Question[] | undefined;

            if (preSelectedQuestions && preSelectedQuestions.length > 0) {
                setState(s => ({ ...s, questions: preSelectedQuestions, answers: {}, score: 0, currentIndex: 0 }));
                setLoading(false);
                return;
            }

            // Otherwise, load and select normally
            // Use current user or fallback to local ID (though for guests getQuestions might return empty if using Firestore)
            // But ConfigPage also uses getLocalUserId, so we match that logic.
            const userId = currentUser?.uid || getLocalUserId();
            const allQuestions = await getQuestions(userId, config.topic === 'All' ? undefined : config.topic);
            const selected = selectQuestions(allQuestions, config);
            setState(s => ({ ...s, questions: selected, answers: {}, score: 0, currentIndex: 0 }));
            setLoading(false);
        }
        initQuiz();
    }, [config, navigate, location.state]);

    const handleAnswer = (answer: any) => {
        const currentQ = state.questions[state.currentIndex];
        let isCorrect = false;
        let points = 0;

        if (currentQ.type === 'TF') {
            isCorrect = answer === currentQ.answer;
        } else if (currentQ.type === 'MC') {
            // Strip feedback from stored answer just in case
            const cleanCorrect = String(currentQ.answer).split('#')[0].trim();
            isCorrect = answer === cleanCorrect;
        } else if (currentQ.type === 'SHORT') {
            // Case insensitive check
            const correctAnswers = (currentQ.answer as string[]).map(a => a.toLowerCase());
            isCorrect = correctAnswers.includes((answer as string).toLowerCase());
        }

        if (isCorrect) {
            points = 1;
        } else {
            // Apply penalty
            if (config.penalty > 0) {
                points = -config.penalty;
            }
        }

        const newScore = state.score + points;
        const newHistory = [...(state.history || []), { questionId: currentQ.id, isCorrect }];

        setState(s => ({
            ...s,
            score: newScore,
            history: newHistory,
            answers: { ...s.answers, [currentQ.id]: answer },
            showFeedback: true,
            lastCorrect: isCorrect
        }));
    };

    const handleNext = () => {
        setShowFeedback(false);
        setShortAnswerText('');
        if (state.currentIndex < state.questions.length - 1) {
            setState(s => ({ ...s, currentIndex: s.currentIndex + 1 }));
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setState(s => ({ ...s, isFinished: true }));
        navigate('/results', { state: { result: state } });
    };

    const handleReport = async () => {
        if (!currentUser || currentUser.uid === 'guest') {
            alert(t('auth.loginRequired', { defaultValue: 'Please log in to report questions.' }));
            return;
        }
        const currentQ = state.questions[state.currentIndex];
        if (confirm(t('quiz.report') + '?')) {
            await updateQuestion(currentQ.id, currentUser.uid, { disabled: true });
            alert(t('quiz.reportSuccess'));
            handleNext();
        }
    };

    if (loading) return <div className="p-8 text-center">{t('quiz.loading')}</div>;
    if (state.questions.length === 0) return <div className="p-8 text-center">{t('quiz.noQuestions')}</div>;

    const currentQ = state.questions[state.currentIndex];
    const hasAnswered = !!state.answers[currentQ.id];

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">
                    {t('quiz.question')} {state.currentIndex + 1} {t('quiz.of')} {state.questions.length}
                </span>
                <span className="text-sm font-medium text-indigo-600">
                    {t('quiz.score')}: {state.score}
                </span>
            </div>

            <div className="card p-8 shadow-lg min-h-[400px] flex flex-col relative">
                <button
                    onClick={handleReport}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                    title={t('quiz.report')}
                >
                    <Flag className="w-5 h-5" />
                </button>
                <h2 className="heading-2 mb-8">{currentQ.text}</h2>

                <div className="flex-grow space-y-4">
                    {currentQ.type === 'MC' && currentQ.options?.map((opt, idx) => {
                        const cleanOpt = opt.split('#')[0].trim();
                        return (
                            <button
                                key={idx}
                                onClick={() => !hasAnswered && handleAnswer(cleanOpt)}
                                disabled={hasAnswered}
                                className={`w-full text-left p-4 rounded-md border transition-all ${hasAnswered
                                    ? cleanOpt === String(currentQ.answer).split('#')[0].trim()
                                        ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300'
                                        : state.answers[currentQ.id] === cleanOpt
                                            ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300'
                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200'}`}
                            >
                                {cleanOpt}
                            </button>
                        );
                    })}

                    {currentQ.type === 'TF' && (
                        <div className="grid grid-cols-2 gap-4">
                            {['True', 'False'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => !hasAnswered && handleAnswer(opt === 'True')}
                                    disabled={hasAnswered}
                                    className={`p-4 rounded-md border text-center font-medium transition-all ${hasAnswered
                                        ? (opt === 'True') === currentQ.answer
                                            ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300'
                                            : state.answers[currentQ.id] === (opt === 'True')
                                                ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {currentQ.type === 'SHORT' && (
                        <div className="mt-4">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!hasAnswered && shortAnswerText.trim()) {
                                        handleAnswer(shortAnswerText.trim());
                                    }
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={hasAnswered ? (state.answers[currentQ.id] as string) : shortAnswerText}
                                    onChange={(e) => setShortAnswerText(e.target.value)}
                                    disabled={hasAnswered}
                                    placeholder={t('quiz.typeAnswer', { defaultValue: 'Type your answer here...' })}
                                    className={`flex-grow rounded-md border shadow-sm p-3 dark:bg-slate-700 dark:text-white transition-colors ${hasAnswered
                                        ? (Array.isArray(currentQ.answer)
                                            ? currentQ.answer.some(a => String(a).toLowerCase() === String(state.answers[currentQ.id]).toLowerCase())
                                            : String(currentQ.answer).toLowerCase() === String(state.answers[currentQ.id]).toLowerCase())
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-300'
                                            : 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-300'
                                        : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500'
                                        } `}
                                />
                                <button
                                    type="submit"
                                    disabled={hasAnswered || !shortAnswerText.trim()}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('quiz.submit', { defaultValue: 'Submit' })}
                                </button>
                            </form>
                            {hasAnswered && (
                                <div className="mt-2 text-sm text-muted">
                                    <span className="font-medium">{t('results.correctAnswer')}: </span>
                                    {Array.isArray(currentQ.answer) ? currentQ.answer.join(' / ') : currentQ.answer}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {
                    showFeedback && currentQ.feedback && (
                        <div className={`mt-4 p-4 rounded-md border ${(Array.isArray(currentQ.answer)
                            ? currentQ.answer.some(a => String(a).toLowerCase() === String(state.answers[currentQ.id]).toLowerCase())
                            : String(currentQ.answer).toLowerCase() === String(state.answers[currentQ.id]).toLowerCase())
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                            : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
                            } `}>
                            <p className="font-medium">{t('quiz.feedback')}:</p>
                            <p>{currentQ.feedback}</p>
                        </div>
                    )
                }

                {
                    (showFeedback || hasAnswered) && (
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleNext}
                                className="btn-primary inline-flex items-center px-6 py-3 text-base"
                            >
                                {state.currentIndex === state.questions.length - 1 ? t('quiz.finish') : t('quiz.next')}
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </button>
                        </div>
                    )
                }
            </div>
        </div >
    );
}
