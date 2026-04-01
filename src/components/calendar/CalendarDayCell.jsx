import React from 'react';
import { Music, Ban, User } from 'lucide-react';

const getEventStatusColor = (eventStatus) => {
  switch (eventStatus) {
    case 'CONFIRMED': return { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'IN_PROGRESS': return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'COMPLETED': return { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-700', dot: 'bg-teal-500' };
    case 'CANCELLED': return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-500', dot: 'bg-slate-400' };
    case 'PENDING':
    default: return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' };
  }
};

export default function CalendarDayCell({ 
  date, events, blockedDJs, contacts, djs, isToday, isCurrentMonth,
  onEventHover, onEventLeave, onDJBlockHover, onDJBlockLeave, onEventClick, onDJBlockClick 
}) {
  if (!date) {
    return <div className="min-h-[120px] bg-slate-50/30 rounded-xl" />;
  }

  const dayNum = date.getDate();
  const isFriday = date.getDay() === 5;
  const isSaturday = date.getDay() === 6;

  const getContactName = (contactId) => {
    const contact = contacts?.find(c => c.id === contactId);
    return contact ? contact.contact_name : null;
  };

  return (
    <div className={`min-h-[120px] rounded-xl border transition-all duration-200 p-2 flex flex-col gap-1 ${
      isToday 
        ? 'border-teal-500 bg-teal-50/30 shadow-sm shadow-teal-100' 
        : isCurrentMonth 
          ? 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm' 
          : 'border-transparent bg-slate-50/50'
    } ${(isFriday || isSaturday) && isCurrentMonth ? 'bg-slate-50/70' : ''}`}>
      
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-bold leading-none ${
          isToday 
            ? 'bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs' 
            : isCurrentMonth 
              ? 'text-slate-700' 
              : 'text-slate-300'
        }`}>
          {dayNum}
        </span>
        {events.length > 0 && (
          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 rounded-full">{events.length}</span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 3).map(event => {
          const colors = getEventStatusColor(event.event_status);
          const contactName = getContactName(event.contact_id);
          const dj = djs?.find(d => d.id === event.dj_id);
          const contact = contacts?.find(c => c.id === event.contact_id);
          
          return (
            <div
              key={event.id}
              className={`${colors.bg} ${colors.border} border-r-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all hover:shadow-sm hover:scale-[1.02]`}
              onMouseEnter={(e) => onEventHover(event, contact ? { name: contact.contact_name, phone: contact.phone } : null, dj, e)}
              onMouseLeave={onEventLeave}
              onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
            >
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                <span className={`text-[10px] font-black ${colors.text} truncate`}>
                  {event.event_type}
                </span>
              </div>
              {contactName && (
                <div className="flex items-center gap-1 pr-2.5">
                  <User className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                  <p className="text-[9px] font-semibold text-slate-500 truncate">{contactName}</p>
                </div>
              )}
              {dj && (
                <div className="flex items-center gap-1 pr-2.5">
                  <Music className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                  <p className="text-[9px] font-semibold text-slate-400 truncate">{dj.name}</p>
                </div>
              )}
            </div>
          );
        })}
        
        {events.length > 3 && (
          <div className="text-[9px] font-bold text-slate-400 text-center">
            +{events.length - 3} נוספים
          </div>
        )}

        {blockedDJs.length > 0 && (
          <div
            className="bg-violet-50 border border-violet-200 border-r-2 border-r-violet-500 rounded-lg px-2 py-1 cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all"
            onMouseEnter={(e) => onDJBlockHover(blockedDJs, e)}
            onMouseLeave={onDJBlockLeave}
            onClick={(e) => { e.stopPropagation(); onDJBlockClick(blockedDJs); }}
          >
            <div className="flex items-center gap-1">
              <Ban className="w-2.5 h-2.5 text-violet-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-violet-600 truncate">
                {blockedDJs.length === 1 ? blockedDJs[0].name : `${blockedDJs.length} חסומים`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}