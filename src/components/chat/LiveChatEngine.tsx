import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  User,
  ShieldCheck,
  Building,
  Calendar,
  CheckCheck,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export const LiveChatEngine: React.FC = () => {
  const { messages, sendMessage, currentUser, showToast } = useApp();
  const [inputText, setInputText] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('user_agent_vikram');

  const contacts = [
    {
      id: 'user_agent_vikram',
      name: 'Vikram Sethi',
      role: 'Verified RERA Agent',
      badge: 'TS-RERA A02400001882',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80',
      online: true
    },
    {
      id: 'user_prop_admin_rajiv',
      name: 'Rajiv Williams',
      role: 'Project PMO Director',
      badge: 'The Crown Neopolis',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      online: true
    },
    {
      id: 'user_dev_aparna',
      name: 'Maheshwar Rao (MD)',
      role: 'Developer Managing Director',
      badge: 'Aparna Infra Corporate',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      online: false
    }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim(), selectedRecipientId);
    setInputText('');
  };

  const activeContact = contacts.find(c => c.id === selectedRecipientId) || contacts[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
        {/* Left Column: Direct Contacts List (4 cols) */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Direct Live Chat</h3>
                <p className="text-xs text-slate-500">Unlocked Lead Communications</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                256-bit Secure
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {contacts.map(c => {
                const isSelected = selectedRecipientId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedRecipientId(c.id)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-amber-50/70 border-r-2 border-amber-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      {c.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 truncate">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400">Live</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">{c.role}</span>
                      <span className="text-[10px] text-indigo-700 font-semibold block truncate">
                        {c.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>RERA Compliance Protocol</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              All messages exchanged are archived for legal clarity under Section 11 of the Real Estate (Regulation and Development) Act.
            </p>
          </div>
        </div>

        {/* Right Column: Chat Conversation Stream (8 cols) */}
        <div className="md:col-span-8 flex flex-col justify-between bg-slate-50/40">
          {/* Active Contact Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={activeContact.avatar}
                alt={activeContact.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  {activeContact.name}
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                  </span>
                </h4>
                <p className="text-xs text-slate-500">{activeContact.role} · {activeContact.badge}</p>
              </div>
            </div>

            <button
              onClick={() => showToast(`Executive Site Walkthrough scheduled with ${activeContact.name} for Saturday 11:00 AM.`)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Schedule Site Audit</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[480px]">
            {messages.map(msg => {
              const isSender = msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-semibold text-slate-400 mb-1">
                    {msg.senderName} · {msg.timestamp}
                  </span>

                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isSender
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Message ${activeContact.name}...`}
              className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
