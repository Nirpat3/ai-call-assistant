import { storage } from '../storage';
import { Call, InsertCall } from '@shared/schema';

export class CallService {
  async createCall(callData: InsertCall): Promise<Call> {
    return await storage.createCall(callData);
  }

  async getCall(id: number): Promise<Call | undefined> {
    return await storage.getCall(id);
  }

  async getCallBySid(callSid: string): Promise<Call | undefined> {
    return await storage.getCallBySid(callSid);
  }

  async getCalls(organizationId: string, limit = 50): Promise<Call[]> {
    return await storage.getCalls(limit);
  }

  async getCallsToday(organizationId: string): Promise<Call[]> {
    return await storage.getCallsToday();
  }

  async updateCall(id: number, updates: Partial<Call>): Promise<Call> {
    return await storage.updateCall(id, updates);
  }

  async getCallStats(organizationId: string) {
    const callsToday = await this.getCallsToday(organizationId);
    const totalCalls = callsToday.length;
    const aiHandled = callsToday.filter(call => call.aiHandled).length;
    
    return {
      callsToday: totalCalls,
      aiHandled,
      automationRate: totalCalls > 0 ? Math.round((aiHandled / totalCalls) * 100) : 0,
    };
  }
}

export const callService = new CallService();