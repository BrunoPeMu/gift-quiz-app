const PENDING_CHECKOUT_KEY = 'pendingCheckout';

/**
 * Guarda la selección de plan/billing en localStorage para que persista
 * a través de la redirección al login/registro.
 */
export function savePendingCheckout(tier: string, billing: string): void {
    const data = {
        tier: tier as 'basic' | 'pro',
        billing: billing as 'monthly' | 'yearly',
    };
    localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(data));
}

/**
 * Lee y elimina el pending checkout de localStorage.
 */
export function consumePendingCheckout(): { tier: 'basic' | 'pro'; billing: 'monthly' | 'yearly' } | null {
    const raw = localStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Construye la URL con query params para auto-abrir el pricing modal.
 */
export function buildCheckoutUrl(tier: string, billing: string): string {
    return `/?showPricing=true&tier=${tier}&billing=${billing}`;
}
