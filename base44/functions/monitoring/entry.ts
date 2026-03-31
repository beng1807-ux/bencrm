import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];

    const now = new Date();
    const contacts = await base44.asServiceRole.entities.Contact.list();
    const events = await base44.asServiceRole.entities.Event.list();
    let tasksCreated = 0;

    // מעקב הצעות שלא טופלו
    for (const contact of contacts) {
      if (contact.status === 'QUOTE_SENT') {
        const createdDate = new Date(contact.created_date);
        const hoursSince = (now - createdDate) / (1000 * 60 * 60);

        if (hoursSince >= settings.quote_followup_hours) {
          const existingTasks = await base44.asServiceRole.entities.Task.filter({
            related_contact_id: contact.id,
            status: 'OPEN',
          });

          if (existingTasks.length === 0) {
            await base44.asServiceRole.entities.Task.create({
              title: `מעקב הצעת מחיר - ${contact.contact_name}`,
              related_contact_id: contact.id,
              priority: 'HIGH',
              status: 'OPEN',
            });
            tasksCreated++;
          }
        }
      }
    }

    // מעקב אירועים ללא DJ
    for (const event of events) {
      const eventDate = new Date(event.event_date);
      const daysUntil = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));

      if (!event.dj_id && daysUntil <= settings.dj_missing_days_before && daysUntil > 0) {
        const existingTasks = await base44.asServiceRole.entities.Task.filter({
          related_event_id: event.id,
          status: 'OPEN',
        });

        const hasDjTask = existingTasks.some((t) => t.title.includes('DJ'));
        if (!hasDjTask) {
          await base44.asServiceRole.entities.Task.create({
            title: `דחוף: שיבוץ DJ לאירוע ${event.event_type}`,
            related_event_id: event.id,
            priority: 'HIGH',
            status: 'OPEN',
            due_at: event.event_date,
          });
          tasksCreated++;
        }
      }
    }

    // מעקב כשלי שליחה
    const recentLogs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 50);
    const failedSends = recentLogs.filter(
      (log) => log.action === 'SEND_FAILED' && log.created_date > new Date(Date.now() - 86400000)
    );

    for (const log of failedSends) {
      const existingTasks = await base44.asServiceRole.entities.Task.filter({
        related_event_id: log.entity_id,
        status: 'OPEN',
      });

      const hasFailTask = existingTasks.some((t) => t.title.includes('כשל'));
      if (!hasFailTask) {
        await base44.asServiceRole.entities.Task.create({
          title: `כשל בשליחת הודעה - בדוק חיבור WhatsApp`,
          related_event_id: log.entity_id,
          priority: 'HIGH',
          status: 'OPEN',
        });
        tasksCreated++;
      }
    }

    return Response.json({ success: true, tasksCreated });
  } catch (error) {
    console.error('Error in monitoring:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});