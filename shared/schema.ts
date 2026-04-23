import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, uuid, primaryKey, numeric, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations for multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  settings: jsonb("settings").default({}),
  plan: text("plan").notNull().default("basic"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  currentOrganizationId: uuid("current_organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Junction table for user-organization memberships
export const userOrganizations = pgTable("user_organizations", {
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  role: text("role").notNull().default("member"), // admin, member, viewer
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at", { mode: 'date', withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.organizationId] })
}));

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callSid: text("call_sid").notNull().unique(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  status: text("status").notNull(), // "in-progress", "completed", "busy", "failed", "no-answer"
  direction: text("direction").notNull(), // "inbound", "outbound"
  duration: integer("duration"), // in seconds
  startTime: timestamp("start_time", { mode: 'date', withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { mode: 'date', withTimezone: true }),
  recordingUrl: text("recording_url"),
  transcription: text("transcription"),
  conversationBreakdown: jsonb("conversation_breakdown").$type<ConversationTurn[]>(), // Chat-like conversation breakdown
  sentiment: text("sentiment"), // "positive", "negative", "neutral"
  keyTopics: text("key_topics").array(), // Array of key topics discussed
  actionItems: text("action_items").array(), // Array of action items identified
  summary: text("summary"),
  aiHandled: boolean("ai_handled").default(false),
  forwarded: boolean("forwarded").default(false),
  forwardedTo: text("forwarded_to"),
  callerName: text("caller_name"),
  // Screening classification (set once on first utterance)
  classification: text("classification"), // "legit" | "spam" | "ai_bot"
  classificationReason: text("classification_reason"),
  classificationConfidence: integer("classification_confidence"), // stored *100 (0-100)
  classificationProvenance: text("classification_provenance"), // "rules" | "shre-local" | "cloud-openai" | "default"
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Outbox for asynchronous sync to Shre platform (CortexService via shre-api).
// Events are enqueued locally on every completed call; a background worker
// drains to shre-api over Tailscale. Survives Brain downtime.
export const shreOutbox = pgTable("shre_outbox", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // e.g. "call.completed", "voicemail.recorded"
  payload: jsonb("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  syncedAt: timestamp("synced_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Type for conversation turns in chat-like format
export type ConversationTurn = {
  speaker: "caller" | "ai" | "human";
  speakerName?: string;
  message: string;
  timestamp: string;
  confidence?: number;
  sentiment?: "positive" | "negative" | "neutral";
};

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  internalId: text("internal_id").unique().notNull(), // Unique internal identifier
  
  // Encrypted personal information
  firstName: text("first_name_encrypted"), // AES encrypted
  lastName: text("last_name_encrypted"), // AES encrypted
  displayName: text("display_name_encrypted"), // AES encrypted
  email: text("email_encrypted"), // AES encrypted
  phoneNumbers: text("phone_numbers_encrypted"), // AES encrypted JSON array
  
  // Business information (less sensitive, can be plaintext)
  company: text("company"),
  department: text("department"),
  jobTitle: text("job_title"),
  
  // Encrypted address information
  address: text("address_encrypted"), // AES encrypted
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  
  // Encrypted notes and personal data
  notes: text("notes_encrypted"), // AES encrypted
  
  tags: jsonb("tags").$type<string[]>().default([]), // Array of tags
  groups: jsonb("groups").$type<string[]>().default([]), // Array of group names
  isFavorite: boolean("is_favorite").default(false), // Favorite contacts
  priority: text("priority").default("normal"), // "high", "normal", "low"
  isVip: boolean("is_vip").default(false),
  isSpam: boolean("is_spam").default(false),
  avatar: text("avatar"), // Profile image URL or base64
  socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}), // LinkedIn, Twitter, etc.
  lastContactDate: timestamp("last_contact_date"),
  source: text("source").default("manual"), // "manual", "ios", "android", "import"
  syncSource: text("sync_source"), // "ios", "android", "manual"
  syncId: text("sync_id"), // Original contact ID from device
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Separate table for phone numbers to support multiple numbers per contact
export const contactPhoneNumbers = pgTable("contact_phone_numbers", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id).notNull(),
  phoneNumber: text("phone_number").notNull(),
  type: text("type").default("mobile"), // "mobile", "work", "home", "other"
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact routing rules for call handling
export const contactRoutes = pgTable("contact_routes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id),
  phoneNumber: text("phone_number").notNull(), // Can be contact-specific or general rule
  action: text("action").notNull(), // "ai", "forward", "voicemail", "block"
  forwardTo: text("forward_to"), // Phone number to forward to
  priority: integer("priority").default(1), // Higher priority routes are checked first
  businessHoursOnly: boolean("business_hours_only").default(false),
  active: boolean("active").default(true),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS Messages table for tracking text messages
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  messageSid: text("message_sid").notNull().unique(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  body: text("body_encrypted").notNull(), // AES encrypted message content
  direction: text("direction").notNull(), // "inbound", "outbound"
  status: text("status").notNull(), // "sent", "delivered", "failed", "undelivered"
  dateCreated: timestamp("date_created", { mode: 'date', withTimezone: true }).defaultNow(),
  dateSent: timestamp("date_sent", { mode: 'date', withTimezone: true }),
  dateUpdated: timestamp("date_updated", { mode: 'date', withTimezone: true }),
  numSegments: integer("num_segments").default(1),
  price: text("price"),
  priceUnit: text("price_unit"),
  errorCode: integer("error_code"),
  errorMessage: text("error_message"),
  contactId: integer("contact_id").references(() => contacts.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge Base table
export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull().default("manual"), // "manual", "file", "website", "intent"
  sourceUrl: text("source_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  documentType: text("document_type"),
  tags: text("tags").array(),
  confidence: integer("confidence").default(80),
  isActive: boolean("is_active").default(true),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Ticket Management System
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(), // TICKET-YYYY-MM-DD-XXXXX format
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  callSid: text("call_sid").references(() => calls.callSid),
  contactId: integer("contact_id").references(() => contacts.id),
  
  // Ticket Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // technical, billing, account, product, general
  subcategory: text("subcategory"), // pax_terminal, payment_processing, connectivity, etc.
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent, critical
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed, escalated
  
  // Customer Information
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  
  // AI Processing
  aiAssigned: boolean("ai_assigned").notNull().default(true),
  aiConfidenceScore: numeric("ai_confidence_score", { precision: 5, scale: 2 }),
  aiAnalysis: jsonb("ai_analysis").default({}), // AI analysis results
  detectedKeywords: text("detected_keywords").array(),
  suggestedSolutions: jsonb("suggested_solutions").default([]),
  
  // Resolution Tracking
  resolutionTime: integer("resolution_time"), // in minutes
  escalationLevel: integer("escalation_level").notNull().default(0),
  escalatedTo: text("escalated_to"), // department or agent
  escalationReason: text("escalation_reason"),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: 'date', withTimezone: true }),
  closedAt: timestamp("closed_at", { mode: 'date', withTimezone: true }),
  
  // Satisfaction and Feedback
  satisfactionScore: integer("satisfaction_score"), // 1-5 rating
  customerFeedback: text("customer_feedback"),
  internalNotes: text("internal_notes"),
  
  // Third-party Integration
  externalId: text("external_id"), // External system ticket ID (Zendesk, ServiceNow, etc.)
  externalSystem: text("external_system"), // zendesk, servicenow, jira, etc.
  syncedAt: timestamp("synced_at", { mode: 'date', withTimezone: true }),
  assignedTo: text("assigned_to"), // Agent or team assignment
});

// Ticket Activity Log
export const ticketActivities = pgTable("ticket_activities", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  
  activityType: text("activity_type").notNull(), // status_change, comment, escalation, solution_applied
  description: text("description").notNull(),
  performedBy: text("performed_by").notNull(), // ai_agent, human_agent, system
  agentName: text("agent_name"), // specific agent name
  
  // Activity Details
  oldValue: text("old_value"),
  newValue: text("new_value"),
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Solution Knowledge Base (tracks effective solutions)
export const ticketSolutions = pgTable("ticket_solutions", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  knowledgeBaseId: integer("knowledge_base_id").references(() => knowledgeBase.id),
  
  solutionType: text("solution_type").notNull(), // knowledge_base, ai_generated, manual
  solutionContent: text("solution_content").notNull(),
  effectiveness: text("effectiveness"), // resolved, partially_resolved, not_effective
  
  // Solution Metrics
  applicationTime: integer("application_time"), // minutes to apply solution
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating
  
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Business Intelligence Views
export const ticketMetrics = pgTable("ticket_metrics", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  
  // Time Period
  periodType: text("period_type").notNull(), // daily, weekly, monthly, yearly
  periodStart: timestamp("period_start", { mode: 'date', withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { mode: 'date', withTimezone: true }).notNull(),
  
  // Metrics
  totalTickets: integer("total_tickets").notNull().default(0),
  resolvedTickets: integer("resolved_tickets").notNull().default(0),
  avgResolutionTime: numeric("avg_resolution_time", { precision: 10, scale: 2 }), // minutes
  aiResolvedCount: integer("ai_resolved_count").notNull().default(0),
  humanEscalatedCount: integer("human_escalated_count").notNull().default(0),
  avgSatisfactionScore: numeric("avg_satisfaction_score", { precision: 3, scale: 2 }),
  
  // Category Breakdown
  categoryBreakdown: jsonb("category_breakdown").default({}),
  commonIssues: jsonb("common_issues").default([]),
  
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Database relations
export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(userOrganizations),
  calls: many(calls),
  contacts: many(contacts),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  currentOrganization: one(organizations, {
    fields: [users.currentOrganizationId],
    references: [organizations.id],
  }),
  organizations: many(userOrganizations),
}));

export const userOrganizationRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

export const callRelations = relations(calls, ({ one }) => ({
  organization: one(organizations, {
    fields: [calls.organizationId],
    references: [organizations.id],
  }),
}));

export const contactRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  phoneNumbers: many(contactPhoneNumbers),
}));

export const contactPhoneNumberRelations = relations(contactPhoneNumbers, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactPhoneNumbers.contactId],
    references: [contacts.id],
  }),
}));

export const smsMessageRelations = relations(smsMessages, ({ one }) => ({
  organization: one(organizations, {
    fields: [smsMessages.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [smsMessages.contactId],
    references: [contacts.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  organization: one(organizations, {
    fields: [knowledgeBase.organizationId],
    references: [organizations.id],
  }),
}));

// Schema validation types
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
});

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations);

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactPhoneNumberSchema = createInsertSchema(contactPhoneNumbers).omit({
  id: true,
  createdAt: true,
});

export const insertContactRouteSchema = createInsertSchema(contactRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSMSMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type SMSMessage = typeof smsMessages.$inferSelect;
export type InsertSMSMessage = z.infer<typeof insertSMSMessageSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ContactPhoneNumber = typeof contactPhoneNumbers.$inferSelect;
export type InsertContactPhoneNumber = z.infer<typeof insertContactPhoneNumberSchema>;
export type ContactRoute = typeof contactRoutes.$inferSelect;
export type InsertContactRoute = z.infer<typeof insertContactRouteSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;

// Support Ticket Schemas
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketActivitySchema = createInsertSchema(ticketActivities).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSolutionSchema = createInsertSchema(ticketSolutions).omit({
  id: true,
  createdAt: true,
});

export const insertTicketMetricsSchema = createInsertSchema(ticketMetrics).omit({
  id: true,
  createdAt: true,
});

// Support Ticket Types
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type TicketActivity = typeof ticketActivities.$inferSelect;
export type InsertTicketActivity = z.infer<typeof insertTicketActivitySchema>;
export type TicketSolution = typeof ticketSolutions.$inferSelect;
export type InsertTicketSolution = z.infer<typeof insertTicketSolutionSchema>;
export type TicketMetrics = typeof ticketMetrics.$inferSelect;
export type InsertTicketMetrics = z.infer<typeof insertTicketMetricsSchema>;



// Extended types for UI
export type UserWithOrganizations = User & {
  organizations: (UserOrganization & { organization: Organization })[];
  currentOrganization?: Organization;
};

export type ContactWithPhoneNumbers = Contact & {
  phoneNumbers: ContactPhoneNumber[];
};

// CRM and Sales Management Tables
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  contactId: integer("contact_id").references(() => contacts.id),
  source: text("source"), // "website", "phone", "referral", "social"
  status: text("status").notNull().default("new"), // "new", "contacted", "qualified", "demo_scheduled", "proposal", "negotiation", "closed_won", "closed_lost"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "urgent"
  assignedTo: integer("assigned_to").references(() => users.id),
  estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }),
  probability: integer("probability").default(0), // 0-100
  expectedCloseDate: timestamp("expected_close_date", { mode: 'date' }),
  actualCloseDate: timestamp("actual_close_date", { mode: 'date' }),
  notes: text("notes"),
  tags: text("tags").array().default([]),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const demos = pgTable("demos", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  leadId: integer("lead_id").references(() => leads.id),
  contactId: integer("contact_id").references(() => contacts.id),
  scheduledBy: integer("scheduled_by").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date", { mode: 'date', withTimezone: true }).notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  meetingUrl: text("meeting_url"),
  meetingId: text("meeting_id"),
  meetingPlatform: text("meeting_platform"), // "zoom", "teams", "meet", "webex"
  status: text("status").notNull().default("scheduled"), // "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"
  attendees: jsonb("attendees").default([]), // Array of attendee objects
  calendarEventId: text("calendar_event_id"),
  reminderSent: boolean("reminder_sent").default(false),
  followUpSent: boolean("follow_up_sent").default(false),
  notes: text("notes"),
  outcome: text("outcome"), // "interested", "not_interested", "needs_follow_up", "closed"
  nextSteps: text("next_steps"),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const salesActivities = pgTable("sales_activities", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  leadId: integer("lead_id").references(() => leads.id),
  contactId: integer("contact_id").references(() => contacts.id),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // "call", "email", "meeting", "note", "task", "demo"
  subject: text("subject"),
  description: text("description"),
  status: text("status").default("completed"), // "pending", "completed", "cancelled"
  dueDate: timestamp("due_date", { mode: 'date' }),
  completedAt: timestamp("completed_at", { mode: 'date' }),
  duration: integer("duration"), // minutes
  outcome: text("outcome"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const salesIntegrations = pgTable("sales_integrations", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // "calendar", "crm", "email", "meeting"
  provider: text("provider").notNull(), // "google", "outlook", "salesforce", "hubspot", "zoom", "teams"
  config: jsonb("config").notNull(),
  credentials: jsonb("credentials"), // encrypted
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync", { mode: 'date', withTimezone: true }),
  syncErrors: text("sync_errors").array().default([]),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const salesTemplates = pgTable("sales_templates", {
  id: serial("id").primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // "email", "sms", "calendar_invite"
  subject: text("subject"),
  content: text("content").notNull(),
  variables: text("variables").array().default([]), // Available template variables
  isDefault: boolean("is_default").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Role definitions
export type UserRole = "admin" | "member" | "viewer";

// Permissions mapping
export const rolePermissions = {
  admin: {
    organizations: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    calls: ["read", "create", "update", "delete"],
    contacts: ["read", "create", "update", "delete"],
    settings: ["read", "create", "update", "delete"],
  },
  member: {
    organizations: ["read"],
    users: ["read"],
    calls: ["read", "create", "update"],
    contacts: ["read", "create", "update"],
    settings: ["read"],
  },
  viewer: {
    organizations: ["read"],
    users: ["read"],
    calls: ["read"],
    contacts: ["read"],
    settings: ["read"],
  },
} as const;

// CRM Insert Schemas  
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDemoSchema = createInsertSchema(demos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesActivitySchema = createInsertSchema(salesActivities).omit({
  id: true,
  createdAt: true,
});

export const insertSalesIntegrationSchema = createInsertSchema(salesIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesTemplateSchema = createInsertSchema(salesTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// CRM Types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Demo = typeof demos.$inferSelect;
export type InsertDemo = z.infer<typeof insertDemoSchema>;
export type SalesActivity = typeof salesActivities.$inferSelect;
export type InsertSalesActivity = z.infer<typeof insertSalesActivitySchema>;
export type SalesIntegration = typeof salesIntegrations.$inferSelect;
export type InsertSalesIntegration = z.infer<typeof insertSalesIntegrationSchema>;
export type SalesTemplate = typeof salesTemplates.$inferSelect;
export type InsertSalesTemplate = z.infer<typeof insertSalesTemplateSchema>;

// Extended CRM types for UI
export type LeadWithDetails = Lead & {
  contact?: Contact;
  assignedUser?: User;
  activities: SalesActivity[];
  demos: Demo[];
};

// Todo Categories (like lists in iPhone Reminders)
export const todoCategories = pgTable("todo_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#007AFF"),
  icon: text("icon"),
  order: integer("order").default(0),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Todo Tasks
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  note: text("note"),
  completed: boolean("completed").default(false),
  priority: text("priority").default("none"), // "none", "low", "medium", "high"
  dueDate: timestamp("due_date", { mode: 'date', withTimezone: true }),
  reminderDate: timestamp("reminder_date", { mode: 'date', withTimezone: true }),
  reminderEnabled: boolean("reminder_enabled").default(false),
  categoryId: integer("category_id").references(() => todoCategories.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  completedAt: timestamp("completed_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Todo Insert Schemas
export const insertTodoCategorySchema = createInsertSchema(todoCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Todo Types
export type TodoCategory = typeof todoCategories.$inferSelect;
export type InsertTodoCategory = z.infer<typeof insertTodoCategorySchema>;
export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

// Extended todo types for UI
export type TodoCategoryWithTodos = TodoCategory & {
  todos: Todo[];
  totalCount: number;
  completedCount: number;
};

// AI Assistant Tables

// AI Conversations - Track conversation sessions
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  title: text("title"), // Auto-generated or user-set title
  context: jsonb("context").default({}), // Conversation context and metadata
  summary: text("summary"), // AI-generated conversation summary
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").default(true),
  lastInteractionAt: timestamp("last_interaction_at", { mode: 'date', withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Messages - Individual messages in conversations
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id),
  role: text("role").notNull(), // "user", "assistant", "system"
  content: text("content").notNull(),
  contentType: text("content_type").default("text"), // "text", "voice", "structured"
  voiceTranscription: text("voice_transcription"), // Original voice input if applicable
  structuredData: jsonb("structured_data"), // Structured response data (cards, charts, etc.)
  metadata: jsonb("metadata").default({}), // Additional metadata (execution time, tokens, etc.)
  commandExecuted: text("command_executed"), // Command that was executed
  executionResult: jsonb("execution_result"), // Result of command execution
  confidence: numeric("confidence", { precision: 5, scale: 2 }), // AI confidence score
  feedback: text("feedback"), // User feedback: "helpful", "not_helpful"
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Command Logs - Track all commands executed by AI
export const aiCommandLogs = pgTable("ai_command_logs", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => aiConversations.id),
  messageId: integer("message_id").references(() => aiMessages.id),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  command: text("command").notNull(), // Natural language command
  commandType: text("command_type").notNull(), // "call", "contact", "calendar", "email", "sms", "todo", "analytics"
  intent: text("intent").notNull(), // Detected intent
  parameters: jsonb("parameters").notNull(), // Extracted parameters
  functionCalled: text("function_called"), // Backend function that was called
  status: text("status").notNull().default("success"), // "success", "failed", "partial"
  executionTime: integer("execution_time"), // milliseconds
  errorMessage: text("error_message"),
  result: jsonb("result"), // Command execution result
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI User Preferences - Store user preferences for AI behavior
export const aiUserPreferences = pgTable("ai_user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  preferredModules: text("preferred_modules").array().default([]), // Frequently used modules
  voiceEnabled: boolean("voice_enabled").default(false),
  voiceLanguage: text("voice_language").default("en-US"),
  voiceGender: text("voice_gender").default("female"), // "male", "female", "neutral"
  notificationPreferences: jsonb("notification_preferences").default({}),
  responseStyle: text("response_style").default("balanced"), // "concise", "balanced", "detailed"
  autoExecuteCommands: boolean("auto_execute_commands").default(false), // Auto-execute or ask for confirmation
  learningEnabled: boolean("learning_enabled").default(true), // Allow AI to learn from interactions
  privacyMode: text("privacy_mode").default("normal"), // "strict", "normal", "open"
  customShortcuts: jsonb("custom_shortcuts").default({}), // User-defined command shortcuts
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
}, (table) => ({
  userOrgUnique: unique().on(table.userId, table.organizationId)
}));

// AI Learned Patterns - Store patterns learned from user interactions
export const aiLearnedPatterns = pgTable("ai_learned_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  patternType: text("pattern_type").notNull(), // "command_variation", "frequent_action", "preference", "workflow"
  pattern: text("pattern").notNull(), // The learned pattern
  frequency: integer("frequency").default(1), // How often this pattern occurs
  confidence: numeric("confidence", { precision: 5, scale: 2 }), // Confidence in this pattern
  context: jsonb("context").default({}), // Context where pattern applies
  suggestion: text("suggestion"), // AI suggestion based on this pattern
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Command Knowledge - Dynamic knowledge base of available commands
export const aiCommandKnowledge = pgTable("ai_command_knowledge", {
  id: serial("id").primaryKey(),
  commandType: text("command_type").notNull(), // "call", "contact", "calendar", "email", "sms", "todo", "analytics"
  moduleName: text("module_name").notNull(), // Module this command belongs to
  functionName: text("function_name").notNull(), // Backend function name
  description: text("description").notNull(), // What this command does
  examples: text("examples").array().default([]), // Example natural language commands
  parameters: jsonb("parameters").default([]), // Required and optional parameters
  requiredPermissions: text("required_permissions").array().default([]),
  tags: text("tags").array().default([]),
  usageCount: integer("usage_count").default(0), // Track command popularity
  successRate: numeric("success_rate", { precision: 5, scale: 2 }), // Success rate percentage
  averageExecutionTime: integer("average_execution_time"), // milliseconds
  isActive: boolean("is_active").default(true),
  version: text("version").default("1.0.0"), // For tracking command changes
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Reminders - Smart reminders created by AI
export const aiReminders = pgTable("ai_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  conversationId: integer("conversation_id").references(() => aiConversations.id),
  title: text("title").notNull(),
  description: text("description"),
  reminderType: text("reminder_type").notNull(), // "one_time", "recurring", "contextual"
  reminderTime: timestamp("reminder_time", { mode: 'date', withTimezone: true }).notNull(),
  recurrenceRule: text("recurrence_rule"), // RRULE format for recurring reminders
  context: jsonb("context").default({}), // Contextual information
  priority: text("priority").default("medium"), // "low", "medium", "high"
  channels: text("channels").array().default(["browser"]), // "browser", "sms", "email"
  status: text("status").default("pending"), // "pending", "sent", "completed", "cancelled"
  relatedEntity: text("related_entity"), // Related entity type: "call", "contact", "todo", etc.
  relatedEntityId: integer("related_entity_id"), // ID of related entity
  sentAt: timestamp("sent_at", { mode: 'date', withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { mode: 'date', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// =====================================================
// MULTI-AGENT SYSTEM TABLES
// =====================================================

// AI Agent Roles - Define specialized agent personalities and capabilities
export const aiAgentRoles = pgTable("ai_agent_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "receptionist", "sales", "billing", "support", "personal_assistant"
  displayName: text("display_name").notNull(), // "AI Receptionist", "Sales Agent", etc.
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(), // Base personality and instructions
  capabilities: text("capabilities").array().default([]), // ["schedule_meeting", "lookup_order", "create_ticket"]
  escalationTriggers: text("escalation_triggers").array().default([]), // Keywords/intents that trigger escalation
  confidenceThreshold: integer("confidence_threshold").default(90), // Min confidence before escalating
  maxTurns: integer("max_turns").default(10), // Max conversation turns before human handoff
  voiceId: text("voice_id"), // Reference to voice configuration
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Routing priority
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Knowledge Packs - Role-specific knowledge content
export const aiKnowledgePacks = pgTable("ai_knowledge_packs", {
  id: serial("id").primaryKey(),
  agentRoleId: integer("agent_role_id").references(() => aiAgentRoles.id),
  name: text("name").notNull(), // "Product Catalog", "Billing Policies", "Support Runbooks"
  category: text("category").notNull(), // "products", "policies", "procedures", "faqs"
  content: text("content").notNull(), // The actual knowledge content
  metadata: jsonb("metadata").default({}), // Additional structured data
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'date', withTimezone: true }),
  sourceType: text("source_type").default("manual"), // "manual", "notion", "google_docs", "api"
  sourceUrl: text("source_url"),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Conversation States - Track multi-agent conversation flow
export const aiConversationStates = pgTable("ai_conversation_states", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => aiConversations.id),
  callSid: text("call_sid"), // For phone conversations
  currentAgentRole: text("current_agent_role").notNull(), // Current handling agent
  previousAgentRoles: text("previous_agent_roles").array().default([]), // Agent handoff history
  intentHistory: jsonb("intent_history").default([]), // Detected intents throughout conversation
  extractedEntities: jsonb("extracted_entities").default({}), // Names, phone numbers, order IDs, etc.
  contextMemory: jsonb("context_memory").default({}), // Persistent context across agent handoffs
  sentimentScore: integer("sentiment_score"), // -100 to 100
  escalationStatus: text("escalation_status").default("none"), // "none", "pending", "escalated", "resolved"
  escalationReason: text("escalation_reason"),
  turnCount: integer("turn_count").default(0),
  confidenceHistory: jsonb("confidence_history").default([]), // Array of confidence scores per turn
  isActive: boolean("is_active").default(true),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// AI Voice Configurations - Voice synthesis settings per agent
export const aiVoiceConfigs = pgTable("ai_voice_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Professional Female", "Friendly Male", etc.
  provider: text("provider").notNull(), // "openai_realtime", "elevenlabs", "cartesia", "twilio", "nvidia_personaplex"
  voiceId: text("voice_id").notNull(), // Provider-specific voice ID
  settings: jsonb("settings").default({}), // Speed, pitch, emotion settings
  fallbackProvider: text("fallback_provider"), // Backup if primary fails
  fallbackVoiceId: text("fallback_voice_id"),
  latencyTarget: integer("latency_target").default(200), // Target latency in ms
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Agent Intent Mappings - Map intents to agent capabilities
export const aiIntentMappings = pgTable("ai_intent_mappings", {
  id: serial("id").primaryKey(),
  intent: text("intent").notNull(), // "schedule_appointment", "billing_inquiry", "product_question"
  agentRoleId: integer("agent_role_id").notNull().references(() => aiAgentRoles.id),
  priority: integer("priority").default(1), // For conflict resolution
  requiredEntities: text("required_entities").array().default([]), // Entities needed for this intent
  responseTemplate: text("response_template"), // Optional template for responses
  isActive: boolean("is_active").default(true),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

// Relations
export const aiConversationRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiConversations.organizationId],
    references: [organizations.id],
  }),
  messages: many(aiMessages),
  commandLogs: many(aiCommandLogs),
}));

export const aiMessageRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const aiCommandLogRelations = relations(aiCommandLogs, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiCommandLogs.conversationId],
    references: [aiConversations.id],
  }),
  message: one(aiMessages, {
    fields: [aiCommandLogs.messageId],
    references: [aiMessages.id],
  }),
  user: one(users, {
    fields: [aiCommandLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiCommandLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const aiUserPreferencesRelations = relations(aiUserPreferences, ({ one }) => ({
  user: one(users, {
    fields: [aiUserPreferences.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiUserPreferences.organizationId],
    references: [organizations.id],
  }),
}));

export const aiLearnedPatternRelations = relations(aiLearnedPatterns, ({ one }) => ({
  user: one(users, {
    fields: [aiLearnedPatterns.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiLearnedPatterns.organizationId],
    references: [organizations.id],
  }),
}));

export const aiReminderRelations = relations(aiReminders, ({ one }) => ({
  user: one(users, {
    fields: [aiReminders.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [aiReminders.organizationId],
    references: [organizations.id],
  }),
  conversation: one(aiConversations, {
    fields: [aiReminders.conversationId],
    references: [aiConversations.id],
  }),
}));

// Insert Schemas
export const insertAIConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAICommandLogSchema = createInsertSchema(aiCommandLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAIUserPreferencesSchema = createInsertSchema(aiUserPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAILearnedPatternSchema = createInsertSchema(aiLearnedPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAICommandKnowledgeSchema = createInsertSchema(aiCommandKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIReminderSchema = createInsertSchema(aiReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Multi-Agent System Insert Schemas
export const insertAIAgentRoleSchema = createInsertSchema(aiAgentRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIKnowledgePackSchema = createInsertSchema(aiKnowledgePacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIConversationStateSchema = createInsertSchema(aiConversationStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIVoiceConfigSchema = createInsertSchema(aiVoiceConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIIntentMappingSchema = createInsertSchema(aiIntentMappings).omit({
  id: true,
  createdAt: true,
});

// Types
export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertAIMessage = z.infer<typeof insertAIMessageSchema>;
export type AICommandLog = typeof aiCommandLogs.$inferSelect;
export type InsertAICommandLog = z.infer<typeof insertAICommandLogSchema>;
export type AIUserPreferences = typeof aiUserPreferences.$inferSelect;
export type InsertAIUserPreferences = z.infer<typeof insertAIUserPreferencesSchema>;
export type AILearnedPattern = typeof aiLearnedPatterns.$inferSelect;
export type InsertAILearnedPattern = z.infer<typeof insertAILearnedPatternSchema>;
export type AICommandKnowledge = typeof aiCommandKnowledge.$inferSelect;
export type InsertAICommandKnowledge = z.infer<typeof insertAICommandKnowledgeSchema>;
export type AIReminder = typeof aiReminders.$inferSelect;
export type InsertAIReminder = z.infer<typeof insertAIReminderSchema>;

// Push notification subscriptions (persisted — replaces in-memory Map)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),       // public key
  auth: text("auth").notNull(),             // auth secret
  userAgent: text("user_agent"),            // device info for debugging
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp("last_used_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions);
export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Persisted notifications (replaces stubbed storage methods)
export const persistedNotifications = pgTable("persisted_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id),
  type: text("type").notNull(),             // missed_call, voicemail, sms, system
  title: text("title").notNull(),
  body: text("body"),
  data: jsonb("data").default({}),          // { callId, callerId, url, ... }
  isRead: boolean("is_read").notNull().default(false),
  pushSent: boolean("push_sent").notNull().default(false),
  createdAt: timestamp("created_at", { mode: 'date', withTimezone: true }).defaultNow(),
});

export const insertPersistedNotificationSchema = createInsertSchema(persistedNotifications);
export type PersistedNotification = typeof persistedNotifications.$inferSelect;
export type InsertPersistedNotification = z.infer<typeof insertPersistedNotificationSchema>;

// Extended types for UI
export type AIConversationWithMessages = AIConversation & {
  messages: AIMessage[];
};

export type AIMessageWithCommand = AIMessage & {
  commandLog?: AICommandLog;
};

// Multi-Agent System Types
export type AIAgentRole = typeof aiAgentRoles.$inferSelect;
export type InsertAIAgentRole = z.infer<typeof insertAIAgentRoleSchema>;
export type AIKnowledgePack = typeof aiKnowledgePacks.$inferSelect;
export type InsertAIKnowledgePack = z.infer<typeof insertAIKnowledgePackSchema>;
export type AIConversationState = typeof aiConversationStates.$inferSelect;
export type InsertAIConversationState = z.infer<typeof insertAIConversationStateSchema>;
export type AIVoiceConfig = typeof aiVoiceConfigs.$inferSelect;
export type InsertAIVoiceConfig = z.infer<typeof insertAIVoiceConfigSchema>;
export type AIIntentMapping = typeof aiIntentMappings.$inferSelect;
export type InsertAIIntentMapping = z.infer<typeof insertAIIntentMappingSchema>;

// Voice Provider Type
export type VoiceProvider = "openai_realtime" | "elevenlabs" | "cartesia" | "twilio";

// Agent Role Type
export type AgentRoleName = "receptionist" | "sales" | "billing" | "support" | "personal_assistant";