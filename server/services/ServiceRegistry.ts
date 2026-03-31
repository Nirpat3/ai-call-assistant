import { callService } from './CallService';
import { organizationService } from './OrganizationService';
import { aiService } from './AIService';
import { contactService } from './ContactService';
import { notificationService } from './NotificationService';

export interface ServiceRegistry {
  call: typeof callService;
  organization: typeof organizationService;
  ai: typeof aiService;
  contact: typeof contactService;
  notification: typeof notificationService;
}

export const services: ServiceRegistry = {
  call: callService,
  organization: organizationService,
  ai: aiService,
  contact: contactService,
  notification: notificationService,
};

export class APIGateway {
  private services: ServiceRegistry;

  constructor(services: ServiceRegistry) {
    this.services = services;
  }

  // Call Service Methods
  async getCalls(organizationId: string, limit?: number) {
    return await this.services.call.getCalls(organizationId, limit);
  }

  async getCallStats(organizationId: string) {
    return await this.services.call.getCallStats(organizationId);
  }

  async createCall(callData: any, organizationId: string) {
    return await this.services.call.createCall({ ...callData, organizationId });
  }

  // Organization Service Methods
  async getUserOrganizations(userId: number) {
    return await this.services.organization.getUserOrganizations(userId);
  }

  async switchOrganization(userId: number, organizationId: string) {
    return await this.services.organization.switchUserOrganization(userId, organizationId);
  }

  // AI Service Methods
  async getAIConfig(organizationId: string) {
    return await this.services.ai.getAIConfig(organizationId);
  }

  async processCallWithAI(audioUrl: string, callerInfo: string, organizationId: string) {
    return await this.services.ai.processCompleteCall(audioUrl, callerInfo, organizationId);
  }

  // Contact Service Methods
  async getContacts(organizationId: string) {
    return await this.services.contact.getContacts(organizationId);
  }

  async createContact(contactData: any, organizationId: string) {
    return await this.services.contact.createContact(contactData, organizationId);
  }

  async searchContacts(query: string, organizationId: string) {
    return await this.services.contact.searchContacts(query, organizationId);
  }

  // Notification Service Methods
  async sendNotification(type: any, recipient: string, message: string, organizationId: string) {
    return await this.services.notification.sendCallNotification(type, recipient, message, organizationId);
  }

  async getNotificationStatus() {
    return await this.services.notification.getNotificationStatus();
  }

  // Cross-service operations
  async processIncomingCall(callData: any, organizationId: string) {
    // Create call record
    const call = await this.createCall(callData, organizationId);
    
    // Process with AI if recording available
    if (callData.recordingUrl) {
      const aiResults = await this.processCallWithAI(
        callData.recordingUrl,
        callData.callerName || callData.from,
        organizationId
      );
      
      // Update call with AI results
      await this.services.call.updateCall(call.id, {
        transcription: aiResults.transcription,
        summary: aiResults.summary,
      });
      
      // Send notification
      await this.services.notification.sendCallSummaryNotification(
        call.id,
        aiResults.summary,
        organizationId
      );
    }
    
    return call;
  }
}

export const apiGateway = new APIGateway(services);