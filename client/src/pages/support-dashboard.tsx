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
  Headphones, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  MessageSquare,
  TrendingUp,
  User,
  Calendar,
  Search,
  Filter,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SupportTicket {
  id: number;
  ticketNumber: string;
  organizationId: string;
  contactId?: number;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tags: string[];
  resolutionNotes?: string;
  estimatedResolutionTime?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  averageResolutionTime: number;
  customerSatisfaction: number;
  firstResponseTime: number;
}

export default function SupportDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1");

  // Fetch support data
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/tickets', organizationId],
    queryFn: () => apiRequest(`/api/tickets?organizationId=${organizationId}`),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/tickets/analytics', organizationId],
    queryFn: () => apiRequest(`/api/tickets/analytics/${organizationId}`),
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/tickets', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/analytics'] });
      toast({ title: "Support ticket created successfully" });
      setNewTicket({ 
        title: '', 
        description: '', 
        category: 'general_inquiry', 
        priority: 'medium',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        tags: []
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
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/analytics'] });
      toast({ title: "Ticket status updated successfully" });
    },
  });

  // Form states
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'general_inquiry',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    tags: [] as string[]
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicketMutation.mutate({ 
      ...newTicket, 
      organizationId,
      tags: newTicket.tags.length > 0 ? newTicket.tags : []
    });
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

  const filteredTickets = tickets?.tickets?.filter((ticket: SupportTicket) => {
    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return statusMatch && priorityMatch;
  }) || [];

  return (
    <AppStoreLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Department</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage support tickets and customer assistance</p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Headphones className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalTickets || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics?.ticketsThisWeek || 0} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.openTickets || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
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
                Average response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="create">Create Ticket</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tickets List */}
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="text-center py-4">Loading tickets...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No tickets found</div>
                ) : (
                  <div className="space-y-4">
                    {filteredTickets.map((ticket: SupportTicket) => (
                      <div key={ticket.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">#{ticket.ticketNumber} - {ticket.title}</h3>
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
                            {ticket.status === 'resolved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(ticket.id, 'closed')}
                                disabled={updateTicketStatusMutation.isPending}
                              >
                                Close Ticket
                              </Button>
                            )}
                          </div>
                        </div>
                        {ticket.tags && ticket.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {ticket.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Support Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-title">Ticket Title</Label>
                      <Input
                        id="ticket-title"
                        value={newTicket.title}
                        onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                        placeholder="Brief description of the issue"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-name">Customer Name</Label>
                      <Input
                        id="customer-name"
                        value={newTicket.customerName}
                        onChange={(e) => setNewTicket({...newTicket, customerName: e.target.value})}
                        placeholder="Customer's full name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Customer Email</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        value={newTicket.customerEmail}
                        onChange={(e) => setNewTicket({...newTicket, customerEmail: e.target.value})}
                        placeholder="customer@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone">Customer Phone</Label>
                      <Input
                        id="customer-phone"
                        value={newTicket.customerPhone}
                        onChange={(e) => setNewTicket({...newTicket, customerPhone: e.target.value})}
                        placeholder="+1-555-0123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newTicket.category} onValueChange={(value) => setNewTicket({...newTicket, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                          <SelectItem value="technical_support">Technical Support</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
                          <SelectItem value="bug_report">Bug Report</SelectItem>
                          <SelectItem value="account_issue">Account Issue</SelectItem>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      placeholder="Detailed description of the issue or request..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? 'Creating...' : 'Create Support Ticket'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Support Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600 mb-4">
                    Comprehensive analytics including resolution times, customer satisfaction scores,
                    and performance trends are available here.
                  </p>
                  {analytics && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analytics.totalTickets || 0}</div>
                        <div className="text-sm text-blue-800">Total Tickets</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analytics.resolvedTickets || 0}</div>
                        <div className="text-sm text-green-800">Resolved</div>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{analytics.averageResolutionTimeHours || 0}h</div>
                        <div className="text-sm text-yellow-800">Avg Resolution</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{analytics.customerSatisfactionRating || 0}%</div>
                        <div className="text-sm text-purple-800">Satisfaction</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Support Integrations</CardTitle>
                <CardDescription>Connect with external support systems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <ExternalLink className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Third-party Integrations</h3>
                  <p className="text-gray-600 mb-4">
                    Connect with popular support platforms like Zendesk, ServiceNow, 
                    Freshdesk, and other helpdesk solutions.
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Button variant="outline">
                      Connect Zendesk
                    </Button>
                    <Button variant="outline">
                      Connect ServiceNow
                    </Button>
                    <Button variant="outline">
                      Connect Freshdesk
                    </Button>
                    <Button variant="outline">
                      Connect Jira
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}