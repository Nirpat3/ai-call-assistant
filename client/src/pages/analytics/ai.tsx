import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AppStoreLayout from "@/components/AppStoreLayout";
import { Brain, TrendingUp, MessageSquare, Target, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function AIAnalytics() {
  // Mock data for demonstration
  const aiMetrics = {
    overallAccuracy: 92,
    intentRecognition: 89,
    responseTime: 1.2,
    customerSatisfaction: 4.3,
    totalInteractions: 1247,
    successfulRouting: 95,
    learningProgress: 78
  };

  const recentInsights = [
    {
      type: "improvement",
      title: "Intent Recognition Improved",
      description: "Sales intent recognition accuracy increased by 12% this week",
      timestamp: "2 hours ago"
    },
    {
      type: "alert",
      title: "Low Confidence Detected",
      description: "15 interactions had confidence below 70% threshold",
      timestamp: "5 hours ago"
    },
    {
      type: "success",
      title: "Training Complete",
      description: "New customer service scenarios training completed successfully",
      timestamp: "1 day ago"
    }
  ];

  return (
    <AppStoreLayout>
      <div className="flex-1 space-y-6 p-6 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Analytics</h1>
            <p className="text-muted-foreground">Monitor AI performance and learning progress</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiMetrics.overallAccuracy}%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>+2.1% from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intent Recognition</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiMetrics.intentRecognition}%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>+5.2% from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiMetrics.responseTime}s</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>-0.3s from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interactions Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aiMetrics.totalInteractions}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>+18% from yesterday</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>AI Performance Overview</CardTitle>
              <CardDescription>Key performance indicators for your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Intent Recognition</span>
                  <span className="text-sm text-muted-foreground">{aiMetrics.intentRecognition}%</span>
                </div>
                <Progress value={aiMetrics.intentRecognition} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Successful Routing</span>
                  <span className="text-sm text-muted-foreground">{aiMetrics.successfulRouting}%</span>
                </div>
                <Progress value={aiMetrics.successfulRouting} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Learning Progress</span>
                  <span className="text-sm text-muted-foreground">{aiMetrics.learningProgress}%</span>
                </div>
                <Progress value={aiMetrics.learningProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Insights</CardTitle>
              <CardDescription>Latest improvements and alerts from your AI system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentInsights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {insight.type === "improvement" && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {insight.type === "alert" && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                    {insight.type === "success" && <CheckCircle className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.timestamp}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Training Status */}
        <Card>
          <CardHeader>
            <CardTitle>AI Training Status</CardTitle>
            <CardDescription>Current training progress and upcoming improvements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Customer Service</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <Progress value={85} className="h-2" />
                <p className="text-xs text-muted-foreground">Learning from 1,247 interactions</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sales Conversations</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <Progress value={23} className="h-2" />
                <p className="text-xs text-muted-foreground">Collecting training data</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Technical Support</span>
                  <Badge variant="secondary">Complete</Badge>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-xs text-muted-foreground">Ready for deployment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppStoreLayout>
  );
}