import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Calendar, Phone, Trash2, Filter, LayoutGrid, Table, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

const LEAD_COLS = [
  { key: 'NEW',           label: 'חדש',          dot: 'bg-blue-500' },
  { key: 'FIRST_CONTACT', label: 'נוצר קשר',     dot: 'bg-amber-500' },
  { key: 'QUOTE_SENT',    label: 'נשלחה הצעה',   dot: 'bg-purple-500' },
];

const CUSTOMER_COLS = [
  { key: 'DEAL_CLOSED',     label: 'נסגרה עסקה',     dot: 'bg-orange-500' },
  { key: 'WAITING_PAYMENT', label: 'ממתין לתשלום',   dot: 'bg-yellow-500' },
  { key: 'DEPOSIT_PAID',    label: 'שולמה מקדמה',    dot: 'bg-emerald-500' },
  { key: 'PAID_FULL',       label: 'שולם במלואו',    dot: 'bg-green-600' },
  { key: 'EVENT_DONE',      label: 'האירוע בוצע',    dot: 'bg-gray-400' },
];

const ALL_COLS = [...LEAD_COLS, ...CUSTOMER_COLS];

const STATUS_LABELS = Object.fromEntries(ALL_COLS.map(c => [c.key, c.label]));
STATUS_LABELS['CANCELLED'] = 'בוטל';

const EVENT_TYPE_ICONS = {
  'חתונה':      { emoji: '❤️',  label: 'חתונה' },
  'בר מצווה':   { emoji: '✡️',  label: 'בר מצווה' },
  'בת מצווה':   { emoji: '⭐',  label: 'בת מצווה' },
  'יום הולדת':  { emoji: '🎂',  label: 'יום הולדת' },
  'אירוע פרטי': { emoji: '🎉',  label: 'אירוע פרטי' },
  'אירוע חברה': { emoji: '💼',  label: 'אירוע חברה' },
  'אחר':        { emoji: '📌',  label: 'אחר' },
};

const EVENT_TYPES = ['חתונה','בר מצווה','בת מצווה','יום הולדת','אירוע פרטי','אירוע חברה','אחר'];

// ── KanbanColumn ────────────────────────────────────────────────
function KanbanColumn({ col, leads, onCardClick, onEdit, onDelete, phase, selected, onSelect }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
        <span className="font-bold text-gray-800 text-sm truncate">{col.label}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${phase === 'customer' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
          {leads.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px]">
        {leads.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl h-14 flex items-center justify-center opacity-40">
            <span className="text-xs text-gray-400">ריק</span>
          </div>
        )}
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} colKey={col.key}
            onClick={() => onCardClick(lead)}
            onEdit={onEdit} onDelete={onDelete}
            isSelected={selected.has(lead.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ── KanbanCard ───────────────────────────────────────────────────
function KanbanCard({ lead, colKey, onClick, onEdit, onDelete, isSelected, onSelect }) {
  const isDone = colKey === 'EVENT_DONE';
  const typeInfo = EVENT_TYPE_ICONS[lead.event_type] || { emoji: '📌', label: lead.event_type };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer transition-all group
        border hover:shadow-md
        ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:border-primary/20'}
        ${isDone ? 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Checkbox checked={isSelected} onCheckedChange={() => {}} onClick={e => { e.stopPropagation(); onSelect(lead.id); }} className="flex-shrink-0" />
          <h4 className="font-bold text-[#181311] text-sm group-hover:text-primary transition-colors leading-snug truncate">
            {lead.contact_name}
            {lead.celebrant_name ? <span className="font-normal text-[#886c63]"> — {lead.celebrant_name}</span> : ''}
          </h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mr-1">
          {lead.guests_count > 150 && (
            <span className="text-[10px] bg-orange-100 text-primary font-bold px-2 py-0.5 rounded-full">VIP</span>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit(lead); }} className="p-1 text-[#886c63] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(lead.id); }} className="p-1 text-[#886c63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-[#886c63]">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{typeInfo.emoji}</span>
          <span>{typeInfo.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ── TableView ────────────────────────────────────────────────────
function TableView({ leads, onRowClick, phaseFilter }) {
  const filtered = phaseFilter === 'lead'
    ? leads.filter(l => LEAD_COLS.some(c => c.key === l.status))
    : phaseFilter === 'customer'
    ? leads.filter(l => CUSTOMER_COLS.some(c => c.key === l.status))
    : leads;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e5dedc]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e5dedc] text-[#886c63] text-xs font-bold bg-[#f8f6f6]">
            <th className="text-right px-4 py-3">שם</th>
            <th className="text-right px-4 py-3">סוג אירוע</th>
            <th className="text-right px-4 py-3">תאריך</th>
            <th className="text-right px-4 py-3">טלפון</th>
            <th className="text-right px-4 py-3">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={5} className="text-center text-[#886c63] py-10">לא נמצאו רשומות</td></tr>
          )}
          {filtered.map(lead => {
            const col = ALL_COLS.find(c => c.key === lead.status);
            const typeInfo = EVENT_TYPE_ICONS[lead.event_type] || { emoji: '📌' };
            return (
              <tr
                key={lead.id}
                onClick={() => onRowClick(lead)}
                className="border-b border-[#e5dedc]/50 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-bold text-[#181311]">
                  {lead.contact_name}
                  {lead.celebrant_name ? <span className="text-[#886c63] font-normal"> — {lead.celebrant_name}</span> : ''}
                </td>
                <td className="px-4 py-3 text-[#886c63]">{typeInfo.emoji} {lead.event_type}</td>
                <td className="px-4 py-3 text-[#886c63]">{lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '—'}</td>
                <td className="px-4 py-3 text-[#886c63]">{lead.phone}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                    ${CUSTOMER_COLS.some(c => c.key === lead.status) ? 'bg-orange-100 text-primary' : 'bg-blue-50 text-blue-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${col?.dot || 'bg-gray-400'}`} />
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Customers() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState('ALL');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({});
  const [leadEvents, setLeadEvents] = useState([]);
  const [leadMessages, setLeadMessages] = useState([]);

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    try {
      const data = await base44.entities.Lead.list('-created_date');
      setLeads(data);
    } catch {
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (lead) => {
    setSelectedLead(lead);
    setLeadEvents([]);
    setLeadMessages([]);
    setDetailsOpen(true);
    try {
      const [events, messages] = await Promise.all([
        base44.entities.Event.filter({ lead_id: lead.id }),
        base44.entities.ConversationMessage.filter({ lead_id: lead.id }, '-timestamp'),
      ]);
      setLeadEvents(events);
      setLeadMessages(messages);
    } catch {}
  };

  const updateStatus = async (leadId, newStatus) => {
    try {
      let extra = {};
      if (newStatus === 'CANCELLED') {
        const reason = prompt('סיבת ביטול:');
        if (!reason) return;
        extra = { lost_reason: reason };
      }
      await base44.entities.Lead.update(leadId, { status: newStatus, ...extra });
      await loadLeads();
      setSelectedLead(prev => ({ ...prev, status: newStatus }));
      toast.success('הסטטוס עודכן');
    } catch {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק?')) return;
    try {
      await base44.entities.Lead.delete(leadId);
      await loadLeads();
      toast.success('הרשומה נמחקה');
      setDetailsOpen(false);
    } catch {
      toast.error('שגיאה במחיקה');
    }
  };

  const createLead = async () => {
    if (!newLead.contact_name || !newLead.phone || !newLead.email || !newLead.event_date || !newLead.event_type) {
      toast.error('יש למלא את כל שדות החובה');
      return;
    }
    try {
      await base44.entities.Lead.create({ ...newLead, status: 'NEW' });
      await loadLeads();
      toast.success('נוצר בהצלחה');
      setCreateOpen(false);
      setNewLead({});
    } catch {
      toast.error('שגיאה ביצירה');
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchSearch = !searchTerm ||
      l.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm) ||
      l.celebrant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterEventType === 'ALL' || l.event_type === filterEventType;
    return matchSearch && matchType && l.status !== 'CANCELLED';
  });

  const leadPhaseLeads = filteredLeads.filter(l => LEAD_COLS.some(c => c.key === l.status));
  const customerPhaseLeads = filteredLeads.filter(l => CUSTOMER_COLS.some(c => c.key === l.status));

  const visibleLeads = phaseFilter === 'lead' ? leadPhaseLeads
    : phaseFilter === 'customer' ? customerPhaseLeads
    : filteredLeads;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#181311] tracking-tight">לקוחות</h1>
          <p className="mt-1 font-medium text-[#886c63] text-sm">מסלול מלא — מליד ועד אירוע בוצע</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold px-5 text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף חדש
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-bold text-[#886c63]">לידים</span>
          <span className="text-xl font-black text-[#181311]">{leadPhaseLeads.length}</span>
        </div>
        <div className="bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm font-bold text-[#886c63]">לקוחות פעילים</span>
          <span className="text-xl font-black text-[#181311]">{customerPhaseLeads.length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pr-9 w-52 bg-white text-sm" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-40 bg-white text-sm font-medium border border-gray-200 shadow-sm">
            <Filter className="w-3.5 h-3.5 ml-1 text-gray-500" />
            <SelectValue placeholder="סוג אירוע" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">כל האירועים</SelectItem>
            {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Phase toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm text-sm">
          {[['ALL','הכל'],['lead','לידים'],['customer','לקוחות']].map(([val, label]) => (
            <button key={val} onClick={() => setPhaseFilter(val)}
              className={`px-4 py-2 font-bold transition-colors ${phaseFilter === val ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={phaseFilter === val ? { backgroundColor: PRIMARY } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => setViewMode('kanban')}
            className={`px-3 py-2 transition-colors ${viewMode === 'kanban' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={viewMode === 'kanban' ? { backgroundColor: PRIMARY } : {}}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-2 transition-colors ${viewMode === 'table' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={viewMode === 'table' ? { backgroundColor: PRIMARY } : {}}>
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <TableView leads={filteredLeads} onRowClick={openDetails} phaseFilter={phaseFilter} />
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div className="space-y-6">

          {/* Row 1: Leads — only when not filtering by customer */}
          {phaseFilter !== 'customer' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">לידים</span>
                <div className="flex-1 h-px bg-blue-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LEAD_COLS.map(col => (
                  <KanbanColumn key={col.key} col={col} phase="lead"
                    leads={filteredLeads.filter(l => l.status === col.key)}
                    onCardClick={openDetails} />
                ))}
              </div>
            </div>
          )}

          {/* Row 2: Customers — only when not filtering by lead */}
          {phaseFilter !== 'lead' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-extrabold text-orange-500 uppercase tracking-widest">לקוחות</span>
                <div className="flex-1 h-px bg-orange-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {CUSTOMER_COLS.map(col => (
                  <KanbanColumn key={col.key} col={col} phase="customer"
                    leads={filteredLeads.filter(l => l.status === col.key)}
                    onCardClick={openDetails} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Details Dialog ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black">{selectedLead.contact_name}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">פרטים</TabsTrigger>
                  <TabsTrigger value="events">אירועים ({leadEvents.length})</TabsTrigger>
                  <TabsTrigger value="messages">הודעות ({leadMessages.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-xs text-gray-400">טלפון</Label><p className="font-bold">{selectedLead.phone}</p></div>
                    <div><Label className="text-xs text-gray-400">אימייל</Label><p className="font-bold">{selectedLead.email}</p></div>
                    <div><Label className="text-xs text-gray-400">תאריך אירוע</Label><p className="font-bold">{selectedLead.event_date ? new Date(selectedLead.event_date).toLocaleDateString('he-IL') : '—'}</p></div>
                    <div><Label className="text-xs text-gray-400">סוג אירוע</Label><p className="font-bold">{selectedLead.event_type}</p></div>
                    {selectedLead.celebrant_name && <div><Label className="text-xs text-gray-400">שם החוגג/ת</Label><p className="font-bold">{selectedLead.celebrant_name}</p></div>}
                    {selectedLead.guests_count && <div><Label className="text-xs text-gray-400">מוזמנים</Label><p className="font-bold">{selectedLead.guests_count}</p></div>}
                  </div>

                  {selectedLead.event_contents?.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">תכני אירוע</Label>
                      <div className="flex flex-wrap gap-2">{selectedLead.event_contents.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}</div>
                    </div>
                  )}

                  {selectedLead.expectations && (
                    <div><Label className="text-xs text-gray-400 mb-1 block">ציפיות</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.expectations}</p></div>
                  )}
                  {selectedLead.special_requests && (
                    <div><Label className="text-xs text-gray-400 mb-1 block">בקשות מיוחדות</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.special_requests}</p></div>
                  )}

                  <div className="border-t pt-4">
                    <Label className="text-xs text-gray-400 mb-2 block">עדכן סטטוס</Label>
                    <Select value={selectedLead.status} onValueChange={v => updateStatus(selectedLead.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_COLS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                        <SelectItem value="CANCELLED">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="destructive" onClick={() => deleteLead(selectedLead.id)} className="w-full">
                    <Trash2 className="w-4 h-4 ml-2" />מחק
                  </Button>
                </TabsContent>

                <TabsContent value="events">
                  <div className="space-y-3 mt-3">
                    {leadEvents.map(event => (
                      <div key={event.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start">
                        <div><p className="font-bold text-sm">{event.event_type}</p><p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString('he-IL')}</p></div>
                        <div className="text-left"><p className="font-bold text-sm" style={{ color: PRIMARY }}>₪{event.price_total?.toLocaleString()}</p><p className="text-xs text-gray-500">{event.payment_status}</p></div>
                      </div>
                    ))}
                    {leadEvents.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">אין אירועים עדיין</p>}
                  </div>
                </TabsContent>

                <TabsContent value="messages">
                  <div className="space-y-3 mt-3">
                    {leadMessages.map(msg => (
                      <div key={msg.id} className={`p-3 rounded-lg ${msg.sender === 'OWNER' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-gray-600">{msg.sender === 'OWNER' ? 'אני' : 'לקוח'}</span>
                          <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleString('he-IL')}</span>
                        </div>
                        <p className="text-sm">{msg.message_text}</p>
                      </div>
                    ))}
                    {leadMessages.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">אין הודעות עדיין</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>הוסף ליד / לקוח חדש</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div><Label>שם איש קשר *</Label><Input value={newLead.contact_name || ''} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} /></div>
            <div><Label>טלפון *</Label><Input value={newLead.phone || ''} onChange={e => setNewLead({...newLead, phone: e.target.value})} /></div>
            <div><Label>אימייל *</Label><Input type="email" value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} /></div>
            <div><Label>תאריך אירוע *</Label><Input type="date" value={newLead.event_date || ''} onChange={e => setNewLead({...newLead, event_date: e.target.value})} /></div>
            <div className="col-span-2">
              <Label>סוג אירוע *</Label>
              <Select value={newLead.event_type || ''} onValueChange={v => setNewLead({...newLead, event_type: v})}>
                <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Button onClick={createLead} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>צור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}