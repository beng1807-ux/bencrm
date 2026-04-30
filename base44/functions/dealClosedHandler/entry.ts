import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const contactId = body.contact_id;

    if (!contactId) {
      return Response.json({ error: 'contact_id is required' }, { status: 400 });
    }

    console.log(`[dealClosedHandler] Processing contact: ${contactId}`);

    // Fetch the contact
    const contacts = await base44.asServiceRole.entities.Contact.filter({ id: contactId });
    const contact = contacts[0];
    if (!contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (contact.status !== 'DEAL_CLOSED') {
      return Response.json({ message: 'Contact status is not DEAL_CLOSED' });
    }

    // Check settings
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      return Response.json({ error: 'Settings not configured' }, { status: 500 });
    }
    if (!settings.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }

    // Check if event already exists for this contact
    const existingEvents = await base44.asServiceRole.entities.Event.filter({ contact_id: contact.id });
    if (existingEvents.length > 0) {
      console.log(`[dealClosedHandler] Event already exists for contact ${contact.id}`);
      return Response.json({ message: 'Event already exists', event_id: existingEvents[0].id });
    }

    // Determine if DJ-only event (third party paid, no Skitza package)
    const isDjOnly = contact.is_dj_lead && !contact.skitza_package_selected;
    const isThirdPartyPaid = isDjOnly;

    // Update contact to customer type + set dj_only_event flag
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      contact_type: 'customer',
      total_events: (contact.total_events || 0) + 1,
      dj_only_event: isDjOnly,
    });
    console.log(`[dealClosedHandler] Contact upgraded to customer: ${contact.id} (DJ only: ${isDjOnly})`);

    // Get default package (skip pricing for DJ-only events)
    let defaultPackage = null;
    let priceTotal = 0;
    let depositAmount = 0;

    if (!isDjOnly) {
      const packages = await base44.asServiceRole.entities.Package.filter({ item_type: 'PACKAGE', active: true });
      defaultPackage = packages[0];
      const depositPercent = settings.default_deposit_percent || 30;
      priceTotal = defaultPackage?.price || 0;
      depositAmount = priceTotal * (depositPercent / 100);
    }

    // Create event
    const newEvent = await base44.asServiceRole.entities.Event.create({
      contact_id: contact.id,
      event_date: contact.event_date || '',
      event_type: contact.event_type || 'אחר',
      package_id: defaultPackage?.id || null,
      addon_ids: [],
      price_total: priceTotal,
      deposit_amount: depositAmount,
      payment_status: isDjOnly ? 'PAID_FULL' : 'PENDING',
      balance_amount: isDjOnly ? 0 : priceTotal,
      contract_status: isDjOnly ? 'SIGNED' : 'DRAFT',
      event_status: 'PENDING',
      is_third_party_paid: isThirdPartyPaid,
    });
    console.log(`[dealClosedHandler] Event created: ${newEvent.id}`);

    // Log message from template
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DEAL_CLOSED',
      active: true,
    });
    const template = templateList.length > 0 ? templateList[0] : null;

    if (template && !contact.whatsapp_opted_out) {
      const eventDateFormatted = contact.event_date ? new Date(contact.event_date).toLocaleDateString('he-IL') : 'טרם נקבע';
      const messageText = template.template_text
        .replace(/{customer_name}/g, contact.contact_name || '')
        .replace(/{contact_name}/g, contact.contact_name || '')
        .replace(/{event_date}/g, eventDateFormatted)
        .replace(/{event_type}/g, contact.event_type || '')
        .replace(/{price_total}/g, priceTotal.toLocaleString())
        .replace(/{deposit_amount}/g, depositAmount.toLocaleString())
        .replace(/{owner_name}/g, settings.owner_name || '')
        .replace(/{owner_phone}/g, settings.owner_phone || '')
        .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
        .replace(/{signature}/g, settings.signature_text || 'קבוצת סקיצה');

      if (settings.whatsapp_send_mode === 'לוג בלבד') {
        await base44.asServiceRole.entities.ConversationMessage.create({
          contact_id: contact.id,
          event_id: newEvent.id,
          channel: 'SYSTEM',
          sender: 'SYSTEM',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_MESSAGE',
          diff_summary: 'הודעת סגירת עסקה נרשמה בלוג',
          metadata: { template_key: 'DEAL_CLOSED', simulated: true },
        });
        console.log('[dealClosedHandler] DEAL_CLOSED logged immediately');
      } else {
        const GREEN_ID = Deno.env.get('GREEN_ID');
        const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
        if (!GREEN_ID || !GREEN_TOKEN) throw new Error('GREEN API לא מוגדר');
        if (!contact.phone) throw new Error('אין מספר טלפון באיש קשר');

        const phoneNumber = formatPhone(contact.phone);
        const whatsappResponse = await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
        });
        const whatsappResult = await whatsappResponse.json();
        if (!whatsappResponse.ok || !whatsappResult.idMessage) {
          throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
        }

        if (settings.logo_url_for_messages) {
          await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: settings.logo_url_for_messages, fileName: 'skitza-logo.png', caption: '' }),
          });
        }

        await base44.asServiceRole.entities.ConversationMessage.create({
          contact_id: contact.id,
          event_id: newEvent.id,
          channel: 'WHATSAPP',
          sender: 'OWNER',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_MESSAGE',
          diff_summary: 'הודעת סגירת עסקה נשלחה בוואטסאפ',
          metadata: { template_key: 'DEAL_CLOSED', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
        });
        console.log('[dealClosedHandler] DEAL_CLOSED sent immediately');
      }
    }

    // Create AuditLog entry so it shows in Dashboard activity
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: newEvent.id,
      action: 'CREATE',
      diff_summary: `עסקה נסגרה — אירוע חדש נוצר עבור ${contact.contact_name || ''}`,
      metadata: {
        contact_id: contact.id,
        contact_name: contact.contact_name,
        event_type: contact.event_type,
        is_dj_only: isDjOnly,
        price_total: priceTotal,
      },
    });
    console.log('[dealClosedHandler] AuditLog created');

    return Response.json({ success: true, contact_id: contact.id, event_id: newEvent.id });
  } catch (error) {
    console.error('[dealClosedHandler] ERROR:', error.stack || error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatPhone(phone) {
  let num = String(phone).replace(/[^0-9]/g, '');
  if (num.startsWith('972')) return num;
  if (num.startsWith('0')) return '972' + num.substring(1);
  return num;
}