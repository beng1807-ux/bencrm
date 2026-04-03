import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onDJAssigned] ▶ v5 - clean rewrite');
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event: triggerEvent, data: eventData, old_data } = payload;

    // ── Validate event ID ──
    const eventId = triggerEvent?.entity_id;
    if (!eventId) {
      console.error('[onDJAssigned] ✖ No entity_id in trigger event');
      return Response.json({ error: 'No event ID' }, { status: 400 });
    }

    // ── Validate DJ actually changed ──
    const newDjId = eventData?.dj_id;
    const oldDjId = old_data?.dj_id;
    if (!newDjId || newDjId === oldDjId) {
      console.log(`[onDJAssigned] ℹ No DJ change (${oldDjId} → ${newDjId}) - skipping`);
      return Response.json({ message: 'No DJ change' });
    }
    console.log(`[onDJAssigned] DJ changed: ${oldDjId || 'none'} → ${newDjId}`);

    // ── Check automations enabled ──
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0];
    if (!settings?.automations_enabled) {
      console.log('[onDJAssigned] ℹ Automations disabled');
      return Response.json({ message: 'Automations disabled' });
    }
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    // ── Fetch DJ ──
    let dj;
    try {
      dj = await base44.asServiceRole.entities.DJ.get(newDjId);
    } catch (err) {
      console.error(`[onDJAssigned] ✖ DJ ${newDjId} not found: ${err.message}`);
      return Response.json({ error: 'DJ not found' }, { status: 404 });
    }
    console.log(`[onDJAssigned] DJ: ${dj.name} (${dj.phone})`);

    // ── Fetch Contact (optional) ──
    const contactId = eventData?.contact_id;
    let contact = null;
    if (contactId) {
      try {
        contact = await base44.asServiceRole.entities.Contact.get(contactId);
        console.log(`[onDJAssigned] Contact: ${contact.contact_name} (${contact.phone})`);
      } catch (err) {
        console.error(`[onDJAssigned] ✖ Contact ${contactId} not found: ${err.message}`);
      }
    }

    // ── Prepare shared variables ──
    const eventDateFormatted = eventData.event_date
      ? new Date(eventData.event_date).toLocaleDateString('he-IL')
      : '';
    const appId = Deno.env.get('BASE44_APP_ID') || '';
    const eventLink = `https://preview-sandbox--${appId}.base44.app/Events?eventId=${eventId}`;

    // ── 1. Send to CUSTOMER (DJ_ASSIGNED) ──
    if (contact && contact.phone) {
      const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_ASSIGNED', active: true,
      });
      if (templates.length > 0) {
        const msg = replacePlaceholders(templates[0].template_text, {
          contact, dj, eventData, eventDateFormatted, settings, signature, eventLink,
        });
        console.log(`[onDJAssigned] 📱 Sending DJ_ASSIGNED → customer ${contact.phone}`);
        await sendMessage(base44, settings, contact.phone, msg, logoUrl, {
          contactId: contact.id,
          eventId,
          templateKey: 'DJ_ASSIGNED',
          summary: `הודעת שיבוץ DJ נשלחה ללקוח ${contact.contact_name}`,
        });
      } else {
        console.warn('[onDJAssigned] ⚠ No active DJ_ASSIGNED template');
      }
    } else {
      console.warn('[onDJAssigned] ⚠ No contact/phone - skipping customer message');
    }

    // ── 2. Send to DJ (DJ_BOOKING_CONFIRM) ──
    if (dj.phone) {
      const templates = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_BOOKING_CONFIRM', active: true,
      });
      if (templates.length > 0) {
        const msg = replacePlaceholders(templates[0].template_text, {
          contact, dj, eventData, eventDateFormatted, settings, signature, eventLink,
        });
        console.log(`[onDJAssigned] 📱 Sending DJ_BOOKING_CONFIRM → DJ ${dj.phone}`);
        await sendMessage(base44, settings, dj.phone, msg, logoUrl, {
          contactId: contact?.id || null, // null, not empty string
          eventId,
          templateKey: 'DJ_BOOKING_CONFIRM',
          summary: `הודעת שיבוץ נשלחה ל-DJ ${dj.name}`,
        });
      } else {
        console.warn('[onDJAssigned] ⚠ No active DJ_BOOKING_CONFIRM template');
      }
    } else {
      console.warn('[onDJAssigned] ⚠ No DJ phone - skipping');
    }

    console.log('[onDJAssigned] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onDJAssigned] ❌ Unhandled:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Replace template placeholders ──
function replacePlaceholders(text, ctx) {
  return text
    .replace(/{customer_name}/g, ctx.contact?.contact_name || '')
    .replace(/{contact_name}/g, ctx.contact?.contact_name || '')
    .replace(/{dj_name}/g, ctx.dj?.name || '')
    .replace(/{dj_phone}/g, ctx.dj?.phone || '')
    .replace(/{event_date}/g, ctx.eventDateFormatted || '')
    .replace(/{location}/g, ctx.eventData?.location || 'לא צוין')
    .replace(/{event_type}/g, ctx.eventData?.event_type || '')
    .replace(/{event_link}/g, ctx.eventLink || '')
    .replace(/{owner_name}/g, ctx.signature || '')
    .replace(/{owner_phone}/g, ctx.settings?.owner_phone || '')
    .replace(/{owner_whatsapp_phone}/g, ctx.settings?.owner_whatsapp_phone || ctx.settings?.owner_phone || '')
    .replace(/{signature}/g, ctx.signature || '');
}

// ── Format phone number to international format ──
function formatPhone(phone) {
  let num = phone.replace(/[\s\-\(\)\.]/g, '');
  if (num.startsWith('0')) num = '972' + num.substring(1);
  if (num.startsWith('+')) num = num.substring(1);
  return num;
}

// ── Send WhatsApp message or log it ──
async function sendMessage(base44, settings, phone, messageText, logoUrl, meta) {
  try {
    const isLogOnly = settings.whatsapp_send_mode === 'לוג בלבד';

    if (!isLogOnly) {
      // ── Actually send via WhatsApp ──
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
      if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API not configured');
      if (!phone) throw new Error('No phone number');

      const phoneNumber = formatPhone(phone);
      console.log(`[onDJAssigned] 📤 ${meta.templateKey} → ${phoneNumber}`);

      const res = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
        }
      );
      const result = await res.json();

      if (!res.ok || !result.idMessage) {
        throw new Error(`WhatsApp failed: ${JSON.stringify(result)}`);
      }
      console.log(`[onDJAssigned] ✅ Sent ${meta.templateKey}: ${result.idMessage}`);

      // Send logo (non-blocking, best-effort)
      if (logoUrl) {
        try {
          await fetch(
            `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
            }
          );
        } catch (e) {
          console.error(`[onDJAssigned] ⚠ Logo failed: ${e.message}`);
        }
      }

      // Log ConversationMessage (only if we have a real contact_id)
      if (meta.contactId) {
        await base44.asServiceRole.entities.ConversationMessage.create({
          contact_id: meta.contactId,
          event_id: meta.eventId,
          channel: 'WHATSAPP',
          sender: 'OWNER',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });
      }

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: meta.eventId,
        action: 'SEND_MESSAGE',
        diff_summary: meta.summary,
        metadata: { template_key: meta.templateKey, whatsapp_id: result.idMessage, phone: phoneNumber },
      });

    } else {
      // ── Log-only mode ──
      console.log(`[onDJAssigned] ℹ Log-only: ${meta.templateKey} → ${phone}`);

      if (meta.contactId) {
        await base44.asServiceRole.entities.ConversationMessage.create({
          contact_id: meta.contactId,
          event_id: meta.eventId,
          channel: 'SYSTEM',
          sender: 'SYSTEM',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: meta.eventId,
        action: 'SEND_MESSAGE',
        diff_summary: meta.summary + ' (לוג)',
        metadata: { template_key: meta.templateKey, simulated: true, phone },
      });
    }
  } catch (error) {
    console.error(`[onDJAssigned] ✖ ${meta.templateKey} error: ${error.message}`);
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: meta.eventId,
      action: 'SEND_FAILED',
      diff_summary: `כשל v5: ${meta.templateKey} - ${error.message}`,
      metadata: { template_key: meta.templateKey, error_message: error.message, phone, version: 'v5' },
    });
  }
}