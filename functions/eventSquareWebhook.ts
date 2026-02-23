import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    if (k in obj) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
  }
  return '';
}

function parseEventDate(raw) {
  if (!raw) return '';
  try {
    if (raw.includes('T')) return raw.split('T')[0];
    if (raw.includes('/')) {
      const parts = raw.split(' ')[0].split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  return '';
}

Deno.serve(async (req) => {
  console.log(`[webhook] ▶ ${req.method}`);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // פענוח הבקשה - תומך ב-JSON וב-Form Data
    let incoming;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      incoming = body?.data ?? body;
    } else if (contentType.includes('form')) {
      const form = await req.formData();
      incoming = {};
      for (const [key, value] of form.entries()) incoming[key] = String(value);
    } else {
      const text = await req.text();
      try {
        const body = JSON.parse(text);
        incoming = body?.data ?? body;
      } catch {
        return Response.json({ error: 'Unsupported content type' }, { status: 400 });
      }
    }

    console.log(`[webhook] Keys: ${Object.keys(incoming || {}).join(', ')}`);

    // מיפוי שדות מאירוע בריבוע
    const contactName = pick(incoming, ['Contact1Name', 'Contact2Name', 'contact_name', 'name']);
    const phone = pick(incoming, ['Contact1Phone', 'Contact2Phone', 'BizPhone', 'phone']);
    const email = pick(incoming, ['Contact1EMail', 'Contact2EMail', 'email']);
    const eventType = pick(incoming, ['EventTypeName', 'event_type']);
    const externalId = pick(incoming, ['DocID', 'DocNumber', 'Event_ExternalID', 'external_event_id']);
    const guestsCount = pick(incoming, ['OpenQty', 'guests_count']);
    const location = pick(incoming, ['ResourceName', 'location']);
    const eventDate = parseEventDate(pick(incoming, ['isoResourceStartTime', 'ResourceStartTime', 'event_date']));

    console.log(`[webhook] Mapped → name=${contactName}, phone=${phone}, date=${eventDate}, extId=${externalId}`);

    // חובה: טלפון או מזהה חיצוני
    if (!externalId && !phone) {
      return Response.json({ error: 'Missing phone or external_event_id' }, { status: 400 });
    }

    // בדיקת כפילויות
    let existing = [];
    if (externalId) {
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({ external_event_id: externalId });
      } catch {}
    }
    if (existing.length === 0 && phone && eventDate) {
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({ phone, event_date: eventDate });
      } catch {}
    }

    if (existing.length > 0) {
      console.log(`[webhook] Duplicate → ${existing[0].id}`);
      return Response.json({ success: true, message: 'Lead already exists', lead_id: existing[0].id });
    }

    // בניית הליד
    const leadData = {
      contact_name: contactName || 'ללא שם',
      phone: phone || '',
      status: 'NEW',
      source: 'EVENT_SQUARE_IMPORT',
    };

    if (email) leadData.email = email;
    if (eventType) leadData.event_type = eventType;
    if (eventDate) leadData.event_date = eventDate;
    if (externalId) leadData.external_event_id = externalId;
    if (guestsCount) leadData.guests_count = Number(guestsCount);

    const created = await base44.asServiceRole.entities.Lead.create(leadData);
    console.log(`[webhook] ✅ Lead created: ${created.id}`);

    return Response.json({ success: true, lead_id: created.id });
  } catch (error) {
    console.error(`[webhook] ❌ ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});