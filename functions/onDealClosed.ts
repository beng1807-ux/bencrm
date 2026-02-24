import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    console.log(`[onDealClosed] RAW BODY: ${rawBody.substring(0, 500)}`);

    const body = JSON.parse(rawBody);
    console.log(`[onDealClosed] BODY KEYS: ${Object.keys(body).join(', ')}`);

    const lead = body.data;
    const old_data = body.old_data;

    console.log(`[onDealClosed] Status check: current=${lead?.status}, old=${old_data?.status}, lead_id=${lead?.id}`);

    if (!lead) {
      return Response.json({ message: 'No lead data' });
    }

    if (lead.status !== 'DEAL_CLOSED' || lead.status === old_data?.status) {
      console.log(`[onDealClosed] Skipping: Change from ${old_data?.status} to ${lead.status}`);
      return Response.json({ message: 'Not a triggering status change' });
    }

    console.log(`[onDealClosed] Lead ${lead.id} moved to DEAL_CLOSED. Processing...`);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      console.error('[onDealClosed] AppSettings not found');
      return Response.json({ error: 'Settings not configured' }, { status: 500 });
    }
    if (!settings.automations_enabled) {
      console.log('[onDealClosed] Automations are disabled in settings');
      return Response.json({ message: 'Automations disabled' });
    }

    const existingEvents = await base44.asServiceRole.entities.Event.filter({ lead_id: lead.id });
    if (existingEvents.length > 0) {
      console.log(`[onDealClosed] Event already exists for lead ${lead.id}`);
      return Response.json({ message: 'Event already exists', event_id: existingEvents[0].id });
    }

    let customer;
    if (lead.phone) {
      const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ phone: lead.phone });
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
        console.log(`[onDealClosed] Found existing customer: ${customer.id}`);
      }
    }

    if (!customer) {
      customer = await base44.asServiceRole.entities.Customer.create({
        phone: lead.phone || '',
        email: lead.email || '',
        name: lead.contact_name || 'לקוח חדש',
        total_events: 0,
        total_revenue: 0,
      });
      console.log(`[onDealClosed] Created new customer: ${customer.id}`);
    }

    const packages = await base44.asServiceRole.entities.Package.filter({ item_type: 'PACKAGE', active: true });
    const defaultPackage = packages[0];
    if (!defaultPackage) {
      console.warn('[onDealClosed] No active package found, using empty values');
    }

    const depositPercent = settings.default_deposit_percent || 30;
    const priceTotal = defaultPackage?.price || 0;
    const depositAmount = priceTotal * (depositPercent / 100);

    const newEvent = await base44.asServiceRole.entities.Event.create({
      customer_id: customer.id,
      lead_id: lead.id,
      event_date: lead.event_date || null,
      event_type: lead.event_type || 'אחר',
      package_id: defaultPackage?.id || null,
      addon_ids: [],
      price_total: priceTotal,
      deposit_amount: depositAmount,
      payment_status: 'PENDING',
      balance_amount: priceTotal,
      contract_status: 'DRAFT',
      event_status: 'PENDING',
    });
    console.log(`[onDealClosed] Event created successfully: ${newEvent.id}`);

    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DEAL_CLOSED',
      active: true
    });
    const template = templateList.length > 0 ? templateList[0] : null;

    if (template) {
      const eventDateFormatted = lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : 'טרם נקבע';
      const messageText = template.template_text
        .replace(/{customer_name}/g, customer.name || '')
        .replace(/{contact_name}/g, lead.contact_name || '')
        .replace(/{event_date}/g, eventDateFormatted)
        .replace(/{event_type}/g, lead.event_type || '')
        .replace(/{price_total}/g, priceTotal.toLocaleString())
        .replace(/{deposit_amount}/g, depositAmount.toLocaleString())
        .replace(/{owner_name}/g, settings.owner_name || '')
        .replace(/{owner_phone}/g, settings.owner_phone || '')
        .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '');

      await base44.asServiceRole.entities.ConversationMessage.create({
        customer_id: customer.id,
        event_id: newEvent.id,
        lead_id: lead.id,
        channel: 'SYSTEM',
        sender: 'SYSTEM',
        message_text: messageText,
        timestamp: new Date().toISOString(),
      });
      console.log('[onDealClosed] Message logged to conversation');
    } else {
      console.log('[onDealClosed] No DEAL_CLOSED template found, skipping message');
    }

    return Response.json({ success: true, customer_id: customer.id, event_id: newEvent.id });
  } catch (error) {
    console.error('[onDealClosed] CRITICAL ERROR:', error.stack || error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});