import React from 'react';
import { Play } from 'lucide-react';

const HERO_IMAGE = "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200&q=80";

export default function BookingHero() {
  return (
    <div className="relative w-full lg:w-1/2 min-h-[350px] lg:min-h-screen lg:sticky lg:top-0 overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt="DJ Event Atmosphere"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center group cursor-pointer">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-[#e94f1c]/90 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(233,79,28,0.6)]">
          <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="white" />
        </div>
        <div className="absolute bottom-8 right-8 text-right text-white hidden md:block">
          <h2 className="text-2xl lg:text-3xl font-extrabold mb-2">צפו בביצועים שלנו</h2>
          <p className="text-base lg:text-lg opacity-80">הופכים כל אירוע לחוויה של פעם בחיים</p>
        </div>
      </div>
      {/* Mobile gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent lg:hidden" />
    </div>
  );
}