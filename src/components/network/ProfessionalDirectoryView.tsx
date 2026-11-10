import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Building2,
  Briefcase,
  ShieldCheck,
  MapPin,
  Star,
  ExternalLink,
  MessageSquare,
  Phone,
  Search,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../../shared/avatar';
import { COMPANY_CONTACT_DISPLAY, COMPANY_CONTACT_TEL, COMPANY_SUPPORT_WHATSAPP } from '../../shared/companyContact';

export type ProfessionalTab = 'ALL' | 'DEVELOPERS' | 'CHANNEL_PARTNERS' | 'RERA' | 'ADVISORS';

interface ProfessionalEntity {
  id: string;
  name: string;
  category: 'DEVELOPERS' | 'CHANNEL_PARTNERS' | 'RERA' | 'ADVISORS';
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  role: string;
  organization: string;
  location: string;
  experience: string;
  description: string;
  notableProjects: string[];
  avatar: string;
  rating: number;
  reviewCount: number;
}

const DIRECTORY_ENTITIES: ProfessionalEntity[] = [
  {
    id: 'prof-secretariat-ceo',
    name: 'Swamy Reddy Javidi',
    category: 'ADVISORS',
    categoryLabel: 'Secretariat & Advisory',
    badge: 'Secretariat Executive',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    role: 'CEO & Principal Real Estate Advisor',
    organization: 'Property Studio Secretariat',
    location: 'Secretariat, Hyderabad',
    experience: '18+ Years Experience',
    description: 'Executive oversight on high-density urban planning, regulatory compliance, and institutional due diligence across Kokapet, Neopolis, and the Financial District.',
    notableProjects: ['Executive Market Keynotes', 'Institutional Buyer Advisory', 'Regulatory Audits'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 4.9,
    reviewCount: 42
  },
  {
    id: 'dev-aparna',
    name: 'Aparna Constructions & Estates',
    category: 'DEVELOPERS',
    categoryLabel: 'Master Developer',
    badge: 'Master Builder',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    role: 'Integrated Township & High-Rise Developer',
    organization: 'Aparna Constructions',
    location: 'Financial District & Nallagandla, Hyderabad',
    experience: '28+ Years Experience',
    description: 'One of South India\'s largest gated community developers with 70+ completed projects, known for timely delivery, in-house backward integration, and quality.',
    notableProjects: ['Aparna Zenon (Financial District)', 'Aparna Sarovar Zenith', 'Aparna Luxor Park'],
    avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    rating: 4.8,
    reviewCount: 128
  },
  {
    id: 'dev-myhome',
    name: 'My Home Group',
    category: 'DEVELOPERS',
    categoryLabel: 'Master Developer',
    badge: 'Iconic Infra Developer',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    role: 'Mega Township & Commercial Hub Developer',
    organization: 'My Home Real Estate Consortium',
    location: 'HITEC City & Kokapet, Hyderabad',
    experience: '35+ Years Experience',
    description: 'Pioneered landmark IT parks and luxury residential projects in West Hyderabad with over 30 million sq.ft of delivered real estate footprint.',
    notableProjects: ['My Home Bhooja (HITEC City)', 'My Home Sayuk (Tellapur)', 'My Home Tarkshya'],
    avatar: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80',
    rating: 4.9,
    reviewCount: 156
  },
  {
    id: 'dev-rajapushpa',
    name: 'Rajapushpa Properties',
    category: 'DEVELOPERS',
    categoryLabel: 'Premium High-Rise',
    badge: 'High-Rise Specialist',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    role: 'Luxury High-Rise & Grade-A Commercial Builder',
    organization: 'Rajapushpa Properties Pvt Ltd',
    location: 'Narsingi & Financial District, Hyderabad',
    experience: '16+ Years Experience',
    description: 'Specialists in high-density residential towers and Grade-A commercial office space along the Outer Ring Road and Financial District corridors.',
    notableProjects: ['Rajapushpa Provincia (Narsingi)', 'Rajapushpa Imperia', 'Rajapushpa Summit'],
    avatar: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=200&q=80',
    rating: 4.7,
    reviewCount: 89
  },
  {
    id: 'dev-sas',
    name: 'SAS Infra / SAS Crown',
    category: 'DEVELOPERS',
    categoryLabel: 'Ultra-Luxury High-Rise',
    badge: 'Golden Mile Developer',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    role: 'Architectural Benchmark & Sky Villa Developer',
    organization: 'SAS Infra Group',
    location: 'Kokapet Golden Mile, Hyderabad',
    experience: '12+ Years Experience',
    description: 'Developing high-rise architectural landmarks in the Golden Mile corridor, Kokapet, including one of India\'s tallest residential towers.',
    notableProjects: ['SAS Crown (Kokapet Golden Mile)', 'SAS Diamond Towers', 'SAS iTower'],
    avatar: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=200&q=80',
    rating: 4.8,
    reviewCount: 64
  },
  {
    id: 'dev-jayabheri',
    name: 'Jayabheri Properties',
    category: 'DEVELOPERS',
    categoryLabel: 'Integrated Community',
    badge: 'Benchmark Quality',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    role: 'Integrated Township & High-Rise Developer',
    organization: 'Jayabheri Group',
    location: 'Financial District & Gachibowli, Hyderabad',
    experience: '25+ Years Experience',
    description: 'Founded with an emphasis on architectural aesthetics, green open spaces, and premium community master-planning.',
    notableProjects: ['Jayabheri The Peak (Financial District)', 'Jayabheri Silicon County'],
    avatar: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80',
    rating: 4.7,
    reviewCount: 71
  },
  {
    id: 'rera-legal-consortium',
    name: 'RERA Legal & Compliance Directorate',
    category: 'RERA',
    categoryLabel: 'RERA Compliance & Title Law',
    badge: 'RERA Verified Legal',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    role: 'Due Diligence & Title Verification Advisors',
    organization: 'Property Studio Legal Directorate',
    location: 'Banjara Hills & Secretariat, Hyderabad',
    experience: '20+ Years Practice',
    description: 'Independent legal counsel providing comprehensive 30-year title verification, Telangana RERA registration validation, and master-plan zoning checks.',
    notableProjects: ['30-Year Title Search', 'RERA Project Audit', 'Master Plan Zoning Certificates'],
    avatar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=200&q=80',
    rating: 5.0,
    reviewCount: 94
  },
  {
    id: 'partner-premier-consortium',
    name: 'Premier Channel Partners Network',
    category: 'CHANNEL_PARTNERS',
    categoryLabel: 'Institutional Channel Partner',
    badge: 'Certified CP Network',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    role: 'Authorized Developer Representative & Portfolio Advisory',
    organization: 'Hyderabad Certified Channel Partner Syndicate',
    location: 'Kokapet & Financial District, Hyderabad',
    experience: '15+ Years Practice',
    description: 'Network of certified, RERA-registered channel partners specializing in early-stage pre-launch allocations, bulk investor pricing, and transparent mandates.',
    notableProjects: ['Kokapet Sky Villas', 'Financial District Grade-A Pre-Leased', 'Neopolis Corridors'],
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    rating: 4.8,
    reviewCount: 83
  }
];

export const ProfessionalDirectoryView: React.FC<{
  initialTab?: ProfessionalTab;
  onOpenSupport?: () => void;
}> = ({ initialTab = 'ALL', onOpenSupport }) => {
  const { activeNav, showToast } = useApp();
  const [selectedTab, setSelectedTab] = useState<ProfessionalTab>(() => {
    if (initialTab !== 'ALL') return initialTab;
    if (activeNav === 'DEVELOPERS') return 'DEVELOPERS';
    if (activeNav === 'CHANNEL_PARTNERS') return 'CHANNEL_PARTNERS';
    if (activeNav === 'RERA_PROFESSIONALS') return 'RERA';
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntities = DIRECTORY_ENTITIES.filter(entity => {
    const matchesTab = selectedTab === 'ALL' || entity.category === selectedTab;
    const matchesSearch =
      !searchQuery.trim() ||
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.notableProjects.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Directory Hero Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#B49029] text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Directory & Ecosystem</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Real Estate Professional Network
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Connect with verified master builders, Telangana RERA legal consultants, and accredited channel partners across West Hyderabad.
            </p>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by builder, project, or location..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100">
          {[
            { key: 'ALL' as const, label: 'All Directory' },
            { key: 'DEVELOPERS' as const, label: 'Developers & Builders' },
            { key: 'CHANNEL_PARTNERS' as const, label: 'Channel Partners' },
            { key: 'RERA' as const, label: 'RERA Compliance & Law' },
            { key: 'ADVISORS' as const, label: 'Secretariat & Advisory' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedTab === tab.key
                  ? 'bg-[#182A3E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntities.map(entity => (
          <div
            key={entity.id}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={entity.avatar}
                    alt={entity.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{entity.name}</h3>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{entity.role}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${entity.badgeColor}`}>
                  {entity.badge}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {entity.description}
              </p>

              {/* Notable Projects & Corridors */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Key Projects & Focus Areas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {entity.notableProjects.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{entity.location}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSupport) onOpenSupport();
                    else showToast(`Enquiry logged for ${entity.name}. Connecting with Secretariat...`);
                  }}
                  className="px-3 py-1.5 bg-[#182A3E] hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enquire</span>
                </button>

                <a
                  href={`https://wa.me/${COMPANY_SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Enquiry regarding verified listing: ${entity.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                  title="WhatsApp Enquiry"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
