import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import AppStoreLayout from "@/components/AppStoreLayout";
import { Clock, Globe, Save, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TimezoneSettings() {
  const [timezone, setTimezone] = useState("America/New_York");
  const [autoDetect, setAutoDetect] = useState(true);
  const [use24Hour, setUse24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(false);
  const { toast } = useToast();

  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "Mumbai (IST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" }
  ];

  const handleSave = () => {
    // Here you would save to backend API
    toast({
      title: "Settings Saved",
      description: "Timezone settings have been updated successfully."
    });
  };

  const getCurrentTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour12: !use24Hour,
      hour: "2-digit",
      minute: "2-digit",
      ...(showSeconds && { second: "2-digit" })
    };
    return now.toLocaleTimeString("en-US", options);
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    };
    return now.toLocaleDateString("en-US", options);
  };

  return (
    <AppStoreLayout>
      <div className="flex-1 space-y-6 p-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timezone Settings</h1>
            <p className="text-muted-foreground">Configure timezone and time display preferences</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Time Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Time
              </CardTitle>
              <CardDescription>Preview of current time in selected timezone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold">{getCurrentTime()}</div>
                <div className="text-lg text-muted-foreground">{getCurrentDate()}</div>
                <div className="text-sm text-muted-foreground">
                  {timezones.find(tz => tz.value === timezone)?.label}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timezone Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Timezone Configuration
              </CardTitle>
              <CardDescription>Set your preferred timezone for the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-detect">Auto-detect timezone</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-detect"
                    checked={autoDetect}
                    onCheckedChange={setAutoDetect}
                  />
                  <Label htmlFor="auto-detect" className="text-sm text-muted-foreground">
                    Automatically detect timezone from browser
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={autoDetect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Time Display Preferences
            </CardTitle>
            <CardDescription>Customize how time is displayed throughout the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="24-hour">24-hour format</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="24-hour"
                    checked={use24Hour}
                    onCheckedChange={setUse24Hour}
                  />
                  <Label htmlFor="24-hour" className="text-sm text-muted-foreground">
                    Use 24-hour time format (e.g., 14:30 instead of 2:30 PM)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="show-seconds">Show seconds</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-seconds"
                    checked={showSeconds}
                    onCheckedChange={setShowSeconds}
                  />
                  <Label htmlFor="show-seconds" className="text-sm text-muted-foreground">
                    Display seconds in time stamps
                  </Label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours Impact</CardTitle>
            <CardDescription>How timezone changes affect your business hours and call routing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Call Routing</Label>
                  <p className="text-sm text-muted-foreground">
                    Business hours for call routing will be calculated based on your selected timezone
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    All reports and analytics will display times in your selected timezone
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Scheduled notifications will be sent according to your timezone
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppStoreLayout>
  );
}