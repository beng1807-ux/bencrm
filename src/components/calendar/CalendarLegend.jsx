import React from 'react';

const legendItems = [
  { color: 'bg-emerald-500', label: 'חוזה חתום', border: 'border-emerald-500' },
  { color: 'bg-amber-500', label: 'טיוטה / נשלח', border: 'border-amber-500' },
  { color: 'bg-slate-300', label: 'סורב / בוטל', border: 'border-slate-300' },
  { color: 'bg-violet-500', label: 'חסימת DJ', border: 'border-violet-500' },
];

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${item.color}`} />
          <span className="text-xs font-semibold text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}