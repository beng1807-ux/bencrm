import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Phone, Mail, Calendar, DollarSign, MessageSquare, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerEvents, setCustomerEvents] = useState([]);
  const [customerMessages, setCustomerMessages] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({});

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    try {
      const data = await base44.entities.Customer.list('-created_date');
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('שגיאה בטעינת לקוחות');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (searchTerm) {
      setFilteredCustomers(customers.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredCustomers(customers);
    }
  };

  const openCustomerDetails = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
    
    try {
      const [events, messages] = await Promise.all([
        base44.entities.Event.filter({ customer_id: customer.id }),
        base44.entities.ConversationMessage.filter({ customer_id: customer.id }, '-timestamp'),
      ]);
      setCustomerEvents(events);
      setCustomerMessages(messages);
    } catch (error) {
      console.error('Error loading customer details:', error);
    }
  };

  const createCustomer = async () => {
    try {
      await base44.entities.Customer.create(newCustomer);
      await loadCustomers();
      toast.success('לקוח חדש נוצר בהצלחה');
      setCreateOpen(false);
      setNewCustomer({});
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('שגיאה ביצירת הלקוח');
    }
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
          <h1 className="text-3xl font-bold text-gray-900">לקוחות</h1>
          <p className="text-gray-600">ניהול לקוחות ומעקב</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <User className="w-4 h-4 ml-2" />
          לקוח חדש
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openCustomerDetails(customer)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">אירועים: {customer.total_events || 0}</span>
                  <span className="font-semibold text-orange-600">
                    ₪{(customer.total_revenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCustomers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              לא נמצאו לקוחות
            </CardContent>
          </Card>
        )}
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>פרטי לקוח - {selectedCustomer.name}</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">פרטים</TabsTrigger>
                  <TabsTrigger value="events">אירועים ({customerEvents.length})</TabsTrigger>
                  <TabsTrigger value="messages">הודעות ({customerMessages.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">טלפון</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">אימייל</p>
                      <p className="font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">סך אירועים</p>
                      <p className="font-medium">{selectedCustomer.total_events || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">סך הכנסות</p>
                      <p className="font-medium text-orange-600">₪{(selectedCustomer.total_revenue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedCustomer.notes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">הערות</p>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedCustomer.notes}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="events">
                  <div className="space-y-3">
                    {customerEvents.map(event => (
                      <Card key={event.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{event.event_type}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(event.event_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-orange-600">₪{event.price_total?.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{event.payment_status}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {customerEvents.length === 0 && (
                      <p className="text-center text-gray-500 py-8">אין אירועים עדיין</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="messages">
                  <div className="space-y-3">
                    {customerMessages.map(msg => (
                      <div key={msg.id} className={`p-3 rounded ${msg.sender === 'OWNER' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {msg.sender === 'OWNER' ? 'אני' : 'לקוח'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleString('he-IL')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message_text}</p>
                      </div>
                    ))}
                    {customerMessages.length === 0 && (
                      <p className="text-center text-gray-500 py-8">אין הודעות עדיין</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>צור לקוח חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם *</Label>
              <Input value={newCustomer.name || ''} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
            </div>
            <div>
              <Label>אימייל *</Label>
              <Input type="email" value={newCustomer.email || ''} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={newCustomer.notes || ''} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} />
            </div>
            <Button onClick={createCustomer} className="w-full bg-orange-500 hover:bg-orange-600">
              צור לקוח
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}