import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Clock, Database, Shield, Cpu, Network, Zap, Mic, PaintBucket, Users, Server, Monitor, TestTube, Cloud } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EngineeringRecommendation {
  id: string;
  engineerType: 'database' | 'api' | 'ui-designer' | 'ux-researcher' | 'backend' | 'frontend' | 'data-analytics' | 'qa-tester' | 'devops' | 'security' | 'ai-voice';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  impact: string;
  implementation: {
    steps: string[];
    codeChanges: string[];
    testingStrategy: string;
    rollbackPlan: string;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    mitigationSteps: string[];
    thirdPartyImpact: string[];
  };
  monitoring: {
    metrics: string[];
    alerts: string[];
    healthChecks: string[];
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'rejected';
}

interface SystemHealthReport {
  timestamp: string;
  apiHealth: {
    brokenRoutes: string[];
    responseTimeIssues: string[];
    errorRates: Record<string, number>;
    thirdPartyIntegrations: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      lastChecked: string;
      responseTime: number;
    }>;
  };
  databaseHealth: {
    connectionStatus: 'healthy' | 'degraded' | 'down';
    queryPerformance: Record<string, number>;
    missingTables: string[];
    schemaIssues: string[];
    indexOptimizations: string[];
  };
  securityHealth: {
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    authenticationIssues: string[];
    dataProtectionStatus: string;
  };
  dataHealth: {
    dataQualityIssues: string[];
    performanceBottlenecks: string[];
    optimizationOpportunities: string[];
  };
}

const engineerIcons = {
  'database': Database,
  'api': Network,
  'ui-designer': PaintBucket,
  'ux-researcher': Users,
  'backend': Server,
  'frontend': Monitor,
  'data-analytics': Cpu,
  'qa-tester': TestTube,
  'devops': Cloud,
  'security': Shield,
  'ai-voice': Mic
};

const priorityColors = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary"
} as const;

const statusColors = {
  pending: "default",
  approved: "secondary",
  "in-progress": "default",
  completed: "default",
  rejected: "destructive"
} as const;

export default function EngineeringTeamPage() {
  const [selectedEngineerType, setSelectedEngineerType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recommendations = [], isLoading: loadingRecommendations } = useQuery({
    queryKey: ['/api/engineering-team/recommendations', selectedEngineerType, selectedPriority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedEngineerType !== 'all') params.append('engineerType', selectedEngineerType);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      
      return apiRequest(`/api/engineering-team/recommendations?${params.toString()}`);
    }
  });

  const { data: systemHealth, isLoading: loadingHealth } = useQuery({
    queryKey: ['/api/engineering-team/system-health'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const triggerAnalysisMutation = useMutation({
    mutationFn: () => apiRequest('/api/engineering-team/trigger-analysis', { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Analysis Triggered",
        description: "PhD Engineering Team is performing comprehensive system analysis...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-team/recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-team/system-health'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger analysis. Please try again.",
        variant: "destructive",
      });
    }
  });

  const approveRecommendationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/engineering-team/recommendations/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Recommendation Approved",
        description: "The recommendation has been approved for implementation.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/engineering-team/recommendations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve recommendation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getHealthScore = (health: SystemHealthReport) => {
    if (!health) return 0;
    
    let score = 100;
    
    // Deduct for API issues
    score -= health.apiHealth.brokenRoutes.length * 10;
    score -= health.apiHealth.responseTimeIssues.length * 5;
    
    // Deduct for database issues
    if (health.databaseHealth.connectionStatus !== 'healthy') score -= 20;
    score -= health.databaseHealth.schemaIssues.length * 5;
    score -= health.databaseHealth.missingTables.length * 10;
    
    // Deduct for security issues
    score -= health.securityHealth.vulnerabilities.filter(v => v.severity === 'critical').length * 15;
    score -= health.securityHealth.vulnerabilities.filter(v => v.severity === 'high').length * 10;
    
    // Deduct for data issues
    score -= health.dataHealth.dataQualityIssues.length * 5;
    score -= health.dataHealth.performanceBottlenecks.length * 8;
    
    return Math.max(0, score);
  };

  const healthScore = systemHealth ? getHealthScore(systemHealth) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">PhD Engineering Team</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              Autonomous AI engineers monitoring and enhancing system performance
            </p>
          </div>
          <Button 
            onClick={() => triggerAnalysisMutation.mutate()}
            disabled={triggerAnalysisMutation.isPending}
            size="default"
            className="sm:size-lg w-full sm:w-auto"
          >
            {triggerAnalysisMutation.isPending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Analyzing...</span>
                <span className="sm:hidden">Analyzing</span>
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Trigger Analysis</span>
                <span className="sm:hidden">Analyze</span>
              </>
            )}
          </Button>
        </div>

        {/* System Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              System Health Overview
            </CardTitle>
            <CardDescription>
              Real-time monitoring by specialized PhD engineers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Overall Health Score</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Composite score based on all system metrics
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{healthScore}%</div>
                  <Progress value={healthScore} className="w-32 mt-2" />
                </div>
              </div>

              {systemHealth && (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">API Health</p>
                          <p className="text-2xl font-bold">
                            {systemHealth.apiHealth.brokenRoutes.length === 0 ? '✅' : '⚠️'}
                          </p>
                        </div>
                        <Network className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {systemHealth.apiHealth.brokenRoutes.length} broken routes
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Database</p>
                          <p className="text-2xl font-bold">
                            {systemHealth.databaseHealth.connectionStatus === 'healthy' ? '✅' : '⚠️'}
                          </p>
                        </div>
                        <Database className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {systemHealth.databaseHealth.schemaIssues.length} schema issues
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Security</p>
                          <p className="text-2xl font-bold">
                            {systemHealth.securityHealth.vulnerabilities.length === 0 ? '✅' : '🔒'}
                          </p>
                        </div>
                        <Shield className="h-8 w-8 text-red-500" />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {systemHealth.securityHealth.vulnerabilities.length} vulnerabilities
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Data Quality</p>
                          <p className="text-2xl font-bold">
                            {systemHealth.dataHealth.dataQualityIssues.length === 0 ? '✅' : '📊'}
                          </p>
                        </div>
                        <Cpu className="h-8 w-8 text-purple-500" />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {systemHealth.dataHealth.dataQualityIssues.length} quality issues
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Engineering Recommendations</CardTitle>
            <CardDescription>
              Automated recommendations from specialized PhD engineers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="overflow-x-auto">
                  <TabsList className="grid grid-cols-6 w-full min-w-fit">
                    <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">All</TabsTrigger>
                    <TabsTrigger value="data" className="text-xs sm:text-sm px-2 sm:px-3">Data</TabsTrigger>
                    <TabsTrigger value="database" className="text-xs sm:text-sm px-2 sm:px-3">DB</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs sm:text-sm px-2 sm:px-3">Security</TabsTrigger>
                    <TabsTrigger value="api" className="text-xs sm:text-sm px-2 sm:px-3">API</TabsTrigger>
                    <TabsTrigger value="infrastructure" className="text-xs sm:text-sm px-2 sm:px-3">Infra</TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={selectedPriority === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                    onClick={() => setSelectedPriority('all')}
                  >
                    All Priorities
                  </Button>
                  <Button
                    variant={selectedPriority === 'critical' ? 'destructive' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                    onClick={() => setSelectedPriority('critical')}
                  >
                    Critical
                  </Button>
                  <Button
                    variant={selectedPriority === 'high' ? 'destructive' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm whitespace-nowrap"
                    onClick={() => setSelectedPriority('high')}
                  >
                    High
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="space-y-3 sm:space-y-4">
                <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 sm:pr-4">
                  {loadingRecommendations ? (
                    <div className="flex items-center justify-center h-32">
                      <Clock className="h-6 w-6 animate-spin mr-2" />
                      Loading recommendations...
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No recommendations at this time. System is running optimally!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {recommendations.map((rec: EngineeringRecommendation) => {
                        const EngineerIcon = engineerIcons[rec.engineerType];
                        return (
                          <Card key={rec.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="p-3 sm:p-6">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start space-x-2 min-w-0 flex-1">
                                  <EngineerIcon className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-sm font-medium leading-tight">{rec.title}</CardTitle>
                                    <CardDescription className="mt-1 text-xs leading-tight line-clamp-2">
                                      {rec.description}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <Badge variant={priorityColors[rec.priority]} className="text-xs px-1.5 py-0.5">
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                  <Badge variant={statusColors[rec.status]} className="text-xs px-1.5 py-0.5">
                                    {rec.status}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-0">
                              <div className="space-y-2 sm:space-y-3">
                                <div>
                                  <h4 className="font-medium text-xs mb-1">Impact</h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{rec.impact}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-xs mb-1">Implementation Steps</h4>
                                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                    {rec.implementation.steps.slice(0, 3).map((step, index) => (
                                      <li key={index} className="flex items-start">
                                        <span className="text-blue-500 mr-1">•</span>
                                        <span className="line-clamp-1">{step}</span>
                                      </li>
                                    ))}
                                    {rec.implementation.steps.length > 3 && (
                                      <li className="text-xs text-gray-500">
                                        + {rec.implementation.steps.length - 3} more steps
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span>Risk: {rec.riskAssessment.level}</span>
                                    <span>•</span>
                                    <span className="hidden sm:inline">{rec.category}</span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">{new Date(rec.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  
                                  {rec.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={() => approveRecommendationMutation.mutate(rec.id)}
                                      disabled={approveRecommendationMutation.isPending}
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Engineer-specific tabs */}
              {['data', 'database', 'security', 'api', 'infrastructure'].map((type) => (
                <TabsContent key={type} value={type} className="space-y-3 sm:space-y-4">
                  <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 sm:pr-4">
                    <div className="space-y-4">
                      {recommendations
                        .filter((rec: EngineeringRecommendation) => rec.engineerType === type)
                        .map((rec: EngineeringRecommendation) => {
                          const EngineerIcon = engineerIcons[rec.engineerType];
                          return (
                            <Card key={rec.id} className="border-l-4 border-l-blue-500">
                              <CardHeader className="p-3 sm:p-6">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start space-x-2 min-w-0 flex-1">
                                    <EngineerIcon className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <CardTitle className="text-sm font-medium leading-tight">{rec.title}</CardTitle>
                                      <CardDescription className="mt-1 text-xs leading-tight line-clamp-2">
                                        {rec.description}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 flex-shrink-0">
                                    <Badge variant={priorityColors[rec.priority]} className="text-xs px-1.5 py-0.5">
                                      {rec.priority.toUpperCase()}
                                    </Badge>
                                    <Badge variant={statusColors[rec.status]} className="text-xs px-1.5 py-0.5">
                                      {rec.status}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 sm:p-6 pt-0">
                                <div className="space-y-2 sm:space-y-3">
                                  <div>
                                    <h4 className="font-medium text-xs mb-1">Impact</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{rec.impact}</p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium text-xs mb-1">Implementation Steps</h4>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                      {rec.implementation.steps.slice(0, 2).map((step, index) => (
                                        <li key={index} className="flex items-start">
                                          <span className="text-blue-500 mr-1">•</span>
                                          <span className="line-clamp-1">{step}</span>
                                        </li>
                                      ))}
                                      {rec.implementation.steps.length > 2 && (
                                        <li className="text-xs text-gray-500">
                                          + {rec.implementation.steps.length - 2} more steps
                                        </li>
                                      )}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="font-medium text-xs mb-1">Risk Assessment</h4>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      <p>Risk Level: <Badge variant="outline" className="text-xs">{rec.riskAssessment.level}</Badge></p>
                                      <div className="mt-1">
                                        <p className="font-medium text-xs">Mitigation:</p>
                                        <ul className="mt-0.5 space-y-0.5">
                                          {rec.riskAssessment.mitigationSteps.slice(0, 2).map((step, index) => (
                                            <li key={index} className="flex items-start">
                                              <span className="text-green-500 mr-1">✓</span>
                                              <span className="line-clamp-1">{step}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <span className="hidden sm:inline">{rec.category}</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span className="hidden sm:inline">{new Date(rec.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    
                                    {rec.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        className="text-xs px-2 py-1 h-6"
                                        onClick={() => approveRecommendationMutation.mutate(rec.id)}
                                        disabled={approveRecommendationMutation.isPending}
                                      >
                                        Approve
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}