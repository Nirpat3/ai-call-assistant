import { useState, useEffect } from "react";
import { Bot, Brain, MessageSquare, Settings2, Save, Edit3, Volume2, Zap, Clock, Calendar, X, ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Business Hours and Holiday interfaces
interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface Holiday {
  name: string;
  date: string;
  isClosed: boolean;
}

export default function AIAssistantConfigPage() {
  const [editingBasics, setEditingBasics] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState(false);
  const [editingVoice, setEditingVoice] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [basicConfig, setBasicConfig] = useState({
    businessName: '',
    businessDescription: '',
    services: '',
    businessHours: ''
  });
  const [behaviorConfig, setBehaviorConfig] = useState({
    personality: 'professional',
    responseStyle: 'helpful',
    maxConversationLength: 10,
    transferThreshold: 3,
    handleEmergencies: true,
    collectInfo: true
  });
  const [voiceConfig, setVoiceConfig] = useState({
    voiceProvider: 'openai_realtime',
    voicePersonality: 'professional',
    speechPace: 'normal',
    emotionalAdaptation: true,
    accent: 'neutral'
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
  });
  const [holidays, setHolidays] = useState<Holiday[]>([
    { name: "New Year's Day", date: "2025-01-01", isClosed: true },
    { name: "Martin Luther King Jr. Day", date: "2025-01-20", isClosed: false },
    { name: "Presidents' Day", date: "2025-02-17", isClosed: false },
    { name: "Memorial Day", date: "2025-05-26", isClosed: true },
    { name: "Juneteenth", date: "2025-06-19", isClosed: false },
    { name: "Independence Day", date: "2025-07-04", isClosed: true },
    { name: "Labor Day", date: "2025-09-01", isClosed: true },
    { name: "Columbus Day", date: "2025-10-13", isClosed: false },
    { name: "Veterans Day", date: "2025-11-11", isClosed: false },
    { name: "Thanksgiving", date: "2025-11-27", isClosed: true },
    { name: "Christmas Eve", date: "2025-12-24", isClosed: true },
    { name: "Christmas Day", date: "2025-12-25", isClosed: true },
    { name: "New Year's Eve", date: "2025-12-31", isClosed: false }
  ]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current AI configuration
  const { data: aiConfig, isLoading } = useQuery<any>({
    queryKey: ['/api/ai-config'],
  });

  // Initialize form data when aiConfig loads
  useEffect(() => {
    if (aiConfig && typeof aiConfig === 'object') {
      setBasicConfig({
        businessName: (aiConfig as any).businessName || '',
        businessDescription: (aiConfig as any).businessDescription || '',
        services: (aiConfig as any).services || '',
        businessHours: (aiConfig as any).businessHours || ''
      });
      setBehaviorConfig({
        personality: (aiConfig as any).personality || 'professional',
        responseStyle: (aiConfig as any).responseStyle || 'helpful',
        maxConversationLength: (aiConfig as any).maxConversationLength || 10,
        transferThreshold: (aiConfig as any).transferThreshold || 3,
        handleEmergencies: (aiConfig as any).handleEmergencies ?? true,
        collectInfo: (aiConfig as any).collectInfo ?? true
      });
      setVoiceConfig({
        voiceProvider: (aiConfig as any).voiceProvider || 'openai_realtime',
        voicePersonality: (aiConfig as any).voicePersonality || 'professional',
        speechPace: (aiConfig as any).speechPace || 'normal',
        emotionalAdaptation: (aiConfig as any).emotionalAdaptation ?? true,
        accent: (aiConfig as any).accent || 'neutral'
      });
      if ((aiConfig as any).businessHoursSchedule) {
        setBusinessHours((aiConfig as any).businessHoursSchedule);
      }
      if ((aiConfig as any).holidaySchedule) {
        setHolidays((aiConfig as any).holidaySchedule);
      }
    }
  }, [aiConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/ai-config/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-config'] });
      toast({
        title: "Configuration Updated",
        description: "AI assistant settings have been saved.",
      });
      setEditingBasics(false);
      setEditingBehavior(false);
      setEditingVoice(false);
      setEditingHours(false);
    },
  });

  const testAIMutation = useMutation({
    mutationFn: (scenario: string) => apiRequest('/api/ai-config/test', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),
    onSuccess: () => {
      toast({
        title: "Test Completed",
        description: "AI response test has been processed.",
      });
    },
  });

  const handleSaveBasics = () => {
    updateConfigMutation.mutate({ section: 'basics', config: basicConfig });
  };

  const handleSaveBehavior = () => {
    updateConfigMutation.mutate({ section: 'behavior', config: behaviorConfig });
  };

  const handleSaveVoice = () => {
    updateConfigMutation.mutate({ section: 'voice', config: voiceConfig });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/personal-assistant">
          <Button variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
            Personal Assistant
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">AI Configuration</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/personal-assistant">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold">AI Assistant Configuration</h1>
            <p className="text-muted-foreground">
              Customize your AI assistant's behavior and responses
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            AI Assistant Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                Active
              </Badge>
              <p className="text-sm text-muted-foreground">AI is answering calls</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 mb-2">
                Trained
              </Badge>
              <p className="text-sm text-muted-foreground">Business knowledge loaded</p>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 mb-2">
                Smart
              </Badge>
              <p className="text-sm text-muted-foreground">Learning from interactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Business Information
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingBasics(!editingBasics)}
            >
              {editingBasics ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
          <CardDescription>
            Core information the AI uses to represent your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingBasics ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Company Name"
                  value={basicConfig.businessName}
                  onChange={(e) => setBasicConfig({
                    ...basicConfig,
                    businessName: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Brief description of what your business does..."
                  value={basicConfig.businessDescription}
                  onChange={(e) => setBasicConfig({
                    ...basicConfig,
                    businessDescription: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="services">Main Services</Label>
                <Textarea
                  id="services"
                  placeholder="List your main services or products..."
                  value={basicConfig.services}
                  onChange={(e) => setBasicConfig({
                    ...basicConfig,
                    services: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="businessHours">Business Hours</Label>
                <Input
                  id="businessHours"
                  placeholder="e.g., Monday-Friday 9AM-5PM EST"
                  value={basicConfig.businessHours}
                  onChange={(e) => setBasicConfig({
                    ...basicConfig,
                    businessHours: e.target.value
                  })}
                />
              </div>
              <Button onClick={handleSaveBasics} disabled={updateConfigMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Business Info'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Business Name</Label>
                <p className="text-muted-foreground">
                  {aiConfig?.businessName || basicConfig.businessName || 'Not configured'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-muted-foreground">
                  {aiConfig?.businessDescription || basicConfig.businessDescription || 'Not configured'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Services</Label>
                <p className="text-muted-foreground">
                  {aiConfig?.services || basicConfig.services || 'Not configured'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Business Hours</Label>
                <p className="text-muted-foreground">
                  {aiConfig?.businessHours || basicConfig.businessHours || 'Not configured'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Behavior & Responses
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingBehavior(!editingBehavior)}
            >
              {editingBehavior ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
          <CardDescription>
            Control how the AI interacts with callers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingBehavior ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personality">Personality Style</Label>
                  <Select
                    value={behaviorConfig.personality}
                    onValueChange={(value) => setBehaviorConfig({
                      ...behaviorConfig,
                      personality: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="responseStyle">Response Style</Label>
                  <Select
                    value={behaviorConfig.responseStyle}
                    onValueChange={(value) => setBehaviorConfig({
                      ...behaviorConfig,
                      responseStyle: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="helpful">Helpful</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxLength">Max Conversation Turns</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    min="3"
                    max="20"
                    value={behaviorConfig.maxConversationLength}
                    onChange={(e) => setBehaviorConfig({
                      ...behaviorConfig,
                      maxConversationLength: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="transferThreshold">Transfer After (failed attempts)</Label>
                  <Input
                    id="transferThreshold"
                    type="number"
                    min="1"
                    max="10"
                    value={behaviorConfig.transferThreshold}
                    onChange={(e) => setBehaviorConfig({
                      ...behaviorConfig,
                      transferThreshold: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Handle Emergency Calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and prioritize urgent situations
                    </p>
                  </div>
                  <Switch
                    checked={behaviorConfig.handleEmergencies}
                    onCheckedChange={(checked) => setBehaviorConfig({
                      ...behaviorConfig,
                      handleEmergencies: checked
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Collect Caller Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Ask for contact details when appropriate
                    </p>
                  </div>
                  <Switch
                    checked={behaviorConfig.collectInfo}
                    onCheckedChange={(checked) => setBehaviorConfig({
                      ...behaviorConfig,
                      collectInfo: checked
                    })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveBehavior} disabled={updateConfigMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Behavior Settings'}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Personality</Label>
                <p className="text-muted-foreground capitalize">
                  {behaviorConfig.personality}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Response Style</Label>
                <p className="text-muted-foreground capitalize">
                  {behaviorConfig.responseStyle}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Max Conversation</Label>
                <p className="text-muted-foreground">
                  {behaviorConfig.maxConversationLength} turns
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Transfer Threshold</Label>
                <p className="text-muted-foreground">
                  After {behaviorConfig.transferThreshold} failed attempts
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice & Speech Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice & Speech Settings
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingVoice(!editingVoice)}
            >
              {editingVoice ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
          <CardDescription>
            Customize how the AI sounds when speaking to callers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingVoice ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="voiceProvider">Voice Provider</Label>
                <Select
                  value={voiceConfig.voiceProvider}
                  onValueChange={(value) => setVoiceConfig({
                    ...voiceConfig,
                    voiceProvider: value
                  })}
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
                {voiceConfig.voiceProvider === "nvidia_personaplex" && (
                  <p className="text-xs text-green-600 mt-1">
                    Full-duplex speech-to-speech with ~170ms latency, natural interruptions, and persona control
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voicePersonality">Voice Personality</Label>
                  <Select
                    value={voiceConfig.voicePersonality}
                    onValueChange={(value) => setVoiceConfig({
                      ...voiceConfig,
                      voicePersonality: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="speechPace">Speech Pace</Label>
                  <Select
                    value={voiceConfig.speechPace}
                    onValueChange={(value) => setVoiceConfig({
                      ...voiceConfig,
                      speechPace: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="accent">Accent</Label>
                <Select
                  value={voiceConfig.accent}
                  onValueChange={(value) => setVoiceConfig({
                    ...voiceConfig,
                    accent: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral American</SelectItem>
                    <SelectItem value="southern">Southern American</SelectItem>
                    <SelectItem value="british">British</SelectItem>
                    <SelectItem value="australian">Australian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Emotional Adaptation</Label>
                  <p className="text-sm text-muted-foreground">
                    Adapt tone based on caller's emotional state
                  </p>
                </div>
                <Switch
                  checked={voiceConfig.emotionalAdaptation}
                  onCheckedChange={(checked) => setVoiceConfig({
                    ...voiceConfig,
                    emotionalAdaptation: checked
                  })}
                />
              </div>

              <Button onClick={handleSaveVoice} disabled={updateConfigMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Voice Settings'}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Voice Provider</Label>
                <p className="text-muted-foreground">
                  {{
                    openai_realtime: "OpenAI Realtime",
                    elevenlabs: "ElevenLabs",
                    cartesia: "Cartesia",
                    nvidia_personaplex: "NVIDIA PersonaPlex",
                    twilio: "Twilio",
                  }[voiceConfig.voiceProvider] || voiceConfig.voiceProvider}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Voice Personality</Label>
                <p className="text-muted-foreground capitalize">
                  {voiceConfig.voicePersonality}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Speech Pace</Label>
                <p className="text-muted-foreground capitalize">
                  {voiceConfig.speechPace}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Accent</Label>
                <p className="text-muted-foreground">
                  {voiceConfig.accent.replace('_', ' ')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Emotional Adaptation</Label>
                <p className="text-muted-foreground">
                  {voiceConfig.emotionalAdaptation ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Configure your business operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!editingHours ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {Object.entries(businessHours).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-20 font-medium capitalize">{day}</div>
                      <Badge variant={schedule.isOpen ? "default" : "secondary"}>
                        {schedule.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    {schedule.isOpen && (
                      <div className="text-sm text-gray-600">
                        {schedule.openTime} - {schedule.closeTime}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setEditingHours(true)}
                className="w-full"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Business Hours
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {Object.entries(businessHours).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-20 font-medium capitalize">{day}</div>
                      <Switch
                        checked={schedule.isOpen}
                        onCheckedChange={(checked) => {
                          setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof BusinessHours], isOpen: checked }
                          }));
                        }}
                      />
                    </div>
                    {schedule.isOpen && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={schedule.openTime}
                          onChange={(e) => {
                            setBusinessHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof BusinessHours], openTime: e.target.value }
                            }));
                          }}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <Input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) => {
                            setBusinessHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof BusinessHours], closeTime: e.target.value }
                            }));
                          }}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    updateConfigMutation.mutate({
                      type: 'businessHours',
                      data: businessHours
                    });
                    setEditingHours(false);
                  }}
                  disabled={updateConfigMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Hours
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingHours(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holiday Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Holiday Schedule - 2025
          </CardTitle>
          <CardDescription>
            Configure which holidays your business will be closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {holidays.map((holiday, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={holiday.isClosed}
                    onCheckedChange={(checked) => {
                      setHolidays(prev => prev.map((h, i) => 
                        i === index ? { ...h, isClosed: Boolean(checked) } : h
                      ));
                    }}
                  />
                  <div>
                    <div className="font-medium">{holiday.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <Badge variant={holiday.isClosed ? "destructive" : "outline"}>
                  {holiday.isClosed ? "Closed" : "Open"}
                </Badge>
              </div>
            ))}
          </div>
          <Button
            onClick={() => {
              updateConfigMutation.mutate({
                type: 'holidays',
                data: holidays
              });
            }}
            disabled={updateConfigMutation.isPending}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Holiday Schedule
          </Button>
        </CardContent>
      </Card>

      {/* Test AI Response */}
      <Card>
        <CardHeader>
          <CardTitle>Test AI Responses</CardTitle>
          <CardDescription>
            Test how your AI assistant responds to different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => testAIMutation.mutate('general_inquiry')}
              disabled={testAIMutation.isPending}
            >
              Test General Inquiry
            </Button>
            <Button
              variant="outline"
              onClick={() => testAIMutation.mutate('service_request')}
              disabled={testAIMutation.isPending}
            >
              Test Service Request
            </Button>
            <Button
              variant="outline"
              onClick={() => testAIMutation.mutate('complaint')}
              disabled={testAIMutation.isPending}
            >
              Test Complaint Handling
            </Button>
            <Button
              variant="outline"
              onClick={() => testAIMutation.mutate('emergency')}
              disabled={testAIMutation.isPending}
            >
              Test Emergency Call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}