import { LegalDocument, type LegalSection } from '../../components/LegalDocument';
import { SeoHead } from '../../components/SeoHead';

const sections: LegalSection[] = [
    {
        title: '1. Objeto del servicio',
        paragraphs: [
            'FlashTests permite crear, organizar y practicar tests, además de utilizar funciones de generación asistida por IA y, cuando corresponda, acceder a funciones de pago o monetizadas mediante publicidad.',
            'Las condiciones aquí recogidas regulan el uso de la plataforma, independientemente de que el acceso se produzca desde España, Latinoamérica u otras jurisdicciones donde el servicio sea técnicamente accesible.',
        ],
    },
    {
        title: '2. Registro, cuenta y seguridad',
        paragraphs: [
            'Para usar el servicio puede ser necesario crear una cuenta. El usuario debe facilitar datos veraces, mantener actualizada su información y custodiar sus credenciales con diligencia.',
            'El titular podrá verificar, suspender o eliminar cuentas cuando detecte fraude, uso abusivo, suplantación o incumplimiento de estas condiciones.',
        ],
    },
    {
        title: '3. Planes, suscripciones y renovaciones',
        paragraphs: [
            'Los planes de pago pueden renovarse automáticamente mientras la suscripción permanezca activa. Los precios, periodicidad, impuestos aplicables, cancelación y política de reembolsos se publican en la interfaz y deben coincidir con la contratación efectiva.',
            'Cuando el usuario contrate un plan, se aplicarán las condiciones económicas y de uso vigentes en el momento de la contratación, sin perjuicio de los cambios posteriores debidamente informados.',
            'Los servicios digitales se prestan de forma inmediata tras la confirmación de compra. El usuario puede perder el derecho de desistimiento respecto de la parte del servicio ya ejecutada o del contenido ya consumido, siempre en la medida permitida por la normativa aplicable y tras la aceptación expresa del inicio inmediato.',
        ],
        bullets: [
            'El usuario debe poder cancelar desde Stripe Customer Portal o desde un mecanismo equivalente visible.',
            'Los cargos recurrentes deben informarse con antelación suficiente y de forma clara.',
            'Si el usuario inicia la prestación inmediata del servicio digital, puede perder el derecho de desistimiento respecto de la parte ya ejecutada, según la normativa aplicable.',
            'Los impuestos indirectos se mostrarán, en su caso, según el país de facturación y el régimen fiscal aplicable.',
            'No se admitirán devoluciones cuando el servicio ya haya sido activado o consumido, salvo obligación legal imperativa o error imputable al titular.',
        ],
    },
    {
        title: '4. Créditos, límites y publicidad',
        paragraphs: [
            'La plataforma puede funcionar con créditos de IA, límites por plan y monetización por anuncios en la versión gratuita. Cualquier regla de consumo o recarga debe aparecer de forma transparente en la interfaz y en los textos definitivos.',
            'Los límites de generación, recarga o consumo de créditos pueden variar según el plan, la disponibilidad técnica o la política de producto vigente, siempre con información suficiente al usuario.',
        ],
    },
    {
        title: '5. Contenido aportado por el usuario',
        paragraphs: [
            'El usuario conserva, en principio, los derechos sobre su contenido, sin perjuicio de la licencia limitada necesaria para alojarlo, procesarlo y mostrarlo dentro del servicio. No debe subir material de terceros sin permiso o base legítima suficiente.',
        ],
    },
    {
        title: '6. Uso de IA y exactitud',
        paragraphs: [
            'Las respuestas generadas por IA son de apoyo y pueden contener errores. El usuario debe revisarlas antes de utilizarlas en exámenes, oposiciones, proyectos profesionales o cualquier otro contexto relevante.',
            'No se garantiza la exactitud, actualidad ni idoneidad de las salidas de IA para un propósito concreto. El usuario asume la responsabilidad de comprobarlas y adaptarlas antes de su uso.',
        ],
    },
    {
        title: '7. Conducta y suspensión',
        paragraphs: [
            'Podrá suspenderse o cancelarse el acceso si el usuario vulnera la ley, los derechos de terceros, la seguridad del sistema o las presentes condiciones.',
            'El titular podrá conservar evidencia técnica y de seguridad de los incumplimientos durante el tiempo razonablemente necesario para la investigación, la prevención del fraude o la defensa de sus derechos.',
            'Los intentos de abuso relacionados con reembolsos, contracargos o uso intensivo previo a una reclamación podrán dar lugar a revisión manual, suspensión temporal y bloqueo de nuevas contrataciones.',
            'El titular podrá aplicar límites de frecuencia, controles anti-bot y medidas de mitigación de abuso para proteger la plataforma y a sus usuarios.',
        ],
    },
    {
        title: '8. Limitación de responsabilidad',
        paragraphs: [
            'El servicio se ofrece con un estándar razonable de disponibilidad, pero no se garantiza ausencia total de interrupciones, pérdida de datos o errores de terceros. La responsabilidad del titular se limitará en la medida permitida por la ley.',
            'No se excluye la responsabilidad por dolo o por aquellas obligaciones que la ley declare irrenunciables en perjuicio del consumidor o usuario.',
        ],
    },
    {
        title: '9. Protección del consumidor y desistimiento',
        paragraphs: [
            'Cuando resulte aplicable la normativa de consumidores, el usuario gozará de los derechos irrenunciables reconocidos por la ley de su domicilio o de la contratación. En servicios digitales con ejecución inmediata, el derecho de desistimiento podrá verse afectado en los términos legalmente previstos.',
            'Si se implementan procesos de compra con contenido o acceso digital inmediato, deberá informarse de forma expresa al usuario antes de la confirmación del pedido.',
        ],
    },
    {
        title: '10. Cambios en las condiciones',
        paragraphs: [
            'Estas condiciones podrán revisarse para adaptarlas a cambios legales, técnicos o comerciales. Si el cambio es relevante, se deberá volver a solicitar la aceptación cuando proceda.',
        ],
    },
    {
        title: '11. Ley aplicable y contacto',
        paragraphs: [
            'Estas condiciones se interpretarán conforme a la legislación española y europea aplicable al consumo, comercio electrónico y protección de datos. Para consultas legales o de consumo, utiliza el canal de contacto indicado en el aviso legal.',
        ],
    },
];

export default function TerminosPage() {
    return (
        <>
            <SeoHead
                title="Términos y Condiciones"
                description="Condiciones de uso de FlashTests. Términos del servicio para la plataforma de tests con IA."
                path="/legal/terminos"
            />
            <LegalDocument
                eyebrow="Términos y Condiciones"
                title="Condiciones de uso del servicio"
                lead="Términos vigentes del servicio para un SaaS con IA, suscripción y versión gratuita con publicidad. Son aplicables en la app mientras evoluciona la revisión profesional definitiva."
                sections={sections}
            />
        </>
    );
}
