import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppStoreLayout from "@/components/AppStoreLayout";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Mail, 
  Phone,
  Plus,
  Video,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Lead {
  id: number;
  contactName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  priority: string;
  estimatedValue: number;
  notes: string;
  createdAt: string;
}

interface Demo {
  id: number;
  leadId: number;
  title: string;
  scheduledDate: string;
  duration: number;
  status: string;
  meetingUrl: string;
  attendees: string[];
}

interface SalesMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  demosScheduled: number;
  closedWon: number;
  totalPipelineValue: number;
  conversionRate: number;
}

export default function SalesDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1"); // Mock organization ID

  // Fetch sales data
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['/api/sales/leads', organizationId],
    queryFn: () => apiRequest(`/api/sales/leads/${organizationId}`),
  });

  const { data: demos = [], isLoading: demosLoading } = useQuery({
    queryKey: ['/api/sales/demos', organizationId],
    queryFn: () => apiRequest(`/api/sales/demos/${organizationId}`),
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/sales/metrics', organizationId],
    queryFn: () => apiRequest(`/api/sales/metrics/${organizationId}`),
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/sales/leads', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
      toast({ title: "Lead created successfully" });
      setNewLead({ contactName: '', email: '', phone: '', company: '', source: 'website', priority: 'medium', estimatedValue: 0, notes: '' });
    },
  });

  const scheduleDemoMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/sales/demos', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/demos'] });
      toast({ title: "Demo scheduled successfully" });
      setNewDemo({ leadId: 0, title: '', scheduledDate: '', duration: 60, attendees: [] });
    },
  });

  const generateEmailMutation = useMutation({
    mutationFn: (leadId: number) => apiRequest(`/api/sales/leads/${leadId}/generate-email`, { method: 'POST' }),
    onSuccess: (data, leadId) => {
      setEmailContent(data);
      setSelectedLeadForEmail(leadId);
      toast({ title: "Email generated successfully" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (leadId: number) => apiRequest(`/api/sales/leads/${leadId}/send-email`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setEmailContent(null);
      setSelectedLeadForEmail(null);
    },
  });

  // Form states
  const [newLead, setNewLead] = useState({
    contactName: '',
    email: '',
    phone: '',
    company: '',
    source: 'website',
    priority: 'medium',
    estimatedValue: 0,
    notes: ''
  });

  const [newDemo, setNewDemo] = useState({
    leadId: 0,
    title: '',
    scheduledDate: '',
    duration: 60,
    attendees: [] as string[]
  });

  const [emailContent, setEmailContent] = useState<{subject: string, content: string} | null>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<number | null>(null);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate({ ...newLead, organizationId });
  };

  const handleScheduleDemo = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleDemoMutation.mutate(newDemo);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'closed_won': return 'bg-emerald-100 text-emerald-800';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppStoreLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Department</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage leads, schedule demos, and track sales performance</p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics?.newLeads || 0} new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics?.totalPipelineValue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all open leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demos Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.demosScheduled || 0}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics?.conversionRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Lead to close ratio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="demos">Demos</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="emails">Email Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add New Lead Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLead} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        value={newLead.contactName}
                        onChange={(e) => setNewLead({...newLead, contactName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLead.email}
                        onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={newLead.company}
                        onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Select value={newLead.source} onValueChange={(value) => setNewLead({...newLead, source: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="cold_call">Cold Call</SelectItem>
                          <SelectItem value="email">Email Campaign</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newLead.priority} onValueChange={(value) => setNewLead({...newLead, priority: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                      <Input
                        id="estimatedValue"
                        type="number"
                        value={newLead.estimatedValue}
                        onChange={(e) => setNewLead({...newLead, estimatedValue: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newLead.notes}
                        onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createLeadMutation.isPending}>
                      {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Leads List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Leads</CardTitle>
                    <CardDescription>Manage your sales pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leadsLoading ? (
                      <div className="text-center py-4">Loading leads...</div>
                    ) : leads.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No leads found</div>
                    ) : (
                      <div className="space-y-4">
                        {leads.map((lead: Lead) => (
                          <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{lead.contactName}</h3>
                                <p className="text-sm text-gray-600">{lead.company}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getStatusColor(lead.status)}>
                                  {lead.status}
                                </Badge>
                                <Badge className={getPriorityColor(lead.priority)}>
                                  {lead.priority}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {lead.email}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {lead.phone || 'No phone'}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                ${lead.estimatedValue.toLocaleString()}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => generateEmailMutation.mutate(lead.id)}
                                  disabled={generateEmailMutation.isPending}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Email
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setNewDemo({...newDemo, leadId: lead.id, title: `Demo for ${lead.company}`})}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Schedule Demo
                                </Button>
                              </div>
                            </div>
                            {lead.notes && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {lead.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="demos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Schedule Demo Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Schedule Demo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleScheduleDemo} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-lead">Lead</Label>
                      <Select 
                        value={newDemo.leadId.toString()} 
                        onValueChange={(value) => setNewDemo({...newDemo, leadId: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {leads.map((lead: Lead) => (
                            <SelectItem key={lead.id} value={lead.id.toString()}>
                              {lead.contactName} - {lead.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-title">Demo Title</Label>
                      <Input
                        id="demo-title"
                        value={newDemo.title}
                        onChange={(e) => setNewDemo({...newDemo, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-date">Date & Time</Label>
                      <Input
                        id="demo-date"
                        type="datetime-local"
                        value={newDemo.scheduledDate}
                        onChange={(e) => setNewDemo({...newDemo, scheduledDate: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-duration">Duration (minutes)</Label>
                      <Input
                        id="demo-duration"
                        type="number"
                        value={newDemo.duration}
                        onChange={(e) => setNewDemo({...newDemo, duration: parseInt(e.target.value) || 60})}
                        min="15"
                        max="240"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={scheduleDemoMutation.isPending}>
                      {scheduleDemoMutation.isPending ? 'Scheduling...' : 'Schedule Demo'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Demos List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Demos</CardTitle>
                    <CardDescription>Upcoming product demonstrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {demosLoading ? (
                      <div className="text-center py-4">Loading demos...</div>
                    ) : demos.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No demos scheduled</div>
                    ) : (
                      <div className="space-y-4">
                        {demos.map((demo: Demo) => (
                          <div key={demo.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{demo.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {new Date(demo.scheduledDate).toLocaleString()}
                                </p>
                              </div>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {demo.duration}m
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                <a 
                                  href={demo.meetingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Join Meeting
                                </a>
                              </div>
                              <Badge variant="secondary">
                                {demo.status}
                              </Badge>
                            </div>
                            {demo.attendees.length > 0 && (
                              <div className="text-sm text-gray-600">
                                Attendees: {demo.attendees.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar Integration</CardTitle>
                <CardDescription>Sync with external calendar systems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Calendar Integration Setup</h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Google Calendar, Outlook, or other calendar systems to automatically 
                    sync demo schedules and check availability.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline">
                      Connect Google Calendar
                    </Button>
                    <Button variant="outline">
                      Connect Outlook
                    </Button>
                    <Button variant="outline">
                      Connect Zoom
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Automation</CardTitle>
                  <CardDescription>AI-powered follow-up emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Click "Email" next to any lead to generate personalized follow-up emails using AI.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {emailContent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Email</CardTitle>
                    <CardDescription>Review and send the AI-generated email</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={emailContent.subject} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea 
                        value={emailContent.content} 
                        readOnly 
                        rows={8}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => selectedLeadForEmail && sendEmailMutation.mutate(selectedLeadForEmail)}
                        disabled={sendEmailMutation.isPending}
                        className="flex-1"
                      >
                        {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEmailContent(null);
                          setSelectedLeadForEmail(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}