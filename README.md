# AI Gift Quiz Generator

Aplicación moderna para generar preguntas de test en formato GIFT usando IA (Google Gemini), diseñada para profesores.

## 🚀 Despliegue (Producción)

La aplicación está desplegada y accesible en:
**[https://flashtests.app](https://flashtests.app)**

## 🔐 Seguridad e IA

Esta aplicación utiliza la API de Google Gemini.

### Configuración de Clave API
Para seguridad y comodidad, la aplicación soporta dos modos:

1.  **Modo Desarrollador (Recomendado para local):**
    *   Crea un archivo `.env` en la raíz.
    *   Añade tu clave: `VITE_GEMINI_API_KEY=tu_clave_aqui`
    *   La aplicación detectará la clave automáticamente y ocultará el campo de entrada.

2.  **Modo Usuario (Web pública):**
    *   Si no hay variable de entorno, la web mostrará un campo para que el usuario introduzca su propia clave.
    *   La clave se guarda en el navegador (`localStorage`) para comodidad del usuario.

### Restricciones de Dominio
Para proteger tu cuota de API en producción:
1.  Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Edita tu API Key.
3.  En "Restricciones de aplicación", selecciona **Sitios web (HTTP referrers)**.
4.  Añade tu dominio: `https://flashtests.app/*`.

## 🛠️ Desarrollo Local

1.  Instalar dependencias:
    ```bash
    npm install
    ```

2.  Iniciar servidor de desarrollo:
    ```bash
    npm run dev
    ```

3.  Construir para producción:
    ```bash
    npm run build
    ```

## 📋 Características
*   Generación de preguntas con IA (MCQ, Verdadero/Falso, Corta).
*   Formato GIFT estándar compatible con Moodle.
*   Editor visual y manual.
*   Interfaz moderna con modo oscuro y soporte multi-idioma (ES/EN).

