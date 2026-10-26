import React from 'react';

/**
 * Approved Overview paragraphs have not been supplied.
 * These sections keep the requested headings visible without inventing a biography or company claims.
 */
export const OVERVIEW_COPY_PLACEHOLDER =
  'Awaiting approved client copy. This text is a placeholder and is not a company claim.';

export const OVERVIEW_FOUNDATION_SECTIONS = [
  {
    id: 'about-property-studio',
    title: 'About Property Studio',
    body: OVERVIEW_COPY_PLACEHOLDER
  },
  {
    id: 'about-founder',
    title: 'About the Founder & CEO',
    body: 'Swamy Reddy Javidi is identified on this site as the founder. A biography has not been approved for publication. ' + OVERVIEW_COPY_PLACEHOLDER
  },
  {
    id: 'vision',
    title: 'Vision',
    body: OVERVIEW_COPY_PLACEHOLDER
  },
  {
    id: 'mission',
    title: 'Mission',
    body: OVERVIEW_COPY_PLACEHOLDER
  },
  {
    id: 'core-dna',
    title: 'Core DNA',
    body: OVERVIEW_COPY_PLACEHOLDER
  }
] as const;

export const OverviewFoundation: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-labelledby="overview-foundation-heading">
      <div className="max-w-3xl space-y-2 mb-6">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">
          Overview foundation
        </p>
        <h2 id="overview-foundation-heading" className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
          About Property Studio
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The five sections below are reserved for approved copy. Placeholder text is labeled until the client supplies the paragraphs.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OVERVIEW_FOUNDATION_SECTIONS.map(section => (
          <article
            key={section.id}
            id={section.id}
            className={`bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3 ${
              section.id === 'core-dna' ? 'md:col-span-2' : ''
            }`}
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
              Placeholder — awaiting client approval
            </p>
            <h3 className="text-lg font-bold text-slate-900 font-display">{section.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
