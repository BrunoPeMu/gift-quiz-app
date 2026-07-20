import { TITULAR, formatLegalValue } from '../../config/legal';
import { LegalDocument, type LegalSection } from '../../components/LegalDocument';
import { SeoHead } from '../../components/SeoHead';

const sections: LegalSection[] = [
    {
        title: '1. Responsable del tratamiento',
        paragraphs: [
            `El responsable del tratamiento es ${formatLegalValue(TITULAR.nombre, 'el titular del servicio')}, con los datos fiscales y de contacto que se indiquen definitivamente en el aviso legal y en la configuración de la plataforma.`,
            'Esta política vigente se basa en los principios del RGPD y cubre la operativa actual del producto mientras se concreta la denominación social, la base jurídica final y el inventario completo de proveedores.',
        ],
    },
    {
        title: '2. Datos que tratamos',
        paragraphs: [
            'Podemos tratar datos identificativos y de contacto, credenciales de acceso, contenido creado por el usuario, progreso de estudio, preferencias de interfaz, datos de facturación y metadatos técnicos del uso del servicio.',
        ],
        bullets: [
            'Identificación: nombre, email, alias y foto de perfil si el usuario la aporta.',
            'Contenido: preguntas, tests, temas, resultados y progreso.',
            'Facturación: datos asociados a suscripciones, impuestos y recibos.',
            'Técnicos: logs de acceso, IP aproximada, navegador y eventos de seguridad.',
        ],
    },
    {
        title: '3. Finalidades y bases jurídicas',
        paragraphs: [
            'Tratamos los datos para crear y mantener la cuenta, prestar el servicio, gestionar suscripciones y pagos, dar soporte, evitar fraude, cumplir obligaciones legales y, cuando corresponda, enviar comunicaciones operativas o promocionales con el consentimiento o base jurídica adecuada.',
        ],
        bullets: [
            'Ejecución del contrato: prestación del servicio, suscripción y gestión de créditos.',
            'Consentimiento: cookies no esenciales y, en su caso, comunicaciones comerciales.',
            'Interés legítimo: seguridad, prevención de fraude y mejora técnica del servicio.',
            'Obligación legal: facturación, conservación fiscal y atención de requerimientos de autoridades.',
            'Prevención de fraude y abuso: limitación de frecuencia, revisión de patrones sospechosos y protección frente a bots o usos automatizados no autorizados.',
        ],
    },
    {
        title: '4. Menores de edad',
        paragraphs: [
            'El servicio no está dirigido a menores de edad sin capacidad suficiente para consentir el tratamiento de sus datos. En caso de acceso desde jurisdicciones con edades mínimas distintas, se aplicará la regla más restrictiva compatible con la ley aplicable y con la capacidad para contratar del usuario.',
        ],
    },
    {
        title: '5. Destinatarios y encargados',
        paragraphs: [
            'El servicio puede apoyarse en terceros proveedores para autenticación, almacenamiento, hosting, pagos, analítica, publicidad y generación de contenido por IA. Los principales proveedores previstos son Google/Firebase, Stripe, Google Gemini y Google AdSense, sin perjuicio de otros que puedan añadirse con garantías equivalentes.',
            'Cuando estos terceros actúan como encargados del tratamiento o corresponsables, se seleccionan en función de su adecuación técnica y de las garantías contractuales y de seguridad aplicables.',
        ],
    },
    {
        title: '6. Transferencias internacionales',
        paragraphs: [
            'Algunos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En esos casos se utilizarán mecanismos válidos de transferencia internacional, como cláusulas contractuales tipo, marcos de adecuación o medidas complementarias equivalentes.',
            'El usuario entiende que determinados servicios tecnológicos o de pago pueden implicar transferencias hacia Estados Unidos u otros países con marcos de protección diferentes, siempre bajo las garantías que resulten exigibles.',
        ],
    },
    {
        title: '7. Conservación',
        paragraphs: [
            'Los datos se conservarán mientras exista relación contractual o interés legítimo para su tratamiento. Una vez finalizada la relación, se conservarán bloqueados durante los plazos legalmente exigidos, especialmente los vinculados a facturación y responsabilidades fiscales.',
        ],
        bullets: [
            'Cuenta de usuario: hasta que se solicite la supresión o exista obligación de conservación.',
            'Facturación: durante los plazos legales de prescripción fiscal y contable.',
            'Logs de seguridad: periodo razonable y proporcional para detección de incidentes.',
        ],
    },
    {
        title: '8. Derechos de las personas usuarias',
        paragraphs: [
            'El usuario puede ejercer, en los términos previstos por la normativa aplicable, los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, así como retirar el consentimiento cuando sea la base jurídica del tratamiento.',
            'La solicitud de derechos deberá tramitarse por un canal de contacto identificable, que se publicará en el aviso legal cuando el buzón profesional esté operativo.',
        ],
    },
    {
        title: '9. Decisiones automatizadas y perfilado',
        paragraphs: [
            'Con carácter general, la plataforma no adopta decisiones automatizadas con efectos jurídicos significativos sobre el usuario. Si en el futuro se introdujeran mecanismos de perfilado o recomendación relevantes, deberán documentarse y comunicarse adecuadamente.',
        ],
    },
    {
        title: '10. Medidas de seguridad',
        paragraphs: [
            'Aplicamos medidas técnicas y organizativas razonables para proteger la información contra accesos no autorizados, pérdida, alteración o divulgación indebida. Ningún sistema es totalmente invulnerable, por lo que el usuario también debe proteger sus credenciales.',
        ],
    },
    {
        title: '11. Reclamaciones y autoridad de control',
        paragraphs: [
            'Sin perjuicio de otros recursos administrativos o judiciales, el usuario podrá presentar una reclamación ante la autoridad de control competente, especialmente la Agencia Española de Protección de Datos, si considera que el tratamiento no se ajusta a la normativa.',
        ],
    },
    {
        title: '12. Cambios en esta política',
        paragraphs: [
            'La política de privacidad podrá actualizarse para reflejar cambios técnicos, legales o funcionales. Cuando se introduzcan cambios sustanciales, se deberá volver a solicitar la aceptación si así lo exige la normativa aplicable.',
        ],
    },
];

export default function PrivacidadPage() {
    return (
        <>
            <SeoHead
                title="Política de Privacidad"
                description="Cómo tratamos tus datos en FlashTests. Política de privacidad alineada con RGPD."
                path="/legal/privacidad"
            />
            <LegalDocument
                eyebrow="Política de Privacidad"
                title="Cómo tratamos tus datos"
                lead="Política de privacidad vigente alineada con RGPD y prácticas habituales de SaaS. Explica el tratamiento actual de datos mientras evoluciona la versión definitiva."
                sections={sections}
            />
        </>
    );
}
