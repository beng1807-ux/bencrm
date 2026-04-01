import React from 'react';

const legendItems = [
  { color: 'bg-emerald-500', label: 'מאושר' },
  { color: 'bg-amber-500', label: 'ממתין' },
  { color: 'bg-blue-500', label: 'בתהליך' },
  { color: 'bg-teal-500', label: 'הושלם' },
  { color: 'bg-slate-300', label: 'בוטל' },
  { color: 'bg-violet-500', label: 'חסימת DJ' },
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