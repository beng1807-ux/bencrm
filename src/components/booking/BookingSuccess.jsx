import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function BookingSuccess() {
  return (
    <div className="relative min-h-screen flex flex-col text-white overflow-hidden" dir="rtl" style={{ fontFamily: 'Assistant, sans-serif', backgroundColor: '#120a08' }}>
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(233,79,28,0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(233,79,28,0.1) 0px, transparent 50%)'
      }} />

      {/* Background decorative image */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#120a08] via-transparent to-[#120a08]" />
        <img
          src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=60"
          alt="Party atmosphere"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-[#e94f1c] rounded-lg text-white font-bold text-lg">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">סקיצה</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-xl text-center flex flex-col items-center gap-8 p-10 md:p-16 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
            {/* Success icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#e94f1c]/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-[#e94f1c] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(233,79,28,0.4)]">
                <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white">הפנייה נשלחה בהצלחה!</h2>
              <h3 className="text-xl md:text-2xl text-[#e94f1c] font-semibold">תודה שפניתם לסקיצה</h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
                קיבלנו את הפרטים שלכם, נציג מטעמנו יחזור אליכם בהקדם כדי להתחיל לתכנן את האירוע המושלם.
              </p>
            </div>

            {/* Button */}
            <div className="w-full pt-4">
              <button
                onClick={() => window.location.reload()}
                className="group w-full md:w-auto min-w-[240px] bg-[#e94f1c] hover:bg-[#e94f1c]/90 text-white font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center gap-3 text-lg mx-auto"
              >
                <span>שליחת טופס נוסף</span>
                <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" />
              </button>
            </div>

            {/* Footer note */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-4">
              <span>🔒</span>
              <span>הנתונים שלכם מאובטחים בטכנולוגיית Skitza CRM</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 px-6 text-center border-t border-white/5 bg-[#120a08]/80 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <p className="text-slate-500 text-sm">© 2024 Skitza DJ & Event Production CRM</p>
          <div className="flex gap-6 text-slate-400 text-sm">
            <span className="hover:text-[#e94f1c] cursor-pointer">מדיניות פרטיות</span>
            <span className="hover:text-[#e94f1c] cursor-pointer">תנאי שימוש</span>
            <span className="hover:text-[#e94f1c] cursor-pointer">צרו קשר</span>
          </div>
        </div>
      </footer>
    </div>
  );
}