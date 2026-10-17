import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { ConstructionLog } from '../../types';
import {
  Building2,
  HardHat,
  PlusCircle,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  LogOut
} from 'lucide-react';

export const PropertyAdminDashboard: React.FC = () => {
  const {
    currentUser,
    properties,
    assignments,
    constructionLogs,
    updatePropertyInventory,
    addConstructionLog,
    communityPosts,
    addCommunityReply,
    logout,
    setActiveView
  } = useApp();

  // Find assignments for this user
  const userAssignments = assignments.filter(a => a.adminUserId === currentUser.id);
  const assignedPropertyIds = userAssignments.length > 0
    ? userAssignments.map(a => a.propertyId)
    : (currentUser.assignedPropertyIds || []);

  const assignedProperties = properties.filter(p => assignedPropertyIds.includes(p.id));

  // Active scoped property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    assignedProperties[0]?.id || properties[0]?.id || ''
  );

  const activeProperty = properties.find(p => p.id === selectedPropertyId);

  // Inventory edit state
  const [editUnits, setEditUnits] = useState<number>(activeProperty?.availableUnits || 46);
  const [editPriceSqft, setEditPriceSqft] = useState<number>(activeProperty?.pricePerSqft || 11800);

  // New construction log modal / inline form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    milestoneTitle: '',
    stage: 'Superstructure' as ConstructionLog['stage'],
    progressPercentage: 70,
    description: '',
    imageUrl: ''
  });

  // Reply text state for localized community questions
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleUpdateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;
    updatePropertyInventory(activeProperty.id, Number(editUnits), Number(editPriceSqft));
  };

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty || !logForm.milestoneTitle) return;

    addConstructionLog(activeProperty.id, {
      propertyId: activeProperty.id,
      date: 'Today',
      milestoneTitle: logForm.milestoneTitle,
      description: logForm.description || 'Milestone verified on site by project PMO inspection engineer.',
      progressPercentage: Number(logForm.progressPercentage),
      stage: logForm.stage,
      verifiedBy: `${currentUser.name} (PMO)`,
      imageUrl: logForm.imageUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
    });

    setLogForm({
      milestoneTitle: '',
      stage: 'Superstructure',
      progressPercentage: 70,
      description: '',
      imageUrl: ''
    });
    setShowLogForm(false);
  };

  const handleSendReply = (postId: string) => {
    const text = replyText[postId];
    if (!text || !text.trim()) return;
    addCommunityReply(postId, text);
    setReplyText({ ...replyText, [postId]: '' });
  };

  const activeLogs = constructionLogs.filter(l => l.propertyId === activeProperty?.id);
  const propertyQuestions = communityPosts.filter(
    p => p.propertyId === activeProperty?.id || !p.propertyId
  );

  if (!activeProperty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">No Scoped Property Assigned</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Your account currently does not have an active <code className="font-mono">PropertyAdminAssignment</code> record. Contact the Super Admin to grant project scope.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Scoped PMO Workspace Header */}
      <div className="bg-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-800/60 border border-indigo-600 flex items-center justify-center text-amber-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500 text-white uppercase tracking-wider">
                  Scoped PMO Workspace
                </span>
                <span className="text-xs text-indigo-300 font-mono">
                  RBAC Scope: PropertyAdminAssignment
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1 font-display">
                {activeProperty.title}
              </h1>
              <p className="text-xs text-indigo-300">
                Official Project Management Office (PMO) Console · Assigned to {currentUser.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Project Switcher if admin has multiple assignments */}
            {assignedProperties.length > 1 && (
              <div className="bg-indigo-900 p-2.5 rounded-xl border border-indigo-700">
                <label className="block text-[10px] text-indigo-300 font-semibold mb-1">
                  Select Scoped Project
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="bg-indigo-950 text-white text-xs px-3 py-1.5 rounded-lg border border-indigo-600 focus:outline-none"
                >
                  {assignedProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Property Admin Session & Logout Button */}
            <div className="flex items-center gap-2.5 bg-indigo-900/90 pl-3 pr-2 py-1.5 rounded-xl border border-indigo-700 shadow-sm">
              <Avatar id={currentUser.avatar} label={currentUser.name} className="w-8 h-8 rounded-full border border-indigo-400/50" />
              <div className="text-left hidden sm:block pr-1">
                <span className="text-xs font-bold text-white block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-indigo-300 block font-semibold leading-tight">PMO Admin</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  setActiveView('HOME');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-950/20 active:scale-95 transition-all cursor-pointer"
                title="Log out of Property Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Scoped Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-900/80">
          <div>
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Total Units</span>
            <span className="text-xl font-black text-white font-mono-numbers">{activeProperty.totalUnits}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Available Units</span>
            <span className="text-xl font-black text-amber-400 font-mono-numbers">{activeProperty.availableUnits}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Rate / Sq.Ft</span>
            <span className="text-xl font-black text-emerald-400 font-mono-numbers">₹{activeProperty.pricePerSqft.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-indigo-300 block">Physical Progress</span>
            <span className="text-xl font-black text-white font-mono-numbers">{activeProperty.progressPercent}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Real-Time Unit Inventory & Milestone Logger (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Module 1: Real-Time Inventory Control */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Real-Time Unit Inventory Management</h3>
                <p className="text-xs text-slate-500">
                  Update live available inventory badges and base price per sq.ft.
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-lg">
                Live Broadcast Sync
              </span>
            </div>

            <form onSubmit={handleUpdateInventory} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Inventory Units
                </label>
                <input
                  type="number"
                  value={editUnits}
                  onChange={e => setEditUnits(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg font-mono-numbers focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Total Units: {activeProperty.totalUnits} (Sold: {activeProperty.totalUnits - editUnits})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Price per Sq.Ft (₹)
                </label>
                <input
                  type="number"
                  value={editPriceSqft}
                  onChange={e => setEditPriceSqft(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg font-mono-numbers focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Current Market Rate in {activeProperty.microMarket}
                </span>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Save & Publish Inventory Updates
                </button>
              </div>
            </form>
          </div>

          {/* Module 2: Construction Progress Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Construction Progress Logs & Audits</h3>
                <p className="text-xs text-slate-500">
                  Document concrete cube strength tests, slab casting milestones, and MEP installations.
                </p>
              </div>
              <button
                onClick={() => setShowLogForm(!showLogForm)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Log New Milestone</span>
              </button>
            </div>

            {/* Inline Log Creation Form */}
            {showLogForm && (
              <form onSubmit={handleCreateLog} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  New Construction Milestone Entry
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Milestone Title *</label>
                  <input
                    type="text"
                    required
                    value={logForm.milestoneTitle}
                    onChange={e => setLogForm({ ...logForm, milestoneTitle: e.target.value })}
                    placeholder="e.g. Level 44 Slab Casting & Post-Tensioning Inspection"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Construction Stage</label>
                    <select
                      value={logForm.stage}
                      onChange={e => setLogForm({ ...logForm, stage: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Foundation">Foundation</option>
                      <option value="Superstructure">Superstructure</option>
                      <option value="Brickwork & MEP">Brickwork & MEP</option>
                      <option value="Finishing">Finishing</option>
                      <option value="Handover Ready">Handover Ready</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Total Completion %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={logForm.progressPercentage}
                      onChange={e => setLogForm({ ...logForm, progressPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-numbers"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Audit Details</label>
                  <textarea
                    rows={2}
                    value={logForm.description}
                    onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                    placeholder="Include concrete cube strength grade (e.g. M60), SGS lab certificate ID, etc."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Save & Broadcast Milestone
                  </button>
                </div>
              </form>
            )}

            {/* List of active construction logs */}
            <div className="space-y-3">
              {activeLogs.map(log => (
                <div key={log.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-slate-900">{log.milestoneTitle}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {log.progressPercentage}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {log.date}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified by: {log.verifiedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Localized Community Replies (Official PMO Voice) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Official PMO Community Replies</h3>
              <p className="text-xs text-slate-500">
                Answer buyer and investor technical inquiries with official verified builder authority.
              </p>
            </div>

            <div className="space-y-4 divide-y divide-slate-100">
              {propertyQuestions.map(post => (
                <div key={post.id} className="pt-4 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{post.authorName}</span>
                    <span className="text-slate-400">{post.createdAt}</span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                    {post.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{post.content}"
                  </p>

                  {/* Show existing replies */}
                  {post.replies.length > 0 && (
                    <div className="space-y-2 pl-3 border-l-2 border-indigo-200 my-2">
                      {post.replies.map(r => (
                        <div key={r.id} className="text-xs">
                          <span className="font-bold text-indigo-900">
                            {r.authorName} {r.isVerifiedBuilderReply && '✓ (PMO Official)'}:
                          </span>
                          <p className="text-slate-700 mt-0.5">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add official reply box */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Write official PMO response..."
                      value={replyText[post.id] || ''}
                      onChange={e => setReplyText({ ...replyText, [post.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleSendReply(post.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                      Post Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
