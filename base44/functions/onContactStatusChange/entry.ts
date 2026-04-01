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

    // ── DJ_SKITZA: Send DJ booking form link ──
    if (contact.status === 'DJ_SKITZA') {
      console.log('[onContactStatusChange] 🎵 DJ_SKITZA status - sending DJ booking form');

      // Mark contact as DJ lead
      await base44.asServiceRole.entities.Contact.update(contact.id, { is_dj_lead: true });

      // Get DJ_BOOKING_FORM template
      const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'DJ_BOOKING_FORM',
        active: true,
      });

      if (templateList.length === 0) {
        console.warn('[onContactStatusChange] ⚠ No DJ_BOOKING_FORM template found');
        return Response.json({ message: 'No DJ_BOOKING_FORM template' });
      }

      // Get booking form link
      const bfSettings = await base44.asServiceRole.entities.BookingFormSettings.list();
      const appId = Deno.env.get('BASE44_APP_ID') || '';
      const formLink = bfSettings[0]?.form_link || `https://preview-sandbox--${appId}.base44.app/BookingForm`;
      console.log(`[onContactStatusChange] 🔗 Form link: ${formLink}`);

      const template = templateList[0];
      const eventDateFormatted = contact.event_date ? new Date(contact.event_date).toLocaleDateString('he-IL') : '';
      const messageText = template.template_text
        .replace(/{contact_name}/g, contact.contact_name || '')
        .replace(/{event_date}/g, eventDateFormatted)
        .replace(/{event_type}/g, contact.event_type || '')
        .replace(/{form_link}/g, formLink)
        .replace(/{owner_name}/g, signature)
        .replace(/{owner_phone}/g, settings.owner_phone || '')
        .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
        .replace(/{signature}/g, signature);

      console.log(`[onContactStatusChange] 📝 Message prepared (${messageText.length} chars)`);

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onContactStatusChange] ℹ Log-only mode');
          await base44.asServiceRole.entities.ConversationMessage.create({
            contact_id: contact.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Contact',
            entity_id: contact.id,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת DJ_BOOKING_FORM נרשמה בלוג',
            metadata: { template_key: 'DJ_BOOKING_FORM', simulated: true },
          });
        } else {
          console.log('[onContactStatusChange] 📱 Sending via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            throw new Error('GREEN API לא מוגדר');
          }
          if (!contact.phone) {
            throw new Error('אין מספר טלפון באיש קשר');
          }

          let phoneNumber = contact.phone.replace(/[^\d+]/g, '');
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
            console.log(`[onContactStatusChange] ✅ WhatsApp sent: ${whatsappResult.idMessage}`);

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
                console.error(`[onContactStatusChange] ⚠ Logo send failed: ${logoErr.message}`);
              }
            }

            await base44.asServiceRole.entities.ConversationMessage.create({
              contact_id: contact.id,
              channel: 'WHATSAPP',
              sender: 'OWNER',
              message_text: messageText,
              timestamp: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Contact',
              entity_id: contact.id,
              action: 'SEND_MESSAGE',
              diff_summary: 'הודעת DJ_BOOKING_FORM נשלחה בוואטסאפ',
              metadata: { template_key: 'DJ_BOOKING_FORM', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
            });
          } else {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
        }
      } catch (msgError) {
        console.error(`[onContactStatusChange] ✖ Message error: ${msgError.message}`);
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחת DJ_BOOKING_FORM: ${msgError.message}`,
          metadata: { template_key: 'DJ_BOOKING_FORM', error_message: msgError.message },
        });
      }
    }

    console.log('[onContactStatusChange] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onContactStatusChange] ❌ Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});