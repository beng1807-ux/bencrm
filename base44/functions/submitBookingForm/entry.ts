import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { formData } = await req.json();

    if (!formData || !formData.phone || !formData.contact_name) {
      return Response.json({ error: 'חסרים שדות חובה (טלפון ושם)' }, { status: 400 });
    }

    // Clean phone - digits only
    const cleanPhone = formData.phone.replace(/\D/g, '');

    // Build lead data
    const leadData = { ...formData, phone: cleanPhone, status: 'FORM_FILLED', source: 'BASE44_FORM' };
    if (leadData.guests_count) leadData.guests_count = Number(leadData.guests_count);

    // Search for existing lead by phone (service role - no auth needed)
    let lead = null;
    let isUpdate = false;
    const existingLeads = await base44.asServiceRole.entities.Lead.filter({ phone: cleanPhone });

    if (existingLeads.length > 0) {
      // Found existing lead - update with new data + set status to FORM_FILLED
      lead = existingLeads[0];
      const updateData = { ...leadData };
      delete updateData.source; // keep existing source
      await base44.asServiceRole.entities.Lead.update(lead.id, updateData);
      lead = { ...lead, ...updateData };
      isUpdate = true;
    } else {
      // New lead with FORM_FILLED status
      lead = await base44.asServiceRole.entities.Lead.create(leadData);
    }

    // Get notification email
    let notificationEmail = '';
    try {
      const bfSettingsList = await base44.asServiceRole.entities.BookingFormSettings.list();
      if (bfSettingsList.length > 0 && bfSettingsList[0].notification_email) {
        notificationEmail = bfSettingsList[0].notification_email;
      }
    } catch { /* ignore */ }

    if (!notificationEmail) {
      try {
        const appSettingsList = await base44.asServiceRole.entities.AppSettings.list();
        if (appSettingsList.length > 0 && appSettingsList[0].owner_email) {
          notificationEmail = appSettingsList[0].owner_email;
        }
      } catch { /* ignore */ }
    }

    // Send email notification
    if (notificationEmail) {
      const eventContents = Array.isArray(formData.event_contents) ? formData.event_contents.join(', ') : '';
      const laserText = formData.laser_addition ? '✅ כן' : '❌ לא';

      const emailBody = `
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#e94f1c;">${isUpdate ? '🔄 עדכון פרטי ליד קיים' : '🎉 פנייה חדשה מטופס ההזמנה!'}</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">שם:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.contact_name || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">טלפון:</td><td style="padding:8px;border-bottom:1px solid #eee;">${cleanPhone}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">אימייל:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.email || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">סוג אירוע:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.event_type || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">תאריך:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.event_date || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">שם חוגג/ת:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.celebrant_name || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">כמות אורחים:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.guests_count || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">שמות הורים:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.parents_names || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">שמות אחים:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.siblings_names || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">טווח גילאים:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.age_range || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">תכני אירוע:</td><td style="padding:8px;border-bottom:1px solid #eee;">${eventContents || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">אופי האירוע:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.event_nature || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">תוספת לייזר:</td><td style="padding:8px;border-bottom:1px solid #eee;">${laserText}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">קו מוזיקלי:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.musical_line || '-'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">בקשות מיוחדות:</td><td style="padding:8px;border-bottom:1px solid #eee;">${formData.special_requests || '-'}</td></tr>
  </table>
  <p style="margin-top:16px;color:#666;font-size:12px;">נשלח אוטומטית ממערכת סקיצה CRM</p>
</div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: notificationEmail,
        subject: isUpdate
          ? `🔄 עדכון ליד: ${formData.contact_name} - ${formData.event_type || ''}`
          : `🎉 פנייה חדשה: ${formData.contact_name} - ${formData.event_type || ''}`,
        body: emailBody,
        from_name: 'Skitza CRM'
      });
    }

    // Create quote handling task
    try {
      await base44.asServiceRole.entities.Task.create({
        title: `טיפול בהצעת מחיר - ${formData.contact_name}`,
        related_lead_id: lead.id,
        priority: 'HIGH',
        status: 'OPEN',
      });
    } catch (taskErr) {
      console.error('Task creation failed:', taskErr.message);
    }

    return Response.json({ success: true, isUpdate, leadId: lead.id });
  } catch (error) {
    console.error('submitBookingForm error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});