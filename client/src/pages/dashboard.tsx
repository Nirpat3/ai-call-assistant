import { useState } from "react";
import { useLocation } from "wouter";
import AppStoreLayout from "@/components/AppStoreLayout";
import StatsCards from "@/components/dashboard/StatsCards";
import RecentCalls from "@/components/dashboard/RecentCalls";
import QuickActions from "@/components/dashboard/QuickActions";
import AIConfiguration from "@/components/dashboard/AIConfiguration";
import TestingCenter from "@/components/dashboard/TestingCenter";
import ContactManager from "@/components/dashboard/ContactManager";
import IntegrationHub from "@/components/dashboard/IntegrationHub";
import { useWebSocket } from "@/hooks/useWebSocket";
import { FloatingCallMonitor } from "@/components/FloatingCallMonitor";
import { WeatherWidget } from "@/components/WeatherWidget";
import { Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [location, navigate] = useLocation();
  const [dateFilter, setDateFilter] = useState<string>("today");
  
  // WebSocket connection for real-time updates
  useWebSocket({
    onMessage: (msg) => {
      console.log("WebSocket message received:", msg);
    },
    onConnect: () => {
      console.log('Connected to live call monitoring');
    },
    onDisconnect: () => {
      console.log('Disconnected from live call monitoring');
    }
  });

  return (
    <AppStoreLayout 
      title="Today" 
      subtitle="AI Call Management Dashboard"
    >
      {/* Enhanced iOS 16 Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg rounded-3xl mb-8">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Good morning!</h1>
                <p className="text-gray-600 mt-1 text-lg">Welcome back to your AI Call Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <WeatherWidget />
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32 rounded-xl">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards */}
      <StatsCards dateFilter={dateFilter} />

      {/* Main Dashboard Grid - Mobile block layout for iPad mini and below */}
      <div className="grid-responsive grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column - Recent Activity */}
        <div className="space-y-6 md:space-y-8">
          <div className="card-elevated">
            <RecentCalls />
          </div>
          <div className="card-elevated">
            <ContactManager />
          </div>
        </div>

        {/* Center Column - Quick Navigation */}
        <div className="space-y-6 md:space-y-8">
          <div className="card-elevated">
            <QuickActions />
          </div>
          <div className="card-elevated">
            <AIConfiguration />
          </div>
        </div>

        {/* Right Column - System Info */}
        <div className="space-y-6 md:space-y-8">
          <div className="card-elevated">
            <WeatherWidget location="Atlanta, GA" />
          </div>
          <div className="card-elevated">
            <TestingCenter />
          </div>
        </div>
      </div>

      {/* Integration Hub */}
      <div className="mt-8">
        <div className="card-elevated">
          <IntegrationHub />
        </div>
      </div>

      {/* Floating Call Monitor */}
      <FloatingCallMonitor 
        liveCalls={[]} 
        onCallSelect={(call) => {
          // Handle call selection if needed
          console.log('Selected call:', call);
        }} 
      />
    </AppStoreLayout>
  );
}