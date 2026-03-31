import { storage } from './storage';

export interface KeywordMapping {
  keyword: string;
  category: string;
  priority: number;
  relatedTerms: string[];
  documentTags: string[];
}

export interface DocumentClassification {
  documentId: number;
  title: string;
  keywords: string[];
  category: string;
  priority: number;
  confidence: number;
}

export class KnowledgeKeywordMapper {
  private keywordMappings: Map<string, KeywordMapping> = new Map();
  private documentClassifications: Map<number, DocumentClassification> = new Map();
  
  constructor() {
    this.initializeKeywordMappings();
  }

  private initializeKeywordMappings() {
    // Payment Terminal Keywords
    this.addKeywordMapping('pax', 'payment_terminal', 9, 
      ['terminal', 'payment', 'pos', 'card reader'], 
      ['pax', 'payment', 'terminal']
    );
    
    this.addKeywordMapping('terminal', 'payment_terminal', 8,
      ['pax', 'payment', 'pos', 'machine', 'device'],
      ['terminal', 'payment', 'pax']
    );

    this.addKeywordMapping('payment', 'payment_terminal', 7,
      ['transaction', 'card', 'pos', 'terminal', 'processing'],
      ['payment', 'terminal', 'processing']
    );

    // Connectivity Keywords
    this.addKeywordMapping('connecting', 'connectivity', 9,
      ['connection', 'network', 'wifi', 'ethernet', 'internet'],
      ['connectivity', 'network', 'technical']
    );

    this.addKeywordMapping('connection', 'connectivity', 9,
      ['connecting', 'network', 'wifi', 'ethernet', 'link'],
      ['connectivity', 'network', 'technical']
    );

    this.addKeywordMapping('network', 'connectivity', 8,
      ['internet', 'wifi', 'ethernet', 'connection', 'lan'],
      ['network', 'connectivity', 'technical']
    );

    // Software Issues
    this.addKeywordMapping('crash', 'software', 9,
      ['crashing', 'error', 'freeze', 'hang', 'bug'],
      ['software', 'technical', 'troubleshooting']
    );

    this.addKeywordMapping('software', 'software', 8,
      ['application', 'program', 'system', 'update'],
      ['software', 'technical', 'troubleshooting']
    );

    this.addKeywordMapping('error', 'software', 8,
      ['bug', 'issue', 'problem', 'fault', 'exception'],
      ['technical', 'troubleshooting', 'software']
    );

    // Hardware Issues
    this.addKeywordMapping('hardware', 'hardware', 8,
      ['device', 'machine', 'equipment', 'physical'],
      ['hardware', 'technical', 'device']
    );

    this.addKeywordMapping('device', 'hardware', 7,
      ['hardware', 'machine', 'equipment', 'unit'],
      ['hardware', 'technical', 'device']
    );
  }

  private addKeywordMapping(
    keyword: string, 
    category: string, 
    priority: number, 
    relatedTerms: string[], 
    documentTags: string[]
  ) {
    this.keywordMappings.set(keyword.toLowerCase(), {
      keyword: keyword.toLowerCase(),
      category,
      priority,
      relatedTerms: relatedTerms.map(t => t.toLowerCase()),
      documentTags
    });
  }

  async analyzeUserMessage(message: string): Promise<{
    detectedKeywords: KeywordMapping[];
    suggestedCategories: string[];
    recommendedDocuments: any[];
    confidence: number;
  }> {
    const lowerMessage = message.toLowerCase();
    const detectedKeywords: KeywordMapping[] = [];
    const categoryScores = new Map<string, number>();

    // Find direct keyword matches
    for (const [keyword, mapping] of this.keywordMappings) {
      if (lowerMessage.includes(keyword)) {
        detectedKeywords.push(mapping);
        
        // Score the category
        const currentScore = categoryScores.get(mapping.category) || 0;
        categoryScores.set(mapping.category, currentScore + mapping.priority);

        // Check for related terms to boost confidence
        for (const relatedTerm of mapping.relatedTerms) {
          if (lowerMessage.includes(relatedTerm)) {
            categoryScores.set(mapping.category, categoryScores.get(mapping.category)! + 2);
          }
        }
      }
    }

    // Get top categories by score
    const suggestedCategories = Array.from(categoryScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Find relevant documents
    const recommendedDocuments = await this.findRelevantDocuments(detectedKeywords, lowerMessage);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(detectedKeywords, categoryScores, recommendedDocuments);

    return {
      detectedKeywords,
      suggestedCategories,
      recommendedDocuments,
      confidence
    };
  }

  private async findRelevantDocuments(
    detectedKeywords: KeywordMapping[], 
    message: string
  ): Promise<any[]> {
    const searchTerms = new Set<string>();
    
    // Add detected keywords and their related terms
    for (const mapping of detectedKeywords) {
      searchTerms.add(mapping.keyword);
      mapping.relatedTerms.forEach(term => searchTerms.add(term));
      mapping.documentTags.forEach(tag => searchTerms.add(tag));
    }

    // Search knowledge base with combined terms
    const allDocuments: any[] = [];
    
    for (const term of searchTerms) {
      try {
        const docs = await storage.searchKnowledgeBase(term, 5);
        allDocuments.push(...docs);
      } catch (error) {
        console.error(`Error searching for term "${term}":`, error);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueDocs = allDocuments.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );

    // Score documents based on keyword matches
    return uniqueDocs
      .map(doc => ({
        ...doc,
        relevanceScore: this.calculateDocumentRelevance(doc, detectedKeywords, message)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  private calculateDocumentRelevance(
    document: any, 
    detectedKeywords: KeywordMapping[], 
    message: string
  ): number {
    let score = 0;
    const docContent = (document.title + ' ' + document.content + ' ' + document.tags?.join(' ')).toLowerCase();

    // Score based on detected keywords
    for (const mapping of detectedKeywords) {
      if (docContent.includes(mapping.keyword)) {
        score += mapping.priority * 2;
      }
      
      // Bonus for related terms
      for (const relatedTerm of mapping.relatedTerms) {
        if (docContent.includes(relatedTerm)) {
          score += 1;
        }
      }
    }

    // Bonus for direct message word matches
    const messageWords = message.toLowerCase().split(/\s+/);
    for (const word of messageWords) {
      if (word.length > 3 && docContent.includes(word)) {
        score += 0.5;
      }
    }

    return score;
  }

  private calculateConfidence(
    detectedKeywords: KeywordMapping[], 
    categoryScores: Map<string, number>, 
    documents: any[]
  ): number {
    let confidence = 0;

    // Base confidence from keywords
    if (detectedKeywords.length > 0) {
      confidence += Math.min(detectedKeywords.length * 20, 60);
    }

    // Boost from category scoring
    const maxCategoryScore = Math.max(...Array.from(categoryScores.values()), 0);
    confidence += Math.min(maxCategoryScore * 2, 30);

    // Boost from document matches
    if (documents.length > 0) {
      confidence += Math.min(documents.length * 5, 20);
    }

    return Math.min(confidence, 100);
  }

  async updateKeywordMappingsFromKnowledgeBase(): Promise<void> {
    try {
      // Get all knowledge base documents
      const allDocuments = await storage.searchKnowledgeBase('', 100);
      
      for (const doc of allDocuments) {
        const classification = await this.classifyDocument(doc);
        this.documentClassifications.set(doc.id, classification);
        
        // Auto-generate keyword mappings from document content
        await this.extractKeywordsFromDocument(doc);
      }
      
      console.log(`Updated keyword mappings for ${allDocuments.length} documents`);
    } catch (error) {
      console.error('Error updating keyword mappings:', error);
    }
  }

  private async classifyDocument(document: any): Promise<DocumentClassification> {
    const content = (document.title + ' ' + document.content).toLowerCase();
    const extractedKeywords: string[] = [];
    
    // Extract important words (longer than 3 characters, not common words)
    const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'end', 'few', 'got', 'let', 'put', 'say', 'she', 'too', 'use']);
    
    const words = content.split(/\s+/).filter(word => 
      word.length > 3 && 
      !commonWords.has(word) && 
      /^[a-z]+$/.test(word)
    );
    
    // Get unique words and their frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Take top keywords
    const topKeywords = Array.from(wordFreq.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    extractedKeywords.push(...topKeywords);

    // Determine category based on existing mappings
    let category = 'general';
    let maxScore = 0;
    
    for (const keyword of extractedKeywords) {
      const mapping = this.keywordMappings.get(keyword);
      if (mapping && mapping.priority > maxScore) {
        category = mapping.category;
        maxScore = mapping.priority;
      }
    }

    return {
      documentId: document.id,
      title: document.title,
      keywords: extractedKeywords,
      category,
      priority: document.confidence || 50,
      confidence: Math.min(maxScore * 10, 100)
    };
  }

  private async extractKeywordsFromDocument(document: any): Promise<void> {
    const classification = this.documentClassifications.get(document.id);
    if (!classification) return;

    // Add new keywords from this document
    for (const keyword of classification.keywords) {
      if (!this.keywordMappings.has(keyword) && keyword.length > 4) {
        this.addKeywordMapping(
          keyword,
          classification.category,
          Math.min(classification.priority / 10, 8),
          [], // Will be populated as we find related terms
          document.tags || []
        );
      }
    }
  }

  getKeywordMappings(): Map<string, KeywordMapping> {
    return this.keywordMappings;
  }

  getDocumentClassifications(): Map<number, DocumentClassification> {
    return this.documentClassifications;
  }
}

export const knowledgeKeywordMapper = new KnowledgeKeywordMapper();