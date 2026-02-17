import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Calendar, Phone, Mail, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { key: 'NEW',             label: 'חדש',            dot: 'bg-blue-500' },
  { key: 'FIRST_CONTACT',   label: 'נוצר קשר',       dot: 'bg-amber-500' },
  { key: 'QUOTE_SENT',      label: 'נשלחה הצעה',     dot: 'bg-purple-500' },
  { key: 'WAITING_PAYMENT', label: 'ממתין לתשלום',   dot: 'bg-orange-400' },
  { key: 'DEPOSIT_PAID',    label: 'שולמה מקדמה',    dot: 'bg-emerald-600', countClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'PAID_FULL',       label: 'שולם במלואו',    dot: 'bg-green-600' },
  { key: 'EVENT_DONE',      label: 'האירוע בוצע',    dot: 'bg-gray-400' },
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

function LeadCard({ lead, colKey, onClick }) {
  const isDepositPaid = colKey === 'DEPOSIT_PAID' || colKey === 'PAID_FULL';
  const icon = EVENT_TYPE_ICONS[lead.event_type] || '📌';

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer transition-all hover:shadow-md group
        ${isDepositPaid ? 'border-r-4 border-emerald-500' : 'border border-transparent hover:border-orange-300'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-800 text-sm group-hover:text-orange-500 transition-colors leading-tight">
          {lead.contact_name}
          {lead.celebrant_name ? ` - ${lead.celebrant_name}` : ''}
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
        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mb-2">
          ✓ מקדמה התקבלה
        </p>
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

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        {icon && <span className="text-gray-400">{icon}</span>}
        {value || '—'}
      </span>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({});

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    try {
      const data = await base44.entities.Lead.list('-created_date');
      setLeads(data);
    } catch {
      toast.error('שגיאה בטעינת לידים');
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      if (newStatus === 'CANCELLED') {
        const reason = prompt('סיבת ביטול:');
        if (!reason) return;
        await base44.entities.Lead.update(leadId, { status: newStatus, lost_reason: reason });
      } else {
        await base44.entities.Lead.update(leadId, { status: newStatus });
      }
      await loadLeads();
      toast.success('הסטטוס עודכן');
      setDetailsOpen(false);
    } catch {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הליד?')) return;
    try {
      await base44.entities.Lead.delete(leadId);
      await loadLeads();
      toast.success('הליד נמחק');
      setDetailsOpen(false);
    } catch {
      toast.error('שגיאה במחיקת הליד');
    }
  };

  const createLead = async () => {
    try {
      await base44.entities.Lead.create({ ...newLead, status: 'NEW' });
      await loadLeads();
      toast.success('ליד חדש נוצר בהצלחה');
      setCreateOpen(false);
      setNewLead({});
    } catch {
      toast.error('שגיאה ביצירת הליד');
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

  const leadsForColumn = (key) => filteredLeads.filter(l => l.status === key);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#181311] tracking-tight">לידים</h1>
          <p className="mt-1 font-medium text-[#886c63] text-sm">נהל ועקוב אחר הלידים שלך לאורך שלבי המכירה</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 font-bold px-5">
          <Plus className="w-4 h-4 ml-2" />
          ליד חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pr-9 w-60 bg-white text-sm"
            placeholder="חיפוש ליד..."
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
            <SelectItem value="ALL">כל סוגי האירועים</SelectItem>
            <SelectItem value="חתונה">חתונה</SelectItem>
            <SelectItem value="בר מצווה">בר מצווה</SelectItem>
            <SelectItem value="בת מצווה">בת מצווה</SelectItem>
            <SelectItem value="יום הולדת">יום הולדת</SelectItem>
            <SelectItem value="אירוע פרטי">אירוע פרטי</SelectItem>
            <SelectItem value="אירוע חברה">אירוע חברה</SelectItem>
            <SelectItem value="אחר">אחר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div
        className="flex gap-5 overflow-x-auto pb-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}
      >
        {COLUMNS.map(col => {
          const colLeads = leadsForColumn(col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-72 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="font-bold text-gray-800 text-sm">{col.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${col.countClass || 'bg-gray-100 text-gray-500'}`}>
                    {colLeads.length}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 min-h-[400px]">
                {colLeads.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center opacity-40">
                    <span className="text-xs text-gray-400">אין לידים</span>
                  </div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colKey={col.key}
                    onClick={() => { setSelectedLead(lead); setDetailsOpen(true); }}
                  />
                ))}
              </div>
            </div>
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
              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem icon={<Phone className="w-4 h-4"/>} label="טלפון" value={selectedLead.phone} />
                  <InfoItem icon={<Mail className="w-4 h-4"/>} label="אימייל" value={selectedLead.email} />
                  <InfoItem icon={<Calendar className="w-4 h-4"/>} label="תאריך אירוע" value={selectedLead.event_date ? new Date(selectedLead.event_date).toLocaleDateString('he-IL') : '—'} />
                  <InfoItem icon={<span>{EVENT_TYPE_ICONS[selectedLead.event_type] || '📌'}</span>} label="סוג אירוע" value={selectedLead.event_type} />
                  {selectedLead.celebrant_name && <InfoItem label="שם החוגג/ת" value={selectedLead.celebrant_name} />}
                  {selectedLead.guests_count && <InfoItem label="מספר מוזמנים" value={selectedLead.guests_count} />}
                </div>

                {selectedLead.event_contents?.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">תכני אירוע</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.event_contents.map(c => (
                        <Badge key={c} variant="secondary">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.expectations && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">ציפיות</Label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.expectations}</p>
                  </div>
                )}

                {selectedLead.special_requests && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">בקשות מיוחדות</Label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLead.special_requests}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500 mb-2 block">עדכן סטטוס</Label>
                  <Select value={selectedLead.status} onValueChange={v => updateLeadStatus(selectedLead.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      <SelectItem value="CANCELLED">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="destructive" onClick={() => deleteLead(selectedLead.id)} className="w-full">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק ליד
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>ליד חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
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
                  <SelectTrigger><SelectValue placeholder="בחר סוג אירוע" /></SelectTrigger>
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
            </div>
            <Button onClick={createLead} className="w-full bg-orange-500 hover:bg-orange-600 font-bold">
              צור ליד
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}