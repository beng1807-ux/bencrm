import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function EventCalendar() {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [djs, setDJs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsData, customersData, djsData] = await Promise.all([
        base44.entities.Event.list(),
        base44.entities.Customer.list(),
        base44.entities.DJ.list(),
      ]);
      setEvents(eventsData);
      setCustomers(customersData);
      setDJs(djsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.event_date === dateStr);
  };

  const getEventColor = (event) => {
    if (event.event_status === 'COMPLETED') return 'bg-gray-200 text-gray-700';
    if (event.event_status === 'CANCELLED') return 'bg-red-100 text-red-700';
    if (event.payment_status === 'PAID_FULL') return 'bg-green-100 text-green-700';
    if (event.payment_status === 'DEPOSIT_PAID') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-8 h-8" />
          יומן אירועים
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={() => changeMonth(-1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" onClick={() => changeMonth(1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
            
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDate(date) : [];
              const isToday = date && date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    date ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'border-orange-500 border-2' : 'border-gray-200'}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-orange-600' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.map(event => {
                          const customer = customers.find(c => c.id === event.customer_id);
                          const dj = djs.find(d => d.id === event.dj_id);
                          
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded ${getEventColor(event)} cursor-pointer hover:opacity-80`}
                              title={`${customer?.name || 'לקוח'} - ${event.event_type}${dj ? ` - DJ: ${dj.name}` : ''}`}
                            >
                              <div className="font-semibold truncate">{customer?.name}</div>
                              <div className="truncate">{event.event_type}</div>
                              {dj && <div className="truncate text-[10px]">DJ: {dj.name}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 rounded"></div>
              <span className="text-sm">ממתין לתשלום</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span className="text-sm">שולמה מקדמה</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-sm">שולם במלואו</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span className="text-sm">הושלם</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span className="text-sm">בוטל</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}