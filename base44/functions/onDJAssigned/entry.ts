import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onDJAssigned] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: eventData, old_data } = await req.json();

    // בדיקה שה-DJ השתנה
    if (!eventData.dj_id || eventData.dj_id === old_data?.dj_id) {
      console.log('[onDJAssigned] ℹ No DJ change - skipping');
      return Response.json({ message: 'No DJ change' });
    }
    console.log(`[onDJAssigned] ✓ DJ changed to: ${eventData.dj_id}`);

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    // טעינת נתונים
    let dj, contact;
    try {
      [dj, contact] = await Promise.all([
        base44.asServiceRole.entities.DJ.get(eventData.dj_id),
        base44.asServiceRole.entities.Contact.get(eventData.contact_id).catch(() => null),
      ]);
    } catch (fetchErr) {
      console.error(`[onDJAssigned] ✖ Failed to fetch DJ/Contact: ${fetchErr.message}`);
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!dj) {
      return Response.json({ message: 'DJ not found' });
    }
    console.log(`[onDJAssigned] ✓ DJ: ${dj.name}, Contact: ${contact?.contact_name || 'unknown'}`);

    const eventDateFormatted = new Date(eventData.event_date).toLocaleDateString('he-IL');

    // ── 1. הודעה ללקוח (DJ_ASSIGNED) ──
    const customerTemplateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DJ_ASSIGNED',
      active: true,
    });

    if (customerTemplateList.length > 0 && contact) {
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

      await sendWhatsAppMessage(base44, settings, contact.phone, messageText, logoUrl, {
        contact_id: contact.id,
        event_id: eventData.id,
        template_key: 'DJ_ASSIGNED',
        log_summary: `הודעת שיבוץ DJ נשלחה ללקוח ${contact.contact_name}`,
      });
    }

    // ── 2. הודעה ל-DJ (DJ_BOOKING_CONFIRM) ──
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
        .replace(/{owner_name}/g, signature)
        .replace(/{owner_phone}/g, settings.owner_phone || '')
        .replace(/{signature}/g, signature);

      await sendWhatsAppMessage(base44, settings, dj.phone, messageText, logoUrl, {
        contact_id: contact?.id || eventData.contact_id,
        event_id: eventData.id,
        template_key: 'DJ_BOOKING_CONFIRM',
        log_summary: `הודעת שיבוץ נשלחה ל-DJ ${dj.name}`,
      });
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
      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: meta.contact_id,
        event_id: meta.event_id,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: meta.event_id,
        action: 'SEND_MESSAGE',
        diff_summary: meta.log_summary + ' (לוג)',
        metadata: { template_key: meta.template_key, simulated: true },
      });
    } else {
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
      if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API לא מוגדר');
      if (!phone) throw new Error('אין מספר טלפון');

      let phoneNumber = phone.replace(/[\s\-\(\)\.]/g, '');
      if (phoneNumber.startsWith('0')) phoneNumber = '972' + phoneNumber.substring(1);
      if (phoneNumber.startsWith('+')) phoneNumber = phoneNumber.substring(1);

      // שליחת הודעת טקסט
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
      console.log(`[onDJAssigned] ✅ WhatsApp sent (${meta.template_key}): ${result.idMessage}`);

      // שליחת לוגו אחרי ההודעה
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

      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: meta.contact_id,
        event_id: meta.event_id,
        channel: 'WHATSAPP',
        sender: 'OWNER',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });
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
      metadata: { template_key: meta.template_key, error_message: error.message },
    });
  }
}