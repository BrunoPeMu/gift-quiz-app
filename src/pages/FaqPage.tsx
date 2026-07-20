import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

const faqs = [
    { question: '¿FlashTests es gratis?', answer: 'Sí, el plan gratuito te permite crear tests manualmente y practicar sin límite. Los usuarios registrados gratuitos tienen 3 generaciones con IA al día. Los planes Basic y Pro ofrecen más generaciones y funciones avanzadas.' },
    { question: '¿Qué tipos de preguntas soporta?', answer: 'FlashTests soporta opción múltiple, verdadero/falso, respuesta corta, rellenar huecos y preguntas de emparejamiento. El formato GIFT es compatible con Moodle y otros LMS.' },
    { question: '¿Puedo importar mis apuntes en PDF?', answer: 'Sí, los usuarios del plan Pro pueden subir archivos PDF directamente. Los demás planes pueden pegar el texto de sus apuntes para generar preguntas con IA.' },
    { question: '¿Mis datos están seguros?', answer: 'Tus datos se almacenan de forma segura en Firebase (Google Cloud). Cada usuario solo puede acceder a sus propios datos. Consulta nuestra Política de Privacidad para más detalles.' },
    { question: '¿Puedo compartir mis tests con otros?', answer: 'Sí, puedes generar un enlace compartible para cualquier test. Los demás usuarios podrán realizar el test sin necesidad de cuenta.' },
    { question: '¿Cuántas generaciones con IA tengo?', answer: 'Depende del plan: Free (3/día), Guest (2/día), Basic (30/mes con rollover), Pro (50/día). Los usuarios que aceptan publicidad personalizada desbloquean las generaciones IA del plan Free.' },
    { question: '¿Es compatible con Moodle?', answer: 'Sí, FlashTests exporta preguntas en formato GIFT, que es el estándar de Moodle para importar preguntas. Puedes crear tus tests en FlashTests e importarlos directamente en tu curso de Moodle.' },
    { question: '¿Puedo usar FlashTests en el móvil?', answer: 'Sí, FlashTests es una aplicación web responsive que funciona en cualquier dispositivo con navegador: móvil, tablet o PC.' },
];

export default function FaqPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <>
            <SeoHead
                title="Preguntas Frecuentes"
                description="Resolvemos las dudas más comunes sobre FlashTests: precios, tipos de preguntas, privacidad, compatibilidad con Moodle y más."
                path="/preguntas-frecuentes"
            />

            <div className="max-w-3xl mx-auto py-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Preguntas frecuentes</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-10">Resolvemos las dudas más comunes sobre FlashTests.</p>

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <span className="font-semibold text-slate-900 dark:text-white">{faq.question}</span>
                                <HelpCircle className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === i && (
                                <div className="px-4 pb-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "FAQPage",
                        "mainEntity": faqs.map(faq => ({
                            "@type": "Question",
                            "name": faq.question,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": faq.answer
                            }
                        }))
                    })}
                </script>
            </div>
        </>
    );
}
