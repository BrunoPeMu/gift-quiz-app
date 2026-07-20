import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { isAiBlocked } from '../config/featureFlags';

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
 * Valida primero si el tier del usuario tiene acceso (bloqueo temporal para free/guest).
 * @param tier - Tier del usuario para validación local de bloqueo.
 * @param text - Source text.
 * @param difficulty - Difficulty level.
 * @param count - Number of questions.
 * @param types - Array of types e.g. ['MCQ', 'TF'].
 */
export async function generateQuestions(
    tier: string | undefined,
    text: string,
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
    types: string[] = ['MCQ', 'TF', 'SHORT'],
    mode: 'generate' | 'parse' | 'extract_key' | 'parse_with_key' = 'generate',
    pdf?: string,
    answerKey?: string
): Promise<any> {

    // Validación local contra tiers bloqueados
    // ⚠️ BLOQUEO TEMPORAL — ver config/featureFlags.ts y docs/AI_BLOCKING.md
    if (isAiBlocked(tier)) {
        throw new Error('AI_GENERATION_BLOCKED');
    }

    const generate = httpsCallable<any, GeneratedQuestion[]>(functions, 'generateQuestions');

    try {
        const result = await generate({
            text: text || undefined,
            pdf,
            mode,
            difficulty,
            count,
            types,
            answerKey
        });
        return result.data;
    } catch (error: any) {
        console.error("Cloud Function Error:", error);
        throw new Error(error.message || "Failed to generate questions via Cloud Function");
    }
}
