import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  MessageSquare, 
  TrendingUp, 
  Heart, 
  Frown, 
  Smile, 
  Meh,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import AppStoreLayout from "@/components/AppStoreLayout";

interface ConversationAnalytics {
  id: string;
  callId: string;
  callerNumber: string;
  callerName?: string;
  startTime: Date;
  duration: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  keyTopics: string[];
  intents: Array<{
    intent: string;
    confidence: number;
  }>;
  emotions: Array<{
    emotion: string;
    intensity: number;
    timestamp: number;
  }>;
  summary: string;
  actionItems: string[];
  escalationTriggers: string[];
  satisfactionScore?: number;
  resolved: boolean;
  transferReason?: string;
  transcript: Array<{
    speaker: 'caller' | 'agent';
    message: string;
    timestamp: number;
    sentiment: string;
    confidence: number;
  }>;
}

export default function ConversationAnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock analytics data
  const analyticsData: ConversationAnalytics[] = [
    {
      id: "conv_001",
      callId: "call_001",
      callerNumber: "+1 (555) 123-4567",
      callerName: "John Smith",
      startTime: new Date(Date.now() - 3600000),
      duration: 245,
      sentiment: "positive",
      sentimentScore: 0.8,
      keyTopics: ["account balance", "payment options", "billing"],
      intents: [
        { intent: "check_balance", confidence: 0.95 },
        { intent: "payment_inquiry", confidence: 0.78 }
      ],
      emotions: [
        { emotion: "satisfaction", intensity: 0.8, timestamp: 60 },
        { emotion: "relief", intensity: 0.9, timestamp: 180 }
      ],
      summary: "Customer inquired about account balance and payment options. Issue resolved with AI assistance.",
      actionItems: ["Follow up on payment plan setup"],
      escalationTriggers: [],
      satisfactionScore: 4.5,
      resolved: true,
      transcript: [
        { speaker: "agent", message: "Hi! I'm Maya, how can I help you today?", timestamp: 0, sentiment: "neutral", confidence: 0.9 },
        { speaker: "caller", message: "I need to check my account balance", timestamp: 5, sentiment: "neutral", confidence: 0.85 },
        { speaker: "agent", message: "I can help you with that. Let me look up your account.", timestamp: 10, sentiment: "positive", confidence: 0.92 }
      ]
    },
    {
      id: "conv_002",
      callId: "call_002",
      callerNumber: "+1 (555) 987-6543",
      callerName: "Sarah Johnson",
      startTime: new Date(Date.now() - 7200000),
      duration: 420,
      sentiment: "negative",
      sentimentScore: -0.6,
      keyTopics: ["service outage", "compensation", "complaint"],
      intents: [
        { intent: "report_issue", confidence: 0.92 },
        { intent: "request_compensation", confidence: 0.85 }
      ],
      emotions: [
        { emotion: "frustration", intensity: 0.9, timestamp: 30 },
        { emotion: "anger", intensity: 0.7, timestamp: 120 },
        { emotion: "satisfaction", intensity: 0.6, timestamp: 380 }
      ],
      summary: "Customer reported service outage and requested compensation. Escalated to human agent for resolution.",
      actionItems: ["Process compensation request", "Technical team follow-up"],
      escalationTriggers: ["high emotion intensity", "compensation request"],
      satisfactionScore: 3.0,
      resolved: true,
      transferReason: "Complex compensation claim",
      transcript: []
    }
  ];

  const sentimentData = [
    { name: 'Positive', value: 45, color: '#10B981' },
    { name: 'Neutral', value: 35, color: '#6B7280' },
    { name: 'Negative', value: 20, color: '#EF4444' }
  ];

  const topicsData = [
    { topic: 'Account Balance', count: 25 },
    { topic: 'Billing Issues', count: 18 },
    { topic: 'Service Outage', count: 12 },
    { topic: 'Payment Options', count: 15 },
    { topic: 'Technical Support', count: 8 }
  ];

  const emotionTrends = [
    { time: '9:00', satisfaction: 0.8, frustration: 0.2, neutral: 0.6 },
    { time: '12:00', satisfaction: 0.7, frustration: 0.4, neutral: 0.5 },
    { time: '15:00', satisfaction: 0.9, frustration: 0.1, neutral: 0.7 },
    { time: '18:00', satisfaction: 0.6, frustration: 0.6, neutral: 0.4 }
  ];

  const filteredAnalytics = analyticsData.filter(conv => {
    const matchesSearch = conv.callerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.callerNumber.includes(searchQuery) ||
                         conv.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || conv.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative': return <Frown className="w-5 h-5 text-red-500" />;
      default: return <Meh className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppStoreLayout>
      <div className="space-y-6 pb-20">
        {/* Enhanced iOS 16 Header */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-purple-600 rounded-3xl shadow-lg">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Conversation Analytics</h1>
                  <p className="text-gray-600 mt-1 text-lg">AI-powered insights into call sentiment and customer interactions</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 px-4 py-2 text-sm font-semibold">
                  Beta
                </Badge>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">78%</div>
              <p className="text-sm text-gray-600">Positive Sentiment</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-pink-600">4.2</div>
              <p className="text-sm text-gray-600">Avg Satisfaction</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">92%</div>
              <p className="text-sm text-gray-600">Resolution Rate</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">3:45</div>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg rounded-3xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-2xl"
              />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="sentiment" className="rounded-lg">Sentiment</TabsTrigger>
            <TabsTrigger value="topics" className="rounded-lg">Topics</TabsTrigger>
            <TabsTrigger value="conversations" className="rounded-lg">Conversations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Emotion Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={emotionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="satisfaction" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="neutral" stackId="1" stroke="#6B7280" fill="#6B7280" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="frustration" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Most Discussed Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topicsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            {filteredAnalytics.map((conv) => (
              <Card key={conv.id} className="bg-white border-gray-200 shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getSentimentIcon(conv.sentiment)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{conv.callerName || 'Unknown Caller'}</h3>
                        <p className="text-sm text-gray-600">{conv.callerNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSentimentColor(conv.sentiment)}>
                        {conv.sentiment}
                      </Badge>
                      {conv.satisfactionScore && (
                        <Badge variant="outline">
                          {conv.satisfactionScore}/5 ⭐
                        </Badge>
                      )}
                      {conv.resolved ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{conv.summary}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {conv.keyTopics.map((topic, idx) => (
                          <Badge key={idx} variant="secondary" className="rounded-lg">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Detected Intents</h4>
                      <div className="space-y-1">
                        {conv.intents.map((intent, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{intent.intent.replace('_', ' ')}</span>
                            <span className="text-gray-500">{Math.round(intent.confidence * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {conv.actionItems.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <h4 className="font-medium text-blue-900 mb-2">Action Items</h4>
                      <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                        {conv.actionItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppStoreLayout>
  );
}