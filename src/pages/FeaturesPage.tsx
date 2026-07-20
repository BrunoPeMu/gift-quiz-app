import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, BarChart3, Zap, FileText, Share2, ArrowRight } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

const features = [
    { icon: Brain, title: 'Generación con IA', description: 'Crea tests automáticamente a partir de tus apuntes. La IA analiza el contenido y genera preguntas relevantes de opción múltiple, verdadero/falso, respuesta corta y más.' },
    { icon: BookOpen, title: 'Importación de texto y PDF', description: 'Pega directamente el texto de tus apuntes o sube un archivo PDF. FlashTests extrae el contenido y genera preguntas al instante.' },
    { icon: BarChart3, title: 'Estadísticas de progreso', description: 'Seguimiento detallado por asignatura y tema. Visualiza tu tasa de aciertos, identifica puntos débiles y mide tu mejora a lo largo del tiempo.' },
    { icon: Zap, title: 'Dificultad configurable', description: 'Elige entre fácil, medio o difícil. El sistema selecciona preguntas adecuadas a tu nivel y se adapta a tu rendimiento.' },
    { icon: FileText, title: 'Formato GIFT compatible', description: 'Exporta tus preguntas en formato GIFT estándar, compatible con Moodle y otros sistemas de gestión de aprendizaje (LMS).' },
    { icon: Share2, title: 'Tests compartibles', description: 'Genera un enlace único para compartir cualquier test. Otros usuarios pueden realizarlo sin necesidad de cuenta.' },
];

export default function FeaturesPage() {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Características"
                description="Descubre todas las funciones de FlashTests: generación con IA, importación de PDF, estadísticas, formato GIFT, tests compartibles y más."
                path="/caracteristicas"
            />

            <div className="max-w-5xl mx-auto py-8">
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Todo lo que necesitas para estudiar</h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Herramientas diseñadas para estudiantes que quieren optimizar su tiempo de estudio.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div key={f.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
                                    <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center mt-12">
                    <button
                        onClick={() => navigate('/setup')}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 text-lg inline-flex items-center gap-2"
                    >
                        Probar gratis <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    );
}
