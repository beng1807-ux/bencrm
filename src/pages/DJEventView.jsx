import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Phone, Mail, ArrowRight, Music, Star, PartyPopper, ClipboardList, Heart, Sparkles, MessageSquare } from 'lucide-react';
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

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className="text-sm font-bold text-slate-800 text-left max-w-[60%]">{value}</span>
    </div>
  );
}

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
      if (!eventId) { setLoading(false); return; }

      const response = await base44.functions.invoke('getDJEventDetails', { eventId });
      const data = response.data;
      
      if (data.authorized) {
        setAuthorized(true);
        setEvent(data.event);
        if (data.contact) setContact(data.contact);
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

      {/* Event Header Card */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{event.event_type}</h2>
              {contact?.celebrant_name && (
                <p className="text-lg text-slate-600 mt-1">🎉 {contact.celebrant_name}</p>
              )}
            </div>
            <Badge className={`${getStatusColor(event.event_status)} text-sm font-bold px-3 py-1`}>
              {STATUS_LABELS[event.event_status] || event.event_status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            פרטי האירוע
          </h3>
          <div className="space-y-0">
            <InfoRow label="תאריך" value={event.event_date ? new Date(event.event_date).toLocaleDateString('he-IL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }) : null} />
            <InfoRow label="סוג אירוע" value={event.event_type} />
            <InfoRow label="מיקום" value={event.location} />
            <InfoRow label="סטטוס" value={STATUS_LABELS[event.event_status]} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      {contact && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              פרטי איש קשר
            </h3>
            <div className="space-y-0">
              <InfoRow label="שם" value={contact.contact_name} />
              {contact.phone && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">טלפון</span>
                  <a href={`tel:${contact.phone}`} className="text-sm font-bold text-blue-600 hover:underline">{contact.phone}</a>
                </div>
              )}
              {contact.email && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">אימייל</span>
                  <a href={`mailto:${contact.email}`} className="text-sm font-bold text-blue-600 hover:underline">{contact.email}</a>
                </div>
              )}
              <InfoRow label="שם החוגג/ת" value={contact.celebrant_name} />
              <InfoRow label="שמות ההורים" value={contact.parents_names} />
              <InfoRow label="שמות אחים" value={contact.siblings_names} />
              <InfoRow label="מספר מוזמנים" value={contact.guests_count} />
              <InfoRow label="סוג אורחים" value={contact.guest_type} />
              <InfoRow label="טווח גילאים" value={contact.age_range} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Content & Style */}
      {contact && (contact.event_contents?.length > 0 || contact.event_nature || contact.musical_line || contact.style_notes || contact.laser_addition) && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              תוכן וסגנון האירוע
            </h3>
            <div className="space-y-0">
              {contact.event_contents?.length > 0 && (
                <div className="flex justify-between items-start py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">תכני אירוע</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {contact.event_contents.map(c => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <InfoRow label="אופי האירוע" value={contact.event_nature} />
              <InfoRow label="קו מוזיקלי" value={contact.musical_line} />
              <InfoRow label="סגנון" value={contact.style_notes} />
              <InfoRow label="תוספת לייזר" value={contact.laser_addition ? '✅ כן' : null} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expectations & Special Requests */}
      {contact && (contact.expectations || contact.special_requests) && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              ציפיות ובקשות מיוחדות
            </h3>
            {contact.expectations && (
              <div className="mb-4">
                <p className="text-sm text-slate-500 font-medium mb-1">ציפיות מהאירוע</p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3">{contact.expectations}</p>
              </div>
            )}
            {contact.special_requests && (
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">בקשות מיוחדות</p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3">{contact.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(event.notes || contact?.notes) && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-500" />
              הערות
            </h3>
            {event.notes && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-1">הערות אירוע</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{event.notes}</p>
              </div>
            )}
            {contact?.notes && (
              <div>
                <p className="text-xs text-slate-400 mb-1">הערות איש קשר</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{contact.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}