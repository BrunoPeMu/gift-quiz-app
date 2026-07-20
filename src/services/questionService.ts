import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, setDoc, getDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

import type { Question } from '../types';

// --- Local Storage Helpers for Guest Users ---
const GUEST_QUESTIONS_KEY = 'gift_quiz_guest_questions';
const GUEST_TOPICS_KEY = 'gift_quiz_guest_topics';
const GUEST_SUBJECTS_KEY = 'gift_quiz_guest_subjects';

function getGuestData<T>(key: string): T[] {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveGuestData<T>(key: string, data: T[]) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Local storage error:", e);
    }
}
// ----------------------------------------------


const QUESTIONS_COLLECTION = 'questions';
const TOPICS_COLLECTION = 'topics';

export async function saveQuestions(questions: Question[], userId: string) {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const existing = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const newQuestions = questions.map(q => ({
            ...q,
            id: q.id || crypto.randomUUID(),
            userId: userId,
            createdAt: Date.now()
        }));
        saveGuestData(GUEST_QUESTIONS_KEY, [...existing, ...newQuestions]);
        return;
    }

    const colRef = collection(db, QUESTIONS_COLLECTION);
    const promises = questions.map(q => {
        const { id, ...data } = q;
        return addDoc(colRef, {
            ...data,
            userId,
            createdAt: Timestamp.now()
        });
    });
    await Promise.all(promises);
}

export async function updateQuestion(id: string, userId: string, data: Partial<Question>) {
    if (!userId) throw new Error("userId is required");
    
    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const index = questions.findIndex(q => q.id === id);
        if (index !== -1) {
            questions[index] = { ...questions[index], ...data };
            saveGuestData(GUEST_QUESTIONS_KEY, questions);
        }
        return;
    }

    // In a real app, verify ownership first or use security rules.
    // For now, we trust the client implementation to pass the correct ID,
    // but ideally we'd check if doc.data().userId === userId.
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await updateDoc(docRef, data);
}

export async function renameTopic(oldName: string, oldSubject: string, newName: string, userId: string) {
    if (!userId) throw new Error("userId is required");

    // 1. Rename in 'questions' collection
    const q = query(
        collection(db, QUESTIONS_COLLECTION),
        where('topic', '==', oldName),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map(doc => {
        const subj = doc.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            return updateDoc(doc.ref, { topic: newName });
        }
        return Promise.resolve();
    });

    // 2. Rename in 'topics' collection
    const topicQuery = query(
        collection(db, TOPICS_COLLECTION),
        where('name', '==', oldName),
        where('userId', '==', userId)
    );
    const topicSnapshot = await getDocs(topicQuery);
    topicSnapshot.docs.forEach(doc => {
        const subj = doc.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            promises.push(updateDoc(doc.ref, { name: newName }));
        }
    });

    await Promise.all(promises);
}

export async function updateTopicSubject(topicName: string, oldSubject: string, newSubject: string, userId: string) {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            const subj = q.subject || '';
            if (q.topic === topicName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...q, subject: newSubject };
            }
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        let found = false;
        const updatedTopics = topics.map(t => {
            const subj = t.subject || '';
            if (t.name === topicName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                found = true;
                return { ...t, subject: newSubject };
            }
            return t;
        });
        if (!found) {
            updatedTopics.push({ name: topicName, subject: newSubject });
        }
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);
        return;
    }

    // 1. Update in 'topics' collection
    const topicQuery = query(
        collection(db, TOPICS_COLLECTION),
        where('name', '==', topicName),
        where('userId', '==', userId)
    );
    const topicSnapshot = await getDocs(topicQuery);

    const promises: Promise<void>[] = [];

    let foundInTopics = false;
    topicSnapshot.docs.forEach(doc => {
        const subj = doc.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            promises.push(updateDoc(doc.ref, { subject: newSubject }));
            foundInTopics = true;
        }
    });

    if (!foundInTopics) {
        // Create if doesn't exist
        promises.push(addDoc(collection(db, TOPICS_COLLECTION), {
            name: topicName,
            subject: newSubject,
            userId,
            createdAt: Timestamp.now()
        }).then(() => { }));
    }

    // 2. Update in 'questions' collection
    const q = query(
        collection(db, QUESTIONS_COLLECTION),
        where('topic', '==', topicName),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
        const subj = doc.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            promises.push(updateDoc(doc.ref, { subject: newSubject }));
        }
    });

    await Promise.all(promises);
}

export async function addTopic(name: string, userId: string, subject?: string) {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const targetSubject = subject || '';
        const exists = topics.some(t => {
            const subj = t.subject || '';
            return t.name === name && (subj === targetSubject || (targetSubject === '' && subj === 'Uncategorized'));
        });
        if (!exists) {
            topics.push({ name, subject: subject || undefined });
            saveGuestData(GUEST_TOPICS_KEY, topics);
        }
        return;
    }

    const colRef = collection(db, TOPICS_COLLECTION);

    const q = query(
        colRef,
        where('name', '==', name),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    const targetSubject = subject || '';
    let exists = false;
    
    snapshot.docs.forEach(doc => {
        const subj = doc.data().subject || '';
        if (subj === targetSubject || (targetSubject === '' && subj === 'Uncategorized')) {
            exists = true;
        }
    });

    if (!exists) {
        await addDoc(colRef, {
            name,
            subject: subject || null,
            userId,
            createdAt: Timestamp.now()
        });
    }
}

export async function getQuestions(userId: string, topic?: string, includeDisabled = false, subject?: string): Promise<Question[]> {
    if (!userId) {
        console.warn("getQuestions called without userId");
        return [];
    }

    if (userId.startsWith('guest')) {
        let questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        if (topic && topic !== 'All') {
            questions = questions.filter(q => q.topic === topic);
        }
        if (subject && subject !== 'All') {
            questions = questions.filter(q => q.subject === subject);
        }
        if (!includeDisabled) {
            questions = questions.filter(q => !q.disabled);
        }
        return questions;
    }

    const colRef = collection(db, QUESTIONS_COLLECTION);
    let q = query(colRef, where('userId', '==', userId));

    if (topic && topic !== 'All') {
        q = query(colRef, where('topic', '==', topic), where('userId', '==', userId));
    }

    const snapshot = await getDocs(q);
    let questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Question));

    // Filter by subject client-side (Firestore doesn't support compound queries well)
    if (subject && subject !== 'All') {
        questions = questions.filter(q => q.subject === subject);
    }

    if (includeDisabled) {
        return questions;
    }

    return questions.filter(q => !q.disabled);
}

export interface TopicData {
    name: string;
    subject?: string;
}

export async function getTopics(userId: string): Promise<string[]> {
    const topics = await getTopicsData(userId);
    return topics.map(t => t.name);
}

export async function getTopicsData(userId: string): Promise<TopicData[]> {
    if (!userId) return [];

    if (userId.startsWith('guest')) {
        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const pairs = new Set<string>();
        const addPair = (name: string, subj?: string) => {
            pairs.add(JSON.stringify({ name, subject: subj || 'Uncategorized' }));
        };
        topics.forEach(t => addPair(t.name, t.subject));
        questions.forEach(q => addPair(q.topic, q.subject));
        
        return Array.from(pairs)
            .map(p => JSON.parse(p) as TopicData)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    const pairs = new Set<string>();

    const addPair = (name: string, subject?: string) => {
        pairs.add(JSON.stringify({ name, subject: subject || 'Uncategorized' }));
    };

    // 1. Get from 'topics' collection
    const topicQuery = query(collection(db, TOPICS_COLLECTION), where('userId', '==', userId));
    const topicSnapshot = await getDocs(topicQuery);
    topicSnapshot.docs.forEach(d => {
        const data = d.data();
        addPair(data.name, data.subject);
    });

    // 2. Get from 'questions' collection (legacy/fallback, but scoped)
    // Note: This might be expensive if many questions, but it's a fallback.
    // Ideally we rely on 'topics' collection.
    const questionQuery = query(collection(db, QUESTIONS_COLLECTION), where('userId', '==', userId));
    const questionSnapshot = await getDocs(questionQuery);
    questionSnapshot.docs.forEach(d => {
        const data = d.data();
        addPair(data.topic, data.subject);
    });

    return Array.from(pairs)
        .map(p => JSON.parse(p) as TopicData)
        .sort((a, b) => a.name.localeCompare(b.name));
}

const SUBJECTS_COLLECTION = 'subjects';

export async function getSubjectOrder(): Promise<string[]> {
    const docRef = doc(db, SUBJECTS_COLLECTION, 'config');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data().order || [];
    }
    return [];
}

export async function updateSubjectOrder(subjects: string[]) {
    const docRef = doc(db, SUBJECTS_COLLECTION, 'config');
    await setDoc(docRef, { order: subjects }, { merge: true });
}

export async function migrateLegacyData(userId: string, forceAll = false) {
    if (!userId) return 0;

    let count = 0;

    // 1. Migrate Questions
    // We cannot query for 'userId == null' easily in Firestore without composite indexes or custom logic.
    // Instead, we fetch ALL questions (assuming reasonable dataset size for this app) and client-side filter.
    const qCol = collection(db, QUESTIONS_COLLECTION);
    const qSnap = await getDocs(qCol);

    // We update anything that has NO userId OR has 'guest' as userId
    // If forceAll is true, we update EVERYTHING that isn't already ours.
    const qUpdates = qSnap.docs
        .filter(d => {
            const data = d.data();
            if (forceAll) {
                return data.userId !== userId;
            }
            return !data.userId || data.userId === 'guest';
        })
        .map(d => updateDoc(d.ref, { userId }));

    count += qUpdates.length;
    await Promise.all(qUpdates);

    // 2. Migrate Topics
    const tCol = collection(db, TOPICS_COLLECTION);
    const tSnap = await getDocs(tCol);
    const tUpdates = tSnap.docs
        .filter(d => {
            const data = d.data();
            if (forceAll) {
                return data.userId !== userId;
            }
            return !data.userId || data.userId === 'guest';
        })
        .map(d => updateDoc(d.ref, { userId }));

    count += tUpdates.length;
    await Promise.all(tUpdates);

    // 3. Migrate Progress (NEW)
    const pCol = collection(db, 'progress');
    const pSnap = await getDocs(pCol);
    const pUpdates = pSnap.docs
        .filter(d => {
            const data = d.data();
            if (forceAll) {
                return data.userId !== userId;
            }
            return !data.userId || data.userId === 'guest';
        })
        .map(d => updateDoc(d.ref, { userId }));

    count += pUpdates.length;
    await Promise.all(pUpdates);

    return count;
}

export async function deleteQuestion(id: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const filtered = questions.filter(q => q.id !== id);
        saveGuestData(GUEST_QUESTIONS_KEY, filtered);
        return;
    }

    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().userId === userId) {
        await deleteDoc(docRef);
    }
}

export async function deleteTopic(topicName: string, subjectName: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        // Remove from topics
        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const filteredTopics = topics.filter(t => {
            const subj = t.subject || '';
            return !(t.name === topicName && (subj === subjectName || (subjectName === '' && subj === 'Uncategorized')));
        });
        saveGuestData(GUEST_TOPICS_KEY, filteredTopics);

        // Remove subject from questions
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            const subj = q.subject || '';
            if (q.topic === topicName && (subj === subjectName || (subjectName === '' && subj === 'Uncategorized'))) {
                return { ...q, subject: undefined };
            }
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);
        return;
    }

    // Delete from topics collection
    const topicQuery = query(
        collection(db, TOPICS_COLLECTION),
        where('name', '==', topicName),
        where('userId', '==', userId)
    );
    const topicSnapshot = await getDocs(topicQuery);
    const batch = writeBatch(db);
    topicSnapshot.docs.forEach(d => {
        const subj = d.data().subject || '';
        if (subj === subjectName || (subjectName === '' && subj === 'Uncategorized')) {
            batch.delete(d.ref);
        }
    });

    // Remove subject from questions with this topic (set to null)
    const q = query(
        collection(db, QUESTIONS_COLLECTION),
        where('topic', '==', topicName),
        where('userId', '==', userId)
    );
    const qSnapshot = await getDocs(q);
    qSnapshot.docs.forEach(d => {
        const subj = d.data().subject || '';
        if (subj === subjectName || (subjectName === '' && subj === 'Uncategorized')) {
            batch.update(d.ref, { subject: null });
        }
    });

    await batch.commit();
}

export async function renameTopicDirect(oldName: string, oldSubject: string, newName: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            const subj = q.subject || '';
            if (q.topic === oldName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...q, topic: newName };
            }
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const updatedTopics = topics.map(t => {
            const subj = t.subject || '';
            if (t.name === oldName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...t, name: newName };
            }
            return t;
        });
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);
        return;
    }

    const batch = writeBatch(db);

    // Update questions
    const q = query(
        collection(db, QUESTIONS_COLLECTION),
        where('topic', '==', oldName),
        where('userId', '==', userId)
    );
    const qSnapshot = await getDocs(q);
    qSnapshot.docs.forEach(d => {
        const subj = d.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            batch.update(d.ref, { topic: newName });
        }
    });

    // Update topics collection
    const topicQuery = query(
        collection(db, TOPICS_COLLECTION),
        where('name', '==', oldName),
        where('userId', '==', userId)
    );
    const topicSnapshot = await getDocs(topicQuery);
    topicSnapshot.docs.forEach(d => {
        const subj = d.data().subject || '';
        if (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized')) {
            batch.update(d.ref, { name: newName });
        }
    });

    await batch.commit();
}

export async function addSubject(name: string, userId: string): Promise<void> {
    if (!userId || !name.trim()) return;

    if (userId.startsWith('guest')) {
        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        if (!subjects.some(s => s.name === name.trim())) {
            subjects.push({ name: name.trim() });
            saveGuestData(GUEST_SUBJECTS_KEY, subjects);
        }
        return;
    }

    const subjCol = collection(db, 'subjects');
    await addDoc(subjCol, {
        name: name.trim(),
        userId,
        createdAt: Date.now()
    });
}

export async function renameSubject(oldName: string, newName: string, userId: string): Promise<void> {
    if (!userId || !newName.trim()) return;

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            if (q.subject === oldName) return { ...q, subject: newName.trim() };
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const updatedTopics = topics.map(t => {
            if (t.subject === oldName) return { ...t, subject: newName.trim() };
            return t;
        });
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);

        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        const updatedSubjects = subjects.map(s => {
            if (s.name === oldName) return { name: newName.trim() };
            return s;
        });
        saveGuestData(GUEST_SUBJECTS_KEY, updatedSubjects);
        return;
    }

    const batch = writeBatch(db);

    const q = query(collection(db, QUESTIONS_COLLECTION), where('subject', '==', oldName), where('userId', '==', userId));
    const qSnapshot = await getDocs(q);
    qSnapshot.docs.forEach(d => batch.update(d.ref, { subject: newName.trim() }));

    const t = query(collection(db, TOPICS_COLLECTION), where('subject', '==', oldName), where('userId', '==', userId));
    const tSnapshot = await getDocs(t);
    tSnapshot.docs.forEach(d => batch.update(d.ref, { subject: newName.trim() }));

    await batch.commit();
}

export async function deleteSubject(subjectName: string, userId: string, action: 'transfer' | 'orphan' | 'deleteAll', targetSubject?: string): Promise<void> {
    if (!userId) return;

    if (userId.startsWith('guest')) {
        let questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        let topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);

        if (action === 'transfer' && targetSubject) {
            questions = questions.map(q => q.subject === subjectName ? { ...q, subject: targetSubject } : q);
            topics = topics.map(t => t.subject === subjectName ? { ...t, subject: targetSubject } : t);
        } else if (action === 'orphan') {
            questions = questions.map(q => q.subject === subjectName ? { ...q, subject: undefined } : q);
            topics = topics.map(t => t.subject === subjectName ? { ...t, subject: undefined } : t);
        } else if (action === 'deleteAll') {
            questions = questions.filter(q => q.subject !== subjectName);
            topics = topics.filter(t => t.subject !== subjectName);
        }
        
        saveGuestData(GUEST_QUESTIONS_KEY, questions);
        saveGuestData(GUEST_TOPICS_KEY, topics);

        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        const filteredSubjects = subjects.filter(s => s.name !== subjectName);
        saveGuestData(GUEST_SUBJECTS_KEY, filteredSubjects);
        return;
    }

    const batch = writeBatch(db);

    const qSnap = await getDocs(query(collection(db, QUESTIONS_COLLECTION), where('subject', '==', subjectName), where('userId', '==', userId)));
    const tSnap = await getDocs(query(collection(db, TOPICS_COLLECTION), where('subject', '==', subjectName), where('userId', '==', userId)));

    if (action === 'transfer' && targetSubject) {
        qSnap.docs.forEach(d => batch.update(d.ref, { subject: targetSubject }));
        tSnap.docs.forEach(d => batch.update(d.ref, { subject: targetSubject }));
    } else if (action === 'orphan') {
        qSnap.docs.forEach(d => batch.update(d.ref, { subject: null }));
        tSnap.docs.forEach(d => batch.update(d.ref, { subject: null }));
    } else if (action === 'deleteAll') {
        qSnap.docs.forEach(d => batch.delete(d.ref));
        tSnap.docs.forEach(d => batch.delete(d.ref));
    }

    await batch.commit();
}
