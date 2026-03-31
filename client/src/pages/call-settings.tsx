import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Phone, Clock, MessageSquare, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    enabled: boolean;
  };
}

interface PhoneTreeOption {
  key: string;
  label: string;
  action: string;
  destination?: string;
}

interface AiConfig {
  id: number;
  greeting: string;
  businessHours: BusinessHours;
  isAlwaysOpen: boolean;
  phoneTree: {
    enabled: boolean;
    options: PhoneTreeOption[];
  };
  enableContactPassthrough: boolean;
  phoneNumber?: string;
}

export default function CallSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiConfig, isLoading } = useQuery<AiConfig>({
    queryKey: ["/api/ai-config"],
  });

  const [greeting, setGreeting] = useState("");
  const [isAlwaysOpen, setIsAlwaysOpen] = useState(false);
  const [enablePhoneTree, setEnablePhoneTree] = useState(true);
  const [enableContactPassthrough, setEnableContactPassthrough] = useState(true);
  const [phoneTreeOptions, setPhoneTreeOptions] = useState<PhoneTreeOption[]>([
    {
      key: "1",
      label: "Sales",
      action: "route",
      destination: "+14045901101"
    },
    {
      key: "2", 
      label: "Support",
      action: "route",
      destination: "+18887274302"
    },
    {
      key: "0",
      label: "AI Assistant",
      action: "ai"
    }
  ]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});

  // Initialize form data when config loads
  useState(() => {
    if (aiConfig) {
      setGreeting(aiConfig.greeting);
      setIsAlwaysOpen(aiConfig.isAlwaysOpen);
      setEnablePhoneTree(aiConfig.phoneTree?.enabled || false);
      setEnableContactPassthrough(aiConfig.enableContactPassthrough);
      setPhoneTreeOptions(aiConfig.phoneTree?.options || [
        {
          key: "1",
          label: "Sales",
          action: "route",
          destination: "+14045901101"
        },
        {
          key: "2", 
          label: "Support",
          action: "route",
          destination: "+18887274302"
        },
        {
          key: "0",
          label: "AI Assistant",
          action: "ai"
        }
      ]);
      setBusinessHours(aiConfig.businessHours);
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<AiConfig>) => {
      return await apiRequest("/api/ai-config", {
        method: "POST",
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-config"] });
      toast({
        title: "Settings updated",
        description: "Your call routing configuration has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      greeting,
      isAlwaysOpen,
      phoneTree: {
        enabled: enablePhoneTree,
        options: phoneTreeOptions,
      },
      businessHours,
      enableContactPassthrough,
    });
  };

  const addPhoneTreeOption = () => {
    const newOption: PhoneTreeOption = {
      key: (phoneTreeOptions.length + 1).toString(),
      label: "",
      action: "route",
      destination: "",
    };
    setPhoneTreeOptions([...phoneTreeOptions, newOption]);
  };

  const updatePhoneTreeOption = (index: number, field: keyof PhoneTreeOption, value: string) => {
    const updated = [...phoneTreeOptions];
    updated[index] = { ...updated[index], [field]: value };
    setPhoneTreeOptions(updated);
  };

  const removePhoneTreeOption = (index: number) => {
    setPhoneTreeOptions(phoneTreeOptions.filter((_, i) => i !== index));
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'enabled', value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Call Settings</h1>
            <p className="text-muted-foreground">Configure AI greetings, routing, and business hours</p>
          </div>
          <Button onClick={handleSave} disabled={updateConfigMutation.isPending} className="w-full sm:w-auto">
            {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="phone-setup" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10 p-1 bg-muted">
            <TabsTrigger value="phone-setup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Phone Setup</span>
              <span className="sm:hidden">Setup</span>
            </TabsTrigger>
            <TabsTrigger value="phone-tree" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Phone Tree</span>
              <span className="sm:hidden">Tree</span>
            </TabsTrigger>
            <TabsTrigger value="business-hours" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Business Hours</span>
              <span className="sm:hidden">Hours</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Contacts</span>
              <span className="sm:hidden">Contacts</span>
            </TabsTrigger>
          </TabsList>



        <TabsContent value="phone-setup">
          <Card>
            <CardHeader>
              <CardTitle>Phone Configuration</CardTitle>
              <CardDescription>
                Configure your Twilio phone number and webhook settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Twilio Phone Number</Label>
                  <Input
                    id="phone-number"
                    value={aiConfig?.phoneNumber || "+17274362999"}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Your registered Twilio phone number
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-medium mb-2">Webhook Configuration</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure these URLs in your Twilio Console:
                  </p>
                  <div className="space-y-2 text-sm font-mono">
                    <div>
                      <strong>Voice Webhook:</strong><br />
                      <code className="bg-white px-2 py-1 rounded text-xs">
                        https://your-project-name.your-username.replit.app/api/twilio/incoming
                      </code>
                    </div>
                    <div>
                      <strong>Gather Webhook:</strong><br />
                      <code className="bg-white px-2 py-1 rounded text-xs">
                        https://your-project-name.your-username.replit.app/api/twilio/gather
                      </code>
                    </div>
                    <div>
                      <strong>Recording Webhook:</strong><br />
                      <code className="bg-white px-2 py-1 rounded text-xs">
                        https://your-project-name.your-username.replit.app/api/twilio/recording
                      </code>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Replace with your actual Replit domain after deployment
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Enhanced Call Routing Configuration</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <span className="text-sm font-medium">Press 1: Sales Department</span>
                        <p className="text-xs text-gray-600">Routes to: +1 (404) 590-1101</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <span className="text-sm font-medium">Press 2: Support Department</span>
                        <p className="text-xs text-gray-600">Routes to: +1 (888) 727-4302</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium">Press 3: Voicemail</span>
                        <p className="text-xs text-gray-600">Records message for callback</p>
                      </div>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <div>
                        <span className="text-sm font-medium">Press 0: AI Assistant</span>
                        <p className="text-xs text-gray-600">Continues with intelligent conversation</p>
                      </div>
                      <Badge variant="secondary">Default</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone-tree">
          <Card>
            <CardHeader>
              <CardTitle>Phone Tree Configuration</CardTitle>
              <CardDescription>
                Set up routing options for callers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-phone-tree"
                  checked={enablePhoneTree}
                  onCheckedChange={setEnablePhoneTree}
                />
                <Label htmlFor="enable-phone-tree">Enable Phone Tree</Label>
              </div>

              {enablePhoneTree && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Phone Tree Options</h3>
                    <Button onClick={addPhoneTreeOption} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {phoneTreeOptions.map((option, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Key</Label>
                            <Input
                              value={option.key}
                              onChange={(e) => updatePhoneTreeOption(index, 'key', e.target.value)}
                              placeholder="1"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Label</Label>
                            <Input
                              value={option.label}
                              onChange={(e) => updatePhoneTreeOption(index, 'label', e.target.value)}
                              placeholder="Sales"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Action</Label>
                            <select
                              value={option.action}
                              onChange={(e) => updatePhoneTreeOption(index, 'action', e.target.value)}
                              className="w-full p-2 border rounded-md text-sm bg-background"
                            >
                              <option value="route">Route to Number</option>
                              <option value="ai">AI Assistant</option>
                              <option value="voicemail">Voicemail</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            {option.action === 'route' && (
                              <div>
                                <Label className="text-sm font-medium">Phone Number</Label>
                                <Input
                                  value={option.destination || ''}
                                  onChange={(e) => updatePhoneTreeOption(index, 'destination', e.target.value)}
                                  placeholder="+1234567890"
                                  className="w-full"
                                />
                              </div>
                            )}
                            <div className="flex justify-end pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePhoneTreeOption(index)}
                                className="w-full sm:w-auto"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-hours">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Configure when your business is open for calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="always-open"
                  checked={isAlwaysOpen}
                  onCheckedChange={setIsAlwaysOpen}
                />
                <Label htmlFor="always-open">24/7 Service</Label>
              </div>

              {!isAlwaysOpen && (
                <div className="space-y-3">
                  {days.map((day) => (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-20 sm:w-24">
                          <Label className="capitalize text-sm font-medium">{day}</Label>
                        </div>
                        <Switch
                          checked={businessHours[day]?.enabled || false}
                          onCheckedChange={(checked) => updateBusinessHours(day, 'enabled', checked)}
                        />
                      </div>
                      {businessHours[day]?.enabled && (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-1 sm:flex-none">
                            <Input
                              type="time"
                              value={businessHours[day]?.open || '09:00'}
                              onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                              className="w-full sm:w-auto"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">to</span>
                          <div className="flex-1 sm:flex-none">
                            <Input
                              type="time"
                              value={businessHours[day]?.close || '17:00'}
                              onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                              className="w-full sm:w-auto"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                Configure how contacts are handled during calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-contact-passthrough"
                  checked={enableContactPassthrough}
                  onCheckedChange={setEnableContactPassthrough}
                />
                <Label htmlFor="enable-contact-passthrough">Enable Contact Pass-through</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, known contacts with pass-through settings will bypass AI greeting and connect directly.
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Contact Routing Rules</h3>
                  <Badge variant="outline">
                    Configure in Contacts section
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Set up individual contact routing rules in the Contacts section of the dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppStoreLayout>
  );
}