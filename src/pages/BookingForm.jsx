import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import BookingHero from '../components/booking/BookingHero';
import BookingSuccess from '../components/booking/BookingSuccess';

const BRAND_ORANGE = '#e94f1c';

const pillClass = "w-full p-3 px-6 rounded-full text-white placeholder-white/40 transition-all duration-300 outline-none focus:ring-2 focus:ring-[#e94f1c]";
const pillStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.2)',
};
const pillFocusStyle = {
  background: 'rgba(255,255,255,0.1)',
  borderColor: BRAND_ORANGE,
};

function PillInput({ className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      className={`${pillClass} ${className}`}
      style={focused ? { ...pillStyle, ...pillFocusStyle } : pillStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function PillSelect({ children, className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      className={`${pillClass} appearance-none ${className}`}
      style={focused ? { ...pillStyle, ...pillFocusStyle } : pillStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {children}
    </select>
  );
}

function PillTextarea({ className = '', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      className={`w-full rounded-2xl p-4 text-white placeholder-white/40 transition-all duration-300 outline-none focus:ring-2 focus:ring-[#e94f1c] ${className}`}
      style={focused ? { background: 'rgba(255,255,255,0.1)', border: '1px solid #e94f1c' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

export default function BookingForm() {
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

  const eventTypes = ['בר מצווה', 'בת מצווה', 'חתונה', 'יום הולדת', 'אירוע פרטי', 'אירוע חברה', 'חינה', 'אחר'];
  const contentOptions = ['DJ', 'תאורה', 'לייזר', 'אפקטים מיוחדים', 'משחקים', 'KAHOOT', 'מסך/מקרן', 'אחר'];

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

  if (submitted) {
    return <BookingSuccess />;
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif', backgroundColor: '#0a0a0a' }}>
      {/* Background atmosphere */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=60"
          alt="DJ atmosphere"
          className="w-full h-full object-cover opacity-30 blur-sm scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      </div>

      {/* Split layout */}
      <main className="relative z-10 flex flex-col lg:flex-row min-h-screen w-full">
        {/* Hero / Video section - on left in desktop (order-2 in RTL) */}
        <div className="order-1 lg:order-2">
          <BookingHero />
        </div>

        {/* Form section */}
        <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col items-center z-10 order-2 lg:order-1">
          {/* Header */}
          <header className="w-full max-w-2xl text-center mb-10">
            <div className="inline-block mb-4">
              <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-widest text-white">
                Skitza <span style={{ color: BRAND_ORANGE }}>Production</span>
              </h1>
            </div>
            <h2 className="text-2xl font-bold mb-2">טופס פרטי אירוע</h2>
            <p className="text-gray-400 text-sm md:text-base">נשמח להכיר אתכם ולהפוך את האירוע שלכם לבלתי נשכח</p>
          </header>

          {/* Glass card form */}
          <section className="w-full max-w-2xl rounded-3xl p-6 md:p-8 mb-12" style={{
            background: 'rgba(15,15,15,0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.8)',
          }}>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* פרטי קשר */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">שם מלא / חברה *</label>
                  <PillInput
                    placeholder="הכנס שם מלא"
                    required
                    value={formData.contact_name}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">מספר טלפון *</label>
                  <PillInput
                    type="tel"
                    placeholder="050-0000000"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">אימייל (אופציונלי)</label>
                  <PillInput
                    type="email"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">סוג אירוע *</label>
                  <PillSelect
                    required
                    value={formData.event_type}
                    onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                  >
                    <option value="" disabled>בחר סוג אירוע...</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type} style={{ background: '#1a1a1a' }}>{type}</option>
                    ))}
                  </PillSelect>
                </div>
              </div>

              {/* פרטי האירוע */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4" style={{ color: BRAND_ORANGE }}>תאריך האירוע *</label>
                  <PillInput
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                    className="[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">שם חוגג/ת</label>
                  <PillInput
                    placeholder="שמות החוגגים"
                    value={formData.celebrant_name}
                    onChange={e => setFormData({ ...formData, celebrant_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">כמות אורחים משוערת</label>
                  <PillInput
                    type="number"
                    placeholder="למשל: 300"
                    value={formData.guests_count}
                    onChange={e => setFormData({ ...formData, guests_count: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">שמות הורים</label>
                  <PillInput
                    placeholder="שמות ההורים"
                    value={formData.parents_names}
                    onChange={e => setFormData({ ...formData, parents_names: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">שמות אחים</label>
                  <PillInput
                    placeholder="במידה ורלוונטי"
                    value={formData.siblings_names}
                    onChange={e => setFormData({ ...formData, siblings_names: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">טווח גילאים</label>
                  <PillInput
                    placeholder="לדוגמה: 13-16"
                    value={formData.age_range}
                    onChange={e => setFormData({ ...formData, age_range: e.target.value })}
                  />
                </div>
              </div>

              {/* תכני האירוע */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold pr-3" style={{ borderRight: `4px solid ${BRAND_ORANGE}` }}>סמנו תכנים שיהיו באירוע:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {contentOptions.map(content => (
                    <label key={content} className="flex items-center gap-3 cursor-pointer hover:text-[#e94f1c] transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.event_contents.includes(content)}
                        onChange={() => handleContentChange(content)}
                        className="w-5 h-5 rounded accent-[#e94f1c]"
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          accentColor: BRAND_ORANGE,
                        }}
                      />
                      <span className="text-sm">{content}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* פרטים נוספים */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">אופי האירוע / סוג האורחים / טווח גילאים *</label>
                  <PillTextarea
                    placeholder="ספרו לנו על הקהל שלכם..."
                    required
                    rows={3}
                    value={formData.event_nature}
                    onChange={e => setFormData({ ...formData, event_nature: e.target.value })}
                  />
                </div>

                {/* Laser addition */}
                <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: `${BRAND_ORANGE}15`, border: `1px solid ${BRAND_ORANGE}30` }}>
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.laser_addition}
                      onChange={e => setFormData({ ...formData, laser_addition: e.target.checked })}
                      className="w-6 h-6 rounded accent-[#e94f1c]"
                      style={{ accentColor: BRAND_ORANGE }}
                    />
                    <span className="font-bold text-xs md:text-sm">תוספת לייזרים ותותחי עשן - שדרוג לאירוע בעלות של 500₪</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">קו מוזיקלי / תיאום ציפיות *</label>
                  <PillTextarea
                    placeholder="איזה סגנונות אתם אוהבים?"
                    required
                    rows={3}
                    value={formData.musical_line}
                    onChange={e => setFormData({ ...formData, musical_line: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold mr-4">סגנונות דגשים / בקשות מיוחדות</label>
                  <PillTextarea
                    placeholder="יש לכם בקשות מיוחדות? ספרו לנו..."
                    rows={3}
                    value={formData.special_requests}
                    onChange={e => setFormData({ ...formData, special_requests: e.target.value })}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-6 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex items-center justify-center px-12 py-4 font-bold text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  style={{
                    backgroundColor: BRAND_ORANGE,
                    boxShadow: '0 0 20px rgba(233,79,28,0.5)',
                  }}
                >
                  <Send className="w-5 h-5 ml-3 rotate-180" />
                  <span>{loading ? 'שולח...' : 'שלח פרטים לצוות Skitza'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Footer */}
          <footer className="text-center text-gray-500 pb-12 w-full">
            <p className="text-sm">© 2024 Skitza Production Group. All Rights Reserved.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}