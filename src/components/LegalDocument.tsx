import type { ReactNode } from 'react';
import { Info, ShieldAlert, Clock3 } from 'lucide-react';
import { LEGAL_LAST_UPDATED, LEGAL_VERSION, ALCANCE, JURISDICCION } from '../config/legal';

export interface LegalSection {
    title: string;
    paragraphs: string[];
    bullets?: string[];
}

interface LegalDocumentProps {
    eyebrow: string;
    title: string;
    lead: string;
    sections: LegalSection[];
    footerNote?: ReactNode;
}

export function LegalDocument({ eyebrow, title, lead, sections, footerNote }: LegalDocumentProps) {
    return (
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
            <div className="rounded-3xl border border-slate-200/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-200/10 bg-slate-950/30">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-indigo-300">
                            <ShieldAlert className="w-4 h-4" />
                            <span>{eyebrow}</span>
                        </div>
                        <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white">{title}</h1>
                        <p className="mt-4 max-w-3xl text-sm sm:text-base text-slate-300">{lead}</p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs text-slate-300">
                            <div className="rounded-2xl border border-slate-200/10 bg-white/5 px-4 py-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock3 className="w-4 h-4" />
                                    <span>Versión</span>
                                </div>
                                <div className="mt-1 font-semibold text-white">v{LEGAL_VERSION}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/10 bg-white/5 px-4 py-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Info className="w-4 h-4" />
                                    <span>Actualizado</span>
                                </div>
                                <div className="mt-1 font-semibold text-white">{LEGAL_LAST_UPDATED}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/10 bg-white/5 px-4 py-3">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Info className="w-4 h-4" />
                                    <span>Ámbito</span>
                                </div>
                                <div className="mt-1 font-semibold text-white">{ALCANCE}</div>
                                <div className="mt-1 text-[11px] text-slate-400">Jurisdicción base: {JURISDICCION}</div>
                            </div>
                        </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                    {sections.map((section) => (
                        <section key={section.title} className="space-y-3">
                            <h2 className="text-xl font-bold text-white">{section.title}</h2>
                            {section.paragraphs.map((paragraph) => (
                                <p key={paragraph} className="text-sm leading-7 text-slate-300">
                                    {paragraph}
                                </p>
                            ))}
                            {section.bullets && section.bullets.length > 0 && (
                                <ul className="space-y-2 pl-5 text-sm leading-7 text-slate-300 list-disc">
                                    {section.bullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}

                    {footerNote && (
                        <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4 text-sm text-slate-200">
                            {footerNote}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
