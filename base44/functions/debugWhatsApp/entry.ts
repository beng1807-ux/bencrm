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
    const action = payload.action;

    // ── Action 1: Send a test message and track delivery ──
    if (action === 'send_test') {
      const phone = payload.phone;
      const message = payload.message || '🔔 הודעת בדיקה מסקיצה';
      
      // Step 1: Resolve chatId
      const checkRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/checkWhatsapp/${GREEN_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: parseInt(phone.replace(/\D/g, '').replace(/^0/, '972')) }),
        }
      );
      const checkData = await checkRes.json();
      
      if (!checkData.existsWhatsapp) {
        return Response.json({ error: 'Phone not on WhatsApp', checkData });
      }
      
      const chatId = checkData.chatId;
      console.log(`[debugWhatsApp] chatId resolved: ${chatId}`);
      
      // Step 2: Send message
      const sendRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message }),
        }
      );
      const sendData = await sendRes.json();
      console.log(`[debugWhatsApp] sendMessage response: ${JSON.stringify(sendData)}`);
      
      if (!sendData.idMessage) {
        return Response.json({ error: 'Send failed', sendData, chatId });
      }

      // Step 3: Wait 5 seconds, then check if delivered
      await new Promise(r => setTimeout(r, 5000));
      
      // Step 4: Get last outgoing messages to see status
      const journalRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/lastOutgoingMessages/${GREEN_TOKEN}`,
        { method: 'GET' }
      );
      const journal = await journalRes.json();
      
      // Find our message
      const ourMsg = journal.find(m => m.idMessage === sendData.idMessage);
      
      return Response.json({
        success: true,
        chatId,
        idMessage: sendData.idMessage,
        deliveryStatus: ourMsg ? ourMsg.statusMessage : 'not_found_in_journal',
        fullMessageRecord: ourMsg || null,
        journalSize: journal.length,
      });
    }

    // ── Action 2: Check status of a specific message ──
    if (action === 'check_message') {
      const journalRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/lastOutgoingMessages/${GREEN_TOKEN}`,
        { method: 'GET' }
      );
      const journal = await journalRes.json();
      
      // If messageId provided, find it
      if (payload.messageId) {
        const msg = journal.find(m => m.idMessage === payload.messageId);
        return Response.json({ message: msg || 'not_found', journalSize: journal.length });
      }
      
      // Otherwise return last 10 messages
      return Response.json({ 
        lastMessages: journal.slice(0, 10).map(m => ({
          id: m.idMessage,
          chatId: m.chatId,
          status: m.statusMessage,
          type: m.typeMessage,
          timestamp: m.timestamp,
          textPreview: (m.textMessage || '').substring(0, 50),
        }))
      });
    }

    // ── Action 3: Check the previously sent DJ messages ──
    if (action === 'check_recent_dj') {
      const journalRes = await fetch(
        `https://api.green-api.com/waInstance${GREEN_ID}/lastOutgoingMessages/${GREEN_TOKEN}`,
        { method: 'GET' }
      );
      const journal = await journalRes.json();
      
      // Look for messages to Yossi's LID
      const yossiMessages = journal.filter(m => 
        m.chatId === '94141488840849@lid' || 
        m.chatId === '972546888587@c.us'
      );
      
      // Look for messages to Einat's LID
      const einatMessages = journal.filter(m => 
        m.chatId === '98406475292752@lid' || 
        m.chatId === '972544535688@c.us'
      );
      
      return Response.json({
        yossi: yossiMessages.slice(0, 5).map(m => ({
          id: m.idMessage,
          chatId: m.chatId,
          status: m.statusMessage,
          timestamp: m.timestamp,
          text: (m.textMessage || '').substring(0, 80),
        })),
        einat: einatMessages.slice(0, 5).map(m => ({
          id: m.idMessage,
          chatId: m.chatId,
          status: m.statusMessage,
          timestamp: m.timestamp,
          text: (m.textMessage || '').substring(0, 80),
        })),
      });
    }

    return Response.json({ error: 'Unknown action. Use: send_test, check_message, check_recent_dj' }, { status: 400 });
  } catch (error) {
    console.error(`[debugWhatsApp] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});