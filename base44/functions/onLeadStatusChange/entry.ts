import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  console.log('[onLeadStatusChange] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: lead, old_data } = await req.json();

    if (!lead || !lead.id) {
      console.warn('[onLeadStatusChange] ✖ No lead data');
      return Response.json({ error: 'No lead data' }, { status: 400 });
    }

    // Only react to status changes
    if (!old_data || lead.status === old_data.status) {
      console.log('[onLeadStatusChange] ℹ No status change - skipping');
      return Response.json({ message: 'No status change' });
    }

    console.log(`[onLeadStatusChange] ✓ Lead ${lead.id}: ${old_data.status} → ${lead.status}`);

    // Check settings
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onLeadStatusChange] ℹ Automations disabled');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    // ── DJ_SKITZA: Send DJ booking form link ──
    if (lead.status === 'DJ_SKITZA') {
      console.log('[onLeadStatusChange] 🎵 DJ_SKITZA status - sending DJ booking form');

      // Mark lead as DJ lead
      await base44.asServiceRole.entities.Lead.update(lead.id, { is_dj_lead: true });

      // Get DJ_BOOKING_FORM template
      const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_BOOKING_FORM',
        active: true,
      });

      if (templateList.length === 0) {
        console.warn('[onLeadStatusChange] ⚠ No DJ_BOOKING_FORM template found');
        return Response.json({ message: 'No DJ_BOOKING_FORM template' });
      }

      // Get booking form link
      const bfSettings = await base44.asServiceRole.entities.BookingFormSettings.list();
      const formLink = bfSettings[0]?.form_link || '';

      const template = templateList[0];
      const eventDateFormatted = lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '';
      const messageText = template.template_text
        .replace('{contact_name}', lead.contact_name || '')
        .replace('{event_date}', eventDateFormatted)
        .replace('{event_type}', lead.event_type || '')
        .replace('{form_link}', formLink)
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '')
        .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

      console.log(`[onLeadStatusChange] 📝 Message prepared (${messageText.length} chars)`);

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onLeadStatusChange] ℹ Log-only mode');
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: lead.id,
            lead_id: lead.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Lead',
            entity_id: lead.id,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת DJ_BOOKING_FORM נרשמה בלוג',
            metadata: { template_key: 'DJ_BOOKING_FORM', simulated: true },
          });
        } else {
          // Real WhatsApp send via GREEN API
          console.log('[onLeadStatusChange] 📱 Sending via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            throw new Error('GREEN API לא מוגדר');
          }
          if (!lead.phone) {
            throw new Error('אין מספר טלפון בליד');
          }

          let phoneNumber = lead.phone.replace(/[^\d+]/g, '');
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
            console.log(`[onLeadStatusChange] ✅ WhatsApp sent: ${whatsappResult.idMessage}`);
            await base44.asServiceRole.entities.ConversationMessage.create({
              customer_id: lead.id,
              lead_id: lead.id,
              channel: 'WHATSAPP',
              sender: 'OWNER',
              message_text: messageText,
              timestamp: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Lead',
              entity_id: lead.id,
              action: 'SEND_MESSAGE',
              diff_summary: 'הודעת DJ_BOOKING_FORM נשלחה בוואטסאפ',
              metadata: { template_key: 'DJ_BOOKING_FORM', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
            });
          } else {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
        }
      } catch (msgError) {
        console.error(`[onLeadStatusChange] ✖ Message error: ${msgError.message}`);
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Lead',
          entity_id: lead.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחת DJ_BOOKING_FORM: ${msgError.message}`,
          metadata: { template_key: 'DJ_BOOKING_FORM', error_message: msgError.message },
        });
      }
    }

    console.log('[onLeadStatusChange] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onLeadStatusChange] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});