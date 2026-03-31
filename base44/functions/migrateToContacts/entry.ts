import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = { leads_migrated: 0, customers_migrated: 0, events_updated: 0, tasks_updated: 0, messages_updated: 0, errors: [] };

    // Maps: old ID -> new Contact ID
    const leadToContact = {};
    const customerToContact = {};

    // 1. Migrate all Leads -> Contact (contact_type=lead)
    const leads = await base44.asServiceRole.entities.Lead.list();
    console.log(`Found ${leads.length} leads to migrate`);

    for (const lead of leads) {
      try {
        // Check if already migrated (by phone + event_date)
        const existing = await base44.asServiceRole.entities.Contact.filter({ phone: lead.phone });
        const alreadyMigrated = existing.find(c => c.contact_type === 'lead' && c.external_event_id === lead.external_event_id);
        
        if (alreadyMigrated) {
          leadToContact[lead.id] = alreadyMigrated.id;
          console.log(`Lead ${lead.contact_name} already migrated as ${alreadyMigrated.id}`);
          continue;
        }

        const contactData = {
          contact_type: 'lead',
          phone: lead.phone,
          email: lead.email || null,
          contact_name: lead.contact_name,
          event_date: lead.event_date || null,
          event_type: lead.event_type || null,
          celebrant_name: lead.celebrant_name || null,
          parents_names: lead.parents_names || null,
          guests_count: lead.guests_count || null,
          siblings_names: lead.siblings_names || null,
          event_contents: lead.event_contents || [],
          event_nature: lead.event_nature || null,
          guest_type: lead.guest_type || null,
          age_range: lead.age_range || null,
          laser_addition: lead.laser_addition || false,
          musical_line: lead.musical_line || null,
          expectations: lead.expectations || null,
          style_notes: lead.style_notes || null,
          special_requests: lead.special_requests || null,
          is_dj_lead: lead.is_dj_lead || false,
          status: lead.status || 'NEW',
          source: lead.source || 'OTHER',
          lost_reason: lead.lost_reason || null,
          external_event_id: lead.external_event_id || null,
        };

        const newContact = await base44.asServiceRole.entities.Contact.create(contactData);
        leadToContact[lead.id] = newContact.id;
        results.leads_migrated++;
        console.log(`Migrated lead: ${lead.contact_name} -> ${newContact.id}`);
      } catch (err) {
        results.errors.push(`Lead ${lead.id} (${lead.contact_name}): ${err.message}`);
        console.error(`Error migrating lead ${lead.contact_name}: ${err.message}`);
      }
    }

    // 2. Migrate all Customers -> Contact (contact_type=customer)
    const customers = await base44.asServiceRole.entities.Customer.list();
    console.log(`Found ${customers.length} customers to migrate`);

    for (const cust of customers) {
      try {
        // Check if a lead was already migrated with same phone - if so, update that to customer
        const existingByPhone = await base44.asServiceRole.entities.Contact.filter({ phone: cust.phone });
        const matchingLead = existingByPhone.find(c => c.contact_type === 'lead');
        
        if (matchingLead) {
          // Upgrade existing lead contact to customer, merge data
          await base44.asServiceRole.entities.Contact.update(matchingLead.id, {
            contact_type: 'customer',
            email: cust.email || matchingLead.email,
            contact_name: cust.name || matchingLead.contact_name,
            celebrant_name: cust.celebrant_name || matchingLead.celebrant_name,
            parents_names: cust.parents_names || matchingLead.parents_names,
            guests_count: cust.guests_count || matchingLead.guests_count,
            siblings_names: cust.siblings_names || matchingLead.siblings_names,
            event_contents: (cust.event_contents && cust.event_contents.length > 0) ? cust.event_contents : matchingLead.event_contents,
            event_nature: cust.event_nature || matchingLead.event_nature,
            age_range: cust.age_range || matchingLead.age_range,
            laser_addition: cust.laser_addition || matchingLead.laser_addition,
            musical_line: cust.musical_line || matchingLead.musical_line,
            special_requests: cust.special_requests || matchingLead.special_requests,
            notes: cust.notes || matchingLead.notes,
            total_events: cust.total_events || 0,
            total_revenue: cust.total_revenue || 0,
            status: 'DEAL_CLOSED',
          });
          customerToContact[cust.id] = matchingLead.id;
          results.customers_migrated++;
          console.log(`Merged customer ${cust.name} into existing contact ${matchingLead.id}`);
          continue;
        }

        // Check if already migrated as customer
        const alreadyCustomer = existingByPhone.find(c => c.contact_type === 'customer');
        if (alreadyCustomer) {
          customerToContact[cust.id] = alreadyCustomer.id;
          console.log(`Customer ${cust.name} already migrated as ${alreadyCustomer.id}`);
          continue;
        }

        // Create new customer contact
        const contactData = {
          contact_type: 'customer',
          phone: cust.phone,
          email: cust.email || null,
          contact_name: cust.name,
          celebrant_name: cust.celebrant_name || null,
          parents_names: cust.parents_names || null,
          guests_count: cust.guests_count || null,
          siblings_names: cust.siblings_names || null,
          event_contents: cust.event_contents || [],
          event_nature: cust.event_nature || null,
          age_range: cust.age_range || null,
          laser_addition: cust.laser_addition || false,
          musical_line: cust.musical_line || null,
          special_requests: cust.special_requests || null,
          notes: cust.notes || null,
          total_events: cust.total_events || 0,
          total_revenue: cust.total_revenue || 0,
          status: 'DEAL_CLOSED',
          source: 'OTHER',
        };

        const newContact = await base44.asServiceRole.entities.Contact.create(contactData);
        customerToContact[cust.id] = newContact.id;
        results.customers_migrated++;
        console.log(`Migrated customer: ${cust.name} -> ${newContact.id}`);
      } catch (err) {
        results.errors.push(`Customer ${cust.id} (${cust.name}): ${err.message}`);
        console.error(`Error migrating customer ${cust.name}: ${err.message}`);
      }
    }

    console.log('Lead map:', JSON.stringify(leadToContact));
    console.log('Customer map:', JSON.stringify(customerToContact));

    // 3. Update Events: set contact_id based on customer_id or lead_id
    const events = await base44.asServiceRole.entities.Event.list();
    console.log(`Found ${events.length} events to update`);

    for (const event of events) {
      try {
        let newContactId = null;
        
        // Try customer_id first (takes priority)
        if (event.customer_id && customerToContact[event.customer_id]) {
          newContactId = customerToContact[event.customer_id];
        } else if (event.customer_id && leadToContact[event.customer_id]) {
          newContactId = leadToContact[event.customer_id];
        }
        // Then try lead_id
        if (!newContactId && event.lead_id && leadToContact[event.lead_id]) {
          newContactId = leadToContact[event.lead_id];
        }

        if (newContactId) {
          await base44.asServiceRole.entities.Event.update(event.id, { contact_id: newContactId });
          results.events_updated++;
          console.log(`Event ${event.id}: contact_id = ${newContactId}`);
        } else {
          console.log(`Event ${event.id}: no matching contact found (customer_id=${event.customer_id}, lead_id=${event.lead_id})`);
        }
      } catch (err) {
        results.errors.push(`Event ${event.id}: ${err.message}`);
      }
    }

    // 4. Update Tasks: related_lead_id -> related_contact_id
    const tasks = await base44.asServiceRole.entities.Task.list();
    console.log(`Found ${tasks.length} tasks to update`);

    for (const task of tasks) {
      try {
        const oldLeadId = task.related_lead_id;
        if (oldLeadId && leadToContact[oldLeadId]) {
          await base44.asServiceRole.entities.Task.update(task.id, { related_contact_id: leadToContact[oldLeadId] });
          results.tasks_updated++;
        }
      } catch (err) {
        results.errors.push(`Task ${task.id}: ${err.message}`);
      }
    }

    // 5. Update ConversationMessages: customer_id/lead_id -> contact_id
    const messages = await base44.asServiceRole.entities.ConversationMessage.list();
    console.log(`Found ${messages.length} messages to update`);

    for (const msg of messages) {
      try {
        let newContactId = null;
        
        if (msg.customer_id && customerToContact[msg.customer_id]) {
          newContactId = customerToContact[msg.customer_id];
        } else if (msg.customer_id && leadToContact[msg.customer_id]) {
          newContactId = leadToContact[msg.customer_id];
        }
        if (!newContactId && msg.lead_id && leadToContact[msg.lead_id]) {
          newContactId = leadToContact[msg.lead_id];
        }

        if (newContactId) {
          await base44.asServiceRole.entities.ConversationMessage.update(msg.id, { contact_id: newContactId });
          results.messages_updated++;
        }
      } catch (err) {
        results.errors.push(`Message ${msg.id}: ${err.message}`);
      }
    }

    console.log('Migration complete:', JSON.stringify(results));
    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Migration failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});