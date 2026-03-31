import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    const now = new Date();
    const events = await base44.asServiceRole.entities.Event.list();
    const contacts = await base44.asServiceRole.entities.Contact.list();
    const djs = await base44.asServiceRole.entities.DJ.list();
    let remindersCount = 0;
    let thanksCount = 0;

    for (const event of events) {
      const eventDate = new Date(event.event_date);
      const daysUntilEvent = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
      const daysSinceEvent = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));

      // תזכורת אירוע
      if (daysUntilEvent === settings.event_reminder_days_before) {
        await sendEventReminder(base44, event, contacts, djs, settings);
        remindersCount++;

        if (event.event_status === 'PENDING') {
          await base44.asServiceRole.entities.Event.update(event.id, { event_status: 'CONFIRMED' });
        }
      }

      // הודעת תודה אחרי אירוע
      if (daysSinceEvent === settings.thank_you_days_after && event.event_status !== 'COMPLETED') {
        await sendThankYou(base44, event, contacts, settings);
        thanksCount++;

        await base44.asServiceRole.entities.Event.update(event.id, { event_status: 'COMPLETED' });

        // עדכון סטטוס איש קשר ל-EVENT_DONE
        if (event.contact_id) {
          await base44.asServiceRole.entities.Contact.update(event.contact_id, { status: 'EVENT_DONE' });
        }
      }
    }

    return Response.json({ success: true, remindersCount, thanksCount });
  } catch (error) {
    console.error('Error in eventCycle:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendEventReminder(base44, event, contacts, djs, settings) {
  const contact = contacts.find((c) => c.id === event.contact_id);
  const dj = djs.find((d) => d.id === event.dj_id);
  if (!contact) return;

  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: 'EVENT_REMINDER',
    active: true,
  });
  if (templateList.length === 0) return;

  const template = templateList[0];
  const messageText = template.template_text
    .replace('{customer_name}', contact.contact_name || '')
    .replace('{contact_name}', contact.contact_name || '')
    .replace('{event_date}', new Date(event.event_date).toLocaleDateString('he-IL'))
    .replace('{location}', event.location || 'לא צוין')
    .replace('{dj_name}', dj?.name || 'לא שובץ')
    .replace('{dj_phone}', dj?.phone || '')
    .replace('{owner_name}', settings.owner_name || '')
    .replace('{owner_phone}', settings.owner_phone || '');

  try {
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
      diff_summary: 'תזכורת אירוע נרשמה',
      metadata: { template_key: 'EVENT_REMINDER', simulated: true },
    });
  } catch (error) {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: event.id,
      action: 'SEND_FAILED',
      diff_summary: `כשל בתזכורת: ${error.message}`,
      metadata: { template_key: 'EVENT_REMINDER', error_message: error.message },
    });
  }
}

async function sendThankYou(base44, event, contacts, settings) {
  const contact = contacts.find((c) => c.id === event.contact_id);
  if (!contact) return;

  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: 'THANK_YOU',
    active: true,
  });
  if (templateList.length === 0) return;

  const template = templateList[0];
  const messageText = template.template_text
    .replace('{customer_name}', contact.contact_name || '')
    .replace('{contact_name}', contact.contact_name || '')
    .replace('{owner_name}', settings.owner_name || '')
    .replace('{owner_phone}', settings.owner_phone || '');

  try {
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
      diff_summary: 'הודעת תודה נרשמה',
      metadata: { template_key: 'THANK_YOU', simulated: true },
    });
  } catch (error) {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: event.id,
      action: 'SEND_FAILED',
      diff_summary: `כשל בהודעת תודה: ${error.message}`,
      metadata: { template_key: 'THANK_YOU', error_message: error.message },
    });
  }
}