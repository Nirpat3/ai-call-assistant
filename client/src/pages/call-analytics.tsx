import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Phone, TrendingUp, Clock, Users, AlertCircle, CheckCircle, XCircle, Calendar } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import Breadcrumb from "@/components/Breadcrumb";

interface CallStats {
  callsToday: number;
  aiHandled: number;
  automated: number;
  transferred: number;
  missed: number;
  avgDuration: number;
  peakHour: string;
  satisfactionScore: number;
}

interface DailyCallData {
  date: string;
  total: number;
  answered: number;
  missed: number;
  aiHandled: number;
  avgDuration: number;
}

interface HourlyCallData {
  hour: string;
  calls: number;
  answered: number;
  missed: number;
}

interface CallTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export default function CallAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState<string>("last30days");
  
  const { data: stats } = useQuery<CallStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: calls = [] } = useQuery<any[]>({
    queryKey: ["/api/calls/recent"],
  });

  // Generate analytics data from actual calls
  const generateDailyData = (): DailyCallData[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayCalls = calls.filter((call: any) => {
        const callDate = new Date(call.createdAt);
        return callDate >= dayStart && callDate < dayEnd;
      });

      return {
        date: format(date, "MMM dd"),
        total: dayCalls.length,
        answered: dayCalls.filter((call: any) => call.status === "completed").length,
        missed: dayCalls.filter((call: any) => call.status === "no-answer").length,
        aiHandled: dayCalls.filter((call: any) => call.aiHandled).length,
        avgDuration: dayCalls.reduce((acc: number, call: any) => acc + (call.duration || 0), 0) / Math.max(dayCalls.length, 1)
      };
    });
    
    return last7Days;
  };

  const generateHourlyData = (): HourlyCallData[] => {
    const hourlyStats: Record<number, { calls: number; answered: number; missed: number }> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { calls: 0, answered: 0, missed: 0 };
    }

    // Process today's calls
    const today = startOfDay(new Date());
    const todayCalls = calls.filter((call: any) => {
      const callDate = new Date(call.createdAt);
      return callDate >= today;
    });

    todayCalls.forEach((call: any) => {
      const hour = new Date(call.createdAt).getHours();
      hourlyStats[hour].calls++;
      if (call.status === "completed") hourlyStats[hour].answered++;
      if (call.status === "no-answer") hourlyStats[hour].missed++;
    });

    return Object.entries(hourlyStats).map(([hour, data]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      ...data
    }));
  };

  const generateCallTypeData = (): CallTypeData[] => {
    const types = {
      aiHandled: { count: 0, color: "#10b981" },
      transferred: { count: 0, color: "#f59e0b" },
      voicemail: { count: 0, color: "#6366f1" },
      missed: { count: 0, color: "#ef4444" }
    };

    calls.forEach((call: any) => {
      if (call.aiHandled) types.aiHandled.count++;
      else if (call.forwarded) types.transferred.count++;
      else if (call.status === "no-answer") types.missed.count++;
      else types.voicemail.count++;
    });

    const total = Object.values(types).reduce((sum, type) => sum + type.count, 0);
    
    return [
      { type: "AI Handled", count: types.aiHandled.count, percentage: (types.aiHandled.count / total) * 100, color: types.aiHandled.color },
      { type: "Transferred", count: types.transferred.count, percentage: (types.transferred.count / total) * 100, color: types.transferred.color },
      { type: "Voicemail", count: types.voicemail.count, percentage: (types.voicemail.count / total) * 100, color: types.voicemail.color },
      { type: "Missed", count: types.missed.count, percentage: (types.missed.count / total) * 100, color: types.missed.color }
    ];
  };

  const dailyData = generateDailyData();
  const hourlyData = generateHourlyData();
  const callTypeData = generateCallTypeData();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Breadcrumb />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights and performance metrics for your call operations
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

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls Today</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.callsToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Handled</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aiHandled || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.callsToday ? Math.round((stats.aiHandled / stats.callsToday) * 100) : 0}% of total calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.avgDuration ? `${Math.round(stats.avgDuration / 60)}m` : "0m"}
              </div>
              <p className="text-xs text-muted-foreground">
                -2 min from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.8/5</div>
              <p className="text-xs text-muted-foreground">
                +0.2 from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Call Volume (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" name="Total Calls" />
                      <Bar dataKey="answered" fill="#10b981" name="Answered" />
                      <Bar dataKey="missed" fill="#ef4444" name="Missed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Call Distribution by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={callTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                      >
                        {callTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hourly Call Distribution (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" name="Total Calls" />
                    <Line type="monotone" dataKey="answered" stroke="#10b981" name="Answered" />
                    <Line type="monotone" dataKey="missed" stroke="#ef4444" name="Missed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>AI Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="aiHandled" stroke="#8b5cf6" name="AI Handled" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Call Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${Math.round(value / 60)}m`, "Duration"]} />
                      <Line type="monotone" dataKey="avgDuration" stroke="#f59e0b" name="Avg Duration" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {callTypeData.map((item) => (
                <Card key={item.type}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.type}</CardTitle>
                    <Badge variant="secondary" style={{ backgroundColor: item.color, color: "white" }}>
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="w-full bg-secondary h-2 rounded-full mt-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${item.percentage}%`, 
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Peak Call Times</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {hourlyData
                      .filter(hour => hour.calls > 0)
                      .sort((a, b) => b.calls - a.calls)
                      .slice(0, 10)
                      .map((hour, index) => (
                        <div key={hour.hour} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{hour.hour}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-blue-600">{hour.calls} total</span>
                            <span className="text-green-600">{hour.answered} answered</span>
                            <span className="text-red-600">{hour.missed} missed</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}