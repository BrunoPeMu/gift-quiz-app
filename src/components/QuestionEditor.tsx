import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Check, Code, Layout } from 'lucide-react';
import type { Question, QuestionType } from '../types';
import { reconstructGIFT } from '../lib/giftParser';

interface QuestionEditorProps {
    initialQuestion: Question;
    onSave: (updatedQuestion: Partial<Question>) => void;
    onCancel: () => void;
    hideCodeMode?: boolean;
}

export function QuestionEditor({ initialQuestion, onSave, onCancel, hideCodeMode = false }: QuestionEditorProps) {
    const { t } = useTranslation();

    // Sanitize initial data
    const sanitizeInitialData = () => {
        let cleanOptions = initialQuestion.options || [];
        let cleanAnswer = initialQuestion.answer;
        let cleanFeedback = initialQuestion.feedback || '';
        let cleanOptionsFeedback = initialQuestion.optionsFeedback || {};

        // Helper to split feedback
        const splitFeedback = (val: string): { text: string, fb: string } => {
            if (typeof val !== 'string') return { text: val, fb: '' };
            const parts = val.split('#');
            if (parts.length > 1) {
                return {
                    text: parts[0].trim(),
                    fb: parts.slice(1).join('#').trim()
                };
            }
            return { text: val, fb: '' };
        };

        // Clean options if they don't have explicit feedback map yet
        if (cleanOptions.length > 0 && Object.keys(cleanOptionsFeedback).length === 0) {
            cleanOptions = cleanOptions.map(opt => {
                const { text, fb } = splitFeedback(opt);
                if (fb) {
                    cleanOptionsFeedback[text] = fb;
                }
                return text;
            });
        }

        // Clean answer (if string) - this part remains for general feedback extraction from answer if needed
        if (typeof cleanAnswer === 'string') {
            const { text, fb } = splitFeedback(cleanAnswer);
            cleanAnswer = text;
            if (fb && !cleanFeedback) {
                cleanFeedback = fb;
            }
        } else if (Array.isArray(cleanAnswer)) {
            // For SHORT answer type
            cleanAnswer = cleanAnswer.map(ans => {
                const { text, fb } = splitFeedback(ans);
                if (fb && !cleanFeedback) cleanFeedback = fb;
                return text;
            });
        }

        return { cleanOptions, cleanAnswer, cleanFeedback, cleanOptionsFeedback };
    };

    const { cleanOptions, cleanAnswer, cleanFeedback, cleanOptionsFeedback } = sanitizeInitialData();

    const [mode, setMode] = useState<'visual' | 'code'>('visual');
    const [text, setText] = useState(initialQuestion.text);
    const [type, setType] = useState<QuestionType>(initialQuestion.type);
    const [options, setOptions] = useState<string[]>(cleanOptions);
    const [answer, setAnswer] = useState<any>(cleanAnswer);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialQuestion.difficulty);
    const [feedback] = useState(cleanFeedback);
    const [optionsFeedback, setOptionsFeedback] = useState<Record<string, string>>(cleanOptionsFeedback);
    const [giftSource, setGiftSource] = useState(initialQuestion.giftSource || '');

    // Sync visual state to GIFT source when switching to code mode
    useEffect(() => {
        if (mode === 'code') {
            const tempQ: Question = {
                ...initialQuestion,
                text,
                type,
                options,
                answer,
                difficulty,
                feedback,
                optionsFeedback
            };
            setGiftSource(reconstructGIFT(tempQ));
        }
    }, [mode]);

    const handleSave = () => {
        if (mode === 'code') {
            // If saving from code mode, we just pass the source and let the parent re-parse
            // But wait, the parent expects Partial<Question>.
            // We should probably parse it here or just pass the giftSource and let parent handle it.
            // For consistency with the visual editor, let's pass the giftSource.
            onSave({ giftSource, difficulty });
        } else {
            // Visual mode: construct the question object
            const updatedQ: Partial<Question> = {
                text,
                type,
                options,
                answer,
                difficulty,
                feedback,
                optionsFeedback
            };
            // Generate GIFT source from visual state so it's always in sync
            updatedQ.giftSource = reconstructGIFT({ ...initialQuestion, ...updatedQ } as Question);
            onSave(updatedQ);
        }
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const updateOption = (index: number, value: string) => {
        const oldVal = options[index];
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);

        // Update feedback map key if option text changes
        if (optionsFeedback[oldVal]) {
            const newFb = { ...optionsFeedback };
            newFb[value] = newFb[oldVal];
            delete newFb[oldVal];
            setOptionsFeedback(newFb);
        }

        // If this option was the answer, update answer too?
        // For MC, answer is the string value.
        if (type === 'MC' && answer === options[index]) {
            setAnswer(value);
        }
    };

    const updateOptionFeedback = (optionText: string, fb: string) => {
        setOptionsFeedback(prev => ({
            ...prev,
            [optionText]: fb
        }));
    };

    const removeOption = (index: number) => {
        const valToRemove = options[index];
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);

        // Cleanup feedback
        if (optionsFeedback[valToRemove]) {
            const newFb = { ...optionsFeedback };
            delete newFb[valToRemove];
            setOptionsFeedback(newFb);
        }

        if (type === 'MC' && answer === valToRemove) {
            setAnswer(newOptions[0] || '');
        }
    };

    return (
        <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="heading-2">
                    {mode === 'visual' ? t('quiz.editVisual') : t('quiz.editCode')}
                </h3>
                {!hideCodeMode && (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setMode('visual')}
                            className={`p-2 rounded-md transition-colors ${mode === 'visual' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            title="Visual Editor"
                        >
                            <Layout className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setMode('code')}
                            className={`p-2 rounded-md transition-colors ${mode === 'code' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            title="GIFT Source"
                        >
                            <Code className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {mode === 'code' ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">GIFT Source</label>
                        <textarea
                            value={giftSource}
                            onChange={(e) => setGiftSource(e.target.value)}
                            className="input-field h-64 font-mono"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">{t('quiz.questionText')}</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="input-field"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">{t('quiz.type')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as QuestionType)}
                                className="input-field"
                            >
                                <option value="MC">Multiple Choice</option>
                                <option value="TF">True/False</option>
                                <option value="SHORT">Short Answer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">{t('config.difficulty')}</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as any)}
                                className="input-field"
                            >
                                <option value="easy">{t('config.difficulties.easy')}</option>
                                <option value="medium">{t('config.difficulties.medium')}</option>
                                <option value="hard">{t('config.difficulties.hard')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Type Specific Fields */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <label className="block text-sm font-medium text-body mb-4">{t('quiz.answers')}</label>

                        {type === 'TF' && (
                            <div className="flex space-x-6 text-slate-800 dark:text-slate-200">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={answer === true}
                                        onChange={() => setAnswer(true)}
                                        className="text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                    />
                                    <span>True</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={answer === false}
                                        onChange={() => setAnswer(false)}
                                        className="text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                    />
                                    <span>False</span>
                                </label>
                            </div>
                        )}

                        {type === 'MC' && (
                            <div className="space-y-4">
                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                                        <div className="pt-2">
                                            <input
                                                type="radio"
                                                name="correct-answer"
                                                checked={answer === opt}
                                                onChange={() => setAnswer(opt)}
                                                className="text-indigo-600 focus:ring-indigo-500 mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                            />
                                        </div>
                                        <div className="flex-grow space-y-2">
                                            <div>
                                                <label className="block text-xs font-medium text-muted mb-1">
                                                    {t('quiz.answers')} {idx + 1}
                                                </label>
                                                <textarea
                                                    value={opt}
                                                    onChange={(e) => updateOption(idx, e.target.value)}
                                                    className="input-field text-sm"
                                                    rows={3}
                                                    placeholder={`Option ${idx + 1}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">
                                                    Feedback ({t('quiz.optional')})
                                                </label>
                                                <textarea
                                                    value={optionsFeedback[opt] || ''}
                                                    onChange={(e) => updateOptionFeedback(opt, e.target.value)}
                                                    className="input-field text-xs bg-slate-50 dark:bg-slate-800"
                                                    rows={2}
                                                    placeholder="Specific feedback for this option..."
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeOption(idx)}
                                            className="text-slate-400 hover:text-red-500 pt-2"
                                            disabled={options.length <= 2}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addOption}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Option
                                </button>
                            </div>
                        )}

                        {type === 'SHORT' && (
                            <div className="space-y-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-xs text-blue-700 dark:text-blue-300 mb-2 border border-blue-100 dark:border-blue-900/30">
                                    {t('quiz.help.fillInBlank')}
                                </div>
                                <p className="text-xs text-muted mb-2">Enter all accepted answers.</p>
                                {(Array.isArray(answer) ? answer : []).map((ans: string, idx: number) => (
                                    <div key={idx} className="flex items-start space-x-3">
                                        <textarea
                                            value={ans}
                                            onChange={(e) => {
                                                const newAns = [...(answer as string[])];
                                                newAns[idx] = e.target.value;
                                                setAnswer(newAns);
                                            }}
                                            className="input-field flex-grow text-sm"
                                            rows={2}
                                        />
                                        <button
                                            onClick={() => {
                                                const newAns = (answer as string[]).filter((_, i) => i !== idx);
                                                setAnswer(newAns);
                                            }}
                                            className="text-slate-400 hover:text-red-500 pt-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setAnswer([...(Array.isArray(answer) ? answer : []), ''])}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Accepted Answer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <button
                    onClick={onCancel}
                    className="btn-secondary"
                >
                    {t('manage.cancel')}
                </button>
                <button
                    onClick={handleSave}
                    className="btn-primary flex items-center"
                >
                    <Check className="w-4 h-4 mr-2" />
                    {t('manage.save')}
                </button>
            </div>
        </div>
    );
}
