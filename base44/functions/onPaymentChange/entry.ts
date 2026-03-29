import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  console.log('[onPaymentChange] ▶ Triggered');
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: eventData, old_data } = await req.json();

    // בדיקה שהתשלום השתנה
    if (
      !eventData.payment_status ||
      eventData.payment_status === old_data?.payment_status
    ) {
      console.log('[onPaymentChange] ℹ No payment change - skipping');
      return Response.json({ message: 'No payment change' });
    }

    console.log(`[onPaymentChange] ✓ Payment: ${old_data?.payment_status} → ${eventData.payment_status}`);

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onPaymentChange] ℹ Automations disabled');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    // רישום לוג
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: eventData.id,
      action: 'UPDATE',
      diff_summary: `סטטוס תשלום השתנה ל-${eventData.payment_status}`,
      metadata: {
        old_status: old_data?.payment_status,
        new_status: eventData.payment_status,
        last_payment_method: eventData.last_payment_method,
      },
    });

    // שליחת אישור תשלום כש-PAID_FULL
    if (eventData.payment_status === 'PAID_FULL') {
      console.log('[onPaymentChange] 💰 PAID_FULL - sending confirmation');

      const customer = await base44.asServiceRole.entities.Customer.filter({
        id: eventData.customer_id,
      }).then((r) => r[0]);

      if (!customer) {
        console.warn('[onPaymentChange] ⚠ Customer not found');
        return Response.json({ message: 'Customer not found' });
      }

      const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'PAY_CONFIRMED',
        active: true,
      });

      if (templateList.length === 0) {
        console.warn('[onPaymentChange] ⚠ No PAY_CONFIRMED template');
        return Response.json({ message: 'No template' });
      }

      const template = templateList[0];
      const eventDateFormatted = eventData.event_date ? new Date(eventData.event_date).toLocaleDateString('he-IL') : '';
      const messageText = template.template_text
        .replace('{customer_name}', customer.name || '')
        .replace('{event_date}', eventDateFormatted)
        .replace('{location}', eventData.location || 'לא צוין')
        .replace('{price_total}', eventData.price_total || '')
        .replace('{deposit_amount}', eventData.deposit_amount || '')
        .replace('{balance}', eventData.balance_amount || '')
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '')
        .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

      console.log(`[onPaymentChange] 📝 Message prepared (${messageText.length} chars)`);

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onPaymentChange] ℹ Log-only mode');
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: customer.id,
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
            diff_summary: 'אישור תשלום נרשם בלוג',
            metadata: { template_key: 'PAY_CONFIRMED', simulated: true },
          });
        } else {
          // שליחה אמיתית דרך GREEN API
          console.log('[onPaymentChange] 📱 Sending via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            throw new Error('GREEN API לא מוגדר - חסר GREEN_ID או GREEN_TOKEN');
          }

          if (!customer.phone) {
            throw new Error('אין מספר טלפון ללקוח');
          }

          let phoneNumber = customer.phone.replace(/[^0-9]/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }

          console.log(`[onPaymentChange] 📞 Phone: ${phoneNumber}`);

          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
          });

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`[onPaymentChange] ✅ WhatsApp sent: ${whatsappResult.idMessage}`);
            await base44.asServiceRole.entities.ConversationMessage.create({
              customer_id: customer.id,
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
              diff_summary: 'אישור תשלום נשלח בוואטסאפ',
              metadata: { template_key: 'PAY_CONFIRMED', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
            });
          } else {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
        }
      } catch (msgError) {
        console.error(`[onPaymentChange] ✖ Message error: ${msgError.message}`);
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: eventData.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל באישור תשלום: ${msgError.message}`,
          metadata: { template_key: 'PAY_CONFIRMED', error_message: msgError.message },
        });
      }
    }

    console.log('[onPaymentChange] ✅ Done');
    return Response.json({ success: true });
  } catch (error) {
    console.error('[onPaymentChange] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});