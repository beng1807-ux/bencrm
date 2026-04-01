import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export default function CalendarFilters({ djs, filters, onFilterChange }) {
  const eventStatuses = [
    { value: 'ALL', label: 'כל הסטטוסים' },
    { value: 'PENDING', label: 'ממתין' },
    { value: 'CONFIRMED', label: 'מאושר' },
    { value: 'IN_PROGRESS', label: 'בתהליך' },
    { value: 'COMPLETED', label: 'הושלם' },
    { value: 'CANCELLED', label: 'בוטל' },
  ];

  const eventTypes = [
    { value: 'ALL', label: 'כל סוגי האירועים' },
    { value: 'בר מצווה', label: 'בר מצווה' },
    { value: 'בת מצווה', label: 'בת מצווה' },
    { value: 'חתונה', label: 'חתונה' },
    { value: 'יום הולדת', label: 'יום הולדת' },
    { value: 'אירוע פרטי', label: 'אירוע פרטי' },
    { value: 'אירוע חברה', label: 'אירוע חברה' },
  ];

  const hasFilters = filters.eventStatus !== 'ALL' || filters.djId !== 'ALL' || filters.eventType !== 'ALL';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Filter className="w-4 h-4" />
        <span className="text-xs font-bold">סינון:</span>
      </div>
      <Select value={filters.eventStatus || 'ALL'} onValueChange={v => onFilterChange({ ...filters, eventStatus: v })}>
        <SelectTrigger className="w-36 h-8 text-xs bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {eventStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.djId} onValueChange={v => onFilterChange({ ...filters, djId: v })}>
        <SelectTrigger className="w-36 h-8 text-xs bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">כל התקליטנים</SelectItem>
          {djs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.eventType} onValueChange={v => onFilterChange({ ...filters, eventType: v })}>
        <SelectTrigger className="w-40 h-8 text-xs bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {eventTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {hasFilters && (
        <button 
          onClick={() => onFilterChange({ eventStatus: 'ALL', djId: 'ALL', eventType: 'ALL' })}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold"
        >
          <X className="w-3 h-3" />נקה
        </button>
      )}
    </div>
  );
}