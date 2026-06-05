import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getQuestions, updateQuestion, deleteTopic, renameTopicDirect, updateTopicSubject, addTopic, getTopicsData } from '../services/questionService';
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
    const [addingTopic, setAddingTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterTopic, setFilterTopic] = useState('');

    const loadData = async () => {
        if (!currentUser || currentUser.uid === 'guest') return;

        const [allQuestions, topicsData] = await Promise.all([
            getQuestions(currentUser.uid, undefined, true),
            getTopicsData(currentUser.uid)
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
        return matchesFilter && matchesSearch && matchesSubject && matchesTopic;
    });

    const handleSubjectFilterChange = (subject: string) => {
        setFilterSubject(subject);
        setFilterTopic('');
    };

    const allSubjectNames = useMemo(() => {
        return subjectGroups.filter(s => s.name !== 'Sin asignatura').map(s => s.name);
    }, [subjectGroups]);

    const handleToggle = async (q: Question) => {
        if (!currentUser) return;
        await updateQuestion(q.id, currentUser.uid, { disabled: !q.disabled });
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
        if (!currentUser) return;
        await updateQuestion(id, currentUser.uid, updates);
        setEditingId(null);
        loadData();
    };

    const handleAddTopic = async () => {
        if (!currentUser || !newTopicName.trim()) return;
        const subj = newTopicSubject || undefined;
        await addTopic(newTopicName.trim(), currentUser.uid, subj);
        setNewTopicName('');
        setNewTopicSubject('');
        setAddingTopic(false);
        loadData();
    };

    const handleRenameTopic = async () => {
        if (!currentUser || !editingTopic) return;
        const { oldName, oldSubject, newName, newSubject } = editingTopic;
        if (!newName.trim()) return;

        if (oldName !== newName.trim()) {
            await renameTopicDirect(oldName, oldSubject, newName.trim(), currentUser.uid);
        }
        if (newSubject !== oldSubject) {
            await updateTopicSubject(newName.trim(), oldSubject, newSubject, currentUser.uid);
        }
        setEditingTopic(null);
        loadData();
    };

    const handleDeleteTopic = async (topicName: string, subjectName: string) => {
        if (!currentUser) return;
        if (!confirm(`¿Eliminar el tema "${topicName}"? Las preguntas no se eliminarán.`)) return;
        await deleteTopic(topicName, subjectName, currentUser.uid);
        loadData();
    };

    const toggleSubjectExpand = (subject: string) => {
        const newExpanded = new Set(expandedSubjects);
        if (newExpanded.has(subject)) newExpanded.delete(subject);
        else newExpanded.add(subject);
        setExpandedSubjects(newExpanded);
    };

    if (!currentUser || currentUser.uid === 'guest') {
        return (
            <div className="max-w-4xl mx-auto pb-20 pt-4 px-4 sm:px-0">
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Inicia sesión para gestionar tu contenido.</p>
                </div>
            </div>
        );
    }

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
                    </div>

                    <div className="space-y-4">
                        {filteredQuestions.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay preguntas.</p>
                            </div>
                        ) : (
                            filteredQuestions.map(q => (
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

                        return (
                            <div key={group.name} className="mb-3">
                                {/* Subject Header - clickable toggle */}
                                <button
                                    onClick={() => toggleSubjectExpand(group.name)}
                                    className={`w-full flex items-center p-4 rounded-xl border transition-all ${isUncategorized
                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                                        }`}
                                >
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 mr-3" /> : <ChevronRight className="w-5 h-5 text-slate-400 mr-3" />}
                                    <FolderOpen className={`w-5 h-5 mr-3 flex-shrink-0 ${isUncategorized ? 'text-slate-400' : 'text-indigo-500'}`} />
                                    <span className="flex-1 text-left font-semibold text-slate-900 dark:text-white">{group.name}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{group.topics.length} temas · {group.questionCount} preguntas</span>
                                </button>

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
                </div>
            )}
        </div>
    );
}
