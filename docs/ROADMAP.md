# Roadmap

## Pendientes de implementación (futuro)

### 1. Integración real de anuncios (bloqueador para free/guest)

- [ ] Renderizar `<AdBanner />` en `Layout.tsx`.
- [ ] Reemplazar `data-ad-slot="1234567890"` por un slot real de AdSense.
- [ ] Configurar variables de entorno `VITE_ADSENSE_CLIENT_ID` y `VITE_ADSENSE_SLOT_ID`.
- [ ] Conectar `RewardedVideo.tsx` a un proveedor real (AdMob, Unity Ads).
- [ ] Desbloquear IA para free/guest (seguir `docs/AI_BLOCKING.md`).

### 2. Compartir preguntas

- [ ] Sistema de enlaces compartibles con permisos de solo lectura.
- [ ] UI para generar y copiar link de compartición.
- [ ] Página pública de test compartido.

### 3. Packs de créditos extra

- [ ] Stripe producto "Pack de X créditos" (ej. +50 créditos por 1,99 €).
- [ ] UI de compra dentro de la sección de IA.
- [ ] Acreditación automática al completar pago.

### 4. Analytics y métricas

- [ ] Seguimiento de uso de generación IA por tier.
- [ ] Dashboard de costes API Gemini.
- [ ] Alertas de gasto excesivo.

### 5. Mejoras en el plan Basic

- [ ] Evaluar si 30/mes es el número correcto (ajuste vía feature flag).
- [ ] Añadir barra de progreso "Te quedan X de 30 generaciones este mes".
