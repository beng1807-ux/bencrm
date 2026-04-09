import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    console.log(`[paymentReminders] 📅 Today: ${todayStr}`);

    const events = await base44.asServiceRole.entities.Event.list();
    const contacts = await base44.asServiceRole.entities.Contact.list();
    let sentCount = 0;

    for (const event of events) {
      if (event.payment_status === 'PAID_FULL') continue;
      if (event.is_third_party_paid) continue;
      if (event.event_status === 'CANCELLED') continue;

      const eventDate = new Date(event.event_date + 'T00:00:00Z');
      const daysSinceEvent = Math.round((today - eventDate) / (1000 * 60 * 60 * 24));

      // תזכורת תשלום 1: X ימים אחרי האירוע
      const reminder1Days = settings.payment_reminder_1_days_after_event ?? 1;
      if (daysSinceEvent === reminder1Days && !event.payment_reminder_1_sent_at) {
        console.log(`[paymentReminders] Sending reminder 1 for event ${event.id}, daysSinceEvent=${daysSinceEvent}`);
        await sendPaymentReminder(base44, event, contacts, settings, signature, logoUrl, 1);
        sentCount++;
      }

      // תזכורת תשלום 2: X ימים אחרי התזכורת הראשונה
      const reminder2DaysAfterFirst = settings.payment_reminder_2_days_after_first ?? 2;
      if (event.payment_reminder_1_sent_at && !event.payment_reminder_2_sent_at) {
        const reminder1Date = new Date(event.payment_reminder_1_sent_at.split('T')[0] + 'T00:00:00Z');
        const daysSinceReminder1 = Math.round((today - reminder1Date) / (1000 * 60 * 60 * 24));
        if (daysSinceReminder1 >= reminder2DaysAfterFirst) {
          console.log(`[paymentReminders] Sending reminder 2 for event ${event.id}, daysSinceReminder1=${daysSinceReminder1}`);
          await sendPaymentReminder(base44, event, contacts, settings, signature, logoUrl, 2);
          sentCount++;
        }
      }
    }

    return Response.json({ success: true, sentCount });
  } catch (error) {
    console.error('Error in paymentReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendPaymentReminder(base44, event, contacts, settings, signature, logoUrl, reminderNumber) {
  const contact = contacts.find((c) => c.id === event.contact_id);
  if (!contact) return;

  const templateKey = reminderNumber === 1 ? 'PAY_REMINDER_1' : 'PAY_REMINDER_2';
  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: templateKey,
    active: true,
  });

  if (templateList.length === 0) return;

  const template = templateList[0];
  const eventDateFormatted = new Date(event.event_date).toLocaleDateString('he-IL');
  const messageText = template.template_text
    .replace(/{customer_name}/g, contact.contact_name || '')
    .replace(/{contact_name}/g, contact.contact_name || '')
    .replace(/{event_date}/g, eventDateFormatted)
    .replace(/{price_total}/g, event.price_total?.toLocaleString() || '0')
    .replace(/{owner_name}/g, signature)
    .replace(/{owner_phone}/g, settings.owner_phone || '')
    .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
    .replace(/{signature}/g, signature);

  try {
    if (settings.whatsapp_send_mode === 'לוג בלבד') {
      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: contact.id,
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
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

      if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API לא מוגדר');
      if (!contact.phone) throw new Error('אין מספר טלפון');

      let phoneNumber = formatPhone(contact.phone);

      const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
      const whatsappResponse = await fetch(greenApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
      });

      const whatsappResult = await whatsappResponse.json();

      if (whatsappResponse.ok && whatsappResult.idMessage) {
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
            console.error(`[paymentReminders] ⚠ Logo send failed: ${logoErr.message}`);
          }
        }

        await base44.asServiceRole.entities.ConversationMessage.create({
          contact_id: contact.id,
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

    const updateField = reminderNumber === 1 ? 'payment_reminder_1_sent_at' : 'payment_reminder_2_sent_at';
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

function formatPhone(phone) {
  let num = phone.replace(/[\s\-\(\)\.\+]/g, '');
  if (num.startsWith('972')) { /* already international */ }
  else if (num.startsWith('0')) num = '972' + num.substring(1);
  return num;
}