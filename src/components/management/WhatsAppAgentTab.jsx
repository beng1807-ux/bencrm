import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Copy, Check } from 'lucide-react';

export default function WhatsAppAgentTab() {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = base44.agents.getWhatsAppConnectURL('skitza_crm');

  const copyLink = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-200">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">סוכן AI לווצאפ</h3>
              <p className="text-slate-500 mt-1">
                חבר את הסוכן לווצאפ כדי לנהל את ה-CRM דרך הודעות.
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            הסוכן יכול למצוא לקוחות, אירועים ותקליטנים. להוסיף, לעדכן ולמחוק נתונים, לבצע שאילתות ולנהל את כל המערכת ישירות מווצאפ.
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm shadow-lg shadow-green-200"
            >
              <MessageCircle className="w-5 h-5" />
              חבר לווצאפ
            </a>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-green-300 bg-white hover:bg-green-50 text-green-700 font-bold text-sm transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'הועתק!' : 'העתק קישור'}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}