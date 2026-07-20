import { LegalDocument, type LegalSection } from '../../components/LegalDocument';
import { SeoHead } from '../../components/SeoHead';

const sections: LegalSection[] = [
    {
        title: '1. Qué son las cookies',
        paragraphs: [
            'Las cookies son pequeños archivos que se almacenan en tu dispositivo para hacer funcionar la web, recordar preferencias, medir el uso del servicio y, en su caso, mostrar publicidad personalizada o no personalizada.',
        ],
    },
    {
        title: '2. Tipos de cookies que podemos usar',
        paragraphs: [
            'La plataforma puede emplear cookies propias y de terceros. Las categorías previstas son las habituales en un SaaS con autenticación, analítica y publicidad.',
        ],
        bullets: [
            'Necesarias: autenticación, sesión, seguridad y funcionamiento básico.',
            'Preferencias: idioma, tema visual y opciones del usuario.',
            'Analítica: medición de uso, rendimiento y mejora del producto, si se activa.',
            'Publicidad: gestión de anuncios y frecuencia de impactos, especialmente en la versión gratuita.',
        ],
    },
    {
        title: '3. Terceros previstos',
        paragraphs: [
            'Según la configuración del servicio, pueden intervenir Google/Firebase para autenticación e infraestructura, Google AdSense para publicidad y Stripe para pagos y gestión de suscripciones. Cada proveedor puede usar cookies o tecnologías equivalentes según sus propias políticas.',
            'Si se activan analíticas adicionales, deberán incorporarse al inventario y al banner de consentimiento antes de su uso en producción.',
        ],
    },
    {
        title: '4. Base jurídica',
        paragraphs: [
            'Las cookies necesarias se apoyan en el interés legítimo o en la necesidad técnica del servicio. Las cookies analíticas y publicitarias no necesarias requieren consentimiento previo, libre, informado e inequívoco del usuario.',
        ],
    },
    {
        title: '5. Cómo gestionar el consentimiento',
        paragraphs: [
            'El banner de cookies debe permitir aceptar, rechazar o configurar por categorías. El consentimiento puede retirarse en cualquier momento desde la configuración del navegador o desde los controles de consentimiento de la plataforma cuando estén disponibles.',
        ],
    },
    {
        title: '6. Cómo desactivar cookies',
        paragraphs: [
            'Puedes borrar o bloquear cookies desde la configuración de tu navegador. Ten en cuenta que desactivar las cookies necesarias puede impedir el correcto funcionamiento de la cuenta, la sesión o parte de las funcionalidades de la plataforma.',
        ],
    },
    {
        title: '7. Conservación',
        paragraphs: [
            'La duración de cada cookie depende de su finalidad y de su proveedor. Debe documentarse de forma específica antes de la publicación final, incluyendo tiempo de expiración y terceros involucrados.',
        ],
    },
    {
        title: '8. Actualizaciones',
        paragraphs: [
            'Esta política debe revisarse cuando cambien los proveedores, el banner de consentimiento o las cookies utilizadas por el sitio. Si los cambios son sustanciales, deberá volver a solicitarse el consentimiento cuando proceda.',
        ],
    },
];

export default function CookiesPage() {
    return (
        <>
            <SeoHead
                title="Política de Cookies"
                description="Uso de cookies y tecnologías similares en FlashTests. Cookies necesarias, analíticas y publicitarias."
                path="/legal/cookies"
            />
            <LegalDocument
                eyebrow="Política de Cookies"
                title="Uso de cookies y tecnologías similares"
                lead="Política de cookies vigente para explicar cookies necesarias, analíticas y publicitarias. Se publican las categorías previstas mientras se completa el inventario final de cookies y terceros."
                sections={sections}
            />
        </>
    );
}
