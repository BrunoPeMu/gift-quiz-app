import type { Question, QuestionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function parseGIFT(content: string, defaultTopic: string = 'General', defaultDifficulty: 'easy' | 'medium' | 'hard' = 'medium'): Question[] {
    const questions: Question[] = [];
    // Remove comments
    const cleanContent = content.replace(/\/\/.*$/gm, '');

    // Split by blank lines to separate questions
    const blocks = cleanContent.split(/\n\s*\n/).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        const q = parseBlock(block, defaultTopic, defaultDifficulty);
        if (q) {
            questions.push(q);
        }
    }

    return questions;
}

function parseBlock(block: string, topic: string, difficulty: 'easy' | 'medium' | 'hard'): Question | null {
    let text = block.trim();
    let title = '';

    // Extract title ::Title::
    const titleMatch = text.match(/^::(.*?)::/);
    if (titleMatch) {
        title = titleMatch[1];
        text = text.replace(/^::.*?::/, '').trim();
    }

    // Extract answers {...}
    const answerMatch = text.match(/\{(.*?)\}/s);
    if (!answerMatch) {
        // No answer block found, might be a description or invalid
        return null;
    }

    const answerBlock = answerMatch[1];

    // Extract feedback ####
    let feedback = '';
    const feedbackMatch = answerBlock.match(/####(.*?)$/);
    if (feedbackMatch) {
        feedback = feedbackMatch[1].trim();
    }
    // Remove feedback from answer block for processing
    const cleanAnswerBlock = answerBlock.replace(/####.*?$/, '').trim();

    const questionText = text.replace(/\{.*?\}/s, '_____').trim(); // Replace answer block with blank for display if needed, or just remove it
    // Actually for MC/TF, the question text is usually before the block.
    // For missing word, it's inline.
    // Let's keep the text as is but remove the answer block for the "text" field, 
    // or better, handle specific types.

    let type: QuestionType = 'MC';
    let options: string[] = [];
    let answer: any = null;
    let optionsFeedback: Record<string, string> = {};

    // Analyze answer block
    if (cleanAnswerBlock.toUpperCase() === 'T' || cleanAnswerBlock.toUpperCase() === 'TRUE') {
        type = 'TF';
        answer = true;
    } else if (cleanAnswerBlock.toUpperCase() === 'F' || cleanAnswerBlock.toUpperCase() === 'FALSE') {
        type = 'TF';
        answer = false;
    } else {
        // Check for MC or Short Answer
        // MC: {=Correct ~Wrong ~Wrong}
        // Short: {=Ans1 =Ans2}

        const parts = cleanAnswerBlock.split(/\s*(?=[=~])/).filter(p => p.trim().length > 0);

        const correctAnswers: string[] = [];
        const wrongAnswers: string[] = [];

        for (const part of parts) {
            const isCorrect = part.startsWith('=');
            let val = part.substring(1).trim();

            // Extract per-answer feedback if present (e.g. "Answer #Feedback")
            let answerFeedback = '';
            const feedbackSplit = val.split('#');
            if (feedbackSplit.length > 1) {
                val = feedbackSplit[0].trim();
                // Re-join the rest in case there were multiple #s, though usually just one
                answerFeedback = feedbackSplit.slice(1).join('#').trim();
            }

            if (answerFeedback) {
                optionsFeedback[val] = answerFeedback;
            }

            if (isCorrect) {
                correctAnswers.push(val);
                // If this is the correct answer and we don't have global feedback yet, use this
                if (answerFeedback && !feedback) {
                    feedback = answerFeedback;
                }
            } else if (part.startsWith('~')) {
                wrongAnswers.push(val);
            }
        }

        if (wrongAnswers.length > 0) {
            type = 'MC';
            options = [...correctAnswers, ...wrongAnswers];
            // Shuffle options? No, let the UI do that.
            answer = correctAnswers[0]; // Assume single correct for now, or handle multiple
        } else {
            type = 'SHORT';
            answer = correctAnswers;
        }
    }

    return {
        id: uuidv4(),
        type,
        text: title ? `${title}: ${questionText.replace('_____', '...')}` : questionText.replace('_____', '...'), // Simple formatting
        options,
        answer,
        topic,
        difficulty,
        feedback,
        optionsFeedback,
        giftSource: block.trim(),
        createdAt: Date.now(),
    };
}

export function reconstructGIFT(q: Question): string {
    if (q.giftSource) return q.giftSource;

    // Basic reconstruction for legacy questions
    let text = q.text.replace('...', '_____'); // Try to revert placeholder
    // If text has title, strip it or keep it? GIFT format ::Title:: Text
    // Our q.text might be "Title: Text".
    // Let's just use the text as is for now, maybe stripping "Title: " if it looks like one.
    // 1. Determine if there's a title and extract it from q.text if present
    // (Logic removed as it was unused)

    // 2. Revert placeholder if it was used during parsing
    // let questionText = q.text.replace('...', '_____');

    // 3. Construct Answer Block
    let answerBlock = '';
    const getFb = (opt: string) => q.optionsFeedback?.[opt] ? `#${q.optionsFeedback[opt]}` : '';

    if (q.type === 'TF') {
        answerBlock = `{${q.answer ? 'T' : 'F'}}`;
    } else if (q.type === 'MC') {
        const correct = q.answer as string;
        const others = q.options?.filter(o => o !== correct) || [];
        answerBlock = `{=${correct}${getFb(correct)} ${others.map(o => `~${o}${getFb(o)}`).join(' ')}}`;
    } else if (q.type === 'SHORT') {
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
        answerBlock = `{${answers.map((a: string | boolean) => `=${a}${getFb(String(a))}`).join(' ')}}`;
    }

    // Add global feedback if present
    if (q.feedback) {
        // Insert feedback before the closing brace
        if (answerBlock.endsWith('}')) {
            answerBlock = answerBlock.slice(0, -1) + ` #### ${q.feedback}}`;
        }
    }

    // Insert answer block at the end or replace placeholder?
    // If we have _____, replace it.
    if (text.includes('_____')) {
        return text.replace('_____', answerBlock);
    }

    // Otherwise append
    return `${text} ${answerBlock}`;
}

export function validateGIFT(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'empty' };
    }

    // Check for matching braces
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
        return { valid: false, error: 'brace_mismatch' };
    }

    if (openBraces === 0) {
        return { valid: false, error: 'no_answer_block' };
    }

    // Check for empty answer blocks {}
    if (/\{\s*\}/.test(text)) {
        return { valid: false, error: 'empty_answer_block' };
    }

    return { valid: true };
}
