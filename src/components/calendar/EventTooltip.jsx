import React from 'react';
import { Calendar, MapPin, Music, FileText, CreditCard, User } from 'lucide-react';

const CONTRACT_LABELS = { SIGNED: 'חתום', DRAFT: 'טיוטה', SENT: 'נשלח', DECLINED: 'סורב' };
const PAYMENT_LABELS = { PENDING: 'ממתין', DEPOSIT_PAID: 'מקדמה שולמה', PAID_FULL: 'שולם במלואו' };

export default function EventTooltip({ event, customer, dj, position }) {
  if (!event) return null;

  return (
    <div 
      className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-72 pointer-events-none"
      style={{ 
        top: position.y, 
        left: position.x,
        transform: 'translate(-50%, -110%)'
      }}
    >
      {/* Decorative top line */}
      <div className="absolute top-0 left-4 right-4 h-1 rounded-b-full bg-gradient-to-l from-teal-400 to-teal-600" />
      
      <div className="space-y-3">
        <div>
          <h4 className="font-black text-slate-900 text-sm">{event.event_type}</h4>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {new Date(event.event_date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="space-y-2">
          {customer && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs font-semibold text-slate-700">{customer.name}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs font-semibold text-slate-600">{event.location}</span>
            </div>
          )}
          {dj && (
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs font-semibold text-slate-600">{dj.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-semibold text-slate-600">חוזה: {CONTRACT_LABELS[event.contract_status] || event.contract_status}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-semibold text-slate-600">
              {PAYMENT_LABELS[event.payment_status] || event.payment_status}
              {event.price_total ? ` • ₪${event.price_total.toLocaleString()}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
        <div className="w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45 -translate-y-1.5" />
      </div>
    </div>
  );
}