import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, X, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string;
  actor_name?: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: number;
  created_at: string;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const handleMarkRead = async (id: string, linkUrl?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, is_read: 1 }) : n));
      if (linkUrl && onNavigate) {
        onNavigate(linkUrl);
        onClose();
      }
    } catch {}
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute right-0 top-12 z-40 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-in fade-in duration-150"
      style={{ boxShadow: '0 20px 40px -10px rgba(24, 42, 62, 0.2)' }}
    >
      <div className="px-4 py-3 bg-[#182A3E] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-[#B49029] text-white px-1.5 py-0.2 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] text-amber-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
        {loading ? (
          <div className="p-6 text-center text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-1.5">
            <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">You're all caught up!</p>
            <p className="text-[11px] text-slate-400">No new alerts or replies at this time.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id, n.link_url)}
              className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                !n.is_read ? 'bg-amber-50/40' : ''
              }`}
            >
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-500" style={{ opacity: n.is_read ? 0 : 1 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 truncate">{n.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
