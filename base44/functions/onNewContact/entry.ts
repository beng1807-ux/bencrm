import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[onNewContact] ▶ Triggered');

  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error(`[onNewContact] ✖ Failed to parse request body: ${parseErr.message}`);
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { event, data: contact } = body;
    if (!contact || !contact.id) {
      console.warn('[onNewContact] ✖ No contact data in payload');
      return Response.json({ error: 'No contact data' }, { status: 400 });
    }
    console.log(`[onNewContact] ✓ Contact: ${contact.id} - ${contact.contact_name} - ${contact.phone} - status: ${contact.status}`);

    // Skip WhatsApp + task for form-filled contacts (handled by submitBookingForm)
    if (contact.status === 'FORM_FILLED') {
      console.log('[onNewContact] ℹ Contact filled form - skipping WhatsApp & task (handled by submitBookingForm)');
      return Response.json({ message: 'Form-filled contact - skipped' });
    }

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onNewContact] ℹ Automations disabled - skipping');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';
    console.log(`[onNewContact] ✓ Settings loaded. WhatsApp mode: ${settings.whatsapp_send_mode}`);

    // בדיקת כפילויות
    if (contact.phone && contact.event_date) {
      console.log(`[onNewContact] 🔍 Checking duplicates: ${contact.phone} / ${contact.event_date}`);
      try {
        const duplicates = await base44.asServiceRole.entities.Contact.filter({
          phone: contact.phone,
          event_date: contact.event_date,
        });
        if (duplicates.length > 1) {
          console.log(`[onNewContact] ⚠ Found ${duplicates.length} duplicates - creating task`);
          await base44.asServiceRole.entities.Task.create({
            title: `איש קשר כפול - ${contact.contact_name}`,
            related_contact_id: contact.id,
            priority: 'HIGH',
            status: 'PENDING',
          });
        }
      } catch (dupErr) {
        console.error(`[onNewContact] ⚠ Duplicate check failed: ${dupErr.message}`);
      }
    }

    // הכנסת הודעה לתור במקום שליחה מיידית
    try {
      if (contact.whatsapp_opted_out) {
        console.log(`Opted out — not queuing message for ${contact.contact_name}`);
      } else {
        const existingQueue = await base44.asServiceRole.entities.MessageQueue.filter({
          contact_id: contact.id,
          template_key: 'NEW_LEAD',
        });
        if (existingQueue.length === 0) {
          await base44.asServiceRole.entities.MessageQueue.create({
            contact_id: contact.id,
            template_key: 'NEW_LEAD',
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
            metadata: { source: contact.source || 'CONTACT_CREATE' },
          });
          console.log('[onNewContact] ✓ NEW_LEAD added to safe message queue');
        } else {
          console.log('[onNewContact] ℹ NEW_LEAD already exists in queue - skipping');
        }
      }
    } catch (msgError) {
      console.error(`[onNewContact] ✖ Queue error: ${msgError.message}`);
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Contact',
        entity_id: contact.id,
        action: 'SEND_FAILED',
        diff_summary: `כשל בהכנסה לתור הודעות: ${msgError.message}`,
        metadata: { template_key: 'NEW_LEAD', error_message: msgError.message },
      });
    }

    // משימת מעקב
    try {
      await base44.asServiceRole.entities.Task.create({
        title: `מעקב איש קשר חדש - ${contact.contact_name}`,
        related_contact_id: contact.id,
        priority: 'NORMAL',
        status: 'PENDING',
      });
      console.log('[onNewContact] ✓ Follow-up task created');
    } catch (taskErr) {
      console.error(`[onNewContact] ✖ Task creation failed: ${taskErr.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[onNewContact] ✅ Done (${elapsed}ms)`);
    return Response.json({ success: true });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[onNewContact] ❌ Unhandled error (${elapsed}ms):`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatPhone(phone) {
  let num = phone.replace(/[\s\-\(\)\.\+]/g, '');
  if (num.startsWith('972')) { /* already international */ }
  else if (num.startsWith('0')) num = '972' + num.substring(1);
  return num;
}