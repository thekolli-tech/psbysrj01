import React, { useEffect } from 'react';
import { LEGAL_LAST_UPDATED, legalParts, type LegalDocument } from '../../shared/legal';
import { BrandLogo } from './BrandLogo';

function Parts({ text }: { text: string }) {
  return (
    <>
      {legalParts(text).map((part, index) => {
        if (part.type === 'link') {
          return <a key={index} href={part.href} className="text-amber-700 font-semibold underline underline-offset-2">{part.label}</a>;
        }
        if (part.type === 'placeholder') {
          return <span key={index} className="mx-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-amber-950 ring-1 ring-amber-200">{part.value}</span>;
        }
        return <React.Fragment key={index}>{part.value}</React.Fragment>;
      })}
    </>
  );
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `${document.title} · Property Studio`;
    return () => {
      window.document.title = previous;
    };
  }, [document.title]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="/" aria-label="Property Studio home"><BrandLogo variant="compact" size="sm" /></a>
          <nav className="flex gap-4 text-sm font-semibold">
            <a href="/privacy-policy" className="text-slate-700 hover:text-amber-700">Privacy Policy</a>
            <a href="/terms-and-conditions" className="text-slate-700 hover:text-amber-700">Terms & Conditions</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Draft for operator and legal review</p>
        <h1 className="mt-2 font-display text-3xl font-black text-slate-950 sm:text-4xl">{document.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {LEGAL_LAST_UPDATED}</p>
        <nav aria-label="On this page" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {document.sections.map(section => (
              <li key={section.id}><a href={`#${section.id}`} className="text-amber-800 hover:underline">{section.heading}</a></li>
            ))}
          </ol>
        </nav>
        {document.sections.map(section => (
          <section key={section.id} id={section.id} className="scroll-mt-6">
            <h2 className="mt-8 text-xl font-bold text-slate-950">{section.heading}</h2>
            {section.blocks.map((block, index) => (
              <p key={index} className="mt-3 text-sm leading-7 text-slate-700 sm:text-base"><Parts text={block.text} /></p>
            ))}
          </section>
        ))}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-6 text-sm sm:px-6">
          <a href="/privacy-policy" className="font-semibold text-amber-700">Privacy Policy</a>
          <a href="/terms-and-conditions" className="font-semibold text-amber-700">Terms & Conditions</a>
          <a href="mailto:info@propertystudio.org" className="font-mono text-slate-600">info@propertystudio.org</a>
        </div>
      </footer>
    </div>
  );
}
