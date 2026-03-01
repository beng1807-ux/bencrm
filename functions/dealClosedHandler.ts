import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const leadId = body.lead_id;

    if (!leadId) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    console.log(`[dealClosedHandler] Processing lead: ${leadId}`);

    // Fetch the lead
    const leads = await base44.asServiceRole.entities.Lead.filter({ id: leadId });
    const lead = leads[0];
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status !== 'DEAL_CLOSED') {
      return Response.json({ message: 'Lead status is not DEAL_CLOSED' });
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

    // Check if event already exists
    const existingEvents = await base44.asServiceRole.entities.Event.filter({ lead_id: lead.id });
    if (existingEvents.length > 0) {
      console.log(`[dealClosedHandler] Event already exists for lead ${lead.id}`);
      return Response.json({ message: 'Event already exists', event_id: existingEvents[0].id });
    }

    // Find or create customer
    let customer;
    if (lead.phone) {
      const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ phone: lead.phone });
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
        console.log(`[dealClosedHandler] Found existing customer: ${customer.id}`);
      }
    }

    if (!customer) {
      customer = await base44.asServiceRole.entities.Customer.create({
        phone: lead.phone || '',
        email: lead.email || '',
        name: lead.contact_name || 'לקוח חדש',
        total_events: 0,
        total_revenue: 0,
        celebrant_name: lead.celebrant_name || '',
        parents_names: lead.parents_names || '',
        guests_count: lead.guests_count || null,
        siblings_names: lead.siblings_names || '',
        age_range: lead.age_range || '',
        event_contents: lead.event_contents || [],
        event_nature: lead.event_nature || '',
        laser_addition: lead.laser_addition || false,
        musical_line: lead.musical_line || '',
        special_requests: lead.special_requests || '',
      });
      console.log(`[dealClosedHandler] Created new customer: ${customer.id}`);
    } else {
      // Update existing customer with latest lead data
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        celebrant_name: lead.celebrant_name || customer.celebrant_name || '',
        parents_names: lead.parents_names || customer.parents_names || '',
        guests_count: lead.guests_count || customer.guests_count || null,
        siblings_names: lead.siblings_names || customer.siblings_names || '',
        age_range: lead.age_range || customer.age_range || '',
        event_contents: lead.event_contents?.length ? lead.event_contents : (customer.event_contents || []),
        event_nature: lead.event_nature || customer.event_nature || '',
        laser_addition: lead.laser_addition ?? customer.laser_addition ?? false,
        musical_line: lead.musical_line || customer.musical_line || '',
        special_requests: lead.special_requests || customer.special_requests || '',
      });
      console.log(`[dealClosedHandler] Updated existing customer: ${customer.id}`);
    }

    // Get default package
    const packages = await base44.asServiceRole.entities.Package.filter({ item_type: 'PACKAGE', active: true });
    const defaultPackage = packages[0];

    const depositPercent = settings.default_deposit_percent || 30;
    const priceTotal = defaultPackage?.price || 0;
    const depositAmount = priceTotal * (depositPercent / 100);

    // Create event
    const newEvent = await base44.asServiceRole.entities.Event.create({
      customer_id: customer.id,
      lead_id: lead.id,
      event_date: lead.event_date || '',
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
    console.log(`[dealClosedHandler] Event created: ${newEvent.id}`);

    // Log message from template
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DEAL_CLOSED',
      active: true,
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
      console.log('[dealClosedHandler] Message logged');
    }

    return Response.json({ success: true, customer_id: customer.id, event_id: newEvent.id });
  } catch (error) {
    console.error('[dealClosedHandler] ERROR:', error.stack || error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});