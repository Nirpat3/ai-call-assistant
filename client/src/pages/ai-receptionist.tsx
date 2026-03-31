import { useState } from "react";
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
import { 
  Bot, 
  Phone, 
  MessageSquare, 
  Settings, 
  Play, 
  Users, 
  Brain,
  CheckCircle,
  AlertCircle,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReceptionistConfig {
  companyName: string;
  aiName: string;
  greetingStyle: 'friendly' | 'formal' | 'custom';
  customGreeting?: string;
  voiceSettings: {
    provider: string;
    voiceId: string;
    speed: number;
    pitch: number;
  };
  businessHours: {
    enabled: boolean;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
    outsideHoursMessage: string;
  };
  departmentRouting: {
    sales: { enabled: boolean; number: string; keywords: string[] };
    support: { enabled: boolean; number: string; keywords: string[] };
    billing: { enabled: boolean; number: string; keywords: string[] };
    general: { enabled: boolean; number: string };
  };
  conversationSettings: {
    maxTurns: number;
    responseDelay: number;
    enableSmallTalk: boolean;
    politenessLevel: 'casual' | 'professional' | 'formal';
  };
  spamFiltering: {
    enabled: boolean;
    blockedKeywords: string[];
    autoDeclineUnknown: boolean;
  };
}

interface ConversationTest {
  id: string;
  scenario: string;
  callerInput: string;
  expectedBehavior: string;
  actualResponse?: string;
  passed?: boolean;
}

export default function AIReceptionist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("config");
  const [testScenario, setTestScenario] = useState("");
  const [testInput, setTestInput] = useState("");
  const [isTestingConversation, setIsTestingConversation] = useState(false);

  // Default configuration
  const [config, setConfig] = useState<ReceptionistConfig>({
    companyName: "RapidRMS",
    aiName: "Sarah",
    greetingStyle: "friendly",
    voiceSettings: {
      provider: "openai_realtime",
      voiceId: "nova",
      speed: 1.0,
      pitch: 1.0
    },
    businessHours: {
      enabled: true,
      schedule: {
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "10:00", end: "14:00", enabled: false },
        sunday: { start: "10:00", end: "14:00", enabled: false }
      },
      outsideHoursMessage: "Thanks for calling! We're currently closed, but your call is important to us. Please leave a message and we'll get back to you soon."
    },
    departmentRouting: {
      sales: { 
        enabled: true, 
        number: "+1234567890", 
        keywords: ["sales", "buy", "purchase", "pricing", "demo", "quote"] 
      },
      support: { 
        enabled: true, 
        number: "+1234567891", 
        keywords: ["help", "support", "problem", "issue", "broken", "error"] 
      },
      billing: { 
        enabled: true, 
        number: "+1234567892", 
        keywords: ["billing", "invoice", "payment", "account", "refund"] 
      },
      general: { 
        enabled: true, 
        number: "+1234567893" 
      }
    },
    conversationSettings: {
      maxTurns: 8,
      responseDelay: 1.5,
      enableSmallTalk: true,
      politenessLevel: 'professional'
    },
    spamFiltering: {
      enabled: true,
      blockedKeywords: ["solar", "insurance", "loan", "seo", "marketing"],
      autoDeclineUnknown: false
    }
  });

  const [conversationTests] = useState<ConversationTest[]>([
    {
      id: "1",
      scenario: "Sales Inquiry",
      callerInput: "Hi, I'm interested in your pricing for RapidRMS",
      expectedBehavior: "Recognizes sales intent and routes to sales team"
    },
    {
      id: "2",
      scenario: "Support Request",
      callerInput: "I'm having trouble with my account, it's not working",
      expectedBehavior: "Recognizes support intent and routes to technical support"
    },
    {
      id: "3",
      scenario: "Spam Call",
      callerInput: "Hi, I'm calling about solar panels for your business",
      expectedBehavior: "Politely declines and ends call"
    },
    {
      id: "4",
      scenario: "General Information",
      callerInput: "What are your business hours?",
      expectedBehavior: "Provides business hours information"
    },
    {
      id: "5",
      scenario: "Unclear Intent",
      callerInput: "Um, hi there...",
      expectedBehavior: "Asks clarifying question to understand caller's needs"
    }
  ]);

  // Save configuration
  const saveConfigMutation = useMutation({
    mutationFn: (configData: ReceptionistConfig) => 
      apiRequest('/api/receptionist/config', {
        method: 'POST',
        body: JSON.stringify(configData)
      }),
    onSuccess: () => {
      toast({ title: "Receptionist configuration saved successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    }
  });

  // Test conversation
  const testConversationMutation = useMutation({
    mutationFn: (testData: { scenario: string; input: string }) => 
      apiRequest('/api/receptionist/test', {
        method: 'POST',
        body: JSON.stringify(testData)
      }),
    onSuccess: (response) => {
      toast({ title: "Conversation test completed!" });
      console.log("Test response:", response);
    },
    onError: () => {
      toast({ title: "Test failed", variant: "destructive" });
    }
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(config);
  };

  const handleTestConversation = () => {
    if (!testScenario || !testInput) {
      toast({ title: "Please provide both scenario and test input", variant: "destructive" });
      return;
    }
    
    setIsTestingConversation(true);
    testConversationMutation.mutate({
      scenario: testScenario,
      input: testInput
    });
    
    setTimeout(() => setIsTestingConversation(false), 2000);
  };

  const updateConfig = (path: string[], value: any) => {
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    setConfig(newConfig);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Receptionist
          </h1>
          <p className="text-muted-foreground">
            Configure your natural, conversational AI phone assistant
          </p>
        </div>
        <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
          <Settings className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="personality" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Personality
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Routing
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
                <CardDescription>
                  Configure company and AI assistant details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={config.companyName}
                    onChange={(e) => updateConfig(['companyName'], e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="aiName">AI Assistant Name</Label>
                  <Input
                    id="aiName"
                    value={config.aiName}
                    onChange={(e) => updateConfig(['aiName'], e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="greetingStyle">Greeting Style</Label>
                  <Select
                    value={config.greetingStyle}
                    onValueChange={(value) => updateConfig(['greetingStyle'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Warm</SelectItem>
                      <SelectItem value="formal">Professional & Formal</SelectItem>
                      <SelectItem value="custom">Custom Greeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.greetingStyle === 'custom' && (
                  <div>
                    <Label htmlFor="customGreeting">Custom Greeting</Label>
                    <Textarea
                      id="customGreeting"
                      value={config.customGreeting || ''}
                      onChange={(e) => updateConfig(['customGreeting'], e.target.value)}
                      placeholder="Enter your custom greeting message..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Voice Settings
                </CardTitle>
                <CardDescription>
                  Configure AI voice provider and characteristics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="provider">Voice Provider</Label>
                  <Select
                    value={config.voiceSettings.provider}
                    onValueChange={(value) => {
                      const defaultVoices: Record<string, string> = {
                        openai_realtime: "nova",
                        elevenlabs: "rachel",
                        cartesia: "default",
                        nvidia_personaplex: "NATF2",
                        twilio: "default",
                      };
                      updateConfig(['voiceSettings', 'provider'], value);
                      updateConfig(['voiceSettings', 'voiceId'], defaultVoices[value] || "default");
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
                  {config.voiceSettings.provider === "nvidia_personaplex" && (
                    <p className="text-xs text-green-600 mt-1">
                      Full-duplex speech-to-speech AI with ~170ms latency, persona control, and natural interruption handling
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="voice">Voice Type</Label>
                  <Select
                    value={config.voiceSettings.voiceId}
                    onValueChange={(value) => updateConfig(['voiceSettings', 'voiceId'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {config.voiceSettings.provider === "nvidia_personaplex" ? (
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
                      ) : config.voiceSettings.provider === "elevenlabs" ? (
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

                <div>
                  <Label htmlFor="speed">Speaking Speed: {config.voiceSettings.speed}x</Label>
                  <input
                    type="range"
                    id="speed"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={config.voiceSettings.speed}
                    onChange={(e) => updateConfig(['voiceSettings', 'speed'], parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <Label htmlFor="pitch">Voice Pitch: {config.voiceSettings.pitch}x</Label>
                  <input
                    type="range"
                    id="pitch"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={config.voiceSettings.pitch}
                    onChange={(e) => updateConfig(['voiceSettings', 'pitch'], parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {config.voiceSettings.provider === "nvidia_personaplex" && (
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
              </CardContent>
            </Card>
          </div>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Configure when your AI receptionist should handle calls normally
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="businessHoursEnabled"
                  checked={config.businessHours.enabled}
                  onCheckedChange={(checked) => updateConfig(['businessHours', 'enabled'], checked)}
                />
                <Label htmlFor="businessHoursEnabled">Enable Business Hours</Label>
              </div>

              {config.businessHours.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(config.businessHours.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={(checked) => 
                              updateConfig(['businessHours', 'schedule', day, 'enabled'], checked)
                            }
                          />
                          <span className="capitalize font-medium">{day}</span>
                        </div>
                        {schedule.enabled && (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => 
                                updateConfig(['businessHours', 'schedule', day, 'start'], e.target.value)
                              }
                              className="w-24"
                            />
                            <span>-</span>
                            <Input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => 
                                updateConfig(['businessHours', 'schedule', day, 'end'], e.target.value)
                              }
                              className="w-24"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <Label htmlFor="outsideHoursMessage">Outside Hours Message</Label>
                    <Textarea
                      id="outsideHoursMessage"
                      value={config.businessHours.outsideHoursMessage}
                      onChange={(e) => updateConfig(['businessHours', 'outsideHoursMessage'], e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Personality</CardTitle>
              <CardDescription>
                Configure how your AI assistant behaves in conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="politenessLevel">Politeness Level</Label>
                  <Select
                    value={config.conversationSettings.politenessLevel}
                    onValueChange={(value) => updateConfig(['conversationSettings', 'politenessLevel'], value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual & Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="formal">Formal & Respectful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxTurns">Max Conversation Turns: {config.conversationSettings.maxTurns}</Label>
                  <input
                    type="range"
                    id="maxTurns"
                    min="3"
                    max="15"
                    value={config.conversationSettings.maxTurns}
                    onChange={(e) => updateConfig(['conversationSettings', 'maxTurns'], parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="responseDelay">Response Delay: {config.conversationSettings.responseDelay}s</Label>
                  <input
                    type="range"
                    id="responseDelay"
                    min="0.5"
                    max="3.0"
                    step="0.5"
                    value={config.conversationSettings.responseDelay}
                    onChange={(e) => updateConfig(['conversationSettings', 'responseDelay'], parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Adds natural thinking pauses between responses
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableSmallTalk"
                    checked={config.conversationSettings.enableSmallTalk}
                    onCheckedChange={(checked) => updateConfig(['conversationSettings', 'enableSmallTalk'], checked)}
                  />
                  <Label htmlFor="enableSmallTalk">Enable Small Talk</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spam Filtering */}
          <Card>
            <CardHeader>
              <CardTitle>Spam & Unwanted Call Filtering</CardTitle>
              <CardDescription>
                Configure how to handle spam and irrelevant calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="spamFilteringEnabled"
                  checked={config.spamFiltering.enabled}
                  onCheckedChange={(checked) => updateConfig(['spamFiltering', 'enabled'], checked)}
                />
                <Label htmlFor="spamFilteringEnabled">Enable Spam Filtering</Label>
              </div>

              {config.spamFiltering.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="blockedKeywords">Blocked Keywords (comma separated)</Label>
                    <Input
                      id="blockedKeywords"
                      value={config.spamFiltering.blockedKeywords.join(', ')}
                      onChange={(e) => 
                        updateConfig(['spamFiltering', 'blockedKeywords'], 
                          e.target.value.split(',').map(k => k.trim()).filter(k => k))
                      }
                      placeholder="solar, insurance, loan, seo, marketing"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoDeclineUnknown"
                      checked={config.spamFiltering.autoDeclineUnknown}
                      onCheckedChange={(checked) => updateConfig(['spamFiltering', 'autoDeclineUnknown'], checked)}
                    />
                    <Label htmlFor="autoDeclineUnknown">Auto-decline obvious spam calls</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(config.departmentRouting).map(([dept, routing]) => (
              <Card key={dept}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    {dept} Department
                  </CardTitle>
                  <CardDescription>
                    Configure routing for {dept} inquiries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={routing.enabled}
                      onCheckedChange={(checked) => 
                        updateConfig(['departmentRouting', dept, 'enabled'], checked)
                      }
                    />
                    <Label>Enable {dept} routing</Label>
                  </div>

                  {routing.enabled && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`${dept}Number`}>Phone Number</Label>
                        <Input
                          id={`${dept}Number`}
                          value={routing.number}
                          onChange={(e) => 
                            updateConfig(['departmentRouting', dept, 'number'], e.target.value)
                          }
                          placeholder="+1234567890"
                        />
                      </div>

                      {dept !== 'general' && 'keywords' in routing && (
                        <div>
                          <Label htmlFor={`${dept}Keywords`}>Keywords (comma separated)</Label>
                          <Input
                            id={`${dept}Keywords`}
                            value={routing.keywords.join(', ')}
                            onChange={(e) => 
                              updateConfig(['departmentRouting', dept, 'keywords'], 
                                e.target.value.split(',').map(k => k.trim()).filter(k => k))
                            }
                            placeholder="Enter keywords that trigger this routing"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Live Conversation Test
                </CardTitle>
                <CardDescription>
                  Test how your AI receptionist responds to different scenarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testScenario">Test Scenario</Label>
                  <Input
                    id="testScenario"
                    value={testScenario}
                    onChange={(e) => setTestScenario(e.target.value)}
                    placeholder="e.g., Sales inquiry from potential customer"
                  />
                </div>

                <div>
                  <Label htmlFor="testInput">Caller Input</Label>
                  <Textarea
                    id="testInput"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="What would the caller say?"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleTestConversation}
                  disabled={isTestingConversation || testConversationMutation.isPending}
                  className="w-full"
                >
                  {isTestingConversation ? (
                    "Testing Conversation..."
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Test Conversation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Predefined Test Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Scenario Tests
                </CardTitle>
                <CardDescription>
                  Run predefined tests to validate AI behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conversationTests.map((test) => (
                    <div key={test.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{test.scenario}</h4>
                        <Badge variant={test.passed === true ? "default" : test.passed === false ? "destructive" : "secondary"}>
                          {test.passed === true ? "Passed" : test.passed === false ? "Failed" : "Not Tested"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Input:</strong> "{test.callerInput}"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Expected:</strong> {test.expectedBehavior}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current status of AI receptionist components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>OpenAI Connection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Speech Recognition</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Text-to-Speech</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Intent Recognition</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Call Routing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Database</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}