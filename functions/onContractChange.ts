import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: eventData, old_data } = await req.json();

    // בדיקה שהחוזה השתנה
    if (
      !eventData.contract_status ||
      eventData.contract_status === old_data?.contract_status
    ) {
      return Response.json({ message: 'No contract change' });
    }

    // בדיקת הגדרות
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      return Response.json({ message: 'Automations disabled' });
    }

    // עדכון תאריך חתימה
    if (eventData.contract_status === 'SIGNED' && !eventData.contract_signed_at) {
      await base44.asServiceRole.entities.Event.update(eventData.id, {
        contract_signed_at: new Date().toISOString(),
      });
    }

    // יצירת משימות בהתאם לסטטוס
    if (eventData.contract_status === 'SENT') {
      await base44.asServiceRole.entities.Task.create({
        title: `מעקב חתימת חוזה - ${eventData.event_type}`,
        related_event_id: eventData.id,
        priority: 'NORMAL',
        status: 'OPEN',
      });
    }

    if (eventData.contract_status === 'DECLINED') {
      await base44.asServiceRole.entities.Task.create({
        title: `חוזה נדחה - בדוק עם לקוח`,
        related_event_id: eventData.id,
        priority: 'HIGH',
        status: 'OPEN',
      });
    }

    // רישום לוג
    await base44.asServiceRole.entities.AuditLog.create({
      entity_name: 'Event',
      entity_id: eventData.id,
      action: 'UPDATE',
      diff_summary: `סטטוס חוזה השתנה ל-${eventData.contract_status}`,
      metadata: {
        old_status: old_data?.contract_status,
        new_status: eventData.contract_status,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in onContractChange:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});