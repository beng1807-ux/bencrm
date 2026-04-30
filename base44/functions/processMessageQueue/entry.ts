import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DAILY_LIMIT = 10;
const MIN_GAP_MINUTES = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};
    if (!settings.automations_enabled) {
      return Response.json({ success: true, message: 'Automations disabled' });
    }

    if (!isWithinSendWindow(settings)) {
      console.log('Outside send window — skipping automatic queue');
      return Response.json({ success: true, message: 'Outside send window' });
    }

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const sentToday = await base44.asServiceRole.entities.MessageQueue.filter({ status: 'SENT' }, '-sent_at', 50);
    const todayCount = sentToday.filter(q => q.sent_at && new Date(q.sent_at) >= startOfDay).length;
    if (todayCount >= DAILY_LIMIT) {
      return Response.json({ success: true, message: 'Daily limit reached', sent_today: todayCount });
    }

    const recentSent = sentToday.find(q => q.sent_at);
    if (recentSent) {
      const minutesSinceLast = (now - new Date(recentSent.sent_at)) / 60000;
      if (minutesSinceLast < MIN_GAP_MINUTES) {
        return Response.json({ success: true, message: 'Waiting for 10 minute gap', minutes_since_last: minutesSinceLast });
      }
    }

    const pending = await base44.asServiceRole.entities.MessageQueue.filter({ status: 'PENDING' }, 'scheduled_for', 20);
    const next = pending.find(q => !q.scheduled_for || new Date(q.scheduled_for) <= now);
    if (!next) {
      return Response.json({ success: true, message: 'No pending messages' });
    }

    await base44.asServiceRole.entities.MessageQueue.update(next.id, { attempts: (next.attempts || 0) + 1 });

    const contacts = await base44.asServiceRole.entities.Contact.filter({ id: next.contact_id });
    const contact = contacts[0];
    if (!contact) {
      await base44.asServiceRole.entities.MessageQueue.update(next.id, { status: 'FAILED', last_error: 'Contact not found' });
      return Response.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    if (contact.whatsapp_opted_out) {
      await base44.asServiceRole.entities.MessageQueue.update(next.id, {
        status: 'SKIPPED',
        last_error: 'Contact opted out from WhatsApp',
      });
      return Response.json({ success: true, message: 'Contact opted out - skipped', queue_id: next.id });
    }

    const existingMessages = await base44.asServiceRole.entities.AuditLog.filter({
      entity_id: contact.id,
      action: 'SEND_MESSAGE',
    });
    const alreadySent = existingMessages.some(m => m.metadata?.template_key === next.template_key);
    if (alreadySent) {
      await base44.asServiceRole.entities.MessageQueue.update(next.id, { status: 'SKIPPED', last_error: 'Message already sent before' });
      return Response.json({ success: true, message: 'Message already sent before - skipped', queue_id: next.id });
    }

    const templates = await base44.asServiceRole.entities.MessageTemplate.filter({ template_key: next.template_key, active: true });
    if (templates.length === 0) {
      await base44.asServiceRole.entities.MessageQueue.update(next.id, { status: 'FAILED', last_error: 'Template not found' });
      return Response.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const messageText = await buildMessage(base44, templates[0].template_text, next.template_key, contact, settings);

    if (settings.whatsapp_send_mode === 'לוג בלבד') {
      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: contact.id,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: now.toISOString(),
      });
      await markSent(base44, next, contact, next.template_key, true, null, now);
      return Response.json({ success: true, message: 'Logged only', queue_id: next.id });
    }

    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
    if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API לא מוגדר');
    if (!contact.phone) throw new Error('אין מספר טלפון באיש קשר');

    const phoneNumber = formatPhone(contact.phone);
    if (phoneNumber.length < 9 || phoneNumber.length > 15) throw new Error(`מספר טלפון לא תקין: ${contact.phone}`);

    const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
    const whatsappResponse = await fetch(greenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
    });
    const whatsappResult = await whatsappResponse.json();
    if (!whatsappResponse.ok || !whatsappResult.idMessage) throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);

    if (next.template_key === 'NEW_LEAD' && settings.new_lead_pdf_url) {
      await sendFile(GREEN_ID, GREEN_TOKEN, phoneNumber, settings.new_lead_pdf_url, 'skitza-info.pdf');
    }
    if (settings.logo_url_for_messages) {
      await sendFile(GREEN_ID, GREEN_TOKEN, phoneNumber, settings.logo_url_for_messages, 'skitza-logo.png');
    }

    await base44.asServiceRole.entities.ConversationMessage.create({
      contact_id: contact.id,
      channel: 'WHATSAPP',
      sender: 'OWNER',
      message_text: messageText,
      timestamp: now.toISOString(),
    });
    await markSent(base44, next, contact, next.template_key, false, whatsappResult.idMessage, now, phoneNumber);

    return Response.json({ success: true, queue_id: next.id, template_key: next.template_key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function buildMessage(base44, templateText, templateKey, contact, settings) {
  const signature = settings.signature_text || 'קבוצת סקיצה';
  const eventDateFormatted = contact.event_date ? new Date(contact.event_date).toLocaleDateString('he-IL') : '';
  let formLink = '';
  if (templateKey === 'DJ_BOOKING_FORM') {
    const bfSettings = await base44.asServiceRole.entities.BookingFormSettings.list();
    const appId = Deno.env.get('BASE44_APP_ID') || '';
    formLink = bfSettings[0]?.form_link || `https://preview-sandbox--${appId}.base44.app/BookingForm`;
  }
  return templateText
    .replace(/\[שם\]/g, contact.contact_name || '')
    .replace(/\[תאריך\]/g, eventDateFormatted)
    .replace(/\[טלפון בן גבאי\]/g, settings.owner_phone || '')
    .replace(/{contact_name}/g, contact.contact_name || '')
    .replace(/{event_date}/g, eventDateFormatted)
    .replace(/{event_type}/g, contact.event_type || '')
    .replace(/{form_link}/g, formLink)
    .replace(/{owner_name}/g, signature)
    .replace(/{owner_phone}/g, settings.owner_phone || '')
    .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
    .replace(/{signature}/g, signature);
}

async function markSent(base44, queueItem, contact, templateKey, simulated, whatsappId, now, phone) {
  await base44.asServiceRole.entities.MessageQueue.update(queueItem.id, { status: 'SENT', sent_at: now.toISOString(), last_error: '' });
  await base44.asServiceRole.entities.AuditLog.create({
    entity_name: 'Contact',
    entity_id: contact.id,
    action: 'SEND_MESSAGE',
    diff_summary: `הודעת ${templateKey} ${simulated ? 'נרשמה בלוג' : 'נשלחה בוואטסאפ'}`,
    metadata: { template_key: templateKey, simulated, whatsapp_id: whatsappId, phone },
  });
}

async function sendFile(greenId, greenToken, phoneNumber, urlFile, fileName) {
  const apiUrl = `https://api.green-api.com/waInstance${greenId}/sendFileByUrl/${greenToken}`;
  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile, fileName, caption: '' }),
  });
}

function formatPhone(phone) {
  let num = String(phone).replace(/[^0-9]/g, '');
  if (num.startsWith('972')) return num;
  if (num.startsWith('0')) return '972' + num.substring(1);
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