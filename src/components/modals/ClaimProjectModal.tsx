import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { Building2, Upload, FileCheck, CheckCircle2, X } from 'lucide-react';

interface ClaimProjectModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimProjectModal: React.FC<ClaimProjectModalProps> = ({ property, isOpen, onClose }) => {
  const { submitDeveloperClaim, currentUser } = useApp();

  const [formData, setFormData] = useState({
    developerName: currentUser.organization || 'Signature Infra Group',
    authorizedPerson: currentUser.name || 'Maheshwar Rao',
    contactEmail: currentUser.email || 'developer@propertystudio.in',
    contactPhone: currentUser.phone || '+91 98490 11223',
    planSubscription: 'Enterprise Developer' as 'Pro Builder' | 'Enterprise Developer'
  });

  const [docsUploaded, setDocsUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !property) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      submitDeveloperClaim({
        propertyId: property.id,
        propertyName: property.title,
        developerName: formData.developerName,
        authorizedPerson: formData.authorizedPerson,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        reraCertificateUrl: `https://rera.telangana.gov.in/cert/${property.reraRegId}`,
        boardResolutionUrl: 'https://docs.propertystudio.in/legal/board-resolution-sample.pdf',
        planSubscription: formData.planSubscription
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">B2B Project Claim & Verification</h3>
              <p className="text-xs text-slate-500">Claim official ownership of {property.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Developer Verification Privileges:</span> Claiming unlocks verified developer badges, real-time unit inventory control, corporate conference hosting, and direct buyer inquiry routing.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Developer Legal Entity Name</label>
            <input
              type="text"
              required
              value={formData.developerName}
              onChange={e => setFormData({ ...formData, developerName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory</label>
              <input
                type="text"
                required
                value={formData.authorizedPerson}
                onChange={e => setFormData({ ...formData, authorizedPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Tier</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planSubscription: 'Pro Builder' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.planSubscription === 'Pro Builder'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Pro Builder</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">₹25,000 / mo</div>
                <div className="text-[10px] text-slate-500 mt-1">Up to 3 active projects, verified badge</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, planSubscription: 'Enterprise Developer' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.planSubscription === 'Enterprise Developer'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Enterprise Developer</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">₹65,000 / mo</div>
                <div className="text-[10px] text-slate-500 mt-1">Unlimited projects, live conference hosting</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Board Resolution & Title Power of Attorney (PDF)
            </label>
            <div
              onClick={() => setDocsUploaded(true)}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                docsUploaded ? 'border-blue-500 bg-blue-50/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
            >
              {docsUploaded ? (
                <div className="flex items-center justify-center gap-2 text-blue-800 text-xs font-semibold">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Board_Resolution_Authorization_POA.pdf (Signed & Sealed)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500 text-xs">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Click to attach authorization documents</span>
                  <span className="text-[11px] text-slate-400">PDF up to 25MB</span>
                </div>
              )}
            </div>
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim to Super Admin for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
