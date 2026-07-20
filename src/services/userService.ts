
import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function addFreeCredits(userId: string, amount: number = 1): Promise<number> {
    if (!userId) throw new Error("User ID required");

    const userRef = doc(db, 'users', userId);

    try {
        await updateDoc(userRef, {
            credits: increment(amount)
        });

        // Return new balance
        const snap = await getDoc(userRef);
        return snap.data()?.credits || 0;
    } catch (error: any) {
        // Handle case where user doc might not exist yet (rare for logged in, but possible)
        if (error.code === 'not-found') {
            await setDoc(userRef, { credits: amount, tier: 'free' }, { merge: true });
            return amount;
        }
        console.error("Error adding credits:", error);
        throw error;
    }
}
// Helper to check if two dates are in the same month/year
function isSameMonth(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth();
}

/**
 * Refill mensual de créditos según el tier del usuario.
 *
 * - free (default): +3 créditos, cap 9.
 * - basic: +30 créditos, SIN cap (rollover). Se ejecuta al inicio de cada mes.
 * - pro: no aplica (tiene créditos ilimitados, no se descuentan en backend).
 * - guest: no aplica (no tiene UID, no hay refill).
 */
export async function checkMonthlyCreditRefill(userId: string, currentData: { credits?: number, lastCreditReset?: any, tier?: string }): Promise<{ credits: number, lastCreditReset: number } | null> {
    if (!userId) return null;

    const now = new Date();
    const lastReset = currentData.lastCreditReset ? new Date(currentData.lastCreditReset) : null;

    if (!lastReset || !isSameMonth(now, lastReset)) {
        const currentCredits = currentData.credits || 0;
        const tier = currentData.tier || 'free';

        let newCredits: number;

        if (tier === 'basic') {
            // basic: añade 30 créditos/mes con rollover (sin cap)
            newCredits = currentCredits + 30;
        } else if (tier === 'pro') {
            // pro: no necesita refill (backend no descuenta), pero actualizamos fecha
            newCredits = currentCredits;
        } else {
            // free: +3 créditos, cap 9
            newCredits = currentCredits + 3;
            if (newCredits > 9) newCredits = 9;
        }

        const updateData = {
            credits: newCredits,
            lastCreditReset: now.getTime()
        };

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updateData);

        return updateData;
    }

    return null;
}
