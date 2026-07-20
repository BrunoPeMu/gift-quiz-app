import re

with open('src/services/questionService.ts', 'r') as f:
    content = f.read()

helpers = """
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
"""

# Insert helpers after imports
content = re.sub(r"(import type \{ Question \} from '\.\./types';)", helpers, content)

# Patch saveQuestions
save_replacement = """export async function saveQuestions(questions: Question[], userId: string) {
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

    const colRef = collection(db, QUESTIONS_COLLECTION);"""
content = re.sub(r'export async function saveQuestions.*?const colRef = collection\(db, QUESTIONS_COLLECTION\);', save_replacement, content, flags=re.DOTALL)

# Patch getQuestions
get_replacement = """export async function getQuestions(userId: string, topic?: string, includeDisabled = false, subject?: string): Promise<Question[]> {
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

    const colRef = collection(db, QUESTIONS_COLLECTION);"""
content = re.sub(r'export async function getQuestions.*?const colRef = collection\(db, QUESTIONS_COLLECTION\);', get_replacement, content, flags=re.DOTALL)

# Patch getTopicsData
topics_replacement = """export async function getTopicsData(userId: string): Promise<TopicData[]> {
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

    const pairs = new Set<string>();"""
content = re.sub(r'export async function getTopicsData.*?const pairs = new Set<string>\(\);', topics_replacement, content, flags=re.DOTALL)

# Patch addTopic
add_topic_replacement = """export async function addTopic(name: string, userId: string, subject?: string) {
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

    const colRef = collection(db, TOPICS_COLLECTION);"""
content = re.sub(r'export async function addTopic.*?const colRef = collection\(db, TOPICS_COLLECTION\);', add_topic_replacement, content, flags=re.DOTALL)

# Patch addSubject
add_subj_replacement = """export async function addSubject(name: string, userId: string): Promise<void> {
    if (!userId || !name.trim()) return;

    if (userId.startsWith('guest')) {
        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        if (!subjects.some(s => s.name === name.trim())) {
            subjects.push({ name: name.trim() });
            saveGuestData(GUEST_SUBJECTS_KEY, subjects);
        }
        return;
    }

    const subjCol = collection(db, 'subjects');"""
content = re.sub(r'export async function addSubject.*?const subjCol = collection\(db, \'subjects\'\);', add_subj_replacement, content, flags=re.DOTALL)

# Patch updateQuestion
upd_q_replacement = """export async function updateQuestion(id: string, userId: string, data: Partial<Question>) {
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

    // In a real app"""
content = re.sub(r'export async function updateQuestion.*?// In a real app', upd_q_replacement, content, flags=re.DOTALL)

# Patch deleteQuestion
del_q_replacement = """export async function deleteQuestion(id: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const filtered = questions.filter(q => q.id !== id);
        saveGuestData(GUEST_QUESTIONS_KEY, filtered);
        return;
    }

    const docRef = doc(db, QUESTIONS_COLLECTION, id);"""
content = re.sub(r'export async function deleteQuestion.*?const docRef = doc\(db, QUESTIONS_COLLECTION, id\);', del_q_replacement, content, flags=re.DOTALL)

# Patch deleteTopic
del_t_replacement = """export async function deleteTopic(topicName: string, subjectName: string, userId: string): Promise<void> {
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

    // Delete from topics collection"""
content = re.sub(r'export async function deleteTopic.*?// Delete from topics collection', del_t_replacement, content, flags=re.DOTALL)

with open('src/services/questionService.ts', 'w') as f:
    f.write(content)

