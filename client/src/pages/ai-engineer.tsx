import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import AppStoreLayout from '@/components/AppStoreLayout';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Shield, 
  Settings, 
  Star, 
  Clock, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Lightbulb,
  BarChart3,
  Activity,
  Gauge,
  Sparkles,
  Target,
  Code,
  Users,
  Layers,
  Copy,
  Download,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface EnhancementRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'ux' | 'security' | 'features' | 'architecture' | 'ai' | 'accessibility';
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: {
    steps: string[];
    codeChanges: string[];
    riskAssessment: string;
    testingStrategy: string;
  };
  aiGenerated: boolean;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'rejected';
  createdAt: string;
  analysisData?: any;
  implementationProgress?: number;
  estimatedTime?: string;
  lastUpdated?: string;
}

interface AppAnalysisResult {
  performanceMetrics: {
    loadTime: number;
    apiResponseTime: number;
    renderTime: number;
    memoryUsage: number;
  };
  userExperience: {
    navigationFlow: string;
    accessibility: string;
    mobileResponsiveness: string;
    errorHandling: string;
  };
  codeQuality: {
    complexity: string;
    maintainability: string;
    testCoverage: string;
    documentation: string;
  };
  security: {
    vulnerabilities: string[];
    dataProtection: string;
    authentication: string;
  };
  aiPerformance: {
    accuracy: number;
    responseTime: number;
    userSatisfaction: number;
    automationRate: number;
  };
}

const categoryIcons = {
  performance: TrendingUp,
  ux: Star,
  security: Shield,
  features: Sparkles,
  architecture: Settings,
  ai: Brain,
  accessibility: Activity
};

const priorityColors = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white'
};

const statusColors = {
  pending: 'bg-gray-500 text-white',
  approved: 'bg-purple-500 text-white',
  'in-progress': 'bg-blue-500 text-white',
  completed: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white'
};

export default function AIEngineerPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [customRequest, setCustomRequest] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<EnhancementRecommendation | null>(null);
  const [implementationProgress, setImplementationProgress] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Remove duplicates based on title and description similarity
  const removeDuplicates = (recommendations: EnhancementRecommendation[]) => {
    const unique = [];
    const seen = new Set();
    
    for (const rec of recommendations) {
      const key = `${rec.title.toLowerCase()}-${rec.category}-${rec.priority}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
    }
    return unique;
  };

  // Fetch current analysis
  const { data: currentAnalysis, isLoading: isAnalysisLoading } = useQuery<AppAnalysisResult>({
    queryKey: ['/api/ai-engineer/analysis'],
    refetchInterval: 30000,
  });

  // Fetch recommendations
  const { data: recommendations = [], isLoading: isRecommendationsLoading } = useQuery({
    queryKey: ['/api/ai-engineer/recommendations', selectedCategory, selectedPriority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      
      return apiRequest(`/api/ai-engineer/recommendations?${params.toString()}`);
    },
    refetchInterval: 15000,
  });

  // Fetch analysis history
  const { data: analysisHistory = [] } = useQuery({
    queryKey: ['/api/ai-engineer/analysis-history'],
    refetchInterval: 60000,
  });

  // Custom recommendation mutation
  const customRecommendationMutation = useMutation({
    mutationFn: (request: string) => apiRequest('/api/ai-engineer/custom-recommendation', {
      method: 'POST',
      body: JSON.stringify({ request }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-engineer/recommendations'] });
      setCustomRequest('');
      toast({
        title: "Custom Recommendation Generated",
        description: "Your custom enhancement request has been analyzed and added to recommendations.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate custom recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/ai-engineer/recommendations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-engineer/recommendations'] });
      toast({
        title: "Status Updated",
        description: "Recommendation status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update recommendation status.",
        variant: "destructive",
      });
    },
  });

  // Implementation mutation
  const implementationMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/ai-engineer/recommendations/${id}/implement`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-engineer/recommendations'] });
      toast({
        title: "Implementation Started",
        description: "The enhancement is being implemented automatically.",
      });
    },
    onError: (error) => {
      toast({
        title: "Implementation Failed",
        description: "Failed to implement recommendation. Please check the logs.",
        variant: "destructive",
      });
    },
  });

  const handleCustomRequest = () => {
    if (customRequest.trim()) {
      customRecommendationMutation.mutate(customRequest);
    }
  };

  const handleStatusUpdate = (id: string, status: string) => {
    statusUpdateMutation.mutate({ id, status });
  };

  const handleImplementation = (id: string) => {
    implementationMutation.mutate(id);
  };

  const getHealthScore = (analysis: AppAnalysisResult) => {
    if (!analysis) return 0;
    
    const performanceScore = Math.max(0, 100 - (analysis.performanceMetrics.loadTime * 20));
    const aiScore = analysis.aiPerformance.accuracy;
    const securityScore = analysis.security.vulnerabilities.length === 0 ? 100 : 70;
    
    return Math.round((performanceScore + aiScore + securityScore) / 3);
  };

  const filteredRecommendations = removeDuplicates(
    recommendations.filter((rec: EnhancementRecommendation) => {
      if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && rec.priority !== selectedPriority) return false;
      return true;
    })
  );

  // Real-time progress tracking effect
  useEffect(() => {
    const interval = setInterval(() => {
      filteredRecommendations.forEach((rec: EnhancementRecommendation) => {
        if (rec.status === 'in-progress') {
          setImplementationProgress(prev => ({
            ...prev,
            [rec.id]: Math.min((prev[rec.id] || 0) + Math.random() * 10, 100)
          }));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [filteredRecommendations]);

  return (
    <AppStoreLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">PhD AI Engineer</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Continuous platform enhancement with AI-driven insights</p>
          </div>
          
          {/* Real-time status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>AI Analysis Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Last Analysis: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Submenu */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex overflow-x-auto scrollbar-hide gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Gauge },
              { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
              { id: 'analysis', label: 'Analysis', icon: BarChart3 },
              { id: 'metrics', label: 'Metrics', icon: Activity },
              { id: 'custom', label: 'Custom Request', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-colors whitespace-nowrap min-w-fit ${
                  activeTab === id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Analysis Overview */}
              {currentAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="w-5 h-5" />
                      System Health Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                          {getHealthScore(currentAnalysis)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Overall Health</div>
                        <Progress value={getHealthScore(currentAnalysis)} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
                          {Math.round(currentAnalysis.aiPerformance.accuracy)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">AI Accuracy</div>
                        <Progress value={currentAnalysis.aiPerformance.accuracy} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">
                          {Math.round(currentAnalysis.performanceMetrics.loadTime * 100) / 100}s
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Load Time</div>
                        <Progress value={Math.max(0, 100 - currentAnalysis.performanceMetrics.loadTime * 20)} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">
                          {Math.round(currentAnalysis.aiPerformance.automationRate)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Automation</div>
                        <Progress value={currentAnalysis.aiPerformance.automationRate} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filter Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="ux">User Experience</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="features">Features</SelectItem>
                        <SelectItem value="architecture">Architecture</SelectItem>
                        <SelectItem value="ai">AI</SelectItem>
                        <SelectItem value="accessibility">Accessibility</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {filteredRecommendations.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Unique Recommendations
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {recommendations.length - filteredRecommendations.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Duplicates Removed
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {filteredRecommendations.filter((r: EnhancementRecommendation) => r.status === 'in-progress').length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        In Progress
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations List */}
              <div className="grid gap-4">
                {isRecommendationsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
                ) : filteredRecommendations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No recommendations match your filters.</div>
                ) : (
                  filteredRecommendations.map((rec: EnhancementRecommendation) => {
                    const CategoryIcon = categoryIcons[rec.category];
                    return (
                      <Card key={rec.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <CategoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{rec.title}</CardTitle>
                                <CardDescription className="mt-1">{rec.description}</CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={priorityColors[rec.priority]}>{rec.priority}</Badge>
                              <Badge className={statusColors[rec.status]}>{rec.status}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Progress Bar for In-Progress Items */}
                          {rec.status === 'in-progress' && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Implementation Progress</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {Math.round(implementationProgress[rec.id] || 0)}%
                                </span>
                              </div>
                              <Progress 
                                value={implementationProgress[rec.id] || 0} 
                                className="h-2"
                              />
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Implementing changes...</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>Impact: {rec.impact}</span>
                              <span>Effort: {rec.effort}</span>
                              <span>Category: {rec.category}</span>
                              {rec.estimatedTime && (
                                <span>ETA: {rec.estimatedTime}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {rec.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(rec.id, 'approved')}
                                  disabled={statusUpdateMutation.isPending}
                                >
                                  Approve
                                </Button>
                              )}
                              {rec.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleImplementation(rec.id)}
                                  disabled={implementationMutation.isPending}
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Implement
                                </Button>
                              )}
                              {rec.status === 'completed' && (
                                <Button size="sm" variant="outline" disabled>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Completed
                                </Button>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{rec.title}</DialogTitle>
                                    <DialogDescription>
                                      {rec.description}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Implementation Steps:</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(
                                            rec.implementation.steps.join('\n'),
                                            'Implementation steps'
                                          )}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <ul className="list-disc list-inside space-y-1 text-sm">
                                        {rec.implementation.steps.map((step, index) => (
                                          <li key={index}>{step}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Code Changes:</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(
                                            rec.implementation.codeChanges.join('\n'),
                                            'Code changes'
                                          )}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <ul className="list-disc list-inside space-y-1 text-sm">
                                        {rec.implementation.codeChanges.map((change, index) => (
                                          <li key={index}>{change}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Risk Assessment:</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(
                                            rec.implementation.riskAssessment,
                                            'Risk assessment'
                                          )}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.implementation.riskAssessment}</p>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Testing Strategy:</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(
                                            rec.implementation.testingStrategy,
                                            'Testing strategy'
                                          )}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{rec.implementation.testingStrategy}</p>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {currentAnalysis && (
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Load Time</span>
                          <p className="text-2xl font-bold">{currentAnalysis.performanceMetrics.loadTime}s</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
                          <p className="text-2xl font-bold">{currentAnalysis.performanceMetrics.apiResponseTime}ms</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Render Time</span>
                          <p className="text-2xl font-bold">{currentAnalysis.performanceMetrics.renderTime}ms</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                          <p className="text-2xl font-bold">{currentAnalysis.performanceMetrics.memoryUsage}MB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Security Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Vulnerabilities</span>
                          <p className="text-sm mt-1">{currentAnalysis.security.vulnerabilities.length === 0 ? 'None detected' : currentAnalysis.security.vulnerabilities.join(', ')}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Data Protection</span>
                          <p className="text-sm mt-1">{currentAnalysis.security.dataProtection}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Authentication</span>
                          <p className="text-sm mt-1">{currentAnalysis.security.authentication}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {currentAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.round(currentAnalysis.aiPerformance.accuracy)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
                        <Progress value={currentAnalysis.aiPerformance.accuracy} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {currentAnalysis.aiPerformance.responseTime}ms
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Response Time</div>
                        <Progress value={Math.max(0, 100 - currentAnalysis.aiPerformance.responseTime / 10)} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {Math.round(currentAnalysis.aiPerformance.userSatisfaction)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">User Satisfaction</div>
                        <Progress value={currentAnalysis.aiPerformance.userSatisfaction} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {Math.round(currentAnalysis.aiPerformance.automationRate)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Automation Rate</div>
                        <Progress value={currentAnalysis.aiPerformance.automationRate} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Request Custom Enhancement
                  </CardTitle>
                  <CardDescription>
                    Describe what you'd like to improve and our AI engineer will analyze it and create a recommendation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Describe what you'd like to improve or add to the system..."
                      value={customRequest}
                      onChange={(e) => setCustomRequest(e.target.value)}
                      className="min-h-32"
                    />
                    <Button 
                      onClick={handleCustomRequest}
                      disabled={!customRequest.trim() || customRecommendationMutation.isPending}
                    >
                      {customRecommendationMutation.isPending ? 'Generating...' : 'Generate Recommendation'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppStoreLayout>
  );
}