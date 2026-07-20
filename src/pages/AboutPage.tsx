import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

export default function AboutPage() {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Acerca de"
                description="Conoce FlashTests, la herramienta de estudio con IA creada en Málaga, España, para ayudar a estudiantes a preparar exámenes y oposiciones."
                path="/acerca-de"
            />

            <div className="max-w-3xl mx-auto py-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">Acerca de FlashTests</h1>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                        FlashTests nace de una idea simple: <strong>estudiar no debería ser tan aburrido</strong>. Como estudiantes, pasamos horas subrayando apuntes y releyendo lo mismo, cuando lo que realmente funciona es practicar con tests.
                    </p>

                    <p className="text-slate-600 dark:text-slate-400">
                        Creamos FlashTests para resolver un problema real: <strong>crear tests lleva mucho tiempo</strong>. Con la inteligencia artificial, puedes convertir cualquier apunte en un test de autoevaluación en segundos. Así dedicas tu tiempo a lo que importa: aprender.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-10">Nuestra misión</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Democratizar el acceso a herramientas de estudio efectivas. No todo el mundo puede permitirse un preparador particular o academias de oposiciones. FlashTests pone la tecnología al servicio del aprendizaje, con un plan gratuito que nunca caduca.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-100 mt-10">Dónde estamos</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        FlashTests se desarrolla en <strong>Málaga, España</strong>. Estamos comprometidos con el mercado hispanohablante, tanto en España como en Latinoamérica.
                    </p>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-10">Tecnología</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Utilizamos modelos de lenguaje avanzados (Google Gemini) para generar preguntas contextualmente relevantes. Los datos se almacenan de forma segura en Firebase (Google Cloud), cumpliendo con el RGPD europeo.
                    </p>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/setup')}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 text-lg inline-flex items-center gap-2"
                    >
                        Probar FlashTests <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
}
