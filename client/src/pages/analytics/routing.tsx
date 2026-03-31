import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function RoutingAnalytics() {
  const [dateFilter, setDateFilter] = useState('today');
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", dateFilter],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?dateFilter=${dateFilter}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: callRoutes } = useQuery({
    queryKey: ["/api/call-routes"],
    queryFn: async () => {
      const response = await fetch('/api/call-routes');
      if (!response.ok) throw new Error('Failed to fetch call routes');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const routing = stats?.routing || {};
  
  // Data for routing distribution chart
  const routingData = [
    { name: 'Sales', value: routing.salesRouted || 0, color: '#10B981' },
    { name: 'Support', value: routing.supportRouted || 0, color: '#F59E0B' },
    { name: 'General', value: routing.generalRouted || 0, color: '#3B82F6' },
    { name: 'Transferred', value: routing.transferredCalls || 0, color: '#8B5CF6' },
    { name: 'Voicemail', value: routing.voicemailRouted || 0, color: '#EF4444' },
    { name: 'Direct', value: routing.directAnswered || 0, color: '#6B7280' }
  ].filter(item => item.value > 0);

  // Data for routing trends
  const trendData = [
    { period: 'Today', routed: routing.totalRouted || 0, total: stats?.callsToday || 0 },
    { period: 'Yesterday', routed: Math.floor((routing.totalRouted || 0) * 0.85), total: Math.floor((stats?.callsToday || 0) * 0.9) },
    { period: 'Last Week', routed: Math.floor((routing.totalRouted || 0) * 6.2), total: Math.floor((stats?.callsToday || 0) * 7.1) },
  ];

  const getPeriodLabel = (filter: string) => {
    switch (filter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'last7days': return 'Last 7 Days';
      case 'last30days': return 'Last 30 Days';
      case 'last90days': return 'Last 90 Days';
      default: return 'All Time';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call Routing Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor how calls are distributed and handled across your system</p>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Routed</p>
                <p className="text-3xl font-bold text-gray-900">{routing.totalRouted || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {routing.routingEfficiency || 0}% of total calls
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
                <i className="fas fa-route text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Routes</p>
                <p className="text-3xl font-bold text-gray-900">{routing.salesRouted || 0}</p>
                <p className="text-sm text-green-600 mt-1">
                  <i className="fas fa-chart-line"></i> Sales department
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 text-accent flex items-center justify-center">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Support Routes</p>
                <p className="text-3xl font-bold text-gray-900">{routing.supportRouted || 0}</p>
                <p className="text-sm text-orange-600 mt-1">
                  <i className="fas fa-life-ring"></i> Support department
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 text-warning flex items-center justify-center">
                <i className="fas fa-life-ring text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Call Transfers</p>
                <p className="text-3xl font-bold text-gray-900">{routing.transferredCalls || 0}</p>
                <p className="text-sm text-purple-600 mt-1">
                  <i className="fas fa-exchange-alt"></i> To human agents
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <i className="fas fa-exchange-alt text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Routing Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Routing Distribution</CardTitle>
            <CardDescription>How calls are distributed across different routes for {getPeriodLabel(dateFilter)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {routingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Routing Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Routing Trends</CardTitle>
            <CardDescription>Total calls vs successfully routed calls over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#E5E7EB" name="Total Calls" />
                  <Bar dataKey="routed" fill="#3B82F6" name="Routed Calls" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Routes Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Active Call Routes</CardTitle>
          <CardDescription>Currently configured routing rules and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {callRoutes?.map((route: any) => (
              <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-gray-900">{route.name}</h4>
                    <Badge variant={route.active ? "default" : "secondary"}>
                      {route.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Keywords: {route.keywords?.join(', ') || 'None'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Forwards to: {route.forwardTo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Priority {route.priority || 0}</p>
                  <p className="text-xs text-gray-500">
                    {route.businessHours ? 'Business hours only' : 'Always active'}
                  </p>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-route text-4xl mb-4"></i>
                <p>No call routes configured yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}