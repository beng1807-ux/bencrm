import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[onNewContact] ▶ Triggered');

  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error(`[onNewContact] ✖ Failed to parse request body: ${parseErr.message}`);
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { event, data: contact } = body;
    if (!contact || !contact.id) {
      console.warn('[onNewContact] ✖ No contact data in payload');
      return Response.json({ error: 'No contact data' }, { status: 400 });
    }
    console.log(`[onNewContact] ✓ Contact: ${contact.id} - ${contact.contact_name} - ${contact.phone} - status: ${contact.status}`);

    // Skip WhatsApp + task for form-filled contacts (handled by submitBookingForm)
    if (contact.status === 'FORM_FILLED') {
      console.log('[onNewContact] ℹ Contact filled form - skipping WhatsApp & task (handled by submitBookingForm)');
      return Response.json({ message: 'Form-filled contact - skipped' });
    }

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    if (!settingsList[0]?.automations_enabled) {
      console.log('[onNewContact] ℹ Automations disabled - skipping');
      return Response.json({ message: 'Automations disabled' });
    }
    const settings = settingsList[0];
    const signature = settings.signature_text || 'קבוצת סקיצה';
    const logoUrl = settings.logo_url_for_messages || '';
    console.log(`[onNewContact] ✓ Settings loaded. WhatsApp mode: ${settings.whatsapp_send_mode}`);

    // בדיקת כפילויות
    if (contact.phone && contact.event_date) {
      console.log(`[onNewContact] 🔍 Checking duplicates: ${contact.phone} / ${contact.event_date}`);
      try {
        const duplicates = await base44.asServiceRole.entities.Contact.filter({
          phone: contact.phone,
          event_date: contact.event_date,
        });
        if (duplicates.length > 1) {
          console.log(`[onNewContact] ⚠ Found ${duplicates.length} duplicates - creating task`);
          await base44.asServiceRole.entities.Task.create({
            title: `איש קשר כפול - ${contact.contact_name}`,
            related_contact_id: contact.id,
            priority: 'HIGH',
            status: 'OPEN',
          });
        }
      } catch (dupErr) {
        console.error(`[onNewContact] ⚠ Duplicate check failed: ${dupErr.message}`);
      }
    }

    // שליחת הודעה
    try {
      const templateList = await base44.asServiceRole.entities.MessageTemplate.filter({
        template_key: 'NEW_LEAD',
        active: true,
      });
      console.log(`[onNewContact] ✓ Found ${templateList.length} NEW_LEAD templates`);

      if (templateList.length > 0) {
        const template = templateList[0];
        const eventDateFormatted = contact.event_date ? new Date(contact.event_date).toLocaleDateString('he-IL') : '';
        const messageText = template.template_text
          .replace(/\[שם\]/g, contact.contact_name || '')
          .replace(/\[תאריך\]/g, eventDateFormatted)
          .replace(/\[טלפון בן גבאי\]/g, settings.owner_phone || '')
          .replace(/{contact_name}/g, contact.contact_name || '')
          .replace(/{event_date}/g, eventDateFormatted)
          .replace(/{event_type}/g, contact.event_type || '')
          .replace(/{owner_name}/g, signature)
          .replace(/{owner_phone}/g, settings.owner_phone || '')
          .replace(/{owner_whatsapp_phone}/g, settings.owner_whatsapp_phone || settings.owner_phone || '')
          .replace(/{signature}/g, signature);

        console.log(`[onNewContact] 📝 Message prepared (${messageText.length} chars)`);

        if (settings.whatsapp_send_mode === 'לוג בלבד') {
          console.log('[onNewContact] ℹ Log-only mode - saving to conversation');
          await base44.asServiceRole.entities.ConversationMessage.create({
            contact_id: contact.id,
            channel: 'SYSTEM',
            sender: 'SYSTEM',
            message_text: messageText,
            timestamp: new Date().toISOString(),
          });

          await base44.asServiceRole.entities.AuditLog.create({
            entity_name: 'Contact',
            entity_id: contact.id,
            action: 'SEND_MESSAGE',
            diff_summary: 'הודעת NEW_LEAD נרשמה בלוג',
            metadata: { template_key: 'NEW_LEAD', simulated: true },
          });
          console.log('[onNewContact] ✓ Message logged successfully');
        } else {
          console.log('[onNewContact] 📱 Attempting real WhatsApp send via GREEN API');
          const GREEN_ID = Deno.env.get('GREEN_ID');
          const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

          if (!GREEN_ID || !GREEN_TOKEN) {
            throw new Error('GREEN API לא מוגדר - חסר GREEN_ID או GREEN_TOKEN');
          }

          if (!contact.phone) {
            throw new Error('אין מספר טלפון באיש קשר');
          }

          let phoneNumber = contact.phone.replace(/[^0-9]/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '972' + phoneNumber.substring(1);
          }
          if (phoneNumber.length < 9 || phoneNumber.length > 15) {
            throw new Error(`מספר טלפון לא תקין: ${contact.phone}`);
          }
          console.log(`[onNewContact] 📞 Normalized phone: ${phoneNumber}`);

          // Send text message
          const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;
          const whatsappResponse = await fetch(greenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, message: messageText }),
          });

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappResult.idMessage) {
            console.log(`[onNewContact] ✅ WhatsApp sent successfully: ${whatsappResult.idMessage}`);

            // Send PDF attachment if configured
            if (settings.new_lead_pdf_url) {
              try {
                const pdfApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
                const pdfResponse = await fetch(pdfApiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: `${phoneNumber}@c.us`,
                    urlFile: settings.new_lead_pdf_url,
                    fileName: 'skitza-info.pdf',
                    caption: '',
                  }),
                });
                const pdfResult = await pdfResponse.json();
                console.log(`[onNewContact] 📎 PDF attachment sent: ${pdfResult.idMessage || 'unknown'}`);
              } catch (pdfErr) {
                console.error(`[onNewContact] ⚠ PDF send failed: ${pdfErr.message}`);
              }
            }

            // Send logo if configured
            if (logoUrl) {
              try {
                const logoApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendFileByUrl/${GREEN_TOKEN}`;
                await fetch(logoApiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chatId: `${phoneNumber}@c.us`, urlFile: logoUrl, fileName: 'skitza-logo.png', caption: '' }),
                });
              } catch (logoErr) {
                console.error(`[onNewContact] ⚠ Logo send failed: ${logoErr.message}`);
              }
            }

            await base44.asServiceRole.entities.ConversationMessage.create({
              contact_id: contact.id,
              channel: 'WHATSAPP',
              sender: 'OWNER',
              message_text: messageText + (settings.new_lead_pdf_url ? '\n📎 PDF מצורף' : ''),
              timestamp: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.AuditLog.create({
              entity_name: 'Contact',
              entity_id: contact.id,
              action: 'SEND_MESSAGE',
              diff_summary: 'הודעת NEW_LEAD נשלחה בוואטסאפ' + (settings.new_lead_pdf_url ? ' + PDF' : ''),
              metadata: { template_key: 'NEW_LEAD', whatsapp_id: whatsappResult.idMessage, phone: phoneNumber, pdf_attached: !!settings.new_lead_pdf_url },
            });
          } else {
            throw new Error(`WhatsApp send failed: ${JSON.stringify(whatsappResult)}`);
          }
        }
      }
    } catch (msgError) {
      console.error(`[onNewContact] ✖ Message error: ${msgError.message}`);
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          entity_name: 'Contact',
          entity_id: contact.id,
          action: 'SEND_FAILED',
          diff_summary: `כשל בשליחת הודעה: ${msgError.message}`,
          metadata: { template_key: 'NEW_LEAD', error_message: msgError.message },
        });
      } catch (logErr) {
        console.error(`[onNewContact] ✖ AuditLog write failed: ${logErr.message}`);
      }
    }

    // משימת מעקב
    try {
      await base44.asServiceRole.entities.Task.create({
        title: `מעקב איש קשר חדש - ${contact.contact_name}`,
        related_contact_id: contact.id,
        priority: 'NORMAL',
        status: 'OPEN',
      });
      console.log('[onNewContact] ✓ Follow-up task created');
    } catch (taskErr) {
      console.error(`[onNewContact] ✖ Task creation failed: ${taskErr.message}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[onNewContact] ✅ Done (${elapsed}ms)`);
    return Response.json({ success: true });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[onNewContact] ❌ Unhandled error (${elapsed}ms):`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});