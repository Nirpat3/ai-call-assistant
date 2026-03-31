import { db } from "./db";
import { leads, demos, salesActivities, salesIntegrations, salesTemplates, contacts, users } from "@shared/schema";
import { eq, and, desc, asc, like, gte, lte, inArray } from "drizzle-orm";
import type { 
  Lead, InsertLead, Demo, InsertDemo, SalesActivity, InsertSalesActivity, 
  SalesIntegration, InsertSalesIntegration, SalesTemplate, InsertSalesTemplate,
  LeadWithDetails 
} from "@shared/schema";
import { openai } from "./openai";
import { sendEmail } from "./email-service";
import { createCalendarEvent, checkAvailability } from "./calendar-service";

export class SalesManagementService {
  // Lead Management
  async createLead(data: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values(data)
      .returning();
    
    // Create initial activity
    await this.createActivity({
      organizationId: data.organizationId,
      leadId: lead.id,
      contactId: data.contactId,
      type: "note",
      subject: "Lead created",
      description: `New lead created from ${data.source || 'unknown source'}`,
      status: "completed",
      completedAt: new Date(),
    });

    return lead;
  }

  async getLeads(organizationId: string, filters?: {
    status?: string[];
    priority?: string[];
    assignedTo?: number[];
    source?: string[];
    search?: string;
  }): Promise<LeadWithDetails[]> {
    let query = db
      .select({
        lead: leads,
        contact: contacts,
        assignedUser: users,
      })
      .from(leads)
      .leftJoin(contacts, eq(leads.contactId, contacts.id))
      .leftJoin(users, eq(leads.assignedTo, users.id))
      .where(eq(leads.organizationId, organizationId));

    if (filters?.status) {
      query = query.where(and(
        eq(leads.organizationId, organizationId),
        inArray(leads.status, filters.status)
      ));
    }

    if (filters?.priority) {
      query = query.where(and(
        eq(leads.organizationId, organizationId),
        inArray(leads.priority, filters.priority)
      ));
    }

    if (filters?.assignedTo) {
      query = query.where(and(
        eq(leads.organizationId, organizationId),
        inArray(leads.assignedTo, filters.assignedTo)
      ));
    }

    if (filters?.search) {
      query = query.where(and(
        eq(leads.organizationId, organizationId),
        like(leads.notes, `%${filters.search}%`)
      ));
    }

    const results = await query.orderBy(desc(leads.createdAt));

    // Get activities and demos for each lead
    const enrichedLeads: LeadWithDetails[] = [];
    
    for (const result of results) {
      const activities = await this.getActivitiesByLead(result.lead.id);
      const demos = await this.getDemosByLead(result.lead.id);
      
      enrichedLeads.push({
        ...result.lead,
        contact: result.contact || undefined,
        assignedUser: result.assignedUser || undefined,
        activities,
        demos,
      });
    }

    return enrichedLeads;
  }

  async updateLead(id: number, data: Partial<InsertLead>): Promise<Lead> {
    const [updated] = await db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    
    return updated;
  }

  async updateLeadStatus(id: number, status: string, notes?: string): Promise<Lead> {
    const updated = await this.updateLead(id, { status });
    
    // Create activity for status change
    await this.createActivity({
      organizationId: updated.organizationId,
      leadId: id,
      type: "note",
      subject: `Status changed to ${status}`,
      description: notes || `Lead status updated to ${status}`,
      status: "completed",
      completedAt: new Date(),
    });

    return updated;
  }

  // Demo Scheduling
  async scheduleDemo(data: InsertDemo): Promise<Demo> {
    // Check calendar availability
    const isAvailable = await checkAvailability(
      data.scheduledDate,
      data.duration || 60
    );

    if (!isAvailable) {
      throw new Error("Selected time slot is not available");
    }

    // Create demo record
    const [demo] = await db
      .insert(demos)
      .values(data)
      .returning();

    // Create calendar event
    if (data.meetingPlatform) {
      const calendarEvent = await createCalendarEvent({
        title: data.title,
        description: data.description,
        startTime: data.scheduledDate,
        duration: data.duration || 60,
        attendees: data.attendees as any[],
        meetingPlatform: data.meetingPlatform,
      });

      // Update demo with calendar and meeting details
      await db
        .update(demos)
        .set({
          calendarEventId: calendarEvent.id,
          meetingUrl: calendarEvent.meetingUrl,
          meetingId: calendarEvent.meetingId,
        })
        .where(eq(demos.id, demo.id));
    }

    // Update lead status if connected
    if (data.leadId) {
      await this.updateLeadStatus(data.leadId, "demo_scheduled", "Demo scheduled");
    }

    // Send confirmation email
    await this.sendDemoConfirmationEmail(demo.id);

    // Create activity
    await this.createActivity({
      organizationId: data.organizationId,
      leadId: data.leadId,
      contactId: data.contactId,
      type: "demo",
      subject: `Demo scheduled: ${data.title}`,
      description: `Demo scheduled for ${data.scheduledDate}`,
      status: "pending",
      dueDate: data.scheduledDate,
    });

    return demo;
  }

  async getDemos(organizationId: string, filters?: {
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    assignedTo?: number[];
  }): Promise<Demo[]> {
    let query = db
      .select()
      .from(demos)
      .where(eq(demos.organizationId, organizationId));

    if (filters?.status) {
      query = query.where(and(
        eq(demos.organizationId, organizationId),
        inArray(demos.status, filters.status)
      ));
    }

    if (filters?.dateFrom) {
      query = query.where(and(
        eq(demos.organizationId, organizationId),
        gte(demos.scheduledDate, filters.dateFrom)
      ));
    }

    if (filters?.dateTo) {
      query = query.where(and(
        eq(demos.organizationId, organizationId),
        lte(demos.scheduledDate, filters.dateTo)
      ));
    }

    return await query.orderBy(asc(demos.scheduledDate));
  }

  async getDemosByLead(leadId: number): Promise<Demo[]> {
    return await db
      .select()
      .from(demos)
      .where(eq(demos.leadId, leadId))
      .orderBy(desc(demos.scheduledDate));
  }

  async updateDemo(id: number, data: Partial<InsertDemo>): Promise<Demo> {
    const [updated] = await db
      .update(demos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(demos.id, id))
      .returning();
    
    return updated;
  }

  async completeDemoWithOutcome(id: number, outcome: string, nextSteps?: string, notes?: string): Promise<Demo> {
    const demo = await this.updateDemo(id, {
      status: "completed",
      outcome,
      nextSteps,
      notes,
    });

    // Update lead status based on outcome
    if (demo.leadId) {
      const newStatus = outcome === "interested" ? "proposal" : 
                      outcome === "not_interested" ? "closed_lost" : "contacted";
      await this.updateLeadStatus(demo.leadId, newStatus, `Demo completed: ${outcome}`);
    }

    // Send follow-up email
    await this.sendDemoFollowUpEmail(id);

    return demo;
  }

  // Activity Management
  async createActivity(data: InsertSalesActivity): Promise<SalesActivity> {
    const [activity] = await db
      .insert(salesActivities)
      .values(data)
      .returning();
    
    return activity;
  }

  async getActivities(organizationId: string, filters?: {
    leadId?: number;
    contactId?: number;
    userId?: number;
    type?: string[];
    status?: string[];
  }): Promise<SalesActivity[]> {
    let query = db
      .select()
      .from(salesActivities)
      .where(eq(salesActivities.organizationId, organizationId));

    if (filters?.leadId) {
      query = query.where(and(
        eq(salesActivities.organizationId, organizationId),
        eq(salesActivities.leadId, filters.leadId)
      ));
    }

    if (filters?.contactId) {
      query = query.where(and(
        eq(salesActivities.organizationId, organizationId),
        eq(salesActivities.contactId, filters.contactId)
      ));
    }

    if (filters?.type) {
      query = query.where(and(
        eq(salesActivities.organizationId, organizationId),
        inArray(salesActivities.type, filters.type)
      ));
    }

    return await query.orderBy(desc(salesActivities.createdAt));
  }

  async getActivitiesByLead(leadId: number): Promise<SalesActivity[]> {
    return await db
      .select()
      .from(salesActivities)
      .where(eq(salesActivities.leadId, leadId))
      .orderBy(desc(salesActivities.createdAt));
  }

  // AI-Powered Email Generation
  async generateDemoConfirmationEmail(demoId: number): Promise<{ subject: string; content: string }> {
    const demo = await db
      .select({
        demo: demos,
        contact: contacts,
        lead: leads,
      })
      .from(demos)
      .leftJoin(contacts, eq(demos.contactId, contacts.id))
      .leftJoin(leads, eq(demos.leadId, leads.id))
      .where(eq(demos.id, demoId))
      .then(results => results[0]);

    if (!demo) throw new Error("Demo not found");

    const prompt = `Generate a professional demo confirmation email with the following details:
    - Contact: ${demo.contact?.firstName} ${demo.contact?.lastName}
    - Demo Title: ${demo.demo.title}
    - Date: ${demo.demo.scheduledDate}
    - Duration: ${demo.demo.duration} minutes
    - Meeting URL: ${demo.demo.meetingUrl}
    - Description: ${demo.demo.description}
    
    Make it friendly, professional, and include:
    - Confirmation of the demo
    - What to expect
    - How to prepare
    - Contact information for questions
    
    Return as JSON with 'subject' and 'content' fields.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generateFollowUpEmail(demoId: number): Promise<{ subject: string; content: string }> {
    const demo = await db
      .select({
        demo: demos,
        contact: contacts,
        lead: leads,
      })
      .from(demos)
      .leftJoin(contacts, eq(demos.contactId, contacts.id))
      .leftJoin(leads, eq(demos.leadId, leads.id))
      .where(eq(demos.id, demoId))
      .then(results => results[0]);

    if (!demo) throw new Error("Demo not found");

    const prompt = `Generate a follow-up email after a demo with these details:
    - Contact: ${demo.contact?.firstName} ${demo.contact?.lastName}
    - Demo: ${demo.demo.title}
    - Outcome: ${demo.demo.outcome}
    - Next Steps: ${demo.demo.nextSteps}
    - Notes: ${demo.demo.notes}
    
    Make it personalized based on the outcome and include:
    - Thank you for their time
    - Summary of what was discussed
    - Next steps based on their interest
    - Resources or additional information
    - Clear call to action
    
    Return as JSON with 'subject' and 'content' fields.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  // Email Sending
  async sendDemoConfirmationEmail(demoId: number): Promise<void> {
    const emailContent = await this.generateDemoConfirmationEmail(demoId);
    const demo = await db
      .select({
        demo: demos,
        contact: contacts,
      })
      .from(demos)
      .leftJoin(contacts, eq(demos.contactId, contacts.id))
      .where(eq(demos.id, demoId))
      .then(results => results[0]);

    if (!demo?.contact?.email) return;

    await sendEmail({
      to: demo.contact.email,
      subject: emailContent.subject,
      html: emailContent.content,
    });

    // Mark as sent
    await db
      .update(demos)
      .set({ reminderSent: true })
      .where(eq(demos.id, demoId));
  }

  async sendDemoFollowUpEmail(demoId: number): Promise<void> {
    const emailContent = await this.generateFollowUpEmail(demoId);
    const demo = await db
      .select({
        demo: demos,
        contact: contacts,
      })
      .from(demos)
      .leftJoin(contacts, eq(demos.contactId, contacts.id))
      .where(eq(demos.id, demoId))
      .then(results => results[0]);

    if (!demo?.contact?.email) return;

    await sendEmail({
      to: demo.contact.email,
      subject: emailContent.subject,
      html: emailContent.content,
    });

    // Mark as sent
    await db
      .update(demos)
      .set({ followUpSent: true })
      .where(eq(demos.id, demoId));
  }

  // Analytics and Reporting
  async getSalesMetrics(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const baseQuery = db
      .select()
      .from(leads)
      .where(eq(leads.organizationId, organizationId));

    let query = baseQuery;
    if (dateFrom) {
      query = baseQuery.where(and(
        eq(leads.organizationId, organizationId),
        gte(leads.createdAt, dateFrom)
      ));
    }
    if (dateTo) {
      query = baseQuery.where(and(
        eq(leads.organizationId, organizationId),
        lte(leads.createdAt, dateTo)
      ));
    }

    const allLeads = await query;
    
    const metrics = {
      totalLeads: allLeads.length,
      newLeads: allLeads.filter(l => l.status === 'new').length,
      qualifiedLeads: allLeads.filter(l => l.status === 'qualified').length,
      demosScheduled: allLeads.filter(l => l.status === 'demo_scheduled').length,
      closedWon: allLeads.filter(l => l.status === 'closed_won').length,
      closedLost: allLeads.filter(l => l.status === 'closed_lost').length,
      conversionRate: 0,
      averageDealValue: 0,
      totalPipelineValue: 0,
    };

    metrics.conversionRate = metrics.totalLeads > 0 ? 
      (metrics.closedWon / metrics.totalLeads) * 100 : 0;

    const dealValues = allLeads
      .filter(l => l.estimatedValue)
      .map(l => parseFloat(l.estimatedValue as string));
    
    metrics.averageDealValue = dealValues.length > 0 ? 
      dealValues.reduce((a, b) => a + b, 0) / dealValues.length : 0;

    metrics.totalPipelineValue = allLeads
      .filter(l => !['closed_won', 'closed_lost'].includes(l.status))
      .reduce((sum, lead) => sum + (parseFloat(lead.estimatedValue as string) || 0), 0);

    return metrics;
  }

  // Integration Management
  async createIntegration(data: InsertSalesIntegration): Promise<SalesIntegration> {
    const [integration] = await db
      .insert(salesIntegrations)
      .values(data)
      .returning();
    
    return integration;
  }

  async getIntegrations(organizationId: string): Promise<SalesIntegration[]> {
    return await db
      .select()
      .from(salesIntegrations)
      .where(eq(salesIntegrations.organizationId, organizationId))
      .orderBy(desc(salesIntegrations.createdAt));
  }

  async updateIntegration(id: number, data: Partial<InsertSalesIntegration>): Promise<SalesIntegration> {
    const [updated] = await db
      .update(salesIntegrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesIntegrations.id, id))
      .returning();
    
    return updated;
  }

  // Template Management
  async createTemplate(data: InsertSalesTemplate): Promise<SalesTemplate> {
    const [template] = await db
      .insert(salesTemplates)
      .values(data)
      .returning();
    
    return template;
  }

  async getTemplates(organizationId: string, type?: string): Promise<SalesTemplate[]> {
    let query = db
      .select()
      .from(salesTemplates)
      .where(eq(salesTemplates.organizationId, organizationId));

    if (type) {
      query = query.where(and(
        eq(salesTemplates.organizationId, organizationId),
        eq(salesTemplates.type, type)
      ));
    }

    return await query.orderBy(desc(salesTemplates.createdAt));
  }
}

export const salesManager = new SalesManagementService();