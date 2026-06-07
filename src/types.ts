export type QuestionType = 'MC' | 'TF' | 'SHORT' | 'MATCHING' | 'ESSAY';

export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    options?: string[]; // For MC
    answer: string | string[] | boolean; // Correct answer(s)
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    feedback?: string;
    optionsFeedback?: Record<string, string>; // Map option text -> feedback
    disabled?: boolean;
    giftSource?: string;
    userId?: string;
    createdAt: number;
    subject?: string;
}

export interface QuizConfig {
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    questionCount: number;
    mode: 'random' | 'smart' | 'sequential' | 'retry';
    penalty: number;
    allowedTypes?: QuestionType[]; // Filter by type
    maxOptions?: number; // Limit number of options for MC questions
}

export interface QuizState {
    questions: Question[];
    currentIndex: number;
    answers: Record<string, any>; // questionId -> userAnswer
    score: number;
    isFinished: boolean;
    history?: { questionId: string; isCorrect: boolean }[];
}

export interface UserProgress {
    userId: string;
    questionId: string;
    topic: string;
    subject?: string; // New field for grouping topics
    difficulty: 'easy' | 'medium' | 'hard';
    correct: boolean;
    timestamp: number;
    disabled?: boolean;
    createdAt?: number;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    username?: string; // Unique handle (e.g., 'cool_teacher')
    photoURL?: string;
    role: 'admin' | 'creator' | 'user'; // Replaces isAdmin
    isAdmin?: boolean; // Deprecated, keep for backward compatibility
    isPremium?: boolean;
    bio?: string; // Optional bio
    preferences?: {
        theme?: 'light' | 'dark' | 'system';
        accentColor?: string;
        fontSize?: 'normal' | 'large';
    };
    savedConfigs?: Record<string, QuizConfig>;
    createdAt: number;

    // Admin / Billing Extended Fields
    subscription?: {
        plan: 'free' | 'monthly' | 'annual' | 'lifetime';
        status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';
        startDate?: number;
        renewalDate?: number;
        provider?: 'stripe' | 'manual' | 'other';
    };
    adminNotes?: string; // Internal notes for admins

    // New Architecture
    tier?: 'guest' | 'free' | 'basic' | 'pro';
    credits?: number;
    lastCreditReset?: any;
    
    // Legal compliance
    termsAccepted?: boolean;
    termsAcceptedAt?: number;
    cookiesAccepted?: boolean;
    cookiesAcceptedAt?: number;
}

export interface Subject {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
    userId?: string;
}

export interface SharedQuiz {
    id: string;
    creatorId: string;
    config: QuizConfig;
    questions: Question[];
    createdAt: number;
    expiresAt?: number;
}
