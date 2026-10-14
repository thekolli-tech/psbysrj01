import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Upload, FileText, CheckCircle, X } from 'lucide-react';

interface AgentOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentOnboardModal: React.FC<AgentOnboardModalProps> = ({ isOpen, onClose }) => {
  const { submitAgentApplication } = useApp();

  const [formData, setFormData] = useState({
    agentName: '',
    agencyName: '',
    email: '',
    phone: '',
    reraState: 'Telangana',
    reraNumber: '',
    experienceYears: 5
  });

  const [docsUploaded, setDocsUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agentName || !formData.reraNumber) return;

    setIsSubmitting(true);
    setTimeout(() => {
      submitAgentApplication({
        agentName: formData.agentName,
        agencyName: formData.agencyName || 'Independent Advisory',
        email: formData.email || 'agent@propertystudio.in',
        phone: formData.phone || '+91 99880 12345',
        reraState: formData.reraState,
        reraNumber: formData.reraNumber,
        experienceYears: Number(formData.experienceYears),
        feePaid: true,
        feeAmount: 2499,
        documents: [
          { name: `RERA-Certificate-${formData.reraNumber}.pdf`, status: 'VALIDATED' },
          { name: 'Government-ID-Proof.pdf', status: 'VALIDATED' }
        ]
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Agent RERA Verification Engine</h3>
              <p className="text-xs text-slate-500">Super Admin audit queue & Verified Expert badge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Verified agents receive the official <strong>Verified Expert</strong> badge, priority access to high-value HNI leads, and direct client routing.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.agentName}
                onChange={e => setFormData({ ...formData, agentName: e.target.value })}
                placeholder="e.g. Vikramaditya Reddy"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agency / Advisory Name</label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
                placeholder="e.g. Apex Luxury Real Estate"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. advisor@apexluxury.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (WhatsApp) *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98490 00000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RERA Jurisdiction</label>
              <select
                value={formData.reraState}
                onChange={e => setFormData({ ...formData, reraState: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Telangana">Telangana (TS-RERA)</option>
                <option value="Karnataka">Karnataka (K-RERA)</option>
                <option value="Maharashtra">Maharashtra (MahaRERA)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">RERA Registration Number *</label>
              <input
                type="text"
                required
                value={formData.reraNumber}
                onChange={e => setFormData({ ...formData, reraNumber: e.target.value })}
                placeholder="e.g. A02400009841"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Official RERA Certificate & GSTIN (PDF)
            </label>
            <div
              onClick={() => setDocsUploaded(true)}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                docsUploaded ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
            >
              {docsUploaded ? (
                <div className="flex items-center justify-center gap-2 text-emerald-800 text-xs font-semibold">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>RERA_Certificate_Validated_2026.pdf (1.8 MB attached)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500 text-xs">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Click to attach RERA verification certificate</span>
                  <span className="text-[11px] text-slate-400">PDF, JPG up to 15MB</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Upfront Verification Fee</span>
              <p className="text-[11px] text-slate-500">One-time background audit & registry fee</p>
            </div>
            <span className="font-bold text-slate-900 font-mono-numbers text-sm">₹2,499</span>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Pay ₹2,499 & Submit to Super Admin Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
