import { TITULAR, formatLegalValue, TITULAR as LegalTitular } from '../../config/legal';
import { LegalDocument, type LegalSection } from '../../components/LegalDocument';
import { SeoHead } from '../../components/SeoHead';

const sections: LegalSection[] = [
    {
        title: '1. Identificación del titular',
        paragraphs: [
            `El presente sitio web y el servicio FlashTests son titularidad de ${formatLegalValue(LegalTitular.nombre, 'el titular del servicio')}.`,
            `Datos de identificación operativa: NIF/CIF ${formatLegalValue(LegalTitular.nif, 'pendiente de completar')}, domicilio fiscal ${formatLegalValue(LegalTitular.direccionFiscal, 'pendiente de completar')} y correo de contacto ${formatLegalValue(LegalTitular.emailContacto, 'contacto interno del servicio')}.`,
            'La información identificativa definitiva debe publicarse antes del lanzamiento comercial estable de la actividad.',
        ],
    },
    {
        title: '2. Objeto',
        paragraphs: [
            'FlashTests es una plataforma web orientada a la creación, gestión y práctica de tests de estudio, con funcionalidades de generación asistida por IA, organización de contenidos, suscripción de pago y acceso a publicidad en la modalidad gratuita.',
            'El servicio se presta mediante acceso web y puede incorporar cambios funcionales, de diseño o de monetización para adaptarse a necesidades técnicas, regulatorias o comerciales.',
        ],
    },
    {
        title: '3. Condiciones de acceso y uso',
        paragraphs: [
            'El acceso al servicio implica la aceptación de estas condiciones, de la política de privacidad y de la política de cookies cuando proceda. El usuario debe disponer de capacidad legal suficiente para contratar o, en su caso, usar el servicio conforme a la normativa del país desde el que accede.',
        ],
        bullets: [
            'El usuario se compromete a utilizar el servicio de forma lícita, diligente y conforme a la buena fe.',
            'No se permite usar el servicio para actividades que vulneren derechos de terceros o la legislación aplicable.',
            'El titular puede limitar, suspender o cancelar el acceso ante usos abusivos, fraudulentos o que comprometan la seguridad.',
        ],
    },
    {
        title: '4. Propiedad intelectual e industrial',
        paragraphs: [
            'Salvo indicación en contrario, el código, diseño, interfaz, marca, logotipos y contenidos originales del sitio están protegidos por la normativa de propiedad intelectual e industrial.',
            'El usuario no adquiere ningún derecho de explotación sobre la plataforma más allá de la licencia de uso limitada, personal, revocable y no exclusiva necesaria para utilizar el servicio.',
        ],
    },
    {
        title: '5. Uso permitido y prohibido',
        paragraphs: [
            'El usuario se compromete a usar la plataforma de forma lícita, diligente y conforme a la buena fe. Queda prohibido utilizar el servicio para actividades ilegales, difamatorias, fraudulentas o que vulneren derechos de terceros.',
        ],
        bullets: [
            'Está prohibido subir datos personales de terceros sin legitimación suficiente.',
            'Está prohibido intentar evadir límites técnicos, de pago o de acceso.',
            'Está prohibido interferir en la seguridad o disponibilidad del servicio.',
            'Está prohibido utilizar el servicio para distribuir malware, spam o contenido ilícito.',
        ],
    },
    {
        title: '6. Terceros, enlaces externos y servicios integrados',
        paragraphs: [
            'La plataforma puede integrar o enlazar servicios de terceros, incluidos proveedores de pago, autenticación, generación de contenido e infraestructura. El titular no controla sus políticas ni contenidos, por lo que recomienda revisar los términos aplicables de cada tercero.',
            'El uso de servicios de terceros puede implicar tratamientos adicionales de datos y la aceptación de sus condiciones, políticas de privacidad y políticas de cookies.',
        ],
    },
    {
        title: '7. Responsabilidad y disponibilidad',
        paragraphs: [
            'El titular no garantiza la ausencia total de interrupciones, errores o vulnerabilidades, aunque aplicará medidas razonables de mantenimiento y seguridad.',
            'La información generada por IA es de apoyo y puede contener inexactitudes; el usuario debe verificarla antes de usarla con fines académicos, profesionales o comerciales.',
            'En la medida permitida por la normativa aplicable, el titular no responderá por daños derivados de una utilización indebida del servicio, ni por incidencias ajenas a su control razonable.',
        ],
    },
    {
        title: '8. Facturación, impuestos y pagos',
        paragraphs: [
            'Cuando existan pagos, las condiciones económicas se mostrarán antes de la contratación y podrán incluir impuestos indirectos, según la normativa fiscal aplicable y el país de facturación.',
            'Las facturas o justificantes de pago se emitirán conforme a la información disponible en el proceso de compra y a los datos fiscales que, en su caso, aporte el cliente.',
        ],
    },
    {
        title: '9. Normativa aplicable y jurisdicción',
        paragraphs: [
            'Con carácter general, el uso del sitio se rige por la normativa española y de la Unión Europea, en especial la LSSI-CE, la normativa de consumo aplicable y el RGPD en materia de protección de datos.',
            'Cualquier controversia se someterá, cuando la ley lo permita, a los juzgados y tribunales del domicilio del titular o del consumidor, según corresponda.',
        ],
    },
    {
        title: '10. Contacto',
        paragraphs: [
            `Para incidencias legales o solicitudes formales, utiliza el apartado de contacto del aviso legal o el correo de titular que figure en la configuración interna del sitio. Mientras se completa la información, el contacto de referencia es ${formatLegalValue(TITULAR.emailContacto, 'contacto interno del servicio')}.`,
        ],
    },
];

export default function AvisoLegalPage() {
    return (
        <>
            <SeoHead
                title="Aviso Legal"
                description="Información legal de FlashTests: identificación del titular, condiciones de uso, propiedad intelectual y normativa aplicable."
                path="/legal/aviso-legal"
            />
            <LegalDocument
            eyebrow="Aviso Legal"
            title="Información legal del sitio"
            lead="Aviso legal vigente del servicio. Recoge la identificación del titular, el uso permitido del sitio y el marco general de responsabilidad mientras se completa la formalización fiscal y jurídica definitiva."
            sections={sections}
            footerNote={
                <span id="contacto">
                    El contacto legal debe sustituirse por un buzón profesional en cuanto se disponga de él.
                    El enlace desde el pie de página apunta a esta sección para facilitar el acceso a la identificación del titular.
                </span>
            }
            />
        </>
    );
}
