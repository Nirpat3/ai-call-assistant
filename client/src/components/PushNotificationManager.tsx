import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationManager() {
  const { toast } = useToast();
  const {
    isSupported,
    subscription,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification
  } = usePushNotifications();

  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const handleEnableNotifications = async () => {
    try {
      await subscribe();
      toast({
        title: "Push Notifications Enabled",
        description: "You'll now receive notifications when the app is closed.",
      });
    } catch (error) {
      toast({
        title: "Failed to Enable Notifications",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe();
      toast({
        title: "Push Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      toast({
        title: "Failed to Disable Notifications",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await testNotification(
        'Test Notification',
        'This is a test push notification from AI Call Assistant'
      );
      toast({
        title: "Test Notification Sent",
        description: "Check your device for the test notification.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellOff className="h-5 w-5" />
            <span>Push Notifications</span>
            <Badge variant="secondary">Not Supported</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported on this device or browser. Please use a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {subscription ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <span>Mobile Push Notifications</span>
            {subscription && <Badge variant="default">Enabled</Badge>}
            {permission.denied && <Badge variant="destructive">Blocked</Badge>}
          </div>
          <Smartphone className="h-4 w-4 text-gray-400" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Get instant notifications on your iOS or Android device when new calls, voicemails, or important alerts arrive - even when the app is closed.
        </div>

        {permission.denied && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        {subscription && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are active. You'll receive alerts for:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>New incoming calls</li>
                <li>New voicemails</li>
                <li>System alerts and urgent notifications</li>
                <li>Call transfer requests</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {!subscription ? (
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading || permission.denied}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? "Enabling..." : "Enable Push Notifications"}
            </Button>
          ) : (
            <Button 
              onClick={handleDisableNotifications}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              {isLoading ? "Disabling..." : "Disable Notifications"}
            </Button>
          )}

          {subscription && (
            <Button 
              onClick={handleTestNotification}
              disabled={isTestingNotification}
              variant="secondary"
            >
              <Settings className="h-4 w-4 mr-2" />
              {isTestingNotification ? "Sending..." : "Test"}
            </Button>
          )}
        </div>

        {subscription && (
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
            <strong>Device registered:</strong> {subscription.endpoint.substring(0, 50)}...
          </div>
        )}
      </CardContent>
    </Card>
  );
}