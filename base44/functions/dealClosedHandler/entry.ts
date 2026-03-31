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

    // Update contact to customer type
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      contact_type: 'customer',
      total_events: (contact.total_events || 0) + 1,
    });
    console.log(`[dealClosedHandler] Contact upgraded to customer: ${contact.id}`);

    // Get default package
    const packages = await base44.asServiceRole.entities.Package.filter({ item_type: 'PACKAGE', active: true });
    const defaultPackage = packages[0];

    const depositPercent = settings.default_deposit_percent || 30;
    const priceTotal = defaultPackage?.price || 0;
    const depositAmount = priceTotal * (depositPercent / 100);

    // Create event
    const newEvent = await base44.asServiceRole.entities.Event.create({
      contact_id: contact.id,
      event_date: contact.event_date || '',
      event_type: contact.event_type || 'אחר',
      package_id: defaultPackage?.id || null,
      addon_ids: [],
      price_total: priceTotal,
      deposit_amount: depositAmount,
      payment_status: 'PENDING',
      balance_amount: priceTotal,
      contract_status: 'DRAFT',
      event_status: 'PENDING',
    });
    console.log(`[dealClosedHandler] Event created: ${newEvent.id}`);

    // Log message from template
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DEAL_CLOSED',
      active: true,
    });
    const template = templateList.length > 0 ? templateList[0] : null;

    if (template) {
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
        .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '');

      await base44.asServiceRole.entities.ConversationMessage.create({
        contact_id: contact.id,
        event_id: newEvent.id,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });
      console.log('[dealClosedHandler] Message logged');
    }

    return Response.json({ success: true, contact_id: contact.id, event_id: newEvent.id });
  } catch (error) {
    console.error('[dealClosedHandler] ERROR:', error.stack || error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});