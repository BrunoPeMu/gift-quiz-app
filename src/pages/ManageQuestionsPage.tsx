import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getQuestions, updateQuestion } from '../services/questionService';
import { parseGIFT } from '../lib/giftParser';
import type { Question } from '../types';
import { Edit2, Eye, EyeOff, Search, Filter, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { QuestionEditor } from '../components/QuestionEditor';

import { useAuth } from '../contexts/AuthContext';

export default function ManageQuestionsPage() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'disabled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadQuestions = async () => {
        if (!currentUser || currentUser.uid === 'guest') return;
        const all = await getQuestions(currentUser.uid, undefined, true);
        setQuestions(all);
    };

    useEffect(() => {
        loadQuestions();
    }, [currentUser]);

    const filteredQuestions = questions.filter(q => {
        const matchesFilter =
            filter === 'all' ? true :
                filter === 'active' ? !q.disabled :
                    q.disabled;

        const matchesSearch = searchTerm === '' ? true :
            q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.topic.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const handleToggle = async (q: Question) => {
        if (!currentUser || currentUser.uid === 'guest') return;
        await updateQuestion(q.id, currentUser.uid, { disabled: !q.disabled });
        loadQuestions();
    };

    const startEdit = (q: Question) => {
        setEditingId(q.id);
    };

    const saveEdit = async (id: string, updates: Partial<Question>) => {
        if (updates.giftSource && !updates.text) {
            const parsed = parseGIFT(updates.giftSource);
            if (parsed.length > 0) {
                const p = parsed[0];
                updates.text = p.text;
                updates.type = p.type;
                updates.options = p.options;
                updates.answer = p.answer;
            }
        }

        if (!currentUser || currentUser.uid === 'guest') return;
        await updateQuestion(id, currentUser.uid, updates);
        setEditingId(null);
        loadQuestions();
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {t('manage.title')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Gestiona tu banco de preguntas
                    </p>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar preguntas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                        >
                            <option value="all">{t('manage.all')}</option>
                            <option value="active">{t('manage.active')}</option>
                            <option value="disabled">{t('manage.disabled')}</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">{t('manage.noQuestions')}</p>
                    </div>
                ) : (
                    filteredQuestions.map(q => (
                        <div key={q.id} className={`group bg-white dark:bg-slate-800 rounded-xl border transition-all ${q.disabled
                                ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-75'
                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                            }`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${q.disabled
                                                    ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {q.disabled ? (
                                                    <><AlertCircle className="w-3 h-3 mr-1" /> {t('manage.disabled')}</>
                                                ) : (
                                                    <><CheckCircle className="w-3 h-3 mr-1" /> {t('manage.active')}</>
                                                )}
                                            </span>
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                {q.topic}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                                {q.difficulty}
                                            </span>
                                        </div>

                                        {editingId === q.id ? (
                                            <div className="mt-4 animate-fadeIn">
                                                <QuestionEditor
                                                    initialQuestion={q}
                                                    onSave={(updates) => saveEdit(q.id, updates)}
                                                    onCancel={() => setEditingId(null)}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-slate-900 dark:text-white text-base leading-relaxed break-words font-medium">
                                                {q.text}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(q)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                            title={t('manage.edit')}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(q)}
                                            className={`p-2 rounded-lg transition-colors ${q.disabled
                                                    ? 'text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                }`}
                                            title={q.disabled ? t('manage.enable') : t('manage.disable')}
                                        >
                                            {q.disabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
