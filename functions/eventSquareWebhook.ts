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

  // safe fallback
  try {
    const body = await req.json();
    return body?.data ?? body;
  } catch {
    const text = await req.text();
    try {
      const body = JSON.parse(text);
      return body?.data ?? body;
    } catch {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }
  }
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log(`[eventSquareWebhook] ▶ Request received: ${req.method} ${req.url}`);

  // הגנה: רק POST
  if (req.method !== 'POST') {
    console.warn(`[eventSquareWebhook] ⚠ Method not allowed: ${req.method}`);
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // אבטחה בוטלה - ללא בדיקת token
    console.log('[eventSquareWebhook] ✓ No token validation (disabled)');

    const base44 = createClientFromRequest(req);

    // פרסור הנתונים
    let incoming;
    try {
      incoming = await parseIncoming(req);
    } catch (parseErr) {
      console.error(`[eventSquareWebhook] ✖ Parse error: ${parseErr.message}`);
      return Response.json({ error: `Parse error: ${parseErr.message}` }, { status: 400 });
    }
    console.log('[eventSquareWebhook] ✓ Parsed incoming data:', JSON.stringify(incoming).substring(0, 500));

    const payload = {
      contact_name: pick(incoming, ['contact_name', 'name', 'customer_name', 'client_name']),
      phone: pick(incoming, ['phone', 'customer_phone', 'client_phone', 'mobile', 'cellphone']),
      email: pick(incoming, ['email', 'customer_email', 'client_email']),
      event_type: pick(incoming, ['event_type', 'eventKind', 'type']),
      event_date: pick(incoming, ['event_date', 'eventDate', 'date']),
      external_event_id: pick(incoming, ['external_event_id', 'deal_id', 'event_id', 'id']),
      source: 'EVENT_SQUARE_IMPORT',
      status: 'NEW',
    };
    console.log('[eventSquareWebhook] ✓ Mapped payload:', JSON.stringify(payload));

    // חובה: לפחות external_event_id או phone
    if (!payload.external_event_id && !payload.phone) {
      console.warn('[eventSquareWebhook] ✖ Missing required: no external_event_id and no phone');
      return Response.json(
        { error: 'Missing required field: external_event_id or phone' },
        { status: 400 }
      );
    }

    // דדופליקציה
    let existing = [];
    if (payload.external_event_id) {
      console.log(`[eventSquareWebhook] 🔍 Checking duplicates by external_event_id: ${payload.external_event_id}`);
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({
          external_event_id: payload.external_event_id,
        });
      } catch (filterErr) {
        console.error(`[eventSquareWebhook] ⚠ Filter by external_event_id failed: ${filterErr.message}`);
      }
    }
    if (existing.length === 0 && payload.phone && payload.event_date) {
      console.log(`[eventSquareWebhook] 🔍 Checking duplicates by phone+date: ${payload.phone} / ${payload.event_date}`);
      try {
        existing = await base44.asServiceRole.entities.Lead.filter({
          phone: payload.phone,
          event_date: payload.event_date,
        });
      } catch (filterErr) {
        console.error(`[eventSquareWebhook] ⚠ Filter by phone+date failed: ${filterErr.message}`);
      }
    }

    if (existing.length > 0) {
      console.log(`[eventSquareWebhook] ℹ Duplicate found - lead_id: ${existing[0].id}`);
      return Response.json({
        success: true,
        message: 'Lead already exists',
        lead_id: existing[0].id,
      });
    }

    // יצירת ליד
    console.log('[eventSquareWebhook] 📝 Creating new lead...');
    const createdLead = await base44.asServiceRole.entities.Lead.create(payload);
    const elapsed = Date.now() - startTime;
    console.log(`[eventSquareWebhook] ✅ Lead created: ${createdLead.id} (${elapsed}ms)`);

    return Response.json({ success: true, lead_id: createdLead.id });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[eventSquareWebhook] ❌ Unhandled error (${elapsed}ms):`, error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});