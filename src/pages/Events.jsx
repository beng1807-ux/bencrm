import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, DollarSign, FileText, User, MapPin, Package, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [djs, setDJs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, customersData, packagesData, djsData] = await Promise.all([
        base44.entities.Event.list('-event_date'),
        base44.entities.Customer.list(),
        base44.entities.Package.filter({ active: true }),
        base44.entities.DJ.filter({ status: 'ACTIVE' }),
      ]);
      setEvents(eventsData);
      setCustomers(customersData);
      setPackages(packagesData);
      setDJs(djsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const openEventDetails = async (event) => {
    setSelectedEvent(event);
    setEditData(event);
    setDetailsOpen(true);
    setEditMode(false);
  };

  const calculatePrice = (packageId, addonIds) => {
    let total = 0;
    const selectedPackage = packages.find(p => p.id === packageId);
    if (selectedPackage) total += selectedPackage.price;
    
    addonIds?.forEach(addonId => {
      const addon = packages.find(p => p.id === addonId);
      if (addon) total += addon.price;
    });
    
    return total;
  };

  const handleSaveEvent = async () => {
    try {
      const priceTotal = calculatePrice(editData.package_id, editData.addon_ids);
      const depositAmount = editData.deposit_amount || (priceTotal * 0.3);
      const balanceAmount = priceTotal - (editData.payment_status === 'DEPOSIT_PAID' ? depositAmount : editData.payment_status === 'PAID_FULL' ? priceTotal : 0);

      await base44.entities.Event.update(selectedEvent.id, {
        ...editData,
        price_total: priceTotal,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
      });

      await loadData();
      setEditMode(false);
      toast.success('האירוע עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('שגיאה בעדכון האירוע');
    }
  };

  const updatePaymentStatus = async (newStatus) => {
    if (!editData.last_payment_method && newStatus !== 'PENDING') {
      toast.error('יש לבחור אמצעי תשלום');
      return;
    }

    try {
      await base44.entities.Event.update(selectedEvent.id, {
        payment_status: newStatus,
        last_payment_method: editData.last_payment_method,
      });
      await loadData();
      setEditData({ ...editData, payment_status: newStatus });
      toast.success('סטטוס תשלום עודכן');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('שגיאה בעדכון תשלום');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-gray-100 text-gray-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.PENDING;
  };

  const getPaymentColor = (status) => {
    const colors = {
      'PENDING': 'bg-red-100 text-red-800',
      'DEPOSIT_PAID': 'bg-yellow-100 text-yellow-800',
      'PAID_FULL': 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.PENDING;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">אירועים</h1>
        <p className="text-gray-600">ניהול אירועים ותשלומים</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {events.map(event => {
          const customer = customers.find(c => c.id === event.customer_id);
          const dj = djs.find(d => d.id === event.dj_id);
          
          return (
            <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openEventDetails(event)}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{event.event_type}</h3>
                      <Badge className={getStatusColor(event.event_status)}>
                        {event.event_status}
                      </Badge>
                      <Badge className={getPaymentColor(event.payment_status)}>
                        {event.payment_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {customer?.name || 'לקוח לא ידוע'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.event_date).toLocaleDateString('he-IL')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                      {dj && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          DJ: {dj.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-orange-600">₪{event.price_total?.toLocaleString()}</p>
                    {event.balance_amount > 0 && (
                      <p className="text-sm text-gray-600">יתרה: ₪{event.balance_amount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {events.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              אין אירועים במערכת
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>פרטי אירוע</span>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                    <Edit className="w-4 h-4 ml-2" />
                    {editMode ? 'ביטול' : 'עריכה'}
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {editMode ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>תאריך אירוע</Label>
                        <Input
                          type="date"
                          value={editData.event_date}
                          onChange={e => setEditData({...editData, event_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>מיקום</Label>
                        <Input
                          value={editData.location || ''}
                          onChange={e => setEditData({...editData, location: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>סטטוס אירוע</Label>
                        <Select value={editData.event_status} onValueChange={v => setEditData({...editData, event_status: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                            <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                            <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>DJ משובץ</Label>
                        <Select value={editData.dj_id || ''} onValueChange={v => setEditData({...editData, dj_id: v})}>
                          <SelectTrigger><SelectValue placeholder="בחר DJ" /></SelectTrigger>
                          <SelectContent>
                            {djs.map(dj => (
                              <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>הערות</Label>
                      <Textarea
                        value={editData.notes || ''}
                        onChange={e => setEditData({...editData, notes: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleSaveEvent} className="w-full bg-orange-500 hover:bg-orange-600">
                      שמור שינויים
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>לקוח</Label>
                        <p className="mt-1 font-medium">{customers.find(c => c.id === selectedEvent.customer_id)?.name}</p>
                      </div>
                      <div>
                        <Label>תאריך</Label>
                        <p className="mt-1 font-medium">{new Date(selectedEvent.event_date).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div>
                        <Label>סוג אירוע</Label>
                        <p className="mt-1 font-medium">{selectedEvent.event_type}</p>
                      </div>
                      <div>
                        <Label>מיקום</Label>
                        <p className="mt-1 font-medium">{selectedEvent.location || 'לא צוין'}</p>
                      </div>
                      <div>
                        <Label>DJ</Label>
                        <p className="mt-1 font-medium">{djs.find(d => d.id === selectedEvent.dj_id)?.name || 'לא משובץ'}</p>
                      </div>
                      <div>
                        <Label>סטטוס אירוע</Label>
                        <Badge className={getStatusColor(selectedEvent.event_status)}>
                          {selectedEvent.event_status}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        תשלומים
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>מחיר כולל</Label>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            ₪{selectedEvent.price_total?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label>סטטוס תשלום</Label>
                          <div className="flex gap-2 mt-2">
                            <Select value={editData.payment_status} onValueChange={v => setEditData({...editData, payment_status: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">ממתין</SelectItem>
                                <SelectItem value="DEPOSIT_PAID">שולמה מקדמה</SelectItem>
                                <SelectItem value="PAID_FULL">שולם במלואו</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>מקדמה</Label>
                          <p className="mt-1 font-medium">₪{selectedEvent.deposit_amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label>יתרה</Label>
                          <p className="mt-1 font-medium">₪{selectedEvent.balance_amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label>אמצעי תשלום אחרון</Label>
                          <Select value={editData.last_payment_method || ''} onValueChange={v => setEditData({...editData, last_payment_method: v})}>
                            <SelectTrigger><SelectValue placeholder="בחר אמצעי" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="העברה">העברה</SelectItem>
                              <SelectItem value="אשראי">אשראי</SelectItem>
                              <SelectItem value="מזומן">מזומן</SelectItem>
                              <SelectItem value="ביט">ביט</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Button onClick={() => updatePaymentStatus(editData.payment_status)} className="bg-orange-500 hover:bg-orange-600">
                            עדכן תשלום
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        חוזה
                      </h3>
                      <div className="flex items-center gap-4">
                        <Badge className={selectedEvent.contract_status === 'SIGNED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {selectedEvent.contract_status}
                        </Badge>
                        {selectedEvent.contract_signed_at && (
                          <p className="text-sm text-gray-600">
                            נחתם ב-{new Date(selectedEvent.contract_signed_at).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}