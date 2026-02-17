import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Music, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    contact_name: '',
    event_date: '',
    event_type: '',
    celebrant_name: '',
    parents_names: '',
    guests_count: '',
    siblings_names: '',
    event_contents: [],
    event_nature: '',
    guest_type: '',
    age_range: '',
    laser_addition: false,
    musical_line: '',
    expectations: '',
    style_notes: '',
    special_requests: '',
  });

  const eventTypes = ['בר מצווה', 'בת מצווה', 'חתונה', 'יום הולדת', 'אירוע פרטי', 'אירוע חברה', 'אחר'];
  const guestTypes = ['ילדים', 'נוער', 'מבוגרים', 'מעורב'];
  const contentOptions = ['DJ', 'תאורה', 'לייזר', 'אפקטים מיוחדים', 'משחקים', 'KAHOOT', 'מסך/מקרן', 'אחר'];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
      } catch (err) {
        // User not authenticated, show booking form
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      event_contents: prev.event_contents.includes(content)
        ? prev.event_contents.filter(c => c !== content)
        : [...prev.event_contents, content]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.Lead.create({
        ...formData,
        guests_count: formData.guests_count ? Number(formData.guests_count) : undefined,
        status: 'NEW',
        source: 'BASE44_FORM',
      });
      
      setSubmitted(true);
      toast.success('הפנייה נשלחה בהצלחה!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('שגיאה בשליחת הטופס. אנא נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">תודה על הפנייה!</h2>
            <p className="text-gray-600 mb-2">קיבלנו את הפרטים שלכם</p>
            <p className="text-gray-600 mb-6">נחזור אליכם בהקדם עם הצעת מחיר</p>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">צוות סקיצה 🎵</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white p-4 py-12" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => base44.auth.redirectToLogin()}
            className="text-sm"
          >
            כניסה למערכת
          </Button>
        </div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-12 h-12 text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-900">סקיצה</h1>
          </div>
          <p className="text-xl text-gray-600">בואו ניצור ביחד את האירוע המושלם שלכם</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              טופס הזמנה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* פרטי קשר */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">פרטי קשר</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_name">שם מלא *</Label>
                    <Input
                      id="contact_name"
                      required
                      value={formData.contact_name}
                      onChange={e => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">טלפון *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">אימייל *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* פרטי האירוע */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">פרטי האירוע</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_type">סוג אירוע *</Label>
                    <Select value={formData.event_type} onValueChange={v => setFormData({...formData, event_type: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="בחרו סוג אירוע" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="event_date">תאריך האירוע *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={e => setFormData({...formData, event_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="celebrant_name">שם החוגג/ת</Label>
                    <Input
                      id="celebrant_name"
                      value={formData.celebrant_name}
                      onChange={e => setFormData({...formData, celebrant_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests_count">מספר מוזמנים משוער</Label>
                    <Input
                      id="guests_count"
                      type="number"
                      value={formData.guests_count}
                      onChange={e => setFormData({...formData, guests_count: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parents_names">שמות הורים</Label>
                    <Input
                      id="parents_names"
                      value={formData.parents_names}
                      onChange={e => setFormData({...formData, parents_names: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="siblings_names">שמות אחים</Label>
                    <Input
                      id="siblings_names"
                      value={formData.siblings_names}
                      onChange={e => setFormData({...formData, siblings_names: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* תכני האירוע */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">תכני האירוע</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {contentOptions.map(content => (
                    <div key={content} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={content}
                        checked={formData.event_contents.includes(content)}
                        onCheckedChange={() => handleContentChange(content)}
                      />
                      <Label htmlFor={content} className="cursor-pointer">{content}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* פרטים נוספים */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">פרטים נוספים</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guest_type">סוג אורחים</Label>
                    <Select value={formData.guest_type} onValueChange={v => setFormData({...formData, guest_type: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחרו סוג אורחים" />
                      </SelectTrigger>
                      <SelectContent>
                        {guestTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="age_range">טווח גילאים</Label>
                    <Input
                      id="age_range"
                      placeholder="לדוגמה: 13-16"
                      value={formData.age_range}
                      onChange={e => setFormData({...formData, age_range: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="musical_line">קו מוזיקלי מבוקש</Label>
                    <Input
                      id="musical_line"
                      placeholder="לדוגמה: מוזיקה ים תיכונית, פופ, היפ הופ"
                      value={formData.musical_line}
                      onChange={e => setFormData({...formData, musical_line: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="expectations">ציפיות מהאירוע</Label>
                    <Textarea
                      id="expectations"
                      placeholder="ספרו לנו מה חשוב לכם באירוע"
                      value={formData.expectations}
                      onChange={e => setFormData({...formData, expectations: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="special_requests">בקשות מיוחדות</Label>
                    <Textarea
                      id="special_requests"
                      placeholder="יש לכם בקשות מיוחדות? ספרו לנו"
                      value={formData.special_requests}
                      onChange={e => setFormData({...formData, special_requests: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
                {loading ? 'שולח...' : 'שלח פנייה'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}