import React, { useEffect } from 'react';

export default function PriceSummary({ packages, packageId, addonIds = [], data, onChange, isAdmin = false }) {
  const pkg = packages.find(p => p.id === packageId);
  const pkgPrice = pkg?.price || 0;
  const addonsTotal = (addonIds || []).reduce((sum, aid) => {
    const a = packages.find(p => p.id === aid);
    return sum + (a?.price || 0);
  }, 0);
  const calculatedTotal = pkgPrice + addonsTotal;

  useEffect(() => {
    if (data.price_total !== calculatedTotal) {
      onChange({ price_total: calculatedTotal });
    }
  }, [calculatedTotal]);

  // Only show price summary to admin
  if (!isAdmin) return null;

  return (
    <div className="col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-base font-black text-slate-900">סה״כ</span>
        <span className="text-lg font-black text-orange-600">₪{calculatedTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}