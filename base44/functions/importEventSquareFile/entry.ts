import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { file_url, dry_run = true } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    const res = await fetch(file_url);
    if (!res.ok) throw new Error('Failed to fetch file');
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const grouped = new Map();
    for (const row of rows) {
      const docId = clean(row['מספר מסמך'] || row['מזהה מסמך']);
      if (!docId) continue;
      if (!grouped.has(docId)) grouped.set(docId, { rows: [], first: row });
      grouped.get(docId).rows.push(row);
    }

    const existingContacts = await base44.asServiceRole.entities.Contact.list();
    const existingExternalIds = new Set(existingContacts.map(c => String(c.external_event_id || '')).filter(Boolean));
    const existingPhoneDate = new Set(existingContacts.filter(c => c.phone && c.event_date).map(c => `${normalizePhone(c.phone)}|${c.event_date}`));

    const summary = { total_orders: grouped.size, created: 0, skipped_duplicates: 0, skipped_missing_phone: 0, dry_run, samples: [] };

    for (const [docId, group] of grouped.entries()) {
      const row = group.first;
      const phone = normalizePhone(row['טלפון לקוח 1']);
      const eventDate = parseDateOnly(row['התחלה']);
      const externalId = docId;
      const duplicate = existingExternalIds.has(externalId) || (phone && eventDate && existingPhoneDate.has(`${phone}|${eventDate}`));

      if (duplicate) { summary.skipped_duplicates++; continue; }
      if (!phone) { summary.skipped_missing_phone++; continue; }

      const itemDescriptions = group.rows.map(r => clean(r['תאור הפריט'])).join(' | ');
      const isDjLead = /תקליטן\s*-?\s*הבריאה\s*-?\s*בן|תקליטן\s+הבריאה\s*-?\s*בן/.test(itemDescriptions);
      const updatedAt = parseDateTime(row['תאריך עדכון']);
      const contactData = {
        contact_name: clean(row['שם לקוח 1']) || 'ללא שם',
        phone,
        status: 'NEW',
        source: 'EVENT_SQUARE_IMPORT',
        contact_type: 'lead',
        external_event_id: externalId,
        is_dj_lead: isDjLead,
      };

      const email = clean(row['דואל לקוח 1']);
      const venueHall = clean(row['משאב']);
      if (email) contactData.email = email;
      if (eventDate) contactData.event_date = eventDate;
      if (venueHall === 'אולם קטן' || venueHall === 'אולם גדול') contactData.venue_hall = venueHall;
      if (updatedAt) contactData.event_square_updated_at = updatedAt;

      if (summary.samples.length < 5) summary.samples.push(contactData);
      if (!dry_run) {
        const created = await base44.asServiceRole.entities.Contact.create(contactData);
        await base44.asServiceRole.entities.MessageQueue.create({
          contact_id: created.id,
          template_key: 'NEW_LEAD',
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: { source: 'event_square_import_file', external_event_id: externalId },
        });
        existingExternalIds.add(externalId);
        if (phone && eventDate) existingPhoneDate.add(`${phone}|${eventDate}`);
      }
      summary.created++;
    }

    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function clean(value) {
  return value === undefined || value === null ? '' : String(value).replace(/^\t+/, '').trim();
}

function normalizePhone(value) {
  const num = clean(value).replace(/[^0-9]/g, '');
  if (!num) return '';
  if (num.startsWith('972')) return '0' + num.substring(3);
  return num;
}

function parseDateOnly(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (raw.includes('/')) {
    const [d, m, y] = raw.split(' ')[0].split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const date = new Date(raw);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function parseDateTime(value) {
  const raw = clean(value);
  if (!raw) return '';
  if (raw.includes('/')) {
    const [datePart, timePart = '00:00:00'] = raw.split(' ');
    const [d, m, y] = datePart.split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timePart}`;
  }
  const date = new Date(raw);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}