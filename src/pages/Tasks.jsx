import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ListChecks, CheckCircle, Circle, Plus, Pencil, Trash2 } from 'lucide-react';
import ViewToggle from '@/components/shared/ViewToggle';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

const PRIORITY_LABELS = { HIGH: 'גבוהה', NORMAL: 'רגילה', LOW: 'נמוכה' };
const PRIORITY_COLORS = { HIGH: 'bg-red-100 text-red-700', NORMAL: 'bg-blue-100 text-blue-700', LOW: 'bg-gray-100 text-gray-700' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({});

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const data = await base44.entities.Task.list('-created_date');
      setTasks(data);
    } catch { toast.error('שגיאה בטעינת משימות'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
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
    await base44.entities.Task.create({ ...newTask, status: 'OPEN', priority: newTask.priority || 'NORMAL' });
    await loadTasks();
    toast.success('משימה חדשה נוצרה');
    setCreateOpen(false); setNewTask({});
  };

  const openTasks = tasks.filter(t => t.status === 'OPEN');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  const TaskCard = ({ task }) => {
    const isSelected = selected.has(task.id);
    const isDone = task.status === 'DONE';
    return (
      <div
        className={`bg-white p-4 rounded-xl shadow-sm border transition-all hover:shadow-md cursor-pointer
          ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-[#e5dedc] hover:border-primary/20'}
          ${isDone ? 'opacity-60' : ''}`}
        onClick={() => openEdit(task)}>
        <div className="flex items-start gap-3">
          <Checkbox checked={isSelected} onCheckedChange={() => {}} onClick={e => toggleSelect(task.id, e)} className="mt-1 flex-shrink-0" />
          <div
            className="flex-shrink-0 mt-0.5 cursor-pointer"
            onClick={e => toggleDone(task, e)}>
            {isDone
              ? <CheckCircle className="w-5 h-5 text-green-500" />
              : <Circle className="w-5 h-5 text-[#886c63]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[#181311] ${isDone ? 'line-through text-[#886c63]' : ''}`}>{task.title}</p>
            {task.due_at && <p className="text-xs text-[#886c63] mt-0.5">יעד: {new Date(task.due_at).toLocaleDateString('he-IL')}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
            <button onClick={e => openEdit(task, e)} className="p-1.5 text-[#886c63] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
            <button onClick={e => deleteTask(task.id, e)} className="p-1.5 text-[#886c63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#181311] tracking-tight">משימות</h1>
          <p className="mt-1 font-medium text-[#886c63] text-sm">{openTasks.length} פתוחות, {doneTasks.length} הושלמו</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold px-5 text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4 ml-2" />משימה חדשה
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            <Trash2 className="w-4 h-4 ml-1" />מחק {selected.size} נבחרים
          </Button>
        )}
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4" style={{ color: PRIMARY }} />
              <span className="font-extrabold text-[#181311]">פתוחות</span>
              <span className="text-xs bg-[#e5dedc] text-[#886c63] px-2 py-0.5 rounded-full font-bold">{openTasks.length}</span>
            </div>
            <div className="space-y-3">
              {openTasks.map(t => <TaskCard key={t.id} task={t} />)}
              {openTasks.length === 0 && (
                <div className="bg-white rounded-xl p-10 text-center border border-[#e5dedc]">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p className="text-[#886c63]">כל המשימות הושלמו! 🎉</p>
                </div>
              )}
            </div>
          </div>
          {doneTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-extrabold text-[#886c63]">הושלמו</span>
                <span className="text-xs bg-[#e5dedc] text-[#886c63] px-2 py-0.5 rounded-full font-bold">{doneTasks.length}</span>
              </div>
              <div className="space-y-3">{doneTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e5dedc]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5dedc] bg-[#f8f6f6] text-[#886c63] text-xs font-bold">
                <th className="px-4 py-3"><Checkbox checked={selected.size === tasks.length && tasks.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="text-right px-4 py-3">כותרת</th>
                <th className="text-right px-4 py-3">עדיפות</th>
                <th className="text-right px-4 py-3">תאריך יעד</th>
                <th className="text-right px-4 py-3">סטטוס</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && <tr><td colSpan={6} className="text-center text-[#886c63] py-10">אין משימות</td></tr>}
              {tasks.map(task => {
                const isSelected = selected.has(task.id);
                const isDone = task.status === 'DONE';
                return (
                  <tr key={task.id} className={`border-b border-[#e5dedc]/50 hover:bg-primary/5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => openEdit(task)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(task.id, { stopPropagation: () => {} })} /></td>
                    <td className="px-4 py-3 font-bold text-[#181311]">
                      <div className="flex items-center gap-2">
                        <div onClick={e => toggleDone(task, e)} className="cursor-pointer">
                          {isDone ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-[#886c63]" />}
                        </div>
                        <span className={isDone ? 'line-through text-[#886c63]' : ''}>{task.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge></td>
                    <td className="px-4 py-3 text-[#886c63]">{task.due_at ? new Date(task.due_at).toLocaleDateString('he-IL') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${isDone ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isDone ? 'הושלם' : 'פתוח'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={e => openEdit(task, e)} className="p-1.5 text-[#886c63] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={e => deleteTask(task.id, e)} className="p-1.5 text-[#886c63] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>עריכת משימה</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>כותרת</Label><Input value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} /></div>
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
            <Button onClick={saveEdit} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>שמור שינויים</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>משימה חדשה</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>כותרת *</Label><Input value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} /></div>
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