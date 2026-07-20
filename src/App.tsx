import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from './components/ErrorBoundary';

if (import.meta.env.PROD) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [
            Sentry.browserTracingIntegration(),
        ],
        tracesSampleRate: 0.2,
    });
}

const HomePage = lazy(() => import('./pages/HomePage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ManageContentPage = lazy(() => import('./pages/ManageContentPage'));
const SharePage = lazy(() => import('./pages/SharePage'));
const ImportTopicPage = lazy(() => import('./pages/ImportTopicPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AvisoLegalPage = lazy(() => import('./pages/legal/AvisoLegalPage'));
const PrivacidadPage = lazy(() => import('./pages/legal/PrivacidadPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const TerminosPage = lazy(() => import('./pages/legal/TerminosPage'));

function PageLoader() {
    return (
        <div className="flex justify-center items-center h-[50vh]">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

const router = createBrowserRouter([
    {
        element: (
            <HelmetProvider>
                <AuthProvider>
                    <ErrorBoundary>
                        <Layout>
                            <Suspense fallback={<PageLoader />}>
                                <Outlet />
                            </Suspense>
                        </Layout>
                    </ErrorBoundary>
                </AuthProvider>
            </HelmetProvider>
        ),
        children: [
            { path: '/', element: <HomePage /> },
            { path: '/preguntas-frecuentes', element: <FaqPage /> },
            { path: '/precios', element: <PricingPage /> },
            { path: '/como-funciona', element: <HowItWorksPage /> },
            { path: '/caracteristicas', element: <FeaturesPage /> },
            { path: '/acerca-de', element: <AboutPage /> },
            { path: '/dashboard', element: <DashboardPage /> },
            { path: '/login', element: <LoginPage /> },
            { path: '/setup', element: <ConfigPage /> },
            { path: '/upload', element: <UploadPage /> },
            { path: '/quiz', element: <QuizPage /> },
            { path: '/results', element: <ResultsPage /> },
            { path: '/manage', element: <ManageContentPage /> },
            { path: '/share/:shareId', element: <SharePage /> },
            { path: '/share-topic/:shareId', element: <ImportTopicPage /> },
            { path: '/admin', element: <AdminDashboardPage /> },
            { path: '/profile', element: <ProfilePage /> },
            { path: '/legal/aviso-legal', element: <AvisoLegalPage /> },
            { path: '/legal/privacidad', element: <PrivacidadPage /> },
            { path: '/legal/cookies', element: <CookiesPage /> },
            { path: '/legal/terminos', element: <TerminosPage /> },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
