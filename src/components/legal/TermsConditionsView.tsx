import React from 'react';
import { FileText, ArrowLeft, ShieldAlert, CheckCircle, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TermsConditionsView: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => {
            setActiveView('HOME');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Overview</span>
        </button>
      </div>

      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-bold">
          <Scale className="w-3.5 h-3.5" />
          <span>Property Studio Platform Terms</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">
          Terms & Conditions
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Last revised: October 2026 · Governing all access to propertystudio.org and integrated PropTech services
        </p>
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
          <strong>Notice:</strong> These terms govern the current operational functionality of Property Studio. This document is a draft prepared for platform review and requires formal legal and owner review before final commercial publication.
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
            Acceptance of Terms & Eligibility
          </h2>
          <p>
            By accessing, browsing, registering an account, or interacting with Property Studio (the "Platform"), you agree to be bound by these Terms & Conditions. You must be at least 18 years of age and capable of entering into legally binding contracts under applicable Indian law to register or transact on Property Studio.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
            Account Registration & Security
          </h2>
          <p>
            Users registering as Property Seekers, Landowners, Channel Partners, Resellers, RERA Agents, or Media professionals agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Provide accurate, genuine, and current registration details.</li>
            <li>Verify their email address and, where required for Property Seekers, their valid Indian mobile phone number via One-Time Passwords (OTP).</li>
            <li>Maintain the confidentiality of their credentials and session access. Privileged roles (such as Super Admin and Developer) cannot be self-registered and are restricted to authorized personnel.</li>
            <li>Promptly notify the platform secretariat at <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">info@propertystudio.org</code> if any unauthorized use of their account is suspected.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
            Property Information & Due Diligence Disclaimer
          </h2>
          <p>
            Property Studio operates as an integrated real estate discovery, media network, and community platform. While we encourage verified documentation, regulatory awareness, and engineering layout audits:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Not Legal or Investment Advice:</strong> Content, video commentary, podcasts, market indices, and property listings published on Property Studio do not constitute legal, architectural, or financial investment advice.</li>
            <li><strong>Independent Verification Required:</strong> Prospective buyers, investors, and stakeholders are strictly advised to independently verify all statutory RERA registrations, HMDA/GHMC municipal building sanctions, revenue department title deeds, encumbrance certificates, and physical construction milestones prior to committing financial deposits.</li>
            <li><strong>Listing Responsibility:</strong> Property owners, channel partners, and developers submitting listings or project claims remain solely responsible for the accuracy and veracity of the information provided.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">4</span>
            Community Standards & Moderation Policy
          </h2>
          <p>
            The Community Q&A forum and Review & Rating system are member-only spaces dedicated to constructive, civil discourse:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Authentication Gate:</strong> You must be signed in to view, create, reply to, vote upon, or follow community discussions.</li>
            <li><strong>Moderation Review:</strong> To protect users from defamation, spam, and unverified commercial promotions, all user questions, comments, and project reviews are submitted to an administrative moderation queue and will only appear publicly once approved by platform moderators.</li>
            <li><strong>Prohibited Content:</strong> Harassment, hate speech, abusive language, deceptive listings, unverified rumors, and unauthorized commercial spam are strictly prohibited and will result in immediate content removal and potential account suspension.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">5</span>
            Intellectual Property & Content Ownership
          </h2>
          <p>
            All platform branding, visual design, custom layouts, logos, software code, broadcast productions, and proprietary metrics are the intellectual property of Property Studio. Users retain ownership of their original submitted questions and reviews, granting Property Studio a non-exclusive, royalty-free, worldwide license to display and moderate such content across the platform.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">6</span>
            Limitation of Liability & Jurisdiction
          </h2>
          <p>
            Property Studio, its founder, officers, and technical team shall not be liable for any indirect, incidental, consequential, or punitive damages arising from the use of or inability to use the platform, errors in property data, or transaction disputes between buyers, sellers, and intermediaries. These terms are governed by the laws of India, and any disputes shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">7</span>
            Contact & Grievance Redressal
          </h2>
          <p>
            For questions concerning these Terms & Conditions or to report a violation, please contact our secretariat:
          </p>
          <div className="p-4 bg-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 block">Property Studio Secretariat</span>
              <span className="text-slate-600 font-mono">info@propertystudio.org</span>
              <span className="text-slate-500 block mt-0.5">Financial District, Hyderabad, Telangana, India</span>
            </div>
            <a
              href="mailto:info@propertystudio.org"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shrink-0"
            >
              Contact Secretariat
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
