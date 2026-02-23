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
  try {
    // אבטחה אופציונלית - token ב-URL
    const url = new URL(req.url);
    const requiredToken = Deno.env.get('EVENT_SQUARE_TOKEN');
    if (requiredToken) {
      const got = url.searchParams.get('token') || '';
      if (got !== requiredToken) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const incoming = await parseIncoming(req);

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

    // חובה: לפחות external_event_id או phone
    if (!payload.external_event_id && !payload.phone) {
      return Response.json(
        { error: 'Missing required field: external_event_id or phone' },
        { status: 400 }
      );
    }

    // דדופליקציה: external_event_id ואז phone + event_date
    let existing = [];
    if (payload.external_event_id) {
      existing = await base44.asServiceRole.entities.Lead.filter({
        external_event_id: payload.external_event_id,
      });
    }
    if (existing.length === 0 && payload.phone && payload.event_date) {
      existing = await base44.asServiceRole.entities.Lead.filter({
        phone: payload.phone,
        event_date: payload.event_date,
      });
    }

    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'Lead already exists',
        lead_id: existing[0].id,
      });
    }

    // יצירת ליד - onNewLead automation ירוץ אוטומטית
    const createdLead = await base44.asServiceRole.entities.Lead.create(payload);

    return Response.json({ success: true, lead_id: createdLead.id });
  } catch (error) {
    console.error('eventSquareWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});