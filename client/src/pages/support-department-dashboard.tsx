import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AppStoreLayout from "@/components/AppStoreLayout";
import { 
  Headphones, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Settings,
  TrendingUp,
  User,
  MessageSquare,
  BarChart3,
  ExternalLink,
  Search,
  Filter,
  Archive,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SupportDepartmentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1");

  // Fetch support data
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/tickets', organizationId],
    queryFn: () => apiRequest(`/api/tickets?organizationId=${organizationId}`),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/tickets/analytics', organizationId],
    queryFn: () => apiRequest(`/api/tickets/analytics/${organizationId}`),
  });

  const tickets = ticketsData?.tickets || [];

  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'general_inquiry',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/tickets', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/analytics'] });
      toast({ title: "Support ticket created successfully" });
      setNewTicket({ 
        title: '', description: '', category: 'general_inquiry', priority: 'medium',
        customerName: '', customerEmail: '', customerPhone: ''
      });
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number, status: string, notes?: string }) => 
      apiRequest(`/api/tickets/${id}/status`, { 
        method: 'PATCH', 
        body: JSON.stringify({ status, notes }),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({ title: "Ticket status updated" });
    },
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate({ ...newTicket, organizationId });
  };

  const handleStatusUpdate = (ticketId: number, newStatus: string) => {
    updateTicketStatusMutation.mutate({ id: ticketId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Department</h1>
            <p className="text-gray-600 dark:text-gray-400">Customer support and ticket management system</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Support Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.openTickets || 0}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.averageResolutionTimeHours ? `${analytics.averageResolutionTimeHours}h` : '0h'}
              </div>
              <p className="text-xs text-muted-foreground">
                Response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.customerSatisfactionRating ? `${analytics.customerSatisfactionRating}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Customer rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.resolvedToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tickets closed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support Modules */}
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Ticket Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create Support Ticket
                  </CardTitle>
                  <CardDescription>Log new customer support requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Issue Title</Label>
                      <Input
                        id="title"
                        value={newTicket.title}
                        onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                        placeholder="Brief description of issue"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={newTicket.customerName}
                        onChange={(e) => setNewTicket({...newTicket, customerName: e.target.value})}
                        placeholder="Customer's name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newTicket.customerEmail}
                        onChange={(e) => setNewTicket({...newTicket, customerEmail: e.target.value})}
                        placeholder="customer@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Phone (Optional)</Label>
                      <Input
                        id="customerPhone"
                        value={newTicket.customerPhone}
                        onChange={(e) => setNewTicket({...newTicket, customerPhone: e.target.value})}
                        placeholder="+1-555-0123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                          <SelectItem value="technical_support">Technical Support</SelectItem>
                          <SelectItem value="billing">Billing Issue</SelectItem>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
                          <SelectItem value="bug_report">Bug Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value as any})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                        placeholder="Detailed description of the issue..."
                        rows={4}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                      {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Tickets List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Headphones className="h-5 w-5" />
                      Active Support Tickets
                    </CardTitle>
                    <CardDescription>Manage customer support requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ticketsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2">Loading tickets...</p>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-8">
                        <Headphones className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">No support tickets found</p>
                        <p className="text-sm text-gray-500">Create your first ticket to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tickets.slice(0, 5).map((ticket: any) => (
                          <div key={ticket.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">#{ticket.ticketNumber || ticket.id} - {ticket.title}</h3>
                                <p className="text-sm text-gray-600">{ticket.customerName || 'Unknown Customer'}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status}
                                </Badge>
                                <Badge className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-700">
                              <p>{ticket.description}</p>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                Created: {new Date(ticket.createdAt).toLocaleDateString()}
                                {ticket.customerEmail && ` • ${ticket.customerEmail}`}
                              </div>
                              <div className="flex gap-2">
                                {ticket.status === 'open' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate(ticket.id, 'in_progress')}
                                    disabled={updateTicketStatusMutation.isPending}
                                  >
                                    Start Working
                                  </Button>
                                )}
                                {ticket.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate(ticket.id, 'resolved')}
                                    disabled={updateTicketStatusMutation.isPending}
                                  >
                                    Mark Resolved
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button className="w-full" variant="outline" size="sm">
                          View All Tickets
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Knowledge Base Management
                </CardTitle>
                <CardDescription>Manage support articles and FAQ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
                  <p className="text-gray-600 mb-4">
                    Create and manage support articles, FAQs, and troubleshooting guides
                    to help customers find answers quickly.
                  </p>
                  <Button>
                    Manage Knowledge Base
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Support Performance
                  </CardTitle>
                  <CardDescription>Key metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analytics?.totalTickets || 0}</div>
                        <div className="text-sm text-blue-800">Total Tickets</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analytics?.resolvedTickets || 0}</div>
                        <div className="text-sm text-green-800">Resolved</div>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Detailed Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Customer Satisfaction
                  </CardTitle>
                  <CardDescription>Rating trends and feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <p className="font-medium">Average Rating</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${analytics?.customerSatisfactionRating || 0}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{analytics?.customerSatisfactionRating || 0}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Support Configuration
                  </CardTitle>
                  <CardDescription>Configure support workflows and automation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Auto-Assignment</p>
                        <p className="text-sm text-gray-600">Automatic ticket routing</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">SLA Monitoring</p>
                        <p className="text-sm text-gray-600">Response time tracking</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600">Customer updates</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                  <Button className="w-full">
                    Configure Support Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    External Integrations
                  </CardTitle>
                  <CardDescription>Connect with support platforms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Zendesk
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect ServiceNow
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Freshdesk
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Slack
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}