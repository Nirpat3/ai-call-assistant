import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Bell, 
  Route, 
  Settings, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  Target,
  Activity,
  Plus,
  Edit,
  Trash2,
  Grid3x3,
  List
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppStoreLayout from "@/components/AppStoreLayout";

interface NotificationRule {
  id: string;
  name: string;
  conditions: {
    callerType?: string;
    timeRange?: { start: string; end: string };
    sentiment?: string[];
    keywords?: string[];
    priority?: string[];
  };
  actions: {
    channels: string[];
    recipients: string[];
    template: string;
    delay?: number;
    escalation?: {
      afterMinutes: number;
      channels: string[];
      recipients: string[];
    };
  };
  active: boolean;
}

interface AgentCapability {
  agentId: string;
  name: string;
  specializations: string[];
  availability: string;
  currentLoad: number;
  maxLoad: number;
  averageHandleTime: number;
  satisfactionScore: number;
  languages: string[];
}

interface RoutingAnalytics {
  agentCapabilities: AgentCapability[];
  routingRules: any[];
  activeContexts: number;
}

export default function AIManagementPage() {
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificationRules = [], isLoading: rulesLoading } = useQuery<NotificationRule[]>({
    queryKey: ["/api/notification-rules"],
  });

  const { data: routingAnalytics, isLoading: analyticsLoading } = useQuery<RoutingAnalytics>({
    queryKey: ["/api/routing-analytics"],
  });

  const addRuleMutation = useMutation({
    mutationFn: (rule: NotificationRule) => apiRequest("/api/notification-rules", {
      method: "POST",
      body: JSON.stringify(rule)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-rules"] });
      setIsRuleDialogOpen(false);
      toast({ title: "Notification rule added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add notification rule", variant: "destructive" });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: Partial<NotificationRule> }) => 
      apiRequest(`/api/notification-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(rule)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-rules"] });
      toast({ title: "Notification rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update notification rule", variant: "destructive" });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notification-rules/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-rules"] });
      toast({ title: "Notification rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete notification rule", variant: "destructive" });
    }
  });

  const updateAgentAvailabilityMutation = useMutation({
    mutationFn: ({ agentId, availability }: { agentId: string; availability: string }) =>
      apiRequest(`/api/agents/${agentId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ availability })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing-analytics"] });
      toast({ title: "Agent availability updated" });
    },
    onError: () => {
      toast({ title: "Failed to update agent availability", variant: "destructive" });
    }
  });

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (rulesLoading || analyticsLoading) {
    return (
      <AppStoreLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading AI management...</p>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="space-y-4 sm:space-y-6 pb-16 sm:pb-20 max-w-full overflow-hidden">
        {/* Enhanced Header */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-lg rounded-3xl w-full overflow-hidden">
          <CardContent className="p-4 sm:p-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-3 sm:p-4 bg-purple-600 rounded-2xl sm:rounded-3xl shadow-lg flex-shrink-0">
                  <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">AI Management</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg line-clamp-2">
                    Advanced notification engine and intelligent call routing
                  </p>
                </div>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Badge className="bg-green-100 text-green-800 px-4 py-2">
                  <Activity className="w-4 h-4 mr-2" />
                  System Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="notifications" className="space-y-4 sm:space-y-6 w-full">
          <TabsList className="flex w-full justify-center sm:justify-start bg-gray-100 rounded-xl p-1 relative z-10 mb-6 overflow-x-auto" style={{pointerEvents: 'auto'}}>
            <TabsTrigger 
              value="notifications" 
              className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] relative z-10 flex-shrink-0"
              style={{pointerEvents: 'auto'}}
            >
              <Bell className="w-3 h-3 mr-2 flex-shrink-0" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="routing" 
              className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] relative z-10 flex-shrink-0"
              style={{pointerEvents: 'auto'}}
            >
              <Route className="w-3 h-3 mr-2 flex-shrink-0" />
              <span>Call Routing</span>
            </TabsTrigger>
            <TabsTrigger 
              value="agents" 
              className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] relative z-10 flex-shrink-0"
              style={{pointerEvents: 'auto'}}
            >
              <Users className="w-3 h-3 mr-2 flex-shrink-0" />
              <span>Agents</span>
            </TabsTrigger>
          </TabsList>

          {/* Smart Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 mt-6 overflow-hidden">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold">Notification Rules</h2>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl text-sm sm:text-base">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Notification Rule</DialogTitle>
                  </DialogHeader>
                  <NotificationRuleForm 
                    onSubmit={(rule) => addRuleMutation.mutate(rule)}
                    isLoading={addRuleMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {notificationRules.map((rule: NotificationRule) => (
                <Card key={rule.id} className="border rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold line-clamp-1">{rule.name}</h3>
                          <Badge className={rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                            <span className="font-medium shrink-0">Channels:</span>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {rule.actions.channels.map(channel => (
                                <Badge key={channel} variant="outline" className="text-xs">
                                  {channel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {rule.conditions.priority && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                              <span className="font-medium shrink-0">Priority:</span>
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                {rule.conditions.priority.map(priority => (
                                  <Badge key={priority} className={getPriorityColor(priority) + " text-xs"}>
                                    {priority}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {rule.actions.escalation && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                              <span className="font-medium shrink-0">Escalation:</span>
                              <span className="text-amber-600 text-xs sm:text-sm">
                                After {rule.actions.escalation.afterMinutes} minutes
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRuleMutation.mutate({ 
                            id: rule.id, 
                            rule: { ...rule, active: !rule.active } 
                          })}
                          className="rounded-xl"
                        >
                          <Switch checked={rule.active} className="pointer-events-none" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRule(rule);
                            setIsRuleDialogOpen(true);
                          }}
                          className="rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </TabsContent>

          {/* Call Routing Tab */}
          <TabsContent value="routing" className="space-y-6 mt-6 overflow-hidden">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold">Intelligent Call Routing</h2>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-xl"
                  >
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-xl"
                  >
                    <List className="w-4 h-4 mr-2" />
                    List
                  </Button>
                </div>
              </div>
            
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" : "space-y-4"}>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Routing Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">94.2%</div>
                  <p className="text-sm text-gray-600">AI confidence score</p>
                </CardContent>
              </Card>
              
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">2.1s</div>
                  <p className="text-sm text-gray-600">Intent analysis speed</p>
                </CardContent>
              </Card>
              
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">98.7%</div>
                  <p className="text-sm text-gray-600">Successful routing</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl mt-6">
              <CardHeader>
                <CardTitle>Recent Routing Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                  {[
                    { caller: "+1234567890", intent: "sales", confidence: 95, destination: "sales-specialist", time: "2 min ago" },
                    { caller: "+1987654321", intent: "support", confidence: 88, destination: "technical-support", time: "5 min ago" },
                    { caller: "+1555123456", intent: "billing", confidence: 92, destination: "customer-success", time: "8 min ago" }
                  ].map((decision, index) => (
                    <div key={index} className={`${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4' : 'flex flex-col gap-2'} p-4 bg-gray-50 rounded-xl`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{decision.caller}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{decision.time}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 w-fit text-xs">
                          {decision.intent}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs sm:text-sm text-gray-600">{decision.confidence}% confidence</span>
                        <Badge variant="outline" className="w-fit text-xs">{decision.destination}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Agent Management Tab */}
          <TabsContent value="agents" className="space-y-6 mt-6 overflow-hidden">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-semibold mb-6">AI Agent Capabilities</h2>
            
            <div className="grid gap-4">
              {routingAnalytics?.agentCapabilities.map((agent) => (
                <Card key={agent.agentId} className="border rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{agent.name}</h3>
                          <Badge className={getAvailabilityColor(agent.availability)}>
                            {agent.availability}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Current Load</p>
                            <p className="font-medium">{agent.currentLoad}/{agent.maxLoad}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Avg Handle Time</p>
                            <p className="font-medium">{Math.round(agent.averageHandleTime/60)}m</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Satisfaction</p>
                            <p className="font-medium">{agent.satisfactionScore}/5.0</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Languages</p>
                            <p className="font-medium">{agent.languages.join(', ')}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Specializations:</p>
                          <div className="flex gap-2 flex-wrap">
                            {agent.specializations.map(spec => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Select
                          value={agent.availability}
                          onValueChange={(value) => 
                            updateAgentAvailabilityMutation.mutate({ 
                              agentId: agent.agentId, 
                              availability: value 
                            })
                          }
                        >
                          <SelectTrigger className="w-32 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}

function NotificationRuleForm({ onSubmit, isLoading }: { onSubmit: (rule: NotificationRule) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState<Partial<NotificationRule>>({
    name: '',
    conditions: {},
    actions: {
      channels: [],
      recipients: [],
      template: ''
    },
    active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as NotificationRule);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="rounded-xl"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Priority Triggers</Label>
          <div className="space-y-2 mt-2">
            {['low', 'medium', 'high', 'critical'].map(priority => (
              <label key={priority} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.conditions?.priority?.includes(priority)}
                  onChange={(e) => {
                    const currentPriorities = formData.conditions?.priority || [];
                    const newPriorities = e.target.checked
                      ? [...currentPriorities, priority]
                      : currentPriorities.filter(p => p !== priority);
                    setFormData({
                      ...formData,
                      conditions: { ...formData.conditions, priority: newPriorities }
                    });
                  }}
                />
                <span className="capitalize">{priority}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <Label>Notification Channels</Label>
          <div className="space-y-2 mt-2">
            {['sms', 'email', 'push', 'slack'].map(channel => (
              <label key={channel} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.actions?.channels?.includes(channel)}
                  onChange={(e) => {
                    const currentChannels = formData.actions?.channels || [];
                    const newChannels = e.target.checked
                      ? [...currentChannels, channel]
                      : currentChannels.filter(c => c !== channel);
                    setFormData({
                      ...formData,
                      actions: { 
                        ...formData.actions, 
                        channels: newChannels,
                        recipients: formData.actions?.recipients || [],
                        template: formData.actions?.template || ''
                      }
                    });
                  }}
                />
                <span className="capitalize">{channel}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div>
        <Label htmlFor="template">Message Template</Label>
        <Textarea
          id="template"
          value={formData.actions?.template}
          onChange={(e) => setFormData({
            ...formData,
            actions: { 
              ...formData.actions, 
              template: e.target.value,
              channels: formData.actions?.channels || [],
              recipients: formData.actions?.recipients || []
            }
          })}
          placeholder="Alert: {{callerName}} ({{priority}}) is calling..."
          className="rounded-xl"
          required
        />
      </div>
      
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" className="rounded-xl">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 rounded-xl">
          {isLoading ? 'Adding...' : 'Add Rule'}
        </Button>
      </div>
    </form>
  );
}