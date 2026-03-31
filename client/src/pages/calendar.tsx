import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Video, 
  Phone, 
  MapPin, 
  Plus, 
  Settings,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetingUrl?: string;
  meetingId?: string;
  type: 'call' | 'meeting' | 'demo' | 'consultation';
}

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 60,
    attendees: '',
    meetingPlatform: 'zoom'
  });

  // Mock events data
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
    initialData: [
      {
        id: '1',
        title: 'Sales Demo with Acme Corp',
        description: 'Product demonstration and Q&A session',
        startTime: new Date(2025, 0, 26, 14, 0),
        endTime: new Date(2025, 0, 26, 15, 0),
        attendees: ['john@acme.com', 'sarah@acme.com'],
        meetingUrl: 'https://zoom.us/j/123456789',
        type: 'demo'
      },
      {
        id: '2',
        title: 'Customer Support Call',
        description: 'Technical support session',
        startTime: new Date(2025, 0, 27, 10, 30),
        endTime: new Date(2025, 0, 27, 11, 0),
        attendees: ['support@customer.com'],
        type: 'call'
      }
    ]
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await apiRequest("/api/calendar/create-event", {
        method: "POST",
        body: JSON.stringify(eventData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowEventForm(false);
      setEventForm({
        title: '',
        description: '',
        startTime: '',
        duration: 60,
        attendees: '',
        meetingPlatform: 'zoom'
      });
      toast({
        title: "Event Created",
        description: "Your calendar event has been scheduled successfully."
      });
    }
  });

  const handleCreateEvent = () => {
    if (!eventForm.title || !eventForm.startTime) {
      toast({
        title: "Missing Information",
        description: "Please provide event title and start time.",
        variant: "destructive"
      });
      return;
    }

    const startTime = new Date(eventForm.startTime);
    createEventMutation.mutate({
      title: eventForm.title,
      description: eventForm.description,
      startTime,
      duration: eventForm.duration,
      attendees: eventForm.attendees.split(',').map(email => ({ email: email.trim() })),
      meetingPlatform: eventForm.meetingPlatform
    });
  };

  // Calendar view helpers
  const weekStart = startOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6)
  });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.startTime), date)
    );
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      'call': 'bg-blue-100 text-blue-800 border-blue-200',
      'meeting': 'bg-green-100 text-green-800 border-green-200',
      'demo': 'bg-purple-100 text-purple-800 border-purple-200',
      'consultation': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[type as keyof typeof colors] || colors.meeting;
  };

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              Calendar
            </h1>
            <p className="text-muted-foreground">Manage appointments, demos, and meetings</p>
          </div>
          <Button 
            onClick={() => setShowEventForm(true)}
            className="w-full sm:w-auto"
            data-testid="button-create-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Event
          </Button>
        </div>

        <Tabs defaultValue="week" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="week" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Week View */}
          <TabsContent value="week" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Week of {format(weekStart, 'MMMM d, yyyy')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-3 rounded-lg border min-h-[200px] ${
                          isCurrentDay ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-2 ${
                          isCurrentDay ? 'text-blue-800' : 'text-gray-900'
                        }`}>
                          {format(day, 'E, MMM d')}
                          {isCurrentDay && <span className="ml-1 text-blue-600">(Today)</span>}
                        </div>
                        <div className="space-y-2">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`p-2 rounded border text-xs ${getEventTypeColor(event.type)}`}
                              data-testid={`event-${event.id}`}
                            >
                              <div className="font-medium">{event.title}</div>
                              <div className="flex items-center gap-1 mt-1 text-gray-600">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.startTime), 'h:mm a')}
                              </div>
                              {event.meetingUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 p-1 mt-1 text-xs"
                                  onClick={() => window.open(event.meetingUrl, '_blank')}
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  Join
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Events */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Your scheduled appointments and meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`upcoming-event-${event.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{event.title}</h3>
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(new Date(event.startTime), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                          </div>
                          {event.attendees.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      {event.meetingUrl && (
                        <Button
                          onClick={() => window.open(event.meetingUrl, '_blank')}
                          className="ml-4"
                          data-testid={`button-join-${event.id}`}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar Integrations</CardTitle>
                  <CardDescription>Connect external calendar services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Google Calendar</div>
                        <div className="text-sm text-gray-600">Sync with Google Calendar</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Outlook Calendar</div>
                        <div className="text-sm text-gray-600">Sync with Microsoft Outlook</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Meeting Platforms</CardTitle>
                  <CardDescription>Configure video conferencing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Zoom</div>
                        <div className="text-sm text-gray-600">Auto-generate Zoom links</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Microsoft Teams</div>
                        <div className="text-sm text-gray-600">Generate Teams meeting links</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Creation Form Modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Schedule New Event</CardTitle>
                <CardDescription>Create a new calendar event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title"
                    data-testid="input-event-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Event description (optional)"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                      data-testid="input-start-time"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select
                      value={eventForm.duration.toString()}
                      onValueChange={(value) => setEventForm(prev => ({ ...prev, duration: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="attendees">Attendees (comma-separated emails)</Label>
                  <Input
                    id="attendees"
                    value={eventForm.attendees}
                    onChange={(e) => setEventForm(prev => ({ ...prev, attendees: e.target.value }))}
                    placeholder="john@example.com, sarah@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="platform">Meeting Platform</Label>
                  <Select
                    value={eventForm.meetingPlatform}
                    onValueChange={(value) => setEventForm(prev => ({ ...prev, meetingPlatform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="meet">Google Meet</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateEvent}
                    disabled={createEventMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-event"
                  >
                    {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEventForm(false)}
                    className="flex-1"
                    data-testid="button-cancel-event"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppStoreLayout>
  );
}