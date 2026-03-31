import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Play, 
  Pause, 
  Square,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Settings,
  Zap,
  Target,
  TrendingUp,
  Code,
  Bug,
  Shield,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'integration' | 'performance' | 'security' | 'ui';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  duration?: number;
  lastRun?: Date;
  aiGenerated: boolean;
}

interface TestStep {
  id: string;
  description: string;
  action: string;
  expectedOutcome: string;
  actualOutcome?: string;
  status: 'pending' | 'passed' | 'failed';
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[];
  schedule: 'manual' | 'daily' | 'weekly' | 'on-deploy';
  isActive: boolean;
  lastRun?: Date;
  passRate: number;
}

export default function AIQAEngineerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [seniorMode, setSeniorMode] = useState(true);

  // Mock data for demonstration
  const testCases: TestCase[] = [
    {
      id: "test_001",
      name: "AI Call Routing Accuracy",
      description: "Verify AI correctly routes calls based on caller intent and business rules",
      category: "functional",
      priority: "critical",
      status: "passed",
      automationLevel: "fully-automated",
      aiGenerated: true,
      expectedResult: "Call routed to correct department within 30 seconds",
      actualResult: "Call routed to sales in 12 seconds",
      duration: 45,
      lastRun: new Date(Date.now() - 3600000),
      steps: [
        {
          id: "step_001",
          description: "Initiate test call with sales inquiry",
          action: "Make call with 'I want to buy your product' message",
          expectedOutcome: "AI recognizes sales intent",
          actualOutcome: "Sales intent detected with 94% confidence",
          status: "passed"
        },
        {
          id: "step_002", 
          description: "Verify routing decision",
          action: "Monitor call routing logic",
          expectedOutcome: "Call routed to sales team",
          actualOutcome: "Successfully routed to sales queue",
          status: "passed"
        }
      ]
    },
    {
      id: "test_002",
      name: "Emergency Call Escalation",
      description: "Test emergency keyword detection and immediate escalation",
      category: "security",
      priority: "critical",
      status: "running",
      automationLevel: "fully-automated",
      aiGenerated: true,
      expectedResult: "Emergency calls escalated within 5 seconds",
      duration: 25,
      lastRun: new Date(Date.now() - 1800000),
      steps: [
        {
          id: "step_003",
          description: "Test emergency keyword detection",
          action: "Call with emergency keywords",
          expectedOutcome: "Emergency detected immediately",
          status: "passed"
        },
        {
          id: "step_004",
          description: "Verify escalation speed",
          action: "Monitor escalation timing",
          expectedOutcome: "Escalation within 5 seconds",
          status: "passed"
        }
      ]
    },
    {
      id: "test_003",
      name: "Load Testing - Concurrent Calls",
      description: "Test system performance under high call volume",
      category: "performance",
      priority: "high",
      status: "failed",
      automationLevel: "fully-automated",
      aiGenerated: false,
      expectedResult: "Handle 100+ concurrent calls without degradation",
      actualResult: "System slowed at 85 concurrent calls",
      duration: 180,
      lastRun: new Date(Date.now() - 7200000),
      steps: [
        {
          id: "step_005",
          description: "Simulate 100 concurrent calls",
          action: "Generate load test scenario",
          expectedOutcome: "All calls processed normally",
          actualOutcome: "Response time increased after 85 calls",
          status: "failed"
        }
      ]
    }
  ];

  const testSuites: TestSuite[] = [
    {
      id: "suite_001",
      name: "Core AI Functionality",
      description: "Essential AI call handling and routing tests",
      testCases: ["test_001", "test_002"],
      schedule: "daily",
      isActive: true,
      lastRun: new Date(Date.now() - 3600000),
      passRate: 95
    },
    {
      id: "suite_002",
      name: "Performance & Load Testing",
      description: "System performance under various load conditions",
      testCases: ["test_003"],
      schedule: "weekly",
      isActive: true,
      lastRun: new Date(Date.now() - 86400000),
      passRate: 67
    }
  ];

  const generateTestCases = async () => {
    if (!generationPrompt.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide a description for test case generation",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI test generation
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Test Cases Generated",
        description: `Generated 5 new test cases based on: "${generationPrompt}"`,
      });
      setGenerationPrompt("");
    }, 3000);
  };

  const runTestSuite = async (suiteId: string) => {
    setIsRunning(true);
    toast({
      title: "Test Suite Started",
      description: "Running automated test suite...",
    });

    // Simulate test execution
    setTimeout(() => {
      setIsRunning(false);
      toast({
        title: "Test Suite Completed",
        description: "All tests executed. Check results for details.",
      });
    }, 8000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'functional': return 'bg-blue-100 text-blue-800';
      case 'integration': return 'bg-purple-100 text-purple-800';
      case 'performance': return 'bg-orange-100 text-orange-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'ui': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-violet-600 rounded-3xl shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Senior AI QA Engineer</h1>
                  <p className="text-gray-600 mt-1 text-lg">Enterprise-grade quality assurance with advanced testing methodologies</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-violet-100 text-violet-800">
                      Senior Level
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      Risk-Based Testing
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      Predictive Analytics
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => runTestSuite("suite_001")}
                  disabled={isRunning}
                  className="bg-violet-600 hover:bg-violet-700 rounded-xl px-6"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Tests
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-violet-600">{testCases.length}</div>
              <p className="text-sm text-gray-600">Total Tests</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {testCases.filter(t => t.status === 'passed').length}
              </div>
              <p className="text-sm text-gray-600">Passed</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-red-600">
                {testCases.filter(t => t.status === 'failed').length}
              </div>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((testCases.filter(t => t.status === 'passed').length / testCases.length) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Pass Rate</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="tests" className="rounded-lg">Test Cases</TabsTrigger>
            <TabsTrigger value="suites" className="rounded-lg">Test Suites</TabsTrigger>
            <TabsTrigger value="generation" className="rounded-lg">AI Generation</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
            <TabsTrigger value="strategy" className="rounded-lg">Strategy</TabsTrigger>
            <TabsTrigger value="learning" className="rounded-lg">Learning</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            {testCases.map((test) => (
              <Card key={test.id} className="bg-white border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(test.status)}
                        <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                        <Badge className={getCategoryColor(test.category)}>
                          {test.category}
                        </Badge>
                        <Badge className={getPriorityColor(test.priority)}>
                          {test.priority}
                        </Badge>
                        {test.aiGenerated && (
                          <Badge variant="outline" className="bg-violet-50 text-violet-700">
                            <Bot className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4">{test.description}</p>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Expected Result</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                            {test.expectedResult}
                          </p>
                        </div>
                        
                        {test.actualResult && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Actual Result</h4>
                            <p className={`text-sm rounded-lg p-3 ${
                              test.status === 'passed' 
                                ? 'text-green-700 bg-green-50' 
                                : 'text-red-700 bg-red-50'
                            }`}>
                              {test.actualResult}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{test.duration ? `${test.duration}s` : 'Not run'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>{test.steps.length} steps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="w-4 h-4" />
                          <span>{test.automationLevel.replace('-', ' ')}</span>
                        </div>
                        {test.lastRun && (
                          <div>
                            Last run: {test.lastRun.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTest(test)}
                        className="rounded-xl"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="suites" className="space-y-4">
            {testSuites.map((suite) => (
              <Card key={suite.id} className="bg-white border-gray-200 shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{suite.name}</h3>
                        <Badge variant={suite.isActive ? "default" : "secondary"}>
                          {suite.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {suite.schedule}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{suite.description}</p>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Pass Rate</span>
                          <span className="text-sm text-gray-600">{suite.passRate}%</span>
                        </div>
                        <Progress value={suite.passRate} className="h-2" />
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div>{suite.testCases.length} test cases</div>
                        {suite.lastRun && (
                          <div>Last run: {suite.lastRun.toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => runTestSuite(suite.id)}
                        disabled={isRunning}
                        className="bg-violet-600 hover:bg-violet-700 rounded-xl"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run Suite
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="generation" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Test Case Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="generation-prompt">Describe the functionality to test</Label>
                  <Textarea
                    id="generation-prompt"
                    placeholder="e.g., 'Test voice mail transcription accuracy for different accents and audio quality levels'"
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    className="mt-2 rounded-xl"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="test-type">Test Category</Label>
                    <Select>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="ui">User Interface</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="automation">Automation Level</Label>
                    <Select>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select automation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fully-automated">Fully Automated</SelectItem>
                        <SelectItem value="semi-automated">Semi-Automated</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={generateTestCases}
                  disabled={isGenerating || !generationPrompt.trim()}
                  className="bg-violet-600 hover:bg-violet-700 rounded-xl w-full"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Generating Test Cases...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Generate Test Cases
                    </>
                  )}
                </Button>

                {isGenerating && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">AI is analyzing your requirements...</div>
                    <Progress value={33} className="h-2" />
                    <div className="text-xs text-gray-500">
                      • Analyzing functionality scope<br/>
                      • Generating test scenarios<br/>
                      • Creating automation scripts
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Senior QA Analytics Dashboard */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Senior QA Dashboard - Quality Score: 94.2/100
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-600">94.2</div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                    <div className="text-xs text-green-600">↗️ +2.1%</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-600">96.3%</div>
                    <div className="text-sm text-gray-600">AI Accuracy</div>
                    <div className="text-xs text-blue-600">Target: &gt;95%</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-600">0.03</div>
                    <div className="text-sm text-gray-600">Defect Density</div>
                    <div className="text-xs text-gray-600">per KLOC</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-600">LOW</div>
                    <div className="text-sm text-gray-600">Risk Level</div>
                    <div className="text-xs text-green-600">✓ Safe</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Risk Assessment Matrix</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm">Critical Failures</span>
                        <Badge className="bg-green-100 text-green-800">0</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-sm">Security Issues</span>
                        <Badge className="bg-yellow-100 text-yellow-800">1 Low</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm">Performance Issues</span>
                        <Badge className="bg-green-100 text-green-800">0</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm">AI Model Drift</span>
                        <Badge className="bg-blue-100 text-blue-800">Monitor</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Predictive Analysis</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="text-sm font-medium">Next Sprint Prediction</div>
                        <div className="text-lg font-bold text-green-600">95.8% Quality Score</div>
                        <div className="text-xs text-gray-600">87% probability of meeting gates</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="text-sm font-medium">High Risk Areas</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>• Call routing logic (7.2/10)</div>
                          <div>• AI intent recognition (6.8/10)</div>
                          <div>• API integrations (6.1/10)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Advanced Test Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">92.5%</div>
                        <div className="text-sm text-gray-600">Code Coverage</div>
                        <Progress value={92.5} className="h-2 mt-2" />
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl">
                        <div className="text-2xl font-bold text-purple-600">89.3%</div>
                        <div className="text-sm text-gray-600">Functional</div>
                        <Progress value={89.3} className="h-2 mt-2" />
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="text-2xl font-bold text-green-600">96.1%</div>
                        <div className="text-sm text-gray-600">AI Features</div>
                        <Progress value={96.1} className="h-2 mt-2" />
                      </div>
                      <div className="p-4 bg-orange-50 rounded-xl">
                        <div className="text-2xl font-bold text-orange-600">87.8%</div>
                        <div className="text-sm text-gray-600">Integration</div>
                        <Progress value={87.8} className="h-2 mt-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Quality Gates Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-sm font-medium">Pre-Development</span>
                      <Badge className="bg-green-100 text-green-800">✓ Passed</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                      <span className="text-sm font-medium">Development</span>
                      <Badge className="bg-yellow-100 text-yellow-800">⚠️ 87%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-sm font-medium">Pre-Release</span>
                      <Badge className="bg-green-100 text-green-800">✓ Passed</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-sm font-medium">Release</span>
                      <Badge className="bg-blue-100 text-blue-800">⏳ Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Master Test Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Quality Objectives</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        99.9% System Uptime
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        95% AI Accuracy
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        &lt;2s Response Time
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Zero Critical Defects
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        100% Security Compliance
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Testing Approach</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="font-medium text-sm">Risk-Based Testing</div>
                        <div className="text-xs text-gray-600">Prioritize high-risk areas</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <div className="font-medium text-sm">Shift-Left Testing</div>
                        <div className="text-xs text-gray-600">Early integration in development</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-xl">
                        <div className="font-medium text-sm">Continuous Testing</div>
                        <div className="text-xs text-gray-600">CI/CD pipeline integration</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Senior QA Methodologies</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-xl">
                      <h5 className="font-medium text-sm mb-2">Boundary Value Analysis</h5>
                      <p className="text-xs text-gray-600">Systematic testing of input boundaries and edge cases</p>
                    </div>
                    <div className="p-4 border rounded-xl">
                      <h5 className="font-medium text-sm mb-2">Equivalence Partitioning</h5>
                      <p className="text-xs text-gray-600">Intelligent grouping of test cases for maximum coverage</p>
                    </div>
                    <div className="p-4 border rounded-xl">
                      <h5 className="font-medium text-sm mb-2">Decision Table Testing</h5>
                      <p className="text-xs text-gray-600">Complex business logic validation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Adaptive Learning System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-sm text-gray-600">Learning Cycles</div>
                    <div className="text-xs text-blue-600">Last: 2 min ago</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-600">94.3%</div>
                    <div className="text-sm text-gray-600">Learning Accuracy</div>
                    <div className="text-xs text-green-600">↗️ +3.2%</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-600">23</div>
                    <div className="text-sm text-gray-600">Patterns Identified</div>
                    <div className="text-xs text-gray-600">This session</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Recent Learning Insights</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <div className="font-medium text-sm text-green-700">Pattern Recognition</div>
                        <div className="text-xs text-gray-600">AI identified new test pattern for API error handling with 89% confidence</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="font-medium text-sm text-blue-700">Performance Prediction</div>
                        <div className="text-xs text-gray-600">Predicted 12% improvement in test efficiency for call routing tests</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <div className="font-medium text-sm text-purple-700">Defect Prevention</div>
                        <div className="text-xs text-gray-600">Enhanced test coverage for high-risk areas based on historical data</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Adaptive Improvements</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                        <div>
                          <div className="font-medium text-sm">Test Case Generation</div>
                          <div className="text-xs text-gray-600">AI-enhanced test creation</div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">+31% Faster</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                        <div>
                          <div className="font-medium text-sm">Defect Detection</div>
                          <div className="text-xs text-gray-600">Predictive analysis</div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">+23% Earlier</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                        <div>
                          <div className="font-medium text-sm">False Positives</div>
                          <div className="text-xs text-gray-600">Smart filtering</div>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">-18% Reduced</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Learning Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Knowledge Base</span>
                        <span className="text-xs text-gray-600">1,247 entries</span>
                      </div>
                      <Progress value={94} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">94% mature</div>
                    </div>
                    <div className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Pattern Recognition</span>
                        <span className="text-xs text-gray-600">Active</span>
                      </div>
                      <Progress value={87} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">87% accuracy</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="bg-violet-600 hover:bg-violet-700 rounded-xl w-full"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Trigger Learning Cycle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}