import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';

const METHODS = [
  { value: 'העברה', label: 'העברה בנקאית', icon: Building2 },
  { value: 'אשראי', label: 'כרטיס אשראי', icon: CreditCard },
  { value: 'מזומן', label: 'מזומן', icon: Banknote },
  { value: 'ביט', label: 'ביט', icon: Smartphone },
];

export default function PaymentMethodModal({ open, onClose, onConfirm, newStatus }) {
  const [selected, setSelected] = useState('');

  const statusLabel = newStatus === 'DEPOSIT_PAID' ? 'שולמה מקדמה' : 'שולם במלואו';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>בחירת אמצעי תשלום</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-4">
          שינוי סטטוס ל<strong>"{statusLabel}"</strong> — יש לבחור אמצעי תשלום:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {METHODS.map(m => {
            const Icon = m.icon;
            const isSelected = selected === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelected(m.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-bold">{m.label}</span>
              </button>
            );
          })}
        </div>
        <Button
          disabled={!selected}
          onClick={() => { onConfirm(selected); setSelected(''); }}
          className="w-full mt-4 font-bold text-white"
          style={{ backgroundColor: '#ec5b13' }}
        >
          אישור
        </Button>
      </DialogContent>
    </Dialog>
  );
}