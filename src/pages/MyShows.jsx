import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function MyShows() {
  const [myEvents, setMyEvents] = useState([]);
  const [djProfile, setDjProfile] = useState(null);
  const [allDJs, setAllDJs] = useState([]);
  const [selectedDJId, setSelectedDJId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const user = await base44.auth.me();
      const admin = user.role === 'admin';
      setIsAdmin(admin);

      if (admin) {
        const [djs, customersData] = await Promise.all([
          base44.entities.DJ.list(),
          base44.entities.Customer.list(),
        ]);
        setAllDJs(djs);
        setCustomers(customersData);
        if (djs.length > 0) {
          setSelectedDJId(djs[0].id);
          setDjProfile(djs[0]);
          const events = await base44.entities.Event.filter({ dj_id: djs[0].id }, '-event_date');
          setMyEvents(events);
        }
      } else {
        // חיפוש DJ לפי user_id (ID או אימייל)
        let djList = await base44.entities.DJ.filter({ user_id: user.id });
        if (djList.length === 0 && user.email) {
          djList = await base44.entities.DJ.filter({ user_id: user.email });
        }
        if (djList.length === 0 && user.email) {
          djList = await base44.entities.DJ.filter({ email: user.email });
        }
        if (djList.length > 0) {
          const dj = djList[0];
          setDjProfile(dj);
          const events = await base44.entities.Event.filter({ dj_id: dj.id }, '-event_date');
          setMyEvents(events);
        }
      }
    } catch (error) {
      console.error('Error loading shows:', error);
      toast.error('שגיאה בטעינת הופעות');
    } finally {
      setLoading(false);
    }
  };

  const selectDJ = async (djId) => {
    const dj = allDJs.find(d => d.id === djId);
    if (dj) {
      setSelectedDJId(djId);
      setDjProfile(dj);
      const events = await base44.entities.Event.filter({ dj_id: dj.id }, '-event_date');
      setMyEvents(events);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const upcomingEvents = myEvents.filter(e => new Date(e.event_date) >= new Date() && e.event_status !== 'CANCELLED');
  const pastEvents = myEvents.filter(e => new Date(e.event_date) < new Date() || e.event_status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? 'הופעות תקליטנים' : 'לוח ההופעות שלי'}</h1>
          <p className="text-gray-600">{djProfile?.name} - {upcomingEvents.length} אירועים קרובים</p>
        </div>
        {isAdmin && allDJs.length > 0 && (
          <Select value={selectedDJId} onValueChange={selectDJ}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue placeholder="בחר תקליטן" />
            </SelectTrigger>
            <SelectContent>
              {allDJs.map(dj => (
                <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">אירועים קרובים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingEvents.map(event => {
            const customer = customers.find(c => c.id === event.customer_id);
            return (
              <Card key={event.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold">{event.event_type}</h3>
                      <Badge className={getStatusColor(event.event_status)}>
                        {event.event_status}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.event_date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                      {customer && (
                        <>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {customer.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </div>
                        </>
                      )}
                    </div>
                    {event.notes && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-600">{event.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {upcomingEvents.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-gray-500">
                אין אירועים קרובים
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-600">אירועים שהושלמו</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pastEvents.map(event => {
              const customer = customers.find(c => c.id === event.customer_id);
              return (
                <Card key={event.id} className="opacity-75">
                  <CardContent className="pt-4">
                    <p className="font-medium">{event.event_type}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.event_date).toLocaleDateString('he-IL')}
                    </p>
                    {customer && (
                      <p className="text-sm text-gray-600">{customer.name}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}