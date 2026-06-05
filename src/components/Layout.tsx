import React from 'react';
import { Navbar } from './Navbar';
import { AdBanner } from './AdBanner';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
                {children}
            </main>
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
                <AdBanner />
            </div>
        </div>
    );
}
