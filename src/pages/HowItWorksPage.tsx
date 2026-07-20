import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

const steps = [
    { number: '1', title: 'Sube tu temario', description: 'Pega el texto de tus apuntes, importa un PDF o escribe el tema que quieres estudiar. FlashTests acepta cualquier formato de texto.' },
    { number: '2', title: 'Genera el test', description: 'La IA analiza tu contenido y genera preguntas relevantes al instante. Puedes configurar el número de preguntas, dificultad y tipos (opción múltiple, verdadero/falso, respuesta corta).' },
    { number: '3', title: 'Responde y aprende', description: 'Completa el test y revisa tus respuestas. FlashTests te muestra qué has acertado y qué necesitas repasar.' },
    { number: '4', title: 'Repite y mejora', description: 'Las estadísticas guardan tu progreso. Puedes repetir tests, crear nuevos desde el mismo temario y ver cómo mejoras con el tiempo.' },
];

export default function HowItWorksPage() {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Cómo funciona"
                description="Descubre cómo FlashTests convierte tus apuntes en tests de autoevaluación con IA en 4 sencillos pasos."
                path="/como-funciona"
            />

            <div className="max-w-4xl mx-auto py-8">
                <div className="text-center mb-16">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">¿Cómo funciona FlashTests?</h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">En 4 pasos simples, convierte tus apuntes en tests de autoevaluación personalizados.</p>
                </div>

                <div className="space-y-12">
                    {steps.map((step, i) => (
                        <div key={step.number} className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                            <div className="flex-shrink-0 w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center">
                                <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{step.number}</span>
                            </div>
                            <div className={i % 2 === 1 ? 'md:text-right' : ''}>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h2>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-16">
                    <button
                        onClick={() => navigate('/setup')}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 text-lg inline-flex items-center gap-2"
                    >
                        Probar ahora <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
}
