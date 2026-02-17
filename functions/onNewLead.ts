import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: lead } = await req.json();

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    const duplicates = await base44.asServiceRole.entities.Lead.filter({
      phone: lead.phone,
      event_date: lead.event_date,
    });
    if (duplicates.length > 1) {
      await base44.asServiceRole.entities.Task.create({
        title: `ליד כפול - ${lead.contact_name}`,
        related_lead_id: lead.id,
        priority: 'HIGH',
        status: 'OPEN',
      });
    }

    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'NEW_LEAD',
      active: true,
    });

    if (templateList.length > 0) {
      const template = templateList[0];
      const messageText = template.template_text
        .replace('[שם]', lead.contact_name)
        .replace('[תאריך]', new Date(lead.event_date).toLocaleDateString('he-IL'))
        .replace('[טלפון בן גבאי]', settings.owner_phone || '');

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: lead.id,
            lead_id: lead.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Lead',
            entity_id: lead.id,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת NEW_LEAD נרשמה בלוג',
            metadata: { template_key: 'NEW_LEAD', simulated: true },
          });
        } else {
          throw new Error('WhatsApp API לא מחובר');
        }
      } catch (error) {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Lead',
          entity_id: lead.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחת הודעה: ${error.message}`,
          metadata: { template_key: 'NEW_LEAD', error_message: error.message },
        });
      }
    }

    await base44.asServiceRole.entities.Task.create({
      title: `מעקב ליד חדש - ${lead.contact_name}`,
      related_lead_id: lead.id,
      priority: 'NORMAL',
      status: 'OPEN',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});