import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Breadcrumb from "@/components/Breadcrumb";
import { 
  Bot, 
  Brain, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
  Users,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type AiConfig = any;

export default function AISettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [greeting, setGreeting] = useState("");
  const [useAdvancedConversation, setUseAdvancedConversation] = useState(false);
  const [enableConversationLearning, setEnableConversationLearning] = useState(false);
  const [enableAutoFaqGeneration, setEnableAutoFaqGeneration] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);

  const { data: aiConfig, isLoading } = useQuery<AiConfig>({
    queryKey: ["/api/ai-config"]
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<AiConfig>) => {
      return await apiRequest('/api/ai-config', { method: 'PUT', body: JSON.stringify(updates) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-config'] });
      toast({
        title: "Settings Updated",
        description: "AI configuration has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update AI configuration.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (aiConfig) {
      setGreeting(aiConfig.greeting);
      setUseAdvancedConversation(aiConfig.useAdvancedConversation);
      setEnableConversationLearning(aiConfig.enableConversationLearning);
      setEnableAutoFaqGeneration(aiConfig.enableAutoFaqGeneration);
      // Convert numeric string to percentage
      setConfidenceThreshold(Math.round(parseFloat(aiConfig.confidenceThreshold) * 100));
    }
  }, [aiConfig]);

  const handleSave = () => {
    console.log("Saving AI config with:", {
      greeting,
      useAdvancedConversation,
      enableConversationLearning,
      enableAutoFaqGeneration,
      confidenceThreshold: (confidenceThreshold / 100).toString()
    });
    
    updateConfigMutation.mutate({
      greeting,
      useAdvancedConversation,
      enableConversationLearning,
      enableAutoFaqGeneration,
      confidenceThreshold: (confidenceThreshold / 100).toString()
    });
  };

  if (isLoading) {
    return (
      <div className="section-spacing">
        <div className="loading-skeleton h-8 w-64"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-skeleton h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <Breadcrumb />
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setLocation('/call-settings')} className="focus-ring">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="page-title flex items-center">
                <Bot className="h-6 w-6 mr-2 text-primary" />
              AI Conversation Settings
            </h1>
            <p className="page-description">Configure advanced AI conversation features and learning capabilities</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateConfigMutation.isPending}>
          <Settings className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
        </div>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
            Basic AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="greeting">AI Greeting Message</Label>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Hello! Thanks for calling. How can I help you today?"
              className="mt-1"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              This greeting will be used when customers call and interact with the AI assistant.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Conversation Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Advanced Conversation Framework
            <Badge variant="secondary" className="ml-2">Premium</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Advanced Conversations</Label>
              <p className="text-sm text-gray-600">
                Use natural, human-like AI conversations with context awareness and emotional intelligence
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Natural speech patterns</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Context awareness</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Emotion detection</span>
                </div>
              </div>
            </div>
            <Switch
              checked={useAdvancedConversation}
              onCheckedChange={setUseAdvancedConversation}
            />
          </div>

          {useAdvancedConversation && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Advanced Features Enabled</span>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Callers will experience natural, human-like conversations</li>
                <li>• AI will use customer names and maintain conversation context</li>
                <li>• Emotional tone detection for better customer service</li>
                <li>• Smart escalation to human agents when needed</li>
              </ul>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-base font-medium">AI Confidence Threshold</Label>
            <p className="text-sm text-gray-600 mb-3">
              Set the minimum confidence level required before transferring to a human agent
            </p>
            <div className="flex items-center space-x-4">
              <Input
                type="range"
                min="50"
                max="95"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium w-12">{confidenceThreshold}%</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More transfers</span>
              <span>Fewer transfers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning & Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
            AI Learning & Intelligence
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Conversation Learning</Label>
              <p className="text-sm text-gray-600">
                AI will analyze conversations to improve responses and understand customer patterns
              </p>
            </div>
            <Switch
              checked={enableConversationLearning}
              onCheckedChange={setEnableConversationLearning}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto-Generate FAQs</Label>
              <p className="text-sm text-gray-600">
                Automatically create FAQ entries from common customer questions and AI responses
              </p>
            </div>
            <Switch
              checked={enableAutoFaqGeneration}
              onCheckedChange={setEnableAutoFaqGeneration}
            />
          </div>

          {(enableConversationLearning || enableAutoFaqGeneration) && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Learning Features Active</p>
                  <p>The AI will analyze conversations to improve over time. All data is processed securely and anonymously.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-indigo-600" />
            Knowledge Base Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            The AI assistant uses your knowledge base to provide accurate, up-to-date information to customers.
          </p>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setLocation('/knowledge-base')}>
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Knowledge Base
            </Button>
            <Button variant="outline" onClick={() => setLocation('/call-log')}>
              <Users className="h-4 w-4 mr-2" />
              View Conversation Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}