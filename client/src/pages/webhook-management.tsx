import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, TestTube, ExternalLink, Zap, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import AppStoreLayout from '@/components/AppStoreLayout';

interface WebhookConfig {
  id: string;
  organizationId: string;
  name: string;
  type: 'zendesk' | 'servicenow' | 'jira' | 'custom' | 'slack' | 'teams' | 'n8n';
  url: string;
  headers: Record<string, string>;
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth';
  authConfig: Record<string, string>;
  events: string[];
  isActive: boolean;
  retryCount: number;
  timeout: number;
  transformTemplate?: string;
}

interface WebhookTemplate {
  name: string;
  type: string;
  url: string;
  authType: string;
  events: string[];
  fields: Array<{
    name: string;
    label: string;
    required: boolean;
    type?: string;
    placeholder?: string;
  }>;
}

const webhookFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.string(),
  url: z.string().url('Must be a valid URL'),
  authType: z.string(),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean().default(true),
  retryCount: z.number().min(0).max(10).default(3),
  timeout: z.number().min(1000).max(60000).default(30000),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

export default function WebhookManagement() {
  const [selectedOrgId] = useState('default-org'); // In real app, get from user context
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: '',
      type: 'custom',
      url: '',
      authType: 'none',
      events: [],
      isActive: true,
      retryCount: 3,
      timeout: 30000,
    },
  });

  // Fetch webhook configurations
  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ['/api/webhooks', selectedOrgId],
    queryFn: () => fetch(`/api/webhooks/${selectedOrgId}`).then(res => res.json()),
  });

  // Fetch webhook templates
  const { data: templates = {}, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/webhooks/templates'],
    queryFn: () => fetch('/api/webhooks/templates').then(res => res.json()),
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: WebhookFormData & { organizationId: string }) =>
      apiRequest('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks', selectedOrgId] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: 'Webhook created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create webhook', variant: 'destructive' });
    },
  });

  // Update webhook mutation
  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WebhookConfig> }) =>
      apiRequest(`/api/webhooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks', selectedOrgId] });
      setEditingWebhook(null);
      toast({ title: 'Webhook updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update webhook', variant: 'destructive' });
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: (webhookId: string) =>
      apiRequest(`/api/webhooks/${webhookId}/test`, { method: 'POST' }),
    onSuccess: (data) => {
      toast({ 
        title: data.success ? 'Webhook test successful' : 'Webhook test failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    },
  });

  // Sync tickets mutation
  const syncTicketsMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/webhooks/pull-updates/${selectedOrgId}`, { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Ticket sync initiated successfully' });
    },
  });

  const handleCreateWebhook = (data: WebhookFormData) => {
    createWebhookMutation.mutate({
      ...data,
      organizationId: selectedOrgId,
    });
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = templates[templateKey] as WebhookTemplate;
    if (template) {
      form.setValue('name', template.name);
      form.setValue('type', template.type);
      form.setValue('url', template.url);
      form.setValue('authType', template.authType);
      form.setValue('events', template.events);
      setSelectedTemplate(templateKey);
    }
  };

  const toggleWebhookStatus = (webhook: WebhookConfig) => {
    updateWebhookMutation.mutate({
      id: webhook.id,
      data: { isActive: !webhook.isActive }
    });
  };

  const getStatusIcon = (webhook: WebhookConfig) => {
    if (!webhook.isActive) return <XCircle className="h-4 w-4 text-gray-400" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'n8n': return <Zap className="h-4 w-4 text-purple-500" />;
      case 'zendesk': return <ExternalLink className="h-4 w-4 text-green-600" />;
      case 'jira': return <ExternalLink className="h-4 w-4 text-blue-600" />;
      case 'slack': return <ExternalLink className="h-4 w-4 text-purple-600" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <AppStoreLayout 
      title="Webhook Management"
      subtitle="Configure third-party integrations and automation workflows"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Management</h1>
          <p className="text-muted-foreground mt-1">
            Connect with third-party systems like n8n, Zendesk, ServiceNow, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncTicketsMutation.mutate()}
            variant="outline"
            disabled={syncTicketsMutation.isPending}
          >
            <Clock className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Webhook</DialogTitle>
                <DialogDescription>
                  Connect to external systems for automated ticket synchronization
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-4">
                  {!templatesLoading && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* n8n Template */}
                      <Card 
                        className={`cursor-pointer transition-colors hover:bg-accent ${selectedTemplate === 'n8n' ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => handleTemplateSelect('n8n')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Zap className="h-8 w-8 text-purple-500" />
                            <div>
                              <h3 className="font-semibold">n8n Automation</h3>
                              <p className="text-sm text-muted-foreground">Workflow automation platform</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {Object.entries(templates).map(([key, template]: [string, any]) => (
                        <Card 
                          key={key}
                          className={`cursor-pointer transition-colors hover:bg-accent ${selectedTemplate === key ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => handleTemplateSelect(key)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {getTypeIcon(template.type)}
                              <div>
                                <h3 className="font-semibold">{template.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {template.events?.length || 0} events
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="custom">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateWebhook)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Webhook Name</FormLabel>
                              <FormControl>
                                <Input placeholder="My Integration" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="n8n">n8n Automation</SelectItem>
                                  <SelectItem value="zendesk">Zendesk</SelectItem>
                                  <SelectItem value="servicenow">ServiceNow</SelectItem>
                                  <SelectItem value="jira">Jira</SelectItem>
                                  <SelectItem value="slack">Slack</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook URL</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://your-n8n.domain.com/webhook/your-webhook-id" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              For n8n: Copy the webhook URL from your n8n workflow
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="authType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Authentication</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="bearer">Bearer Token</SelectItem>
                                  <SelectItem value="basic">Basic Auth</SelectItem>
                                  <SelectItem value="api_key">API Key</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <FormDescription className="text-sm">
                                  Enable webhook notifications
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createWebhookMutation.isPending}
                        >
                          Create Webhook
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Active Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="n8n-guide">n8n Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {webhooksLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect with external systems to automate ticket management
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook: WebhookConfig) => (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getTypeIcon(webhook.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{webhook.name}</h3>
                            {getStatusIcon(webhook)}
                            <Badge variant={webhook.type === 'n8n' ? 'default' : 'secondary'}>
                              {webhook.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {webhook.url}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {webhook.events.map(event => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhookMutation.mutate(webhook.id)}
                          disabled={testWebhookMutation.isPending}
                        >
                          <TestTube className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={() => toggleWebhookStatus(webhook)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Activity</CardTitle>
              <CardDescription>Recent webhook deliveries and status updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Ticket sync completed</p>
                      <p className="text-sm text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <Badge variant="outline">Success</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">Webhook delivery retry</p>
                      <p className="text-sm text-muted-foreground">5 minutes ago</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Retry</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n-guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                n8n Integration Guide
              </CardTitle>
              <CardDescription>
                Connect your CallBot AI with n8n for powerful workflow automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 1: Create n8n Webhook</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>In n8n, start a new workflow</li>
                    <li>Add a "Webhook" trigger node</li>
                    <li>Set HTTP Method to "POST"</li>
                    <li>Copy the webhook URL provided by n8n</li>
                  </ol>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 2: Configure CallBot Webhook</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click "Add Webhook" above and select "n8n Automation"</li>
                    <li>Paste your n8n webhook URL</li>
                    <li>Choose events: ticket.created, ticket.updated, ticket.resolved</li>
                    <li>Enable the webhook</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 3: Process Data in n8n</h3>
                  <p className="text-sm mb-2">Your n8n workflow will receive this data structure:</p>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`{
  "event": "ticket.created",
  "timestamp": "2025-01-04T10:30:00Z",
  "organizationId": "org-123",
  "ticket": {
    "id": 1,
    "ticketId": "TICKET-2025-01-04-00001",
    "title": "Payment Processing Issue",
    "category": "technical",
    "priority": "high",
    "status": "open",
    "customerName": "John Doe",
    "customerPhone": "+1234567890"
  }
}`}
                  </pre>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h3 className="font-semibold mb-2">Common n8n Use Cases</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Auto-assign tickets based on keywords or priority</li>
                    <li>Send notifications to Slack, Teams, or email</li>
                    <li>Create calendar events for high-priority tickets</li>
                    <li>Update external CRM systems with ticket data</li>
                    <li>Generate automated responses based on ticket content</li>
                    <li>Create escalation workflows for unresolved tickets</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Example n8n Workflow</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 rounded">Webhook</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">Filter (High Priority)</span>
                    <span>→</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">Slack Notification</span>
                  </div>
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