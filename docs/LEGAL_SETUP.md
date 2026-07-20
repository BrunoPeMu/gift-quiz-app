# Configuración Legal — Pendientes para Producción

> **Estado actual**: Infraestructura técnica (versionado, re-aceptación, footer) implementada.
> **Textos legales**: Pendientes de redactar con abogado.

---

## Checklist pre-producción

### 1. Alta fiscal del titular
- [ ] Darse de alta como **autónomo** (régimen de módulos o estimación directa)
  - NIF personal
  - Epígrafe IAE: adecuado (ej: 763 - Servicios informáticos)
  - Alta en IVA
- [ ] O crear una **SL** (Sociedad Limitada)
  - NIF de la sociedad (CIF/NIF)
  - Inscripción en Registro Mercantil
  - Representante legal

### 2. Rellenar datos del titular en `src/config/legal.ts`
```ts
TITULAR.nombre = 'Tu Nombre o Razón Social'
TITULAR.nif = 'Tu NIF o CIF'
TITULAR.direccionFiscal = 'Dirección fiscal completa'
TITULAR.emailContacto = 'soporte@flashtests.app'
TITULAR.regimenIva = 'Régimen general de IVA' // o 'Módulos'
```

### 3. Email de soporte
- [ ] Contratar cuenta de email profesional (Google Workspace, Zoho, u otro)
- [ ] Crear `soporte@flashtests.app` (o `support@flashtests.app`)
- [ ] Actualizar `TITULAR.emailContacto` en `src/config/legal.ts`
- [ ] Actualizar enlaces de contacto en la app y footer

### 4. Redactar textos legales definitivos
- [x] Crear borradores operativos en `src/pages/legal/*`
- [ ] **Términos y Condiciones** (Términos de Uso):
  - Objeto del servicio
  - Cuenta de usuario y registro
  - Licencia de uso del contenido
  - IA (Gemini): disclaimer de corrección, límites de responsabilidad
  - Suscripciones: precios, renovación automática, cancelación, reembolso
  - Créditos y consumo
  - Publicidad
  - Propiedad intelectual
  - Limitación de responsabilidad
  - Ley aplicable y jurisdicción (España)
  - Contacto
- [ ] **Política de Privacidad** (RGPD):
  - Responsable del tratamiento: tus datos como titular
  - Categorías de datos recogidos (email, nombre, preguntas, progreso)
  - Finalidades del tratamiento
  - Base jurídica: ejecución del contrato, consentimiento, interés legítimo
  - Destinatarios: Firebase (Google), Stripe (USA), Google Gemini, Google AdSense
  - Transferencias internacionales (EE.UU.): SCCs, DPF
  - Conservación: hasta baja + 6 años (fiscales)
  - Derechos ARCO-POL: acceso, rectificación, cancelación (supresión), oposición, portabilidad, limitación
  - Cómo ejercer derechos
  - Medidas de seguridad
- [ ] **Política de Cookies** (ePrivacy + RGPD):
  - Tipos de cookies (necesarias, análisis, publicidad)
  - Base jurídica (consentimiento para no necesarias)
  - Terceros: AdSense, Firebase, Stripe
  - Cómo desactivar cookies
  - Tiempo de conservación por cookie
- [ ] **Aviso Legal** (LSSI-CE):
  - Datos del titular (nombre/NIF/dirección/email)
  - Código de conducta
  - Propiedad intelectual del sitio web
  - Exención de responsabilidad por enlaces externos
  - Legislación aplicable y jurisdicción

### 5. Crear páginas `/legal/*`
- [x] Crear rutas en la app:
  - `/legal/aviso-legal`
  - `/legal/privacidad`
  - `/legal/cookies`
  - `/legal/terminos`
- [x] Enlazar desde el footer con rutas reales
- [x] Actualizar `src/config/legal.ts` con las URLs de cada página
- [x] Añadir `LEGAL_PAGES` a la configuración

### 6. Configurar Stripe fiscal
- [ ] Completar **perfil de negocio** en Stripe Dashboard
  - Tipo de negocio: Persona física (autónomo) o Empresa (SL)
  - Nombre legal, NIF/CIF
  - Dirección fiscal
  - Número de teléfono
  - URL de la web
  - Descripción del negocio
- [ ] Activar **automatic_tax**: IVA según país del cliente (obligatorio UE)
- [ ] Configurar **invoice_creation** en Checkout Session:
  - `invoice_creation: { enabled: true, invoice_data: { ... } }` en `createStripeCheckout`
  - Habilitar campo NIF opcional para autónomos/empresas que quieran factura deducible
- [ ] Configurar **plantillas de email** de Stripe con info legal
- [ ] Activar **branding** de la app en facturas (logo, colores, nombre legal)
- [ ] Verificar en Stripe Dashboard que los precios muestran IVA incluido o añadido según corresponda

### 7. RGPD técnico
- [ ] Implementar **derecho al olvido**: endpoint/botón para borrar cuenta y todos sus datos de Firestore
- [ ] Implementar **portabilidad de datos**: descargar todas las preguntas y progreso del usuario en JSON
- [ ] Crear **formulario de contacto** para ejercer derechos ARCO-POL (o email directo)
- [ ] Revisar plazos de conservación en Firestore

### 8. Emails transaccionales
- [ ] Plantillas para:
  - Bienvenida / confirmación de registro
  - Confirmación de compra
  - Renovación automática (aviso previo 7 días)
  - Impago / tarjeta rechazada
  - Cancelación de suscripción
  - Confirmación de baja definitiva / borrado de cuenta
- [ ] Incluir en cada email: enlace a Términos, Privacidad, Aviso Legal, email de contacto

---

## Mecanismo de versionado

La infraestructura ya implementada funciona así:

1. **`src/config/legal.ts`** define `LEGAL_VERSION` (ej: `'1.3.2'`)
2. **`TermsModal`** y **`CookieConsentModal`** verifican si el usuario aceptó esta versión exacta
3. Si la versión del usuario es anterior o no existe → se muestra el modal de re-aceptación
4. Al aceptar, se guarda `termsAcceptedVersion: '1.3.2'` (la versión vigente en ese momento)

### Cómo cambiar la versión legal

```
1. Editar src/config/legal.ts
2. Cambiar LEGAL_VERSION = '1.3.3'
3. Cambiar LEGAL_LAST_UPDATED = '2026-XX-XX'
4. (Opcional) Actualizar src/config/legal.ts con la descripción del cambio
5. Deployar frontend
6. Todos los usuarios verán el modal de re-aceptación en su siguiente carga
```

**Ejemplo:**
```ts
LEGAL_VERSION = '1.3.3'
LEGAL_LAST_UPDATED = '2026-07-15'
```

Esto fuerza a todos los usuarios que aceptaron la v1.3.2 a re-aceptar la v1.3.3.

### Notas

- Si el usuario no ha iniciado sesión, no se requiere aceptación (aún no tiene cuenta)
- Los modales se muestran en orden: primero Términos, luego Cookies (Términos es bloqueante)
- El badge "Versión legal vX.Y.Z" aparece en el footer
- Sin alta de autónomo y textos legales reales, la app NO debe pasar a producción real (solo para pruebas/test mode)
- LATAM: aplicamos RGPD como baseline voluntario. Los textos deben aclarar que la ley aplicable es la del país de residencia del usuario, pero se adopta RGPD como garantía mínima.
