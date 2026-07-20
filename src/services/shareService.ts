import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SharedQuiz, QuizConfig, Question, SharedTopic } from '../types';

export async function shareQuiz(config: QuizConfig, questions: Question[], creatorId: string): Promise<string> {
    const shareId = crypto.randomUUID().slice(0, 8); // Short ID for easier sharing
    const shareData: SharedQuiz = {
        id: shareId,
        creatorId,
        config,
        questions,
        createdAt: Date.now()
    };

    await setDoc(doc(db, 'shared_quizzes', shareId), shareData);
    return shareId;
}

export async function getSharedQuiz(shareId: string): Promise<SharedQuiz | null> {
    const docRef = doc(db, 'shared_quizzes', shareId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as SharedQuiz;
    } else {
        return null;
    }
}

export async function shareTopic(
    topicName: string, 
    subjectName: string | undefined, 
    questions: Question[], 
    creatorId: string, 
    creatorName?: string,
    providedShareId?: string
): Promise<string> {
    const shareId = providedShareId || crypto.randomUUID().slice(0, 8);
    const shareData: SharedTopic = {
        id: shareId,
        creatorId,
        creatorName,
        topicName,
        subjectName,
        questions,
        createdAt: Date.now()
    };

    await setDoc(doc(db, 'shared_topics', shareId), shareData);
    return shareId;
}

export async function getSharedTopic(shareId: string): Promise<SharedTopic | null> {
    const docRef = doc(db, 'shared_topics', shareId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as SharedTopic;
    } else {
        return null;
    }
}
