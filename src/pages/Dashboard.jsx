import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const PRIMARY = '#e94f1c';

function WhatsAppAgentCard() {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = base44.agents.getWhatsAppConnectURL('skitza_crm');

  const copyLink = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-black text-[#181311] text-lg">סוכן WhatsApp</h3>
          <p className="text-sm text-[#886c63] mt-1 leading-relaxed">
            חבר את הסוכן לווצאפ כדי לנהל את ה-CRM דרך הודעות. הסוכן יכול למצוא לקוחות, אירועים ותקליטנים, להוסיף ולעדכן נתונים, ולבצע שאילתות.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          חבר לווצאפ
        </a>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-green-300 bg-white hover:bg-green-50 text-green-700 font-bold text-sm transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'הועתק!' : 'העתק קישור'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState({ totalLeads: 0, activeEvents: 0, pendingPayments: 0, thisMonthRevenue: 0, newLeads: 0, upcomingEvents: 0 });
  const [nextEvent, setNextEvent] = useState(null);
  const [nextEventCustomer, setNextEventCustomer] = useState(null);
  const [weeklyLeads, setWeeklyLeads] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!nextEvent) return;
    const tick = () => {
      const diff = new Date(nextEvent.event_date) - new Date();
      if (diff <= 0) return setCountdown({ days: 0, hours: 0, minutes: 0 });
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [nextEvent]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // רק אדמין רואה את הדשבורד
      if (currentUser.role !== 'admin') {
        setLoading(false);
        return;
      }

      const [leads, events, customers, auditLogs, settingsList] = await Promise.all([
        base44.entities.Lead.list(),
        base44.entities.Event.list(),
        base44.entities.Customer.list(),
        base44.entities.AuditLog.list('-created_date', 5),
        base44.entities.AppSettings.list(),
      ]);
      if (settingsList.length > 0) setSettings(settingsList[0]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);

      const newLeads = leads.filter(l => l.status === 'NEW').length;
      const activeEvents = events.filter(e => !['COMPLETED', 'CANCELLED'].includes(e.event_status)).length;
      const pendingPayments = events.filter(e => e.payment_status !== 'PAID_FULL').length;
      const thisMonthRevenue = events
        .filter(e => new Date(e.event_date) >= monthStart && e.payment_status === 'PAID_FULL')
        .reduce((s, e) => s + (e.price_total || 0), 0);
      const upcomingEventsCount = events.filter(e => {
        const d = new Date(e.event_date);
        return d >= now && d <= nextWeek;
      }).length;

      const futureEvents = events
        .filter(e => new Date(e.event_date) >= now && e.event_status !== 'CANCELLED')
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      if (futureEvents.length > 0) {
        setNextEvent(futureEvents[0]);
        setNextEventCustomer(customers.find(c => c.id === futureEvents[0].customer_id) || null);
      }

      // Weekly leads by day of week (last 7 days)
      const weekly = [0, 0, 0, 0, 0, 0, 0];
      leads.forEach(lead => {
        const d = new Date(lead.created_date);
        if ((now - d) < 7 * 86400000) weekly[d.getDay()]++;
      });
      setWeeklyLeads(weekly);
      setRecentActivity(auditLogs);

      setStats({ totalLeads: leads.length, activeEvents, pendingPayments, thisMonthRevenue, newLeads, upcomingEvents: upcomingEventsCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
  const maxW = Math.max(...weeklyLeads, 1);

  const activityStyle = (action) => {
    const m = { CREATE: { bg: 'bg-emerald-100', txt: 'text-emerald-600', icon: '👤' }, UPDATE: { bg: 'bg-blue-100', txt: 'text-blue-600', icon: '✏️' }, DELETE: { bg: 'bg-red-100', txt: 'text-red-600', icon: '🗑️' }, SEND_MESSAGE: { bg: 'bg-orange-100', txt: 'text-orange-600', icon: '💬' } };
    return m[action] || { bg: 'bg-gray-100', txt: 'text-gray-600', icon: '•' };
  };

  const relativeTime = (d) => {
    const diff = Date.now() - new Date(d);
    const m = Math.floor(diff / 60000);
    if (m < 60) return `לפני ${m || 1} דקות`;
    const h = Math.floor(m / 60);
    if (h < 24) return `לפני ${h} שעות`;
    return `לפני ${Math.floor(h / 24)} ימים`;
  };

  const [isDJ, setIsDJ] = useState(null); // null = loading, true/false = resolved

  // בדיקה אם המשתמש הוא DJ
  useEffect(() => {
    const checkDJ = async () => {
      if (!user || user.role === 'admin') return;
      let djList = await base44.entities.DJ.filter({ user_id: user.id });
      if (djList.length === 0 && user.email) {
        djList = await base44.entities.DJ.filter({ user_id: user.email });
      }
      if (djList.length === 0 && user.email) {
        djList = await base44.entities.DJ.filter({ email: user.email });
      }
      setIsDJ(djList.length > 0);
    };
    if (!loading && user && user.role !== 'admin') {
      checkDJ();
    }
  }, [loading, user]);

  // Redirect DJ users to MyShows
  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && isDJ === true) {
      window.location.href = createPageUrl('MyShows');
    }
  }, [loading, user, isDJ]);

  if (loading || (user && user.role !== 'admin' && isDJ !== false)) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }}></div>
    </div>
  );

  // משתמש שאינו admin ואינו DJ
  if (user && user.role !== 'admin' && isDJ === false) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-xl font-semibold text-gray-700">אין לך הרשאת גישה</p>
      <p className="text-gray-500 mt-2">החשבון שלך לא משויך למערכת. פנה למנהל.</p>
    </div>
  );

  const firstName = user?.full_name?.split(' ')[0] || 'בן';
  const greetingText = (settings.dashboard_greeting ?? 'היי {name}, מה קורה היום?').replace('{name}', firstName);
  const subtitleText = settings.dashboard_subtitle ?? 'הנה סקירה של מה שקורה בסטודיו שלך כרגע.';
  const labelNewLeads = settings.dashboard_stat_new_leads ?? 'לידים חדשים';
  const labelUpcoming = settings.dashboard_stat_upcoming_events ?? 'אירועים קרובים';
  const labelRevenue = settings.dashboard_stat_monthly_revenue ?? 'הכנסה חודשית';
  const labelChart = settings.dashboard_chart_title ?? 'פילוח לידים שבועי';
  const labelActivity = settings.dashboard_activity_title ?? 'פעילות אחרונה';

  return (
    <div className="space-y-8" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2" style={{ color: '#0f172a' }}>{greetingText}</h2>
          <p className="text-slate-500 font-medium max-w-md">{subtitleText}</p>
        </div>
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-5">

        {/* --- Stats col (4) --- */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {[
            { label: labelNewLeads, value: stats.newLeads, sub: `סה"כ ${stats.totalLeads} לידים`, icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={PRIMARY} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            )},
            { label: labelUpcoming, value: stats.upcomingEvents, sub: `${stats.activeEvents} אירועים פעילים`, icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={PRIMARY} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            )},
            { label: labelRevenue, value: `₪${stats.thisMonthRevenue.toLocaleString()}`, sub: `${stats.pendingPayments} ממתינים לתשלום`, icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={PRIMARY} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )},
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform" style={{ borderColor: `${PRIMARY}15` }}>
              <div>
                <p className="text-sm font-bold text-[#886c63]">{s.label}</p>
                <h3 className="text-3xl font-black text-[#181311] mt-1">{s.value}</h3>
                <p className="mt-2 text-xs font-bold text-[#886c63]">{s.sub}</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${PRIMARY}15` }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* --- Next Event (8) --- */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white h-full rounded-xl overflow-hidden border shadow-sm relative" style={{ borderColor: `${PRIMARY}15`, background: `linear-gradient(135deg, ${PRIMARY}08 0%, white 55%)` }}>
            {nextEvent ? (
              <div className="h-full p-8 flex flex-col justify-between min-h-[280px]">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}>
                    אירוע הבא
                  </span>
                  <h3 className="text-3xl font-black mt-4 text-[#181311]">
                    {nextEvent.event_type}{nextEventCustomer ? ` — ${nextEventCustomer.name}` : ''}
                  </h3>
                  <div className="flex flex-wrap gap-4 mt-4 text-[#886c63]">
                    {nextEvent.location && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                        <span className="text-sm font-medium">{nextEvent.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span className="text-sm font-medium">{new Date(nextEvent.event_date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-end gap-6 mt-8">
                  {[{ n: countdown.days, label: 'ימים' }, { n: countdown.hours, label: 'שעות' }, { n: countdown.minutes, label: 'דקות' }].map((c, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-3xl font-light self-start mt-1" style={{ color: `${PRIMARY}40` }}>:</span>}
                      <div className="text-center">
                        <p className="text-4xl font-black" style={{ color: PRIMARY }}>{String(c.n).padStart(2, '0')}</p>
                        <p className="text-[10px] uppercase font-bold text-[#886c63]">{c.label}</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-8">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}>אירוע הבא</span>
                <p className="text-[#886c63] font-medium">אין אירועים קרובים</p>
              </div>
            )}
            <span className="absolute -bottom-6 -left-4 text-[140px] select-none pointer-events-none" style={{ color: `${PRIMARY}06`, lineHeight: 1 }}>📅</span>
          </div>
        </div>

        {/* --- Weekly Chart (7) --- */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white p-6 rounded-xl border shadow-sm h-full" style={{ borderColor: `${PRIMARY}10` }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-[#181311]">{labelChart}</h3>
              <span className="text-xs font-bold text-[#886c63]">7 ימים אחרונים</span>
            </div>
            <div className="flex items-end justify-between gap-3 h-48 px-2">
              {weeklyLeads.map((count, i) => {
                const barH = Math.max((count / maxW) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${barH}%`, backgroundColor: `${PRIMARY}15` }}>
                      {count > 0 && <div className="absolute bottom-0 w-full rounded-t-lg" style={{ height: '70%', backgroundColor: PRIMARY }}></div>}
                    </div>
                    <span className="text-[10px] font-bold text-[#886c63]">{dayLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- WhatsApp Agent (5) --- */}
        <div className="col-span-12 lg:col-span-5">
          <WhatsAppAgentCard />
        </div>

        {/* --- Recent Activity (5) --- */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col h-full" style={{ borderColor: `${PRIMARY}10` }}>
            <h3 className="font-bold text-[#181311] mb-6">{labelActivity}</h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {recentActivity.length > 0 ? recentActivity.map((log, i) => {
                const s = activityStyle(log.action);
                return (
                  <div key={i} className="flex gap-3">
                    <div className={`h-8 w-8 rounded-full ${s.bg} flex items-center justify-center shrink-0 text-sm`}>{s.icon}</div>
                    <div className="bg-[#f8f6f6] p-3 rounded-2xl rounded-tr-none flex-1">
                      <p className="text-xs font-bold text-[#181311]">{log.diff_summary || `${log.action} — ${log.entity_name}`}</p>
                      <p className="text-[10px] text-[#886c63] mt-0.5">{relativeTime(log.created_date)}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm">👋</div>
                  <div className="bg-[#f8f6f6] p-3 rounded-2xl rounded-tr-none flex-1">
                    <p className="text-xs font-bold text-[#181311]">ברוכים הבאים לסקיצה CRM</p>
                    <p className="text-[10px] text-[#886c63] mt-0.5">המערכת מוכנה לעבודה</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}