import React from 'react';
import { Shield, ArrowLeft, Mail, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PrivacyPolicyView: React.FC = () => {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>Property Studio Legal Dossier</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Last revised: October 2026 · Effective across the Property Studio PropTech ecosystem
        </p>
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
          <strong>Notice:</strong> This policy document reflects the actual verified data architecture and platform safeguards of Property Studio. It is marked as a draft requiring formal owner and legal counsel review prior to commercial publication.
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
            Data Collection & User Profiles
          </h2>
          <p>
            Property Studio collects information strictly necessary to provide real estate discovery, community discourse, and masked marketplace interactions. We collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Account Credentials:</strong> Full name, verified email address, hashed passwords (salted with unique cryptographic tokens), and account role.</li>
            <li><strong>Contact Information:</strong> Valid Indian mobile numbers for Property Seeker verification, canonicalized to E.164 standard.</li>
            <li><strong>Descriptive Profile Fields:</strong> Optional Town/City and Profession fields describing user background; these fields are normalized, sanitized against HTML injection, and strictly do not grant privileged platform access.</li>
            <li><strong>Organization Details:</strong> For channel partners, builders, and developers, company or entity names provided during registration.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
            Authentication & OTP Verification
          </h2>
          <p>
            To prevent fraud, unsolicited broker spam, and unauthorized account creation, Property Studio enforces cryptographic verification:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Email One-Time Passwords (OTP):</strong> Delivered via transactional email providers exclusively using approved domain senders (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">@propertystudio.org</code>). Verification codes are hashed using cryptographic peppers and are strictly single-use with an automatic 10-minute expiry.</li>
            <li><strong>Mobile Phone Verification:</strong> Property Seeker registration requires real mobile verification dispatched via authenticated messaging templates. Verification tokens are consumed atomically inside single database transactions.</li>
            <li><strong>Session Security:</strong> Authenticated sessions are issued as secure <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">HttpOnly</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">SameSite=Lax</code> cookies preventing client-side script token interception.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
            Data Masking & Property Requirements
          </h2>
          <p>
            Property Studio operates an encrypted data-masking architecture to insulate property seekers from unwanted telemarketing and unsolicited contact:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Property requirements submitted by seekers (budget, location, property type) are anonymized on public channels.</li>
            <li>Lead contacts remain masked until an explicit, authenticated, and authorized transaction is settled through the platform.</li>
            <li>Unconfigured or rejected payment integrations fail-closed and never reveal buyer phone numbers or identities.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">4</span>
            Community Discussions, Reviews & Moderation
          </h2>
          <p>
            Community Q&A and project reviews are member-governed spaces:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Access to Community Q&A discussions, questions, and replies is strictly restricted to authenticated platform members.</li>
            <li>All newly created or edited questions and project reviews enter a moderation queue with pending status until approved by platform administration.</li>
            <li>Private telephone numbers, city information, and personal identifiers are stripped from community event streams and shared URLs.</li>
            <li>Public discussion share URLs contain solely the alphanumeric discussion identifier without personal user parameters.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">5</span>
            Technical Infrastructure & Third-Party Processors
          </h2>
          <p>
            Property Studio partners with reputable infrastructure providers to operate its service:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Database Storage:</strong> Neon Managed PostgreSQL with SSL encryption in transit and connection pooling.</li>
            <li><strong>Email Infrastructure:</strong> Resend API for transactional verification and security notices.</li>
            <li><strong>Messaging Infrastructure:</strong> Meta WhatsApp Cloud API for mobile verification templates.</li>
            <li><strong>Hosting:</strong> Vercel serverless edge deployment with secure environment isolation.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center">6</span>
            User Rights & Secretariat Contact
          </h2>
          <p>
            Users have the right to access, update, and correct their personal profile information through the Profile Control Panel. For account inquiries, grievance redressal, or data privacy requests, contact our secretariat:
          </p>
          <div className="p-4 bg-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 block">Official Secretariat & Grievance Officer</span>
              <span className="text-slate-600 font-mono">info@propertystudio.org</span>
              <span className="text-slate-500 block mt-0.5">Financial District, Western Corridor, Hyderabad</span>
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
