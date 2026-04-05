import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Phone, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyShows() {
  const [myEvents, setMyEvents] = useState([]);
  const [djProfile, setDjProfile] = useState(null);
  const [allDJs, setAllDJs] = useState([]);
  const [selectedDJId, setSelectedDJId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState([]);
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
        const [djs, contactsData] = await Promise.all([
          base44.entities.DJ.list(),
          base44.entities.Contact.list(),
        ]);
        setAllDJs(djs);
        setContacts(contactsData);
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
        // DJ users also need contacts data
        const contactsData = await base44.entities.Contact.list();
        setContacts(contactsData);

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

  if (!isAdmin && !djProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-xl font-semibold text-gray-700">אין לך פרופיל DJ משויך</p>
        <p className="text-gray-500 mt-2">פנה למנהל המערכת לשיוך החשבון שלך.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2" style={{ color: '#0f172a' }}>{isAdmin ? 'הופעות תקליטנים' : 'לוח ההופעות שלי'}</h2>
          <p className="text-slate-500 font-medium max-w-md">{djProfile?.name} - {upcomingEvents.length} אירועים קרובים</p>
        </div>
        {isAdmin && allDJs.length > 0 && (
          <Select value={selectedDJId} onValueChange={selectDJ}>
            <SelectTrigger className="w-52 bg-white relative z-10">
              <SelectValue placeholder="בחר תקליטן" />
            </SelectTrigger>
            <SelectContent>
              {allDJs.map(dj => (
                <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">אירועים קרובים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingEvents.map(event => {
            const contact = contacts.find(c => c.id === event.contact_id);
            return (
              <Link key={event.id} to={createPageUrl(`Events?eventId=${event.id}`)}>
                <Card className="hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{event.event_type}</h3>
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </div>
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
                        {contact && (
                          <>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {contact.contact_name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="hover:underline">{contact.phone}</a>
                            </div>
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="hover:underline">{contact.email}</a>
                              </div>
                            )}
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
              </Link>
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
              const contact = contacts.find(c => c.id === event.contact_id);
              return (
                <Link key={event.id} to={createPageUrl(`Events?eventId=${event.id}`)}>
                  <Card className="opacity-75 hover:opacity-100 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.event_type}</p>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(event.event_date).toLocaleDateString('he-IL')}
                      </p>
                      {contact && (
                        <>
                          <p className="text-sm text-gray-600">{contact.contact_name}</p>
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}