import { db } from './db';
import { contactEncryption } from './encryption';
import { Pool } from 'pg';

// Raw SQL interface for migration
interface ContactRaw {
  id: number;
  first_name?: string;
  last_name?: string; 
  display_name?: string;
  email?: string;
  phone_numbers?: string;
  address?: string;
  notes?: string;
  first_name_encrypted?: string;
  last_name_encrypted?: string;
  display_name_encrypted?: string;
  email_encrypted?: string;
  phone_numbers_encrypted?: string;
  address_encrypted?: string;
  notes_encrypted?: string;
}

/**
 * Migration script to move data from unencrypted columns to encrypted columns
 * This will handle the transition from plain text to encrypted storage
 */
export async function migrateContactsToEncrypted() {
  console.log('Starting contact data migration to encrypted columns...');
  
  try {
    // Create a direct pool connection for raw SQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id, 
          first_name,
          last_name,
          display_name,
          email,
          phone_numbers,
          address,
          notes,
          first_name_encrypted,
          last_name_encrypted,
          display_name_encrypted,
          email_encrypted,
          phone_numbers_encrypted,
          address_encrypted,
          notes_encrypted
        FROM contacts
      `);
      
      const allContacts = result.rows as ContactRaw[];
    console.log(`Found ${allContacts.length} contacts to migrate`);
    
    for (const contact of allContacts) {
      const updates: string[] = [];
      const values: any[] = [];
      let valueIndex = 1;
      
      // Migrate firstName
      if (contact.first_name && !contact.first_name_encrypted) {
        updates.push(`first_name_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.first_name));
      }
      
      // Migrate lastName  
      if (contact.last_name && !contact.last_name_encrypted) {
        updates.push(`last_name_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.last_name));
      }
      
      // Migrate displayName
      if (contact.display_name && !contact.display_name_encrypted) {
        updates.push(`display_name_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.display_name));
      }
      
      // Migrate email
      if (contact.email && !contact.email_encrypted) {
        updates.push(`email_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.email));
      }
      
      // Migrate phone numbers (JSON array)
      if (contact.phone_numbers && !contact.phone_numbers_encrypted) {
        updates.push(`phone_numbers_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.phone_numbers));
      }
      
      // Migrate address
      if (contact.address && !contact.address_encrypted) {
        updates.push(`address_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.address));
      }
      
      // Migrate notes
      if (contact.notes && !contact.notes_encrypted) {
        updates.push(`notes_encrypted = $${valueIndex++}`);
        values.push(contactEncryption.encrypt(contact.notes));
      }
      
      // Update the contact if there are changes
      if (updates.length > 0) {
        const updateSql = `
          UPDATE contacts 
          SET ${updates.join(', ')}
          WHERE id = $${valueIndex}
        `;
        values.push(contact.id);
        
        await client.query(updateSql, values);
        console.log(`✓ Migrated contact ${contact.id} (${contact.first_name || 'Unknown'})`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    return { success: true, migratedCount: allContacts.length };
    
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify that all data has been properly migrated
 */
export async function verifyMigration() {
  console.log('Verifying migration...');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id,
          first_name,
          first_name_encrypted,
          email,
          email_encrypted,
          phone_numbers,
          phone_numbers_encrypted
        FROM contacts
      `);
      
      const allContacts = result.rows;
      
      const stats = {
        total: allContacts.length,
        withFirstNameEncrypted: 0,
        withEmailEncrypted: 0,
        withPhoneEncrypted: 0,
        missingEncryption: [] as any[]
      };
      
      for (const contact of allContacts) {
        if (contact.first_name_encrypted) stats.withFirstNameEncrypted++;
        if (contact.email_encrypted) stats.withEmailEncrypted++;
        if (contact.phone_numbers_encrypted) stats.withPhoneEncrypted++;
        
        // Check for contacts that still have unencrypted data without encrypted versions
        if ((contact.first_name && !contact.first_name_encrypted) ||
            (contact.email && !contact.email_encrypted) ||
            (contact.phone_numbers && !contact.phone_numbers_encrypted)) {
          stats.missingEncryption.push({
            id: contact.id,
            firstName: !!contact.first_name,
            firstNameEnc: !!contact.first_name_encrypted,
            email: !!contact.email,
            emailEnc: !!contact.email_encrypted
          });
        }
      }
      
      console.log('Migration verification results:', stats);
      return stats;
      
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}