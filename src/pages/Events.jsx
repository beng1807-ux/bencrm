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
import { Calendar, TrendingUp, FileText, User, MapPin, Plus, Pencil, Trash2, Music, Search, Filter, Download, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = '#ec5b13';

const STATUS_LABELS = { PENDING: 'ממתין', CONFIRMED: 'מאושר', IN_PROGRESS: 'בתהליך', COMPLETED: 'הושלם', CANCELLED: 'בוטל' };
const PAYMENT_LABELS = { PENDING: 'ממתין לתשלום', DEPOSIT_PAID: 'שולמה מקדמה', PAID_FULL: 'שולם במלואו' };

const getStatusColor = (s) => ({ PENDING:'bg-orange-50 text-orange-500', CONFIRMED:'bg-emerald-50 text-emerald-500', IN_PROGRESS:'bg-amber-50 text-amber-500', COMPLETED:'bg-green-50 text-green-500', CANCELLED:'bg-red-50 text-red-500' }[s] || 'bg-slate-50 text-slate-500');
const getPaymentColor = (s) => ({ PENDING:'bg-red-50 text-red-500', DEPOSIT_PAID:'bg-amber-50 text-amber-500', PAID_FULL:'bg-emerald-50 text-emerald-500' }[s] || 'bg-slate-50 text-slate-500');

export default function Events() {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
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
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (createOpen) {
      loadData();
    }
  }, [createOpen]);

  const loadData = async () => {
    try {
      const [e, c, p, d] = await Promise.all([
        base44.entities.Event.list('-event_date'),
        base44.entities.Customer.list(),
        base44.entities.Package.filter({ active: true }),
        base44.entities.DJ.filter({ status: 'ACTIVE' }),
      ]);
      setEvents(e); setCustomers(c); setPackages(p); setDJs(d);
    } catch { toast.error('שגיאה בטעינת נתונים'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
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

  const saveEdit = async () => {
    const priceTotal = calculatePrice(editData.package_id, editData.addon_ids);
    const depositAmount = editData.deposit_amount || (priceTotal * 0.3);
    const balanceAmount = priceTotal - (editData.payment_status === 'DEPOSIT_PAID' ? depositAmount : editData.payment_status === 'PAID_FULL' ? priceTotal : 0);
    await base44.entities.Event.update(editData.id, { ...editData, price_total: priceTotal, deposit_amount: depositAmount, balance_amount: balanceAmount });
    await loadData();
    setEditOpen(false);
    toast.success('האירוע עודכן');
  };

  const createEvent = async () => {
    const priceTotal = calculatePrice(newEvent.package_id, newEvent.addon_ids);
    await base44.entities.Event.create({ ...newEvent, price_total: priceTotal, deposit_amount: priceTotal * 0.3, balance_amount: priceTotal, payment_status: 'PENDING', contract_status: 'DRAFT', event_status: 'PENDING' });
    await loadData();
    toast.success('אירוע חדש נוצר');
    setCreateOpen(false); setNewEvent({});
  };

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
      toast.error('יש למלא את כל השדות');
      return;
    }
    const created = await base44.entities.Customer.create(newCustomer);
    await loadData();
    setNewEvent({ ...newEvent, customer_id: created.id });
    setNewCustomerOpen(false);
    setNewCustomer({ name: '', phone: '', email: '' });
    toast.success('לקוח חדש נוצר');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  const thisMonth = events.filter(e => {
    const d = new Date(e.event_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalRevenue = thisMonth.reduce((sum, e) => sum + (e.price_total || 0), 0);
  const confirmedCount = events.filter(e => e.event_status === 'CONFIRMED').length;
  const pendingContracts = events.filter(e => e.contract_status === 'SENT' || e.contract_status === 'DRAFT').length;

  const filteredEvents = events.filter(e => {
    const matchType = filterType === 'ALL' || e.event_type === filterType;
    const matchSearch = !searchTerm || 
      e.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customers.find(c => c.id === e.customer_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-900 mb-2">חגיגה של הצלחה! 🎉</h2>
          <p className="text-slate-500 font-medium max-w-md">החודש הזה אנחנו שוברים שיאים. האירועים שלכם הופכים לרגעים בלתי נשכחים.</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">אירועים החודש</p>
          <h3 className="text-3xl font-extrabold mt-1">{thisMonth.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-1 rounded-full">בהמתנה</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">חוזים פתוחים</p>
          <h3 className="text-3xl font-extrabold mt-1">{pendingContracts}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+18%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">הכנסות החודש</p>
          <h3 className="text-3xl font-extrabold mt-1">₪{totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <span className="text-slate-500 text-xs font-bold bg-slate-500/10 px-2 py-1 rounded-full">חדש</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">לידים חדשים</p>
          <h3 className="text-3xl font-extrabold mt-1">28</h3>
        </div>
      </div>

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
              <button onClick={() => setFilterType('ALL')} className={`text-sm font-black pb-1 ${filterType === 'ALL' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>כל האירועים</button>
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
            <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              <Plus className="w-4 h-4 ml-2" />אירוע חדש
            </Button>
          </div>
        </div>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
            {filteredEvents.map(event => {
              const customer = customers.find(c => c.id === event.customer_id);
              const dj = djs.find(d => d.id === event.dj_id);
              const isCancelled = event.event_status === 'CANCELLED';
              return (
                <div key={event.id}
                  onClick={() => openEdit(event)}
                  className={`bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative cursor-pointer hover:shadow-md transition-all ${isCancelled ? 'opacity-60' : ''}`}>
                  <div className="absolute top-6 left-6">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${getStatusColor(event.event_status)}`}>
                      {STATUS_LABELS[event.event_status]}
                    </span>
                  </div>
                  <div className="mb-6 pr-8">
                    <h4 className={`text-xl font-black text-slate-900 ${isCancelled ? 'line-through' : ''}`}>{event.event_type}</h4>
                    <p className="text-sm font-bold text-slate-400">{customer?.name || 'לא משויך ללקוח'} {event.location ? `• ${event.location}` : ''}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm font-bold">{new Date(event.event_date).toLocaleDateString('he-IL')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-900 font-black">
                      <TrendingUp className="w-5 h-5" />
                      <span>₪{event.price_total?.toLocaleString()}</span>
                    </div>
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
                  <tr><td colSpan={7} className="text-center text-slate-500 py-10">אין אירועים התואמים את הסינון</td></tr>
                )}
                {filteredEvents.map(event => {
                  const customer = customers.find(c => c.id === event.customer_id);
                  const dj = djs.find(d => d.id === event.dj_id);
                  const isCancelled = event.event_status === 'CANCELLED';
                  const eventDate = new Date(event.event_date);
                  const dayName = eventDate.toLocaleDateString('he-IL', { weekday: 'long' });
                  
                  return (
                    <tr key={event.id} 
                      onClick={() => openEdit(event)}
                      className={`hover:bg-slate-50/50 transition-all group cursor-pointer ${isCancelled ? 'opacity-50' : ''}`}>
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
                            <p className="text-[10px] font-bold text-slate-400">{customer?.name || 'לא משויך'} {event.location ? `• ${event.location}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-slate-700">{eventDate.toLocaleDateString('he-IL')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{dayName}</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-sm font-black text-slate-700">{customer?.name || '—'}</span>
                      </td>
                      <td className="px-6 py-6 text-sm font-bold text-slate-600">
                        {dj?.name || <span className="italic text-slate-400">טרם נקבע</span>}
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-base font-black text-slate-900">₪{event.price_total?.toLocaleString()}</span>
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
          <DialogHeader><DialogTitle>עריכת אירוע</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div><Label>תאריך</Label><Input type="date" value={editData.event_date || ''} onChange={e => setEditData({...editData, event_date: e.target.value})} /></div>
            <div><Label>מיקום</Label><Input value={editData.location || ''} onChange={e => setEditData({...editData, location: e.target.value})} /></div>
            <div>
              <Label>סטטוס אירוע</Label>
              <Select value={editData.event_status || ''} onValueChange={v => setEditData({...editData, event_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סטטוס תשלום</Label>
              <Select value={editData.payment_status || ''} onValueChange={v => setEditData({...editData, payment_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>DJ</Label>
              <Select value={editData.dj_id || ''} onValueChange={v => setEditData({...editData, dj_id: v})}>
                <SelectTrigger><SelectValue placeholder="בחר DJ" /></SelectTrigger>
                <SelectContent>{djs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>אמצעי תשלום</Label>
              <Select value={editData.last_payment_method || ''} onValueChange={v => setEditData({...editData, last_payment_method: v})}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  {['העברה','אשראי','מזומן','ביט'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>הערות</Label><Textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} /></div>
            <div className="col-span-2"><Button onClick={saveEdit} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>שמור שינויים</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>אירוע חדש</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <Label>לקוח *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={newEvent.customer_id || ''} onValueChange={v => setNewEvent({...newEvent, customer_id: v})}>
                    <SelectTrigger><SelectValue placeholder={customers.length === 0 ? "אין לקוחות - צור לקוח חדש" : "בחר לקוח"} /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={() => setNewCustomerOpen(true)} className="flex-shrink-0">
                  <Plus className="w-4 h-4 ml-1" />לקוח חדש
                </Button>
              </div>
            </div>
            <div><Label>תאריך *</Label><Input type="date" value={newEvent.event_date || ''} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} /></div>
            <div>
              <Label>סוג אירוע *</Label>
              <Select value={newEvent.event_type || ''} onValueChange={v => setNewEvent({...newEvent, event_type: v})}>
                <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                <SelectContent>
                  {['בר מצווה','בת מצווה','חתונה','יום הולדת','אירוע פרטי','אירוע חברה'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>חבילה *</Label>
              <Select value={newEvent.package_id || ''} onValueChange={v => setNewEvent({...newEvent, package_id: v})}>
                <SelectTrigger><SelectValue placeholder="בחר חבילה" /></SelectTrigger>
                <SelectContent>{packages.filter(p => p.item_type === 'PACKAGE').map(p => <SelectItem key={p.id} value={p.id}>{p.item_name} - ₪{p.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>מיקום</Label><Input value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} /></div>
            <div className="col-span-2"><Button onClick={createEvent} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>צור אירוע</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>לקוח חדש</DialogTitle></DialogHeader>
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
              צור לקוח
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}