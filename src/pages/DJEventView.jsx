import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, Mail, ArrowRight, Music } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_LABELS = { PENDING: 'ממתין', CONFIRMED: 'מאושר', IN_PROGRESS: 'בתהליך', COMPLETED: 'הושלם', CANCELLED: 'בוטל' };

const getStatusColor = (s) => ({
  PENDING: 'bg-orange-50 text-orange-500',
  CONFIRMED: 'bg-emerald-50 text-emerald-500',
  IN_PROGRESS: 'bg-amber-50 text-amber-500',
  COMPLETED: 'bg-green-50 text-green-500',
  CANCELLED: 'bg-red-50 text-red-500',
}[s] || 'bg-slate-50 text-slate-500');

export default function DJEventView() {
  const [event, setEvent] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('eventId');
      if (!eventId) {
        setLoading(false);
        return;
      }

      const user = await base44.auth.me();
      const isAdmin = user.role === 'admin';

      // Fetch the event
      const events = await base44.entities.Event.filter({ id: eventId });
      if (events.length === 0) {
        setLoading(false);
        return;
      }
      const ev = events[0];

      // Verify DJ has access to this event
      if (!isAdmin) {
        let djList = await base44.entities.DJ.filter({ user_id: user.id });
        if (djList.length === 0 && user.email) {
          djList = await base44.entities.DJ.filter({ user_id: user.email });
        }
        if (djList.length === 0 && user.email) {
          djList = await base44.entities.DJ.filter({ email: user.email });
        }
        if (djList.length === 0 || djList[0].id !== ev.dj_id) {
          setLoading(false);
          return; // not authorized
        }
      }

      setAuthorized(true);
      setEvent(ev);

      // Fetch contact
      if (ev.contact_id) {
        const contactsList = await base44.entities.Contact.filter({ id: ev.contact_id });
        if (contactsList.length > 0) setContact(contactsList[0]);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('שגיאה בטעינת האירוע');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!event || !authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center" dir="rtl">
        <p className="text-xl font-semibold text-gray-700">אין גישה לאירוע זה</p>
        <p className="text-gray-500 mt-2">האירוע לא נמצא או שאין לך הרשאה לצפות בו.</p>
        <Link to={createPageUrl('MyShows')}>
          <Button className="mt-4" variant="outline">
            <ArrowRight className="w-4 h-4 ml-2" />חזרה להופעות שלי
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Back link */}
      <Link to={createPageUrl('MyShows')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowRight className="w-4 h-4" />חזרה להופעות שלי
      </Link>

      {/* Event Card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{event.event_type}</h2>
              {event.location && (
                <p className="text-slate-500 mt-1">{event.location}</p>
              )}
            </div>
            <Badge className={`${getStatusColor(event.event_status)} text-sm font-bold px-3 py-1`}>
              {STATUS_LABELS[event.event_status] || event.event_status}
            </Badge>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 text-slate-700 bg-slate-50 rounded-xl p-4">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div>
              <p className="font-bold">
                {new Date(event.event_date).toLocaleDateString('he-IL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3 text-slate-700 bg-slate-50 rounded-xl p-4">
              <MapPin className="w-5 h-5 text-slate-500" />
              <p className="font-bold">{event.location}</p>
            </div>
          )}

          {/* Contact Info */}
          {contact && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                פרטי איש קשר
              </h3>
              <div className="space-y-2 mr-7">
                <p className="font-bold text-slate-800">{contact.contact_name}</p>
                {contact.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.event_type && (
                  <p className="text-sm text-slate-500">סוג אירוע: {contact.event_type}</p>
                )}
                {contact.celebrant_name && (
                  <p className="text-sm text-slate-500">שם החוגג/ת: {contact.celebrant_name}</p>
                )}
                {contact.guests_count && (
                  <p className="text-sm text-slate-500">מספר מוזמנים: {contact.guests_count}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 mb-2">הערות</h3>
              <p className="text-slate-600">{event.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}