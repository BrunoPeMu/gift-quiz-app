/**
 * Feature flags and constants for tier-based access control.
 *
 * ── AI BLOCKING ─────────────────────────────────────────────────────
 * La generación con IA está bloqueada para:
 * - Usuarios `free` y `guest` (hasta que AdSense esté operativo)
 * - Usuarios que rechazan cookies de publicidad personalizada
 *   (sin ingresos = sin IA)
 *
 * Para revertir el bloqueo por tier:
 * 1. Vacía el array `AI_BLOCKED_TIERS`: export const AI_BLOCKED_TIERS = [];
 * 2. Elimina el bloqueo en functions/src/index.ts (busca "AI_BLOCKED_TIERS").
 * 3. Verifica en la UI (UploadPage.tsx) que no queden referencias al banner.
 * 4. Redeploy functions + hosting.
 *
 * ── PLAN BASIC ──────────────────────────────────────────────────────
 * El plan "basic" otorga 30 generaciones/mes con rollover.
 * Proporciona un plan de pago de entrada antes de PRO.
 * Precios: 4,99 €/mes o 49,90 €/año (2 meses gratis).
 */
export const AI_BLOCKED_TIERS = ['free', 'guest'] as const;
export const AI_BASIC_MONTHLY_LIMIT = 30;

/** Devuelve true si el tier del usuario tiene bloqueada la generación con IA. */
export function isAiBlocked(tier?: string, personalizedAds?: boolean): boolean {
    if (personalizedAds === false) return true;
    return !tier || (AI_BLOCKED_TIERS as readonly string[]).includes(tier);
}
