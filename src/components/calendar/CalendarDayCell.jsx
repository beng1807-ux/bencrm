import React, { useState, useRef } from 'react';
import { Music, Ban } from 'lucide-react';

const getContractColor = (contractStatus) => {
  switch (contractStatus) {
    case 'SIGNED': return { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'DRAFT':
    case 'SENT': return { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'DECLINED': return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-500', dot: 'bg-slate-400' };
    default: return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-500', dot: 'bg-slate-400' };
  }
};

export default function CalendarDayCell({ 
  date, events, blockedDJs, customers, djs, isToday, isCurrentMonth,
  onEventHover, onEventLeave, onDJBlockHover, onDJBlockLeave, onEventClick, onDJBlockClick 
}) {
  if (!date) {
    return <div className="min-h-[120px] bg-slate-50/30 rounded-xl" />;
  }

  const dayNum = date.getDate();
  const isFriday = date.getDay() === 5;
  const isSaturday = date.getDay() === 6;

  return (
    <div className={`min-h-[120px] rounded-xl border transition-all duration-200 p-2 flex flex-col gap-1 ${
      isToday 
        ? 'border-teal-500 bg-teal-50/30 shadow-sm shadow-teal-100' 
        : isCurrentMonth 
          ? 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm' 
          : 'border-transparent bg-slate-50/50'
    } ${(isFriday || isSaturday) && isCurrentMonth ? 'bg-slate-50/70' : ''}`}>
      
      {/* Day number */}
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
          <span className="text-[9px] font-black text-slate-300">{events.length}</span>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 3).map(event => {
          const colors = getContractColor(event.contract_status);
          const customer = customers.find(c => c.id === event.customer_id);
          const dj = djs.find(d => d.id === event.dj_id);
          
          return (
            <div
              key={event.id}
              className={`${colors.bg} ${colors.border} border-r-2 rounded-lg px-2 py-1 cursor-pointer transition-all hover:shadow-sm hover:scale-[1.02]`}
              onMouseEnter={(e) => onEventHover(event, customer, dj, e)}
              onMouseLeave={onEventLeave}
              onClick={() => onEventClick(event)}
            >
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                <span className={`text-[10px] font-bold ${colors.text} truncate`}>
                  {event.event_type}
                </span>
              </div>
              {customer && (
                <p className="text-[9px] text-slate-400 truncate pr-2.5">{customer.name}</p>
              )}
            </div>
          );
        })}
        
        {events.length > 3 && (
          <div className="text-[9px] font-bold text-slate-400 text-center">
            +{events.length - 3} נוספים
          </div>
        )}

        {/* DJ Blocks */}
        {blockedDJs.length > 0 && (
          <div
            className="bg-violet-50 border border-violet-200 border-r-2 border-r-violet-500 rounded-lg px-2 py-1 cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all"
            onMouseEnter={(e) => onDJBlockHover(blockedDJs, e)}
            onMouseLeave={onDJBlockLeave}
            onClick={() => onDJBlockClick(blockedDJs)}
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