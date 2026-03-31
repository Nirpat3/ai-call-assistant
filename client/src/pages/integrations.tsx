import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Check, 
  X, 
  AlertCircle, 
  Link as LinkIcon, 
  Zap, 
  MessageSquare, 
  Video, 
  Calendar,
  BarChart3,
  ShoppingCart,
  Mail,
  Webhook,
  Key,
  TestTube,
  Brain,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import Breadcrumb from "@/components/Breadcrumb";
import AppStoreLayout from "@/components/AppStoreLayout";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  status: "connected" | "available" | "configured" | "error";
  credentials: Record<string, string>;
  settings: Record<string, any>;
  lastSync?: Date;
  errorMessage?: string;
  webhookUrl?: string;
  apiEndpoint?: string;
  requiredFields: Array<{ key: string; label: string; type: string; required: boolean }>;
  isInternal?: boolean;
  dashboardUrl?: string;
}

const integrationTemplates: Integration[] = [
  {
    id: "ai-engineer",
    name: "PhD AI Engineer",
    description: "AI-powered platform analysis and enhancement recommendations",
    category: "AI Services",
    icon: Brain,
    status: "connected",
    credentials: {},
    settings: { autoAnalysis: true, analysisInterval: "30min" },
    lastSync: new Date(),
    requiredFields: []
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send call notifications and updates to Slack channels",
    category: "Communication",
    icon: MessageSquare,
    status: "available",
    credentials: {},
    settings: {},
    webhookUrl: "/api/integrations/slack/webhook",
    apiEndpoint: "https://slack.com/api/",
    requiredFields: [
      { key: "bot_token", label: "Bot Token", type: "password", required: true },
      { key: "channel_id", label: "Default Channel ID", type: "text", required: true },
      { key: "webhook_url", label: "Incoming Webhook URL", type: "url", required: false }
    ]
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Integrate with Microsoft Teams for notifications and collaboration",
    category: "Communication",
    icon: Video,
    status: "available",
    credentials: {},
    settings: {},
    webhookUrl: "/api/integrations/teams/webhook",
    requiredFields: [
      { key: "webhook_url", label: "Teams Webhook URL", type: "url", required: true },
      { key: "tenant_id", label: "Tenant ID", type: "text", required: false }
    ]
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Schedule and manage Zoom meetings from call interactions",
    category: "Video Conferencing",
    icon: Video,
    status: "available",
    credentials: {},
    settings: {},
    requiredFields: [
      { key: "api_key", label: "API Key", type: "password", required: true },
      { key: "api_secret", label: "API Secret", type: "password", required: true },
      { key: "account_id", label: "Account ID", type: "text", required: true }
    ]
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "Integrate with Gmail, Calendar, and Google Drive",
    category: "Productivity",
    icon: Calendar,
    status: "available",
    credentials: {},
    settings: {},
    requiredFields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", required: true },
      { key: "refresh_token", label: "Refresh Token", type: "password", required: true }
    ]
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Sync contacts and create leads from call interactions",
    category: "CRM",
    icon: ShoppingCart,
    status: "available",
    credentials: {},
    settings: {},
    requiredFields: [
      { key: "client_id", label: "Consumer Key", type: "text", required: true },
      { key: "client_secret", label: "Consumer Secret", type: "password", required: true },
      { key: "username", label: "Username", type: "text", required: true },
      { key: "password", label: "Password + Security Token", type: "password", required: true },
      { key: "instance_url", label: "Instance URL", type: "url", required: true }
    ]
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Manage contacts and deals in HubSpot CRM",
    category: "CRM",
    icon: BarChart3,
    status: "available",
    credentials: {},
    settings: {},
    requiredFields: [
      { key: "api_key", label: "Private App Token", type: "password", required: true },
      { key: "portal_id", label: "Portal ID", type: "text", required: false }
    ]
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Schedule appointments and manage bookings",
    category: "Scheduling",
    icon: Calendar,
    status: "available",
    credentials: {},
    settings: {},
    requiredFields: [
      { key: "access_token", label: "Personal Access Token", type: "password", required: true },
      { key: "organization_uri", label: "Organization URI", type: "text", required: false }
    ]
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 5000+ apps through Zapier automation",
    category: "Automation",
    icon: Zap,
    status: "available",
    credentials: {},
    settings: {},
    webhookUrl: "/api/integrations/zapier/webhook",
    requiredFields: [
      { key: "webhook_url", label: "Zapier Webhook URL", type: "url", required: true },
      { key: "api_key", label: "API Key (Optional)", type: "password", required: false }
    ]
  },
  {
    id: "engineering-team",
    name: "PhD Engineering Team",
    description: "Autonomous AI engineers monitoring and enhancing system performance",
    category: "Internal Tools",
    icon: Settings,
    status: "connected",
    credentials: {},
    settings: {},
    isInternal: true,
    dashboardUrl: "/engineering-team",
    requiredFields: []
  }
];

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations = integrationTemplates } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
    initialData: integrationTemplates,
  });

  const connectMutation = useMutation({
    mutationFn: async ({ integrationId, credentials }: { integrationId: string; credentials: Record<string, string> }) => {
      return await apiRequest(`/api/integrations/${integrationId}/connect`, {
        method: "POST",
        body: JSON.stringify({ credentials }),
      });
    },
    onSuccess: (_, { integrationId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setIsConfiguring(false);
      setCredentials({});
      toast({ title: `${selectedIntegration?.name} connected successfully` });
    },
    onError: (error: any) => {
      toast({ 
        title: "Connection failed", 
        description: error.message || "Please check your credentials and try again",
        variant: "destructive" 
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return await apiRequest(`/api/integrations/${integrationId}/disconnect`, {
        method: "POST",
      });
    },
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: "Integration disconnected successfully" });
    },
    onError: () => {
      toast({ title: "Failed to disconnect integration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return await apiRequest(`/api/integrations/${integrationId}/test`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({ title: "Integration test successful" });
    },
    onError: () => {
      toast({ title: "Integration test failed", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "configured": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <Check className="h-4 w-4" />;
      case "error": return <X className="h-4 w-4" />;
      case "configured": return <Settings className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const groupedIntegrations = integrations.reduce((groups, integration) => {
    if (!groups[integration.category]) {
      groups[integration.category] = [];
    }
    groups[integration.category].push(integration);
    return groups;
  }, {} as Record<string, Integration[]>);

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setCredentials({});
    setIsConfiguring(true);
  };

  const handleSubmitCredentials = () => {
    if (!selectedIntegration) return;

    const requiredFields = selectedIntegration.requiredFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !credentials[field.key]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    connectMutation.mutate({
      integrationId: selectedIntegration.id,
      credentials
    });
  };

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integration Management</h1>
            <p className="text-muted-foreground mt-2">
              Connect your AI call assistant with external services and tools
            </p>
          </div>

        {/* Statistics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{integrations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === "connected").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === "available").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.status === "error").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Integrations</TabsTrigger>
            <TabsTrigger value="connected">Connected</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold">{category}</h2>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {categoryIntegrations.map((integration) => {
                    const IconComponent = integration.icon;
                    return (
                      <Card key={integration.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{integration.name}</CardTitle>
                              </div>
                            </div>
                            <Badge className={getStatusColor(integration.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(integration.status)}
                                <span className="capitalize">{integration.status}</span>
                              </div>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {integration.description}
                          </p>
                          
                          {integration.status === "error" && integration.errorMessage && (
                            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                              {integration.errorMessage}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {integration.id === "ai-engineer" ? (
                              <Link href="/ai-engineer">
                                <Button size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Open AI Engineer
                                </Button>
                              </Link>
                            ) : integration.id === "engineering-team" ? (
                              <Link href="/engineering-team">
                                <Button size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Engineering Team
                                </Button>
                              </Link>
                            ) : integration.status === "connected" ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => testMutation.mutate(integration.id)}
                                  disabled={testMutation.isPending}
                                >
                                  <TestTube className="h-4 w-4 mr-1" />
                                  Test
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => disconnectMutation.mutate(integration.id)}
                                  disabled={disconnectMutation.isPending}
                                >
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleConnect(integration)}
                              >
                                <LinkIcon className="h-4 w-4 mr-1" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="connected" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {integrations
                .filter(i => i.status === "connected")
                .map((integration) => {
                  const IconComponent = integration.icon;
                  return (
                    <Card key={integration.id}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-6 w-6 text-primary" />
                          <div>
                            <CardTitle>{integration.name}</CardTitle>
                            {integration.lastSync && (
                              <p className="text-sm text-muted-foreground">
                                Last sync: {new Date(integration.lastSync).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Status:</span>
                            <Badge className={getStatusColor(integration.status)}>
                              Connected
                            </Badge>
                          </div>
                          {integration.webhookUrl && (
                            <div className="text-sm">
                              <span className="font-medium">Webhook:</span>
                              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                                {integration.webhookUrl}
                              </code>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              
              {integrations.filter(i => i.status === "connected").length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No connected integrations yet. Connect your first integration to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Endpoints</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure webhooks to receive real-time updates from external services
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations
                    .filter(i => i.webhookUrl)
                    .map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{integration.name}</div>
                          <code className="text-xs text-muted-foreground">
                            POST {integration.webhookUrl}
                          </code>
                        </div>
                        <Badge className={getStatusColor(integration.status)}>
                          {integration.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Dialog */}
        <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Connect {selectedIntegration?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedIntegration && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {selectedIntegration.description}
                </p>
                
                <div className="space-y-3">
                  {selectedIntegration.requiredFields.map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        value={credentials[field.key] || ""}
                        onChange={(e) => setCredentials({
                          ...credentials,
                          [field.key]: e.target.value
                        })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsConfiguring(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitCredentials}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AppStoreLayout>
  );
}