import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, TrendingUp, Play, User, Plus, Edit2, Check, X, AlertCircle, Crown, Share, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress, type TopicStats } from '../services/progressService';
import { getTopicsData, getQuestions, addTopic, renameTopic as renameTopicService, migrateLegacyData } from '../services/questionService';
import { shareTopic } from '../services/shareService';
import type { Question } from '../types';
import { RewardedVideo } from '../components/RewardedVideo';
import { addFreeCredits } from '../services/userService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { savePendingCheckout } from '../utils/checkoutRedirect';
import { allowLocalAction } from '../utils/antiAbuse';

export default function DashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { currentUser, updateUserProfile, userProfile, refreshProfile } = useAuth();
    const [stats, setStats] = useState({
        totalQuizzes: 0,
        averageScore: 0,
        topicsMastered: 0
    });
    const [showRewardVideo, setShowRewardVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<'basic' | 'pro'>('basic');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [checkoutStep, setCheckoutStep] = useState<'selection' | 'processing' | 'success'>('selection');
    const [acknowledgeImmediateAccess, setAcknowledgeImmediateAccess] = useState(false);

    const handleSubscribe = async () => {
        const localGuard = allowLocalAction('checkout', 2500, 4, 15 * 60 * 1000);
        if (!localGuard.ok) {
            alert('Demasiados intentos seguidos. Espera un poco antes de volver a contratar.');
            return;
        }

        if (!acknowledgeImmediateAccess) {
            alert('Debes aceptar la ejecución inmediata del servicio y la pérdida del desistimiento sobre lo ya consumido.');
            return;
        }

        // Si no hay sesión, guardar selección y redirigir al login
        if (!currentUser) {
            savePendingCheckout(selectedTier, billingCycle);
            window.location.href = '/login';
            return;
        }

        setCheckoutStep('processing');
        try {
            const createCheckout = httpsCallable<{ tier: 'basic' | 'pro'; billing: 'monthly' | 'yearly'; acknowledgeImmediateAccess: boolean; origin?: string }, { url: string }>(functions, 'createStripeCheckout');
            const result = await createCheckout({
                tier: selectedTier,
                billing: billingCycle,
                acknowledgeImmediateAccess,
                origin: window.location.origin,
            });
            const checkoutUrl = result.data.url;
            
            if (checkoutUrl) {
                window.location.assign(checkoutUrl);
            } else {
                throw new Error("No URL returned from server.");
            }
        } catch (err) {
            console.error("Failed to connect to Stripe:", err);
            setCheckoutStep('selection');
            alert("Error al conectar con la pasarela de pago segura.");
        }
    };

    const closePricingModal = () => {
        setIsPricingModalOpen(false);
        if (checkoutStep === 'success') {
            setCheckoutStep('selection');
        }
    };

    const handleAdReward = async () => {
        if (!currentUser) return;
        try {
            await addFreeCredits(currentUser.uid, 1);
            alert(t('ad.rewardSuccess', { defaultValue: 'Credit added!' }));
            await refreshProfile();
        } catch (e) {
            console.error(e);
            alert("Failed to add credit");
        }
    };

    const handleManageSubscription = async () => {
        if (!currentUser) return;
        try {
            const createPortal = httpsCallable<{ origin?: string }, { url: string }>(functions, 'createCustomerPortalSession');
            const result = await createPortal({ origin: window.location.origin });
            if (result.data.url) {
                window.location.assign(result.data.url);
            }
        } catch (err: any) {
            console.error("Failed to open portal:", err);
            alert(err.message || "Error al abrir el portal de gestión.");
        }
    };

    // Topic Management State
    const [isAddingTopic, setIsAddingTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    // Redundant editing state removed

    // Profile Editing State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPhotoURL, setNewPhotoURL] = useState('');
    const [newTheme, setNewTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [newBio, setNewBio] = useState('');

    // Dashboard specific state
    const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
    const [allQuestions, setAllQuestions] = useState<Question[]>([]);
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());
    const [expandedSubjectLists, setExpandedSubjectLists] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [currentUser]); // Reload data when user changes

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('checkout') === 'success') {
            setIsPricingModalOpen(true);
            setCheckoutStep('success');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (query.get('checkout') === 'cancel') {
            setIsPricingModalOpen(true);
            setCheckoutStep('selection');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (query.get('showPricing') === 'true') {
            setIsPricingModalOpen(true);
            const t = query.get('tier');
            if (t === 'basic' || t === 'pro') setSelectedTier(t);
            const b = query.get('billing');
            if (b === 'monthly' || b === 'yearly') setBillingCycle(b);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    async function loadData() {
        if (!currentUser || currentUser.uid === 'guest') return;
        setError(null);

        try {
            const [topicsData, questions, progress] = await Promise.all([
                getTopicsData(currentUser.uid),
                getQuestions(currentUser.uid),
                getUserProgress(currentUser.uid)
            ]);

            setAllQuestions(questions);

            // Extract unique subjects
            const subjects = Array.from(new Set(topicsData.map((t: { name: string, subject?: string }) => t.subject || 'Uncategorized'))).filter((s: string) => s !== 'Uncategorized');
            setAvailableSubjects(subjects as string[]);

            // Calculate overall stats
            const totalAttempts = progress.length; // Each entry is a question attempt
            const totalCorrect = progress.filter(p => p.correct).length;
            const avg = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

            // Calculate topic stats
            const statsMap = new Map<string, TopicStats>();

            // Initialize with all topics
            topicsData.forEach((topicData: { name: string, subject?: string }) => {
                statsMap.set(topicData.name, {
                    topic: topicData.name,
                    subject: topicData.subject,
                    totalAttempts: 0,
                    correctAttempts: 0,
                    byDifficulty: {
                        easy: { total: 0, correct: 0 },
                        medium: { total: 0, correct: 0 },
                        hard: { total: 0, correct: 0 }
                    }
                });
            });

            // Map questions for metadata and counts
            const qMap = new Map<string, Question>();
            const topicQuestionCounts = new Map<string, number>();

            questions.forEach((q: Question) => {
                qMap.set(q.id, q);
                topicQuestionCounts.set(q.topic, (topicQuestionCounts.get(q.topic) || 0) + 1);
            });

            // Process progress
            progress.forEach((p: any) => {
                const q = qMap.get(p.questionId);
                if (q && statsMap.has(q.topic)) {
                    const s = statsMap.get(q.topic)!;
                    s.totalAttempts++;
                    if (p.correct) s.correctAttempts++;

                    if (s.byDifficulty[q.difficulty]) {
                        s.byDifficulty[q.difficulty].total++;
                        if (p.correct) s.byDifficulty[q.difficulty].correct++;
                    }
                }
            });

            const computedTopicStats = Array.from(statsMap.values()).map(s => ({
                ...s,
                questionCount: topicQuestionCounts.get(s.topic) || 0
            }));

            setTopicStats(computedTopicStats);

            const mastered = computedTopicStats.filter(p => (p.correctAttempts / p.totalAttempts) > 0.8 && p.totalAttempts >= 5).length;

            setStats({
                totalQuizzes: totalAttempts,
                averageScore: avg,
                topicsMastered: mastered
            });

        } catch (e) {
            console.error("Failed to load dashboard data", e);
            setError("Failed to load data. Please check your connection.");
        }
    }

    const handleMigrateData = async () => {
        if (!currentUser) return;
        if (!confirm(t('dashboard.migrateConfirm', { defaultValue: 'This will assign all "Foundless" questions to your account. Proceed?' }))) return;

        try {
            // First try standard migration
            let count = await migrateLegacyData(currentUser.uid);

            if (count === 0) {
                // If nothing found, ask to force
                if (confirm(t('dashboard.forceMigrateConfirm', { defaultValue: 'No standard lost data found. Do you want to FORCE import ALL data (stealing from other users)? Only do this if you are the only user.' }))) {
                    count = await migrateLegacyData(currentUser.uid, true);
                }
            }

            alert(t('dashboard.migrateSuccess', { defaultValue: `Successfully recovered ${count} items. Reloading...`, count }));
            loadData();
        } catch (e) {
            console.error("Migration failed", e);
            alert(`Migration failed: ${(e as any).message}`);
        }
    };

    const handleQuickStart = (topic?: string, subject?: string) => {
        let filteredQuestions = allQuestions;

        if (topic) {
            filteredQuestions = allQuestions.filter(q => q.topic === topic);
        } else if (subject) {
            // Need to know which topics belong to this subject.
            // We can infer this from topicStats which has subject info.
            const subjectTopics = new Set(topicStats.filter(s => s.subject === subject).map(s => s.topic));
            filteredQuestions = allQuestions.filter(q => subjectTopics.has(q.topic));
        }

        if (filteredQuestions.length === 0) {
            alert(t('config.noQuestionsAvailable', { defaultValue: 'No questions available for this selection.' }));
            return;
        }

        // Shuffle and take 10
        const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);

        navigate('/quiz', {
            state: {
                questions: shuffled,
                config: {
                    topic: topic || (subject ? `Subject: ${subject}` : 'Quick Start'),
                    difficulty: 'mixed',
                    questionCount: shuffled.length,
                    mode: 'random',
                    penalty: 0
                }
            }
        });
    };

    const toggleTopic = (topicName: string) => {
        const newExpanded = new Set(expandedTopics);
        if (newExpanded.has(topicName)) {
            newExpanded.delete(topicName);
        } else {
            newExpanded.add(topicName);
        }
        setExpandedTopics(newExpanded);
    };

    const toggleSubject = (subjectName: string) => {
        const newCollapsed = new Set(collapsedSubjects);
        if (newCollapsed.has(subjectName)) {
            newCollapsed.delete(subjectName);
        } else {
            newCollapsed.add(subjectName);
        }
        setCollapsedSubjects(newCollapsed);
    };

    const toggleExpandSubjectList = (subjectName: string) => {
        const newExpanded = new Set(expandedSubjectLists);
        if (newExpanded.has(subjectName)) {
            newExpanded.delete(subjectName);
        } else {
            newExpanded.add(subjectName);
        }
        setExpandedSubjectLists(newExpanded);
    };

    const handleAddTopic = async () => {
        if (!newTopicName.trim() || !currentUser || currentUser.uid === 'guest') return;
        await addTopic(newTopicName.trim(), currentUser.uid, newTopicSubject.trim() || undefined);
        setNewTopicName('');
        setNewTopicSubject('');
        setIsAddingTopic(false);
        loadData();
    };

    const handleShareTopic = async (topicName: string, subjectName: string | undefined) => {
        if (!currentUser || currentUser.uid === 'guest') {
            alert('Debes iniciar sesión para compartir temas.');
            return;
        }

        const topicQuestions = allQuestions.filter(q => q.topic === topicName && (q.subject === subjectName || (!q.subject && !subjectName) || (!subjectName && q.subject === 'Uncategorized')));
        if (topicQuestions.length === 0) {
            alert('No hay preguntas en este tema para compartir.');
            return;
        }

        // Generamos el ID y la URL de forma síncrona para no perder el gesto del usuario y permitir el copiado en Safari/iOS
        const shareId = crypto.randomUUID().slice(0, 8);
        const shareUrl = `${window.location.origin}/share-topic/${shareId}`;
        
        let copiedSuccessfully = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // Hacemos el await de clipboard.writeText aquí, antes del await de Firebase
                await navigator.clipboard.writeText(shareUrl);
                copiedSuccessfully = true;
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = shareUrl;
                textArea.style.position = "absolute";
                textArea.style.left = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                copiedSuccessfully = true;
            }
        } catch (clipboardErr) {
            console.warn('Clipboard write failed:', clipboardErr);
        }

        try {
            // Ahora sí, guardamos en base de datos
            await shareTopic(topicName, subjectName, topicQuestions, currentUser.uid, currentUser.displayName || undefined, shareId);
            
            if (copiedSuccessfully) {
                alert('¡Enlace de invitación copiado al portapapeles! Envíalo a tus amigos.');
            } else {
                prompt('El enlace se ha generado, pero tu navegador bloqueó el portapapeles. Cópialo manualmente:', shareUrl);
            }
        } catch (err: any) {
            console.error('Error sharing topic:', err);
            alert(`Error al guardar el tema compartido: ${err.message || err}`);
        }
    };

    const handleEditProfile = () => {
        setNewName(currentUser?.displayName || '');
        setNewUsername(userProfile?.username || '');
        setNewPhotoURL(currentUser?.photoURL || '');
        setNewTheme(userProfile?.preferences?.theme || 'system');
        setNewBio(userProfile?.bio || '');
        setIsEditingProfile(true);
    };

    const saveProfile = async () => {
        if (!newName.trim()) {
            setIsEditingProfile(false);
            return;
        }
        try {
            await updateUserProfile({
                displayName: newName.trim(),
                username: newUsername.trim() || undefined,
                photoURL: newPhotoURL.trim() || undefined,
                bio: newBio.trim(),
                preferences: {
                    ...userProfile?.preferences,
                    theme: newTheme
                }
            });
            setIsEditingProfile(false);
        } catch (e) {
            console.error("Failed to update profile", e);
            setError("Failed to update profile. Please try again.");
        }
    };



    // groupedStats removed

    // sortedSubjects removed

    // showEditProfile removed
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [tempTopicName, setTempTopicName] = useState<string>('');

    // Helper to group topics by subject for the new display
    const topicsBySubject = useMemo(() => {
        return topicStats.reduce((acc, stat) => {
            const subject = stat.subject || 'Uncategorized';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(stat);
            return acc;
        }, {} as Record<string, TopicStats[]>);
    }, [topicStats]);

    // Removed activeTab state as requested by user ("Stats tab is not needed")

    // ... (keep existing effects and loadData)

    return (
        <div className="w-full mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center mb-6">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Header Section (Instagram Style) */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-8 mb-6">
                    {/* Avatar (Left on desktop, Centered on mobile) */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            {/* "Note" bubble style indicator (optional, maybe for status) */}
                            {userProfile?.isPremium && (
                                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white dark:border-black z-10 shadow-sm">
                                    PRO
                                </div>
                            )}

                            {userProfile?.photoURL || currentUser?.photoURL ? (
                                <img
                                    src={userProfile?.photoURL || currentUser?.photoURL || ''}
                                    alt="Profile"
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 p-1"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700">
                                    <User className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats & Info (Right on desktop) */}
                    <div className="flex-1 flex flex-col items-center sm:items-start w-full">
                        {/* Username Row */}
                        <div className="flex items-center mb-4 space-x-4">
                            <h2 className="text-xl sm:text-2xl font-normal text-slate-900 dark:text-white">
                                {userProfile?.username || (currentUser ? 'username' : 'guest')}
                            </h2>
                            {userProfile?.isPremium && (
                                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md ring-2 ring-yellow-400/20">
                                    <Crown className="w-3 h-3 fill-current text-slate-950" />
                                    <span>PRO</span>
                                </span>
                            )}
                            {userProfile?.subscription?.status === 'active' && userProfile?.subscription?.provider === 'stripe' && (
                                <button
                                    onClick={handleManageSubscription}
                                    className="text-xs text-indigo-500 hover:text-indigo-400 underline ml-2"
                                >
                                    {t('dashboard.manageSubscription', { defaultValue: 'Gestionar suscripción' })}
                                </button>
                            )}
                            {/* Settings icon could go here */}
                            <button className="sm:hidden text-slate-900 dark:text-white">
                                <span className="sr-only">Settings</span>
                                {/* <Settings className="w-6 h-6" /> */}
                            </button>
                        </div>

                        {/* Stats Cards (Visible on both Mobile and Desktop) */}
                        <div className="w-full overflow-x-auto hide-scrollbar mb-6">
                            <div className="flex space-x-4 min-w-max pb-2 px-1">
                                {/* Tests Taken */}
                                <div className="card p-4 flex items-center space-x-3 min-w-[160px]">
                                    <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Tests Completados</p>
                                        <p className="text-xl font-bold text-white">{stats.totalQuizzes}</p>
                                    </div>
                                </div>

                                {/* Average Score */}
                                <div className="card p-4 flex items-center space-x-3 min-w-[160px]">
                                    <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Nota Media</p>
                                        <p className="text-xl font-bold text-white">{stats.averageScore}%</p>
                                    </div>
                                </div>

                                {/* Topics Mastered */}
                                <div className="card p-4 flex items-center space-x-3 min-w-[160px]">
                                    <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Temas Dominados</p>
                                        <p className="text-xl font-bold text-white">{stats.topicsMastered}</p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Bio Section */}
                        <div className="text-center sm:text-left text-sm sm:text-base mb-4 w-full">
                            <div className="font-bold text-slate-900 dark:text-white">
                                {userProfile?.displayName || currentUser?.displayName || 'Invitado'}
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {userProfile?.bio}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {currentUser && (
                            <div className="flex space-x-2 w-full sm:max-w-md">
                                <button
                                    onClick={handleEditProfile}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-1.5 rounded-lg text-sm transition-colors"
                                >
                                    {t('dashboard.editProfile', { defaultValue: 'Editar perfil' })}
                                </button>
                                <button
                                    onClick={() => {
                                        const url = window.location.href;
                                        navigator.clipboard.writeText(url).catch(() => { });
                                        alert('Link copied!');
                                    }}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-1.5 rounded-lg text-sm transition-colors"
                                >
                                    Share
                                </button>
                            </div>
                        )}
                    </div>
                </div>



                {/* Tab Icons (Grid vs List/Stats) */}
                {/* Removed Tab Icons as Stats tab is not needed */}
            </div>

            {/* Editing Modal (kept simple overlay for now or inline if preferred, but existing looked okay. Let's reuse existing logic but maybe clean up UI if it pops up) */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar perfil</h2>
                            <button onClick={() => setIsEditingProfile(false)}><X className="w-6 h-6 text-slate-500" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Biografía</label>
                                <textarea
                                    value={newBio}
                                    onChange={(e) => setNewBio(e.target.value)}
                                    placeholder="Escribe algo sobre ti..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white h-24 resize-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">Esto se mostrará en tu perfil público.</p>
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                {currentUser && currentUser.uid !== 'guest' ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingProfile(false);
                                            handleMigrateData();
                                        }}
                                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        Recuperar datos locales
                                    </button>
                                ) : <div />}
                                <button
                                    onClick={saveProfile}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Add Topic Modal */}
            {isAddingTopic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboard.addTopic', { defaultValue: 'Nuevo Tema' })}</h2>
                            <button onClick={() => setIsAddingTopic(false)}><X className="w-6 h-6 text-slate-500" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Nombre del Tema</label>
                                <input
                                    type="text"
                                    value={newTopicName}
                                    onChange={(e) => setNewTopicName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej. Historia, Matemáticas..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Asignatura (Opcional)</label>
                                <input
                                    type="text"
                                    list="subjects"
                                    value={newTopicSubject}
                                    onChange={(e) => setNewTopicSubject(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Ej. Ciencias"
                                />
                                <datalist id="subjects">
                                    {availableSubjects.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleAddTopic}
                                    disabled={!newTopicName.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.add', { defaultValue: 'Crear' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Tab Content */}
            <div className="min-h-[200px]">
                {/* Promo Premium Banner */}
                {!userProfile?.isPremium && currentUser && currentUser.uid !== 'guest' && (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 space-y-2">
                            <div className="inline-flex items-center space-x-2 bg-yellow-500/15 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-bold text-yellow-400">
                                <Crown className="w-3.5 h-3.5 fill-current text-yellow-400" />
                                <span>ACCESO ILIMITADO</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white">Consigue FlashTests PRO</h3>
                            <p className="text-slate-300 text-sm max-w-xl">
                                Desbloquea generación ilimitada de tests por inteligencia artificial, explicaciones paso a paso de las respuestas correctas y despídete de la publicidad.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsPricingModalOpen(true)}
                            className="relative z-10 flex-shrink-0 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-yellow-500/20 active:scale-95 transition-all text-sm flex items-center space-x-2"
                        >
                            <span>Ver Ventajas</span>
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="mt-2">
                    {/* Guest redirect to homepage */}
                    {!currentUser ? (
                        <div className="text-center py-20">
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Inicia sesión para ver tu dashboard.</p>
                            <button onClick={() => navigate('/login')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                                Iniciar sesión
                            </button>
                        </div>
                    ) : (
                        /* Logged In User View: Topics Grid */
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mis Asignaturas y Temas</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona un tema para configurar y comenzar tu test.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddingTopic(true)}
                                    className="hidden sm:flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Crear tema</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                                {Object.entries(topicsBySubject).map(([subject, topics]) => {
                                    const isSubjectCollapsed = collapsedSubjects.has(subject);
                                    return (
                                        <div key={subject} className="card overflow-hidden w-full">
                                            <div 
                                                className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/40 cursor-pointer hover:bg-slate-800/60 transition-colors"
                                                onClick={() => toggleSubject(subject)}
                                            >
                                                <div className="flex items-center space-x-2 overflow-hidden pr-2">
                                                    {isSubjectCollapsed ? (
                                                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    )}
                                                    <h3 className="font-bold text-white truncate" title={subject}>
                                                        {subject}
                                                    </h3>
                                                </div>
                                                <span className="text-xs font-semibold px-2 py-1 bg-slate-700 rounded-full text-slate-300 flex-shrink-0">
                                                    {topics.length}
                                                </span>
                                            </div>
                                            
                                            {!isSubjectCollapsed && (
                                                <>
                                                    <div className="divide-y divide-white/5">
                                                        {(expandedSubjectLists.has(subject) ? topics : topics.slice(0, 4)).map(topic => {
                                                            const isExpanded = expandedTopics.has(topic.topic);
                                                            const generalPercentage = topic.totalAttempts > 0 ? (topic.correctAttempts / topic.totalAttempts) : 0;

                                                            const handleSaveRename = async () => {
                                                                if (!currentUser || currentUser.uid === 'guest') return;
                                                                if (tempTopicName.trim() && tempTopicName !== topic.topic) {
                                                                    await renameTopicService(topic.topic, topic.subject || '', tempTopicName.trim(), currentUser.uid);
                                                                }
                                                                setEditingTopicId(null);
                                                                loadData();
                                                            };

                                                            const cancelRename = () => {
                                                                setEditingTopicId(null);
                                                                setTempTopicName('');
                                                            };

                                                            return (
                                                                <div key={topic.topic} className="group p-3 hover:bg-white/5 transition-colors">
                                                                    <div
                                                                        className="flex items-center justify-between cursor-pointer"
                                                                        onClick={() => toggleTopic(topic.topic)}
                                                                    >
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            {editingTopicId === topic.topic ? (
                                                                                <div className="flex items-center space-x-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={tempTopicName}
                                                                                        onChange={(e) => setTempTopicName(e.target.value)}
                                                                                        className="flex-1 px-2 py-1 text-sm border border-slate-600 rounded bg-slate-700 text-white focus:ring-2 focus:ring-purple-500"
                                                                                        autoFocus
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') handleSaveRename();
                                                                                            if (e.key === 'Escape') cancelRename();
                                                                                        }}
                                                                                    />
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleSaveRename(); }} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                                                                                        <Check className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); cancelRename(); }} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                                                                                        <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="font-medium text-sm text-slate-200 truncate">{topic.topic}</div>
                                                                            )}
                                                                            <span className="text-xs text-slate-400">{topic.questionCount || 0} q</span>
                                                                        </div>

                                                                        <div className="flex items-center space-x-2">
                                                                            <div
                                                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${generalPercentage > 0.8 ? 'border-green-500 text-green-500' :
                                                                                    generalPercentage > 0.5 ? 'border-yellow-500 text-yellow-500' :
                                                                                        'border-slate-600 text-slate-400'
                                                                                    }`}
                                                                            >
                                                                                {Math.round(generalPercentage * 100)}
                                                                            </div>
                                                                            <Play
                                                                                onClick={(e) => { e.stopPropagation(); handleQuickStart(topic.topic); }}
                                                                                className="w-4 h-4 text-slate-400 hover:text-purple-400"
                                                                            />
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleShareTopic(topic.topic, topic.subject);
                                                                                }}
                                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-all"
                                                                                title={t('common.share', { defaultValue: 'Compartir' })}
                                                                            >
                                                                                <Share className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingTopicId(topic.topic);
                                                                                    setTempTopicName(topic.topic);
                                                                                }}
                                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-full transition-all"
                                                                                title={t('common.edit')}
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Expanded Details */}
                                                                    {isExpanded && (
                                                                        <div className="mt-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-white/5">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <span className="text-[10px] uppercase text-slate-400 font-bold">Details</span>
                                                                                <div className="flex space-x-3">
                                                                                    <Edit2 onClick={() => { setEditingTopicId(topic.topic); setTempTopicName(topic.topic); }} className="w-3 h-3 text-slate-400 hover:text-purple-400 cursor-pointer" />
                                                                                    <Share onClick={() => handleShareTopic(topic.topic, topic.subject)} className="w-3 h-3 text-slate-400 hover:text-indigo-400 cursor-pointer" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-3 gap-1">
                                                                                {Object.entries(topic.byDifficulty).map(([diff, d]: [string, any]) => (
                                                                                    <div key={diff} className="text-center bg-slate-800/50 rounded p-1">
                                                                                        <div className="text-[10px] text-slate-400">{diff[0].toUpperCase()}</div>
                                                                                        <div className="text-xs font-mono text-slate-300">{d.correct}/{d.total}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {topics.length > 4 && (
                                                        <button
                                                            onClick={() => toggleExpandSubjectList(subject)}
                                                            className="w-full py-2.5 px-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-all text-center flex items-center justify-center space-x-1 border-t border-white/5"
                                                        >
                                                            {expandedSubjectLists.has(subject) ? (
                                                                <>
                                                                    <span>Mostrar menos</span>
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>Mostrar más (+{topics.length - 4} temas)</span>
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Success Tips Section (Visible to ALL users) */}
                    <div className="mt-12 clear-both">
                        <div className="flex items-center space-x-2 mb-6">
                            <Lightbulb className="w-6 h-6 text-amber-500" />
                            <h3 className="text-xl font-bold text-white">
                                Consejos para el Éxito
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Spaced Repetition */}
                            <div className="card p-6 relative overflow-hidden">
                                <div className="bg-emerald-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-lg text-white mb-2">
                                    Repetición Espaciada
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Repasar el material en intervalos crecientes mejora drásticamente la retención a largo plazo.
                                </p>
                            </div>

                            {/* Active Recall */}
                            <div className="card p-6 relative overflow-hidden">
                                <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-purple-400">
                                    <Lightbulb className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-lg text-white mb-2">
                                    Recuerdo Activo
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Ponerte a prueba es más efectivo que releer. ¡Desafía a tu cerebro!
                                </p>
                            </div>

                            {/* Interleaved Practice */}
                            <div className="card p-6 relative overflow-hidden">
                                <div className="bg-amber-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-amber-400">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-lg text-white mb-2">
                                    Práctica Intercalada
                                </h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Mezclar diferentes temas mejora tu capacidad para resolver problemas en cualquier contexto.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ad Placeholder - Only for Free Users */}
            {!userProfile?.isPremium && (
                <div className="mt-8">
                    {/* Rewarded Video CTA */}
                    <div className="mt-6 card p-4 flex items-center justify-between border-dashed">
                        <div className="flex items-center space-x-3">
                            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
                                <Play className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">{t('ad.watchTitle', { defaultValue: 'Need more credits?' })}</h4>
                                <p className="text-xs text-slate-400">{t('ad.watchDesc', { defaultValue: 'Watch a short video to get +1 credit' })}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowRewardVideo(true)}
                            className="btn-secondary text-sm px-4 py-2"
                        >
                            {t('ad.watchBtn', { defaultValue: 'Watch Video' })}
                        </button>
                    </div>

                    <RewardedVideo
                        isOpen={showRewardVideo}
                        onClose={() => setShowRewardVideo(false)}
                        onReward={handleAdReward}
                    />
                </div>
            )}

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 md:hidden">
                <button
                    onClick={() => setIsAddingTopic(true)}
                    className="bg-indigo-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {/* Pricing / Premium Subscription Modal */}
            {isPricingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-auto">
                        {/* Glow spots */}
                        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Close button */}
                        {checkoutStep !== 'processing' && (
                            <button 
                                onClick={closePricingModal}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-full transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        {checkoutStep === 'selection' && (
                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                                <div className="text-center space-y-2">
                                    <div className="inline-flex p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-yellow-500 rounded-2xl mb-2 border border-yellow-500/30">
                                        <Crown className="w-8 h-8 text-yellow-500 animate-pulse" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">{t('plans.title', { defaultValue: 'Elige tu plan' })}</h2>
                                    <p className="text-slate-400 text-sm">
                                        {t('plans.subtitle', { defaultValue: 'Prepara tus exámenes con ayuda de Inteligencia Artificial.' })}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-slate-200 space-y-3">
                                    <p>
                                        El servicio digital se activa de forma inmediata al contratar. Al continuar, solicitas expresamente la ejecución inmediata del servicio y reconoces que el desistimiento puede quedar limitado respecto de lo ya consumido.
                                    </p>
                                    <label className="flex items-start gap-3 cursor-pointer text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={acknowledgeImmediateAccess}
                                            onChange={(e) => setAcknowledgeImmediateAccess(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-500 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span>
                                            Acepto la ejecución inmediata del servicio digital y entiendo que, una vez consumido el acceso o las generaciones, el derecho de desistimiento puede decaer en la medida permitida por la ley.
                                        </span>
                                    </label>
                                </div>

                                {/* Tier Selector: BASIC / PRO */}
                                <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setSelectedTier('basic')}
                                        className={`py-2 text-sm font-semibold rounded-lg transition-all ${selectedTier === 'basic' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {t('plans.basic.label', { defaultValue: 'Básico' })}
                                    </button>
                                    <button
                                        onClick={() => setSelectedTier('pro')}
                                        className={`py-2 text-sm font-semibold rounded-lg transition-all ${selectedTier === 'pro' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {t('plans.pro.label', { defaultValue: 'PRO' })}
                                    </button>
                                </div>

                                {/* Plan Details */}
                                {selectedTier === 'basic' ? (
                                    <div className="space-y-4 bg-slate-950/40 border border-white/5 rounded-2xl p-4 sm:p-5">
                                        <div className="text-center">
                                            <span className="text-3xl font-bold text-white">
                                                {billingCycle === 'monthly' ? '4,99 €' : '49,90 €'}
                                            </span>
                                            <span className="text-slate-400 text-sm">
                                                {billingCycle === 'monthly' ? ' / mes' : ' / año'}
                                            </span>
                                            {billingCycle === 'yearly' && (
                                                <p className="text-xs text-emerald-400 mt-1">{t('plans.basic.yearlySave', { defaultValue: 'Ahorras 2 meses (equivalente a 4,16 €/mes)' })}</p>
                                            )}
                                        </div>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.basic.feature1', { defaultValue: '30 generaciones con IA al mes' })}</strong> {t('plans.basic.feature1Desc', { defaultValue: 'Los no usados se acumulan (rollover).' })}</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.basic.feature2', { defaultValue: 'Sin publicidad' })}</strong></span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <span>{t('plans.basic.feature3', { defaultValue: 'Estadísticas completas de progreso' })}</span>
                                            </li>
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="space-y-4 bg-gradient-to-br from-indigo-950/40 to-slate-950/40 border border-yellow-500/20 rounded-2xl p-4 sm:p-5">
                                        <div className="text-center">
                                            <span className="inline-block bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full font-bold mb-2">{t('plans.pro.badge', { defaultValue: 'MÁS POPULAR' })}</span>
                                            <div>
                                                <span className="text-3xl font-bold text-white">
                                                    {billingCycle === 'monthly' ? '9,98 €' : '99,80 €'}
                                                </span>
                                                <span className="text-slate-400 text-sm">
                                                    {billingCycle === 'monthly' ? ' / mes' : ' / año'}
                                                </span>
                                            </div>
                                            {billingCycle === 'yearly' && (
                                                <p className="text-xs text-emerald-400 mt-1">{t('plans.pro.yearlySave', { defaultValue: 'Ahorras 2 meses (equivalente a 8,32 €/mes)' })}</p>
                                            )}
                                        </div>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.pro.feature1', { defaultValue: '50 generaciones con IA al día' })}</strong> {t('plans.pro.feature1Desc', { defaultValue: 'Suficiente para uso intensivo diario.' })}</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.pro.feature2', { defaultValue: 'Subida de PDFs' })}</strong> {t('plans.pro.feature2Desc', { defaultValue: 'Extrae preguntas directamente.' })}</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.pro.feature3', { defaultValue: 'Máximo contexto' })}</strong> {t('plans.pro.feature3Desc', { defaultValue: 'Hasta 100 000 caracteres por generación.' })}</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span><strong className="text-white">{t('plans.pro.feature4', { defaultValue: 'Sin publicidad' })}</strong></span>
                                            </li>
                                            <li className="flex items-start gap-2 text-slate-300">
                                                <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <span>{t('plans.pro.feature5', { defaultValue: 'Estadísticas completas de progreso' })}</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {/* Billing Selector */}
                                <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`py-2 text-sm font-semibold rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {t('plans.billing.monthly', { defaultValue: 'Mensual' })}
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <span>{t('plans.billing.yearly', { defaultValue: 'Anual' })}</span>
                                        <span className="bg-yellow-400/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                            -17%
                                        </span>
                                    </button>
                                </div>

                                {/* CTA Button */}
                                <div className="space-y-3">
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={!acknowledgeImmediateAccess}
                                        className={`w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-bold rounded-2xl shadow-lg hover:shadow-yellow-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${!acknowledgeImmediateAccess ? 'opacity-50 cursor-not-allowed hover:from-amber-500 hover:to-yellow-400' : ''}`}
                                    >
                                        <Crown className="w-5 h-5" />
                                        <span>{selectedTier === 'basic' ? t('plans.cta.basic', { defaultValue: 'Suscribirse al plan Básico' }) : t('plans.cta.pro', { defaultValue: 'Suscribirse al plan PRO' })}</span>
                                    </button>
                                    <div className="flex items-center justify-center space-x-1 text-slate-500 text-xs">
                                        <span>🔒 {t('plans.securePayment', { defaultValue: 'Pago seguro SSL por Stripe' })}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'processing' && (
                            <div className="p-8 text-center space-y-6 py-16 flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white">Conectando con Stripe...</h3>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                        Estamos procesando tu suscripción de pruebas de forma segura. No cierres esta ventana.
                                    </p>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'success' && (
                            <div className="p-8 text-center space-y-6 py-12 flex flex-col items-center">
                                <div className="inline-flex p-4 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 mb-2 relative">
                                    <span className="absolute top-0 left-0 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>
                                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-pink-500 rounded-full animate-ping"></span>
                                    <Check className="w-10 h-10 text-emerald-400" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">¡Ya eres miembro PRO! 🎉</h2>
                                    <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
                                        ¡Tu pago de pruebas ha sido exitoso! Tu cuenta ha sido elevada a PRO. Disfruta de generación ilimitada y cero anuncios.
                                    </p>
                                </div>
                                <button
                                    onClick={closePricingModal}
                                    className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm"
                                >
                                    ¡Comenzar a estudiar!
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
