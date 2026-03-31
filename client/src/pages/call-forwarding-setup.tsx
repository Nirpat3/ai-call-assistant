import { useState } from "react";
import { PhoneForwarded, Copy, Check, Phone, Settings2, AlertCircle, CheckCircle, Edit3, ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CallForwardingSetupPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState(false);
  const [forwardingConfig, setForwardingConfig] = useState({
    method: 'direct',
    businessNumber: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current Twilio configuration
  const { data: twilioConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/twilio/config'],
  });

  // Fetch call forwarding status
  const { data: forwardingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/call-forwarding/status'],
  });

  const updateForwardingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/call-forwarding/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-forwarding/status'] });
      toast({
        title: "Settings Updated",
        description: "Call forwarding configuration has been saved.",
      });
      setEditingConfig(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save forwarding settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testForwardingMutation = useMutation({
    mutationFn: (phoneNumber: string) => apiRequest('/api/call-forwarding/test', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),
    onSuccess: () => {
      toast({
        title: "Test Call Initiated",
        description: "A test call has been placed to verify your forwarding setup.",
      });
    },
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: "Phone number copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSaveConfig = () => {
    updateForwardingMutation.mutate(forwardingConfig);
  };

  if (configLoading || statusLoading) {
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
        <span className="text-foreground font-medium">Call Forwarding</span>
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
          <PhoneForwarded className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Call Forwarding Setup</h1>
            <p className="text-muted-foreground">
              Manage how calls are routed to your AI assistant
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Current Configuration
          </CardTitle>
          <CardDescription>
            Your call forwarding is active and working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">AI Assistant Phone Number</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted px-3 py-2 rounded font-mono text-lg">
                  {twilioConfig?.phoneNumber || '+1 (727) 436-2999'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(twilioConfig?.phoneNumber || '+1 (727) 436-2999', 'twilio')}
                >
                  {copiedField === 'twilio' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Calls forwarding to AI assistant
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forwarding Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Option 1: Direct Use */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Option 1: Direct Use
            </CardTitle>
            <CardDescription>
              Give customers your AI assistant number directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                <span className="text-sm">Update business listings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                <span className="text-sm">Update website contact info</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                <span className="text-sm">AI answers automatically</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option 2: Forward from Business Number */}
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <PhoneForwarded className="h-5 w-5" />
              Option 2: Forward Calls
            </CardTitle>
            <CardDescription>
              Keep your current number, forward to AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                <span className="text-sm">Contact your carrier</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                <span className="text-sm">Set up call forwarding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                <span className="text-sm">Test the forwarding</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Carrier Instructions
          </CardTitle>
          <CardDescription>
            Use these dial codes or contact your provider directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 border rounded">
                <div className="font-medium">Verizon</div>
                <div className="text-sm text-muted-foreground">
                  Dial: <code className="bg-muted px-1 rounded">*72{twilioConfig?.phoneNumber}</code>
                </div>
                <div className="text-sm text-muted-foreground">Or call: 611</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">AT&T</div>
                <div className="text-sm text-muted-foreground">
                  Dial: <code className="bg-muted px-1 rounded">*21*{twilioConfig?.phoneNumber}#</code>
                </div>
                <div className="text-sm text-muted-foreground">Or call: 611</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 border rounded">
                <div className="font-medium">T-Mobile</div>
                <div className="text-sm text-muted-foreground">
                  Dial: <code className="bg-muted px-1 rounded">**21*{twilioConfig?.phoneNumber}#</code>
                </div>
                <div className="text-sm text-muted-foreground">Or call: 611</div>
              </div>
              <div className="p-3 border rounded">
                <div className="font-medium">Office/VoIP</div>
                <div className="text-sm text-muted-foreground">
                  Contact your IT department
                </div>
                <div className="text-sm text-muted-foreground">Or system administrator</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Number Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Business Number Configuration
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingConfig(!editingConfig)}
            >
              {editingConfig ? 'Cancel' : 'Edit'}
            </Button>
          </CardTitle>
          <CardDescription>
            Track which business number forwards to your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingConfig ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessNumber">Business Phone Number</Label>
                <Input
                  id="businessNumber"
                  placeholder="e.g., +1 (555) 123-4567"
                  value={forwardingConfig.businessNumber}
                  onChange={(e) => setForwardingConfig({
                    ...forwardingConfig,
                    businessNumber: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Setup Notes</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Configured with Verizon on 2024-01-15"
                  value={forwardingConfig.notes}
                  onChange={(e) => setForwardingConfig({
                    ...forwardingConfig,
                    notes: e.target.value
                  })}
                />
              </div>
              <Button 
                onClick={handleSaveConfig}
                disabled={updateForwardingMutation.isPending}
              >
                {updateForwardingMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Business Number</Label>
                <p className="text-muted-foreground">
                  {forwardingConfig.businessNumber || 'Not configured'}
                </p>
              </div>
              {forwardingConfig.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-muted-foreground">{forwardingConfig.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Call */}
      <Card>
        <CardHeader>
          <CardTitle>Test Your Setup</CardTitle>
          <CardDescription>
            Make a test call to verify everything is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Call your business number from your personal phone to test the forwarding and AI response.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              onClick={() => testForwardingMutation.mutate(twilioConfig?.phoneNumber || '')}
              disabled={testForwardingMutation.isPending}
            >
              {testForwardingMutation.isPending ? 'Testing...' : 'Test AI Number'}
            </Button>
            <Button variant="outline">
              View Call Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}