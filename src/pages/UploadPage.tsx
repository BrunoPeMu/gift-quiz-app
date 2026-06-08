import { useState, useEffect, useMemo } from 'react';
import { FileText, Check, AlertCircle, Sparkles, Layout, Save, BookOpen, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseGIFT } from '../lib/giftParser';
import { getTopicsData, saveQuestions, addSubject, addTopic } from '../services/questionService';
import { generateQuestions } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import type { Question } from '../types';
import { QuestionEditor } from '../components/QuestionEditor';

export default function UploadPage() {
    const { t } = useTranslation();
    const { currentUser, userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'visual' | 'manual' | 'ai'>('visual');
    const [availableTopics, setAvailableTopics] = useState<{ name: string, subject?: string }[]>([]);

    // Subject State
    const [subject, setSubject] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

    useEffect(() => {
        if (currentUser && currentUser.uid !== 'guest') {
            getTopicsData(currentUser.uid).then(data => {
                setAvailableTopics(data);
                const subjects = Array.from(new Set(data.map(t => t.subject || 'Uncategorized'))).filter(s => s !== 'Uncategorized');
                setAvailableSubjects(subjects as string[]);
            }).catch(console.error);
        } else {
            setAvailableTopics([]);
            setAvailableSubjects([]);
        }
    }, [currentUser]);

    // Filter topics by selected subject
    const filteredTopics = useMemo(() => {
        if (!subject) return availableTopics;
        return availableTopics.filter(t => t.subject === subject);
    }, [subject, availableTopics]);

    // Handle subject change - reset topic to avoid orphaned topics
    const handleSubjectChange = (newSubject: string) => {
        setSubject(newSubject);
        setTopic('');
    };

    // Auto-fill subject when topic changes
    const handleTopicChange = (newTopic: string) => {
        setTopic(newTopic);
        const found = availableTopics.find(t => t.name === newTopic);
        if (found && found.subject) {
            setSubject(found.subject);
        }
    };

    // Manual State
    const [text, setText] = useState('');

    // AI State
    const [aiText, setAiText] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiTypes, setAiTypes] = useState<string[]>(['MCQ', 'TF', 'SHORT']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiMode, setAiMode] = useState<'generate' | 'parse'>('generate');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [base64Pdf, setBase64Pdf] = useState<string | undefined>(undefined);

    // Common State
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [preview, setPreview] = useState<Question[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');


    const handleFileChange = async (file: File) => {
        setErrorMsg('');
        if (file.size > 7 * 1024 * 1024) {
            setErrorMsg("El archivo supera el límite de 7MB.");
            setStatus('error');
            return;
        }

        setSelectedFile(file);

        if (file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setAiText(e.target?.result as string);
                setBase64Pdf(undefined);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.pdf')) {
            if (userProfile?.tier !== 'pro') {
                setErrorMsg("La subida directa de PDFs es una función exclusiva para usuarios PRO. Puedes copiar y pegar el texto de tu PDF en la caja inferior de forma gratuita.");
                setStatus('error');
                setSelectedFile(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                const base64 = result.split(',')[1];
                setBase64Pdf(base64);
                setAiText(''); // Clear text so we use pdf instead
            };
            reader.readAsDataURL(file);
        } else {
            setErrorMsg("Formato de archivo no soportado. Por favor, sube un archivo .pdf o .txt.");
            setStatus('error');
            setSelectedFile(null);
        }
    };

    const triggerFileSelect = () => {
        document.getElementById('ai-file-input')?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleParse = () => {
        const questions = parseGIFT(text, topic || 'General', difficulty);
        // Inject subject
        const questionsWithSubject = questions.map(q => ({ ...q, subject: subject || undefined }));
        setPreview(questionsWithSubject);
        setStatus('idle');
    };

    const handleGenerate = async () => {
        // Check credits locally for fast feedback (optional)
        if (userProfile?.credits === 0 && userProfile.tier !== 'pro') {
            setErrorMsg("Insufficient credits. Please upgrade or wait for daily reset.");
            setStatus('error');
            return;
        }

        setIsGenerating(true);
        setErrorMsg('');
        setStatus('idle');

        try {
            // Pass empty string for API key as it's handled on backend
            const generatedQuestions = await generateQuestions(
                '',
                aiText,
                difficulty,
                aiCount,
                aiTypes,
                aiMode,
                base64Pdf
            );

            const questions: Question[] = generatedQuestions.map(gq => ({
                id: crypto.randomUUID(),
                text: gq.text,
                type: gq.type,
                options: gq.options || [],
                answer: gq.answer,
                topic: topic || 'General',
                subject: subject || undefined,
                difficulty: gq.difficulty === 'easy' || gq.difficulty === 'medium' || gq.difficulty === 'hard' ? gq.difficulty : difficulty,
                disabled: false,
                createdAt: Date.now()
            }));

            setPreview(questions);
        } catch (error: any) {
            console.error("Generation failed", error);
            setErrorMsg(error.message || t('upload.ai.error'));
            setStatus('error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (preview.length === 0) return;

        setIsSaving(true);
        setErrorMsg('');

        try {
            if (!currentUser || currentUser.uid === 'guest') {
                setErrorMsg(t('auth.loginRequired', { defaultValue: 'Please log in to save questions.' }));
                setStatus('error');
                return;
            }

            // Create new subject if it doesn't exist
            if (subject && !availableSubjects.includes(subject)) {
                await addSubject(subject, currentUser.uid);
            }

            // Create new topic if it doesn't exist
            if (topic) {
                const topicExists = availableTopics.some(t => t.name === topic && t.subject === subject);
                if (!topicExists) {
                    await addTopic(topic, currentUser.uid, subject || undefined);
                }
            }

            await saveQuestions(preview, currentUser.uid);
            setStatus('success');
            setPreview([]);
            setText('');
            setAiText('');
            // Reset topic and subject after save
            setTopic('');
            setSubject('');
            // Refresh available topics
            const data = await getTopicsData(currentUser.uid);
            setAvailableTopics(data);
            const subjects = Array.from(new Set(data.map(t => t.subject || 'Uncategorized'))).filter(s => s !== 'Uncategorized');
            setAvailableSubjects(subjects as string[]);
        } catch (error: any) {
            console.error("Save failed", error);
            setErrorMsg(t('upload.saveError'));
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {t('upload.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Crea contenido personalizado
                    </p>
                </div>
            </div>

            {/* Segmented Control Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex mb-8">
                {[
                    { id: 'visual', label: t('upload.tabs.visual'), icon: Layout },
                    { id: 'manual', label: t('upload.tabs.manual'), icon: FileText },
                    { id: 'ai', label: t('upload.tabs.ai'), icon: Sparkles },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-semibold rounded-lg transition-all ${isActive
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('upload.subject')}
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        list="subjects-list"
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 px-4 shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 text-slate-900 dark:text-white"
                        placeholder={t('upload.subjectPlaceholder')}
                    />
                    <datalist id="subjects-list">
                        {availableSubjects.map(s => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                        <Layers className="w-4 h-4 mr-2 text-indigo-500" />
                        {t('upload.topic')}
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => handleTopicChange(e.target.value)}
                        list="topics-list"
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 px-4 shadow-sm focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 text-slate-900 dark:text-white"
                        placeholder={t('upload.topicPlaceholder')}
                    />
                    <datalist id="topics-list">
                        {filteredTopics.map(t => (
                            <option key={t.name} value={t.name} />
                        ))}
                    </datalist>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {t('upload.difficulty')}
                    </label>
                    <div className="relative">
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            className="w-full appearance-none bg-white dark:bg-slate-800 border-none rounded-xl py-3 px-4 shadow-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-900 dark:text-white"
                        >
                            <option value="easy">{t('config.difficulties.easy')}</option>
                            <option value="medium">{t('config.difficulties.medium')}</option>
                            <option value="hard">{t('config.difficulties.hard')}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 min-h-[400px]">
                {activeTab === 'visual' && (
                    <div className="animate-fadeIn">
                        <QuestionEditor
                            key={preview.length} // Force reset on add
                            initialQuestion={{
                                id: '',
                                text: '',
                                type: 'MC',
                                options: ['', '', '', ''],
                                answer: '',
                                topic: topic || 'General',
                                subject: subject || undefined,
                                difficulty: difficulty,
                                disabled: false,
                                createdAt: Date.now()
                            }}
                            onSave={(partial) => {
                                const newQ: Question = {
                                    id: crypto.randomUUID(),
                                    text: partial.text || '',
                                    type: partial.type || 'MC',
                                    options: partial.options || [],
                                    answer: partial.answer || '',
                                    topic: topic || 'General',
                                    subject: subject || undefined,
                                    difficulty: difficulty, // Use current page state
                                    disabled: false,
                                    createdAt: Date.now(),
                                    ...partial
                                };
                                setPreview([...preview, newQ]);
                                setStatus('idle');
                            }}
                            onCancel={() => { }} // No-op for now
                            hideCodeMode={true}
                        />
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div className="animate-fadeIn">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('upload.giftContent')}</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={12}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-200"
                                placeholder={t('upload.paste')}
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleParse}
                                disabled={!text.trim()}
                                className="btn-primary flex items-center py-2.5 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                {t('upload.parseQuestions')}
                            </button>
                        </div>
                    </div>
                )}                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-fadeIn">

                        <div>
                            {/* Credits Display */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                                            {t('AI Credits', { defaultValue: 'AI Credits' })}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {userProfile?.tier === 'pro' ? '∞' : (userProfile?.credits ?? 0)}
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1 pl-7">
                                    {userProfile?.tier === 'free'
                                        ? "Resets daily. Upgrade for more."
                                        : userProfile?.tier === 'pro'
                                            ? "Unlimited Access"
                                            : "Monthly credits"}
                                </p>
                            </div>

                            {/* Mode Toggle Selector */}
                            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAiMode('generate');
                                        setSelectedFile(null);
                                        setBase64Pdf(undefined);
                                        setAiText('');
                                    }}
                                    className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${aiMode === 'generate'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                >
                                    ✨ {t('Crear desde temario', { defaultValue: 'Crear desde temario' })}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAiMode('parse');
                                        setSelectedFile(null);
                                        setBase64Pdf(undefined);
                                        setAiText('');
                                    }}
                                    className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${aiMode === 'parse'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                >
                                    📄 {t('Importar test existente', { defaultValue: 'Importar test existente' })}
                                </button>
                            </div>

                            {/* Drag & Drop File Upload */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {aiMode === 'parse' 
                                        ? t('Subir cuestionario o examen (PDF/TXT)', { defaultValue: 'Subir cuestionario o examen (PDF/TXT)' })
                                        : t('Subir temario o apuntes (PDF/TXT)', { defaultValue: 'Subir temario o apuntes (PDF/TXT)' })
                                    }
                                </label>
                                <div
                                    onClick={triggerFileSelect}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center text-slate-500 hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all cursor-pointer"
                                >
                                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {t('Arrastra tu archivo aquí o haz clic para subir', { defaultValue: 'Arrastra tu archivo aquí o haz clic para subir' })}
                                    </p>
                                    <p className="text-xs mt-1 text-slate-400">
                                        {t('Soportado: .txt o .pdf (PRO) - Máx. 7MB', { defaultValue: 'Soportado: .txt o .pdf (PRO) - Máx. 7MB' })}
                                    </p>
                                    <input
                                        type="file"
                                        id="ai-file-input"
                                        accept=".pdf,.txt"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileChange(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Selected File Details */}
                            {selectedFile && (
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                                            <FileText className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setBase64Pdf(undefined);
                                            setAiText('');
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    >
                                        {t('Eliminar', { defaultValue: 'Eliminar' })}
                                    </button>
                                </div>
                            )}

                            {/* Text Area for copy/paste */}
                            {!base64Pdf && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        {aiMode === 'parse'
                                            ? t('Pegar preguntas del examen/test', { defaultValue: 'Pegar preguntas del examen/test' })
                                            : t('upload.ai.sourceText')
                                        }
                                    </label>
                                    <textarea
                                        value={aiText}
                                        onChange={(e) => setAiText(e.target.value)}
                                        rows={8}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-200"
                                        placeholder={aiMode === 'parse'
                                            ? t('Pega aquí tus preguntas con sus opciones y respuestas (incluso si las soluciones están agrupadas al final)...', { defaultValue: 'Pega aquí tus preguntas con sus opciones y respuestas (incluso si las soluciones están agrupadas al final)...' })
                                            : t('upload.ai.sourcePlaceholder')
                                        }
                                    />
                                </div>
                            )}

                            {base64Pdf && (
                                <div className="bg-indigo-50/55 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 animate-pulse" />
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                        {t('Documento PDF listo. La IA extraerá y estructurará todas las preguntas de este archivo.', { defaultValue: 'Documento PDF listo. La IA extraerá y estructurará todas las preguntas de este archivo.' })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {aiMode === 'generate' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        {t('upload.ai.questionTypes')}
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={aiTypes.includes('MCQ')}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAiTypes([...aiTypes, 'MCQ']);
                                                    else setAiTypes(aiTypes.filter(t => t !== 'MCQ'));
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('upload.ai.types.mcq')}</span>
                                        </label>
                                        <label className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={aiTypes.includes('TF')}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAiTypes([...aiTypes, 'TF']);
                                                    else setAiTypes(aiTypes.filter(t => t !== 'TF'));
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('upload.ai.types.tf')}</span>
                                        </label>
                                        <label className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={aiTypes.includes('SHORT')}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAiTypes([...aiTypes, 'SHORT']);
                                                    else setAiTypes(aiTypes.filter(t => t !== 'SHORT'));
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t('upload.ai.types.sa')}</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        {t('upload.ai.count', { count: aiCount })}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={aiCount}
                                        onChange={(e) => setAiCount(parseInt(e.target.value))}
                                        className="w-full accent-indigo-600 dark:accent-indigo-500"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-sm text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80">
                                💡 **{t('Modo Importación', { defaultValue: 'Modo Importación' })}:** {t('La IA identificará todas las preguntas, deducirá las respuestas correctas (asociando plantillas de soluciones si existen al final) y clasificará la dificultad de cada una de manera automática basándose en su complejidad.', { defaultValue: 'La IA identificará todas las preguntas, deducirá las respuestas correctas (asociando plantillas de soluciones si existen al final) y clasificará la dificultad de cada una de manera automática basándose en su complejidad.' })}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || (!aiText.trim() && !base64Pdf) || (aiMode === 'generate' && aiTypes.length === 0)}
                                className="btn-primary flex items-center py-2.5 px-6 rounded-xl disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                        {aiMode === 'parse' ? t('Procesando examen...', { defaultValue: 'Procesando examen...' }) : t('upload.ai.generating')}
                                    </>
                                ) : (
                                    <>
                                        {aiMode === 'parse' ? <FileText className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {aiMode === 'parse' ? t('Importar preguntas con IA', { defaultValue: 'Importar preguntas con IA' }) : t('upload.ai.generate')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Messages */}
            {status === 'success' && (
                <div className="mt-6 rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800 animate-fadeIn">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">{t('upload.success')}</p>
                        </div>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-fadeIn">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{errorMsg || t('upload.error')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Section */}
            {preview.length > 0 && (
                <div className="mt-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {t('upload.preview')} <span className="text-slate-500 font-normal ml-2">({preview.length} {t('upload.questionsParsed')})</span>
                        </h3>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary inline-flex items-center py-2 px-5 rounded-lg text-sm disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? t('upload.saving') : t('upload.save')}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                        {preview.map((q, i) => (
                            <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors first:rounded-t-xl last:rounded-b-xl">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                        {q.type}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">{q.difficulty}</span>
                                </div>
                                <p className="font-medium text-slate-900 dark:text-white mb-2">{q.text}</p>
                                <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 mr-2">{t('upload.answer')}:</span>
                                    {String(q.answer)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
