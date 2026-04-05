import React from 'react';
import { CheckCircle, Circle, Phone, Pencil, Trash2, ExternalLink, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_CONFIG = {
  PENDING: { label: 'ממתין', bg: 'bg-orange-50 text-orange-500' },
  CALLED: { label: 'שיחה', bg: 'bg-blue-50 text-blue-500' },
  DONE: { label: 'הושלם', bg: 'bg-green-50 text-green-500' },
};

const PRIORITY_LABELS = { HIGH: 'גבוהה', NORMAL: 'רגילה', LOW: 'נמוכה' };
const PRIORITY_COLORS = { HIGH: 'bg-red-100 text-red-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };

export default function TaskTable({ tasks, contacts, events, selected, onToggleSelect, onToggleAll, onToggleStatus, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-slate-50/50 text-slate-500 text-sm font-bold uppercase tracking-wider">
            <th className="px-4 py-5 border-b border-slate-100">
              <Checkbox checked={selected.size === tasks.length && tasks.length > 0} onCheckedChange={onToggleAll} />
            </th>
            <th className="px-8 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">משימה</th>
            <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">איש קשר</th>
            <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">עדיפות</th>
            <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">תאריך יעד</th>
            <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
            <th className="px-8 py-5 border-b border-slate-100"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.length === 0 && (
            <tr><td colSpan={7} className="text-center text-slate-500 py-10">אין משימות התואמות את הסינון</td></tr>
          )}
          {tasks.map(task => {
            const isSelected = selected.has(task.id);
            const isDone = task.status === 'DONE';
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
            const contact = contacts.find(c => c.id === task.related_contact_id);
            const event = events.find(e => e.id === task.related_event_id);

            const cycleStatus = (e) => {
              e.stopPropagation();
              const order = ['PENDING', 'CALLED', 'DONE'];
              const idx = order.indexOf(task.status);
              onToggleStatus(task, order[(idx + 1) % order.length]);
            };

            return (
              <tr key={task.id}
                onClick={() => onEdit(task)}
                className={`hover:bg-slate-50/50 transition-all group cursor-pointer ${isDone ? 'opacity-50' : ''} ${isSelected ? 'bg-primary/5' : ''}`}>
                <td className="px-4 py-6" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(task.id)} />
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="cursor-pointer" onClick={cycleStatus}>
                      {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                        task.status === 'CALLED' ? <Phone className="w-5 h-5 text-blue-500" /> :
                        <Circle className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <p className={`font-black text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>}
                      {task.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-xs">📝 {task.notes}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6" onClick={e => e.stopPropagation()}>
                  {contact ? (
                    <Link to={createPageUrl(`Customers?status=${contact.status}`)} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />{contact.contact_name}
                    </Link>
                  ) : <span className="text-sm text-slate-400">—</span>}
                </td>
                <td className="px-6 py-6"><Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge></td>
                <td className="px-6 py-6 text-sm font-bold text-slate-600">{task.due_at ? new Date(task.due_at).toLocaleDateString('he-IL') : '—'}</td>
                <td className="px-6 py-6">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${statusCfg.bg}`}>
                    {statusCfg.label}
                  </span>
                </td>
                <td className="px-8 py-6 text-left" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); onEdit(task); }} className="p-2 text-slate-300 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={e => { e.stopPropagation(); onDelete(task.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}