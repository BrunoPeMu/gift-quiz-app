import re

with open('src/services/questionService.ts', 'r') as f:
    content = f.read()

# Patch renameTopicDirect
ren_topic_rep = """export async function renameTopicDirect(oldName: string, oldSubject: string, newName: string, userId: string): Promise<void> {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            const subj = q.subject || '';
            if (q.topic === oldName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...q, topic: newName };
            }
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const updatedTopics = topics.map(t => {
            const subj = t.subject || '';
            if (t.name === oldName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...t, name: newName };
            }
            return t;
        });
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);
        return;
    }

    const batch = writeBatch(db);"""
content = re.sub(r'export async function renameTopicDirect.*?const batch = writeBatch\(db\);', ren_topic_rep, content, flags=re.DOTALL)

# Patch updateTopicSubject
upd_topic_subj_rep = """export async function updateTopicSubject(topicName: string, oldSubject: string, newSubject: string, userId: string) {
    if (!userId) throw new Error("userId is required");

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            const subj = q.subject || '';
            if (q.topic === topicName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                return { ...q, subject: newSubject };
            }
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        let found = false;
        const updatedTopics = topics.map(t => {
            const subj = t.subject || '';
            if (t.name === topicName && (subj === oldSubject || (oldSubject === '' && subj === 'Uncategorized'))) {
                found = true;
                return { ...t, subject: newSubject };
            }
            return t;
        });
        if (!found) {
            updatedTopics.push({ name: topicName, subject: newSubject });
        }
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);
        return;
    }

    // 1. Update in 'topics' collection"""
content = re.sub(r'export async function updateTopicSubject.*?// 1\. Update in \'topics\' collection', upd_topic_subj_rep, content, flags=re.DOTALL)

# Patch renameSubject
ren_subj_rep = """export async function renameSubject(oldName: string, newName: string, userId: string): Promise<void> {
    if (!userId || !newName.trim()) return;

    if (userId.startsWith('guest')) {
        const questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        const updatedQuestions = questions.map(q => {
            if (q.subject === oldName) return { ...q, subject: newName.trim() };
            return q;
        });
        saveGuestData(GUEST_QUESTIONS_KEY, updatedQuestions);

        const topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);
        const updatedTopics = topics.map(t => {
            if (t.subject === oldName) return { ...t, subject: newName.trim() };
            return t;
        });
        saveGuestData(GUEST_TOPICS_KEY, updatedTopics);

        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        const updatedSubjects = subjects.map(s => {
            if (s.name === oldName) return { name: newName.trim() };
            return s;
        });
        saveGuestData(GUEST_SUBJECTS_KEY, updatedSubjects);
        return;
    }

    const batch = writeBatch(db);"""
content = re.sub(r'export async function renameSubject.*?const batch = writeBatch\(db\);', ren_subj_rep, content, flags=re.DOTALL)

# Patch deleteSubject
del_subj_rep = """export async function deleteSubject(subjectName: string, userId: string, action: 'transfer' | 'orphan' | 'deleteAll', targetSubject?: string): Promise<void> {
    if (!userId) return;

    if (userId.startsWith('guest')) {
        let questions = getGuestData<Question>(GUEST_QUESTIONS_KEY);
        let topics = getGuestData<TopicData>(GUEST_TOPICS_KEY);

        if (action === 'transfer' && targetSubject) {
            questions = questions.map(q => q.subject === subjectName ? { ...q, subject: targetSubject } : q);
            topics = topics.map(t => t.subject === subjectName ? { ...t, subject: targetSubject } : t);
        } else if (action === 'orphan') {
            questions = questions.map(q => q.subject === subjectName ? { ...q, subject: undefined } : q);
            topics = topics.map(t => t.subject === subjectName ? { ...t, subject: undefined } : t);
        } else if (action === 'deleteAll') {
            questions = questions.filter(q => q.subject !== subjectName);
            topics = topics.filter(t => t.subject !== subjectName);
        }
        
        saveGuestData(GUEST_QUESTIONS_KEY, questions);
        saveGuestData(GUEST_TOPICS_KEY, topics);

        const subjects = getGuestData<{name: string}>(GUEST_SUBJECTS_KEY);
        const filteredSubjects = subjects.filter(s => s.name !== subjectName);
        saveGuestData(GUEST_SUBJECTS_KEY, filteredSubjects);
        return;
    }

    const batch = writeBatch(db);"""
content = re.sub(r'export async function deleteSubject.*?const batch = writeBatch\(db\);', del_subj_rep, content, flags=re.DOTALL)

with open('src/services/questionService.ts', 'w') as f:
    f.write(content)

