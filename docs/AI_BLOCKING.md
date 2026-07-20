# Bloqueo temporal de generación con IA

## Estado actual

| Fecha | Cambio | Responsable |
|---|---|---|
| 2026-06-17 | Bloqueo inicial implementado | — |

## ¿Qué está bloqueado?

La Cloud Function `generateQuestions` y la UI asociada (pestaña "Generar con IA" en UploadPage) están bloqueadas para los tiers:

- `guest` — usuarios sin cuenta (créditos: 2/día)
- `free` — usuarios registrados sin pago (créditos: 3/día)

Los tiers `basic` (30 generaciones/mes) y `pro` (50/día) **no** se ven afectados.

## ¿Por qué?

El plan gratuito y de invitado debe sostenerse económicamente mediante publicidad (AdSense). Actualmente:

1. El componente `<AdBanner>` existe pero **no se renderiza** en ningún layout (`Layout.tsx` no lo importa).
2. El slot de AdSense es un placeholder (`data-ad-slot="1234567890"`).
3. `RewardedVideo.tsx` es un **mock** simulado — no hay integración con un proveedor real.
4. No hay variables de entorno para AdSense (client ID, slot ID).

Hasta que estos 4 puntos estén resueltos, el free/guest no puede generar tests con IA para evitar abusos del gasto de API.

## ¿Cómo revertir?

### Paso 1: Backend (`functions/src/index.ts`)

Eliminar (o comentar) el bloqueo:

```ts
// Buscar este bloque (aproximadamente línea 165):
// ⚠️ AI BLOCKING: temporal — ver docs/AI_BLOCKING.md
if (AI_BLOCKED_TIERS.includes(tier)) {
    throw new functions.https.HttpsError(
        'permission-denied',
        '...'
    );
}
```

Opción A: eliminar las líneas.
Opción B: comentarlas (más fácil de reactivar).

### Paso 2: Frontend (`src/config/featureFlags.ts`)

Vaciar la lista de tiers bloqueados:

```ts
export const AI_BLOCKED_TIERS = [] as const;
```

### Paso 3: Frontend (`src/pages/UploadPage.tsx`)

- Eliminar o comentar el banner de bloqueo en la sección IA.
- Eliminar el check de tiers bloqueados en `handleGenerate`.
- Restaurar la condición del botón `disabled`.

### Paso 4: Redeploy

```bash
npm run build
firebase deploy --only functions
firebase deploy --only hosting
```

## Criterios para reactivar

- [x] `AdBanner.tsx` se renderiza en `Layout.tsx` (entre `<Navbar>` y `<main>`).
- [ ] `data-ad-slot` tiene un slot real de AdSense (no `1234567890`). → Configurar `VITE_ADSENSE_CLIENT_ID` y `VITE_ADSENSE_SLOT_ID` en `.env`.
- [x] El script `adsbygoogle.js` está cargado en `index.html` (ya lo está).
- [ ] `RewardedVideo.tsx` está conectado a un proveedor real (AdMob, Unity Ads, etc.) **o** se ha decidido no usar y se ha eliminado el mock de la UI.
- [x] El usuario free/guest ve anuncios antes o durante la interacción con la IA.

## Notas

- El bloqueo es **doblemente seguro**: frontend (UX) + backend (Cloud Function).
- Mientras el bloqueo esté activo, la pestaña "Generar con IA" muestra un banner explicativo con enlace a los planes de pago.
- Los términos legales (`TermsModal.tsx`) ya avisan de que la versión gratuita incluye publicidad.
