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

    if (!isWithinSendWindow(settings)) {
      console.log('Outside send window — skipping');
      return Response.json({ message: 'Outside send window' });
    }

    const now = new Date();
    const events = await base44.asServiceRole.entities.Event.list();
    const contacts = await base44.asServiceRole.entities.Contact.list();
    const djs = await base44.asServiceRole.entities.DJ.list();
    let remindersCount = 0;
    let thanksCount = 0;

    // Use calendar-day difference (ignoring time of day) to avoid off-by-one issues
    const todayStr = now.toISOString().split('T')[0]; // e.g. "2026-04-05"
    const todayMidnight = new Date(todayStr + 'T00:00:00Z');

    for (const event of events) {
      const eventMidnight = new Date(event.event_date + 'T00:00:00Z');
      const daysUntilEvent = Math.round((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const daysSinceEvent = Math.round((todayMidnight - eventMidnight) / (1000 * 60 * 60 * 24));

      // תזכורת אירוע
      if (daysUntilEvent === settings.event_reminder_days_before) {
        await sendEventReminder(base44, event, contacts, djs, settings, signature, logoUrl);
        remindersCount++;

        if (event.event_status === 'PENDING') {
          await base44.asServiceRole.entities.Event.update(event.id, { event_status: 'CONFIRMED' });
        }
      }

      // הודעת תודה אחרי אירוע (default: 1 day after)
      const thankYouDays = settings.thank_you_days_after ?? 1;
      if (daysSinceEvent === thankYouDays && event.event_status !== 'COMPLETED') {
        await sendThankYou(base44, event, contacts, settings, signature, logoUrl);
        thanksCount++;

        await base44.asServiceRole.entities.Event.update(event.id, { event_status: 'COMPLETED' });

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

async function sendEventReminder(base44, event, contacts, djs, settings, signature, logoUrl) {
  const contact = contacts.find((c) => c.id === event.contact_id);
  const dj = djs.find((d) => d.id === event.dj_id);
  if (!contact) return;
  if (contact.whatsapp_opted_out) {
    console.log(`Opted out — skipping ${contact.contact_name}`);
    return;
  }
  if (await wasRecentlySent(base44, contact.id, 'EVENT_REMINDER')) {
    console.log(`Duplicate blocked: EVENT_REMINDER already sent to ${contact.id} in last 24h`);
    return;
  }

  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: 'EVENT_REMINDER',
    active: true,
  });
  if (templateList.length === 0) return;

  const template = templateList[0];
  const messageText = template.template_text
    .replace(/{customer_name}/g, contact.contact_name || '')
    .replace(/{contact_name}/g, contact.contact_name || '')
    .replace(/{event_date}/g, new Date(event.event_date).toLocaleDateString('he-IL'))
    .replace(/{location}/g, event.location || 'לא צוין')
    .replace(/{dj_name}/g, dj?.name || 'לא שובץ')
    .replace(/{dj_phone}/g, dj?.phone || '')
    .replace(/{owner_name}/g, signature)
    .replace(/{owner_phone}/g, settings.owner_phone || '')
    .replace(/{signature}/g, signature);

  try {
    if (settings.whatsapp_send_mode !== 'לוג בלבד') {
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
      if (GREEN_ID && GREEN_TOKEN && contact.phone) {
        let phoneNumber = formatPhone(contact.phone);

        const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
        const res = await fetch(greenApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
        });
        const result = await res.json();

        if (res.ok && result.idMessage && logoUrl) {
          try {
            const logoApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
            await fetch(logoApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
            });
          } catch (logoErr) {
            console.error(`[eventCycle] ⚠ Logo send failed: ${logoErr.message}`);
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
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_MESSAGE',
          diff_summary: 'תזכורת אירוע נשלחה בוואטסאפ',
          metadata: { template_key: 'EVENT_REMINDER', whatsapp_id: result.idMessage, phone: phoneNumber },
        });
        return;
      }
    }

    // Log-only mode
    await base44.asServiceRole.entities.ConversationMessage.create({
      contact_id: contact.id,
      event_id: event.id,
      channel: 'SYSTEM',
      sender: 'SYSTEM',
      message_text: messageText,
      timestamp: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Contact',
      entity_id: contact.id,
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

async function sendThankYou(base44, event, contacts, settings, signature, logoUrl) {
  const contact = contacts.find((c) => c.id === event.contact_id);
  if (!contact) return;
  if (contact.whatsapp_opted_out) {
    console.log(`Opted out — skipping ${contact.contact_name}`);
    return;
  }
  if (await wasRecentlySent(base44, contact.id, 'THANK_YOU')) {
    console.log(`Duplicate blocked: THANK_YOU already sent to ${contact.id} in last 24h`);
    return;
  }

  const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
    template_key: 'THANK_YOU',
    active: true,
  });
  if (templateList.length === 0) return;

  const template = templateList[0];
  const messageText = template.template_text
    .replace(/{customer_name}/g, contact.contact_name || '')
    .replace(/{contact_name}/g, contact.contact_name || '')
    .replace(/{owner_name}/g, signature)
    .replace(/{owner_phone}/g, settings.owner_phone || '')
    .replace(/{signature}/g, signature);

  try {
    if (settings.whatsapp_send_mode !== 'לוג בלבד') {
      const GREEN_ID = Deno.env.get('GREEN_ID');
      const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
      if (GREEN_ID && GREEN_TOKEN && contact.phone) {
        let phoneNumber = formatPhone(contact.phone);

        const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
        const res = await fetch(greenApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
        });
        const result = await res.json();

        if (res.ok && result.idMessage && logoUrl) {
          try {
            const logoApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
            await fetch(logoApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
            });
          } catch (logoErr) {
            console.error(`[eventCycle] ⚠ Logo send failed: ${logoErr.message}`);
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
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_MESSAGE',
          diff_summary: 'הודעת תודה נשלחה בוואטסאפ',
          metadata: { template_key: 'THANK_YOU', whatsapp_id: result.idMessage, phone: phoneNumber },
        });
        return;
      }
    }

    // Log-only mode
    await base44.asServiceRole.entities.ConversationMessage.create({
      contact_id: contact.id,
      event_id: event.id,
      channel: 'SYSTEM',
      sender: 'SYSTEM',
      message_text: messageText,
      timestamp: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Contact',
      entity_id: contact.id,
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

function formatPhone(phone) {
  let num = phone.replace(/[\s\-\(\)\.\+]/g, '');
  if (num.startsWith('972')) { /* already international */ }
  else if (num.startsWith('0')) num = '972' + num.substring(1);
  return num;
}

function isWithinSendWindow(settings) {
  const startHour = settings.send_window_start_hour ?? 9;
  const endHour = settings.send_window_end_hour ?? 20;
  const localHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hebron',
    hour: 'numeric',
    hour12: false,
  }).format(new Date()));
  return localHour >= startHour && localHour < endHour;
}

async function wasRecentlySent(base44, contactId, templateKey) {
  const recentLogs = await base44.asServiceRole.entities.AuditLog.filter({
    entity_id: contactId,
    action: 'SEND_MESSAGE',
  });
  return recentLogs.some(l =>
    l.metadata?.template_key === templateKey &&
    l.created_date &&
    (Date.now() - new Date(l.created_date).getTime()) < 24 * 60 * 60 * 1000
  );
}