"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileSubscriptions = exports.createCustomerPortalSession = exports.stripeWebhook = exports.createStripeCheckout = exports.generateQuestions = void 0;
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
        monthlyCredits: 30,
        allowRollover: true,
        canUploadFiles: false
    },
    pro: {
        name: 'pro',
        model: MODEL_LITE,
        maxContextChars: 100000,
        dailyCredits: 50,
        allowRollover: false,
        canUploadFiles: true
    }
};
/**
 * Tiers que no pueden usar la generación con IA.
 * ⚠️ BLOQUEO TEMPORAL — ver docs/AI_BLOCKING.md para criterios de reversión.
 *
 * Motivo: Los usuarios free/guest deben ver anuncios (AdSense) para sostener
 * el coste de API. Actualmente el sistema de anuncios está incompleto:
 * AdBanner no se renderiza, slot es placeholder, RewardedVideo es mock.
 *
 * Una vez integrados los anuncios correctamente, vaciar este array y redeployar.
 */
const AI_BLOCKED_TIERS = ['free', 'guest'];
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
const RATE_LIMITS = {
    guest: { minute: 0, hour: 0, day: 0 },
    free: { minute: 3, hour: 10, day: 20 },
    basic: { minute: 15, hour: 80, day: 200 },
    pro: { minute: 40, hour: 300, day: 1000 },
};
const windowState = (start, count, now, durationMs) => {
    if (!start || now - start >= durationMs) {
        return { start: now, count: 0 };
    }
    return { start, count: count || 0 };
};
const isSameUtcDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return da.getUTCFullYear() === db.getUTCFullYear() &&
        da.getUTCMonth() === db.getUTCMonth() &&
        da.getUTCDate() === db.getUTCDate();
};
const dayState = (start, count, now) => {
    if (!start || !isSameUtcDay(start, now)) {
        return { start: now, count: 0 };
    }
    return { start, count: count || 0 };
};
const checkAndDeductCredits = async (uid, tier) => {
    const userRef = db.collection('users').doc(uid);
    return db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const doc = await transaction.get(userRef);
        if (!doc.exists) {
            // Should exist if we are here, but handle safety
            return { ok: false, reason: 'insufficient_credits' };
        }
        const data = doc.data();
        const nowTs = admin.firestore.Timestamp.now();
        const now = nowTs.toMillis();
        const tierConfig = TIERS[tier];
        const isPaidTier = tier === 'basic' || tier === 'pro';
        const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;
        const minute = windowState((_a = data.usage) === null || _a === void 0 ? void 0 : _a.minuteWindowStart, (_b = data.usage) === null || _b === void 0 ? void 0 : _b.minuteWindowCount, now, 60 * 1000);
        const hour = windowState((_c = data.usage) === null || _c === void 0 ? void 0 : _c.hourWindowStart, (_d = data.usage) === null || _d === void 0 ? void 0 : _d.hourWindowCount, now, 60 * 60 * 1000);
        const day = dayState((_e = data.usage) === null || _e === void 0 ? void 0 : _e.dayWindowStart, (_f = data.usage) === null || _f === void 0 ? void 0 : _f.dayWindowCount, now);
        if ((limits.minute > 0 && minute.count >= limits.minute) ||
            (limits.hour > 0 && hour.count >= limits.hour) ||
            (limits.day > 0 && day.count >= limits.day)) {
            return { ok: false, reason: 'rate_limited' };
        }
        const subscriptionUpdates = isPaidTier
            ? {
                'subscription.firstUseAt': ((_g = data.subscription) === null || _g === void 0 ? void 0 : _g.firstUseAt) || now,
                'subscription.lastUseAt': now,
                'subscription.nonRefundableAfterUse': true,
                'usage.totalGenerations': (((_h = data.usage) === null || _h === void 0 ? void 0 : _h.totalGenerations) || 0) + 1,
                'usage.paidGenerations': (((_j = data.usage) === null || _j === void 0 ? void 0 : _j.paidGenerations) || 0) + 1,
                'usage.lastGenerationAt': now,
                'usage.minuteWindowStart': minute.start,
                'usage.minuteWindowCount': minute.count + 1,
                'usage.hourWindowStart': hour.start,
                'usage.hourWindowCount': hour.count + 1,
                'usage.dayWindowStart': day.start,
                'usage.dayWindowCount': day.count + 1,
            }
            : {
                'usage.totalGenerations': (((_k = data.usage) === null || _k === void 0 ? void 0 : _k.totalGenerations) || 0) + 1,
                'usage.lastGenerationAt': now,
                'usage.minuteWindowStart': minute.start,
                'usage.minuteWindowCount': minute.count + 1,
                'usage.hourWindowStart': hour.start,
                'usage.hourWindowCount': hour.count + 1,
                'usage.dayWindowStart': day.start,
                'usage.dayWindowCount': day.count + 1,
            };
        // --- Logic for Free Tier (Daily Reset) ---
        if (tier === 'free') {
            const lastReset = data.lastCreditReset ? data.lastCreditReset.toDate() : new Date(0);
            const isToday = lastReset.toDateString() === nowTs.toDate().toDateString();
            let currentCredits = isToday ? ((_l = data.credits) !== null && _l !== void 0 ? _l : tierConfig.dailyCredits) : tierConfig.dailyCredits;
            // If it was a new day, we virtually reset it. 
            // If strictly enforcing database state, update the date
            if (!isToday) {
                transaction.update(userRef, Object.assign({ credits: tierConfig.dailyCredits - 1, lastCreditReset: nowTs }, subscriptionUpdates));
                return { ok: true }; // Deduction successful (reset + deduct)
            }
            if (currentCredits <= 0)
                return { ok: false, reason: 'insufficient_credits' };
            transaction.update(userRef, Object.assign({ credits: currentCredits - 1 }, subscriptionUpdates));
            return { ok: true };
        }
        // --- Logic for Basic/Pro (Simple Deduction) ---
        // For Pro (Unlimited), strictly speaking we don't need to deduct, but good for tracking stats
        if (tier === 'pro') {
            transaction.update(userRef, subscriptionUpdates);
            return { ok: true };
        }
        const credits = (_m = data.credits) !== null && _m !== void 0 ? _m : 0;
        if (credits <= 0)
            return { ok: false, reason: 'insufficient_credits' };
        transaction.update(userRef, Object.assign({ credits: credits - 1 }, subscriptionUpdates));
        return { ok: true };
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
    // 1.5. AI Blocking — temporal, ver docs/AI_BLOCKING.md
    if (AI_BLOCKED_TIERS.includes(tier)) {
        throw new functions.https.HttpsError('permission-denied', 'La generación de tests con IA está temporalmente disponible solo para los planes BASIC y PRO. ' +
            'Estamos trabajando para reintegrar la versión gratuita con publicidad. ' +
            'Si ya tienes una suscripción activa, contacta con soporte.');
    }
    // 1.6. Verificar vigencia de suscripción para tiers de pago
    if ((tier === 'basic' || tier === 'pro') && uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const sub = userData === null || userData === void 0 ? void 0 : userData.subscription;
        if (sub) {
            const isActive = sub.status === 'active';
            const notExpired = sub.renewalDate ? sub.renewalDate > Date.now() : true;
            if (!isActive || !notExpired) {
                // Degradar automáticamente
                await db.collection('users').doc(uid).set({
                    isPremium: false,
                    tier: 'free',
                    'subscription.status': 'expired',
                }, { merge: true });
                throw new functions.https.HttpsError('permission-denied', 'Tu suscripción ha expirado o no está activa. Renueva tu plan para continuar usando la generación con IA.');
            }
        }
    }
    // 2. Validate Size Limits
    if (text && text.length > config.maxContextChars) {
        throw new functions.https.HttpsError("resource-exhausted", `Text too long for ${tier.toUpperCase()} tier. Limit is ${config.maxContextChars} characters.`);
    }
    if (pdf && pdf.length > 9.6 * 1024 * 1024) { // ~7MB file limit (base64 is ~1.37 times larger)
        throw new functions.https.HttpsError("resource-exhausted", "PDF file too large. Limit is 7MB.");
    }
    // 3. Credit Check (Skip for guests in this simple impl, or rely on client session limits)
    if (uid) {
        const checkResult = await checkAndDeductCredits(uid, tier);
        if (!checkResult.ok) {
            if (checkResult.reason === 'rate_limited') {
                throw new functions.https.HttpsError('resource-exhausted', 'Has alcanzado el ritmo máximo de generación permitido. Espera un poco antes de volver a intentarlo.');
            }
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
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
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
/**
 * Precios de los planes (hardcodeados en céntimos EUR).
 * ⚠️ Si cambias estos precios, actualiza también docs/STRIPE_PLANS.md y la UI del modal.
 */
const PLAN_PRICES = {
    basic_monthly: { unit: 499, product: 'FlashTests Básico', desc: 'Plan Básico Mensual' },
    basic_yearly: { unit: 4990, product: 'FlashTests Básico', desc: 'Plan Básico Anual' },
    pro_monthly: { unit: 998, product: 'FlashTests PRO', desc: 'Plan PRO Mensual' },
    pro_yearly: { unit: 9980, product: 'FlashTests PRO', desc: 'Plan PRO Anual' },
};
exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }
    const uid = context.auth.uid;
    const { tier, billing, acknowledgeImmediateAccess } = data;
    if (!acknowledgeImmediateAccess) {
        throw new functions.https.HttpsError('failed-precondition', 'Debes aceptar la ejecución inmediata del servicio y la limitación del desistimiento antes de contratar.');
    }
    const planKey = `${tier}_${billing}`;
    const plan = PLAN_PRICES[planKey];
    if (!plan) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${planKey}`);
    }
    // Verificar que el usuario no tenga ya una suscripción activa
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const now = Date.now();
    const purchaseWindow = windowState((_a = userData === null || userData === void 0 ? void 0 : userData.purchaseAttempts) === null || _a === void 0 ? void 0 : _a.windowStart, (_b = userData === null || userData === void 0 ? void 0 : userData.purchaseAttempts) === null || _b === void 0 ? void 0 : _b.windowCount, now, 15 * 60 * 1000);
    if (purchaseWindow.count >= 3) {
        await db.collection('users').doc(uid).set({
            accountFlags: {
                purchaseReviewRequired: true,
                blockedFromCheckoutUntil: now + (24 * 60 * 60 * 1000),
                lastRefundReason: 'too_many_checkout_attempts',
            }
        }, { merge: true });
        throw new functions.https.HttpsError('permission-denied', 'Demasiados intentos de contratación en poco tiempo. Tu cuenta ha quedado en revisión temporal.');
    }
    const accountAgeMs = now - ((userData === null || userData === void 0 ? void 0 : userData.createdAt) || now);
    if (accountAgeMs < 30 * 1000) {
        throw new functions.https.HttpsError('failed-precondition', 'Espera unos segundos antes de contratar para completar la verificación básica de la cuenta.');
    }
    if (((_c = userData === null || userData === void 0 ? void 0 : userData.subscription) === null || _c === void 0 ? void 0 : _c.status) === 'active' && (userData === null || userData === void 0 ? void 0 : userData.tier)) {
        // Si ya está en el mismo plan o superior, rechazar
        const currentTier = userData.tier;
        const tierOrder = ['free', 'guest', 'basic', 'pro'];
        const currentIdx = tierOrder.indexOf(currentTier);
        const requestedIdx = tierOrder.indexOf(tier);
        if (requestedIdx <= currentIdx) {
            throw new functions.https.HttpsError('failed-precondition', 'Ya tienes una suscripción activa. Gestiona tu plan desde el panel de usuario.');
        }
        // Upgrade: permitir (de basic a pro)
    }
    const blockedUntil = (_d = userData === null || userData === void 0 ? void 0 : userData.accountFlags) === null || _d === void 0 ? void 0 : _d.blockedFromCheckoutUntil;
    if (blockedUntil && blockedUntil > Date.now()) {
        throw new functions.https.HttpsError('permission-denied', 'Tu cuenta está en revisión temporal por una incidencia previa de pago o reembolso. Contacta con soporte.');
    }
    if ((_e = userData === null || userData === void 0 ? void 0 : userData.accountFlags) === null || _e === void 0 ? void 0 : _e.purchaseReviewRequired) {
        throw new functions.https.HttpsError('permission-denied', 'Tu cuenta requiere revisión manual antes de volver a contratar un plan.');
    }
    await db.collection('users').doc(uid).set({
        purchaseAttempts: {
            windowStart: purchaseWindow.start,
            windowCount: purchaseWindow.count + 1,
            lastAttemptAt: now,
            total: (((_f = userData === null || userData === void 0 ? void 0 : userData.purchaseAttempts) === null || _f === void 0 ? void 0 : _f.total) || 0) + 1,
        }
    }, { merge: true });
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        client_reference_id: uid,
        metadata: {
            tier,
            billing,
            immediate_access: 'true',
            service_type: 'digital_content_subscription',
        },
        line_items: [
            {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: plan.product,
                        description: plan.desc,
                    },
                    unit_amount: plan.unit,
                    recurring: {
                        interval: billing === 'yearly' ? 'year' : 'month',
                    },
                },
                quantity: 1,
            },
        ],
        success_url: `${data.origin || process.env.CLIENT_URL || 'https://generador-de-test-c0035.web.app'}?checkout=success`,
        cancel_url: `${data.origin || process.env.CLIENT_URL || 'https://generador-de-test-c0035.web.app'}?checkout=cancel`,
    });
    return { url: session.url };
});
// ─────────────────────────────────────────────────────────────────────────
// STRIPE WEBHOOK — Lifecycle completo de suscripciones
// ─────────────────────────────────────────────────────────────────────────
function mapStripeStatus(stripeStatus) {
    const map = {
        'active': 'active',
        'past_due': 'past_due',
        'unpaid': 'past_due',
        'canceled': 'canceled',
        'incomplete': 'past_due',
        'incomplete_expired': 'expired',
        'trialing': 'trialing',
        'paused': 'past_due',
    };
    return map[stripeStatus] || 'expired';
}
/**
 * Helper: actualiza el documento del usuario localizando por customerId + subscriptionId.
 */
async function updateUserFromSubscription(customerId, subId, updates) {
    const snapshot = await db.collection('users')
        .where('subscription.customerId', '==', customerId)
        .where('subscription.subscriptionId', '==', subId)
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const userId = snapshot.docs[0].id;
    await db.collection('users').doc(userId).set(updates, { merge: true });
    return userId;
}
async function updateUserByCustomerId(customerId, updates) {
    const snapshot = await db.collection('users')
        .where('subscription.customerId', '==', customerId)
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const userId = snapshot.docs[0].id;
    await db.collection('users').doc(userId).set(updates, { merge: true });
    return userId;
}
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder';
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
        functions.logger.error(`Webhook signature verification failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    functions.logger.info(`Stripe webhook received: ${event.type}`);
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const uid = session.client_reference_id;
                const purchasedTier = ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.tier) || 'pro';
                const purchasedBilling = ((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.billing) || 'monthly';
                if (uid) {
                    const now = admin.firestore.Timestamp.now();
                    const subscriptionData = {
                        isPremium: true,
                        tier: purchasedTier,
                        subscription: {
                            plan: purchasedTier === 'basic' ? 'basic' : 'monthly',
                            status: 'active',
                            startDate: now.toMillis(),
                            serviceStartedAt: now.toMillis(),
                            nonRefundableAfterUse: true,
                            provider: 'stripe',
                            billing: purchasedBilling,
                        },
                        accountFlags: Object.assign({}, (((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.immediate_access) === 'true' ? {} : {})),
                    };
                    if (purchasedTier === 'basic') {
                        subscriptionData.credits = 30;
                    }
                    else {
                        subscriptionData.credits = 50;
                    }
                    subscriptionData.lastCreditReset = now;
                    // Recuperar subscriptionId, customerId y renewalDate desde Stripe
                    if (session.subscription) {
                        try {
                            const sub = await stripe.subscriptions.retrieve(session.subscription);
                            subscriptionData.subscription.subscriptionId = sub.id;
                            subscriptionData.subscription.customerId = sub.customer;
                            subscriptionData.subscription.renewalDate = sub.current_period_end * 1000;
                        }
                        catch (err) {
                            functions.logger.error(`Failed to retrieve subscription ${session.subscription}:`, err);
                        }
                    }
                    await db.collection('users').doc(uid).set(subscriptionData, { merge: true });
                    functions.logger.info(`Upgraded user ${uid} to ${purchasedTier} (${purchasedBilling}).`);
                }
                break;
            }
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const customerId = sub.customer;
                const subId = sub.id;
                const newStatus = mapStripeStatus(sub.status);
                const userId = await updateUserFromSubscription(customerId, subId, Object.assign({ 'subscription.renewalDate': sub.current_period_end * 1000, 'subscription.status': newStatus, isPremium: newStatus === 'active' || newStatus === 'trialing', tier: (newStatus === 'active' || newStatus === 'trialing') ? undefined : 'free' }, (newStatus !== 'active' && newStatus !== 'trialing' ? { tier: 'free' } : {})));
                if (userId) {
                    functions.logger.info(`Subscription updated for user ${userId}: status=${sub.status}`);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const customerId = sub.customer;
                const subId = sub.id;
                const userId = await updateUserFromSubscription(customerId, subId, {
                    isPremium: false,
                    tier: 'free',
                    'subscription.status': 'canceled',
                });
                if (userId) {
                    functions.logger.info(`Subscription deleted for user ${userId}, downgraded to free.`);
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (subId) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(subId);
                        const customerId = subscription.customer;
                        const userId = await updateUserFromSubscription(customerId, subId, {
                            isPremium: true,
                            'subscription.status': 'active',
                            'subscription.renewalDate': subscription.current_period_end * 1000,
                        });
                        if (userId) {
                            functions.logger.info(`Payment succeeded for user ${userId}, renewal: ${subscription.current_period_end}`);
                        }
                    }
                    catch (err) {
                        functions.logger.error(`Failed to process invoice.payment_succeeded for sub ${subId}:`, err);
                    }
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (subId) {
                    const customerId = invoice.customer;
                    const userId = await updateUserFromSubscription(customerId, subId, {
                        'subscription.status': 'past_due',
                    });
                    if (userId) {
                        functions.logger.info(`Payment failed for user ${userId}, set past_due.`);
                    }
                }
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                const customerId = charge.customer;
                const reason = ((_f = (_e = (_d = charge.refunds) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.reason) || 'refunded';
                if (customerId) {
                    const userId = await updateUserByCustomerId(customerId, {
                        isPremium: false,
                        tier: 'free',
                        credits: 0,
                        'subscription.status': 'refunded',
                        'subscription.endedAt': Date.now(),
                        'subscription.refundedAt': Date.now(),
                        'accountFlags.refundAbuse': true,
                        'accountFlags.purchaseReviewRequired': true,
                        'accountFlags.blockedFromCheckoutUntil': Date.now() + (30 * 24 * 60 * 60 * 1000),
                        'accountFlags.lastRefundReason': reason,
                    });
                    if (userId) {
                        functions.logger.warn(`Refund processed for user ${userId}; access downgraded and checkout review flagged.`);
                    }
                }
                break;
            }
            case 'charge.dispute.created':
            case 'charge.dispute.closed': {
                const dispute = event.data.object;
                const charge = dispute.charge ? await stripe.charges.retrieve(dispute.charge) : null;
                const customerId = ((charge === null || charge === void 0 ? void 0 : charge.customer) || dispute.customer);
                const disputeStatus = dispute.status || 'created';
                if (customerId) {
                    const userId = await updateUserByCustomerId(customerId, Object.assign(Object.assign(Object.assign(Object.assign({ isPremium: false, tier: 'free', credits: 0, 'subscription.status': disputeStatus === 'won' ? 'active' : 'disputed', 'subscription.disputeStatus': disputeStatus }, (disputeStatus === 'won' ? {} : { 'subscription.endedAt': Date.now() })), { 'accountFlags.purchaseReviewRequired': true, 'accountFlags.refundAbuse': disputeStatus !== 'won' }), (disputeStatus === 'won' ? {} : { 'accountFlags.blockedFromCheckoutUntil': Date.now() + (30 * 24 * 60 * 60 * 1000) })), { 'accountFlags.lastRefundReason': `dispute:${disputeStatus}` }));
                    if (userId) {
                        functions.logger.warn(`Dispute event for user ${userId}; status=${disputeStatus}`);
                    }
                }
                break;
            }
            default:
                functions.logger.info(`Unhandled webhook event type: ${event.type}`);
        }
    }
    catch (err) {
        functions.logger.error(`Error processing webhook event ${event.type}:`, err);
    }
    res.json({ received: true });
});
// ─────────────────────────────────────────────────────────────────────────
// CUSTOMER PORTAL — Gestión de suscripción desde la app
// ─────────────────────────────────────────────────────────────────────────
exports.createCustomerPortalSession = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión para gestionar tu suscripción.');
    }
    const uid = context.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
    }
    const userData = userDoc.data();
    const customerId = (_a = userData.subscription) === null || _a === void 0 ? void 0 : _a.customerId;
    if (!customerId) {
        throw new functions.https.HttpsError('failed-precondition', 'No tienes una suscripción activa. Suscríbete primero para gestionarla.');
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${data.origin || process.env.CLIENT_URL || 'https://generador-de-test-c0035.web.app'}`,
    });
    return { url: session.url };
});
// ─────────────────────────────────────────────────────────────────────────
// RECONCILIACIÓN DIARIA — Scheduled function que verifica suscripciones
// ─────────────────────────────────────────────────────────────────────────
exports.reconcileSubscriptions = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    var _a, _b;
    const now = Date.now();
    const users = await db.collection('users')
        .where('subscription.status', '==', 'active')
        .get();
    let downgraded = 0;
    let renewed = 0;
    for (const doc of users.docs) {
        const data = doc.data();
        const renewalDate = (_a = data.subscription) === null || _a === void 0 ? void 0 : _a.renewalDate;
        const subId = (_b = data.subscription) === null || _b === void 0 ? void 0 : _b.subscriptionId;
        if (!renewalDate || renewalDate > now)
            continue;
        // Suscripción expirada en papel — verificar con Stripe
        if (subId) {
            try {
                const sub = await stripe.subscriptions.retrieve(subId);
                const status = mapStripeStatus(sub.status);
                if (status === 'active' || status === 'trialing') {
                    // Stripe dice que sigue activa → actualizar renewalDate
                    await doc.ref.set({
                        'subscription.status': status,
                        'subscription.renewalDate': sub.current_period_end * 1000,
                        isPremium: true,
                    }, { merge: true });
                    renewed++;
                    continue;
                }
            }
            catch (err) {
                functions.logger.error(`Reconciliation: failed to verify sub ${subId}:`, err);
            }
        }
        // Stripe no pudo confirmar o expiró realmente → degradar
        await doc.ref.set({
            isPremium: false,
            tier: 'free',
            'subscription.status': 'expired',
        }, { merge: true });
        downgraded++;
    }
    functions.logger.info(`Reconciliation complete: ${renewed} renewed, ${downgraded} downgraded out of ${users.docs.length} checked.`);
});
//# sourceMappingURL=index.js.map