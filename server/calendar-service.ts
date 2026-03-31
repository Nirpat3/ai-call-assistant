interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetingUrl?: string;
  meetingId?: string;
}

interface CreateEventData {
  title: string;
  description?: string;
  startTime: Date;
  duration: number; // minutes
  attendees: Array<{ email: string; name?: string }>;
  meetingPlatform?: string;
}

export class CalendarIntegrationService {

  async checkAvailability(startTime: Date, duration: number, organizationId?: string): Promise<boolean> {
    // For now, always return true (available)
    // TODO: Implement real calendar availability checking
    return true;
  }

  async createCalendarEvent(data: CreateEventData, organizationId?: string): Promise<CalendarEvent> {
    const endTime = new Date(data.startTime.getTime() + data.duration * 60000);
    
    // Generate a simple meeting URL based on platform
    let meetingUrl = '';
    let meetingId = '';
    
    if (data.meetingPlatform === 'zoom') {
      meetingUrl = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
      meetingId = Math.floor(Math.random() * 1000000000).toString();
    } else if (data.meetingPlatform === 'teams') {
      meetingUrl = `https://teams.microsoft.com/l/meetup-join/${Math.random().toString(36).substring(7)}`;
      meetingId = Math.random().toString(36).substring(7);
    } else if (data.meetingPlatform === 'meet') {
      meetingUrl = `https://meet.google.com/${Math.random().toString(36).substring(7)}`;
      meetingId = Math.random().toString(36).substring(7);
    }

    // Return manual event tracking
    return {
      id: `cal-${Date.now()}`,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime,
      attendees: data.attendees.map(a => a.email),
      meetingUrl,
      meetingId,
    };
  }

  async getUpcomingEvents(organizationId: string, days: number = 7): Promise<CalendarEvent[]> {
    // TODO: Implement calendar integration
    return [];
  }

  async findAvailableSlots(
    organizationId: string,
    date: Date,
    duration: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 17 }
  ): Promise<Date[]> {
    // Generate sample available slots for demo purposes
    const startOfDay = new Date(date);
    startOfDay.setHours(workingHours.start, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(workingHours.end, 0, 0, 0);

    const availableSlots: Date[] = [];
    let currentTime = new Date(startOfDay);
    
    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      if (slotEnd <= endOfDay) {
        availableSlots.push(new Date(currentTime));
      }
      
      currentTime.setMinutes(currentTime.getMinutes() + 30); // 30-minute increments
    }
    
    return availableSlots;
  }
}

// Standalone functions for backward compatibility
export async function checkAvailability(startTime: Date, duration: number, organizationId?: string): Promise<boolean> {
  const service = new CalendarIntegrationService();
  return service.checkAvailability(startTime, duration, organizationId);
}

export async function createCalendarEvent(data: CreateEventData, organizationId?: string): Promise<CalendarEvent> {
  const service = new CalendarIntegrationService();
  return service.createCalendarEvent(data, organizationId);
}

export const calendarService = new CalendarIntegrationService();