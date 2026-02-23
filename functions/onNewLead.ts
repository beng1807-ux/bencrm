import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[onNewLead] ▶ Triggered');

  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error(`[onNewLead] ✖ Failed to parse request body: ${parseErr.message}`);
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { event, data: lead } = body;
    if (!lead || !lead.id) {
      console.warn('[onNewLead] ✖ No lead data in payload');
      return Response.json({ error: 'No lead data' }, { status: 400 });
    }
    console.log(`[onNewLead] ✓ Lead: ${lead.id} - ${lead.contact_name} - ${lead.phone}`);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onNewLead] ℹ Automations disabled - skipping');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    console.log(`[onNewLead] ✓ Settings loaded. WhatsApp mode: ${settings.whatsapp_send_mode}`);

    // בדיקת כפילויות
    if (lead.phone && lead.event_date) {
      console.log(`[onNewLead] 🔍 Checking duplicates: ${lead.phone} / ${lead.event_date}`);
      try {
        const duplicates = await base44.asServiceRole.entities.Lead.filter({
          phone: lead.phone,
          event_date: lead.event_date,
        });
        if (duplicates.length > 1) {
          console.log(`[onNewLead] ⚠ Found ${duplicates.length} duplicates - creating task`);
          await base44.asServiceRole.entities.Task.create({
            title: `ליד כפול - ${lead.contact_name}`,
            related_lead_id: lead.id,
            priority: 'HIGH',
            status: 'OPEN',
          });
        }
      } catch (dupErr) {
        console.error(`[onNewLead] ⚠ Duplicate check failed: ${dupErr.message}`);
      }
    }

    // שליחת הודעה
    try {
      const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'NEW_LEAD',
        active: true,
      });
      console.log(`[onNewLead] ✓ Found ${templateList.length} NEW_LEAD templates`);

      if (templateList.length > 0) {
        const template = templateList[0];
        const messageText = template.template_text
          .replace('[שם]', lead.contact_name || '')
          .replace('[תאריך]', lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '')
          .replace('[טלפון בן גבאי]', settings.owner_phone || '');

        console.log(`[onNewLead] 📝 Message prepared (${messageText.length} chars)`);

        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onNewLead] ℹ Log-only mode - saving to conversation');
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
          console.log('[onNewLead] ✓ Message logged successfully');
        } else {
          console.warn('[onNewLead] ⚠ WhatsApp API not connected yet - logging as failed');
          throw new Error('WhatsApp API לא מחובר - יש להגדיר GREEN API');
        }
      }
    } catch (msgError) {
      console.error(`[onNewLead] ✖ Message error: ${msgError.message}`);
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Lead',
          entity_id: lead.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחת הודעה: ${msgError.message}`,
          metadata: { template_key: 'NEW_LEAD', error_message: msgError.message },
        });
      } catch (logErr) {
        console.error(`[onNewLead] ✖ AuditLog write failed: ${logErr.message}`);
      }
    }

    // משימת מעקב
    try {
      await base44.asServiceRole.entities.Task.create({
        title: `מעקב ליד חדש - ${lead.contact_name}`,
        related_lead_id: lead.id,
        priority: 'NORMAL',
        status: 'OPEN',
      });
      console.log('[onNewLead] ✓ Follow-up task created');
    } catch (taskErr) {
      console.error(`[onNewLead] ✖ Task creation failed: ${taskErr.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[onNewLead] ✅ Done (${elapsed}ms)`);
    return Response.json({ success: true });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[onNewLead] ❌ Unhandled error (${elapsed}ms):`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});