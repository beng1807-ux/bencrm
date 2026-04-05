import React, { useState } from 'react';
import { Phone, Mail, Users } from 'lucide-react';

export default function ContactTooltip({ contact, children }) {
  const [show, setShow] = useState(false);

  if (!contact) return children;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {show && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 w-64"
          dir="rtl"
          onClick={e => e.preventDefault()}
        >
          <p className="font-bold text-slate-900 text-sm mb-3">{contact.contact_name}</p>
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="hover:underline">{contact.phone}</a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="hover:underline truncate">{contact.email}</a>
            </div>
          )}
          {contact.event_type && (
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
              {contact.event_type}
              {contact.celebrant_name ? ` — ${contact.celebrant_name}` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}