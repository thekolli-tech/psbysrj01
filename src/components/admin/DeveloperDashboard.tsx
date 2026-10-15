import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Database, ShieldCheck } from 'lucide-react';

export const DeveloperDashboard: React.FC = () => {
  const { setActiveView } = useApp();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/developer/status')
      .then(async res => {
        const data = await res.json();
        if (!res.ok && res.status !== 503) throw new Error(data.error || 'Diagnostics unavailable');
        setReport(data);
      })
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-amber-700">Developer</p>
        <h1 className="text-2xl font-black text-slate-900 font-display">Platform diagnostics</h1>
        <p className="text-sm text-slate-600 mt-1">Database connectivity, schema readiness, and integration status. Ordinary administration stays in the platform console.</p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <Database className="w-5 h-5 text-slate-700" />
          <p className="text-xs text-slate-500 mt-3">Database</p>
          <p className="font-bold text-slate-900">{report?.authoritativeDatabase || 'Checking'}</p>
          <p className="text-xs text-slate-600 mt-1">Connected: {String(report?.database?.connected ?? '…')}</p>
          <p className="text-xs text-slate-600">Schema ready: {String(report?.database?.schemaReady ?? '…')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <Activity className="w-5 h-5 text-slate-700" />
          <p className="text-xs text-slate-500 mt-3">Payments</p>
          <p className="font-bold text-slate-900">{report?.payments || report?.integrations?.payments || '…'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <ShieldCheck className="w-5 h-5 text-slate-700" />
          <p className="text-xs text-slate-500 mt-3">MongoDB</p>
          <p className="font-bold text-slate-900">{report?.integrations?.mongodb || 'NOT_USED'}</p>
        </div>
      </div>
      {Array.isArray(report?.database?.missingTables) && report.database.missingTables.length > 0 && (
        <p className="text-sm text-amber-800">Missing tables: {report.database.missingTables.join(', ')}. Run npm run db:init before serving traffic.</p>
      )}
      <button
        onClick={() => setActiveView('ADMIN')}
        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
      >
        Open platform administration
      </button>
    </div>
  );
};
