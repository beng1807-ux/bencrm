import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    console.log("TEST AUTOMATION FIRED", JSON.stringify(body).substring(0, 500));
    
    // Write proof to AuditLog so we can verify it ran
    await base44.asServiceRole.entities.AuditLog.create({
        actor_user_id: "SYSTEM_TEST",
        entity_name: "Lead",
        entity_id: body?.event?.entity_id || "unknown",
        action: "UPDATE",
        diff_summary: "testAutoFunc fired successfully at " + new Date().toISOString()
    });
    
    return Response.json({ success: true, message: "Test automation fired!" });
});