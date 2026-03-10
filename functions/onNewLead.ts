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
    console.log(`[onNewLead] ✓ Lead: ${lead.id} - ${lead.contact_name} - ${lead.phone} - status: ${lead.status}`);

    // Skip WhatsApp + task for form-filled leads (handled by submitBookingForm)
    if (lead.status === 'FORM_FILLED') {
      console.log('[onNewLead] ℹ Lead filled form - skipping WhatsApp & task (handled by submitBookingForm)');
      return Response.json({ message: 'Form-filled lead - skipped' });
    }

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
        const eventDateFormatted = lead.event_date ? new Date(lead.event_date).toLocaleDateString('he-IL') : '';
        const messageText = template.template_text
          // פורמט ישן עם סוגריים מרובעים
          .replace('[שם]', lead.contact_name || '')
          .replace('[תאריך]', eventDateFormatted)
          .replace('[טלפון בן גבאי]', settings.owner_phone || '')
          // פורמט חדש עם סוגריים מסולסלים
          .replace('{contact_name}', lead.contact_name || '')
          .replace('{event_date}', eventDateFormatted)
          .replace('{event_type}', lead.event_type || '')
          .replace('{owner_name}', settings.owner_name || '')
          .replace('{owner_phone}', settings.owner_phone || '')
          .replace('{owner_whatsapp_phone}', settings.owner_whatsapp_phone || settings.owner_phone || '');

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
          // שליחה אמיתית דרך GREEN API
          console.log('[onNewLead] 📱 Attempting real WhatsApp send via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            console.error('[onNewLead] ✖ GREEN API credentials not configured');
            throw new Error('GREEN API לא מוגדר - חסר GREEN_ID או GREEN_TOKEN');
          }

          if (!lead.phone) {
            console.warn('[onNewLead] ⚠ No phone number on lead - skipping WhatsApp');
            throw new Error('אין מספר טלפון בליד');
          }

          // נרמול מספר טלפון - השאר רק ספרות (0-9)
          let phoneNumber = lead.phone.replace(/[^0-9]/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }
          // ודא שהמספר תקין (9-15 ספרות)
          if (phoneNumber.length < 9 || phoneNumber.length > 15) {
            console.warn(`[onNewLead] ⚠ Invalid phone after normalization: "${phoneNumber}" (from "${lead.phone}")`);
            throw new Error(`מספר טלפון לא תקין: ${lead.phone}`);
          }
          console.log(`[onNewLead] 📞 Normalized phone: ${phoneNumber} (from "${lead.phone}")`);

          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${phoneNumber}@c.us`,
              message: messageText
            })
          });

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`[onNewLead] ✅ WhatsApp sent successfully: ${whatsappResult.idMessage}`);

            await base44.asServiceRole.entities.ConversationMessage.create({
              customer_id: lead.id,
              lead_id: lead.id,
              channel: 'WHATSAPP',
              sender: 'OWNER',
              message_text: messageText,
              timestamp: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Lead',
              entity_id: lead.id,
              action: 'SEND_MESSAGE',
              diff_summary: 'הודעת NEW_LEAD נשלחה בוואטסאפ',
              metadata: { template_key: 'NEW_LEAD', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber },
            });
          } else {
            console.error(`[onNewLead] ✖ WhatsApp send failed:`, JSON.stringify(whatsappResult));
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
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