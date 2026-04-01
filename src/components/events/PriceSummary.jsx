import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PriceSummary({ packages, packageId, addonIds = [], depositPercent = 30, data, onChange, isAdmin = false }) {
  const [manualDeposit, setManualDeposit] = useState(false);
  const [manualBalance, setManualBalance] = useState(false);

  const pkg = packages.find(p => p.id === packageId);
  const pkgPrice = pkg?.price || 0;
  const addonsTotal = (addonIds || []).reduce((sum, aid) => {
    const a = packages.find(p => p.id === aid);
    return sum + (a?.price || 0);
  }, 0);
  const calculatedTotal = pkgPrice + addonsTotal;

  useEffect(() => {
    const updates = {};
    const total = calculatedTotal;
    if (data.price_total !== total) updates.price_total = total;

    if (!manualDeposit) {
      const dep = Math.round(total * (depositPercent / 100));
      if (data.deposit_amount !== dep) updates.deposit_amount = dep;
    }

    if (!manualBalance) {
      const bal = total - (data.deposit_amount || 0);
      if (data.balance_amount !== bal) updates.balance_amount = bal;
    }

    if (Object.keys(updates).length > 0) onChange(updates);
  }, [calculatedTotal, depositPercent, manualDeposit, manualBalance, data.deposit_amount]);

  // Only show price summary to admin
  if (!isAdmin) return null;

  return (
    <div className="col-span-2 bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="border-b border-slate-300 pb-3 flex items-center justify-between">
        <span className="text-base font-black text-slate-900">סה״כ</span>
        <span className="text-lg font-black text-orange-600">₪{calculatedTotal.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <Label className="text-xs font-bold text-slate-500">מקדמה</Label>
          <Input
            type="number"
            value={data.deposit_amount || 0}
            onChange={e => {
              setManualDeposit(true);
              const val = Number(e.target.value);
              const updates = { deposit_amount: val };
              if (!manualBalance) updates.balance_amount = calculatedTotal - val;
              onChange(updates);
            }}
            className="mt-1"
          />
          {!manualDeposit && <p className="text-[10px] text-slate-400 mt-1">{depositPercent}% אוטומטי</p>}
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-500">יתרה</Label>
          <Input
            type="number"
            value={data.balance_amount || 0}
            onChange={e => {
              setManualBalance(true);
              onChange({ balance_amount: Number(e.target.value) });
            }}
            className="mt-1"
          />
          {!manualBalance && <p className="text-[10px] text-slate-400 mt-1">מחושב אוטומטית</p>}
        </div>
      </div>
    </div>
  );
}