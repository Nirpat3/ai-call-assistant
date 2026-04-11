import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Phone, Users, MessageSquare, TrendingUp, ChevronRight, Calendar, Clock, Star, Shield, Activity, Zap, BarChart3, PieChart, ArrowUpRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppStoreLayout from "@/components/AppStoreLayout";

interface DashboardStats {
  callsToday: number;
  aiHandled: number;
  automationRate: number;
  voicemails: number;
  transcribedVoicemails: number;
  responseTime: string;
  unreadNotifications: number;
  routing: {
    totalRouted: number;
    salesRouted: number;
    supportRouted: number;
    generalRouted: number;
    transferredCalls: number;
    voicemailRouted: number;
    directAnswered: number;
    routingEfficiency: number;
  };
}

export default function ModernDashboard() {
  const [, navigate] = useLocation();
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [isCustomRange, setIsCustomRange] = useState(false);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", dateFilter, customDateRange],
    queryFn: async () => {
      let url = `/api/dashboard/stats?dateFilter=${dateFilter}`;
      
      // Add custom date range parameters if applicable
      if (dateFilter === 'custom' && customDateRange.from && customDateRange.to) {
        url += `&startDate=${customDateRange.from.toISOString().split('T')[0]}&endDate=${customDateRange.to.toISOString().split('T')[0]}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: weather } = useQuery<any>({
    queryKey: ["/api/weather"],
    refetchInterval: 300000,
  });

  const getPeriodLabel = (filter: string) => {
    if (isCustomRange && customDateRange.from && customDateRange.to) {
      const from = customDateRange.from.toLocaleDateString();
      const to = customDateRange.to.toLocaleDateString();
      return `${from} - ${to}`;
    }
    
    switch (filter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this_week': return 'This Week';
      case 'last_week': return 'Last Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_quarter': return 'This Quarter';
      case 'last_quarter': return 'Last Quarter';
      case 'this_year': return 'This Year';
      case 'last_year': return 'Last Year';
      case 'last_7_days': return 'Last 7 Days';
      case 'last_30_days': return 'Last 30 Days';
      case 'last_90_days': return 'Last 90 Days';
      case 'custom': return 'Custom Range';
      default: return 'Today';
    }
  };

  const handleDateFilterChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setCustomDateRange({ from: null, to: null });
    }
    setDateFilter(value);
  };

  const handleCustomDateApply = () => {
    if (customDateRange.from && customDateRange.to) {
      setDateFilter('custom');
      setIsCustomRange(false);
    }
  };

  // iOS 16 style metric cards with glassmorphism - Mobile responsive
  const CoreMetrics = () => (
    <>
      {/* Mobile Block Layout */}
      <div className="md:hidden mobile-block-layout mb-8">
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer transition-all duration-300 mobile-card overflow-hidden"
          onClick={() => navigate("/call-log")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative mobile-padding">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <Phone className="mobile-icon" />
              </div>
              <ArrowUpRight className="mobile-icon opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-blue-100 mobile-text font-medium">Calls {getPeriodLabel(dateFilter)}</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.callsToday || 0}</p>
              <p className="text-blue-100 text-xs">+12% vs previous period</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white cursor-pointer transition-all duration-300 mobile-card overflow-hidden"
          onClick={() => navigate("/settings/call-management")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative mobile-padding">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <Zap className="mobile-icon" />
              </div>
              <ArrowUpRight className="mobile-icon opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-emerald-100 mobile-text font-medium">AI Handled</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.aiHandled || 0}</p>
              <p className="text-emerald-100 text-xs">{stats?.automationRate || 0}% automation rate</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer transition-all duration-300 mobile-card overflow-hidden"
          onClick={() => navigate("/voicemail")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative mobile-padding">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <MessageSquare className="mobile-icon" />
              </div>
              <ArrowUpRight className="mobile-icon opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-orange-100 mobile-text font-medium">Voicemails</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.voicemails || 0}</p>
              <p className="text-orange-100 text-xs">{stats?.transcribedVoicemails || 0} transcribed</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer transition-all duration-300 mobile-card overflow-hidden"
          onClick={() => navigate("/analytics/calls")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative mobile-padding">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <Clock className="mobile-icon" />
              </div>
              <ArrowUpRight className="mobile-icon opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-purple-100 mobile-text font-medium">Response Time</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.responseTime || "0s"}</p>
              <p className="text-purple-100 text-xs">-0.3s faster</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Grid Layout */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Primary Call Stats */}
        <Card 
          className="border-0 shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Phone className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-blue-100 text-sm font-medium">Calls {getPeriodLabel(dateFilter)}</p>
              <p className="text-3xl font-bold">{stats?.callsToday || 0}</p>
              <p className="text-blue-100 text-xs">+12% vs previous period</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Performance */}
        <Card 
          className="border-0 shadow-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/settings/call-management")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Zap className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-emerald-100 text-sm font-medium">AI Handled</p>
              <p className="text-3xl font-bold">{stats?.aiHandled || 0}</p>
              <p className="text-emerald-100 text-xs">{stats?.automationRate || 0}% automation rate</p>
            </div>
          </CardContent>
        </Card>

        {/* Voicemail Stats */}
        <Card 
          className="border-0 shadow-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/voicemail")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-orange-100 text-sm font-medium">Voicemails</p>
              <p className="text-3xl font-bold">{stats?.voicemails || 0}</p>
              <p className="text-orange-100 text-xs">{stats?.transcribedVoicemails || 0} transcribed</p>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card 
          className="border-0 shadow-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/analytics/calls")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="space-y-1">
              <p className="text-purple-100 text-sm font-medium">Response Time</p>
              <p className="text-3xl font-bold">{stats?.responseTime || "0s"}</p>
              <p className="text-purple-100 text-xs">-0.3s faster</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  // Department routing cards with iOS 16 design
  const DepartmentRouting = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Routing</h2>
          <p className="text-gray-600">Click any department to view filtered calls</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 rounded-full px-3 py-1">
          {stats?.routing?.routingEfficiency || 0}% efficiency
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Sales Department */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-emerald-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=sales")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.routing?.salesRouted || 0}</p>
            <p className="text-sm text-gray-600 font-medium">Sales</p>
            <p className="text-xs text-gray-500 mt-1">department</p>
          </CardContent>
        </Card>

        {/* Support Department */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-orange-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=support")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.routing?.supportRouted || 0}</p>
            <p className="text-sm text-gray-600 font-medium">Support</p>
            <p className="text-xs text-gray-500 mt-1">department</p>
          </CardContent>
        </Card>

        {/* General Inquiries */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=general")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.routing?.generalRouted || 0}</p>
            <p className="text-sm text-gray-600 font-medium">General</p>
            <p className="text-xs text-gray-500 mt-1">inquiries</p>
          </CardContent>
        </Card>

        {/* Transferred Calls */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=transferred")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.routing?.transferredCalls || 0}</p>
            <p className="text-sm text-gray-600 font-medium">Transferred</p>
            <p className="text-xs text-gray-500 mt-1">to agents</p>
          </CardContent>
        </Card>

        {/* Voicemail Route */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=voicemail")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.routing?.voicemailRouted || 0}</p>
            <p className="text-sm text-gray-600 font-medium">Voicemail</p>
            <p className="text-xs text-gray-500 mt-1">route</p>
          </CardContent>
        </Card>

        {/* AI Handled */}
        <Card 
          className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50 cursor-pointer transform hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden"
          onClick={() => navigate("/call-log?routing=ai")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.aiHandled || 0}</p>
            <p className="text-sm text-gray-600 font-medium">AI Handled</p>
            <p className="text-xs text-gray-500 mt-1">automated</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Quick Actions with iOS 16 design
  const QuickActions = () => (
    <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-br from-white to-gray-50">
      <CardContent className="p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="ghost"
            className="h-20 flex flex-col space-y-2 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-0"
            onClick={() => navigate("/call-log")}
          >
            <Phone className="w-6 h-6 text-blue-600" />
            <span className="text-blue-900 font-medium">View Calls</span>
          </Button>
          
          <Button
            variant="ghost"
            className="h-20 flex flex-col space-y-2 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-0"
            onClick={() => navigate("/contacts")}
          >
            <Users className="w-6 h-6 text-purple-600" />
            <span className="text-purple-900 font-medium">Contacts</span>
          </Button>
          
          <Button
            variant="ghost"
            className="h-20 flex flex-col space-y-2 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-0"
            onClick={() => navigate("/analytics")}
          >
            <BarChart3 className="w-6 h-6 text-green-600" />
            <span className="text-green-900 font-medium">Analytics</span>
          </Button>
          
          <Button
            variant="ghost"
            className="h-20 flex flex-col space-y-2 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-0"
            onClick={() => navigate("/settings")}
          >
            <Activity className="w-6 h-6 text-orange-600" />
            <span className="text-orange-900 font-medium">Settings</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Weather widget with iOS 16 design
  const WeatherWidget = () => (
    weather && (
      <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-br from-sky-400 to-sky-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sky-100 text-sm font-medium">{weather.location}</p>
              <p className="text-3xl font-bold">{weather.temperature}°F</p>
              <p className="text-sky-100 text-sm">{weather.description}</p>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2">
                <span className="text-3xl">{weather.icon || '☀️'}</span>
              </div>
              <p className="text-xs text-sky-100">
                H: {weather.high}° L: {weather.low}°
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  );

  if (isLoading) {
    return (
      <AppStoreLayout title="Dashboard" subtitle="Call Management Overview">
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </AppStoreLayout>
    );
  }

  return (
    <AppStoreLayout title="Dashboard" subtitle="Call Management Overview">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        
        {/* Header with Period Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </h1>
            <p className="text-gray-600">Here's what's happening with your calls {getPeriodLabel(dateFilter).toLowerCase()}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {WeatherWidget()}
            
            {/* Date Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-full sm:w-48 rounded-2xl border-2 border-gray-300 bg-white shadow-lg text-gray-900 font-medium hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                  <Calendar className="w-4 h-4 mr-2 text-gray-700" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="today" className="text-gray-900 hover:bg-gray-100">Today</SelectItem>
                  <SelectItem value="yesterday" className="text-gray-900 hover:bg-gray-100">Yesterday</SelectItem>
                  <SelectItem value="this_week" className="text-gray-900 hover:bg-gray-100">This Week</SelectItem>
                  <SelectItem value="last_week" className="text-gray-900 hover:bg-gray-100">Last Week</SelectItem>
                  <SelectItem value="this_month" className="text-gray-900 hover:bg-gray-100">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-gray-900 hover:bg-gray-100">Last Month</SelectItem>
                  <SelectItem value="this_quarter" className="text-gray-900 hover:bg-gray-100">This Quarter</SelectItem>
                  <SelectItem value="last_quarter" className="text-gray-900 hover:bg-gray-100">Last Quarter</SelectItem>
                  <SelectItem value="this_year" className="text-gray-900 hover:bg-gray-100">This Year</SelectItem>
                  <SelectItem value="last_year" className="text-gray-900 hover:bg-gray-100">Last Year</SelectItem>
                  <SelectItem value="last_7_days" className="text-gray-900 hover:bg-gray-100">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days" className="text-gray-900 hover:bg-gray-100">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days" className="text-gray-900 hover:bg-gray-100">Last 90 Days</SelectItem>
                  <SelectItem value="custom" className="text-gray-900 hover:bg-gray-100">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Popover */}
              {isCustomRange && (
                <Popover open={isCustomRange} onOpenChange={setIsCustomRange}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto rounded-2xl border-2 border-gray-300 bg-white shadow-lg text-gray-900 font-medium hover:border-gray-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                      <CalendarDays className="w-4 h-4 mr-2 text-gray-700" />
                      <span className="truncate text-gray-900 font-medium">
                        {customDateRange.from && customDateRange.to 
                          ? `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`
                          : "Select dates"
                        }
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <div className="p-6 space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Custom Date Range</h3>
                        <p className="text-sm text-gray-600">Select start and end dates for your analysis</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={customDateRange.from ? customDateRange.from.toISOString().split('T')[0] : ''}
                            onChange={(e) => setCustomDateRange(prev => ({ 
                              ...prev, 
                              from: e.target.value ? new Date(e.target.value) : null 
                            }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={customDateRange.to ? customDateRange.to.toISOString().split('T')[0] : ''}
                            onChange={(e) => setCustomDateRange(prev => ({ 
                              ...prev, 
                              to: e.target.value ? new Date(e.target.value) : null 
                            }))}
                            className="rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsCustomRange(false);
                            setDateFilter('today');
                          }}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCustomDateApply}
                          disabled={!customDateRange.from || !customDateRange.to}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700"
                        >
                          Apply Range
                        </Button>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-3">Quick Presets</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                              setCustomDateRange({ from: lastWeek, to: today });
                            }}
                            className="rounded-xl text-xs"
                          >
                            Last 7 Days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                              setCustomDateRange({ from: lastMonth, to: today });
                            }}
                            className="rounded-xl text-xs"
                          >
                            Last 30 Days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                              setCustomDateRange({ from: startOfMonth, to: today });
                            }}
                            className="rounded-xl text-xs"
                          >
                            This Month
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const startOfYear = new Date(today.getFullYear(), 0, 1);
                              setCustomDateRange({ from: startOfYear, to: today });
                            }}
                            className="rounded-xl text-xs"
                          >
                            This Year
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>

        {/* Core Metrics */}
        <CoreMetrics />

        {/* Department Routing */}
        <DepartmentRouting />

        {/* Quick Actions */}
        <QuickActions />

      </div>
    </AppStoreLayout>
  );
}