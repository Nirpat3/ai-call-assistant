import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Brain, 
  TrendingUp, 
  Users, 
  Phone, 
  MessageSquare,
  BarChart3,
  Zap,
  Target,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface AIMetrics {
  realTimePerformance: {
    activeCalls: number;
    averageResponseTime: number;
    intentAccuracy: number;
    satisfactionScore: number;
    voiceQuality: number;
  };
  conversationAnalytics: {
    totalConversations: number;
    averageDuration: number;
    resolutionRate: number;
    transferRate: number;
    topIntents: Array<{
      intent: string;
      frequency: number;
      successRate: number;
    }>;
  };
  voicePersonalities: Array<{
    id: string;
    name: string;
    usage: number;
    satisfaction: number;
    effectiveness: number;
    status: 'active' | 'optimizing' | 'learning';
  }>;
  aiRecommendations: Array<{
    id: string;
    type: 'performance' | 'quality' | 'optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: number;
    implementation: string;
  }>;
}

export default function AIPerformanceDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, refetch } = useQuery<AIMetrics>({
    queryKey: ['/api/ai-performance-metrics', selectedTimeRange],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoRefresh) {
        refetch();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading AI performance data...</span>
        </div>
      </div>
    );
  }

  const mockMetrics: AIMetrics = {
    realTimePerformance: {
      activeCalls: 12,
      averageResponseTime: 1.2,
      intentAccuracy: 0.94,
      satisfactionScore: 0.87,
      voiceQuality: 0.92
    },
    conversationAnalytics: {
      totalConversations: 2847,
      averageDuration: 187,
      resolutionRate: 0.89,
      transferRate: 0.11,
      topIntents: [
        { intent: 'support_inquiry', frequency: 45, successRate: 0.92 },
        { intent: 'sales_information', frequency: 32, successRate: 0.87 },
        { intent: 'billing_question', frequency: 23, successRate: 0.94 }
      ]
    },
    voicePersonalities: [
      { id: 'professional', name: 'Professional Assistant', usage: 60, satisfaction: 0.89, effectiveness: 0.91, status: 'active' },
      { id: 'friendly', name: 'Friendly Receptionist', usage: 25, satisfaction: 0.92, effectiveness: 0.85, status: 'active' },
      { id: 'empathetic', name: 'Empathetic Support', usage: 10, satisfaction: 0.95, effectiveness: 0.88, status: 'optimizing' },
      { id: 'authoritative', name: 'Authoritative Manager', usage: 5, satisfaction: 0.84, effectiveness: 0.93, status: 'learning' }
    ],
    aiRecommendations: [
      {
        id: '1',
        type: 'performance',
        priority: 'high',
        title: 'Optimize Intent Recognition',
        description: 'Improve recognition accuracy for billing-related queries',
        impact: 0.85,
        implementation: 'Update training data with 200+ new billing examples'
      },
      {
        id: '2',
        type: 'quality',
        priority: 'medium',
        title: 'Enhance Voice Naturalness',
        description: 'Add more natural speech patterns for longer conversations',
        impact: 0.72,
        implementation: 'Integrate advanced prosody rules for conversations >3 minutes'
      },
      {
        id: '3',
        type: 'optimization',
        priority: 'low',
        title: 'Reduce Response Latency',
        description: 'Optimize processing pipeline for faster responses',
        impact: 0.65,
        implementation: 'Implement response caching for common queries'
      }
    ]
  };

  const data = metrics || mockMetrics;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'optimizing': return 'bg-yellow-100 text-yellow-800';
      case 'learning': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and analytics for AI voice agents</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Auto-refresh:</span>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'On' : 'Off'}</span>
            </Button>
          </div>
          
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Real-time Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Calls</p>
                <p className="text-2xl font-bold text-gray-900">{data.realTimePerformance.activeCalls}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{data.realTimePerformance.averageResponseTime}s</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Intent Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(data.realTimePerformance.intentAccuracy * 100)}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(data.realTimePerformance.satisfactionScore * 100)}%</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Voice Quality</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(data.realTimePerformance.voiceQuality * 100)}%</p>
              </div>
              <MessageSquare className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="flex w-full justify-center sm:justify-start bg-gray-100 rounded-xl p-1 overflow-x-auto">
          <TabsTrigger value="analytics" className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap flex-shrink-0">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="personalities" className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap flex-shrink-0">
            <Users className="w-4 h-4 mr-2" />
            Voice Personalities
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="rounded-lg text-xs px-3 sm:px-4 py-2 flex items-center whitespace-nowrap flex-shrink-0">
            <Brain className="w-4 h-4 mr-2" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversation Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-600" />
                  Conversation Statistics
                </CardTitle>
                <CardDescription>Overview of conversation performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Conversations</span>
                  <span className="text-lg font-bold">{data.conversationAnalytics.totalConversations.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Duration</span>
                  <span className="text-lg font-bold">{Math.round(data.conversationAnalytics.averageDuration / 60)}m {data.conversationAnalytics.averageDuration % 60}s</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Resolution Rate</span>
                    <span className="text-lg font-bold">{Math.round(data.conversationAnalytics.resolutionRate * 100)}%</span>
                  </div>
                  <Progress value={data.conversationAnalytics.resolutionRate * 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Transfer Rate</span>
                    <span className="text-lg font-bold">{Math.round(data.conversationAnalytics.transferRate * 100)}%</span>
                  </div>
                  <Progress value={data.conversationAnalytics.transferRate * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Top Intents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  Top Intent Categories
                </CardTitle>
                <CardDescription>Most common conversation intents and success rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.conversationAnalytics.topIntents.map((intent, index) => (
                  <div key={intent.intent} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{intent.intent.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{intent.frequency}%</span>
                        <span className="text-sm font-bold">{Math.round(intent.successRate * 100)}%</span>
                      </div>
                    </div>
                    <Progress value={intent.successRate * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personalities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {data.voicePersonalities.map((personality) => (
              <Card key={personality.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{personality.name}</CardTitle>
                    <Badge className={getStatusColor(personality.status)} variant="secondary">
                      {personality.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span className="font-medium">{personality.usage}%</span>
                    </div>
                    <Progress value={personality.usage} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Satisfaction</span>
                      <span className="font-medium">{Math.round(personality.satisfaction * 100)}%</span>
                    </div>
                    <Progress value={personality.satisfaction * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Effectiveness</span>
                      <span className="font-medium">{Math.round(personality.effectiveness * 100)}%</span>
                    </div>
                    <Progress value={personality.effectiveness * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {data.aiRecommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {recommendation.type === 'performance' && <TrendingUp className="w-5 h-5 text-blue-600" />}
                        {recommendation.type === 'quality' && <Star className="w-5 h-5 text-yellow-600" />}
                        {recommendation.type === 'optimization' && <Zap className="w-5 h-5 text-purple-600" />}
                        <h3 className="font-semibold text-lg">{recommendation.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(recommendation.priority)} variant="secondary">
                        {recommendation.priority} priority
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(recommendation.impact * 100)}% impact
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{recommendation.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Implementation:</h4>
                    <p className="text-sm text-gray-700">{recommendation.implementation}</p>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button size="sm" className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Implement</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}