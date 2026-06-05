import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Question } from '../types';

const QUESTIONS_COLLECTION = 'questions';
const TOPICS_COLLECTION = 'topics';

export async function saveQuestions(questions: Question[], userId: string) {
    if (!userId) throw new Error("userId is required");
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

export async function deleteTopic(topicName: string, subjectName: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

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
