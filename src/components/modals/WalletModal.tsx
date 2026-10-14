import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Wallet, CreditCard, ArrowRight, X, ShieldCheck } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, topUpWallet } = useApp();
  const [selectedAmount, setSelectedAmount] = useState<number>(3000);
  const [customAmount, setCustomAmount] = useState<string>('');

  if (!isOpen) return null;

  const quickAmounts = [1000, 3000, 5000, 10000];

  const handleRecharge = () => {
    const amt = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (isNaN(amt) || amt <= 0) return;
    topUpWallet(amt);
    setCustomAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Lead Credits & Wallet</h3>
              <p className="text-xs text-slate-500">Instant Pay-per-Lead unlocking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Available Balance</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
                ₹{currentUser.walletBalance.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                Verified Account
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Zero Lock-in</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Top-Up Credits
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all text-left flex items-center justify-between ${
                    selectedAmount === amt && !customAmount
                      ? 'border-amber-600 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>₹{amt.toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {amt >= 5000 ? '+ Bonus' : 'Standard'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Or Enter Custom Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">₹</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(0);
                }}
                placeholder="e.g. 15000"
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Bank-grade 256-bit encryption. Instant activation for lead marketplace.</span>
          </div>

          <button
            onClick={handleRecharge}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.98] transition-all"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>
              Recharge ₹
              {(customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount).toLocaleString('en-IN')}
            </span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};
