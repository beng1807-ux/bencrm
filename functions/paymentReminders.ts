import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    const now = new Date();
    const events = await base44.asServiceRole.entities.Event.list();
    const customers = await base44.asServiceRole.entities.Customer.list();
    let sentCount = 0;

    for (const event of events) {
      if (event.payment_status === 'PAID_FULL') continue;

      const eventDate = new Date(event.event_date);
      const daysUntilEvent = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));

      // תזכורת 1
      if (
        daysUntilEvent === settings.payment_reminder_1_days_before &&
        !event.payment_reminder_1_sent_at
      ) {
        await sendPaymentReminder(base44, event, customers, settings, 1);
        sentCount++;
      }

      // תזכורת 2
      if (
        daysUntilEvent === settings.payment_reminder_2_days_before &&
        !event.payment_reminder_2_sent_at
      ) {
        await sendPaymentReminder(base44, event, customers, settings, 2);
        sentCount++;
      }
    }

    return Response.json({ success: true, sentCount });
  } catch (error) {
    console.error('Error in paymentReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendPaymentReminder(base44, event, customers, settings, reminderNumber) {
  const customer = customers.find((c) => c.id === event.customer_id);
  if (!customer) return;

  const templateKey = reminderNumber === 1 ? 'PAY_REMINDER_1' : 'PAY_REMINDER_2';
  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: templateKey,
    active: true,
  });

  if (templateList.length === 0) return;

  const template = templateList[0];
  const eventDateFormatted = new Date(event.event_date).toLocaleDateString('he-IL');
  const messageText = template.template_text
    .replace('{customer_name}', customer.name || '')
    .replace('{event_date}', eventDateFormatted)
    .replace('{balance}', event.balance_amount?.toLocaleString() || '0')
    .replace('{owner_name}', settings.owner_name || '')
    .replace('{owner_phone}', settings.owner_phone || '')
    .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

  try {
    if (settings.whatsapp_send_mode === 'לוג בלבד') {
      await base44.asServiceRole.entities.ConversationMessage.create({
        customer_id: customer.id,
        event_id: event.id,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        entity_name: 'Event',
        entity_id: event.id,
        action: 'SEND_MESSAGE',
        diff_summary: `תזכורת תשלום ${reminderNumber} נרשמה`,
        metadata: { template_key: templateKey, simulated: true },
      });
    } else {
      throw new Error('WhatsApp API לא מחובר');
    }

    // עדכון שהתזכורת נשלחה
    const updateField =
      reminderNumber === 1 ? 'payment_reminder_1_sent_at' : 'payment_reminder_2_sent_at';
    await base44.asServiceRole.entities.Event.update(event.id, {
      [updateField]: new Date().toISOString(),
    });
  } catch (error) {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: event.id,
      action: 'SEND_FAILED',
      diff_summary: `כשל בשליחת תזכורת ${reminderNumber}: ${error.message}`,
      metadata: { template_key: templateKey, error_message: error.message },
    });
  }
}