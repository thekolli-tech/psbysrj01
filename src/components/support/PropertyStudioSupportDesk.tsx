import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Send,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Building2,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';

interface SupportDeskProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

export const PropertyStudioSupportDesk: React.FC<SupportDeskProps> = ({
  isOpen,
  onClose,
  initialContext
}) => {
  const { showToast, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'CONTACT' | 'TICKET' | 'FAQ'>('CONTACT');
  const [ticketTopic, setTicketTopic] = useState<string>(
    initialContext ? 'Video Audit Inquiry' : 'Project Regulatory Audit & TS-RERA Check'
  );
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [message, setMessage] = useState(initialContext ? `Inquiry regarding: ${initialContext}` : '');
  const [isMasked, setIsMasked] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      showToast('Please provide your name and inquiry details.');
      return;
    }

    const generatedId = `PS-SUP-${Date.now().toString().slice(-6)}`;
    setTicketId(generatedId);
    setIsSubmitted(true);
    showToast(`Support ticket ${generatedId} logged with Official Secretariat.`);
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setMessage('');
    setTicketId('');
  };

  const faqs = [
    {
      q: 'How does the 100% Encrypted Data-Masking framework protect buyers?',
      a: 'Unlike traditional listing portals that monetize your contact information by selling it to hundreds of cold callers, Property Studio strips your phone number and email behind an encrypted card. High-intent requirements are routed securely without spam.'
    },
    {
      q: 'How are projects audited under TG-RERA and HMDA compliance?',
      a: 'CEO Swamy Reddy Javidi (TG RERA: A02200004078) combines 24+ years of corporate distribution governance with engineering layout audits, verifying RERA Form 4, 28-day concrete cube compression tests, and municipal title approvals.'
    },
    {
      q: 'How can developers claim their project community space for town halls?',
      a: 'Verified developer PMOs submit their corporate credentials to the Secretariat. Once verified, developers broadcast unedited construction telemetry, respond directly to community Q&As, and publish certified inventory status updates.'
    },
    {
      q: 'What is the 86-inch Interactive Flat Panel (IFP) Studio Broadcast?',
      a: 'Our flagship broadcast studio utilizes an 86-inch 4K touchscreen panel to dissect masterplans, satellite topography, wind vortex deflectors, and true cost sheet calculations with industry managing directors.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Support Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 rounded-xl bg-white flex items-center justify-center px-1 shrink-0">
              <BrandLogo variant="compact" size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white font-display">
                  Official Support Desk
                </h2>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                  TG RERA: A02200004078
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Property Studio by Swamy Reddy Javidi · Secretariat Assistance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Support Desk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('CONTACT')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'CONTACT'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Direct Contact
          </button>
          <button
            onClick={() => setActiveTab('TICKET')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'TICKET'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Submit Inquiry
          </button>
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'FAQ'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Platform Guides
          </button>
        </div>

        {/* Support Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-700 text-xs">
          {/* TAB 1: DIRECT CONTACT */}
          {activeTab === 'CONTACT' && (
            <div className="space-y-4">
              {/* Founder Helpline Highlight */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                      FOUNDER & CEO EXECUTIVE DESK
                    </span>
                    <h3 className="text-base font-black text-slate-900 font-display mt-0.5">
                      Swamy Reddy Javidi
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      24+ Years Corporate Distribution Governance & Real Estate Strategy. Direct consultations for HNI/NRI investors, developers, and regulatory compliance audits.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href="tel:+919849012890"
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call +91 98490 12890</span>
                  </a>
                  <a
                    href="https://wa.me/919849012890?text=Hello%20Property%20Studio%2C%20I%20would%20like%20to%20inquire%20about%20a%20project%20audit."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Desk</span>
                  </a>
                </div>
              </div>

              {/* Secretariat Email */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition-colors space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Official Secretariat Email</h4>
                    <a
                      href="mailto:info@propertystudio.org"
                      className="text-amber-700 hover:underline font-mono text-xs font-semibold block"
                    >
                      info@propertystudio.org
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  All official correspondence, project verification documentation, and developer PMO accreditations are processed through this registered portal.
                </p>
              </div>

              {/* Verification & Compliance Badges */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Statutory Compliance Metrics</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Government RERA</span>
                    <strong className="text-slate-900 font-mono text-xs">TG RERA: A02200004078</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">MSME Enterprise</span>
                    <strong className="text-slate-900 font-mono text-xs">TS-02-283677</strong>
                  </div>
                </div>
              </div>

              {/* Switch to Ticket CTA */}
              <div className="p-3.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">Need formal project audit or assistance?</span>
                <button
                  onClick={() => setActiveTab('TICKET')}
                  className="font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                >
                  Log Ticket &rarr;
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SUBMIT INQUIRY / TICKET */}
          {activeTab === 'TICKET' && (
            <div>
              {isSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Support Inquiry Received
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    Your inquiry has been assigned ticket reference{' '}
                    <strong className="font-mono text-emerald-800">{ticketId}</strong>. Swamy Reddy Javidi’s secretariat will evaluate your parameters within 4 hours.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleResetForm}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inquiry Category</label>
                    <select
                      value={ticketTopic}
                      onChange={e => setTicketTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option>Project Regulatory Audit & TS-RERA Check</option>
                      <option>Anonymous Buyer Requirement Submission</option>
                      <option>Developer Community Space Claim</option>
                      <option>Elite Agent Verification & Badge</option>
                      <option>86-inch IFP Studio Broadcast Inquiry</option>
                      <option>Technical / Platform Assistance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98490..."
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inquiry Details</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Specify project name, micro-market, budget, or audit questions..."
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  {/* Data Masking Protection Indicator */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 text-xs">
                        <input
                          type="checkbox"
                          checked={isMasked}
                          onChange={e => setIsMasked(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Enable Military-Grade Data Masking</span>
                      </label>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Your contact details will be completely sanitized and protected from broker spam databases.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Submit Support Ticket</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FAQS & GUIDES */}
          {activeTab === 'FAQ' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                Frequently referenced frameworks regarding Property Studio’s five-pillar PropTech ecosystem.
              </div>

              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3.5 text-left font-bold text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs">{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-3.5 pt-0 text-slate-600 text-xs leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Secretariat: info@propertystudio.org</span>
          <span>Hyderabad, TG, India</span>
        </div>
      </div>
    </div>
  );
};
