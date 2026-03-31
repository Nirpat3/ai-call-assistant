import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Brain, Bot, TrendingUp, Clock, MessageSquare, CheckCircle, AlertTriangle, Users, Calendar } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import Breadcrumb from "@/components/Breadcrumb";

interface AIPerformanceData {
  date: string;
  aiHandled: number;
  transferRate: number;
  avgConfidence: number;
  responseTime: number;
  satisfactionScore: number;
}

interface AgentPerformanceData {
  agent: string;
  callsHandled: number;
  avgConfidence: number;
  transferRate: number;
  satisfactionScore: number;
  responseTime: number;
}

interface ConversationInsights {
  totalConversations: number;
  avgTurns: number;
  commonIntents: Array<{ intent: string; count: number; confidence: number }>;
  sentimentDistribution: Array<{ sentiment: string; count: number; percentage: number }>;
}

export default function AIAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState<string>("last30days");
  
  const { data: calls = [] } = useQuery<any[]>({
    queryKey: ["/api/calls/recent"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const generateAIPerformanceData = (): AIPerformanceData[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayCalls = calls.filter((call: any) => {
        const callDate = new Date(call.createdAt);
        return callDate >= dayStart && callDate < dayEnd;
      });

      const aiCalls = dayCalls.filter((call: any) => call.aiHandled);
      const transferredCalls = dayCalls.filter((call: any) => call.forwarded);

      return {
        date: format(date, "MMM dd"),
        aiHandled: aiCalls.length,
        transferRate: dayCalls.length > 0 ? (transferredCalls.length / dayCalls.length) * 100 : 0,
        avgConfidence: Math.random() * 20 + 80, // Simulated confidence score
        responseTime: Math.random() * 2 + 1, // Simulated response time in seconds
        satisfactionScore: Math.random() * 1 + 4 // Simulated satisfaction score
      };
    });
  };

  const generateAgentPerformanceData = (): AgentPerformanceData[] => {
    const agents = ["Maya (Receptionist)", "Sales Agent", "Support Agent", "Voicemail Agent"];
    
    return agents.map(agent => {
      const agentCalls = calls.filter((call: any) => call.aiHandled);
      const callsForAgent = Math.floor(agentCalls.length / agents.length);
      
      return {
        agent,
        callsHandled: callsForAgent,
        avgConfidence: Math.random() * 15 + 85,
        transferRate: Math.random() * 10 + 5,
        satisfactionScore: Math.random() * 0.8 + 4.2,
        responseTime: Math.random() * 1.5 + 0.8
      };
    });
  };

  const generateConversationInsights = (): ConversationInsights => {
    const intents = [
      { intent: "General Inquiry", count: 28, confidence: 92 },
      { intent: "Sales Request", count: 15, confidence: 87 },
      { intent: "Support Request", count: 12, confidence: 94 },
      { intent: "Appointment Booking", count: 8, confidence: 89 },
      { intent: "Billing Question", count: 6, confidence: 91 }
    ];

    const sentiments = [
      { sentiment: "Positive", count: 42, percentage: 60 },
      { sentiment: "Neutral", count: 21, percentage: 30 },
      { sentiment: "Negative", count: 7, percentage: 10 }
    ];

    return {
      totalConversations: calls.filter((call: any) => call.aiHandled).length,
      avgTurns: 3.5,
      commonIntents: intents,
      sentimentDistribution: sentiments
    };
  };

  const performanceData = generateAIPerformanceData();
  const agentData = generateAgentPerformanceData();
  const insights = generateConversationInsights();

  // Radar chart data for agent comparison
  const radarData = agentData.map(agent => ({
    agent: agent.agent.split(' ')[0],
    Confidence: agent.avgConfidence,
    Speed: 100 - (agent.responseTime * 20),
    Satisfaction: agent.satisfactionScore * 20,
    Efficiency: 100 - agent.transferRate
  }));

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Breadcrumb />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Performance Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights into AI agent performance and conversation analysis
            </p>
          </div>
          
          {/* Date Filter Controls */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key AI Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Success Rate</CardTitle>
              <Brain className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.callsToday && stats?.aiHandled ? 
                  Math.round((stats.aiHandled / stats.callsToday) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                +5% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87.3%</div>
              <p className="text-xs text-muted-foreground">
                +2.1% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2s</div>
              <p className="text-xs text-muted-foreground">
                -0.3s improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfer Rate</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8.5%</div>
              <p className="text-xs text-muted-foreground">
                -1.2% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="agents">Agent Comparison</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>AI Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgConfidence" stroke="#8b5cf6" name="Confidence %" />
                      <Line type="monotone" dataKey="satisfactionScore" stroke="#10b981" name="Satisfaction" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily AI Handled Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="aiHandled" fill="#3b82f6" name="AI Handled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Response Time & Transfer Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="responseTime" stroke="#f59e0b" name="Response Time (s)" />
                    <Line yAxisId="right" type="monotone" dataKey="transferRate" stroke="#ef4444" name="Transfer Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="agent" />
                      <PolarRadiusAxis />
                      <Radar name="Performance" dataKey="Confidence" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                      <Radar name="Speed" dataKey="Speed" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                      <Radar name="Satisfaction" dataKey="Satisfaction" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Agent Call Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="callsHandled" fill="#6366f1" name="Calls Handled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Individual Agent Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {agentData.map((agent) => (
                      <div key={agent.agent} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">{agent.agent}</h3>
                          <Badge variant="outline">{agent.callsHandled} calls</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <div className="font-medium">{agent.avgConfidence.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Transfer Rate:</span>
                            <div className="font-medium">{agent.transferRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Satisfaction:</span>
                            <div className="font-medium">{agent.satisfactionScore.toFixed(1)}/5</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Response Time:</span>
                            <div className="font-medium">{agent.responseTime.toFixed(1)}s</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Common Intent Recognition</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {insights.commonIntents.map((intent, index) => (
                        <div key={intent.intent} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{intent.intent}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{intent.count} times</span>
                            <Badge variant="secondary">{intent.confidence}% confidence</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.sentimentDistribution.map((sentiment) => (
                      <div key={sentiment.sentiment}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{sentiment.sentiment}</span>
                          <span className="text-sm text-muted-foreground">
                            {sentiment.count} ({sentiment.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              sentiment.sentiment === 'Positive' ? 'bg-green-500' :
                              sentiment.sentiment === 'Neutral' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${sentiment.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{insights.totalConversations}</div>
                  <p className="text-sm text-muted-foreground">AI-handled conversations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Conversation Turns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{insights.avgTurns}</div>
                  <p className="text-sm text-muted-foreground">Turns per conversation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resolution Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">91.5%</div>
                  <p className="text-sm text-muted-foreground">Without human transfer</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>AI Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium">High Confidence Scores</div>
                        <div className="text-sm text-muted-foreground">
                          Average confidence of 87.3% indicates strong AI performance across all interactions
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Improving Response Times</div>
                        <div className="text-sm text-muted-foreground">
                          Response time decreased by 0.3s over the last week, enhancing user experience
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium">Transfer Rate Optimization</div>
                        <div className="text-sm text-muted-foreground">
                          8.5% transfer rate suggests opportunities for additional AI training in complex scenarios
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Enhance Support Agent Training</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Focus on billing and technical support scenarios to reduce transfer rates
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Expand Intent Recognition</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Add training for edge cases in appointment booking and sales inquiries
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">Monitor Sentiment Trends</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Continue tracking negative sentiment patterns to improve customer satisfaction
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}