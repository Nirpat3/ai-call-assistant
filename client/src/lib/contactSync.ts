// Mobile Contact Synchronization API
export interface MobileContact {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: string[];
  email?: string;
  company?: string;
  department?: string;
  title?: string;
  avatar?: string; // Base64 encoded image
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'ios' | 'android';
  deviceName: string;
  osVersion: string;
  appVersion: string;
}

export interface SyncResponse {
  success: boolean;
  syncedContacts: number;
  deviceSync: {
    id: number;
    deviceId: string;
    lastSyncAt: string;
    totalContacts: number;
    syncStatus: string;
  };
  errors?: string[];
}

export class ContactSyncAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async syncContacts(deviceInfo: DeviceInfo, contacts: MobileContact[]): Promise<SyncResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/contacts/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceInfo.deviceId,
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          contacts: contacts.map(contact => ({
            syncId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phoneNumbers: contact.phoneNumbers,
            email: contact.email,
            company: contact.company,
            department: contact.department,
            title: contact.title,
            avatar: contact.avatar,
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Contact sync error:', error);
      throw error;
    }
  }

  async getSyncStatus(deviceId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/contacts/sync-status/${deviceId}`);
      if (!response.ok) {
        throw new Error(`Failed to get sync status: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get sync status error:', error);
      throw error;
    }
  }
}

export class WebContactSync {
  private api: ContactSyncAPI;

  constructor(apiBaseUrl?: string) {
    this.api = new ContactSyncAPI(apiBaseUrl);
  }

  async uploadContactsFile(file: File): Promise<SyncResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const contacts = this.parseContactsFile(content, file.type);
          
          const deviceInfo: DeviceInfo = {
            deviceId: this.generateDeviceId(),
            deviceType: this.detectPlatform(),
            deviceName: navigator.userAgent,
            osVersion: navigator.platform,
            appVersion: '1.0.0'
          };

          const result = await this.api.syncContacts(deviceInfo, contacts);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  private parseContactsFile(content: string, fileType: string): MobileContact[] {
    if (fileType.includes('csv')) {
      return this.parseCSV(content);
    } else if (fileType.includes('vcf') || fileType.includes('vcard')) {
      return this.parseVCF(content);
    } else if (fileType.includes('json')) {
      return JSON.parse(content);
    }
    throw new Error('Unsupported file format');
  }

  private parseCSV(content: string): MobileContact[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const contacts: MobileContact[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const contact: MobileContact = {
        id: `csv-${i}`,
        phoneNumbers: []
      };

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header.toLowerCase()) {
          case 'first name':
          case 'firstname':
            contact.firstName = value;
            break;
          case 'last name':
          case 'lastname':
            contact.lastName = value;
            break;
          case 'phone':
          case 'phone number':
            if (value) contact.phoneNumbers.push(value);
            break;
          case 'email':
            contact.email = value;
            break;
          case 'company':
            contact.company = value;
            break;
        }
      });

      if (contact.phoneNumbers.length > 0 || contact.email) {
        contacts.push(contact);
      }
    }

    return contacts;
  }

  private parseVCF(content: string): MobileContact[] {
    const contacts: MobileContact[] = [];
    const vcards = content.split('BEGIN:VCARD');

    vcards.forEach((vcard, index) => {
      if (!vcard.trim()) return;

      const contact: MobileContact = {
        id: `vcf-${index}`,
        phoneNumbers: []
      };

      const lines = vcard.split('\n');
      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (!value) return;

        switch (key.trim()) {
          case 'FN':
            const names = value.split(' ');
            contact.firstName = names[0];
            contact.lastName = names.slice(1).join(' ');
            break;
          case 'TEL':
            contact.phoneNumbers.push(value.trim());
            break;
          case 'EMAIL':
            contact.email = value.trim();
            break;
          case 'ORG':
            contact.company = value.trim();
            break;
        }
      });

      if (contact.phoneNumbers.length > 0 || contact.email) {
        contacts.push(contact);
      }
    });

    return contacts;
  }

  private generateDeviceId(): string {
    return 'web-' + Math.random().toString(36).substr(2, 9);
  }

  private detectPlatform(): 'ios' | 'android' {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('iphone') || userAgent.includes('ipad') ? 'ios' : 'android';
  }
}