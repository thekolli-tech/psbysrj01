import React, { useState } from 'react';
import { ChevronDown, Building2, User, Eye, Compass, ShieldCheck, Layers, Tv, MessageSquare, Award, Radio } from 'lucide-react';

export const OVERVIEW_FOUNDATION_SECTIONS = [
  {
    id: 'about-property-studio',
    title: 'About Property Studio',
    subtitle: 'Integrated PropTech Ecosystem & Media Network',
    icon: Building2
  },
  {
    id: 'about-founder',
    title: 'About the Founder & CEO',
    subtitle: 'Swamy Reddy Javidi · 24+ Years Corporate Governance',
    icon: User
  },
  {
    id: 'vision',
    title: 'Vision',
    subtitle: 'Global Benchmark for Trusted Real Estate Discovery',
    icon: Eye
  },
  {
    id: 'mission',
    title: 'Mission',
    subtitle: 'Unifying Search, Media, Community & Regulatory Tracking',
    icon: Compass
  },
  {
    id: 'core-dna',
    title: 'Core DNA',
    subtitle: 'Principles Guiding Every Transaction & Telemetry Stream',
    icon: ShieldCheck
  }
] as const;

export const OverviewFoundation: React.FC = () => {
  // Default to About expanded and the other sections collapsed as requested
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'about-property-studio': true,
    'about-founder': false,
    'vision': false,
    'mission': false,
    'core-dna': false
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-labelledby="overview-foundation-heading">
      <div className="max-w-3xl space-y-2 mb-8">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">
          Executive Overview & Institutional Foundation
        </p>
        <h2 id="overview-foundation-heading" className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
          About Property Studio
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Property Studio is an integrated real estate media network and community PropTech platform combining property discovery, broadcast media, community discussions, market intelligence, and industry participation.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: About Property Studio */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('about-property-studio')}
            aria-expanded={Boolean(expandedSections['about-property-studio'])}
            aria-controls="section-content-about-property-studio"
            id="heading-about-property-studio"
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">About Property Studio</h3>
                <p className="text-xs text-slate-500 mt-0.5">Integrated PropTech Ecosystem & Media Network</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                {expandedSections['about-property-studio'] ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedSections['about-property-studio'] ? 'rotate-180 text-amber-600' : ''
                }`}
              />
            </div>
          </button>

          {expandedSections['about-property-studio'] && (
            <div
              id="section-content-about-property-studio"
              role="region"
              aria-labelledby="heading-about-property-studio"
              className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-5 text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200"
            >
              <p>
                <strong>Property Studio</strong> serves as a unified real estate discovery platform, media network, and community PropTech ecosystem. By converging granular search aggregation, verified market analytics, unedited community discourse, and broadcast visual journalism into a singular digital architecture, Property Studio bridges the gap between buyers, landowners, developers, and certified property professionals.
              </p>

              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-800 mb-3">
                  The Five Pillars of Property Studio
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Pillar 1: MEDIA-CENTRIC */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <Tv className="w-4 h-4 shrink-0" />
                      <span>1. MEDIA-CENTRIC — Broadcast Network & Video Content</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Studio productions, on-site property walkthroughs, corporate podcast debriefs, and real estate visual journalism. Powered by high-definition media production and ground telemetry.
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">Reference Model:</span> YouTube real estate broadcast model.
                      </p>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                        Operational: Live via Media Engine & Studio Broadcast
                      </span>
                    </div>
                  </div>

                  {/* Pillar 2: SEARCH ENGINE */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>2. SEARCH ENGINE — Aggregator Engine & Discovery</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Comprehensive property search and discovery across Residential, Commercial, Farm Land, and Industrial assets with zero duplicate clutter, pricing clarity, cost sheets, and RERA documentation timelines.
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">Reference Models:</span> 99acres, Housing, Magicbricks.
                      </p>
                      <span className="text-[10px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                        Operational Catalog; Automated Cost Sheets on Roadmap
                      </span>
                    </div>
                  </div>

                  {/* Pillar 3: SOCIAL FORUM */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>3. SOCIAL FORUM — Community Hive & Ground Realities</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      An authentic, member-only forum for genuine community discussions about municipal water availability, traffic congestion, corpus funds, maintenance management, and authentic resident experiences.
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">Reference Models:</span> Reddit and Quora.
                      </p>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                        Operational: Authenticated Community Q&A with Moderation
                      </span>
                    </div>
                  </div>

                  {/* Pillar 4: REVIEW / RATING */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <Award className="w-4 h-4 shrink-0" />
                      <span>4. REVIEW / RATING — Performance Index & Ratings</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Transparent, multi-dimensional rating and review framework evaluating builders, developers, channel partners, and individual projects, emphasizing verified buyer and resident experiences.
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">Reference Model:</span> Google Reviews.
                      </p>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                        Operational: Moderated Review Submissions Active
                      </span>
                    </div>
                  </div>

                  {/* Pillar 5: B2B/B2C NETWORK */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2 md:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                      <Radio className="w-4 h-4 shrink-0" />
                      <span>5. B2B/B2C NETWORK — Town Hall Arena & Connections</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      A collaborative digital bridge connecting builders, developers, landowners, buyers, HNIs, NRIs, realtors, channel partners, and other real-estate stakeholders directly with encrypted privacy protection.
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-700">Ecosystem Model:</span> Multi-stakeholder real estate networking.
                      </p>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                        Operational: Role Workspaces, Encrypted Leads & Secretariat Desk
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-50/90 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Notice on Reference Models:</strong> External platform names (YouTube, 99acres, Housing, Magicbricks, Reddit, Quora, Google Reviews) are illustrative examples of user experience paradigms cited by Property Studio to describe its product vision. They do not represent claimed partnerships, commercial relationships, or corporate affiliations.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Founder & CEO */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('about-founder')}
            aria-expanded={Boolean(expandedSections['about-founder'])}
            aria-controls="section-content-about-founder"
            id="heading-about-founder"
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">About the Founder & CEO</h3>
                <p className="text-xs text-slate-500 mt-0.5">Swamy Reddy Javidi · Executive Profile & Leadership</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                {expandedSections['about-founder'] ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedSections['about-founder'] ? 'rotate-180 text-amber-600' : ''
                }`}
              />
            </div>
          </button>

          {expandedSections['about-founder'] && (
            <div
              id="section-content-about-founder"
              role="region"
              aria-labelledby="heading-about-founder"
              className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-4 text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200"
            >
              <p>
                <strong>Swamy Reddy Javidi</strong> is the Chief Executive Officer (CEO) of Property Studio and the Founder of Sadguna Properties. Holding an <strong>MBA in Marketing (Post Graduate)</strong>, he brings over <strong>24 years of deep, multi-industry corporate governance experience</strong> spanning sales distribution, market expansion, scale operations, and real estate strategic consulting.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 font-display">Corporate Track Record & Leadership Background:</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
                  <li><strong>Reliance Jio / Jio Fiber (2014–2023):</strong> Served nearly a decade as JCM / Area Home Lead, steering high-intensity market rollouts and distribution network scaling across key urban corporate clusters in Hyderabad and Warangal.</li>
                  <li><strong>Tata Teleservices / Tata Docomo (2010–2014):</strong> Served as Zonal Manager, directing regional corporate sales, channel frameworks, and telecommunications network expansion.</li>
                  <li><strong>Idea Cellular Ltd. (2008–2010):</strong> Operated as Territory Manager, directing micro-market distribution networks and subscriber acquisition.</li>
                  <li><strong>Hindustan Unilever Ltd. (2004–2008):</strong> Served as Cluster Sales Officer for FMCG distribution, managing high-stakes consumer trade channels.</li>
                  <li><strong>PepsiCo (2002–2004):</strong> Customer Executive, establishing disciplined corporate sales distribution operations in Hyderabad.</li>
                </ul>
              </div>

              <p>
                As founder of <strong>Sadguna Properties</strong>, he directed high-value advisory operations across Hyderabad's premium residential and commercial sectors. Establishing <strong>Property Studio</strong> represents his forward-looking PropTech vision: moving beyond traditional agency boundaries to create a transparent, multi-stakeholder ecosystem with encrypted data masking, broadcast visual intelligence, and rigorous project compliance audits.
              </p>
            </div>
          )}
        </div>

        {/* Section 3: Vision */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('vision')}
            aria-expanded={Boolean(expandedSections['vision'])}
            aria-controls="section-content-vision"
            id="heading-vision"
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Vision</h3>
                <p className="text-xs text-slate-500 mt-0.5">Global Benchmark for Trust & PropTech Discovery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                {expandedSections['vision'] ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedSections['vision'] ? 'rotate-180 text-amber-600' : ''
                }`}
              />
            </div>
          </button>

          {expandedSections['vision'] && (
            <div
              id="section-content-vision"
              role="region"
              aria-labelledby="heading-vision"
              className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-3 text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200"
            >
              <blockquote className="p-4 rounded-2xl bg-amber-50/60 border-l-4 border-amber-500 text-amber-950 font-medium italic text-sm">
                &ldquo;To become the absolute global benchmark of trust, informative clarity, and interactive innovation in real estate discovery by integrating multiple platforms into an intelligent, data-masked, and spam-free global ecosystem.&rdquo;
              </blockquote>
              <p className="text-xs text-slate-600">
                Property Studio envisions transforming the property landscape into a transparent, secure environment where high-intent seekers and certified industry stakeholders interact with total data integrity and absolute operational privacy.
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Mission */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('mission')}
            aria-expanded={Boolean(expandedSections['mission'])}
            aria-controls="section-content-mission"
            id="heading-mission"
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Mission</h3>
                <p className="text-xs text-slate-500 mt-0.5">Unifying Property Search, Visual Media & Compliance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                {expandedSections['mission'] ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedSections['mission'] ? 'rotate-180 text-amber-600' : ''
                }`}
              />
            </div>
          </button>

          {expandedSections['mission'] && (
            <div
              id="section-content-mission"
              role="region"
              aria-labelledby="heading-mission"
              className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-3 text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200"
            >
              <blockquote className="p-4 rounded-2xl bg-slate-50 border-l-4 border-slate-900 text-slate-900 font-medium italic text-sm">
                &ldquo;Unifying property search, broadcast media, unedited forums, and live developer, realtor, and property seeker summits into one seamless architecture—empowering investors with uncompromised compliance tracking, visual ground telemetry, and absolute data privacy.&rdquo;
              </blockquote>
              <p className="text-xs text-slate-600">
                Our mission is realized by eliminating asymmetrical information, holding construction milestones to objective standards, and replacing cold broker spam with cryptographically secure, opt-in lead transactions.
              </p>
            </div>
          )}
        </div>

        {/* Section 5: Core DNA */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('core-dna')}
            aria-expanded={Boolean(expandedSections['core-dna'])}
            aria-controls="section-content-core-dna"
            id="heading-core-dna"
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Core DNA</h3>
                <p className="text-xs text-slate-500 mt-0.5">Foundational Values & Ethical Principles</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                {expandedSections['core-dna'] ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedSections['core-dna'] ? 'rotate-180 text-amber-600' : ''
                }`}
              />
            </div>
          </button>

          {expandedSections['core-dna'] && (
            <div
              id="section-content-core-dna"
              role="region"
              aria-labelledby="heading-core-dna"
              className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200"
            >
              <p className="mb-4">
                The institutional DNA of Property Studio is defined by six non-negotiable operational pillars:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">1. Uncompromising Trust</span>
                  <p className="text-xs text-slate-600">Every project claim is held to objective layout and regulatory verification standards.</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">2. Radical Transparency</span>
                  <p className="text-xs text-slate-600">Democratizing market data and unedited citizen discussions on project performance.</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">3. Absolute Privacy</span>
                  <p className="text-xs text-slate-600">Encrypted data masking strips phone numbers and personal metrics from unwanted broker databases.</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">4. Data-Driven Decisions</span>
                  <p className="text-xs text-slate-600">Replacing transactional marketing hype with vector blueprint audits, SWOT matrices, and true cost calculations.</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">5. Mutual Accountability</span>
                  <p className="text-xs text-slate-600">Certified badges for verified professionals and open question channels for developer accountability.</p>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block font-display">6. Stakeholder Collaboration</span>
                  <p className="text-xs text-slate-600">A cooperative PropTech arena uniting buyers, developers, landowners, and agents on equal footing.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
