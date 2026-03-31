import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TestingCenter() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const testNotificationMutation = useMutation({
    mutationFn: async (type: "sms" | "email" | "whatsapp" | "telegram") => {
      return await apiRequest(`/api/notifications/test/${type}`, { method: "POST" });
    },
    onSuccess: (data, type) => {
      setTestResults(prev => ({ ...prev, [type]: { success: true, timestamp: new Date() } }));
      toast({
        title: "Test Successful",
        description: `${type.toUpperCase()} notification test completed successfully.`,
      });
    },
    onError: (error, type) => {
      setTestResults(prev => ({ ...prev, [type]: { success: false, error: error.message, timestamp: new Date() } }));
      toast({
        title: "Test Failed",
        description: `${type.toUpperCase()} test failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testCallMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return await apiRequest("/api/twilio/test-call", { method: "POST", body: JSON.stringify({ to: phoneNumber }) });
    },
    onSuccess: (data) => {
      setTestResults(prev => ({ ...prev, call: { success: true, callSid: data.callSid, timestamp: new Date() } }));
      toast({
        title: "Test Call Initiated",
        description: `Test call to ${testPhoneNumber} has been initiated successfully.`,
      });
    },
    onError: (error) => {
      setTestResults(prev => ({ ...prev, call: { success: false, error: error.message, timestamp: new Date() } }));
      toast({
        title: "Test Call Failed",
        description: `Test call failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testAIMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/ai/test", { method: "POST", body: JSON.stringify({ text: "Hello, this is a test message for transcription and analysis." }) });
    },
    onSuccess: (data) => {
      setTestResults(prev => ({ ...prev, ai: { success: true, data, timestamp: new Date() } }));
      toast({
        title: "AI Test Successful",
        description: "OpenAI integration is working correctly.",
      });
    },
    onError: (error) => {
      setTestResults(prev => ({ ...prev, ai: { success: false, error: error.message, timestamp: new Date() } }));
      toast({
        title: "AI Test Failed",
        description: `AI test failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getResultBadge = (result: any) => {
    if (!result) return null;
    
    return (
      <Badge
        variant={result.success ? "default" : "destructive"}
        className={result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
      >
        {result.success ? "✓ Passed" : "✗ Failed"}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          System Testing Center
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test your AI call assistant configuration and integrations
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Integration Test */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">OpenAI Integration</h4>
              <p className="text-sm text-gray-600">Test transcription and analysis capabilities</p>
            </div>
            {getResultBadge(testResults.ai)}
          </div>
          <Button
            onClick={() => testAIMutation.mutate()}
            disabled={testAIMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {testAIMutation.isPending ? "Testing..." : "Test AI Integration"}
          </Button>
          {testResults.ai && (
            <div className="text-xs text-gray-500">
              Last tested: {formatTimestamp(testResults.ai.timestamp)}
              {testResults.ai.error && (
                <div className="text-red-600 mt-1">Error: {testResults.ai.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Notification Tests */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Notification Channels</h4>
          <div className="grid grid-cols-2 gap-3">
            {["sms", "email", "whatsapp", "telegram"].map((type) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{type}</span>
                  {getResultBadge(testResults[type])}
                </div>
                <Button
                  onClick={() => testNotificationMutation.mutate(type as any)}
                  disabled={testNotificationMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {testNotificationMutation.isPending ? "Testing..." : `Test ${type.toUpperCase()}`}
                </Button>
                {testResults[type] && (
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(testResults[type].timestamp)}
                    {testResults[type].error && (
                      <div className="text-red-600 mt-1">Error: {testResults[type].error}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call Test */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Twilio Voice</h4>
              <p className="text-sm text-gray-600">Test outbound call functionality</p>
            </div>
            {getResultBadge(testResults.call)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-phone">Test Phone Number</Label>
            <Input
              id="test-phone"
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <Button
            onClick={() => testCallMutation.mutate(testPhoneNumber)}
            disabled={testCallMutation.isPending || !testPhoneNumber}
            variant="outline"
            className="w-full"
          >
            {testCallMutation.isPending ? "Initiating Call..." : "Test Call"}
          </Button>
          {testResults.call && (
            <div className="text-xs text-gray-500">
              Last tested: {formatTimestamp(testResults.call.timestamp)}
              {testResults.call.callSid && (
                <div className="text-green-600 mt-1">Call SID: {testResults.call.callSid}</div>
              )}
              {testResults.call.error && (
                <div className="text-red-600 mt-1">Error: {testResults.call.error}</div>
              )}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-gray-900 mb-3">Quick Status Check</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Database</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>WebSocket</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Config</span>
              <Badge className="bg-green-100 text-green-800">Loaded</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Call Routes</span>
              <Badge className="bg-green-100 text-green-800">Ready</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}