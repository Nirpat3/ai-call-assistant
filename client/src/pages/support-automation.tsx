import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Bot, User, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutomationResult {
  response: string;
  actions: string[];
  shouldEscalate: boolean;
  escalationReason?: string;
  nextSteps: string[];
}

export default function SupportAutomation() {
  const [callData, setCallData] = useState({
    callSid: `call_${Date.now()}`,
    callerNumber: "+1234567890",
    callerName: "John Smith",
    userMessage: ""
  });
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessCall = async () => {
    if (!callData.userMessage.trim()) {
      toast({
        title: "Missing Message",
        description: "Please enter a customer message to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/support/process-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callData)
      });

      if (!response.ok) {
        throw new Error('Failed to process call');
      }

      const automationResult = await response.json();
      setResult(automationResult);
      
      toast({
        title: "Call Processed",
        description: "Support automation workflow completed successfully"
      });
    } catch (error) {
      console.error('Error processing call:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process support call",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleScenarios = [
    {
      title: "Technical Issue",
      message: "Hi, my software keeps crashing when I try to open it. I've tried restarting my computer but it's still not working. Can you help me fix this?"
    },
    {
      title: "Urgent Problem",
      message: "This is urgent! Our entire system is down and we can't process any orders. We need immediate help to get this resolved."
    },
    {
      title: "General Question",
      message: "Hello, I'm interested in learning more about your premium features. What additional benefits do they provide?"
    },
    {
      title: "Billing Inquiry",
      message: "I was charged twice this month and I need to get a refund for the duplicate charge. Can someone help me with this billing issue?"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">N8n-Style Support Automation</h1>
        <p className="text-muted-foreground">
          Test AI-powered customer support workflows with knowledge base integration and intelligent escalation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Call Simulation
            </CardTitle>
            <CardDescription>
              Simulate an incoming support call to test the automation workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="callerNumber">Caller Number</Label>
                <Input
                  id="callerNumber"
                  value={callData.callerNumber}
                  onChange={(e) => setCallData(prev => ({ ...prev, callerNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="callerName">Caller Name</Label>
                <Input
                  id="callerName"
                  value={callData.callerName}
                  onChange={(e) => setCallData(prev => ({ ...prev, callerName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="userMessage">Customer Message</Label>
              <Textarea
                id="userMessage"
                placeholder="Enter what the customer is saying..."
                value={callData.userMessage}
                onChange={(e) => setCallData(prev => ({ ...prev, userMessage: e.target.value }))}
                rows={4}
              />
            </div>

            <Button 
              onClick={handleProcessCall} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Bot className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Process Support Call
                </>
              )}
            </Button>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Quick Test Scenarios</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {exampleScenarios.map((scenario, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setCallData(prev => ({ ...prev, userMessage: scenario.message }))}
                    className="text-left justify-start h-auto p-3"
                  >
                    <div>
                      <div className="font-medium">{scenario.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scenario.message.substring(0, 50)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automation Workflow Results
            </CardTitle>
            <CardDescription>
              AI analysis and automated response with escalation decisions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                {/* AI Response */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">AI Generated Response</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{result.response}</p>
                  </div>
                </div>

                {/* Actions Taken */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Automation Actions</Label>
                  <div className="space-y-1">
                    {result.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalation Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Escalation Decision</Label>
                  <div className="flex items-center gap-2">
                    {result.shouldEscalate ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <Badge variant="destructive">Escalate to Human</Badge>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Badge variant="default">AI Can Handle</Badge>
                      </>
                    )}
                  </div>
                  {result.escalationReason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {result.escalationReason}
                    </p>
                  )}
                </div>

                {/* Next Steps */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Next Steps</Label>
                  <div className="space-y-1">
                    {result.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Process a support call to see automation results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            How the N8n-Style Automation Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium">1. Call Input</h3>
              <p className="text-sm text-muted-foreground">
                Customer message analyzed for intent and priority
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium">2. Knowledge Search</h3>
              <p className="text-sm text-muted-foreground">
                Searches knowledge base for relevant solutions
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium">3. AI Response</h3>
              <p className="text-sm text-muted-foreground">
                Generates human-like response with solutions
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-medium">4. Smart Escalation</h3>
              <p className="text-sm text-muted-foreground">
                Automatically escalates when AI can't resolve
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}