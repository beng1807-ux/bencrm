import React from 'react';
import CalendarDayCell from './CalendarDayCell';

export default function MonthView({ 
  currentDate, events, djs, customers, leads, getEventsForDate, getBlockedDJsForDate,
  onEventHover, onEventLeave, onDJBlockHover, onDJBlockLeave, onEventClick, onDJBlockClick
}) {
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const today = new Date();

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Fill start of week
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, currentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), currentMonth: true });
    }

    // Fill end of week
    while (days.length % 7 !== 0) {
      const nextDay = days.length - startDayOfWeek - lastDay.getDate() + 1;
      days.push({ date: new Date(year, month + 1, nextDay), currentMonth: false });
    }

    return days;
  };

  const days = getDaysInMonth();

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center py-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ date, currentMonth }, index) => {
          const dayEvents = currentMonth ? getEventsForDate(date) : [];
          const blockedDJs = currentMonth ? getBlockedDJsForDate(date) : [];
          const isToday = date.toDateString() === today.toDateString();

          return (
            <CalendarDayCell
              key={index}
              date={date}
              events={dayEvents}
              blockedDJs={blockedDJs}
              customers={customers}
              leads={leads}
              djs={djs}
              isToday={isToday}
              isCurrentMonth={currentMonth}
              onEventHover={onEventHover}
              onEventLeave={onEventLeave}
              onDJBlockHover={onDJBlockHover}
              onDJBlockLeave={onDJBlockLeave}
              onEventClick={onEventClick}
              onDJBlockClick={onDJBlockClick}
            />
          );
        })}
      </div>
    </div>
  );
}