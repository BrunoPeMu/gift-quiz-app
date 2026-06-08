"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createStripeCheckout = exports.generateQuestions = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
const Stripe = require("stripe");
admin.initializeApp();
const db = admin.firestore();
// --- Configuration ---
// Models (Mapping User Request to Real/Available Models)
// Note: "Gemini 2.5 Flash Lite" and "Gemini 3.0 Flash" are mapped to currently reliable identifiers.
// Adjust these strings as the actual models become available.
const MODEL_LITE = "gemini-3.1-flash-lite"; // Updated to stable 2026 model
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
        model: MODEL_LITE,
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
exports.generateQuestions = functions
    .runWith({
    timeoutSeconds: 540,
    memory: "1GB"
})
    .https.onCall(async (data, context) => {
    // 0. Setup
    const apiKey = getApiKey();
    if (!apiKey)
        throw new functions.https.HttpsError("internal", "Server configuration error (API Key)");
    const { text, pdf, mode = 'generate', difficulty, count, types, answerKey } = data;
    if (!text && !pdf) {
        throw new functions.https.HttpsError("invalid-argument", "Either source text or PDF is required");
    }
    // 1. Auth & Tier Resolution
    let tier = 'guest';
    let uid = null;
    if (context.auth) {
        uid = context.auth.uid;
        tier = await getUserTier(uid);
    }
    else {
        tier = 'guest';
    }
    const config = TIERS[tier];
    // 2. Validate Size Limits
    if (text && text.length > config.maxContextChars) {
        throw new functions.https.HttpsError("resource-exhausted", `Text too long for ${tier.toUpperCase()} tier. Limit is ${config.maxContextChars} characters.`);
    }
    if (pdf && pdf.length > 9.6 * 1024 * 1024) { // ~7MB file limit (base64 is ~1.37 times larger)
        throw new functions.https.HttpsError("resource-exhausted", "PDF file too large. Limit is 7MB.");
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
    const parts = [];
    if (mode === 'parse') {
        const parsePrompt = `
        You are an expert assistant specialized in parsing existing test questionnaires.
        Analyze the provided document (which could be a copy-pasted layout, standard text, or a PDF file).
        
        Your objective is to extract all the questions, their multiple-choice options (if any), and determine the correct answer.
        
        CRITICAL RULES:
        1. Do NOT invent new questions. ONLY extract the questions that are explicitly present in the provided source.
        2. Identify the correct answer for each question. The correct answer may be marked directly next to the question (e.g. bolded, with an asterisk *, or a checkmark), OR it may be listed at the end of the document in a "key/solutions" section. Match these answer keys to the extracted questions.
        3. For Multiple Choice (MC), provide strictly 4 options. If the original question has fewer than 4 options (e.g. 3 options), generate plausible distractors to complete exactly 4 options. Make sure ALL 4 options are DISTINCT and UNIQUE. Do NOT duplicate the correct answer. Make sure the correct answer matches exactly one of the options.
        4. For True/False (TF) questions, 'options' must be null. The 'answer' must be "True" or "False".
        5. For Short Answer (SHORT) questions, 'options' must be null. The 'answer' is the correct term/phrase.
        6. Evaluate the difficulty of each question based on its cognitive complexity. Tag each question's difficulty individually as "easy", "medium", or "hard".
        7. IMPORTANT: Do NOT remove the original question numbers. Always include the original question number at the beginning of the 'text' field (e.g., "1. What is...").
        
        Output JSON Schema:
        [
          {
            "text": "Question stem here",
            "type": "MC" | "TF" | "SHORT",
            "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MC (4 options). For TF/SHORT, omit or null.
            "answer": "Correct Answer String",
            "difficulty": "easy" | "medium" | "hard"
          }
        ]
        
        Return ONLY the raw JSON array.
        `;
        parts.push(parsePrompt);
    }
    else if (mode === 'extract_key') {
        const extractKeyPrompt = `
        Scan the entire document carefully. Your ONLY task is to identify and extract the correct answers for the questions.
        The answers might be located at the very end of the document in a key/solutions section, they might be marked inline (e.g., bolded, with an asterisk), or they might immediately follow the question.
        
        Build a global answer key.
        Return ONLY a JSON object where the key is the question number (e.g., "1", "2") or a short snippet of the question if unnumbered, and the value is the correct answer option or text.
        If no answers can be found anywhere in the document, return an empty object {}.
        DO NOT extract the questions themselves, ONLY the answer key map.
        `;
        parts.push(extractKeyPrompt);
    }
    else if (mode === 'parse_with_key') {
        const parseWithKeyPrompt = `
        You are an expert assistant specialized in parsing existing test questionnaires.
        You are provided with a text block and a global answer key JSON.
        
        GLOBAL ANSWER KEY:
        ${answerKey || "{}"}
        
        Your objective is to extract all the questions from the text block.
        
        CRITICAL RULES:
        1. Do NOT invent new questions. ONLY extract the questions explicitly present.
        2. Determine the correct answer for each question using the GLOBAL ANSWER KEY provided above. Match the question number or text to the key. If the key is empty or missing this question, try to infer the answer from the text itself.
        3. For Multiple Choice (MC), provide strictly 4 options. If fewer than 4, generate plausible distractors. Make sure ALL 4 options are DISTINCT and UNIQUE. Do NOT duplicate the correct answer. Make sure the correct answer matches exactly one of the options.
        4. For True/False (TF) questions, 'options' must be null. The 'answer' must be "True" or "False".
        5. For Short Answer (SHORT) questions, 'options' must be null. The 'answer' is the correct term/phrase.
        6. Evaluate the difficulty of each question ("easy", "medium", or "hard").
        7. IMPORTANT: Do NOT remove the original question numbers. Always include the original question number at the beginning of the 'text' field (e.g., "1. What is...").
        
        Output JSON Schema:
        [
          {
            "text": "Question stem here",
            "type": "MC" | "TF" | "SHORT",
            "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MC.
            "answer": "Correct Answer String",
            "difficulty": "easy" | "medium" | "hard"
          }
        ]
        
        Return ONLY the raw JSON array.
        `;
        parts.push(parseWithKeyPrompt);
    }
    else {
        // Mode 'generate' (standard syllabus-based generation)
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
        const generatePrompt = `
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
        `;
        parts.push(generatePrompt);
    }
    if (pdf) {
        parts.push({
            inlineData: {
                data: pdf,
                mimeType: "application/pdf"
            }
        });
    }
    else {
        parts.push(`Source Text:\n${text}`);
    }
    try {
        const result = await model.generateContent(parts);
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
// --- Stripe Payments ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2026-05-27.dahlia',
});
exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const uid = context.auth.uid;
    const { plan } = data;
    const price = plan === 'yearly' ? 2999 : 499;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        client_reference_id: uid,
        line_items: [
            {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'FlashTests PRO',
                        description: `Suscripción ${plan === 'yearly' ? 'Anual' : 'Mensual'}`,
                    },
                    unit_amount: price,
                    recurring: {
                        interval: plan === 'yearly' ? 'year' : 'month',
                    },
                },
                quantity: 1,
            },
        ],
        // Use client origin if possible, otherwise default to production domain
        success_url: `${process.env.CLIENT_URL || 'https://flashtests.app'}?checkout=success`,
        cancel_url: `${process.env.CLIENT_URL || 'https://flashtests.app'}?checkout=cancel`,
    });
    return { url: session.url };
});
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder';
    let event;
    try {
        // req.rawBody is provided by Firebase functions
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
        functions.logger.error(`Webhook signature verification failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const uid = session.client_reference_id;
        if (uid) {
            await db.collection('users').doc(uid).set({
                isPremium: true,
                tier: 'pro'
            }, { merge: true });
            functions.logger.info(`Upgraded user ${uid} to premium.`);
        }
    }
    res.json({ received: true });
});
//# sourceMappingURL=index.js.map