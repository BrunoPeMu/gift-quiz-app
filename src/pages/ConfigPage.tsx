import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Save, Crown, Trash2, Share2, Copy, Check, BarChart2, Hash, Shuffle, ListOrdered, BrainCircuit, RotateCcw, LayoutGrid, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getQuestions, getTopicsData } from '../services/questionService';
import { getLocalUserId } from '../services/progressService';
import { shareQuiz } from '../services/shareService';
import { selectQuestions } from '../lib/quizEngine';
import type { QuizConfig } from '../types';

export default function ConfigPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { userProfile, updateUserProfile } = useAuth();
    const [subjectNames, setSubjectNames] = useState<string[]>([]);
    const [topics, setTopics] = useState<string[]>(['General']);
    const [topicSubjectMap, setTopicSubjectMap] = useState<Record<string, string>>({});

    const [availability, setAvailability] = useState<Record<string, Record<string, number>>>({});

    const [config, setConfig] = useState<QuizConfig>({
        subject: 'All',
        topic: 'All',
        difficulty: 'mixed',
        questionCount: 10,
        mode: 'random',
        penalty: 0
    });

    const [configName, setConfigName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [, setCopied] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const userId = userProfile?.uid || getLocalUserId();

                const topicsData = await getTopicsData(userId);

                // Build topic -> subject map
                const subjectMap: Record<string, string> = {};
                topicsData.forEach(t => {
                    subjectMap[t.name] = t.subject || 'Uncategorized';
                });
                setTopicSubjectMap(subjectMap);

                // Derive unique subject names from topics data
                const subjects = new Set<string>();
                topicsData.forEach(t => {
                    if (t.subject && t.subject !== 'Uncategorized') {
                        subjects.add(t.subject);
                    }
                });
                const names = Array.from(subjects).sort();
                if (names.length > 0) {
                    setSubjectNames(['All', ...names]);
                } else {
                    setSubjectNames(['All']);
                }

                // Get all topic names from topics data
                const activeTopics = topicsData.map(t => t.name);
                if (activeTopics.length > 0) setTopics(['All', ...activeTopics]);
                else setTopics(['All', 'General']);

                // Load questions for availability
                const questions = await getQuestions(userId);

                const avail: Record<string, Record<string, number>> = {};

                // Initialize availability for all topics
                ['All', ...activeTopics].forEach(topic => {
                    avail[topic] = { easy: 0, medium: 0, hard: 0 };
                });

                questions.forEach(q => {
                    // Count for specific topic
                    if (!avail[q.topic]) avail[q.topic] = { easy: 0, medium: 0, hard: 0 };
                    if (avail[q.topic][q.difficulty] !== undefined) {
                        avail[q.topic][q.difficulty]++;
                    }

                    // Count for 'All'
                    if (avail['All'][q.difficulty] !== undefined) {
                        avail['All'][q.difficulty]++;
                    }
                });

                setAvailability(avail);

            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
        loadData();
    }, [userProfile]);

    // Filter topics by selected subject
    const filteredTopics = config.subject === 'All'
        ? topics
        : topics.filter(topicName => {
            const topicSubj = topicSubjectMap[topicName];
            return topicSubj === config.subject || !topicSubj || topicSubj === 'Uncategorized';
        });

    // Reset topic to 'All' when subject changes
    useEffect(() => {
        setConfig(prev => ({ ...prev, topic: 'All' }));
    }, [config.subject]);

    const handleStart = () => {
        navigate('/quiz', { state: { config } });
    };

    const handleSaveConfig = async () => {
        if (!configName.trim() || !userProfile) return;

        const newSavedConfigs = {
            ...(userProfile.savedConfigs || {}),
            [configName.trim()]: config
        };

        await updateUserProfile({ savedConfigs: newSavedConfigs });
        setConfigName('');
        setIsSaving(false);
    };

    const handleLoadConfig = (name: string) => {
        if (userProfile?.savedConfigs?.[name]) {
            setConfig(userProfile.savedConfigs[name]);
        }
    };

    const handleDeleteConfig = async (name: string) => {
        if (!userProfile?.savedConfigs) return;

        const newSavedConfigs = { ...userProfile.savedConfigs };
        delete newSavedConfigs[name];

        await updateUserProfile({ savedConfigs: newSavedConfigs });
    };

    const handleShare = async () => {
        if (!userProfile) return;
        setIsSharing(true);
        try {
            const allQuestions = await getQuestions(
                userProfile.uid,
                config.topic === 'All' ? undefined : config.topic,
                false,
                config.subject === 'All' ? undefined : config.subject
            );
            const selected = selectQuestions(allQuestions, config);

            if (selected.length === 0) {
                alert(t('config.noQuestionsAvailable', { defaultValue: 'No questions available for this configuration.' }));
                setIsSharing(false);
                return;
            }

            const shareId = await shareQuiz(config, selected, userProfile.uid);
            const url = `${window.location.origin}/share/${shareId}`;
            setShareUrl(url);
        } catch (e) {
            console.error("Share failed", e);
            alert("Failed to share quiz.");
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {t('config.newTestTitle', { defaultValue: 'Nuevo Test' })}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Configura tu sesión de práctica
                    </p>
                </div>
                {userProfile?.isPremium && (
                    <div className="flex bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-1 border border-indigo-100 dark:border-indigo-800">
                        <Crown className="w-5 h-5 text-yellow-500 m-1" />
                    </div>
                )}
            </div>

            {/* Saved Configs (Premium) */}
            {userProfile?.isPremium && (Object.keys(userProfile.savedConfigs || {}).length > 0) && (
                <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-3">
                        {Object.keys(userProfile.savedConfigs || {}).map(name => (
                            <div
                                key={name}
                                className="flex-shrink-0 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-2 py-2 shadow-sm"
                            >
                                <button
                                    onClick={() => handleLoadConfig(name)}
                                    className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-2"
                                >
                                    {name}
                                </button>
                                <button
                                    onClick={() => handleDeleteConfig(name)}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {/* Subject Selection */}
                {subjectNames.length > 1 && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                            {t('config.subject', { defaultValue: 'Asignatura' })}
                        </label>
                        <div className="relative">
                            <select
                                value={config.subject}
                                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                {subjectNames.map(s => (
                                    <option key={s} value={s}>{s === 'All' ? 'Todas' : s}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Topic Selection */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                        <LayoutGrid className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('config.topic')}
                    </label>
                    <div className="relative">
                        <select
                            value={config.topic}
                            onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                            className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            {filteredTopics.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* Difficulty Cards */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                        <BarChart2 className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('config.difficulty')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {['mixed', 'easy', 'medium', 'hard'].map((d) => {
                            const isAvailable = d === 'mixed'
                                ? (availability[config.topic]?.easy > 0 || availability[config.topic]?.medium > 0 || availability[config.topic]?.hard > 0)
                                : (availability[config.topic]?.[d] || 0) > 0;
                            const isSelected = config.difficulty === d;

                            return (
                                <button
                                    key={d}
                                    onClick={() => isAvailable && setConfig({ ...config, difficulty: d as any })}
                                    disabled={!isAvailable}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${isSelected
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                                        : 'border-transparent bg-white dark:bg-slate-800 shadow-sm hover:shadow-md'
                                        } ${!isAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <div className={`font-bold text-lg mb-1 capitalize ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                                        {t(`config.difficulties.${d}`)}
                                    </div>
                                    {d !== 'mixed' && (
                                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {availability[config.topic]?.[d] || 0} Questions
                                        </div>
                                    )}
                                    {isSelected && (
                                        <div className="absolute top-4 right-4 text-indigo-600 dark:text-indigo-400">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Question Count Slider/Input */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('config.count')}: <span className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold text-lg">{config.questionCount}</span>
                    </label>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <input
                            type="range"
                            min="5"
                            max="50"
                            step="5"
                            value={config.questionCount}
                            onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                            className="w-full accent-indigo-600 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                            <span>5</span>
                            <span>25</span>
                            <span>50</span>
                        </div>
                    </div>
                </div>

                {/* Mode Selection */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                        <BrainCircuit className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('config.mode')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { id: 'random', label: t('config.modes.random.label'), desc: t('config.modes.random.desc'), icon: Shuffle },
                            { id: 'sequential', label: t('config.modes.sequential.label'), desc: t('config.modes.sequential.desc'), icon: ListOrdered },
                            { id: 'smart', label: t('config.modes.smart.label'), desc: t('config.modes.smart.desc'), icon: BrainCircuit },
                            { id: 'retry', label: t('config.modes.retry.label'), desc: t('config.modes.retry.desc'), icon: RotateCcw },
                        ].map((m) => {
                            const Icon = m.icon;
                            const isSelected = config.mode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setConfig({ ...config, mode: m.id as any })}
                                    className={`flex items-start p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                                        : 'border-transparent bg-white dark:bg-slate-800 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    <div className={`mt-0.5 mr-3 p-2 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                                            {m.label}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            {m.desc}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Start Button & Share Action */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 md:static md:bg-transparent md:border-t-0 md:p-0">
                    <div className="max-w-xl mx-auto flex gap-3">
                        {userProfile?.isPremium && (
                            <div className="flex-1 max-w-[140px] flex items-center gap-2">
                                {isSaving ? (
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            value={configName}
                                            onChange={(e) => setConfigName(e.target.value)}
                                            placeholder="Nombre..."
                                            className="w-full text-xs rounded border-slate-300 p-2"
                                            autoFocus
                                        />
                                        <button onClick={handleSaveConfig} className="p-2 bg-indigo-600 text-white rounded"><Save className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsSaving(true)}
                                        className="w-full py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 flex items-center justify-center text-sm"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleStart}
                            className="flex-grow py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center"
                        >
                            <Play className="w-5 h-5 mr-2" />
                            {t('config.start')}
                        </button>

                        {userProfile && (
                            <button
                                onClick={handleShare}
                                disabled={isSharing}
                                className="w-12 flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
                            >
                                {isSharing ? (
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Share2 className="w-5 h-5 text-indigo-600" />
                                )}
                            </button>
                        )}
                    </div>
                    {shareUrl && (
                        <div className="max-w-xl mx-auto mt-4 mb-2 p-3 bg-green-50 rounded-lg flex items-center gap-2 border border-green-200">
                            <input value={shareUrl} readOnly className="flex-1 text-xs bg-transparent border-none p-0 text-green-800" />
                            <button onClick={copyToClipboard} className="text-green-600"><Copy className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
                {/* Spacer for fixed bottom on mobile */}
                <div className="h-24 md:hidden"></div>
            </div>
        </div>
    );
}
