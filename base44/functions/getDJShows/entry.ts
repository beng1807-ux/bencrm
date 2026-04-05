import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';

    // If admin and djId provided, use that; otherwise find DJ by email
    const body = await req.json().catch(() => ({}));
    let djId = body.djId;
    let djProfile = null;

    if (isAdmin) {
      const allDJs = await base44.asServiceRole.entities.DJ.list();
      if (djId) {
        djProfile = allDJs.find(d => d.id === djId);
      } else if (allDJs.length > 0) {
        djProfile = allDJs[0];
        djId = djProfile.id;
      }
      
      let events = [];
      let contacts = [];
      if (djId) {
        events = await base44.asServiceRole.entities.Event.filter({ dj_id: djId });
        // Get contact IDs from events
        const contactIds = [...new Set(events.map(e => e.contact_id).filter(Boolean))];
        if (contactIds.length > 0) {
          const allContacts = await base44.asServiceRole.entities.Contact.list();
          contacts = allContacts.filter(c => contactIds.includes(c.id));
        }
      }
      
      return Response.json({
        djProfile,
        allDJs,
        events,
        contacts,
        isAdmin: true,
      });
    } else {
      // DJ user — find by email
      const djList = user.email
        ? await base44.asServiceRole.entities.DJ.filter({ email: user.email })
        : [];
      
      if (djList.length === 0) {
        return Response.json({ djProfile: null, events: [], contacts: [], isAdmin: false });
      }
      
      djProfile = djList[0];
      const events = await base44.asServiceRole.entities.Event.filter({ dj_id: djProfile.id });
      
      // Get contacts for these events (strip financial info)
      const contactIds = [...new Set(events.map(e => e.contact_id).filter(Boolean))];
      let contacts = [];
      if (contactIds.length > 0) {
        const allContacts = await base44.asServiceRole.entities.Contact.list();
        contacts = allContacts
          .filter(c => contactIds.includes(c.id))
          .map(c => ({
            id: c.id,
            contact_name: c.contact_name,
            phone: c.phone,
            email: c.email,
            celebrant_name: c.celebrant_name,
            parents_names: c.parents_names,
            siblings_names: c.siblings_names,
            guests_count: c.guests_count,
            guest_type: c.guest_type,
            age_range: c.age_range,
            event_type: c.event_type,
            event_contents: c.event_contents,
            event_nature: c.event_nature,
            musical_line: c.musical_line,
            style_notes: c.style_notes,
            laser_addition: c.laser_addition,
            expectations: c.expectations,
            special_requests: c.special_requests,
            notes: c.notes,
          }));
      }

      // Strip financial info from events for DJ
      const safeEvents = events.map(e => ({
        id: e.id,
        event_type: e.event_type,
        event_date: e.event_date,
        location: e.location,
        event_status: e.event_status,
        contact_id: e.contact_id,
        dj_id: e.dj_id,
        notes: e.notes,
      }));

      return Response.json({
        djProfile,
        events: safeEvents,
        contacts,
        isAdmin: false,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});