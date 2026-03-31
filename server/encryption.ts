import crypto from 'crypto';

class ContactEncryption {
  private algorithm = 'aes-256-cbc';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private saltLength = 32; // 256 bits

  private deriveKey(salt: Buffer): Buffer {
    const secretKey = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    return crypto.pbkdf2Sync(secretKey, salt, 100000, this.keyLength, 'sha256');
  }

  encrypt(plaintext: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from salt
      const key = this.deriveKey(salt);
      
      // Create cipher with explicit IV (secure method)
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine salt, iv, and encrypted data
      const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, 'hex')]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  decrypt(encryptedData: string): string {
    try {
      // Parse the combined data
      const combined = Buffer.from(encryptedData, 'base64');
      
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = combined.subarray(this.saltLength + this.ivLength);
      
      // Derive key from salt
      const key = this.deriveKey(salt);
      
      // Create decipher with explicit IV (secure method)
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  encryptPhoneNumbers(phoneNumbers: string[]): string {
    return this.encrypt(JSON.stringify(phoneNumbers));
  }

  decryptPhoneNumbers(encryptedPhoneNumbers: string): string[] {
    try {
      const decrypted = this.decrypt(encryptedPhoneNumbers);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting phone numbers:', error);
      return [];
    }
  }

  encryptContactData(contact: any): any {
    const encrypted = { ...contact };
    
    if (contact.firstName) {
      encrypted.firstName = this.encrypt(contact.firstName);
    }
    
    if (contact.lastName) {
      encrypted.lastName = this.encrypt(contact.lastName);
    }
    
    if (contact.displayName) {
      encrypted.displayName = this.encrypt(contact.displayName);
    }
    
    if (contact.email) {
      encrypted.email = this.encrypt(contact.email);
    }
    
    if (contact.phoneNumbers) {
      encrypted.phoneNumbers = this.encryptPhoneNumbers(contact.phoneNumbers);
    }
    
    if (contact.address) {
      encrypted.address = this.encrypt(contact.address);
    }
    
    if (contact.notes) {
      encrypted.notes = this.encrypt(contact.notes);
    }
    
    return encrypted;
  }

  decryptContactData(encryptedContact: any): any {
    const decrypted = { ...encryptedContact };
    
    try {
      if (encryptedContact.firstName) {
        decrypted.firstName = this.decrypt(encryptedContact.firstName);
      }
      
      if (encryptedContact.lastName) {
        decrypted.lastName = this.decrypt(encryptedContact.lastName);
      }
      
      if (encryptedContact.displayName) {
        decrypted.displayName = this.decrypt(encryptedContact.displayName);
      }
      
      if (encryptedContact.email) {
        decrypted.email = this.decrypt(encryptedContact.email);
      }
      
      if (encryptedContact.phoneNumbers) {
        decrypted.phoneNumbers = this.decryptPhoneNumbers(encryptedContact.phoneNumbers);
      }
      
      if (encryptedContact.address) {
        decrypted.address = this.decrypt(encryptedContact.address);
      }
      
      if (encryptedContact.notes) {
        decrypted.notes = this.decrypt(encryptedContact.notes);
      }
    } catch (error) {
      console.error('Error decrypting contact data:', error);
    }
    
    return decrypted;
  }

  hashForSearch(data: string): string {
    return crypto.createHash('sha256').update(data.toLowerCase()).digest('hex');
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const contactEncryption = new ContactEncryption();