import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getQuestions, updateQuestion, deleteTopic, deleteQuestion, renameTopicDirect, updateTopicSubject, addTopic, getTopicsData, renameSubject, deleteSubject } from '../services/questionService';
import { parseGIFT } from '../lib/giftParser';
import type { Question } from '../types';
import { QuestionEditor } from '../components/QuestionEditor';
import {
    Edit2, Eye, EyeOff, Search, Filter, Database, CheckCircle, AlertCircle,
    Save, X, ChevronRight, ChevronDown,
    Layers, FolderOpen, Tag, Plus, Trash2
} from 'lucide-react';

type TabType = 'questions' | 'subjects';

interface SubjectGroup {
    name: string;
    topics: string[];
    questionCount: number;
}

export default function ManageContentPage() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('questions');

    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionFilter, setQuestionFilter] = useState<'all' | 'active' | 'disabled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [allTopicsData, setAllTopicsData] = useState<{ name: string; subject?: string }[]>([]);
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [editingTopic, setEditingTopic] = useState<{ oldName: string; oldSubject: string; newName: string; newSubject: string } | null>(null);
    const [editingSubject, setEditingSubject] = useState<{ oldName: string; newName: string } | null>(null);
    const [deletingSubject, setDeletingSubject] = useState<{ name: string; topicCount: number; questionCount: number } | null>(null);
    const [subjectDeleteAction, setSubjectDeleteAction] = useState<'transfer' | 'orphan' | 'deleteAll'>('transfer');
    const [subjectDeleteTarget, setSubjectDeleteTarget] = useState('');
    const [addingTopic, setAddingTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [deletingTopic, setDeletingTopic] = useState<{ name: string; subject: string; questionCount: number } | null>(null);
    const [transferTarget, setTransferTarget] = useState('');
    const [deleteAction, setDeleteAction] = useState<'transfer' | 'orphan' | 'deleteQuestions'>('transfer');

    const loadData = async () => {
        const uid = currentUser?.uid || 'guest';

        const [allQuestions, topicsData] = await Promise.all([
            getQuestions(uid, undefined, true),
            getTopicsData(uid)
        ]);
        setQuestions(allQuestions);
        setAllTopicsData(topicsData);
    };

    useEffect(() => {
        loadData();
    }, [currentUser]);

    // Group topics by subject - derive subjects from questions + topics data
    const subjectGroups = useMemo(() => {
        const groups: Record<string, { topics: Set<string>; questionCount: number }> = {};

        const getGroup = (subj: string) => {
            const key = subj || 'Sin asignatura';
            if (!groups[key]) groups[key] = { topics: new Set(), questionCount: 0 };
            return groups[key];
        };

        // From topics data
        allTopicsData.forEach(t => {
            getGroup(t.subject || '').topics.add(t.name);
        });

        // From questions
        questions.forEach(q => {
            const subj = q.subject && q.subject !== 'Uncategorized' ? q.subject : '';
            const g = getGroup(subj);
            g.topics.add(q.topic);
            g.questionCount++;
        });

        // Convert to array
        const result: SubjectGroup[] = [];
        Object.entries(groups)
            .filter(([key]) => key !== 'Sin asignatura')
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([name, data]) => {
                result.push({ name, topics: Array.from(data.topics).sort(), questionCount: data.questionCount });
            });

        if (groups['Sin asignatura']) {
            result.push({ name: 'Sin asignatura', topics: Array.from(groups['Sin asignatura'].topics).sort(), questionCount: groups['Sin asignatura'].questionCount });
        }

        return result;
    }, [questions, allTopicsData]);

    // Available topics for the topic filter (depends on selected subject)
    const availableTopicsForFilter = useMemo(() => {
        if (!filterSubject) {
            const allTopics = new Set<string>();
            subjectGroups.forEach(g => g.topics.forEach(t => allTopics.add(t)));
            return Array.from(allTopics).sort();
        }
        const group = subjectGroups.find(g => g.name === filterSubject);
        return group ? group.topics : [];
    }, [subjectGroups, filterSubject]);

    const filteredQuestions = questions.filter(q => {
        const matchesFilter = questionFilter === 'all' ? true : questionFilter === 'active' ? !q.disabled : q.disabled;
        const matchesSearch = searchTerm === '' || q.text.toLowerCase().includes(searchTerm.toLowerCase()) || q.topic.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = filterSubject === '' || q.subject === filterSubject;
        const matchesTopic = filterTopic === '' || q.topic === filterTopic;
        const matchesDifficulty = filterDifficulty === '' || q.difficulty === filterDifficulty;
        return matchesFilter && matchesSearch && matchesSubject && matchesTopic && matchesDifficulty;
    });

    const handleSubjectFilterChange = (subject: string) => {
        setFilterSubject(subject);
        setFilterTopic('');
    };

    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };

    const sortedQuestions = useMemo(() => {
        return [...filteredQuestions].sort((a, b) => {
            const topicCompare = a.topic.localeCompare(b.topic);
            if (topicCompare !== 0) return topicCompare;
            return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
        });
    }, [filteredQuestions]);

    const allSubjectNames = useMemo(() => {
        return subjectGroups.filter(s => s.name !== 'Sin asignatura').map(s => s.name);
    }, [subjectGroups]);

    const handleToggle = async (q: Question) => {
        const uid = currentUser?.uid || 'guest';
        await updateQuestion(q.id, uid, { disabled: !q.disabled });
        loadData();
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
        const uid = currentUser?.uid || 'guest';
        await updateQuestion(id, uid, updates);
        setEditingId(null);
        loadData();
    };

    const handleAddTopic = async () => {
        if (!newTopicName.trim()) return;
        const uid = currentUser?.uid || 'guest';
        const subj = newTopicSubject || undefined;
        await addTopic(newTopicName.trim(), uid, subj);
        setNewTopicName('');
        setNewTopicSubject('');
        setAddingTopic(false);
        loadData();
    };

    const handleRenameTopic = async () => {
        if (!editingTopic) return;
        const uid = currentUser?.uid || 'guest';
        const { oldName, oldSubject, newName, newSubject } = editingTopic;
        if (!newName.trim()) return;

        if (oldName !== newName.trim()) {
            await renameTopicDirect(oldName, oldSubject, newName.trim(), uid);
        }
        if (newSubject !== oldSubject) {
            await updateTopicSubject(newName.trim(), oldSubject, newSubject, uid);
        }
        setEditingTopic(null);
        loadData();
    };

    const handleRenameSubject = async () => {
        if (!editingSubject) return;
        const uid = currentUser?.uid || 'guest';
        const { oldName, newName } = editingSubject;
        if (!newName.trim() || oldName === newName.trim()) {
            setEditingSubject(null);
            return;
        }
        await renameSubject(oldName, newName.trim(), uid);
        setEditingSubject(null);
        loadData();
    };

    const handleDeleteSubject = (subjectName: string) => {
        const group = subjectGroups.find(g => g.name === subjectName);
        if (!group) return;
        setDeletingSubject({ name: subjectName, topicCount: group.topics.length, questionCount: group.questionCount });
        setSubjectDeleteTarget('');
        setSubjectDeleteAction(group.topics.length > 0 || group.questionCount > 0 ? 'transfer' : 'orphan');
    };

    const handleConfirmDeleteSubject = async () => {
        if (!deletingSubject) return;
        const uid = currentUser?.uid || 'guest';
        await deleteSubject(deletingSubject.name, uid, subjectDeleteAction, subjectDeleteTarget || undefined);
        setDeletingSubject(null);
        setSubjectDeleteTarget('');
        loadData();
    };

    const handleDeleteTopic = async (topicName: string, subjectName: string) => {
        if (!currentUser) return;
        const qCount = questions.filter(q => q.topic === topicName && (subjectName === 'Sin asignatura' ? (!q.subject || q.subject === 'Uncategorized') : q.subject === subjectName)).length;
        setDeletingTopic({ name: topicName, subject: subjectName, questionCount: qCount });
        setTransferTarget('');
        setDeleteAction(qCount > 0 ? 'transfer' : 'orphan');
    };

    const handleConfirmDelete = async () => {
        if (!deletingTopic) return;
        const uid = currentUser?.uid || 'guest';
        const { name, subject } = deletingTopic;

        if (deleteAction === 'transfer' && transferTarget) {
            const qList = questions.filter(q => q.topic === name && (subject === 'Sin asignatura' ? (!q.subject || q.subject === 'Uncategorized') : q.subject === subject));
            for (const q of qList) {
                await updateQuestion(q.id, uid, { topic: transferTarget });
            }
        } else if (deleteAction === 'deleteQuestions') {
            const qList = questions.filter(q => q.topic === name && (subject === 'Sin asignatura' ? (!q.subject || q.subject === 'Uncategorized') : q.subject === subject));
            for (const q of qList) {
                await deleteQuestion(q.id, uid);
            }
        }

        await deleteTopic(name, subject, uid);
        setDeletingTopic(null);
        setTransferTarget('');
        loadData();
    };

    const toggleSubjectExpand = (subject: string) => {
        const newExpanded = new Set(expandedSubjects);
        if (newExpanded.has(subject)) newExpanded.delete(subject);
        else newExpanded.add(subject);
        setExpandedSubjects(newExpanded);
    };

    // Guest users can also manage their local content

    return (
        <div className="max-w-4xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Gestionar Contenido</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Preguntas, asignaturas y temas</p>
                </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex mb-8">
                {[
                    { id: 'questions' as TabType, label: 'Preguntas', icon: Database },
                    { id: 'subjects' as TabType, label: 'Asignaturas y Temas', icon: Layers },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center py-2.5 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                            <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'questions' && (
                <div className="animate-fadeIn">
                    <div className="flex flex-wrap gap-2 mb-6">
                        <div className="relative flex-grow min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Buscar preguntas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full" />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={questionFilter} onChange={(e) => setQuestionFilter(e.target.value as any)} className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
                                <option value="all">Todas</option>
                                <option value="active">Activas</option>
                                <option value="disabled">Desactivadas</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={filterSubject} onChange={(e) => handleSubjectFilterChange(e.target.value)} className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
                                <option value="">Todas las asignaturas</option>
                                {subjectGroups.filter(g => g.name !== 'Sin asignatura').map(g => (
                                    <option key={g.name} value={g.name}>{g.name}</option>
                                ))}
                                <option value="Sin asignatura">Sin asignatura</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer" disabled={availableTopicsForFilter.length === 0}>
                                <option value="">Todos los temas</option>
                                {availableTopicsForFilter.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer">
                                <option value="">Todas las dificultades</option>
                                <option value="easy">Fácil</option>
                                <option value="medium">Media</option>
                                <option value="hard">Difícil</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {                            sortedQuestions.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay preguntas.</p>
                            </div>
                        ) : (
                            sortedQuestions.map(q => (
                                <div key={q.id} className={`group bg-white dark:bg-slate-800 rounded-xl border transition-all ${q.disabled ? 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-75' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'}`}>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${q.disabled ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                        {q.disabled ? <><AlertCircle className="w-3 h-3 mr-1" /> Desactivada</> : <><CheckCircle className="w-3 h-3 mr-1" /> Activa</>}
                                                    </span>
                                                    {q.subject && q.subject !== 'Uncategorized' && (
                                                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">{q.subject}</span>
                                                    )}
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{q.topic}</span>
                                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{q.difficulty}</span>
                                                </div>
                                                {editingId === q.id ? (
                                                    <div className="mt-4 animate-fadeIn">
                                                        <QuestionEditor initialQuestion={q} onSave={(updates) => saveEdit(q.id, updates)} onCancel={() => setEditingId(null)} />
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-900 dark:text-white text-base leading-relaxed break-words font-medium">{q.text}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingId(q.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleToggle(q)} className={`p-2 rounded-lg transition-colors ${q.disabled ? 'text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'}`} title={q.disabled ? 'Activar' : 'Desactivar'}>
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
            )}

            {activeTab === 'subjects' && (
                <div className="animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={loadData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Recargar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button onClick={() => setAddingTopic(true)} className="btn-primary flex items-center py-2 px-4 rounded-lg text-sm">
                            <Plus className="w-4 h-4 mr-2" /> Nuevo Tema
                        </button>
                    </div>

                    {/* Add Topic Form */}
                    {addingTopic && (
                        <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                            <div className="flex gap-2 flex-wrap">
                                <input type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} placeholder="Nombre del tema..." className="flex-1 min-w-[150px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()} />
                                <select value={newTopicSubject} onChange={(e) => setNewTopicSubject(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                                    <option value="">Sin asignatura</option>
                                    {allSubjectNames.map(s => (<option key={s} value={s}>{s}</option>))}
                                </select>
                                <button onClick={handleAddTopic} className="p-2 bg-indigo-600 text-white rounded-lg"><Save className="w-4 h-4" /></button>
                                <button onClick={() => { setAddingTopic(false); setNewTopicName(''); setNewTopicSubject(''); }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}

                    {/* Subject Groups */}
                    {subjectGroups.map(group => {
                        const isExpanded = expandedSubjects.has(group.name);
                        const isUncategorized = group.name === 'Sin asignatura';
                        const isEditingSubject = editingSubject?.oldName === group.name;

                        return (
                            <div key={group.name} className="mb-3">
                                {/* Subject Header */}
                                <div className={`flex items-center p-4 rounded-xl border transition-all ${isUncategorized
                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                                    }`}>
                                    {isEditingSubject ? (
                                        <div className="flex-1 flex gap-2 items-center">
                                            <FolderOpen className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                                            <input type="text" value={editingSubject.newName} onChange={(e) => setEditingSubject({ ...editingSubject, newName: e.target.value })} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRenameSubject()} />
                                            <button onClick={handleRenameSubject} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"><Save className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingSubject(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => toggleSubjectExpand(group.name)} className="flex-1 flex items-center">
                                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 mr-3" /> : <ChevronRight className="w-5 h-5 text-slate-400 mr-3" />}
                                                <FolderOpen className={`w-5 h-5 mr-3 flex-shrink-0 ${isUncategorized ? 'text-slate-400' : 'text-indigo-500'}`} />
                                                <span className="flex-1 text-left font-semibold text-slate-900 dark:text-white">{group.name}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{group.topics.length} temas · {group.questionCount} preguntas</span>
                                            </button>
                                            {!isUncategorized && (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button onClick={() => setEditingSubject({ oldName: group.name, newName: group.name })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title="Renombrar asignatura">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteSubject(group.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Eliminar asignatura">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Topics List */}
                                {isExpanded && (
                                    <div className="ml-8 mt-2 space-y-1.5">
                                        {group.topics.map(topic => {
                                            const isUncategorized = group.name === 'Sin asignatura';
                                            const qCount = questions.filter(q => q.topic === topic && (isUncategorized ? (!q.subject || q.subject === 'Uncategorized') : q.subject === group.name)).length;
                                            const isEditing = editingTopic?.oldName === topic;

                                            return (
                                                <div key={topic} className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5">
                                                    <Tag className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
                                                    {isEditing ? (
                                                        <div className="flex-1 flex gap-2 items-center flex-wrap">
                                                            <input type="text" value={editingTopic.newName} onChange={(e) => setEditingTopic({ ...editingTopic, newName: e.target.value })} className="flex-1 min-w-[120px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm" autoFocus />
                                                            <select value={editingTopic.newSubject} onChange={(e) => setEditingTopic({ ...editingTopic, newSubject: e.target.value })} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm">
                                                                <option value="">Sin asignatura</option>
                                                                {allSubjectNames.map(s => (<option key={s} value={s}>{s}</option>))}
                                                            </select>
                                                            <button onClick={handleRenameTopic} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"><Save className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingTopic(null)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{topic}</span>
                                                            <span className="text-xs text-slate-400 mr-3">{qCount} preguntas</span>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => setEditingTopic({ oldName: topic, oldSubject: isUncategorized ? '' : group.name, newName: topic, newSubject: isUncategorized ? '' : group.name })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="Editar">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDeleteTopic(topic, isUncategorized ? '' : group.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {subjectGroups.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No hay asignaturas ni temas. Crea contenido para empezar.</p>
                        </div>
                    )}

                    {/* Delete Topic Modal */}
                    {deletingTopic && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDeletingTopic(null)}>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Eliminar tema &ldquo;{deletingTopic.name}&rdquo;</h3>
                                {deletingTopic.questionCount > 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Este tema tiene <span className="font-semibold text-slate-700 dark:text-slate-200">{deletingTopic.questionCount} preguntas</span>. ¿Qué quieres hacer?</p>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Este tema no tiene preguntas. ¿Confirmas la eliminación?</p>
                                )}

                                {deletingTopic.questionCount > 0 && (
                                    <div className="space-y-3 mb-6">
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <input type="radio" name="deleteAction" value="transfer" checked={deleteAction === 'transfer'} onChange={() => setDeleteAction('transfer')} className="mt-1" />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Trasladar preguntas a otro tema</span>
                                                {deleteAction === 'transfer' && (
                                                    <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} className="mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                                                        <option value="">Seleccionar tema destino...</option>
                                                        {subjectGroups.flatMap(g => g.topics.filter(t => t !== deletingTopic.name).map(t => ({ topic: t, subject: g.name }))).map(({ topic, subject }) => (
                                                            <option key={`${subject}/${topic}`} value={topic}>{topic} ({subject})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <input type="radio" name="deleteAction" value="orphan" checked={deleteAction === 'orphan'} onChange={() => setDeleteAction('orphan')} className="mt-1" />
                                            <div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Eliminar tema, dejar preguntas sin tema</span>
                                                <p className="text-xs text-slate-400 mt-0.5">Las preguntas seguirán existiendo pero sin tema asignado</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-900/50 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <input type="radio" name="deleteAction" value="deleteQuestions" checked={deleteAction === 'deleteQuestions'} onChange={() => setDeleteAction('deleteQuestions')} className="mt-1" />
                                            <div>
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Eliminar tema y sus preguntas</span>
                                                <p className="text-xs text-red-400 mt-0.5">Esta acción no se puede deshacer</p>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setDeletingTopic(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancelar</button>
                                    <button onClick={handleConfirmDelete} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${deleteAction === 'deleteQuestions' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                        {deleteAction === 'transfer' ? 'Trasladar y eliminar' : deleteAction === 'deleteQuestions' ? 'Eliminar todo' : 'Eliminar tema'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Subject Modal */}
                    {deletingSubject && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDeletingSubject(null)}>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Eliminar asignatura &ldquo;{deletingSubject.name}&rdquo;</h3>
                                {(deletingSubject.topicCount > 0 || deletingSubject.questionCount > 0) ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Esta asignatura tiene <span className="font-semibold text-slate-700 dark:text-slate-200">{deletingSubject.topicCount} temas</span> y <span className="font-semibold text-slate-700 dark:text-slate-200">{deletingSubject.questionCount} preguntas</span>. ¿Qué quieres hacer?</p>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Esta asignatura no tiene temas ni preguntas. ¿Confirmas la eliminación?</p>
                                )}

                                {(deletingSubject.topicCount > 0 || deletingSubject.questionCount > 0) && (
                                    <div className="space-y-3 mb-6">
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <input type="radio" name="subjectDeleteAction" value="transfer" checked={subjectDeleteAction === 'transfer'} onChange={() => setSubjectDeleteAction('transfer')} className="mt-1" />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Reubicar temas y preguntas a otra asignatura</span>
                                                {subjectDeleteAction === 'transfer' && (
                                                    <select value={subjectDeleteTarget} onChange={(e) => setSubjectDeleteTarget(e.target.value)} className="mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                                                        <option value="">Seleccionar asignatura destino...</option>
                                                        {subjectGroups.filter(g => g.name !== deletingSubject.name && g.name !== 'Sin asignatura').map(g => (
                                                            <option key={g.name} value={g.name}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <input type="radio" name="subjectDeleteAction" value="orphan" checked={subjectDeleteAction === 'orphan'} onChange={() => setSubjectDeleteAction('orphan')} className="mt-1" />
                                            <div>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Eliminar asignatura, dejar temas sin asignatura</span>
                                                <p className="text-xs text-slate-400 mt-0.5">Temas y preguntas irán a "Sin asignatura"</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-900/50 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <input type="radio" name="subjectDeleteAction" value="deleteAll" checked={subjectDeleteAction === 'deleteAll'} onChange={() => setSubjectDeleteAction('deleteAll')} className="mt-1" />
                                            <div>
                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Eliminar todo</span>
                                                <p className="text-xs text-red-400 mt-0.5">Asignatura, temas y preguntas se eliminarán permanentemente</p>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setDeletingSubject(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">Cancelar</button>
                                    <button onClick={handleConfirmDeleteSubject} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${subjectDeleteAction === 'deleteAll' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                        {subjectDeleteAction === 'transfer' ? 'Reubicar y eliminar' : subjectDeleteAction === 'deleteAll' ? 'Eliminar todo' : 'Eliminar asignatura'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
