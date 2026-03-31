import { storage } from '../storage';
import { Contact, InsertContact, ContactRoute, InsertContactRoute } from '@shared/schema';

export class ContactService {
  async getContacts(organizationId: string): Promise<Contact[]> {
    return await storage.getContacts();
  }

  async getContact(id: number, organizationId: string): Promise<Contact | undefined> {
    const contact = await storage.getContact(id);
    // In production, verify the contact belongs to the organization
    return contact;
  }

  async getContactByPhone(phoneNumber: string, organizationId: string): Promise<Contact | undefined> {
    return await storage.getContactByPhone(phoneNumber);
  }

  async createContact(contactData: InsertContact, organizationId: string): Promise<Contact> {
    // Add organization ID to contact data in production
    return await storage.createContact(contactData);
  }

  async updateContact(id: number, updates: Partial<Contact>, organizationId: string): Promise<Contact> {
    // In production, verify the contact belongs to the organization
    return await storage.updateContact(id, updates);
  }

  async deleteContact(id: number, organizationId: string): Promise<void> {
    // In production, verify the contact belongs to the organization
    await storage.deleteContact(id);
  }

  async syncContacts(deviceId: string, contacts: InsertContact[], organizationId: string): Promise<Contact[]> {
    // Add organization ID to each contact in production
    return await storage.syncContacts(deviceId, contacts);
  }

  async getContactRoutes(organizationId: string): Promise<ContactRoute[]> {
    return await storage.getContactRoutes();
  }

  async getContactRoutesForPhone(phoneNumber: string, organizationId: string): Promise<ContactRoute[]> {
    return await storage.getContactRoutesForPhone(phoneNumber);
  }

  async createContactRoute(routeData: InsertContactRoute, organizationId: string): Promise<ContactRoute> {
    // Add organization ID to route data in production
    return await storage.createContactRoute(routeData);
  }

  async updateContactRoute(id: number, updates: Partial<ContactRoute>, organizationId: string): Promise<ContactRoute> {
    // In production, verify the route belongs to the organization
    return await storage.updateContactRoute(id, updates);
  }

  async deleteContactRoute(id: number, organizationId: string): Promise<void> {
    // In production, verify the route belongs to the organization
    await storage.deleteContactRoute(id);
  }

  async importContacts(contacts: InsertContact[], organizationId: string): Promise<Contact[]> {
    const createdContacts: Contact[] = [];
    
    for (const contactData of contacts) {
      try {
        const contact = await this.createContact(contactData, organizationId);
        createdContacts.push(contact);
      } catch (error) {
        console.error(`Failed to import contact ${contactData.firstName} ${contactData.lastName}:`, error);
      }
    }
    
    return createdContacts;
  }

  async searchContacts(query: string, organizationId: string): Promise<Contact[]> {
    const allContacts = await this.getContacts(organizationId);
    
    return allContacts.filter(contact => {
      const searchText = `${contact.firstName || ''} ${contact.lastName || ''} ${contact.email || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }
}

export const contactService = new ContactService();