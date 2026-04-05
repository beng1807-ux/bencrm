import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onEventStatusChange] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const { event: triggerEvent, data: eventData, old_data } = await req.json();

    const eventId = triggerEvent?.entity_id || eventData?.id;
    if (!eventId) {
      return Response.json({ error: 'No event ID' }, { status: 400 });
    }

    // Only react to event_status changes to COMPLETED
    if (eventData.event_status !== 'COMPLETED' || old_data?.event_status === 'COMPLETED') {
      return Response.json({ message: 'Not a COMPLETED transition' });
    }

    console.log(`[onEventStatusChange] Event ${eventId}: ${old_data?.event_status} → COMPLETED`);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    // Update contact status to EVENT_DONE
    if (eventData.contact_id) {
      try {
        await base44.asServiceRole.entities.Contact.update(eventData.contact_id, {
          status: 'EVENT_DONE',
        });
        console.log(`[onEventStatusChange] ✓ Contact ${eventData.contact_id} → EVENT_DONE`);
      } catch (err) {
        console.error(`[onEventStatusChange] ✖ Failed to update contact: ${err.message}`);
      }
    }

    // Send thank you message
    if (!eventData.contact_id) {
      return Response.json({ success: true, message: 'No contact to send thank you' });
    }

    let contact;
    try {
      contact = await base44.asServiceRole.entities.Contact.get(eventData.contact_id);
    } catch (err) {
      console.error(`[onEventStatusChange] ✖ Failed to fetch contact: ${err.message}`);
      return Response.json({ success: true, message: 'Contact not found' });
    }

    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'THANK_YOU',
      active: true,
    });

    if (templateList.length === 0) {
      console.warn('[onEventStatusChange] ⚠ No THANK_YOU template');
      return Response.json({ success: true, message: 'No THANK_YOU template' });
    }

    const template = templateList[0];
    const messageText = template.template_text
      .replace(/{customer_name}/g, contact.contact_name || '')
      .replace(/{contact_name}/g, contact.contact_name || '')
      .replace(/{owner_name}/g, signature)
      .replace(/{owner_phone}/g, settings.owner_phone || '')
      .replace(/{signature}/g, signature);

    try {
      if (settings.whatsapp_send_mode === 'שליחה אמיתית') {
        const GREEN_ID = Deno.env.get('GREEN_ID');
        const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
        if (GREEN_ID && GREEN_TOKEN && contact.phone) {
          let phoneNumber = contact.phone.replace(/[\s\-\(\)\.\+]/g, '');
          if (phoneNumber.startsWith('972')) { /* already international */ }
          else if (phoneNumber.startsWith('0')) phoneNumber = '972' + phoneNumber.substring(1);

          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
          const res = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
          });
          const result = await res.json();

          if (res.ok && result.idMessage && logoUrl) {
            try {
              const logoApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
              await fetch(logoApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
              });
            } catch (logoErr) {
              console.error(`[onEventStatusChange] ⚠ Logo send failed: ${logoErr.message}`);
            }
          }

          await base44.asServiceRole.entities.ConversationMessage.create({
            contact_id: contact.id,
            event_id: eventId,
            channel: 'WHATSAPP',
            sender: 'OWNER',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.Event.update(eventId, {
            thank_you_sent_at: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Event',
            entity_id: eventId,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת תודה נשלחה בוואטסאפ',
            metadata: { template_key: 'THANK_YOU', whatsapp_id: result.idMessage, phone: phoneNumber },
          });

          console.log(`[onEventStatusChange] ✅ Thank you sent to ${phoneNumber}`);
          return Response.json({ success: true });
        }
      }

      // Log-only mode
      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: contact.id,
        event_id: eventId,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.Event.update(eventId, {
        thank_you_sent_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: eventId,
        action: 'SEND_MESSAGE',
        diff_summary: 'הודעת תודה נרשמה',
        metadata: { template_key: 'THANK_YOU', simulated: true },
      });
    } catch (msgError) {
      console.error(`[onEventStatusChange] ✖ Message error: ${msgError.message}`);
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: eventId,
        action: 'SEND_FAILED',
        diff_summary: `כשל בהודעת תודה: ${msgError.message}`,
        metadata: { template_key: 'THANK_YOU', error_message: msgError.message },
      });
    }

    console.log('[onEventStatusChange] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onEventStatusChange] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});