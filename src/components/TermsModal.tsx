import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Check } from 'lucide-react';

export default function TermsModal() {
    const { userProfile, updateUserProfile } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    
    if (userProfile?.termsAccepted) return null;

    const handleAccept = async () => {
        await updateUserProfile({
            termsAccepted: true,
            termsAcceptedAt: Date.now()
        });
    };

    const handleDecline = () => {
        // Logout user if they decline
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Términos de Uso</h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Para usar FlashTests, debes aceptar nuestros términos y condiciones.
                    </p>
                </div>
                
                <div 
                    className="flex-1 overflow-y-auto p-6 text-sm text-slate-600 dark:text-slate-300 space-y-4"
                    onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                            setScrolled(true);
                        }
                    }}
                >
                    <h3 className="font-bold text-slate-900 dark:text-white">1. Descripción del Servicio</h3>
                    <p>FlashTests es una aplicación web para crear, gestionar y practicar tests de estudio. Permite a los usuarios crear sus propias preguntas, organizarlas por temas y asignaturas, y generar tests personalizados para practicar.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">2. Cuenta de Usuario</h3>
                    <p>Para usar la app necesitas crear una cuenta. Eres responsable de mantener la seguridad de tu cuenta. No compartas tu contraseña con terceros.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">3. Contenido del Usuario</h3>
                    <p>Tú eres el dueño de las preguntas y contenido que creas. Puedes exportar tu contenido en cualquier momento. No nos hacemos responsables de la pérdida de datos por errores de uso.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">4. Uso de la IA</h3>
                    <p>La generación de preguntas con IA consume créditos. Los créditos se recargan mensualmente o pueden obtenerse viendo anuncios. El uso de la IA está sujeto a disponibilidad y límites de la API.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">5. Publicidad y Cookies</h3>
                    <p>La versión gratuita incluye publicidad. Para eliminar anuncios y obtener más créditos, puedes suscribirte a un plan de pago. Al usar la app, aceptas el uso de cookies para publicidad y análisis.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">6. Privacidad</h3>
                    <p>Recogemos datos mínimos necesarios para el funcionamiento: email, nombre, preguntas creadas y progreso de estudio. No vendemos tus datos personales a terceros.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">7. Limitación de Responsabilidad</h3>
                    <p>FlashTests se proporciona "tal cual". No garantizamos que la app esté siempre disponible o que el contenido generado por IA sea 100% preciso. Siempre verifica las respuestas de IA.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">8. Modificaciones</h3>
                    <p>Podemos modificar estos términos en cualquier momento. Los cambios entrarán en vigor al publicarse. Si continúas usando la app, aceptas los términos modificados.</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white mt-4">9. Contacto</h3>
                    <p>Para cualquier duda o problema, contacta a través de los canales de soporte de la app.</p>
                </div>
                
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={handleDecline}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Rechazar (Cerrar sesión)
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={!scrolled}
                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {scrolled ? 'Aceptar y continuar' : 'Desplázate para aceptar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
