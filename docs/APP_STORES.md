# Estrategia App Stores para FlashTests

## Google Play Store

### Requisitos previos
- Cuenta de desarrollador en Google Play ($25 USD, pago único)
- APK o AAB generado con Bubblewrap, PWABuilder o TWA (Trusted Web Activity)
- Iconos: 512x512 (store), 192x192 (app), 48x48 (notification)
- Screenshots: mínimo 2, recomendado 4-8 (16:9 o 9:16)

### Configuración recomendada
- **Nombre**: FlashTests - Generador de tests con IA
- **Categoría**: Educación
- **Descripción corta** (80 chars): Genera tests de estudio con IA a partir de tus apuntes
- **Descripción larga** (4000 chars): Keywords principales + features + social proof
- **Idiomas**: es-ES, es-MX, es-AR, en-US
- **Precio**: Gratis (con compras in-app para planes Basic/Pro)
- **Clasificación**: Everyone (E)

### Keywords ASO (App Store Optimization)
```
generador de tests, tests con IA, autoevaluación, estudiar, oposiciones, 
examen, test de preguntas, apuntes, Moodle, GIFT, repaso, práctica
```

### Generar APK/AAB con PWABuilder
1. Ve a https://www.pwabuilder.com/
2. Introduce `https://flashtests.app`
3. Sigue el asistente para generar el paquete Android
4. Descarga el AAB (Android App Bundle)
5. Sube a Google Play Console

## Apple App Store

### Requisitos previos
- Cuenta de desarrollador Apple ($99 USD/año)
- App nativa (Swift) o wrapper con Capacitor/Ionic
- Screenshots para iPhone y iPad
- App icon 1024x1024

### Opciones
1. **PWA en Safari** — limitado, no hay push notifications ni icono nativo
2. **Capacitor wrapper** — convierte la web en app nativa con ~2 días de trabajo
3. **App nativa** — más costoso pero mejor experiencia

### Configuración recomendada
- **Nombre**: FlashTests - Generador de tests con IA
- **Categoría**: Educación
- **Precio**: Gratis
- **Clasificación**: 4+
- **Idiomas**: Español, Inglés

## Métricas ASO a monitorizar

| Métrica | Objetivo |
|---------|----------|
| Impresiones en tienda | +1000/mes |
| Tasa de conversión (instalaciones/impresiones) | >5% |
| Rating medio | >4.5 estrellas |
| Keywords en top 10 | "generador tests", "tests IA" |

## Checklist de lanzamiento

- [ ] Crear cuenta de desarrollador (Google Play)
- [ ] Generar iconos de la app (192, 512, 1024px)
- [ ] Capturar screenshots de la app
- [ ] Generar AAB con PWABuilder
- [ ] Rellenar listing en Google Play Console
- [ ] Enlazar Firebase App Distribution para updates
- [ ] Configurar Firebase Analytics para tracking de installs
- [ ] Publicar y monitorizar reviews
