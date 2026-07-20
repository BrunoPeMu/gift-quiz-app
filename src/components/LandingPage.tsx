import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Brain, BarChart3, Zap, CheckCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const features = [
    {
        icon: Brain,
        title: 'Generación con IA',
        description: 'Crea tests automáticamente a partir de tus apuntes. Solo pega tu temario y la IA genera preguntas de opción múltiple, verdadero/falso y más.'
    },
    {
        icon: BookOpen,
        title: 'Múltiples formatos',
        description: 'Importa desde texto, PDF o crea preguntas manualmente. Soporta formatos GIFT estándar compatibles con Moodle y otras plataformas.'
    },
    {
        icon: BarChart3,
        title: 'Estadísticas detalladas',
        description: 'Seguimiento de tu progreso por asignatura y tema. Identifica tus puntos débiles y mide tu mejora a lo largo del tiempo.'
    },
    {
        icon: Zap,
        title: 'Práctica adaptativa',
        description: 'Dificultad configurable (fácil, medio, difícil). El sistema aprende de tus respuestas para enfocarse en lo que más necesitas repasar.'
    }
];

const steps = [
    { number: '1', title: 'Sube tu temario', description: 'Pega el texto de tus apuntes o sube un PDF.' },
    { number: '2', title: 'Genera el test', description: 'La IA crea preguntas relevantes al instante.' },
    { number: '3', title: 'Estudia y mejora', description: 'Responde, revisa tus errores y repite.' }
];

const faqs = [
    {
        question: '¿FlashTests es gratis?',
        answer: 'Sí, el plan gratuito te permite crear tests manualmente y practicar sin límite. Los usuarios registrados gratuitos tienen 3 generaciones con IA al día. Los planes Basic y Pro ofrecen más generaciones y funciones avanzadas.'
    },
    {
        question: '¿Qué tipos de preguntas soporta?',
        answer: 'FlashTests soporta opción múltiple, verdadero/falso, respuesta corta, rellenar huecos y preguntas de emparejamiento. El formato GIFT es compatible con Moodle y otros LMS.'
    },
    {
        question: '¿Puedo importar mis apuntes en PDF?',
        answer: 'Sí, los usuarios del plan Pro pueden subir archivos PDF directamente. Los demás planes pueden pegar el texto de sus apuntes para generar preguntas con IA.'
    },
    {
        question: '¿Mis datos están seguros?',
        answer: 'Tus datos se almacenan de forma segura en Firebase (Google Cloud). Cada usuario solo puede acceder a sus propios datos. Consulta nuestra Política de Privacidad para más detalles.'
    },
    {
        question: '¿Puedo compartir mis tests con otros?',
        answer: 'Sí, puedes generar un enlace compartible para cualquier test. Los demás usuarios podrán realizar el test sin necesidad de cuenta.'
    }
];

export function LandingPage() {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="space-y-20 pb-20">
            {/* Hero Section */}
            <section className="text-center pt-8 pb-4">
                <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" />
                    Potenciado por Inteligencia Artificial
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                    Estudia más rápido<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                        con tests inteligentes
                    </span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10">
                    FlashTests genera tests de autoevaluación a partir de tus apuntes usando IA.
                    Identifica lo que no sabes, repasa menos y retiene más.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/config')}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 text-lg flex items-center justify-center gap-2"
                    >
                        Empezar Gratis
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-colors text-lg"
                    >
                        Ya tengo cuenta
                    </button>
                </div>
            </section>

            {/* How it Works */}
            <section>
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
                    ¿Cómo funciona?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {steps.map((step) => (
                        <div key={step.number} className="text-center">
                            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{step.number}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section>
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 dark:text-white mb-4">
                    Todo lo que necesitas para estudiar
                </h2>
                <p className="text-center text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-12">
                    Herramientas diseñadas para estudiantes que quieren optimizar su tiempo de estudio
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div key={feature.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
                                    <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 sm:p-12 max-w-5xl mx-auto border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 dark:text-white mb-4">
                    Planes para cada necesidad
                </h2>
                <p className="text-center text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10">
                    Empieza gratis y escala cuando lo necesites
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Free</h3>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">0€<span className="text-sm font-normal text-slate-500">/siempre</span></p>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Tests manuales ilimitados</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 3 generaciones IA/día</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Estadísticas básicas</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-indigo-500 shadow-lg shadow-indigo-500/10 relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">Popular</div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Basic</h3>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">4,99€<span className="text-sm font-normal text-slate-500">/mes</span></p>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Todo lo del plan Free</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 30 generaciones IA/mes</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Sin publicidad</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Pro</h3>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">9,98€<span className="text-sm font-normal text-slate-500">/mes</span></p>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Todo lo del plan Basic</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 50 generaciones IA/día</li>
                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Importar PDF</li>
                        </ul>
                    </div>
                </div>
                <div className="text-center mt-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                    >
                        Crear cuenta gratuita
                    </button>
                </div>
            </section>

            {/* FAQ */}
            <section>
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
                    Preguntas frecuentes
                </h2>
                <div className="max-w-2xl mx-auto space-y-3">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <span className="font-semibold text-slate-900 dark:text-white">{faq.question}</span>
                                <HelpCircle className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === index && (
                                <div className="px-4 pb-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="text-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-10 sm:p-16 max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                    ¿Listo para estudiar de forma más inteligente?
                </h2>
                <p className="text-indigo-100 max-w-xl mx-auto mb-8 text-lg">
                    Únete a miles de estudiantes que ya usan FlashTests para mejorar sus resultados.
                </p>
                <button
                    onClick={() => navigate('/config')}
                    className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-lg"
                >
                    Empezar ahora — es gratis
                </button>
            </section>
        </div>
    );
}
