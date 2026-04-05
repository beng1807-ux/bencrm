import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, Phone, Mail, Calendar, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PRIMARY = '#ec5b13';

const STATUS_CONFIG = {
  PENDING: { label: 'ממתין', bg: 'bg-orange-50 text-orange-500', icon: Clock },
  CALLED: { label: 'שיחה', bg: 'bg-blue-50 text-blue-500', icon: Phone },
  DONE: { label: 'הושלם', bg: 'bg-green-50 text-green-500', icon: CheckCircle },
};

const PRIORITY_LABELS = { HIGH: 'גבוהה', NORMAL: 'רגילה', LOW: 'נמוכה' };
const PRIORITY_COLORS = { HIGH: 'bg-red-100 text-red-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };

export default function TaskCard({ task, contact, event, isSelected, onSelect, onToggleStatus, onEdit, onDelete }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDone = task.status === 'DONE';
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

  const cycleStatus = (e) => {
    e.stopPropagation();
    const order = ['PENDING', 'CALLED', 'DONE'];
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    onToggleStatus(task, next);
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative cursor-pointer hover:shadow-md transition-all ${isDone ? 'opacity-60' : ''} ${isSelected ? 'border-primary/40 bg-primary/5' : ''}`}
    >
      {/* Top row: checkbox + status circle + status badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(task.id)} />
          <div className="cursor-pointer" onClick={cycleStatus}>
            {isDone ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : task.status === 'CALLED' ? (
              <Phone className="w-5 h-5 text-blue-500" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${statusCfg.bg}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Title & description */}
      <h4 className={`text-lg font-black text-slate-900 mb-1 ${isDone ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </h4>
      {task.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Contact tooltip area */}
      {contact && (
        <div
          className="relative mb-3"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Link
            to={createPageUrl(`Customers?status=${contact.status}`)}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {contact.contact_name}
          </Link>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 w-64" onClick={e => e.stopPropagation()}>
              <p className="font-bold text-slate-900 mb-2">{contact.contact_name}</p>
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.event_type && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{contact.event_type}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                נוצר: {new Date(task.created_date).toLocaleDateString('he-IL')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2">
        {task.due_at && (
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span className="font-bold">{new Date(task.due_at).toLocaleDateString('he-IL')}</span>
          </div>
        )}
        <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
        {event && (
          <Link
            to={createPageUrl(`Events?eventId=${event.id}`)}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />{event.event_type}
          </Link>
        )}
      </div>

      {/* Notes */}
      {task.notes && (
        <p className="text-xs text-slate-400 mt-2 italic line-clamp-1">📝 {task.notes}</p>
      )}
    </div>
  );
}