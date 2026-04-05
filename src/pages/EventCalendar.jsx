import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Layers, LayoutGrid, MapPin, Music, CreditCard, User, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import CalendarLegend from '../components/calendar/CalendarLegend';
import CalendarFilters from '../components/calendar/CalendarFilters';
import EventTooltip from '../components/calendar/EventTooltip';
import DJBlockTooltip from '../components/calendar/DJBlockTooltip';

const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const PAYMENT_LABELS = { PENDING: 'ממתין', PAID_FULL: 'שולם במלואו' };
const EVENT_STATUS_LABELS = { PENDING: 'ממתין', CONFIRMED: 'מאושר', IN_PROGRESS: 'בתהליך', COMPLETED: 'הושלם', CANCELLED: 'בוטל' };

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [djs, setDJs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ eventStatus: 'ALL', djId: 'ALL', eventType: 'ALL' });

  // Tooltip state
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoveredCustomer, setHoveredCustomer] = useState(null);
  const [hoveredDJ, setHoveredDJ] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredBlockedDJs, setHoveredBlockedDJs] = useState(null);
  const [djTooltipPos, setDJTooltipPos] = useState({ x: 0, y: 0 });

  // Event detail dialog
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [djBlockDialog, setDJBlockDialog] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [eventsData, contactsData, djsData] = await Promise.all([
      base44.entities.Event.list(),
      base44.entities.Contact.list(),
      base44.entities.DJ.list(),
    ]);
    setEvents(eventsData);
    setContacts(contactsData);
    setDJs(djsData);
    setLoading(false);
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filters.eventStatus !== 'ALL' && e.event_status !== filters.eventStatus) return false;
    if (filters.djId !== 'ALL' && e.dj_id !== filters.djId) return false;
    if (filters.eventType !== 'ALL' && e.event_type !== filters.eventType) return false;
    return true;
  });

  const getEventsForDate = useCallback((date) => {
    if (!date) return [];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.event_date === dateStr);
  }, [filteredEvents]);

  const getBlockedDJsForDate = useCallback((date) => {
    if (!date) return [];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return djs.filter(dj => 
      dj.status === 'ACTIVE' && 
      dj.unavailable_dates?.includes(dateStr)
    );
  }, [djs]);

  // Navigation
  const navigateForward = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const navigateBack = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Week days
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  // Hover handlers
  const handleEventHover = (event, contact, dj, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredEvent(event);
    if (!contact) {
      const c = contacts.find(c => c.id === event.contact_id);
      setHoveredCustomer(c ? { name: c.contact_name, phone: c.phone } : null);
    } else {
      setHoveredCustomer(contact);
    }
    setHoveredDJ(dj);
  };

  const handleEventLeave = () => {
    setHoveredEvent(null);
    setHoveredCustomer(null);
    setHoveredDJ(null);
  };

  const handleDJBlockHover = (djList, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDJTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredBlockedDJs(djList);
  };

  const handleDJBlockLeave = () => {
    setHoveredBlockedDJs(null);
  };

  // Title
  const getTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const weekDays = getWeekDays();
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;
  };

  // Stats
  const currentMonthEvents = events.filter(e => {
    const d = new Date(e.event_date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });
  const confirmedCount = currentMonthEvents.filter(e => e.event_status === 'CONFIRMED').length;
  const pendingCount = currentMonthEvents.filter(e => e.event_status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-teal-500 animate-spin" />
          <CalendarIcon className="w-6 h-6 text-teal-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.contact_name : null;
  };

  const selectedCustomerName = selectedEvent ? getContactName(selectedEvent.contact_id) : null;
  const selectedDJ = selectedEvent ? djs.find(d => d.id === selectedEvent.dj_id) : null;

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-5 md:p-8 rounded-3xl border border-primary/10">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ color: '#0f172a' }}>יומן אירועים</h2>
          <p className="text-slate-500 font-medium max-w-md">
            {currentMonthEvents.length} אירועים ב{monthNames[currentDate.getMonth()]} • {confirmedCount} מאושרים • {pendingCount} ממתינים
          </p>
        </div>
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      </div>

      {/* Controls bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'month' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />חודשי
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />שבועי
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={navigateBack} className="h-8 w-8 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                היום
              </button>
              <Button variant="ghost" size="icon" onClick={navigateForward} className="h-8 w-8 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-lg font-black text-slate-800">{getTitle()}</h2>
          </div>

          {/* Filters */}
          <CalendarFilters djs={djs} filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 md:p-5 overflow-x-auto">
        {viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            djs={djs}
            contacts={contacts}
            getEventsForDate={getEventsForDate}
            getBlockedDJsForDate={getBlockedDJsForDate}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
            onDJBlockHover={handleDJBlockHover}
            onDJBlockLeave={handleDJBlockLeave}
            onEventClick={(event) => setSelectedEvent(event)}
            onDJBlockClick={(djList) => setDJBlockDialog(djList)}
          />
        ) : (
          <WeekView
            weekDays={getWeekDays()}
            events={filteredEvents}
            djs={djs}
            contacts={contacts}
            getEventsForDate={getEventsForDate}
            getBlockedDJsForDate={getBlockedDJsForDate}
            onEventHover={handleEventHover}
            onEventLeave={handleEventLeave}
            onDJBlockHover={handleDJBlockHover}
            onDJBlockLeave={handleDJBlockLeave}
            onEventClick={(event) => setSelectedEvent(event)}
            onDJBlockClick={(djList) => setDJBlockDialog(djList)}
          />
        )}

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <CalendarLegend />
        </div>
      </div>

      {/* Tooltips */}
      {hoveredEvent && (
        <EventTooltip event={hoveredEvent} customer={hoveredCustomer} dj={hoveredDJ} position={tooltipPos} />
      )}
      {hoveredBlockedDJs && (
        <DJBlockTooltip djList={hoveredBlockedDJs} position={djTooltipPos} />
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-500" />
              {selectedEvent?.event_type}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {new Date(selectedEvent.event_date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {selectedCustomerName && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold text-slate-700">{selectedCustomerName}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold text-slate-600">{selectedEvent.location}</span>
                  </div>
                )}
                {selectedDJ && (
                  <div className="flex items-center gap-3">
                    <Music className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold text-slate-600">DJ {selectedDJ.name}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">סטטוס אירוע</p>
                  <p className="text-sm font-black text-slate-700">{EVENT_STATUS_LABELS[selectedEvent.event_status] || selectedEvent.event_status}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">תשלום</p>
                  <p className="text-sm font-black text-slate-700">{PAYMENT_LABELS[selectedEvent.payment_status] || selectedEvent.payment_status}</p>
                </div>
              </div>

              {selectedEvent.price_total && (
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-teal-600 mb-1">סכום עסקה</p>
                  <p className="text-2xl font-black text-teal-700">₪{selectedEvent.price_total.toLocaleString()}</p>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">הערות</p>
                  <p className="text-sm text-slate-600">{selectedEvent.notes}</p>
                </div>
              )}

              <Link
                to={createPageUrl(`Events?eventId=${selectedEvent.id}`)}
                className="block w-full text-center text-white font-bold py-3 rounded-xl transition-colors text-sm"
                style={{ backgroundColor: '#ec5b13' }}
              >
                פתח בדף אירועים
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DJ Block Detail Dialog */}
      <Dialog open={!!djBlockDialog} onOpenChange={() => setDJBlockDialog(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Ban className="w-5 h-5 text-violet-500" />
              תקליטנים חסומים
            </DialogTitle>
          </DialogHeader>
          {djBlockDialog && (
            <div className="space-y-3 mt-2">
              {djBlockDialog.map(dj => (
                <div key={dj.id} className="flex items-center gap-3 bg-violet-50 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <span className="text-violet-600 font-black text-sm">{dj.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{dj.name}</p>
                    <p className="text-xs text-slate-400">{dj.phone} • {dj.email}</p>
                  </div>
                </div>
              ))}
              <Link
                to={createPageUrl('DJAvailability')}
                className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                נהל זמינות תקליטנים
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}