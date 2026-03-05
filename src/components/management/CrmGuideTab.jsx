import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import {
  Users, Sparkles, Calendar, Music, ListChecks, Settings,
  MessageSquare, FileText, CreditCard, BarChart3, Globe,
  Zap, Phone, ArrowLeft, CheckCircle2, HelpCircle, BookOpen,
  UserPlus, ClipboardList, Bell, Palette, Shield
} from 'lucide-react';

const sections = [
  {
    id: 'intro',
    icon: BookOpen,
    color: '#6366f1',
    title: 'ברוכים הבאים למערכת סקיצה CRM',
    description: 'הכירו את המערכת שתעזור לכם לנהל את העסק ביעילות',
    items: [
      {
        q: 'מה זו מערכת סקיצה CRM?',
        a: 'סקיצה CRM היא מערכת ניהול לקוחות ואירועים שנבנתה במיוחד עבורכם. היא עוזרת לעקוב אחרי לידים, לנהל לקוחות, לתכנן אירועים, לשבץ תקליטנים ולשלוח הודעות אוטומטיות — הכל ממקום אחד.'
      },
      {
        q: 'מה אני רואה בלוח הבקרה?',
        a: 'לוח הבקרה מציג סיכום מהיר של העסק: כמה לידים חדשים יש, אירועים קרובים, הכנסות חודשיות, האירוע הקרוב ביותר עם ספירה לאחור, גרף פילוח לידים שבועי ופעילות אחרונה.'
      },
    ]
  },
  {
    id: 'leads',
    icon: UserPlus,
    color: '#f59e0b',
    title: 'ניהול לידים',
    description: 'כך עוקבים אחרי כל פנייה חדשה ומגדילים המרות',
    items: [
      {
        q: 'איך לידים נכנסים למערכת?',
        a: 'לידים נקלטים ב-3 דרכים:\n• **טופס הזמנה ציבורי** — לקוחות ממלאים טופס באתר והליד נוצר אוטומטית.\n• **ייבוא מ-Event Square** — המערכת תומכת בייבוא לידים ממערכות חיצוניות.\n• **הוספה ידנית** — בדף הלקוחות, לחצו על "ליד חדש" והזינו את הפרטים.'
      },
      {
        q: 'מה המשמעות של כל סטטוס ליד?',
        a: '• **חדש** — ליד שנכנס ועדיין לא טופל.\n• **קשר ראשוני** — יצרתם קשר עם הלקוח.\n• **הצעה נשלחה** — שלחתם הצעת מחיר.\n• **עסקה נסגרה** — הלקוח אישר! הליד הופך לאירוע.\n• **בוטל** — הליד לא רלוונטי (תוכלו לציין סיבה).'
      },
      {
        q: 'איך ממיר ליד ללקוח ואירוע?',
        a: 'כאשר משנים את סטטוס הליד ל-"עסקה נסגרה", המערכת פותחת דיאלוג של סגירת עסקה — שם תבחרו חבילה, מחיר ותוספות. המערכת תיצור אוטומטית לקוח חדש + אירוע מקושר.'
      },
      {
        q: 'מה קורה כשליד חדש נכנס?',
        a: 'ברגע שליד חדש נוצר, המערכת:\n• שולחת הודעת ווטסאפ/לוג ללקוח (לפי תבנית NEW_LEAD).\n• יוצרת משימת מעקב אוטומטית.\n• בודקת כפילויות (אותו טלפון + תאריך).\n• שולחת התראה לבעל העסק במייל (אם מוגדר).'
      },
    ]
  },
  {
    id: 'customers',
    icon: Users,
    color: '#10b981',
    title: 'ניהול לקוחות',
    description: 'כל המידע על הלקוחות שלכם במקום אחד',
    items: [
      {
        q: 'איך מגיעים לדף הלקוחות?',
        a: 'לחצו על **"לקוחות"** בתפריט הצדדי. תראו רשימה של כל הלקוחות עם חיפוש, סינון ותצוגת טבלה או כרטיסיות.'
      },
      {
        q: 'אילו פרטים ניתן לשמור על לקוח?',
        a: 'שם, טלפון, אימייל, הערות, שם החוגג/ת, שמות הורים, כמות מוזמנים, שמות אחים, טווח גילאים, תכני האירוע, קו מוזיקלי, בקשות מיוחדות ועוד. ניתן גם להתאים את השדות בהגדרות.'
      },
      {
        q: 'איך רואים את היסטוריית האירועים של לקוח?',
        a: 'בכרטיס הלקוח תמצאו את כל האירועים, ההודעות והפעילות שקשורים אליו. כך ניתן לראות תמונה מלאה של מערכת היחסים עם הלקוח.'
      },
    ]
  },
  {
    id: 'events',
    icon: Sparkles,
    color: '#ec4899',
    title: 'ניהול אירועים',
    description: 'תכנון, מעקב ושליטה על כל האירועים',
    items: [
      {
        q: 'איך יוצרים אירוע חדש?',
        a: 'יש שתי דרכים:\n• **מליד** — סגרו עסקה והאירוע נוצר אוטומטית.\n• **ידנית** — בדף האירועים לחצו "אירוע חדש", בחרו לקוח, תאריך, סוג אירוע וחבילה.'
      },
      {
        q: 'מה סטטוסי האירוע?',
        a: '• **ממתין** — האירוע נוצר אבל עוד לא אושר.\n• **מאושר** — הכל סגור וקבוע.\n• **בביצוע** — האירוע מתרחש כרגע.\n• **הושלם** — האירוע הסתיים בהצלחה.\n• **בוטל** — האירוע בוטל.'
      },
      {
        q: 'איך משבצים תקליטן (DJ) לאירוע?',
        a: 'בעריכת אירוע, בחרו DJ מרשימת התקליטנים הזמינים. המערכת תשלח אוטומטית הודעה ל-DJ עם פרטי האירוע, ותוודא שאין התנגשויות בלוח הזמנים.'
      },
      {
        q: 'מעקב תשלומים — איך זה עובד?',
        a: 'לכל אירוע יש:\n• **מחיר כולל** — מחושב אוטומטית לפי חבילה + תוספות.\n• **מקדמה** — אחוז מחיר שנקבע בהגדרות (ברירת מחדל 30%).\n• **סטטוס תשלום** — ממתין / מקדמה שולמה / שולם מלא.\n• **אמצעי תשלום** — העברה, אשראי, מזומן, ביט.'
      },
    ]
  },
  {
    id: 'calendar',
    icon: Calendar,
    color: '#8b5cf6',
    title: 'יומן ולוח שנה',
    description: 'תצוגה ויזואלית של כל האירועים',
    items: [
      {
        q: 'איך משתמשים ביומן?',
        a: 'בדף **"יומן"** תראו את כל האירועים בתצוגה חודשית או שבועית. ניתן לסנן לפי סוג אירוע, DJ, סטטוס ועוד. כל אירוע ביומן ניתן ללחיצה לצפייה בפרטים.'
      },
      {
        q: 'איך רואים זמינות תקליטנים?',
        a: 'ביומן מוצגים גם חסימות של תקליטנים. ניתן גם לגשת לדף **"זמינות תקליטנים"** לראות תצוגה מפורטת של מי פנוי ומתי.'
      },
    ]
  },
  {
    id: 'djs',
    icon: Music,
    color: '#f97316',
    title: 'ניהול תקליטנים',
    description: 'הוספת תקליטנים, ניהול זמינות ותפקוד',
    items: [
      {
        q: 'איך מוסיפים תקליטן חדש?',
        a: 'בדף **"תקליטנים"** לחצו "הוסף DJ". הזינו שם, טלפון ואימייל. תוכלו גם לקשר אותו למשתמש במערכת כדי שיוכל להיכנס ולראות את ההופעות שלו.'
      },
      {
        q: 'מה DJ רואה כשהוא נכנס למערכת?',
        a: 'תקליטן שמחובר למשתמש רואה:\n• **לוח ההופעות שלי** — כל האירועים שהוא משובץ אליהם.\n• **הזמינות שלי** — ניהול תאריכים חסומים.\nהוא **לא** רואה את שאר המערכת (לידים, לקוחות, הגדרות).'
      },
    ]
  },
  {
    id: 'tasks',
    icon: ListChecks,
    color: '#14b8a6',
    title: 'משימות',
    description: 'מעקב אחרי כל מה שצריך לעשות',
    items: [
      {
        q: 'אילו משימות נוצרות אוטומטית?',
        a: '• **מעקב ליד חדש** — כשליד נכנס למערכת.\n• **ליד כפול** — כשהמערכת מזהה כפילויות.\n• **מעקב הצעת מחיר** — אחרי שליחת הצעה.\n• **DJ חסר** — כשאירוע קרוב ואין DJ משובץ.'
      },
      {
        q: 'איך יוצרים משימה ידנית?',
        a: 'בדף **"משימות"** לחצו "משימה חדשה". ניתן להגדיר כותרת, עדיפות (נמוכה/רגילה/גבוהה), תאריך יעד וקישור לליד או אירוע.'
      },
    ]
  },
  {
    id: 'templates',
    icon: MessageSquare,
    color: '#0ea5e9',
    title: 'תבניות הודעות',
    description: 'התאמת הודעות אוטומטיות שנשלחות ללקוחות',
    items: [
      {
        q: 'אילו תבניות הודעות קיימות?',
        a: '• **NEW_LEAD** — הודעה ללקוח חדש.\n• **QUOTE_SENT** — הצעת מחיר נשלחה.\n• **DEAL_CLOSED** — עסקה נסגרה.\n• **PAY_REMINDER_1/2** — תזכורות תשלום.\n• **PAY_CONFIRMED** — אישור תשלום.\n• **DJ_ASSIGNED** — DJ שובץ לאירוע.\n• **EVENT_REMINDER** — תזכורת לפני אירוע.\n• **THANK_YOU** — הודעת תודה אחרי אירוע.'
      },
      {
        q: 'איך עורכים תבנית?',
        a: 'בהגדרות → **"תבניות הודעות"** תמצאו את כל התבניות. ניתן לערוך את הטקסט ולהשתמש במשתנים כמו:\n• `{contact_name}` — שם הלקוח\n• `{event_date}` — תאריך האירוע\n• `{owner_name}` — שם בעל העסק\n• `{owner_whatsapp_phone}` — מספר הווטסאפ שלכם\n\nניתן גם לכבות/להפעיל כל תבנית בנפרד.'
      },
    ]
  },
  {
    id: 'automations',
    icon: Zap,
    color: '#eab308',
    title: 'אוטומציות',
    description: 'הפעולות שהמערכת עושה בשבילכם אוטומטית',
    items: [
      {
        q: 'אילו אוטומציות פועלות?',
        a: '**אוטומציות לפי אירוע (טריגר):**\n• ליד חדש → שליחת הודעה + משימה.\n• שיבוץ DJ → הודעה ל-DJ.\n• שינוי תשלום → עדכון סטטוס + אישור.\n• שינוי חוזה → מעקב חתימות.\n\n**אוטומציות מתוזמנות (יומיות):**\n• תזכורות תשלום (14 ו-7 ימים לפני).\n• תזכורת אירוע (יום לפני).\n• הודעת תודה (יום אחרי).\n• ניטור — DJ חסרים, הצעות לא מטופלות, כשלים.'
      },
      {
        q: 'איך מפעילים/מכבים אוטומציות?',
        a: 'בהגדרות → **"הגדרות כלליות"** יש מתג **"אוטומציות פעילות"**. כיבוי המתג יעצור את כל האוטומציות.'
      },
    ]
  },
  {
    id: 'whatsapp',
    icon: Phone,
    color: '#22c55e',
    title: 'חיבור ווטסאפ',
    description: 'הגדרת שליחת הודעות אוטומטיות בווטסאפ',
    items: [
      {
        q: 'מהם מצבי השליחה?',
        a: 'בהגדרות כלליות תמצאו **"מצב שליחה"**:\n• **לוג בלבד** — ההודעות נרשמות בלוג אבל לא נשלחות באמת. מצוין לבדיקות.\n• **שליחה אמיתית** — ההודעות נשלחות בפועל דרך ווטסאפ.'
      },
      {
        q: 'איך מוודאים שווטסאפ עובד?',
        a: '1. ודאו שמצב השליחה הוא **"שליחה אמיתית"**.\n2. ודאו שחשבון ה-GREEN API מחובר ופעיל.\n3. צרו ליד חדש לבדיקה ובדקו ב-AuditLog (פעילות אחרונה בדשבורד) שמופיע "הודעת NEW_LEAD נשלחה בוואטסאפ".'
      },
      {
        q: 'איך מחברים את סוכן הווטסאפ (AI)?',
        a: 'בהגדרות → **"סוכן ווצאפ"** תמצאו קישור לחיבור הסוכן החכם. הסוכן יכול לנהל שיחות אוטומטיות עם לקוחות דרך ווטסאפ.'
      },
    ]
  },
  {
    id: 'settings',
    icon: Settings,
    color: '#64748b',
    title: 'הגדרות המערכת',
    description: 'התאמה אישית של כל חלקי המערכת',
    items: [
      {
        q: 'איך משנים את המיתוג?',
        a: 'בהגדרות → **"מיתוג"** ניתן לשנות:\n• שם האפליקציה\n• שם הבעלים\n• צבע ראשי\n• גופן (Rubik / Assistant)'
      },
      {
        q: 'איך מגדירים את טופס ההזמנה?',
        a: 'בהגדרות → **"טופס הזמנה"** תוכלו:\n• לערוך כותרות ותיאורים.\n• לשנות תמונת/סרטון רקע.\n• להוסיף/להסיר/לסדר שדות בטופס.\n• להתאים את דף ההצלחה.\n• להגדיר מייל לקבלת התראות על פניות חדשות.'
      },
      {
        q: 'איך מנהלים חבילות ומחירון?',
        a: 'בהגדרות → **"מחירון"** ניתן להוסיף ולערוך חבילות ותוספות. כל פריט כולל שם, מחיר וסוג (חבילה/תוספת). החבילות מופיעות אוטומטית בעת יצירת אירועים.'
      },
      {
        q: 'איך משנים את סרגל הניווט?',
        a: 'בהגדרות → **"סרגל ניווט"** ניתן:\n• להעלות לוגו.\n• לשנות את שמות כל הפריטים בתפריט.\nהשינויים יחולו מיד אחרי שמירה.'
      },
    ]
  },
  {
    id: 'bookingform',
    icon: Globe,
    color: '#a855f7',
    title: 'טופס הזמנה ציבורי',
    description: 'הטופס שהלקוחות שלכם ממלאים',
    items: [
      {
        q: 'איך שולחים את הטופס ללקוחות?',
        a: 'בהגדרות → **"טופס הזמנה"** תמצאו את **קישור הטופס**. ניתן להעתיק אותו ולשלוח ללקוחות, לשים באתר, או לשתף ברשתות חברתיות.'
      },
      {
        q: 'מה קורה כשלקוח ממלא את הטופס?',
        a: '1. נוצר **ליד חדש** במערכת עם כל הפרטים שהלקוח מילא.\n2. נשלחת **הודעת ווטסאפ** ללקוח (לפי תבנית NEW_LEAD).\n3. נשלחת **התראה במייל** לבעל העסק.\n4. נוצרת **משימת מעקב** אוטומטית.\n5. הלקוח רואה **דף הצלחה** עם אישור קבלת הפנייה.'
      },
    ]
  },
];

export default function CrmGuideTab() {
  const [activeSection, setActiveSection] = useState(null);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero */}
      <div className="bg-gradient-to-l from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">מדריך למערכת סקיצה CRM</h2>
            <p className="text-gray-500">כל מה שצריך לדעת כדי להפיק את המקסימום מהמערכת</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => {
                  const el = document.getElementById(`guide-${s.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                style={{ color: s.color }}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <div key={section.id} id={`guide-${section.id}`} className="scroll-mt-4">
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="px-6 py-4 flex items-center gap-3 border-b" style={{ backgroundColor: `${section.color}08` }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${section.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, idx) => (
                    <AccordionItem key={idx} value={`${section.id}-${idx}`} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50/50 text-right">
                        <div className="flex items-center gap-3">
                          <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800 text-sm">{item.q}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5">
                        <div className="mr-7 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {item.a.split('\n').map((line, i) => {
                            // Bold text between ** **
                            const parts = line.split(/\*\*(.*?)\*\*/g);
                            return (
                              <span key={i}>
                                {parts.map((part, j) =>
                                  j % 2 === 1
                                    ? <strong key={j} className="text-gray-800 font-semibold">{part}</strong>
                                    : <span key={j}>{part}</span>
                                )}
                                {i < item.a.split('\n').length - 1 && <br />}
                              </span>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-6 text-sm text-gray-400">
        <p>לשאלות נוספות, צרו קשר עם תמיכת סקיצה 🎧</p>
      </div>
    </div>
  );
}