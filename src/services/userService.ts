
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

export async function checkMonthlyCreditRefill(userId: string, currentData: { credits?: number, lastCreditReset?: any }): Promise<{ credits: number, lastCreditReset: number } | null> {
    if (!userId) return null;

    const now = new Date();
    const lastReset = currentData.lastCreditReset ? new Date(currentData.lastCreditReset) : null;

    // If never reset (e.g. legacy user) or reset was in a previous month
    if (!lastReset || !isSameMonth(now, lastReset)) {
        const currentCredits = currentData.credits || 0;
        // Add 3 credits, capped at 9
        // If user has 8, 8+3=11 -> 9
        // If user has 9, 9+3=12 -> 9
        // If user has 0, 0+3=3 -> 3

        // Wait, if user has >= 9, do we update the date?
        // "se pueden acumular un máximo de 9 créditos si no se gastan"
        // Implicitly: if I have 9, I don't get more. But do I "consummate" my monthly refill?
        // Usually yes, the month "passed" and I missed the chance to get more.
        // So we should update the date even if credits don't change?
        // "Si la suma supera 9, lo dejamos en 9"

        let newCredits = currentCredits + 3;
        if (newCredits > 9) newCredits = 9;

        // Optimization: If credits are already 9 (or more) AND lastReset was significantly in the past,
        // we still want to update 'lastCreditReset' so we don't check this every single time the user logs in 
        // (though checking date is cheap, writing to DB is what we want to avoid).
        // Actually, if we update date, we incur a write.
        // If credits = 9, and we don't update date, next time we check:
        // "!isSameMonth" is true. We calculate newCredits = 9+3 -> 9.
        // If newCredits (9) === currentCredits (9), should we write?
        // It's better to write the new DATE so we know "we processed this month".

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
