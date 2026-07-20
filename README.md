# FlashTests

Aplicación web para generar test de preguntas con IA (Google Gemini), diseñada para estudiantes y profesores.

**URL:** [https://flashtests.app](https://flashtests.app)

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS v3 |
| Backend | Firebase Cloud Functions (Node.js) |
| Base de datos | Cloud Firestore |
| Autenticación | Firebase Auth (Google, Email, Apple) |
| IA | Google Gemini (`gemini-3.1-flash-lite`) |
| Pagos | Stripe |
| i18n | i18next (ES / EN) |
| Hosting | Firebase Hosting |

---

## Estructura del proyecto

```
gift-quiz-app/
├── functions/src/index.ts   ← Cloud Functions (IA, Stripe)
├── src/
│   ├── components/          ← Componentes React reutilizables
│   ├── config/
│   │   └── featureFlags.ts  ← Feature flags y constantes de tiers
│   ├── contexts/
│   │   └── AuthContext.tsx   ← Auth, perfil, créditos
│   ├── locales/
│   │   ├── es.json           ← Español
│   │   └── en.json           ← Inglés
│   ├── pages/
│   │   ├── UploadPage.tsx    ← Generación con IA y subida GIFT
│   │   ├── DashboardPage.tsx ← Inicio, estadísticas, modal de planes
│   │   └── AdminDashboardPage.tsx ← Admin: gestión de usuarios
│   └── services/
│       ├── aiService.ts      ← Cliente de la Cloud Function de IA
│       └── userService.ts    ← Refill de créditos por tier
└── docs/
    ├── AI_BLOCKING.md        ← Documentación del bloqueo temporal de IA
    ├── TIERS.md              ← Arquitectura de tiers y créditos
    ├── STRIPE_PLANS.md       ← Configuración de Stripe y planes
    └── ROADMAP.md            ← Funcionalidades planificadas
```

---

## Tiers y planes de pago

| Tier | Créditos | Precio | Subida PDF | Contexto |
|---|---|---|---|---|
| `guest` | 2/día | Gratis | No | 10k chars |
| `free` | 3/día | Gratis | No | 10k chars |
| `basic` | 30/mes (rollover) | 4,99 €/mes o 49,90 €/año | No | 10k chars |
| `pro` | 50/día | 9,98 €/mes o 99,80 €/año | Sí | 100k chars |

**⚠️ Bloqueo temporal:** Los tiers `free` y `guest` no pueden usar generación con IA hasta que el sistema de anuncios (AdSense) esté correctamente implementado. Ver `docs/AI_BLOCKING.md`.

---

## Generación con IA

La generación de preguntas se realiza mediante una Cloud Function (`generateQuestions`), que:
1. Valida el tier del usuario (bloquea `free`/`guest`).
2. Verifica créditos disponibles (según tier).
3. Llama a Gemini (`gemini-3.1-flash-lite`) con un prompt estructurado.
4. Devuelve preguntas en formato JSON.

**Modos:**
- `generate`: genera preguntas desde un temario.
- `parse`: extrae preguntas de un test existente.
- `extract_key`: solo extrae respuestas correctas (para pre-procesado).
- `parse_with_key`: parsea usando una plantilla global de respuestas.

---

## Desarrollo local

```bash
# 1. Clonar y entrar
cd gift-quiz-app

# 2. Instalar dependencias
npm install
cd functions && npm install && cd ..

# 3. Variables de entorno
cp .env.example .env
# Editar .env con: VITE_GEMINI_API_KEY, Firebase keys, etc.

# 4. Iniciar frontend (Vite dev server)
npm run dev

# 5. (Opcional) Emulador de Firebase Functions
cd functions && npm run serve
```

---

## Despliegue

```bash
# Frontend
npm run build
firebase deploy --only hosting

# Backend (Cloud Functions)
firebase deploy --only functions

# Ambos
firebase deploy
```

---

## Cómo desbloquear la IA para free/guest

1. Implementar AdSense real (slot no placeholder) y renderizar `<AdBanner>`.
2. Vaciar `AI_BLOCKED_TIERS` en `src/config/featureFlags.ts`.
3. Eliminar el bloqueo en `functions/src/index.ts` (buscar `AI_BLOCKED_TIERS`).
4. Redeploy functions + hosting.

Ver `docs/AI_BLOCKING.md` para instrucciones detalladas.

---

## Licencia

Uso interno. No redistribuir.
