import { Contact } from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DuplicateMatch {
  id: string;
  contact1: Contact;
  contact2: Contact;
  confidence: number;
  matchingFields: string[];
  suggestedMerge: Contact;
  reasons: string[];
}

export interface ContactSimilarity {
  nameScore: number;
  phoneScore: number;
  emailScore: number;
  addressScore: number;
  companyScore: number;
  overallScore: number;
}

export class ContactDuplicateDetectionService {
  private similarityThreshold = 0.7; // 70% similarity threshold for duplicates
  private highConfidenceThreshold = 0.9; // 90% for high confidence matches

  /**
   * Find all duplicate contacts using AI-powered analysis
   */
  async findDuplicates(contacts: Contact[]): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < contacts.length; i++) {
      if (processed.has(contacts[i].id)) continue;

      for (let j = i + 1; j < contacts.length; j++) {
        if (processed.has(contacts[j].id)) continue;

        const similarity = await this.calculateSimilarity(contacts[i], contacts[j]);
        
        if (similarity.overallScore >= this.similarityThreshold) {
          const duplicate = await this.createDuplicateMatch(contacts[i], contacts[j], similarity);
          duplicates.push(duplicate);
          processed.add(contacts[j].id);
        }
      }
    }

    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate similarity between two contacts using multiple algorithms
   */
  private async calculateSimilarity(contact1: Contact, contact2: Contact): Promise<ContactSimilarity> {
    // Name similarity
    const nameScore = this.calculateNameSimilarity(contact1, contact2);
    
    // Phone number similarity
    const phoneScore = this.calculatePhoneSimilarity(contact1, contact2);
    
    // Email similarity
    const emailScore = this.calculateEmailSimilarity(contact1, contact2);
    
    // Address similarity
    const addressScore = this.calculateAddressSimilarity(contact1, contact2);
    
    // Company similarity
    const companyScore = this.calculateCompanySimilarity(contact1, contact2);

    // Weighted overall score
    const overallScore = (
      nameScore * 0.35 +
      phoneScore * 0.25 +
      emailScore * 0.20 +
      companyScore * 0.15 +
      addressScore * 0.05
    );

    return {
      nameScore,
      phoneScore,
      emailScore,
      addressScore,
      companyScore,
      overallScore
    };
  }

  /**
   * Calculate name similarity using Levenshtein distance and phonetic matching
   */
  private calculateNameSimilarity(contact1: Contact, contact2: Contact): number {
    const name1 = this.normalizeContactName(contact1);
    const name2 = this.normalizeContactName(contact2);

    if (!name1 || !name2) return 0;

    // Exact match
    if (name1.toLowerCase() === name2.toLowerCase()) return 1.0;

    // Levenshtein distance
    const distance = this.levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
    const maxLength = Math.max(name1.length, name2.length);
    const similarity = 1 - (distance / maxLength);

    // Check for partial matches (first name or last name)
    const parts1 = name1.toLowerCase().split(' ');
    const parts2 = name2.toLowerCase().split(' ');
    
    let partialMatch = 0;
    parts1.forEach(part1 => {
      parts2.forEach(part2 => {
        if (part1 === part2 && part1.length > 2) {
          partialMatch += 0.3;
        }
      });
    });

    return Math.min(1.0, Math.max(similarity, partialMatch));
  }

  /**
   * Calculate phone number similarity
   */
  private calculatePhoneSimilarity(contact1: Contact, contact2: Contact): number {
    const phones1 = this.extractPhoneNumbers(contact1);
    const phones2 = this.extractPhoneNumbers(contact2);

    if (phones1.length === 0 || phones2.length === 0) return 0;

    let maxSimilarity = 0;
    phones1.forEach(phone1 => {
      phones2.forEach(phone2 => {
        const normalized1 = this.normalizePhoneNumber(phone1);
        const normalized2 = this.normalizePhoneNumber(phone2);
        
        if (normalized1 === normalized2) {
          maxSimilarity = 1.0;
        } else if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
          maxSimilarity = Math.max(maxSimilarity, 0.8);
        }
      });
    });

    return maxSimilarity;
  }

  /**
   * Calculate email similarity
   */
  private calculateEmailSimilarity(contact1: Contact, contact2: Contact): number {
    const email1 = contact1.email?.toLowerCase();
    const email2 = contact2.email?.toLowerCase();

    if (!email1 || !email2) return 0;

    if (email1 === email2) return 1.0;

    // Check domain similarity
    const domain1 = email1.split('@')[1];
    const domain2 = email2.split('@')[1];
    
    if (domain1 === domain2) {
      const username1 = email1.split('@')[0];
      const username2 = email2.split('@')[0];
      
      const distance = this.levenshteinDistance(username1, username2);
      const maxLength = Math.max(username1.length, username2.length);
      return 0.5 + (0.5 * (1 - distance / maxLength));
    }

    return 0;
  }

  /**
   * Calculate address similarity
   */
  private calculateAddressSimilarity(contact1: Contact, contact2: Contact): number {
    const address1 = contact1.address?.toLowerCase();
    const address2 = contact2.address?.toLowerCase();

    if (!address1 || !address2) return 0;

    if (address1 === address2) return 1.0;

    const distance = this.levenshteinDistance(address1, address2);
    const maxLength = Math.max(address1.length, address2.length);
    
    return Math.max(0, 1 - (distance / maxLength));
  }

  /**
   * Calculate company similarity
   */
  private calculateCompanySimilarity(contact1: Contact, contact2: Contact): number {
    const company1 = contact1.company?.toLowerCase();
    const company2 = contact2.company?.toLowerCase();

    if (!company1 || !company2) return 0;

    if (company1 === company2) return 1.0;

    const distance = this.levenshteinDistance(company1, company2);
    const maxLength = Math.max(company1.length, company2.length);
    
    return Math.max(0, 1 - (distance / maxLength));
  }

  /**
   * Create a duplicate match with AI-generated merge suggestions
   */
  private async createDuplicateMatch(contact1: Contact, contact2: Contact, similarity: ContactSimilarity): Promise<DuplicateMatch> {
    const matchingFields = this.identifyMatchingFields(contact1, contact2, similarity);
    const reasons = this.generateReasons(contact1, contact2, similarity);
    const suggestedMerge = await this.generateMergeSuggestion(contact1, contact2);

    return {
      id: `${contact1.id}-${contact2.id}`,
      contact1,
      contact2,
      confidence: similarity.overallScore,
      matchingFields,
      suggestedMerge,
      reasons
    };
  }

  /**
   * Generate AI-powered merge suggestion
   */
  private async generateMergeSuggestion(contact1: Contact, contact2: Contact): Promise<Contact> {
    try {
      const prompt = `
        Analyze these two contact records and suggest the best merged version:

        Contact 1:
        - Name: ${this.normalizeContactName(contact1)}
        - Phone: ${this.extractPhoneNumbers(contact1).join(', ')}
        - Email: ${contact1.email || 'N/A'}
        - Company: ${contact1.company || 'N/A'}
        - Address: ${contact1.address || 'N/A'}
        - Notes: ${contact1.notes || 'N/A'}

        Contact 2:
        - Name: ${this.normalizeContactName(contact2)}
        - Phone: ${this.extractPhoneNumbers(contact2).join(', ')}
        - Email: ${contact2.email || 'N/A'}
        - Company: ${contact2.company || 'N/A'}
        - Address: ${contact2.address || 'N/A'}
        - Notes: ${contact2.notes || 'N/A'}

        Return a JSON object with the merged contact information, keeping the most complete and recent data. Use the following format:
        {
          "firstName": "merged first name",
          "lastName": "merged last name",
          "email": "best email",
          "phoneNumbers": ["array of unique phone numbers"],
          "company": "best company name",
          "address": "best address",
          "notes": "combined notes",
          "reasoning": "explanation of merge decisions"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const mergeData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Use contact1 as base and merge in the AI suggestions
      return {
        ...contact1,
        firstName: mergeData.firstName,
        lastName: mergeData.lastName,
        email: mergeData.email,
        company: mergeData.company,
        address: mergeData.address,
        notes: mergeData.notes,
        updatedAt: new Date(),
      };

    } catch (error) {
      console.error('AI merge suggestion failed:', error);
      // Fallback to manual merge logic
      return this.manualMergeSuggestion(contact1, contact2);
    }
  }

  /**
   * Fallback manual merge suggestion
   */
  private manualMergeSuggestion(contact1: Contact, contact2: Contact): Contact {
    return {
      ...contact1,
      firstName: contact1.firstName || contact2.firstName,
      lastName: contact1.lastName || contact2.lastName,
      email: contact1.email || contact2.email,
      company: contact1.company || contact2.company,
      address: contact1.address || contact2.address,
      notes: [contact1.notes, contact2.notes].filter(Boolean).join('\n\n'),
      updatedAt: new Date(),
    };
  }

  /**
   * Identify which fields are matching between contacts
   */
  private identifyMatchingFields(contact1: Contact, contact2: Contact, similarity: ContactSimilarity): string[] {
    const fields: string[] = [];

    if (similarity.nameScore > 0.8) fields.push('name');
    if (similarity.phoneScore > 0.8) fields.push('phone');
    if (similarity.emailScore > 0.8) fields.push('email');
    if (similarity.companyScore > 0.8) fields.push('company');
    if (similarity.addressScore > 0.8) fields.push('address');

    return fields;
  }

  /**
   * Generate human-readable reasons for duplicate detection
   */
  private generateReasons(contact1: Contact, contact2: Contact, similarity: ContactSimilarity): string[] {
    const reasons: string[] = [];

    if (similarity.nameScore > 0.9) {
      reasons.push('Names are nearly identical');
    } else if (similarity.nameScore > 0.7) {
      reasons.push('Names are very similar');
    }

    if (similarity.phoneScore === 1.0) {
      reasons.push('Phone numbers match exactly');
    } else if (similarity.phoneScore > 0.7) {
      reasons.push('Phone numbers are similar');
    }

    if (similarity.emailScore === 1.0) {
      reasons.push('Email addresses match exactly');
    } else if (similarity.emailScore > 0.5) {
      reasons.push('Email addresses are from the same domain');
    }

    if (similarity.companyScore > 0.8) {
      reasons.push('Work at the same company');
    }

    if (similarity.addressScore > 0.8) {
      reasons.push('Have similar addresses');
    }

    return reasons;
  }

  /**
   * Helper methods
   */
  private normalizeContactName(contact: Contact): string {
    const parts = [contact.firstName, contact.lastName].filter(Boolean);
    return parts.join(' ').trim();
  }

  private extractPhoneNumbers(contact: Contact): string[] {
    if (!contact.phoneNumbers) return [];
    
    try {
      if (typeof contact.phoneNumbers === 'string') {
        return JSON.parse(contact.phoneNumbers);
      }
      if (Array.isArray(contact.phoneNumbers)) {
        return contact.phoneNumbers;
      }
    } catch (error) {
      console.error('Error parsing phone numbers:', error);
    }
    
    return [];
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Merge two contacts into one
   */
  async mergeContacts(contact1: Contact, contact2: Contact, mergedData: Partial<Contact>): Promise<Contact> {
    // Combine phone numbers from both contacts
    const phones1 = this.extractPhoneNumbers(contact1);
    const phones2 = this.extractPhoneNumbers(contact2);
    const uniquePhones = [...new Set([...phones1, ...phones2])];

    // Combine tags and groups
    const combinedTags = [...new Set([...(contact1.tags || []), ...(contact2.tags || [])])];
    const combinedGroups = [...new Set([...(contact1.groups || []), ...(contact2.groups || [])])];

    return {
      ...contact1,
      ...mergedData,
      phoneNumbers: JSON.stringify(uniquePhones),
      tags: combinedTags,
      groups: combinedGroups,
      isVip: contact1.isVip || contact2.isVip,
      isFavorite: contact1.isFavorite || contact2.isFavorite,
      updatedAt: new Date(),
    };
  }
}

export const contactDuplicateDetectionService = new ContactDuplicateDetectionService();