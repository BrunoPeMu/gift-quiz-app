import { db } from './firebase';
import { collection, getDocs, doc, writeBatch, query, where, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Subject } from '../types';
import { getTopics, getTopicsData } from './questionService';

const COLLECTION = 'subjects';

export const getSubjects = async (userId: string): Promise<Subject[]> => {
    if (!userId) return [];
    try {
        const q = query(
            collection(db, COLLECTION),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const subjects = snapshot.docs.map(d => d.data() as Subject);
        return subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
};

export const getSubjectNames = async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    try {
        const topicsData = await getTopicsData(userId);
        const subjects = new Set<string>();
        topicsData.forEach(t => {
            if (t.subject && t.subject !== 'Uncategorized') {
                subjects.add(t.subject);
            }
        });
        return Array.from(subjects).sort();
    } catch (error) {
        console.error('Error fetching subject names:', error);
        return [];
    }
};

export const addSubject = async (name: string, userId: string): Promise<void> => {
    if (!userId || !name.trim()) return;
    const subjects = await getSubjects(userId);
    const maxOrder = subjects.length > 0 ? Math.max(...subjects.map(s => s.order)) : 0;
    const id = `${userId}_${name.trim().replace(/\s+/g, '_')}_${Date.now()}`;
    await addDoc(collection(db, COLLECTION), {
        id,
        name: name.trim(),
        order: maxOrder + 1,
        isActive: true,
        userId
    });
};

export const renameSubject = async (subjectId: string, newName: string, userId: string): Promise<void> => {
    if (!userId || !newName.trim()) return;
    const ref = doc(db, COLLECTION, subjectId);
    await updateDoc(ref, { name: newName.trim() });
};

export const deleteSubject = async (subjectId: string, userId: string): Promise<void> => {
    if (!userId) return;
    const ref = doc(db, COLLECTION, subjectId);
    await deleteDoc(ref);
};

export const syncSubjects = async (userId: string): Promise<void> => {
    if (!userId) return;
    try {
        const topics = await getTopics(userId);
        const existingSubjects = await getSubjects(userId);
        const existingNames = new Set(existingSubjects.map(s => s.name));
        const newTopics = topics.filter(t => !existingNames.has(t));

        if (newTopics.length === 0) return;

        const batch = writeBatch(db);
        let maxOrder = existingSubjects.length > 0
            ? Math.max(...existingSubjects.map(s => s.order))
            : 0;

        newTopics.forEach(topic => {
            maxOrder++;
            const id = `${userId}_${topic.replace(/\s+/g, '_')}`;
            const newSubject: Subject = {
                id: id,
                name: topic,
                order: maxOrder,
                isActive: true,
                userId
            };
            const ref = doc(db, COLLECTION, newSubject.id);
            batch.set(ref, newSubject);
        });

        await batch.commit();
        console.log(`Synced ${newTopics.length} new subjects for user ${userId}.`);
    } catch (error) {
        console.error('Error syncing subjects:', error);
    }
};

export const updateSubjectOrder = async (subjects: Subject[]): Promise<void> => {
    try {
        const batch = writeBatch(db);
        subjects.forEach((s, index) => {
            const ref = doc(db, COLLECTION, s.id);
            batch.update(ref, { order: index + 1 });
        });
        await batch.commit();
    } catch (error) {
        console.error('Error updating subject order:', error);
        throw error;
    }
};
