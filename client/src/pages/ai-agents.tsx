import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AppStoreLayout from '@/components/AppStoreLayout';
import { 
  Bot, 
  Phone, 
  MessageSquare, 
  User, 
  HeadphonesIcon, 
  ShoppingCart, 
  Wrench,
  Activity,
  TestTube
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'busy';
  description: string;
}

interface AgentStatus {
  agents: Agent[];
  activeConnections: number;
}

interface ConversationContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    agent?: string;
  }>;
  currentAgent: string;
  transferReason?: string;
  emotionalTone: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  businessHours: boolean;
  contact?: any;
}

const agentIcons: Record<string, any> = {
  'personal-assistant': User,
  'sales-agent': ShoppingCart,
  'support-agent': Wrench,
  'voicemail-agent': MessageSquare
};

const agentColors: Record<string, string> = {
  'personal-assistant': 'bg-blue-100 text-blue-800',
  'sales-agent': 'bg-green-100 text-green-800',
  'support-agent': 'bg-orange-100 text-orange-800',
  'voicemail-agent': 'bg-purple-100 text-purple-800'
};

export default function AIAgents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [testInput, setTestInput] = useState('');
  const [testCallerNumber, setTestCallerNumber] = useState('+15551234567');
  const [selectedCallSid, setSelectedCallSid] = useState('');

  const { data: agentStatus, isLoading } = useQuery<AgentStatus>({
    queryKey: ['/api/agents/status'],
    refetchInterval: 5000
  });

  const { data: conversationContext } = useQuery<ConversationContext>({
    queryKey: ['/api/agents/conversations', selectedCallSid],
    enabled: !!selectedCallSid
  });

  const testRoutingMutation = useMutation({
    mutationFn: async (data: { callerNumber: string; userInput: string }) => {
      return await apiRequest('/api/agents/test-routing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: "Routing Test Complete",
        description: `Agent: ${result.currentAgent} | Confidence: ${Math.round(result.confidence * 100)}%`
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to test agent routing",
        variant: "destructive"
      });
    }
  });

  const handleTestRouting = () => {
    if (!testInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter test input for routing",
        variant: "destructive"
      });
      return;
    }

    testRoutingMutation.mutate({
      callerNumber: testCallerNumber,
      userInput: testInput
    });
  };

  const getAgentIcon = (agentId: string) => {
    const IconComponent = agentIcons[agentId] || Bot;
    return <IconComponent className="h-5 w-5" />;
  };

  const getAgentColor = (agentId: string) => {
    return agentColors[agentId] || 'bg-gray-100 text-gray-800';
  };

  const getEmotionalToneColor = (tone: string) => {
    switch (tone) {
      case 'positive': return 'text-green-600';
      case 'frustrated': return 'text-red-600';
      case 'urgent': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <AppStoreLayout>
        <div className="section-spacing">
          <div className="page-header">
            <div className="flex items-center space-x-2">
              <Bot className="h-6 w-6" />
              <h1 className="page-title">AI Agents</h1>
            </div>
            <p className="page-description">
              Manage and monitor intelligent call routing agents.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout>
      <div className="section-spacing">
        <div className="page-header">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <h1 className="page-title">AI Agents</h1>
          </div>
          <p className="page-description">
            Manage and monitor intelligent call routing agents.
          </p>
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">
            {agentStatus?.activeConnections || 0} active connections
          </span>
        </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="testing">Agent Testing</TabsTrigger>
          <TabsTrigger value="conversations">Live Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agentStatus?.agents.map((agent) => (
              <Card key={agent.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAgentIcon(agent.id)}
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    <Badge 
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                      className={agent.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent Routing Flow</CardTitle>
              <CardDescription>
                How calls are intelligently routed between specialized AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">Incoming Call</span>
                </div>
                
                <div className="flex-1 h-px bg-border mx-4"></div>
                
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">Personal Assistant</span>
                  <span className="text-xs text-muted-foreground">Initial routing</span>
                </div>
                
                <div className="flex-1 h-px bg-border mx-4"></div>
                
                <div className="flex space-x-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-green-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Sales</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Wrench className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium">Support</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Voicemail</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                <CardTitle>Agent Routing Test</CardTitle>
              </div>
              <CardDescription>
                Test how different inputs are routed to appropriate agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caller-number">Caller Number</Label>
                  <Input
                    id="caller-number"
                    value={testCallerNumber}
                    onChange={(e) => setTestCallerNumber(e.target.value)}
                    placeholder="+15551234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Scenarios</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestInput("I'm interested in pricing for my business")}
                    >
                      Sales Query
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestInput("I'm having technical issues with the API")}
                    >
                      Support Issue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestInput("I'd like to leave a message")}
                    >
                      Voicemail
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="test-input">Test Input</Label>
                <Textarea
                  id="test-input"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter what the caller might say..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleTestRouting}
                disabled={testRoutingMutation.isPending}
                className="w-full"
              >
                {testRoutingMutation.isPending ? 'Testing...' : 'Test Agent Routing'}
              </Button>
              
              {testRoutingMutation.data && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Routing Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getAgentColor(testRoutingMutation.data.currentAgent)}>
                        {getAgentIcon(testRoutingMutation.data.currentAgent)}
                        <span className="ml-1">{testRoutingMutation.data.currentAgent.replace('-', ' ')}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Confidence: {Math.round(testRoutingMutation.data.confidence * 100)}%
                      </span>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Agent Response:</p>
                      <p className="text-sm">{(testRoutingMutation.data as any)?.response}</p>
                    </div>
                    
                    {(testRoutingMutation.data as any)?.shouldTransfer && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>Would transfer to:</span>
                        <Badge variant="outline">
                          {(testRoutingMutation.data as any)?.transferTo}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>
                  Monitor live agent conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter Call SID to monitor"
                    value={selectedCallSid}
                    onChange={(e) => setSelectedCallSid(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Currently {agentStatus?.activeConnections || 0} active conversations
                  </p>
                </div>
              </CardContent>
            </Card>

            {conversationContext && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Details</CardTitle>
                  <CardDescription>
                    Call SID: {conversationContext.callSid}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Caller:</span> {conversationContext.callerName || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Number:</span> {conversationContext.callerNumber}
                    </div>
                    <div>
                      <span className="font-medium">Current Agent:</span>
                      <Badge className={`ml-2 ${getAgentColor(conversationContext.currentAgent)}`}>
                        {conversationContext.currentAgent.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Emotional Tone:</span>
                      <span className={`ml-2 ${getEmotionalToneColor(conversationContext.emotionalTone)}`}>
                        {conversationContext.emotionalTone}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Conversation History</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {conversationContext.conversationHistory.map((message, index) => (
                        <div key={index} className={`p-2 rounded text-sm ${
                          message.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                        }`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">
                              {message.role === 'user' ? 'Caller' : message.agent || 'Assistant'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p>{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppStoreLayout>
  );
}