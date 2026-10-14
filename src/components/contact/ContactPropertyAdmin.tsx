import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  Building2,
  ShieldCheck,
  Send,
  Phone,
  MapPin,
  CheckCircle2,
  Copy,
  ExternalLink,
  ArrowLeft,
  FileText
} from 'lucide-react';

export const ContactPropertyAdmin: React.FC = () => {
  const { properties, setActiveView, showToast } = useApp();

  const [form, setForm] = useState({
    fullName: '',
    designation: '',
    organization: '',
    email: '',
    phone: '',
    targetProperty: properties[0]?.title || 'The Crown Residences Neopolis',
    microMarket: 'Neopolis, Kokapet',
    experienceYears: '8+',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const officialEmail = 'info@propertystudio.org';

  const mailtoSubject = encodeURIComponent(`Property Admin Accreditation Application - ${form.fullName || 'New Applicant'}`);
  const mailtoBody = encodeURIComponent(
    `Dear Property Studio Administration,\n\n` +
    `I am submitting my application to become an accredited Property Admin for Property Studio by Swamy Reddy Javidi.\n\n` +
    `Applicant Name: ${form.fullName}\n` +
    `Designation: ${form.designation}\n` +
    `Organization / Developer: ${form.organization}\n` +
    `Email: ${form.email}\n` +
    `Phone: ${form.phone}\n` +
    `Target Project Scope: ${form.targetProperty}\n` +
    `Micro-Market: ${form.microMarket}\n` +
    `PMO / Construction Experience: ${form.experienceYears}\n\n` +
    `Statement of Intent / Project Background:\n${form.message}\n\n` +
    `Please review my credentials for the Scoped PMO Workspace & PropertyAdminAssignment junction assignment.\n\n` +
    `Sincerely,\n${form.fullName}`
  );

  const mailtoLink = `mailto:${officialEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) return;

    setSubmitted(true);
    showToast(`Application recorded. Opening dispatch to ${officialEmail}...`);

    // Trigger mailto client
    setTimeout(() => {
      window.location.href = mailtoLink;
    }, 600);
  };

  const handleCopy = () => {
    const textToCopy = `Property Admin Application:\nName: ${form.fullName}\nEmail: ${form.email}\nPhone: ${form.phone}\nOrg: ${form.organization}\nProject: ${form.targetProperty}\nExperience: ${form.experienceYears}\nStatement: ${form.message}\nDestination: ${officialEmail}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showToast(`Application dossier copied to clipboard for ${officialEmail}`);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => setActiveView('HOME')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            OFFICIAL PMO ACCREDITATION DESK
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            Apply to Become a Property Admin
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Public self-registration for Property Admins is strictly disabled under platform governance. All project management offices (PMOs) and developer site directors must be vetted and officially provisioned by Swamy Reddy Javidi's administration.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Mail className="w-4 h-4" /> Direct Dispatch: {officialEmail}
            </span>
            <span aria-hidden="true">·</span>
            <span>Reviewed within 24 Hours</span>
            <span aria-hidden="true">·</span>
            <span>Scoped PMO Workspace Access</span>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Grid: Form + Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Application Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Property Admin Accreditation Dossier
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Complete the credentials below. Your application will be dispatched directly to{' '}
              <strong className="text-slate-800 font-mono">{officialEmail}</strong>.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Application Initiated Successfully!
                </h3>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto leading-relaxed">
                  Your details have been prepared for dispatch to <strong className="font-mono">{officialEmail}</strong>. If your email client didn't open automatically, use the buttons below.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={mailtoLink}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open Email in Outlook / Gmail</span>
                </a>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100/60 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copied!' : 'Copy Dossier to Clipboard'}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. S. Venkataraman"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Designation / Title *</label>
                  <input
                    type="text"
                    required
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    placeholder="e.g. Project Director / Lead PMO"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Developer / Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={form.organization}
                    onChange={e => setForm({ ...form, organization: e.target.value })}
                    placeholder="e.g. Aparna Infra / My Home Group"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Corporate Work Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="director@developer-infra.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98490 00000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Years of PMO / Civil Experience</label>
                  <select
                    value={form.experienceYears}
                    onChange={e => setForm({ ...form, experienceYears: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="3-5 Years">3 - 5 Years</option>
                    <option value="5-8 Years">5 - 8 Years</option>
                    <option value="8-12 Years">8 - 12 Years</option>
                    <option value="12+ Years (Executive)">12+ Years (Executive)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Project Name *</label>
                  <input
                    type="text"
                    required
                    value={form.targetProperty}
                    onChange={e => setForm({ ...form, targetProperty: e.target.value })}
                    placeholder="e.g. The Crown Residences Neopolis"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Micro-Market Location</label>
                  <input
                    type="text"
                    value={form.microMarket}
                    onChange={e => setForm({ ...form, microMarket: e.target.value })}
                    placeholder="e.g. Neopolis, Kokapet"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project Scope Statement & Accreditation Request *
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Outline your project scope, civil structural milestones, and authorization to manage inventory and post official replies on Property Studio..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Submit Application Directly to info@propertystudio.org</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Accreditation Guidelines & Direct Contact Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Why Property Admin Accreditation is Strict
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Property Admins carry the official voice of verified real estate developments on Property Studio. Once provisioned via <code className="text-indigo-700 font-mono bg-indigo-50 px-1 py-0.5 rounded">PropertyAdminAssignment</code>, administrators receive write privileges for:
            </p>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Publishing real-time unit availability and base pricing per sq.ft.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Logging official concrete cube strength tests and construction milestone logs.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Answering seeker and resident questions with verified "PMO Official" badges.</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-3 text-xs">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-700" />
              <span>Direct Editorial & PMO Secretariat:</span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              For direct communication with Swamy Reddy Javidi's executive bureau:
            </p>
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
              <div className="font-mono font-bold text-slate-900 text-sm">
                info@propertystudio.org
              </div>
              <div className="text-[11px] text-slate-500">
                Subject line: <em>Property Admin Scope Application - [Project Name]</em>
              </div>
            </div>

            <a
              href={mailtoLink}
              className="inline-flex items-center gap-1.5 text-amber-900 font-bold hover:underline pt-1 text-xs"
            >
              <span>Click here to launch your default mail app directly</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
