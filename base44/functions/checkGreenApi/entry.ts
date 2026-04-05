import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

    if (!GREEN_ID || !GREEN_TOKEN) {
      return Response.json({ error: 'GREEN API not configured' }, { status: 500 });
    }

    const payload = await req.json();
    const action = payload.action || 'status';

    // Check instance status
    if (action === 'status') {
      const stateRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/getStateInstance/${GREEN_TOKEN}`
      );
      const stateData = await stateRes.json();

      const settingsRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/getSettings/${GREEN_TOKEN}`
      );
      const settingsData = await settingsRes.json();

      return Response.json({
        instance_state: stateData,
        phone_connected: settingsData.wid || null,
        webhook_url: settingsData.webhookUrl || null,
      });
    }

    // Check if a specific phone exists on WhatsApp
    if (action === 'check_phone' && payload.phone) {
      let phone = payload.phone.replace(/[\s\-\(\)\.\+]/g, '');
      if (phone.startsWith('0')) phone = '972' + phone.substring(1);
      
      const checkRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/checkWhatsapp/${GREEN_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: parseInt(phone) }),
        }
      );
      const checkData = await checkRes.json();
      return Response.json({ phone, result: checkData });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});