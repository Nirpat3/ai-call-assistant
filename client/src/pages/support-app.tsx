import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import { 
  Ticket, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Plus,
  Search,
  Filter,
  BarChart3,
  Users,
  Zap,
  Star,
  TrendingUp,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const tabs = [
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'automation', label: 'Automation', icon: Bot },
  { id: 'knowledge', label: 'Knowledge', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function SupportApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1");
  const [activeTab, setActiveTab] = useState('tickets');

  // Fetch support data
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/tickets'],
    queryFn: () => apiRequest('/api/tickets'),
  });

  const { data: ticketAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/tickets/analytics', organizationId],
    queryFn: () => apiRequest(`/api/tickets/analytics/${organizationId}`),
  });

  const { data: supportStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/support/stats'],
    queryFn: () => apiRequest('/api/support/stats'),
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (ticketData: any) => apiRequest('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({ title: "Ticket created successfully" });
    },
    onError: () => {
      toast({ title: "Error creating ticket", variant: "destructive" });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTicketsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Support Tickets</h3>
          <p className="text-sm text-gray-600">Manage customer support requests</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Recent Tickets
            </CardTitle>
            <CardDescription>Latest support requests from customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticketsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading tickets...</p>
                </div>
              ) : (
                Array.isArray(tickets) && tickets.length > 0 ? tickets.slice(0, 5).map((ticket: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{ticket.title || `Ticket #${ticket.id || index + 1}`}</p>
                        <p className="text-sm text-gray-600">{ticket.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Customer: {ticket.customerName || ticket.email || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status || 'Open'}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority || 'Medium'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Created: {ticket.createdAt || 'Recently'}</span>
                      <span>Agent: {ticket.assignedTo || 'Unassigned'}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No tickets to display</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Search Tickets
            </Button>
            <Button className="w-full" variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter by Status
            </Button>
            <Button className="w-full" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Assign Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAutomationTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Support Automation</h3>
          <p className="text-sm text-gray-600">AI-powered support automation and workflows</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Auto-Response
            </CardTitle>
            <CardDescription>Automated responses for common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Smart Reply Active</p>
                  <p className="text-sm text-gray-600">Handling 75% of inquiries</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">Enabled</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Auto-resolved today</span>
                  <span className="font-semibold">{supportStats?.autoResolved || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Success rate</span>
                  <span className="font-semibold">{supportStats?.successRate || 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Workflow Automation
            </CardTitle>
            <CardDescription>Custom automation workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Priority Escalation</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Auto-Assignment</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Follow-up Reminders</span>
                <Badge variant="outline">Inactive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderKnowledgeTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
          <p className="text-sm text-gray-600">Manage support articles and documentation</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Article
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Popular Articles
            </CardTitle>
            <CardDescription>Most accessed support articles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">How to setup call forwarding</h4>
                <p className="text-sm text-gray-600 mt-1">Step-by-step guide for call forwarding configuration</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">1,234 views</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">4.8</span>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium">AI Assistant Configuration</h4>
                <p className="text-sm text-gray-600 mt-1">Configure your AI assistant settings</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">987 views</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">4.6</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Search Articles
            </Button>
            <Button className="w-full" variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Popular Topics
            </Button>
            <Button className="w-full" variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Support Analytics</h3>
        <p className="text-sm text-gray-600">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Average Response</span>
                <span className="font-semibold">{ticketAnalytics?.avgResponseTime || 0}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">First Response</span>
                <span className="font-semibold">{ticketAnalytics?.firstResponseTime || 0}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Resolution Time</span>
                <span className="font-semibold">{ticketAnalytics?.avgResolutionTime || 0}h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Resolution Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Resolution Rate</span>
                <span className="font-semibold text-green-600">{ticketAnalytics?.resolutionRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Customer Satisfaction</span>
                <span className="font-semibold">{ticketAnalytics?.satisfactionScore || 0}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Escalation Rate</span>
                <span className="font-semibold">{ticketAnalytics?.escalationRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Volume Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Daily Tickets</span>
                <span className="font-semibold">{ticketAnalytics?.dailyTickets || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Monthly Growth</span>
                <span className="font-semibold">{ticketAnalytics?.monthlyGrowth || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Peak Hours</span>
                <span className="font-semibold">{ticketAnalytics?.peakHours || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Support Settings</h3>
        <p className="text-sm text-gray-600">Configure your support system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic support system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Auto-assignment</p>
                  <p className="text-sm text-gray-600">Automatically assign tickets to agents</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">On</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-gray-600">Send notifications to customers</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">On</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              Configure Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Management
            </CardTitle>
            <CardDescription>Manage support agents and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Active Agents</span>
                <Badge variant="secondary">{supportStats?.activeAgents || 0}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Workload Balance</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Optimal</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              Manage Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <AppLayout 
      appName="Support Center" 
      appIcon={Ticket}
      appColor="bg-purple-500"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketAnalytics?.openTickets || 0}</div>
              <p className="text-xs text-muted-foreground">
                {ticketAnalytics?.newToday || 0} new today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketAnalytics?.avgResponseTime || 0}m</div>
              <p className="text-xs text-muted-foreground">
                {ticketAnalytics?.responseImprovement || 0}% improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketAnalytics?.resolutionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {ticketAnalytics?.resolvedToday || 0} resolved today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketAnalytics?.satisfactionScore || 0}/5</div>
              <p className="text-xs text-muted-foreground">
                Customer satisfaction score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === 'tickets' && renderTicketsTab()}
        {activeTab === 'automation' && renderAutomationTab()}
        {activeTab === 'knowledge' && renderKnowledgeTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </AppLayout>
  );
}