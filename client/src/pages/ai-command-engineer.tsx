import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Terminal, 
  Code, 
  Zap, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  BarChart3,
  Bot,
  Settings,
  Navigation,
  Database,
  Webhook
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CommandContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  command: string;
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  executionPath: string[];
  result: any;
  errors: string[];
  learningData: any;
}

interface CommandStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  mostUsedIntents: Array<{intent: string, count: number}>;
  averageConfidence: number;
  executionTimeMs: number;
}

export default function AICommandEngineer() {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandContext[]>([]);
  const [stats, setStats] = useState<CommandStats | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sample commands for demonstration
  const sampleCommands = [
    'Set greeting message to "Welcome to our AI assistant!"',
    'Configure business hours Monday 9 AM to 5 PM',
    'Navigate to system settings',
    'Show me the call forwarding configuration',
    'Update AI behavior to be more friendly',
    'Go to contacts page',
    'Change greeting type to professional'
  ];

  // Load command statistics
  useEffect(() => {
    loadStats();
  }, []);

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [commandHistory]);

  const loadStats = async () => {
    try {
      const response = await apiRequest(`/api/ai-command/stats/${userId}`);
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const processCommand = async () => {
    if (!command.trim()) return;

    setIsProcessing(true);
    const currentCommand = command;
    setCommand('');

    try {
      const response = await apiRequest('/api/ai-command/process', {
        method: 'POST',
        body: JSON.stringify({
          command: currentCommand,
          userId,
          sessionId
        })
      });

      setCommandHistory(prev => [response, ...prev]);
      await loadStats();

      // Show success toast
      toast({
        title: "Command Executed",
        description: response.result?.message || "Command processed successfully",
        variant: response.errors?.length > 0 ? "destructive" : "default",
      });

    } catch (error) {
      console.error('Command processing failed:', error);
      toast({
        title: "Command Failed",
        description: "Failed to process command. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processCommand();
    }
  };

  const useSampleCommand = (sampleCommand: string) => {
    setCommand(sampleCommand);
  };

  const getIntentColor = (intent: string) => {
    const colors: Record<string, string> = {
      'configure_greeting': 'bg-blue-100 text-blue-800',
      'configure_business_hours': 'bg-green-100 text-green-800',
      'navigate_to_page': 'bg-purple-100 text-purple-800',
      'configure_ai_behavior': 'bg-orange-100 text-orange-800',
      'unknown': 'bg-gray-100 text-gray-800'
    };
    return colors[intent] || colors['unknown'];
  };

  const getStatusIcon = (context: CommandContext) => {
    if (context.errors && context.errors.length > 0) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (context.result?.action === 'clarification_needed') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-blue-600" />
              AI Command Engineer
            </h1>
            <p className="text-gray-600 mt-1">
              Execute commands for both frontend navigation and backend API operations via intelligent chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Database className="w-4 h-4 mr-1" />
              Backend Integration
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Webhook className="w-4 h-4 mr-1" />
              Webhook Support
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Command Interface */}
          <div className="lg:col-span-2 space-y-4">
            {/* Command Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Command Interface
                </CardTitle>
                <CardDescription>
                  Type natural language commands to control your AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 'Set greeting message to Welcome!' or 'Go to system settings'"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={processCommand}
                    disabled={isProcessing || !command.trim()}
                    size="sm"
                  >
                    {isProcessing ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sample Commands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Sample Commands
                </CardTitle>
                <CardDescription>
                  Try these example commands to see the AI in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sampleCommands.map((sample, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => useSampleCommand(sample)}
                      className="text-xs"
                    >
                      {sample}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Command History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Command History
                </CardTitle>
                <CardDescription>
                  Real-time execution log with detailed results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea ref={scrollAreaRef} className="h-96">
                  {commandHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No commands executed yet</p>
                      <p className="text-sm">Try one of the sample commands above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {commandHistory.map((context, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(context)}
                              <span className="font-medium">{context.command}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getIntentColor(context.intent)}>
                                {context.intent}
                              </Badge>
                              <Badge variant="outline">
                                {Math.round(context.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          
                          {context.result && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Result:</div>
                              <div className="text-sm bg-gray-50 p-2 rounded">
                                {context.result.message || JSON.stringify(context.result, null, 2)}
                              </div>
                            </div>
                          )}
                          
                          {context.errors && context.errors.length > 0 && (
                            <Alert className="mb-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {context.errors.join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {context.executionPath && context.executionPath.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Execution Path: {context.executionPath.join(' → ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Panel */}
          <div className="space-y-4">
            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Commands</span>
                      <span className="font-medium">{stats.totalCommands}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-medium text-green-600">
                        {stats.totalCommands > 0 
                          ? Math.round((stats.successfulCommands / stats.totalCommands) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Confidence</span>
                      <span className="font-medium">
                        {Math.round(stats.averageConfidence * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Response Time</span>
                      <span className="font-medium">{stats.executionTimeMs}ms</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No statistics available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Used Intents */}
            {stats && stats.mostUsedIntents && stats.mostUsedIntents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Popular Commands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.mostUsedIntents.map((intent, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{intent.intent}</span>
                        <Badge variant="outline">{intent.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  AI Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Configuration Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-purple-500" />
                    <span className="text-sm">Frontend Navigation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Backend API Operations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Webhook Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm">Learning & Adaptation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}