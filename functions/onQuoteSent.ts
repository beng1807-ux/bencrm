import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const rawBody = await req.text();
    console.log(`[onQuoteSent] RAW BODY: ${rawBody.substring(0, 500)}`);
    
    const body = JSON.parse(rawBody);
    console.log(`[onQuoteSent] BODY KEYS: ${Object.keys(body).join(', ')}`);

    const lead = body.data;
    const old_data = body.old_data;

    console.log(`[onQuoteSent] Received: status=${lead?.status}, old_status=${old_data?.status}, lead_id=${lead?.id}`);

    if (!lead) {
      return Response.json({ message: 'No lead data' });
    }

    // אירוע נפתח רק כשנסגרה עסקה
    if (lead.status !== 'DEAL_CLOSED' || lead.status === old_data?.status) {
      console.log(`[onQuoteSent] Skipping: status=${lead.status}, old=${old_data?.status}`);
      return Response.json({ message: 'Not a triggering status change' });
    }

    console.log(`[onQuoteSent] Lead ${lead.id} changed to DEAL_CLOSED, creating event...`);

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    // בדיקה אם כבר קיים אירוע עבור הליד
    const existingEvents = await base44.asServiceRole.entities.Event.filter({ lead_id: lead.id });
    if (existingEvents.length > 0) {
      console.log(`[onQuoteSent] Event already exists for lead ${lead.id}, skipping`);
      return Response.json({ message: 'Event already exists', event_id: existingEvents[0].id });
    }

    // יצירת לקוח אם לא קיים
    let customer;
    if (lead.phone) {
      const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ phone: lead.phone });
      if (existingCustomers.length > 0) {
        customer = existingCustomers[0];
      }
    }

    if (!customer) {
      customer = await base44.asServiceRole.entities.Customer.create({
        phone: lead.phone || '',
        email: lead.email || '',
        name: lead.contact_name || '',
        total_events: 0,
        total_revenue: 0,
      });
      console.log(`[onQuoteSent] Customer created: ${customer.id}`);
    }

    // יצירת אירוע
    const packages = await base44.asServiceRole.entities.Package.filter({ item_type: 'PACKAGE', active: true });
    const defaultPackage = packages[0];

    const depositPercent = settings.default_deposit_percent || 30;
    const priceTotal = defaultPackage?.price || 0;
    const depositAmount = priceTotal * (depositPercent / 100);

    const newEvent = await base44.asServiceRole.entities.Event.create({
      customer_id: customer.id,
      lead_id: lead.id,
      event_date: lead.event_date || '',
      event_type: lead.event_type || 'אחר',
      package_id: defaultPackage?.id || '',
      addon_ids: [],
      price_total: priceTotal,
      deposit_amount: depositAmount,
      payment_status: 'PENDING',
      balance_amount: priceTotal,
      contract_status: 'DRAFT',
      event_status: 'PENDING',
    });
    console.log(`[onQuoteSent] Event created: ${newEvent.id}`);

    // שליחת הודעת תבנית
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({ template_key: 'QUOTE_SENT', active: true });

    if (templateList.length > 0) {
      const template = templateList[0];
      const eventDateFormatted = lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '';
      const messageText = template.template_text
        .replace('{customer_name}', customer.name || '')
        .replace('{contact_name}', lead.contact_name || '')
        .replace('{event_date}', eventDateFormatted)
        .replace('{event_type}', lead.event_type || '')
        .replace('{price_total}', priceTotal?.toLocaleString() || '0')
        .replace('{deposit_amount}', depositAmount?.toLocaleString() || '0')
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '')
        .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

      if (settings.whatsapp_send_mode === 'לוג בלבד') {
        await base44.asServiceRole.entities.ConversationMessage.create({
          customer_id: customer.id,
          event_id: newEvent.id,
          lead_id: lead.id,
          channel: 'SYSTEM',
          sender: 'SYSTEM',
          message_text: messageText,
          timestamp: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: newEvent.id,
          action: 'SEND_MESSAGE',
          diff_summary: 'הודעת נסגרה עסקה נרשמה בלוג',
          metadata: { template_key: 'QUOTE_SENT', simulated: true },
        });
      }
    }

    return Response.json({ success: true, customer_id: customer.id, event_id: newEvent.id });
  } catch (error) {
    console.error('[onQuoteSent] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});