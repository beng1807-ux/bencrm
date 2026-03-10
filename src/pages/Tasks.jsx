import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ListChecks, CheckCircle, Circle, Plus, Pencil, Trash2, Calendar, TrendingUp, LayoutGrid, List, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PRIMARY = '#ec5b13';

const PRIORITY_LABELS = { HIGH: 'גבוהה', NORMAL: 'רגילה', LOW: 'נמוכה' };
const PRIORITY_COLORS = { HIGH: 'bg-red-100 text-red-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [taskEvents, setTaskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const [data, leadsData, eventsData] = await Promise.all([
        base44.entities.Task.list('-created_date'),
        base44.entities.Lead.list(),
        base44.entities.Event.list(),
      ]);
      setTasks(data);
      setLeads(leadsData);
      setTaskEvents(eventsData);
    } catch { toast.error('שגיאה בטעינת משימות'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id, e) => { if (e) e.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => setSelected(prev => prev.size === tasks.length ? new Set() : new Set(tasks.map(t => t.id)));

  const toggleDone = async (task, e) => {
    if (e) e.stopPropagation();
    await base44.entities.Task.update(task.id, { status: task.status === 'OPEN' ? 'DONE' : 'OPEN' });
    await loadTasks();
  };

  const openEdit = (task, e) => { if (e) e.stopPropagation(); setEditData({...task}); setEditOpen(true); };

  const deleteTask = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('למחוק משימה זו?')) return;
    await base44.entities.Task.delete(id);
    await loadTasks();
    toast.success('משימה נמחקה');
  };

  const deleteSelected = async () => {
    if (!confirm(`למחוק ${selected.size} משימות?`)) return;
    await Promise.all([...selected].map(id => base44.entities.Task.delete(id)));
    setSelected(new Set());
    await loadTasks();
    toast.success('משימות נמחקו');
  };

  const saveEdit = async () => {
    await base44.entities.Task.update(editData.id, editData);
    await loadTasks();
    setEditOpen(false);
    toast.success('משימה עודכנה');
  };

  const createTask = async () => {
    if (!newTask.title) { toast.error('חובה להזין כותרת'); return; }
    await base44.entities.Task.create({ ...newTask, status: 'OPEN', priority: newTask.priority || 'NORMAL' });
    await loadTasks();
    toast.success('משימה חדשה נוצרה');
    setCreateOpen(false); setNewTask({});
  };

  // Stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const isToday = (d) => d && d.startsWith(todayStr);
    const isThisWeek = (d) => d && new Date(d) >= startOfWeek;
    const isThisMonth = (d) => d && new Date(d) >= startOfMonth;

    const newToday = tasks.filter(t => isToday(t.created_date?.split('T')[0])).length;
    const doneToday = tasks.filter(t => t.status === 'DONE' && isToday(t.updated_date?.split('T')[0])).length;
    const doneWeek = tasks.filter(t => t.status === 'DONE' && isThisWeek(t.updated_date)).length;
    const doneMonth = tasks.filter(t => t.status === 'DONE' && isThisMonth(t.updated_date)).length;
    const openTotal = tasks.filter(t => t.status === 'OPEN').length;
    const doneTotal = tasks.filter(t => t.status === 'DONE').length;

    return { newToday, doneToday, doneWeek, doneMonth, openTotal, doneTotal };
  }, [tasks]);

  const completionRate = stats.openTotal + stats.doneTotal > 0
    ? Math.round((stats.doneTotal / (stats.openTotal + stats.doneTotal)) * 100) : 0;

  // Filtering
  const filteredTasks = tasks.filter(t => {
    const matchSearch = !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openTasks = filteredTasks.filter(t => t.status === 'OPEN');
  const doneTasks = filteredTasks.filter(t => t.status === 'DONE');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2" style={{ color: '#0f172a' }}>משימות</h2>
          <p className="text-slate-500 font-medium max-w-md">ניהול המשימות שלך — תעדוף, מעקב וביצוע</p>
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-200" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8" />
              <circle className="text-primary" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.59" strokeDashoffset={301.59 * (1 - completionRate / 100)} strokeLinecap="round" strokeWidth="10" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{stats.doneTotal}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">מתוך {stats.openTotal + stats.doneTotal}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">שיעור השלמה</p>
            <p className="text-xl font-black text-primary">{completionRate}% הושלמו</p>
          </div>
        </div>
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'משימות חדשות היום', value: stats.newToday, icon: <Plus className="w-6 h-6" />, iconBg: 'bg-primary/10 text-primary', badge: 'היום', badgeColor: 'text-blue-500 bg-blue-500/10', onClick: () => { setFilterStatus('OPEN'); } },
          { label: 'בוצעו היום', value: stats.doneToday, icon: <CheckCircle className="w-6 h-6" />, iconBg: 'bg-emerald-500/10 text-emerald-500', badge: 'היום', badgeColor: 'text-emerald-500 bg-emerald-500/10', onClick: () => { setFilterStatus('DONE'); } },
          { label: 'בוצעו השבוע', value: stats.doneWeek, icon: <TrendingUp className="w-6 h-6" />, iconBg: 'bg-amber-500/10 text-amber-500', badge: 'שבועי', badgeColor: 'text-amber-500 bg-amber-500/10', onClick: () => { setFilterStatus('DONE'); } },
          { label: 'בוצעו החודש', value: stats.doneMonth, icon: <Calendar className="w-6 h-6" />, iconBg: 'bg-slate-500/10 text-slate-500', badge: 'חודשי', badgeColor: 'text-slate-500 bg-slate-500/10', onClick: () => { setFilterStatus('DONE'); } },
        ].map((s, i) => (
          <div key={i} onClick={s.onClick} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.iconBg}`}>{s.icon}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.badgeColor}`}>{s.badge}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{s.label}</p>
            <h3 className="text-3xl font-extrabold mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('table')}
                className={`px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-4 h-4" />רשימה
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid className="w-4 h-4" />כרטיסים
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <button onClick={() => setFilterStatus('ALL')} className={`text-sm font-black pb-1 ${filterStatus === 'ALL' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>הכל</button>
              <button onClick={() => setFilterStatus('OPEN')} className={`text-sm font-bold pb-1 ${filterStatus === 'OPEN' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>פתוחות</button>
              <button onClick={() => setFilterStatus('DONE')} className={`text-sm font-bold pb-1 ${filterStatus === 'DONE' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>הושלמו</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pr-10 w-64 bg-slate-50 border-slate-200" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="flex items-center gap-2 font-bold">
                <Trash2 className="w-4 h-4" />מחק {selected.size} נבחרים
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              <Plus className="w-4 h-4 ml-2" />משימה חדשה
            </Button>
          </div>
        </div>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredTasks.map(task => {
              const isSelected = selected.has(task.id);
              const isDone = task.status === 'DONE';
              return (
                <div key={task.id}
                  onClick={() => openEdit(task)}
                  className={`bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative cursor-pointer hover:shadow-md transition-all ${isDone ? 'opacity-60' : ''} ${isSelected ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${isDone ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                      {isDone ? 'הושלם' : 'פתוח'}
                    </span>
                  </div>
                  <div className="absolute top-6 right-6 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(task.id)} />
                    <div className="cursor-pointer" onClick={e => toggleDone(task, e)}>
                      {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                  <div className="mb-6 pr-16 pt-4">
                    <h4 className={`text-xl font-black text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                    {task.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
                  </div>
                  <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-bold">{task.due_at ? new Date(task.due_at).toLocaleDateString('he-IL') : 'ללא תאריך יעד'}</span>
                  </div>
                  <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                  {task.related_lead_id && (() => {
                    const lead = leads.find(l => l.id === task.related_lead_id);
                    return lead ? (
                      <Link to={createPageUrl(`Customers?status=${lead.status}`)} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />{lead.contact_name}
                      </Link>
                    ) : null;
                  })()}
                  {task.related_event_id && (() => {
                    const ev = taskEvents.find(e => e.id === task.related_event_id);
                    return ev ? (
                      <Link to={createPageUrl(`Events?eventId=${ev.id}`)} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />{ev.event_type} — {new Date(ev.event_date).toLocaleDateString('he-IL')}
                      </Link>
                    ) : null;
                  })()}
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="col-span-full bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
                {filterStatus === 'DONE' ? 'אין משימות שהושלמו' : filterStatus === 'OPEN' ? 'כל המשימות הושלמו! 🎉' : 'אין משימות'}
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-sm font-bold uppercase tracking-wider">
                  <th className="px-4 py-5 border-b border-slate-100"><Checkbox checked={selected.size === filteredTasks.length && filteredTasks.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="px-8 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">משימה</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">עדיפות</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">תאריך יעד</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
                  <th className="px-8 py-5 border-b border-slate-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-slate-500 py-10">אין משימות התואמות את הסינון</td></tr>
                )}
                {filteredTasks.map(task => {
                  const isSelected = selected.has(task.id);
                  const isDone = task.status === 'DONE';
                  return (
                    <tr key={task.id}
                      onClick={() => openEdit(task)}
                      className={`hover:bg-slate-50/50 transition-all group cursor-pointer ${isDone ? 'opacity-50' : ''} ${isSelected ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-6" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(task.id)} />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="cursor-pointer" onClick={e => toggleDone(task, e)}>
                            {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                          </div>
                          <div>
                            <p className={`font-black text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                            {task.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              {task.related_lead_id && (() => {
                                const lead = leads.find(l => l.id === task.related_lead_id);
                                return lead ? (
                                  <Link to={createPageUrl(`Customers?status=${lead.status}`)} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                    <ExternalLink className="w-3 h-3" />{lead.contact_name}
                                  </Link>
                                ) : null;
                              })()}
                              {task.related_event_id && (() => {
                                const ev = taskEvents.find(e => e.id === task.related_event_id);
                                return ev ? (
                                  <Link to={createPageUrl(`Events?eventId=${ev.id}`)} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                                    <ExternalLink className="w-3 h-3" />{ev.event_type}
                                  </Link>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6"><Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge></td>
                      <td className="px-6 py-6 text-sm font-bold text-slate-600">{task.due_at ? new Date(task.due_at).toLocaleDateString('he-IL') : '—'}</td>
                      <td className="px-6 py-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isDone ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                          {isDone ? 'הושלם' : 'פתוח'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-left" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={e => openEdit(task, e)} className="p-2 text-slate-300 hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={e => deleteTask(task.id, e)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">מציג {filteredTasks.length} משימות</p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>עריכת משימה</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>כותרת</Label><Input value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} /></div>
            <div><Label>תיאור</Label><Textarea value={editData.description || ''} onChange={e => setEditData({...editData, description: e.target.value})} placeholder="תיאור המשימה..." className="min-h-[80px]" /></div>
            <div>
              <Label>עדיפות</Label>
              <Select value={editData.priority || 'NORMAL'} onValueChange={v => setEditData({...editData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">נמוכה</SelectItem>
                  <SelectItem value="NORMAL">רגילה</SelectItem>
                  <SelectItem value="HIGH">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={editData.status || 'OPEN'} onValueChange={v => setEditData({...editData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">פתוח</SelectItem>
                  <SelectItem value="DONE">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>תאריך יעד</Label><Input type="datetime-local" value={editData.due_at || ''} onChange={e => setEditData({...editData, due_at: e.target.value})} /></div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1 font-bold text-white" style={{ backgroundColor: PRIMARY }}>שמור שינויים</Button>
              <Button variant="destructive" onClick={() => { setEditOpen(false); deleteTask(editData.id); }} className="font-bold"><Trash2 className="w-4 h-4 ml-1" />מחק</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>משימה חדשה</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>כותרת *</Label><Input value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
            <div><Label>תיאור</Label><Textarea value={newTask.description || ''} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="תיאור המשימה..." className="min-h-[80px]" /></div>
            <div>
              <Label>עדיפות</Label>
              <Select value={newTask.priority || 'NORMAL'} onValueChange={v => setNewTask({...newTask, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">נמוכה</SelectItem>
                  <SelectItem value="NORMAL">רגילה</SelectItem>
                  <SelectItem value="HIGH">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>תאריך יעד</Label><Input type="datetime-local" value={newTask.due_at || ''} onChange={e => setNewTask({...newTask, due_at: e.target.value})} /></div>
            <Button onClick={createTask} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>צור משימה</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}