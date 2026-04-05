import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListChecks, CheckCircle, Clock, Phone, Plus, Trash2, Calendar, TrendingUp, LayoutGrid, List, Search } from 'lucide-react';
import { toast } from 'sonner';

import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskFormDialog from '../components/tasks/TaskFormDialog';

const PRIMARY = '#ec5b13';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
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
      const [data, contactsData, eventsData] = await Promise.all([
        base44.entities.Task.list('-created_date'),
        base44.entities.Contact.list(),
        base44.entities.Event.list(),
      ]);
      setTasks(data);
      setContacts(contactsData);
      setTaskEvents(eventsData);
    } catch { toast.error('שגיאה בטעינת משימות'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => setSelected(prev => prev.size === filteredTasks.length ? new Set() : new Set(filteredTasks.map(t => t.id)));

  const updateStatus = async (task, newStatus) => {
    await base44.entities.Task.update(task.id, { status: newStatus });
    await loadTasks();
  };

  const openEdit = (task) => { setEditData({ ...task }); setEditOpen(true); };

  const deleteTask = async (id) => {
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
    await base44.entities.Task.create({ ...newTask, status: newTask.status || 'PENDING', priority: newTask.priority || 'NORMAL' });
    await loadTasks();
    toast.success('משימה חדשה נוצרה');
    setCreateOpen(false);
    setNewTask({});
  };

  // Stats
  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const called = tasks.filter(t => t.status === 'CALLED').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const total = tasks.length;
    return { pending, called, done, total };
  }, [tasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // Filtering
  const filteredTasks = tasks.filter(t => {
    const matchSearch = !searchTerm ||
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  return (
    <div className="space-y-8" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-5 md:p-8 rounded-3xl border border-primary/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ color: '#0f172a' }}>משימות</h2>
          <p className="text-slate-500 font-medium max-w-md text-sm md:text-base">ניהול המשימות שלך — תעדוף, מעקב וביצוע</p>
        </div>
        <div className="flex items-center gap-4 md:gap-8 relative z-10">
          <div className="relative flex items-center justify-center w-20 h-20 md:w-28 md:h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-slate-200" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8" />
              <circle className="text-primary" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeDasharray="301.59" strokeDashoffset={301.59 * (1 - completionRate / 100)} strokeLinecap="round" strokeWidth="10" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900">{stats.done}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">מתוך {stats.total}</span>
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
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div onClick={() => setFilterStatus('PENDING')} className="bg-white p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-orange-500/10 text-orange-500"><Clock className="w-4 h-4 md:w-6 md:h-6" /></div>
            <span className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-orange-500 bg-orange-500/10">ממתין</span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium">ממתינות</p>
          <h3 className="text-2xl md:text-3xl font-extrabold mt-1">{stats.pending}</h3>
        </div>
        <div onClick={() => setFilterStatus('CALLED')} className="bg-white p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500"><Phone className="w-4 h-4 md:w-6 md:h-6" /></div>
            <span className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-blue-500 bg-blue-500/10">שיחה</span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium">בוצעה שיחה</p>
          <h3 className="text-2xl md:text-3xl font-extrabold mt-1">{stats.called}</h3>
        </div>
        <div onClick={() => setFilterStatus('DONE')} className="bg-white p-3 md:p-6 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500"><CheckCircle className="w-4 h-4 md:w-6 md:h-6" /></div>
            <span className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-emerald-500 bg-emerald-500/10">הושלם</span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium">הושלמו</p>
          <h3 className="text-2xl md:text-3xl font-extrabold mt-1">{stats.done}</h3>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('table')}
                className={`px-3 md:px-6 py-2 rounded-lg text-xs md:text-sm font-black flex items-center gap-1 md:gap-2 transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-4 h-4" />רשימה
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`px-3 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid className="w-4 h-4" />כרטיסים
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setFilterStatus('ALL')} className={`text-xs md:text-sm font-black pb-1 ${filterStatus === 'ALL' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>הכל</button>
              <button onClick={() => setFilterStatus('PENDING')} className={`text-xs md:text-sm font-bold pb-1 ${filterStatus === 'PENDING' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>ממתין</button>
              <button onClick={() => setFilterStatus('CALLED')} className={`text-xs md:text-sm font-bold pb-1 ${filterStatus === 'CALLED' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>שיחה</button>
              <button onClick={() => setFilterStatus('DONE')} className={`text-xs md:text-sm font-bold pb-1 ${filterStatus === 'DONE' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>הושלם</button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pr-10 bg-slate-50 border-slate-200 w-full" placeholder="חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {selected.size > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteSelected} className="flex items-center gap-2 font-bold">
                <Trash2 className="w-4 h-4" />מחק {selected.size}
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
              const contact = contacts.find(c => c.id === task.related_contact_id);
              const event = taskEvents.find(e => e.id === task.related_event_id);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  contact={contact}
                  event={event}
                  isSelected={selected.has(task.id)}
                  onSelect={toggleSelect}
                  onToggleStatus={updateStatus}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                />
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="col-span-full bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
                אין משימות התואמות את הסינון
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <TaskTable
            tasks={filteredTasks}
            contacts={contacts}
            events={taskEvents}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onToggleStatus={updateStatus}
            onEdit={openEdit}
            onDelete={deleteTask}
          />
        )}

        {/* Pagination */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">מציג {filteredTasks.length} משימות</p>
        </div>
      </div>

      {/* Edit Dialog */}
      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        data={editData}
        onChange={setEditData}
        onSave={saveEdit}
        onDelete={() => { setEditOpen(false); deleteTask(editData.id); }}
        contacts={contacts}
        isNew={false}
      />

      {/* Create Dialog */}
      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        data={newTask}
        onChange={setNewTask}
        onSave={createTask}
        contacts={contacts}
        isNew={true}
      />
    </div>
  );
}