import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Slack, 
  MessageSquare, 
  Video, 
  Mail, 
  Users, 
  Calendar, 
  FileText, 
  Database,
  ExternalLink,
  Check,
  X,
  Settings,
  Zap,
  Globe
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'communication' | 'productivity' | 'crm' | 'calendar';
  status: 'connected' | 'available' | 'configured';
  features: string[];
  setupSteps: string[];
  requiredCredentials: string[];
  webhookUrl?: string;
  apiEndpoint?: string;
}

const integrations: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send call notifications and updates to Slack channels',
    icon: Slack,
    category: 'communication',
    status: 'available',
    features: [
      'Real-time call notifications',
      'Channel-specific alerts for VIP callers',
      'Call summary reports',
      'Team status updates',
      'Interactive call management buttons'
    ],
    setupSteps: [
      'Create a Slack app in your workspace',
      'Enable bot permissions for channels and messaging',
      'Copy the Bot User OAuth Token',
      'Select target channel for notifications',
      'Test integration with sample notification'
    ],
    requiredCredentials: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'],
    webhookUrl: '/api/integrations/slack/webhook',
    apiEndpoint: '/api/integrations/slack'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Integrate with Teams for call notifications and collaboration',
    icon: MessageSquare,
    category: 'communication',
    status: 'available',
    features: [
      'Teams channel notifications',
      'Call forwarding to Teams meetings',
      'Shared contact management',
      'Integration with Office 365',
      'Automated meeting scheduling'
    ],
    setupSteps: [
      'Register app in Azure Active Directory',
      'Configure Teams app permissions',
      'Create incoming webhook in target channel',
      'Copy webhook URL and configure permissions',
      'Test with sample notification'
    ],
    requiredCredentials: ['TEAMS_WEBHOOK_URL', 'TEAMS_TENANT_ID'],
    webhookUrl: '/api/integrations/teams/webhook',
    apiEndpoint: '/api/integrations/teams'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Schedule and join Zoom meetings directly from calls',
    icon: Video,
    category: 'communication',
    status: 'available',
    features: [
      'Automatic meeting scheduling',
      'Call-to-meeting escalation',
      'Meeting link generation',
      'Participant management',
      'Recording integration'
    ],
    setupSteps: [
      'Create Zoom app in Zoom Marketplace',
      'Generate JWT or OAuth credentials',
      'Configure meeting permissions',
      'Set default meeting settings',
      'Test meeting creation'
    ],
    requiredCredentials: ['ZOOM_API_KEY', 'ZOOM_API_SECRET'],
    apiEndpoint: '/api/integrations/zoom'
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Sync with Gmail, Calendar, and Google Drive',
    icon: Mail,
    category: 'productivity',
    status: 'available',
    features: [
      'Gmail contact synchronization',
      'Calendar appointment scheduling',
      'Drive document sharing',
      'Meet video call integration',
      'Automated email follow-ups'
    ],
    setupSteps: [
      'Enable Google Workspace APIs',
      'Create service account credentials',
      'Configure OAuth 2.0 permissions',
      'Grant domain-wide delegation',
      'Test API access'
    ],
    requiredCredentials: ['GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_DOMAIN'],
    apiEndpoint: '/api/integrations/google-workspace'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts and log call activities in Salesforce CRM',
    icon: Database,
    category: 'crm',
    status: 'available',
    features: [
      'Bidirectional contact sync',
      'Automatic call logging',
      'Lead qualification updates',
      'Opportunity management',
      'Custom field mapping'
    ],
    setupSteps: [
      'Create Connected App in Salesforce',
      'Generate API credentials',
      'Configure OAuth permissions',
      'Map contact and call fields',
      'Test data synchronization'
    ],
    requiredCredentials: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET', 'SALESFORCE_USERNAME', 'SALESFORCE_PASSWORD'],
    apiEndpoint: '/api/integrations/salesforce'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Integrate with HubSpot CRM for lead management',
    icon: Users,
    category: 'crm',
    status: 'available',
    features: [
      'Contact and company sync',
      'Deal pipeline updates',
      'Call activity tracking',
      'Lead scoring integration',
      'Marketing automation triggers'
    ],
    setupSteps: [
      'Generate HubSpot private app token',
      'Configure required scopes',
      'Set up webhook endpoints',
      'Map contact properties',
      'Test integration flow'
    ],
    requiredCredentials: ['HUBSPOT_API_KEY'],
    apiEndpoint: '/api/integrations/hubspot'
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Schedule appointments automatically from calls',
    icon: Calendar,
    category: 'calendar',
    status: 'available',
    features: [
      'Automatic appointment scheduling',
      'Calendar availability checking',
      'Meeting link generation',
      'Reminder automation',
      'Time zone handling'
    ],
    setupSteps: [
      'Generate Calendly API token',
      'Configure event types',
      'Set up webhook notifications',
      'Map scheduling preferences',
      'Test appointment creation'
    ],
    requiredCredentials: ['CALENDLY_API_TOKEN'],
    apiEndpoint: '/api/integrations/calendly'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 6000+ apps through Zapier automation',
    icon: Zap,
    category: 'productivity',
    status: 'available',
    features: [
      'Trigger-based automation',
      'Multi-app workflows',
      'Custom action sequences',
      'Data transformation',
      'Error handling and retries'
    ],
    setupSteps: [
      'Create Zapier webhook trigger',
      'Configure call event triggers',
      'Set up action sequences',
      'Map data fields',
      'Test automation workflow'
    ],
    requiredCredentials: ['ZAPIER_WEBHOOK_URL'],
    webhookUrl: '/api/integrations/zapier/webhook',
    apiEndpoint: '/api/integrations/zapier'
  }
];

export default function IntegrationHub() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrationStatuses } = useQuery({
    queryKey: ['/api/integrations/status'],
  });

  const connectIntegration = useMutation({
    mutationFn: async (config: { integrationId: string; credentials: Record<string, string> }) => {
      return apiRequest(`/api/integrations/${config.integrationId}/connect`, { method: 'POST', body: JSON.stringify(config.credentials) });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Integration Connected",
        description: `${variables.integrationId} has been successfully connected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
      setIsConfiguring(false);
      setCredentials({});
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect integration. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const disconnectIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      return apiRequest(`/api/integrations/${integrationId}/disconnect`, { method: 'DELETE' });
    },
    onSuccess: (data, integrationId) => {
      toast({
        title: "Integration Disconnected",
        description: `${integrationId} has been disconnected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
    },
  });

  const testIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      return apiRequest(`/api/integrations/${integrationId}/test`, { method: 'POST' });
    },
    onSuccess: (data, integrationId) => {
      toast({
        title: "Test Successful",
        description: `${integrationId} integration is working correctly.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Integration test failed.",
        variant: "destructive",
      });
    },
  });

  const getIntegrationStatus = (integrationId: string) => {
    return (integrationStatuses as Record<string, string>)?.[integrationId] || 'available';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><Check className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'configured':
        return <Badge className="bg-blue-100 text-blue-800"><Settings className="w-3 h-3 mr-1" />Configured</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return <MessageSquare className="w-4 h-4" />;
      case 'productivity':
        return <FileText className="w-4 h-4" />;
      case 'crm':
        return <Database className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const handleConnect = () => {
    if (!selectedIntegration) return;
    
    connectIntegration.mutate({
      integrationId: selectedIntegration.id,
      credentials
    });
  };

  const categories = Array.from(new Set(integrations.map(i => i.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integration Hub</h2>
          <p className="text-muted-foreground">
            Connect your AI Call Assistant with popular business tools
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          View All Integrations
        </Button>
      </div>

      <Tabs defaultValue="communication" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="gap-2">
              {getCategoryIcon(category)}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations
                .filter((integration) => integration.category === category)
                .map((integration) => {
                  const status = getIntegrationStatus(integration.id);
                  const Icon = integration.icon;
                  
                  return (
                    <Card key={integration.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              {getStatusBadge(status)}
                            </div>
                          </div>
                        </div>
                        <CardDescription>{integration.description}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Key Features:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {integration.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-current rounded-full" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex gap-2">
                          {status === 'connected' ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => testIntegration.mutate(integration.id)}
                                disabled={testIntegration.isPending}
                              >
                                Test
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnectIntegration.mutate(integration.id)}
                                disabled={disconnectIntegration.isPending}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedIntegration(integration);
                                    setIsConfiguring(true);
                                  }}
                                >
                                  Connect
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Icon className="w-5 h-5" />
                                    Connect {integration.name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Follow these steps to connect {integration.name} to your AI Call Assistant.
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Setup Steps:</h4>
                                    <ol className="text-sm space-y-1">
                                      {integration.setupSteps.map((step, idx) => (
                                        <li key={idx} className="flex gap-2">
                                          <span className="text-muted-foreground">{idx + 1}.</span>
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>

                                  <div className="space-y-3">
                                    <h4 className="font-medium">Required Credentials:</h4>
                                    {integration.requiredCredentials.map((credential) => (
                                      <div key={credential} className="space-y-2">
                                        <Label htmlFor={credential}>{credential.replace(/_/g, ' ')}</Label>
                                        <Input
                                          id={credential}
                                          type={credential.toLowerCase().includes('secret') || credential.toLowerCase().includes('key') ? 'password' : 'text'}
                                          placeholder={`Enter your ${credential.replace(/_/g, ' ').toLowerCase()}`}
                                          value={credentials[credential] || ''}
                                          onChange={(e) => setCredentials(prev => ({
                                            ...prev,
                                            [credential]: e.target.value
                                          }))}
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={handleConnect}
                                      disabled={connectIntegration.isPending || 
                                        !integration.requiredCredentials.every(cred => credentials[cred])}
                                      className="flex-1"
                                    >
                                      {connectIntegration.isPending ? 'Connecting...' : 'Connect'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsConfiguring(false);
                                        setCredentials({});
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Setup Wizard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Setup Wizard
          </CardTitle>
          <CardDescription>
            Get started quickly with our most popular integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <Slack className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">Slack Setup</div>
                  <div className="text-sm text-muted-foreground">5 minutes</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">CRM Integration</div>
                  <div className="text-sm text-muted-foreground">10 minutes</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">Calendar Sync</div>
                  <div className="text-sm text-muted-foreground">3 minutes</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}