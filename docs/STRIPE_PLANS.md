# Stripe — Planes de pago

## Estructura de precios

| Plan | Código | Precio | Frecuencia |
|---|---|---|---|
| Basic Mensual | `basic_monthly` | 4,99 € (499 céntimos) | mensual |
| Basic Anual | `basic_yearly` | 49,90 € (4 990 céntimos) | anual |
| PRO Mensual | `pro_monthly` | 9,98 € (998 céntimos) | mensual |
| PRO Anual | `pro_yearly` | 99,80 € (9 980 céntimos) | anual |

Los precios están hardcodeados en `createStripeCheckout` dentro de `functions/src/index.ts`.

## Flujo

1. **Frontend** (`DashboardPage.tsx`): el usuario ve los 4 planes en un modal. Al hacer clic en "Comenzar Suscripción", llama a `createStripeCheckout` con `{ tier: 'basic' | 'pro', billing: 'monthly' | 'yearly' }`.

2. **Cloud Function** (`createStripeCheckout`): crea una sesión de Stripe con `price_data` (no se usa catálogo de productos — precios hardcodeados). Pasa `metadata: { tier, billing }` para que el webhook pueda leerlo.

3. **Stripe**: procesa el pago y envía el evento `checkout.session.completed` al webhook.

4. **Webhook** (`stripeWebhook`): recibe el evento, lee `session.metadata.tier` y actualiza el documento del usuario en Firestore:
   - `tier: 'basic'` o `tier: 'pro'`
   - `isPremium: true`
   - `subscription.plan`, `status`, `startDate`, `renewalDate`, `provider`

## Cómo añadir un plan nuevo

1. Añadir la constante en `createStripeCheckout`.
2. Añadir la metadata en la sesión de Stripe.
3. Añadir la lógica en `stripeWebhook` para asignar el tier correcto.
4. Añadir el plan en la UI de `DashboardPage.tsx`.
5. Añadir el plan en el modal admin (`AdminDashboardPage.tsx`).

## Variables de entorno necesarias

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://flashtests.app
```

## Webhook endpoint

Configurar en Stripe Dashboard:
- URL: `https://flashtests.app/<region>-<project>.cloudfunctions.net/stripeWebhook`
- Eventos: `checkout.session.completed`
