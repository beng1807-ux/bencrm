import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListChecks, CheckCircle, Circle, AlertCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({});

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await base44.entities.Task.list('-created_date');
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'DONE' : 'OPEN';
      await base44.entities.Task.update(taskId, { status: newStatus });
      await loadTasks();
      toast.success('המשימה עודכנה');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('שגיאה בעדכון המשימה');
    }
  };

  const createTask = async () => {
    try {
      await base44.entities.Task.create({
        ...newTask,
        status: 'OPEN',
        priority: newTask.priority || 'NORMAL',
      });
      await loadTasks();
      toast.success('משימה חדשה נוצרה');
      setCreateOpen(false);
      setNewTask({});
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('שגיאה ביצירת המשימה');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'HIGH': 'bg-red-100 text-red-800',
      'NORMAL': 'bg-blue-100 text-blue-800',
      'LOW': 'bg-gray-100 text-gray-800',
    };
    return colors[priority] || colors.NORMAL;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'HIGH': 'גבוהה',
      'NORMAL': 'רגילה',
      'LOW': 'נמוכה',
    };
    return labels[priority] || priority;
  };

  const openTasks = tasks.filter(t => t.status === 'OPEN');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-8 h-8" />
            משימות
          </h1>
          <p className="text-gray-600 mt-1">
            {openTasks.length} משימות פתוחות, {doneTasks.length} הושלמו
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 ml-2" />
          משימה חדשה
        </Button>
      </div>

      {/* Open Tasks */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Circle className="w-5 h-5 text-orange-500" />
          משימות פתוחות
        </h2>
        <div className="space-y-3">
          {openTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleTask(task.id, task.status)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.due_at && (
                          <p className="text-sm text-gray-600 mt-1">
                            יעד: {new Date(task.due_at).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {openTasks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>כל המשימות הושלמו! 🎉</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-600">
            <CheckCircle className="w-5 h-5 text-green-500" />
            משימות שהושלמו
          </h2>
          <div className="space-y-3">
            {doneTasks.map(task => (
              <Card key={task.id} className="opacity-60">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium line-through text-gray-600">{task.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>צור משימה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
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
            <div>
              <Label>תאריך יעד</Label>
              <Input type="datetime-local" value={newTask.due_at || ''} onChange={e => setNewTask({...newTask, due_at: e.target.value})} />
            </div>
            <Button onClick={createTask} className="w-full bg-orange-500 hover:bg-orange-600">
              צור משימה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}