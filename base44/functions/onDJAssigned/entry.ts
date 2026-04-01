import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onDJAssigned] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event: triggerEvent, data: eventData, old_data } = payload;

    // Get the real event ID from the automation trigger
    const eventId = triggerEvent?.entity_id || eventData?.id;
    if (!eventId) {
      console.error('[onDJAssigned] ✖ No event ID found in payload');
      return Response.json({ error: 'No event ID' }, { status: 400 });
    }
    console.log(`[onDJAssigned] Event ID: ${eventId}`);

    // Check if DJ actually changed
    if (!eventData.dj_id || eventData.dj_id === old_data?.dj_id) {
      console.log('[onDJAssigned] ℹ No DJ change - skipping');
      return Response.json({ message: 'No DJ change' });
    }
    console.log(`[onDJAssigned] ✓ DJ changed from ${old_data?.dj_id || 'none'} to ${eventData.dj_id}`);

    // Load settings
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    // Load DJ
    let dj;
    try {
      dj = await base44.asServiceRole.entities.DJ.get(eventData.dj_id);
    } catch (err) {
      console.error(`[onDJAssigned] ✖ Failed to fetch DJ ${eventData.dj_id}: ${err.message}`);
      return Response.json({ error: 'DJ not found' }, { status: 404 });
    }
    console.log(`[onDJAssigned] ✓ DJ: ${dj.name} (${dj.phone})`);

    // Load contact
    let contact = null;
    if (eventData.contact_id) {
      try {
        contact = await base44.asServiceRole.entities.Contact.get(eventData.contact_id);
        console.log(`[onDJAssigned] ✓ Contact: ${contact.contact_name} (${contact.phone})`);
      } catch (err) {
        console.error(`[onDJAssigned] ✖ Failed to fetch Contact ${eventData.contact_id}: ${err.message}`);
      }
    }

    const eventDateFormatted = new Date(eventData.event_date).toLocaleDateString('he-IL');

    // Build deep link to event
    const appId = Deno.env.get('BASE44_APP_ID') || '';
    const eventLink = `https://preview-sandbox--${appId}.base44.app/Events?eventId=${eventId}`;

    // ── 1. Send message to CUSTOMER (DJ_ASSIGNED template) ──
    if (contact && contact.phone) {
      const customerTemplateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_ASSIGNED',
        active: true,
      });

      if (customerTemplateList.length > 0) {
        const template = customerTemplateList[0];
        const messageText = template.template_text
          .replace(/{customer_name}/g, contact.contact_name || '')
          .replace(/{contact_name}/g, contact.contact_name || '')
          .replace(/{dj_name}/g, dj.name || '')
          .replace(/{dj_phone}/g, dj.phone || '')
          .replace(/{event_date}/g, eventDateFormatted)
          .replace(/{location}/g, eventData.location || 'לא צוין')
          .replace(/{event_type}/g, eventData.event_type || '')
          .replace(/{owner_name}/g, signature)
          .replace(/{owner_phone}/g, settings.owner_phone || '')
          .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
          .replace(/{signature}/g, signature);

        console.log(`[onDJAssigned] 📱 Sending DJ_ASSIGNED to CUSTOMER: ${contact.phone}`);
        await sendWhatsAppMessage(base44, settings, contact.phone, messageText, logoUrl, {
          contact_id: contact.id,
          event_id: eventId,
          template_key: 'DJ_ASSIGNED',
          log_summary: `הודעת שיבוץ DJ נשלחה ללקוח ${contact.contact_name}`,
        });
      } else {
        console.warn('[onDJAssigned] ⚠ No active DJ_ASSIGNED template found');
      }
    } else {
      console.warn('[onDJAssigned] ⚠ No contact or no phone - skipping customer message');
    }

    // ── 2. Send message to DJ (DJ_BOOKING_CONFIRM template) ──
    if (dj && dj.phone) {
      const djTemplateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_BOOKING_CONFIRM',
        active: true,
      });

      if (djTemplateList.length > 0) {
        const template = djTemplateList[0];
        const messageText = template.template_text
          .replace(/{dj_name}/g, dj.name || '')
          .replace(/{customer_name}/g, contact?.contact_name || '')
          .replace(/{contact_name}/g, contact?.contact_name || '')
          .replace(/{event_date}/g, eventDateFormatted)
          .replace(/{location}/g, eventData.location || 'לא צוין')
          .replace(/{event_type}/g, eventData.event_type || '')
          .replace(/{event_link}/g, eventLink)
          .replace(/{owner_name}/g, signature)
          .replace(/{owner_phone}/g, settings.owner_phone || '')
          .replace(/{signature}/g, signature);

        console.log(`[onDJAssigned] 📱 Sending DJ_BOOKING_CONFIRM to DJ: ${dj.phone}`);
        await sendWhatsAppMessage(base44, settings, dj.phone, messageText, logoUrl, {
          contact_id: contact?.id || '',
          event_id: eventId,
          template_key: 'DJ_BOOKING_CONFIRM',
          log_summary: `הודעת שיבוץ נשלחה ל-DJ ${dj.name}`,
        });
      } else {
        console.warn('[onDJAssigned] ⚠ No active DJ_BOOKING_CONFIRM template found');
      }
    } else {
      console.warn('[onDJAssigned] ⚠ No DJ phone - skipping DJ message');
    }

    console.log('[onDJAssigned] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onDJAssigned] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendWhatsAppMessage(base44, settings, phone, messageText, logoUrl, meta) {
  try {
    if (settings.whatsapp_send_mode === 'לוג בלבד') {
      console.log(`[onDJAssigned] ℹ Log-only: ${meta.template_key} → ${phone}`);
      
      const msgData = {
        event_id: meta.event_id || undefined,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      };
      // Only add contact_id if it exists
      if (meta.contact_id) msgData.contact_id = meta.contact_id;
      
      await base44.asServiceRole.entities.ConversationMessage.create(msgData);
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: meta.event_id,
        action: 'SEND_MESSAGE',
        diff_summary: meta.log_summary + ' (לוג)',
        metadata: { template_key: meta.template_key, simulated: true, phone },
      });
    } else {
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
      if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API לא מוגדר');
      if (!phone) throw new Error('אין מספר טלפון');

      let phoneNumber = phone.replace(/[\s\-\(\)\.]/g, '');
      if (phoneNumber.startsWith('0')) phoneNumber = '972' + phoneNumber.substring(1);
      if (phoneNumber.startsWith('+')) phoneNumber = phoneNumber.substring(1);

      console.log(`[onDJAssigned] 📤 Sending ${meta.template_key} to ${phoneNumber}`);

      const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
      const res = await fetch(greenApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
      });
      const result = await res.json();

      if (!res.ok || !result.idMessage) {
        throw new Error(`WhatsApp send failed: ${JSON.stringify(result)}`);
      }
      console.log(`[onDJAssigned] ✅ WhatsApp sent (${meta.template_key}) to ${phoneNumber}: ${result.idMessage}`);

      // Send logo
      if (logoUrl) {
        try {
          const logoApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
          await fetch(logoApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
          });
        } catch (logoErr) {
          console.error(`[onDJAssigned] ⚠ Logo send failed: ${logoErr.message}`);
        }
      }

      const msgData = {
        event_id: meta.event_id || undefined,
        channel: 'WHATSAPP',
        sender: 'OWNER',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      };
      if (meta.contact_id) msgData.contact_id = meta.contact_id;
      
      await base44.asServiceRole.entities.ConversationMessage.create(msgData);
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: meta.event_id,
        action: 'SEND_MESSAGE',
        diff_summary: meta.log_summary,
        metadata: { template_key: meta.template_key, whatsapp_id: result.idMessage, phone: phoneNumber },
      });
    }
  } catch (error) {
    console.error(`[onDJAssigned] ✖ ${meta.template_key} error: ${error.message}`);
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: meta.event_id,
      action: 'SEND_FAILED',
      diff_summary: `כשל: ${meta.template_key} - ${error.message}`,
      metadata: { template_key: meta.template_key, error_message: error.message, phone },
    });
  }
}