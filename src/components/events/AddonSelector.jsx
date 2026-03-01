import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function AddonSelector({ packages, selectedAddonIds = [], onChange }) {
  const addons = packages.filter(p => p.item_type === 'ADDON' && p.active !== false);

  if (addons.length === 0) return null;

  const toggle = (addonId) => {
    const current = selectedAddonIds || [];
    const next = current.includes(addonId)
      ? current.filter(id => id !== addonId)
      : [...current, addonId];
    onChange(next);
  };

  return (
    <div className="col-span-2 space-y-2">
      <Label className="text-sm font-bold">תוספות</Label>
      <div className="grid grid-cols-2 gap-2">
        {addons.map(addon => (
          <label
            key={addon.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedAddonIds?.includes(addon.id)
                ? 'border-orange-300 bg-orange-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Checkbox
              checked={selectedAddonIds?.includes(addon.id)}
              onCheckedChange={() => toggle(addon.id)}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-700">{addon.item_name}</span>
              {addon.description && <p className="text-xs text-slate-400 truncate">{addon.description}</p>}
            </div>
            <span className="text-sm font-black text-slate-900 flex-shrink-0">₪{addon.price?.toLocaleString()}</span>
          </label>
        ))}
      </div>
    </div>
  );
}