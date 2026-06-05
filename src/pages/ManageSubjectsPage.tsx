import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSubjects, syncSubjects, updateSubjectOrder } from '../services/subjectService';
import { useAuth } from '../contexts/AuthContext';
import type { Subject } from '../types';
import { GripVertical, RefreshCw, Save, Layers } from 'lucide-react';

function SortableItem(props: { id: string; name: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all flex items-center mb-3">
            <button
                {...attributes}
                {...listeners}
                className="mr-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Arrastrar para ordenar"
            >
                <GripVertical className="w-5 h-5" />
            </button>
            <div className="flex-grow">
                <span className="font-semibold text-slate-900 dark:text-white text-base">{props.name}</span>
            </div>
        </div>
    );
}

export default function ManageSubjectsPage() {
    const { currentUser } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (currentUser && currentUser.uid !== 'guest') {
            loadData();
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    const loadData = async () => {
        if (!currentUser) return;
        setLoading(true);
        await syncSubjects(currentUser.uid); // Ensure we have all topics
        const data = await getSubjects(currentUser.uid);
        setSubjects(data);
        setLoading(false);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setSubjects((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSubjectOrder(subjects);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto pb-20 pt-4 px-4 sm:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        Orden de Temas
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Organiza cómo aparecen tus temas en el inicio
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="Sincronizar"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Guardando...' : 'Guardar Orden'}
                    </button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={subjects.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {subjects.map((subject) => (
                            <SortableItem key={subject.id} id={subject.id} name={subject.name} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {subjects.length === 0 && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay temas para ordenar.</p>
                </div>
            )}
        </div>
    );
}
