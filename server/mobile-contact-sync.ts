import { storage } from "./storage";
import { contactEncryption } from "./encryption";

export interface MobileContact {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: Array<{
    number: string;
    type: 'mobile' | 'work' | 'home' | 'other';
    isPrimary?: boolean;
  }>;
  emails: Array<{
    email: string;
    type: 'personal' | 'work' | 'other';
    isPrimary?: boolean;
  }>;
  addresses: Array<{
    address: string;
    type: 'home' | 'work' | 'other';
  }>;
  company?: string;
  jobTitle?: string;
  notes?: string;
  avatar?: string;
  groups?: string[];
  isFavorite?: boolean;
  source: 'ios' | 'android';
}

export interface ContactSyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
  duplicates: number;
}

export class MobileContactSyncService {
  
  /**
   * Sync contacts from mobile device (iOS or Android)
   */
  async syncContactsFromMobile(
    contacts: MobileContact[], 
    organizationId: string,
    source: 'ios' | 'android'
  ): Promise<ContactSyncResult> {
    const result: ContactSyncResult = {
      success: true,
      synced: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    try {
      for (const mobileContact of contacts) {
        try {
          // Check for existing contact by phone number or name
          const existingContact = await this.findExistingContact(
            mobileContact, 
            organizationId
          );

          if (existingContact) {
            // Update existing contact if mobile version is newer
            await this.updateExistingContact(existingContact, mobileContact, organizationId);
            result.duplicates++;
          } else {
            // Create new contact
            await this.createContactFromMobile(mobileContact, organizationId, source);
            result.synced++;
          }
        } catch (error) {
          result.errors.push(`Failed to sync contact ${mobileContact.displayName}: ${error.message}`);
          result.skipped++;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Export contacts to mobile format
   */
  async exportContactsToMobile(
    organizationId: string,
    format: 'ios' | 'android'
  ): Promise<MobileContact[]> {
    try {
      const contacts = await storage.getContacts(organizationId);
      const mobileContacts: MobileContact[] = [];

      for (const contact of contacts) {
        try {
          // Decrypt contact data
          const decryptedContact = contactEncryption.decryptContactData(contact);
          
          const mobileContact: MobileContact = {
            id: contact.syncId || contact.id.toString(),
            displayName: decryptedContact.displayName || 
                        `${decryptedContact.firstName || ''} ${decryptedContact.lastName || ''}`.trim(),
            firstName: decryptedContact.firstName,
            lastName: decryptedContact.lastName,
            phoneNumbers: this.parsePhoneNumbers(decryptedContact.phoneNumbers),
            emails: this.parseEmails(decryptedContact.email),
            addresses: this.parseAddresses(decryptedContact.address),
            company: decryptedContact.company,
            jobTitle: decryptedContact.jobTitle,
            notes: decryptedContact.notes,
            avatar: decryptedContact.avatar,
            groups: decryptedContact.groups || [],
            isFavorite: decryptedContact.isFavorite || false,
            source: format
          };

          mobileContacts.push(mobileContact);
        } catch (error) {
          console.error(`Failed to export contact ${contact.id}:`, error);
        }
      }

      return mobileContacts;
    } catch (error) {
      console.error('Failed to export contacts:', error);
      throw new Error('Failed to export contacts to mobile format');
    }
  }

  /**
   * Find existing contact by phone number or name
   */
  private async findExistingContact(
    mobileContact: MobileContact, 
    organizationId: string
  ): Promise<any | null> {
    try {
      const contacts = await storage.getContacts(organizationId);
      
      // First try to find by sync ID
      if (mobileContact.id) {
        const contactBySyncId = contacts.find(c => c.syncId === mobileContact.id);
        if (contactBySyncId) return contactBySyncId;
      }

      // Then try to find by phone number
      for (const phoneNum of mobileContact.phoneNumbers) {
        const contactByPhone = contacts.find(c => {
          if (c.phoneNumbers) {
            const phones = this.parsePhoneNumbers(c.phoneNumbers);
            return phones.some(p => p.number === phoneNum.number);
          }
          return false;
        });
        if (contactByPhone) return contactByPhone;
      }

      // Finally try to find by name
      if (mobileContact.firstName && mobileContact.lastName) {
        const contactByName = contacts.find(c => {
          const decrypted = contactEncryption.decryptContactData(c);
          return decrypted.firstName === mobileContact.firstName && 
                 decrypted.lastName === mobileContact.lastName;
        });
        if (contactByName) return contactByName;
      }

      return null;
    } catch (error) {
      console.error('Error finding existing contact:', error);
      return null;
    }
  }

  /**
   * Create new contact from mobile contact
   */
  private async createContactFromMobile(
    mobileContact: MobileContact, 
    organizationId: string,
    source: 'ios' | 'android'
  ): Promise<void> {
    const contactData = {
      firstName: mobileContact.firstName,
      lastName: mobileContact.lastName,
      displayName: mobileContact.displayName,
      email: mobileContact.emails.length > 0 ? mobileContact.emails[0].email : null,
      phoneNumbers: JSON.stringify(mobileContact.phoneNumbers.map(p => p.number)),
      company: mobileContact.company,
      jobTitle: mobileContact.jobTitle,
      address: mobileContact.addresses.length > 0 ? mobileContact.addresses[0].address : null,
      notes: mobileContact.notes,
      avatar: mobileContact.avatar,
      tags: mobileContact.groups || [],
      groups: mobileContact.groups || [],
      isFavorite: mobileContact.isFavorite || false,
      source: source,
      syncSource: source,
      syncId: mobileContact.id,
      organizationId
    };

    // Encrypt sensitive data
    const encryptedContact = contactEncryption.encryptContactData(contactData);
    
    await storage.createContact(encryptedContact);
  }

  /**
   * Update existing contact with mobile data
   */
  private async updateExistingContact(
    existingContact: any,
    mobileContact: MobileContact,
    organizationId: string
  ): Promise<void> {
    const decryptedExisting = contactEncryption.decryptContactData(existingContact);
    
    // Merge mobile contact data with existing contact
    const updatedData = {
      ...decryptedExisting,
      firstName: mobileContact.firstName || decryptedExisting.firstName,
      lastName: mobileContact.lastName || decryptedExisting.lastName,
      displayName: mobileContact.displayName || decryptedExisting.displayName,
      company: mobileContact.company || decryptedExisting.company,
      jobTitle: mobileContact.jobTitle || decryptedExisting.jobTitle,
      notes: mobileContact.notes || decryptedExisting.notes,
      avatar: mobileContact.avatar || decryptedExisting.avatar,
      groups: [...new Set([...(decryptedExisting.groups || []), ...(mobileContact.groups || [])])],
      isFavorite: mobileContact.isFavorite ?? decryptedExisting.isFavorite,
      syncId: mobileContact.id,
      updatedAt: new Date()
    };

    // Merge phone numbers
    const existingPhones = this.parsePhoneNumbers(decryptedExisting.phoneNumbers);
    const newPhones = mobileContact.phoneNumbers;
    const mergedPhones = this.mergePhoneNumbers(existingPhones, newPhones);
    updatedData.phoneNumbers = JSON.stringify(mergedPhones.map(p => p.number));

    // Encrypt and update
    const encryptedContact = contactEncryption.encryptContactData(updatedData);
    await storage.updateContact(existingContact.id, encryptedContact);
  }

  /**
   * Parse phone numbers from stored format
   */
  private parsePhoneNumbers(phoneNumbers: string | null): Array<{ number: string; type: string; isPrimary?: boolean }> {
    if (!phoneNumbers) return [];
    
    try {
      const parsed = JSON.parse(phoneNumbers);
      if (Array.isArray(parsed)) {
        return parsed.map((phone, index) => ({
          number: typeof phone === 'string' ? phone : phone.number,
          type: typeof phone === 'string' ? 'mobile' : phone.type || 'mobile',
          isPrimary: typeof phone === 'string' ? index === 0 : phone.isPrimary || index === 0
        }));
      } else {
        return [{ number: phoneNumbers, type: 'mobile', isPrimary: true }];
      }
    } catch {
      return [{ number: phoneNumbers, type: 'mobile', isPrimary: true }];
    }
  }

  /**
   * Parse emails from stored format
   */
  private parseEmails(email: string | null): Array<{ email: string; type: string; isPrimary?: boolean }> {
    if (!email) return [];
    
    try {
      const parsed = JSON.parse(email);
      if (Array.isArray(parsed)) {
        return parsed.map((e, index) => ({
          email: typeof e === 'string' ? e : e.email,
          type: typeof e === 'string' ? 'personal' : e.type || 'personal',
          isPrimary: typeof e === 'string' ? index === 0 : e.isPrimary || index === 0
        }));
      } else {
        return [{ email: email, type: 'personal', isPrimary: true }];
      }
    } catch {
      return [{ email: email, type: 'personal', isPrimary: true }];
    }
  }

  /**
   * Parse addresses from stored format
   */
  private parseAddresses(address: string | null): Array<{ address: string; type: string }> {
    if (!address) return [];
    
    try {
      const parsed = JSON.parse(address);
      if (Array.isArray(parsed)) {
        return parsed.map(a => ({
          address: typeof a === 'string' ? a : a.address,
          type: typeof a === 'string' ? 'home' : a.type || 'home'
        }));
      } else {
        return [{ address: address, type: 'home' }];
      }
    } catch {
      return [{ address: address, type: 'home' }];
    }
  }

  /**
   * Merge phone numbers avoiding duplicates
   */
  private mergePhoneNumbers(existing: any[], mobile: any[]): any[] {
    const merged = [...existing];
    
    for (const mobilePhone of mobile) {
      const exists = existing.some(p => p.number === mobilePhone.number);
      if (!exists) {
        merged.push(mobilePhone);
      }
    }
    
    return merged;
  }

  /**
   * Generate vCard format for contact export
   */
  generateVCard(contact: MobileContact): string {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
    
    if (contact.firstName || contact.lastName) {
      vcard += `N:${contact.lastName || ''};${contact.firstName || ''};;;\n`;
    }
    
    if (contact.displayName) {
      vcard += `FN:${contact.displayName}\n`;
    }
    
    if (contact.company) {
      vcard += `ORG:${contact.company}\n`;
    }
    
    if (contact.jobTitle) {
      vcard += `TITLE:${contact.jobTitle}\n`;
    }
    
    contact.phoneNumbers.forEach(phone => {
      const type = phone.type.toUpperCase();
      vcard += `TEL;TYPE=${type}:${phone.number}\n`;
    });
    
    contact.emails.forEach(email => {
      const type = email.type.toUpperCase();
      vcard += `EMAIL;TYPE=${type}:${email.email}\n`;
    });
    
    contact.addresses.forEach(addr => {
      const type = addr.type.toUpperCase();
      vcard += `ADR;TYPE=${type}:;;${addr.address};;;;\n`;
    });
    
    if (contact.notes) {
      vcard += `NOTE:${contact.notes}\n`;
    }
    
    vcard += 'END:VCARD\n';
    return vcard;
  }
}

export const mobileContactSyncService = new MobileContactSyncService();