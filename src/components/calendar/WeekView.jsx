import React from 'react';
import CalendarDayCell from './CalendarDayCell';

export default function WeekView({ 
  weekDays, events, djs, customers, getEventsForDate, getBlockedDJsForDate,
  onEventHover, onEventLeave, onDJBlockHover, onDJBlockLeave, onEventClick, onDJBlockClick
}) {
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const today = new Date();

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day, i) => (
          <div key={day} className="text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</span>
          </div>
        ))}
      </div>

      {/* Week cells */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const blockedDJs = getBlockedDJsForDate(date);
          const isToday = date.toDateString() === today.toDateString();

          return (
            <CalendarDayCell
              key={index}
              date={date}
              events={dayEvents}
              blockedDJs={blockedDJs}
              customers={customers}
              djs={djs}
              isToday={isToday}
              isCurrentMonth={true}
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