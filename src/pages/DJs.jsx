import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Phone, Mail, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import ViewToggle from '@/components/shared/ViewToggle';
import { toast } from 'sonner';

const PRIMARY = '#e94f1c';

export default function DJs() {
  const [djs, setDJs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newDJ, setNewDJ] = useState({});

  useEffect(() => { loadDJs(); }, []);

  const loadDJs = async () => {
    try {
      const [data, usersList] = await Promise.all([
        base44.entities.DJ.list('-created_date'),
        base44.entities.User.list(),
      ]);
      setDJs(data);
      setUsers(usersList);
    } catch { toast.error('שגיאה בטעינת DJ-ים'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => setSelected(prev => prev.size === djs.length ? new Set() : new Set(djs.map(d => d.id)));

  const openEdit = (dj, e) => { if (e) e.stopPropagation(); setEditData({...dj}); setEditOpen(true); };

  const deleteDJ = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('למחוק DJ זה?')) return;
    await base44.entities.DJ.delete(id);
    await loadDJs();
    toast.success('DJ נמחק');
  };

  const deleteSelected = async () => {
    if (!confirm(`למחוק ${selected.size} DJ-ים?`)) return;
    await Promise.all([...selected].map(id => base44.entities.DJ.delete(id)));
    setSelected(new Set());
    await loadDJs();
    toast.success('DJ-ים נמחקו');
  };

  const saveEdit = async () => {
    await base44.entities.DJ.update(editData.id, editData);
    await loadDJs();
    setEditOpen(false);
    toast.success('DJ עודכן');
  };

  const createDJ = async () => {
    if (!newDJ.name || !newDJ.phone || !newDJ.email) { toast.error('חובה למלא שם, טלפון ואימייל'); return; }
    // Check for duplicate email or phone
    const dupEmail = djs.find(d => d.email === newDJ.email);
    const dupPhone = djs.find(d => d.phone === newDJ.phone);
    if (dupEmail) { toast.error('כבר קיים DJ עם אימייל זה'); return; }
    if (dupPhone) { toast.error('כבר קיים DJ עם טלפון זה'); return; }
    await base44.entities.DJ.create({ ...newDJ, status: 'ACTIVE' });
    await loadDJs();
    toast.success('DJ חדש נוצר');
    setCreateOpen(false); setNewDJ({});
  };

  const getStatusColor = (s) => s === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PRIMARY }} /></div>;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary/5 to-transparent p-8 rounded-3xl border border-primary/10">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#0f172a', fontFamily: 'Assistant, sans-serif' }}>תקליטנים</h1>
          <p className="text-slate-500 font-medium max-w-md">ניהול צוות ה-DJ-ים שלך</p>
        </div>
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <Sparkles className="absolute left-8 top-1/2 -translate-y-1/2 w-20 h-20 text-primary/10" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="w-4 h-4 ml-1" />מחק {selected.size} נבחרים
            </Button>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shadow-lg font-bold px-5 text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4 ml-2" />DJ חדש
        </Button>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {djs.map(dj => {
            const isSelected = selected.has(dj.id);
            return (
              <div key={dj.id}
                className={`bg-white p-4 rounded-xl shadow-sm border transition-all hover:shadow-md cursor-pointer
                  ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-slate-200 hover:border-primary/20'}`}
                onClick={() => openEdit(dj)}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} onClick={e => toggleSelect(dj.id, e)} className="mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY}20` }}>
                        <Music className="w-5 h-5" style={{ color: PRIMARY }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{dj.name}</h3>
                        <Badge className={getStatusColor(dj.status)}>{dj.status === 'ACTIVE' ? 'פעיל' : 'לא פעיל'}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{dj.phone}</div>
                      <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{dj.email}</div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span>אירועים: {dj.total_events || 0}</span>
                        {dj.unavailable_dates?.length > 0 && <span className="text-xs">{dj.unavailable_dates.length} תאריכים חסומים</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={e => openEdit(dj, e)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={e => deleteDJ(dj.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {djs.length === 0 && <div className="col-span-full bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">אין DJ-ים במערכת</div>}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold">
                <th className="px-4 py-3"><Checkbox checked={selected.size === djs.length && djs.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="text-right px-4 py-3">שם</th>
                <th className="text-right px-4 py-3">טלפון</th>
                <th className="text-right px-4 py-3">אימייל</th>
                <th className="text-right px-4 py-3">סטטוס</th>
                <th className="text-right px-4 py-3">אירועים</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {djs.length === 0 && <tr><td colSpan={7} className="text-center text-slate-500 py-10">אין DJ-ים</td></tr>}
              {djs.map(dj => {
                const isSelected = selected.has(dj.id);
                return (
                  <tr key={dj.id} className={`border-b border-slate-100 hover:bg-primary/5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => openEdit(dj)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(dj.id, { stopPropagation: () => {} })} /></td>
                    <td className="px-4 py-3 font-bold text-slate-900">{dj.name}</td>
                    <td className="px-4 py-3 text-slate-500">{dj.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{dj.email}</td>
                    <td className="px-4 py-3"><Badge className={getStatusColor(dj.status)}>{dj.status === 'ACTIVE' ? 'פעיל' : 'לא פעיל'}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{dj.total_events || 0}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={e => openEdit(dj, e)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={e => deleteDJ(dj.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
          <DialogHeader><DialogTitle>עריכת DJ</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>שם</Label><Input value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} /></div>
            <div><Label>טלפון</Label><Input value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} /></div>
            <div><Label>אימייל</Label><Input type="email" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} /></div>
            <div>
              <Label>סטטוס</Label>
              <Select value={editData.status || 'ACTIVE'} onValueChange={v => setEditData({...editData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">פעיל</SelectItem>
                  <SelectItem value="INACTIVE">לא פעיל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שיוך משתמש</Label>
              <Select value={editData.user_id || '_none_'} onValueChange={v => setEditData({...editData, user_id: v === '_none_' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="ללא שיוך" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">ללא שיוך</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>הערות</Label><Textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} /></div>
            <Button onClick={saveEdit} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>שמור שינויים</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>DJ חדש</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>שם *</Label><Input value={newDJ.name || ''} onChange={e => setNewDJ({...newDJ, name: e.target.value})} /></div>
            <div><Label>טלפון *</Label><Input value={newDJ.phone || ''} onChange={e => setNewDJ({...newDJ, phone: e.target.value})} /></div>
            <div><Label>אימייל *</Label><Input type="email" value={newDJ.email || ''} onChange={e => setNewDJ({...newDJ, email: e.target.value})} /></div>
            <div><Label>הערות</Label><Textarea value={newDJ.notes || ''} onChange={e => setNewDJ({...newDJ, notes: e.target.value})} /></div>
            <Button onClick={createDJ} className="w-full font-bold text-white" style={{ backgroundColor: PRIMARY }}>צור DJ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}