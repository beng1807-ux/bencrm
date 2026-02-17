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
import { Plus, Search, Calendar, Phone, Mail, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

const COLUMNS = [
  { key: 'NEW',             label: 'חדש',              dot: 'bg-blue-500',    phase: 'lead' },
  { key: 'FIRST_CONTACT',   label: 'נוצר קשר',         dot: 'bg-amber-500',   phase: 'lead' },
  { key: 'QUOTE_SENT',      label: 'נשלחה הצעה',       dot: 'bg-purple-500',  phase: 'lead' },
  { key: 'DEAL_CLOSED',     label: 'נסגרה עסקה',       dot: 'bg-orange-500',  phase: 'customer', highlight: true },
  { key: 'WAITING_PAYMENT', label: 'ממתין לתשלום',     dot: 'bg-yellow-500',  phase: 'customer' },
  { key: 'DEPOSIT_PAID',    label: 'שולמה מקדמה',      dot: 'bg-emerald-600', phase: 'customer' },
  { key: 'PAID_FULL',       label: 'שולם במלואו',      dot: 'bg-green-600',   phase: 'customer' },
  { key: 'EVENT_DONE',      label: 'האירוע בוצע',      dot: 'bg-gray-400',    phase: 'customer' },
];

const EVENT_TYPE_ICONS = {
  'חתונה': '💍',
  'בר מצווה': '✡️',
  'בת מצווה': '✡️',
  'יום הולדת': '🎂',
  'אירוע פרטי': '🎉',
  'אירוע חברה': '🏢',
  'אחר': '📌',
};

function CustomerCard({ lead, colKey, onClick }) {
  const isActive = ['DEAL_CLOSED', 'WAITING_PAYMENT', 'DEPOSIT_PAID', 'PAID_FULL'].includes(colKey);
  const isDepositPaid = ['DEPOSIT_PAID', 'PAID_FULL'].includes(colKey);
  const icon = EVENT_TYPE_ICONS[lead.event_type] || '📌';

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md group
        ${isDepositPaid ? 'border-r-4 border-emerald-500' : isActive ? 'border-r-4 border-orange-400' : 'border border-transparent hover:border-orange-300'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-800 text-sm group-hover:text-orange-500 transition-colors leading-tight">
          {lead.contact_name}
          {lead.celebrant_name ? ` — ${lead.celebrant_name}` : ''}
        </h4>
        {lead.guests_count > 150 && (
          <span className="text-[10px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-bold border border-orange-200">VIP</span>
        )}
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
        <span>{icon}</span>
        {lead.event_type}
      </p>

      {isDepositPaid && (
        <p className="text-xs text-emerald-600 font-semibold mb-2">✓ מקדמה התקבלה</p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Calendar className="w-3 h-3" />
          {lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '—'}
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Phone className="w-3 h-3" />
          {lead.phone}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState('ALL');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
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

  const activeColumns = phaseFilter === 'ALL'
    ? COLUMNS
    : COLUMNS.filter(c => c.phase === phaseFilter);

  const filteredLeads = leads.filter(l => {
    const matchSearch = !searchTerm ||
      l.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm) ||
      l.celebrant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterEventType === 'ALL' || l.event_type === filterEventType;
    return matchSearch && matchType && l.status !== 'CANCELLED';
  });

  const leadsForColumn = (key) => filteredLeads.filter(l => l.status === key);

  const totalLeads = filteredLeads.filter(l => ['NEW','FIRST_CONTACT','QUOTE_SENT'].includes(l.status)).length;
  const totalCustomers = filteredLeads.filter(l => ['DEAL_CLOSED','WAITING_PAYMENT','DEPOSIT_PAID','PAID_FULL','EVENT_DONE'].includes(l.status)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>

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

      {/* Mini stats */}
      <div className="flex gap-4">
        <div className="bg-white border rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-sm font-bold text-[#886c63]">לידים פעילים</span>
          <span className="text-xl font-black text-[#181311]">{totalLeads}</span>
        </div>
        <div className="bg-white border rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          <span className="text-sm font-bold text-[#886c63]">לקוחות פעילים</span>
          <span className="text-xl font-black text-[#181311]">{totalCustomers}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pr-9 w-56 bg-white text-sm"
            placeholder="חיפוש..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterEventType} onValueChange={setFilterEventType}>
          <SelectTrigger className="w-44 bg-white text-sm font-medium border border-gray-200 shadow-sm">
            <Filter className="w-3.5 h-3.5 ml-1 text-gray-500" />
            <SelectValue placeholder="סוג אירוע" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">כל האירועים</SelectItem>
            <SelectItem value="חתונה">חתונה</SelectItem>
            <SelectItem value="בר מצווה">בר מצווה</SelectItem>
            <SelectItem value="בת מצווה">בת מצווה</SelectItem>
            <SelectItem value="יום הולדת">יום הולדת</SelectItem>
            <SelectItem value="אירוע פרטי">אירוע פרטי</SelectItem>
            <SelectItem value="אירוע חברה">אירוע חברה</SelectItem>
            <SelectItem value="אחר">אחר</SelectItem>
          </SelectContent>
        </Select>
        {/* Phase toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm text-sm">
          {[['ALL','הכל'],['lead','לידים'],['customer','לקוחות']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPhaseFilter(val)}
              className={`px-4 py-2 font-bold transition-colors ${phaseFilter === val ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={phaseFilter === val ? { backgroundColor: PRIMARY } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Phase separator label */}
      {phaseFilter === 'ALL' && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-bold">← שלבי ליד → שלבי לקוח →</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-5 overflow-x-auto pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
        {activeColumns.map((col, idx) => {
          const colLeads = leadsForColumn(col.key);
          const isFirst = phaseFilter === 'ALL' && col.key === 'DEAL_CLOSED';
          return (
            <React.Fragment key={col.key}>
              {isFirst && (
                <div className="flex-shrink-0 flex items-start pt-8">
                  <div className="h-full border-l-2 border-dashed border-orange-300 mx-1" style={{ minHeight: 400 }} />
                </div>
              )}
              <div className="flex-shrink-0 w-72 flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="font-bold text-gray-800 text-sm">{col.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${col.phase === 'customer' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                    {colLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3 min-h-[400px]">
                  {colLeads.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center opacity-40">
                      <span className="text-xs text-gray-400">ריק</span>
                    </div>
                  )}
                  {colLeads.map(lead => (
                    <CustomerCard key={lead.id} lead={lead} colKey={col.key} onClick={() => openDetails(lead)} />
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Details Dialog */}
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

                <TabsContent value="info" className="space-y-5 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-gray-400">טלפון</Label>
                      <p className="font-bold text-gray-800">{selectedLead.phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">אימייל</Label>
                      <p className="font-bold text-gray-800">{selectedLead.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">תאריך אירוע</Label>
                      <p className="font-bold text-gray-800">{selectedLead.event_date ? new Date(selectedLead.event_date).toLocaleDateString('he-IL') : '—'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">סוג אירוע</Label>
                      <p className="font-bold text-gray-800">{selectedLead.event_type}</p>
                    </div>
                    {selectedLead.celebrant_name && (
                      <div>
                        <Label className="text-xs text-gray-400">שם החוגג/ת</Label>
                        <p className="font-bold text-gray-800">{selectedLead.celebrant_name}</p>
                      </div>
                    )}
                    {selectedLead.guests_count && (
                      <div>
                        <Label className="text-xs text-gray-400">מוזמנים</Label>
                        <p className="font-bold text-gray-800">{selectedLead.guests_count}</p>
                      </div>
                    )}
                  </div>

                  {selectedLead.event_contents?.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">תכני אירוע</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.event_contents.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                      </div>
                    </div>
                  )}

                  {selectedLead.expectations && (
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">ציפיות</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.expectations}</p>
                    </div>
                  )}

                  {selectedLead.special_requests && (
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">בקשות מיוחדות</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.special_requests}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <Label className="text-xs text-gray-400 mb-2 block">עדכן סטטוס</Label>
                    <Select value={selectedLead.status} onValueChange={v => updateStatus(selectedLead.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                        <SelectItem value="CANCELLED">בוטל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="destructive" onClick={() => deleteLead(selectedLead.id)} className="w-full">
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק
                  </Button>
                </TabsContent>

                <TabsContent value="events">
                  <div className="space-y-3 mt-3">
                    {leadEvents.map(event => (
                      <div key={event.id} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">{event.event_type}</p>
                          <p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString('he-IL')}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm" style={{ color: PRIMARY }}>₪{event.price_total?.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{event.payment_status}</p>
                        </div>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף ליד / לקוח חדש</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label>שם איש קשר *</Label>
              <Input value={newLead.contact_name || ''} onChange={e => setNewLead({...newLead, contact_name: e.target.value})} />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={newLead.phone || ''} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
            </div>
            <div>
              <Label>אימייל *</Label>
              <Input type="email" value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} />
            </div>
            <div>
              <Label>תאריך אירוע *</Label>
              <Input type="date" value={newLead.event_date || ''} onChange={e => setNewLead({...newLead, event_date: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>סוג אירוע *</Label>
              <Select value={newLead.event_type || ''} onValueChange={v => setNewLead({...newLead, event_type: v})}>
                <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="בר מצווה">בר מצווה</SelectItem>
                  <SelectItem value="בת מצווה">בת מצווה</SelectItem>
                  <SelectItem value="חתונה">חתונה</SelectItem>
                  <SelectItem value="יום הולדת">יום הולדת</SelectItem>
                  <SelectItem value="אירוע פרטי">אירוע פרטי</SelectItem>
                  <SelectItem value="אירוע חברה">אירוע חברה</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Button onClick={createLead} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>
                צור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}