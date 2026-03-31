import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";
import { Link } from "wouter";
import { 
  Settings, 
  Shield, 
  Clock, 
  Database, 
  Server, 
  Bell, 
  Mail, 
  Phone, 
  Globe, 
  Lock,
  Building,
  Calendar,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Activity,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { PushNotificationManager } from "@/components/PushNotificationManager";

interface SystemSettings {
  organization: {
    name: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
  };
  security: {
    sessionTimeout: number;
    passwordPolicy: boolean;
    twoFactorAuth: boolean;
    apiRateLimit: number;
    maxLoginAttempts: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    webhookNotifications: boolean;
    systemAlerts: boolean;
  };
  storage: {
    retentionDays: number;
    autoBackup: boolean;
    backupFrequency: string;
    maxStorageGB: number;
  };
  performance: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    cdnEnabled: boolean;
    logLevel: string;
  };
}

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/system/settings"],
    initialData: {
      organization: {
        name: "AI Call Assistant",
        timezone: "America/New_York",
        dateFormat: "MM/dd/yyyy",
        currency: "USD",
        language: "en"
      },
      security: {
        sessionTimeout: 480,
        passwordPolicy: true,
        twoFactorAuth: false,
        apiRateLimit: 1000,
        maxLoginAttempts: 5
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: true,
        webhookNotifications: false,
        systemAlerts: true
      },
      storage: {
        retentionDays: 90,
        autoBackup: true,
        backupFrequency: "daily",
        maxStorageGB: 100
      },
      performance: {
        cacheEnabled: true,
        compressionEnabled: true,
        cdnEnabled: false,
        logLevel: "info"
      }
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      return await apiRequest("/api/system/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/system/backup", { method: "POST" });
    },
    onSuccess: () => {
      toast({ title: "Backup started successfully" });
    },
    onError: () => {
      toast({ title: "Failed to start backup", variant: "destructive" });
    },
  });

  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  const currentSettings = localSettings || settings;

  const handleSave = () => {
    if (localSettings) {
      updateSettingsMutation.mutate(localSettings);
      setLocalSettings(null);
    }
  };

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    if (!currentSettings) return;
    
    setLocalSettings({
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        [key]: value
      }
    });
  };

  if (isLoading || !currentSettings) {
    return <div>Loading...</div>;
  }

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
              Dashboard
            </Button>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">System Settings</span>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                <p className="text-muted-foreground mt-2">
                  Configure system-wide settings and preferences
                </p>
              </div>
            </div>
            {localSettings && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocalSettings(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          <Tabs defaultValue="organization" className="space-y-4">
            <div className="w-full overflow-x-auto">
              <TabsList className="flex w-max min-w-full justify-start lg:justify-center bg-gray-100 rounded-xl p-1 mb-6">
                <TabsTrigger 
                  value="organization" 
                  className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
                >
                  <Globe className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Organization</span>
                  <span className="sm:hidden">Org</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
                >
                  <Shield className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Security</span>
                  <span className="sm:hidden">Security</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
                >
                  <Bell className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Alerts</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="storage" 
                  className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
                >
                  <Database className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Storage</span>
                  <span className="sm:hidden">Storage</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
                >
                  <Activity className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Performance</span>
                  <span className="sm:hidden">Perf</span>
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="organization" className="space-y-6">
            {/* Organization Identity */}
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-blue-600" />
                  Organization Identity
                </CardTitle>
                <p className="text-sm text-gray-600">Basic organization information and branding</p>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Label htmlFor="orgName" className="text-sm font-medium">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={currentSettings.organization.name}
                    onChange={(e) => updateSetting("organization", "name", e.target.value)}
                    className="mt-1 rounded-xl"
                    placeholder="Enter organization name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regional & Localization Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                    Regional Settings
                  </CardTitle>
                  <p className="text-sm text-gray-600">Time zone and regional preferences</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        value={currentSettings.organization.timezone}
                        onValueChange={(value) => updateSetting("organization", "timezone", value)}
                      >
                        <SelectTrigger className="flex-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = '/timezone-settings'}
                        className="whitespace-nowrap rounded-xl px-3"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Configure</span>
                        <span className="sm:hidden">Setup</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                    <Select 
                      value={currentSettings.organization.language}
                      onValueChange={(value) => updateSetting("organization", "language", value)}
                    >
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                        <SelectItem value="fr">🇫🇷 French</SelectItem>
                        <SelectItem value="de">🇩🇪 German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Format Preferences
                  </CardTitle>
                  <p className="text-sm text-gray-600">Date, time, and currency formatting</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dateFormat" className="text-sm font-medium">Date Format</Label>
                    <Select 
                      value={currentSettings.organization.dateFormat}
                      onValueChange={(value) => updateSetting("organization", "dateFormat", value)}
                    >
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (US)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (EU)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (ISO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                    <Select 
                      value={currentSettings.organization.currency}
                      onValueChange={(value) => updateSetting("organization", "currency", value)}
                    >
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">💵 USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">💶 EUR - Euro</SelectItem>
                        <SelectItem value="GBP">💷 GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">🍁 CAD - Canadian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={currentSettings.security.sessionTimeout}
                      onChange={(e) => updateSetting("security", "sessionTimeout", parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="apiRateLimit">API Rate Limit (requests/hour)</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      value={currentSettings.security.apiRateLimit}
                      onChange={(e) => updateSetting("security", "apiRateLimit", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={currentSettings.security.maxLoginAttempts}
                    onChange={(e) => updateSetting("security", "maxLoginAttempts", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="passwordPolicy">Enforce Strong Password Policy</Label>
                    <Switch
                      id="passwordPolicy"
                      checked={currentSettings.security.passwordPolicy}
                      onCheckedChange={(checked) => updateSetting("security", "passwordPolicy", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                    <Switch
                      id="twoFactorAuth"
                      checked={currentSettings.security.twoFactorAuth}
                      onCheckedChange={(checked) => updateSetting("security", "twoFactorAuth", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={currentSettings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSetting("notifications", "emailNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={currentSettings.notifications.smsNotifications}
                      onCheckedChange={(checked) => updateSetting("notifications", "smsNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <Label htmlFor="webhookNotifications">Webhook Notifications</Label>
                    </div>
                    <Switch
                      id="webhookNotifications"
                      checked={currentSettings.notifications.webhookNotifications}
                      onCheckedChange={(checked) => updateSetting("notifications", "webhookNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <Label htmlFor="systemAlerts">System Alerts</Label>
                    </div>
                    <Switch
                      id="systemAlerts"
                      checked={currentSettings.notifications.systemAlerts}
                      onCheckedChange={(checked) => updateSetting("notifications", "systemAlerts", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <PushNotificationManager />
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage & Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retentionDays">Data Retention (days)</Label>
                    <Input
                      id="retentionDays"
                      type="number"
                      value={currentSettings.storage.retentionDays}
                      onChange={(e) => updateSetting("storage", "retentionDays", parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxStorageGB">Max Storage (GB)</Label>
                    <Input
                      id="maxStorageGB"
                      type="number"
                      value={currentSettings.storage.maxStorageGB}
                      onChange={(e) => updateSetting("storage", "maxStorageGB", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <Select 
                    value={currentSettings.storage.backupFrequency}
                    onValueChange={(value) => updateSetting("storage", "backupFrequency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="autoBackup">Automatic Backup</Label>
                  <Switch
                    id="autoBackup"
                    checked={currentSettings.storage.autoBackup}
                    onCheckedChange={(checked) => updateSetting("storage", "autoBackup", checked)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => backupMutation.mutate()}
                      disabled={backupMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Create Backup Now
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Restore Backup
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="logLevel">Log Level</Label>
                  <Select 
                    value={currentSettings.performance.logLevel}
                    onValueChange={(value) => updateSetting("performance", "logLevel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cacheEnabled">Enable Caching</Label>
                    <Switch
                      id="cacheEnabled"
                      checked={currentSettings.performance.cacheEnabled}
                      onCheckedChange={(checked) => updateSetting("performance", "cacheEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="compressionEnabled">Enable Compression</Label>
                    <Switch
                      id="compressionEnabled"
                      checked={currentSettings.performance.compressionEnabled}
                      onCheckedChange={(checked) => updateSetting("performance", "compressionEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="cdnEnabled">Enable CDN</Label>
                    <Switch
                      id="cdnEnabled"
                      checked={currentSettings.performance.cdnEnabled}
                      onCheckedChange={(checked) => updateSetting("performance", "cdnEnabled", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">45ms</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">2.3GB</div>
                    <div className="text-sm text-muted-foreground">Storage Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">15%</div>
                    <div className="text-sm text-muted-foreground">CPU Usage</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppStoreLayout>
  );
}