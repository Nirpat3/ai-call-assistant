import { openai } from "./openai";
import { sendEmail } from "./email-service";

// Simplified sales management without database complexity for now
export class SimpleSalesService {
  
  // Mock data for demonstration
  private mockLeads = [
    {
      id: 1,
      organizationId: "org-1",
      contactName: "John Smith",
      email: "john@example.com",
      phone: "+1-555-0123",
      company: "Tech Corp",
      source: "website",
      status: "new",
      priority: "high",
      estimatedValue: 50000,
      notes: "Interested in enterprise solution",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: 2,
      organizationId: "org-1", 
      contactName: "Sarah Johnson",
      email: "sarah@startup.io",
      phone: "+1-555-0124",
      company: "StartupCo",
      source: "referral",
      status: "qualified",
      priority: "medium",
      estimatedValue: 25000,
      notes: "Needs demo next week",
      createdAt: new Date("2024-01-20"),
    }
  ];

  private mockDemos = [
    {
      id: 1,
      leadId: 2,
      title: "StartupCo Product Demo",
      scheduledDate: new Date("2024-01-25T14:00:00Z"),
      duration: 60,
      status: "scheduled",
      meetingUrl: "https://zoom.us/j/123456789",
      attendees: ["sarah@startup.io"],
    }
  ];

  async getLeads(organizationId: string) {
    return this.mockLeads.filter(lead => lead.organizationId === organizationId);
  }

  async createLead(data: any) {
    const newLead = {
      id: Math.floor(Math.random() * 10000),
      organizationId: data.organizationId,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      source: data.source || "manual",
      status: "new",
      priority: data.priority || "medium", 
      estimatedValue: data.estimatedValue || 0,
      notes: data.notes || "",
      createdAt: new Date(),
    };
    
    this.mockLeads.push(newLead);
    return newLead;
  }

  async getDemos(organizationId: string) {
    return this.mockDemos;
  }

  async scheduleDemo(data: any) {
    const newDemo = {
      id: Math.floor(Math.random() * 10000),
      leadId: data.leadId,
      title: data.title,
      scheduledDate: new Date(data.scheduledDate),
      duration: data.duration || 60,
      status: "scheduled",
      meetingUrl: data.meetingUrl || `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`,
      attendees: data.attendees || [],
    };

    this.mockDemos.push(newDemo);
    return newDemo;
  }

  async getSalesMetrics(organizationId: string) {
    const leads = this.mockLeads.filter(lead => lead.organizationId === organizationId);
    
    return {
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === 'new').length,
      qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
      demosScheduled: this.mockDemos.length,
      closedWon: leads.filter(l => l.status === 'closed_won').length,
      totalPipelineValue: leads.reduce((sum, lead) => sum + lead.estimatedValue, 0),
      conversionRate: leads.length > 0 ? 
        (leads.filter(l => l.status === 'closed_won').length / leads.length) * 100 : 0,
    };
  }

  async generateFollowUpEmail(leadId: number) {
    const lead = this.mockLeads.find(l => l.id === leadId);
    if (!lead) throw new Error("Lead not found");

    const prompt = `Generate a professional follow-up email for this sales lead:
    - Contact: ${lead.contactName} from ${lead.company}
    - Current Status: ${lead.status}
    - Estimated Value: $${lead.estimatedValue}
    - Notes: ${lead.notes}
    
    Make it personalized and include:
    - Thank you for their interest
    - Brief value proposition recap
    - Clear next steps
    - Professional call to action
    
    Return as JSON with 'subject' and 'content' fields.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || '{"subject":"Follow up","content":"Thank you for your interest."}');
    } catch (error) {
      return {
        subject: `Follow up - ${lead.company}`,
        content: `Hi ${lead.contactName},\n\nThank you for your interest in our solution. I wanted to follow up on our previous conversation.\n\nBest regards,\nSales Team`
      };
    }
  }

  async sendFollowUpEmail(leadId: number) {
    const lead = this.mockLeads.find(l => l.id === leadId);
    if (!lead) throw new Error("Lead not found");

    const emailContent = await this.generateFollowUpEmail(leadId);
    
    await sendEmail({
      to: lead.email,
      subject: emailContent.subject,
      html: emailContent.content,
    });

    return { success: true, message: "Follow-up email sent" };
  }
}

export const simpleSales = new SimpleSalesService();