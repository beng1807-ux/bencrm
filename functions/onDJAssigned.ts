import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: eventData, old_data } = await req.json();

    // בדיקה שה-DJ השתנה
    if (!eventData.dj_id || eventData.dj_id === old_data?.dj_id) {
      return Response.json({ message: 'No DJ change' });
    }

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    // טעינת נתונים
    const [dj, customer] = await Promise.all([
      base44.asServiceRole.entities.DJ.filter({ id: eventData.dj_id }).then((r) => r[0]),
      base44.asServiceRole.entities.Customer.filter({ id: eventData.customer_id }).then(
        (r) => r[0]
      ),
    ]);

    if (!dj) return Response.json({ message: 'DJ not found' });

    // ניסיון שליחת הודעה
    const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
      template_key: 'DJ_ASSIGNED',
      active: true,
    });

    if (templateList.length > 0) {
      const template = templateList[0];
      const messageText = template.template_text
        .replace('[שם DJ]', dj.name)
        .replace('[תאריך]', new Date(eventData.event_date).toLocaleDateString('he-IL'))
        .replace('[מיקום]', eventData.location || 'לא צוין')
        .replace('[סוג אירוע]', eventData.event_type);

      try {
        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          await base44.asServiceRole.entities.ConversationMessage.create({
            customer_id: customer?.id || eventData.customer_id,
            event_id: eventData.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Event',
            entity_id: eventData.id,
            action: 'SEND_MESSAGE',
            diff_summary: `הודעת DJ_ASSIGNED נרשמה ל-${dj.name}`,
            metadata: { template_key: 'DJ_ASSIGNED', dj_id: dj.id, simulated: true },
          });
        } else {
          throw new Error('WhatsApp API לא מחובר');
        }
      } catch (error) {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Event',
          entity_id: eventData.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחה ל-DJ: ${error.message}`,
          metadata: {
            template_key: 'DJ_ASSIGNED',
            dj_id: dj.id,
            error_message: error.message,
          },
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in onDJAssigned:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});