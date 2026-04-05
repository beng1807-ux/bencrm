import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

const PRIMARY = '#ec5b13';

export default function TaskFormDialog({ open, onOpenChange, data, onChange, onSave, onDelete, contacts, isNew }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'משימה חדשה' : 'עריכת משימה'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>כותרת המשימה *</Label>
            <Input
              value={data.title || ''}
              onChange={e => onChange({ ...data, title: e.target.value })}
              placeholder="למשל: מעקב איש קשר, טיפול בהצעת מחיר..."
            />
          </div>

          <div>
            <Label>תיאור נוסף</Label>
            <Textarea
              value={data.description || ''}
              onChange={e => onChange({ ...data, description: e.target.value })}
              placeholder="פרטים נוספים על המשימה..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>איש קשר</Label>
            <Select
              value={data.related_contact_id || '__none__'}
              onValueChange={v => onChange({ ...data, related_contact_id: v === '__none__' ? '' : v })}
            >
              <SelectTrigger><SelectValue placeholder="בחר איש קשר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ללא</SelectItem>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סטטוס</Label>
              <Select
                value={data.status || 'PENDING'}
                onValueChange={v => onChange({ ...data, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">ממתין</SelectItem>
                  <SelectItem value="CALLED">שיחה</SelectItem>
                  <SelectItem value="DONE">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך יעד</Label>
              <Input
                type="date"
                value={data.due_at ? data.due_at.split('T')[0] : ''}
                onChange={e => onChange({ ...data, due_at: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>עדיפות</Label>
            <Select
              value={data.priority || 'NORMAL'}
              onValueChange={v => onChange({ ...data, priority: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">נמוכה</SelectItem>
                <SelectItem value="NORMAL">רגילה</SelectItem>
                <SelectItem value="HIGH">גבוהה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea
              value={data.notes || ''}
              onChange={e => onChange({ ...data, notes: e.target.value })}
              placeholder="הערות..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} className="flex-1 font-bold text-white" style={{ backgroundColor: PRIMARY }}>
              {isNew ? 'צור משימה' : 'שמור שינויים'}
            </Button>
            {!isNew && onDelete && (
              <Button variant="destructive" onClick={onDelete} className="font-bold">
                <Trash2 className="w-4 h-4 ml-1" />מחק
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}