import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, X, Plus, User, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

function DJRow({ dj, events, onManageDates }) {
  const [expanded, setExpanded] = useState(false);
  const unavailable = (dj.unavailable_dates || []).sort();
  const futureDates = unavailable.filter(d => new Date(d) >= new Date());
  const assignedDates = events.filter(e => e.dj_id === dj.id && new Date(e.event_date) >= new Date());

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{dj.name}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{dj.phone}</span>
              {dj.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{dj.email}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge className={dj.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
            {dj.status === 'ACTIVE' ? 'פעיל' : 'לא פעיל'}
          </Badge>
          <div className="text-center">
            <span className="text-lg font-black text-gray-900">{assignedDates.length}</span>
            <p className="text-[10px] text-gray-400 leading-tight">אירועים קרובים</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-black" style={{ color: futureDates.length > 0 ? PRIMARY : '#9CA3AF' }}>{futureDates.length}</span>
            <p className="text-[10px] text-gray-400 leading-tight">תאריכים חסומים</p>
          </div>
          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); onManageDates(dj); }}>
            <Calendar className="w-3.5 h-3.5 ml-1" />נהל
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blocked dates */}
            <div>
              <h4 className="text-sm font-bold text-gray-600 mb-2">תאריכים חסומים ({futureDates.length})</h4>
              {futureDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {futureDates.map(date => (
                    <Badge key={date} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {new Date(date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">אין תאריכים חסומים</p>
              )}
            </div>

            {/* Assigned events */}
            <div>
              <h4 className="text-sm font-bold text-gray-600 mb-2">אירועים קרובים ({assignedDates.length})</h4>
              {assignedDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedDates.map(event => (
                    <Badge key={event.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {event.event_type} — {new Date(event.event_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">אין אירועים משובצים</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DJAvailability() {
  const [djs, setDJs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manageDJ, setManageDJ] = useState(null);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [djsData, eventsData] = await Promise.all([
        base44.entities.DJ.list(),
        base44.entities.Event.list(),
      ]);
      setDJs(djsData);
      setEvents(eventsData);
    } catch {
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const addDate = async () => {
    if (!newDate || !manageDJ) return;
    const current = manageDJ.unavailable_dates || [];
    if (current.includes(newDate)) {
      toast.error('התאריך כבר קיים');
      return;
    }
    const updated = [...current, newDate];
    await base44.entities.DJ.update(manageDJ.id, { unavailable_dates: updated });
    setManageDJ({ ...manageDJ, unavailable_dates: updated });
    setDJs(prev => prev.map(d => d.id === manageDJ.id ? { ...d, unavailable_dates: updated } : d));
    setNewDate('');
    toast.success('התאריך נוסף');
  };

  const removeDate = async (dateToRemove) => {
    if (!manageDJ) return;
    const updated = (manageDJ.unavailable_dates || []).filter(d => d !== dateToRemove);
    await base44.entities.DJ.update(manageDJ.id, { unavailable_dates: updated });
    setManageDJ({ ...manageDJ, unavailable_dates: updated });
    setDJs(prev => prev.map(d => d.id === manageDJ.id ? { ...d, unavailable_dates: updated } : d));
    toast.success('התאריך הוסר');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} />
      </div>
    );
  }

  const futureDates = (manageDJ?.unavailable_dates || []).filter(d => new Date(d) >= new Date()).sort();

  return (
    <div className="space-y-5" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          זמינות תקליטנים
        </h1>
        <p className="text-gray-500 text-sm mt-1">צפייה וניהול תאריכים חסומים לכל תקליטן</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-500">סה״כ תקליטנים</span>
          <span className="text-xl font-black text-gray-900">{djs.length}</span>
        </div>
        <div className="bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-bold text-gray-500">פעילים</span>
          <span className="text-xl font-black text-gray-900">{djs.filter(d => d.status === 'ACTIVE').length}</span>
        </div>
      </div>

      {/* DJ list */}
      <div className="space-y-3">
        {djs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              אין תקליטנים במערכת
            </CardContent>
          </Card>
        ) : (
          djs.map(dj => (
            <DJRow key={dj.id} dj={dj} events={events} onManageDates={setManageDJ} />
          ))
        )}
      </div>

      {/* Manage dates dialog */}
      <Dialog open={!!manageDJ} onOpenChange={open => !open && setManageDJ(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול זמינות — {manageDJ?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex gap-3">
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1" />
              <Button onClick={addDate} style={{ backgroundColor: PRIMARY }} className="text-white">
                <Plus className="w-4 h-4 ml-1" />הוסף
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-600 mb-2">תאריכים חסומים ({futureDates.length})</h4>
              {futureDates.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {futureDates.map(date => (
                    <div key={date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">
                        {new Date(date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeDate(date)} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-6 text-sm">אין תאריכים חסומים</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}