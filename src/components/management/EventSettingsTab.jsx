import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const STAT_OPTIONS = [
  { key: 'events_this_month', defaultLabel: 'אירועים החודש', settingKey: 'stat_events_this_month_label' },
  { key: 'open_contracts', defaultLabel: 'חוזים פתוחים', settingKey: 'stat_open_contracts_label' },
  { key: 'monthly_revenue', defaultLabel: 'הכנסות החודש', settingKey: 'stat_monthly_revenue_label' },
  { key: 'new_leads', defaultLabel: 'לידים חדשים', settingKey: 'stat_new_leads_label' },
];

const ALL_EVENT_FIELDS = [
  { key: 'customer_id', defaultLabel: 'לקוח' },
  { key: 'event_date', defaultLabel: 'תאריך' },
  { key: 'event_type', defaultLabel: 'סוג אירוע' },
  { key: 'package_id', defaultLabel: 'חבילה' },
  { key: 'location', defaultLabel: 'מיקום' },
  { key: 'event_status', defaultLabel: 'סטטוס אירוע' },
  { key: 'payment_status', defaultLabel: 'סטטוס תשלום' },
  { key: 'dj_id', defaultLabel: 'DJ' },
  { key: 'last_payment_method', defaultLabel: 'אמצעי תשלום' },
  { key: 'notes', defaultLabel: 'הערות' },
];

const CREATE_FIELDS = ['customer_id', 'event_date', 'event_type', 'package_id', 'location', 'notes'];
const EDIT_FIELDS = ALL_EVENT_FIELDS.map(f => f.key);

export default function EventSettingsTab({ eventSettings, setEventSettings }) {
  const es = eventSettings || {};

  const visibleStats = es.visible_stats || STAT_OPTIONS.map(s => s.key);
  const createVisibleFields = es.create_visible_fields || ['customer_id', 'event_date', 'event_type', 'package_id', 'location'];
  const editVisibleFields = es.edit_visible_fields || EDIT_FIELDS;
  const fieldLabels = es.field_labels || {};

  const toggleStat = (key) => {
    const current = [...visibleStats];
    const idx = current.indexOf(key);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(key);
    setEventSettings({ ...es, visible_stats: current });
  };

  const toggleCreateField = (key) => {
    const current = [...createVisibleFields];
    const idx = current.indexOf(key);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(key);
    setEventSettings({ ...es, create_visible_fields: current });
  };

  const toggleEditField = (key) => {
    const current = [...editVisibleFields];
    const idx = current.indexOf(key);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(key);
    setEventSettings({ ...es, edit_visible_fields: current });
  };

  const updateFieldLabel = (key, value) => {
    setEventSettings({ ...es, field_labels: { ...fieldLabels, [key]: value } });
  };

  const save = async () => {
    try {
      if (es.id) {
        await base44.entities.EventSettings.update(es.id, es);
      } else {
        const created = await base44.entities.EventSettings.create(es);
        setEventSettings(created);
      }
      toast.success('הגדרות האירועים נשמרו');
    } catch {
      toast.error('שגיאה בשמירה');
    }
  };

  return (
    <div className="space-y-6">
      {/* Titles and font color */}
      <Card>
        <CardHeader><CardTitle>כותרות וצבע פונט</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>כותרת דף האירועים</Label>
              <Input value={es.events_title || 'אירועים'} onChange={e => setEventSettings({ ...es, events_title: e.target.value })} dir="rtl" />
            </div>
            <div>
              <Label>צבע פונט ראשי</Label>
              <Input type="color" value={es.events_font_color || '#0f172a'} onChange={e => setEventSettings({ ...es, events_font_color: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>תת כותרת</Label>
            <Input value={es.events_subtitle || ''} onChange={e => setEventSettings({ ...es, events_subtitle: e.target.value })} dir="rtl" />
          </div>
        </CardContent>
      </Card>

      {/* Visible stats */}
      <Card>
        <CardHeader><CardTitle>כרטיסי נתונים (סטטיסטיקות)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">בחר אילו כרטיסי נתונים להציג בדף האירועים, ושנה את הטקסט שלהם.</p>
          {STAT_OPTIONS.map(stat => {
            const isVisible = visibleStats.includes(stat.key);
            return (
              <div key={stat.key} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                <Switch checked={isVisible} onCheckedChange={() => toggleStat(stat.key)} />
                <div className="flex-1">
                  <Input
                    value={es[stat.settingKey] || stat.defaultLabel}
                    onChange={e => setEventSettings({ ...es, [stat.settingKey]: e.target.value })}
                    dir="rtl"
                    className="text-sm"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Create dialog fields */}
      <Card>
        <CardHeader><CardTitle>שדות כרטיס "אירוע חדש"</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">בחר אילו שדות יופיעו בטופס יצירת אירוע חדש, ושנה את הטקסט של כל שדה.</p>
          {CREATE_FIELDS.map(key => {
            const field = ALL_EVENT_FIELDS.find(f => f.key === key);
            const isVisible = createVisibleFields.includes(key);
            return (
              <div key={key} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                <Checkbox checked={isVisible} onCheckedChange={() => toggleCreateField(key)} />
                <div className="flex-1">
                  <Input
                    value={fieldLabels[key] || field.defaultLabel}
                    onChange={e => updateFieldLabel(key, e.target.value)}
                    dir="rtl"
                    className="text-sm"
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono">{key}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit dialog fields */}
      <Card>
        <CardHeader><CardTitle>שדות כרטיס "עריכת אירוע"</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">בחר אילו שדות יופיעו בטופס עריכת אירוע, ושנה את הטקסט של כל שדה.</p>
          {EDIT_FIELDS.map(key => {
            const field = ALL_EVENT_FIELDS.find(f => f.key === key);
            const isVisible = editVisibleFields.includes(key);
            return (
              <div key={key} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                <Checkbox checked={isVisible} onCheckedChange={() => toggleEditField(key)} />
                <div className="flex-1">
                  <Input
                    value={fieldLabels[key] || field.defaultLabel}
                    onChange={e => updateFieldLabel(key, e.target.value)}
                    dir="rtl"
                    className="text-sm"
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono">{key}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full bg-orange-500 hover:bg-orange-600">
        שמור הגדרות אירועים
      </Button>
    </div>
  );
}