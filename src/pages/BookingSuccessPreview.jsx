import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BookingSuccess from '../components/booking/BookingSuccess';
import { ArrowRight } from 'lucide-react';

export default function BookingSuccessPreview() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
        setIsAdmin(true);

        const list = await base44.entities.BookingFormSettings.list();
        if (list.length > 0) setSettings(list[0]);
      } catch { /* */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="relative">
      {/* Admin floating bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: 'rgba(233,79,28,0.9)', backdropFilter: 'blur(8px)' }}>
        <span>תצוגה מקדימה — דף אישור</span>
        <a
          href={createPageUrl('Management')}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          חזרה להגדרות
        </a>
      </div>
      <BookingSuccess settings={settings} />
    </div>
  );
}