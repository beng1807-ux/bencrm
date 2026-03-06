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

    // חישוב תאריך היום בלבד (ללא שעות) כדי להשוות ימים בצורה מדויקת
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    console.log(`[paymentReminders] 📅 Today: ${todayStr}, Reminder1: ${settings.payment_reminder_1_days_before}d, Reminder2: ${settings.payment_reminder_2_days_before}d`);

    const events = await base44.asServiceRole.entities.Event.list();
    const customers = await base44.asServiceRole.entities.Customer.list();
    let sentCount = 0;

    for (const event of events) {
      if (event.payment_status === 'PAID_FULL') continue;

      const eventDate = new Date(event.event_date);
      const daysUntilEvent = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
      console.log(`[paymentReminders] Event ${event.id}: date=${event.event_date}, daysUntil=${daysUntilEvent}, payStatus=${event.payment_status}`);

      // תזכורת 1
      if (
        daysUntilEvent === settings.payment_reminder_1_days_before &&
        !event.payment_reminder_1_sent_at
      ) {
        console.log(`[paymentReminders] ➡ Sending reminder 1 for event ${event.id}`);
        await sendPaymentReminder(base44, event, customers, settings, 1);
        sentCount++;
      }

      // תזכורת 2
      if (
        daysUntilEvent === settings.payment_reminder_2_days_before &&
        !event.payment_reminder_2_sent_at
      ) {
        console.log(`[paymentReminders] ➡ Sending reminder 2 for event ${event.id}`);
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
      // שליחה אמיתית דרך GREEN API
      console.log(`[paymentReminders] 📱 Sending real WhatsApp for reminder ${reminderNumber}`);
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

      if (!GREEN_ID || !GREEN_TOKEN) {
        throw new Error('GREEN API לא מוגדר - חסר GREEN_ID או GREEN_TOKEN');
      }

      if (!customer.phone) {
        throw new Error('אין מספר טלפון ללקוח');
      }

      let phoneNumber = customer.phone.replace(/[\s\-\(\)\.]/g, '');
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '972' + phoneNumber.substring(1);
      }
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }

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
        console.log(`[paymentReminders] ✅ WhatsApp sent: ${whatsappResult.idMessage}`);

        await base44.asServiceRole.entities.ConversationMessage.create({
          customer_id: customer.id,
          event_id: event.id,
          channel: 'WHATSAPP',
          sender: 'OWNER',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: event.id,
          action: 'SEND_MESSAGE',
          diff_summary: `תזכורת תשלום ${reminderNumber} נשלחה בוואטסאפ`,
          metadata: { template_key: templateKey, whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
        });
      } else {
        throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
      }
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