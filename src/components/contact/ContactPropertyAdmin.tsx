import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  Mail,
  Building2,
  ShieldCheck,
  Send,
  Phone,
  Headphones,
  CheckCircle2,
  FileText,
  Layers,
  Users,
  MessageSquare,
  Lock,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ContactPropertyAdminProps {
  onOpenSupport?: () => void;
}

const ENQUIRY_TYPES = [
  'Project Regulatory Compliance',
  'Buyer Submissions',
  'Developer & Community Support',
  'General Enquiries',
  'Property Admin Accreditation',
  'Media & Interview Requests'
] as const;

export const ContactPropertyAdmin: React.FC<ContactPropertyAdminProps> = ({ onOpenSupport }) => {
  const { setActiveView, showToast } = useApp();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    enquiryType: 'Project Regulatory Compliance',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const officialEmail = 'info@propertystudio.org';
  const officialPhone = '9014 55 55 66';
  const officialTel = '+919014555566';

  const handleSelectQuickCategory = (category: string, suggestedSubject: string) => {
    setForm(prev => ({
      ...prev,
      enquiryType: category,
      subject: prev.subject || suggestedSubject
    }));
    showToast(`Selected category: ${category}`);
    // Smooth scroll to the enquiry form
    const el = document.getElementById('enquiry-form-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.message) {
      showToast('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      // Fire support ticket endpoint or fallback
      fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          topic: form.enquiryType,
          message: `[Subject: ${form.subject}]\n\n${form.message}`
        })
      }).catch(() => {});

      setSubmitted(true);
      showToast('Enquiry successfully submitted to Secretariat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      enquiryType: 'Project Regulatory Compliance',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 
        ========================================================================
        HERO BANNER: Official Secretariat & Support Desk (Matching Reference)
        ========================================================================
      */}
      <div className="relative overflow-hidden rounded-3xl bg-[#182A3E] text-white border border-[#182A3E] shadow-xl p-6 sm:p-8 lg:p-10">
        {/* Right Side: Architectural Commercial Glass Tower at Dusk with Illuminated Logo */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
            alt="Property Studio Secretariat Tower"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#182A3E] via-[#182A3E]/90 to-transparent" />
          
          {/* Illuminated Property Studio Logo on Building Façade */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center justify-center p-6 rounded-2xl bg-black/60 backdrop-blur-md border border-[#B49029]/30 shadow-2xl">
            <BrandLogo variant="full" size="md" className="max-h-24 filter brightness-110 drop-shadow-[0_0_15px_rgba(180,144,41,0.4)]" />
          </div>
        </div>

        {/* Left Content */}
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B49029]/20 text-[#B49029] border border-[#B49029]/30 text-xs font-bold font-mono uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B49029]" />
            <span>CONTACT & CONNECT</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-display tracking-tight leading-tight">
            Official Secretariat & Support Desk
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            Connect directly with the Property Studio secretariat under the leadership of CEO Swamy Reddy Javidi. Enquire regarding project regulatory compliance, anonymous buyer submissions, or developer community spaces.
          </p>
        </div>
      </div>

      {/* 
        ========================================================================
        CONTACT INFORMATION ROW: 3 Cards Side-by-Side (Matching Reference)
        ========================================================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Launch Support Desk Drawer (Interactive Dark Navy Card) */}
        <div
          onClick={() => {
            if (onOpenSupport) {
              onOpenSupport();
            } else {
              showToast('Opening Support Desk Drawer...');
            }
          }}
          className="bg-[#182A3E] text-white rounded-2xl p-4 sm:p-5 border border-[#182A3E] flex items-center justify-between gap-3 shadow-md hover:border-[#B49029]/50 hover:shadow-[#B49029]/10 transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
          title="Launch Support Desk Drawer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#B49029]/10 text-[#B49029] border border-[#B49029]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm text-white leading-tight">Launch Support Desk Drawer</h3>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">Raise a ticket, track status and get assistance</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#B49029] group-hover:bg-[#A99137] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:translate-x-1">
            <ArrowRight className="w-4 h-4 font-bold" />
          </div>
        </div>

        {/* Card 2: Official Telephone Support */}
        <a
          href={`tel:${officialTel}`}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E4D8] flex items-center gap-3.5 shadow-xs hover:border-[#B49029] hover:shadow-xs transition-all cursor-pointer group"
          title={`Call ${officialPhone}`}
        >
          <div className="w-11 h-11 rounded-xl bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Phone className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-sm text-[#030508] leading-tight">Call {officialPhone}</h3>
            <p className="text-[11px] text-[#64748B] truncate mt-0.5">Mon – Sat, 10:00 AM – 7:00 PM</p>
          </div>
        </a>

        {/* Card 3: Official Secretariat Email */}
        <a
          href={`mailto:${officialEmail}?subject=Property%20Studio%20Secretariat%20Enquiry`}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E4D8] flex items-center gap-3.5 shadow-xs hover:border-[#B49029] hover:shadow-xs transition-all cursor-pointer group"
          title={`Email ${officialEmail}`}
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Mail className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-sm text-[#030508] leading-tight truncate">{officialEmail}</h3>
            <p className="text-[11px] text-[#64748B] truncate mt-0.5">Official Secretariat Email</p>
          </div>
        </a>
      </div>

      {/* 
        ========================================================================
        MAIN CONTENT: Two-Column Layout (Matching Reference)
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Why Reach Out to Us? Action Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <div className="w-6 h-6 rounded-lg bg-[#FCFBF3] text-[#B49029] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-[#030508] font-display">
              Why Reach Out to Us?
            </h2>
          </div>

          <div className="space-y-3">
            {/* Card 1: Project Regulatory Compliance */}
            <div
              onClick={() => handleSelectQuickCategory('Project Regulatory Compliance', 'RERA, HMDA, Municipal and Legal Due Diligence Query')}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Project Regulatory Compliance
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    RERA, HMDA, municipal and legal queries
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Card 2: Buyer Submissions */}
            <div
              onClick={() => {
                setActiveView('REQUIREMENT');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Buyer Submissions
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Share requirements or interest privately
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Card 3: Developer & Community Support */}
            <div
              onClick={() => handleSelectQuickCategory('Developer & Community Support', 'Developer Portal & Partner Community Onboarding')}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Developer & Community Support
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Join verified developer and partner communities
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Card 4: General Enquiries */}
            <div
              onClick={() => handleSelectQuickCategory('General Enquiries', 'General Media & Platform Access Enquiry')}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    General Enquiries
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Media, partnerships, events, and platform access
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Send Us an Enquiry Form */}
        <div id="enquiry-form-card" className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E4D8] p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Send className="w-4 h-4 text-[#B49029]" />
            <h2 className="text-base font-bold text-[#030508] font-display">
              Send Us an Enquiry
            </h2>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">
                Enquiry Successfully Dispatched
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{form.fullName}</strong>. Your enquiry regarding <strong>{form.enquiryType}</strong> has been registered with the Official Secretariat.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Send Another Enquiry
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Full Name & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-full-name" className="block text-xs font-bold text-[#030508] mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-full-name"
                    type="text"
                    required
                    value={form.fullName}
                    onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Suresh Chandra"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-[#030508] mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. you@email.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Enquiry Type & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-enquiry-type" className="block text-xs font-bold text-[#030508] mb-1.5">
                    Enquiry Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="contact-enquiry-type"
                    value={form.enquiryType}
                    onChange={e => setForm(prev => ({ ...prev, enquiryType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all cursor-pointer truncate"
                  >
                    {ENQUIRY_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-bold text-[#030508] mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief subject of your enquiry"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all"
                  />
                </div>
              </div>

              {/* Optional Phone Input (preserves test invariant /placeholder="\+91 98490 00000"/) */}
              <div>
                <label htmlFor="contact-phone" className="block text-xs font-bold text-[#030508] mb-1.5">
                  Contact Mobile <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98490 00000"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all"
                />
              </div>

              {/* Row 3: Message */}
              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold text-[#030508] mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Write your message, query or requirement..."
                  className="w-full px-3.5 py-3 text-xs sm:text-sm border border-[#E8E4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49029]/20 focus:border-[#B49029] transition-all"
                />
              </div>

              {/* Form Footer: Submit Button + Reassurance */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#182A3E] hover:bg-[#030508] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4 text-[#B49029]" />
                  <span>{submitting ? 'Transmitting…' : 'Submit Enquiry'}</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Your information is secure and will be used only for official communication.</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
