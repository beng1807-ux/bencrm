import React from 'react';
import { Ban, Phone, Mail } from 'lucide-react';

export default function DJBlockTooltip({ djList, position }) {
  if (!djList || djList.length === 0) return null;

  return (
    <div 
      className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-violet-100 p-5 w-64 pointer-events-none"
      style={{ 
        top: position.y, 
        left: position.x,
        transform: 'translate(-50%, -110%)'
      }}
    >
      {/* Decorative top line */}
      <div className="absolute top-0 left-4 right-4 h-1 rounded-b-full bg-gradient-to-l from-violet-400 to-violet-600" />
      
      <div className="flex items-center gap-2 mb-3">
        <Ban className="w-4 h-4 text-violet-500" />
        <h4 className="font-black text-slate-900 text-sm">תקליטנים חסומים</h4>
      </div>

      <div className="space-y-3">
        {djList.map(dj => (
          <div key={dj.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <span className="text-violet-600 font-black text-xs">{dj.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{dj.name}</p>
              <p className="text-[10px] text-slate-400">{dj.phone}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arrow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
        <div className="w-3 h-3 bg-white border-b border-r border-violet-100 transform rotate-45 -translate-y-1.5" />
      </div>
    </div>
  );
}