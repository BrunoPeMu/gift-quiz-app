import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
    text: string;
    type: 'MC' | 'TF' | 'SHORT';
    options?: string[];
    answer: string;
    difficulty: AIDifficulty;
}

/**
 * Generates questions using the secure backend Cloud Function.
 * @param apiKey - Deprecated/Ignored. kept for signature compatibility during migration if needed, but preferably remove.
 * @param text - Source text.
 * @param difficulty - Difficulty level.
 * @param count - Number of questions.
 * @param types - Array of types e.g. ['MCQ', 'TF'].
 */
export async function generateQuestions(
    _apiKey: string, // Kept for now to avoid breaking UploadPage immediately
    text: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    types: string[] = ['MCQ', 'TF', 'SHORT'],
    mode: 'generate' | 'parse' = 'generate',
    pdf?: string
): Promise<GeneratedQuestion[]> {

    // Logic moved to backend.
    const generate = httpsCallable<any, GeneratedQuestion[]>(functions, 'generateQuestions');

    try {
        const result = await generate({
            text: text || undefined,
            pdf,
            mode,
            difficulty,
            count,
            types
        });
        return result.data;
    } catch (error: any) {
        console.error("Cloud Function Error:", error);
        throw new Error(error.message || "Failed to generate questions via Cloud Function");
    }
}
