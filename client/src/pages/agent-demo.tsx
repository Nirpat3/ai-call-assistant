import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Send, MessageCircle, Users, Target, Wrench, BookOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Breadcrumb from "@/components/Breadcrumb";

interface CallMessage {
  role: 'user' | 'assistant';
  content: string;
  agent: string;
  timestamp: Date;
  confidence?: number;
}

export default function AgentDemo() {
  const [callerInput, setCallerInput] = useState('');
  const [callerNumber, setCallerNumber] = useState('+15551234567');
  const [conversation, setConversation] = useState<CallMessage[]>([]);
  const [currentAgent, setCurrentAgent] = useState('ai-receptionist');
  const [isCallActive, setIsCallActive] = useState(false);
  const { toast } = useToast();

  const agents = {
    'ai-receptionist': { name: 'Maya (AI Receptionist)', icon: Users, color: 'bg-blue-500', avatar: 'M' },
    'sales-agent': { name: 'Alex (Sales Agent)', icon: Target, color: 'bg-green-500', avatar: 'A' },
    'support-agent': { name: 'Jordan (Support Agent)', icon: Wrench, color: 'bg-orange-500', avatar: 'J' },
    'voicemail-agent': { name: 'Voicemail System', icon: BookOpen, color: 'bg-purple-500', avatar: 'V' }
  };

  const testCallMutation = useMutation({
    mutationFn: async (input: string) => {
      return apiRequest('/api/agents/test-routing', { method: 'POST', body: JSON.stringify({ callerNumber, userInput: input }) });
    },
    onSuccess: (data: any) => {
      // Add AI response to conversation
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        agent: data.currentAgent,
        timestamp: new Date(),
        confidence: data.confidence
      }]);
      
      // Update current agent if transferred
      if (data.currentAgent !== currentAgent) {
        setCurrentAgent(data.currentAgent);
        toast({
          title: "Call Transferred",
          description: `Transferred to ${agents[data.currentAgent as keyof typeof agents]?.name}`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process call. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startCall = () => {
    setIsCallActive(true);
    setConversation([{
      role: 'assistant',
      content: 'Hello! Thank you for calling. This is Maya, your AI assistant. How may I help you today?',
      agent: 'ai-receptionist',
      timestamp: new Date(),
      confidence: 100
    }]);
    setCurrentAgent('ai-receptionist');
  };

  const endCall = () => {
    setIsCallActive(false);
    setConversation([]);
    setCurrentAgent('ai-receptionist');
    setCallerInput('');
  };

  const sendMessage = () => {
    if (!callerInput.trim()) return;

    // Add user message to conversation
    setConversation(prev => [...prev, {
      role: 'user',
      content: callerInput,
      agent: 'user',
      timestamp: new Date()
    }]);

    // Send to AI agent
    testCallMutation.mutate(callerInput);
    setCallerInput('');
  };

  const quickTestScenarios = [
    { label: 'Pricing Inquiry', input: 'Hi, I want to know about your pricing for RapidRMS' },
    { label: 'Technical Issue', input: 'My POS system is not connecting to the network' },
    { label: 'General Question', input: 'What are your business hours?' },
    { label: 'Frustrated Customer', input: 'This is ridiculous! I\'ve been trying to reach someone for hours!' },
    { label: 'Demo Request', input: 'I\'d like to schedule a demo of your restaurant management system' }
  ];

  const getAgentInfo = (agentId: string) => {
    return agents[agentId as keyof typeof agents] || agents['ai-receptionist'];
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Phone className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Multi-Agent Call Demo</h1>
        </div>
        <Badge variant={isCallActive ? "default" : "secondary"}>
          {isCallActive ? "Call In Progress" : "Ready to Call"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Live Call Simulation</span>
              </CardTitle>
              <CardDescription>
                Test the multi-agent system with realistic call scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Call Controls */}
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Caller Number"
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="w-40"
                  disabled={isCallActive}
                />
                {!isCallActive ? (
                  <Button onClick={startCall} className="bg-green-600 hover:bg-green-700">
                    <Phone className="h-4 w-4 mr-2" />
                    Start Call
                  </Button>
                ) : (
                  <Button onClick={endCall} variant="destructive">
                    <Phone className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                )}
              </div>

              {/* Conversation Display */}
              <div className="border rounded-lg p-4 h-80 overflow-y-auto bg-gray-50">
                {conversation.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Start a call to begin conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversation.map((message, index) => {
                      const agentInfo = getAgentInfo(message.agent);
                      return (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border shadow-sm'
                            }`}
                          >
                            {message.role === 'assistant' && (
                              <div className="flex items-center space-x-2 mb-1">
                                <div className={`w-6 h-6 ${agentInfo.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                                  {agentInfo.avatar}
                                </div>
                                <span className="text-xs font-medium text-gray-600">
                                  {agentInfo.name}
                                </span>
                                {message.confidence && (
                                  <Badge variant="outline" className="text-xs">
                                    {message.confidence}%
                                  </Badge>
                                )}
                              </div>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Input */}
              {isCallActive && (
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="What would you like to say?"
                    value={callerInput}
                    onChange={(e) => setCallerInput(e.target.value)}
                    className="flex-1 min-h-[60px]"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!callerInput.trim() || testCallMutation.isPending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Status & Quick Tests */}
        <div className="space-y-6">
          {/* Current Agent */}
          <Card>
            <CardHeader>
              <CardTitle>Current Agent</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const agentInfo = getAgentInfo(currentAgent);
                const IconComponent = agentInfo.icon;
                return (
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${agentInfo.color} rounded-full flex items-center justify-center`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">{agentInfo.name}</h3>
                      <p className="text-sm text-gray-600">Currently handling call</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Quick Test Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Test Scenarios</CardTitle>
              <CardDescription>
                Try these common scenarios to test agent routing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickTestScenarios.map((scenario, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => {
                    if (!isCallActive) {
                      startCall();
                      setTimeout(() => {
                        setCallerInput(scenario.input);
                      }, 500);
                    } else {
                      setCallerInput(scenario.input);
                    }
                  }}
                  disabled={testCallMutation.isPending}
                >
                  <div>
                    <div className="font-medium text-sm">{scenario.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{scenario.input}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Agent Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Available Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(agents).map(([id, agent]) => {
                const IconComponent = agent.icon;
                return (
                  <div key={id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${agent.color} rounded-full flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{agent.name}</p>
                    </div>
                    {currentAgent === id && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}