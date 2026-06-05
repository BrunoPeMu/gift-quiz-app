import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { SharedQuiz, QuizConfig, Question } from '../types';

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
