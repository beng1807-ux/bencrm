import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: lead, old_data } = await req.json();

    // בדיקה שהסטטוס השתנה ל-QUOTE_SENT
    if (lead.status !== 'QUOTE_SENT' || old_data?.status === 'QUOTE_SENT') {
      return Response.json({ message: 'Not a new QUOTE_SENT status' });
    }

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    // יצירת לקוח אם לא קיים
    let customer;
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({
      phone: lead.phone,
    });

    if (existingCustomers.length > 0) {
      customer = existingCustomers[0];
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        phone: lead.phone,
        email: lead.email,
        name: lead.contact_name,
        total_events: 0,
        total_revenue: 0,
      });
    }

    // יצירת אירוע
    const packages = await base44.asServiceRole.entities.Package.filter({
      item_type: 'PACKAGE',
      active: true,
    });
    const defaultPackage = packages[0];

    const event = await base44.asServiceRole.entities.Event.create({
      customer_id: customer.id,
      lead_id: lead.id,
      event_date: lead.event_date,
      event_type: lead.event_type,
      package_id: defaultPackage?.id || '',
      addon_ids: [],
      price_total: defaultPackage?.price || 0,
      deposit_amount: (defaultPackage?.price || 0) * 0.3,
      payment_status: 'PENDING',
      balance_amount: defaultPackage?.price || 0,
      contract_status: 'DRAFT',
      event_status: 'PENDING',
    });

    // סנכרון סטטוסים
    await base44.asServiceRole.entities.Lead.update(lead.id, {
      status: 'QUOTE_SENT',
    });

    // ניסיון שליחת הודעה
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'QUOTE_SENT',
      active: true,
    });

    if (templateList.length > 0) {
      const template = templateList[0];
      const eventDateFormatted = new Date(event.event_date).toLocaleDateString('he-IL');
      const messageText = template.template_text
        .replace('{customer_name}', customer.name || '')
        .replace('{event_date}', eventDateFormatted)
        .replace('{price_total}', event.price_total?.toLocaleString() || '0')
        .replace('{deposit_amount}', event.deposit_amount?.toLocaleString() || '0')
        .replace('{owner_name}', settings.owner_name || '')
        .replace('{owner_phone}', settings.owner_phone || '')
        .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: customer.id,
            event_id: event.id,
            lead_id: lead.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Event',
            entity_id: event.id,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת QUOTE_SENT נרשמה בלוג',
            metadata: { template_key: 'QUOTE_SENT', simulated: true },
          });
        } else {
          throw new Error('WhatsApp API לא מחובר');
        }
      } catch (error) {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: event.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחה: ${error.message}`,
          metadata: { template_key: 'QUOTE_SENT', error_message: error.message },
        });
      }
    }

    return Response.json({ success: true, customer_id: customer.id, event_id: event.id });
  } catch (error) {
    console.error('Error in onQuoteSent:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});