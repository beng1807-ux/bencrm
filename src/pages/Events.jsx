import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, User, MapPin, Plus, Pencil, Trash2, Music, Search, Filter, Download, LayoutGrid, List, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddonSelector from '../components/events/AddonSelector';
import PriceSummary from '../components/events/PriceSummary';
import PaymentMethodModal from '../components/events/PaymentMethodModal';

const PRIMARY = '#ec5b13';

const STATUS_LABELS = { PENDING: 'ממתין', CONFIRMED: 'מאושר', IN_PROGRESS: 'בתהליך', COMPLETED: 'הושלם', CANCELLED: 'בוטל' };
const PAYMENT_LABELS = { PENDING: 'ממתין לתשלום', PAID_FULL: 'שולם במלואו' };

const getStatusColor = (s) => ({ PENDING:'bg-orange-50 text-orange-500', CONFIRMED:'bg-emerald-50 text-emerald-500', IN_PROGRESS:'bg-amber-50 text-amber-500', COMPLETED:'bg-green-50 text-green-500', CANCELLED:'bg-red-50 text-red-500' }[s] || 'bg-slate-50 text-slate-500');
const getPaymentColor = (s) => ({ PENDING:'bg-red-50 text-red-500', PAID_FULL:'bg-emerald-50 text-emerald-500' }[s] || 'bg-slate-50 text-slate-500');

const getContactName = (contactId, contacts) => {
  const contact = contacts.find(c => c.id === contactId);
  if (contact) return contact.contact_name;
  return 'לא משויך';
};

const isEventDjLead = (event, contacts) => {
  if (!event.contact_id) return false;
  const contact = contacts.find(c => c.id === event.contact_id);
  return contact?.is_dj_lead === true;
};

const isEventSkitzaPackage = (event, contacts) => {
  if (!event.contact_id) return false;
  const contact = contacts.find(c => c.id === event.contact_id);
  return contact?.skitza_package_selected === true;
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [djs, setDJs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({});
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterThisMonth, setFilterThisMonth] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [creating, setCreating] = useState(false);
  const [eventSettings, setEventSettings] = useState({});
  const [appSettings, setAppSettings] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  // Handle URL params for deep linking
  useEffect(() => {
    if (!loading && events.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('eventId');
      const upcoming = params.get('upcoming');
      const thisMonthParam = params.get('thisMonth');
      
      if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) openEdit(event);
      } else if (thisMonthParam === 'true') {
        setFilterThisMonth(true);
      } else if (upcoming === 'true') {
        // Sort by date ascending, show only future events
        const now = new Date();
        const futureEvents = events.filter(e => new Date(e.event_date) >= now && e.event_status !== 'CANCELLED');
        if (futureEvents.length > 0) {
          const sorted = [...futureEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
          openEdit(sorted[0]);
        }
      }
    }
  }, [loading, events]);

  useEffect(() => {
    if (createOpen) {
      loadData();
    }
  }, [createOpen]);

  const loadData = async () => {
    const results = await Promise.allSettled([
      base44.entities.Event.list('-event_date'),
      base44.entities.Contact.list(),
      base44.entities.Package.filter({ active: true }),
      base44.entities.DJ.filter({ status: 'ACTIVE' }),
      base44.entities.EventSettings.list(),
      base44.entities.AppSettings.list(),
    ]);
    setEvents(results[0].status === 'fulfilled' ? results[0].value : []);
    setContacts(results[1].status === 'fulfilled' ? results[1].value : []);
    setPackages(results[2].status === 'fulfilled' ? results[2].value : []);
    setDJs(results[3].status === 'fulfilled' ? results[3].value : []);
    if (results[4].status === 'fulfilled' && results[4].value.length > 0) setEventSettings(results[4].value[0]);
    if (results[5].status === 'fulfilled' && results[5].value.length > 0) setAppSettings(results[5].value[0]);
    setLoading(false);
  };

  const toggleSelect = (id) => { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => setSelected(prev => prev.size === events.length ? new Set() : new Set(events.map(e => e.id)));

  const openEdit = (event, e) => { if (e) e.stopPropagation(); setEditData({...event}); setEditOpen(true); };

  const deleteEvent = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('למחוק אירוע זה?')) return;
    await base44.entities.Event.delete(id);
    await loadData();
    toast.success('אירוע נמחק');
  };

  const deleteSelected = async () => {
    if (!confirm(`למחוק ${selected.size} אירועים?`)) return;
    await Promise.all([...selected].map(id => base44.entities.Event.delete(id)));
    setSelected(new Set());
    await loadData();
    toast.success('אירועים נמחקו');
  };

  const calculatePrice = (packageId, addonIds) => {
    let total = 0;
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) total += pkg.price;
    addonIds?.forEach(aid => { const a = packages.find(p => p.id === aid); if (a) total += a.price; });
    return total;
  };

  const handlePaymentStatusChange = (newStatus) => {
    if (newStatus === 'PAID_FULL') {
      setPendingPaymentStatus(newStatus);
      setPaymentModalOpen(true);
    } else {
      setEditData({ ...editData, payment_status: newStatus });
    }
  };

  const confirmPaymentMethod = (method) => {
    setEditData({ ...editData, payment_status: pendingPaymentStatus, last_payment_method: method });
    setPaymentModalOpen(false);
    setPendingPaymentStatus(null);
  };

  const saveEdit = async () => {
    try {
      const originalEvent = events.find(e => e.id === editData.id);
      const djChanged = originalEvent && editData.dj_id && editData.dj_id !== originalEvent.dj_id;
      const paymentChanged = originalEvent && editData.payment_status && editData.payment_status !== originalEvent.payment_status;
      const statusChanged = originalEvent && editData.event_status && editData.event_status !== originalEvent.event_status;

      const contactName = getContactName(editData.contact_id, contacts);
      const djName = editData.dj_id ? djs.find(d => d.id === editData.dj_id)?.name : null;

      await base44.entities.Event.update(editData.id, editData);
      if (editData.contact_id && editData.event_date) {
        syncDateToSource(editData.contact_id, editData.event_date);
      }
      setEditOpen(false);
      loadData();

      if (djChanged) {
        toast.success(`האירוע עודכן — הודעות שיבוץ בדרך ל-${contactName} ול-DJ ${djName || ''}`, { duration: 6000 });
      } else if (paymentChanged && editData.payment_status === 'PAID_FULL') {
        toast.success(`האירוע עודכן — אישור תשלום בדרך ל-${contactName}`, { duration: 5000 });
      } else if (statusChanged && editData.event_status === 'COMPLETED') {
        toast.success(`האירוע עודכן — הודעת תודה בדרך ל-${contactName}`, { duration: 5000 });
      } else {
        toast.success('האירוע עודכן');
      }
    } catch (err) {
      toast.error(`שגיאה בעדכון האירוע: ${err.message || 'שגיאה לא ידועה'}`);
    }
  };

  const syncDateToSource = async (contactId, newDate) => {
    if (contactId) {
      await base44.entities.Contact.update(contactId, { event_date: newDate });
    }
  };

  const depositPercent = appSettings.default_deposit_percent || 30;

  const createEvent = async () => {
    const total = calculatePrice(newEvent.package_id, newEvent.addon_ids);
    const dep = newEvent.deposit_amount ?? Math.round(total * (depositPercent / 100));
    const bal = newEvent.balance_amount ?? (total - dep);
    await base44.entities.Event.create({ ...newEvent, price_total: total, payment_status: 'PENDING', event_status: 'PENDING' });
    if (newEvent.contact_id && newEvent.event_date) {
      await syncDateToSource(newEvent.contact_id, newEvent.event_date);
    }
    await loadData();
    toast.success('אירוע חדש נוצר');
    setCreateOpen(false); setNewEvent({});
  };

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
      toast.error('יש למלא את כל השדות');
      return;
    }
    const created = await base44.entities.Contact.create({ contact_name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email, status: 'DEAL_CLOSED', contact_type: 'customer' });
    await loadData();
    setNewEvent({ ...newEvent, contact_id: created.id });
    setNewCustomerOpen(false);
    setNewCustomer({ name: '', phone: '', email: '' });
    toast.success('איש קשר חדש נוצר');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  const thisMonth = events.filter(e => {
    const d = new Date(e.event_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const confirmedCount = events.filter(e => e.event_status === 'CONFIRMED').length;

  const filteredEvents = events.filter(e => {
    const matchType = filterType === 'ALL' || e.event_type === filterType;
    const customerName = getContactName(e.contact_id, contacts);
    const matchSearch = !searchTerm || 
      e.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMonth = !filterThisMonth || (() => {
      const d = new Date(e.event_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })();
    return matchType && matchSearch && matchMonth;
  });

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif', color: eventSettings.events_font_color || '#0f172a' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2" style={{ color: eventSettings.events_font_color || '#0f172a' }}>{eventSettings.events_title || 'חגיגה של הצלחה! 🎉'}</h2>
          <p className="text-slate-500 font-medium max-w-md">{eventSettings.events_subtitle || 'החודש הזה אנחנו שוברים שיאים. האירועים שלכם הופכים לרגעים בלתי נשכחים.'}</p>
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-200" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8" />
              <circle className="text-primary" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.59" strokeDashoffset={301.59 * (1 - confirmedCount / (confirmedCount + 8))} strokeLinecap="round" strokeWidth="10" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{confirmedCount}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">מתוך {confirmedCount + 8}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">אירועים שנסגרו החודש</p>
            <p className="text-xl font-black text-primary">{Math.round((confirmedCount / (confirmedCount + 8)) * 100)}% ביצוע יעדים</p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <Music className="absolute bottom-4 left-40 w-10 h-10 -rotate-12" />
          <Music className="absolute top-10 left-1/2 w-12 h-12" />
        </div>
      </div>

      {/* Summary Cards */}
      {(() => {
        const visibleStats = eventSettings.visible_stats || ['events_this_month'];
        const statCards = [
          { key: 'events_this_month', label: eventSettings.stat_events_this_month_label || 'אירועים החודש', value: thisMonth.length, icon: <Calendar className="w-6 h-6" />, iconBg: 'bg-primary/10 text-primary', badge: `${confirmedCount} מאושרים`, badgeColor: 'text-emerald-500 bg-emerald-500/10', href: createPageUrl('Events?thisMonth=true') },
        ].filter(s => visibleStats.includes(s.key));
        const cols = statCards.length <= 2 ? 'lg:grid-cols-2' : statCards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
        return statCards.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${cols} gap-6`}>
            {statCards.map(s => (
              <Link key={s.key} to={s.href} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.iconBg}`}>{s.icon}</div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">{s.label}</p>
                <h3 className="text-3xl font-extrabold mt-1">{s.value}</h3>
              </Link>
            ))}
          </div>
        ) : null;
      })()}

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('table')}
                className={`px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-4 h-4" />תצוגת רשימה
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid className="w-4 h-4" />תצוגת כרטיסים
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <button onClick={() => { setFilterType('ALL'); setFilterThisMonth(false); }} className={`text-sm font-black pb-1 ${filterType === 'ALL' && !filterThisMonth ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>כל האירועים</button>
              {filterThisMonth && <button onClick={() => setFilterThisMonth(false)} className="text-sm font-black pb-1 text-primary border-b-2 border-primary flex items-center gap-1">החודש ✕</button>}
              <button onClick={() => setFilterType('חתונה')} className={`text-sm font-bold pb-1 ${filterType === 'חתונה' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>חתונות</button>
              <button onClick={() => setFilterType('אירוע חברה')} className={`text-sm font-bold pb-1 ${filterType === 'אירוע חברה' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>אירועי חברה</button>
              <button onClick={() => setFilterType('יום הולדת')} className={`text-sm font-bold pb-1 ${filterType === 'יום הולדת' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>מסיבות</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pr-10 w-64 bg-slate-50 border-slate-200" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />סינון מתקדם
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />ייצוא
            </Button>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="flex items-center gap-2 font-bold">
                <Trash2 className="w-4 h-4" />מחק {selected.size} נבחרים
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              <Plus className="w-4 h-4 ml-2" />אירוע חדש
            </Button>
          </div>
        </div>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
            {filteredEvents.map(event => {
              const customerName = getContactName(event.contact_id, contacts);
              const dj = djs.find(d => d.id === event.dj_id);
              const isCancelled = event.event_status === 'CANCELLED';
              const hasDjSkitza = isEventDjLead(event, contacts);
              const hasSkitzaPackage = isEventSkitzaPackage(event, contacts);
              const isAdmin = currentUser?.role === 'admin';
              return (
                <div key={event.id}
                  onClick={() => openEdit(event)}
                  className={`bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative cursor-pointer hover:shadow-md transition-all ${isCancelled ? 'opacity-60' : ''} ${selected.has(event.id) ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <div className="absolute top-6 right-6" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(event.id)} onCheckedChange={() => toggleSelect(event.id)} />
                  </div>
                  <div className="mb-3 pr-8">
                    <h4 className={`text-xl font-black text-slate-900 ${isCancelled ? 'line-through' : ''}`}>{event.event_type}</h4>
                    <p className="text-sm font-bold text-slate-400">{customerName} {event.location ? `• ${event.location}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${getStatusColor(event.event_status)}`}>
                      {STATUS_LABELS[event.event_status]}
                    </span>
                    {hasDjSkitza && <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-violet-100 text-violet-700 flex items-center gap-1"><Music className="w-3 h-3" />DJ סקיצה</span>}
                    {hasSkitzaPackage && <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-orange-100 text-orange-600 flex items-center gap-1"><Sparkles className="w-3 h-3" />חבילת סקיצה</span>}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm font-bold">{new Date(event.event_date).toLocaleDateString('he-IL')}</span>
                    </div>
                    {isAdmin && event.price_total > 0 && (
                      <div className="flex items-center gap-2 text-slate-900 font-black">
                        <span>₪{event.price_total?.toLocaleString()}</span>
                      </div>
                    )}
                    {dj && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Music className="w-5 h-5" />
                        <span className="text-sm font-bold">{dj.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="col-span-full bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
                אין אירועים התואמים את הסינון
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-sm font-bold uppercase tracking-wider">
                  <th className="px-4 py-5 border-b border-slate-100"><Checkbox checked={selected.size === filteredEvents.length && filteredEvents.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="px-8 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">פרטי האירוע</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">תאריך</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">לקוח</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">ספק מוביל</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">מחיר</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
                  <th className="px-8 py-5 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-slate-500 py-10">אין אירועים התואמים את הסינון</td></tr>
                )}
                {filteredEvents.map(event => {
                  const customerName = getContactName(event.contact_id, contacts);
                  const dj = djs.find(d => d.id === event.dj_id);
                  const isCancelled = event.event_status === 'CANCELLED';
                  const hasDjSkitza = isEventDjLead(event, contacts);
                  const hasSkitzaPackage = isEventSkitzaPackage(event, contacts);
                  const isAdmin = currentUser?.role === 'admin';
                  const eventDate = new Date(event.event_date);
                  const dayName = eventDate.toLocaleDateString('he-IL', { weekday: 'long' });
                  
                  return (
                    <tr key={event.id} 
                      onClick={() => openEdit(event)}
                      className={`hover:bg-slate-50/50 transition-all group cursor-pointer ${isCancelled ? 'opacity-50' : ''} ${selected.has(event.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-6" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(event.id)} onCheckedChange={() => toggleSelect(event.id)} />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCancelled ? 'bg-red-50' : 'bg-orange-50'}`}>
                            {isCancelled ? (
                              <span className="text-red-500 text-xl">✕</span>
                            ) : (
                              <Calendar className="text-primary w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className={`font-black text-slate-900 ${isCancelled ? 'line-through' : ''}`}>{event.event_type}</p>
                            <p className="text-[10px] font-bold text-slate-400">{customerName} {event.location ? `• ${event.location}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700">{eventDate.toLocaleDateString('he-IL')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{dayName}</p>
                      </td>
                      <td className="px-6 py-6" onClick={e => e.stopPropagation()}>
                        {event.contact_id ? (
                          <Link to={createPageUrl(`Customers?status=${(() => { const c = contacts.find(x => x.id === event.contact_id); return c?.status || 'DEAL_CLOSED'; })()}`)} className="text-sm font-black text-primary hover:underline">
                            {customerName}
                          </Link>
                        ) : (
                          <span className="text-sm font-black text-slate-700">{customerName}</span>
                        )}
                      </td>
                      <td className="px-6 py-6 text-sm font-bold text-slate-600">
                        <span className="flex items-center gap-1.5">
                          {hasDjSkitza && <span className="w-5 h-5 rounded-full bg-violet-100 inline-flex items-center justify-center flex-shrink-0" title="DJ סקיצה"><Music className="w-3 h-3 text-violet-600" /></span>}
                          {hasSkitzaPackage && <span className="w-5 h-5 rounded-full bg-orange-100 inline-flex items-center justify-center flex-shrink-0" title="חבילת סקיצה"><Sparkles className="w-3 h-3 text-orange-500" /></span>}
                          {hasDjSkitza ? (dj?.name || <span className="italic text-slate-400">טרם שובץ</span>) : <span className="italic text-slate-400">ללא DJ סקיצה</span>}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        {isAdmin ? <span className="text-base font-black text-slate-900">₪{event.price_total?.toLocaleString()}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${getStatusColor(event.event_status)}`}>
                          {STATUS_LABELS[event.event_status]}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); openEdit(event); }} className="p-2 text-slate-300 hover:text-primary transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">מציג 1-{Math.min(filteredEvents.length, 10)} מתוך {filteredEvents.length} אירועים</p>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
              ❮
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">3</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
              ❯
            </button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{eventSettings.edit_dialog_title || 'עריכת אירוע'}</DialogTitle></DialogHeader>
          {(() => {
            const visFields = eventSettings.edit_visible_fields || ['customer_id','event_date','event_type','package_id','location','event_status','payment_status','dj_id','last_payment_method','notes'];
            const fl = eventSettings.field_labels || {};
            const fieldMap = {
              contact_id: () => <div className="col-span-2" key="contact_id"><Label>{fl.customer_id || 'איש קשר'}</Label><Input value={getContactName(editData.contact_id, contacts)} disabled className="bg-slate-50" /></div>,
              event_type: () => <div key="event_type"><Label>{fl.event_type || 'סוג אירוע'}</Label><Select value={editData.event_type || ''} onValueChange={v => setEditData({...editData, event_type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['בר מצווה','בת מצווה','חתונה','יום הולדת','אירוע פרטי','אירוע חברה','אחר'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>,
              package_id: () => (
                <React.Fragment key="package_id">
                  <div><Label>{fl.package_id || 'חבילה'}</Label><Select value={editData.package_id || ''} onValueChange={v => setEditData({...editData, package_id: v})}><SelectTrigger><SelectValue placeholder="בחר חבילה" /></SelectTrigger><SelectContent>{packages.filter(p => p.item_type === 'PACKAGE').map(p => <SelectItem key={p.id} value={p.id}>{p.item_name} - ₪{p.price}</SelectItem>)}</SelectContent></Select></div>
                  <AddonSelector packages={packages} selectedAddonIds={editData.addon_ids || []} onChange={ids => setEditData({...editData, addon_ids: ids})} />
                  <PriceSummary packages={packages} packageId={editData.package_id} addonIds={editData.addon_ids} depositPercent={depositPercent} data={editData} onChange={updates => setEditData(prev => ({...prev, ...updates}))} isAdmin={currentUser?.role === 'admin'} />
                </React.Fragment>
              ),
              event_date: () => <div key="event_date"><Label>{fl.event_date || 'תאריך'}</Label><Input type="date" value={editData.event_date || ''} onChange={e => setEditData({...editData, event_date: e.target.value})} /></div>,
              location: () => <div key="location"><Label>{fl.location || 'מיקום'}</Label><Input value={editData.location || ''} onChange={e => setEditData({...editData, location: e.target.value})} /></div>,
              event_status: () => <div key="event_status"><Label>{fl.event_status || 'סטטוס אירוע'}</Label><Select value={editData.event_status || ''} onValueChange={v => setEditData({...editData, event_status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>,
              payment_status: () => <div key="payment_status"><Label>{fl.payment_status || 'סטטוס תשלום'}</Label><Select value={editData.payment_status || ''} onValueChange={v => handlePaymentStatusChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PAYMENT_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>,
              dj_id: () => {
                const eventContact = contacts.find(c => c.id === editData.contact_id);
                const hasDjSkitza = eventContact?.is_dj_lead === true;
                if (!hasDjSkitza) {
                  return (
                    <div key="dj_id" className="col-span-2">
                      <Label>{fl.dj_id || 'DJ'}</Label>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-500 border border-slate-200">
                        <Music className="w-4 h-4" />
                        <span>שיבוץ DJ זמין רק לאירועים עם DJ סקיצה</span>
                      </div>
                    </div>
                  );
                }
                const selectedDj = djs.find(d => d.id === editData.dj_id);
                const eventDate = editData.event_date;
                const isUnavailable = selectedDj && eventDate && selectedDj.unavailable_dates?.includes(eventDate);
                return (
                  <div key="dj_id" className="col-span-2">
                    <Label>{fl.dj_id || 'DJ'} <span className="text-xs text-violet-600 font-bold mr-1">🎵 DJ סקיצה</span></Label>
                    <Select value={editData.dj_id || '__none__'} onValueChange={v => setEditData({...editData, dj_id: v === '__none__' ? '' : v})}>
                      <SelectTrigger><SelectValue placeholder="בחר DJ" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">ללא</SelectItem>
                        {djs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedDj && eventDate && (
                      isUnavailable ? (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span><strong>{selectedDj.name}</strong> סימן/ה את התאריך {new Date(eventDate).toLocaleDateString('he-IL')} כלא זמין. ניתן לשבץ בכל זאת.</span>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span><strong>{selectedDj.name}</strong> זמין/ה בתאריך {new Date(eventDate).toLocaleDateString('he-IL')}</span>
                        </div>
                      )
                    )}
                  </div>
                );
              },
              last_payment_method: () => <div key="last_payment_method"><Label>{fl.last_payment_method || 'אמצעי תשלום'}</Label><Select value={editData.last_payment_method || ''} onValueChange={v => setEditData({...editData, last_payment_method: v})}><SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger><SelectContent>{['העברה','מזומן','ביט','פייבוקס','צ׳ק'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>,
              notes: () => <div className="col-span-2" key="notes"><Label>{fl.notes || 'הערות'}</Label><Textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} /></div>,
            };
            return (
              <div className="grid grid-cols-2 gap-4 mt-2">
                {visFields.map(f => fieldMap[f]?.())}
                <div className="col-span-2 flex gap-2">
                  <Button onClick={saveEdit} className="flex-1 font-bold text-white" style={{ backgroundColor: PRIMARY }}>שמור שינויים</Button>
                  <Button variant="destructive" onClick={() => { setEditOpen(false); deleteEvent(editData.id); }} className="font-bold"><Trash2 className="w-4 h-4 ml-1" />מחק</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>{eventSettings.create_dialog_title || 'אירוע חדש'}</DialogTitle></DialogHeader>
          {(() => {
            const visFields = eventSettings.create_visible_fields || ['customer_id','event_date','event_type','package_id','location'];
            const fl = eventSettings.field_labels || {};
            const customerContacts = contacts.filter(c => c.contact_type === 'customer' || ['DEAL_CLOSED','PAID_FULL','WAITING_PAYMENT'].includes(c.status));
            const allOptions = customerContacts.map(c => ({ id: c.id, name: c.contact_name }));
            const createFieldMap = {
              customer_id: () => (
                <div className="col-span-2" key="contact_id">
                  <Label>{fl.customer_id || 'איש קשר'} *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={newEvent.contact_id || ''} onValueChange={v => {
                        const contact = contacts.find(c => c.id === v);
                        const updatedEvent = { ...newEvent, contact_id: v };
                        if (contact?.event_date) updatedEvent.event_date = contact.event_date;
                        setNewEvent(updatedEvent);
                      }}>
                        <SelectTrigger><SelectValue placeholder={allOptions.length === 0 ? "אין אנשי קשר - צור חדש" : "בחר איש קשר"} /></SelectTrigger>
                        <SelectContent>{allOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setNewCustomerOpen(true)} className="flex-shrink-0"><Plus className="w-4 h-4 ml-1" />איש קשר חדש</Button>
                  </div>
                </div>
              ),
              event_date: () => <div key="event_date"><Label>{fl.event_date || 'תאריך'} *</Label><Input type="date" value={newEvent.event_date || ''} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} /></div>,
              event_type: () => <div key="event_type"><Label>{fl.event_type || 'סוג אירוע'} *</Label><Select value={newEvent.event_type || ''} onValueChange={v => setNewEvent({...newEvent, event_type: v})}><SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger><SelectContent>{['בר מצווה','בת מצווה','חתונה','יום הולדת','אירוע פרטי','אירוע חברה'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>,
              package_id: () => (
                <React.Fragment key="package_id">
                  <div><Label>{fl.package_id || 'חבילה'} *</Label><Select value={newEvent.package_id || ''} onValueChange={v => setNewEvent({...newEvent, package_id: v})}><SelectTrigger><SelectValue placeholder="בחר חבילה" /></SelectTrigger><SelectContent>{packages.filter(p => p.item_type === 'PACKAGE').map(p => <SelectItem key={p.id} value={p.id}>{p.item_name} - ₪{p.price}</SelectItem>)}</SelectContent></Select></div>
                  <AddonSelector packages={packages} selectedAddonIds={newEvent.addon_ids || []} onChange={ids => setNewEvent({...newEvent, addon_ids: ids})} />
                  <PriceSummary packages={packages} packageId={newEvent.package_id} addonIds={newEvent.addon_ids} depositPercent={depositPercent} data={newEvent} onChange={updates => setNewEvent(prev => ({...prev, ...updates}))} isAdmin={currentUser?.role === 'admin'} />
                </React.Fragment>
              ),
              location: () => <div className="col-span-2" key="location"><Label>{fl.location || 'מיקום'}</Label><Input value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} /></div>,
              notes: () => <div className="col-span-2" key="notes"><Label>{fl.notes || 'הערות'}</Label><Textarea value={newEvent.notes || ''} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} /></div>,
            };
            return (
              <div className="grid grid-cols-2 gap-4 mt-2">
                {visFields.map(f => createFieldMap[f]?.())}
                <div className="col-span-2"><Button onClick={createEvent} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>צור אירוע</Button></div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        open={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPendingPaymentStatus(null); }}
        onConfirm={confirmPaymentMethod}
        newStatus={pendingPaymentStatus}
      />

      {/* New Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>איש קשר חדש</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>שם *</Label>
              <Input value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="שם מלא" />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="050-1234567" />
            </div>
            <div>
              <Label>אימייל *</Label>
              <Input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="example@email.com" />
            </div>
            <Button onClick={createCustomer} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              צור איש קשר
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}