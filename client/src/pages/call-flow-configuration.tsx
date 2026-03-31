import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Save, Settings, MessageSquare, Phone, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CallFlowConfig {
  id?: number;
  name: string;
  isActive: boolean;
  greetingType: "standard" | "conversational" | "dynamic";
  standardGreeting: string;
  enableAdvancedGreeting: boolean;
  greetingPersonalization: {
    useCallerName: boolean;
    useTimeOfDay: boolean;
    useCallHistory: boolean;
    useWeather: boolean;
  };
  routePresentation: "after_greeting" | "during_greeting" | "on_request";
  routePresentationDelay: number;
  speechAnalysisEnabled: boolean;
  intentRecognition: {
    salesKeywords: string[];
    supportKeywords: string[];
    customIntents: Array<{
      intent: string;
      patterns: string[];
      action: string;
      actionConfig: any;
    }>;
  };
  followUpQuestions: {
    enabled: boolean;
    askName: boolean;
    askPurpose: boolean;
    maxQuestions: number;
  };
  unavailableMode: {
    enabled: boolean;
    message: string;
    captureMessage: boolean;
    maxMessageLength: number;
  };
  voicemailThreshold: number;
  transferSettings: {
    salesNumber: string;
    supportNumber: string;
    defaultNumber: string;
    transferMessage: string;
  };
  conversationSettings: {
    maxTurns: number;
    confidenceThreshold: number;
    enableLearning: boolean;
    enableContextMemory: boolean;
  };
}

interface GreetingTemplate {
  id?: number;
  name: string;
  type: string;
  template: string;
  conditions: any;
  priority: number;
  isActive: boolean;
}

interface IntentPattern {
  id?: number;
  intent: string;
  patterns: string[];
  confidence: string;
  action: string;
  actionConfig: any;
  isActive: boolean;
}

export default function CallFlowConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("flow-configs");
  const [selectedConfig, setSelectedConfig] = useState<CallFlowConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch call flow configurations
  const { data: callFlowConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['/api/call-flow-configs'],
    queryFn: () => apiRequest('/api/call-flow-configs')
  });

  // Fetch greeting templates
  const { data: greetingTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/greeting-templates'],
    queryFn: () => apiRequest('/api/greeting-templates')
  });

  // Fetch intent patterns
  const { data: intentPatterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: ['/api/intent-patterns'],
    queryFn: () => apiRequest('/api/intent-patterns')
  });

  // Create/Update call flow config
  const saveConfigMutation = useMutation({
    mutationFn: (config: CallFlowConfig) => {
      if (config.id) {
        return apiRequest(`/api/call-flow-configs/${config.id}`, {
          method: 'PUT',
          body: JSON.stringify(config)
        });
      } else {
        return apiRequest('/api/call-flow-configs', {
          method: 'POST',
          body: JSON.stringify(config)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flow-configs'] });
      toast({ title: "Call flow configuration saved successfully!" });
      setIsCreating(false);
      setSelectedConfig(null);
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    }
  });

  // Delete call flow config
  const deleteConfigMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/call-flow-configs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-flow-configs'] });
      toast({ title: "Configuration deleted successfully!" });
    }
  });

  // Create greeting template
  const createTemplateMutation = useMutation({
    mutationFn: (template: GreetingTemplate) => 
      apiRequest('/api/greeting-templates', {
        method: 'POST',
        body: JSON.stringify(template)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/greeting-templates'] });
      toast({ title: "Greeting template created successfully!" });
    }
  });

  // Create intent pattern
  const createPatternMutation = useMutation({
    mutationFn: (pattern: IntentPattern) => 
      apiRequest('/api/intent-patterns', {
        method: 'POST',
        body: JSON.stringify(pattern)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intent-patterns'] });
      toast({ title: "Intent pattern created successfully!" });
    }
  });

  // Default configuration
  const getDefaultConfig = (): CallFlowConfig => ({
    name: "New Call Flow",
    isActive: false,
    greetingType: "standard",
    standardGreeting: "Hello! Thank you for calling. How can I help you today?",
    enableAdvancedGreeting: false,
    greetingPersonalization: {
      useCallerName: true,
      useTimeOfDay: true,
      useCallHistory: false,
      useWeather: false
    },
    routePresentation: "after_greeting",
    routePresentationDelay: 2,
    speechAnalysisEnabled: true,
    intentRecognition: {
      salesKeywords: ["sales", "buy", "purchase", "pricing", "quote"],
      supportKeywords: ["support", "help", "problem", "issue", "broken"],
      customIntents: []
    },
    followUpQuestions: {
      enabled: true,
      askName: true,
      askPurpose: true,
      maxQuestions: 3
    },
    unavailableMode: {
      enabled: false,
      message: "I'm currently unavailable. Please leave a message.",
      captureMessage: true,
      maxMessageLength: 120
    },
    voicemailThreshold: 3,
    transferSettings: {
      salesNumber: "+1234567890",
      supportNumber: "+1234567891",
      defaultNumber: "+1234567892",
      transferMessage: "Please hold while I transfer your call."
    },
    conversationSettings: {
      maxTurns: 10,
      confidenceThreshold: 0.8,
      enableLearning: false,
      enableContextMemory: true
    }
  });

  const handleSaveConfig = () => {
    if (selectedConfig) {
      saveConfigMutation.mutate(selectedConfig);
    }
  };

  const handleCreateNew = () => {
    setSelectedConfig(getDefaultConfig());
    setIsCreating(true);
  };

  const updateConfig = (updates: Partial<CallFlowConfig>) => {
    if (selectedConfig) {
      setSelectedConfig({ ...selectedConfig, ...updates });
    }
  };

  const updateNestedConfig = (path: string[], value: any) => {
    if (!selectedConfig) return;
    
    const newConfig = { ...selectedConfig };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    setSelectedConfig(newConfig);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Flow Configuration</h1>
          <p className="text-muted-foreground">
            Configure advanced call routing, greetings, and conversation flows
          </p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Configuration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flow-configs" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Flow Configs
          </TabsTrigger>
          <TabsTrigger value="greetings" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Greetings
          </TabsTrigger>
          <TabsTrigger value="intents" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Intent Patterns
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow-configs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration List */}
            <Card>
              <CardHeader>
                <CardTitle>Call Flow Configurations</CardTitle>
                <CardDescription>
                  Manage your call routing configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {configsLoading ? (
                  <div>Loading configurations...</div>
                ) : (
                  callFlowConfigs.map((config: CallFlowConfig) => (
                    <div
                      key={config.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedConfig?.id === config.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedConfig(config)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{config.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {config.greetingType} • {config.routePresentation}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {config.isActive && (
                            <Badge variant="default">Active</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConfigMutation.mutate(config.id!);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Configuration Editor */}
            {selectedConfig && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {isCreating ? "Create Configuration" : "Edit Configuration"}
                      </CardTitle>
                      <CardDescription>
                        Configure how calls are handled and routed
                      </CardDescription>
                    </div>
                    <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Settings</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Configuration Name</Label>
                        <Input
                          id="name"
                          value={selectedConfig.name}
                          onChange={(e) => updateConfig({ name: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={selectedConfig.isActive}
                          onCheckedChange={(checked) => updateConfig({ isActive: checked })}
                        />
                        <Label htmlFor="isActive">Set as Active Configuration</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Greeting Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Greeting Configuration</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="greetingType">Greeting Type</Label>
                        <Select
                          value={selectedConfig.greetingType}
                          onValueChange={(value) => updateConfig({ greetingType: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard Greeting</SelectItem>
                            <SelectItem value="conversational">AI Conversational</SelectItem>
                            <SelectItem value="dynamic">Dynamic Personalized</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedConfig.greetingType === "standard" && (
                        <div>
                          <Label htmlFor="standardGreeting">Standard Greeting Message</Label>
                          <Textarea
                            id="standardGreeting"
                            value={selectedConfig.standardGreeting}
                            onChange={(e) => updateConfig({ standardGreeting: e.target.value })}
                            placeholder="Enter your greeting message..."
                          />
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="font-medium">Personalization Options</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="useCallerName"
                              checked={selectedConfig.greetingPersonalization.useCallerName}
                              onCheckedChange={(checked) => 
                                updateNestedConfig(['greetingPersonalization', 'useCallerName'], checked)
                              }
                            />
                            <Label htmlFor="useCallerName">Use Caller Name</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="useTimeOfDay"
                              checked={selectedConfig.greetingPersonalization.useTimeOfDay}
                              onCheckedChange={(checked) => 
                                updateNestedConfig(['greetingPersonalization', 'useTimeOfDay'], checked)
                              }
                            />
                            <Label htmlFor="useTimeOfDay">Time-based Greeting</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="useCallHistory"
                              checked={selectedConfig.greetingPersonalization.useCallHistory}
                              onCheckedChange={(checked) => 
                                updateNestedConfig(['greetingPersonalization', 'useCallHistory'], checked)
                              }
                            />
                            <Label htmlFor="useCallHistory">Use Call History</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="useWeather"
                              checked={selectedConfig.greetingPersonalization.useWeather}
                              onCheckedChange={(checked) => 
                                updateNestedConfig(['greetingPersonalization', 'useWeather'], checked)
                              }
                            />
                            <Label htmlFor="useWeather">Weather Context</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Route Presentation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Route Presentation</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="routePresentation">When to Present Routes</Label>
                        <Select
                          value={selectedConfig.routePresentation}
                          onValueChange={(value) => updateConfig({ routePresentation: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="after_greeting">After Greeting</SelectItem>
                            <SelectItem value="during_greeting">During Greeting</SelectItem>
                            <SelectItem value="on_request">On Request Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="routePresentationDelay">Delay (seconds)</Label>
                        <Input
                          id="routePresentationDelay"
                          type="number"
                          value={selectedConfig.routePresentationDelay}
                          onChange={(e) => updateConfig({ routePresentationDelay: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Speech Analysis */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Speech Analysis & Intent Recognition</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="speechAnalysisEnabled"
                        checked={selectedConfig.speechAnalysisEnabled}
                        onCheckedChange={(checked) => updateConfig({ speechAnalysisEnabled: checked })}
                      />
                      <Label htmlFor="speechAnalysisEnabled">Enable Speech Analysis</Label>
                    </div>

                    {selectedConfig.speechAnalysisEnabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="salesKeywords">Sales Keywords (comma separated)</Label>
                          <Input
                            id="salesKeywords"
                            value={selectedConfig.intentRecognition.salesKeywords.join(', ')}
                            onChange={(e) => 
                              updateNestedConfig(['intentRecognition', 'salesKeywords'], 
                                e.target.value.split(',').map(k => k.trim()).filter(k => k))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="supportKeywords">Support Keywords (comma separated)</Label>
                          <Input
                            id="supportKeywords"
                            value={selectedConfig.intentRecognition.supportKeywords.join(', ')}
                            onChange={(e) => 
                              updateNestedConfig(['intentRecognition', 'supportKeywords'], 
                                e.target.value.split(',').map(k => k.trim()).filter(k => k))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Follow-up Questions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Follow-up Questions</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="followUpEnabled"
                        checked={selectedConfig.followUpQuestions.enabled}
                        onCheckedChange={(checked) => 
                          updateNestedConfig(['followUpQuestions', 'enabled'], checked)
                        }
                      />
                      <Label htmlFor="followUpEnabled">Enable Follow-up Questions</Label>
                    </div>

                    {selectedConfig.followUpQuestions.enabled && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="askName"
                            checked={selectedConfig.followUpQuestions.askName}
                            onCheckedChange={(checked) => 
                              updateNestedConfig(['followUpQuestions', 'askName'], checked)
                            }
                          />
                          <Label htmlFor="askName">Ask for Name</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="askPurpose"
                            checked={selectedConfig.followUpQuestions.askPurpose}
                            onCheckedChange={(checked) => 
                              updateNestedConfig(['followUpQuestions', 'askPurpose'], checked)
                            }
                          />
                          <Label htmlFor="askPurpose">Ask for Purpose</Label>
                        </div>
                        <div>
                          <Label htmlFor="maxQuestions">Max Questions</Label>
                          <Input
                            id="maxQuestions"
                            type="number"
                            value={selectedConfig.followUpQuestions.maxQuestions}
                            onChange={(e) => 
                              updateNestedConfig(['followUpQuestions', 'maxQuestions'], parseInt(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Unavailable Mode */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Unavailable Mode</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="unavailableEnabled"
                        checked={selectedConfig.unavailableMode.enabled}
                        onCheckedChange={(checked) => 
                          updateNestedConfig(['unavailableMode', 'enabled'], checked)
                        }
                      />
                      <Label htmlFor="unavailableEnabled">Enable Unavailable Mode</Label>
                    </div>

                    {selectedConfig.unavailableMode.enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="unavailableMessage">Unavailable Message</Label>
                          <Textarea
                            id="unavailableMessage"
                            value={selectedConfig.unavailableMode.message}
                            onChange={(e) => 
                              updateNestedConfig(['unavailableMode', 'message'], e.target.value)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="captureMessage"
                              checked={selectedConfig.unavailableMode.captureMessage}
                              onCheckedChange={(checked) => 
                                updateNestedConfig(['unavailableMode', 'captureMessage'], checked)
                              }
                            />
                            <Label htmlFor="captureMessage">Capture Message</Label>
                          </div>
                          <div>
                            <Label htmlFor="maxMessageLength">Max Message Length (seconds)</Label>
                            <Input
                              id="maxMessageLength"
                              type="number"
                              value={selectedConfig.unavailableMode.maxMessageLength}
                              onChange={(e) => 
                                updateNestedConfig(['unavailableMode', 'maxMessageLength'], parseInt(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Transfer Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Transfer Settings</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="salesNumber">Sales Number</Label>
                        <Input
                          id="salesNumber"
                          value={selectedConfig.transferSettings.salesNumber}
                          onChange={(e) => 
                            updateNestedConfig(['transferSettings', 'salesNumber'], e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="supportNumber">Support Number</Label>
                        <Input
                          id="supportNumber"
                          value={selectedConfig.transferSettings.supportNumber}
                          onChange={(e) => 
                            updateNestedConfig(['transferSettings', 'supportNumber'], e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultNumber">Default Number</Label>
                        <Input
                          id="defaultNumber"
                          value={selectedConfig.transferSettings.defaultNumber}
                          onChange={(e) => 
                            updateNestedConfig(['transferSettings', 'defaultNumber'], e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="voicemailThreshold">Voicemail Threshold</Label>
                        <Input
                          id="voicemailThreshold"
                          type="number"
                          value={selectedConfig.voicemailThreshold}
                          onChange={(e) => updateConfig({ voicemailThreshold: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="transferMessage">Transfer Message</Label>
                      <Textarea
                        id="transferMessage"
                        value={selectedConfig.transferSettings.transferMessage}
                        onChange={(e) => 
                          updateNestedConfig(['transferSettings', 'transferMessage'], e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="greetings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Greeting Templates</CardTitle>
              <CardDescription>
                Create dynamic greeting templates for different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div>Loading greeting templates...</div>
              ) : (
                <div className="space-y-4">
                  {greetingTemplates.map((template: GreetingTemplate) => (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.type}</p>
                          <p className="text-sm mt-2">{template.template}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Priority: {template.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Intent Patterns</CardTitle>
              <CardDescription>
                Define patterns for recognizing caller intents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternsLoading ? (
                <div>Loading intent patterns...</div>
              ) : (
                <div className="space-y-4">
                  {intentPatterns.map((pattern: IntentPattern) => (
                    <div key={pattern.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{pattern.intent}</h4>
                          <p className="text-sm text-muted-foreground">
                            Patterns: {pattern.patterns.join(', ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Action: {pattern.action}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={pattern.isActive ? "default" : "secondary"}>
                            {pattern.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Confidence: {pattern.confidence}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Flow Preview</CardTitle>
              <CardDescription>
                Preview how your call flow configuration will work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Active Configuration</h4>
                  {callFlowConfigs.find((config: CallFlowConfig) => config.isActive) ? (
                    <div>
                      <p className="font-medium">
                        {callFlowConfigs.find((config: CallFlowConfig) => config.isActive)?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Greeting: {callFlowConfigs.find((config: CallFlowConfig) => config.isActive)?.greetingType}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active configuration</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Call Flow Steps</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Incoming Call</p>
                        <p className="text-sm text-muted-foreground">
                          Call received and caller identified
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Greeting</p>
                        <p className="text-sm text-muted-foreground">
                          Play configured greeting based on settings
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Route Presentation</p>
                        <p className="text-sm text-muted-foreground">
                          Present available options to caller
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Speech Analysis</p>
                        <p className="text-sm text-muted-foreground">
                          Analyze caller input for intent recognition
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        5
                      </div>
                      <div>
                        <p className="font-medium">Action</p>
                        <p className="text-sm text-muted-foreground">
                          Transfer, continue conversation, or capture message
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}