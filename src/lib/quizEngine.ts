import type { Question, QuizConfig, UserProgress } from '../types';

export function selectQuestions(
    allQuestions: Question[],
    config: QuizConfig,
    history: UserProgress[] = []
): Question[] {
    let filtered = allQuestions.filter(q => {
        if (config.subject !== 'All' && q.subject !== config.subject) return false;
        if (config.topic !== 'All' && q.topic !== config.topic) return false;
        if (config.difficulty !== 'mixed' && q.difficulty !== config.difficulty) return false;
        if (config.allowedTypes && config.allowedTypes.length > 0 && !config.allowedTypes.includes(q.type)) return false;
        return true;
    });

    if (config.mode === 'retry') {
        // Filter for questions the user got wrong recently
        const wrongIds = new Set(
            history
                .filter(h => !h.correct)
                .map(h => h.questionId)
        );
        filtered = filtered.filter(q => wrongIds.has(q.id));
    } else if (config.mode === 'smart') {
        // Prioritize questions not in history or answered incorrectly long ago
        // Simple implementation: Filter out questions answered correctly recently
        const correctIds = new Set(
            history
                .filter(h => h.correct)
                .map(h => h.questionId)
        );
        // Give priority to unattempted, then wrong
        // For now, just exclude correct ones
        filtered = filtered.filter(q => !correctIds.has(q.id));
    }

    // Sort/Shuffle
    if (config.mode === 'random' || config.mode === 'smart' || config.mode === 'retry') {
        filtered = shuffle(filtered);
    } else {
        // Sequential: sort by createdAt or original order (if preserved)
        // Assuming input order is preserved
    }

    // Limit options for MC questions if requested
    if (config.maxOptions && config.maxOptions > 1) {
        filtered = filtered.map(q => {
            if (q.type === 'MC' && q.options && config.maxOptions && q.options.length > config.maxOptions) {
                // We need to keep the correct answer + (maxOptions - 1) random distractors
                const correctAnswer = q.answer as string;
                const distractors = q.options.filter(o => o !== correctAnswer);
                const selectedDistractors = shuffle(distractors).slice(0, (config.maxOptions || 4) - 1);
                const newOptions = shuffle([correctAnswer, ...selectedDistractors]);
                return { ...q, options: newOptions };
            }
            return q;
        });
    }

    return filtered.slice(0, config.questionCount);
}

function shuffle<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}
