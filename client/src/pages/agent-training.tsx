import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Play, Plus, Target, BookOpen, Wrench, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Breadcrumb from "@/components/Breadcrumb";

interface TrainingScenario {
  id: string;
  title: string;
  customerInput: string;
  expectedResponse: string;
  context: string;
  tags: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
}

interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  usage_examples: string[];
}

interface AgentTrainingData {
  agentId: string;
  scenarios: TrainingScenario[];
  knowledgeBase: KnowledgeEntry[];
  tools: AgentTool[];
  responseGuidelines: any[];
}

export default function AgentTraining() {
  const [selectedAgent, setSelectedAgent] = useState<string>('ai-receptionist');
  const [activeTab, setActiveTab] = useState('overview');
  const [newScenarioTopic, setNewScenarioTopic] = useState('');
  const [testScenario, setTestScenario] = useState<TrainingScenario | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const agents = [
    { id: 'ai-receptionist', name: 'AI Receptionist (Maya)', icon: Users, color: 'bg-blue-500' },
    { id: 'sales-agent', name: 'Sales Agent (Alex)', icon: Target, color: 'bg-green-500' },
    { id: 'support-agent', name: 'Support Agent (Jordan)', icon: Wrench, color: 'bg-orange-500' },
    { id: 'voicemail-agent', name: 'Voicemail Agent', icon: BookOpen, color: 'bg-purple-500' }
  ];

  const { data: trainingData, isLoading } = useQuery<AgentTrainingData>({
    queryKey: ['/api/agents/training', selectedAgent],
    enabled: !!selectedAgent
  });

  const generateScenarios = useMutation({
    mutationFn: async ({ topic, count = 3 }: { topic: string; count?: number }) => {
      return apiRequest(`/api/agents/training/${selectedAgent}/scenarios`, { method: 'POST', body: JSON.stringify({ topic, count }) });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents/training', selectedAgent] });
      toast({
        title: "Training Scenarios Generated",
        description: `Generated new training scenarios for ${variables.topic}`,
      });
      setNewScenarioTopic('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate training scenarios",
        variant: "destructive",
      });
    }
  });

  const evaluateScenario = useMutation({
    mutationFn: async (scenario: TrainingScenario) => {
      return apiRequest(`/api/agents/training/${selectedAgent}/evaluate`, { method: 'POST', body: JSON.stringify({ scenario }) });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Training Complete",
        description: `Score: ${data.score}/100 - ${data.feedback}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to evaluate training scenario",
        variant: "destructive",
      });
    }
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Agent Training</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Agent Training</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          Training System Active
        </Badge>
      </div>

      {/* Agent Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const IconComponent = agent.icon;
          return (
            <Card 
              key={agent.id}
              className={`cursor-pointer transition-all ${
                selectedAgent === agent.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedAgent(agent.id)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 ${agent.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-sm">{agent.name}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {trainingData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scenarios">Training Scenarios</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="tools">Agent Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Overview</CardTitle>
                <CardDescription>
                  Monitor training progress and overall agent performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{trainingData.scenarios.length}</div>
                    <div className="text-sm text-gray-600">Training Scenarios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{trainingData.knowledgeBase.length}</div>
                    <div className="text-sm text-gray-600">Knowledge Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{trainingData.tools.length}</div>
                    <div className="text-sm text-gray-600">Available Tools</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Training Completion</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Scenarios</CardTitle>
                <CardDescription>
                  Manage and create training scenarios for agent learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter scenario topic (e.g., 'handling pricing objections')"
                    value={newScenarioTopic}
                    onChange={(e) => setNewScenarioTopic(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => generateScenarios.mutate({ topic: newScenarioTopic })}
                    disabled={!newScenarioTopic.trim() || generateScenarios.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>

                <div className="space-y-3">
                  {trainingData.scenarios.map((scenario) => (
                    <Card key={scenario.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{scenario.title}</h4>
                          <div className="flex space-x-2">
                            <Badge className={getDifficultyColor(scenario.difficulty)}>
                              {scenario.difficulty}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => evaluateScenario.mutate(scenario)}
                              disabled={evaluateScenario.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Test
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Customer Input:</strong> {scenario.customerInput}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Expected Response:</strong> {scenario.expectedResponse}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {scenario.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  Agent knowledge entries and reference materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainingData.knowledgeBase.map((entry) => (
                    <Card key={entry.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{entry.title}</h4>
                          <Badge variant="outline">{entry.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{entry.content}</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Tools</CardTitle>
                <CardDescription>
                  Available tools and their usage guidelines for agent responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trainingData.tools.map((tool) => (
                    <Card key={tool.id} className="border">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">{tool.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                        
                        <div className="mb-3">
                          <Label className="text-xs font-medium text-gray-500">PARAMETERS</Label>
                          <div className="text-xs bg-gray-50 p-2 rounded mt-1 font-mono">
                            {JSON.stringify(tool.parameters, null, 2)}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs font-medium text-gray-500">USAGE EXAMPLES</Label>
                          <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                            {tool.usage_examples.map((example, index) => (
                              <li key={index}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}