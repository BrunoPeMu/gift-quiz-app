import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';

const plans = [
    {
        name: 'Free',
        price: '0€',
        period: '/siempre',
        description: 'Para empezar a practicar',
        features: ['Tests manuales ilimitados', '3 generaciones IA/día', 'Estadísticas básicas', 'Exportar en formato GIFT'],
        cta: 'Empezar gratis',
        popular: false,
    },
    {
        name: 'Basic',
        price: '4,99€',
        period: '/mes',
        description: 'Para estudiar en serio',
        features: ['Todo lo del plan Free', '30 generaciones IA/mes', 'Sin publicidad', 'Rollover de créditos', 'Soporte prioritario'],
        cta: 'Suscribirse',
        popular: true,
    },
    {
        name: 'Pro',
        price: '9,98€',
        period: '/mes',
        description: 'Para opositores y profes',
        features: ['Todo lo del plan Basic', '50 generaciones IA/día', 'Importar PDF', 'Contexto ampliado (100k chars)', 'Exportar resultados'],
        cta: 'Suscribirse',
        popular: false,
    },
];

export default function PricingPage() {
    const navigate = useNavigate();

    return (
        <>
            <SeoHead
                title="Precios"
                description="Planes de FlashTests desde 0€. Elige el plan que mejor se adapte a tu forma de estudiar: Free, Basic o Pro."
                path="/precios"
            />

            <div className="max-w-5xl mx-auto py-8">
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Planes para cada necesidad</h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Empieza gratis y escala cuando lo necesites. Todos los planes incluyen acceso a la app completa.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.name} className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border ${plan.popular ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700'} relative`}>
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Popular
                                </div>
                            )}
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">{plan.name}</h3>
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">{plan.price}<span className="text-sm font-normal text-slate-500">{plan.period}</span></p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{plan.description}</p>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => navigate('/login')}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white'}`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "FlashTests",
                        "applicationCategory": "EducationalApplication",
                        "offers": [
                            { "@type": "Offer", "name": "Plan Free", "price": "0", "priceCurrency": "EUR" },
                            { "@type": "Offer", "name": "Plan Basic", "price": "4.99", "priceCurrency": "EUR", "billingIncrement": "P1M" },
                            { "@type": "Offer", "name": "Plan Pro", "price": "9.98", "priceCurrency": "EUR", "billingIncrement": "P1M" }
                        ]
                    })}
                </script>
            </div>
        </>
    );
}
