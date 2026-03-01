import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Send, Copy, Link, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import BookingSuccess from '../components/booking/BookingSuccess';

const BRAND_ORANGE = '#e94f1c';

const pillClass = "w-full p-3 px-6 rounded-full text-white placeholder-white/40 transition-all duration-300 outline-none focus:ring-2 focus:ring-[#e94f1c]";
const pillStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' };
const pillFocusStyle = { background: 'rgba(255,255,255,0.1)', borderColor: BRAND_ORANGE };

function PillInput({ className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return <input className={`${pillClass} ${className}`} style={focused ? { ...pillStyle, ...pillFocusStyle } : pillStyle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />;
}

function PillSelect({ children, className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return <select className={`${pillClass} appearance-none ${className}`} style={focused ? { ...pillStyle, ...pillFocusStyle } : pillStyle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props}>{children}</select>;
}

function PillTextarea({ className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return <textarea className={`w-full rounded-2xl p-4 text-white placeholder-white/40 transition-all duration-300 outline-none focus:ring-2 focus:ring-[#e94f1c] ${className}`} style={focused ? { background: 'rgba(255,255,255,0.1)', border: '1px solid #e94f1c' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />;
}

const DEFAULT_FIELDS = [
  { key: 'contact_name', label: 'שם מלא / חברה', type: 'text', required: true, visible: true, placeholder: 'הכנס שם מלא', half_width: true },
  { key: 'phone', label: 'מספר טלפון', type: 'tel', required: true, visible: true, placeholder: '050-0000000', half_width: true },
  { key: 'email', label: 'אימייל', type: 'email', required: false, visible: true, placeholder: 'example@gmail.com', half_width: true },
  { key: 'event_type', label: 'סוג אירוע', type: 'select', required: true, visible: true, placeholder: 'בחר סוג אירוע...', options: ['בר מצווה', 'בת מצווה', 'חתונה', 'יום הולדת', 'אירוע פרטי', 'אירוע חברה', 'חינה', 'אחר'], half_width: true },
  { key: 'event_date', label: 'תאריך האירוע', type: 'date', required: true, visible: true, half_width: true },
  { key: 'celebrant_name', label: 'שם חוגג/ת', type: 'text', required: false, visible: true, placeholder: 'שמות החוגגים', half_width: true },
  { key: 'guests_count', label: 'כמות אורחים משוערת', type: 'number', required: false, visible: true, placeholder: 'למשל: 300', half_width: true },
  { key: 'parents_names', label: 'שמות הורים', type: 'text', required: false, visible: true, placeholder: 'שמות ההורים', half_width: true },
  { key: 'siblings_names', label: 'שמות אחים', type: 'text', required: false, visible: true, placeholder: 'במידה ורלוונטי', half_width: true },
  { key: 'age_range', label: 'טווח גילאים', type: 'text', required: false, visible: true, placeholder: 'לדוגמה: 13-16', half_width: true },
  { key: 'event_contents', label: 'תכני האירוע', type: 'checkbox_group', required: false, visible: true, options: ['DJ', 'תאורה', 'לייזר', 'אפקטים מיוחדים', 'משחקים', 'KAHOOT', 'מסך/מקרן', 'אחר'], section_title: 'סמנו תכנים שיהיו באירוע:', half_width: false },
  { key: 'event_nature', label: 'אופי האירוע / סוג האורחים / טווח גילאים', type: 'textarea', required: true, visible: true, placeholder: 'ספרו לנו על הקהל שלכם...', half_width: false },
  { key: 'laser_addition', label: 'תוספת לייזרים ותותחי עשן - שדרוג לאירוע בעלות של 500₪', type: 'checkbox', required: false, visible: true, half_width: false },
  { key: 'musical_line', label: 'קו מוזיקלי / תיאום ציפיות', type: 'textarea', required: true, visible: true, placeholder: 'איזה סגנונות אתם אוהבים?', half_width: false },
  { key: 'special_requests', label: 'סגנונות דגשים / בקשות מיוחדות', type: 'textarea', required: false, visible: true, placeholder: 'יש לכם בקשות מיוחדות? ספרו לנו...', half_width: false },
];

function DynamicField({ field, value, onChange, error }) {
  const requiredMark = field.required ? ' *' : '';

  switch (field.type) {
    case 'text': case 'tel': case 'email': case 'number': case 'date':
      return (
        <div className={`space-y-2 ${field.half_width ? '' : 'md:col-span-2'}`}>
          <label className="block text-sm font-semibold mr-4" style={field.type === 'date' && field.required ? { color: BRAND_ORANGE } : {}}>
            {field.label}{requiredMark}
          </label>
          <PillInput
            type={field.type === 'tel' ? 'tel' : field.type}
            inputMode={field.type === 'tel' ? 'numeric' : undefined}
            pattern={field.type === 'tel' ? '[0-9\\-\\s]*' : undefined}
            placeholder={field.placeholder}
            required={field.required}
            value={value || ''}
            onChange={e => {
              let val = e.target.value;
              if (field.type === 'tel') val = val.replace(/[^0-9\-\s]/g, '');
              onChange(val);
            }}
            className={field.type === 'date' ? '[color-scheme:dark]' : ''}
          />
          {error && <p className="text-red-400 text-xs mr-4">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div className={`space-y-2 ${field.half_width ? '' : 'md:col-span-2'}`}>
          <label className="block text-sm font-semibold mr-4">{field.label}{requiredMark}</label>
          <PillSelect required={field.required} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="" disabled>{field.placeholder || 'בחר...'}</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt} style={{ background: '#1a1a1a' }}>{opt}</option>
            ))}
          </PillSelect>
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-semibold mr-4">{field.label}{requiredMark}</label>
          <PillTextarea
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      );

    case 'checkbox_group':
      return (
        <div className="space-y-4 md:col-span-2">
          {field.section_title && (
            <h3 className="text-xl font-bold pr-3" style={{ borderRight: `4px solid ${BRAND_ORANGE}` }}>{field.section_title}</h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(field.options || []).map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer hover:text-[#e94f1c] transition-colors">
                <input
                  type="checkbox"
                  checked={(value || []).includes(opt)}
                  onChange={() => {
                    const arr = value || [];
                    onChange(arr.includes(opt) ? arr.filter(c => c !== opt) : [...arr, opt]);
                  }}
                  className="w-5 h-5 rounded"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', accentColor: BRAND_ORANGE }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className="md:col-span-2">
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: `${BRAND_ORANGE}15`, border: `1px solid ${BRAND_ORANGE}30` }}>
            <label className="flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={e => onChange(e.target.checked)}
                className="w-6 h-6 rounded"
                style={{ accentColor: BRAND_ORANGE }}
              />
              <span className="font-bold text-xs md:text-sm">{field.label}</span>
            </label>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [bfSettings, setBfSettings] = useState({});
  const [formData, setFormData] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const list = await base44.entities.BookingFormSettings.list();
      if (list.length > 0) setBfSettings(list[0]);
    } catch { /* public form, settings might not load for non-auth users */ }

    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const user = await base44.auth.me();
        if (user?.role === 'admin') setIsAdmin(true);
      }
    } catch { /* not logged in */ }

    setSettingsLoading(false);
  };

  const fields = (bfSettings.form_fields && bfSettings.form_fields.length > 0) ? bfSettings.form_fields : DEFAULT_FIELDS;
  const visibleFields = fields.filter(f => f.visible !== false);

  const title = bfSettings.form_title || 'Skitza Production';
  const subtitle = bfSettings.form_subtitle || 'טופס פרטי אירוע';
  const description = bfSettings.form_description || 'נשמח להכיר אתכם ולהפוך את האירוע שלכם לבלתי נשכח';
  const buttonText = bfSettings.form_button_text || 'שלח פרטים לצוות Skitza';
  const bgType = bfSettings.form_bg_type || 'image';
  const bgUrl = bfSettings.form_bg_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=60';

  const validateForm = () => {
    const newErrors = {};
    // Phone validation - digits only, min 10
    if (formData.phone) {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        newErrors.phone = 'מספר טלפון חייב להכיל לפחות 10 ספרות';
      }
      if (/[^0-9\-\s]/.test(formData.phone)) {
        newErrors.phone = 'מספר טלפון חייב להכיל מספרים בלבד';
      }
    }
    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'כתובת אימייל לא תקינה';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await base44.functions.invoke('submitBookingForm', { formData });
      setSubmitted(true);
      toast.success('הפנייה נשלחה בהצלחה!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('שגיאה בשליחת הטופס. אנא נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  const formLink = bfSettings.form_link || `${window.location.origin}/BookingForm`;

  if (submitted) {
    return <BookingSuccess settings={bfSettings} />;
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: BRAND_ORANGE }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif', backgroundColor: '#0a0a0a' }}>
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {bgType === 'video' ? (
          <video src={bgUrl} className="w-full h-full object-cover opacity-50 blur-sm scale-110" autoPlay muted loop playsInline />
        ) : (
          <img src={bgUrl} alt="רקע" className="w-full h-full object-cover opacity-50 blur-sm scale-110" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-[#0a0a0a]/70" />
      </div>

      {/* Centered content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Header */}
        <header className="w-full max-w-3xl text-center mb-10">
          <div className="inline-block mb-4">
            <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-widest text-white">
              {title.includes('Production') ? (
                <>{title.split('Production')[0]}<span style={{ color: BRAND_ORANGE }}>Production</span>{title.split('Production')[1] || ''}</>
              ) : title}
            </h1>
          </div>
          <h2 className="text-2xl font-bold mb-2">{subtitle}</h2>
          <p className="text-gray-400 text-sm md:text-base">{description}</p>
        </header>

        {/* Glass card form - centered and wider */}
        <section className="w-full max-w-3xl rounded-3xl p-6 md:p-10 mb-12" style={{
          background: 'rgba(15,15,15,0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.8)',
        }}>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleFields.map(field => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  onChange={val => {
                    setFormData(prev => ({ ...prev, [field.key]: val }));
                    if (errors[field.key]) setErrors(prev => ({ ...prev, [field.key]: undefined }));
                  }}
                  error={errors[field.key]}
                />
              ))}
            </div>

            {/* Submit */}
            <div className="pt-6 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                style={{ backgroundColor: BRAND_ORANGE, boxShadow: '0 0 20px rgba(233,79,28,0.5)' }}
              >
                <Send className="w-5 h-5 ml-3 rotate-180" />
                <span>{loading ? 'שולח...' : buttonText}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Admin-only: Form link */}
        {isAdmin && (
          <div className="w-full max-w-3xl rounded-xl p-4 mb-8" style={{ background: 'rgba(233,79,28,0.1)', border: '1px solid rgba(233,79,28,0.3)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Link className="w-4 h-4" style={{ color: BRAND_ORANGE }} />
                <span className="font-semibold">קישור לטופס (מנהל בלבד):</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-400 bg-black/30 px-3 py-1 rounded-lg max-w-[300px] truncate" dir="ltr">{formLink}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(formLink); toast.success('הקישור הועתק!'); }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                  style={{ backgroundColor: BRAND_ORANGE, color: 'white' }}
                >
                  <Copy className="w-3 h-3" />העתק
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin: Back to Dashboard */}
        {isAdmin && (
          <div className="w-full max-w-3xl mb-6">
            <a
              href={createPageUrl('Dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              חזרה ללוח הבקרה
            </a>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-500 pb-6 w-full">
          <p className="text-sm">© 2024 Skitza Production Group. All Rights Reserved.</p>
        </footer>
      </main>
    </div>
  );
}