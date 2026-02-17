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
import { Calendar, DollarSign, FileText, User, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import ViewToggle from '@/components/shared/ViewToggle';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

const STATUS_LABELS = { PENDING: 'ממתין', CONFIRMED: 'מאושר', IN_PROGRESS: 'בתהליך', COMPLETED: 'הושלם', CANCELLED: 'בוטל' };
const PAYMENT_LABELS = { PENDING: 'ממתין לתשלום', DEPOSIT_PAID: 'שולמה מקדמה', PAID_FULL: 'שולם במלואו' };

const getStatusColor = (s) => ({ PENDING:'bg-gray-100 text-gray-700', CONFIRMED:'bg-blue-100 text-blue-700', IN_PROGRESS:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700' }[s] || 'bg-gray-100 text-gray-700');
const getPaymentColor = (s) => ({ PENDING:'bg-red-100 text-red-700', DEPOSIT_PAID:'bg-yellow-100 text-yellow-700', PAID_FULL:'bg-green-100 text-green-700' }[s] || 'bg-gray-100 text-gray-700');

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

  useEffect(() => { loadData(); }, []);

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#181311] tracking-tight">אירועים</h1>
          <p className="mt-1 font-medium text-[#886c63] text-sm">ניהול אירועים ותשלומים</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold px-5 text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4 ml-2" />אירוע חדש
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            <Trash2 className="w-4 h-4 ml-1" />מחק {selected.size} נבחרים
          </Button>
        )}
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4">
          {events.map(event => {
            const customer = customers.find(c => c.id === event.customer_id);
            const dj = djs.find(d => d.id === event.dj_id);
            const isSelected = selected.has(event.id);
            return (
              <div key={event.id}
                className={`bg-white p-4 rounded-xl shadow-sm border transition-all hover:shadow-md
                  ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-[#e5dedc] hover:border-primary/20'}`}
                onClick={() => openEdit(event)}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} onClick={e => toggleSelect(event.id, e)} className="mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-[#181311]">{event.event_type}</h3>
                      <Badge className={getStatusColor(event.event_status)}>{STATUS_LABELS[event.event_status] || event.event_status}</Badge>
                      <Badge className={getPaymentColor(event.payment_status)}>{PAYMENT_LABELS[event.payment_status] || event.payment_status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[#886c63]">
                      <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{customer?.name || '—'}</div>
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString('he-IL')}</div>
                      {event.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</div>}
                      {dj && <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />DJ: {dj.name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: PRIMARY }}>₪{event.price_total?.toLocaleString()}</p>
                    <button onClick={e => openEdit(event, e)} className="p-1.5 text-[#886c63] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={e => deleteEvent(event.id, e)} className="p-1.5 text-[#886c63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {events.length === 0 && <div className="bg-white rounded-xl p-12 text-center text-[#886c63] border border-[#e5dedc]">אין אירועים במערכת</div>}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e5dedc]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5dedc] bg-[#f8f6f6] text-[#886c63] text-xs font-bold">
                <th className="px-4 py-3"><Checkbox checked={selected.size === events.length && events.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="text-right px-4 py-3">לקוח</th>
                <th className="text-right px-4 py-3">סוג אירוע</th>
                <th className="text-right px-4 py-3">תאריך</th>
                <th className="text-right px-4 py-3">מחיר</th>
                <th className="text-right px-4 py-3">סטטוס</th>
                <th className="text-right px-4 py-3">תשלום</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && <tr><td colSpan={8} className="text-center text-[#886c63] py-10">אין אירועים</td></tr>}
              {events.map(event => {
                const customer = customers.find(c => c.id === event.customer_id);
                const isSelected = selected.has(event.id);
                return (
                  <tr key={event.id} className={`border-b border-[#e5dedc]/50 hover:bg-primary/5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => openEdit(event)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(event.id, { stopPropagation: () => {} })} /></td>
                    <td className="px-4 py-3 font-bold text-[#181311]">{customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-[#886c63]">{event.event_type}</td>
                    <td className="px-4 py-3 text-[#886c63]">{new Date(event.event_date).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: PRIMARY }}>₪{event.price_total?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge className={getStatusColor(event.event_status)}>{STATUS_LABELS[event.event_status]}</Badge></td>
                    <td className="px-4 py-3"><Badge className={getPaymentColor(event.payment_status)}>{PAYMENT_LABELS[event.payment_status]}</Badge></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={e => openEdit(event, e)} className="p-1.5 text-[#886c63] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={e => deleteEvent(event.id, e)} className="p-1.5 text-[#886c63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
            <div>
              <Label>לקוח *</Label>
              <Select value={newEvent.customer_id || ''} onValueChange={v => setNewEvent({...newEvent, customer_id: v})}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
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
    </div>
  );
}