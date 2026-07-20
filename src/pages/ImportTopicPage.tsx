import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, AlertCircle, HelpCircle, FileText } from 'lucide-react';
import { getSharedTopic } from '../services/shareService';
import { getSubjectOrder, addTopic, saveQuestions } from '../services/questionService';
import { useAuth } from '../contexts/AuthContext';
import type { SharedTopic } from '../types';

export default function ImportTopicPage() {
    const { shareId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    
    const [topic, setTopic] = useState<SharedTopic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    
    // Subject selection state
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [newSubject, setNewSubject] = useState('');

    useEffect(() => {
        if (!shareId) return;

        getSharedTopic(shareId)
            .then(data => {
                if (data) {
                    setTopic(data);
                    if (data.subjectName) {
                        setSelectedSubject(data.subjectName);
                        setNewSubject(data.subjectName);
                    }
                } else {
                    setError(t('share.notFound', { defaultValue: 'Tema no encontrado o enlace expirado.' }));
                }
            })
            .catch(err => {
                console.error(err);
                setError(t('share.error', { defaultValue: 'Error al cargar el tema.' }));
            })
            .finally(() => setLoading(false));
    }, [shareId, t]);

    useEffect(() => {
        getSubjectOrder().then(order => {
            if (order && order.length > 0) {
                setAvailableSubjects(order);
            }
        });
    }, []);

    const handleImport = async () => {
        if (!topic) return;
        if (!currentUser || currentUser.uid === 'guest') {
            alert('Debes iniciar sesión para importar temas.');
            navigate('/login');
            return;
        }

        setImporting(true);
        try {
            const finalSubject = selectedSubject === 'new' ? newSubject.trim() : selectedSubject;
            
            // 1. Ensure the topic exists in the user's account
            await addTopic(topic.topicName, currentUser.uid, finalSubject || undefined);
            
            // 2. Save all questions to the user's account
            // We strip out original IDs and userIds so they become new questions owned by the current user
            const questionsToImport = topic.questions.map(q => {
                const { id, userId, ...rest } = q;
                return {
                    ...rest,
                    subject: finalSubject || undefined, // Override with selected subject
                    createdAt: Date.now()
                } as any;
            });
            
            await saveQuestions(questionsToImport, currentUser.uid);
            
            alert('Tema importado con éxito.');
            navigate('/dashboard');
        } catch (err) {
            console.error('Error importing topic:', err);
            alert('Error al importar el tema. Por favor, inténtalo de nuevo.');
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !topic) {
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
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg mb-6 transform rotate-3">
                    <Download className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Importar Tema
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {topic.creatorName ? (
                        <><strong>{topic.creatorName}</strong> quiere compartir un tema contigo.</>
                    ) : (
                        <>Alguien quiere compartir un tema contigo.</>
                    )}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <FileText className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Nombre del Tema</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white">{topic.topicName}</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center space-x-2 text-slate-400 mb-1">
                                <HelpCircle className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Cantidad de Preguntas</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white">{topic.questions.length} Preguntas</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">¿Dónde quieres guardarlo?</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Asignatura de Destino
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Sin Asignatura (General)</option>
                            {availableSubjects.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                            <option value="new">+ Crear nueva asignatura</option>
                        </select>
                    </div>

                    {selectedSubject === 'new' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Nombre de la nueva asignatura
                            </label>
                            <input
                                type="text"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                placeholder="Ej. Biología, Mates..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleImport}
                disabled={importing || (!currentUser || currentUser.uid === 'guest')}
                className="w-full btn-primary py-4 text-lg rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {importing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                    <Download className="w-5 h-5 mr-2 fill-current group-hover:scale-110 transition-transform" />
                )}
                {importing ? 'Importando...' : 'Importar a mi cuenta'}
            </button>
            
            {(!currentUser || currentUser.uid === 'guest') && (
                <p className="text-center mt-4 text-sm text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    Debes registrarte o iniciar sesión para poder guardar temas compartidos.
                </p>
            )}

        </div>
    );
}
