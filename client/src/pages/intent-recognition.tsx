import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Activity,
  CheckCircle,
  TestTube,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Zap,
  MessageSquare,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface Intent {
  id: string;
  name: string;
  description: string;
  examples: string[];
  keywords: string[];
  confidence_threshold: number;
  isActive: boolean;
  action: {
    type: 'route' | 'respond' | 'escalate' | 'collect_info';
    destination?: string;
    response?: string;
    required_fields?: string[];
  };
  statistics: {
    total_matches: number;
    accuracy_rate: number;
    last_triggered?: Date;
  };
}

export default function IntentRecognitionPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  // Mock data for demonstration
  const intents: Intent[] = [
    {
      id: "intent_001",
      name: "Check Account Balance",
      description: "Customer wants to check their account balance or current status",
      examples: [
        "What's my account balance?",
        "Can you tell me how much I owe?",
        "I need to check my current balance",
        "What's my outstanding amount?"
      ],
      keywords: ["balance", "owe", "amount", "account", "current", "check"],
      confidence_threshold: 0.8,
      isActive: true,
      action: {
        type: "route",
        destination: "billing_team",
        response: "I'll help you check your account balance. Let me connect you with our billing team."
      },
      statistics: {
        total_matches: 245,
        accuracy_rate: 0.92,
        last_triggered: new Date(Date.now() - 3600000)
      }
    },
    {
      id: "intent_002", 
      name: "Technical Support",
      description: "Customer needs technical assistance or troubleshooting",
      examples: [
        "My service isn't working",
        "I'm having technical issues",
        "There's a problem with my connection",
        "I need technical help"
      ],
      keywords: ["technical", "support", "help", "issue", "problem", "not working", "connection"],
      confidence_threshold: 0.75,
      isActive: true,
      action: {
        type: "route",
        destination: "technical_support",
        response: "I understand you're experiencing technical difficulties. Let me connect you with our technical support team."
      },
      statistics: {
        total_matches: 189,
        accuracy_rate: 0.88,
        last_triggered: new Date(Date.now() - 7200000)
      }
    },
    {
      id: "intent_003",
      name: "Service Cancellation",
      description: "Customer wants to cancel or discontinue service",
      examples: [
        "I want to cancel my service",
        "How do I discontinue my account?",
        "I need to stop my subscription",
        "Cancel my plan"
      ],
      keywords: ["cancel", "discontinue", "stop", "end", "terminate", "close account"],
      confidence_threshold: 0.85,
      isActive: true,
      action: {
        type: "escalate",
        response: "I understand you're considering canceling your service. Let me connect you with a specialist who can help discuss your options."
      },
      statistics: {
        total_matches: 67,
        accuracy_rate: 0.95,
        last_triggered: new Date(Date.now() - 14400000)
      }
    }
  ];

  const testIntentRecognition = async () => {
    if (!testInput.trim()) return;
    
    // Simulate API call
    setTimeout(() => {
      const mockResult = {
        input: testInput,
        detected_intents: [
          { intent: "Check Account Balance", confidence: 0.89 },
          { intent: "Technical Support", confidence: 0.23 },
          { intent: "Service Cancellation", confidence: 0.12 }
        ],
        recommended_action: "route to billing_team",
        processing_time: "145ms"
      };
      setTestResult(mockResult);
    }, 500);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 0.9) return "bg-green-100 text-green-800";
    if (accuracy >= 0.8) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg rounded-3xl">
          <CardContent className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-indigo-600 rounded-2xl sm:rounded-3xl shadow-lg">
                  <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Intent Recognition</h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-lg line-clamp-2">Configure and train AI to understand caller intentions</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowIntentDialog(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 sm:px-6 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Intent</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-indigo-600">{intents.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">Active Intents</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {Math.round(intents.reduce((acc, intent) => acc + intent.statistics.accuracy_rate, 0) / intents.length * 100)}%
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Accuracy</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {intents.reduce((acc, intent) => acc + intent.statistics.total_matches, 0)}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Matches</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {intents.filter(i => i.isActive).length}
              </div>
              <p className="text-sm text-gray-600">Active</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="intents" className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-max min-w-full justify-start lg:justify-center bg-gray-100 rounded-xl p-1 mb-6">
              <TabsTrigger 
                value="intents" 
                className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
              >
                <Brain className="w-3 h-3 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Intent Library</span>
                <span className="sm:hidden">Intents</span>
              </TabsTrigger>
              <TabsTrigger 
                value="testing" 
                className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
              >
                <TestTube className="w-3 h-3 mr-2 flex-shrink-0" />
                <span>Testing</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center whitespace-nowrap min-h-[40px] flex-shrink-0"
              >
                <BarChart3 className="w-3 h-3 mr-2 flex-shrink-0" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="intents" className="space-y-4 sm:space-y-6">
            <div className="space-y-4">
              {intents.map((intent) => (
                <Card key={intent.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{intent.name}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant={intent.isActive ? "default" : "secondary"} className="text-xs">
                              {intent.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge className={`${getAccuracyBadge(intent.statistics.accuracy_rate)} text-xs`}>
                              {Math.round(intent.statistics.accuracy_rate * 100)}%
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4 text-sm sm:text-base line-clamp-2">{intent.description}</p>

                        <div className="grid grid-cols-1 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Example Phrases</h4>
                            <div className="space-y-1">
                              {intent.examples.slice(0, 2).map((example, idx) => (
                                <div key={idx} className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                  "{example}"
                                </div>
                              ))}
                              {intent.examples.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{intent.examples.length - 2} more examples
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
                            <div className="flex flex-wrap gap-2">
                              {intent.keywords.slice(0, 4).map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="rounded-lg text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {intent.keywords.length > 4 && (
                                <Badge variant="outline" className="rounded-lg text-xs">
                                  +{intent.keywords.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">
                              <span className="hidden sm:inline">Threshold: </span>{intent.confidence_threshold}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{intent.statistics.total_matches} matches</span>
                          </div>
                          <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{intent.action.type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 sm:mt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIntent(intent)}
                          className="rounded-xl"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Test Intent Recognition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-input">Enter a test phrase</Label>
                  <Textarea
                    id="test-input"
                    placeholder="Type what a customer might say..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="mt-2 rounded-xl"
                  />
                </div>
                
                <Button 
                  onClick={testIntentRecognition}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  disabled={!testInput.trim()}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Test Recognition
                </Button>

                {testResult && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
                    <h4 className="font-semibold text-gray-900 mb-4">Recognition Results</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Input:</div>
                        <div className="text-sm text-gray-600 italic">"{testResult.input}"</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Detected Intents:</div>
                        <div className="space-y-2">
                          {testResult.detected_intents.map((result: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl">
                              <span className="font-medium">{result.intent}</span>
                              <Badge className={getConfidenceColor(result.confidence)}>
                                {Math.round(result.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <div className="text-sm font-medium text-gray-700">Recommended Action:</div>
                          <div className="text-sm text-gray-600">{testResult.recommended_action}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Processed in {testResult.processing_time}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Advanced Analytics Coming Soon</h3>
                <p className="text-gray-500">Detailed intent performance metrics and optimization recommendations</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}