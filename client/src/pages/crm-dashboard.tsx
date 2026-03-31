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
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Settings,
  Plus,
  Mail,
  Phone,
  Video,
  Target,
  BarChart3,
  Clock,
  Award,
  Building,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CRMDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1");

  // Fetch CRM data
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

  // Form state for new lead
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

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/sales/leads', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
      toast({ title: "Lead created successfully" });
      setNewLead({ 
        contactName: '', email: '', phone: '', company: '', 
        source: 'website', priority: 'medium', estimatedValue: 0, notes: '' 
      });
    },
  });

  const generateEmailMutation = useMutation({
    mutationFn: (leadId: number) => apiRequest(`/api/sales/leads/${leadId}/generate-email`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: "Follow-up email generated" });
    },
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate({ ...newLead, organizationId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-yellow-100 text-yellow-800';
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive customer relationship management</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* KPI Cards */}
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
                Across all opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics?.conversionRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Lead to close ratio
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
        </div>

        {/* Main CRM Modules */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Lead Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Lead
                  </CardTitle>
                  <CardDescription>Capture new business opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLead} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        value={newLead.contactName}
                        onChange={(e) => setNewLead({...newLead, contactName: e.target.value})}
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={newLead.company}
                        onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                        placeholder="Tech Corp Inc."
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
                        placeholder="john@techcorp.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                        placeholder="+1-555-0123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source">Lead Source</Label>
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
                          <SelectItem value="event">Event/Trade Show</SelectItem>
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
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newLead.notes}
                        onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                        placeholder="Additional notes about this lead..."
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
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Lead Pipeline
                    </CardTitle>
                    <CardDescription>Manage your sales opportunities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leadsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2">Loading leads...</p>
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">No leads found. Add your first lead to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {leads.map((lead: any) => (
                          <div key={lead.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{lead.contactName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Building className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">{lead.company}</span>
                                </div>
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
                                <Mail className="h-4 w-4 text-blue-500" />
                                <span>{lead.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-500" />
                                <span>{lead.phone || 'No phone'}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">${lead.estimatedValue?.toLocaleString()}</span>
                              </div>
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
                                <Button size="sm" variant="outline">
                                  <Video className="h-4 w-4 mr-1" />
                                  Demo
                                </Button>
                              </div>
                            </div>

                            {lead.notes && (
                              <div className="bg-gray-50 p-3 rounded text-sm">
                                <p>{lead.notes}</p>
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

          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sales Pipeline
                  </CardTitle>
                  <CardDescription>Track deals through your sales process</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{leads.filter((l: any) => l.status === 'new').length}</div>
                        <div className="text-xs text-blue-800">New</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600">{leads.filter((l: any) => l.status === 'qualified').length}</div>
                        <div className="text-xs text-yellow-800">Qualified</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">{leads.filter((l: any) => l.status === 'proposal').length}</div>
                        <div className="text-xs text-orange-800">Proposal</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{leads.filter((l: any) => l.status === 'closed_won').length}</div>
                        <div className="text-xs text-green-800">Closed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Activities
                  </CardTitle>
                  <CardDescription>Scheduled demos and follow-ups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demos.slice(0, 3).map((demo: any) => (
                      <div key={demo.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Video className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="font-medium">{demo.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(demo.scheduledDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {demo.duration}m
                        </Badge>
                      </div>
                    ))}
                    <Button className="w-full" variant="outline" size="sm">
                      View All Activities
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sales Performance
                  </CardTitle>
                  <CardDescription>Key metrics and performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">${(metrics?.totalPipelineValue || 0).toLocaleString()}</div>
                        <div className="text-sm text-green-800">Pipeline Value</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{(metrics?.conversionRate || 0).toFixed(1)}%</div>
                        <div className="text-sm text-blue-800">Conversion Rate</div>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>Highest value opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leads
                      .sort((a: any, b: any) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
                      .slice(0, 3)
                      .map((lead: any, index: number) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{lead.contactName}</p>
                              <p className="text-sm text-gray-600">{lead.company}</p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            ${(lead.estimatedValue || 0).toLocaleString()}
                          </Badge>
                        </div>
                      ))
                    }
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
                    CRM Configuration
                  </CardTitle>
                  <CardDescription>Configure your sales process and automation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Lead Scoring</p>
                        <p className="text-sm text-gray-600">Automatic lead prioritization</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Email Automation</p>
                        <p className="text-sm text-gray-600">AI-powered follow-up emails</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Pipeline Automation</p>
                        <p className="text-sm text-gray-600">Automatic stage progression</p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    </div>
                  </div>
                  <Button className="w-full">
                    Configure CRM Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Integrations
                  </CardTitle>
                  <CardDescription>Connect with external tools and platforms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Salesforce
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect HubSpot
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Pipedrive
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Zoom
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