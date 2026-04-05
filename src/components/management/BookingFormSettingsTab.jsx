import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Plus, GripVertical, Copy, Link, ChevronDown, ChevronUp, Image, Video, Eye } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'טקסט' },
  { value: 'tel', label: 'טלפון' },
  { value: 'email', label: 'אימייל' },
  { value: 'date', label: 'תאריך' },
  { value: 'number', label: 'מספר' },
  { value: 'select', label: 'בורר (רשימה)' },
  { value: 'textarea', label: 'טקסט ארוך' },
  { value: 'checkbox_group', label: 'צ\'קבוקסים (מרובה)' },
  { value: 'checkbox', label: 'צ\'קבוקס בודד' },
];

export default function BookingFormSettingsTab() {
  const [bfSettings, setBfSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ form: false, success: false });
  const [expandedField, setExpandedField] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const list = await base44.entities.BookingFormSettings.list();
    if (list.length > 0) {
      setBfSettings(list[0]);
    } else {
      setBfSettings({});
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (bfSettings.id) {
        await base44.entities.BookingFormSettings.update(bfSettings.id, bfSettings);
      } else {
        const created = await base44.entities.BookingFormSettings.create(bfSettings);
        setBfSettings(created);
      }
      toast.success('הגדרות טופס ההזמנה נשמרו');
    } catch (err) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, [target]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isVideo = file.type.startsWith('video/');
      if (target === 'form') {
        setBfSettings(prev => ({ ...prev, form_bg_url: file_url, form_bg_type: isVideo ? 'video' : 'image' }));
      } else {
        setBfSettings(prev => ({ ...prev, success_bg_url: file_url, success_bg_type: isVideo ? 'video' : 'image' }));
      }
      toast.success('הקובץ הועלה בהצלחה');
    } catch {
      toast.error('שגיאה בהעלאה');
    } finally {
      setUploading(prev => ({ ...prev, [target]: false }));
    }
  };

  const updateField = (index, key, value) => {
    const fields = [...(bfSettings.form_fields || [])];
    fields[index] = { ...fields[index], [key]: value };
    setBfSettings(prev => ({ ...prev, form_fields: fields }));
  };

  const removeField = (index) => {
    const fields = [...(bfSettings.form_fields || [])];
    fields.splice(index, 1);
    setBfSettings(prev => ({ ...prev, form_fields: fields }));
  };

  const addField = () => {
    const fields = [...(bfSettings.form_fields || [])];
    fields.push({ key: `field_${Date.now()}`, label: 'שדה חדש', type: 'text', required: false, visible: true, placeholder: '', half_width: true });
    setBfSettings(prev => ({ ...prev, form_fields: fields }));
    setExpandedField(fields.length - 1);
  };

  const moveField = (index, direction) => {
    const fields = [...(bfSettings.form_fields || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
    setBfSettings(prev => ({ ...prev, form_fields: fields }));
    setExpandedField(newIndex);
  };

  const copyFormLink = () => {
    const link = bfSettings.form_link || `${window.location.origin}/BookingForm`;
    navigator.clipboard.writeText(link);
    toast.success('הקישור הועתק!');
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  const fields = bfSettings.form_fields || [];

  return (
    <div className="space-y-6">
      {/* מייל התראות */}
      <Card>
        <CardHeader><CardTitle>מייל התראות טופס הזמנה</CardTitle></CardHeader>
        <CardContent>
          <div>
            <Label>מייל לקבלת התראות (אם ריק — ייקח מהגדרות כלליות)</Label>
            <Input
              type="email"
              value={bfSettings.notification_email || ''}
              onChange={e => setBfSettings(prev => ({ ...prev, notification_email: e.target.value }))}
              placeholder="beng1807@gmail.com"
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-2">השאר ריק כדי להשתמש במייל שהוגדר בהגדרות כלליות</p>
          </div>
        </CardContent>
      </Card>

      {/* קישור לטופס */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Link className="w-5 h-5" />קישור ייעודי לטופס</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>כתובת הקישור</Label>
              <Input
                value={bfSettings.form_link || `${window.location.origin}/BookingForm`}
                onChange={e => setBfSettings(prev => ({ ...prev, form_link: e.target.value }))}
                dir="ltr"
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={copyFormLink} variant="outline" className="flex items-center gap-2">
              <Copy className="w-4 h-4" />העתק קישור
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">הקישור הזה ישלח ללקוחות שלך למילוי טופס פרטי אירוע</p>
        </CardContent>
      </Card>

      {/* טקסטים ורקע - טופס */}
      <Card>
        <CardHeader><CardTitle>הגדרות טופס ההזמנה</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>כותרת ראשית</Label>
              <Input value={bfSettings.form_title || ''} onChange={e => setBfSettings(prev => ({ ...prev, form_title: e.target.value }))} dir="rtl" />
            </div>
            <div>
              <Label>כותרת משנה</Label>
              <Input value={bfSettings.form_subtitle || ''} onChange={e => setBfSettings(prev => ({ ...prev, form_subtitle: e.target.value }))} dir="rtl" />
            </div>
            <div className="md:col-span-2">
              <Label>תיאור</Label>
              <Textarea value={bfSettings.form_description || ''} onChange={e => setBfSettings(prev => ({ ...prev, form_description: e.target.value }))} dir="rtl" />
            </div>
            <div>
              <Label>טקסט כפתור שליחה</Label>
              <Input value={bfSettings.form_button_text || ''} onChange={e => setBfSettings(prev => ({ ...prev, form_button_text: e.target.value }))} dir="rtl" />
            </div>
          </div>

          {/* מדיה רקע */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              {bfSettings.form_bg_type === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
              רקע טופס (תמונה או וידאו)
            </h4>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {bfSettings.form_bg_url && (
                bfSettings.form_bg_type === 'video' ? (
                  <video src={bfSettings.form_bg_url} className="h-16 w-24 md:h-20 md:w-32 object-cover rounded border" muted autoPlay loop />
                ) : (
                  <img src={bfSettings.form_bg_url} alt="רקע" className="h-16 w-24 md:h-20 md:w-32 object-cover rounded border" />
                )
              )}
              <label className="cursor-pointer flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium">
                <Upload size={16} />
                {uploading.form ? 'מעלה...' : 'העלה'}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => handleMediaUpload(e, 'form')} disabled={uploading.form} />
              </label>
              <Select value={bfSettings.form_bg_type || 'image'} onValueChange={v => setBfSettings(prev => ({ ...prev, form_bg_type: v }))}>
                <SelectTrigger className="w-24 md:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">תמונה</SelectItem>
                  <SelectItem value="video">וידאו</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* טקסטים ורקע - דף אישור */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>הגדרות דף אישור</span>
            <a href={createPageUrl('BookingSuccessPreview')} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />תצוגה מקדימה
              </Button>
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>כותרת הצלחה</Label>
              <Input value={bfSettings.success_title || ''} onChange={e => setBfSettings(prev => ({ ...prev, success_title: e.target.value }))} dir="rtl" />
            </div>
            <div>
              <Label>כותרת משנה</Label>
              <Input value={bfSettings.success_subtitle || ''} onChange={e => setBfSettings(prev => ({ ...prev, success_subtitle: e.target.value }))} dir="rtl" />
            </div>
            <div className="md:col-span-2">
              <Label>תיאור</Label>
              <Textarea value={bfSettings.success_description || ''} onChange={e => setBfSettings(prev => ({ ...prev, success_description: e.target.value }))} dir="rtl" />
            </div>
            <div>
              <Label>טקסט כפתור</Label>
              <Input value={bfSettings.success_button_text || ''} onChange={e => setBfSettings(prev => ({ ...prev, success_button_text: e.target.value }))} dir="rtl" />
            </div>
          </div>

          {/* מדיה רקע אישור */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              {bfSettings.success_bg_type === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
              רקע דף אישור (תמונה או וידאו)
            </h4>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {bfSettings.success_bg_url && (
                bfSettings.success_bg_type === 'video' ? (
                  <video src={bfSettings.success_bg_url} className="h-16 w-24 md:h-20 md:w-32 object-cover rounded border" muted autoPlay loop />
                ) : (
                  <img src={bfSettings.success_bg_url} alt="רקע" className="h-16 w-24 md:h-20 md:w-32 object-cover rounded border" />
                )
              )}
              <label className="cursor-pointer flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium">
                <Upload size={16} />
                {uploading.success ? 'מעלה...' : 'העלה'}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => handleMediaUpload(e, 'success')} disabled={uploading.success} />
              </label>
              <Select value={bfSettings.success_bg_type || 'image'} onValueChange={v => setBfSettings(prev => ({ ...prev, success_bg_type: v }))}>
                <SelectTrigger className="w-24 md:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">תמונה</SelectItem>
                  <SelectItem value="video">וידאו</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* שדות הטופס */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>שדות הטופס ({fields.length})</span>
            <Button onClick={addField} size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 ml-1" />הוסף שדה
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.key + index} className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedField(expandedField === index ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm">{field.label}</span>
                  {field.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">חובה</span>}
                  {!field.visible && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">מוסתר</span>}
                  <span className="text-xs text-gray-400">{FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); moveField(index, -1); }} disabled={index === 0}><ChevronUp className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); moveField(index, 1); }} disabled={index === fields.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); removeField(index); }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Expanded */}
              {expandedField === index && (
                <div className="p-4 space-y-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>מפתח (שם פנימי)</Label>
                      <Input value={field.key} onChange={e => updateField(index, 'key', e.target.value)} dir="ltr" className="font-mono text-sm" />
                    </div>
                    <div>
                      <Label>תווית תצוגה</Label>
                      <Input value={field.label} onChange={e => updateField(index, 'label', e.target.value)} dir="rtl" />
                    </div>
                    <div>
                      <Label>סוג שדה</Label>
                      <Select value={field.type} onValueChange={v => updateField(index, 'type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Placeholder</Label>
                      <Input value={field.placeholder || ''} onChange={e => updateField(index, 'placeholder', e.target.value)} dir="rtl" />
                    </div>
                  </div>

                  {(field.type === 'select' || field.type === 'checkbox_group') && (
                    <div>
                      <Label>אפשרויות (מופרדות בפסיקים)</Label>
                      <Input
                        value={(field.options || []).join(', ')}
                        onChange={e => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        dir="rtl"
                        placeholder="אפשרות 1, אפשרות 2, אפשרות 3"
                      />
                    </div>
                  )}

                  {field.type === 'checkbox_group' && (
                    <div>
                      <Label>כותרת סקציה</Label>
                      <Input value={field.section_title || ''} onChange={e => updateField(index, 'section_title', e.target.value)} dir="rtl" />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={field.required || false} onCheckedChange={v => updateField(index, 'required', v)} />
                      <Label className="text-sm">חובה</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={field.visible !== false} onCheckedChange={v => updateField(index, 'visible', v)} />
                      <Label className="text-sm">גלוי</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={field.half_width !== false} onCheckedChange={v => updateField(index, 'half_width', v)} />
                      <Label className="text-sm">חצי רוחב</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
        {saving ? 'שומר...' : 'שמור את כל הגדרות הטופס'}
      </Button>
    </div>
  );
}