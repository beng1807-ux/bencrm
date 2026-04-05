import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json().catch(() => ({}));
    if (!eventId) {
      return Response.json({ error: 'Missing eventId' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    if (events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    const event = events[0];

    // Verify DJ has access
    if (!isAdmin) {
      const djList = user.email
        ? await base44.asServiceRole.entities.DJ.filter({ email: user.email })
        : [];
      if (djList.length === 0 || djList[0].id !== event.dj_id) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get contact data
    let contact = null;
    if (event.contact_id) {
      const contactsList = await base44.asServiceRole.entities.Contact.filter({ id: event.contact_id });
      if (contactsList.length > 0) {
        const c = contactsList[0];
        // Strip financial data for non-admin
        contact = isAdmin ? c : {
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
        };
      }
    }

    // Strip financial info from event for non-admin
    const safeEvent = isAdmin ? event : {
      id: event.id,
      event_type: event.event_type,
      event_date: event.event_date,
      location: event.location,
      event_status: event.event_status,
      contact_id: event.contact_id,
      dj_id: event.dj_id,
      notes: event.notes,
    };

    return Response.json({ event: safeEvent, contact, authorized: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});