import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, MessageSquare, Package as PackageIcon, Palette, Upload, Sparkles, FileText, MessageCircle, BookOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import EventSettingsTab from '../components/management/EventSettingsTab';
import BookingFormSettingsTab from '../components/management/BookingFormSettingsTab';
import WhatsAppAgentTab from '../components/management/WhatsAppAgentTab';
import CrmGuideTab from '../components/management/CrmGuideTab';

export default function Management() {
  const [settings, setSettings] = useState(null);
  const [navSettings, setNavSettings] = useState(null);
  const [customerSettings, setCustomerSettings] = useState(null);
  const [eventSettings, setEventSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());
  const [selectedPackages, setSelectedPackages] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsList, templatesData, packagesData, navList, customerSettingsList, eventSettingsList] = await Promise.all([
        base44.entities.AppSettings.list(),
        base44.entities.MessageTemplate.list(),
        base44.entities.Package.list(),
        base44.entities.NavSettings.list(),
        base44.entities.CustomerSettings.list(),
        base44.entities.EventSettings.list(),
      ]);
      setSettings(settingsList[0] || {});
      setTemplates(templatesData);
      setPackages(packagesData);
      setNavSettings(navList[0] || {});
      setCustomerSettings(customerSettingsList[0] || {});
      setEventSettings(eventSettingsList[0] || {});
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      if (settings.id) {
        await base44.entities.AppSettings.update(settings.id, settings);
      } else {
        const created = await base44.entities.AppSettings.create(settings);
        setSettings(created);
      }
      toast.success('ההגדרות נשמרו בהצלחה');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    }
  };

  const saveTemplate = async (template) => {
    try {
      await base44.entities.MessageTemplate.update(template.id, template);
      toast.success('התבנית נשמרה');
      loadData();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    }
  };

  const saveNavSettings = async () => {
    try {
      if (navSettings.id) {
        await base44.entities.NavSettings.update(navSettings.id, navSettings);
      } else {
        const created = await base44.entities.NavSettings.create(navSettings);
        setNavSettings(created);
      }
      toast.success('הגדרות הניווט נשמרו');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error('שגיאה בשמירה');
    }
  };

  const saveCustomerSettings = async () => {
    try {
      if (customerSettings.id) {
        await base44.entities.CustomerSettings.update(customerSettings.id, customerSettings);
      } else {
        const created = await base44.entities.CustomerSettings.create(customerSettings);
        setCustomerSettings(created);
      }
      toast.success('הגדרות הלקוחות נשמרו');
    } catch (error) {
      toast.error('שגיאה בשמירה');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNavSettings(prev => ({ ...prev, logo_url: file_url }));
      toast.success('הלוגו הועלה בהצלחה');
    } catch {
      toast.error('שגיאה בהעלאת הלוגו');
    } finally {
      setLogoUploading(false);
    }
  };

  const savePackage = async (pkg) => {
    try {
      if (pkg.id) {
        await base44.entities.Package.update(pkg.id, pkg);
      } else {
        await base44.entities.Package.create(pkg);
      }
      toast.success('החבילה נשמרה');
      loadData();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('שגיאה בשמירת החבילה');
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('למחוק תבנית זו?')) return;
    await base44.entities.MessageTemplate.delete(id);
    toast.success('התבנית נמחקה');
    loadData();
  };

  const deleteSelectedTemplates = async () => {
    if (!confirm(`למחוק ${selectedTemplates.size} תבניות?`)) return;
    await Promise.all([...selectedTemplates].map(id => base44.entities.MessageTemplate.delete(id)));
    setSelectedTemplates(new Set());
    toast.success('תבניות נמחקו');
    loadData();
  };

  const deletePackage = async (id) => {
    if (!confirm('למחוק חבילה/תוספת זו?')) return;
    await base44.entities.Package.delete(id);
    toast.success('החבילה נמחקה');
    loadData();
  };

  const deleteSelectedPackages = async () => {
    if (!confirm(`למחוק ${selectedPackages.size} חבילות?`)) return;
    await Promise.all([...selectedPackages].map(id => base44.entities.Package.delete(id)));
    setSelectedPackages(new Set());
    toast.success('חבילות נמחקו');
    loadData();
  };

  const toggleTemplateSelect = (id) => {
    setSelectedTemplates(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const togglePackageSelect = (id) => {
    setSelectedPackages(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          פאנל ניהול
        </h1>
        <p className="text-gray-600">ניהול הגדרות, תבניות ומחירון</p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-11">
          <TabsTrigger value="crm_guide" className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />מדריך CRM
          </TabsTrigger>
          <TabsTrigger value="settings">הגדרות כלליות</TabsTrigger>
          <TabsTrigger value="templates">תבניות הודעות</TabsTrigger>
          <TabsTrigger value="packages">מחירון</TabsTrigger>
          <TabsTrigger value="events_settings">אירועים</TabsTrigger>
          <TabsTrigger value="booking_form">טופס הזמנה</TabsTrigger>
          <TabsTrigger value="branding">מיתוג</TabsTrigger>
          <TabsTrigger value="customers">לקוחות</TabsTrigger>
          <TabsTrigger value="dashboard_texts">טקסטים דשבורד</TabsTrigger>
          <TabsTrigger value="nav">סרגל ניווט</TabsTrigger>
          <TabsTrigger value="whatsapp_agent" className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />סוכן ווצאפ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות מערכת</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-6">
                <Label>מייל בעל העסק (לקבלת התראות)</Label>
                <Input
                  type="email"
                  value={settings.owner_email || ''}
                  onChange={e => setSettings({...settings, owner_email: e.target.value})}
                  placeholder="beng1807@gmail.com"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1">המייל הזה ישמש לקבלת התראות על פניות חדשות מטופס ההזמנה ודברים נוספים</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שעת שליחה (שעה)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.send_hour || 10}
                    onChange={e => setSettings({...settings, send_hour: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>שעת שליחה (דקות)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.send_minute || 0}
                    onChange={e => setSettings({...settings, send_minute: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>חסימת שליחה בשבת וחגים</Label>
                  <Switch
                    checked={settings.block_sabbath_and_holidays}
                    onCheckedChange={v => setSettings({...settings, block_sabbath_and_holidays: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>שליחה ביום עסקים הבא במקרה חסימה</Label>
                  <Switch
                    checked={settings.fallback_send_next_business_day}
                    onCheckedChange={v => setSettings({...settings, fallback_send_next_business_day: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>אוטומציות פעילות</Label>
                  <Switch
                    checked={settings.automations_enabled}
                    onCheckedChange={v => setSettings({...settings, automations_enabled: v})}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">WhatsApp</h3>
                <div className="space-y-4">
                  <div>
                    <Label>מצב שליחה</Label>
                    <Select value={settings.whatsapp_send_mode} onValueChange={v => setSettings({...settings, whatsapp_send_mode: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="לוג בלבד">לוג בלבד (ברירת מחדל)</SelectItem>
                        <SelectItem value="שליחה אמיתית">שליחה אמיתית</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">תזכורות תשלום</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תזכורת 1 (ימים לפני)</Label>
                    <Input
                      type="number"
                      value={settings.payment_reminder_1_days_before || 14}
                      onChange={e => setSettings({...settings, payment_reminder_1_days_before: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>תזכורת 2 (ימים לפני)</Label>
                    <Input
                      type="number"
                      value={settings.payment_reminder_2_days_before || 7}
                      onChange={e => setSettings({...settings, payment_reminder_2_days_before: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">תזכורות אירועים</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תזכורת אירוע (ימים לפני)</Label>
                    <Input
                      type="number"
                      value={settings.event_reminder_days_before || 1}
                      onChange={e => setSettings({...settings, event_reminder_days_before: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>תודה אחרי אירוע (ימים אחרי)</Label>
                    <Input
                      type="number"
                      value={settings.thank_you_days_after || 1}
                      onChange={e => setSettings({...settings, thank_you_days_after: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} className="w-full bg-orange-500 hover:bg-orange-600">
                שמור הגדרות
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-4">
            {selectedTemplates.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-sm font-bold text-red-700">{selectedTemplates.size} תבניות נבחרו</span>
                <Button variant="destructive" size="sm" onClick={deleteSelectedTemplates} className="flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />מחק נבחרים
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplates(new Set())}>בטל בחירה</Button>
              </div>
            )}
            {templates.map(template => {
              const placeholderMap = {
                NEW_LEAD: ['{contact_name}', '{event_date}', '{event_type}', '{owner_name}', '{owner_phone}', '{owner_whatsapp_phone}'],
                QUOTE_SENT: ['{customer_name}', '{event_date}', '{price_total}', '{deposit_amount}', '{owner_name}', '{owner_phone}', '{owner_whatsapp_phone}'],
                PAY_REMINDER_1: ['{customer_name}', '{event_date}', '{balance}', '{owner_name}', '{owner_phone}', '{owner_whatsapp_phone}'],
                PAY_REMINDER_2: ['{customer_name}', '{event_date}', '{balance}', '{owner_name}'],
                PAY_CONFIRMED: ['{customer_name}', '{event_date}', '{location}', '{owner_name}', '{owner_phone}', '{owner_whatsapp_phone}'],
                DJ_ASSIGNED: ['{customer_name}', '{dj_name}', '{dj_phone}', '{event_date}', '{location}', '{event_type}', '{owner_name}', '{owner_phone}'],
                EVENT_REMINDER: ['{customer_name}', '{event_date}', '{location}', '{dj_name}', '{dj_phone}', '{owner_name}', '{owner_phone}'],
                THANK_YOU: ['{customer_name}', '{owner_name}', '{owner_phone}'],
              };
              const placeholders = placeholderMap[template.template_key] || [];
              return (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedTemplates.has(template.id)} onCheckedChange={() => toggleTemplateSelect(template.id)} />
                        <span>{template.template_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.active}
                          onCheckedChange={v => saveTemplate({...template, active: v})}
                        />
                        <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={template.template_text}
                      onChange={e => {
                        const updated = templates.map(t => 
                          t.id === template.id ? {...t, template_text: e.target.value} : t
                        );
                        setTemplates(updated);
                      }}
                      className="min-h-[120px]"
                      dir="rtl"
                    />
                    {placeholders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-gray-400">משתנים זמינים:</span>
                        {placeholders.map(p => (
                          <span key={p} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-mono cursor-pointer hover:bg-orange-100"
                            onClick={() => {
                              const updated = templates.map(t => 
                                t.id === template.id ? {...t, template_text: t.template_text + p} : t
                              );
                              setTemplates(updated);
                            }}
                          >{p}</span>
                        ))}
                      </div>
                    )}
                    <Button 
                      onClick={() => saveTemplate(template)} 
                      className="mt-3 bg-orange-500 hover:bg-orange-600"
                      size="sm"
                    >
                      שמור תבנית
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="packages">
          <div className="mb-4 flex items-center gap-3">
            <Button onClick={() => savePackage({ item_type: 'PACKAGE', active: true, price: 0, item_name: 'חבילה חדשה' })} className="bg-orange-500 hover:bg-orange-600">
              <PackageIcon className="w-4 h-4 ml-2" />
              הוסף חבילה/תוספת
            </Button>
            {selectedPackages.size > 0 && (
              <>
                <Button variant="destructive" size="sm" onClick={deleteSelectedPackages} className="flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />מחק {selectedPackages.size} נבחרים
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPackages(new Set())}>בטל בחירה</Button>
              </>
            )}
          </div>
          <div className="space-y-4">
            {packages.map(pkg => (
              <Card key={pkg.id} className={selectedPackages.has(pkg.id) ? 'border-orange-300 bg-orange-50/30' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Checkbox checked={selectedPackages.has(pkg.id)} onCheckedChange={() => togglePackageSelect(pkg.id)} />
                    <div className="grid grid-cols-4 gap-4 flex-1">
                      <Input
                        value={pkg.item_name}
                        onChange={e => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? {...p, item_name: e.target.value} : p
                          );
                          setPackages(updated);
                        }}
                        placeholder="שם"
                      />
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={e => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? {...p, price: Number(e.target.value)} : p
                          );
                          setPackages(updated);
                        }}
                        placeholder="מחיר"
                      />
                      <Select
                        value={pkg.item_type}
                        onValueChange={v => {
                          const updated = packages.map(p => 
                            p.id === pkg.id ? {...p, item_type: v} : p
                          );
                          setPackages(updated);
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PACKAGE">חבילה</SelectItem>
                          <SelectItem value="ADDON">תוספת</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button onClick={() => savePackage(pkg)} size="sm" className="bg-orange-500 hover:bg-orange-600 flex-1">
                          שמור
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePackage(pkg.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events_settings">
          <EventSettingsTab eventSettings={eventSettings} setEventSettings={setEventSettings} />
        </TabsContent>

        <TabsContent value="booking_form">
          <BookingFormSettingsTab />
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>מיתוג המערכת</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם האפליקציה</Label>
                  <Input
                    value={settings.app_name || ''}
                    onChange={e => setSettings({...settings, app_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>שם הבעלים</Label>
                  <Input
                    value={settings.owner_name || ''}
                    onChange={e => setSettings({...settings, owner_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>צבע ראשי</Label>
                  <Input
                    type="color"
                    value={settings.brand_primary_color || '#FF6B4A'}
                    onChange={e => setSettings({...settings, brand_primary_color: e.target.value})}
                  />
                </div>
                <div>
                  <Label>גופן</Label>
                  <Select value={settings.app_font} onValueChange={v => setSettings({...settings, app_font: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rubik">Rubik</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveSettings} className="w-full bg-orange-500 hover:bg-orange-600">
                שמור מיתוג
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות דף הלקוחות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-b pb-6">
                <h3 className="font-semibold mb-4">כותרות ותיאור</h3>
                <div className="space-y-4">
                  <div>
                    <Label>כותרת הדף</Label>
                    <Input
                      value={customerSettings?.customers_title || 'לקוחות'}
                      onChange={e => setCustomerSettings({...customerSettings, customers_title: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תת-כותרת הדף</Label>
                    <Input
                      value={customerSettings?.customers_subtitle || 'ניהול כל הלקוחות שלך'}
                      onChange={e => setCustomerSettings({...customerSettings, customers_subtitle: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              <div className="border-b pb-6">
                <h3 className="font-semibold mb-4">תוויות שדות בכרטיס</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תווית שדה שם</Label>
                    <Input
                      value={customerSettings?.customer_card_name_label || 'שם'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_name_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תווית שדה טלפון</Label>
                    <Input
                      value={customerSettings?.customer_card_phone_label || 'טלפון'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_phone_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תווית שדה אימייל</Label>
                    <Input
                      value={customerSettings?.customer_card_email_label || 'אימייל'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_email_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תווית שדה הערות</Label>
                    <Input
                      value={customerSettings?.customer_card_notes_label || 'הערות'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_notes_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תווית סך אירועים</Label>
                    <Input
                      value={customerSettings?.customer_card_total_events_label || 'סך אירועים'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_total_events_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>תווית סך הכנסות</Label>
                    <Input
                      value={customerSettings?.customer_card_total_revenue_label || 'סך הכנסות'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_card_total_revenue_label: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              <div className="border-b pb-6">
                <h3 className="font-semibold mb-4">סטטוסים</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>סטטוס פעיל</Label>
                    <Input
                      value={customerSettings?.customer_status_active || 'פעיל'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_status_active: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>סטטוס לא פעיל</Label>
                    <Input
                      value={customerSettings?.customer_status_inactive || 'לא פעיל'}
                      onChange={e => setCustomerSettings({...customerSettings, customer_status_inactive: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveCustomerSettings} className="w-full bg-orange-500 hover:bg-orange-600">
                שמור הגדרות לקוחות
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nav">
          <Card>
            <CardHeader>
              <CardTitle>סרגל ניווט</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo upload */}
              <div>
                <Label className="mb-2 block">לוגו</Label>
                <div className="flex items-center gap-4">
                  {navSettings?.logo_url && (
                    <img src={navSettings.logo_url} alt="לוגו נוכחי" className="h-12 object-contain rounded border p-1" />
                  )}
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                    <Upload size={16} />
                    {logoUploading ? 'מעלה...' : 'העלה לוגו'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {navSettings?.logo_url && (
                    <button
                      onClick={() => setNavSettings(prev => ({ ...prev, logo_url: '' }))}
                      className="text-xs text-red-500 hover:underline"
                    >
                      הסר לוגו
                    </button>
                  )}
                </div>
              </div>

              {/* Nav texts */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-500 mb-3">טקסטי פריטי ניווט</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'nav_dashboard', label: 'לוח בקרה' },
                    { key: 'nav_leads', label: 'לידים' },
                    { key: 'nav_customers', label: 'לקוחות' },
                    { key: 'nav_events', label: 'אירועים' },
                    { key: 'nav_calendar', label: 'יומן' },
                    { key: 'nav_djs', label: 'תקליטנים' },
                    { key: 'nav_tasks', label: 'משימות' },
                    { key: 'nav_settings', label: 'הגדרות' },
                    { key: 'nav_logout', label: 'התנתקות' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input
                        value={navSettings?.[key] ?? label}
                        onChange={e => setNavSettings(prev => ({ ...prev, [key]: e.target.value }))}
                        dir="rtl"
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={saveNavSettings} className="w-full bg-orange-500 hover:bg-orange-600">
                שמור סרגל ניווט
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard_texts">
          <Card>
            <CardHeader>
              <CardTitle>טקסטים דשבורד</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>כותרת ראשית (השתמש ב-{'{name}'} לשם המשתמש)</Label>
                <Input
                  value={settings.dashboard_greeting ?? 'היי {name}, מה קורה היום?'}
                  onChange={e => setSettings({...settings, dashboard_greeting: e.target.value})}
                  dir="rtl"
                />
              </div>
              <div>
                <Label>תת כותרת</Label>
                <Input
                  value={settings.dashboard_subtitle ?? 'הנה סקירה של מה שקורה בסטודיו שלך כרגע.'}
                  onChange={e => setSettings({...settings, dashboard_subtitle: e.target.value})}
                  dir="rtl"
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-500 mb-3">כרטיסי סטטיסטיקה</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>כרטיס 1 — לידים חדשים</Label>
                    <Input
                      value={settings.dashboard_stat_new_leads ?? 'לידים חדשים'}
                      onChange={e => setSettings({...settings, dashboard_stat_new_leads: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>כרטיס 2 — אירועים קרובים</Label>
                    <Input
                      value={settings.dashboard_stat_upcoming_events ?? 'אירועים קרובים'}
                      onChange={e => setSettings({...settings, dashboard_stat_upcoming_events: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>כרטיס 3 — הכנסה חודשית</Label>
                    <Input
                      value={settings.dashboard_stat_monthly_revenue ?? 'הכנסה חודשית'}
                      onChange={e => setSettings({...settings, dashboard_stat_monthly_revenue: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-500 mb-3">כותרות גרפים</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>כותרת גרף לידים שבועי</Label>
                    <Input
                      value={settings.dashboard_chart_title ?? 'פילוח לידים שבועי'}
                      onChange={e => setSettings({...settings, dashboard_chart_title: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label>כותרת פעילות אחרונה</Label>
                    <Input
                      value={settings.dashboard_activity_title ?? 'פעילות אחרונה'}
                      onChange={e => setSettings({...settings, dashboard_activity_title: e.target.value})}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={saveSettings} className="w-full bg-orange-500 hover:bg-orange-600">
                שמור טקסטים
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp_agent">
          <WhatsAppAgentTab />
        </TabsContent>

        <TabsContent value="crm_guide">
          <CrmGuideTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}