"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestions = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const db = admin.firestore();
// --- Configuration ---
// Models (Mapping User Request to Real/Available Models)
// Note: "Gemini 2.5 Flash Lite" and "Gemini 3.0 Flash" are mapped to currently reliable identifiers.
// Adjust these strings as the actual models become available.
const MODEL_LITE = "gemini-2.0-flash"; // Placeholder for "Gemini 2.5 Flash Lite"
const MODEL_PRO = "gemini-2.0-flash"; // Placeholder for "Gemini 3.0 Flash" (or experimental pro versions)
const TIERS = {
    guest: {
        name: 'guest',
        model: MODEL_LITE,
        maxContextChars: 10000,
        dailyCredits: 2,
        allowRollover: false,
        canUploadFiles: false
    },
    free: {
        name: 'free',
        model: MODEL_LITE,
        maxContextChars: 10000,
        dailyCredits: 3,
        allowRollover: false,
        canUploadFiles: false
    },
    basic: {
        name: 'basic',
        model: MODEL_LITE,
        maxContextChars: 10000,
        monthlyCredits: 100,
        allowRollover: true,
        canUploadFiles: false
    },
    pro: {
        name: 'pro',
        model: MODEL_PRO,
        maxContextChars: 100000,
        dailyCredits: 999,
        allowRollover: false,
        canUploadFiles: true
    }
};
// --- Helpers ---
const getApiKey = () => {
    // Prefer secret implementation for production
    return process.env.GEMINI_API_KEY;
};
const getUserTier = async (uid) => {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists)
        return 'free'; // Default to free for registered users
    const data = userDoc.data();
    return (data === null || data === void 0 ? void 0 : data.tier) || 'free';
};
const checkAndDeductCredits = async (uid, tier) => {
    const userRef = db.collection('users').doc(uid);
    return db.runTransaction(async (transaction) => {
        var _a, _b;
        const doc = await transaction.get(userRef);
        if (!doc.exists) {
            // Should exist if we are here, but handle safety
            return false;
        }
        const data = doc.data();
        const now = admin.firestore.Timestamp.now();
        const tierConfig = TIERS[tier];
        // --- Logic for Free Tier (Daily Reset) ---
        if (tier === 'free') {
            const lastReset = data.lastCreditReset ? data.lastCreditReset.toDate() : new Date(0);
            const isToday = lastReset.toDateString() === now.toDate().toDateString();
            let currentCredits = isToday ? ((_a = data.credits) !== null && _a !== void 0 ? _a : tierConfig.dailyCredits) : tierConfig.dailyCredits;
            // If it was a new day, we virtually reset it. 
            // If strictly enforcing database state, update the date
            if (!isToday) {
                transaction.update(userRef, {
                    credits: tierConfig.dailyCredits - 1,
                    lastCreditReset: now
                });
                return true; // Deduction successful (reset + deduct)
            }
            if (currentCredits <= 0)
                return false;
            transaction.update(userRef, { credits: currentCredits - 1 });
            return true;
        }
        // --- Logic for Basic/Pro (Simple Deduction) ---
        // For Pro (Unlimited), strictly speaking we don't need to deduct, but good for tracking stats
        if (tier === 'pro')
            return true;
        const credits = (_b = data.credits) !== null && _b !== void 0 ? _b : 0;
        if (credits <= 0)
            return false;
        transaction.update(userRef, { credits: credits - 1 });
        return true;
    });
};
// --- Cloud Function ---
exports.generateQuestions = functions.https.onCall(async (data, context) => {
    // 0. Setup
    const apiKey = getApiKey();
    if (!apiKey)
        throw new functions.https.HttpsError("internal", "Server configuration error (API Key)");
    const { text, difficulty, count, types } = data;
    if (!text)
        throw new functions.https.HttpsError("invalid-argument", "Source text is required");
    // 1. Auth & Tier Resolution
    let tier = 'guest';
    let uid = null;
    if (context.auth) {
        uid = context.auth.uid;
        tier = await getUserTier(uid);
    }
    else {
        // Guest Logic: In a real app, track IP or device ID limits. 
        // For this implementation, we simply allow it but enforcement is weak (honor system/client driven for now)
        // or we could throw unauthenticated if we want to force login.
        // The prompt says "Guest" exists.
        tier = 'guest';
    }
    const config = TIERS[tier];
    // 2. Validate Context Size
    if (text.length > config.maxContextChars) {
        throw new functions.https.HttpsError("resource-exhausted", `Text too long for ${tier.toUpperCase()} tier. Limit is ${config.maxContextChars} characters.`);
    }
    // 3. Credit Check (Skip for guests in this simple impl, or rely on client session limits)
    if (uid) {
        const hasEncoder = await checkAndDeductCredits(uid, tier);
        if (!hasEncoder) {
            throw new functions.https.HttpsError("resource-exhausted", "Insufficient credits");
        }
    }
    // 4. Generate
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
            responseMimeType: "application/json"
        }
    });
    const difficultyPrompts = {
        easy: "Create simple, direct recall questions. The answers should be explicitly stated in the text. Distractors should be obviously incorrect.",
        medium: "Create questions that require understanding concepts. Distractors should be plausible but incorrect.",
        hard: "Create challenging questions that test nuance, exceptions, or deep understanding. Distractors should be very similar to the correct answer."
    };
    const typeDescriptions = {
        'MCQ': 'MC (Multiple Choice, 4 options)',
        'TF': 'TF (True/False)',
        'SHORT': 'SHORT (Short Answer / Fill in the blank)'
    };
    const selectedTypes = (types || ['MCQ', 'TF', 'SHORT'])
        .map((t) => typeDescriptions[t] || t)
        .join(', ');
    const prompt = `
    You are an expert teacher creating a quiz.
    Based strictly on the following text, generate ${count || 5} questions in a valid JSON array format.
    
    Difficulty Level: ${(difficulty || 'medium').toUpperCase()}
    ${difficultyPrompts[(difficulty || 'medium')] || difficultyPrompts['medium']}
    
    Question Types to Include: ${selectedTypes}
    
    Output JSON Schema:
    [
      {
        "text": "Question stem here",
        "type": "MC" | "TF" | "SHORT",
        "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MC (4 options). For TF/SHORT, omit or null.
        "answer": "Correct Answer String",
        "difficulty": "${difficulty || 'medium'}"
      }
    ]
    
    Rules:
    1. STRICTLY adhere to the provided text.
    2. For Multiple Choice (MC), provide strictly 4 options. The correct answer MUST be one of them.
    3. For True/False (TF), 'options' should be null. 'answer' must be "True" or "False".
    4. For Short Answer (SHORT), 'options' should be null. 'answer' is the correct term.
    5. Return ONLY the JSON array.
    
    Text:
    ${text}
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        const jsonStr = textResponse.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    }
    catch (error) {
        console.error("AI Generation Error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate questions: " + error.message);
    }
});
// Optional: Scheduled function to reset credits globally (more robust than on-read)
// export const resetDailyCredits = functions.pubsub.schedule('every 24 hours').onRun(async (context) => { ... });
//# sourceMappingURL=index.js.map