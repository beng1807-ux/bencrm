import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Phone, Mail, Calendar, Filter, Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({});

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, filterStatus, searchTerm]);

  const loadLeads = async () => {
    try {
      const data = await base44.entities.Lead.list('-created_date');
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('שגיאה בטעינת לידים');
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;
    
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(l => l.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phone?.includes(searchTerm) ||
        l.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLeads(filtered);
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
      toast.success('הסטטוס עודכן בהצלחה');
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const deleteLead = async (leadId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הליד?')) return;
    
    try {
      await base44.entities.Lead.delete(leadId);
      await loadLeads();
      toast.success('הליד נמחק בהצלחה');
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('שגיאה במחיקת הליד');
    }
  };

  const createLead = async () => {
    try {
      await base44.entities.Lead.create(newLead);
      await loadLeads();
      toast.success('ליד חדש נוצר בהצלחה');
      setCreateOpen(false);
      setNewLead({});
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('שגיאה ביצירת הליד');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'NEW': 'bg-blue-100 text-blue-800',
      'FIRST_CONTACT': 'bg-purple-100 text-purple-800',
      'QUOTE_SENT': 'bg-yellow-100 text-yellow-800',
      'WAITING_PAYMENT': 'bg-orange-100 text-orange-800',
      'DEPOSIT_PAID': 'bg-green-100 text-green-800',
      'PAID_FULL': 'bg-green-200 text-green-900',
      'EVENT_DONE': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'NEW': 'חדש',
      'FIRST_CONTACT': 'יצר קשר ראשון',
      'QUOTE_SENT': 'נשלחה הצעת מחיר',
      'WAITING_PAYMENT': 'ממתין לתשלום',
      'DEPOSIT_PAID': 'שולמה מקדמה',
      'PAID_FULL': 'שולם במלואו',
      'EVENT_DONE': 'האירוע בוצע',
      'CANCELLED': 'בוטל',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לידים</h1>
          <p className="text-gray-600">ניהול פניות וליידים</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 ml-2" />
          ליד חדש
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="כל הסטטוסים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">כל הסטטוסים</SelectItem>
                <SelectItem value="NEW">חדש</SelectItem>
                <SelectItem value="FIRST_CONTACT">יצר קשר ראשון</SelectItem>
                <SelectItem value="QUOTE_SENT">נשלחה הצעת מחיר</SelectItem>
                <SelectItem value="CANCELLED">בוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLeads.map(lead => (
          <Card key={lead.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => { setSelectedLead(lead); setDetailsOpen(true); }}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{lead.contact_name}</h3>
                    <Badge className={getStatusColor(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {lead.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(lead.event_date).toLocaleDateString('he-IL')} - {lead.event_type}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredLeads.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              לא נמצאו לידים
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lead Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>פרטי ליד - {selectedLead.contact_name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setDetailsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <Label>סטטוס נוכחי</Label>
                  <Select value={selectedLead.status} onValueChange={(v) => updateLeadStatus(selectedLead.id, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">חדש</SelectItem>
                      <SelectItem value="FIRST_CONTACT">יצר קשר ראשון</SelectItem>
                      <SelectItem value="QUOTE_SENT">נשלחה הצעת מחיר</SelectItem>
                      <SelectItem value="WAITING_PAYMENT">ממתין לתשלום</SelectItem>
                      <SelectItem value="CANCELLED">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>טלפון</Label>
                    <p className="mt-1">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <Label>אימייל</Label>
                    <p className="mt-1">{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label>תאריך אירוע</Label>
                    <p className="mt-1">{new Date(selectedLead.event_date).toLocaleDateString('he-IL')}</p>
                  </div>
                  <div>
                    <Label>סוג אירוע</Label>
                    <p className="mt-1">{selectedLead.event_type}</p>
                  </div>
                </div>

                {selectedLead.celebrant_name && (
                  <div>
                    <Label>שם החוגג/ת</Label>
                    <p className="mt-1">{selectedLead.celebrant_name}</p>
                  </div>
                )}

                {selectedLead.guests_count && (
                  <div>
                    <Label>מספר מוזמנים</Label>
                    <p className="mt-1">{selectedLead.guests_count}</p>
                  </div>
                )}

                {selectedLead.event_contents?.length > 0 && (
                  <div>
                    <Label>תכני אירוע</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedLead.event_contents.map(content => (
                        <Badge key={content} variant="secondary">{content}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.expectations && (
                  <div>
                    <Label>ציפיות</Label>
                    <p className="mt-1 text-sm">{selectedLead.expectations}</p>
                  </div>
                )}

                {selectedLead.special_requests && (
                  <div>
                    <Label>בקשות מיוחדות</Label>
                    <p className="mt-1 text-sm">{selectedLead.special_requests}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="destructive" onClick={() => deleteLead(selectedLead.id)} className="flex-1">
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק ליד
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>צור ליד חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <div>
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
            <Button onClick={createLead} className="w-full bg-orange-500 hover:bg-orange-600">
              צור ליד
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}