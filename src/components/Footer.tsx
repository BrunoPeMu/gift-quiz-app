import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LEGAL_VERSION, LEGAL_LAST_UPDATED, TITULAR, APP_NAME, LEGAL_URLS, LEGAL_CONTACT_URL } from '../config/legal';

export default function Footer() {
    const { userProfile } = useAuth();

    if (!userProfile) return null;

    const contactHref = TITULAR.emailContacto.includes('@') && !TITULAR.emailContacto.startsWith('[')
        ? `mailto:${TITULAR.emailContacto}`
        : LEGAL_CONTACT_URL;

    return (
        <footer className="mt-auto border-t border-slate-200/10 bg-slate-900/30 backdrop-blur-sm">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span>&copy; {new Date().getFullYear()} {APP_NAME}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">Versión legal v{LEGAL_VERSION} ({LEGAL_LAST_UPDATED})</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to={LEGAL_URLS.notice} className="hover:text-indigo-400 transition-colors">Aviso Legal</Link>
                        <Link to={LEGAL_URLS.privacy} className="hover:text-indigo-400 transition-colors">Privacidad</Link>
                        <Link to={LEGAL_URLS.cookies} className="hover:text-indigo-400 transition-colors">Cookies</Link>
                        <Link to={LEGAL_URLS.terms} className="hover:text-indigo-400 transition-colors">Términos</Link>
                        <a href={contactHref} className="hover:text-indigo-400 transition-colors">
                            Contacto
                        </a>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-600 text-center sm:text-left">
                    Versión legal provisional sujeta a validación jurídica y fiscal.
                    Aplicamos el RGPD europeo (UE 2016/679) como estándar mínimo de privacidad.
                    Para usuarios de Latinoamérica: la legislación aplicable es la de tu país de residencia,
                    aplicamos voluntariamente el RGPD como garantía equivalente o superior.
                </div>
            </div>
        </footer>
    );
}
