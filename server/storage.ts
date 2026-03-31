import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { 
  users, calls, contacts, contactPhoneNumbers, contactRoutes, organizations, userOrganizations, smsMessages, knowledgeBase,
  todoCategories, todos,
  aiConversations, aiMessages, aiCommandLogs, aiUserPreferences, aiReminders,
  type User, type InsertUser, type Call, type InsertCall, 
  type Contact, type InsertContact, type ContactPhoneNumber, type InsertContactPhoneNumber,
  type ContactRoute, type InsertContactRoute,
  type Organization, type InsertOrganization, type UserOrganization, type InsertUserOrganization,
  type UserWithOrganizations, type ContactWithPhoneNumbers, type SMSMessage, type InsertSMSMessage,
  type TodoCategory, type InsertTodoCategory, type Todo, type InsertTodo, type TodoCategoryWithTodos,
  type AIConversation, type InsertAIConversation, type AIMessage, type InsertAIMessage,
  type AICommandLog, type InsertAICommandLog, type AIUserPreferences, type InsertAIUserPreferences,
  type AIReminder, type InsertAIReminder
} from "@shared/schema";
import { contactEncryption } from './encryption';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithOrganizations(id: number): Promise<UserWithOrganizations | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(insertOrg: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;
  
  // User-Organization operations
  addUserToOrganization(data: InsertUserOrganization): Promise<UserOrganization>;
  getUserOrganizations(userId: number): Promise<(UserOrganization & { organization: Organization })[]>;
  getOrganizationMembers(orgId: string): Promise<UserWithOrganizations[]>;
  
  // Call operations
  getCalls(organizationId?: string): Promise<Call[]>;
  getRecentCalls(limit: number): Promise<Call[]>;
  getCall(id: number): Promise<Call | undefined>;
  getCallsByPhone(phoneNumber: string, organizationId?: string): Promise<Call[]>;
  createCall(insertCall: InsertCall): Promise<Call>;
  updateCall(id: number, data: Partial<InsertCall>): Promise<Call>;
  
  // Contact operations
  getContacts(organizationId?: string): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactWithPhoneNumbers(id: number): Promise<ContactWithPhoneNumbers | undefined>;
  createContact(insertContact: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
  
  // Contact phone number operations
  addContactPhoneNumber(data: InsertContactPhoneNumber): Promise<ContactPhoneNumber>;
  deleteContactPhoneNumber(id: number): Promise<void>;
  
  // SMS operations
  getSMSMessages(organizationId?: string): Promise<SMSMessage[]>;
  getSMSMessagesByContact(contactId: number): Promise<SMSMessage[]>;
  getSMSMessagesByPhone(phoneNumber: string, organizationId?: string): Promise<SMSMessage[]>;
  createSMSMessage(insertSMS: InsertSMSMessage): Promise<SMSMessage>;
  updateSMSMessage(id: number, data: Partial<InsertSMSMessage>): Promise<SMSMessage>;
  
  // Onboarding operations
  getOnboardingProgress(email: string): Promise<any>;
  updateOnboardingProgress(email: string, step: string, data?: any): Promise<void>;
  saveTwilioCredentials(organizationId: string, credentials: any): Promise<void>;
  
  // Knowledge base operations
  searchKnowledgeBase(query: string, limit?: number): Promise<any[]>;
  createKnowledgeEntry(entry: any): Promise<any>;
  updateKnowledgeEntry(id: number, data: any): Promise<any>;
  deleteKnowledgeEntry(id: number): Promise<void>;
  
  // Todo Category operations
  getTodoCategories(userId: number, organizationId?: string): Promise<TodoCategory[]>;
  getTodoCategoriesWithTodos(userId: number, organizationId?: string): Promise<TodoCategoryWithTodos[]>;
  getTodoCategory(id: number): Promise<TodoCategory | undefined>;
  createTodoCategory(insertCategory: InsertTodoCategory): Promise<TodoCategory>;
  updateTodoCategory(id: number, data: Partial<InsertTodoCategory>): Promise<TodoCategory>;
  deleteTodoCategory(id: number): Promise<void>;
  
  // Todo operations
  getTodos(userId: number, organizationId?: string, categoryId?: number): Promise<Todo[]>;
  getTodo(id: number): Promise<Todo | undefined>;
  createTodo(insertTodo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, data: Partial<InsertTodo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
  
  // AI Assistant Conversation operations
  getAIConversations(userId: number, organizationId?: string): Promise<AIConversation[]>;
  getAIConversation(id: number): Promise<AIConversation | undefined>;
  createAIConversation(insertConversation: InsertAIConversation): Promise<AIConversation>;
  updateAIConversation(id: number, data: Partial<InsertAIConversation>): Promise<AIConversation>;
  
  // AI Assistant Message operations
  getAIMessages(conversationId: number): Promise<AIMessage[]>;
  getAIMessage(id: number): Promise<AIMessage | undefined>;
  createAIMessage(insertMessage: InsertAIMessage): Promise<AIMessage>;
  
  // AI Command Log operations
  getAICommandLogs(userId?: number, organizationId?: string): Promise<AICommandLog[]>;
  createAICommandLog(insertLog: InsertAICommandLog): Promise<AICommandLog>;
  
  // AI User Preferences operations
  getAIUserPreferences(userId: number, organizationId: string): Promise<AIUserPreferences | null>;
  createAIUserPreferences(insertPreferences: InsertAIUserPreferences): Promise<AIUserPreferences>;
  updateAIUserPreferences(userId: number, organizationId: string, data: Partial<InsertAIUserPreferences>): Promise<AIUserPreferences>;
  
  // AI Reminder operations
  getAIReminders(userId: number, organizationId?: string): Promise<AIReminder[]>;
  createAIReminder(insertReminder: InsertAIReminder): Promise<AIReminder>;
  updateAIReminder(id: number, data: Partial<InsertAIReminder>): Promise<AIReminder>;
  
  // Multi-Agent System operations
  getAgentRoles(organizationId: string): Promise<any[]>;
  getAgentRole(id: number): Promise<any | null>;
  createAgentRole(data: any): Promise<any>;
  updateAgentRole(id: number, data: any): Promise<any>;
  
  getKnowledgePacks(organizationId: string, agentRoleId?: number): Promise<any[]>;
  createKnowledgePack(data: any): Promise<any>;
  
  getConversationState(id: number): Promise<any | null>;
  getConversationStateByCallSid(callSid: string): Promise<any | null>;
  createConversationState(data: any): Promise<any>;
  updateConversationState(id: number, data: any): Promise<any | null>;
  
  getVoiceConfigs(organizationId: string): Promise<any[]>;
  getDefaultVoiceConfig(organizationId: string): Promise<any | null>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to decrypt contact data from database
  private decryptContactData(dbContact: any): Contact {
    if (!dbContact) return dbContact;
    
    try {
      // Decrypt encrypted fields
      const decryptedContact = {
        ...dbContact,
        firstName: dbContact.firstName ? contactEncryption.decrypt(dbContact.firstName) : null,
        lastName: dbContact.lastName ? contactEncryption.decrypt(dbContact.lastName) : null,
        displayName: dbContact.displayName ? contactEncryption.decrypt(dbContact.displayName) : null,
        email: dbContact.email ? contactEncryption.decrypt(dbContact.email) : null,
        phoneNumbers: dbContact.phoneNumbers ? JSON.parse(contactEncryption.decrypt(dbContact.phoneNumbers)) : [],
        address: dbContact.address ? contactEncryption.decrypt(dbContact.address) : null,
        notes: dbContact.notes ? contactEncryption.decrypt(dbContact.notes) : null,
      };
      
      return decryptedContact;
    } catch (error) {
      console.error('Error decrypting contact data:', error);
      // Return contact with empty sensitive fields rather than failing completely
      return {
        ...dbContact,
        firstName: null,
        lastName: null,
        displayName: null,
        email: null,
        phoneNumbers: [],
        address: null,
        notes: null,
      };
    }
  }

  // Helper function to encrypt contact data for database storage
  private encryptContactData(contactData: any): any {
    if (!contactData) return contactData;
    
    const encryptedContact = { ...contactData };
    
    // Encrypt sensitive fields
    if (contactData.firstName) {
      encryptedContact.firstName = contactEncryption.encrypt(contactData.firstName);
    }
    if (contactData.lastName) {
      encryptedContact.lastName = contactEncryption.encrypt(contactData.lastName);
    }
    if (contactData.displayName) {
      encryptedContact.displayName = contactEncryption.encrypt(contactData.displayName);
    }
    if (contactData.email) {
      encryptedContact.email = contactEncryption.encrypt(contactData.email);
    }
    if (contactData.phoneNumbers) {
      // Handle phoneNumbers as array - convert to JSON string before encrypting
      const phoneNumbersStr = Array.isArray(contactData.phoneNumbers) 
        ? JSON.stringify(contactData.phoneNumbers) 
        : contactData.phoneNumbers;
      encryptedContact.phoneNumbers = contactEncryption.encrypt(phoneNumbersStr);
    }
    if (contactData.address) {
      encryptedContact.address = contactEncryption.encrypt(contactData.address);
    }
    if (contactData.notes) {
      encryptedContact.notes = contactEncryption.encrypt(contactData.notes);
    }
    
    return encryptedContact;
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithOrganizations(id: number): Promise<UserWithOrganizations | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const userOrgs = await db
      .select()
      .from(userOrganizations)
      .leftJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.userId, id));

    return {
      ...user,
      organizations: userOrgs.map(row => ({
        ...row.user_organizations!,
        organization: row.organizations!,
      })),
      currentOrganization: user.currentOrganizationId 
        ? await this.getOrganization(user.currentOrganizationId) 
        : undefined,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(insertOrg)
      .returning();
    return org;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // User-Organization operations
  async addUserToOrganization(data: InsertUserOrganization): Promise<UserOrganization> {
    const [userOrg] = await db
      .insert(userOrganizations)
      .values(data)
      .returning();
    return userOrg;
  }

  async getUserOrganizations(userId: number): Promise<(UserOrganization & { organization: Organization })[]> {
    const userOrgs = await db
      .select()
      .from(userOrganizations)
      .leftJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.userId, userId));

    return userOrgs.map(row => ({
      ...row.user_organizations!,
      organization: row.organizations!,
    }));
  }

  async getOrganizationMembers(orgId: string): Promise<UserWithOrganizations[]> {
    const members = await db
      .select()
      .from(userOrganizations)
      .leftJoin(users, eq(userOrganizations.userId, users.id))
      .where(eq(userOrganizations.organizationId, orgId));

    if (members.length === 0) return [];

    // Get all user IDs to batch query user organizations
    const userIds = members.map(row => row.users?.id).filter(Boolean) as number[];
    
    // Batch query all user organizations to avoid N+1 problem
    const allUserOrgs = await db
      .select()
      .from(userOrganizations)
      .leftJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(inArray(userOrganizations.userId, userIds));

    // Group user organizations by user ID
    const userOrgsMap = new Map<number, (UserOrganization & { organization: Organization })[]>();
    allUserOrgs.forEach(row => {
      if (row.user_organizations && row.organizations) {
        const userId = row.user_organizations.userId;
        if (!userOrgsMap.has(userId)) {
          userOrgsMap.set(userId, []);
        }
        userOrgsMap.get(userId)!.push({
          ...row.user_organizations,
          organization: row.organizations,
        });
      }
    });

    // Get unique organization IDs for current organizations
    const currentOrgIds = Array.from(new Set(
      members
        .map(row => row.users?.currentOrganizationId)
        .filter((id): id is string => Boolean(id))
    ));
    
    // Batch query current organizations to avoid N+1 problem
    const currentOrgs = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, currentOrgIds));

    const currentOrgsMap = new Map(currentOrgs.map(org => [org.id, org]));

    // Build result without additional queries
    const memberUsers: UserWithOrganizations[] = [];
    
    for (const row of members) {
      if (row.users) {
        memberUsers.push({
          ...row.users,
          organizations: userOrgsMap.get(row.users.id) || [],
          currentOrganization: row.users.currentOrganizationId 
            ? currentOrgsMap.get(row.users.currentOrganizationId)
            : undefined,
        });
      }
    }

    return memberUsers;
  }

  // Call operations
  async getCalls(organizationId?: string): Promise<Call[]> {
    const query = db.select().from(calls);
    
    if (organizationId) {
      return await query.where(eq(calls.organizationId, organizationId)).orderBy(desc(calls.startTime));
    }
    
    return await query.orderBy(desc(calls.startTime));
  }

  async getRecentCalls(limit: number = 10): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.startTime)).limit(limit);
  }

  async getCall(id: number): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async getCallsByPhone(phoneNumber: string, organizationId?: string): Promise<Call[]> {
    // Get calls where the phone number is either the 'from' or 'to' field
    if (organizationId) {
      return await db.select().from(calls)
        .where(and(
          eq(calls.organizationId, organizationId),
          or(eq(calls.from, phoneNumber), eq(calls.to, phoneNumber))
        ))
        .orderBy(desc(calls.startTime));
    }
    
    return await db.select().from(calls)
      .where(or(eq(calls.from, phoneNumber), eq(calls.to, phoneNumber)))
      .orderBy(desc(calls.startTime));
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values(insertCall)
      .returning();
    return call;
  }

  async updateCall(id: number, data: Partial<InsertCall>): Promise<Call> {
    const [call] = await db
      .update(calls)
      .set(data)
      .where(eq(calls.id, id))
      .returning();
    return call;
  }

  // Contact operations
  async getContacts(organizationId?: string): Promise<Contact[]> {
    const query = db.select().from(contacts);
    
    let result;
    if (organizationId) {
      result = await query.where(eq(contacts.organizationId, organizationId)).orderBy(desc(contacts.createdAt));
    } else {
      result = await query.orderBy(desc(contacts.createdAt));
    }
    
    return result.map(contact => this.decryptContactData(contact));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact ? this.decryptContactData(contact) : undefined;
  }

  async getContactWithPhoneNumbers(id: number): Promise<ContactWithPhoneNumbers | undefined> {
    const contact = await this.getContact(id);
    if (!contact) return undefined;

    const phoneNumbers = await db
      .select()
      .from(contactPhoneNumbers)
      .where(eq(contactPhoneNumbers.contactId, id));

    return {
      ...contact,
      phoneNumbers,
    };
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const encryptedData = this.encryptContactData(insertContact);
    const [contact] = await db
      .insert(contacts)
      .values(encryptedData)
      .returning();
    return this.decryptContactData(contact);
  }

  async updateContact(id: number, data: Partial<InsertContact>): Promise<Contact> {
    const encryptedData = this.encryptContactData(data);
    const [contact] = await db
      .update(contacts)
      .set({ ...encryptedData, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return this.decryptContactData(contact);
  }

  async deleteContact(id: number): Promise<void> {
    // First delete all phone numbers
    await db.delete(contactPhoneNumbers).where(eq(contactPhoneNumbers.contactId, id));
    // Then delete the contact
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Contact phone number operations
  async addContactPhoneNumber(data: InsertContactPhoneNumber): Promise<ContactPhoneNumber> {
    const [phoneNumber] = await db
      .insert(contactPhoneNumbers)
      .values(data)
      .returning();
    return phoneNumber;
  }

  async deleteContactPhoneNumber(id: number): Promise<void> {
    await db.delete(contactPhoneNumbers).where(eq(contactPhoneNumbers.id, id));
  }

  // SMS operations
  async getSMSMessages(organizationId?: string): Promise<SMSMessage[]> {
    const query = db.select().from(smsMessages);
    
    if (organizationId) {
      return await query.where(eq(smsMessages.organizationId, organizationId)).orderBy(desc(smsMessages.dateCreated));
    }
    
    return await query.orderBy(desc(smsMessages.dateCreated));
  }

  async getSMSMessagesByContact(contactId: number): Promise<SMSMessage[]> {
    return await db.select().from(smsMessages)
      .where(eq(smsMessages.contactId, contactId))
      .orderBy(desc(smsMessages.dateCreated));
  }

  async getSMSMessagesByPhone(phoneNumber: string, organizationId?: string): Promise<SMSMessage[]> {
    let conditions = or(
      eq(smsMessages.from, phoneNumber), 
      eq(smsMessages.to, phoneNumber)
    );
    
    if (organizationId) {
      conditions = and(
        eq(smsMessages.organizationId, organizationId),
        or(
          eq(smsMessages.from, phoneNumber), 
          eq(smsMessages.to, phoneNumber)
        )
      );
    }
    
    return await db.select().from(smsMessages)
      .where(conditions)
      .orderBy(desc(smsMessages.dateCreated));
  }

  async createSMSMessage(insertSMS: InsertSMSMessage): Promise<SMSMessage> {
    const [smsMessage] = await db
      .insert(smsMessages)
      .values(insertSMS)
      .returning();
    return smsMessage;
  }

  async updateSMSMessage(id: number, data: Partial<InsertSMSMessage>): Promise<SMSMessage> {
    const [smsMessage] = await db
      .update(smsMessages)
      .set(data)
      .where(eq(smsMessages.id, id))
      .returning();
    return smsMessage;
  }

  // Voicemail operations
  async getVoicemails(organizationId?: string): Promise<any[]> {
    // Implementation for voicemail retrieval
    return [];
  }

  async createVoicemail(data: any): Promise<any> {
    // Implementation for voicemail creation
    return {};
  }

  // Notification operations
  async getNotifications(organizationId?: string): Promise<any[]> {
    // Implementation for notification retrieval
    return [];
  }

  async updateNotification(id: string, data: any): Promise<any> {
    // Implementation for notification update
    return {};
  }

  async deleteNotification(id: string): Promise<void> {
    // Implementation for notification deletion
  }

  // Call route operations
  async getCallRoutes(organizationId?: string): Promise<any[]> {
    // Implementation for call routes
    return [];
  }

  async createCallRoute(data: any): Promise<any> {
    // Implementation for call route creation
    return {};
  }

  async updateCallRoute(id: string, data: any): Promise<any> {
    // Implementation for call route update
    return {};
  }

  // Knowledge base operations
  async getKnowledgeBase(organizationId?: string): Promise<any[]> {
    // Implementation for knowledge base
    return [];
  }

  async createKnowledgeBase(data: any): Promise<any> {
    // Implementation for knowledge base creation
    return {};
  }

  async updateKnowledgeBase(id: string, data: any): Promise<any> {
    // Implementation for knowledge base update
    return {};
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    // Implementation for knowledge base deletion
  }

  // Conversation operations
  async getConversationLogs(organizationId?: string): Promise<any[]> {
    // Implementation for conversation logs
    return [];
  }

  async getConversationLogsByCall(callId: string): Promise<any[]> {
    // Implementation for call-specific conversation logs
    return [];
  }

  // AI operations
  async getAiResponseEvaluations(organizationId?: string): Promise<any[]> {
    // Implementation for AI response evaluations
    return [];
  }

  async getAiConfig(organizationId?: string): Promise<any> {
    // Implementation for AI configuration
    return {};
  }

  async upsertAiConfig(data: any): Promise<any> {
    // Implementation for AI config upsert
    return {};
  }

  // Contact lookup operations
  async getContactByPhone(phoneNumber: string, organizationId?: string): Promise<Contact | undefined> {
    const conditions = [eq(contactPhoneNumbers.phoneNumber, phoneNumber)];
    
    if (organizationId) {
      conditions.push(eq(contacts.organizationId, organizationId));
    }
    
    const query = db.select().from(contacts)
      .leftJoin(contactPhoneNumbers, eq(contacts.id, contactPhoneNumbers.contactId))
      .where(and(...conditions));
    
    const [result] = await query;
    return result?.contacts ? this.decryptContactData(result.contacts) : undefined;
  }

  async getCallBySid(sid: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.callSid, sid));
    return call;
  }

  // Contact route operations
  async getContactRoutes(organizationId?: string): Promise<ContactRoute[]> {
    let query = db.select().from(contactRoutes);
    
    if (organizationId) {
      query = query.where(eq(contactRoutes.organizationId, organizationId));
    }
    
    return await query.orderBy(desc(contactRoutes.priority));
  }

  async createContactRoute(data: InsertContactRoute): Promise<ContactRoute> {
    const [route] = await db.insert(contactRoutes).values(data).returning();
    return route;
  }

  async updateContactRoute(id: number, data: Partial<InsertContactRoute>): Promise<ContactRoute> {
    const [route] = await db.update(contactRoutes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contactRoutes.id, id))
      .returning();
    return route;
  }

  async deleteContactRoute(id: number): Promise<void> {
    await db.delete(contactRoutes).where(eq(contactRoutes.id, id));
  }

  async getContactRoutesForPhone(phoneNumber: string, organizationId?: string): Promise<ContactRoute[]> {
    const conditions = [
      eq(contactRoutes.phoneNumber, phoneNumber),
      eq(contactRoutes.active, true)
    ];
    
    if (organizationId) {
      conditions.push(eq(contactRoutes.organizationId, organizationId));
    }
    
    const query = db.select().from(contactRoutes)
      .where(and(...conditions));
    
    return await query.orderBy(desc(contactRoutes.priority));
  }

  // Contact-specific data operations
  async getContactCalls(contactId: number, organizationId?: string): Promise<Call[]> {
    const query = db.select().from(calls).where(eq(calls.contactId, contactId));
    
    if (organizationId) {
      query.where(eq(calls.organizationId, organizationId));
    }
    
    return await query.orderBy(desc(calls.startTime));
  }

  async getContactVoicemails(contactId: number, organizationId?: string): Promise<any[]> {
    // Implementation for contact-specific voicemails
    return [];
  }

  // Device sync operations
  async getDeviceSync(deviceId: string): Promise<any> {
    // Implementation for device sync
    return {};
  }

  async createDeviceSync(data: any): Promise<any> {
    // Implementation for device sync creation
    return {};
  }

  async syncContacts(deviceId: string, contacts: any[]): Promise<any> {
    // Implementation for contact synchronization
    return {};
  }

  // Call flow operations
  async getCallFlowConfigs(organizationId?: string): Promise<any[]> {
    // Implementation for call flow configs
    return [];
  }

  async createCallFlowConfig(data: any): Promise<any> {
    // Implementation for call flow config creation
    return {};
  }

  async updateCallFlowConfig(id: string, data: any): Promise<any> {
    // Implementation for call flow config update
    return {};
  }

  async deleteCallFlowConfig(id: string): Promise<void> {
    // Implementation for call flow config deletion
  }

  // Greeting template operations
  async getGreetingTemplates(organizationId?: string): Promise<any[]> {
    // Implementation for greeting templates
    return [];
  }

  // Onboarding operations
  async getOnboardingProgress(email: string): Promise<any> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, email),
      });

      if (!user) {
        return null;
      }

      // Check if user has completed onboarding
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, user.organizationId || ''),
      });

      if (!organization) {
        return {
          currentStep: 0,
          completedSteps: [],
          setupComplete: false
        };
      }

      // Simple check for setup completion
      const hasCredentials = organization.twilioAccountSid && organization.twilioAuthToken && organization.twilioPhoneNumber;
      const hasAiConfig = organization.businessName;

      const completedSteps = [];
      if (hasCredentials) {
        completedSteps.push('welcome', 'requirements', 'twilio-account', 'twilio-integration');
      }
      if (hasAiConfig) {
        completedSteps.push('ai-configuration');
      }

      return {
        currentStep: completedSteps.length,
        completedSteps,
        setupComplete: hasCredentials && hasAiConfig,
        twilioCredentials: hasCredentials ? {
          accountSid: organization.twilioAccountSid,
          authToken: organization.twilioAuthToken,
          phoneNumber: organization.twilioPhoneNumber
        } : undefined,
        aiConfig: hasAiConfig ? {
          businessName: organization.businessName,
          businessDescription: organization.businessDescription || '',
          services: organization.services || []
        } : undefined
      };
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return null;
    }
  }

  async updateOnboardingProgress(email: string, step: string, data?: any): Promise<void> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.username, email),
      });

      if (!user || !user.organizationId) {
        throw new Error('User or organization not found');
      }

      // Update organization with onboarding data
      const updateData: any = {};
      
      if (step === 'ai-configuration' && data) {
        updateData.businessName = data.businessName;
        updateData.businessDescription = data.businessDescription;
        updateData.services = data.services;
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(organizations)
          .set(updateData)
          .where(eq(organizations.id, user.organizationId));
      }
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      throw error;
    }
  }

  async saveTwilioCredentials(organizationId: string, credentials: any): Promise<void> {
    try {
      await db.update(organizations)
        .set({
          twilioAccountSid: credentials.accountSid,
          twilioAuthToken: credentials.authToken,
          twilioPhoneNumber: credentials.phoneNumber
        })
        .where(eq(organizations.id, organizationId));
    } catch (error) {
      console.error('Error saving Twilio credentials:', error);
      throw error;
    }
  }

  // Knowledge base operations
  async searchKnowledgeBase(query: string, limit: number = 5): Promise<any[]> {
    try {
      // Use direct SQL query to avoid complex parameter binding issues
      const searchPattern = `%${query.toLowerCase()}%`;
      const result = await pool.query(`
        SELECT * FROM knowledge_base 
        WHERE is_active = true 
        AND (
          LOWER(title) LIKE $1 
          OR LOWER(content) LIKE $1 
          OR array_to_string(tags, ' ') ILIKE $1
        )
        ORDER BY confidence DESC 
        LIMIT $2
      `, [searchPattern, limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  async createKnowledgeEntry(entry: any): Promise<any> {
    try {
      const [newEntry] = await db.insert(knowledgeBase)
        .values(entry)
        .returning();
      return newEntry;
    } catch (error) {
      console.error('Error creating knowledge entry:', error);
      throw error;
    }
  }

  async updateKnowledgeEntry(id: number, data: any): Promise<any> {
    try {
      const [updated] = await db.update(knowledgeBase)
        .set(data)
        .where(eq(knowledgeBase.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating knowledge entry:', error);
      throw error;
    }
  }

  async deleteKnowledgeEntry(id: number): Promise<void> {
    try {
      await db.delete(knowledgeBase)
        .where(eq(knowledgeBase.id, id));
    } catch (error) {
      console.error('Error deleting knowledge entry:', error);
      throw error;
    }
  }

  // Todo Category operations
  async getTodoCategories(userId: number, organizationId?: string): Promise<TodoCategory[]> {
    try {
      const conditions = [eq(todoCategories.userId, userId)];
      if (organizationId) {
        conditions.push(eq(todoCategories.organizationId, organizationId));
      }
      
      const categories = await db.select()
        .from(todoCategories)
        .where(and(...conditions))
        .orderBy(todoCategories.order);
      
      return categories;
    } catch (error) {
      console.error('Error getting todo categories:', error);
      throw error;
    }
  }

  async getTodoCategoriesWithTodos(userId: number, organizationId?: string): Promise<TodoCategoryWithTodos[]> {
    try {
      const categories = await this.getTodoCategories(userId, organizationId);
      
      const categoriesWithTodos = await Promise.all(
        categories.map(async (category) => {
          const categoryTodos = await this.getTodos(userId, organizationId, category.id);
          const completedCount = categoryTodos.filter(t => t.completed).length;
          
          return {
            ...category,
            todos: categoryTodos,
            totalCount: categoryTodos.length,
            completedCount
          };
        })
      );
      
      return categoriesWithTodos;
    } catch (error) {
      console.error('Error getting categories with todos:', error);
      throw error;
    }
  }

  async getTodoCategory(id: number): Promise<TodoCategory | undefined> {
    try {
      const [category] = await db.select()
        .from(todoCategories)
        .where(eq(todoCategories.id, id))
        .limit(1);
      
      return category;
    } catch (error) {
      console.error('Error getting todo category:', error);
      throw error;
    }
  }

  async createTodoCategory(insertCategory: InsertTodoCategory): Promise<TodoCategory> {
    try {
      const [category] = await db.insert(todoCategories)
        .values(insertCategory)
        .returning();
      
      return category;
    } catch (error) {
      console.error('Error creating todo category:', error);
      throw error;
    }
  }

  async updateTodoCategory(id: number, data: Partial<InsertTodoCategory>): Promise<TodoCategory> {
    try {
      const [updated] = await db.update(todoCategories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(todoCategories.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating todo category:', error);
      throw error;
    }
  }

  async deleteTodoCategory(id: number): Promise<void> {
    try {
      await db.delete(todos)
        .where(eq(todos.categoryId, id));
      
      await db.delete(todoCategories)
        .where(eq(todoCategories.id, id));
    } catch (error) {
      console.error('Error deleting todo category:', error);
      throw error;
    }
  }

  // Todo operations
  async getTodos(userId: number, organizationId?: string, categoryId?: number): Promise<Todo[]> {
    try {
      const conditions = [eq(todos.userId, userId)];
      
      if (organizationId) {
        conditions.push(eq(todos.organizationId, organizationId));
      }
      
      if (categoryId !== undefined) {
        conditions.push(eq(todos.categoryId, categoryId));
      }
      
      const todoList = await db.select()
        .from(todos)
        .where(and(...conditions))
        .orderBy(todos.createdAt);
      
      return todoList;
    } catch (error) {
      console.error('Error getting todos:', error);
      throw error;
    }
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    try {
      const [todo] = await db.select()
        .from(todos)
        .where(eq(todos.id, id))
        .limit(1);
      
      return todo;
    } catch (error) {
      console.error('Error getting todo:', error);
      throw error;
    }
  }

  async createTodo(insertTodo: InsertTodo): Promise<Todo> {
    try {
      const [todo] = await db.insert(todos)
        .values(insertTodo)
        .returning();
      
      return todo;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  async updateTodo(id: number, data: Partial<InsertTodo>): Promise<Todo> {
    try {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      if (data.completed !== undefined) {
        updateData.completedAt = data.completed ? new Date() : null;
      }
      
      const [updated] = await db.update(todos)
        .set(updateData)
        .where(eq(todos.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async deleteTodo(id: number): Promise<void> {
    try {
      await db.delete(todos)
        .where(eq(todos.id, id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  // AI Assistant Conversation operations
  async getAIConversations(userId: number, organizationId?: string): Promise<AIConversation[]> {
    try {
      const conditions = [eq(aiConversations.userId, userId)];
      
      if (organizationId) {
        conditions.push(eq(aiConversations.organizationId, organizationId));
      }
      
      const conversations = await db.select()
        .from(aiConversations)
        .where(and(...conditions))
        .orderBy(desc(aiConversations.lastInteractionAt));
      
      return conversations;
    } catch (error) {
      console.error('Error getting AI conversations:', error);
      throw error;
    }
  }

  async getAIConversation(id: number): Promise<AIConversation | undefined> {
    try {
      const [conversation] = await db.select()
        .from(aiConversations)
        .where(eq(aiConversations.id, id))
        .limit(1);
      
      return conversation;
    } catch (error) {
      console.error('Error getting AI conversation:', error);
      throw error;
    }
  }

  async createAIConversation(insertConversation: InsertAIConversation): Promise<AIConversation> {
    try {
      const [conversation] = await db.insert(aiConversations)
        .values(insertConversation)
        .returning();
      
      return conversation;
    } catch (error) {
      console.error('Error creating AI conversation:', error);
      throw error;
    }
  }

  async updateAIConversation(id: number, data: Partial<InsertAIConversation>): Promise<AIConversation> {
    try {
      const [updated] = await db.update(aiConversations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiConversations.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating AI conversation:', error);
      throw error;
    }
  }

  // AI Assistant Message operations
  async getAIMessages(conversationId: number): Promise<AIMessage[]> {
    try {
      const messages = await db.select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(aiMessages.createdAt);
      
      return messages;
    } catch (error) {
      console.error('Error getting AI messages:', error);
      throw error;
    }
  }

  async getAIMessage(id: number): Promise<AIMessage | undefined> {
    try {
      const [message] = await db.select()
        .from(aiMessages)
        .where(eq(aiMessages.id, id))
        .limit(1);
      
      return message;
    } catch (error) {
      console.error('Error getting AI message:', error);
      throw error;
    }
  }

  async createAIMessage(insertMessage: InsertAIMessage): Promise<AIMessage> {
    try {
      const [message] = await db.insert(aiMessages)
        .values(insertMessage)
        .returning();
      
      if (message.conversationId) {
        await db.update(aiConversations)
          .set({ lastInteractionAt: new Date() })
          .where(eq(aiConversations.id, message.conversationId));
      }
      
      return message;
    } catch (error) {
      console.error('Error creating AI message:', error);
      throw error;
    }
  }

  // AI Command Log operations
  async getAICommandLogs(userId?: number, organizationId?: string): Promise<AICommandLog[]> {
    try {
      const conditions = [];
      
      if (userId) {
        conditions.push(eq(aiCommandLogs.userId, userId));
      }
      if (organizationId) {
        conditions.push(eq(aiCommandLogs.organizationId, organizationId));
      }
      
      const query = conditions.length > 0
        ? db.select().from(aiCommandLogs).where(and(...conditions))
        : db.select().from(aiCommandLogs);
      
      const logs = await query.orderBy(desc(aiCommandLogs.createdAt));
      
      return logs;
    } catch (error) {
      console.error('Error getting AI command logs:', error);
      throw error;
    }
  }

  async createAICommandLog(insertLog: InsertAICommandLog): Promise<AICommandLog> {
    try {
      const [log] = await db.insert(aiCommandLogs)
        .values(insertLog)
        .returning();
      
      return log;
    } catch (error) {
      console.error('Error creating AI command log:', error);
      throw error;
    }
  }

  // AI User Preferences operations
  async getAIUserPreferences(userId: number, organizationId: string): Promise<AIUserPreferences | null> {
    try {
      const [preferences] = await db.select()
        .from(aiUserPreferences)
        .where(
          and(
            eq(aiUserPreferences.userId, userId),
            eq(aiUserPreferences.organizationId, organizationId)
          )
        )
        .limit(1);
      
      return preferences || null;
    } catch (error) {
      console.error('Error getting AI user preferences:', error);
      throw error;
    }
  }

  async createAIUserPreferences(insertPreferences: InsertAIUserPreferences): Promise<AIUserPreferences> {
    try {
      const [preferences] = await db.insert(aiUserPreferences)
        .values(insertPreferences)
        .returning();
      
      return preferences;
    } catch (error) {
      console.error('Error creating AI user preferences:', error);
      throw error;
    }
  }

  async updateAIUserPreferences(
    userId: number,
    organizationId: string,
    data: Partial<InsertAIUserPreferences>
  ): Promise<AIUserPreferences> {
    try {
      const existing = await this.getAIUserPreferences(userId, organizationId);
      
      if (!existing) {
        return await this.createAIUserPreferences({
          userId,
          organizationId,
          ...data,
        } as InsertAIUserPreferences);
      }
      
      const [updated] = await db.update(aiUserPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(aiUserPreferences.userId, userId),
            eq(aiUserPreferences.organizationId, organizationId)
          )
        )
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating AI user preferences:', error);
      throw error;
    }
  }

  // AI Reminder operations
  async getAIReminders(userId: number, organizationId?: string): Promise<AIReminder[]> {
    try {
      const conditions = [eq(aiReminders.userId, userId)];
      
      if (organizationId) {
        conditions.push(eq(aiReminders.organizationId, organizationId));
      }
      
      const reminders = await db.select()
        .from(aiReminders)
        .where(and(...conditions))
        .orderBy(aiReminders.reminderTime);
      
      return reminders;
    } catch (error) {
      console.error('Error getting AI reminders:', error);
      throw error;
    }
  }

  async createAIReminder(insertReminder: InsertAIReminder): Promise<AIReminder> {
    try {
      const [reminder] = await db.insert(aiReminders)
        .values(insertReminder)
        .returning();
      
      return reminder;
    } catch (error) {
      console.error('Error creating AI reminder:', error);
      throw error;
    }
  }

  async updateAIReminder(id: number, data: Partial<InsertAIReminder>): Promise<AIReminder> {
    try {
      const [updated] = await db.update(aiReminders)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiReminders.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating AI reminder:', error);
      throw error;
    }
  }

  // Multi-Agent System operations
  async getAgentRoles(organizationId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_agent_roles WHERE organization_id = $1 AND is_active = true ORDER BY priority`,
        [organizationId]
      );
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        systemPrompt: row.system_prompt,
        capabilities: row.capabilities || [],
        escalationTriggers: row.escalation_triggers || [],
        confidenceThreshold: row.confidence_threshold,
        maxTurns: row.max_turns,
        voiceId: row.voice_id,
        isActive: row.is_active,
        priority: row.priority,
        organizationId: row.organization_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Error getting agent roles:', error);
      return [];
    }
  }

  async getAgentRole(id: number): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_agent_roles WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        systemPrompt: row.system_prompt,
        capabilities: row.capabilities || [],
        escalationTriggers: row.escalation_triggers || [],
        confidenceThreshold: row.confidence_threshold,
        maxTurns: row.max_turns,
        voiceId: row.voice_id,
        isActive: row.is_active,
        priority: row.priority,
        organizationId: row.organization_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting agent role:', error);
      return null;
    }
  }

  async createAgentRole(data: any): Promise<any> {
    try {
      const result = await pool.query(
        `INSERT INTO ai_agent_roles (name, display_name, description, system_prompt, capabilities, escalation_triggers, confidence_threshold, max_turns, voice_id, is_active, priority, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [data.name, data.displayName, data.description, data.systemPrompt, data.capabilities || [], data.escalationTriggers || [], data.confidenceThreshold || 90, data.maxTurns || 10, data.voiceId, data.isActive !== false, data.priority || 1, data.organizationId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating agent role:', error);
      throw error;
    }
  }

  async updateAgentRole(id: number, data: any): Promise<any> {
    try {
      const result = await pool.query(
        `UPDATE ai_agent_roles SET name = COALESCE($2, name), display_name = COALESCE($3, display_name), description = COALESCE($4, description), system_prompt = COALESCE($5, system_prompt), updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, data.name, data.displayName, data.description, data.systemPrompt]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error updating agent role:', error);
      throw error;
    }
  }

  async getKnowledgePacks(organizationId: string, agentRoleId?: number): Promise<any[]> {
    try {
      let query = `SELECT * FROM ai_knowledge_packs WHERE organization_id = $1 AND is_active = true`;
      const params: any[] = [organizationId];
      
      if (agentRoleId) {
        query += ` AND agent_role_id = $2`;
        params.push(agentRoleId);
      }
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting knowledge packs:', error);
      return [];
    }
  }

  async createKnowledgePack(data: any): Promise<any> {
    try {
      const result = await pool.query(
        `INSERT INTO ai_knowledge_packs (agent_role_id, name, category, content, metadata, version, is_active, source_type, source_url, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [data.agentRoleId, data.name, data.category, data.content, data.metadata || {}, data.version || 1, data.isActive !== false, data.sourceType || 'manual', data.sourceUrl, data.organizationId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating knowledge pack:', error);
      throw error;
    }
  }

  async getConversationState(id: number): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_conversation_states WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        conversationId: row.conversation_id,
        callSid: row.call_sid,
        currentAgentRole: row.current_agent_role,
        previousAgentRoles: row.previous_agent_roles || [],
        intentHistory: row.intent_history || [],
        extractedEntities: row.extracted_entities || {},
        contextMemory: row.context_memory || {},
        sentimentScore: row.sentiment_score,
        escalationStatus: row.escalation_status,
        escalationReason: row.escalation_reason,
        turnCount: row.turn_count,
        confidenceHistory: row.confidence_history || [],
        isActive: row.is_active,
        organizationId: row.organization_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting conversation state:', error);
      return null;
    }
  }

  async getConversationStateByCallSid(callSid: string): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_conversation_states WHERE call_sid = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
        [callSid]
      );
      if (result.rows.length === 0) return null;
      return this.getConversationState(result.rows[0].id);
    } catch (error) {
      console.error('Error getting conversation state by call sid:', error);
      return null;
    }
  }

  async createConversationState(data: any): Promise<any> {
    try {
      const result = await pool.query(
        `INSERT INTO ai_conversation_states (conversation_id, call_sid, current_agent_role, previous_agent_roles, intent_history, extracted_entities, context_memory, sentiment_score, escalation_status, escalation_reason, turn_count, confidence_history, is_active, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [data.conversationId, data.callSid, data.currentAgentRole, data.previousAgentRoles || [], JSON.stringify(data.intentHistory || []), JSON.stringify(data.extractedEntities || {}), JSON.stringify(data.contextMemory || {}), data.sentimentScore, data.escalationStatus || 'none', data.escalationReason, data.turnCount || 0, JSON.stringify(data.confidenceHistory || []), data.isActive !== false, data.organizationId]
      );
      return this.getConversationState(result.rows[0].id);
    } catch (error) {
      console.error('Error creating conversation state:', error);
      throw error;
    }
  }

  async updateConversationState(id: number, data: any): Promise<any | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.currentAgentRole !== undefined) {
        updates.push(`current_agent_role = $${paramIndex++}`);
        values.push(data.currentAgentRole);
      }
      if (data.previousAgentRoles !== undefined) {
        updates.push(`previous_agent_roles = $${paramIndex++}`);
        values.push(data.previousAgentRoles);
      }
      if (data.intentHistory !== undefined) {
        updates.push(`intent_history = $${paramIndex++}`);
        values.push(JSON.stringify(data.intentHistory));
      }
      if (data.extractedEntities !== undefined) {
        updates.push(`extracted_entities = $${paramIndex++}`);
        values.push(JSON.stringify(data.extractedEntities));
      }
      if (data.turnCount !== undefined) {
        updates.push(`turn_count = $${paramIndex++}`);
        values.push(data.turnCount);
      }
      if (data.escalationStatus !== undefined) {
        updates.push(`escalation_status = $${paramIndex++}`);
        values.push(data.escalationStatus);
      }
      if (data.escalationReason !== undefined) {
        updates.push(`escalation_reason = $${paramIndex++}`);
        values.push(data.escalationReason);
      }
      if (data.confidenceHistory !== undefined) {
        updates.push(`confidence_history = $${paramIndex++}`);
        values.push(JSON.stringify(data.confidenceHistory));
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE ai_conversation_states SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) return null;
      return this.getConversationState(result.rows[0].id);
    } catch (error) {
      console.error('Error updating conversation state:', error);
      return null;
    }
  }

  async getVoiceConfigs(organizationId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_voice_configs WHERE organization_id = $1 AND is_active = true ORDER BY is_default DESC`,
        [organizationId]
      );
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        provider: row.provider,
        voiceId: row.voice_id,
        settings: row.settings || {},
        fallbackProvider: row.fallback_provider,
        fallbackVoiceId: row.fallback_voice_id,
        latencyTarget: row.latency_target,
        isDefault: row.is_default,
        isActive: row.is_active,
        organizationId: row.organization_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Error getting voice configs:', error);
      return [];
    }
  }

  async getDefaultVoiceConfig(organizationId: string): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ai_voice_configs WHERE organization_id = $1 AND is_default = true AND is_active = true LIMIT 1`,
        [organizationId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        voiceId: row.voice_id,
        settings: row.settings || {},
        fallbackProvider: row.fallback_provider,
        fallbackVoiceId: row.fallback_voice_id,
        latencyTarget: row.latency_target,
        isDefault: row.is_default,
        isActive: row.is_active,
        organizationId: row.organization_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting default voice config:', error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();