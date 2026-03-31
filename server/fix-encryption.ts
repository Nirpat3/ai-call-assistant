import { db } from './db';
import { contacts } from '@shared/schema';
import { contactEncryption } from './encryption';
import { eq } from 'drizzle-orm';

/**
 * Fix the test encrypted data with proper encryption
 */
export async function fixEncryptionData() {
  console.log('Starting proper encryption of contact data...');
  
  try {
    // Get all contacts with test encrypted data
    const allContacts = await db.select().from(contacts);
    
    for (const contact of allContacts) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix firstName
      if (contact.firstName && contact.firstName.startsWith('test_encrypted_')) {
        const originalValue = contact.firstName.replace('test_encrypted_', '');
        updates.firstName = contactEncryption.encrypt(originalValue);
        needsUpdate = true;
      }
      
      // Fix email
      if (contact.email && contact.email.startsWith('test_encrypted_')) {
        const originalValue = contact.email.replace('test_encrypted_', '');
        updates.email = contactEncryption.encrypt(originalValue);
        needsUpdate = true;
      }
      
      // Fix phone numbers
      if (contact.phoneNumbers && contact.phoneNumbers.startsWith('test_encrypted_')) {
        const originalValue = contact.phoneNumbers.replace('test_encrypted_', '');
        // The original value should be a JSON array string
        updates.phoneNumbers = contactEncryption.encrypt(originalValue);
        needsUpdate = true;
      }
      
      // Update the contact if needed
      if (needsUpdate) {
        await db
          .update(contacts)
          .set(updates)
          .where(eq(contacts.id, contact.id));
        
        console.log(`Updated contact ${contact.id} with proper encryption`);
      }
    }
    
    console.log('Encryption fix completed successfully!');
    return { success: true, message: 'All contacts properly encrypted' };
  } catch (error) {
    console.error('Error fixing encryption:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixEncryptionData()
    .then((result) => {
      console.log('Fix result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}