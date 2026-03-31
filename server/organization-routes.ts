import { Request, Response } from 'express';
import { storage } from './storage';
import { insertOrganizationSchema, insertUserOrganizationSchema } from '@shared/schema';
import { z } from 'zod';

// Admin routes for organization management
export async function getOrganizations(req: Request, res: Response) {
  try {
    const organizations = await storage.getOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
}

export async function createOrganization(req: Request, res: Response) {
  try {
    const data = insertOrganizationSchema.parse(req.body);
    const organization = await storage.createOrganization(data);
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Failed to create organization' });
  }
}

export async function getOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organization = await storage.getOrganization(id);
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ message: 'Failed to fetch organization' });
  }
}

export async function updateOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = insertOrganizationSchema.partial().parse(req.body);
    const organization = await storage.updateOrganization(id, data);
    res.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Failed to update organization' });
  }
}

export async function getOrganizationMembers(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const members = await storage.getOrganizationMembers(id);
    res.json(members);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ message: 'Failed to fetch organization members' });
  }
}

export async function getOrganizationCalls(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const calls = await storage.getCalls(id);
    res.json(calls);
  } catch (error) {
    console.error('Error fetching organization calls:', error);
    res.status(500).json({ message: 'Failed to fetch organization calls' });
  }
}

export async function getOrganizationStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const [members, calls] = await Promise.all([
      storage.getOrganizationMembers(id),
      storage.getCalls(id)
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const callsToday = calls.filter(call => 
      call.startTime && new Date(call.startTime) >= today
    ).length;

    const aiHandledCalls = calls.filter(call => call.aiHandled).length;
    const automationRate = calls.length > 0 ? Math.round((aiHandledCalls / calls.length) * 100) : 0;

    const stats = {
      totalMembers: members.length,
      callsToday,
      totalCalls: calls.length,
      aiHandled: aiHandledCalls,
      automationRate,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    res.status(500).json({ message: 'Failed to fetch organization stats' });
  }
}

export async function getRecentCalls(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const calls = await storage.getCalls(id);
    
    // Return the 10 most recent calls
    const recentCalls = calls.slice(0, 10);
    res.json(recentCalls);
  } catch (error) {
    console.error('Error fetching recent calls:', error);
    res.status(500).json({ message: 'Failed to fetch recent calls' });
  }
}

// User invitation for organizations
export async function inviteUserToOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role } = req.body;

    // For now, we'll just create a placeholder invitation response
    // In a real system, you'd send an email invitation
    const invitation = {
      organizationId: id,
      email,
      firstName,
      lastName,
      role,
      status: 'sent',
      invitedAt: new Date(),
    };

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
}

// Admin user management
export async function getAllUsers(req: Request, res: Response) {
  try {
    // This would need to be implemented to get all users with their organizations
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}

const createUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  organizationId: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']),
});

export async function createUser(req: Request, res: Response) {
  try {
    const { username, email, firstName, lastName, password, organizationId, role } = 
      createUserSchema.parse(req.body);

    // Create user
    const user = await storage.createUser({
      username,
      email,
      firstName,
      lastName,
      password, // In a real app, this should be hashed
    });

    // Add user to organization
    await storage.addUserToOrganization({
      userId: user.id,
      organizationId,
      role,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
}