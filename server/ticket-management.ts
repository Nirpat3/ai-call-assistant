import { db } from "./db";
import { supportTickets, ticketActivities, ticketSolutions, ticketMetrics, organizations, contacts } from "@shared/schema";
import type { 
  SupportTicket, 
  InsertSupportTicket, 
  TicketActivity, 
  InsertTicketActivity,
  TicketSolution,
  InsertTicketSolution,
  TicketMetrics
} from "@shared/schema";
import { eq, desc, asc, and, gte, lte, sql, count, avg, sum } from "drizzle-orm";
import { knowledgeKeywordMapper } from "./knowledge-keyword-mapper";
import { storage } from "./storage";

export interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number; // in minutes
  aiResolvedPercentage: number;
  humanEscalatedPercentage: number;
  avgSatisfactionScore: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  commonIssues: Array<{ issue: string; count: number; avgResolutionTime: number }>;
  resolutionTrends: Array<{ period: string; resolved: number; created: number }>;
}

export interface BusinessIntelligenceReport {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  overallMetrics: TicketAnalytics;
  categoryBreakdown: Record<string, {
    totalTickets: number;
    avgResolutionTime: number;
    satisfactionScore: number;
    commonSolutions: string[];
  }>;
  aiPerformance: {
    confidenceDistribution: Array<{ range: string; count: number }>;
    successfulResolutions: number;
    escalationReasons: Array<{ reason: string; count: number }>;
    improvementOpportunities: string[];
  };
  customerInsights: {
    repeatCustomers: Array<{ phone: string; name: string; ticketCount: number }>;
    satisfactionTrends: Array<{ period: string; avgScore: number }>;
    escalationPatterns: Array<{ timeOfDay: string; escalationRate: number }>;
  };
}

export class TicketManagementService {
  
  /**
   * Create a new support ticket with AI analysis
   */
  async createTicket(ticketData: Omit<InsertSupportTicket, 'ticketId'>): Promise<SupportTicket> {
    // Generate unique ticket ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    const ticketId = `TICKET-${dateStr}-${randomNum}`;

    // Perform AI analysis on the ticket
    const aiAnalysis = await this.performAIAnalysis(ticketData);

    // Create the ticket
    const [ticket] = await db.insert(supportTickets).values({
      ...ticketData,
      ticketId,
      aiAnalysis: aiAnalysis.analysis,
      aiConfidenceScore: aiAnalysis.confidence.toString(),
      detectedKeywords: aiAnalysis.keywords,
      suggestedSolutions: aiAnalysis.suggestedSolutions,
    }).returning();

    // Log ticket creation activity
    await this.addTicketActivity({
      ticketId: ticket.id,
      activityType: 'status_change',
      description: `Ticket created with ${aiAnalysis.confidence}% AI confidence`,
      performedBy: 'ai_agent',
      agentName: 'Support AI',
      newValue: 'open',
      metadata: { initialAnalysis: aiAnalysis }
    });

    // Apply suggested solutions if high confidence
    if (aiAnalysis.confidence > 80 && aiAnalysis.suggestedSolutions.length > 0) {
      await this.applySuggestedSolutions(ticket.id, aiAnalysis.suggestedSolutions);
    }

    return ticket;
  }

  /**
   * Perform comprehensive AI analysis on ticket content
   */
  private async performAIAnalysis(ticketData: Omit<InsertSupportTicket, 'ticketId'>): Promise<{
    analysis: any;
    confidence: number;
    keywords: string[];
    suggestedSolutions: any[];
  }> {
    try {
      // Use keyword mapping for enhanced analysis
      const keywordAnalysis = await knowledgeKeywordMapper.analyzeUserMessage(
        `${ticketData.title} ${ticketData.description}`
      );

      // Search knowledge base for relevant solutions
      const knowledgeResults = await storage.searchKnowledgeBase(
        ticketData.description,
        { limit: 5, organizationId: ticketData.organizationId }
      );

      // Determine category and priority based on keywords
      const analysis = {
        detectedIntent: keywordAnalysis.suggestedCategories[0] || 'general',
        urgencyIndicators: this.detectUrgencyIndicators(ticketData.description),
        technicalComplexity: this.assessTechnicalComplexity(keywordAnalysis.detectedKeywords),
        estimatedResolutionTime: this.estimateResolutionTime(keywordAnalysis.suggestedCategories),
        recommendedEscalation: keywordAnalysis.confidence < 50,
      };

      return {
        analysis,
        confidence: keywordAnalysis.confidence,
        keywords: keywordAnalysis.detectedKeywords.map(k => k.keyword),
        suggestedSolutions: knowledgeResults.slice(0, 3).map(result => ({
          knowledgeBaseId: result.id,
          title: result.title,
          content: result.content,
          relevanceScore: 0.8 // Could be calculated based on keyword matching
        }))
      };
    } catch (error) {
      console.error('Error performing AI analysis:', error);
      return {
        analysis: { error: 'Analysis failed' },
        confidence: 30,
        keywords: [],
        suggestedSolutions: []
      };
    }
  }

  /**
   * Update ticket status and log activity
   */
  async updateTicketStatus(
    ticketId: number, 
    newStatus: string, 
    performedBy: string = 'ai_agent',
    notes?: string
  ): Promise<SupportTicket> {
    const [currentTicket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    
    if (!currentTicket) {
      throw new Error('Ticket not found');
    }

    const updateData: Partial<SupportTicket> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set resolution/closure timestamps
    if (newStatus === 'resolved') {
      updateData.resolvedAt = new Date();
      // Calculate resolution time
      const resolutionTime = Math.floor(
        (updateData.resolvedAt.getTime() - currentTicket.createdAt!.getTime()) / (1000 * 60)
      );
      updateData.resolutionTime = resolutionTime;
    } else if (newStatus === 'closed') {
      updateData.closedAt = new Date();
    }

    // Update the ticket
    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    // Log the status change activity
    await this.addTicketActivity({
      ticketId: ticketId,
      activityType: 'status_change',
      description: notes || `Status changed from ${currentTicket.status} to ${newStatus}`,
      performedBy,
      oldValue: currentTicket.status,
      newValue: newStatus,
    });

    return updatedTicket;
  }

  /**
   * Add activity log entry
   */
  async addTicketActivity(activity: InsertTicketActivity): Promise<TicketActivity> {
    const [newActivity] = await db.insert(ticketActivities).values(activity).returning();
    return newActivity;
  }

  /**
   * Apply suggested solutions to a ticket
   */
  async applySuggestedSolutions(ticketId: number, solutions: any[]): Promise<void> {
    for (const solution of solutions) {
      await db.insert(ticketSolutions).values({
        ticketId,
        knowledgeBaseId: solution.knowledgeBaseId,
        solutionType: 'knowledge_base',
        solutionContent: solution.content,
        effectiveness: 'pending', // Will be updated based on customer feedback
      });

      await this.addTicketActivity({
        ticketId,
        activityType: 'solution_applied',
        description: `Applied knowledge base solution: ${solution.title}`,
        performedBy: 'ai_agent',
        agentName: 'Support AI',
        metadata: { solutionId: solution.knowledgeBaseId }
      });
    }
  }

  /**
   * Get tickets with filtering and pagination
   */
  async getTickets(filters: {
    organizationId: string;
    status?: string;
    category?: string;
    priority?: string;
    assignedAgent?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ tickets: SupportTicket[]; total: number }> {
    
    let query = db.select().from(supportTickets).where(eq(supportTickets.organizationId, filters.organizationId));
    let countQuery = db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.organizationId, filters.organizationId));

    // Apply filters
    const conditions = [eq(supportTickets.organizationId, filters.organizationId)];
    
    if (filters.status) {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters.category) {
      conditions.push(eq(supportTickets.category, filters.category));
    }
    if (filters.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    // Apply sorting
    const sortField = filters.sortBy === 'priority' ? supportTickets.priority : 
                     filters.sortBy === 'updatedAt' ? supportTickets.updatedAt : 
                     supportTickets.createdAt;
    
    query = filters.sortOrder === 'asc' ? query.orderBy(asc(sortField)) : query.orderBy(desc(sortField));

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const [tickets, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      tickets,
      total: totalResult[0].count
    };
  }

  /**
   * Get ticket analytics for an organization
   */
  async getTicketAnalytics(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<TicketAnalytics> {
    
    const dateFilter = and(
      eq(supportTickets.organizationId, organizationId),
      gte(supportTickets.createdAt, startDate),
      lte(supportTickets.createdAt, endDate)
    );

    // Get basic metrics
    const totalTicketsResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(dateFilter);

    const resolvedTicketsResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(dateFilter, eq(supportTickets.status, 'resolved')));

    const openTicketsResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(dateFilter, eq(supportTickets.status, 'open')));

    const avgResolutionResult = await db
      .select({ avg: avg(supportTickets.resolutionTime) })
      .from(supportTickets)
      .where(and(dateFilter, eq(supportTickets.status, 'resolved')));

    const aiResolvedResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(dateFilter, eq(supportTickets.aiAssigned, true), eq(supportTickets.status, 'resolved')));

    const escalatedResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(and(dateFilter, sql`escalation_level > 0`));

    const avgSatisfactionResult = await db
      .select({ avg: avg(supportTickets.satisfactionScore) })
      .from(supportTickets)
      .where(and(dateFilter, sql`satisfaction_score IS NOT NULL`));

    // Get category breakdown
    const categoryBreakdown = await db
      .select({ 
        category: supportTickets.category, 
        count: count() 
      })
      .from(supportTickets)
      .where(dateFilter)
      .groupBy(supportTickets.category);

    const totalTickets = totalTicketsResult[0].count;
    
    return {
      totalTickets,
      openTickets: openTicketsResult[0].count,
      resolvedTickets: resolvedTicketsResult[0].count,
      avgResolutionTime: Number(avgResolutionResult[0].avg) || 0,
      aiResolvedPercentage: totalTickets > 0 ? (aiResolvedResult[0].count / totalTickets) * 100 : 0,
      humanEscalatedPercentage: totalTickets > 0 ? (escalatedResult[0].count / totalTickets) * 100 : 0,
      avgSatisfactionScore: Number(avgSatisfactionResult[0].avg) || 0,
      topCategories: categoryBreakdown.map(cat => ({
        category: cat.category,
        count: cat.count,
        percentage: totalTickets > 0 ? (cat.count / totalTickets) * 100 : 0
      })),
      commonIssues: [], // Would be populated from keyword analysis
      resolutionTrends: [] // Would be populated from time-series data
    };
  }

  /**
   * Generate comprehensive business intelligence report
   */
  async generateBusinessIntelligenceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessIntelligenceReport> {
    
    // Get overall analytics
    const overallMetrics = await this.getTicketAnalytics(organizationId, startDate, endDate);

    // Get detailed category breakdown with performance metrics
    const categoryBreakdown = await this.getCategoryPerformanceBreakdown(organizationId, startDate, endDate);

    // Get AI performance insights
    const aiPerformance = await this.getAIPerformanceInsights(organizationId, startDate, endDate);

    // Get customer insights
    const customerInsights = await this.getCustomerInsights(organizationId, startDate, endDate);

    return {
      organizationId,
      periodStart: startDate,
      periodEnd: endDate,
      overallMetrics,
      categoryBreakdown,
      aiPerformance,
      customerInsights
    };
  }

  // Helper methods for business intelligence

  private async getCategoryPerformanceBreakdown(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Record<string, any>> {
    const categoryStats = await db
      .select({
        category: supportTickets.category,
        totalTickets: count(),
        avgResolutionTime: avg(supportTickets.resolutionTime),
        avgSatisfaction: avg(supportTickets.satisfactionScore)
      })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.organizationId, organizationId),
        gte(supportTickets.createdAt, startDate),
        lte(supportTickets.createdAt, endDate)
      ))
      .groupBy(supportTickets.category);

    const breakdown: Record<string, any> = {};
    
    for (const stat of categoryStats) {
      breakdown[stat.category] = {
        totalTickets: stat.totalTickets,
        avgResolutionTime: Number(stat.avgResolutionTime) || 0,
        satisfactionScore: Number(stat.avgSatisfaction) || 0,
        commonSolutions: [] // Would be populated from solution analysis
      };
    }

    return breakdown;
  }

  private async getAIPerformanceInsights(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    
    const confidenceDistribution = await db
      .select({
        range: sql`
          CASE 
            WHEN CAST(ai_confidence_score AS DECIMAL) >= 80 THEN '80-100%'
            WHEN CAST(ai_confidence_score AS DECIMAL) >= 60 THEN '60-79%'
            WHEN CAST(ai_confidence_score AS DECIMAL) >= 40 THEN '40-59%'
            ELSE '0-39%'
          END
        `,
        count: count()
      })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.organizationId, organizationId),
        gte(supportTickets.createdAt, startDate),
        lte(supportTickets.createdAt, endDate),
        sql`ai_confidence_score IS NOT NULL`
      ))
      .groupBy(sql`
        CASE 
          WHEN CAST(ai_confidence_score AS DECIMAL) >= 80 THEN '80-100%'
          WHEN CAST(ai_confidence_score AS DECIMAL) >= 60 THEN '60-79%'
          WHEN CAST(ai_confidence_score AS DECIMAL) >= 40 THEN '40-59%'
          ELSE '0-39%'
        END
      `);

    return {
      confidenceDistribution: confidenceDistribution.map(d => ({
        range: d.range as string,
        count: d.count
      })),
      successfulResolutions: 0, // Would calculate from resolved tickets
      escalationReasons: [], // Would analyze escalation patterns
      improvementOpportunities: [] // Would suggest improvements based on patterns
    };
  }

  private async getCustomerInsights(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    
    const repeatCustomers = await db
      .select({
        phone: supportTickets.customerPhone,
        name: supportTickets.customerName,
        ticketCount: count()
      })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.organizationId, organizationId),
        gte(supportTickets.createdAt, startDate),
        lte(supportTickets.createdAt, endDate),
        sql`customer_phone IS NOT NULL`
      ))
      .groupBy(supportTickets.customerPhone, supportTickets.customerName)
      .having(sql`COUNT(*) > 1`)
      .orderBy(desc(count()));

    return {
      repeatCustomers: repeatCustomers.map(c => ({
        phone: c.phone || '',
        name: c.name || '',
        ticketCount: c.ticketCount
      })),
      satisfactionTrends: [], // Would calculate time-series satisfaction data
      escalationPatterns: [] // Would analyze escalation by time of day
    };
  }

  // Helper methods for AI analysis

  private detectUrgencyIndicators(description: string): string[] {
    const urgentKeywords = [
      'urgent', 'emergency', 'critical', 'down', 'not working', 'broken',
      'immediately', 'asap', 'help', 'stuck', 'error', 'failure'
    ];
    
    return urgentKeywords.filter(keyword => 
      description.toLowerCase().includes(keyword)
    );
  }

  private assessTechnicalComplexity(keywords: Array<{ keyword: string; category: string }>): number {
    const complexityScores = {
      'connectivity': 7,
      'payment_processing': 8,
      'software_integration': 9,
      'hardware_malfunction': 6,
      'account_access': 4,
      'billing': 3,
      'general': 2
    };

    let maxComplexity = 2;
    for (const keyword of keywords) {
      const score = complexityScores[keyword.category as keyof typeof complexityScores] || 2;
      maxComplexity = Math.max(maxComplexity, score);
    }

    return maxComplexity;
  }

  private estimateResolutionTime(categories: string[]): number {
    const timeEstimates = {
      'connectivity': 30, // minutes
      'payment_processing': 45,
      'software_integration': 60,
      'hardware_malfunction': 90,
      'account_access': 15,
      'billing': 20,
      'general': 10
    };

    if (categories.length === 0) return 15;
    
    const primaryCategory = categories[0];
    return timeEstimates[primaryCategory as keyof typeof timeEstimates] || 15;
  }
}

export const ticketManagementService = new TicketManagementService();