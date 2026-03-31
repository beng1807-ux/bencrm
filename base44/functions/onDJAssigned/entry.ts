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

    // ניסיון שליחת הודעה
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DJ_ASSIGNED',
      active: true,
    });

    if (templateList.length > 0) {
      const template = templateList[0];
      const messageText = template.template_text
        .replace('{customer_name}', contact?.contact_name || '')
        .replace('{contact_name}', contact?.contact_name || '')
        .replace('{dj_name}', dj.name || '')
        .replace('{dj_phone}', dj.phone || '')
        .replace('{event_date}', new Date(eventData.event_date).toLocaleDateString('he-IL'))
        .replace('{location}', eventData.location || 'לא צוין')
        .replace('{event_type}', eventData.event_type || '')
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '');

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          await base44.asServiceRole.entities.ConversationMessage.create({
            contact_id: contact?.id || eventData.contact_id,
            event_id: eventData.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Event',
            entity_id: eventData.id,
            action: 'SEND_MESSAGE',
            diff_summary: `הודעת DJ_ASSIGNED נרשמה ל-${dj.name}`,
            metadata: { template_key: 'DJ_ASSIGNED', dj_id: dj.id, simulated: true },
          });
        } else {
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            throw new Error('GREEN API לא מוגדר');
          }
          if (!dj.phone) {
            throw new Error('אין מספר טלפון ל-DJ');
          }

          let phoneNumber = dj.phone.replace(/[\s\-\(\)\.]/g, '');
          if (phoneNumber.startsWith('0')) phoneNumber = '972' + phoneNumber.substring(1);
          if (phoneNumber.startsWith('+')) phoneNumber = phoneNumber.substring(1);

          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
          });

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`[onDJAssigned] ✅ WhatsApp sent: ${whatsappResult.idMessage}`);
            await base44.asServiceRole.entities.ConversationMessage.create({
              contact_id: contact?.id || eventData.contact_id,
              event_id: eventData.id,
              channel: 'WHATSAPP',
              sender: 'OWNER',
              message_text: messageText,
              timestamp: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Event',
              entity_id: eventData.id,
              action: 'SEND_MESSAGE',
              diff_summary: `הודעת DJ_ASSIGNED נשלחה בוואטסאפ ל-${dj.name}`,
              metadata: { template_key: 'DJ_ASSIGNED', dj_id: dj.id, whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
            });
          } else {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
        }
      } catch (error) {
        console.error(`[onDJAssigned] ✖ Message error: ${error.message}`);
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: eventData.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחה ל-DJ: ${error.message}`,
          metadata: { template_key: 'DJ_ASSIGNED', dj_id: dj.id, error_message: error.message },
        });
      }
    }

    console.log('[onDJAssigned] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onDJAssigned] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});