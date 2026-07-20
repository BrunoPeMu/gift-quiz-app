import React from 'react';
import { Navbar } from './Navbar';
import Footer from './Footer';
import { AdBanner } from './AdBanner';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const { userProfile } = useAuth();
    const showAds = userProfile?.tier === 'free' || userProfile?.tier === 'guest';

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden text-slate-100">
            {/* Ambient Glow (Aurora Effects) */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/15 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/15 blur-[140px] rounded-full mix-blend-screen"></div>
                <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-amber-500/10 blur-[100px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="relative z-10 flex flex-col flex-grow w-full">
                <Navbar />
                {showAds && <AdBanner />}
                <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
