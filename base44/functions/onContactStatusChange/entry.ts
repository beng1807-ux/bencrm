import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onContactStatusChange] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: contact, old_data } = await req.json();

    if (!contact || !contact.id) {
      console.warn('[onContactStatusChange] ✖ No contact data');
      return Response.json({ error: 'No contact data' }, { status: 400 });
    }

    // Only react to status changes
    if (!old_data || contact.status === old_data.status) {
      console.log('[onContactStatusChange] ℹ No status change - skipping');
      return Response.json({ message: 'No status change' });
    }

    console.log(`[onContactStatusChange] ✓ Contact ${contact.id}: ${old_data.status} → ${contact.status}`);

    // Check settings
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onContactStatusChange] ℹ Automations disabled');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    // ── DEAL_CLOSED: Update contact_type to customer ──
    if (contact.status === 'DEAL_CLOSED' && old_data.status !== 'DEAL_CLOSED') {
      console.log('[onContactStatusChange] 🤝 DEAL_CLOSED - upgrading to customer');
      await base44.asServiceRole.entities.Contact.update(contact.id, {
        contact_type: 'customer',
      });
    }

    // ── DJ_SKITZA: Send DJ booking form link (only if coming from a different status) ──
    if (contact.status === 'DJ_SKITZA' && old_data.status !== 'DJ_SKITZA') {
      // Check if DJ_BOOKING_FORM was already sent to this contact
      const existingMessages = await base44.asServiceRole.entities.AuditLog.filter({
        entity_id: contact.id,
        action: 'SEND_MESSAGE',
      });
      const alreadySent = existingMessages.some(m => m.metadata?.template_key === 'DJ_BOOKING_FORM');
      if (alreadySent) {
        console.log('[onContactStatusChange] ℹ DJ_BOOKING_FORM already sent - skipping');
        return Response.json({ message: 'DJ_BOOKING_FORM already sent' });
      }
      console.log('[onContactStatusChange] 🎵 DJ_SKITZA status - adding DJ booking form to queue');

      // Mark contact as DJ lead
      await base44.asServiceRole.entities.Contact.update(contact.id, { is_dj_lead: true });

      const existingQueue = await base44.asServiceRole.entities.MessageQueue.filter({
        contact_id: contact.id,
        template_key: 'DJ_BOOKING_FORM',
      });
      if (existingQueue.length === 0) {
        await base44.asServiceRole.entities.MessageQueue.create({
          contact_id: contact.id,
          template_key: 'DJ_BOOKING_FORM',
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: { source: 'DJ_SKITZA_STATUS_CHANGE' },
        });
        console.log('[onContactStatusChange] ✓ DJ_BOOKING_FORM added to safe message queue');
      } else {
        console.log('[onContactStatusChange] ℹ DJ_BOOKING_FORM already exists in queue - skipping');
      }
    }

    console.log('[onContactStatusChange] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onContactStatusChange] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatPhone(phone) {
  let num = phone.replace(/[\s\-\(\)\.\+]/g, '');
  if (num.startsWith('972')) { /* already international */ }
  else if (num.startsWith('0')) num = '972' + num.substring(1);
  return num;
}