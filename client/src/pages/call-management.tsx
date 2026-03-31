import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Phone, MessageSquare, Clock, Users, Volume2, Bot, Save, Plus, Trash2, CheckCircle } from "lucide-react";
import AppStoreLayout from "@/components/AppStoreLayout";

interface CallRoute {
  id: number;
  name: string;
  keywords: string[];
  transferTo?: string;
  forwardTo?: string;
  priority: number;
  isActive?: boolean;
  active?: boolean;
  businessHours?: {
    enabled: boolean;
    is24x7: boolean;
    schedule: BusinessHours;
  };
}

interface AIConfig {
  id: number;
  greeting: string;
  personality: string;
  voiceSettings: any;
  useAdvancedConversation: boolean;
  confidenceThreshold: number;
  maxConversationTurns: number;
}

interface BusinessHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

export default function CallManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("greeting");

  // Fetch AI Configuration
  const { data: aiConfig, isLoading: aiLoading } = useQuery<AIConfig>({
    queryKey: ["/api/ai-config"]
  });

  // Fetch Call Routes
  const { data: callRoutes, isLoading: routesLoading } = useQuery<CallRoute[]>({
    queryKey: ["/api/call-routes"]
  });

  // Fetch Business Hours
  const { data: businessHours, isLoading: hoursLoading } = useQuery<BusinessHours>({
    queryKey: ["/api/business-hours"]
  });

  // Update AI Configuration
  const updateAIConfig = useMutation({
    mutationFn: (data: Partial<AIConfig>) => apiRequest("/api/ai-config", {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-config"] });
      toast({ title: "AI settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update AI settings", variant: "destructive" });
    }
  });

  // Update Call Routes
  const updateCallRoutes = useMutation({
    mutationFn: (routes: CallRoute[]) => apiRequest("/api/call-routes", {
      method: "PUT",
      body: JSON.stringify({ routes })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-routes"] });
      toast({ title: "Call routing updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update call routing", variant: "destructive" });
    }
  });

  // Update Business Hours
  const updateBusinessHours = useMutation({
    mutationFn: (hours: BusinessHours) => apiRequest("/api/business-hours", {
      method: "PUT",
      body: JSON.stringify(hours)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-hours"] });
      toast({ title: "Business hours updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update business hours", variant: "destructive" });
    }
  });

  const [greetingText, setGreetingText] = useState("");
  const [personality, setPersonality] = useState("professional");
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState("openai_realtime");
  const [voiceId, setVoiceId] = useState("nova");
  const [routes, setRoutes] = useState<CallRoute[]>(callRoutes || []);
  const [hours, setHours] = useState<BusinessHours>(businessHours || {
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: false },
    sunday: { start: "09:00", end: "17:00", enabled: false }
  });

  // Update local state when data loads
  React.useEffect(() => {
    if (aiConfig) {
      setGreetingText(aiConfig.greeting);
      setPersonality(aiConfig.personality);
      setUseAdvanced(aiConfig.useAdvancedConversation);
      if (aiConfig.voiceSettings?.provider) {
        setVoiceProvider(aiConfig.voiceSettings.provider);
      }
      if (aiConfig.voiceSettings?.voiceId) {
        setVoiceId(aiConfig.voiceSettings.voiceId);
      }
    }
  }, [aiConfig]);

  React.useEffect(() => {
    if (callRoutes) {
      const defaultBusinessHours = {
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "17:00", enabled: false },
        sunday: { start: "09:00", end: "17:00", enabled: false }
      };

      // Initialize business hours for existing routes that don't have them
      const routesWithBusinessHours = callRoutes.map(route => ({
        ...route,
        transferTo: route.transferTo || route.forwardTo || "",
        isActive: route.isActive !== undefined ? route.isActive : route.active,
        businessHours: route.businessHours || {
          enabled: false,
          is24x7: false,
          schedule: defaultBusinessHours
        }
      }));
      
      setRoutes(routesWithBusinessHours);
    }
  }, [callRoutes]);

  React.useEffect(() => {
    if (businessHours) setHours(businessHours);
  }, [businessHours]);

  const handleSaveGreeting = () => {
    updateAIConfig.mutate({
      greeting: greetingText,
      personality,
      useAdvancedConversation: useAdvanced
    });
  };

  const handleSaveRoutes = () => {
    updateCallRoutes.mutate(routes);
  };

  const handleSaveHours = () => {
    updateBusinessHours.mutate(hours);
  };

  const addNewRoute = () => {
    const defaultBusinessHours = {
      monday: { start: "09:00", end: "17:00", enabled: true },
      tuesday: { start: "09:00", end: "17:00", enabled: true },
      wednesday: { start: "09:00", end: "17:00", enabled: true },
      thursday: { start: "09:00", end: "17:00", enabled: true },
      friday: { start: "09:00", end: "17:00", enabled: true },
      saturday: { start: "09:00", end: "17:00", enabled: false },
      sunday: { start: "09:00", end: "17:00", enabled: false }
    };

    const newRoute: CallRoute = {
      id: Date.now(),
      name: "New Route",
      keywords: [],
      transferTo: "",
      priority: routes.length + 1,
      isActive: true,
      businessHours: {
        enabled: false,
        is24x7: false,
        schedule: defaultBusinessHours
      }
    };
    setRoutes([...routes, newRoute]);
  };

  const deleteRoute = (id: number) => {
    setRoutes(routes.filter(route => route.id !== id));
  };

  const updateRoute = (id: number, updates: Partial<CallRoute>) => {
    setRoutes(routes.map(route => 
      route.id === id ? { ...route, ...updates } : route
    ));
  };

  if (aiLoading || routesLoading || hoursLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-2 text-muted">Loading call management settings...</p>
        </div>
      </div>
    );
  }

  return (
    <AppStoreLayout>
      <div className="section-spacing">
        <div className="page-header">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <h1 className="page-title">AI Agent</h1>
          </div>
          <p className="page-description">
            Configure your AI assistant, call routing, and conversation management settings.
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="greeting" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>AI Assistant</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span>AI Training</span>
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Call Routing</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Business Hours</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="greeting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI Assistant Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure how your AI assistant greets callers and behaves during conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Textarea
                  id="greeting"
                  placeholder="Enter the greeting message callers will hear..."
                  value={greetingText}
                  onChange={(e) => setGreetingText(e.target.value)}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  This is the first message callers will hear when they call your number.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">AI Personality</Label>
                <Select value={personality} onValueChange={setPersonality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="advanced-conversation"
                  checked={useAdvanced}
                  onCheckedChange={(checked) => {
                    console.log("Toggling advanced conversation from", useAdvanced, "to", checked);
                    updateAIConfig.mutate({
                      useAdvancedConversation: checked
                    }, {
                      onSuccess: (data) => {
                        console.log("Successfully updated advanced conversation to:", data.useAdvancedConversation);
                        setUseAdvanced(data.useAdvancedConversation);
                      },
                      onError: (error) => {
                        console.error("Failed to update advanced conversation:", error);
                        // Revert the toggle state on error
                        setUseAdvanced(!checked);
                      }
                    });
                  }}
                />
                <Label htmlFor="advanced-conversation">Enable Advanced Conversation</Label>
              </div>

              <Button onClick={handleSaveGreeting} disabled={updateAIConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save AI Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>Voice Settings</span>
              </CardTitle>
              <CardDescription>
                Choose your voice provider and voice type for AI conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Voice Provider</Label>
                <Select
                  value={voiceProvider}
                  onValueChange={(value) => {
                    setVoiceProvider(value);
                    const defaults: Record<string, string> = {
                      openai_realtime: "nova",
                      elevenlabs: "rachel",
                      cartesia: "default",
                      nvidia_personaplex: "NATF2",
                      twilio: "default",
                    };
                    setVoiceId(defaults[value] || "default");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai_realtime">OpenAI Realtime</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="cartesia">Cartesia</SelectItem>
                    <SelectItem value="nvidia_personaplex">NVIDIA PersonaPlex</SelectItem>
                    <SelectItem value="twilio">Twilio (Fallback)</SelectItem>
                  </SelectContent>
                </Select>
                {voiceProvider === "nvidia_personaplex" && (
                  <p className="text-xs text-green-600 mt-1">
                    Full-duplex speech-to-speech AI with ~170ms latency, persona control, and natural interruption handling
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Voice Type</Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceProvider === "nvidia_personaplex" ? (
                      <>
                        <SelectItem value="NATF0">Natural Female 1</SelectItem>
                        <SelectItem value="NATF1">Natural Female 2</SelectItem>
                        <SelectItem value="NATF2">Natural Female 3 (Default)</SelectItem>
                        <SelectItem value="NATF3">Natural Female 4</SelectItem>
                        <SelectItem value="NATM0">Natural Male 1</SelectItem>
                        <SelectItem value="NATM1">Natural Male 2</SelectItem>
                        <SelectItem value="NATM2">Natural Male 3</SelectItem>
                        <SelectItem value="NATM3">Natural Male 4</SelectItem>
                        <SelectItem value="VARF0">Variety Female 1</SelectItem>
                        <SelectItem value="VARF1">Variety Female 2</SelectItem>
                        <SelectItem value="VARF2">Variety Female 3</SelectItem>
                        <SelectItem value="VARF3">Variety Female 4</SelectItem>
                        <SelectItem value="VARF4">Variety Female 5</SelectItem>
                        <SelectItem value="VARM0">Variety Male 1</SelectItem>
                        <SelectItem value="VARM1">Variety Male 2</SelectItem>
                        <SelectItem value="VARM2">Variety Male 3</SelectItem>
                        <SelectItem value="VARM3">Variety Male 4</SelectItem>
                        <SelectItem value="VARM4">Variety Male 5</SelectItem>
                      </>
                    ) : voiceProvider === "elevenlabs" ? (
                      <>
                        <SelectItem value="rachel">Rachel (Natural)</SelectItem>
                        <SelectItem value="drew">Drew (Confident)</SelectItem>
                        <SelectItem value="clyde">Clyde (Authoritative)</SelectItem>
                        <SelectItem value="paul">Paul (Calm)</SelectItem>
                        <SelectItem value="domi">Domi (Energetic)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="nova">Nova (Warm, Natural)</SelectItem>
                        <SelectItem value="alloy">Alloy (Professional)</SelectItem>
                        <SelectItem value="echo">Echo (Confident)</SelectItem>
                        <SelectItem value="shimmer">Shimmer (Gentle)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {voiceProvider === "nvidia_personaplex" && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">PersonaPlex</Badge>
                    <span className="text-sm font-medium">Full-Duplex Features</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Natural interruptions
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Voice cloning
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Backchannels (uh-huh)
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      ~170ms latency
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  updateAIConfig.mutate({
                    voiceSettings: { provider: voiceProvider, voiceId }
                  } as any);
                }}
                disabled={updateAIConfig.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Voice Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI Training & Knowledge Base</span>
              </CardTitle>
              <CardDescription>
                Train your AI agent with custom scenarios and manage its knowledge base for better responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Training Scenarios</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Add common customer interactions to improve AI responses
                    </p>
                    <div className="space-y-2">
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">General Inquiry Handling</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer: "What are your business hours?"
                        </p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Service Requests</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer: "I need technical support"
                        </p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Emergency Situations</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer: "This is urgent, I need immediate help"
                        </p>
                      </Card>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Training Scenario
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Knowledge Base</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Manage information your AI can reference during conversations
                    </p>
                    <div className="space-y-2">
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Company Information</span>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Business hours, location, services offered
                        </p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">FAQ Responses</span>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Common questions and standardized answers
                        </p>
                      </Card>
                      <Card className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Department Contacts</span>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Contact information for different departments
                        </p>
                      </Card>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Knowledge Entry
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">AI Behavior Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Response Confidence Threshold</Label>
                    <Select defaultValue="high">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (70%)</SelectItem>
                        <SelectItem value="medium">Medium (85%)</SelectItem>
                        <SelectItem value="high">High (95%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How confident the AI should be before providing an answer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Escalation Strategy</Label>
                    <Select defaultValue="moderate">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative - Transfer quickly</SelectItem>
                        <SelectItem value="moderate">Moderate - Try to help first</SelectItem>
                        <SelectItem value="aggressive">Aggressive - Handle most calls</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      When to transfer calls to human agents
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Enable conversation learning from call recordings</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked />
                  <Label>Auto-generate FAQ entries from common questions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch />
                  <Label>Enable sentiment analysis and emotional responses</Label>
                </div>
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Training Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Call Routing Rules</span>
              </CardTitle>
              <CardDescription>
                Set up how calls are routed to different departments based on caller intent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {routes.map((route, index) => (
                <Card key={route.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant={route.isActive ? "default" : "secondary"}>
                        {route.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="font-medium">{route.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRoute(route.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Route Name</Label>
                      <Input
                        value={route.name}
                        onChange={(e) => updateRoute(route.id, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Transfer To</Label>
                      <Input
                        placeholder="+1234567890"
                        value={route.transferTo || ""}
                        onChange={(e) => updateRoute(route.id, { transferTo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Input
                        type="number"
                        value={route.priority}
                        onChange={(e) => updateRoute(route.id, { priority: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Keywords</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {route.keywords.map((keyword, keywordIndex) => (
                          <Badge
                            key={keywordIndex}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                                const newKeywords = route.keywords.filter((_, index) => index !== keywordIndex);
                                updateRoute(route.id, { keywords: newKeywords });
                              }}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type keyword and press Enter"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newKeyword = e.currentTarget.value.trim();
                              if (newKeyword && !route.keywords.includes(newKeyword)) {
                                updateRoute(route.id, { 
                                  keywords: [...route.keywords, newKeyword]
                                });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input');
                            if (input) {
                              const newKeyword = input.value.trim();
                              if (newKeyword && !route.keywords.includes(newKeyword)) {
                                updateRoute(route.id, { 
                                  keywords: [...route.keywords, newKeyword]
                                });
                                input.value = '';
                              }
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Add keywords that callers might use to describe their needs
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-gray-500">Quick add:</span>
                          {["sales", "support", "billing", "help", "pricing", "quote", "technical", "account"].map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                if (!route.keywords.includes(suggestion)) {
                                  updateRoute(route.id, { 
                                    keywords: [...route.keywords, suggestion]
                                  });
                                }
                              }}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                              disabled={route.keywords.includes(suggestion)}
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      checked={route.isActive}
                      onCheckedChange={(checked) => updateRoute(route.id, { isActive: checked })}
                    />
                    <Label>Active</Label>
                  </div>

                  {/* Business Hours Configuration for this Route */}
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Department Business Hours
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={route.businessHours?.enabled || false}
                          onCheckedChange={(enabled) => updateRoute(route.id, { 
                            businessHours: { 
                              ...route.businessHours || { 
                                enabled: false, 
                                is24x7: false, 
                                schedule: {
                                  monday: { start: "09:00", end: "17:00", enabled: true },
                                  tuesday: { start: "09:00", end: "17:00", enabled: true },
                                  wednesday: { start: "09:00", end: "17:00", enabled: true },
                                  thursday: { start: "09:00", end: "17:00", enabled: true },
                                  friday: { start: "09:00", end: "17:00", enabled: true },
                                  saturday: { start: "09:00", end: "17:00", enabled: false },
                                  sunday: { start: "09:00", end: "17:00", enabled: false }
                                }
                              }, 
                              enabled 
                            }
                          })}
                        />
                        <Label>Use department-specific business hours</Label>
                      </div>

                      {route.businessHours?.enabled && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={route.businessHours?.is24x7 || false}
                              onCheckedChange={(is24x7) => updateRoute(route.id, { 
                                businessHours: { 
                                  ...route.businessHours!, 
                                  is24x7 
                                }
                              })}
                            />
                            <Label>24/7 Availability</Label>
                          </div>

                          {!route.businessHours?.is24x7 && (
                            <div className="space-y-2 mt-4">
                              <p className="text-sm text-gray-600 mb-2">Configure hours for each day:</p>
                              {Object.entries(route.businessHours?.schedule || {}).map(([day, schedule]) => (
                                <div key={day} className="flex items-center space-x-3 text-sm">
                                  <div className="w-20">
                                    <span className="capitalize">{day}</span>
                                  </div>
                                  <Switch
                                    checked={schedule.enabled}
                                    onCheckedChange={(enabled) => {
                                      const newSchedule = {
                                        ...route.businessHours!.schedule,
                                        [day]: { ...schedule, enabled }
                                      };
                                      updateRoute(route.id, { 
                                        businessHours: { 
                                          ...route.businessHours!, 
                                          schedule: newSchedule 
                                        }
                                      });
                                    }}
                                  />
                                  {schedule.enabled && (
                                    <>
                                      <Input
                                        type="time"
                                        value={schedule.start}
                                        onChange={(e) => {
                                          const newSchedule = {
                                            ...route.businessHours!.schedule,
                                            [day]: { ...schedule, start: e.target.value }
                                          };
                                          updateRoute(route.id, { 
                                            businessHours: { 
                                              ...route.businessHours!, 
                                              schedule: newSchedule 
                                            }
                                          });
                                        }}
                                        className="w-24"
                                      />
                                      <span className="text-gray-500">to</span>
                                      <Input
                                        type="time"
                                        value={schedule.end}
                                        onChange={(e) => {
                                          const newSchedule = {
                                            ...route.businessHours!.schedule,
                                            [day]: { ...schedule, end: e.target.value }
                                          };
                                          updateRoute(route.id, { 
                                            businessHours: { 
                                              ...route.businessHours!, 
                                              schedule: newSchedule 
                                            }
                                          });
                                        }}
                                        className="w-24"
                                      />
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={addNewRoute}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Route
                </Button>
                <Button onClick={handleSaveRoutes} disabled={updateCallRoutes.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Routes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Business Hours</span>
              </CardTitle>
              <CardDescription>
                Configure your business operating hours for different days of the week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(hours).map(([day, schedule]) => (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <span className="font-medium capitalize">{day}</span>
                  </div>
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(enabled) => 
                      setHours(prev => ({
                        ...prev,
                        [day]: { ...prev[day as keyof BusinessHours], enabled }
                      }))
                    }
                  />
                  {schedule.enabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => 
                            setHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof BusinessHours], start: e.target.value }
                            }))
                          }
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => 
                            setHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof BusinessHours], end: e.target.value }
                            }))
                          }
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              <Button onClick={handleSaveHours} disabled={updateBusinessHours.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Business Hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>Advanced Settings</span>
              </CardTitle>
              <CardDescription>
                Advanced configuration options for your phone system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Confidence Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiConfig?.confidenceThreshold || 0.8}
                    onChange={(e) => {
                      updateAIConfig.mutate({
                        confidenceThreshold: parseFloat(e.target.value)
                      });
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    How confident the AI must be before taking action (0.0 - 1.0)
                  </p>
                </div>
                
                <div>
                  <Label>Max Conversation Turns</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={aiConfig?.maxConversationTurns || 10}
                    onChange={(e) => {
                      updateAIConfig.mutate({
                        maxConversationTurns: parseInt(e.target.value)
                      });
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum number of conversation exchanges before transferring
                  </p>
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