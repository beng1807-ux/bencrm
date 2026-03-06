import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    console.log(`[onDJAssigned] ✓ DJ changed to: ${eventData.dj_id} (was: ${old_data?.dj_id || 'none'})`);

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onDJAssigned] ℹ Automations disabled - skipping');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    console.log(`[onDJAssigned] ✓ Settings loaded. WhatsApp mode: ${settings.whatsapp_send_mode}`);

    // טעינת נתונים
    const [dj, customer] = await Promise.all([
      base44.asServiceRole.entities.DJ.filter({ id: eventData.dj_id }).then((r) => r[0]),
      base44.asServiceRole.entities.Customer.filter({ id: eventData.customer_id }).then(
        (r) => r[0]
      ),
    ]);

    if (!dj) {
      console.warn('[onDJAssigned] ✖ DJ not found');
      return Response.json({ message: 'DJ not found' });
    }
    console.log(`[onDJAssigned] ✓ DJ: ${dj.name} (${dj.phone}), Customer: ${customer?.name || 'unknown'}`);

    // ניסיון שליחת הודעה
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DJ_ASSIGNED',
      active: true,
    });
    console.log(`[onDJAssigned] ✓ Found ${templateList.length} DJ_ASSIGNED templates`);

    if (templateList.length > 0) {
      const template = templateList[0];
      const messageText = template.template_text
        .replace('{customer_name}', customer?.name || '')
        .replace('{dj_name}', dj.name || '')
        .replace('{dj_phone}', dj.phone || '')
        .replace('{event_date}', new Date(eventData.event_date).toLocaleDateString('he-IL'))
        .replace('{location}', eventData.location || 'לא צוין')
        .replace('{event_type}', eventData.event_type || '')
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '');

      console.log(`[onDJAssigned] 📝 Message prepared (${messageText.length} chars)`);

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onDJAssigned] ℹ Log-only mode - saving to conversation');
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: customer?.id || eventData.customer_id,
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
          console.log('[onDJAssigned] ✓ Message logged successfully');
        } else {
          // שליחה אמיתית דרך GREEN API
          console.log('[onDJAssigned] 📱 Attempting real WhatsApp send via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            console.error('[onDJAssigned] ✖ GREEN API credentials not configured');
            throw new Error('GREEN API לא מוגדר - חסר GREEN_ID או GREEN_TOKEN');
          }

          if (!dj.phone) {
            console.warn('[onDJAssigned] ⚠ No phone number on DJ - skipping WhatsApp');
            throw new Error('אין מספר טלפון ל-DJ');
          }

          // נרמול מספר טלפון של ה-DJ
          let phoneNumber = dj.phone.replace(/[\s\-\(\)\.]/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }
          if (phoneNumber.startsWith('+')) {
            phoneNumber = phoneNumber.substring(1);
          }
          console.log(`[onDJAssigned] 📞 Normalized DJ phone: ${phoneNumber}`);

          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${phoneNumber}@c.us`,
              message: messageText
            })
          });

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`[onDJAssigned] ✅ WhatsApp sent to DJ successfully: ${whatsappResult.idMessage}`);

            await base44.asServiceRole.entities.ConversationMessage.create({
              customer_id: customer?.id || eventData.customer_id,
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
            console.error(`[onDJAssigned] ✖ WhatsApp send failed:`, JSON.stringify(whatsappResult));
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
          metadata: {
            template_key: 'DJ_ASSIGNED',
            dj_id: dj.id,
            error_message: error.message,
          },
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