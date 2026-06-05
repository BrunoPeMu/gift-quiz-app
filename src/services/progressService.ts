import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProgress } from '../types';

const PROGRESS_COLLECTION = 'progress';

// Helper to get a fallback ID if not logged in
export function getLocalUserId(): string {
    let userId = localStorage.getItem('gift_quiz_user_id');
    if (!userId) {
        userId = 'guest_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('gift_quiz_user_id', userId);
    }
    return userId;
}

export async function saveProgress(userId: string, attempts: Omit<UserProgress, 'userId' | 'timestamp'>[]) {
    try {
        const colRef = collection(db, PROGRESS_COLLECTION);
        const promises = attempts.map(attempt => {
            return addDoc(colRef, {
                ...attempt,
                userId,
                timestamp: Timestamp.now().toMillis()
            });
        });
        await Promise.all(promises);
    } catch (error) {
        console.error("Error saving progress:", error);
        throw error;
    }
}

export async function getUserProgress(userId: string): Promise<UserProgress[]> {
    try {
        const colRef = collection(db, PROGRESS_COLLECTION);
        const q = query(colRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as UserProgress);
    } catch (error) {
        console.error("Error fetching user progress:", error);
        return [];
    }
}

export interface TopicStats {
    topic: string;
    subject?: string;
    totalAttempts: number;
    correctAttempts: number;
    byDifficulty: {
        easy: { total: number; correct: number };
        medium: { total: number; correct: number };
        hard: { total: number; correct: number };
    };
    questionCount?: number;
}

export async function getTopicProgress(userId: string): Promise<TopicStats[]> {
    const progress = await getUserProgress(userId);
    const statsMap = new Map<string, TopicStats>();

    progress.forEach(p => {
        if (!statsMap.has(p.topic)) {
            statsMap.set(p.topic, {
                topic: p.topic,
                subject: p.subject, // Populate subject from progress entry
                totalAttempts: 0,
                correctAttempts: 0,
                byDifficulty: {
                    easy: { total: 0, correct: 0 },
                    medium: { total: 0, correct: 0 },
                    hard: { total: 0, correct: 0 }
                }
            });
        }

        const stats = statsMap.get(p.topic)!;
        // Update subject if it was missing (optional fallback)
        if (!stats.subject && p.subject) {
            stats.subject = p.subject;
        }

        stats.totalAttempts++;
        if (p.correct) stats.correctAttempts++;

        const diff = p.difficulty as 'easy' | 'medium' | 'hard';
        if (stats.byDifficulty[diff]) {
            stats.byDifficulty[diff].total++;
            if (p.correct) stats.byDifficulty[diff].correct++;
        }
    });

    return Array.from(statsMap.values());
}
