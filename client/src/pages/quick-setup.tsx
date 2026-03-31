import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Settings,
  Play,
  Pause,
  Edit
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppStoreLayout from "@/components/AppStoreLayout";

interface QuickSetupConfig {
  businessName: string;
  phoneNumber: string;
  assistantName: string;
  greeting: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  notifications: {
    email: string;
    sms: string;
    instantAlerts: boolean;
  };
}

export default function QuickSetupPage() {
  const [config, setConfig] = useState<QuickSetupConfig>({
    businessName: '',
    phoneNumber: '',
    assistantName: 'Maya',
    greeting: '',
    businessHours: {
      enabled: true,
      start: '09:00',
      end: '17:00'
    },
    notifications: {
      email: '',
      sms: '',
      instantAlerts: true
    }
  });

  const [isTestingGreeting, setIsTestingGreeting] = useState(false);
  const { toast } = useToast();

  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ["/api/quick-setup"],
  });

  const saveConfigMutation = useMutation({
    mutationFn: (data: QuickSetupConfig) => apiRequest("/api/quick-setup", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({ title: "Configuration saved successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    }
  });

  const testGreetingMutation = useMutation({
    mutationFn: (greeting: string) => apiRequest("/api/test-greeting", {
      method: "POST",
      body: JSON.stringify({ greeting })
    }),
    onSuccess: () => {
      toast({ title: "Greeting test completed!" });
      setIsTestingGreeting(false);
    },
    onError: () => {
      toast({ title: "Greeting test failed", variant: "destructive" });
      setIsTestingGreeting(false);
    }
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const handleTestGreeting = () => {
    setIsTestingGreeting(true);
    testGreetingMutation.mutate(config.greeting);
  };

  const generateGreeting = () => {
    const greeting = `Hi! Thank you for calling ${config.businessName || 'us'}. I'm ${config.assistantName}, your AI assistant. How may I help you today?`;
    setConfig({ ...config, greeting });
  };

  const setupProgress = [
    { step: 'Business Info', completed: !!(config.businessName && config.phoneNumber) },
    { step: 'AI Assistant', completed: !!(config.assistantName && config.greeting) },
    { step: 'Business Hours', completed: config.businessHours.enabled },
    { step: 'Notifications', completed: !!(config.notifications.email || config.notifications.sms) }
  ];

  const completedSteps = setupProgress.filter(s => s.completed).length;
  const progressPercent = (completedSteps / setupProgress.length) * 100;

  if (isLoading) {
    return (
      <AppStoreLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading setup...</p>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 rounded-3xl shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Quick Setup</h1>
                  <p className="text-gray-600 mt-1 text-lg">
                    Get your AI assistant ready in minutes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{Math.round(progressPercent)}%</div>
                <p className="text-sm text-gray-600">Complete</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {setupProgress.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-600' : 'bg-gray-300'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs text-white font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step.completed ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {step.step}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Business Information
                {config.businessName && config.phoneNumber && (
                  <Badge className="bg-green-100 text-green-800 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={config.businessName}
                  onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                  placeholder="Your Business Name"
                  className="rounded-xl mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="rounded-xl mt-2"
                />
                <p className="text-xs text-gray-600 mt-1">
                  This will be your AI assistant's phone number
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                AI Assistant Setup
                {config.assistantName && config.greeting && (
                  <Badge className="bg-green-100 text-green-800 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assistantName">Assistant Name</Label>
                <Input
                  id="assistantName"
                  value={config.assistantName}
                  onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
                  placeholder="Maya"
                  className="rounded-xl mt-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="greeting">Welcome Greeting</Label>
                  <Button
                    onClick={generateGreeting}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Auto-generate
                  </Button>
                </div>
                <textarea
                  id="greeting"
                  value={config.greeting}
                  onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                  placeholder="Hi! Thank you for calling..."
                  className="w-full p-3 border border-gray-300 rounded-xl resize-none h-20"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-600">
                    What your AI says when answering calls
                  </p>
                  <Button
                    onClick={handleTestGreeting}
                    disabled={!config.greeting || isTestingGreeting}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                  >
                    {isTestingGreeting ? (
                      <><Pause className="w-3 h-3 mr-1" /> Testing...</>
                    ) : (
                      <><Play className="w-3 h-3 mr-1" /> Test</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Business Hours
                {config.businessHours.enabled && (
                  <Badge className="bg-green-100 text-green-800 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Business Hours</p>
                  <p className="text-sm text-gray-600">Different responses during/after hours</p>
                </div>
                <Switch
                  checked={config.businessHours.enabled}
                  onCheckedChange={(checked) => 
                    setConfig({ 
                      ...config, 
                      businessHours: { ...config.businessHours, enabled: checked }
                    })
                  }
                />
              </div>
              
              {config.businessHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={config.businessHours.start}
                      onChange={(e) => 
                        setConfig({ 
                          ...config, 
                          businessHours: { ...config.businessHours, start: e.target.value }
                        })
                      }
                      className="rounded-xl mt-2"
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={config.businessHours.end}
                      onChange={(e) => 
                        setConfig({ 
                          ...config, 
                          businessHours: { ...config.businessHours, end: e.target.value }
                        })
                      }
                      className="rounded-xl mt-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Notifications
                {(config.notifications.email || config.notifications.sms) && (
                  <Badge className="bg-green-100 text-green-800 ml-auto">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.notifications.email}
                  onChange={(e) => 
                    setConfig({ 
                      ...config, 
                      notifications: { ...config.notifications, email: e.target.value }
                    })
                  }
                  placeholder="your@email.com"
                  className="rounded-xl mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="sms">SMS Number</Label>
                <Input
                  id="sms"
                  value={config.notifications.sms}
                  onChange={(e) => 
                    setConfig({ 
                      ...config, 
                      notifications: { ...config.notifications, sms: e.target.value }
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="rounded-xl mt-2"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Instant Alerts</p>
                  <p className="text-sm text-gray-600">Get notified immediately for important calls</p>
                </div>
                <Switch
                  checked={config.notifications.instantAlerts}
                  onCheckedChange={(checked) => 
                    setConfig({ 
                      ...config, 
                      notifications: { ...config.notifications, instantAlerts: checked }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg rounded-2xl"
          >
            {saveConfigMutation.isPending ? 'Saving Configuration...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Status Alert */}
        {completedSteps === setupProgress.length && (
          <Card className="bg-green-50 border-green-200 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Setup Complete!</h3>
                  <p className="text-green-700">
                    Your AI assistant is ready to handle calls. You can always modify these settings later.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {completedSteps < setupProgress.length && (
          <Card className="bg-orange-50 border-orange-200 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">Setup Incomplete</h3>
                  <p className="text-orange-700">
                    Complete all sections above to activate your AI assistant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppStoreLayout>
  );
}