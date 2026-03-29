import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: eventData, old_data } = await req.json();

    // בדיקה שהתשלום השתנה
    if (
      !eventData.payment_status ||
      eventData.payment_status === old_data?.payment_status
    ) {
      return Response.json({ message: 'No payment change' });
    }

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
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

    // שליחת אישור תשלום (אופציונלי)
    if (eventData.payment_status === 'PAID_FULL') {
      const customer = await base44.asServiceRole.entities.Customer.filter({
        id: eventData.customer_id,
      }).then((r) => r[0]);

      if (customer) {
        const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
          template_key: 'PAY_CONFIRMED',
          active: true,
        });

        if (templateList.length > 0) {
          const template = templateList[0];
          const eventDateFormatted = new Date(eventData.event_date).toLocaleDateString('he-IL');
          const messageText = template.template_text
            .replace('{customer_name}', customer.name || '')
            .replace('{event_date}', eventDateFormatted)
            .replace('{location}', eventData.location || 'לא צוין')
            .replace('{owner_name}', settings.owner_name || '')
            .replace('{owner_phone}', settings.owner_phone || '')
            .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

          try {
            if (settings.whatsapp_send_mode === 'לוג בלבד') {
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
                diff_summary: 'אישור תשלום נרשם',
                metadata: { template_key: 'PAY_CONFIRMED', simulated: true },
              });
            } else {
              throw new Error('WhatsApp API לא מחובר');
            }
          } catch (error) {
            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Event',
              entity_id: eventData.id,
              action: 'SEND_FAILED',
              diff_summary: `כשל באישור תשלום: ${error.message}`,
              metadata: { template_key: 'PAY_CONFIRMED', error_message: error.message },
            });
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in onPaymentChange:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});