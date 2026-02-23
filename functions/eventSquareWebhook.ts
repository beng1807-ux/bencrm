import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function parseIncoming(req) {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    return body?.data ?? body;
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData();
    const obj = {};
    for (const [key, value] of form.entries()) obj[key] = String(value);
    return obj;
  }

  // fallback - try json then text
  const text = await req.text();
  try {
    const body = JSON.parse(text);
    return body?.data ?? body;
  } catch {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const foundKey = objKeys.find(ok => ok === k);
    if (foundKey) {
      const v = obj[foundKey];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
  }
  return '';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log(`[esWebhook] ▶ ${req.method} ${req.url}`);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    let incoming;
    try {
      incoming = await parseIncoming(req);
    } catch (parseErr) {
      console.error(`[esWebhook] Parse error: ${parseErr.message}`);
      return Response.json({ error: `Parse error: ${parseErr.message}` }, { status: 400 });
    }

    const keys = Object.keys(incoming || {});
    console.log(`[esWebhook] Incoming keys: ${keys.join(', ')}`);
    console.log(`[esWebhook] Incoming data: ${JSON.stringify(incoming).substring(0, 800)}`);

    // מיפוי שדות אירוע בריבוע
    const contactName = pick(incoming, ['Contact1Name', 'Contact2Name', 'contact_name', 'name', 'customer_name']);
    const phone = pick(incoming, ['Contact1Phone', 'Contact2Phone', 'BizPhone', 'phone', 'mobile', 'cellphone']);
    const email = pick(incoming, ['Contact1EMail', 'Contact2EMail', 'email', 'customer_email']);
    const eventType = pick(incoming, ['EventTypeName', 'event_type', 'eventKind', 'type']);
    const externalId = pick(incoming, ['DocID', 'DocNumber', 'Event_ExternalID', 'external_event_id', 'deal_id']);
    const guestsCount = pick(incoming, ['OpenQty', 'guests_count']);
    const location = pick(incoming, ['ResourceName', 'location']);

    // תאריך אירוע
    let eventDate = pick(incoming, ['isoResourceStartTime', 'ResourceStartTime', 'event_date', 'eventDate', 'date']);
    if (eventDate) {
      try {
        // נסה ISO format ישירות
        if (eventDate.includes('T')) {
          eventDate = eventDate.split('T')[0];
        } else if (eventDate.includes('/')) {
          // פורמט DD/MM/YYYY HH:MM:SS
          const parts = eventDate.split(' ')[0].split('/');
          if (parts.length === 3) {
            eventDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
        } else {
          const d = new Date(eventDate);
          if (!isNaN(d.getTime())) {
            eventDate = d.toISOString().split('T')[0];
          }
        }
      } catch {}
    }

    console.log(`[esWebhook] Mapped: name=${contactName}, phone=${phone}, type=${eventType}, date=${eventDate}, extId=${externalId}, guests=${guestsCount}`);

    const payload = {
      contact_name: contactName,
      phone: phone,
      email: email || undefined,
      event_type: eventType || undefined,
      event_date: eventDate || undefined,
      external_event_id: externalId || undefined,
      guests_count: guestsCount ? Number(guestsCount) : undefined,
      source: 'EVENT_SQUARE_IMPORT',
      status: 'NEW',
    };

    // חובה: לפחות external_event_id או phone
    if (!externalId && !phone) {
      console.warn(`[esWebhook] Missing required: no external_event_id and no phone`);
      return Response.json(
        { error: 'Missing required field: external_event_id or phone' },
        { status: 400 }
      );
    }

    // דדופליקציה
    let existing = [];
    if (externalId) {
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({
          external_event_id: externalId,
        });
      } catch {}
    }
    if (existing.length === 0 && phone && eventDate) {
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({
          phone: phone,
          event_date: eventDate,
        });
      } catch {}
    }

    if (existing.length > 0) {
      console.log(`[esWebhook] Duplicate found: ${existing[0].id}`);
      return Response.json({ success: true, message: 'Lead already exists', lead_id: existing[0].id });
    }

    // יצירת ליד
    const createdLead = await base44.asServiceRole.entities.Lead.create(payload);
    console.log(`[esWebhook] Lead created: ${createdLead.id} (${Date.now() - startTime}ms)`);

    return Response.json({ success: true, lead_id: createdLead.id });
  } catch (error) {
    console.error(`[esWebhook] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});