import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
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

const tabs = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Target },
  { id: 'demos', label: 'Demos', icon: Video },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function CRMApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationId] = useState("org-1");
  const [activeTab, setActiveTab] = useState('leads');

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

  // Mutations
  const addLeadMutation = useMutation({
    mutationFn: (leadData: any) => apiRequest(`/api/sales/leads`, {
      method: 'POST',
      body: JSON.stringify(leadData),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales/leads', organizationId] });
      toast({ title: "Lead added successfully" });
    },
    onError: () => {
      toast({ title: "Error adding lead", variant: "destructive" });
    }
  });

  const renderLeadsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Lead Management</h3>
          <p className="text-sm text-gray-600">Manage and track your sales leads</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Leads
            </CardTitle>
            <CardDescription>Latest prospects and potential customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading leads...</p>
                </div>
              ) : (
                Array.isArray(leads) && leads.length > 0 ? leads.slice(0, 5).map((lead: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{lead.name || 'Unknown Lead'}</p>
                        <p className="text-sm text-gray-600">{lead.email || 'No email'}</p>
                        <p className="text-sm text-gray-600">{lead.company || 'No company'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{lead.status || 'New'}</Badge>
                      <Badge variant="outline">{lead.priority || 'Medium'}</Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No leads to display</p>
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
              <Plus className="w-4 h-4 mr-2" />
              Add New Lead
            </Button>
            <Button className="w-full" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Import Leads
            </Button>
            <Button className="w-full" variant="outline">
              <Building className="w-4 h-4 mr-2" />
              Company Research
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPipelineTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sales Pipeline</h3>
          <p className="text-sm text-gray-600">Track deals through your sales process</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.prospects || 0}</div>
            <p className="text-xs text-gray-600">Initial contact</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.qualified || 0}</div>
            <p className="text-xs text-gray-600">Qualified leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.proposal || 0}</div>
            <p className="text-xs text-gray-600">Proposal sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.closed || 0}</div>
            <p className="text-xs text-gray-600">Deals won</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDemosTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Demo Management</h3>
          <p className="text-sm text-gray-600">Schedule and track product demonstrations</p>
        </div>
        <Button>
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Demo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Upcoming Demos
            </CardTitle>
            <CardDescription>Scheduled product demonstrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demosLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading demos...</p>
                </div>
              ) : (
                Array.isArray(demos) && demos.length > 0 ? demos.slice(0, 3).map((demo: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{demo.title || 'Demo Session'}</p>
                        <p className="text-sm text-gray-600">{demo.company || 'Unknown Company'}</p>
                      </div>
                      <Badge variant="outline">{demo.status || 'Scheduled'}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{demo.date || 'No date set'}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No demos scheduled</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Video className="w-4 h-4 mr-2" />
              Demo Templates
            </Button>
            <Button className="w-full" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Follow-up Scripts
            </Button>
            <Button className="w-full" variant="outline">
              <Award className="w-4 h-4 mr-2" />
              Success Stories
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Sales Analytics</h3>
        <p className="text-sm text-gray-600">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Monthly Revenue</span>
                <span className="font-semibold">${metrics?.monthlyRevenue || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-semibold">{metrics?.conversionRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Average Deal Size</span>
                <span className="font-semibold">${metrics?.avgDealSize || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Lead Growth</span>
                <span className="font-semibold text-green-600">+{metrics?.leadGrowth || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Deal Velocity</span>
                <span className="font-semibold">{metrics?.dealVelocity || 0} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Win Rate</span>
                <span className="font-semibold">{metrics?.winRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Calls Made</span>
                <span className="font-semibold">{metrics?.callsMade || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Emails Sent</span>
                <span className="font-semibold">{metrics?.emailsSent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Meetings Booked</span>
                <span className="font-semibold">{metrics?.meetingsBooked || 0}</span>
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
        <h3 className="text-lg font-semibold">CRM Settings</h3>
        <p className="text-sm text-gray-600">Configure your sales process and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pipeline Configuration
            </CardTitle>
            <CardDescription>Customize your sales pipeline stages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Lead Qualification</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Proposal Stage</span>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Negotiation</span>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              Configure Pipeline
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Integration Settings
            </CardTitle>
            <CardDescription>Connect with external tools and services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Email Integration</span>
                <Badge variant="secondary">Connected</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Calendar Sync</span>
                <Badge variant="secondary">Connected</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span>Marketing Tools</span>
                <Badge variant="outline">Not Connected</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              Manage Integrations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <AppLayout 
      appName="CRM & Sales" 
      appIcon={Users}
      appColor="bg-green-500"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Array.isArray(leads) ? leads.length : 0}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics?.newLeads || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics?.monthlyRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics?.revenueGrowth || 0}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.conversionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                +{metrics?.conversionImprovement || 0}% improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeDeals || 0}</div>
              <p className="text-xs text-muted-foreground">
                ${metrics?.pipelineValue || 0} in pipeline
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === 'leads' && renderLeadsTab()}
        {activeTab === 'pipeline' && renderPipelineTab()}
        {activeTab === 'demos' && renderDemosTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </AppLayout>
  );
}